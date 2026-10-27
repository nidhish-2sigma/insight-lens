// Check fixed profile fields and their evidence populations across real, multi-book, lab, and early views.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/atlas.js'),'utf8'),boot='renderHead();fromHash();render();';
function load(search='',hash='#skills',studentName){
  const nodes=new Map(),events=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:false,clientWidth:1400,classList:{toggle(){}},style:{setProperty(){}},focus(){},querySelectorAll(){return[]},querySelector(){return null},getBoundingClientRect(){return {top:100,left:0,width:1400,height:500}}});return nodes.get(id)};
  const ctx=vm.createContext({window:{innerWidth:1700,addEventListener(){}},document:{querySelector:node,getElementById:id=>node('#'+id),querySelectorAll(){return[]},addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn)}},location:{search,hash,pathname:'/index.html',assign(){},replace(){}},setTimeout(){return 1},clearTimeout(){},console});
  ['js/alps-design-system.js','data/class.js','data/example.js','data/prereqs.js'].forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file}));
  if(studentName!==undefined)ctx.window.ATLAS_DATA.students[0]=studentName;
  vm.runInContext(source.replace(boot,'globalThis.PROFILE_REVIEW={S,N,NM,ALL,vProf,renderReviewThread,standU,TB0,CU,TSK,KT,TODAY,EV,CAT,KEYC,AT,nodeItems,paceOf,paceUnits,WB,RB,RECENT,BOOKS,MULTI,PICK,LABV,fromHash,profTL,reviewPage,pinBtn,nmBtn,SL};'),ctx,{filename:'js/atlas.js'});
  return {X:ctx.PROFILE_REVIEW,ctx,node,events};
}
const failures=[],check=(ok,message)=>{if(!ok)failures.push(message)};
let profiles=0,unitRows=0,followed=0;
for(const search of ['', '?books', '?books&book=java-short-labs', '?books&book=be-prepared-apcsa', '?books&book=java-methods', '?today=2025-09-01']){
  const {X}=load(search),S=X.S;S.view='p';
  for(const i of X.ALL){S.prof=i;S.stu=i;const h=X.vProf(),where=`${search||'real'} · ${X.NM[i]}`;
    check(!/undefined|NaN|Infinity/.test(h),where+': valid rendered values');
    const labels=[...h.matchAll(/<p class="icl">([^<]+)<\/p>/g)].map(m=>m[1]);
    check(JSON.stringify(labels)===JSON.stringify(['Current level','Evidence coverage','Recent activity','Forecast']),where+': same four fields in the same order');
    const skills=X.TSK.filter(k=>X.KT[k]<=X.TODAY),assessed=skills.filter(k=>X.EV[i][k]>=2),mastered=skills.filter(k=>X.CAT[i][k]==='F'),text=h.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
    check(text.includes(`${assessed.length} of ${skills.length} skills`),where+': introduced-skill denominator visible');
    check(h.includes(`${mastered.length} mastered · ${skills.length-assessed.length} need more checks`),where+': assessed + unknown partition all introduced skills');
    const table=h.match(/<table class="metric-table profile-units">[^]*?<tbody>([^]*?)<\/tbody>/),rows=table?[...table[1].matchAll(/<tr>([^]*?)<\/tr>/g)].map(m=>m[1]):[],units=X.TB0.map((U,u)=>({U,u})).filter(o=>o.U.on);
    check(rows.length===units.length,where+': every started unit has one row');
    rows.forEach((row,p)=>{const {U,u}=units[p],items=X.nodeItems({t:'u',id:u}),tried=items.filter(ix=>X.AT[i].has(ix)).length,st=X.standU(i,u);
      check(row.includes(`${tried} of ${items.length} ${U.lab?'labs':'questions'}`),where+': correct practice denominator for '+U.n);
      check(U.lab?row.includes('Not assessed')&&row.includes('Practice participation only'):row.includes(`${st.e} of ${X.KEYC[u].length} key skills assessed`),where+': assessment evidence separate from lab practice in '+U.n);
      if(!U.lab&&!st.e)check(row.includes('More checks needed'),where+': missing evidence is not a zero score');
      const card=h.match(new RegExp(`<button class="profile-unit"[^>]*data-u="${u}"[^>]*>([^]*?)</button>`));
      check(!!card,where+': unit card is available for '+U.n);
      if(card){const cardText=card[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');check(cardText.includes(`${tried} / ${items.length}`),where+': unit card preserves practice counts for '+U.n);if(!U.lab)check(cardText.includes(`${st.e} / ${X.KEYC[u].length}`),where+': unit card agrees with exact evidence coverage for '+U.n);if(!U.lab&&st.e)check(cardText.includes(X.SL[st.s])&&cardText.includes(`${Math.round(st.f*100)} / 100`),where+': unit card agrees with exact mastery for '+U.n);else check(cardText.includes(U.lab?'Practice only':'More checks needed'),where+': unit card keeps unavailable mastery separate for '+U.n);}
      unitRows++;
    });
    const el={};X.renderReviewThread(el);const slots=[...el.innerHTML.matchAll(/<span>([^<]+)<\/span><b>([^]*?)<\/b><small>([^]*?)<\/small>/g)];
    check(JSON.stringify(slots.map(m=>m[1]))===JSON.stringify(['Current level','Weak skills','Recent activity','Forecast']),where+': consistent followed-student fields');
    const current=X.TB0[X.CU],st=X.standU(i,X.CU),level=slots.find(m=>m[1]==='Current level')?.[2];
    check(level===(current.lab?'Not assessed':st.e?X.SL[st.s]:'More checks needed'),where+': followed level agrees with profile and assessment coverage');
    if(current.lab){const forecast=slots.find(m=>m[1]==='Forecast')?.[2];check(/Not assessed|Practice only|No forecast/.test(forecast||''),where+': labs are not waiting for an impossible forecast');}
    const activity=slots.find(m=>m[1]==='Recent activity'),forecast=slots.find(m=>m[1]==='Forecast'),pace=X.paceOf(i);
    if(X.MULTI)check(/Across textbooks/.test(activity?.[3]||'')&&h.includes('Across textbooks · '+X.RECENT),where+': activity explicitly names its cross-book scope');
    if(!X.LABV){check((forecast?.[3]||'').includes(X.TB0[S.v4.u].n),where+': forecast names its actual target unit');if(pace.end!==null&&X.TODAY-pace.end>30)check((forecast?.[3]||'').includes('if work resumes'),where+': stale forecast retains its work-resumption condition');}
    profiles++;followed++;
  }
}
// Opening a profile must remain distinct from explicitly following the student, including on a deep link.
{
  const app=load(),X=app.X;X.S.stu=null;app.ctx.location.hash='#s-'+encodeURIComponent(X.NM[0]);X.fromHash();
  check(X.S.prof===0&&X.S.view==='p','profile deep link resolves the named student');
  check(X.S.stu===null,'profile deep link does not silently follow the student');
}
{
  const {X}=load('','#skills','Ada & Lin');X.S.view='p';X.S.prof=0;X.S.stu=0;const h=X.vProf(),el={};X.renderReviewThread(el);
  check(h.includes('>Ada &amp; Lin</h2>')&&!h.includes('Ada &amp;amp; Lin'),'profile name is escaped exactly once');
  check(!el.innerHTML.includes('Ada &amp;amp; Lin'),'followed name is escaped exactly once');
  check(X.nmBtn(X.NM[0]).includes('>Ada &amp; Lin</button>'),'student name buttons escape exactly once');
}
if(failures.length){console.error(failures.slice(0,12).join('\n'));console.error(`${failures.length} profile review checks failed`);process.exit(1)}
console.log(`Profile review checks passed: ${profiles} profiles, ${unitRows} unit rows, ${followed} followed-student summaries.`);

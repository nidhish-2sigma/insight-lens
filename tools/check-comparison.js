// Quantitative mappings and interactions for the visual student comparisons.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/atlas.js'),'utf8'),boot='renderHead();fromHash();render();';
function load(search,width=1200){
  const nodes=new Map(),events=new Map(),navigations=[];
  const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',hidden:false,clientWidth:width,classList:{toggle(){}},style:{setProperty(){}},focus(){},scrollIntoView(){},querySelectorAll(){return[]},querySelector(){return null},getBoundingClientRect(){return{top:100}}});return nodes.get(key)};
  const ctx=vm.createContext({window:{innerWidth:width,addEventListener(){}},document:{querySelector:node,getElementById:id=>node('#'+id),addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn)}},location:{search,hash:'#drifting',pathname:'/index.html',assign(url){navigations.push(url)},replace(url){navigations.push(url)}},history:{replaceState(){}},setTimeout(){},clearTimeout(){},console});
  for(const file of ['js/alps-design-system.js','data/class.js','data/example.js','data/prereqs.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
  vm.runInContext(source.replace(boot,'globalThis.COMP={S,ALL,NM,NORM,WB,RB,NBK,NBC,DR,WATCH,JUDGE,TODAY,DEMODAY,activityReading,activityTrack,activityTrace,activityEvidence,v3,v4draw,masteryPlot,paceOf,paceScope,paceUnits,pageSummary,ICD,cSk,c6,c7,c10,c4,paceShort,fromHash,go,isoOf,SLUG,TB0,TSK,KT,BE,STW,profileReading,profTL,vProf,hard5,unitHeatmap,mast,lvOf,rdSel,rdC,rdF,rdP,rdRows,IVS,actionScale,effectPlot};'),ctx);
  return {p:ctx.COMP,ctx,node,navigations,click(dataset){const t={dataset,closest(){return null}};events.get('click').forEach(fn=>fn({target:{closest(){return t}},detail:1}))},change(target){events.get('change').forEach(fn=>fn({target}))}};
}
function studentRows(h){const starts=[...h.matchAll(/<div class="visual-row[^"]*" data-student="(\d+)"/g)];return starts.map((m,i)=>({i:+m[1],html:h.slice(m.index,starts[i+1]?.index??h.length)}))}
let activity=0,forecasts=0,heatCells=0,branches=0,periods=0;
for(const search of ['', '?today=2025-11-14','?today=2025-09-01','?books','?books&book=java-short-labs'])for(const width of [390,1200]){
  const app=load(search,width),p=app.p;
  p.S.view=3;p.S.v3.all=true;
  let h=p.v3();assert(!/NaN|Infinity|undefined/.test(h));
  assert(!h.includes('<table'),'the primary activity view is graphical');
  const rows=studentRows(h);assert.equal(rows.length,p.ALL.length);
  for(const {i,html} of rows){const a=p.activityReading(i);assert(html.includes(`<b>${a.work} / ${a.usual===null?'?':a.usual}</b>`));assert(html.includes('class="activity-trace"'));assert(html.includes('viewBox="0 0 480 64"'),'all histories share the same geometry');assert.equal(a.ratio,p.NORM[i]>0?p.WB[i][p.RB]/p.NORM[i]*100:null);assert.equal(a.status==='Sustained drop',p.JUDGE&&p.DR[i]>=0);assert.equal(a.status==='Low in latest period',p.JUDGE&&p.WATCH[i]);if(!p.JUDGE)assert.equal(a.tone,'');activity++}
  p.S.v3.all=false;const subset=studentRows(p.v3()).map(r=>r.i).sort((a,b)=>a-b),expected=p.ALL.filter(i=>p.DR[i]>=0||p.WATCH[i]);assert.deepEqual(subset,Array.from(expected).sort((a,b)=>a-b));
  p.S.v3.all=true;p.S.stu=1;app.click({act:'v3detail',i:'0'});assert.equal(p.S.v3.detail,0);assert.equal(p.S.stu,1);
  assert.equal((p.activityEvidence(0).match(/<tr><th scope="row">/g)||[]).length,p.NBK,'every period remains auditable');
  app.click({act:'v3detail',i:'0'});assert.equal(p.S.v3.detail,null);
  const baseline=p.NORM[0];for(const b of [0,null]){p.NORM[0]=b;assert.equal(p.activityReading(0).ratio,null);const trace=p.activityTrace(0);assert(!trace.includes('<polyline'),'unknown usual is not a zero activity trajectory');assert(!/NaN|Infinity/.test(trace))}p.NORM[0]=baseline;
  assert(p.activityTrack({ratio:49.999,usual:100,work:49.999,tone:'bad'}).includes('Under 50% of usual'));
  assert(p.activityTrack({ratio:450,usual:2,work:9,tone:''}).includes('Above the 200% display range'));
  const day=p.TODAY,query=app.ctx.location.search;for(const v of [2,3,4,6,10,11]){p.go(v);assert.equal(p.TODAY,day);assert.equal(app.ctx.location.search,query);app.ctx.location.hash='#'+p.SLUG[v];p.fromHash()}assert.equal(app.navigations.length,0);
  if(p.DEMODAY!==p.TODAY){app.click({act:'activeperiod',v:'3'});assert(app.navigations[0].includes('today='+p.isoOf(p.DEMODAY)));if(search.includes('books'))assert(app.navigations[0].includes('books'))}
  p.S.view=4;
  for(const u of p.paceUnits()){
    p.S.v4.u=u;p.v4draw();h=app.node('#v4c').innerHTML;assert(!/NaN|Infinity|undefined/.test(h));
    if(!p.paceScope(u).ks.length){assert(h.includes('No key skills to project'));continue}
    assert(!h.includes('<table'),'mastery tracks form the primary comparison');
    const rs=studentRows(h);assert.equal(rs.length,p.ALL.length);
    for(const {i,html}of rs){const a=p.paceOf(i);assert(html.includes(`data-now="${a.now}"`));assert(html.includes(`data-projected="${a.proj===null?'':a.proj}"`));assert(html.includes(`data-goal="${a.goal}"`));assert(html.includes(`class="mastery-now" style="width:${a.now/a.goal*100}%"`));if(a.proj!==null)assert(html.includes(`width:${(a.proj-a.now)/a.goal*100}%`));forecasts++}
  }
  if(p.paceUnits().length){app.click({act:'v4detail',i:'0'});assert(app.node('#v4c').innerHTML.includes('id="pace-evidence"'));const before=JSON.stringify(p.ALL.map(i=>p.paceOf(i)));app.change({id:'v4reference',checked:true});assert(app.node('#v4c').innerHTML.includes('Dotted marker: even-pace reference'));assert.equal(JSON.stringify(p.ALL.map(i=>p.paceOf(i))),before)}
  for(const U of p.hard5(0).T.filter(u=>u.on).slice(0,2)){
    p.S.v6.heat=U.u;p.S.v6.hmPage=0;p.S.v6.cell=null;const heat=p.unitHeatmap(0,U.u);assert(!/NaN|Infinity|undefined/.test(heat));
    const cells=[...heat.matchAll(/<button class="heat-cell[^"]*"[^>]*>/g)];assert(cells.length>0);assert.equal((heat.match(/tabindex="0"/g)||[]).length,1,'the heatmap has a single roving tab stop');
    for(const [cell]of cells){const i=+cell.match(/data-i="(\d+)"/)[1],k=+cell.match(/data-k="(\d+)"/)[1],m=p.mast(i,k);if(m&&m.ev>=2)assert(cell.includes('score '+Math.round(m.c*100)+' of 100'));else assert(cell.includes(m&&m.ev?'One check':'Not attempted'));heatCells++}
    const c=cells[0][0],i=c.match(/data-i="(\d+)"/)[1],k=c.match(/data-k="(\d+)"/)[1],follow=p.S.stu;app.click({act:'unitcell',i,k});assert.equal(p.S.v6.cell.i,+i);assert.equal(p.S.stu,follow);
  }
  p.S.view=10;const R=p.rdSel();if(R.all.length){p.S.v11.node=null;const figures=p.rdRows(R.all,R.ids);assert(figures.includes('class="metric-table rd-table"'));assert.equal((figures.match(/data-act="rdnode"/g)||[]).length,R.all.length,'all direct prerequisites remain accessible');
    for(const q of R.all){const node=figures.match(new RegExp(`<button class="lnk"[^>]*data-act="rdnode" data-k="${q.k}"[^>]*>`));assert(node);assert(node[0].includes(`data-qualified="${p.rdF(q.k,R.ids).length}"`));assert(node[0].includes(`data-assessed="${p.rdC(q.k,R.ids)}"`));assert(node[0].includes(`data-readiness="${p.rdP(q.k,R.ids)??''}"`));branches++}
    const q=R.all.find(q=>q.cs?.length);if(q){app.click({act:'rdnode',k:String(q.k)});assert.equal(p.S.v11.node,q.k);assert.equal((p.rdRows([q],R.ids).match(/data-act="rdinspect"/g)||[]).length,q.cs.length,'row detail preserves every underlying skill');}
  }
  p.S.view='p';p.S.prof=0;const follow=p.S.stu;for(const j of [...new Set([0,Math.floor((p.NBC-1)/2),p.NBC-1])]){app.click({act:'profilepoint',j:String(j)});const r=p.profileReading(0,j),ks=p.TSK.filter(k=>p.KT[k]<=p.BE(j));assert.equal(r.skills,ks.length);assert.equal(r.mastered,ks.filter(k=>p.STW[0][k][j]===4).length);assert.equal(r.work,p.WB[0][j]);assert(p.vProf().includes(`${r.mastered} / ${r.skills}`));assert.equal(p.S.stu,follow);periods++}
  for(const view of [2,3,4,6,7,10,11]){
    p.S.view=view;const cards=p.ICD[view](),summary=p.pageSummary(view);
    assert.equal((summary.match(/class="icard(?: |")/g)||[]).length,cards.length,'all page insights render directly');
    assert(!summary.includes('<details')&&!summary.includes('More insights'),'insights never require expanding a summary');
    const read=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),text=read(summary);
    for(const card of cards){
      assert(summary.includes(`<p class="icl">${card.l}</p>`));
      assert(text.includes(read(card.v).replace(/^(\d+(?:\.\d+)?%?)\s*\/\s*(?=\d)/,'$1 of ')),'the complete insight value survives its visual formatting');
      if(card.s)assert(text.includes(read(card.s)),'the complete supporting evidence remains visible');
    }
  }
  assert.equal(p.cSk().length,p.c7().length+p.c6().length+p.c10().length,'Skills includes every insight from its three sections');
  if(p.paceUnits().length&&p.paceScope(p.S.v4.u).ks.length){const students=p.ALL.map(i=>p.paceOf(i));assert.equal(p.c4().length,1+p.paceShort(students).length+(students.some(s=>s.proj===null)?1:0),'On pace retains every status and the insufficient-evidence insight')}
  const hardest=p.cSk().find(c=>c.l==='Hardest skill');if(hardest){app.click({act:'skillsection',g:hardest.group,k:String(hardest.k)});assert.equal(p.S.v6.sel[p.S.v6.tb],hardest.k,'the hardest-skill insight opens its actual evidence');assert(p.S.fold['pv-sk-unit'])} 
}
console.log(`Visual comparison checks passed: ${activity} activity traces, ${forecasts} mastery tracks, ${heatCells} heatmap cells, ${branches} prerequisite nodes, ${periods} synchronized periods.`);

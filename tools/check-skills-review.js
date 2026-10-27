// Check the displayed populations, shared scales, and evidence access against the real class data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
const boot = 'renderHead();fromHash();render();';
assert.equal(source.split(boot).length, 2);
function load(search) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {innerHTML:'', textContent:'', hidden:false, clientWidth:1450, classList:{toggle(){}}, style:{setProperty(){}}, focus(){}, querySelectorAll(){return[]}, querySelector(){return null}});
    return nodes.get(id);
  };
  const ctx = vm.createContext({window:{innerWidth:1750,addEventListener(){}},document:{querySelector:node,getElementById:id=>node('#'+id),addEventListener(){}}, location:{search,hash:'#skills',pathname:'/index.html',assign(){},replace(){}},setTimeout(){return 1},clearTimeout(){},console});
  ['js/alps-design-system.js','data/class.js','data/example.js','data/prereqs.js'].forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file}));
  vm.runInContext(source.replace(boot,'globalThis.SK_REVIEW={S,ALL,N,NM,WEAK,FD,hard5,v6list,vSk,v7,v10,v10stu,statK,fadeEvidence,fadeTrack,fadeKind,ML,MT,EVD,AT,KIT,tblCfg,tblQ,tblRow,tblHTML,tblCellDetail,credit,NBC,dayDate,BE,LV,STW,ptSel,ptGroups};'),ctx,{filename:'js/atlas.js'});
  return ctx.SK_REVIEW;
}
let units=0, skills=0, fades=0, cells=0, modes=0, studentPeriods=0;
for (const search of ['', '?books', '?today=2025-10-31']) {
  const X=load(search),S=X.S;
  const page=X.vSk();
  assert.match(page, /id="pv-sk-weak"/);
  assert.match(page, /class="mcard pv shut" id="pv-sk-unit"/);
  assert.match(page, /class="mcard pv shut" id="pv-sk-faded"/);
  assert(!/undefined|NaN|Infinity/.test(page));
  const hierarchy=X.hard5(0).T;
  S.v6.ex[0]={U:hierarchy.filter(U=>U.on).map(U=>U.u),J:hierarchy.flatMap(U=>U.subs.filter(J=>J.on).map(J=>J.j))};
  const outline=X.v6list(0);
  assert(outline.includes('Need support<small>Beginning / Attempted</small>'),'the support count has its own column label');
  const checkRow=(act,id,stats)=>{const match=outline.match(new RegExp(`<button[^>]*data-act="${act}" data-[ujk]="${id}"[^>]*>[^]*?</button>`));assert(match,'every expanded hierarchy row remains available');const row=match[0];assert(!/<(?:small|br)[^>]*>/.test(row),'row metrics have no repeated multiline descriptions');if(stats.p!==null){assert(row.includes(`<b>${Math.round(stats.p*100)}%</b>`),'not-mastered share is preserved');assert(row.includes(`<b>${stats.l[0]+stats.l[1]}</b><span aria-hidden="true"> / ${stats.a}</span>`),'the separate support count retains its assessed denominator');}};
  for(const U of hierarchy){
    const distinct=new Map(); U.subs.forEach(J=>J.ks.forEach(K=>{if(K.p!==null)distinct.set(K.k,K.s)}));
    assert.equal(U.a,[...distinct.values()].reduce((n,s)=>n+s.a,0),'unit assessed total counts a skill once');
    for(let level=0;level<5;level++)assert.equal(U.l[level],[...distinct.values()].reduce((n,s)=>n+s.l[level],0),'unit preserves all five levels');
    if(U.on){checkRow('v6unit',U.u,U);for(const J of U.subs.filter(J=>J.on&&J.ks.length)){checkRow('v6sub',J.j,J);for(const K of J.ks)checkRow('v6sk',K.k,K.s)}}
    units++;
  }
  S.v7.more=true;
  for(let r=0;r<X.WEAK.length;r++){
    S.v7.r=r;S.v7.pts=[];const m=X.WEAK[r],st=X.statK(m.k,X.ALL),h=X.v7();
    assert(!/undefined|NaN|Infinity/.test(h));
    assert(h.includes(`<b>${m.now.length}</b> of ${X.N}`),'weak count remains a class count');
    assert(h.includes(`${st.a} of ${X.N}`),'assessed population is visible');
    assert(h.includes(`${X.N-st.a} of ${X.N}`),'unknown population remains separate');
    const graphic=h.match(new RegExp(`<button[^>]*data-act="v7row" data-r="${r}"[^>]*>[^]*?</button>`));
    assert(graphic,'every tracked skill remains in the main chart');
    assert(graphic[0].includes(`data-weak="${m.now.length}"`)&&graphic[0].includes(`data-assessed="${st.a}"`)&&graphic[0].includes(`data-unknown="${X.N-st.a}"`));
    assert(!graphic[0].includes('composition-lane'),'the expanded skill uses its full mastery distribution instead of repeating a second stack');
    for(let other=0;other<X.WEAK.length;other++)if(other!==r&&X.WEAK[other].now.length){
      const row=h.match(new RegExp(`<button[^>]*data-act="v7row" data-r="${other}"[^>]*>[^]*?</button>`));
      if(row)assert(row[0].includes(`class="needs-support" style="width:${X.WEAK[other].now.length/X.N*100}%"`),'other overview rows retain the full roster count scale');
    }
    assert(h.includes('Compare dates')&&h.includes('Compare skills'),'comparison modes are explicit');
    const days=m.sv.map((v,j)=>v===null?-1:j).filter(j=>j>=0);
    const cases=days.length?[...new Set([days[0],days[Math.floor(days.length/2)],days.at(-1)])].map(j=>[{r,j}]):[];
    if(days.length>1)cases.push([{r,j:days[0]},{r,j:days.at(-1)}],[{r,j:days.at(-1)},{r,j:days.at(-1)}]);
    const peer=days.length?X.WEAK.findIndex((q,i)=>i!==r&&q.sv[days.at(-1)]!==null):-1;
    if(peer>=0)cases.push([{r,j:days.at(-1)},{r:peer,j:days.at(-1)}]);
    for(const points of cases){
      S.v7.pts=points;const view=X.v7(),P=X.ptSel(),G=X.ptGroups(P);
      assert(!/undefined|NaN/.test(view),'every inspection and comparison mode renders');
      assert.equal((view.match(/class="weak-mode-result"/g)||[]).length,1,'one shared result area in every mode');
      assert(view.indexOf('class="weak-mode-result"')<view.indexOf('class="skill-history"'),'results replace the left-hand summary instead of appending another panel');
      assert.equal((view.match(/Students and questions<\/button>/g)||[]).length,1,'one results entry point in every mode');
      assert.equal((view.match(/class="legend sbkey"/g)||[]).length,1,'all compared distributions share one legend');
      const distributions=[...view.matchAll(/<span class="sb" role="img" aria-label="([^"]*)"/g)].map(x=>x[1]);
      const records=P.kind==='one'?[[P.m.k,P.j]]:P.kind==='time'?[[P.m.k,P.a],[P.m.k,P.b]]:[[P.m1.k,P.j],[P.m2.k,P.j]];
      const expected=records.map(([k,j])=>{const counts=[0,0,0,0,0,0];for(const i of X.ALL){const lv=X.STW[i][k][j];counts[lv<0?5:lv]++}return [4,3,2,1,0,5].filter(lv=>counts[lv]).map(lv=>`${counts[lv]} ${lv===5?'unknown: fewer than two checks':X.LV[lv].toLowerCase()}`).join(', ')});
      assert(distributions.length>=1&&distributions.length<=records.length);
      assert(distributions.every(d=>expected.includes(d))&&expected.every(d=>distributions.includes(d)),'every level and unknown count survives comparison and deduplication');
      const groups=P.kind==='time'?{lost:G.lost.length,got:G.got.length,held:G.held.length,dev:G.dev.length,re:G.never.length+G.fell.length,unknown:G.early.length}:P.kind==='skills'?{both:G.both.length,one:G.one.length,two:G.two.length,unknown:X.N-G.both.length-G.one.length-G.two.length}:{};
      for(const [key,n]of Object.entries(groups))assert(view.includes(`data-group="${key}" data-count="${n}"`),'every transition or overlap count remains visible');
      modes++;
    }
    skills++;
  }
  S.v10.all=true;
  for(const o of X.FD){
    S.v10.k=o.k;const h=X.v10();
    assert(h.includes('Average mastery score (out of 100)')&&h.includes('Mastery score (out of 100)'),'class and student headers name the measured score and its scale');
    const pair=h.match(new RegExp(`<button[^>]*data-act="v10line" data-k="${o.k}"[^>]*>[^]*?</button>`));
    assert(pair&&pair[0].includes(`data-initial="${o.a}"`)&&pair[0].includes(`data-later="${o.b}"`),'paired dots retain the actual weighted scores');
    assert(pair[0].includes(`left:${Math.min(o.a,o.b)}%;width:${Math.abs(o.b-o.a)}%`),'link length shows the true score change on the common 0–100 scale');
    assert(h.includes('x1="10" x2="210"'),'every paired track uses the full score range');
    assert(!/undefined|NaN|Infinity/.test(h));
    const ev=X.fadeEvidence(o.k);assert.equal(ev.n,o.n);
    const exact=h.match(new RegExp(`<tr class="[^"]*" data-skill="${o.k}"[^>]*>[^]*?</tr>`));
    assert(exact,'every rechecked skill remains in the exact-figures table');
    assert(exact[0].includes(`<b>${Math.round(o.a)}</b>`)&&exact[0].includes(`<b>${Math.round(o.b)}</b>`),'exact averages retain their values');
    assert(exact[0].includes(ev.a)&&exact[0].includes(ev.b),'both evidence windows remain visible');
    assert(exact[0].includes(`<b class="fade-rechecked">${o.n}</b>`)&&exact[0].includes(`${o.sl.length} down 20+ pts`),'sample and student-drop counts remain visible');
    assert(h.includes(`out of ${X.N} students`),'the common roster denominator is named in the table header');
    assert(!h.includes('skills-check-cards'),'class scores are not repeated in summary cards');
    assert.equal((h.match(/Students and questions<\/button>/g)||[]).length,1,'class and student results share one question-evidence action');
    assert.equal((h.match(/Later checks · at least 21 days/g)||[]).length,1,'one legend explains the class and student charts');
    assert(!h.includes('class="fade-periods"'),'the expanded class view does not duplicate the chart with a check-period table');
    assert(!h.includes('Introduced in'),'the expanded rechecked-skill view omits introduction details');
    const ids=X.ALL.filter(i=>X.ML[i][o.k]!==null);let initial=0,later=0;
    for(const i of ids){const evidence=X.EVD[i][o.k];for(const e of evidence)(e.d<evidence[0].d+21?initial++:later++);}
    assert.equal(ev.an,initial);assert.equal(ev.bn,later);
    S.v10.sall=true;
    for(const i of [...new Set([ids[0],ids.at(-1)])].filter(i=>i!==undefined)){
      S.v10.student=i;const detail=X.v10stu(o),studentEv=X.fadeEvidence(o.k,i),studentRows=[...detail.matchAll(/<tr data-period="(initial|later)"[^>]*>[^]*?<\/tr>/g)];
      assert.equal(studentRows.length,2,'each student uses the same two period rows');
      assert(!detail.includes('Students and questions</button>'),'student drilldowns retain the shared class results action');
      assert(detail.includes(`id="fade-student-evidence" aria-labelledby="fade-student-name-${i}"`),'student details stay associated with their chart row');
      for(const [index,period]of studentRows.entries()){
        assert(period[0].includes(`<b>${Math.round((index?X.ML[i][o.k]:X.MT[i][o.k])*100)}</b>`),'student scores retain their actual weighted values');
        assert(period[0].includes(index?studentEv.b:studentEv.a));
        assert(period[0].includes(`<td class="period-count">${index?studentEv.bn:studentEv.an}`));
      }
      studentPeriods++;
    }
    S.v10.student=undefined;S.v10.sall=false;
    fades++;
  }
  const ks=[...new Set(X.WEAK.map(m=>m.k).concat(X.FD.map(o=>o.k)))];
  for(const k of ks){
    const T={k,from:'unit',P:null,f:'all',s:'lv0',s0:'lv0',dir:1,q:null,all:true},C=X.tblCfg(T),Q=X.tblQ(C,true);S.tbl=T;
    assert(!/undefined|NaN|Infinity/.test(X.tblHTML()));
    for(const q of Q.slice(0,4))for(const i of X.ALL){
      T.cell={i,ix:q.ix};const h=X.tblCellDetail(T,C,Q),a=X.AT[i].get(q.ix);
      assert(!/undefined|NaN|Infinity/.test(h));
      if(a){assert(h.includes(`${a[5]} total`),'attempt counts available without hover');assert(h.includes(`${Math.round(X.credit(a)*100)}%`),'partial credit remains exact');assert(h.includes('skill relevance'),'question weighting remains available');}
      else assert(h.includes('No attempt had started'),'missing evidence is not a zero score');
      cells++;
    }
  }
}
console.log(`Skills review checks passed: ${units} units, ${skills} skill views, ${modes} inspection/comparison states, ${fades} faded views, ${studentPeriods} student period tables, ${cells} evidence cells.`);

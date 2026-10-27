// Real-evidence regression checks for readiness, action estimates and their presentation.
// Run: node tools/check-ready-actions-review.js
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
const boot = 'renderHead();fromHash();render();';
assert.equal(source.split(boot).length, 2, 'one application entry point');
const instrumented = source.replace(boot, 'globalThis.REVIEW_TEST={S,ALL,NM,ASK,KTA,KIT,CAT,CUR,RDN,READY,TB,DR,WATCH,WB,NORM,JUDGE,CLASSIDLE,CLASSLOW,TOOFEW,paceUnits,paceOf,EV,MT,ML,IVS,actionScale,verdict,v12,v11,v11draw,readinessDiagram,rdDiagramPrereqs,rdSel,rdRows,rdC,rdF,rdP,rdCoverage,rdVerdict,rdLv,planNow,h11,c11,skNm,acceptPlan,unlog};');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function load(search = '') {
  const target = { innerHTML: '', querySelector() { return null; } };
  const ctx = vm.createContext({
    window: { innerWidth: 1440, addEventListener() {} },
    document: { addEventListener() {}, querySelector(s) { return s === '#v11c' ? target : null; }, querySelectorAll() { return []; } },
    location: { search, hash: '', pathname: '/index.html' },
    setTimeout() {}, clearTimeout() {}, console
  });
  for (const file of ['js/alps-design-system.js','data/class.js', 'data/example.js', 'data/prereqs.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
  }
  vm.runInContext(instrumented, ctx, { filename: 'js/atlas.js' });
  vm.runInContext('window.InsightLens.mount(document);', ctx);
  return { p: ctx.REVIEW_TEST, target };
}

// Frozen numerical outputs from the bundled data before this display review.
// These protect the excluded Drifting/On pace calculations, evidence weighting and
// existing intervention estimates. They do not freeze the revised HTML or copy.
const protectedResults = {
  '': {
    drifting: '00fb370fb511b3758d4165ced3cf76f82291a6d6a15a83fd1420e762b5b44176',
    pace: 'b2795dcae159e13f007999338d07e410f060dad5cbfe455b8f75dd87520e47aa',
    actions: '75f41d62c9f06ace97266a27818822b8fa53fb4bd0205cbea20e02257ced1027',
    evidence: '025a675430d21a9c5e6f3c51bce65d3ca8d055e009aedcfda90b5cba05208923'
  },
  '?today=2025-11-19': {
    drifting: '5632d3b8bf45b0abc6f748c37555593c140b39c4439b961cc56d96f10fa5dbc7',
    pace: '978e45f034c5b8f3113d8ac766ba5e87f17311ee42fca842bc97e83f953a31c9',
    actions: '2b63cba0df07c0db6e768b007e896cb8be7e07e0a7b6628c9a35ba65fabf4e89',
    evidence: '9e5a45517084d029798ae05a201d310e2af66c659f494b646975f55812483da2'
  },
  '?books': {
    drifting: 'a5851fa2965ccdeeb391e405ab66adce44fc09c9895f4d4ca8af7671ccecabf5',
    pace: 'f84d331200f5e90f3b46bb8c10ebe57d52b48c2606834bff98c43a11191f0dc9',
    actions: 'ecd65f2953b2e4f5fbcf7a443cef2bfd438e576bd92ae32e9d8ee228cc5aea5f',
    evidence: '1108c93c9c81c26c62376f3ffb5c3b296bde6441b735343730be56587b162b8e'
  }
};

let units = 0, prerequisiteRows = 0, relationships = 0, actionScenarios = 0;
for (const search of ['', '?today=2025-11-19', '?books', '?books&book=java-short-labs']) {
  const { p, target } = load(search), expected = protectedResults[search];
  if (expected) {
    assert.equal(digest({ DR: p.DR, WATCH: p.WATCH, WB: p.WB, NORM: p.NORM, JUDGE: p.JUDGE, CLASSIDLE: p.CLASSIDLE, CLASSLOW: p.CLASSLOW, TOOFEW: p.TOOFEW }), expected.drifting, `${search}: protected Drifting calculations`);
    const pace = [];
    for (const u of p.paceUnits()) { p.S.v4.u = u; pace.push({ u, students: p.ALL.map(i => p.paceOf(i)) }); }
    assert.equal(digest(pace), expected.pace, `${search}: protected On pace calculations for every unit and student`);
    assert.equal(digest(p.IVS.map(d => ({ n: d.n, est: d.est, lo: d.lo, hi: d.hi, na: d.na, nb: d.nb, ks: d.ks, nq: d.nq, day: d.day, who: d.who }))), expected.actions, `${search}: intervention estimates and comparison groups unchanged`);
    assert.equal(digest({ EV: p.EV, CUR: p.CUR, MT: p.MT, ML: p.ML, CAT: p.CAT }), expected.evidence, `${search}: all weighted evidence and levels unchanged`);
  }
  p.S.view = 10;
  for (let u = 0; u < p.TB[0].units.length; u++) {
    p.S.v11.u[0] = u;
    const R = p.rdSel(), P = p.planNow(), coverage = p.rdCoverage(R);
    assert.equal(P.n, R.all.filter(q => p.rdP(q.k, R.ids) !== null).length, 'plan assesses all direct prerequisites, including those outside the tree preview');
    assert.equal(coverage.assessed + coverage.unknown, coverage.total);
    assert.equal(coverage.total, R.ids.length * R.all.length, 'coverage denominator is student–prerequisite records');
    assert(!p.v11().includes('id="v11ver"'), 'teacher view has no Version selector');
    p.v11draw();
    if (R.all.length) {
      assert(target.innerHTML.includes('class="metric-table rd-table"'),'one table retains all prerequisite figures and relationships');
      assert(!target.innerHTML.includes('class="prereq-map"'),'the duplicate prerequisite map is removed');
      assert(target.innerHTML.includes(`${R.all.length} direct prerequisites`),'the full prerequisite count is visible');
      assert(target.innerHTML.includes('data-readiness-layout="tree"'),'the original tree is the primary readiness diagram');
      assert(p.v11().includes('aria-label="Readiness diagram"') && p.v11().includes('>Tree</button>') && p.v11().includes('>Radial</button>'),'both descriptive layout choices are available');
      const planBefore=digest(p.planNow());
      for(const [layout,name] of [['now','tree'],['2','radial']]){
        p.S.v11.ver=layout;
        const diagram=p.readinessDiagram(R,R.ids,null);
        assert(diagram.includes(`data-readiness-layout="${name}"`));
        assert.equal((diagram.match(/class="readiness-node"/g)||[]).length,R.pre.reduce((n,q)=>n+1+(q.cs||[]).length,0),'both layouts retain all preview rings');
        assert(!/NaN|undefined|Infinity|var\(--(?!il-)/.test(diagram));
        for(const q of R.pre)assert(diagram.includes(`data-k="${q.k}"`),'prerequisites remain inspectable in either layout');
        assert.equal(digest(p.planNow()),planBefore,'changing layout never changes the readiness plan');
        p.S.v11.allSkills=true;
        const full=p.readinessDiagram(R,R.ids,null),shown=p.rdDiagramPrereqs(R,R.ids);
        assert.equal((full.match(/data-prereq-kind="direct"/g)||[]).length,R.all.length,'all mode draws every direct prerequisite');
        assert.equal(new Set(shown.map(q=>q.k)).size,R.all.length,'all direct prerequisite skills are unique');
        assert.equal((full.match(/class="readiness-node"/g)||[]).length,shown.reduce((n,q)=>n+1+(q.cs||[]).length,0));
        assert(!/NaN|undefined|Infinity/.test(full),'both full layouts have valid geometry');
        for(const q of R.all)assert(full.includes(`data-k="${q.k}"`),'all mode includes skills without readiness evidence');
        assert.equal(digest(p.planNow()),planBefore,'showing all skills leaves the plan unchanged');
        assert.equal(digest(p.rdSel()),digest(R),'showing all skills does not alter prerequisite selection or ranking');
        if(R.all.length>R.pre.length)assert(p.v11().includes('id="v11all" aria-controls="readiness-diagram" checked'),'the native checkbox reflects all mode');
        p.S.v11.allSkills=false;
        assert.equal((p.readinessDiagram(R,R.ids,null).match(/data-prereq-kind="direct"/g)||[]).length,R.pre.length,'turning the flag off restores the preview');
      }
      p.S.v11.ver='now';
    }
    const rows = p.rdRows(R.all, R.ids);
    assert.equal((rows.match(/<tr>/g) || []).length, R.all.length + 1, 'every direct prerequisite has the same row format');
    for (const q of R.all) {
      const assessed = p.rdC(q.k, R.ids), qualifying = p.rdF(q.k, R.ids).length;
      assert(qualifying <= assessed && assessed <= R.ids.length);
      assert.equal(assessed, R.ids.filter(i => p.rdLv(i, q.k) !== null).length);
      assert(target.innerHTML.includes(`data-fold="rdskill:${q.k}"`), 'all direct rows remain reachable, including collapsed extra prerequisites');
      const row = p.rdRows([q], R.ids);
      assert(row.includes(`<b>${qualifying} / ${assessed}</b>`), 'numerator and assessed denominator are visible together');
      assert(row.includes(`${R.ids.length - assessed} unknown`));
      for (const k of q.cs || []) {
        assert(row.includes(`data-act="rdinspect" data-k="${k}"`) && row.includes(p.skNm(k)), 'every underlying relationship remains inspectable in row detail');
        relationships++;
      }
      prerequisiteRows++;
    }
    for (const name of P.ext) assert(R.all.every(q => p.rdLv(p.NM.indexOf(name), q.k) === 4), 'extension requires mastery on every direct prerequisite');
    units++;
  }

  p.S.view = 11;
  const estimated = p.IVS.filter(d => d.est !== null), waiting = p.IVS.filter(d => d.est === null), html = p.v12();
  assert.equal((html.match(/class="effect-plot graphic-lane"/g)||[]).length,estimated.length,'unknown outcomes are never plotted at zero');
  estimated.forEach(d=>{const scale=p.actionScale(estimated.map(d=>({d}))),left=(d.lo-scale.min)/(scale.max-scale.min)*100,width=(d.hi-d.lo)/(scale.max-scale.min)*100,row=html.match(new RegExp(`<span class="effect-plot graphic-lane"[^>]*data-estimate="${d.est}"[^>]*>[^]*?</span>`));assert(row&&row[0].includes(`data-low="${d.lo}"`)&&row[0].includes(`data-high="${d.hi}"`),'the primary effect plot retains negative and positive interval endpoints');const range=row[0].match(/class="effect-range" style="left:([\d.e+-]+)%;width:([\d.e+-]+)%/);assert(range&&Math.abs(+range[1]-left)<1e-8&&Math.abs(+range[2]-width)<1e-8,'interval geometry uses the common difference-in-score scale')});
  const plotted=html.match(/<span class="effect-plot graphic-lane"[\s\S]*?<\/span>/g)||[];
  assert(plotted.every(row=>(row.match(/effect-estimate/g)||[]).length===1),'one estimate marker per measured set');
  const waitMarkup = html.match(/<details class="action-waiting"[^>]*>([\s\S]*?)<\/details>/);
  if (waiting.length) {
    assert(waitMarkup, 'unestimated sets have an explicit waiting list');
    assert.equal((waitMarkup[1].match(/<li>/g) || []).length, waiting.length, 'every waiting set remains accessible');
    assert(!waitMarkup[1].includes('<svg'), 'waiting list conveys no numerical estimate');
    waiting.forEach(d => assert(waitMarkup[1].includes(d.n), 'full distinguishing set title is visible'));
  }
  estimated.forEach(d => {
    assert(html.includes(`>${d.n}<small>`), 'full estimated-set title is visible and selectable');
    assert(html.includes(`${d.na} participants vs ${d.nb} classmates with enough checks`));
  });
  assert(!html.includes('>Worked<') && !html.includes('helped →'), 'comparison is labeled observationally');
  assert.equal(p.verdict({ est: null }).t, 'Awaiting evidence');
  assert.equal(p.verdict({ est: -5, lo: -10, hi: -1 }).t, 'Clear negative difference');
  for (const [lo, hi] of [[-43, 87], [0, 0], [52, 145], [-104, -7], [-0.2, 0.7]]) {
    const scale = p.actionScale([{ d: { lo, hi } }]);
    assert(scale.min <= lo && scale.max >= hi && scale.min <= 0 && scale.max >= 0);
    assert(scale.max > scale.min);
    for (const v of [lo, hi, 0]) assert(scale.x(v) >= 12 && scale.x(v) <= 308, 'intervals beyond old -10 to 25 bounds remain visible');
  }
  assert(p.actionScale([]).max > p.actionScale([]).min, 'no-estimate state has a finite, nonempty domain');
  actionScenarios++;
}

// Controlled readiness evidence: every measured student masters one prerequisite,
// while a second prerequisite has no evidence. Unknown must qualify the verdict
// and prevent extension, even though the measured share is 100%.
{
  const { p } = load();
  const all = Object.values(p.READY).flat(), known = all.find(q => p.KTA[q.k] && p.rdC(q.k, p.ALL) >= 8), unknown = all.find(q => p.rdC(q.k, p.ALL) === 0);
  assert(known && unknown && known.k !== unknown.k, 'real prerequisite graph supplies measured and unknown fixtures');
  p.S.v11.u[0] = 0;
  p.S.v11.lv = 'P';
  p.READY['0:0'] = [known, unknown];
  p.ALL.forEach(i => { p.CAT[i][known.k] = 'F'; p.CUR[i][known.k] = 1; });
  p.RDN[known.k] = -1;
  const R = p.rdSel(), P = p.planNow(), coverage = p.rdCoverage(R);
  assert.equal(p.rdP(known.k, p.ALL), 100);
  assert.equal(coverage.missing, 1);
  assert.equal(coverage.unknown, p.ALL.length);
  assert.equal(P.ext.length, 0, 'an unknown prerequisite never qualifies a student for extension');
  assert.equal(p.rdVerdict('P').t, 'Evidence incomplete');
  assert(p.h11().includes('Readiness is provisional') && p.h11().includes(`${p.ALL.length} of ${p.ALL.length * 2} student–prerequisite levels are unknown`));
  p.READY['0:0'] = [known];
  assert.equal(p.rdVerdict('P').t, 'Ready', 'complete, qualifying evidence can produce the full ready verdict');
  assert.equal(p.planNow().ext.length, p.ALL.length);
  p.acceptPlan();
  assert.equal(p.S.log.length, 1, 'accepting the extension plan still logs an action');
  p.acceptPlan();
  assert.equal(p.S.log.length, 1, 'accepting again replaces its action instead of duplicating it');
  p.unlog(p.S.log[0].key);
  assert.equal(p.S.log.length, 0, 'the action remains reversible');
}

console.log(`Ready/actions review passed: ${units} unit scenarios, ${prerequisiteRows} prerequisite rows, ${relationships} underlying relationships, ${actionScenarios} action scopes; protected calculations unchanged.`);

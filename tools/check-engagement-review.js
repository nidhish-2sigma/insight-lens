// Exercise the comparison, filters and plotted measurements using the application's real evidence.
// Run: node tools/check-engagement-review.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
const boot = 'renderHead();fromHash();render();';
assert.equal(source.split(boot).length, 2);
const instrumented = source.replace(boot, 'globalThis.ENG_TEST={S,ALL,NM,TAUGHT,TB0,SUBS,KEYC,KTA,EV,AT,SL,LVCOL,cellN,nodeItems,nodeSkills,evidence2,studentTable2,studentEvidence2,overlapGroups2,overlapRadius2,v2scatter,v2draw,v2,c2};');

function load(search = '') {
  const nodes = new Map(), events = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: '', textContent: '', hidden: false, clientWidth: 1200,
      classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, scrollIntoView() {},
      getBoundingClientRect() { return { top: 0 }; },
      querySelectorAll() { return []; }, querySelector() { return null; }
    });
    return nodes.get(selector);
  };
  const ctx = vm.createContext({
    window: { innerWidth: 1450, addEventListener() {} },
    document: {
      querySelector: node, getElementById: id => node('#' + id),
      addEventListener(name, fn) { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); }
    },
    location: { search, hash: '#engagement', pathname: '/index.html', assign() {} },
    setTimeout() {}, clearTimeout() {}, console
  });
  for (const file of ['js/alps-design-system.js','data/class.js', 'data/example.js', 'data/prereqs.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
  }
  vm.runInContext(instrumented, ctx, { filename: 'js/atlas.js' });
  const p = ctx.ENG_TEST;
  return {
    p, node,
    click(dataset, within) { const t = { dataset, closest(selector) { return selector===within?{}:null; } }; events.get('click').forEach(fn => fn({ target: { closest() { return t; } }, detail: 1 })); },
    change(target) { events.get('change').forEach(fn => fn({ target })); }
  };
}

let checks = 0, capped = 0, labUnits = 0, overlaps = 0;
for (const query of ['', '?books']) {
  const app = load(query), p = app.p;
  const sample=[{i:0,X:10,Y:10},{i:1,X:10,Y:10},{i:2,X:23,Y:10},{i:3,X:36,Y:10},{i:4,X:100,Y:100}],saved=JSON.stringify(sample);
  assert.deepEqual(Array.from(p.overlapGroups2(sample),g=>Array.from(g,p=>p.i)),[[0,1,2,3]],'exact, nearby and chained overlaps are one selectable group');
  assert.equal(JSON.stringify(sample),saved,'grouping does not move or mutate measured coordinates');
  assert(Math.abs(p.overlapRadius2(8)**2/p.overlapRadius2(2)**2-4)<1e-9,'circle area scales in direct proportion to student count');
  const mixed=['on','on','go','go','coast','coast','stuck','off'].map((g,i)=>({i,X:10,Y:10,c:{g}}));
  assert.deepEqual(Array.from(p.overlapGroups2(mixed),g=>Array.from(g,p=>p.i)),[[0,1],[2,3],[4,5],[6,7]],'overlapping groups preserve the existing green, neutral, amber and red status meanings');
  p.v2draw();
  const initial = app.node('#v2top').innerHTML;
  assert(initial.includes('eng-relationship'), 'the relationship plot is primary');
  assert(initial.includes('actual score from 0 to 100 against'), 'both measured axes are explicit');
  assert(!p.v2().includes('eng-grid') && !p.v2().includes('id="v2c"'), 'the secondary curriculum graph is removed');
  app.click({act:'v2mode',f:'table'});
  assert.equal((app.node('#v2top').innerHTML.match(/data-student="\d+"/g)||[]).length,Math.min(12,p.ALL.length),'exact figures remain accessible');
  app.change({id:'v2all',checked:true});
  assert.equal((app.node('#v2top').innerHTML.match(/data-student="\d+"/g)||[]).length,p.ALL.length,'Show all retains every student');
  checks++;

  for (const u of p.TAUGHT) {
    const n = { t: 'u', id: u };
    p.S.v2.sel = n; p.S.v2.hl = null;
    const html = p.studentTable2(p.ALL, 0, n);
    const shared=p.evidence2(p.ALL[0],n,p.cellN(p.ALL[0],0,n));
    const headers=html.match(/<thead>(.*?)<\/thead>/s)[1];
    assert(headers.includes('Mastery<br>score out of 100'));
    assert(headers.includes(`Checked skills<br>${p.cellN(p.ALL[0],0,n).lab?'Not assessed':shared.total?`out of ${shared.total}`:'No eligible skills'}`));
    assert(headers.includes(`tried<br>${shared.its.length?`out of ${shared.its.length}`:'No eligible practice'}`));
    const rows = [...html.matchAll(/<tr[^>]*data-student="(\d+)"[^>]*>(.*?)<\/tr>/gs)];
    if(!p.cellN(p.ALL[0],0,n).lab){const plot=p.v2scatter(0,n,p.ALL,900),points=p.ALL.map(i=>({i,c:p.cellN(i,0,n)})).filter(p=>p.c.m!==undefined&&p.c.m!==null&&!['U','Q'].includes(p.c.mc)).map(p=>({i:p.i,c:p.c,X:66+p.c.e*810,Y:392-p.c.m*360}));
    const groups=Array.from(p.overlapGroups2(points),g=>Array.from(g,p=>p.i).join(',')),markers=[...plot.matchAll(/data-act="v2overlap" data-students="([\d,]+)"/g)].map(m=>m[1]);
    assert.deepEqual(markers,groups,'each overlap group exposes every member once, including non-identical nearby marks');
    overlaps+=markers.length;}
    assert.equal(rows.length, p.ALL.length, 'one row per student, including insufficient evidence');
    for (const [_, raw, row] of rows) {
      const i = +raw, c = p.cellN(i, 0, n), a = p.evidence2(i, n, c);
      assert.equal(a.tried, a.its.filter(ix => p.AT[i].has(ix)).length);
      assert(a.tried <= a.its.length && a.checked <= a.total);
      assert.equal(a.total,shared.total,'eligible skill denominators are shared by every student in this scope');
      assert.equal(a.its.length,shared.its.length,'eligible practice denominators are shared by every student in this scope');
      assert(row.includes(`data-label="Mastery" data-scale="score out of 100"`),'mobile field headings retain the shared score scale');
      assert(row.includes(`data-scale="${a.its.length?`out of ${a.its.length}`:'No eligible practice'}"`),'mobile field headings retain the eligible practice total');
      assert(row.includes(`<b>${a.tried}</b></span>`),'practice rows show the count with the denominator in the header');
      assert.equal((row.match(/data-label=/g) || []).length, 5, 'identical fields for each student');
      assert(row.includes(`data-act="pin" data-i="${i}"`));
      const statusTone=['on','labs'].includes(c.g)?'good':['stuck','off'].includes(c.g)?'bad':c.g==='coast'?'watch':'neutral';
      assert(row.includes(`class="pill eng-status ${statusTone}"`),'table status colors agree with the engagement graph');
      if(!c.lab){const complete=a.total>0&&a.checked===a.total;assert(row.includes(`class="eng-count${complete?' complete':''}"`),'a green coverage check requires all eligible skills to be assessed');assert(row.includes(`<span>${a.checked}</span></span>`),'coverage rows show only the checked count');}
      const practiceTone=!a.its.length?'neutral':a.tried/a.its.length>=p.S.v2.line/100?'good':c.g==='coast'?'watch':'bad';
      assert(row.includes(`class="eng-count eng-practice ${practiceTone}"`),'practice checks and alerts use the actual threshold without changing mastery semantics');
      const evidence=p.studentEvidence2(i,n,c),text=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      const cards=Object.fromEntries([...evidence.matchAll(/data-metric="([^"]+)"[^>]*>(.*?)<\/div>/gs)].map(m=>[m[1],text(m[2])]));
      assert.deepEqual(Object.keys(cards),['mastery','coverage','practice'],'every student uses the same evidence cards');
      assert(cards.practice.includes(`${a.tried} / ${a.its.length}`),'the practice card retains the actual tried and eligible counts');
      assert(cards.practice.includes(a.its.length?`${p.S.v2.line}% threshold`:'No eligible practice yet'));
      if (c.lab) {
        assert.equal(a.score, null); assert.equal(a.total, 0);
        assert.equal((row.match(/Not assessed/g) || []).length, 2, 'labs have no invented score, level or evidence');
        for(const field of ['mastery','coverage'])assert(cards[field].includes('Not assessed'),'lab participation does not invent assessed metrics');
      } else if (a.score === null) {
        assert(row.includes('More checks needed'), 'unknown score is labeled, rather than plotted as zero');
        assert(cards.mastery.includes('More checks needed'),'unknown evidence remains explicit in the cards');
      } else {
        const mastery=row.match(/<td data-label="Mastery"[^>]*>(.*?)<\/td>/s)[1];
        assert(mastery.includes(`<b>${a.score}</b>`),'the single mastery field retains the actual score on the shared scale');
        assert(row.includes(p.SL[c.mc]));
        assert(row.includes('class="eng-level"><svg'),'mastery uses the shared ALPS battery icon');
        assert(cards.mastery.includes(`${a.score} / 100`),'the mastery card shows the raw score on its full scale');
        assert(cards.mastery.includes(p.SL[c.mc]),'the same mastery card retains the coverage-adjusted category');
        assert(cards.coverage.includes(`${a.checked} / ${a.total}`));
        assert(cards.coverage.includes(`${a.checked-c.st.close.length} mastered`),'the mastery count retains the full eligible-skill denominator');
        for(const k of c.st.close)assert(evidence.includes(`data-k="${k}" data-f="all"`),'every developing skill still opens its underlying evidence');
      }
      if (c.st && c.st.cap) {
        assert(row.includes('class="sw hollow"'),'coverage-limited levels reuse the hollow mark from the graph');
        const plot = p.v2scatter(0, n, p.ALL, 900), group = plot.match(new RegExp(`<g[^>]*data-i="${i}"[^>]*>(.*?)<\\/g>`, 's'));
        assert(group, 'a student with capped coverage still has an actual-score dot');
        const circle = group[1].match(/cy="([\d.]+)"/);
        const B = 32 + 360; // 900px chart: the height clamps at 360px.
        assert(Math.abs(+circle[1] - (B - c.m * 360)) <= 0.051, 'the plotted y position uses actual score, even when coverage caps the level');
        assert(group[0].includes('tabindex="0"') && group[0].includes('role="button"'), 'relationship marks are keyboard accessible');
        assert(p.studentEvidence2(i, n, c).includes('Coverage limits the level'));
        capped++;
      }
    }
    if (p.ALL.some(i => p.cellN(i, 0, n).lab)) labUnits++;
    for (const g of new Set(p.ALL.map(i => p.cellN(i, 0, n).g))) {
      p.S.v2.hl = g;
      const filteredHTML=p.studentTable2(p.ALL, 0, n);
      assert.equal(filteredHTML.match(/<thead>(.*?)<\/thead>/s)[1],headers,'status filters cannot change the shared denominators');
      const filtered = [...filteredHTML.matchAll(/data-student="(\d+)"/g)].map(m => +m[1]);
      const expected = p.ALL.filter(i => p.cellN(i, 0, n).g === g).slice().sort((a, b) => p.NM[a].localeCompare(p.NM[b]));
      assert.deepEqual(filtered, Array.from(expected), 'filters show exactly their matching students');
    }
    checks++;
  }

  p.S.v2.hl = null; p.S.v2.sel = { t: 'u', id: p.TAUGHT[0] };
  const pinned = p.S.stu;
  app.click({ act: 'v2mode', f: 'relationship' });
  assert.equal(p.S.v2.mode, 'relationship');
  app.click({ act: 'v2detail', i: '0' });
  assert.equal(p.S.v2.detail, 0);
  assert.equal(p.S.stu, pinned, 'selecting evidence does not change the followed student');
  assert(app.node('#dlg').innerHTML.includes('id="eng-evidence-panel"'), 'evidence opens in the shared dialog layer');
  assert(app.node('#dlg').innerHTML.includes('role="dialog" aria-modal="true"'), 'evidence is identified as a modal');
  assert(!app.node('#v2top').innerHTML.includes('id="eng-evidence-panel"'), 'evidence does not displace the chart or table');
  assert.equal(app.node('.shell').inert,true,'the background is inactive while evidence is open');
  app.change({ id: 'v2filter', value: 'all' });
  assert.equal(p.S.v2.hl, null);
  app.click({ act: 'v2close' });
  assert.equal(p.S.v2.detail, null, 'the selected evidence can be closed');
  assert.equal(app.node('#dlg').hidden,true);
  assert.equal(app.node('.shell').inert,false,'closing evidence restores the page');
  const members=Array.from(p.ALL.slice(0,15));
  app.click({act:'v2overlap',students:members.join(',')});
  assert.equal((app.node('#dlg').innerHTML.match(/data-student="\d+"/g)||[]).length,members.length,'every overlap member is shown without pagination');
  assert.equal(p.S.stu,pinned,'choosing a group does not change the followed student');
  app.click({act:'v2detail',i:String(members[0])},'.eng-overlap-list');
  assert.equal(p.S.v2.detail,members[0]);assert.equal(p.S.v2.overlap.length,members.length);
  assert(app.node('#dlg').innerHTML.includes('data-act="v2overlapback"'),'individual evidence retains a way back to the whole group');
  app.click({act:'v2overlapback'});assert.equal(p.S.v2.detail,null);
  assert.equal((app.node('#dlg').innerHTML.match(/data-student="\d+"/g)||[]).length,members.length);
  app.click({act:'v2close'});assert.equal(p.S.v2.overlap,null);assert.equal(app.node('#dlg').hidden,true);
  assert(p.c2().every(card => card.act === 'v2hl' && card.group), 'summary cards filter their own exact group');
  checks++;
}
assert(capped > 0, 'real evidence exercises coverage-capped students');
assert(labUnits > 0, 'example books exercise lab practice');
assert(overlaps>0,'real evidence exercises overlapping students');
console.log(`${checks} engagement scenarios passed (${capped} coverage-capped scores, ${labUnits} lab units, ${overlaps} overlap groups).`);

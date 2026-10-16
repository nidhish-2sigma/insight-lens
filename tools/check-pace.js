// Exercise the real pace calculations and event handlers without browser dependencies.
// Run directly with node tools/check-pace.js, or via tools/check.js --checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
const boot = 'renderHead();fromHash();render();';
assert.equal(source.split(boot).length, 2, 'one application entry point');
const instrumented = source.replace(boot,
  'globalThis.PACE_TEST={S,D,TB0,DUI,KEY,KIT,KT,EVD,ALL,TODAY,paceUnits,paceScope,paceOf,paceMemo,isoOf,v4,v4draw,h4,flags,vProf,render};');

function load(search = '', width = 1450) {
  const nodes = new Map(), events = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
      innerHTML: '', textContent: '', hidden: false, clientWidth: width,
      classList: { toggle() {} }, style: { setProperty() {} }, focus() {},
      querySelectorAll() { return []; }, querySelector() { return null; }
    });
    return nodes.get(id);
  };
  const context = vm.createContext({
    window: { innerWidth: width + 300, addEventListener() {} },
    document: {
      querySelector: node, getElementById: id => node('#' + id),
      addEventListener(name, fn) {
        if (!events.has(name)) events.set(name, []);
        events.get(name).push(fn);
      }
    },
    location: { search, hash: '#pace', pathname: '/index.html', assign() {}, replace() {} },
    setTimeout() { return 1; }, clearTimeout() {}, console
  });
  for (const file of ['data/class.js', 'data/sample.js', 'data/example.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  vm.runInContext(instrumented, context, { filename: 'js/atlas.js' });
  const p = context.PACE_TEST;
  p.S.view = 4;
  return { p, nodes, node, change(target) { events.get('change').forEach(fn => fn({ target })); } };
}

let passed = 0;
function check(name, fn) { fn(); passed++; }
const app = load(), p = app.p, initialUnit = p.S.v4.u;

check('the complete target scope includes unstarted lessons and more than four earlier skills', () => {
  let broaderThanReady = false;
  for (const u of p.paceUnits()) {
    const scope = p.paceScope(u), raw = p.D.units[p.DUI[u]], previous = new Set();
    p.D.units.forEach((unit, ix) => {
      if (ix < p.DUI[u] && unit.tb === raw.tb) {
        unit.subs.forEach(j => p.D.subs[j].skills.forEach(([k, taught]) => { if (taught) previous.add(k); }));
      }
    });
    const used = new Set(raw.subs.flatMap(j => p.D.subs[j].skills.map(row => row[0])));
    assert.equal(new Set(scope.ks).size, scope.ks.length, 'shared skills counted once');
    assert(scope.ks.every(k => scope.target.includes(k) || (previous.has(k) && used.has(k))), 'only target and relevant earlier skills');
    assert(scope.previous.every(k => !scope.target.includes(k)), 'groups are disjoint');
    assert(p.KEY[u].every(k => scope.ks.includes(k)), 'all key skills included, even in future units');
    if (scope.previous.length > (raw.pre || []).length) broaderThanReady = true;
  }
  assert(broaderThanReady, 'pace is not restricted to the readiness tree’s top four');
});

check('stale exports retain observed pace and every projection stays bounded', () => {
  const initial = p.ALL.map(i => p.paceOf(i));
  assert(initial.some(o => o.end < p.TODAY - 30 && o.proj > o.now), 'the default view must show forecasts despite the old export');
  p.v4draw();
  assert(app.node('#v4c').innerHTML.includes('stroke-width:3;stroke-dasharray:4 3'), 'default tracks visibly extend to predicted values');
  assert(p.v4().includes('Projections assume work resumes'), 'old evidence is presented as a conditional forecast');
  for (const u of p.paceUnits()) {
    p.S.v4.u = u;
    for (const i of p.ALL) {
      const o = p.paceOf(i);
      assert(o.goal >= o.now);
      if (o.proj !== null) {
        assert(o.proj >= o.now && o.proj <= o.goal);
        assert(o.end <= p.TODAY, 'history does not use future checks');
        if (o.rec <= 0) assert.equal(o.proj, o.now, 'no gains are invented for a student with a flat or declining observed pace');
      }
    }
  }
  p.S.v4.u = initialUnit;
});

// Controlled evidence for the real selected scope: one skill gained earlier,
// two gained recently. Every other required skill has no evidence yet.
const scope = p.paceScope(initialUnit), ks = Array.from(scope.ks);
assert(ks.length > 6, 'fixture needs room to project');
p.EVD[0].fill(null);
const secure = (k, day) => { p.EVD[0][k] = [{ d: day, c: 1 }, { d: day + 1, c: 1 }]; };
secure(ks[0], p.TODAY - 45);
secure(ks[1], p.TODAY - 15);
secure(ks[2], p.TODAY - 10);
p.paceMemo.clear();

check('the selected date changes the estimate and the status', () => {
  p.S.v4.day = p.TODAY;
  const today = p.paceOf(0);
  assert.equal(today.proj, 3);
  p.S.v4.day = p.TODAY + 30;
  const month = p.paceOf(0);
  assert.equal(month.proj, 5);
  assert.equal(month.st, 'Short, but catching up');
  p.S.v4.day = p.TODAY + 10000;
  const later = p.paceOf(0);
  assert.equal(later.proj, ks.length);
  assert(['Ahead', 'On pace'].includes(later.st));
});

check('other skills and future evidence cannot change a target projection', () => {
  p.S.v4.day = p.TODAY + 30;
  const before = p.paceOf(0);
  const unrelated = p.D.skills.findIndex((_, k) => !ks.includes(k));
  assert(unrelated >= 0);
  secure(unrelated, p.TODAY - 10);
  secure(ks[3], p.TODAY + 5);
  p.paceMemo.clear();
  const after = p.paceOf(0);
  assert.equal(after.now, before.now);
  assert.equal(after.end, before.end);
  assert.equal(after.rec, before.rec);
  assert.equal(after.proj, before.proj);
});

check('a new target recalculates scope instead of reusing the prior memo', () => {
  const before = p.paceOf(0);
  const u = p.paceUnits().find(u => p.paceScope(u).ks.length !== before.goal);
  assert.notEqual(u, undefined);
  p.S.v4.u = u;
  assert.equal(p.paceOf(0).goal, p.paceScope(u).ks.length);
  assert.notEqual(p.paceOf(0).goal, before.goal);
  p.S.v4.u = initialUnit;
});

check('insufficient evidence is unknown, and secure students have reached the goal', () => {
  p.EVD[1].fill(null);
  p.paceMemo.clear();
  const unknown = p.paceOf(1);
  assert.equal(unknown.proj, null);
  assert.equal(unknown.st, 'Too early to tell');
  assert.equal(unknown.behind, false);
  for (const k of ks.slice(0, 2)) p.EVD[1][k] = [{ d: p.TODAY - 1, c: 1 }, { d: p.TODAY - 1, c: 1 }];
  p.paceMemo.clear();
  assert.equal(p.paceOf(1).proj, null, 'one day of checks cannot establish a learning rate');
  for (const k of ks) secure(k, p.TODAY - 10);
  p.paceMemo.clear();
  assert.equal(p.paceOf(0).now, ks.length);
  assert.equal(p.paceOf(0).proj, ks.length);
  assert.equal(p.paceOf(0).st, 'Ahead');
});

check('calendar, target, sorting and follow controls update the rendered view', () => {
  p.render();
  const date = p.isoOf(p.TODAY + 60);
  app.change({ id: 'v4date', value: date });
  assert.equal(p.S.v4.day, p.TODAY + 60);
  assert(app.node('#view').innerHTML.includes(`value="${date}"`));
  const next = p.paceUnits().find(u => u !== initialUnit);
  app.change({ id: 'v4unit', value: String(next) });
  assert.equal(p.S.v4.u, next);
  for (const sort of ['status', 'proj', 'name']) {
    app.change({ id: 'v4sort', value: sort });
    assert.equal(p.S.v4.sort, sort);
    const svg = app.node('#v4c').innerHTML;
    assert.equal((svg.match(/data-act="stu"/g) || []).length, p.ALL.length);
    assert(!/NaN|Infinity|undefined/.test(svg));
  }
  p.S.stu = 0;
  app.change({ id: 'v4unit', value: String(initialUnit) });
  assert(p.flags(0).some(f => f.v === 4 && f.t.includes(p.TB0[initialUnit].s)));
  assert.equal(app.node('#thread').hidden, false);
  assert(p.vProf().includes('Pace · ' + p.TB0[initialUnit].s));
});

check('invalid, empty and past dates preserve the last valid goal', () => {
  const valid = p.S.v4.day;
  for (const value of ['', 'not-a-date', '2026-02-30', p.isoOf(p.TODAY - 1)]) {
    const target = { id: 'v4date', value };
    app.change(target);
    assert.equal(p.S.v4.day, valid);
    assert.equal(target.value, p.isoOf(valid));
  }
});

check('wide and narrow tracks have a finite common skill scale and every student', () => {
  p.S.stu = null;
  for (const width of [1450, 900, 390]) {
    app.node('#view').clientWidth = width;
    p.v4draw();
    const svg = app.node('#v4c').innerHTML;
    assert.equal((svg.match(/data-act="stu"/g) || []).length, p.ALL.length);
    assert.equal((svg.match(/<svg class="viz"/g) || []).length, width === 1450 ? 2 : 1);
    assert(!/NaN|Infinity|undefined/.test(svg));
    assert(svg.includes('Required skills mastered'));
    assert(svg.includes('Goal: ' + p.paceScope(p.S.v4.u).ks.length));
  }
});

check('active historical dates produce real gains and date-dependent dashed tracks', () => {
  const active = load('?today=2025-12-08'), q = active.p;
  const gains = [];
  for (const u of q.paceUnits()) {
    q.S.v4.u = u;
    for (const i of q.ALL) if (q.paceOf(i).rec > 0) gains.push({ u, i });
  }
  assert(gains.length > 0);
  q.S.v4.u = gains[0].u;
  q.S.v4.day = q.TODAY;
  const before = q.paceOf(gains[0].i);
  q.S.v4.day += 30;
  const after = q.paceOf(gains[0].i);
  assert(after.proj >= before.proj);
  q.v4draw();
  assert(active.node('#v4c').innerHTML.includes('stroke-dasharray:4 3'));
});

check('multiple books scope the target while preserving skill evidence; labs have no projection', () => {
  for (const search of ['?books', '?books&book=be-prepared', '?books&book=java-short-labs']) {
    const books = load(search), q = books.p;
    q.render();
    assert(!/NaN|Infinity|undefined/.test(books.node('#view').innerHTML));
    const units = q.paceUnits();
    if (search.endsWith('java-short-labs')) {
      assert.equal(units.length, 0);
      assert(books.node('#view').innerHTML.includes('Lab practice'));
    } else {
      assert(units.length > 0);
      assert.equal(new Set(units.map(u => q.TB0[u].tb)).size, 1);
      if (search === '?books') {
        const old = q.ALL.map(i => q.paceOf(i));
        assert(old.some(o => o.proj > o.now), 'the All books view in the reported screenshot must show predictions');
        assert(books.node('#v4c').innerHTML.includes('stroke-width:3;stroke-dasharray:4 3'));
      }
      for (const u of units) {
        q.S.v4.u = u;
        q.v4draw();
        assert(!/NaN|Infinity|undefined/.test(books.node('#v4c').innerHTML));
      }
    }
  }
});

console.log(`${passed} pace checks passed · target skills, dates, projections, controls and books`);

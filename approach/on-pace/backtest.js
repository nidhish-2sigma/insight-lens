// Backtest of the On pace projection: the page's current method, "no change", and the proposed method.
//
//   node approach/on-pace/backtest.js                       the comparison tables (takes a few minutes)
//   node approach/on-pace/backtest.js --example 2025-11-15 30   one goal, student by student: the worked example in method.md
//   node approach/on-pace/backtest.js --keep --recover --catchup   add the parts that were tested and left out (see evaluation.md)
//   node approach/on-pace/backtest.js --json rows.json      also write every projection to a file
//   node approach/on-pace/backtest.js --pace-days 15        measure the class's pace over another window (30 by default)
//
// How it works: it runs the page's own code (js/atlas.js with data/class.js) in a sandbox "as of" a past day (?today=),
// projects each student's mastered count on each target unit's goal to a later day, and compares that with what the page
// itself counts on the later day. Everything the proposed method learns comes from evidence up to the as-of day only.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('node:vm');
const root = process.env.REPO || path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8'), BOOT = 'renderHead();fromHash();render();';
if (!SRC.includes(BOOT)) throw new Error('js/atlas.js has changed: its entry point is not where this script expects it');
const EXPOSE = 'S,ALL,TODAY,EVD,TB0,D,estOf,lvOf,dayOf,paceOf,paceScope,paceUnits,paceMemo,CU';
function load(today) {
  const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
  const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
    location: { search: `?today=${today}`, hash: '#pace', pathname: '/index.html', assign() {}, replace() {} }, history: { replaceState() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
  ['data/class.js', 'data/sample.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  vm.runInContext(SRC.replace(BOOT, `globalThis.P={${EXPOSE}};`), ctx, { filename: 'js/atlas.js' });
  return ctx.P;
}
const cache = {}, at = iso => cache[iso] || (cache[iso] = load(iso));
const addDays = (iso, n) => { const t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

const ARGS = process.argv.slice(2), EX = ARGS.indexOf('--example');
const FROM = EX >= 0 ? [ARGS[EX + 1]] : ['2025-10-01', '2025-10-15', '2025-11-01', '2025-11-15', '2025-12-01'];
const HORIZONS = EX >= 0 ? [+ARGS[EX + 2]] : [15, 30, 45];
const OPT = { keep: ARGS.includes('--keep'), keepdepth: ARGS.includes('--keepdepth'), recover: ARGS.includes('--recover'), catchup: ARGS.includes('--catchup') };
const FIRST_WEEK = 7;   // a skill a student will master is usually mastered within a week of first meeting it
const PRIOR = 10;       // a student's first-week rate is shrunk toward the class's with the weight of 10 skills
const QUARTER = .25;    // the class has met a skill once a quarter of the class has met it
const STEP = 5;         // the optional learned rates use history windows that start every 5 days
const PACE_DAYS = ARGS.includes('--pace-days') ? +ARGS[ARGS.indexOf('--pace-days') + 1] : 30;   // the class's pace is read over this many days

const out = [], example = [];
for (const t0 of FROM) {
  const A = at(t0), T = A.TODAY, N = A.ALL.length, units = A.paceUnits().filter(u => A.paceScope(u).ks.length >= 5);
  const ks = [...new Set(units.flatMap(u => A.paceScope(u).ks))];
  const first = (X, i, k) => { const e = X.EVD[i][k]; return e && e.length ? e[0].d : null; };     // the day the student met the skill: their first check on it
  const mastered = (X, i, k, t) => { const e = X.estOf(i, k, t); return !!e && e.ev >= 2 && e.c >= .8; };
  const level = (i, k, t) => { const e = A.estOf(i, k, t); if (!e) return 'none'; if (e.ev < 2) return 'one check'; const L = ['beginning', 'attempted', 'familiar', 'proficient', 'mastered'][A.lvOf(e.c)]; return L === 'mastered' && OPT.keepdepth && e.ev < 4 ? 'mastered, thin' : L; };
  const classMetDay = (X, k) => { const f = X.ALL.map(i => first(X, i, k)).filter(d => d !== null).sort((a, b) => a - b), q = Math.ceil(N * QUARTER); return f.length >= q ? f[q - 1] : null; };
  const classMet = {}; ks.forEach(k => { classMet[k] = classMetDay(A, k); });
  // 1. each student's first-week mastery rate, from the skills they met at least a week before t0, shrunk toward the class's rate
  const conv = A.ALL.map(i => { let met = 0, m = 0; ks.forEach(k => { const f = first(A, i, k); if (f === null || f + FIRST_WEEK > T) return; met++; if (mastered(A, i, k, f + FIRST_WEEK)) m++; }); return { met, m }; });
  const classRate = (s => s.met ? s.m / s.met : .3)(conv.reduce((a, o) => ({ met: a.met + o.met, m: a.m + o.m }), { met: 0, m: 0 }));
  const convert = conv.map(o => (o.m + PRIOR * classRate) / (o.met + PRIOR));
  // 2. each student's participation: of the skills the class has met, the share they have met too
  const metByClass = ks.filter(k => classMet[k] !== null && classMet[k] <= T);
  const part = A.ALL.map(i => metByClass.length ? metByClass.filter(k => first(A, i, k) !== null).length / metByClass.length : 1);
  for (const h of HORIZONS) {
    const t1 = addDays(t0, h), B = at(t1), d1 = A.dayOf(t1);
    // optional, left out of the proposal: rates learned from history windows that end on or before t0
    const n = {}, m = {}; let cuN = 0, cuM = 0;
    if (OPT.keep || OPT.keepdepth || OPT.recover || OPT.catchup) for (let t = 10; t + h <= T; t += STEP) A.ALL.forEach(i => ks.forEach(k => {
      const f = first(A, i, k);
      if (f === null || f > t) { if (classMet[k] !== null && classMet[k] <= t) { cuN++; if (f !== null && f <= t + h) cuM++; } return; }
      const s = level(i, k, t); n[s] = (n[s] || 0) + 1; if (mastered(A, i, k, t + h)) m[s] = (m[s] || 0) + 1; }));
    const learned = s => (n[s] || 0) >= 30 ? (m[s] || 0) / n[s] : (s.startsWith('mastered') ? 1 : 0);
    const keepOf = s => OPT.keep || OPT.keepdepth ? learned(s) : 1, keepRate = keepOf('mastered'), recoverRate = s => OPT.recover ? learned(s) : 0, catchUp = OPT.catchup && cuN >= 30 ? cuM / cuN : 0;
    for (const u of units) {
      const sc = A.paceScope(u), rel = u < A.CU ? 'done' : u === A.CU ? 'current' : u === A.CU + 1 ? 'next' : 'later';
      A.S.v4.u = u; A.S.v4.day = d1; A.paceMemo.clear();
      // 3. the schedule: how many of this goal's skills the class will meet by the goal date, at its pace of the last 30 days ("pace"), or all of them ("plan")
      const metNow = sc.ks.filter(k => classMet[k] !== null && classMet[k] <= T).length, metAgo = sc.ks.filter(k => classMet[k] !== null && classMet[k] <= T - PACE_DAYS).length;
      const left = sc.ks.length - metNow, reach = Math.min(left, (metNow - metAgo) / PACE_DAYS * h);
      const planHeld = sc.ks.every(k => { const d = classMetDay(B, k); return d !== null && d <= B.TODAY; });
      for (const i of A.ALL) {
        const actual = sc.ks.filter(k => mastered(B, i, k, B.TODAY)).length, cur = A.paceOf(i).proj;
        let now = 0, kept = 0, recovered = 0, varMet = 0, lag = 0, ahead = 0;   // ahead: goal skills neither the student nor the class has met yet
        sc.ks.forEach(k => { const f = first(A, i, k); if (f === null) { if (classMet[k] !== null && classMet[k] <= T) lag++; else ahead++; return; }
          const s = level(i, k, T); if (s.startsWith('mastered')) { const kr = keepOf(s); now++; kept += kr; varMet += kr * (1 - kr); } else { const r = recoverRate(s); recovered += r; varMet += r * (1 - r); } });
        const c = convert[i], caught = lag * catchUp;
        const meetPace = Math.min(ahead, reach) * part[i] + caught, meetPlan = ahead * part[i] + caught;   // a student who worked ahead has fewer of the class's next skills left to meet
        const meetTrue = sc.ks.filter(k => first(A, i, k) === null && first(B, i, k) !== null).length;   // known only afterwards
        // 4. the projection, and a range for 80%: the new skills are a draw at the student's rate, and the schedule itself is uncertain
        const proj = kept + recovered + meetPace * c, sd = Math.sqrt(varMet + meetPace * c * (1 - c) + Math.min(ahead, reach) * (c * part[i]) ** 2);
        const row = { t0, t1, h, u, rel, goal: sc.ks.length, now, actual, current: cur, proj, sd, meet: meetPace, plan: kept + recovered + meetPlan * c, oracle: kept + recovered + meetTrue * c, planHeld };
        out.push(row);
        if (EX >= 0 && rel === 'current') example.push(Object.assign({ name: A.D.students[i], unit: `${A.TB0[u].s} · ${A.TB0[u].nb}`, target: sc.target.length, earlier: sc.previous.length,
          classMetNow: metNow, classMetMonthAgo: metAgo, left, reach, part: part[i], convert: c, classRate, metOwn: conv[i].met, masteredFirstWeek: conv[i].m }, row));
      }
    }
  }
}

const r2 = x => Math.round(x * 100) / 100;
if (EX >= 0) {
  const e = example[0];
  console.log(`As of ${e.t0}, goal date ${e.t1} (${e.h} days) · ${e.unit} · goal ${e.goal} skills (${e.target} key skills of the unit + ${e.earlier} earlier skills used)`);
  console.log(`Class: met ${e.classMetNow} of the ${e.goal} by ${e.t0}, ${e.classMetMonthAgo} a month earlier, so ${e.classMetNow - e.classMetMonthAgo} in 30 days; ${e.left} left; at that pace it meets ${r2(e.reach)} more by ${e.t1}. First-week mastery rate of the class: ${r2(e.classRate * 100)}%.`);
  console.log('student     now  met-own  mastered-1st-week  rate  part  new-met  projected  80% range     current-method  actual');
  example.sort((a, b) => a.name.localeCompare(b.name)).forEach(x => console.log(`${x.name.padEnd(11)} ${String(x.now).padStart(3)}  ${String(x.metOwn).padStart(7)}  ${String(x.masteredFirstWeek).padStart(17)}  ${(x.convert * 100).toFixed(0).padStart(3)}%  ${x.part.toFixed(2)}  ${x.meet.toFixed(1).padStart(7)}  ${x.proj.toFixed(1).padStart(9)}  ${Math.max(x.now, x.proj - 1.28 * x.sd).toFixed(1).padStart(5)}–${Math.min(x.goal, x.proj + 1.28 * x.sd).toFixed(1).padEnd(6)}  ${String(x.current === null ? '–' : x.current).padStart(14)}  ${String(x.actual).padStart(6)}`));
  const s = a => a.reduce((x, y) => x + y, 0); console.log(`This goal, every student: average miss ${r2(s(example.map(x => Math.abs(x.proj - x.actual))) / example.length)} (current method ${r2(s(example.filter(x => x.current !== null).map(x => Math.abs(x.current - x.actual))) / example.filter(x => x.current !== null).length)}, no change ${r2(s(example.map(x => Math.abs(x.now - x.actual))) / example.length)})`);
  process.exit(0);
}
const sum = a => a.reduce((x, y) => x + y, 0);
const corr = (a, b) => { const ma = sum(a) / a.length, mb = sum(b) / b.length, cv = sum(a.map((x, i) => (x - ma) * (b[i] - mb))), va = Math.sqrt(sum(a.map(x => (x - ma) ** 2))), vb = Math.sqrt(sum(b.map(x => (x - mb) ** 2))); return va && vb ? cv / va / vb : 0; };
const score = (rs, f) => { const v = rs.filter(r => f(r) !== null && f(r) !== undefined), e = v.map(r => f(r) - r.actual);
  return { mae: sum(e.map(Math.abs)) / e.length, rmse: Math.sqrt(sum(e.map(x => x * x)) / e.length), bias: sum(e) / e.length, r: corr(v.map(r => f(r) - r.now), v.map(r => r.actual - r.now)) }; };
const fmt = s => `${s.mae.toFixed(2).padStart(5)} ${s.rmse.toFixed(2).padStart(5)} ${(s.bias >= 0 ? '+' : '') + s.bias.toFixed(2)} ${s.r.toFixed(2).padStart(6)}`;
const table = (label, rs) => {
  const cov = Math.round(100 * rs.filter(r => r.actual >= r.proj - 1.28 * r.sd - .5 && r.actual <= r.proj + 1.28 * r.sd + .5).length / rs.length);
  console.log(`\n${label} · ${rs.length} projections (a student, a goal, an as-of day, a goal date)\n  method                        miss  big-miss  bias  gain-r`);
  [['current method', r => r.current], ['no change', r => r.now], ['proposed, class pace', r => r.proj], ['proposed, plan what-if', r => r.plan], ['proposed, true schedule*', r => r.oracle]].forEach(([n, f]) => console.log(`  ${n.padEnd(27)} ${fmt(score(rs, f))}`));
  console.log(`  proposed: the 80% range holds the actual count ${cov}% of the time`); };
console.log(`Options: ${Object.entries(OPT).filter(([, v]) => v).map(([k]) => '--' + k).join(' ') || 'none (the proposal)'}`);
table('All goals', out);
table('The unit the class is in', out.filter(r => r.rel === 'current'));
HORIZONS.forEach(h => table(`Goal date ${h} days ahead`, out.filter(r => r.h === h)));
console.log(`\nmiss: average distance in skills · big-miss: root-mean-square distance, which weighs big misses more · bias: average signed distance (+ is too high) · gain-r: correlation of projected and actual gains`);
console.log(`* the true schedule is known only afterwards: it measures the student part alone`);
const NS = at(FROM[0]).ALL.length;
console.log(`Goals the class met in full by the goal date: ${out.filter(r => r.planHeld).length / NS} of ${out.length / NS} (the unit the class was in: ${out.filter(r => r.planHeld && r.rel === 'current').length / NS} of ${out.filter(r => r.rel === 'current').length / NS})`);
if (ARGS.includes('--json')) fs.writeFileSync(ARGS[ARGS.indexOf('--json') + 1], JSON.stringify(out));

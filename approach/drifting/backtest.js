// Backtest of the Drifting flag: the page's rule rebuilt from first-try days alone, checked against the page, and followed forward.
//
//   node approach/drifting/backtest.js                    the tables in evaluation.md (under a minute)
//   node approach/drifting/backtest.js --example 2025-11-15   one day, student by student: the worked example in method.md
//   node approach/drifting/backtest.js --json rows.json   also write every student-day (flags and outcomes) to a file
//   node approach/drifting/backtest.js --tables t.json    also write the export as database tables, and the page's answers every day, for check-sql.py
//
// How it works: it runs the page's own code (js/atlas.js with data/class.js) in a sandbox "as of" each day of the term (?today=),
// and checks that the method in method.md, computed from nothing but the day each student first tried each question (what
// queries.sql returns), names the same students with the same "since" dates. Then it follows every student past each day, using
// the export's later answers, and compares the students each rule names with their classmates on the same day.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('node:vm');
const root = process.env.REPO || path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8'), BOOT = 'renderHead();fromHash();render();';
if (!SRC.includes(BOOT)) throw new Error('js/atlas.js has changed: its entry point is not where this script expects it');
const EXPOSE = 'D,NM,ALL,TODAY,EXPORTDAY,LASTWORK,AT,EVD,WB,CTOT,RB,CNORM,NORM,DR,WATCH,JUDGE,CLASSIDLE,CLASSLOW,NJUDGE,NLOW,SIG,dayOf,isoOf';
function load(today) {
  const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
  const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
    location: { search: today ? `?today=${today}` : '', hash: '#drifting', pathname: '/index.html', assign() {}, replace() {} }, history: { replaceState() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
  ['data/class.js', 'data/sample.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  vm.runInContext(SRC.replace(BOOT, `globalThis.P={${EXPOSE}};`), ctx, { filename: 'js/atlas.js' });
  return ctx.P;
}

// ---------- the method (method.md), from first-try days alone. first[i] = the days (from day0) student i first tried each question ----------
// The options are the variants in evaluation.md; with none it is the page's rule.
//   blocks: low blocks in a row needed (2) · cut: low is under this share of normal (1/2) · normFrom: the newest block the normal may use (2)
//   noGuard: judge even when half the class is low · passSlow: looking back, pass over a block in which the class did under half its usual, like a break
//   guardEach: looking back, pass over a block in which half the class was low · classMin: judge only when the class did this share of its usual in the last five days
//   againstClass: expect less of everyone in a block in which the class did less (a block under a quarter of its usual is a break)
const lowerMedian = v => { const s = v.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
function drift(first, T, o = {}) {
  const cut = o.cut ?? .5, need = o.blocks ?? 2, from = o.normFrom ?? 2;
  const W = first.map(ds => { const m = new Map(); ds.forEach(d => { if (d <= T) { const b = Math.floor((T - d) / 5); m.set(b, (m.get(b) || 0) + 1); } }); return m; });   // b = blocks back from T
  const C = new Map(); W.forEach(m => m.forEach((n, b) => C.set(b, (C.get(b) || 0) + n)));
  const live = [...C.keys()].sort((a, b) => a - b);                                                     // blocks with class work, newest first; the rest are breaks
  const usual = (v => v.length ? lowerMedian(v) : 0)(live.filter(b => b >= from).map(b => C.get(b)));   // the class's usual five days
  const slowB = b => usual > 0 && C.get(b) < usual / 2;
  const scale = b => o.againstClass ? Math.min(1, C.get(b) / usual) : 1, usable = b => !o.againstClass || (usual > 0 && C.get(b) >= usual / 4);
  const normal = W.map(m => { const v = live.filter(b => b >= from && usable(b)).map(b => m.get(b) || 0); return v.length >= 3 ? lowerMedian(v) : null; });
  const low = (i, b) => normal[i] !== null && C.get(b) > 0 && usable(b) && (W[i].get(b) || 0) < normal[i] * cut * scale(b);
  const judged = normal.filter(x => x !== null).length, lowIn = b => normal.filter((_, i) => low(i, b)).length;
  const idle = !(C.get(0) > 0) || !usable(0), slow = !idle && judged > 0 && lowIn(0) >= judged / 2;
  const judge = !idle && judged > 0 && (o.noGuard || o.againstClass || !slow) && (!o.classMin || C.get(0) >= o.classMin * usual);
  const back = live.filter(b => usable(b) && (b === 0 || ((!o.passSlow || !slowB(b)) && (!o.guardEach || lowIn(b) < judged / 2))));
  const out = first.map((_, i) => {
    const r = { normal: normal[i], n: back.slice(0, 6).map(b => W[i].get(b) || 0), drifting: false, less: false, since: null };
    if (!judge || !low(i, 0)) return r;
    let run = 0, oldest = 0; for (const b of back) { if (low(i, b)) { run++; oldest = b; } else break; }
    return Object.assign(r, run >= need ? { drifting: true, since: Math.max(0, T - 5 * oldest - 4) } : { less: true });
  });
  return { judge, idle, slow, judged, lowNow: idle ? 0 : lowIn(0), usual, back, C, out };
}

// ---------- the class, from the export ----------
const X = load(null), N = X.ALL.length, iso = d => X.isoOf(d);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], dd = d => { const [y, m, x] = iso(d).split('-'); return `${+x} ${MON[m - 1]} ${y}`; };
const first = X.ALL.map(i => [...X.AT[i].values()].map(a => a[6]));                                   // what queries.sql returns: one row per student and question
const firstTo = T => first.map(ds => ds.filter(d => d <= T));
const T0 = Math.min(...first.flat()), T1 = X.LASTWORK;
const ARGS = process.argv.slice(2), EX = ARGS.indexOf('--example');

if (EX >= 0) {
  const T = X.dayOf(ARGS[EX + 1]), P = load(iso(T)), M = drift(firstTo(T), T);
  const span = b => `${dd(Math.max(0, T - 5 * b - 4)).replace(/ \d{4}$/, '')} to ${dd(T - 5 * b).replace(/ \d{4}$/, '')}`;
  console.log(`As of ${dd(T)}. The blocks with class work, newest first (the last five days are block 0); the class's usual five days: ${M.usual} first tries.`);
  M.back.slice(0, 6).forEach((b, k) => console.log(`  ${(k === 0 ? 'last five days' : k === 1 ? 'the block before' : 'earlier').padEnd(16)}  ${span(b).padEnd(18)} class ${String(M.C.get(b)).padStart(5)} (${Math.round(100 * M.C.get(b) / M.usual)}% of usual), ${M.out.filter(r => r.normal !== null && r.n[k] < r.normal / 2).length} of ${M.judged} under half their normal`));
  console.log(M.idle ? 'Nobody judged: no class work in the last five days.' : M.slow ? `Nobody judged: ${M.lowNow} of ${M.judged} are under half their normal, so the class as a whole slowed.` : `Judged: ${M.lowNow} of ${M.judged} under half their normal in the last five days, under half the class.`);
  console.log('\nstudent      normal  half   last five  before  earlier blocks        status');
  X.ALL.filter(i => M.out[i].drifting || M.out[i].less).sort((a, b) => (M.out[b].drifting - M.out[a].drifting) || X.NM[a].localeCompare(X.NM[b])).forEach(i => { const r = M.out[i];
    console.log(`${X.NM[i].padEnd(12)} ${String(r.normal).padStart(6)}  ${(r.normal / 2).toFixed(1).padStart(4)}   ${String(r.n[0]).padStart(9)}  ${String(r.n[1]).padStart(6)}  ${r.n.slice(2).join(' ').padEnd(20)}  ${r.drifting ? 'drifting since ' + dd(r.since) : 'working less'}`); });
  const same = X.ALL.every(i => (P.DR[i] >= 0) === M.out[i].drifting && (!M.out[i].drifting || P.DR[i] === M.out[i].since) && P.WATCH[i] === M.out[i].less);
  console.log(`\nThe page as of ${dd(T)} names the same students with the same dates: ${same ? 'yes' : 'NO'}`);
  process.exit(0);
}

// ---------- 1. the method against the page, every day from the first day the page can be read as of (day 4) to the export ----------
const TABLES = ARGS.includes('--tables') ? ARGS[ARGS.indexOf('--tables') + 1] : null;
let days = 0, flags = 0, diffs = 0; const SIGS = new Map(), ANSWERS = [];
const CHECK = []; for (let T = Math.max(T0, 4); T < X.EXPORTDAY; T += T <= T1 + 10 ? 1 : 7) CHECK.push(T); CHECK.push(X.EXPORTDAY);   // daily through the term, then weekly, and the export day
for (const T of CHECK) {
  const P = load(iso(T)), M = drift(firstTo(T), T); days++;
  if (T <= T1) SIGS.set(T, X.ALL.map(i => P.SIG[P.NM[i]]));
  if (P.CLASSIDLE !== M.idle || P.JUDGE !== (M.judge || (!M.idle && !M.slow && !M.judged))) diffs++;
  X.ALL.forEach(i => { const r = M.out[i]; flags += P.DR[i] >= 0;
    if ((P.DR[i] >= 0) !== r.drifting || (r.drifting && P.DR[i] !== r.since) || P.WATCH[i] !== r.less || P.NORM[i] !== r.normal) diffs++; });
  if (TABLES && (T <= T1 + 7 || T === X.EXPORTDAY)) ANSWERS.push({ day: iso(T), idle: P.CLASSIDLE, slow: P.CLASSLOW, njudge: P.NJUDGE, nlow: P.NLOW, c0: P.CTOT[P.RB], cnorm: P.CNORM, lastwork: iso(P.LASTWORK),
    students: P.ALL.map(i => ({ id: 1000 + i, dr: P.DR[i] >= 0 ? iso(P.DR[i]) : null, watch: P.WATCH[i], norm: P.NORM[i], wb: P.WB[i].slice().reverse(), ctot: P.CTOT.slice().reverse(), sig: P.SIG[P.NM[i]] })) });
}
console.log(`1. The method in method.md, from first-try days alone, against the page: ${days} days from ${dd(Math.max(T0, 4))} to the export (${dd(X.EXPORTDAY)}), ${flags} flags, ${diffs} differences`);
if (TABLES) { fs.writeFileSync(TABLES, JSON.stringify(Object.assign(tables(), { days: ANSWERS }))); console.log(`   wrote ${TABLES}: the export as database tables, and the page's answers on ${ANSWERS.length} days, for check-sql.py`); }

// ---------- 2. when the page can judge (the method, which matches the page on every day it can be read as of) ----------
const term = []; for (let T = T0; T <= T1; T++) term.push(T);
const STATE = new Map(term.map(T => { const M = drift(firstTo(T), T); return [T, { judge: M.judge, idle: M.idle, slow: M.slow }]; }));
const by = f => term.filter(T => f(STATE.get(T)));
const J = by(p => p.judge), early = by(p => !p.idle && !p.slow && !p.judge), slowD = by(p => p.slow), idleD = by(p => p.idle);
console.log(`\n2. The ${term.length} days from the class's first answer (${dd(T0)}) to its last (${dd(T1)})`);
console.log(`   the page judges: ${J.length} days (${dd(J[0])} to ${dd(J[J.length - 1])})`);
console.log(`   too early, nobody has a normal yet: ${early.length} · the class slowed (half or more under half their normal): ${slowD.length} · nobody in the class worked in the last five days: ${idleD.length}`);

// ---------- what happened next: outcomes known only afterwards ----------
const FT = X.ALL.map(i => { const m = new Map(); first[i].forEach(d => m.set(d, (m.get(d) || 0) + 1)); return m; });
const work = (i, a, b) => { let s = 0; for (let d = a; d <= b; d++) s += FT[i].get(d) || 0; return s; }, cwork = (a, b) => X.ALL.reduce((s, i) => s + work(i, a, b), 0);
const K = X.EVD[0].length, met = X.ALL.map(i => Array.from({ length: K }, (_, k) => X.EVD[i][k] && X.EVD[i][k].length ? X.EVD[i][k][0].d : null));
const classMet = Array.from({ length: K }, (_, k) => { const f = X.ALL.map(i => met[i][k]).filter(d => d !== null).sort((a, b) => a - b), q = Math.ceil(N / 4); return f.length >= q ? f[q - 1] : null; });
const OUT = new Map();
for (const T of term) {
  const M = drift(firstTo(T), T); if (M.idle) continue;
  const c10 = cwork(T + 1, T + 10), S = []; for (let k = 0; k < K; k++) if (classMet[k] !== null && classMet[k] > T && classMet[k] <= T + 30) S.push(k);
  OUT.set(T, M.out.map((r, i) => r.normal === null ? null : {
    // still low ten days on: their share of their normal, over the next ten days, is under half the class's share of its usual (the class must have done a quarter of its usual)
    still: r.normal > 0 && M.usual > 0 && c10 >= .5 * M.usual ? (work(i, T + 1, T + 10) / (2 * r.normal)) / (c10 / (2 * M.usual)) < .5 : null,
    // behind a month on: of the skills the class met in the next 30 days (three or more), they met under half
    behind: S.length >= 3 ? S.filter(k => met[i][k] !== null && met[i][k] <= T + 30).length / S.length < .5 : null }));
}
function follow(o) {
  const r = { still: [0, 0, 0], behind: [0, 0, 0] }, stu = new Set(), perDay = new Map(), rows = []; let n = 0, days = 0, again = 0, againN = 0, prev = null;
  for (const T of term) {
    const M = drift(firstTo(T), T, o), O = OUT.get(T), cur = new Set();
    if (M.judge && O) { days++; M.out.forEach((x, i) => { if (!x.drifting) return; cur.add(i); n++; stu.add(i); perDay.set(T, (perDay.get(T) || 0) + 1);
      for (const k of ['still', 'behind']) { if (!O[i] || O[i][k] === null) continue; const peers = O.filter((y, j) => y && j !== i && !M.out[j].drifting && y[k] !== null); if (!peers.length) continue;
        r[k][0]++; r[k][1] += O[i][k] ? 1 : 0; r[k][2] += peers.filter(y => y[k]).length / peers.length; } }); }
    if (prev) prev.forEach(i => { againN++; if (cur.has(i)) again++; }); prev = cur;
    if (O) M.out.forEach((x, i) => { if (O[i]) rows.push({ day: iso(T), student: X.NM[i], judged: M.judge, drifting: x.drifting, since: x.since === null ? null : iso(x.since), workingLess: x.less, normal: x.normal, ...O[i] }); });
  }
  return { r, n, days, stu: stu.size, perDay, again, againN, rows };
}

// ---------- 3. the page's flags ----------
const page = follow({}), top = [...page.perDay.entries()].sort((a, b) => b[1] - a[1])[0];
console.log(`\n3. The page today names ${page.n} student-days on ${page.perDay.size} of its ${page.days} days, ${page.stu} students in all; most on one day: ${top[1]} (${dd(top[0])})`);
const why = {}; for (const T of J) { const A = drift(firstTo(T), T), B = drift(firstTo(T + 1), T + 1);
  A.out.forEach((x, i) => { if (!x.drifting) return; const y = B.out[i];
    const k = !B.judge ? (B.idle ? 'nobody worked the next day' : 'the class slowed the next day, so nobody was judged') : y.drifting ? 'still named the next day' : !y.less ? 'worked again: back over half their normal' : 'the block before was no longer low (the blocks moved a day)';
    why[k] = (why[k] || 0) + 1; }); }
Object.entries(why).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`   ${String(v).padStart(3)}  ${k}`));

// ---------- 4. what happened next, rule by rule ----------
const RULES = [
  ['The page today', {}],
  ['One low block (today\'s "working less")', { blocks: 1 }],
  ['Three low blocks', { blocks: 3 }],
  ['Low = under a third of normal', { cut: 1 / 3 }],
  ['Low = under two-thirds of normal', { cut: 2 / 3 }],
  ['Normal from every earlier block', { normFrom: 0 }],
  ['No class guard', { noGuard: true }],
  ['Pass over class-slow blocks looking back', { passSlow: true }],
  ['Pass over blocks half the class was low in', { guardEach: true }],
  ['Judge only when the class did 3/4 of its usual', { classMin: .75 }],
  ['Both of the two above that pass over or wait', { passSlow: true, classMin: .75 }],
  ['Judged against the class', { againstClass: true }],
];
const pc = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
console.log('\n4. What happened next to the students each rule names, against their classmates on the same days (same outcomes for every rule)');
console.log('   rule                                            days  flags  students   still low 10 days on               behind a month on                  named again next day');
const results = RULES.map(([name, o]) => { const f = o === RULES[0][1] ? page : follow(o), s = k => `${String(f.r[k][1]).padStart(2)} of ${String(f.r[k][0]).padEnd(3)} ${pc(f.r[k][1], f.r[k][0]).padStart(4)} · others ${pc(f.r[k][2], f.r[k][0]).padStart(4)} · ×${f.r[k][2] ? (f.r[k][1] / f.r[k][2]).toFixed(1) : '–'}`;
  console.log(`   ${name.padEnd(47)} ${String(f.days).padStart(4)}  ${String(f.n).padStart(5)}  ${String(f.stu).padStart(8)}   ${s('still').padEnd(33)}  ${s('behind').padEnd(33)}  ${pc(f.again, f.againN)}`); return f; });
console.log('   still low 10 days on: their work over the next ten days, as a share of their normal, under half the class\'s share of its usual · behind a month on: met under half the skills the class met in the next 30 days\n   others: the same-day rate among classmates with a normal that the rule did not name · ×: how many times as likely');
const oct15 = X.dayOf('2025-10-15'), o15 = OUT.get(oct15), d15 = drift(firstTo(oct15), oct15), g = d15.out.map((x, i) => x.drifting ? o15[i] : null).filter(Boolean);
console.log(`   15 Oct 2025 alone: ${g.length} named; still low 10 days on ${g.filter(x => x.still).length} of ${g.filter(x => x.still !== null).length}; behind a month on ${g.filter(x => x.behind).length} of ${g.filter(x => x.behind !== null).length}`);

// ---------- 5. the signals beside each row ----------
console.log('\n5. The signals beside a row, for the students the page names and for their classmates with a normal, on the days it judges');
// two other ways to count days without work, tested: 4 or more of the 5, and only the days on which a quarter of the class did something
const ACT = X.ALL.map(() => new Set()); X.D.daily.forEach(r => { if (r[2] > 0 || r[3] > 0) ACT[r[0]].add(r[1]); });
const classDay = d => X.ALL.filter(i => ACT[i].has(d)).length >= N / 4;
const sig = [['No work on 2 or more of the last 5 days (today)', s => s.miss >= 2], ['  … on 4 or more of the 5 (tested)', s => s.miss >= 4], ['  … on 2 or more of the class\'s days in them (tested)', s => s.classMiss >= 2],
  ['2 or more assigned sets unfinished', s => s.work >= 2], ['Accuracy down 10 points or more', s => s.acc <= -10]];
const fl = [], ot = []; for (const T of J) { const M = drift(firstTo(T), T), S = SIGS.get(T), cd = [0, 1, 2, 3, 4].map(k => T - k).filter(classDay);
  M.out.forEach((x, i) => { if (x.normal !== null) (x.drifting ? fl : ot).push(Object.assign({ classMiss: cd.filter(d => !ACT[i].has(d)).length }, S[i])); }); }
sig.forEach(([name, f]) => console.log(`   ${name.padEnd(52)} named ${pc(fl.filter(f).length, fl.length).padStart(4)} (${fl.filter(f).length} of ${fl.length}) · others ${pc(ot.filter(f).length, ot.length).padStart(4)}`));
const wk = [0, 0, 0, 0, 0, 0, 0], wn = [0, 0, 0, 0, 0, 0, 0]; for (let d = T0; d <= T1; d++) { const w = new Date(Date.parse(X.D.meta.day0 + 'T12:00:00Z') + d * 864e5).getUTCDay(); wk[w] += X.ALL.filter(i => ACT[i].has(d)).length; wn[w]++; }
console.log(`   students who did anything, on an average ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((n, w) => `${n} ${(wk[w] / wn[w]).toFixed(1)}`).join(', ')} (of ${N})`);
if (ARGS.includes('--json')) fs.writeFileSync(ARGS[ARGS.indexOf('--json') + 1], JSON.stringify(results[0].rows));

// ---------- --tables: the export as the database tables queries.sql reads, for check-sql.py ----------
// One assignment per student and question, every try on the day of the first; one activity row per student and day; one coursework row per
// assigned set, finished ones marked in coursework_status. Rows the queries must leave out are added on purpose: a teacher, a removed, an
// ignored and a test student, a student of another class, an ignored answer and assignment, an open, a reading, a hidden lesson, an ignored
// placement, empty activity hours, a second row for one set (the same name and due day), a draft set, an ignored set and ignored statuses.
function tables() {
  const D = X.D, OFF = D.meta.utcOffset, CUR = D.meta.textbookId, SID = D.meta.section;
  const utc = (d, h, m = 0) => new Date(Date.parse(D.meta.day0 + 'T00:00:00Z') + d * 864e5 + (h - OFF) * 36e5 + m * 6e4).toISOString().slice(0, 19).replace('T', ' ');   // local day d, hour h, as UTC
  const T = { section_user: [], app_user: [], assignment: [], interaction_summary: [], unit: [], curriculum_unit_order: [], curriculum_unit_item: [], student_activity_hour: [], coursework: [], coursework_status: [] };
  D.students.forEach((_, i) => { T.section_user.push([1000 + i, 5000 + i, SID, 'student', false, null]); T.app_user.push([5000 + i, false]); });
  [[1900, 'teacher', false, null], [1901, 'student', false, '2025-10-01 00:00:00'], [1902, 'student', true, null], [1903, 'student', false, null]].forEach(([id, role, ig, del]) => { T.section_user.push([id, id + 4000, SID, role, ig, del]); T.app_user.push([id + 4000, id === 1903]); });
  T.section_user.push([1904, 5904, SID + 1, 'student', false, null]); T.app_user.push([5904, false]);
  D.units.forEach((u, k) => { T.unit.push([u.id, null, 1, CUR, false]); T.curriculum_unit_order.push([CUR, u.id, k, u.num, u.name, false, false]); });
  D.subs.forEach((s, k) => { T.unit.push([s.id, D.units[s.u].id, 2, CUR, false]); T.curriculum_unit_order.push([CUR, s.id, 1000 + k, s.code, s.name, false, false]); s.items.forEach((ix, o) => T.curriculum_unit_item.push([CUR, s.id, D.items[ix].id, o, false])); });
  T.unit.push([99001, D.units[3].id, 2, CUR, false]); T.curriculum_unit_order.push([CUR, 99001, 5000, '3.99', 'Hidden lesson', true, false]); T.curriculum_unit_item.push([CUR, 99001, 990001, 0, false], [CUR, D.subs[40].id, 990002, 99, true]);
  let aid = 1, sid = 1;
  const answer = (su, item, type, d, tries, right, o = {}) => { const a = aid++; T.assignment.push([a, su, o.aIgnore || false, null]);
    for (let k = 1; k <= tries; k++) T.interaction_summary.push([sid++, a, item, type, o.action || (type === 'activecode' ? 'code_run' : 'check'), right > 0 && k >= right, utc(d, 10, k), o.ignore || false]); };
  D.att.forEach(a => { const it = D.items[a[1]]; answer(1000 + a[0], it.id, it.type, a[6], a[5], a[9]); });
  const one = D.items[D.att[0][1]], reading = D.items.find(it => it.type === 'reading');
  [1900, 1901, 1902, 1903, 1904].forEach(su => answer(su, one.id, one.type, 60, 2, 1));
  answer(1000, one.id, one.type, 20, 1, 1, { aIgnore: true }); answer(1001, one.id, one.type, 21, 1, 1, { ignore: true }); answer(1002, one.id, one.type, 22, 1, 0, { action: 'open' });
  answer(1003, 990001, 'mchoice', 30, 1, 1); answer(1004, 990002, 'mchoice', 31, 1, 1); answer(1005, reading.id, 'reading', 32, 1, 0);
  D.daily.forEach(r => T.student_activity_hour.push([SID, 1000 + r[0], utc(r[1], 10), r[2], r[3], r[4]]));
  for (let d = 60; d < 70; d++) T.student_activity_hour.push([SID, 1007, utc(d, 23), 0, 0, 0]);
  const FIN = ['completed', 'partially_graded', 'graded', 'returned', 'feedback_seen']; let cid = 1;
  D.coursework.forEach((c, k) => { const rows = k === 0 ? [cid++, cid++] : [cid++];
    rows.forEach(id => T.coursework.push([id, SID, c.name, c.type, utc(c.due, 12), 'published', false, c.sub >= 0 ? D.subs[c.sub].id : null, CUR]));
    c.done.forEach((i, n) => T.coursework_status.push([rows[n % rows.length], 1000 + i, FIN[n % FIN.length], false]));
    D.students.forEach((_, i) => { if (!c.done.includes(i)) T.coursework_status.push([rows[0], 1000 + i, i % 2 ? 'in_progress' : 'completed', i % 2 === 0]); }); });
  T.coursework.push([cid++, SID, 'Draft set', 'zpd_practice', utc(70, 12), 'draft', false, null, CUR], [cid++, SID, 'Ignored set', 'zpd_practice', utc(70, 12), 'published', true, null, CUR]);
  return { meta: { section: SID, curriculum: CUR, offset: OFF }, tables: T, firstTries: D.att.map(a => [1000 + a[0], D.items[a[1]].id, iso(a[6])]) };
}

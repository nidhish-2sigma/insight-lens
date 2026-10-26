// Checks the numbers and the rules behind the mock.
//
//   node tools/check.js            print every insight for the two demo sections, then run the checks on every section
//   node tools/check.js --all      print every insight for every section (demo sections and test shapes)
//   node tools/check.js --checks   run the checks only
//
// The checks are the rules the Lens is built on, run against every section including the test shapes
// (tiny, brand-new, self-paced, very large, bare data). The process exits with status 1 if any fails.
const path = require('path');
const fs = require('fs');
['01-util', '02-content', '03-generate', '04-metrics', '04b-insights'].forEach(f => require(path.join(__dirname, '..', 'js', f + '.js')));
const IL = globalThis.IL, U = IL.U, T = IL.T, M = IL.M, I = IL.I;
const w = IL.generate();
const pc = x => x == null ? '–' : Math.round(x * 100) + '%';
const ARG = process.argv.slice(2);
const PRINT = ARG.includes('--checks') ? [] : w.sections.filter(s => ARG.includes('--all') || s.group !== 'test');
PRINT.forEach(sec => {
  const t0 = Date.now();
  const m = M.build(w, sec, { tb: 'all', win: '2w' });
  const nm = id => sec.students[id].name;
  console.log(`\n================ ${sec.id} ${sec.name} (${sec.period}) · built in ${Date.now() - t0} ms · window from ${T.fmt(m.from)}`);
  console.log('class weeks', m.b.classWeeks.join(','), '| minN', m.minN, '| class FTS', pc(m.classFts), 'eventual', pc(m.classEver), '| median student FTS', pc(m.medianFts), '| median minutes', m.medianMinutes);
  const p = m.pulse;
  console.log('PULSE active', p.active.n + '/' + p.active.of, '| work onTime/late/none', p.work.onTime, p.work.late, p.work.none, 'of', p.work.cells, `(${p.work.assignments} asg)`, '| fts', pc(p.fts.p), 'class-on-norm', pc(p.fts.classOnNorm), 'norm', pc(p.fts.norm), '| waiting', p.waiting.toGrade, 'oldest', p.waiting.oldestDays + 'd', 'q', p.waiting.questions.length, 'failed', p.waiting.failed.length);
  m.frontier.forEach(l => console.log('FRONTIER', l.tb.short, '|', l.units.map(u => `${u.num}:${u.done}d/${u.inProgress}p/${u.notStarted}n${u.opened ? '' : u.skipped ? ' SKIP' : ' closed'}`).join('  '), '| current', l.current && l.current.num));
  m.pace.forEach(x => console.log('PACE ch', x.unit.num, 'median', x.median, 'behind', x.behind.length, 'far', x.far.length, 'ahead', x.ahead.length));
  console.log('FUNNEL rows', m.funnel.rows.length, 'zero', m.funnel.zero.map(a => a.name).join(' | '), '| decay', m.funnel.decay && `${m.funnel.decay.from}→${m.funnel.decay.to} ch${m.funnel.decay.chapter}`);
  console.log('  last 6:', m.funnel.rows.slice(-6).map(x => `${x.a.short.slice(0, 18)} e${x.eligible.length} s${x.started.length} c${x.completed.length} g${x.toGrade}`).join(' ; '));
  console.log('STREAKS', m.streaks.rows.map(r => `${nm(r.sid)}:${r.run}${r.ongoing ? '*' : ''}${r.never ? '(never)' : ''}`).join(', '));
  console.log('TIMING late share', pc(m.timing.lateShare), '| chronic', m.timing.students.map(r => `${nm(r.sid)} ${r.late}/${r.started}`).join(', '));
  console.log('BALANCE', m.balance.map(x => `${x.tb.short}: ${x.questions}q ${x.students}st ${pc(x.fts)}`).join(' | '));
  console.log('WAITING', m.waiting.byAsg.map(x => `${x.a.short}:${x.n}`).join(', '));
  console.log('TOPICS', m.topicsOrdered.map(t => `${t.unit.num}${t.skipped ? ' skipped' : ''}: ${t.stat ? pc(t.stat.fts) + ' vs ' + pc(t.stat.norm) + ' gap ' + (t.stat.gap * 100).toFixed(0) : ''}${t.stat && t.stat.bands ? ' bands ' + t.stat.bands.levels.join('/') : ''}`).join(' || '));
  console.log('GAPS weak', m.gaps.weak, 'of solid', m.gaps.solid, 'roots', m.gaps.roots.length);
  m.gaps.roots.slice(0, 5).forEach(g => console.log(`   ${g.skill.name}: ${pc(g.stat.p)} over ${g.stat.nItems} q · blocks ${g.blocked.length}/${g.dependents.length} (2-hop ${g.hop2.length}) · below ${g.below.length}`));
  console.log('RETEACH', m.reteach.length, m.reteach.slice(0, 6).map(r => `[t${r.tier}] ${r.item.name}: ${r.picks.map(p => p.length).join('/')} key ${r.item.opts.key}`).join(' ; '));
  console.log('CODE', m.code.length, m.code.slice(0, 5).map(c => `${c.item.name}: ${c.failing.length}/${c.n} fail (first ${c.firstRun.length}, after ${c.afterFixes.length}, lost ${c.lost.length}) err ${c.topError && c.topError.err + '×' + c.topError.students.length} hardTest ${c.hardTest.test}:${c.hardTest.failing.length}`).join(' ; '));
  console.log('DEPTH', m.depth.map(d => `dok${d.key} ${pc(d.p)}`).join(' '), '| FORMAT', m.format.map(f => `${f.key} ${pc(f.p)}/${pc(f.norm)}`).join(' '), '| writeGap', m.writeGap && (m.writeGap.cls * 100).toFixed(0) + ' vs ' + (m.writeGap.typical * 100).toFixed(0));
  console.log('TRANSFER', m.transfer.slice(0, 4).map(t => `${t.skill.name}: ${pc(t.primary.p)} vs ${t.other.tb.short} ${pc(t.other.p)}`).join(' ; '));
  console.log('VSNORM below', m.vsNorm.below.length, 'above', m.vsNorm.above.length, '|', m.vsNorm.below.slice(0, 3).map(r => `${r.item.name} ${pc(r.p)} vs ${pc(r.norm)}`).join(' ; '));
  console.log('QUALITY', JSON.stringify(m.quality.counts));
  console.log('TRAJ sustained', m.traj.sustained.map(x => nm(x.sid) + ' ' + (x.last * 100).toFixed(0)).join(', '), '| drop', m.traj.drop.map(x => nm(x.sid) + ' ' + (x.change * 100).toFixed(0)).join(', '), '| rise', m.traj.rise.map(x => nm(x.sid) + ' +' + (x.change * 100).toFixed(0)).join(', '));
  console.log('MOVEMENT improving', m.movement.improving.length, 'slipping', m.movement.slipping.length, 'steady', m.movement.steady.length, 'noEv', m.movement.noEvidence.length, 'up', m.movement.up.length, 'down', m.movement.down.length);
  console.log('DIP', m.dip.series.map(x => (x.gap * 100).toFixed(0) + (x.dip ? '!' : '')).join(' '), '| flagged', m.dip.flagged && `wk${m.dip.flagged.point.week} ${m.dip.flagged.fell.map(f => f.sub.code + ' ' + (f.gap * 100).toFixed(0)).join(',')}`);
  console.log('NEXT', m.next && m.next.sub.code + ' ' + m.next.sub.name, '|', m.next && m.next.rows.map(r => `${r.skill.name}:${r.state}${r.stat ? ' ' + pc(r.stat.p) : ''} shaky ${r.shaky.length}`).join(' ; '), '| multi', m.next && m.next.multi.length);
  console.log('BLIND', m.blind.map(x => `ch${x.topic.unit.num}: taught ${x.taught} here ${x.here} elsewhere ${x.elsewhere.length} none ${x.none.length}`).join(' | '));
  console.log('RHYTHM', m.rhythm.weeks.map(x => x.active + (x.classWeek ? '' : '~')).join(' '));
  console.log('QUIET', m.quiet.map(q => `${nm(q.sid)} ${q.run}wk last ${T.fmtDay(q.lastDay)}`).join(', '));
  console.log('WHEN split in/same/other', pc(m.when.split.inClass / m.when.split.total), pc(m.when.split.sameDay / m.when.split.total), pc(m.when.split.other / m.when.split.total), '| session days', m.when.sessionDays, '| cells', Object.keys(m.when.sessionCells).join(' '), '| absent≥3', m.when.absent.length);
  console.log('MAP quads tl/tr/bl/br', m.map.quads.tl.length, m.map.quads.tr.length, m.map.quads.bl.length, m.map.quads.br.length, 'low', m.map.low.length, '| strict grind', m.roster.filter(s => m.stu[s.id].strict === 'grind').map(s => s.name).join(','), '| coast', m.roster.filter(s => m.stu[s.id].strict === 'coast').map(s => s.name).join(','));
  console.log('ROSTER never', m.rosterCheck.never.map(nm).join(','), '| off', m.rosterCheck.off.map(nm).join(','));
  console.log('RETRY share<3s', pc(m.retry.share), 'buckets', m.retry.buckets.join('/'), 'p90', pc(m.retry.p90), 'flagged', m.retry.flagged.map(x => nm(x.sid) + ' ' + pc(x.rapid)).join(', '));
  console.log('FASTWRONG median', pc(m.fastWrong.median), 'p90', pc(m.fastWrong.p90), 'flagged', m.fastWrong.flagged.map(x => nm(x.sid) + ' ' + pc(x.v)).join(', '), 'classNote', m.fastWrong.classNote);
  console.log('UNRESOLVED median', m.unresolved.median, 'top items', m.unresolved.items.slice(0, 3).map(x => `${x.item.name} ${x.students.length}/${x.n}`).join(' ; '), '| top students', m.unresolved.students.slice(0, 3).map(x => nm(x.sid) + ' ' + x.n).join(', '));
  console.log('STUCK', m.stuck.length, m.stuck.slice(0, 4).map(x => `${nm(x.sid)} ${x.item.name} ${x.runs} runs ${x.flags.join('+')}`).join(' ; '));
  console.log('HELP feedback', m.help.seen + '/' + m.help.feedback.length, 'questions', m.help.questions.length, '| READY', m.ready.map(r => `${nm(r.sid)} ${r.ok}/${r.n}`).join(', '));
  console.log('FOLLOWUPS', m.followups.map(f => `${f.action.title} [${f.status}] ${f.before != null ? pc(f.before) + '→' + pc(f.after) : ''} imp ${f.improved} same ${f.same} first ${f.firstEvidence} none ${f.noWork}`).join(' || '));
  console.log('SINCE resolved', m.since.resolved.map(x => `${x.a.short.slice(0, 16)} ${x.then}→${x.now}`).join(', '), '| grew', m.since.grew.map(x => `${x.item.name} ${x.then}→${x.now}`).join(', '), '| joined', m.since.joined.map(nm).join(','), '| new work', JSON.stringify(m.since.newWork));
  const st = M.student(w, sec, sec.roster[Math.min(3, sec.roster.length - 1)].id);
  console.log('STUDENT', st.st.name, 'weeks gap', st.weeks.map(x => x.gap == null ? '·' : (x.gap * 100).toFixed(0)).join(' '), '| moments', st.moments.map(x => x.kind).join(','), '| clusters', st.clusters.length, '| unresolved', st.unresolved.length);
  const g = M.grid(w, sec, sec.textbooks[0].tb.id, null), c = M.cell(w, sec, sec.roster[Math.min(3, sec.roster.length - 1)].id, sec.textbooks[0].tb.id, g.cols[1].id);
  console.log('CELL', g.cols[1].label, JSON.stringify({ correct: c.cell.correct, error: c.cell.error, pending: c.cell.pending, untouched: c.cell.untouched, pc: c.cell.pc, band: c.cell.band, eng: c.cell.eng }), '| verdict', c.verdict && c.verdict.title, '| wrong', c.wrong.length);
});

// ---------------------------------------------------------------------------------------------------------
// Checks: the rules the Lens is built on, against every section and scope
// ---------------------------------------------------------------------------------------------------------
let failed = 0, ran = 0;
const fails = [];
function check(where, name, ok, detail) { ran++; if (!ok) { failed++; fails.push(`  ✗ ${where} · ${name}${detail ? ' — ' + detail : ''}`); } }
const lead = t => { const m = /^(\d+)/.exec(String(t || '')); return m ? +m[1] : null; };
const uniq = a => new Set(a).size === a.length;

function checkSection(sec, scope) {
  const where = `${sec.id} ${scope.tb}/${scope.win}`;
  let m, ins;
  try { m = M.build(w, sec, scope); ins = I.build(w, sec, m, {}); }
  catch (e) { check(where, 'builds without error', false, e.stack.split('\n').slice(0, 2).join(' ')); return; }
  check(where, 'builds without error', true);
  const N = m.roster.length, rosterSet = new Set(m.roster.map(s => s.id)), allSet = new Set(sec.all.map(s => s.id));

  // 1. The Brief leads with the highest-impact findings, and every finding has a place
  Object.keys(ins.lists).forEach(name => {
    const L = ins.lists[name], spec = I.LISTS[name], mine = L.top.concat(L.rest);
    check(where, `${name} list is in order of impact`, mine.every((t, i) => !i || mine[i - 1].score >= t.score));
    if (mine.length) check(where, `${name} list leads with its highest-impact finding`, L.top[0] === mine.slice().sort((a, b) => b.score - a.score)[0]);
    check(where, `${name} list shows ${spec.min}–${spec.max} rows`, L.top.length <= spec.max && L.top.length >= Math.min(spec.min, mine.length));
    check(where, `${name} list shows every finding above the impact threshold, up to its limit`, L.rest.every(t => t.score < I.IMPACT_MIN) || L.top.length === spec.max);
  });
  const themed = new Set();
  ins.themes.forEach(t => t.members.forEach(s => { check(where, 'a finding sits in one theme only', !themed.has(s.id), s.id); themed.add(s.id); }));
  ins.signals.forEach(s => {
    const placed = s.lane === 'good' ? ins.good.includes(s) : s.lane === 'admin' ? ins.admin.includes(s) : themed.has(s.id);
    check(where, 'every fired finding has a row on the Brief', placed, s.id);
    check(where, 'a finding has a finite, non-negative score', Number.isFinite(s.score) && s.score >= 0, s.id + ' ' + s.score);
  });
  check(where, 'every theme is listed once', ins.top.length + ins.rest.length + ins.handled.length === ins.themes.length);

  // 2. Every fired card can raise a finding (or says why it does not), and a card that lacks data stays silent
  Object.values(ins.cards).forEach(c => {
    check(where, 'a card lacking its data never fires or shows a figure', c.ok ? true : (!c.fired && !c.signals.length && !!c.nodata), c.id);
    check(where, 'a card is "ok" exactly when nothing it needs is missing', c.ok === (c.missing.length === 0), c.id);
    if (c.ok && c.fired && !c.reference && c.tab !== 'brief' && c.id !== 'ST-5') check(where, 'a fired card raises a finding', c.signals.length > 0 || !!c.exempt, c.id);
    if (c.ok) check(where, 'a card has a headline for both states', !!(c.fired || c.reference ? c.headline : (c.quiet || c.headline)), c.id);
  });

  // 3. A headline's count is the length of the list beneath it
  ['PR-2', 'PR-4', 'UN-7', 'EN-2', 'EN-3', 'WH-4', 'FU-1'].forEach(id => {
    const c = ins.cards[id];
    if (c.ok && c.fired) check(where, 'headline count equals rows shown', lead(c.headline) === c.rows.length, `${id}: “${c.headline.slice(0, 50)}” vs ${c.rows.length} rows`);
  });
  ins.signals.forEach(s => {
    if (['presence', 'struggle', 'habit', 'good'].includes(s.lane) && !s.followup && s.id !== 'roster') check(where, 'a finding about students counts the students it lists', s.n === s.sids.length && lead(s.text) === s.sids.length, `${s.id}: n ${s.n}, ${s.sids.length} students, “${s.text.slice(0, 40)}”`);
    check(where, 'a finding lists each student once, all on the roster', uniq(s.sids) && s.sids.every(id => rosterSet.has(id)), s.id);
  });
  ins.themes.forEach(t => {
    if (t.people) check(where, 'a people theme counts the students it lists', lead(t.text) === t.people.length && t.count === t.people.length && uniq(t.people.map(x => x.sid)), t.id);
    if (t.anchor) check(where, 'a skill theme counts its findings', lead(/through (\d+)/.exec(t.text)[1]) === t.members.filter(s => !s.followup).length, t.id);
  });

  // 4. A button's number is the length of the list it acts on
  const acts = [];
  ins.signals.forEach(s => { if (s.act) acts.push(s.act); (s.alts || []).forEach(a => acts.push(a)); });
  ins.themes.forEach(t => { if (t.act) acts.push(t.act); (t.alts || []).forEach(a => acts.push(a)); });
  acts.forEach(a => {
    if (!a.targets) return;
    const label = I.label(a);
    check(where, 'a button acts on a non-empty list of distinct students', a.targets.length > 0 && uniq(a.targets) && a.targets.every(id => allSet.has(id)), label);
    check(where, 'a button’s number is the length of its list', a.whole ? (a.targets.length === N && /the class$/.test(label)) : label.endsWith(' ' + a.targets.length), label + ' / ' + a.targets.length);
  });

  // 5. Numbers with the same name match wherever they appear
  const wt = m.waiting;
  check(where, '“to grade” is the same on the tile, the card and the assignment rows', wt.toGrade === U.sum(wt.byAsg.map(x => x.n)) && lead(ins.cards['BR-1d'].headline) === wt.toGrade);
  const lastWk = m.rhythm.weeks.filter(x => x.week === m.pulse.week)[0];
  if (lastWk) check(where, '“active in the last class week” matches the weekly chart', lastWk.active === m.pulse.active.n, `${lastWk.active} vs ${m.pulse.active.n}`);
  const q = ins.signals.filter(s => s.id === 'quiet')[0];
  if (ins.cards['EN-2'].ok) check(where, 'quiet students are the same on Engagement, the Brief and the student flags', (q ? q.sids.length : 0) === m.quiet.length && m.quiet.every(x => ins.flags[x.sid].some(f => f.key === 'quiet')));
  const g = m.roster.reduce((a, s) => { const x = m.stu[s.id]; a.n += x.n; a.ok += Math.round((x.fts || 0) * x.n); return a; }, { n: 0, ok: 0 });
  if (g.n) check(where, 'class first try is the sum of the students', Math.abs(g.ok / g.n - m.classFts) < 1e-9);
  const pw = m.pulse.work;
  check(where, 'assigned work adds up: on time + late + not started', pw.onTime + pw.late + pw.none === pw.cells);
  m.funnel.rows.forEach(x => check(where, 'an assignment row adds up to its eligible students', x.completed.length + x.inProgress.length + x.notStarted.length === x.eligible.length, x.a.short));
  m.frontier.forEach(l => l.units.forEach(u => check(where, 'a frontier unit adds up to the roster', u.done + u.inProgress + u.notStarted === N, l.tb.short + ' ' + u.num)));
  m.followups.forEach(f => { if (f.action.kind !== 'check-in' && f.rows.length) check(where, 'follow-up outcomes are exhaustive and each student is counted once', f.improved + f.same + f.firstEvidence + f.noWork === f.rows.length, f.action.title); });
  const mv = m.movement, never = m.roster.filter(s => m.stu[s.id].never).length;
  check(where, 'movement groups add up to the students who have signed in', mv.improving.length + mv.slipping.length + mv.steady.length + mv.noEvidence.length === N - never);
  const mp = m.map, placed = mp.quads.tl.length + mp.quads.tr.length + mp.quads.bl.length + mp.quads.br.length;
  check(where, 'activity map: placed + not placed + never signed in = roster', placed + mp.low.length + mp.away.length + never === N, `${placed}+${mp.low.length}+${mp.away.length}+${never} vs ${N}`);
  const vt = M.vsTypical(m.pulse.fts.classOnNorm != null ? m.pulse.fts.classOnNorm : m.pulse.fts.p, m.pulse.fts.norm);
  check(where, '“against typical” uses one definition on the tile and in the written brief', ins.vsTypical.word === vt.word && (m.pulse.fts.p == null || ins.brief.parts[0].text.includes(vt.word)), vt.word);

  // 6. No student without recent activity, or with too little work, sits in a performance group
  const inQuad = new Set([].concat(mp.quads.tl, mp.quads.tr, mp.quads.bl, mp.quads.br));
  check(where, 'no quiet student sits in a performance group', m.quiet.every(x => !inQuad.has(x.sid)));
  check(where, 'no student who never signed in sits in a performance group', m.roster.every(s => !(m.stu[s.id].never && inQuad.has(s.id))));

  // 7. A gap is ranked only by skills the class will reach
  const skipped = new Set(); m.frontier.forEach(l => l.units.forEach(u => { if (u.skipped) skipped.add(u.id); }));
  const subs = {}; sec.textbooks.forEach(x => Object.assign(subs, x.tb.subs));
  m.gaps.roots.forEach(r => r.blocked.forEach(k => {
    const sk = w.skills[k], where2 = sk.taught.concat(sk.assessed).map(id => subs[id]).filter(Boolean);
    check(where, 'a skill counted as waiting on a gap is in a unit the class will reach', where2.some(sb => !skipped.has(sb.chapter) && !skipped.has(sb.id)), r.skill.name + ' → ' + sk.name);
  }));
  if (!m.caps.graph) check(where, 'with no prerequisite map, no gap claims dependents', m.gaps.roots.every(r => !r.blocked.length && !r.dependents.length));

  // 8. Student flags come from the findings, and the attention order covers the roster
  check(where, 'the attention order is the roster, each student once', ins.byAttention.length === N && uniq(ins.byAttention) && ins.byAttention.every(id => rosterSet.has(id)));
  const sigIds = new Set(ins.signals.map(s => s.id));
  check(where, 'every flag points to the finding that raised it', Object.values(ins.flags).every(fs0 => fs0.every(f => sigIds.has(f.signal))));
  check(where, 'the Students tab count is the number of flagged students', ins.tabCounts.students === ins.flagged.length);
  m.roster.forEach(s => { const sm = ins.summary(s.id); check(where, 'every student has a one-line summary and a next step', !!(sm && sm.text && sm.step), s.id); });
  return { m, ins };
}

const shapes = [];
w.sections.forEach(sec => {
  const scopes = [{ tb: 'all', win: '2w' }, { tb: 'all', win: 'term' }, { tb: 'all', win: '1w' }, { tb: 'all', win: '30d' }, { tb: 'all', win: 'unit' }]
    .concat(sec.textbooks.map(x => ({ tb: x.tb.id, win: '2w' })));
  let first = null;
  scopes.forEach(sc => { const r = checkSection(sec, sc); if (!first) first = r; });
  // the on-demand views must hold up too
  try {
    sec.textbooks.forEach(x => { const gr = M.grid(w, sec, x.tb.id, null); gr.cols.filter(c => c.open).slice(0, 2).forEach(c => M.cell(w, sec, sec.roster[0].id, x.tb.id, c.id)); });
    sec.roster.slice(0, 5).forEach(s => M.student(w, sec, s.id));
    check(sec.id, 'grid, cell and student views build without error', true);
  } catch (e) { check(sec.id, 'grid, cell and student views build without error', false, e.stack.split('\n').slice(0, 2).join(' ')); }
  if (first) shapes.push(`  ${sec.id.padEnd(3)} ${String(sec.roster.length).padStart(3)} students · ${first.ins.lists.teach.top.length}+${first.ins.lists.people.top.length} rows on the Brief, ${first.ins.rest.length} lower impact · ` +
    `${Object.values(first.ins.cards).filter(c => c.fired).length} cards fired, ${Object.values(first.ins.cards).filter(c => !c.ok).length} not available` +
    ` · ${sec.name}` + (Object.keys(first.m.caps).filter(k => !first.m.caps[k]).length ? '\n        lacks: ' + Object.keys(first.m.caps).filter(k => !first.m.caps[k]).map(k => I.NEEDS[k] || k).join('; ') : ''));
});

// Shapes the rules must cover: at least one section lacks each kind of evidence, and class sizes span tiny to very large
const capsSeen = {};
w.sections.forEach(sec => { const c = M.build(w, sec, { tb: 'all', win: '2w' }).caps; Object.keys(c).forEach(k => { (capsSeen[k] = capsSeen[k] || new Set()).add(c[k]); }); });
Object.keys(capsSeen).filter(k => k !== 'work').forEach(k => check('all sections', `some section has, and some lacks: ${I.NEEDS[k] || k}`, capsSeen[k].size === 2));
const sizes = w.sections.map(s => s.roster.length);
check('all sections', 'class sizes span under 10 to over 100', Math.min(...sizes) < 10 && Math.max(...sizes) > 100, sizes.join(', '));

// Static rules for the screen: no text under 12px, and text colours meet 4.5:1 on the surfaces they sit on
const root = path.join(__dirname, '..'), css = fs.readFileSync(path.join(root, 'css', 'lens.css'), 'utf8');
const sources = {};
fs.readdirSync(path.join(root, 'css')).forEach(f => { sources['css/' + f] = fs.readFileSync(path.join(root, 'css', f), 'utf8'); });
fs.readdirSync(path.join(root, 'js')).forEach(f => { sources['js/' + f] = fs.readFileSync(path.join(root, 'js', f), 'utf8'); });
Object.keys(sources).forEach(f => {
  const small = [];
  sources[f].replace(/font(?:-size)?\s*:\s*(?:[a-z]+\s+)*?(\d+(?:\.\d+)?)px/g, (all, px) => { if (+px < 12) small.push(all); return all; });
  check(f, 'no text is set under 12px', small.length === 0, small.slice(0, 3).join(' | '));
});
const vars = {}; css.replace(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g, (all, k, v) => { vars[k] = v; return all; });
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const col = k => k.startsWith('#') ? k : vars[k];
[['--ink', '--surface'], ['--ink-2', '--surface'], ['--ink-2', '--wash'], ['--muted', '--surface'], ['--muted', '--page'], ['--muted', '--wash'], ['--muted', '--amber-tint'], ['--muted', '--blue-tint'],
  ['--link', '--surface'], ['--link', '--page'], ['--link', '--wash'], ['--blue-ink', '--blue-tint'], ['--amber-ink', '--amber-tint'], ['--green-ink', '--green-tint'], ['--purple-ink', '--purple-tint'],
  ['#ffffff', '--link'], ['--ink', '--t0'], ['--ink', '--t1'], ['--ink', '--t2'], ['--ink', '--t3'], ['--ink', '--t4']].forEach(pair => {
  const a = col(pair[0]), b = col(pair[1]);
  check('css/lens.css', `text ${pair[0]} on ${pair[1]} meets 4.5:1`, !!a && !!b && ratio(a, b) >= 4.5, a && b ? ratio(a, b).toFixed(2) : 'colour not found');
});

// The Course Atlas screens (index.html) answer their colour names from the same theme: the same two rules, on its stylesheet
const atlas = sources['css/atlas.css'], av = {};
atlas.replace(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g, (all, k, v) => { av[k] = v; return all; });
const acol = k => k.startsWith('#') ? k : av[k];
[['--ink', '--surface'], ['--ink-2', '--surface'], ['--muted', '--surface'], ['--muted', '--page'], ['--muted', '--wash'], ['--muted', '--surface-2'], ['--muted', '--accent-soft'], ['--link', '--surface'],
  ['#ffffff', '--link'], ['#ffffff', '--ink'], ['--blue-ink', '--blue-tint'], ['--red-ink', '--red-tint'], ['--red-ink', '--surface'], ['--amber-ink', '--amber-tint'], ['--green-ink', '--green-tint'],
  ['#ffffff', '--ink-2'], ['#ffffff', '--blue'], ['--blue-ink', '--surface'],
  ['--ct4', '--c4'], ['--ct3', '--c3'], ['--ft1', '--f1'], ['--ft2', '--f2'], ['--ft3', '--f3'], ['--ft4', '--f4'], ['--ft5', '--f5'], ['--on-mas', '--m-mas'],
  ['--on-lv', '--lv-m'], ['--on-lv', '--lv-p'], ['--ink', '--lv-f'], ['--ink', '--lv-a'], ['--ink', '--lv-b'], ['--ink', '--ua-1'],
  ['--on-ny', '--red'], ['--ink', '--amber'], ['--ink', '--ok-fill'], ['--ink', '--st-rt'], ['--ink', '--hatch'], ['--ink', '--grey']].forEach(pair => {
  const a = acol(pair[0]), b = acol(pair[1]);
  check('css/atlas.css', `text ${pair[0]} on ${pair[1]} meets 4.5:1`, !!a && !!b && ratio(a, b) >= 4.5, a && b ? ratio(a, b).toFixed(2) : 'colour not found');
});
['lens.css tokens match'].forEach(() => {
  ['--ink', '--ink-2', '--muted', '--line', '--axis', '--surface', '--page', '--wash', '--blue', '--blue-ink', '--link', '--blue-tint', '--red', '--amber', '--amber-ink', '--amber-tint', '--green', '--green-ink', '--green-tint', '--grey', '--part', '--prog']
    .forEach(k => check('css/atlas.css', `theme token ${k} is the one in lens.css`, !!vars[k] && !!av[k] && vars[k].toLowerCase() === av[k].toLowerCase(), `${vars[k]} / ${av[k]}`));
});

// The Course Atlas runs on data/class.js, the export of one real class: the export must be whole, hold facts only and point only at things that exist
const atlasData = (() => { try { const w = {}; new Function('window', fs.readFileSync(path.join(root, 'data/class.js'), 'utf8'))(w); return w.ATLAS_DATA; } catch (e) { return null; } })();
check('data/class.js', 'the class export is present and loads', !!atlasData, 'run tools/export-atlas.py');
if (atlasData) {
  const A = atlasData, nS = A.students.length, nI = A.items.length, nJ = A.subs.length, nK = A.skills.length, whole = n => Number.isInteger(n) && n >= 0;
  check('data/class.js', 'it has students, units, subunits, questions and skills', nS > 0 && A.units.length > 0 && nJ > 0 && nI > 0 && nK > 0, `${nS} / ${A.units.length} / ${nJ} / ${nI} / ${nK}`);
  check('data/class.js', 'every subunit belongs to a unit and every unit lists its own subunits', A.subs.every((s, j) => A.units[s.u] && A.units[s.u].subs.includes(j)));
  check('data/class.js', 'every question sits in the subunit that lists it', A.items.every((it, ix) => A.subs[it.sub] && A.subs[it.sub].items.includes(ix)));
  check('data/class.js', 'every skill a subunit or question names exists', A.subs.every(s => s.skills.every(k => k[0] < nK)) && A.items.every(it => it.skills.every(k => k < nK)));
  check('data/class.js', 'every result points at a student and a question', A.att.every(a => a[0] < nS && a[1] < nI && whole(a[5]) && whole(a[6])));
  check('data/class.js', 'a result that was right first time was also right within three tries and ever', A.att.every(a => (!a[2] || a[3]) && (!a[3] || a[4])));
  check('data/class.js', 'one result per student and question', new Set(A.att.map(a => a[0] + ':' + a[1])).size === A.att.length);
  check('data/class.js', 'it holds names only for students: no ids, emails or account fields', A.students.every(s => typeof s === 'string' && !/@/.test(s)));
  check('tools/export-atlas.py', 'the export reads its password from the environment and opens a read-only session',
    (src => /os\.environ\['PGPASSWORD'\]/.test(src) && /default_transaction_read_only = on/.test(src) && !/password\s*=\s*['"]/.test(src))(fs.readFileSync(path.join(root, 'tools/export-atlas.py'), 'utf8')));
  check('css/atlas.css', 'status colours are semantic: good is green, bad is red, watch is amber', /--good:var\(--green\)/.test(atlas) && /--bad:var\(--red\)/.test(atlas) && /--watch:var\(--amber\)/.test(atlas));
  check('css/atlas.css', 'a level is ALPS\'s colour (src/utils/colors.js): Beginning #D7D7D7, Attempted #E3F2FD, Familiar #90CAF9, Proficient #1876D2, Mastered #0D47A1',
    ['--lv-b', '--lv-a', '--lv-f', '--lv-p', '--lv-m'].map(k => (av[k] || '').toUpperCase()).join(' ') === '#D7D7D7 #E3F2FD #90CAF9 #1876D2 #0D47A1', ['--lv-b', '--lv-a', '--lv-f', '--lv-p', '--lv-m'].map(k => av[k]).join(' '));
  check('css/atlas.css', 'past the gray of beginning, a level only gets darker: attempted, familiar, proficient, mastered, each step plain to see', (m => m.every(Boolean) && m.every((c, i) => !i || (lum(m[i - 1]) > lum(c) && ratio(m[i - 1], c) >= 1.5)))([av['--lv-a'], av['--lv-f'], av['--lv-p'], av['--lv-m']]), `${av['--lv-a']} ${av['--lv-f']} ${av['--lv-p']} ${av['--lv-m']}`);
  check('css/atlas.css', 'a level with no number looks as in ALPS: unavailable hatched #EEEEEE and #F8F8F8 in a dashed #BDBDBD outline, not attempted #FAFAFA in a solid #E0E0E0 one',
    ['--ua-1', '--ua-2', '--ua-line', '--na-fill', '--na-line'].map(k => (av[k] || '').toUpperCase()).join(' ') === '#EEEEEE #F8F8F8 #BDBDBD #FAFAFA #E0E0E0' && /\.sb \.ua\{[^}]*outline:1px dashed var\(--ua-line\)/.test(atlas) && /\.sw\.ua\{/.test(atlas) && /\.sw\.na\{background:var\(--na-fill\);box-shadow:inset 0 0 0 1px var\(--na-line\)\}/.test(atlas));
  // nothing on any page is invented: the sample rows My actions once showed are gone, and index.html loads no file of them
  const script = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
  check('index.html', 'no invented rows: data/sample.js is gone and the page loads no file of them', !fs.existsSync(path.join(root, 'data/sample.js')) && !/sample\.js/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')) && !/ATLAS_SAMPLE|sample:true|v12sample/.test(script));
  // the three things a teacher can do in the product: coursework, content to practice, a group. The product has no reteach (asked 2026-10-23), so no
  // button offers one and no action logs one; a group is fine. Nothing is sent, launched, marked or changed in the course
  check('js/atlas.js', 'every action a page offers is coursework, content to practice or a group: never a reteach, and nothing is sent, launched or marked', !/Message home|Check in|check-in|Not a concern|required check|worked example|Talk to them|coding club|Messages home|Stretch task|Message copied/.test(script)
    && !/Reteach in a small group|\?'Reteach to everyone'|Reteach this|Reteach planned|>Reteach<|data-act="v7plan"|reteachBtn|Small-group reteach|Whole-class reteach/.test(script)
    && /grp\('stuck','Form a group'\)/.test(script) && /Generate practice/.test(script) && /Assign the practice/.test(script) && /Stretch set/.test(script) && /Give a review set/.test(script) && /Assign it as coursework/.test(script));
  check('index.html', 'the page loads the class export before the script', /data\/class\.js[^]*js\/atlas\.js/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
  // A class can have more than one book. One book: nothing on any page says "book", and the file is written as it always was. More: every unit,
  // lesson and question belongs to one book, a skill is shared by the books that check it and keeps its level whichever book is picked, the main
  // book sets where the class is, and a book of labs is work done and never a check. The example (data/example.js) adds books with invented work
  // to the real class, on real outlines, and is read only at index.html?books.
  const atlasSrc = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8'), indexSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  check('data/class.js', 'this class has one book, so its file lists no books and no unit or assignment names one', !A.meta.books && A.units.every(u => !('tb' in u)) && A.coursework.every(c => !('tb' in c)));
  check('tools/export-atlas.py', 'the export writes every book the section lists, the primary ones first, marks each unit and assignment with its book, lists the books only when there are several, and orders ties by id so two runs give one file',
    (src => /from section_curriculum sc join curriculum c/.test(src) && /order by \(sc\.role <> 'primary'\)/.test(src) && /'tb': tb\}/.test(src) && /if not multi:\n\s+for row in U \+ cws: del row\['tb'\]/.test(src) && /if multi:\n\s+out\['meta'\]\['books'\]/.test(src)
      && /order by u\.level, o\.ordering, u\.unit_id/.test(src) && /order by cui\.unit_id, cui\.ordering, i\.item_id/.test(src) && /def short_name\(name\)/.test(src))(fs.readFileSync(path.join(root, 'tools/export-atlas.py'), 'utf8')));
  check('js/atlas.js', 'a class with one book is drawn as it always was: no page says "book" and no page has a filter unless the class has work in two or more',
    /const MULTI=BKON\.length>1;/.test(atlasSrc) && /const bkCtl=\(\)=>`\$\{MULTI\?pickCtl\('bksel'/.test(atlasSrc) && /const bkTag=tb=>MULTI&&/.test(atlasSrc) && /if\(!MULTI\)return false;/.test(atlasSrc) && /if\(!MULTI\)return null;/.test(atlasSrc));
  check('js/atlas.js', 'every page and a profile have the same textbook filter, on the right of the title after the page\'s own filters and before "How to read", the cards under the row: all the textbooks, or one with work; the pick is in the address and a change reloads the page',
    /<div class="vctl">\$\{PCTL\}\$\{bkCtl\(\)\}<details class="how">/.test(atlasSrc) && /id="ans">\$\{HL\[k\]\(\)\}<\/p><div id="ansc">\$\{icards\(ICD\[k\]\(\)\)\}<\/div>\$\{body\}/.test(atlasSrc) && /<h2 class="pname">\$\{n\}<\/h2><\/div><div class="vctl">\$\{bkCtl\(\)\}<\/div>/.test(atlasSrc) && /location\.search\.match\(\/\[\?&\]book=\(\[\^&#\]\*\)\/\)/.test(atlasSrc) && /id==='bksel'\)location\.assign\(bkUrl\(/.test(atlasSrc) && /\[\['all','All textbooks'\]\]\.concat\(BKON\.map/.test(atlasSrc) && /,'Textbook'\):''\}\$\{asOfCtl\(\)\}/.test(atlasSrc));
  check('js/atlas.js', 'a picked book narrows the view (its units, lessons and questions, the skills its lessons use, the work in it) and a level stays what it is: the evidence is every question on the skill in every book',
    /VU\.push\(U\)/.test(atlasSrc) && /const SUBS=VJ\.map/.test(atlasSrc) && /CI=CIALL\.map\(\(v,ix\)=>v&&IT\[ix\]\.j>=0\)/.test(atlasSrc) && /const KTA=ASK\.map\(\(\)=>false\);D\.subs\.forEach/.test(atlasSrc) && /const e=KTA\[k\]\?estOf\(i,k,LASTDAY\):null/.test(atlasSrc) && /const mast=\(i,k\)=>KTA\[k\]\?/.test(atlasSrc) && /const rdTaught=k=>KTA\[k\];/.test(atlasSrc));
  check('js/atlas.js', 'a book of labs (nine in ten of its questions are coding tasks) is work done and never a check: labs are left out of every level, a labs cell is one gray bar with no level, and on a page about labs "gave up" reads "not right yet" in gray',
    /return g>0&&c>=\.9\*g\}\)/.test(atlasSrc) && /const EVOK=ix=>!NOCHK\[ix\]&&!IT\[ix\]\.lab;/.test(atlasSrc) && /if\(b\.lab\)\{const doing=b\.e>=S\.v2\.line\/100;return \{e:b\.e,m:null,mc:'L',lab:true,doing,st:b\.st,g:doing\?'labs':'off'\}\}/.test(atlasSrc)
      && /if\(c\.mc==='L'\)return/.test(atlasSrc) && /OUT7L=\['Ran right first time','Ran right after more runs','Not right yet','Skipped','Not reached yet'\]/.test(atlasSrc) && /CGU=LABV\?'var\(--neutral\)':'var\(--st-gu\)'/.test(atlasSrc) && /function v2strip\(/.test(atlasSrc));
  check('js/atlas.js', 'under "All books" the pages that offer units group them by book, the grid has a label over each book\'s columns, the labs are named under a list and not ranked in it, the bands of time are the main book\'s, and the main book sets where the class is',
    /const treeBody=\(T,ord,unitRow,nsI\)=>MULTI&&PICK===null\?BKON\.filter\(tb=>!LABB\[tb\]\)/.test(atlasSrc) && /const labsNote=what=>/.test(atlasSrc) && /const gH=lv==='u'&&MULTI&&PICK===null\?22:0/.test(atlasSrc)
      && /const TREEU=TB0\.map\(\(U,u\)=>u\)\.filter\(u=>!\(MULTI&&PICK===null&&TB0\[u\]\.lab\)\),BANDU=TAUGHT\.filter\(u=>!MULTI\|\|PICK!==null\|\|TB0\[u\]\.tb===MAIN\)/.test(atlasSrc) && /const CUA=TAUGHT\.filter\(u=>!MULTI\|\|PICK!==null\|\|TB0\[u\]\.tb===MAIN\)/.test(atlasSrc));
  check('js/atlas.js', 'a page says so when a book gives too little to judge: drifting needs work in four five-day blocks, and the figures go blank rather than read as zero',
    /const TOOFEW=MULTI&&PICK!==null&&ONB\.filter\(Boolean\)\.length<4;/.test(atlasSrc) && /function h3\(\)\{if\(TOOFEW\)return/.test(atlasSrc) && /TOOFEW\?'–':/.test(atlasSrc) && /if\(!TOOFEW\)\{s\+=T\(0,t2-12,'Questions tried in each 5 days'/.test(atlasSrc) && /s\+=d>=0&&di>=0\?`<polyline points="\$\{ap\.slice\(0,di\+1\)/.test(atlasSrc));
  check('js/atlas.js', 'the top bar counts the books; the example is read only when the address asks for it and only when it was built for this very export, and while it is on, a chip in the top bar says what in it is invented and takes the page back to the class as recorded; no page has a footer or a table of sources (asked 2026-10-26: "remove these parts from all the pages")',
    /const EXQ=\/\[\?&\]books\(\?=\[&=\]\|\$\)\/\.test\(location\.search\);/.test(atlasSrc) && /b\.att===D\.att\.length\)\}\)\(\);/.test(atlasSrc) && /const EX=EXQ&&EXOK\?/.test(atlasSrc)
      && /if\(chip&&EX\)\{chip\.innerHTML=`Example · work in \$\{esc\(andList\(inv\)\)\} is invented\$\{IC\.x\}`;/.test(atlasSrc) && /<button class="demo-date" id="demochip" type="button" data-act="exoff" hidden><\/button>/.test(indexSrc) && /case 'exoff':location\.assign\(location\.pathname\+location\.hash\);return;/.test(atlasSrc)
      && !/id="foot"|class="foot"|Where the numbers come from|id="src"/.test(indexSrc + atlasSrc) && !/const TBL=|\$\('#foot'\)|\$\('#src'\)|data-act="exon"/.test(atlasSrc) && !/Mock · real class data/.test(indexSrc));
  // data/example.js is the other place with invented numbers: the work of this class in more books, on their real outlines
  const exSrc = (() => { try { return fs.readFileSync(path.join(root, 'data/example.js'), 'utf8'); } catch (e) { return null; } })();
  check('data/example.js', 'the example file is present and loads', !!exSrc, 'run tools/make-example.py');
  if (exSrc) {
    const w = {}; new Function('window', exSrc)(w); const B = w.ATLAS_BOOKS || {}, b = B.base || {}, att = B.att || [], K = A.skills.length + (B.skills || []).length, nIall = nI + (B.items || []).length;
    check('data/example.js', 'the example file says its work is invented and its outlines are real', /^\/\* INVENTED work, on real outlines/.test(exSrc) && /The work is not: no result/.test(exSrc));
    check('data/example.js', 'it was built for this export: it continues the class file\'s numbers and changes none of them', b.section === A.meta.section && b.units === A.units.length && b.subs === nJ && b.items === nI && b.skills === nK && b.att === A.att.length);
    check('data/example.js', 'it lists the class\'s own book first, as real, and every added book as supplemental and invented, with a short name each', Array.isArray(B.books) && B.books.length >= 2 && B.books[0].id === A.meta.textbookId && !B.books[0].invented && B.books.slice(1).every(x => x.invented && x.role === 'supplemental') && B.books.every(x => typeof x.short === 'string' && x.short.length > 0));
    check('data/example.js', 'every added unit names an added book, and its lessons and questions sit where they say', (B.units || []).length > 0 && (B.units || []).every(u => u.tb >= 1 && u.tb < B.books.length) && (B.subs || []).every((s, j) => s.u >= b.units && B.units[s.u - b.units] && B.units[s.u - b.units].subs.includes(j + b.subs)) && (B.items || []).every((it, ix) => it.sub >= b.subs && B.subs[it.sub - b.subs] && B.subs[it.sub - b.subs].items.includes(ix + b.items)));
    check('data/example.js', 'every skill an added lesson or question names exists', (B.subs || []).every(s => s.skills.every(q => q[0] < K)) && (B.items || []).every(it => it.skills.every(q => q < K)));
    check('data/example.js', 'every invented result is a student of the class on a question of an added book, once', att.length > 0 && att.every(a => a[0] < nS && a[1] >= b.items && a[1] < nIall && whole(a[5]) && whole(a[6])) && new Set(att.map(a => a[0] + ':' + a[1])).size === att.length);
    check('data/example.js', 'no invented result falls on a day the student did not really work, so nobody\'s days of work are invented', (() => { const days = new Set(A.daily.filter(r => r[2] > 0 || r[3] > 0).map(r => r[0] + ':' + r[1])); return att.every(a => days.has(a[0] + ':' + a[6])); })());
    check('data/example.js', 'an invented result that was right first time was also right within three tries and ever', att.every(a => (!a[2] || a[3]) && (!a[3] || a[4])));
    check('index.html', 'the page loads the example file after the class export and before the script', /data\/class\.js[^]*data\/example\.js[^]*js\/atlas\.js/.test(indexSrc));
    check('tools/make-example.py', 'the example is built by a tool that keeps real and invented apart, reads the outlines through the export\'s own read-only session, and gives the same file for the same seed',
      (src => /REAL\s+the class in data\/class\.js/.test(src) && /INVENTED\s+the work of those students/.test(src) && /con = ex\.connect\(\)/.test(src) && /rng = random\.Random\(SEED\)/.test(src) && !/password\s*=\s*['"]/.test(src) && !/import pg8000/.test(src))(fs.readFileSync(path.join(root, 'tools/make-example.py'), 'utf8')));
  }
  // data/prereqs.js: what each unit builds on, two levels back, from the learner model's skill graph. The database only names the graph file, which
  // the learner model keeps in its cloud bucket, so the tool takes the bucket from the environment, like the password, and writes neither anywhere
  const prSrc = (() => { try { return fs.readFileSync(path.join(root, 'data/prereqs.js'), 'utf8'); } catch (e) { return null; } })();
  check('data/prereqs.js', 'the prerequisite file is present and loads', !!prSrc, 'run tools/export-prereqs.py');
  if (prSrc) {
    const w = {}; new Function('window', prSrc)(w); const P = w.ATLAS_PREREQS || {}, b = P.base || {}, PU = P.units || [], xs = P.skills || [], tg = P.tags || [], K = nK + xs.length;
    const checkedBy = u => new Set(A.units[u].subs.flatMap(j => A.subs[j].items.flatMap(ix => A.items[ix].skills)));   // what the unit's own questions check
    check('data/prereqs.js', 'it says where its edges come from: the learner model\'s skill graph, in which an LLM judged each pair', /^\/\* Built by tools\/export-prereqs\.py on \d{4}-\d{2}-\d{2} from the learner model's skill graph/.test(prSrc) && /an LLM judged each pair/.test(prSrc));
    check('data/prereqs.js', 'it was built for this export: the same section, units, lessons, questions and skills', b.section === A.meta.section && b.units === A.units.length && b.subs === nJ && b.items === nI && b.skills === nK);
    check('data/prereqs.js', 'one list a unit; every prerequisite, and every one under it, is a skill of the class or one the file adds, with what it is needed for and a confidence of 1 to 5',
      PU.length === A.units.length && PU.every(rows => Array.isArray(rows) && rows.every(r => whole(r[0]) && r[0] < K && r[1] > 0 && Array.isArray(r[2]) && r[2].length > 0 && Array.isArray(r[3]) && r[3].every(([k2, c]) => whole(k2) && k2 < K && k2 !== r[0] && c >= 1 && c <= 5))));
    check('data/prereqs.js', 'a prerequisite, at either level, is not a skill its own unit\'s questions check, and a unit lists it once', PU.every((rows, u) => { const used = checkedBy(u); return new Set(rows.map(r => r[0])).size === rows.length && rows.every(r => !used.has(r[0]) && r[3].every(([k2]) => !used.has(k2))); }));
    check('data/prereqs.js', 'a unit\'s skills are the ones its questions are tagged with above 50% relevance: the file says so, counts them a unit, and a unit with none has no tree', /at a relevance score above 50%/.test(prSrc) && P.minRelevance === 0.5 && Array.isArray(P.used) && P.used.length === PU.length && P.used.every((n, u) => whole(n) && (n > 0 || PU[u].length === 0)));
    check('data/prereqs.js', 'every skill a tree draws that a lesson teaches names those lessons, each a lesson of the class', Array.isArray(P.taught) && P.taught.length > 0 && P.taught.every(([k, js]) => whole(k) && k < K && Array.isArray(js) && js.length > 0 && js.every(j => whole(j) && j < nJ)));
    check('data/prereqs.js', 'every skill the file adds has a name, and the questions it lists as checking one are the class\'s own', xs.length === tg.length && xs.every(n => typeof n === 'string' && n.length > 0) && tg.every(t => Array.isArray(t) && t.every(ix => whole(ix) && ix < nI)));
    check('index.html', 'the page loads the prerequisite file after the class export and before the script', /data\/class\.js[^]*data\/prereqs\.js[^]*js\/atlas\.js/.test(indexSrc));
  }
  check('tools/export-prereqs.py', 'the prerequisite tool reads through the export\'s own read-only session, takes the graph file or its bucket from the environment, and writes no password, bucket or storage address',
    (src => /con = ex\.connect\(\)/.test(src) && !/import pg8000/.test(src) && /os\.environ\.get\('SKILL_GRAPH_FILE'\)/.test(src) && /os\.environ\.get\('GRAPH_BUCKET'\)/.test(src) && /'application-default', 'print-access-token'/.test(src)
      && !/password\s*=\s*['"]/.test(src) && !/gs:\/\//.test(src) && !/storage\/v1\/b\/[a-z0-9]/.test(src)
      && /and relevance_score > :r", i=graded, r=ex\.MIN_RELEVANCE\)/.test(src) && !/lesson_tags/.test(src))(fs.readFileSync(path.join(root, 'tools/export-prereqs.py'), 'utf8')));
  check('tools/export-atlas.py', 'a question checks a skill only when its tag\'s relevance score is above 50%, one threshold for the export and the prerequisite tool',
    (src => /^MIN_RELEVANCE = 0\.5 /m.test(src) && /and relevance_score > :r order by item_id, relevance_score desc, skill_id", i=graded_ids, r=MIN_RELEVANCE\)/.test(src))(fs.readFileSync(path.join(root, 'tools/export-atlas.py'), 'utf8')));
  check('js/atlas.js', 'each skill of the tree has the bulb before its name that every skill\'s name has, and one symbol of its own under it, a book, filled when a lesson the class worked on teaches it and hollow when not, keyed beside the rings; no "assessed" mark, since on the skills drawn nearly everyone answered; the hover names the lessons, how many questions check the skill and when it was last asked',
    /const rdTa=k=>rdLs\(k\)\.some\(j=>ONJ\[j\]\);/.test(atlasSrc) && /const rdEv=\(k,ids\)=>/.test(atlasSrc) && /\$\{rdNm\(x,cy\+60,16,ln,\{[^}]*\}\)\}\$\{taSym\(x,cy\+78\+\(ln\.length-1\)\*16,q\.k\)\}/.test(atlasSrc) && /\$\{rdNm\(x2,gy\+44,15,l2,\{[^}]*\}\)\}\$\{taSym\(x2,gy\+61\+\(l2\.length-1\)\*15,k2\)\}/.test(atlasSrc)
      && /\$\{noev\?NOEV:''\}<i class="ksep" aria-hidden="true"><\/i>\$\{TAKEY\}/.test(atlasSrc) && /\}<\/svg>Taught<\/span>/.test(atlasSrc) && !/rdAsd|gTick|Assessed, not assessed|Not assessed/.test(atlasSrc)
      && /`\$\{qs\} · last asked \$\{dayDate\(E\.last\)\}`/.test(atlasSrc) && /\$\{taTxt\(q\.k,ids\)\}<br>/.test(atlasSrc) && /\$\{taTxt\(k2,ids\)\}<br>/.test(atlasSrc));
  check('README.md', 'every command in the README shows the password and the bucket as "…"', (src => /GRAPH_BUCKET=… python3 tools\/export-prereqs\.py/.test(src) && !/(PGPASSWORD|GRAPH_BUCKET)=(?!…)\S/.test(src))(fs.readFileSync(path.join(root, 'README.md'), 'utf8')));
  check('js/atlas.js', 'ready for a unit reads the prerequisite file only when it was built for this very export, before an example book is added, and any unit the graph does not cover falls back on the coverage weights',
    /const PRQ=\(function\(\)\{const P=window\.ATLAS_PREREQS,b=P&&P\.base;return b&&b\.section===D\.meta\.section&&b\.units===D\.units\.length&&b\.subs===D\.subs\.length&&b\.items===D\.items\.length&&b\.skills===D\.skills\.length/.test(atlasSrc)
      && atlasSrc.indexOf('const PRQ=') < atlasSrc.indexOf('const EX=') && /const PRX0=D\.skills\.length;if\(PRQ\)D\.skills=D\.skills\.concat\(PRQ\.skills\);/.test(atlasSrc)
      && /const RDG=u=>!!PRQ&&DUI\[u\]!==undefined&&DUI\[u\]<PRQ\.units\.length;/.test(atlasSrc) && /READY\['0:'\+u\]=G\?G\.map\(/.test(atlasSrc) && /:\(U\.pre\|\|\[\]\)\.map\(/.test(atlasSrc));
  check('js/atlas.js', 'a student\'s level on a prerequisite is the page\'s own, from the class\'s answers, as on every page, whether or not a started lesson lists the skill (the book says that); a ring needs eight students with a level, its share is of those at the picked level or above, and one no question in this class checks is dashed and says so',
    /const rdOK=k=>chk5\(k\)&&rdN\(k\)>=8;/.test(atlasSrc) && /const rdLv=\(i,k\)=>\{const c=CAT\[i\]\[k\];if\(c==='F'\|\|c==='H'\|\|c==='E'\)return lvOf\(CUR\[i\]\[k\]\);const e=rdEst\(i,k\);return e&&e\.ev>=2\?lvOf\(e\.c\):null\};/.test(atlasSrc) && !/PRQ\.levels|LMK|LMOFF/.test(atlasSrc)
      && /const rdP=\(k,ids,L\)=>rdWhy\(k\)\|\|!rdC\(k,ids\)\?null:pc\(rdF\(k,ids,L\)\.length,rdC\(k,ids\)\);/.test(atlasSrc) && /'No question in this class checks it'/.test(atlasSrc) && /const rdSay=\(k,ids\)=>`\$\{rdF\(k,ids\)\.length\} of the \$\{rdC\(k,ids\)\} \$\{S\.v11\.grp\?'in the group':'students'\} with a level on it \$\{lvAre\(S\.v11\.lv\)\}`;/.test(atlasSrc)
      && /const atLv=\(i,k,L\)=>\{const v=rdLv\(i,k\);return v!==null&&v>=LVN\[L\|\|S\.v11\.lv\]\};/.test(atlasSrc));
  check('js/atlas.js', 'the tree is two levels: on top the four prerequisites the unit needs most (by how many of its questions need each, three or more; ones this class\'s questions check first), drawn whatever the class\'s evidence, dashed when it is too little; two under each, only ones with evidence; no skill drawn twice, the rest counted under it ("+8 more prerequisites", names on hover), and no text about the rows',
    /const rdTop=\(list,n\)=>list\.slice\(0,n\);/.test(atlasSrc) && /MIN_NEED = 3/.test(fs.readFileSync(path.join(root, 'tools/export-prereqs.py'), 'utf8')) && /key=lambda p: \(not measured\(p\), -len\(needq\[p\]\), -score\[p\], p\)/.test(fs.readFileSync(path.join(root, 'tools/export-prereqs.py'), 'utf8')) && /const rdPick=list=>\{const ks=rdTop\(list\.map\(q=>q\.k\),4\),seen=new Set\(ks\)/.test(atlasSrc) && /ok=c\.filter\(rdOK\)\.slice\(0,2\);ok\.forEach\(k=>seen\.add\(k\)\);return ok\}/.test(atlasSrc)
      && !/'Builds on'|'Which build on'|Top row: what the unit builds on|Around the unit: what it builds on/.test(atlasSrc) && /\+\$\{rest\.length\} more \$\{pl\(rest\.length,'prerequisite'\)\}/.test(atlasSrc));
  check('js/atlas.js', 'the key is two short lines: the ring\'s levels as squares, as on every key, then the share inside, led by the level it is read at, its three ranges in the colours the shares take, the dashed ring and the book, its groups set apart; the level line\'s nodes are gray, the picked one in the primary colour, no verdict colour; the unit carries its name alone',
    /<span class="lt">% inside: share \$\{lvAt\(L\)\}<\/span><span class="kn bad">Under 60%<\/span><span class="kn watch">60 to 79%<\/span><span class="kn good">80% or more<\/span>\$\{noev\?NOEV:''\}<i class="ksep" aria-hidden="true"><\/i>\$\{TAKEY\}/.test(atlasSrc)
      && /<div class="legend"><span class="lt">Students<\/span>\$\{\[4,3,2,1,0\]\.map\(b=>`<span>\$\{lsw\(b\)\}\$\{LV\[b\]\}<\/span>`\)\.join\(''\)\}<\/div><div class="legend rdkey">/.test(atlasSrc) && !/class="ul\$|\.rdkey \.ul/.test(atlasSrc + atlas) && /aria-label="At least \$\{SL\[L\]\.toLowerCase\(\)\}: \$\{v\.t\.toLowerCase\(\)\}"><span class="lvdot" aria-hidden="true"><\/span>/.test(atlasSrc) && !/--vc|const rk=/.test(atlasSrc)
      && /\.lvdot\{[^}]*background:var\(--axis\)/.test(atlas) && /\.lvstop\[aria-pressed="true"\] \.lvdot\{background:var\(--accent\)/.test(atlas) && /\.rdkey \.kn\.bad\{color:var\(--bad-ink\)\} \.rdkey \.kn\.watch\{color:var\(--watch-ink\)\} \.rdkey \.kn\.good\{color:var\(--good-ink\)\}/.test(atlas)
      && !/RKLINE|Latest work · \$\{whenTxt\(R\.U\)\}/.test(atlasSrc) && /\+T\(rx,ry\+5,R\.U\.n,/.test(atlasSrc));
  check('js/atlas.js', 'the readiness line is a level, not a share: ALPS\'s levels from attempted up as stops on one line, proficient to begin with, each saying what the class is at it; every ring in every version splits the students checked by ALPS level, the share inside in its status colour at fixed shares (60%, 80%), and the answer names the level',
    /const RDLV=\['A','F','P','M'\],RDCUT=60;/.test(atlasSrc) && /v11:\{lv:'P',/.test(atlasSrc) && /const ringCol=p=>p>=80\?'good':p>=RDCUT\?'watch':'bad';/.test(atlasSrc) && /const ringTxt=p=>p===null\?'t3':'t'\+ringCol\(p\);/.test(atlasSrc) && !/function ring\(/.test(atlasSrc)
      && /const ring1=\(x,y,r,sw,p,k\)=>p===null\?noRing\(x,y,r\):splitRing\(x,y,r,sw,k,ids\);/.test(atlasSrc) && /:splitRing\(x,y,r,sw,k,ids\)\+T\(x,y\+\(big\?6:4\),big\?pcTxt\(p\):p\+'%',\{a:'middle',c:ringTxt\(p\),/.test(atlasSrc) && /\{a:'middle',c:ringTxt\(p\),w:700,s:17\}/.test(atlasSrc) && /\{a:'middle',c:ringTxt\(p2\),w:700\}/.test(atlasSrc)
      && /data-act="v11lv" data-f="\$\{L\}" aria-pressed="\$\{on\}"/.test(atlasSrc) && /case 'v11lv':S\.v11\.lv=d\.f;S\.v11\.acc=\{\};reView\(\);/.test(atlasSrc) && /Not ready for \$\{nm\} at \$\{lv\}\./.test(atlasSrc) && !/v11th|S\.v11\.th/.test(atlasSrc));
  check('js/atlas.js', 'the rings run weakest first, left to right, a ring with no share last, and on a narrow screen the tree opens on the first', /const rdOrder=\(pre,ids\)=>/.test(atlasSrc) && /pre:rdOrder\(rdPick\(all\),ids\)/.test(atlasSrc) && /:Math\.max\(0,\(xs\[0\]-100\)\*fg\.scrollWidth\/W\)\}/.test(atlasSrc));
  check('js/atlas.js', 'a small group is the students with a level on a skill below the picked one, those with no level on it are counted apart with their names on hover, and a card with nothing in it is left out, one line saying why; accepting the plan logs its small group and its stretch set, never the skills to teach the whole class, since the product has no reteach', /const gaps=n=>amb\.filter\(o=>rdChk\(ID\[n\],o\.k\)&&!atLv\(ID\[n\],o\.k,L\)\)\.length;/.test(atlasSrc) && /unk:names\.filter\(n=>gaps\(n\)===0&&amb\.some\(o=>!rdChk\(ID\[n\],o\.k\)\)\)/.test(atlasSrc)
      && /\+\$\{P\.unk\.length\} with no level<\/span>/.test(atlasSrc) && /'Nothing to reteach\.'/.test(atlasSrc) && /'No small groups\.'/.test(atlasSrc) && /'Nobody ready to go further yet\.'/.test(atlasSrc)
      && /const cards=\(P\.red\.length\?card\('bad','Reteach to everyone',rb\):''\)\+\(P\.amb\.length\?card\('watch','Small groups',ab,'grp',P\.grp\.length\):''\)\+\(P\.ext\.length\?card\('good','Ready to go further',chips\('ext',P\.ext,null\),'ext',P\.ext\.length\):''\);/.test(atlasSrc) && /const logs=\(P\.amb\.length&&P\.grp\.length\)\|\|P\.ext\.length;/.test(atlasSrc) && !/P\.red\.forEach\(o=>logAct/.test(atlasSrc));
  check('js/atlas.js', 'a plan group (the small group, ready to go further) has a button on its card that shows the tree for that group only; the tree says which group with the way back, the plan stays the class\'s, and a new unit starts on the whole class',
    /data-act="v11grp" data-g="\$\{on\?'':g\}" aria-pressed="\$\{on\}">Show on tree<\/button>/.test(atlasSrc) && /const ids=S\.v11\.grp\?gn\.map\(n=>ID\[n\]\):R\.ids,/.test(atlasSrc) && /case 'v11grp':S\.v11\.grp=d\.g\|\|null;v11draw\(\);\{const f=\$\('#v11c \.rdfor'\);/.test(atlasSrc)
      && /data-act="v11grp" data-g="">Whole class<\/button>/.test(atlasSrc) && /S\.v11\.u\[S\.v11\.tb\]=\+t\.value;S\.v11\.grp=null;/.test(atlasSrc) && /\{k,p:rdP\(k,R\.ids\)\}/.test(atlasSrc));
  // the tree as the page draws it, for every unit: the script run on the class and the prerequisite file, then on the example with its books
  if (prSrc) {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const runApp = (search, files) => {
      const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
      const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
        location: { search, hash: '#ready', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
      files.forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
      vm.runInContext(atlasSrc.replace(boot, 'globalThis.RD_TEST={S,TB,DUI,PRQ,RDG,rdSel,rdOK,rdP,v11,v11draw,taTxt,planNow,rdChk,secOf,atLv,rdVerdict,ID,KIT,NM,rdSplit,ASK,rdNo,ringCol,PRX0,rdLv,CUR,CAT,lvOf,IVS,rdDef,TB0,KTA,estOf,LASTDAY,READY};'), ctx, { filename: 'js/atlas.js' });
      const T = ctx.RD_TEST; T.S.view = 10;
      return { T, node, trees: T.TB[0].units.map((U, u) => { T.S.v11.u[0] = u; T.v11draw(); const R = T.rdSel(); return { u, R, P: T.planNow(), ks: R.pre.flatMap(q => [q.k].concat(q.cs)), ans: node('#ans').textContent, out: node('#v11c').innerHTML + node('#ans').textContent }; }) };
    };
    const ok = trees => trees.every(t => t.R.pre.length <= 4 && t.R.pre.every(q => q.cs.length <= 2) && new Set(t.ks).size === t.ks.length && !/NaN|undefined|Infinity/.test(t.out));
    const one = runApp('', ['data/class.js', 'data/prereqs.js']);
    check('js/atlas.js', 'with the file loaded, every unit of the class draws its tree from the graph: at most four on top and two under each, no skill twice, nothing undefined', !!one.T.PRQ && one.trees.every(t => one.T.RDG(t.u)) && ok(one.trees));
    const sorted = (ks, ids, T) => { const v = ks.map(k => T.rdP(k, ids)), cut = v.indexOf(null), known = cut < 0 ? v : v.slice(0, cut); return known.every((x, i) => !i || known[i - 1] <= x) && (cut < 0 || v.slice(cut).every(x => x === null)); };
    check('js/atlas.js', 'on every unit the rings run weakest first, a ring with no share last, and so does each second row', one.trees.every(t => sorted(t.R.pre.map(q => q.k), t.R.ids, one.T) && t.R.pre.every(q => sorted(q.cs, t.R.ids, one.T))));
    const plans = ['A', 'F', 'P', 'M'].flatMap(L => one.T.TB[0].units.map((U, u) => { one.T.S.v11.u[0] = u; return { L, P: one.T.planNow(L) }; }));
    check('js/atlas.js', 'on every unit, at every level, the small group holds only students with a level on one of its skills below the picked one, and nobody counted as having no level is in it', plans.every(({ L, P }) => P.grp.every(n => P.amb.some(o => one.T.rdChk(one.T.ID[n], o.k) && !one.T.atLv(one.T.ID[n], o.k, L))) && P.unk.every(n => !P.grp.includes(n))) && plans.some(({ P }) => P.unk.length > 0));
    // the readiness line, on every unit: the same rings at every level, a share that never rises with the level, a verdict that never gets better with it,
    // each stop saying the verdict the plan gives at its level, one stop picked, and going further kept for the students who have mastered every skill
    const VR = { 'Ready': 3, 'Groups first': 2, 'Not ready': 1, 'Too early to tell': 0 }, LVS = ['A', 'F', 'P', 'M'];
    const lineOK = one.T.TB[0].units.map((U, u) => { one.T.S.v11.u[0] = u; const R = one.T.rdSel(), ks = R.pre.flatMap(q => [q.k].concat(q.cs)), v = LVS.map(L => one.T.rdVerdict(L).t), html = one.T.v11();
      return { u, any: new Set(v).size > 1, ok: ks.every(k => LVS.map(L => one.T.rdP(k, R.ids, L)).every((p, i, a) => !i || p === null || a[i - 1] >= p)) && v.every((t, i) => !i || VR[v[i - 1]] >= VR[t])
        && (!R.pre.length || ((html.match(/data-act="v11lv"/g) || []).length === 4 && (html.match(/data-act="v11lv" data-f="[AFPM]" aria-pressed="true"/g) || []).length === 1 && LVS.every((L, i) => html.includes(`aria-label="At least ${['attempted', 'familiar', 'proficient', 'mastered'][i]}: ${v[i].toLowerCase()}"`))))
        && LVS.every(L => one.T.planNow(L).ext.every(n => R.pre.every(q => one.T.rdP(q.k, R.ids) === null || !one.T.rdChk(one.T.ID[n], q.k) || one.T.secOf(one.T.ID[n], q.k)))) }; });
    // a plan group on the tree, on every unit that has one: its rings are its own students' shares, the tree says whose, and the whole class comes back
    const grpOK = ['A', 'F', 'P', 'M'].flatMap(L => one.T.TB[0].units.map((U, u) => { one.T.S.v11.lv = L; one.T.S.v11.u[0] = u; one.T.S.v11.grp = null; const P = one.T.planNow(), R = P.R; let tried = 0, ok = true;
      [['grp', P.grp, 'Small group'], ['ext', P.ext, 'Ready to go further']].forEach(([g, names, label]) => { if (!names.length || !R.pre.length) return; tried++; one.T.S.v11.grp = g; one.T.v11draw();
        const html = one.node('#v11c').innerHTML, gids = names.map(n => one.T.ID[n]);
        ok = ok && html.includes(`${label} · ${names.length} student`) && html.includes('data-g="">Whole class') && !/NaN|undefined/.test(html)
          && R.pre.every(q => { const p = one.T.rdP(q.k, gids); return p === null ? html.includes(`aria-label="${one.T.ASK[q.k]}: ${one.T.rdNo(q.k, gids).toLowerCase()};`) && one.T.rdNo(q.k, gids) !== '' : html.includes(`aria-label="${one.T.ASK[q.k]}: ${p}% `); }); });
      one.T.S.v11.grp = null; one.T.v11draw(); return { u: L + ' ' + u, tried, ok: ok && !one.node('#v11c').innerHTML.includes('data-g="">Whole class') }; })); one.T.S.v11.lv = 'P';
    check('js/atlas.js', 'on every unit with a plan group, at every level, showing it puts that group alone on the tree (each ring its own students\' share), says so above the tree, and the whole class comes back', grpOK.every(o => o.ok) && grpOK.some(o => o.tried), grpOK.filter(o => !o.ok).map(o => 'unit ' + o.u).join(', '));
    check('js/atlas.js', 'on every unit the readiness line reads the same rings at every level: no share rises and no verdict gets better as the level rises, each stop says its verdict, one is picked, and going further stays for mastery', one.T.S.v11.lv === 'P' && lineOK.every(o => o.ok) && lineOK.some(o => o.any), lineOK.filter(o => !o.ok).map(o => 'unit ' + o.u).join(', '));
    check('js/atlas.js', 'some unit draws two levels, and every ring with a share has eight or more students checked on it', one.trees.some(t => t.R.pre.some(q => q.cs.length)) && one.trees.every(t => t.ks.every(k => one.T.rdP(k, t.R.ids) === null || one.T.rdOK(k))));
    const early = run => run.trees.every(t => !t.R.pre.length || t.R.pre.some(q => run.T.rdP(q.k, t.R.ids) !== null) || (/^Too early to tell for /.test(t.ans) && !/Accept plan/.test(t.out)));
    check('js/atlas.js', 'a unit whose top row has no share says it is too early to tell, never that the class is ready, and offers no plan', early(one));
    check('js/atlas.js', 'a unit whose questions check no skill above the relevance cut draws no tree and says so', one.trees.every(t => one.T.PRQ.used[t.u] > 0 || (!t.R.pre.length && / has no graded question tagged with a skill at more than 50% relevance/.test(t.ans))) && one.trees.some(t => !one.T.PRQ.used[t.u]));
    check('js/atlas.js', 'every skill drawn has its book, says in its label whether it was taught, and says on hover where it is taught and, when questions check it, how many and when it was last asked', one.trees.every(t => !t.R.pre.length || ((t.out.match(/<g aria-hidden="true"><path transform=/g) || []).length === t.ks.length
      && (t.out.match(/; (not )?taught"/g) || []).length === t.ks.length && t.ks.every(k => { const x = one.T.taTxt(k, t.R.ids); return /^(Taught in [^<]+|Not taught: [^<]+)/.test(x) && (one.T.KIT[k].length ? /<br>\d+ (question checks|questions check) it · (last asked \d{1,2} [A-Z][a-z]{2}( \d{4})?|nobody has answered (it|them) yet)$/.test(x) : !/<br>/.test(x)); }))));
    // both versions of the tree, on every unit: each draws a ring a skill, split by level, and the same plan cards, nothing undefined, and a unit
    // with no tree says so; v2 draws a link a branch; a ring splits the whole class, so its parts add up to every student
    const VMARK = { 'now': 'aria-label="Readiness tree for ', '2': 'aria-label="Readiness tree, radial,' }, VERS = ['now', '2'];
    const verOK = VERS.map(v => { one.T.S.v11.ver = v; return one.T.TB[0].units.map((U, u) => { one.T.S.v11.u[0] = u; one.T.v11draw(); const h = one.node('#v11c').innerHTML, R = one.T.rdSel(), ks = R.pre.flatMap(q => [q.k].concat(q.cs));
      if (!R.pre.length) return /Pick another unit/.test(h); return !/NaN|undefined|Infinity/.test(h) && h.includes(VMARK[v]) && /What to do first/.test(h) && (h.match(/<g tabindex="0" aria-label=/g) || []).length === ks.length
        && (sh => (h.match(/transform="rotate\(-90 /g) || []).length >= sh.length && sh.every(k => h.includes(`class="t${one.T.ringCol(one.T.rdP(k, R.ids))}" font-weight="700"`)))(ks.filter(k => one.T.rdP(k, R.ids) !== null))
        && (v === 'now' || (h.match(/class="lk"/g) || []).length === R.pre.length + R.pre.reduce((a, q) => a + q.cs.length, 0)); }).every(Boolean); });
    check('js/atlas.js', 'every version of the tree (current, v2 radial) draws every unit with a ring a skill, split by level, and the same plan, nothing undefined; v2 draws a link a branch', verOK.every(Boolean), verOK.map((x, i) => VERS[i] + (x ? ' ok' : ' FAILED')).join(' '));
    check('js/atlas.js', 'a ring splits the students checked on the skill by ALPS\'s five levels; with those not checked twice they add up to every student, and so do the three groups', one.T.TB[0].units.every((U, u) => { one.T.S.v11.u[0] = u; const R = one.T.rdSel(); return R.pre.flatMap(q => [q.k].concat(q.cs)).every(k => { const c = one.T.rdSplit(k, R.ids); return c.F + c.H + c.E + c.o === R.ids.length && c.l.reduce((a, b) => a + b, 0) + c.o === R.ids.length && c.l[4] === c.F; }); }));
    one.T.S.v11.ver = 'now';
    // the top row is what the unit needs most, never a skill pulled up by evidence alone (asked 2026-10-26: If-Else on Inheritance)
    check('js/atlas.js', 'on every unit the top row is the first four prerequisites the file ranks, each needed by three or more of the unit\'s questions, whatever the class\'s evidence on them',
      one.trees.every(t => { const all = one.T.READY['0:' + t.u] || [], top = t.R.pre.map(q => q.k).sort((a, b) => a - b).join(), want = all.slice(0, 4).map(q => q.k).sort((a, b) => a - b).join();
        return !one.T.RDG(t.u) || (top === want && t.R.pre.every(q => q.nq >= 3 && q.nq <= q.qn)); }) && one.trees.some(t => t.R.pre.some(q => one.T.rdP(q.k, t.R.ids) === null)));
    // My actions holds every set the database records for the class, each judged by one rule, and nothing else
    const sets = one.T.IVS, nAssigned = A.coursework.filter(c => (c.items || []).length && !A.sets.some(st => st.name === c.name)).length;
    check('js/atlas.js', 'My actions lists every targeted set and every assigned set the export records, and nothing else; a judged set\'s estimate sits inside its range, with four or more on each side',
      sets.length === A.sets.length + nAssigned && sets.filter(d => d.kind === 'targeted').length === A.sets.length && sets.every(d => d.est === null || (d.lo <= d.est && d.est <= d.hi && d.na >= 4 && d.nb >= 4)) && sets.some(d => d.est !== null));
    check('js/atlas.js', 'Ready for a unit opens on the earliest unit not started after one the class has started', (u => u >= 0 && !one.T.TB0[u].on && u === one.T.TB0.findIndex((U, x) => x > one.T.TB0.findIndex(V => V.on) && !U.on))(one.T.rdDef(0)));
    // ALPS's own levels are read and summed up, not drawn: the sources say why, with the file's figures
    const AL = one.T.PRQ.alps;
    check('data/prereqs.js', 'the file sums up ALPS\'s learner model for the class: the model, its data cutoff, the share of its levels at each of ALPS\'s five, and the share of skills on which a student\'s score sits within 5 points of their own median',
      !!AL && !!AL.model.type && /^\d{4}-\d{2}-\d{2}T/.test(AL.model.cutoff) && Number.isInteger(AL.model.day) && AL.share.length === 5 && Math.abs(AL.share.reduce((a, b) => a + b, 0) - 100) < 0.6 && AL.near >= 0 && AL.near <= 100 && AL.scores > 0
        && /alps: ALPS's learner model \(/.test(prSrc.slice(0, 900)) && !/"levels":\{/.test(prSrc));
    check('js/atlas.js', 'every ring\'s level is the page\'s own score of the class\'s answers banded at ALPS\'s cuts, two checks needed, on every unit', one.trees.every(t => t.ks.every(k => one.T.NM.every((_, i) => { const L = one.T.rdLv(i, k);
      if (one.T.KTA[k]) { const c = one.T.CAT[i][k]; return (c === 'F' || c === 'H' || c === 'E') ? L === one.T.lvOf(one.T.CUR[i][k]) : L === null; }
      const e = one.T.estOf(i, k, one.T.LASTDAY); return e && e.ev >= 2 ? L === one.T.lvOf(e.c) : L === null; }))));
    if (exSrc) {
      const ex = runApp('?books', ['data/class.js', 'data/example.js', 'data/prereqs.js']);
      check('js/atlas.js', 'with the example\'s books on, the class\'s units still read the graph and the added books\' units fall back on the coverage weights, every tree whole', !!ex.T.PRQ && ex.trees.every(t => ex.T.RDG(t.u) === (ex.T.DUI[t.u] < A.units.length)) && ex.trees.some(t => !ex.T.RDG(t.u)) && ok(ex.trees));
      check('js/atlas.js', 'with the example\'s books on, a unit with nothing readable says it is too early to tell', early(ex) && ex.trees.some(t => /^Too early to tell for /.test(t.ans)));
    }
  }
  // a chart is never stretched across a wide page: it is handed its width, and shares its row with the panel that explains it or with a second chart
  const atlasJs = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
  check('js/atlas.js', 'no chart takes the full page width by itself: each is drawn to the width it is handed', !/[,{(\s]W=VW\(\)/.test(atlasJs));
  check('js/atlas.js', 'every chart view pairs its chart with a panel or another chart; pace keeps the solid and dashed tracks from main', (atlasJs.match(/\bduo\(/g) || []).length >= 7 && /aria-label="Pace tracks/.test(atlasJs) && /class="duo even"/.test(atlasJs) && /stroke-dasharray:4 3/.test(atlasJs));
  check('js/atlas.js', 'the fading view opens on the faded skills only, with a tick to show all, and with no skill picked', /v10:\{u:'all',all:false,k:-1/.test(atlasJs) && /id="v10all"/.test(atlasJs) && /if\(!rows\.some\(o=>o\.k===Z\.k\)\)Z\.k=-1/.test(atlasJs));
  check('js/atlas.js', 'the grid shows the started units only, in a card of its own under the unit\'s chart that starts folded, its key inside, with no per-student summary bar and no trend row', /return TAUGHT\.map\(u=>\(\{t:'u',id:u,u\}\)\)\}/.test(atlasJs) && /pvSec\('eng-grid',`\$\{CT\.grid\}, \$\{what\}`,`\$\{CELLKEY\(\)\}<div id="v2c"><\/div>`,line,true\)/.test(atlasJs) && !/fold\('v2grid'/.test(atlasJs) && /<div id="v2top"><\/div>/.test(atlasJs) && !/function trendN\(/.test(atlasJs) && !/const sum2=/.test(atlasJs) && !/Class trend/.test(atlasJs));
  check('js/atlas.js', 'there is no overview page: the rail opens on Effort and mastery, and the old link lands there', !/function vOverview|function ovStep|const OVU=/.test(atlasJs) && !/0:'overview'/.test(atlasJs) && /OLDSLUG=\{'overview':2,/.test(atlasJs) && /S\.view=VM\[k\]\?toPage\(k\):2/.test(atlasJs) && /const S=\{view:2,/.test(atlasJs) && /GROUPS=\[\['Students',\[2,3,4\]\]/.test(atlasJs));
  // the lesson replay ("Attention now") is gone: no page, no rows in the export, nothing in the data file
  const exportSrc = fs.readFileSync(path.join(root, 'tools/export-atlas.py'), 'utf8');
  check('js/atlas.js', 'there is no lesson replay page, and nothing reads replay rows', !/s:'Attention now'/.test(atlasJs) && !/D\.replay|replayDay|LIVE\[/.test(atlasJs) && !/replay/.test(exportSrc) && A.replay === undefined && A.meta.replayDay === undefined);
  check('js/atlas.js', 'there is no item health page, and the export holds no first answers', !/s:'Item health'/.test(atlasJs) && !/D\.mc|function v9\(|S\.v9\b/.test(atlasJs) && !/\bmc\b/.test(exportSrc) && A.mc === undefined && A.items.every(it => !('ans' in it) && !('opts' in it)));
  check('js/atlas.js', 'a practice set still leaves out questions that are broken or misleading', /const okIt=it=>zone9\(it\)==='ok';/.test(atlasJs) && /use=bank\.filter\(okIt\)/.test(atlasJs));
  // the look is ALPS's (alps-react-app): its MUI theme's Noto Sans, a 4px corner on surfaces and 10px on buttons, the elevation shadows, its primary blue for a selection
  check('css/atlas.css', 'the stylesheet is ALPS\'s theme: Noto Sans, primary #1864F2, 4px corners on surfaces and 10px on buttons, elevation, selection in the primary colour',
    /--font:"Noto Sans"/.test(atlas) && /--blue:#1864F2/.test(atlas) && /--radius:4px/.test(atlas) && /\.btn\{[^}]*border-radius:10px/.test(atlas) && /--e1:0 2px 1px -1px rgba\(0,0,0,\.2\)/.test(atlas) && /--accent:var\(--blue\)/.test(atlas)
      && /family=Noto\+Sans/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')) && !/Roboto/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
  // Stall points has one action: coursework, on a question students often skip. A question they give up on gets no button, since the product has no reteach
  check('js/atlas.js', 'Stall points offers coursework on a question 29% or more of the students skipped, and no button on one they gave up on: the product has no reteach',
    /,skp=c\[3\]\/n>=\.29;/.test(atlasJs) && /\$\{skp\?\(isLogged\(pk\)\?'<span class="pill good">Planned<\/span>':`<button class="btn small primary" type="button" data-act="v8plan" data-w="\$\{w\?1:''\}">Assign it as coursework<\/button>`\):''\}/.test(atlasJs)
      && /case 'v8plan':\{const tb=S\.v8\.tb,sl=\(d\.w\?S\.v8\.selw:S\.v8\.sel\)\[tb\];/.test(atlasJs)
      && /logAct\(sKey7\(tb,sl\.j,sl\.s\),7,`Assigned \$\{nm\} in \$\{J\} as coursework`,'plan'\)/.test(atlasJs) && (atlasJs.match(/data-act="v8plan"/g) || []).length === 1);
  check('js/atlas.js', 'shared weak skills are drawn as pale areas with a thin line, not as solid bands', /style="fill:\$\{col\};opacity:\.16"\/><polyline/.test(atlasJs));
  check('js/atlas.js', 'a day picked on a weak-skill line shows who was where on its bar; a second day on the same skill splits the class by change (lost it, beginning or attempted, familiar or proficient, got it, held) in the point\'s table; a day on another skill compares the two on the later day, in cards that open the table and list no names; buttons only on today\'s lists, a past day offers "Compare with now"',
    /function ptSel\(\)/.test(atlasJs) && /function ptGroups\(P\)/.test(atlasJs) && /data-act="v7pt" data-r="\$\{o\.i\}" data-j="\$\{k\}"/.test(atlasJs)
      && /groups:\[\['lost','Lost it'\],\['re','Beginning or attempted'\],\['dev','Familiar or proficient'\],\['got','Got it'\],\['held','Held'\]\]/.test(atlasJs) && /ptActs\(P,\[\['lost',G\.lost,'Give a review set','Review set planned',/.test(atlasJs) && /\['re',re,'Form a group','Group planned',/.test(atlasJs)
      && /j:Math\.max\(Q\[0\]\.j,j\)/.test(atlasJs) && /ptPast\('Compare with now'\)/.test(atlasJs) && /g&&now\?ptBtn\(P,g,label\)/.test(atlasJs) && /'Form a group'/.test(atlasJs) && /e\.key==='ArrowLeft'\|\|e\.key==='ArrowRight'/.test(atlasJs)
      && /ptCard\(P,'Beginning or attempted on both',ph\('One group for both skills'\)/.test(atlasJs) && /data-act="tblopen" data-k="\$\{P\.kind==='skills'\?P\.m1\.k:P\.m\.k\}" data-f="pt" data-g="\$\{tg\|\|g\}"/.test(atlasJs)
      && !/ptNames|roster\(G\.|fold\('v7(sec|held)'/.test(atlasJs) && !/ptCard\(P,'(Lost it|Beginning or attempted|Got it|Held)'/.test(atlasJs) && (src => !!src && !/roster\(/.test(src))((atlasJs.match(/const ptCard=\(P,title,hint,names,g,label,now,tg\)=>[^\n]*/) || [])[0]));
  check('js/atlas.js', 'a picked point opens the same table, read as of its day: one day with the level the line has for it, two days with a level column each (the later day sorts), two skills with a level column each and both skills\' questions; the point\'s question lists and their bars are gone',
    /function tblCfg\(T\)\{/.test(atlasJs) && /if\(P\.kind==='one'\)\{const k=P\.m\.k,d=BE\(P\.j\)/.test(atlasJs) && /cols:\[\{k,d:a,lab:'On '\+dayDate\(a\)\},\{k,d:b,lab:now\?'Now':'On '\+dayDate\(b\)\}\]/.test(atlasJs) && /cols:\[\{k:k1,d,lab:nIc\(SKIC\)\+ASKS\[k1\]\},\{k:k2,d,lab:nIc\(SKIC\)\+ASKS\[k2\]\}\]/.test(atlasJs)
      && /T\.s=T\.s0=P&&P\.kind==='time'\?'lv1':'lv0'/.test(atlasJs) && (atlasJs.match(/\$\{tblGoPt\(P\)\}/g) || []).length === 3 && !/function ptQs|const qList|const qRow|const QKEY|function ptQOne|function ptQTwo|const qBar/.test(atlasJs));
  check('js/atlas.js', 'a picked day is drawn: the class that day as one keyed bar as ALPS draws it (its five levels, mastered first, then unavailable), two days as two bars on one scale; the bars are the counts, so neither one day nor two days has cards and no line repeats who is unavailable, and today\'s actions are buttons under the bars, each for the group its hover names; the students beginning or attempted get a group only while they are under half of those checked',
    /const stBar=g=>/.test(atlasJs) && /\$\{stRow\(now\?'The class now':'That day',G,m\.sv\[j\]\)\}\$\{stKey\(\[G\]\)\}/.test(atlasJs) && /\$\{stRow\('On '\+A,GA,m\.sv\[P\.a\]\)\}\$\{stRow\(now\?'Now':'On '\+dayDate\(BE\(P\.b\)\),GB,m\.sv\[P\.b\]\)\}\$\{stKey\(\[GA,GB\]\)\}/.test(atlasJs)
      && /const STP=\[4,3,2,1,0\]\.map\(b=>\[b,'l'\+b,LV\[b\],LVCOL\[b\]\]\)\.concat\(\[\['early','ua','Unavailable',''\]\]\);/.test(atlasJs)
      && /\$\{now\?ptActs\(P,\[\['ny',whole\?\[\]:G\.ny,'Form a group','Group planned','beginning or attempted'\],/.test(atlasJs) && /\['dev',G\.dev,'Give a practice set','Practice set planned',/.test(atlasJs) && /const ptActs=\(P,acts\)=>/.test(atlasJs)
      && !/ptCard\(P,gsw\('(E|H|F)'\)/.test(atlasJs) && !/Unavailable · \$\{G\.early\.length\}/.test(atlasJs) && !/class="qn"/.test(atlasJs));
  check('css/atlas.css', 'the panel\'s bars use the theme: ALPS\'s level colours for a level, white text only on the two darkest', [0, 1, 2].every(b => new RegExp('\\.sb \\.l' + b + '\\{background:var\\(--lv-' + 'baf'[b] + '\\)\\}').test(atlas)) && /\.sb \.l3\{background:var\(--lv-p\);color:var\(--on-lv\)\}/.test(atlas) && /\.sb \.l4\{background:var\(--lv-m\);color:var\(--on-lv\)\}/.test(atlas) && /\.sb i\{[^}]*font-size:12px/.test(atlas) && !/\.sb \.(gu|rt|ft)\{|\.qlist|\.sw\.empty/.test(atlas));
  check('js/atlas.js', 'the weak-skills line is the share of the students with a level on a skill who have mastered it, drawn upward so lower is worse, each row a small chart with its own scale (100%, 50% and 0% on faint lines) divided from the next, under a heading in a teacher\'s words, the chart named and the measure spelled out in its "How to read"; a row\'s status comes from that line over the last 30 days of class work', /sv\.push\(ch>=8\?Math\.round\(sec\/ch\*100\):null\)/.test(atlasJs) && /f1\(yb-hh\(m\.sv\[k\]\)\)/.test(atlasJs) && /st=now<8\?'Recovered':d<=-10\?'Getting worse':d>=10\?'Improving':'Still weak'/.test(atlasJs) && /The line is the % of students with a level on it who have mastered it, every 5 days; lower is worse\./.test(atlasJs) && /pvSec\('sk-weak',CT\.weak,/.test(atlasJs)
      && /\[100,50,0\]\.forEach\(v=>\{s\+=`<line x1="\$\{L\}" y1="\$\{f1\(yb-hh\(v\)\)\}"/.test(atlasJs) && /T\(L-8,yb-hh\(v\)\+4,v\+'%',\{a:'end',c:'t3'\}\)/.test(atlasJs) && /T\(L-40,T0-9,'% of students who have mastered it',\{c:'t3',w:700\}\)/.test(atlasJs) && !/students checked on it/.test(atlasJs) && /if\(q>=0\)\{ch\+\+;if\(q===4\)sec\+\+;else if\(q<2\)ny\+\+\}/.test(atlasJs) && !/yt\+hh\(/.test(atlasJs));
  // every page has one priority number, and that number is what the tabs, the overview's flags and the bar for a followed student show
  const priIds = ((atlasJs.match(/const PRI=\[([^;]*)\];/) || [])[1] || '').match(/\[(\d+),'/g) || [], priSet = priIds.map(t => +t.slice(1).split(',')[0]);
  check('js/atlas.js', 'every page in the rail has exactly one priority, 1 to 7, and the by-unit and faded views keep their ids under the skills page', priSet.length === 7 && new Set(priSet).size === 7 && [2, 3, 4, 6, 7, 10, 11].every(k => priSet.includes(k)) && /PN\[5\]=PN\[6\]\+\.4;PN\[9\]=PN\[6\]\+\.5/.test(atlasJs), priSet.join(' '));
  check('js/atlas.js', 'no priority number is shown: the rail\'s order carries it, and the overview and the bar for a followed student name pages, not numbers',
    !/\$\{PN\[k\]\}<\/span>/.test(atlasJs) && !/\$\{PN\[f\.v\]\}<\/span>/.test(atlasJs) && !/class="rn[ "]/.test(atlasJs) && !/class="vchip/.test(atlasJs) && /tp\(`Open \$\{VM\[f\.v\]\.s\}`\)/.test(atlasJs) && /GROUPS=\[\['Students',\[2,3,4\]\],\['Content',\[6,7\]\],\['Act and check',\[10,11\]\]\]/.test(atlasJs));
  // the changes of 13 October 2026, from the first-time-teacher review (reports/first-time-teacher-review.md): what a teacher sees first on each page, and how a unit and pace are judged
  check('js/atlas.js', 'a unit\'s level is ALPS\'s unit band on its key skills (checked by its own summary, test, exercise and practice lessons, and carried forward): the band of the mean score on the ones with a level, capped by the share that is (25%, 50%, 80%)',
    /const TESTRE=\/summary\|test\|exam\|exercises\|practice\|frq\/i;/.test(atlasJs) && /\(LISTED\[k\]>=2&&KIT\[k\]\.length>=3\)\|\|need\.has\(k\)/.test(atlasJs)
      && /const f=avg\(e\.map\(k=>CUR\[i\]\[k\]\)\),cv=e\.length\/ks\.length,l=lvOf\(f\),b=Math\.min\(l,cv<\.25\?1:cv<\.5\?2:cv<\.8\?3:4\);/.test(atlasJs) && !/HARD\[|hardNY/.test(atlasJs));
  check('js/atlas.js', 'a skill\'s level is ALPS\'s: Beginning, Attempted, Familiar, Proficient, Mastered at 40, 55, 65 and 80 on the whole percent shown, as ALPS bands it; the groups acted on fold them (mastered; familiar or proficient; beginning or attempted) and a weekly level keeps all five',
    /const LV=\['Beginning','Attempted','Familiar','Proficient','Mastered'\],LVC=\['B','A','F','P','M'\]/.test(atlasJs) && /const lvOf=c=>\{const p=Math\.round\(c\*100\);return p>=80\?4:p>=65\?3:p>=55\?2:p>=40\?1:0\};/.test(atlasJs)
      && /const catFrom=\(ev,c\)=>ev===0\?'N':ev<2\?'Q':lvOf\(c\)===4\?'F':lvOf\(c\)>=2\?'H':'E';/.test(atlasJs) && /a\.push\(!e\|\|e\.ev<2\?-1:lvOf\(e\.c\)\)/.test(atlasJs) && /const G3=x=>x<0\?-1:x>3\?2:x>1\?1:0;/.test(atlasJs));
  check('js/atlas.js', 'a student\'s level is drawn as ALPS\'s battery (four blocks, as many filled as the level) in the grid, its key and the cards, and the groups are ALPS\'s: struggling and low engagement',
    /const battery=\(x,y,w,h,mc\)=>/.test(atlasJs) && /const fill=battery\(x,y,w,fh,c\.mc\);/.test(atlasJs) && /return battery\(x,y\+4,pw,11,q\.mc\)/.test(atlasJs) && /const RAMPKEY=\(\)=>`<span class="lt">Performance<\/span>\$\{LVC\.slice\(\)\.reverse\(\)\.map/.test(atlasJs)
      && /stuck:'Struggling'/.test(atlasJs) && /off:'Low engagement'/.test(atlasJs) && /s:'Engagement and performance'/.test(atlasJs));
  check('js/atlas.js', 'no page says the old words: secure, not yet, developing, stuck despite effort, not doing the work, effort and mastery',
    !/Effort and mastery|Stuck despite effort|Not doing the work|not doing the work|'Not yet'|'Developing'|'Secure'|% secure|not yet secure|Not secure|>Secure|Skills secure/.test(atlasJs));
  check('js/atlas.js', 'pace projects only the target unit\'s skills, with unknown estimates kept separate', /function paceScope\(u\)/.test(atlasJs) && /function paceOf\(i\)/.test(atlasJs) && /Too early to tell/.test(atlasJs) && !/const FIN=/.test(atlasJs));
  check('js/atlas.js', 'the goal has a target-unit picker, a calendar date and sorting, without a whole-course skill slider', /pickCtl\('v4unit'/.test(atlasJs) && /type="date" id="v4date"/.test(atlasJs) && /pickCtl\('v4sort'/.test(atlasJs) && !/id="v4goal"/.test(atlasJs));
  check('js/atlas.js', 'the grid and profile still use the same unit standing', /,st=n\.t==='u'\?standU\(i,k\):n\.t==='j'\?standJ\(i,k\):/.test(atlasJs) && /\['M','P'\]\.includes\(standU\(i,u\)\.s\)/.test(atlasJs) && /const SL=\{M:'Mastered',P:'Proficient',F:'Familiar',A:'Attempted',B:'Beginning',Q:'Unavailable'/.test(atlasJs));
  check('js/atlas.js', 'on Engagement and performance the unit picker sits beside the title, the chart has its own card that opens on its name with the levels\' key under it, and the grid\'s key is in the grid\'s card (the way back up stays over the chart once the grid has drilled in); no count pills sit over the chart, and no page shows sparklines or numbered flag chips', /const CELLKEY=\(\)=>/.test(atlasJs) && /\$\{A\.u===null\?toHead\(pick\):`<div class="controls">\$\{pick\}<\/div>`\}\$\{mcard\('<div id="v2top"><\/div>'\)\}/.test(atlasJs) && /`\$\{chd\(\(isLab\?CT\.labs:CT\.eng\)\+tag\)\}\$\{isLab\?'<div class="legend">[^`]*':SCKEY\(\)\}\$\{duo\(da,/.test(atlasJs) && /const SCKEY=\(\)=>/.test(atlasJs) && !/keep going<\/span>|const pills=/.test(atlasJs) && !/secSpark|class="vchips"/.test(atlasJs));
  check('js/atlas.js', 'a set the whole class was given is no moment and no flag on one student\'s profile; a targeted set the student did is', /IVS\.forEach\(d=>\{if\(d\.kind==='targeted'&&d\.who\.length<NM\.length&&d\.who\.includes\(n\)\)/.test(atlasJs) && /IVS\.filter\(d=>d\.kind==='targeted'&&d\.who\.length<N&&d\.who\.includes\(n\)\)/.test(atlasJs));
  check('js/atlas.js', 'the three skills pages are one page laid out as every page is (its question, filters and "How to read" in the title row, its answer cards under it), then all three views one under another, each a card that folds under its chart\'s name with its own filters beside the name; there is no view switch, and the old addresses open the page at their card',
    /const toPage=k=>\{if\(k===5\)\{S\.v7\.view='unit';S\.pvGo='sk-unit';return 6\}if\(k===9\)\{S\.v7\.view='faded';S\.pvGo='sk-faded';return 6\}/.test(atlasJs) && /OLDSLUG=\{'overview':2,'effort':2,'weak-skills':6,'worked':11\}/.test(atlasJs)
      && /return pvSec\('sk-weak',CT\.weak,w,cw\)\+pvSec\('sk-unit',CT\.unit,u,cu\)\+pvSec\('sk-faded',CT\.fade,f,cf\)/.test(atlasJs) && /const ICD=\[null,null,c2,c3,c4,c6,cSk,c8,null,c10,c11,c12\];/.test(atlasJs) && /const hSk=\(\)=>\[h7\(\),h6\(\),h10\(\)\]\.join\(' '\);/.test(atlasJs)
      && /PCTL='';el\.innerHTML=frame\(k,VF\[k\]\(\)\)/.test(atlasJs) && !/v7view|skTabs|v8view|\['worst','Worst questions'\]|pvHead|vhead vtop|SKV/.test(atlasJs) && /if\(S\.pvGo\)S\.fold\['pv-'\+S\.pvGo\]=true;/.test(atlasJs)
      && /const pvSec=\(id,name,body,ctl,shut\)=>\{const o=pvOpen\(id,shut\);return `<section class="mcard pv\$\{o\?'':' shut'\}" id="pv-\$\{id\}">\$\{chd\(`<button class="pvt" type="button" data-act="pvfold" data-id="\$\{id\}" aria-expanded="\$\{o\}">/.test(atlasJs) && /case 'pvfold':S\.fold\['pv-'\+d\.id\]=t\.getAttribute\('aria-expanded'\)!=='true';reView\(\);break;/.test(atlasJs) && /\.mcard\.pv\{scroll-margin-top/.test(atlas) && !/details\.pv/.test(atlas));
  check('js/atlas.js', 'weak skills run under a heading a status with no status word on each row, the faded ones say what they fell from, and empty statuses have no tab', /T\(10,y\+gh-12,`\$\{g\.st\} · \$\{g\.all\}`/.test(atlasJs) && /`faded: class average \$\{Math\.round\(fd\.a\)\}% → \$\{Math\.round\(fd\.b\)\}%`/.test(atlasJs) && /STS\.filter\(st=>cnt\(st\)\)/.test(atlasJs) && !/T\(xb\+BWD\+34,yc\+4,m\.st/.test(atlasJs));
  check('js/atlas.js', 'stall points shows both its views, the worst questions (one ranked list) and then the outline by unit, each a card that folds under its chart\'s name; the worst questions open on their first question with its panel, the outline opens with nothing picked in the middle of its card (as Faded does), a question picked there opens its own panel and a second click closes it; a link into the outline opens its card and scrolls to it',
    /const secs=pvSec\('sp-worst',svT\('worst'\),wB\)\+pvSec\('sp-unit',svT\('outline'\),oB,ctlU\);/.test(atlasJs) && /sl=slW;const wB=legOf\('worst'\)\+withP\(mainOf\('worst'\),detOf\(slW,true\)\);sl=slO;const oB=legOf\('outline'\)\+withP\(mainOf\('outline'\),detOf\(slO,false\)\);/.test(atlasJs)
      && /\+ctl\+kbar\+secs\}/.test(atlasJs) && /case 'v8c':\{const w=!!t\.closest\('#pv-sp-worst'\),P=w\?S\.v8\.selw:S\.v8\.sel,o=P\[S\.v8\.tb\];P\[S\.v8\.tb\]=!w&&o&&o\.j===\+d\.j&&o\.s===\+d\.s\?null:/.test(atlasJs) && /const withP=\(m,d\)=>d\?duo\(da8,m,d,'stick'\):stage\(/.test(atlasJs) && /function selW7\(tb,worst\)/.test(atlasJs)
      && /\.slice\(0,8\);/.test(atlasJs) && /S\.v8\.view='outline';S\.pvGo='sp-unit'\}/.test(atlasJs) && /S\.v8\.view='outline';S\.pvGo='sp-unit';reView\(\)/.test(atlasJs));
  // every chart is named over it, in a teacher's words, seven words at most (asked 2026-10-26: "Use accurate name (not more than 5-7 words) for all the graphs")
  { const ct = (atlasJs.match(/const CT=\{([^]*?)\};/) || [])[1] || '', sv = (atlasJs.match(/const SVT=\{([^]*?)\};/) || [])[1] || '';
    const names = [...ct.matchAll(/:'([^']*)'/g)].map(m => m[1]), svn = [...sv.matchAll(/'([^']*)'/g)].map(m => m[1]).filter(t => !/^\d+$/.test(t));
    const words = t => t.replace(/\{[un]\}/g, ' ').trim().split(/\s+/).filter(Boolean).length, odd = [...names, ...svn].filter(t => words(t) > 7 || words(t) < 3 || /\bchecked\b|\bitems?\b|\battempts?\b/i.test(t));
    check('js/atlas.js', 'every chart has a name over it, three to seven words in a teacher\'s words, as its card\'s header (or over it in a panel): each page\'s charts, the panels\' charts, the grid\'s card, a profile\'s units, and both charts of each version of Stall points',
      names.length === 13 && svn.length === 22 && !odd.length && /\.ctt\{/.test(atlas)
      && ['chd((isLab?CT.labs:CT.eng)+tag)', '`${CT.grid}, ${what}`', 'chd(CT.drift,allT)', 'chd(CT.pace)', "pvSec('sk-weak',CT.weak", "pvSec('sk-unit',CT.unit", "pvSec('sk-faded',CT.fade", 'chd(CT.fade1,tick)', "chd(CT.ready.replace('{u}',R.U.nb))", 'chd(CT.sets)', "chd(CT.prof.replace('{n}',NM[i]))", "chd(CT.units.replace('{n}',n))", "pvSec('sp-worst',svT('worst')", "pvSec('sp-unit',svT('outline')"].every(x => atlasJs.includes(x)),
      `${names.length} names, ${svn.length} version names · ${odd.join('; ')}`); }
  // each page's answer is a row of cards (asked 2026-10-26: "for insights like these, use cards and show them in a clean format"), its sentence
  // kept for screen readers; a page redrawn after its chart re-tells its own answer, cards and sentence
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.IC_TEST={HL,ICD,icards,WEAK,SG,N,ASK,nIc,SKIC};'), ctx, { filename: 'js/atlas.js' }); X = ctx.IC_TEST; } catch (e) { check('js/atlas.js', 'the answer cards run on the page\'s own code', false, e.message); }
    if (X) { const bad = [], first = { 2: 'On track', 3: 'Drifting', 4: 'On pace', 5: 'Hardest unit', 6: 'Teach first', 7: 'Most gave up', 9: 'Faded most', 10: 'Next unit', 11: 'Promising, not proven' };
      [2, 3, 4, 5, 6, 7, 9, 10, 11].forEach(k => { const cs = X.ICD[k](), h = X.icards(cs), t = X.HL[k]();
        if (!cs.length || cs.length > 4 || cs.some(c => !c.l || !c.v || c.l.split(/\s+/).length > 4) || /undefined|NaN/.test(h + t) || (h.match(/<div class="icard[ "]/g) || []).length !== cs.length) bad.push('page ' + k);
        // every count on a card is in its page's sentence, but for the cards that add a fact the sentence leaves out
        const nums = cs.filter(c => !['Under half their normal', 'Hardest unit', 'Hardest skill', 'Logged today'].includes(c.l)).flatMap(c => (c.v.replace(/<svg class="ni"[^]*?<\/svg>/g, '') + ' ' + (k === 10 ? '' : c.s || '')).match(/\b\d+\b/g) || []);
        if (nums.some(v => v !== String(X.N) && !new RegExp('\\b' + v + '\\b').test(t))) bad.push('page ' + k + ' numbers');   // the class size may join a count: "29 of 36"
        if (cs[0].l !== first[k] && !(k === 10 && cs[0].l === 'Unit') && !(k === 11 && ['Worked', 'Logged today', 'Practice sets', 'Did the sets work?'].includes(cs[0].l))) bad.push('page ' + k + ' first card ' + cs[0].l); });
      const p = X.WEAK.filter(m => X.SG[m.st] === 'p'), c7 = X.ICD[6]();
      if (p.length && (c7[0].v !== X.nIc(X.SKIC) + X.ASK[p[0].k] || c7[0].s !== `${p[0].now.length} of ${X.N} beginning or attempted` || c7[1].v !== `${p.length} ${p.length === 1 ? 'skill' : 'skills'}`)) bad.push('weak now');
      check('js/atlas.js', 'every page\'s answer is a row of one to four cards (what it is in four words or fewer, the answer, what it means), the counts on them those of its sentence (the class size may join one), which stays for screen readers; Skills\' row gathers its three charts\' answers',
        !bad.length && /<p class="answer sr" id="ans">/.test(atlasJs) && /setAns\(2\)/.test(atlasJs) && /setAns\(4\)/.test(atlasJs) && (atlasJs.match(/setAns\(10\);/g) || []).length === 2 && !/setAns\(11\)/.test(atlasJs) && /\.icards\{/.test(atlas), bad.slice(0, 4).join('; ')); }
  }
  // every page's filters sit on the right of its title, and its cards come after the row (asked 2026-10-26)
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.FL_TEST={S,renderView,node:id=>document.querySelector(id)};'), ctx, { filename: 'js/atlas.js' }); X = ctx.FL_TEST; } catch (e) { check('js/atlas.js', 'the title rows run on the page\'s own code', false, e.message); }
    if (X) { const bad = [], want = { 2: ['v2unit'], 3: [], 4: ['v4unit', 'v4date', 'v4sort'], 6: [], 7: ['v8ver'], 10: ['v11unit', 'v11ver'], 11: [] }, inCard = { 6: { 'sk-weak': ['v7unit', 'v7more'], 'sk-unit': ['v6sort'], 'sk-faded': ['v10unit', 'v10all'] }, 7: { 'sp-unit': ['v8sort'] } };
      Object.keys(want).forEach(k => { X.S.view = +k; X.renderView(); const h = X.node('#view').innerHTML, rows = [...h.matchAll(/<div class="vctl">([^]*?)<details class="how">/g)].map(m => m[1]).join(' '), cards = h.indexOf('<div class="icards"'), row = h.indexOf('<div class="vctl">');
        const head = id => { const a = h.indexOf(`id="pv-${id}"`), b = h.indexOf('class="pvb"', a); return a < 0 || b < 0 ? '' : h.slice(a, b) };
        if (!h.includes('id="asof"') || !rows.includes('id="asof"') || cards < 0 || row < 0 || row > cards || want[k].some(id => !rows.includes(`id="${id}"`)) || /<div class="controls">[^]*?id="(v4unit|v4sort|v8ver|v11unit|v11ver|v6sort|v10unit)"/.test(h)
          || Object.entries(inCard[k] || {}).some(([c, ids]) => ids.some(id => !head(c).includes(`id="${id}"`) || rows.includes(`id="${id}"`)))) bad.push('page ' + k); });
      X.S.view = 2; X.renderView();
      check('js/atlas.js', 'every page draws its filters (and the day) on the right of its title and its answer cards after that row; a filter that changes one card only (Skills\' views, Stall points\' outline) sits on the right of that card\'s name; none is in a row of controls under them', !bad.length, bad.join('; ')); }
  }
  // every chart sits in a card, and a section with several charts is one card (asked 2026-10-26: "keep each graph in it's own card. Some sections
  // have multiple graphs. Use one card for each the full section"); a page's title, filters and answer cards stay outside, and no card holds another
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.MC_TEST={S,renderView,node:id=>document.querySelector(id)};'), ctx, { filename: 'js/atlas.js' }); X = ctx.MC_TEST; } catch (e) { check('js/atlas.js', 'the cards run on the page\'s own code', false, e.message); }
    if (X) {
      const VOID = new Set(['br', 'img', 'input', 'hr', 'wbr', 'source', 'col']), BOX = ['v2top', 'v2c', 'v4c', 'v11c'];
      // each card, chart name, chart, box a chart is drawn into and row of answer cards, with how many cards it sits in
      const walk = h => { const st = [], out = [];
        for (const m of h.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g)) { const tag = m[2].toLowerCase();
          if (m[1]) { const ix = st.map(e => e.tag).lastIndexOf(tag); if (ix >= 0) st.length = ix; continue; }
          const c = (m[3].match(/class="([^"]*)"/) || [])[1] || '', id = (m[3].match(/\bid="([^"]*)"/) || [])[1] || '', d = st.filter(e => /\bmcard\b/.test(e.c)).length;
          const what = /\bmcard\b/.test(c) ? 'card' : /\bicards\b/.test(c) ? 'answer' : /\bctt\b/.test(c) ? 'name' : tag === 'svg' && /\bviz\b/.test(c) ? 'chart' : BOX.includes(id) ? id : '';
          if (what) out.push({ what, d });
          if (!VOID.has(tag) && !/\/\s*$/.test(m[3])) st.push({ tag, c }); }
        return out; };
      const bad = [], seen = { name: 0, chart: 0 }, page = (k, lab) => { X.renderView(); let h = X.node('#view').innerHTML;
        BOX.forEach(id => { h = h.replace(new RegExp(`(<div id="${id}"[^>]*>)(</div>)`), (_, a, b) => a + X.node('#' + id).innerHTML + b); });
        const w = walk(h), out = w.filter(e => e.what !== 'card' && e.what !== 'answer' && e.d < 1), deep = w.filter(e => e.what === 'card' && e.d > 0), ans = w.find(e => e.what === 'answer');
        w.forEach(e => { if (e.what in seen) seen[e.what]++; });
        if (!w.some(e => e.what === 'card') || out.length || deep.length || ans && ans.d !== 0) bad.push(`${lab}: ${w.some(e => e.what === 'card') ? '' : 'no card '}${out.map(e => e.what + ' outside').join(', ')}${deep.length ? ' card in a card' : ''}${ans && ans.d !== 0 ? ' answer cards' : ''}`); };
      [2, 3, 4, 6, 10, 11].forEach(k => { X.S.view = k; page(k, 'page ' + k); });
      X.S.v11.ver = '2'; X.S.view = 10; page(10, 'ready v2'); X.S.v11.ver = 'now';
      ['now', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].forEach(v => { X.S.v8.ver = v; X.S.view = 7; page(7, 'stall points ' + v); }); X.S.v8.ver = 'now';
      X.S.view = 'p'; X.S.prof = 0; page('p', 'profile'); X.S.view = 2; X.renderView();
      check('js/atlas.js', 'every chart and its name sit in a card, every section of a page is one card holding all its charts, no card holds another, and a page\'s title, filters and answer cards are outside them, on every page and every version of Stall points and Ready',
        !bad.length && seen.name >= 25 && seen.chart >= 12 && /\.mcard\{[^}]*box-shadow:var\(--e1\)/.test(atlas), bad.slice(0, 4).join('; ') || `${seen.name} names, ${seen.chart} charts`); }
  }
  // one way to show each thing, on every page (asked 2026-10-26: "The looks don't look consistent. Be consistent with how and where to show things"):
  // the title row first (the question, the page's filters, the day, "How to read"), then one row of answer cards, on the page; then cards, each
  // opening on its header, the chart's name first (a card that folds puts the chevron and the name in one button), its own filters beside the
  // name; a key is a plain row inside a card, under its header; a panel's groups and facts have no box; "Show all" is a tick; one fold look
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const runG = search => { const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
      const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
        location: { search, hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
      ['data/class.js', 'data/example.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
      vm.runInContext(atlasJs.replace(boot, 'globalThis.GR_TEST={S,renderView,node:id=>document.querySelector(id)};'), ctx, { filename: 'js/atlas.js' }); return ctx.GR_TEST; };
    const VOID = new Set(['br', 'img', 'input', 'hr', 'wbr', 'source', 'col']), BOX = ['v2top', 'v2c', 'v4c', 'v11c'];
    /* the page's HTML as a tree of the parts that matter: each card and its first child, each card header and its first child, the answer row and the keys, in order */
    const parse = h => { const st = [], ev = [], cards = [], heads = []; let top = null;
      for (const m of h.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g)) { const tag = m[2].toLowerCase();
        if (m[1]) { const ix = st.map(e => e.tag).lastIndexOf(tag); if (ix >= 0) st.length = ix; continue; }
        const c = (m[3].match(/class="([^"]*)"/) || [])[1] || '', p = st[st.length - 1], e = { tag, c, box: BOX.includes((m[3].match(/\bid="([^"]*)"/) || [])[1]), d: st.filter(x => /\bmcard\b/.test(x.c)).length };
        if (!p && !top) top = e;
        if (p && p.first === undefined) p.first = e;
        if (/\bmcard\b/.test(c)) { cards.push(e); ev.push('card') } else if (/\bcthd\b/.test(c)) heads.push(e); else if (/\bicards\b/.test(c)) ev.push(e.d ? 'answer-in-card' : 'answer'); else if (/\blegend\b/.test(c)) ev.push(e.d ? 'key' : 'key-outside');
        if (!VOID.has(tag) && !/\/\s*$/.test(m[3])) st.push(e); }
      return { top, ev, cards, heads }; };
    const bad = [], seen = { cards: 0, folds: 0 };
    const page = (X, k, lab) => { X.S.view = k; if (k === 'p') X.S.prof = 0; X.renderView(); let h = X.node('#view').innerHTML;
      BOX.forEach(id => { h = h.replace(new RegExp(`(<div id="${id}"[^>]*>)(</div>)`), (_, a, b) => a + X.node('#' + id).innerHTML + b); });
      const g = parse(h), why = [], ans = g.ev.filter(e => e === 'answer').length, first = g.ev.indexOf('card');
      if (k === 'p' ? !(g.top && /\bprof\b/.test(g.top.c) && g.top.first && /\bphead\b/.test(g.top.first.c)) : !(g.top && /\bvhead\b/.test(g.top.c) && g.top.first && g.top.first.tag === 'h2')) why.push('title row');
      if (!/<div class="vctl">[^]*?id="asof"/.test(h)) why.push('the day');
      if (ans !== 1 || g.ev.includes('answer-in-card') || first < 0 || g.ev.indexOf('answer') > first) why.push('answer row');
      g.cards.forEach(cd => { seen.cards++; const f = cd.first && cd.first.box ? cd.first.first : cd.first; if (!f || !/\bcthd\b/.test(f.c)) why.push('a card without its header') });
      g.heads.forEach(hd => { if (!hd.first || hd.first.tag !== 'h3' || !/\bctt\b/.test(hd.first.c)) why.push('a header without its name first'); else if (/\bpvt\b/.test(h) && hd.first.first && hd.first.first.tag === 'button') seen.folds++ });
      if (g.ev.includes('key-outside')) why.push('a key outside its card');
      if (/data-act="(v7more|v3all)"|class="statrow psum"|<summary>[^<]*Can’t be judged|class="legend key2"[^>]*style/.test(h)) why.push('an old control');
      if (why.length) bad.push(`${lab}: ${[...new Set(why)].join(', ')}`); };
    let X = null; try { X = runG(''); } catch (e) { check('js/atlas.js', 'the pages run on their own code for the layout check', false, e.message); }
    if (X) { [2, 3, 4, 6, 10, 11, 'p'].forEach(k => page(X, k, 'page ' + k));
      ['now', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].forEach(v => { X.S.v8.ver = v; page(X, 7, 'stall points ' + v); }); X.S.v8.ver = 'now';
      X.S.v11.ver = '2'; page(X, 10, 'ready v2'); X.S.v11.ver = 'now';
      X.S.fold['pv-eng-grid'] = true; page(X, 2, 'the grid open'); X.S.fold['pv-eng-grid'] = undefined;
      X.S.fold['pv-sk-unit'] = false; page(X, 6, 'a card folded'); X.S.fold['pv-sk-unit'] = undefined; }
    let Y = null; try { Y = runG('?books'); } catch (e) { check('js/atlas.js', 'the example with more books runs for the layout check', false, e.message); }
    if (Y) [2, 4, 6, 7, 10].forEach(k => page(Y, k, 'books, page ' + k));
    check('js/atlas.js', 'every page is laid out one way: the title row first (the question, its filters, the day, "How to read"), one row of answer cards on the page before any card, then cards that each open on a header whose first part is the chart\'s name, a fold\'s chevron in the same button as the name; every key is a plain row inside a card, "Show all" is a tick and a set too early to judge has one name, with more books too',
      !bad.length && seen.cards > 40 && seen.folds > 20, bad.slice(0, 5).join('; ') || `${seen.cards} cards, ${seen.folds} that fold`);
    check('css/atlas.css', 'a key is never boxed or pushed to the right, a panel\'s groups and facts have no box round them, rows of students are divided by lines, and every fold puts its chevron before its words',
      !/\.mleg\{[^}]*border/.test(atlas) && !/\.key2\{[^}]*margin:0 0 0 auto/.test(atlas) && !/\.rdkey \.ul/.test(atlas) && !/\.ag\{[^}]*border/.test(atlas) && !/\.pcard\{[^}]*border/.test(atlas) && !/\.intro\{[^}]*border:1px/.test(atlas)
        && /\.wl-r\{padding:12px 8px;border-top:1px solid var\(--rule\)\}/.test(atlas) && !/details\.data/.test(atlas) && /\.pvt\[aria-expanded="true"\] \.chev\{transform:rotate\(90deg\)\}/.test(atlas) && /\.icards\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\);/.test(atlas));
  }
  // the bar for a followed student, in five versions to choose from (asked 2026-10-26: "Let's use different formatting for this following card. It is
  // mixing up everything. Give 4-5 different versions of it to select from"): every version, for every student, keeps a flag's status apart from its details
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, className: '', clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#engagement', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.FV_TEST={S,ALL,NM,FVV,GROUPS,flags,renderThread,node:id=>document.querySelector(id)};'), ctx, { filename: 'js/atlas.js' }); X = ctx.FV_TEST; } catch (e) { check('js/atlas.js', 'the bar\'s versions run on the page\'s own code', false, e.message); }
    if (X) { const bad = [], seen = {};
      X.ALL.forEach(i => { X.S.stu = i; const fl = X.flags(i), shown = fl.filter(f => f.l === 'bad' || f.l === 'watch');
        if (fl.some(f => !f.s || f.s.includes(' · ') || !f.t)) bad.push(X.NM[i] + ': a flag without its status apart');
        X.FVV.forEach(([v]) => { X.S.fv = v; X.renderThread(); const h = X.node('#thread').innerHTML; seen[v] = (seen[v] || 0) + 1;
          if (/undefined|NaN/.test(h) || !h.includes('id="fvver"') || !h.includes('data-act="clear"')) bad.push(`${X.NM[i]} ${v}`);
          if (v !== 'now' && /class="flag"/.test(h)) bad.push(`${X.NM[i]} ${v}: the current pills`);
          if (['1', '2', '3', '4'].includes(v) && shown.some(f => !h.includes('>' + f.s.replace(/’/g, '’') + '<'))) bad.push(`${X.NM[i]} ${v}: a status not shown on its own`);
          if (v === '5' && (h.match(/class="fv5-s /g) || []).length !== X.GROUPS.flatMap(g => g[1]).length) bad.push(`${X.NM[i]} v5: not a slot a page`); }); });
      X.S.stu = null; X.S.fv = 'now';
      check('js/atlas.js', 'the bar for a followed student comes in the current version and five more (status chips, a row a page, columns, by group, a scorecard), picked in the bar or with ?fv=1 to 5; in each, for every student, a flag\'s status stands on its own apart from its details, and the scorecard has a slot for every page in the rail',
        !bad.length && X.FVV.length === 6 && /const FV0=\(location\.search\.match\(\/\[\?&\]fv=\(\[1-5\]\)/.test(atlasJs) && /else if\(id==='fvver'\)\{S\.fv=t\.value;try\{history\.replaceState\(null,'',withQ\('fv',/.test(atlasJs) && !/font-size:11px/.test(atlas), bad.slice(0, 4).join('; ')); }
  }
  // a level weighs each answer by its question's relevance to the skill, and later work counts once there are two later answers (asked 2026-10-26:
  // "There is a relevance score in the db for every item skill pair. Let's use that as well and weight the items that have more relevance higher")
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, className: '', clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.RL_TEST={D,IT,EVD,estOf,relOf,RECHECK,PRQ,ASK};'), ctx, { filename: 'js/atlas.js' }); X = ctx.RL_TEST; } catch (e) { check('js/atlas.js', 'the relevance weighting runs on the page\'s own code', false, e.message); }
    if (X) { const bad = [], near = (a, b) => Math.abs(a - b) < 1e-9, k = 0, R = X.RECHECK;
      /* controlled evidence on one student and skill: a full answer on a question that is fully about the skill, a wrong one on a question three quarters about it */
      X.EVD[0][k] = [{ d: 10, c: 1, w: 1 }, { d: 11, c: 0, w: .75 }];
      let e = X.estOf(0, k, 99); if (!near(e.mt, 1 / 1.75) || !near(e.c, e.mt)) bad.push('weighting');
      X.EVD[0][k].push({ d: 10 + R, c: 0, w: 1 }); e = X.estOf(0, k, 99); if (!near(e.c, 1 / 2.75) || e.ml !== null) bad.push('one later answer did not join the one average');
      X.EVD[0][k].push({ d: 11 + R, c: 1, w: 1 }); e = X.estOf(0, k, 99); if (!near(e.c, .4 * e.mt + .6 * .5)) bad.push('two later answers did not count');
      X.EVD[0][k] = [{ d: 10, c: 1 }, { d: 11, c: 0 }]; e = X.estOf(0, k, 99); if (!near(e.mt, .5)) bad.push('an answer with no weight');
      /* the data: every item's tags carry a relevance score above the cut, in step with its skills; the prerequisites' tags too */
      const rels = new Set(), offItems = X.D.items.filter(it => (it.skills || []).length !== (it.rel || []).length || (it.rel || []).some(r => !(r > .5 && r <= 1)));
      X.D.items.forEach(it => (it.rel || []).forEach(r => rels.add(r)));
      const offPre = X.PRQ ? X.PRQ.tags.filter((ixs, x) => !X.PRQ.tagRel || ixs.length !== (X.PRQ.tagRel[x] || []).length) : [];
      if (offItems.length || offPre.length || ![...rels].some(r => r < 1)) bad.push(`data: ${offItems.length} items, ${offPre.length} prerequisites out of step`);
      const ix0 = X.D.items.findIndex(it => (it.rel || []).some(r => r < 1)), it0 = X.D.items[ix0], x0 = it0 ? it0.rel.findIndex(r => r < 1) : -1;
      if (!it0 || X.relOf(ix0, it0.skills[x0]) !== it0.rel[x0]) bad.push('relOf');
      const exportSrc2 = fs.readFileSync(path.join(root, 'tools/export-atlas.py'), 'utf8'), preSrc = fs.readFileSync(path.join(root, 'tools/export-prereqs.py'), 'utf8');
      check('js/atlas.js', 'a level weighs each answer by how relevant its question is to the skill (item_skill\'s relevance score, kept by the export for every tag, the prerequisites\' too), an answer with no score counts fully, and there is a later score (answers 21 days or more after the first, counting 60%, read by Faded and the slipped mark too) only once there are two later answers, a lone later answer counting like any other; a level bands the whole percent it shows',
        !bad.length && /it\['rel'\] = \[rels\[\(ix, sk\)\] for sk in sks\]/.test(exportSrc2) && /'tags': tags, 'tagRel': tag_rels,/.test(preSrc) && /ml=b\.length>=2\?wavg\(b\):null;\n  return \{mt,ml,ev:e\.length,c:ml===null\?wavg\(e\):\.4\*mt\+\.6\*ml\}\}/.test(atlasJs) && /const lvOf=c=>\{const p=Math\.round\(c\*100\);return p>=80\?4:p>=65\?3:p>=55\?2:p>=40\?1:0\};/.test(atlasJs), bad.join('; ') || [...rels].sort().join(', ')); }
  }
  // the tries, as the shade of the retry mark (asked 2026-10-26: "Can we also have a way to show how many retries so users can quickly understand why
  // two students are showing different mastery levels", then "no need to show the numbers. maybe be the shade dark light based on that?"):
  // darker the more credit the tries earned, no number in a cell; how much a question counts toward the skill is in its head's hover, with no ¾ by its number
  // (asked whether to keep that ¾: "Drop")
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, className: '', clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.TR_TEST={S,tblHTML,KIT,IWHO,AT,credit,EVOK,relOf,WEAK,ASK,RIC,tips};'), ctx, { filename: 'js/atlas.js' }); X = ctx.TR_TEST; } catch (e) { check('js/atlas.js', 'the shades run on the page\'s own code', false, e.message); }
    if (X) { const bad = [], seen = { F: 0, '': 0, Q: 0, N: 0 }; let quarter = 0;
      X.WEAK.slice(0, 8).forEach(m => { const k = m.k; X.S.tbl = { k, from: 'weak', P: null, f: 'all', s: 'lv0', s0: 'lv0', dir: 1, q: null, all: true }; const h = X.tblHTML(), body = h.split('<tbody>')[1];
        if (/class="tn[ "]|id="tbltries"/.test(h)) bad.push(X.ASK[k] + ': a number or the tick is back');
        if (/class="qw"|¾/.test(h)) bad.push(X.ASK[k] + ': a ¾ is back');
        [...h.matchAll(/<button class="qh" type="button" data-act="tblq" data-id="(\d+)"[^]*?<\/button>/g)].forEach(q => { const w = X.relOf(+q[1], k) < 1, tip = X.tips.get((q[0].match(/data-tip="(t\d+)"/) || [])[1]) || ''; if (w) quarter++;
          if (!tip.includes(`Counts ${w ? 'three quarters' : 'fully'} toward ${X.ASK[k]}`)) bad.push(X.ASK[k] + ': a head\'s hover lost how much it counts'); });
        body.split('<tr').slice(2).forEach(r => { const i = +(r.match(/data-act="stu" data-i="(\d+)"/) || [])[1];
          for (const c of r.matchAll(/<td class="q[^"]*" data-act="tblq" data-id="(\d+)"[^>]*><span class="rs" role="img" aria-label="([^"]+)">([^]*?)<\/span><\/td>/g)) {
            const ix = +c[1], a = X.AT[i].get(ix); if (!a || a[9] === 1 || !a[4]) continue;   // the retry marks only: right, after more than one try
            const o = a[7] - a[10] <= 3 ? 'rr' : 'cr', cr = X.credit(a), v = !X.EVOK(ix) ? '' : cr === 1 ? 'F' : cr === .5 ? '' : cr > 0 ? 'Q' : 'N', word = !X.EVOK(ix) ? '' : cr === 1 ? ', full credit' : cr === .5 ? ', half credit' : cr > 0 ? ', a quarter credit' : ', no credit';
            if (c[3] !== X.RIC[o + v] || !c[2].endsWith(word)) bad.push(`${X.ASK[k]}: a shade`); else seen[v]++; } }); });
      check('js/atlas.js', 'the skill\'s table shades each "correct after retries" mark by the credit its tries earned, darkest for full credit, ALPS\'s own pale mark for half, almost white for a quarter (a code task right after six tries) and gray for none, with no number in a cell, says the credit to a screen reader and keys the four shades; no ¾ by a question\'s number, its head\'s hover saying how much it counts toward the skill',
        !bad.length && seen.F > 0 && seen[''] > 0 && seen.Q > 0 && seen.N > 0 && quarter > 0 && /RS\.cr\}: full, half, a quarter or no credit/.test(atlasJs) && /:\(r<=3\?1:r<=6\?\.5:\.25\)\};/.test(atlasJs) && /q\?\(r===1\?1:r===2\?\.5:0\)/.test(atlasJs), bad.slice(0, 4).join('; ') || `full ${seen.F}, half ${seen['']}, a quarter ${seen.Q}, none ${seen.N} · ${quarter} heads count three quarters`); }
  }
  // the picked faded skill's students, drawn as the skills beside them are (asked 2026-10-26: "Instead of having two graphs for this one, can we
  // just have two instances of the left graph. The right instance should show students on the y-axis and based on selected skills show the changes")
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, className: '', clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.FS_TEST={S,v10,FD,fadeKind,ALL,ML,MT,NM,dTxt,CT};'), ctx, { filename: 'js/atlas.js' }); X = ctx.FS_TEST; } catch (e) { check('js/atlas.js', 'the faded skill\'s students run on the page\'s own code', false, e.message); }
    if (X) { const bad = []; let drawn = 0, ticks = 0;
      X.FD.filter(o => X.fadeKind(o.d) === 'fade').forEach(o => { const k = o.k, P = X.ALL.filter(i => X.ML[i][k] !== null).map(i => ({ i, a: X.MT[i][k] * 100, b: X.ML[i][k] * 100 })), sl = P.filter(p => p.a - p.b >= 20);
        const ch = p => Math.round(p.b) - Math.round(p.a), ord = ps => ps.slice().sort((p, q) => ch(p) - ch(q) || (p.b - p.a) - (q.b - q.a) || X.NM[p.i].localeCompare(X.NM[q.i]));
        [false, true].forEach(all => { X.S.v10.k = k; X.S.v10.all = false; X.S.v10.sall = all; const h = X.v10(), want = ord(all || !sl.length ? P : sl);
          const rows = [...h.matchAll(/<g class="row[^"]*" data-act="stu" data-i="(\d+)"[^>]*>([^]*?)<\/g>/g)].map(m => ({ i: +m[1], ch: (m[2].match(/>([^<>]*)<\/text>$/) || [])[1] }));
          if (rows.map(r => r.i).join() !== want.map(p => p.i).join()) bad.push(`${o.k}: ${all ? 'all' : 'slipped'} rows`);
          else if (rows.some((r, n) => r.ch !== X.dTxt(ch(want[n])))) bad.push(o.k + ': a change');
          if (!h.includes(`<h3 class="ctt">${X.CT.fade1}</h3>`) || /No change|On the later check/.test(h)) bad.push(o.k + ': name or the old scatter');
          const tick = new RegExp(`id="v10sall"${all ? ' checked' : ''}> Show all ${P.length}</label>`).test(h); if (tick !== (sl.length > 0 && P.length > sl.length)) bad.push(o.k + ': tick'); else if (tick) ticks++;
          drawn++; }); });
      X.S.v10.k = -1; X.S.v10.sall = false;
      check('js/atlas.js', 'a faded skill picked shows its students as the skills beside them are drawn: a row a student, when first met and the later check, biggest drop first by the change shown, opening on the students who slipped 20 points or more with a tick for everyone, and no scatter',
        !bad.length && drawn > 0 && ticks > 0, `${bad.slice(0, 4).join('; ')} · ${drawn} drawn, ${ticks} with the tick`); }
  }
  // what a name is, at a glance (asked 2026-10-26: "add icon for skills and item type to quickly know where we are showing skills/items"): a bulb
  // before every skill's name and its format before every question's, in lists, headings, cards and tables, and beside each name on a chart
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, className: '', clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.NI_TEST={S,v7,v10,v6list,v8,v11,v11draw,hard5,ex5,lvAll5,tree7,ICD,tblHTML,openTbl,ASK,SKD,SKIC,QIC,QD,nIc};'), ctx, { filename: 'js/atlas.js' }); X = ctx.NI_TEST; } catch (e) { check('js/atlas.js', 'the names\' icons run on the page\'s own code', false, e.message); }
    if (X) { const bad = [], bulb = X.nIc(X.SKIC), fmts = Object.keys(X.QD), isQ = v => fmts.some(f => v.startsWith(X.nIc(X.QIC[f])));
      const marks = h => [...h.matchAll(/<path class="qi" transform="translate\([^)]*\)" d="([^"]*)"/g)].map(m => m[1]), skMarks = h => marks(h).filter(d => d === X.SKD).length;
      // the weak and faded charts: a bulb by every row's name
      X.S.v7.more = true; X.S.v7.f = 'all'; X.S.v7.pts = []; const w = X.v7(), wr = (w.match(/data-act="v7row"/g) || []).length; if (!wr || skMarks(w) !== wr) bad.push(`weak chart ${skMarks(w)} of ${wr}`); X.S.v7.more = false;
      const f = X.v10(), fr = (f.match(/data-act="v10line"/g) || []).length; if (!fr || skMarks(f) !== fr) bad.push(`faded chart ${skMarks(f)} of ${fr}`);
      // the answer cards that name a skill or a question
      const cs = X.ICD[6]().concat(X.ICD[7]()); [['Teach first', 1], ['Hardest skill', 1], ['Faded most', 1], ['Most gave up', 0], ['Most skipped', 0]].forEach(([l, sk]) => { const c = cs.find(x => x.l === l); if (c && !(sk ? c.v.startsWith(bulb) : isQ(c.v))) bad.push('card ' + l); });
      // a skill's panel and table, and the skills of a unit
      const H = X.hard5(0), E = X.ex5(0, H), L = X.lvAll5(0); E.U = L.us.slice(); E.J = L.js.slice(); X.S.v6.sel[0] = H.hk.k;   // opened down to the skills, as Show · Skills does
      const u = X.v6list(0), ur = (u.match(/data-act="v6sk"/g) || []).length; X.S.v6.sel[0] = null; E.U = []; E.J = [];
      if (!ur || (u.split('<span class="chs"></span><span>' + bulb).length - 1) !== ur || !u.includes('<h3>' + bulb + X.ASK[H.hk.k] + '</h3>')) bad.push('by unit');
      X.openTbl(H.hk.k, 'unit'); if (!X.tblHTML().includes('<h2 id="dlgt">' + bulb + X.ASK[H.hk.k] + '</h2>')) bad.push('table'); X.S.tbl = null;
      // Stall points: every question in its lists, the outline opened down to the questions, and the panel's
      const T7 = X.tree7(0, null).filter(U => U.on); X.S.v8.ver = 'now'; X.S.v8.ex[0] = { U: T7.map(U => U.u), J: T7.flatMap(U => U.subs.filter(J => J.on).map(J => J.j)) };
      const sp = X.v8(), qr = (sp.match(/data-act="v8c"/g) || []).length, qn = [...sp.matchAll(/data-act="v8c"[^>]*>[^]*?<span class="hn">(?:<span class="chs"><\/span>)?<span>(<svg class="ni"[^]*?<\/svg>)/g)].filter(m => fmts.some(f => m[1] === X.nIc(X.QIC[f]))).length;
      if (!qr || qn !== qr || qr <= 8 || !/<div class="dhead"><h3><svg class="ni"/.test(sp)) bad.push(`stall points ${qn} of ${qr}`); X.S.v8.ex[0] = { U: [], J: [] };
      // Ready's trees, current and radial: a bulb by every skill drawn
      const rd = v => { X.S.v11.ver = v; X.v11(); X.v11draw(); const h = node('#v11c').innerHTML, n = (h.match(/<g tabindex="0" aria-label="[^"]*: [^"]*; /g) || []).length; return [n, skMarks(h)]; }; [['now'], ['2']].forEach(([v]) => { const [n, b] = rd(v); if (!n || n !== b) bad.push(`ready ${v} ${b} of ${n}`); }); X.S.v11.ver = 'now';
      check('js/atlas.js', 'a bulb marks every skill\'s name and its format every question\'s: the weak and faded charts\' rows, the answer cards that name one, a unit\'s skills, a skill\'s panel and table, every question on Stall points and its panel, every skill on Ready\'s trees; Engagement\'s skill columns, On pace\'s goal skills, the Stall points charts and a practice set\'s chip draw them too, and no hover or label carries one',
        !bad.length && /\$\{o\.t!=='u'&&o\.t!=='j'\?gIc\(tx-15,ty-11,SKD\):''\}/.test(atlasJs) && /<li>\$\{skNm\(k\)\}/.test(atlasJs) && /gIc\(cx-6,T0\+PH\+\(it\.me\?14:4\),QD\[it\.f\]\)/.test(atlasJs) && /gIc\(cx-Math\.min\(12,cw-2\)\/2,Ht-16,QD\[c\.C\.f\],Math\.min\(12,cw-2\)\)/.test(atlasJs) && /gIc\(tx\+7,ty\+6,QD\[t\.f\]\)/.test(atlasJs)
          && /\$\{nIc\(QIC\[r\.f\]\|\|''\)\}\$\{r\.f\}<\/span>/.test(atlasJs) && !/tp\([^)]*(skNm|qNm|nIc)\(|aria-label="[^"]*\$\{(skNm|qNm|nIc)\(/.test(atlasJs) && /\.ni\{display:inline-block;/.test(atlas), bad.slice(0, 4).join('; '));
    }
  }
  // where they stall on a skill (asked 2026-10-23: the link used to open the lesson that first named the skill): Stall points narrowed to the questions that check it
  check('js/atlas.js', 'a skill\'s "Where they stall" opens Stall points narrowed to the questions that check that skill, worst first, the worst picked, with a bar naming the skill and "All questions"; the rail and a student\'s flag open it on every question, and no link points at the lesson that first named the skill',
    /const whereLink=k=>stallN\(k\)\?`<button class="lnk" type="button" data-act="gosk" data-k="\$\{k\}">Where they stall →<\/button>`:'';/.test(atlasJs) && (atlasJs.match(/\$\{whereLink\((k0|m\.k)\)\}/g) || []).length === 2
      && /case 'gosk':\{const k=\+d\.k,w=worstQs\(tree7\(0,k\),k\);if\(!w\.length\)break;S\.v8\.k=k;S\.v8\.view='worst';S\.v8\.tb=0;S\.v8\.selw\[0\]=\{j:w\[0\]\.j,s:w\[0\]\.s\};go\(7\);return\}/.test(atlasJs)
      && /case 'v8k':S\.v8\.k=null;reView\(\);break;/.test(atlasJs) && /case 'go':if\(\+d\.v===7\)S\.v8\.k=null;go\(\+d\.v\);break;/.test(atlasJs) && /S\.v8\.k=k===undefined\?null:k;/.test(atlasJs)
      && /data-act="v8k">All questions<\/button><\/p>`;/.test(atlasJs) && /\+ctl\+kbar\+secs\}/.test(atlasJs) && !/data-act="gosub" data-j="\$\{jOf\(/.test(atlasJs) && !/\bjOf\b/.test(atlasJs));
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const runSk = search => {
      const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
      const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
        location: { search, hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
      ['data/class.js', 'data/example.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
      vm.runInContext(atlasJs.replace(boot, 'globalThis.SK_TEST={S,CT,WEAK,FD,SG,hard5,KIT,SUBS,ASK,tree7,worstQs,stallN,whereLink,h8,v7,v6list,v8,v10,vSk,h6,h7,h10,toPage};'), ctx, { filename: 'js/atlas.js' });
      return ctx.SK_TEST;
    };
    // every skill the Skills page lists (weak now, by unit, faded): the link shows exactly when a question on Stall points checks it, and following it narrows the page to those questions
    const stallOK = search => { const X = runSk(search), H = X.hard5(0), ks = [...new Set(X.WEAK.map(m => m.k).concat(H.T.flatMap(U => U.subs.flatMap(J => J.ks.map(K => K.k))), X.FD.map(o => o.k)))], base = X.h8(), bad = [];
      let shown = 0;
      ks.forEach(k => { const n = X.stallN(k), l = X.whereLink(k); if (!!n !== !!l) { bad.push(X.ASK[k] + ': link'); return; } if (!n) return; shown++;
        const w = X.worstQs(X.tree7(0, k), k); X.S.v8.k = k; X.S.v8.view = 'worst'; X.S.v8.tb = 0; X.S.v8.selw[0] = { j: w[0].j, s: w[0].s };
        const ans = X.h8(), page = X.v8(), html = page.slice(0, page.indexOf('id="pv-sp-unit"')), on = ix => X.KIT[k].includes(ix);
        if (!w.every(C => on(X.SUBS[C.j].its[C.s])) || (html.match(/data-act="v8c"/g) || []).length !== Math.min(8, n) || !html.includes('data-act="v8k"') || !html.includes(`>${X.ASK[k]} · ${n} question`) || !page.includes('id="pv-sp-unit"')
          || !(ans.startsWith(`On ${X.ASK[k]}: `) || ans === `Nobody is stalling on ${X.ASK[k]} so far.`) || /undefined|NaN/.test(ans + html)) bad.push(X.ASK[k]);
        X.S.v8.view = 'outline'; const out = X.v8(); if (/undefined|NaN/.test(out) || !/data-act="v8unit"/.test(out)) bad.push(X.ASK[k] + ': outline'); });
      X.S.v8.k = null; X.S.v8.view = 'worst'; if (X.h8() !== base) bad.push('the page\'s own answer changed');
      return { bad, shown, all: ks.length }; };
    // all of a page's views on the page (asked 2026-10-26): Skills' three in order, each a card under its chart's name; Stall points' two, each with its own panel
    { const X = runSk(''), page = X.vSk(), at = id => page.indexOf(`id="pv-${id}"`), secs = ['sk-weak', 'sk-unit', 'sk-faded'].map(at), part = i => page.slice(secs[i], i < 2 ? secs[i + 1] : undefined);
      const okSk = secs.every((v, i) => v >= 0 && (!i || v > secs[i - 1])) && [X.CT.weak, X.CT.unit, X.CT.fade].every((n, i) => part(i).includes(`</svg><span>${n}</span></button></h3>`)) && !page.includes('class="icards"') && !page.includes('class="answer')
        && part(0).includes('data-act="v7row"') && part(1).includes('data-act="v6unit"') && !/undefined|NaN/.test(page);
      X.S.pvGo = null; X.toPage(5); const go5 = X.S.pvGo; X.toPage(9); const go9 = X.S.pvGo; X.S.pvGo = null;
      const sp = X.v8(), w = sp.indexOf('id="pv-sp-worst"'), u = sp.indexOf('id="pv-sp-unit"');
      const dt = [...sp.matchAll(/<div class="detail">/g)].map(m => m.index);
      /* By unit opens with nothing picked, the list in the middle; a skill picked opens its panel, and a second pick of it closes it */
      const H5 = X.hard5(0), u0 = X.v6list(0); X.S.v6.sel[0] = H5.hk.k; const u1 = X.v6list(0); X.S.v6.sel[0] = null;
      const unitOK = !u0.includes('<div class="detail">') && u0.includes('class="stage"') && u1.includes('<div class="detail">') && !u1.includes('class="stage"');
      check('js/atlas.js', 'the Skills page draws Weak now, By unit and Faded one under another, each a card under its chart\'s name, their answers on the page above them, and an old address opens its card; By unit opens with nothing picked, a skill picked opens its panel; Stall points draws the worst questions with the panel for the first of them, then the outline with nothing picked',
        okSk && unitOK && (page.match(/<h3 class="ctt">/g) || []).length >= 3 && (sp.match(/<h3 class="ctt">/g) || []).length === 2 && go5 === 'sk-unit' && go9 === 'sk-faded' && w >= 0 && u > w && dt.length === 1 && dt[0] > w && dt[0] < u, `${secs.join(',')} · ${go5} ${go9} · ${w},${u} · ${dt.join(',')} · by unit ${unitOK}`); }
    let s1, s2, R;
    try { s1 = stallOK(''); s2 = stallOK('?books'); R = runSk(''); } catch (e) { check('js/atlas.js', 'the Skills page\'s links run on the page\'s own code', false, e.message); }
    if (s1) {
    check('js/atlas.js', 'on every skill the Skills page lists, with and without the example\'s books, "Where they stall" shows when a question checks the skill, and following it lists only those questions, worst first, with the skill named in the answer and the bar', !s1.bad.length && !s2.bad.length && s1.shown > 0 && s2.shown > 0, s1.bad.concat(s2.bad).slice(0, 4).join('; '));
    // the weak-now chart says what its lines measure, and every row carries its scale
    { R.S.v7.more = true; R.S.v7.pts = []; R.S.v7.f = 'all'; const h = R.v7(), svg = (h.match(/<svg class="viz"[^]*?<\/svg>/) || [''])[0], rows = (svg.match(/data-act="v7row"/g) || []).length, groups = new Set(R.WEAK.map(m => m.st)).size;
      const n = t => (svg.match(new RegExp(`>${t}</text>`, 'g')) || []).length;
      check('js/atlas.js', 'on the weak-now chart, every row is a small chart with its own scale, 100%, 50% and 0% on faint lines, a line divides each row from the one above in its status, and the heading says "% of students who have mastered it"',
        rows > 0 && n('100%') === rows && n('50%') === rows && n('0%') === rows && (svg.match(/class="grid" style="opacity:\.7"/g) || []).length === rows - groups && svg.includes('>% of students who have mastered it</text>'), `${rows} rows, ${groups} statuses`); R.S.v7.more = false; }
    // no view of a skill offers a reteach, since the product has none: weak now and by unit show the skill's state, the class now and the way into its table
    const noRe = h => !/>Reteach|Reteach planned|data-act="v7plan"/.test(h), wk = R.WEAK.map((m, r) => { R.S.v7.r = r; R.S.v7.pts = []; return R.v7(); }), uk = R.WEAK.map(m => { R.S.v6.sel[0] = m.k; return R.v6list(0); });
    check('js/atlas.js', 'no skill\'s panel offers a reteach, on weak now or by unit: the panel shows the skill\'s state, the class now and the way into its table',
      wk.length > 0 && wk.every(noRe) && uk.every(noRe) && wk.every(h => /data-act="tblopen"/.test(h)) && uk.every(h => /data-act="tblopen"/.test(h)));
    // faded: a dot is never pinned to the edge of the axis, and the hover says a date, not a week
    R.S.v10.all = true; const fh = R.v10(), ticks = [...fh.matchAll(/y="34\.0" text-anchor="middle" class="t3">(\d+)<\/text>/g)].map(m => +m[1]), lo = ticks.length ? ticks[0] : NaN, mn = Math.min(...R.FD.flatMap(o => [o.a, o.b]));
    check('js/atlas.js', 'the faded view\'s axis starts low enough for every dot (the class\'s average when first met and later, and the followed student\'s), and its hover gives the day the class first met the skill, not a week',
      lo <= mn && ticks[ticks.length - 1] === 100 && /const sv=rows\.flatMap\(o=>\[o\.a,o\.b\]\)\.concat\(/.test(atlasJs) && /when first met \(on \$\{dayDate\(KT\[o\.k\]\)\}\)/.test(atlasJs) && !/when taught/.test(atlasJs) && !/\(week \$\{KT/.test(atlasJs), `axis from ${lo}, lowest dot ${Math.round(mn)}`);
    }
  }
  check('js/atlas.js', 'ready for a unit asks which unit is next, picks the earliest one not started after a unit the class has started (a skipped unit first; with none skipped, the first after the one the class is in; no line of text says so), marks the started ones, and shows the readiness line under it, unfolded', /const rdDef=tb=>\{const ok=\(U,u\)=>!U\.on&&\(!MULTI\|\|PICK!==null\|\|U\.tb===MAIN\),f=TB0\.findIndex\(U=>U\.on\);let nx=TB0\.findIndex\(\(U,u\)=>u>f&&ok\(U,u\)\);/.test(atlasJs) && /pickCtl\('v11unit',R\.u,unitOpts\(/.test(atlasJs) && /u===CU\?' \(now\)':TB0\[u\]\.on\?' \(done\)':''/.test(atlasJs) && /'Version'\)\}`\)\}<section class="mcard">\$\{chd\(CT\.ready\.replace\('\{u\}',R\.U\.nb\)\)\}\$\{R\.pre\.length\?`\$\{rdLine\(R\)\}/.test(atlasJs) && !/fold\('v11line'|The first unit not started after/.test(atlasJs));
  check('js/atlas.js', 'stretches with no class work are hatched and no line runs through them, on Drifting and on a profile, and every recent figure names its dates', /const quietRects=/.test(atlasJs) && /const RB=NBK-1,RSTART=BS\(RB\);/.test(atlasJs) && /P=live\.map\(j=>f1\(px\(j\)\)/.test(atlasJs) && /ap=live\.map\(j=>/.test(atlasJs) && /ic\('Work, last five days',[^\n]*CLASSIDLE\?`nobody in the class worked · \$\{RECENT\}`:`normal \$\{NORM\[i\]===null\?'–':NORM\[i\]\} · \$\{RECENT\}`/.test(atlasJs));
  // time is in days and dates: today is the export date (or ?today=), recent is the last five days, breaks are read from the data, and nothing is assumed about class days or weeks
  check('js/atlas.js', 'every page has an "As of" date picker beside its title that re-reads the pages as of that day, with a way back to today', /id="asof"/.test(atlasJs) && /asOfUrl=iso=>withQ\('today',iso\)/.test(atlasJs) && /case 'today':location\.assign\(asOfUrl\(isoOf\(EXPORTDAY\)\)\)/.test(atlasJs) && /const DEMODAY=/.test(atlasJs) && /const demoDay=k=>\(k===3&&!JUDGE\|\|k===4&&LASTWORK<TODAY-PACE_WINDOW\)&&!ASOF&&DEMODAY!==TODAY;/.test(atlasJs) && /max="\$\{isoOf\(EXPORTDAY\)\}"/.test(atlasJs));
  check('js/atlas.js', 'today is the export date unless the address says otherwise, and nothing is counted in weeks or assumes a class day', /D\.meta\.exported\?dayOf\(D\.meta\.exported\)/.test(atlasJs) && /\[\?&\]today=\(\\d\{4\}-\\d\{2\}-\\d\{2\}\)/.test(atlasJs) && (atlasJs.match(/\bweeks?\b/gi) || []).length <= 3 && !/wkOf|CDAYS|half the class worked|classDays/.test(atlasJs) && /const RECHECK=21,/.test(atlasJs));
  check('js/atlas.js', 'effort is any work in five-day blocks against the student\'s own normal, breaks are blocks in which nobody worked, and drifting is judged only while classmates are not low too', /const B5=5,/.test(atlasJs) && /const WB=ALL\.map\(i=>\{const a=new Array\(NBK\)\.fill\(0\);AT\[i\]\.forEach/.test(atlasJs) && /ONB=CTOT\.map\(t=>t>0\)/.test(atlasJs) && /const CLASSLOW=!CLASSIDLE&&NJUDGE>0&&NLOW>=NJUDGE\/2;/.test(atlasJs) && /const JUDGE=!TOOFEW&&!CLASSIDLE&&!CLASSLOW;/.test(atlasJs) && /WB\[i\]\[j\]<NORM\[i\]\/2/.test(atlasJs));
  check('js/atlas.js', 'a time axis carries dates only, never unit bands, and the skills page filters by unit instead (the skills introduced through a unit)', !/BANDU\.forEach/.test(atlasJs) && !/for\(const u of BANDU\)/.test(atlasJs) && /pickCtl\('v7unit',uf,\[\['all','All units'\]\]\.concat\(units\.map/.test(atlasJs) && /uok=k=>uf==='all'\|\|uOf\(k\)<=\+uf/.test(atlasJs));
  check('js/atlas.js', 'a picker with many options (a unit, a book) is one select grouped by book, never a row of buttons', /const pickCtl=/.test(atlasJs) && /const unitOpts=us=>MULTI&&PICK===null\?BKON\.map/.test(atlasJs) && !/seg\('v11u'|seg\('v2pick'|seg\('v10u'|seg\('bk'|seg\('v7u'/.test(atlasJs) && /pickCtl\('bksel'/.test(atlasJs) && /pickCtl\('v10unit'/.test(atlasJs));
  check('js/atlas.js', 'work on earlier or later units shows on the profile only, as a card for an earlier unit or for working ahead (not "catching up", which On pace uses for speeding up)', /function sideWork\(i\)/.test(atlasJs) && /ic\('On an earlier unit',swU\(sw\.back\),swTxt\(sw\.back\),''\)/.test(atlasJs) && /ic\('Working ahead',swU\(sw\.ahead\),swTxt\(sw\.ahead\),''\)/.test(atlasJs) && !/Catching up/.test(atlasJs.slice(atlasJs.indexOf('function flags('), atlasJs.indexOf('/* ---------- view 2: engagement and performance'))));
  check('js/atlas.js', 'the engagement and performance page opens on the unit\'s chart and cards, with the started units as a row of buttons and the others counted', /pickCtl\('v2unit',E\.sel\.id,unitOpts\(TAUGHT\)/.test(atlasJs) && /\+\$\{ns\.length\} \$\{pl\(ns\.length,'unit'\)\} not started/.test(atlasJs) && /tp0\.innerHTML=none\?/.test(atlasJs));
  // a card or a student picked beside the chart (asked 2026-10-23): the points that belong to it stay in focus and every other point is dimmed
  check('js/atlas.js', 'on Engagement and performance a card\'s heading is a switch that picks its students out on the chart, a student followed is picked out the same way, the latest pick wins, and a second click or Esc shows everyone again',
    /const dim2=P=>\{const g=S\.v2\.hl,F=new Set\(P\.filter\(p=>g\?p\.c\.g===g:p\.i===S\.stu\)\.map\(p=>p\.i\)\);return i=>F\.size&&!F\.has\(i\)\?' dim':''\};/.test(atlasJs)
      && /<button class="dl agh" type="button" data-act="v2hl" data-g="\$\{g\}" aria-pressed="\$\{on\}"/.test(atlasJs) && /case 'v2hl':\{S\.v2\.hl=S\.v2\.hl===d\.g\?null:d\.g;/.test(atlasJs)
      && /S\.stu=S\.stu===i\?null:i;if\(S\.stu!==null\)S\.v2\.hl=null;/.test(atlasJs) && /case 'prof':\{if\(S\.stu!==\+d\.i\)S\.v2\.hl=null;/.test(atlasJs) && /if\(S\.view===2&&S\.v2\.hl\)\{[^}]*S\.v2\.hl=null;hideTip\(\);v2draw\(\);/.test(atlasJs)
      && /<g class="hit\$\{dm\(p\.i\)\}" data-act="stu"/.test(atlasJs) && /\.ag\.on \.agh\{background:var\(--accent-soft\)\}/.test(atlas) && !/\.ag\{[^}]*border:/.test(atlas) && /\.viz \.dim\{opacity:\.28\}/.test(atlas));
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const runV2 = search => {
      const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
      const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
        location: { search, hash: '#engagement', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
      ['data/class.js', 'data/example.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
      vm.runInContext(atlasJs.replace(boot, 'globalThis.V2_TEST={S,v2draw,cellN,tbWho,TAUGHT,NM};'), ctx, { filename: 'js/atlas.js' });
      return { X: ctx.V2_TEST, node };
    };
    // every started unit, with and without the example's books, read off the drawing: which points are dimmed, which card is on, which names are dimmed
    const focusOK = search => { const { X, node } = runV2(search), bad = []; let cards = 0, studs = 0, strips = 0;
      const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
      const draw = () => { X.v2draw(); const h = node('#v2top').innerHTML, pts = [...h.matchAll(/<g class="hit( dim)?" data-act="stu" data-i="(\d+)"/g)], lit = pts.filter(m => !m[1]).map(m => +m[2]);
        const names = [...h.matchAll(/class="(?:t1|tacc)( dim)?"(?: font-weight="700")?>([^<]+)<\/text>/g)].map(m => ({ i: X.NM.indexOf(m[2]), dim: !!m[1] }));
        return { h, all: pts.map(m => +m[2]), lit, namesOK: names.every(o => o.i >= 0 && o.dim === !lit.includes(o.i)) }; };
      X.S.view = 2; X.S.v2.at = { u: null, j: null };
      X.TAUGHT.forEach(u => { const n = { t: 'u', id: u }, ids = X.tbWho(0); X.S.v2.sel = n; X.S.v2.hl = null; X.S.stu = null;
        const base = draw(); if (/<svg class="viz" [^>]*share of its labs/.test(base.h)) strips++;
        if (base.lit.length !== base.all.length || /class="ag on"|aria-pressed="true"/.test(base.h)) bad.push(`unit ${u}: something picked or dimmed with nothing picked`);
        ['stuck', 'off', 'coast'].forEach(g => { const mem = ids.filter(i => X.cellN(i, 0, n).g === g), on = mem.filter(i => base.all.includes(i)), out = base.all.find(i => !mem.includes(i));
          X.S.stu = out === undefined ? null : out; X.S.v2.hl = g; const d = draw();   // a card picked while someone outside it is followed: the card has the focus
          if (!mem.length) { if (X.S.v2.hl !== null || !same(d.lit, X.S.stu === null ? d.all : [X.S.stu]) || /class="ag on"/.test(d.h)) bad.push(`unit ${u} ${g}: on with no card`); return; }   // no card here: the pick is dropped and the followed student has the focus
          cards++;
          if (!(on.length ? same(d.lit, on) : d.lit.length === d.all.length) || !d.namesOK) bad.push(`unit ${u} ${g}: focus`);
          if ((d.h.match(/aria-pressed="true"/g) || []).length !== 1 || !d.h.includes(`<div class="ag on"><button class="dl agh" type="button" data-act="v2hl" data-g="${g}" aria-pressed="true"`)) bad.push(`unit ${u} ${g}: card`);
          if (/>Reteach/.test(d.h) || (g === 'stuck' && !d.h.includes('data-act="v2log" data-g="stuck">Form a group</button>'))) bad.push(`unit ${u} ${g}: action`); });
        X.S.v2.hl = null;
        base.all.forEach(i => { X.S.stu = i; const d = draw(); studs++; if (!same(d.lit, [i]) || !d.namesOK) bad.push(`unit ${u}: student ${i}`); });
        ids.filter(i => !base.all.includes(i)).forEach(i => { X.S.stu = i; const d = draw(); if (d.lit.length !== d.all.length) bad.push(`unit ${u}: student ${i} with no point dims the rest`); }); });
      return { bad, cards, studs, strips }; };
    let f1, f2;
    try { f1 = focusOK(''); f2 = focusOK('?books'); } catch (e) { check('js/atlas.js', 'the engagement and performance chart runs on the page\'s own code', false, e.message); }
    if (f1) check('js/atlas.js', 'on every started unit, with and without the example\'s books, a card picked keeps exactly its students\' points and names in focus and dims the rest, also over a followed student outside it; a followed student keeps only their own point; nothing is dimmed with nothing picked, nor for a card or student with no point',
      !f1.bad.length && !f2.bad.length && f1.cards > 0 && f1.studs > 0 && f2.cards > 0, `${f1.bad.concat(f2.bad).slice(0, 4).join('; ')} · ${f1.cards + f2.cards} cards, ${f1.studs + f2.studs} students, ${f1.strips + f2.strips} lab strips`);
  }
  // Drifting's lines say what they measure (asked 2026-10-24): a heading in words over the dates, each line's own scale (0 and the student's normal, at
  // the middle of the band) and the last five days at its end, each stretch's dates and count on hover; the other students' small lines carry no numbers
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '?today=2025-11-15', hash: '#drifting', pathname: '/index.html', assign() {}, replace() {} }, history: { replaceState() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.DF_TEST={S,v3,DR,NORM,WB,RB,NM,ALL};'), ctx, { filename: 'js/atlas.js' }); X = ctx.DF_TEST; } catch (e) { check('js/atlas.js', 'Drifting runs on the page\'s own code', false, e.message); }
    if (X) { const fl = X.ALL.filter(i => X.DR[i] >= 0), bad = []; let h = X.v3();
      if (!h.includes('>Questions tried in each 5 days</text>') || (h.match(/>Questions tried in each 5 days<\/text>/g) || []).length !== 1) bad.push('the heading');
      fl.forEach(i => { const sp = ((h.split(`data-act="stu" data-i="${i}"`)[1] || '').match(/<svg class="spark"[^]*?<\/svg>/) || [''])[0];
        const ticks = [...sp.matchAll(/<text x="24" y="[\d.]+" text-anchor="end">(\d+)<\/text>/g)].map(m => +m[1]), hi = Math.max(1, X.NORM[i] * 2, ...X.WB[i]);
        const top = [10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 300, 400, 500, 600, 800, 1000].find(n => n >= hi) || Math.ceil(hi / 200) * 200;
        if (ticks.join() !== [top, top / 2, 0].join() || !/^<svg class="spark" viewBox="0 0 \d+ 64"/.test(sp) || !sp.includes(`font-weight:700">${X.WB[i][X.RB]}</text>`) || (sp.match(/data-tip="/g) || []).length < 2) bad.push(X.NM[i] + ' (scale ' + ticks.join('/') + ')'); });
      X.S.v3.all = true; h = X.v3(); const minis = (h.split('<div class="minis">')[1] || '');
      if (!minis || /<text/.test(minis)) bad.push('the small lines');
      check('js/atlas.js', 'Drifting\'s lines say what they measure: "Questions tried in each 5 days" over the dates once, each flagged student\'s line, 64px tall, its own even scale (0, half and a round top over everything on it, on faint lines) and the last five days at its end, with dates and counts on hover; the other students\' small lines carry no numbers',
        fl.length > 0 && !bad.length, `${fl.length} flagged; ${bad.join('; ')}`); }
  }
  // a followed student on Stall points is marked in the class key's own squares and colours (asked 2026-10-26): one key reads the bars and the student
  check('js/atlas.js', 'on Stall points a followed student\'s mark is the class key\'s square in the class\'s colour for the outcome, and the key has no second row of marks',
    /const pm7=o=>`<i class="sw lv pm" style="background:\$\{o===0\?'var\(--ok-fill\)':o===1\?'var\(--st-rt\)':o===2\?CGU:o===3\?'var\(--st-sk\)':'var\(--na-fill\)'\}" aria-hidden="true"><\/i>`;/.test(atlasJs)
      && /OUTLEG7\(fol&&V!=='4'\?`Students and \$\{NM\[su\]\}`:'Students'\)/.test(atlasJs) && !/pathMark|var\(--accent\)[^;]*pm7/.test(atlasJs) && !/\.pmn\{[^}]*blue/.test(atlas));
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#stall-points', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let X = null; try { vm.runInContext(atlasJs.replace(boot, 'globalThis.SP_TEST={S,v8,tree7,cOut,NM,ALL,AT,SUBS,IT,RANKJ,FRONT,LASTDAY,D};'), ctx, { filename: 'js/atlas.js' }); X = ctx.SP_TEST; } catch (e) { check('js/atlas.js', 'Stall points runs on the page\'s own code', false, e.message); }
    if (X) { const COL = ['var(--ok-fill)', 'var(--st-rt)', 'var(--st-gu)', 'var(--st-sk)', 'var(--na-fill)'], bad = []; let marks = 0;
      const T = X.tree7(0, null); X.S.v8.view = 'outline'; X.S.v8.ex[0] = { U: T.filter(U => U.on).map(U => U.u), J: T.flatMap(U => U.subs.filter(J => J.on).map(J => J.j)) };
      X.ALL.forEach(i => { X.S.stu = i; const h = X.v8(), leg = (h.match(/<div class="legend mleg">[^]*?<\/div>/) || [''])[0], rows = h.replace(leg, '');
        const got = [...rows.matchAll(/<i class="sw lv pm" style="background:([^"]+)"/g)].map(m => m[1]); marks += got.length;
        if (got.some(c => !COL.includes(c)) || /class="sw lv pm"/.test(leg) || !leg.includes(`Students and ${X.NM[i]}`)) bad.push(X.NM[i]);
        // each piece of content: the student's own outcome, in its colour
        T.filter(U => U.on).forEach(U => U.subs.filter(J => J.on).forEach(J => J.cs.forEach(C => { const o = X.cOut(0, C.j)[C.s][i], want = `data-act="v8c" data-j="${C.j}" data-s="${C.s}"`, at = rows.indexOf(want);
          if (at < 0) return; const row = rows.slice(at, rows.indexOf('</button>', at)); if (!row.includes(`<i class="sw lv pm" style="background:${COL[o]}"`)) bad.push(X.NM[i] + ' · ' + C.nm); }))); });
      X.S.stu = null;
      // a question a student never tried is skipped once they have got to its lesson or past it, in the order the class worked, and not reached yet before that
      const front = X.ALL.map(i => { let f = -1; X.AT[i].forEach((a, ix) => { const j = X.IT[ix].j; if (j >= 0 && X.RANKJ[j] > f) f = X.RANKJ[j]; }); X.D.opens.forEach(([s, ix, d]) => { const j = X.IT[ix] ? X.IT[ix].j : -1; if (s === i && d <= X.LASTDAY && j >= 0 && X.RANKJ[j] > f) f = X.RANKJ[j]; }); return f; });
      let n3 = 0, n4 = 0, wrong = 0;
      X.SUBS.forEach((J, j) => { if (!J.on) return; X.cOut(0, j).forEach((O, s) => { const ix = J.its[s]; X.ALL.forEach(i => { const o = O[i], tried = X.AT[i].has(ix);
        if (o === 3) n3++; if (o === 4) n4++; if ((o === 4) !== (!tried && front[i] < X.RANKJ[j]) || (o === 3) !== (!tried && front[i] >= X.RANKJ[j])) wrong++; }); }); });
      check('js/atlas.js', 'on Stall points a question a student never tried is skipped once they have worked in its lesson or one the class did after it, and not reached yet before that; nobody who has got there reads as not reached', wrong === 0 && n3 > 0 && n4 > 0 && front.every((f, i) => f === X.FRONT[i]), `${wrong} wrong · ${n3} skipped · ${n4} not reached`);
      check('js/atlas.js', 'with every student followed, Stall points opened down to its content marks each piece in the class\'s colour for that student\'s outcome, and only in those five colours', !bad.length && marks > 0, `${bad.slice(0, 3).join('; ')} · ${marks} marks`); }
  }
  // Stall points' other versions (asked 2026-10-26): v1 to v5, then v6 to v10 as simple graphs for teachers who don't read charts: bars on a
  // track of the whole class, rings, columns along the course, a funnel, a course map; counts of students, nothing pooled, a lesson or unit
  // shown by its worst question or by how many of its questions are stall points or often skipped. Every count drawn is recounted here from
  // each student's own result on each question, not from the page's sums
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const run = search => { const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
      const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
        location: { search, hash: '#stall-points', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
      ['data/class.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
      try { vm.runInContext(atlasJs.replace(boot, 'globalThis.SV_TEST={S,v8,tree7,cOut,NM,tbWho,HOWK,SVHOW,SVV};'), ctx, { filename: 'js/atlas.js' }); return ctx.SV_TEST; } catch (e) { check('js/atlas.js', 'Stall points\' versions run on the page\'s own code', false, e.message); return null; } };
    const X = run('?sv=10'), Y = run('?sv=11');
    if (X && Y) {
      const flat = X.SVV.flatMap(o => Array.isArray(o[1]) ? o[1].map(x => x[0]) : [o[0]]), vs = flat.filter(v => v !== 'now');
      check('js/atlas.js', 'Stall points\' Version select offers the current bars, then the first five versions and five plainer ones in two groups; ?sv=1 to 10 opens one, anything else the current bars',
        flat.join() === 'now,1,2,3,4,5,6,7,8,9,10' && X.SVV.filter(o => Array.isArray(o[1])).map(o => o[1].length).join() === '5,5' && X.S.v8.ver === '10' && Y.S.v8.ver === 'now', `${flat.join(' ')} · ?sv=10 → ${X.S.v8.ver} · ?sv=11 → ${Y.S.v8.ver}`);
      const longHow = vs.filter(v => !X.SVHOW[v] || X.SVHOW[v].split(/\s+/).length > 53), shown = vs.filter(v => { X.S.v8.ver = v; return X.HOWK(7) !== X.SVHOW[v]; });
      check('js/atlas.js', 'each of Stall points\' versions has its own "How to read" of 53 words or fewer, shown while it is picked', !longHow.length && !shown.length, [...longHow, ...shown].join(' '));
      const ids = X.tbWho(0), n = ids.length, T = X.tree7(0, null), Us = T.filter(U => U.on), Js = Us.flatMap(U => U.subs.filter(J => J.on && J.cs.length)), Qs = Js.flatMap(J => J.cs);
      // each question's students by result, from their own outcomes: first time, needed retries, gave up, skipped, not reached yet
      const cnt = C => { const O = X.cOut(0, C.j)[C.s], t = [0, 0, 0, 0, 0]; ids.forEach(i => t[O[i]]++); return t; };
      const st = t => t[2] / n >= .18, sk = t => t[3] / n >= .29, key = C => C.j + ':' + C.s, byK = new Map(Qs.map(C => [key(C), C])), worstK = t => (t[2] + t[3]) * 1e3 + t[2];
      const openAll = () => { X.S.v8.ex[0] = { U: Us.map(U => U.u), J: Js.map(J => J.j) }; X.S.v8.oj = {}; X.S.v8.gj = null; };
      const draw = (v, view, stu) => { X.S.v8.ver = v; X.S.v8.view = view; X.S.stu = stu; X.S.v8.sort = 'course'; return X.v8(); };
      const junk = [];
      ['now', ...vs].forEach(v => [null, ids[0]].forEach(stu => ['worst', 'outline'].forEach(view => { openAll(); const h = draw(v, view, stu); if (/undefined|NaN|>null<|"null"/.test(h)) junk.push(`${v} ${view}${stu === null ? '' : ' followed'}`); })));
      Js.forEach(J => { openAll(); X.S.v8.gj = J.j; if (/undefined|NaN/.test(draw('4', 'outline', null))) junk.push('4 ' + J.J.s);
        X.S.v8.oj = { 0: J.j }; ['8', '10'].forEach(v => { if (/undefined|NaN|>null</.test(draw(v, 'outline', ids[0]))) junk.push(v + ' ' + J.J.s); }); });
      check('js/atlas.js', 'every version of Stall points draws both views, opened down to the content, with and without a student followed, and each lesson opened on v4, v8 and v10, and never shows undefined, NaN or null', !junk.length, junk.slice(0, 4).join('; '));
      // v6, v7 and v9 rows, opened down to the content: a question's bars, ring and funnel; a lesson's or unit's worst question, or its stall points
      openAll(); const rowsOf = h => new Map([...h.matchAll(/<button type="button" class="hr l\d[^"]*" data-act="(v8c|v8sub|v8unit)" (?:data-j="(\d+)" data-s="(\d+)"|data-j="(\d+)"|data-u="(\d+)")[^>]*>([^]*?)<\/button>/g)].map(m => [m[1] === 'v8c' ? 'c' + m[2] + ':' + m[3] : m[1] === 'v8sub' ? 'j' + m[4] : 'u' + m[5], m[6]]));
      // a question named in a row has its format before its name; the counts are read with the mark taken out
      const h6 = draw('6', 'outline', null), h7 = draw('7', 'outline', null), h9 = draw('9', 'outline', null), noNi = h => h.replace(/<svg class="ni"[^]*?<\/svg>/g, '');
      const marked = !/class="b6q"> · (?!<svg class="ni")|class="b6q">(?! · |<svg class="ni")|class="f9q">Worst question: (?!<svg class="ni")/.test(h6 + h7 + h9) && /class="b6q"> · <svg class="ni"/.test(h6) && /class="b6q"><svg class="ni"/.test(h7) && /class="f9q">Worst question: <svg class="ni"/.test(h9)
        && /<span class="hx"><span class="vk r7 hd"><i class="r7s"><\/i><span class="b6x">Worst question<\/span><\/span><\/span>/.test(h7) && !/gave up on something|skipped something|got all they reached|worst: /.test(h7);
      const r6 = rowsOf(noNi(h6)), r7 = rowsOf(noNi(h7)), r9 = rowsOf(noNi(h9)), w8 = [], P = v => (v / n * 100).toFixed(1);
      const lanes = h => [...h.matchAll(/<span class="b6t">([^]*?)<\/span><span class="b6x">([^]*?)<\/span><\/span>/g)].map(m => ({ segs: [...m[1].matchAll(/width:([\d.]+)%;background:([^"]+)"/g)].map(x => [x[1], x[2]]), txt: m[2] }));
      const roll = cs => { const ts = cs.map(C => ({ C, t: cnt(C) })), top = f => ts.reduce((a, o) => f(o.t) > (a ? f(a.t) : 0) ? o : a, null);
        return { st: ts.filter(o => st(o.t)).length, sk: ts.filter(o => sk(o.t) && !st(o.t)).length, na: ts.filter(o => o.t[4] === n).length, gu: top(t => t[2]), kp: top(t => t[3]), w: top(t => t[2] + t[3] + t[2] / 1e3) }; };
      const gc = t => st(t) ? 'var(--st-gu)' : 'var(--tr-2)', kc = t => sk(t) ? 'var(--st-sk)' : 'var(--sk-2)';
      const whoOf = cs => { const w = { gu: 0, sk: 0, ok: 0, na: 0, all: 0 }; ids.forEach(i => { const os = cs.map(C => X.cOut(0, C.j)[C.s][i]), k = os.filter(o => o === 3).length;
        w[os.includes(2) ? 'gu' : k ? 'sk' : os.some(o => o === 0 || o === 1) ? 'ok' : 'na']++; if (cs.length && k === cs.length) w.all++; }); return w; };
      const lineG = v => v / n >= .18, lineK = v => v / n >= .29;
      const tile = (gu, sk, nb) => nb ? 'na-fill' : lineG(gu) ? 'm-bad' : lineK(sk) ? 'm-watch' : gu + sk ? (gu >= sk ? 'm-bad2' : 'm-watch2') : 'm-good';
      const bar6 = (L, v, col, word) => v ? L && L.segs.length === 1 && L.segs[0][0] === P(v) && L.segs[0][1] === col && L.txt.includes(`>${v}</b> ${word}`) : L && !L.segs.length && L.txt.includes(`nobody ${word}`);
      const fun9 = (h, t) => { const l = lanes(h), r = n - t[4], tr = r - t[3], ok = t[0] + t[1], has = (L, w, c) => L.segs.some(x => x[0] === P(w) && x[1] === c);
        return l.length === 3 && has(l[0], r, 'var(--f9-a)') && (!t[4] || has(l[0], t[4], 'var(--na-fill)')) && has(l[1], tr, 'var(--f9-a)') && (!t[3] || has(l[1], t[3], kc(t))) && has(l[2], ok, 'var(--ok-fill)') && (!t[2] || has(l[2], t[2], gc(t)))
          && l[0].txt.startsWith(`${r} got to it`) && l[1].txt.startsWith(`${tr} tried it`) && l[2].txt.startsWith(`${ok} got it right`) && (!t[3] || l[1].txt.includes(`>${t[3]}</b> skipped`)) && (!t[2] || l[2].txt.includes(`>${t[2]}</b> gave up`)); };
      const ringNum = h => ((h.match(/<text x="[\d.]+" y="[\d.]+" text-anchor="middle"(?: class="(\w+)")?>(\d*)<\/text>/) || []).slice(1));
      Qs.forEach(C => { const t = cnt(C), k = 'c' + key(C), a = r6.get(k) || '', b = r7.get(k) || '', c = r9.get(k) || '', nb = t[4] === n;
        const l6 = lanes(a), ok6 = nb || bar6(l6[0], t[2], gc(t), 'gave up') && bar6(l6[1], t[3], kc(t), 'skipped');
        const [rc, rn] = ringNum(b), big = t[2] + t[3], ok7 = nb || ((big ? +rn === big && (rc || '') === (st(t) ? 'bad' : sk(t) ? 'watch' : '') : rn === undefined) && b.includes('<span class="b6x"></span>'));   // a question's ring stands alone
        const ok9 = nb || fun9(c, t);
        if (!ok6 || !ok7 || !ok9) w8.push(`${C.nm}: ${[!ok6 && 'v6 bars', !ok7 && 'v7 ring', !ok9 && 'v9 funnel'].filter(Boolean).join(', ')}`); });
      [...Js.map(J => ['j' + J.j, J.J.n, J.cs]), ...Us.map(U => ['u' + U.u, U.U.nb, U.subs.flatMap(J => J.cs)])].forEach(([k, nm, cs]) => { const r = roll(cs), a = r6.get(k) || '', b = r7.get(k) || '', c = r9.get(k) || '', l6 = lanes(a);
        const ok6 = (!r.gu || bar6(l6[0], r.gu.t[2], gc(r.gu.t), 'gave up') && (l6[0].txt + '<').includes(`· ${r.gu.C.nm}<`)) && (!r.kp || bar6(l6[1], r.kp.t[3], kc(r.kp.t), 'skipped') && (l6[1].txt + '<').includes(`· ${r.kp.C.nm}<`));
        const w = whoOf(cs), big = w.gu + w.sk, [rc, rn] = ringNum(b), ok7 = (big ? +rn === big && (rc || '') === (lineG(w.gu) ? 'bad' : lineK(w.sk) ? 'watch' : '') : rn === undefined)
          && b.includes(`<span class="b6x">${w.na === n ? 'Nobody has reached it yet' : r.w ? `<span class="b6q">${r.w.C.nm}</span>` : ''}</span>`) && w.gu + w.sk + w.ok + w.na === n;   // beside a lesson's ring, only its worst question
        const ok9 = !r.w || c.includes(`Worst question: ${r.w.C.nm}<`) && fun9(c, r.w.t);
        if (!ok6 || !ok7 || !ok9) w8.push(`${nm}: ${[!ok6 && 'v6 bars', !ok7 && 'v7 ring', !ok9 && 'v9 funnel'].filter(Boolean).join(', ')}`); });
      check('js/atlas.js', 'on v6, v7 and v9 each question is drawn from its own students (two bars on a track of the whole class, a ring of the class counting who gave up or skipped, with no number when nobody did, a funnel of got to it, tried it and got it right), strong red and amber only past the page\'s lines, and each lesson and unit by its worst question (v6, v9) or by its students, each once at their worst (v7, the ring alone on a question and only the worst question, under one heading, beside a lesson\'s), all recounted from the students\' results',
        !w8.length && marked && r6.size === Qs.length + Js.length + Us.length, `${w8.slice(0, 3).join('; ')} · ${r6.size} rows of ${Qs.length + Js.length + Us.length}${marked ? '' : ' · a worst question without its format'}`);
      // v8 and v10: one chart a page. Each lesson in course order with the most who gave up and the most who skipped on one of its questions (v8),
      // or its tile coloured by its stall points and often skipped questions with the most who gave up or skipped one (v10); a lesson opens to
      // every one of its questions, once each, with the way back; the worst questions are drawn the same way
      const hits = h => [...h.matchAll(/<g class="hit" data-act="(v8oj|v8c)" data-j="(\d+)"(?: data-s="(\d+)")? tabindex="0" role="button" aria-label="([^"]*)"[^>]*>([^]*?)<\/g>/g)].map(m => ({ act: m[1], k: m[1] === 'v8c' ? m[2] + ':' + m[3] : m[2], aria: m[4], body: m[5] }));
      const w10 = [], PH = 180, hOf = v => Math.round(v / n * PH * 10) / 10;
      const colOk = (body, v, col) => !v || [...body.matchAll(/<rect x="[\d.-]+" y="([\d.-]+)" width="[\d.]+" height="([\d.]+)" rx="1.5" style="fill:([^"]+)"\/>/g)].some(m => Math.abs(+m[2] - hOf(v)) <= .11 && m[3] === col);
      const unitSec = h => h.slice(h.indexOf('id="pv-sp-unit"')), worstSec = h => h.slice(h.indexOf('id="pv-sp-worst"'), h.indexOf('id="pv-sp-unit"'));
      const lessonsOf = h => hits(unitSec(h)).filter(x => x.act === 'v8oj'), questionsOf = (h, w) => hits(w ? worstSec(h) : unitSec(h)).filter(x => x.act === 'v8c');
      openAll(); const c8 = draw('8', 'outline', null), m10 = draw('10', 'outline', null), l8 = lessonsOf(c8), l10 = lessonsOf(m10);
      if (l8.map(x => x.k).join() !== Js.map(J => J.j).join() || l10.map(x => x.k).join() !== Js.map(J => J.j).join()) w10.push('lessons in course order');
      Js.forEach((J, x) => { const r = roll(J.cs), g = r.gu ? r.gu.t[2] : 0, k = r.kp ? r.kp.t[3] : 0, A = l8[x] || { aria: '', body: '' }, B = l10[x] || { aria: '', body: '' }, w = r.w ? r.w.t[2] + r.w.t[3] : 0, stt = r.na === J.cs.length ? 'na' : r.st ? 'bad' : r.sk ? 'watch' : 'good';
        if (!A.aria.endsWith(`at most ${g} gave up and ${k} skipped on one question`) || !colOk(A.body, g, r.gu ? gc(r.gu.t) : '') || !colOk(A.body, k, r.kp ? kc(r.kp.t) : '')) w10.push('v8 ' + J.J.s);
        const ws = whoOf(J.cs);
        if (!B.aria.endsWith(`${ws.gu + ws.sk} gave up on or skipped something there: ${ws.gu} gave up on something, ${ws.sk} skipped something`) || !B.body.includes(`fill:var(--${tile(ws.gu, ws.sk, ws.na === n)})`) || (ws.gu + ws.sk ? !B.body.includes(`>${ws.gu + ws.sk}</text>`) : />\d+<\/text>/.test(B.body.replace(/>[\d.]+<\/text>/, '')))) w10.push('v10 ' + J.J.s);
        X.S.v8.oj = { 0: J.j }; ['8', '10'].forEach(v => { const h = draw(v, 'outline', null), q = questionsOf(h), want = J.cs.map(key);
          if (!h.includes('data-act="v8oj" data-j="">All lessons<') || !h.includes(`<b>${J.J.n}</b>`) || q.map(o => o.k).join() !== want.join() || q.some(o => { const t = cnt(byK.get(o.k)); return !o.aria.endsWith(`${t[2]} gave up, ${t[3]} skipped`) || (v === '8' ? !colOk(o.body, t[2], gc(t)) || !colOk(o.body, t[3], kc(t)) : !o.body.includes(`fill:var(--${tile(t[2], t[3], t[4] === n)})`)); })) w10.push(`v${v} ${J.J.s} opened`); }); });
      X.S.v8.oj = {}; ['8', '10'].forEach(v => { const q = questionsOf(draw(v, 'worst', null), true); if (!q.length || q.some(o => { const t = cnt(byK.get(o.k)); return !o.aria.endsWith(`${t[2]} gave up, ${t[3]} skipped`); })) w10.push(`v${v} worst`); });
      check('js/atlas.js', 'on v8 each lesson in course order has a red column for the most who gave up on one of its questions and an amber one for the most who skipped one, to scale and strong only past the page\'s lines; on v10 each lesson\'s tile counts its students who gave up on or skipped something there, each once, strong past the page\'s lines, pale below and green with no number when nobody did, and each question\'s tile likewise; on both a lesson opens to every one of its questions, once each, with the way back',
        !w10.length, w10.slice(0, 4).join('; '));
      X.S.v8.ver = 'now'; X.S.v8.view = 'worst'; X.S.stu = null;
    }
    check('js/atlas.js', 'the versions\' marks keep to class names of their own, v4\'s grid is drawn at its own size and never stretched, and nothing in them is set under 12px',
      !/class="hg |\.hg\{|\.dv \.dl|\.dt \.ln|class="(?:dl|dr|dn|ln)"/.test(atlasJs.slice(atlasJs.indexOf('/* ---------- Stall points, five other versions'), atlasJs.indexOf('/* ---------- view 10: fade slopes'))) && !/^\.hg\{/m.test(atlas)
      && /<svg class="viz gr8" width="\$\{L\+gw\+R\}" height="\$\{H\}" viewBox="0 0 \$\{L\+gw\+R\} \$\{H\}"/.test(atlasJs) && /\.duo \.viz\.gr8\{width:auto;max-width:100%\}/.test(atlas));
  }
  // a followed student on the Skills page's By unit view, as Stall points shows one (asked 2026-10-23): a mark on a skill, counts on a unit or subunit
  check('js/atlas.js', 'on By unit a followed student has a column as on Stall points, in the class key\'s own colours: on a skill the square of their level, on a subunit or unit how many of its skills they have not mastered by group, each group\'s square split between its two levels\' colours (a skill once), never a mark a skill',
    /const cnt5=\(i,ks\)=>\{const c=\{E:0,H:0\},seen=new Set\(\);/.test(atlasJs) && /const smR5=\(i,ks\)=>\{const c=cnt5\(i,ks\);return \(c\.E\?`<span class="pmn">\$\{gsw\('E'\)\}\$\{c\.E\}<\/span>`:''\)\+\(c\.H\?`<span class="pmn">\$\{gsw\('H'\)\}\$\{c\.H\}<\/span>`:''\)\};/.test(atlasJs)
      && /return c==='F'\|\|c==='H'\|\|c==='E'\?lsw\(lvOf\(m\.c\)\):''/.test(atlasJs) && !/class="sd |\.sd\{/.test(atlasJs + atlas)
      && /\$\{one\?smk5\(sel,ks\):smR5\(sel,ks\)\}/.test(atlasJs) && /\$\{sc\(\[K\],true\)\}/.test(atlasJs) && /\.hc\.fol \.hr\{grid-template-columns:minmax\(0,min\(40%,460px\)\) minmax\(120px,1fr\) 84px 80px\}/.test(atlas));
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#hardest', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/example.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let bu = null;
    try { vm.runInContext(atlasJs.replace(boot, 'globalThis.BU_TEST={S,v6list,v7,WEAK,hard5,mast,lvOf,LV,lvAll5,ALL,NM,lsw,gsw};'), ctx, { filename: 'js/atlas.js' }); bu = ctx.BU_TEST; } catch (e) { check('js/atlas.js', 'By unit runs on the page\'s own code', false, e.message); }
    if (bu) { const bad = []; let rowsN = 0;
      // every student followed, the outline opened down to its skills: each row's marks read off the drawing against the levels the page has
      const H = bu.hard5(0), E = bu.S.v6.ex[0] = { U: [], J: [] }, { us, js } = bu.lvAll5(0); E.U = us.slice(); E.J = js.slice();
      bu.ALL.forEach(i => { bu.S.stu = i; const h = bu.v6list(0), cnt = ks => { const c = { E: 0, H: 0 }, seen = new Set(); ks.forEach(K => { if (K.p === null || seen.has(K.k)) return; seen.add(K.k); const m = bu.mast(i, K.k); if (m && c[m.cat] !== undefined) c[m.cat]++; }); return c; };
        const want = r => `${r.E ? `<span class="pmn">${bu.gsw('E')}${r.E}</span>` : ''}${r.H ? `<span class="pmn">${bu.gsw('H')}${r.H}</span>` : ''}`;
        const marks = [...h.replace(/<li class="hh"[^]*?<\/li>/, '').matchAll(/<span class="hs">((?:(?!<span class="sr">|<\/span><\/button>)[^])*)/g)].map(m => m[1]);   // the rows, not the column's heading
        const exp = []; H.T.filter(U => U.on).forEach(U => { exp.push(want(cnt(U.subs.flatMap(J => J.ks)))); U.subs.filter(J => J.on && J.ks.length).forEach(J => { exp.push(want(cnt(J.ks))); J.ks.forEach(K => { const m = K.p === null ? null : bu.mast(i, K.k), c = m ? m.cat : 'N'; exp.push(c === 'F' || c === 'H' || c === 'E' ? bu.lsw(bu.lvOf(m.c)) : ''); }); }); });
        rowsN += exp.length; if (marks.length < exp.length || exp.some(v => !marks.includes(v))) bad.push(bu.NM[i]);
        if (/(<i class="sw lv"[^>]*><\/i>){2}/.test(h.replace(/<div class="legend[^]*?<\/div>/, ''))) bad.push(bu.NM[i] + ': a mark a skill'); });
      bu.S.stu = null;
      check('js/atlas.js', 'with every student followed, By unit opened down to its skills draws on each unit and subunit the counts of its distinct not-mastered skills by group, on each skill the square of their level, and nowhere two marks side by side', !bad.length && rowsN > 0, `${bad.slice(0, 4).join('; ')} · ${rowsN} rows`);
      // the class now on a skill's panel (asked 2026-10-23: as a picked day's bar): every skill By unit can pick, and every weak skill, read off the bar's own counts
      const bad2 = []; let bars = 0; const want = k => { const c = [0, 0, 0, 0, 0], u = [0]; bu.ALL.forEach(i => { const m = bu.mast(i, k); if (m && m.ev >= 2 && m.c !== null) c[bu.lvOf(m.c)]++; else u[0]++; }); return [4, 3, 2, 1, 0].filter(b => c[b]).map(b => `${c[b]} ${bu.LV[b].toLowerCase()}`).concat(u[0] ? [`${u[0]} unavailable`] : []).join(', '); };
      const read = h => { const m = h.match(/<div class="sbs"><div class="sbrow"><p class="sbl"><b>The class now<\/b> · (\d+)% of the (\d+) with a level have mastered it<\/p><span class="sb" role="img" aria-label="([^"]+)">/); return m ? m[3] : null; };
      H.T.forEach(U => U.subs.forEach(J => J.ks.forEach(K => { if (K.p === null) return; bu.S.v6.sel[0] = K.k; const got = read(bu.v6list(0)); bars++; if (got !== want(K.k)) bad2.push(`by unit ${K.k}: ${got}`); })));
      bu.WEAK.forEach((m, r) => { bu.S.v7.r = r; bu.S.v7.pts = []; bu.S.v7.more = true; const got = read(bu.v7()); bars++; if (got !== want(m.k)) bad2.push(`weak ${m.k}: ${got}`); }); bu.S.v7.more = false;
      check('js/atlas.js', 'a skill\'s panel on Weak now and By unit draws the class now as a picked day is drawn: one bar of every student by level with the counts in it, mastered first, then unavailable, under the share mastered, with its key; the thin bar and its line of counts are gone',
        !bad2.length && bars > 0 && /const nowBar=k=>/.test(atlasJs) && /\$\{nowBar\(m\.k\)\}/.test(atlasJs) && /nowBar\(k0\)/.test(atlasJs) && !/The class now<\/span>\$\{hbar/.test(atlasJs) && !/\.evs\{|\.ev\{/.test(atlas), `${bad2.slice(0, 4).join('; ')} · ${bars} panels`); }
  }
  // a skill's students and questions as one table, ALPS's results table, in a dialog (asked 2026-10-23): it takes the place of the name lists on the Skills page's panels
  check('js/atlas.js', 'each view of the Skills page opens a skill\'s table from its panel, and the panels no longer list the students: the table names them, with the level and score behind each, their last activity, and ALPS\'s result a question, in ALPS\'s own labels, with no trend and no tried column',
    (atlasJs.match(/\$\{tblGo\((m\.k,'weak'|k0,'unit'|k,'faded')\)\}/g) || []).length === 3 && !/whoCol\('Beginning or attempted'|whoCol\('Slipped 20\+ points'|whoCol\(`Weak around/.test(atlasJs) && !/\bmNow\b|\bmThen\b/.test(atlasJs)
      && /\$\{sh\('name','Student',/.test(atlasJs) && /\$\{C\.cols\.map\(\(c,y\)=>sh\('lv'\+y,c\.lab,/.test(atlasJs) && /cols:\[\{k,d:LASTDAY,lab:'Level'\}\]/.test(atlasJs) && /\$\{sh\('last','Last activity',/.test(atlasJs) && !/sh\('tried'|sh\('trend'|tblSpark/.test(atlasJs)
      && /const RS=\{c1:'Correct on first attempt',cr:'Correct after retries',rr:'Rapid retries: all retries within 3 seconds',nc:'Not yet correct',ns:'Not started'\};/.test(atlasJs)
      && /const rsOf=a=>!a\?'ns':a\[9\]===1\?'c1':a\[4\]\?\(a\[7\]-a\[10\]<=3\?'rr':'cr'\):'nc';/.test(atlasJs) && /<th scope="row" class="c-stu">Not yet correct<\/th>/.test(atlasJs)
      && (sec => !!sec && !/Got it wrong|Right first time|Needed retries|Not tried|No level yet|Last tried/.test(sec))((atlasJs.match(/\/\* ---------- a skill's table: every student by question, in a dialog ----------[^]*?\n\/\* ---------- view 11/) || [])[0])
      && /<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt" tabindex="-1">/.test(atlasJs) && /if\(S\.tbl&&e\.key==='Escape'\)\{closeTbl\(\);return\}/.test(atlasJs) && /if\(S\.tbl&&e\.key==='Tab'\)\{/.test(atlasJs) && /function go\(k\)\{k=toPage\(k\);S\.tbl=null;/.test(atlasJs)
      && /<div id="dlg" class="dlg-wrap" hidden><\/div>/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')) && /\.dlg-wrap\{position:fixed;inset:0;/.test(atlas) && /html\.dlg-on,html\.dlg-on body\{overflow:hidden\}/.test(atlas) && /\.sktbl \.c-stu\{position:sticky;left:0;/.test(atlas));
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const runT = search => {
      const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
      const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
        location: { search, hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
      ['data/class.js', 'data/example.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
      vm.runInContext(atlasJs.replace(boot, 'globalThis.TB_TEST={S,tblHTML,tblGo,openTbl,ptSel,ptGroups,STW,BE,estOf,KIT,IWHO,N,CAT,CUR,EV,MT,ML,LV,lvOf,credit,AT,WEAK,FD,SG,fadeKind,hard5,NM,ASK,ALL,NBC,v7,v6list,v10,dayDate};'), ctx, { filename: 'js/atlas.js' });
      return ctx.TB_TEST;
    };
    // every skill the page lists, read off the table the page draws: the questions, the rows, each level and score, each mark, the counts, the order
    const tableOK = search => { const X = runT(search), H = X.hard5(0), bad = [];
      const ks = [...new Set(X.WEAK.map(m => m.k).concat(H.T.flatMap(U => U.subs.flatMap(J => J.ks.map(K => K.k))), X.FD.map(o => o.k)))].filter(k => X.KIT[k].some(ix => X.IWHO[ix].length));
      let marks = 0, tables = 0; const seen = {};
      ks.forEach(k => { const cls = X.KIT[k].filter(ix => X.IWHO[ix].length >= X.N / 4), any = X.KIT[k].filter(ix => X.IWHO[ix].length > 0);
        if (!X.tblGo(k, 'unit').includes('data-act="tblopen"')) bad.push(X.ASK[k] + ': no way in');
        [false, true].forEach(all => { const want = all ? any : cls; if (!want.length) return;
          X.S.tbl = { k, from: 'unit', P: null, f: 'all', s: 'lv0', s0: 'lv0', dir: 1, q: null, all }; const h = X.tblHTML(); tables++;
          if (/undefined|NaN/.test(h)) { bad.push(X.ASK[k] + ': undefined'); return; }
          if (/ then"|class="thn"/.test(h)) bad.push(X.ASK[k] + ': a band with one day');
          // the columns, in the table's own order (by lesson), are exactly the questions it should show
          const qs = [...h.matchAll(/<button class="qh" type="button" data-act="tblq" data-id="(\d+)"/g)].map(m => +m[1]);
          if (qs.length !== want.length || !want.every(ix => qs.includes(ix))) bad.push(`${X.ASK[k]}: ${qs.length} of ${want.length} questions`);
          const body = h.split('<tbody>')[1].split('</tbody>')[0], trs = body.split('<tr').slice(1), sum = trs[0], rows = trs.slice(1);
          if (rows.length !== X.N) bad.push(`${X.ASK[k]}: ${rows.length} rows`);
          const ids = rows.map(r => +(r.match(/data-act="stu" data-i="(\d+)"/) || [])[1]);
          ids.forEach((i, ri) => { const r = rows[ri], ev = X.EV[i][k], sc = X.CUR[i][k], lv = ev >= 2 && sc !== null ? X.lvOf(sc) : -1;
            const word = (r.match(/<span class="tlv[^"]*">(?:<svg[^]*?<\/svg>)<span>([^<]+)<\/span>/) || [])[1] || (/<span class="t3">Not started<\/span>/.test(r) ? 'Not started' : '?');
            const want = lv >= 0 ? X.LV[lv] : X.CAT[i][k] === 'Q' ? 'Unavailable' : 'Not started';
            if (word !== want || (lv >= 0 && !r.includes(`<span class="sc">${Math.round(sc * 100)}%</span>`))) bad.push(`${X.ASK[k]} · ${X.NM[i]}: ${word}`);
            if (/class="slip"/.test(r) !== (X.ML[i][k] !== null && X.MT[i][k] - X.ML[i][k] >= .2)) bad.push(`${X.ASK[k]} · ${X.NM[i]}: slip`);
            const got = [...r.matchAll(/<td class="q[^"]*"[^>]*><span class="rs" role="img" aria-label="([^"]+)">/g)].map(m => m[1].replace(/, (full|half|a quarter|no) credit$/, ''));
            const exp = qs.map(ix => { const a = X.AT[i].get(ix); return !a ? 'Not started' : a[9] === 1 ? 'Correct on first attempt' : a[4] ? (a[7] - a[10] <= 3 ? 'Rapid retries: all retries within 3 seconds' : 'Correct after retries') : 'Not yet correct'; });
            marks += exp.filter(v => v !== 'Not started').length; exp.forEach(v => { seen[v] = (seen[v] || 0) + 1; }); if (got.join() !== exp.join()) bad.push(`${X.ASK[k]} · ${X.NM[i]}: marks`); });
          // weakest first, with no level yet last; the first row counts who got each question wrong
          const key = i => { const ev = X.EV[i][k], sc = X.CUR[i][k]; return ev >= 2 && sc !== null ? sc : 9; };
          if (!ids.every((i, n) => !n || key(ids[n - 1]) <= key(i))) bad.push(X.ASK[k] + ': order');
          const wrong = [...sum.matchAll(/<td class="q[^"]*"[^>]*>(?:<b class="gw">(\d+)<\/b>|<span class="t3">0<\/span>)/g)].map(m => +(m[1] || 0));
          if (!/<th scope="row" class="c-stu">Not yet correct<\/th>/.test(sum) || wrong.join() !== qs.map(ix => ids.filter(i => { const a = X.AT[i].get(ix); return a && !a[4]; }).length).join()) bad.push(X.ASK[k] + ': not yet correct row');
          // each group shows just its students, and says how many
          const nolv = i => !(X.EV[i][k] >= 2 && X.CUR[i][k] !== null);
          [['E', i => X.EV[i][k] >= 2 && X.CAT[i][k] === 'E'], ['sl', i => X.ML[i][k] !== null && X.MT[i][k] - X.ML[i][k] >= .2], ['Q', i => nolv(i) && X.CAT[i][k] === 'Q'], ['N', i => nolv(i) && X.CAT[i][k] !== 'Q']].forEach(([g, f]) => { const n = X.ALL.filter(f).length; if (!n) return;
            X.S.tbl.f = g; const hg = X.tblHTML(), rg = hg.split('<tbody>')[1].split('<tr').length - 2; if (rg !== n || !hg.includes(` · ${n}</button>`)) bad.push(`${X.ASK[k]}: group ${g} ${rg} of ${n}`); }); }); });
      // it opens on the students the view is about (beginning or attempted on a skill still weak or getting worse, those who slipped on a faded one), or on everyone
      X.WEAK.forEach(m => { X.openTbl(m.k, 'weak'); const want = X.SG[m.st] === 'p' && X.ALL.some(i => X.EV[i][m.k] >= 2 && X.CAT[i][m.k] === 'E') ? 'E' : 'all'; if (X.S.tbl.f !== want) bad.push(`${X.ASK[m.k]}: opens on ${X.S.tbl.f}`); });
      X.FD.forEach(o => { X.openTbl(o.k, 'faded'); const want = X.fadeKind(o.d) === 'fade' && X.ALL.some(i => X.ML[i][o.k] !== null && X.MT[i][o.k] - X.ML[i][o.k] >= .2) ? 'sl' : 'all'; if (X.S.tbl.f !== want) bad.push(`${X.ASK[o.k]} (faded): opens on ${X.S.tbl.f}`); });
      // a point's table, on every weak skill: one day (the first its line has, a middle one, the last), two days (the first and the last), and the
      // last day on this skill and the next one. Each level is the one the line has for that day, each mark the attempt made by then, each group the panel's
      const RSW = a => !a ? 'Not started' : a[9] === 1 ? 'Correct on first attempt' : a[4] ? (a[7] - a[10] <= 3 ? 'Rapid retries: all retries within 3 seconds' : 'Correct after retries') : 'Not yet correct';
      const lvWord = (i, k, j) => { const v = X.STW[i][k][j]; if (v >= 0) return X.LV[v]; const e = X.estOf(i, k, X.BE(j)); return e && e.ev === 1 ? 'Unavailable' : 'Not started'; };
      let points = 0, actions = 0, bands = 0;
      const ptTable = (pts, name) => { X.S.v7.pts = pts; X.S.v7.r = pts[pts.length - 1].r; X.S.v7.more = true; /* as a click does: the row picked, its panel shown */ const P = X.ptSel(); if (!P) return; const pv = X.v7(); if (/class="roster/.test(pv)) bad.push(name + ': names in the panel'); if (/Unavailable · /.test(pv) || (P.kind !== 'skills' && /class="ag"/.test(pv))) bad.push(name + ': repeats the bars'); X.S.tbl = { k: P.m ? P.m.k : P.m1.k, from: 'pt', P, f: 'all', s: 'lv0', s0: 'lv0', dir: 1, q: null, all: false };
        const h = X.tblHTML(); tables++; points++; if (/undefined|NaN/.test(h)) { bad.push(name + ': undefined'); return; }
        const ks = P.kind === 'skills' ? [P.m1.k, P.m2.k] : [P.m.k], cols = P.kind === 'skills' ? ks.map(k => [k, P.j]) : P.kind === 'time' ? [[ks[0], P.a], [ks[0], P.b]] : [[ks[0], P.j]], d = X.BE(cols[cols.length - 1][1]);
        // the questions: each skill's that a quarter of the class had started by the day, the second skill's without the first's
        const seenQ = new Set(), want = ks.flatMap(k => X.KIT[k].filter(ix => X.IWHO[ix].filter(i => X.AT[i].get(ix)[6] <= d).length >= X.N / 4 && !seenQ.has(ix) && seenQ.add(ix)));
        const qs = [...h.matchAll(/<button class="qh" type="button" data-act="tblq" data-id="(\d+)"/g)].map(m => +m[1]);
        if (qs.length !== want.length || !want.every(ix => qs.includes(ix))) bad.push(`${name}: ${qs.length} of ${want.length} questions`);
        h.split('<tbody>')[1].split('</tbody>')[0].split('<tr').slice(2).forEach(r => { const i = +(r.match(/data-act="stu" data-i="(\d+)"/) || [])[1];
          const words = [...r.matchAll(/<span class="tlv[^"]*">(?:<svg[^]*?<\/svg>)<span>([^<]+)<\/span>|<span class="t3">(Not started)<\/span>/g)].map(m => m[1] || m[2]);
          if (words.join() !== cols.map(([k, j]) => lvWord(i, k, j)).join()) bad.push(`${name} · ${X.NM[i]}: ${words.join('/')}`);
          const got = [...r.matchAll(/<td class="q[^"]*"[^>]*><span class="rs" role="img" aria-label="([^"]+)">/g)].map(m => m[1].replace(/, started by [^,]+$/, '').replace(/, (full|half|a quarter|no) credit$/, '')), exp = qs.map(ix => { const a = X.AT[i].get(ix); return RSW(a && a[6] <= d ? a : null); });
          if (got.join() !== exp.join()) bad.push(`${name} · ${X.NM[i]}: marks`);
          const d0 = P.kind === 'time' ? X.BE(P.a) : null, band = [...r.matchAll(/<td class="q([^"]*)" data-act="tblq"/g)].map(m => / then\b/.test(m[1]) ? 1 : 0).join(''),
            want = qs.map(ix => { const a = X.AT[i].get(ix); return d0 !== null && a && a[6] <= d0 ? 1 : 0; }).join('');
          if (band !== want) bad.push(`${name} · ${X.NM[i]}: band`); bands += (want.match(/1/g) || []).length; });
        if (P.kind === 'time' ? !h.includes(`<span class="thn"></span>Started by ${X.dayDate(X.BE(P.a))}</span>`) : /class="thn"/.test(h)) bad.push(name + ': the band\'s key');
        // each of the panel's groups, with its count, shows just its students
        const G = X.ptGroups(P), gs = P.kind === 'one' ? { ny: G.ny, dev: G.dev, sec: G.sec } : P.kind === 'time' ? { lost: G.lost, re: G.never.concat(G.fell), dev: G.dev, got: G.got, held: G.held } : { both: G.both, one: G.one, two: G.two };
        Object.entries(gs).forEach(([g, names]) => { if (!names.length) return; X.S.tbl.f = g; const hg = X.tblHTML(), ns = [...hg.split('<tbody>')[1].matchAll(/data-act="stu" data-i="(\d+)"/g)].map(m => X.NM[+m[1]]);
          if (ns.length !== names.length || !names.every(n => ns.includes(n)) || !hg.includes(` · ${names.length}</button>`)) bad.push(`${name}: group ${g}`); });
        // the actions, on today's lists: a group for the students beginning or attempted, unless they are half of those checked or more; never a reteach
        if (/>Reteach|Reteach planned|data-act="v7plan"/.test(pv + h)) bad.push(name + ': a reteach');
        if ((P.kind === 'time' ? P.b : P.j) === X.NBC - 1 && P.kind !== 'skills') { actions++; const g = P.kind === 'one' ? 'ny' : 're', who = gs[g];
          const want = who.length > 0 && (P.kind === 'time' || who.length < (G.ny.length + G.dev.length + G.sec.length) / 2), btn = new RegExp(`data-act="v7act" data-g="${g}"[^>]*>Form a group</button>`);
          if (btn.test(pv) !== want) bad.push(`${name}: the group's button ${want ? 'missing' : 'shown'}`); } };
      X.WEAK.forEach((m, r) => { const js = m.sv.map((v, j) => v === null ? -1 : j).filter(j => j >= 0); if (!js.length) return; const nm = X.ASK[m.k];
        [js[0], js[js.length >> 1], js[js.length - 1]].forEach(j => ptTable([{ r, j }], `${nm} on ${j}`));
        if (js.length > 1) ptTable([{ r, j: js[0] }, { r, j: js[js.length - 1] }], `${nm} from ${js[0]} to ${js[js.length - 1]}`);
        const r2 = (r + 1) % X.WEAK.length, j2 = js[js.length - 1]; if (r2 !== r && X.WEAK[r2].sv[j2] !== null) ptTable([{ r, j: j2 }, { r: r2, j: j2 }], `${nm} and ${X.ASK[X.WEAK[r2].k]}`); });
      X.S.v7.pts = []; X.S.v7.r = 0; X.S.v7.more = false; X.S.tbl = null; return { bad, tables, marks, skills: ks.length, seen, points, actions, bands }; };
    let t1, t2;
    try { t1 = tableOK(''); t2 = tableOK('?books'); } catch (e) { check('js/atlas.js', 'the skill\'s table runs on the page\'s own code', false, e.message); }
    if (t1) check('js/atlas.js', 'on every skill the Skills page lists, with and without the example\'s books, and on points picked on every weak skill\'s line (one day, two days, two skills), the table shows the questions a quarter of the class started (or, ticked, every one anybody started), a row a student weakest first, each level and score as the page has them, the slip arrow exactly when the score fell 20 points since taught, each mark ALPS\'s result on that attempt (correct on first attempt, correct after retries, rapid retries when the retries took three seconds or less, not yet correct, not started), the first row the count not yet correct, each group just its students, and it opens on the group the view is about, or on everyone; a point\'s table has the level the line has for its day (a column a day, or a skill), the marks of the attempts made by then, and the panel\'s groups; with two days on one skill, a band behind exactly the questions each student had started by the earlier day, keyed "Started by" that day, and no band on one day',
      !t1.bad.length && !t2.bad.length && t1.tables > 0 && t2.tables > 0 && t1.points > 0 && t2.points > 0 && t1.actions > 0 && t1.bands > 0 && ['Correct on first attempt', 'Correct after retries', 'Rapid retries: all retries within 3 seconds', 'Not yet correct', 'Not started'].every(v => t1.seen[v] > 0), `${t1.bad.concat(t2.bad).slice(0, 4).join('; ')} · ${t1.skills + t2.skills} skills, ${t1.tables + t2.tables} tables (${t1.points + t2.points} for points, ${t1.actions + t2.actions} with today's actions), ${t1.marks + t2.marks} marks, ${t1.bands + t2.bands} banded`);
  }
  check('js/atlas.js', 'my actions opens on the log; then every set the class was given that can be judged, and the targeted ones, on the chart, and the rest listed with why', /const prog=`\$\{chd\(`My actions today<span class="pill">\$\{S\.log\.length\}<\/span>`\)\}\$\{lg\}`;/.test(atlasJs) && /return `<section class="mcard" id="log">\$\{prog\}<\/section>`\+mcard\(sets\+waiting\)\}/.test(atlasJs) && /s:'My actions'/.test(atlasJs)
    && /shown=all\.filter\(o=>o\.d\.est!==null\|\|o\.d\.kind==='targeted'\)/.test(atlasJs) && /fold\('v12wait',`Too early to tell · \$\{wait\.length\} \$\{shown\.length\?'more ':''\}\$\{pl\(wait\.length,'set'\)\}`/.test(atlasJs) && !/Can’t be judged/.test(atlasJs) && /kind:'assigned',did:c\.done\.slice\(\),own:new Set\(c\.items\),day:c\.due/.test(atlasJs));
  // students are listed to be scanned, not as chips: one list everywhere, a row a student, alphabetical, in columns, with the number behind a place
  check('js/atlas.js', 'every list of students is one list: a row a student in alphabetical order, in columns once it is long, the number behind each place at the right under a short caption, and no chips left on any page',
    /const roster=\(rows,o\)=>\{/.test(atlasJs) && /\.sort\(\(a,b\)=>a\.n\.localeCompare\(b\.n\)\)/.test(atlasJs) && /<ul class="roster\$\{rs\.length>6&&o\.cols!==false\?' cols':''\}">/.test(atlasJs) && /const names=\(a,val\)=>roster\(/.test(atlasJs)
      && /const gcap=E\.sel\.t==='u'\?'key skills mastered':E\.sel\.t==='j'\?'skills mastered':'score';/.test(atlasJs) && /rcap\(g==='stuck'\?gcap:'questions tried'\)/.test(atlasJs) && /E\.sel\.t==='k'\?Math\.round\(c\.st\.f\*100\)\+'%'/.test(atlasJs) && /rcap\('questions tried, of their normal'\)/.test(atlasJs) && /\{rm:\['v11rm',key\]\}/.test(atlasJs)
      && !/class="names|class="fl-names|class="chipx|<span class="gn">/.test(atlasJs) && !/\.names\{|\.fl-names\{|\.chipx|\.gn\{/.test(atlas) && /\.roster\.cols\{columns:150px/.test(atlas) && /\.dgrid\{display:grid;grid-template-columns:minmax\(0,1fr\)/.test(atlas));
  // ready for a unit has one other version to compare (v2), switched beside the unit and opened from the address; v1, v3 and v4 are gone
  check('js/atlas.js', 'ready for a unit offers the current tree and a radial version of it with the same rings, links, key and plan, switched in one select beside the unit, opened with ?rv=2, with its own "How to read" of fifty words or so',
    /const RDV=\[\['now','Current'\],\['2','v2 · Radial'\]\];/.test(atlasJs) && /\$\{pickCtl\('v11ver',S\.v11\.ver,RDV,'Version'\)\}/.test(atlasJs) && /const RV0=\(location\.search\.match\(\/\[\?&\]rv=\(2\)/.test(atlasJs)
      && /else if\(id==='v11ver'\)\{S\.v11\.ver=t\.value;/.test(atlasJs) && !/v11lane|rdLaneAct|class="lanes"|class="rdg"|class="gob"/.test(atlasJs) && /HOWK=k=>k===6\?HOWSK\(\):k===10&&S\.v11\.ver!=='now'&&RDHOW\[S\.v11\.ver\]/.test(atlasJs) && /if\(V==='2'\)s=rdTreeRadial\(/.test(atlasJs) && !/rdTreeLR|elbowH|Left to right|Weighted|Class split|LMOFF/.test(atlasJs) && !/V==='3'|V==='4'/.test(atlasJs.slice(atlasJs.indexOf('/* ---------- view 11 (Q10): readiness tree'), atlasJs.indexOf('/* ---------- view 12: my actions'))) && !/rdModel|tmSplit|class="otree"/.test(atlasJs)
      && (src => src.length === 1 && src.every(t => t.split(/\s+/).length <= 53))(((atlasJs.match(/const RDHOW=\{([^]*?)\};/) || [])[1] || '').split('\n').map(l => (l.match(/^\s*'\d':'(.*)',?$/) || [])[1]).filter(Boolean)));
  // every "How to read" is short enough to read in the time a first screen has: sixty words or fewer
  const howSrc = ((atlasJs.match(/const HOW=\[([^]*?)\];\n/) || [])[1] || ''), howLines = howSrc.split('\n').map(l => l.trim()).filter(l => l && !/^'',/.test(l));
  check('js/atlas.js', 'every "How to read" is fifty words or so, sixty for the grid', howLines.length === 9 && howLines.every((l, i) => l.split(/\s+/).length <= (i === 0 ? 60 : 53)), howLines.map(l => l.split(/\s+/).length).join(' '));
  check('css/atlas.css', 'a paired chart may be narrower than a lone one, and a rule runs between the pair', /\.duo \.viz\{min-width:0\}/.test(atlas) && /\.duo::before\{/.test(atlas));
}

require('./check-pace.js');

console.log('\nCHECKS');
shapes.forEach(l => console.log(l));
fails.forEach(l => console.log(l));
console.log(`\n${ran - failed} of ${ran} checks passed` + (failed ? ` · ${failed} FAILED` : ' · all sections, every scope'));
if (failed) process.exit(1);

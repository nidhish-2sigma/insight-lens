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
  ['--ct4', '--c4'], ['--ct3', '--c3'], ['--ft1', '--f1'], ['--ft2', '--f2'], ['--ft3', '--f3'], ['--ft4', '--f4'], ['--ft5', '--f5'], ['--on-mas', '--m-mas']].forEach(pair => {
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
  check('css/atlas.css', 'stacked bars use the red, amber and light green set that stays apart for red-green colour blindness', (av['--ok-fill'] || '').toUpperCase() === '#81C784' && /--hd-ny:var\(--red\)/.test(atlas) && /--hd-dv:var\(--amber\)/.test(atlas));
  check('css/atlas.css', 'mastery in the grid is one colour that only gets darker: not yet, developing, secure', (m => m.every(Boolean) && lum(m[0]) > lum(m[1]) && lum(m[1]) > lum(m[2]) && ratio(m[0], m[1]) >= 1.5 && ratio(m[1], m[2]) >= 1.5)([av['--ms-n'], av['--ms-d'], av['--ms-s']]), `${av['--ms-n']} ${av['--ms-d']} ${av['--ms-s']}`);
  // data/sample.js is the one place with invented numbers: it must say so, and the screen must mark every row that comes from it
  const sampleSrc = (() => { try { return fs.readFileSync(path.join(root, 'data/sample.js'), 'utf8'); } catch (e) { return null; } })();
  if (sampleSrc) {
    const w = {}; new Function('window', sampleSrc)(w); const iv = (w.ATLAS_SAMPLE || {}).interventions || [], script = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
    check('data/sample.js', 'the sample file says its numbers are invented', /INVENTED/.test(sampleSrc));
    check('data/sample.js', 'every sample row has an estimate inside its range', iv.length > 0 && iv.every(d => d.lo <= d.est && d.est <= d.hi));
    check('data/sample.js', 'every student a sample row names is in the class', iv.every(d => d.who === 'all' || d.who.every(n => A.students.includes(n))));
    check('js/atlas.js', 'rows from the sample file are marked as sample on screen', /sample:true/.test(script) && /· sample/.test(script) && /<span class=\\?"pill\\?">Sample<\/span>/.test(script));
  }
  check('index.html', 'the page loads the class export before the script', /data\/class\.js[^]*js\/atlas\.js/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
  // a chart is never stretched across a wide page: it is handed its width, and shares its row with the panel that explains it or with a second chart
  const atlasJs = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
  check('js/atlas.js', 'no chart takes the full page width by itself: each is drawn to the width it is handed', !/[,{(\s]W=VW\(\)/.test(atlasJs));
  check('js/atlas.js', 'every chart view pairs its chart with a panel, and the pace view is two charts side by side', (atlasJs.match(/\bduo\(/g) || []).length >= 8 && /class="duo even"/.test(atlasJs));
  check('js/atlas.js', 'the fading view opens on the faded skills only, with a tick to show all, and with no skill picked', /v10:\{u:'all',all:false,k:-1/.test(atlasJs) && /id="v10all"/.test(atlasJs) && /if\(!rows\.some\(o=>o\.k===Z\.k\)\)Z\.k=-1/.test(atlasJs));
  check('js/atlas.js', 'the grid has a summary of each student and the class over time, and leaves unstarted columns empty', /function trendN\(/.test(atlasJs) && /const sum2=/.test(atlasJs) && !/fill="url\(#hatch\)" opacity="\.6"\/><\/g>`;return\}/.test(atlasJs));
  check('js/atlas.js', 'the overview shows the class\'s latest three units, not every started unit, and its headline and next step read the same ones',
    /const OVN=3,OVU=TAUGHT\.slice\(\)\.sort\(\(a,b\)=>TB0\[a\]\.mid-TB0\[b\]\.mid\)\.slice\(-OVN\)/.test(atlasJs) && /function ovStep\(i\)\{const n=NM\[i\],g=OVU\.map/.test(atlasJs) && /OVU\.some\(u=>cell2\(i,KS2\.u\(u\)\)\.g==='stuck'\)/.test(atlasJs) && !/\$\{TAUGHT\.map\(\(u,x\)=>/.test(atlasJs));
  // the lesson replay ("Attention now") is gone: no page, no rows in the export, nothing in the data file
  const exportSrc = fs.readFileSync(path.join(root, 'tools/export-atlas.py'), 'utf8');
  check('js/atlas.js', 'there is no lesson replay page, and nothing reads replay rows', !/s:'Attention now'/.test(atlasJs) && !/D\.replay|replayDay|LIVE\[/.test(atlasJs) && !/replay/.test(exportSrc) && A.replay === undefined && A.meta.replayDay === undefined);
  check('js/atlas.js', 'there is no item health page, and the export holds no first answers', !/s:'Item health'/.test(atlasJs) && !/D\.mc|function v9\(|S\.v9\b/.test(atlasJs) && !/\bmc\b/.test(exportSrc) && A.mc === undefined && A.items.every(it => !('ans' in it) && !('opts' in it)));
  check('js/atlas.js', 'a practice set still leaves out questions that are broken or misleading', /const okIt=it=>zone9\(it\)==='ok';/.test(atlasJs) && /use=bank\.filter\(okIt\)/.test(atlasJs));
  // the look follows Material UI: Roboto, a 4px corner, the elevation shadows, and selection in the primary colour
  check('css/atlas.css', 'the stylesheet follows Material UI: Roboto, 4px corners, elevation, selection in the primary colour',
    /--font:"Roboto"/.test(atlas) && /--radius:4px/.test(atlas) && /--e1:0 2px 1px -1px rgba\(0,0,0,\.2\)/.test(atlas) && /--accent:var\(--blue\)/.test(atlas) && /family=Roboto/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
  check('js/atlas.js', 'shared weak skills are drawn as pale areas with a thin line, not as solid bands', /style="fill:\$\{col\};opacity:\.16"\/><polyline/.test(atlasJs));
  // every page has one priority number, and that number is what the tabs, the overview's flags and the bar for a followed student show
  const priIds = ((atlasJs.match(/const PRI=\[([^;]*)\];/) || [])[1] || '').match(/\[(\d+),'/g) || [], priSet = priIds.map(t => +t.slice(1).split(',')[0]);
  check('js/atlas.js', 'every page has exactly one priority, 1 to 10', priSet.length === 10 && new Set(priSet).size === 10 && [0, 2, 3, 4, 5, 6, 7, 9, 10, 11].every(k => priSet.includes(k)), priSet.join(' '));
  check('js/atlas.js', 'the tabs, the overview\'s flags and the bar for a followed student show the priority number, not a page id',
    /priority \$\{PN\[k\]\} of \$\{PRI\.length\}"/.test(atlasJs) && /aria-hidden="true">\$\{PN\[k\]\}<\/span>/.test(atlasJs) && />\$\{PN\[v\]\}<\/button>/.test(atlasJs) && /\$\{PN\[f\.v\]\}<\/span>/.test(atlasJs) && !/'view '\+v/.test(atlasJs));
  check('css/atlas.css', 'a paired chart may be narrower than a lone one, and a rule runs between the pair', /\.duo \.viz\{min-width:0\}/.test(atlas) && /\.duo::before\{/.test(atlas));
}

console.log('\nCHECKS');
shapes.forEach(l => console.log(l));
fails.forEach(l => console.log(l));
console.log(`\n${ran - failed} of ${ran} checks passed` + (failed ? ` · ${failed} FAILED` : ' · all sections, every scope'));
if (failed) process.exit(1);

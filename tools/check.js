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
  // data/sample.js is the one place with invented numbers: it must say so, and the screen must mark every row that comes from it
  const sampleSrc = (() => { try { return fs.readFileSync(path.join(root, 'data/sample.js'), 'utf8'); } catch (e) { return null; } })();
  if (sampleSrc) {
    const w = {}; new Function('window', sampleSrc)(w); const iv = (w.ATLAS_SAMPLE || {}).interventions || [], script = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
    check('data/sample.js', 'the sample file says its numbers are invented', /INVENTED/.test(sampleSrc));
    check('data/sample.js', 'every sample row has an estimate inside its range', iv.length > 0 && iv.every(d => d.lo <= d.est && d.est <= d.hi));
    check('data/sample.js', 'every student a sample row names is in the class', iv.every(d => d.who === 'all' || d.who.every(n => A.students.includes(n))));
    check('js/atlas.js', 'rows from the sample file are marked as sample on screen', /sample:true/.test(script) && /· sample/.test(script) && /<span class=\\?"pill\\?">Sample<\/span>/.test(script));
    // the three things a teacher can do in the product: coursework, content to practice, a group. The product has no reteach (asked 2026-10-23), so no
    // button offers one and no action logs one; a group is fine. Nothing is sent, launched, marked or changed in the course
    check('js/atlas.js', 'every action a page offers, and every sample row, is coursework, content to practice or a group: never a reteach, and nothing is sent, launched or marked', !/Message home|Check in|check-in|Not a concern|required check|worked example|Talk to them|coding club|Messages home|Stretch task|Message copied/.test(script + sampleSrc)
      && !/Reteach in a small group|\?'Reteach to everyone'|Reteach this|Reteach planned|>Reteach<|data-act="v7plan"|reteachBtn|Small-group reteach|Whole-class reteach/.test(script) && !/reteach/i.test(sampleSrc)
      && /grp\('stuck','Form a group'\)/.test(script) && /Generate practice/.test(script) && /Assign the practice/.test(script) && /Stretch set/.test(script) && /Give a review set/.test(script) && /Assign it as coursework/.test(script));
  }
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
    /const MULTI=BKON\.length>1;/.test(atlasSrc) && /const bkBar=\(\)=>`<div class="controls bkbar">\$\{MULTI\?pickCtl\('bksel'/.test(atlasSrc) && /const bkTag=tb=>MULTI&&/.test(atlasSrc) && /if\(!MULTI\)return false;/.test(atlasSrc) && /if\(!MULTI\)return null;/.test(atlasSrc));
  check('js/atlas.js', 'every page and a profile have the same textbook filter, the first control under the answer: all the textbooks, or one with work; the pick is in the address and a change reloads the page',
    /id="ans">\$\{HL\[k\]\(\)\}<\/p>\$\{bkBar\(\)\}\$\{body\}/.test(atlasSrc) && /<\/div><\/div>\$\{bkBar\(\)\}/.test(atlasSrc) && /location\.search\.match\(\/\[\?&\]book=\(\[\^&#\]\*\)\/\)/.test(atlasSrc) && /id==='bksel'\)location\.assign\(bkUrl\(/.test(atlasSrc) && /\[\['all','All textbooks'\]\]\.concat\(BKON\.map/.test(atlasSrc) && /,'Textbook'\):''\}\$\{asOfCtl\(\)\}/.test(atlasSrc));
  check('js/atlas.js', 'a picked book narrows the view (its units, lessons and questions, the skills its lessons use, the work in it) and a level stays what it is: the evidence is every question on the skill in every book',
    /VU\.push\(U\)/.test(atlasSrc) && /const SUBS=VJ\.map/.test(atlasSrc) && /CI=CIALL\.map\(\(v,ix\)=>v&&IT\[ix\]\.j>=0\)/.test(atlasSrc) && /const KTA=ASK\.map\(\(\)=>false\);D\.subs\.forEach/.test(atlasSrc) && /const e=KTA\[k\]\?estOf\(i,k,LASTDAY\):null/.test(atlasSrc) && /const mast=\(i,k\)=>KTA\[k\]\?/.test(atlasSrc) && /const rdTaught=k=>KTA\[k\];/.test(atlasSrc));
  check('js/atlas.js', 'a book of labs (nine in ten of its questions are coding tasks) is work done and never a check: labs are left out of every level, a labs cell is one gray bar with no level, and on a page about labs "gave up" reads "not right yet" in gray',
    /return g>0&&c>=\.9\*g\}\)/.test(atlasSrc) && /const EVOK=ix=>!NOCHK\[ix\]&&!IT\[ix\]\.lab;/.test(atlasSrc) && /if\(b\.lab\)\{const doing=b\.e>=S\.v2\.line\/100;return \{e:b\.e,m:null,mc:'L',lab:true,doing,st:b\.st,g:doing\?'labs':'off'\}\}/.test(atlasSrc)
      && /if\(c\.mc==='L'\)return/.test(atlasSrc) && /OUT7L=\['Ran right first time','Ran right after more runs','Not right yet','Skipped'\]/.test(atlasSrc) && /CGU=LABV\?'var\(--neutral\)':'var\(--st-gu\)'/.test(atlasSrc) && /function v2strip\(/.test(atlasSrc));
  check('js/atlas.js', 'under "All books" the pages that offer units group them by book, the grid has a label over each book\'s columns, the labs are named under a list and not ranked in it, the bands of time are the main book\'s, and the main book sets where the class is',
    /const treeBody=\(T,ord,unitRow,nsI\)=>MULTI&&PICK===null\?BKON\.filter\(tb=>!LABB\[tb\]\)/.test(atlasSrc) && /const labsNote=what=>/.test(atlasSrc) && /const gH=lv==='u'&&MULTI&&PICK===null\?22:0/.test(atlasSrc)
      && /const TREEU=TB0\.map\(\(U,u\)=>u\)\.filter\(u=>!\(MULTI&&PICK===null&&TB0\[u\]\.lab\)\),BANDU=TAUGHT\.filter\(u=>!MULTI\|\|PICK!==null\|\|TB0\[u\]\.tb===MAIN\)/.test(atlasSrc) && /const CUA=TAUGHT\.filter\(u=>!MULTI\|\|PICK!==null\|\|TB0\[u\]\.tb===MAIN\)/.test(atlasSrc));
  check('js/atlas.js', 'a page says so when a book gives too little to judge: drifting needs work in four five-day blocks, and the figures go blank rather than read as zero',
    /const TOOFEW=MULTI&&PICK!==null&&ONB\.filter\(Boolean\)\.length<4;/.test(atlasSrc) && /function h3\(\)\{if\(TOOFEW\)return/.test(atlasSrc) && /TOOFEW\?'–':/.test(atlasSrc) && /if\(!TOOFEW\)s\+=d>=0&&di>=0\?/.test(atlasSrc));
  check('js/atlas.js', 'the top bar counts the books and the footer names every one, a book with no work among them; the example is read only when the address asks for it and only when it was built for this very export, the way to it is in the footer, and a chip marks the page only while it is on',
    /const EXQ=\/\[\?&\]books\(\?=\[&=\]\|\$\)\/\.test\(location\.search\);/.test(atlasSrc) && /b\.att===D\.att\.length\)\}\)\(\);/.test(atlasSrc) && /const EX=EXQ&&EXOK\?/.test(atlasSrc) && /' Textbooks: '/.test(atlasSrc) && /' \(listed, no work yet\)'/.test(atlasSrc) && /is invented \(data\/example\.js\); the rest is real\./.test(atlasSrc)
      && /<span class="fsw">\$\{swh\}<\/span>/.test(atlasSrc) && /if\(chip&&EX\)\{chip\.textContent=/.test(atlasSrc) && /id="demochip" hidden/.test(indexSrc) && !/Mock · real class data/.test(indexSrc));
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
  check('js/atlas.js', 'each skill of the tree has one symbol, a book, filled when a lesson the class worked on teaches it and hollow when not, keyed beside the rings; no "assessed" mark, since on the skills drawn nearly everyone answered; the hover names the lessons and says how deep and how old the evidence is',
    /const rdTa=k=>rdLs\(k\)\.some\(j=>ONJ\[j\]\);/.test(atlasSrc) && /const rdEv=\(k,ids\)=>/.test(atlasSrc) && /\$\{taSym\(x,cy\+78\+\(ln\.length-1\)\*16,q\.k\)\}/.test(atlasSrc) && /\$\{taSym\(x2,gy\+61\+\(l2\.length-1\)\*15,k2\)\}/.test(atlasSrc)
      && /\$\{noev\?NOEV:''\}<i class="ksep" aria-hidden="true"><\/i>\$\{TAKEY\}/.test(atlasSrc) && /\}<\/svg>Taught<\/span>/.test(atlasSrc) && !/rdAsd|gTick|Assessed, not assessed|Not assessed/.test(atlasSrc)
      && /students answered two or more · last asked \$\{dayDate\(E\.last\)\}/.test(atlasSrc) && /\$\{taTxt\(q\.k,ids\)\}<br>/.test(atlasSrc) && /\$\{taTxt\(k2,ids\)\}<br>/.test(atlasSrc));
  check('README.md', 'every command in the README shows the password and the bucket as "…"', (src => /GRAPH_BUCKET=… python3 tools\/export-prereqs\.py/.test(src) && !/(PGPASSWORD|GRAPH_BUCKET)=(?!…)\S/.test(src))(fs.readFileSync(path.join(root, 'README.md'), 'utf8')));
  check('js/atlas.js', 'ready for a unit reads the prerequisite file only when it was built for this very export, before an example book is added, and any unit the graph does not cover falls back on the coverage weights',
    /const PRQ=\(function\(\)\{const P=window\.ATLAS_PREREQS,b=P&&P\.base;return b&&b\.section===D\.meta\.section&&b\.units===D\.units\.length&&b\.subs===D\.subs\.length&&b\.items===D\.items\.length&&b\.skills===D\.skills\.length/.test(atlasSrc)
      && atlasSrc.indexOf('const PRQ=') < atlasSrc.indexOf('const EX=') && /const PRX0=D\.skills\.length;if\(PRQ\)D\.skills=D\.skills\.concat\(PRQ\.skills\);/.test(atlasSrc)
      && /const RDG=u=>!!PRQ&&DUI\[u\]!==undefined&&DUI\[u\]<PRQ\.units\.length;/.test(atlasSrc) && /READY\['0:'\+u\]=G\?G\.map\(/.test(atlasSrc) && /:\(U\.pre\|\|\[\]\)\.map\(/.test(atlasSrc));
  check('js/atlas.js', 'a prerequisite ring needs eight students with two or more checks, its share is of the students checked on it who are at the picked level or above, and one no question in this class checks is dashed and says so',
    /const rdOK=k=>KTA\[k\]&&chk5\(k\)&&rdN\(k\)>=8;/.test(atlasSrc) && /const rdP=\(k,ids,L\)=>rdWhy\(k\)\|\|!rdC\(k,ids\)\?null:pc\(rdF\(k,ids,L\)\.length,rdC\(k,ids\)\);/.test(atlasSrc) && /'No question in this class checks it'/.test(atlasSrc) && /const rdSay=\(k,ids\)=>`\$\{rdF\(k,ids\)\.length\} of the \$\{rdC\(k,ids\)\} \$\{S\.v11\.grp\?'in the group':'students'\} checked on it \$\{lvAre\(S\.v11\.lv\)\}`;/.test(atlasSrc)
      && /const atLv=\(i,k,L\)=>rdChk\(i,k\)&&lvOf\(CUR\[i\]\[k\]\)>=LVN\[L\|\|S\.v11\.lv\];/.test(atlasSrc));
  check('js/atlas.js', 'the tree is two levels, up to four on top and two under each, the skills with evidence first and only those on the second row, no skill drawn twice, the rest counted under it ("+8 more prerequisites", names on hover), and no text about the rows',
    /const rdPick=list=>\{const ks=rdTop\(list\.map\(q=>q\.k\),4\),seen=new Set\(ks\)/.test(atlasSrc) && /ok=c\.filter\(rdOK\)\.slice\(0,2\);ok\.forEach\(k=>seen\.add\(k\)\);return ok\}/.test(atlasSrc)
      && !/'Builds on'|'Which build on'|Top row: what the unit builds on|Around the unit: what it builds on/.test(atlasSrc) && /\+\$\{rest\.length\} more \$\{pl\(rest\.length,'prerequisite'\)\}/.test(atlasSrc));
  check('js/atlas.js', 'the key is one short line drawn with the tree\'s own marks (a ring in each colour, a dashed ring, the book), led by the level the rings are read at, its groups set apart; v4 keys its levels in ALPS\'s underline legend; the level line\'s nodes and track take each stop\'s verdict colour; the unit carries its name alone',
    /<span class="lt">Share \$\{lvAt\(L\)\}<\/span><span>\$\{rk\('var\(--bad\)'\)\}Under 60%<\/span><span>\$\{rk\('var\(--watch\)'\)\}60 to 79%<\/span><span>\$\{rk\('var\(--good\)'\)\}80% or more<\/span>\$\{noev\?NOEV:''\}<i class="ksep" aria-hidden="true"><\/i>\$\{TAKEY\}/.test(atlasSrc)
      && /<span class="ul\$\{b===1\?' pale':''\}" style="--c:\$\{LVCOL\[b\]\}">\$\{LV\[b\]\}<\/span>/.test(atlasSrc) && /style="--vc:var\(--\$\{v\.c\}\)"><span class="lvdot" aria-hidden="true"><\/span>/.test(atlasSrc) && !/RKLINE|Latest work · \$\{whenTxt\(R\.U\)\}/.test(atlasSrc) && /\+T\(rx,ry\+5,R\.U\.n,/.test(atlasSrc));
  check('js/atlas.js', 'the readiness line is a level, not a share: ALPS\'s levels from attempted up as stops on one line, proficient to begin with, each saying what the class is at it; a ring has no tick, its colour reads fixed shares (60%, 80%), and the answer names the level',
    /const RDLV=\['A','F','P','M'\],RDCUT=60;/.test(atlasSrc) && /v11:\{lv:'P',/.test(atlasSrc) && /const ringCol=p=>p>=80\?'good':p>=RDCUT\?'watch':'bad';/.test(atlasSrc) && /function ring\(x,y,r,sw,p,col,on\)\{const C=2\*Math\.PI\*r,L=Math\.max\(0,C\*p\/100-sw\);/.test(atlasSrc) && /stroke-linecap:round;stroke-dasharray:\$\{f1\(L\)\} \$\{f1\(C\)\};stroke-dashoffset:\$\{f1\(-sw\/2\)\}/.test(atlasSrc)
      && /data-act="v11lv" data-f="\$\{L\}" aria-pressed="\$\{on\}"/.test(atlasSrc) && /case 'v11lv':S\.v11\.lv=d\.f;S\.v11\.acc=\{\};reView\(\);/.test(atlasSrc) && /Not ready for \$\{nm\} at \$\{lv\}\./.test(atlasSrc) && !/v11th|S\.v11\.th/.test(atlasSrc));
  check('js/atlas.js', 'the rings run weakest first, left to right, a ring with no share last, and on a narrow screen the tree opens on the first', /const rdOrder=\(pre,ids\)=>/.test(atlasSrc) && /pre:rdOrder\(rdPick\(all\),ids\)/.test(atlasSrc) && /:Math\.max\(0,\(xs\[0\]-100\)\*fg\.scrollWidth\/W\)\}/.test(atlasSrc));
  check('js/atlas.js', 'a small group is the students checked on a skill and below the picked level on it, those never checked are counted apart with their names on hover, and a card with nothing in it is left out, one line saying why; accepting the plan logs its small group and its stretch set, never the skills to teach the whole class, since the product has no reteach', /const gaps=n=>amb\.filter\(o=>rdChk\(ID\[n\],o\.k\)&&!atLv\(ID\[n\],o\.k,L\)\)\.length;/.test(atlasSrc) && /unk:names\.filter\(n=>gaps\(n\)===0&&amb\.some\(o=>!rdChk\(ID\[n\],o\.k\)\)\)/.test(atlasSrc)
      && /\+\$\{P\.unk\.length\} not checked<\/span>/.test(atlasSrc) && /'Nothing to reteach\.'/.test(atlasSrc) && /'No small groups\.'/.test(atlasSrc) && /'Nobody ready to go further yet\.'/.test(atlasSrc)
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
      vm.runInContext(atlasSrc.replace(boot, 'globalThis.RD_TEST={S,TB,DUI,PRQ,RDG,rdSel,rdOK,rdP,v11,v11draw,taTxt,planNow,rdChk,secOf,atLv,rdVerdict,ID,KIT,NM,rdSplit,ASK,rdNo};'), ctx, { filename: 'js/atlas.js' });
      const T = ctx.RD_TEST; T.S.view = 10;
      return { T, node, trees: T.TB[0].units.map((U, u) => { T.S.v11.u[0] = u; T.v11draw(); const R = T.rdSel(); return { u, R, P: T.planNow(), ks: R.pre.flatMap(q => [q.k].concat(q.cs)), ans: node('#ans').textContent, out: node('#v11c').innerHTML + node('#ans').textContent }; }) };
    };
    const ok = trees => trees.every(t => t.R.pre.length <= 4 && t.R.pre.every(q => q.cs.length <= 2) && new Set(t.ks).size === t.ks.length && !/NaN|undefined|Infinity/.test(t.out));
    const one = runApp('', ['data/class.js', 'data/sample.js', 'data/prereqs.js']);
    check('js/atlas.js', 'with the file loaded, every unit of the class draws its tree from the graph: at most four on top and two under each, no skill twice, nothing undefined', !!one.T.PRQ && one.trees.every(t => one.T.RDG(t.u)) && ok(one.trees));
    const sorted = (ks, ids, T) => { const v = ks.map(k => T.rdP(k, ids)), cut = v.indexOf(null), known = cut < 0 ? v : v.slice(0, cut); return known.every((x, i) => !i || known[i - 1] <= x) && (cut < 0 || v.slice(cut).every(x => x === null)); };
    check('js/atlas.js', 'on every unit the rings run weakest first, a ring with no share last, and so does each second row', one.trees.every(t => sorted(t.R.pre.map(q => q.k), t.R.ids, one.T) && t.R.pre.every(q => sorted(q.cs, t.R.ids, one.T))));
    check('js/atlas.js', 'on every unit the small group holds only students checked on one of its skills and below the picked level on it, and nobody counted as not checked yet is in it', one.trees.every(t => t.P.grp.every(n => t.P.amb.some(o => one.T.rdChk(one.T.ID[n], o.k) && !one.T.atLv(one.T.ID[n], o.k))) && t.P.unk.every(n => !t.P.grp.includes(n))) && one.trees.some(t => t.P.unk.length > 0));
    // the readiness line, on every unit: the same rings at every level, a share that never rises with the level, a verdict that never gets better with it,
    // each stop saying the verdict the plan gives at its level, one stop picked, and going further kept for the students who have mastered every skill
    const VR = { 'Ready': 3, 'Groups first': 2, 'Not ready': 1, 'Too early to tell': 0 }, LVS = ['A', 'F', 'P', 'M'];
    const lineOK = one.T.TB[0].units.map((U, u) => { one.T.S.v11.u[0] = u; const R = one.T.rdSel(), ks = R.pre.flatMap(q => [q.k].concat(q.cs)), v = LVS.map(L => one.T.rdVerdict(L).t), html = one.T.v11();
      return { u, any: new Set(v).size > 1, ok: ks.every(k => LVS.map(L => one.T.rdP(k, R.ids, L)).every((p, i, a) => !i || p === null || a[i - 1] >= p)) && v.every((t, i) => !i || VR[v[i - 1]] >= VR[t])
        && (!R.pre.length || ((html.match(/data-act="v11lv"/g) || []).length === 4 && (html.match(/data-act="v11lv" data-f="[AFPM]" aria-pressed="true"/g) || []).length === 1 && LVS.every((L, i) => html.includes(`aria-label="At least ${['attempted', 'familiar', 'proficient', 'mastered'][i]}: ${v[i].toLowerCase()}"`))))
        && LVS.every(L => one.T.planNow(L).ext.every(n => R.pre.every(q => one.T.rdP(q.k, R.ids) === null || !one.T.rdChk(one.T.ID[n], q.k) || one.T.secOf(one.T.ID[n], q.k)))) }; });
    // a plan group on the tree, on every unit that has one: its rings are its own students' shares, the tree says whose, and the whole class comes back
    const grpOK = one.T.TB[0].units.map((U, u) => { one.T.S.v11.u[0] = u; one.T.S.v11.grp = null; const P = one.T.planNow(), R = P.R; let tried = 0, ok = true;
      [['grp', P.grp, 'Small group'], ['ext', P.ext, 'Ready to go further']].forEach(([g, names, label]) => { if (!names.length || !R.pre.length) return; tried++; one.T.S.v11.grp = g; one.T.v11draw();
        const html = one.node('#v11c').innerHTML, gids = names.map(n => one.T.ID[n]);
        ok = ok && html.includes(`${label} · ${names.length} student`) && html.includes('data-g="">Whole class') && !/NaN|undefined/.test(html)
          && R.pre.every(q => { const p = one.T.rdP(q.k, gids); return p === null ? html.includes(`aria-label="${one.T.ASK[q.k]}: ${one.T.rdNo(q.k, gids).toLowerCase()};`) && one.T.rdNo(q.k, gids) !== '' : html.includes(`aria-label="${one.T.ASK[q.k]}: ${p}% `); }); });
      one.T.S.v11.grp = null; one.T.v11draw(); return { u, tried, ok: ok && !one.node('#v11c').innerHTML.includes('data-g="">Whole class') }; });
    check('js/atlas.js', 'on every unit with a plan group, showing it puts that group alone on the tree (each ring its own students\' share), says so above the tree, and the whole class comes back', grpOK.every(o => o.ok) && grpOK.some(o => o.tried), grpOK.filter(o => !o.ok).map(o => 'unit ' + o.u).join(', '));
    check('js/atlas.js', 'on every unit the readiness line reads the same rings at every level: no share rises and no verdict gets better as the level rises, each stop says its verdict, one is picked, and going further stays for mastery', one.T.S.v11.lv === 'P' && lineOK.every(o => o.ok) && lineOK.some(o => o.any), lineOK.filter(o => !o.ok).map(o => 'unit ' + o.u).join(', '));
    check('js/atlas.js', 'some unit draws two levels, and every ring with a share has eight or more students checked on it', one.trees.some(t => t.R.pre.some(q => q.cs.length)) && one.trees.every(t => t.ks.every(k => one.T.rdP(k, t.R.ids) === null || one.T.rdOK(k))));
    const early = run => run.trees.every(t => !t.R.pre.length || t.R.pre.some(q => run.T.rdP(q.k, t.R.ids) !== null) || (/^Too early to tell for /.test(t.ans) && !/Accept plan/.test(t.out)));
    check('js/atlas.js', 'a unit whose top row has no share says it is too early to tell, never that the class is ready, and offers no plan', early(one));
    check('js/atlas.js', 'a unit whose questions check no skill above the relevance cut draws no tree and says so', one.trees.every(t => one.T.PRQ.used[t.u] > 0 || (!t.R.pre.length && / has no graded question tagged with a skill at more than 50% relevance/.test(t.ans))) && one.trees.some(t => !one.T.PRQ.used[t.u]));
    check('js/atlas.js', 'every skill drawn has its book, says in its label whether it was taught, and says on hover where it is taught and, when questions check it, how many, how many students answered two or more and when it was last asked', one.trees.every(t => !t.R.pre.length || ((t.out.match(/<g aria-hidden="true"><path transform=/g) || []).length === t.ks.length
      && (t.out.match(/; (not )?taught"/g) || []).length === t.ks.length && t.ks.every(k => { const x = one.T.taTxt(k, t.R.ids); return /^(Taught in [^<]+|Not taught: [^<]+)/.test(x) && (one.T.KIT[k].length ? /<br>\d+ (question checks|questions check) it · (\d+ of \d+ students answered two or more · last asked \d{1,2} [A-Z][a-z]{2}( \d{4})?|nobody has answered (it|them) yet)$/.test(x) : !/<br>/.test(x)); }))));
    // the four other versions of the tree, on every unit: each draws a ring a skill and the same plan cards, nothing undefined, and a unit with no
    // tree says so; v1 and v2 draw a link a branch; v4's ring splits the whole class, so its four parts add up to every student
    const VMARK = { '1': 'aria-label="Readiness tree, left to right', '2': 'aria-label="Readiness tree, radial', '3': 'aria-label="Readiness tree, weighted,', '4': 'aria-label="Readiness tree, class split,' };
    const verOK = ['1', '2', '3', '4'].map(v => { one.T.S.v11.ver = v; return one.T.TB[0].units.map((U, u) => { one.T.S.v11.u[0] = u; one.T.v11draw(); const h = one.node('#v11c').innerHTML, R = one.T.rdSel(), ks = R.pre.flatMap(q => [q.k].concat(q.cs));
      if (!R.pre.length) return /Pick another unit/.test(h); return !/NaN|undefined|Infinity/.test(h) && h.includes(VMARK[v]) && /What to do first/.test(h) && (h.match(/<g tabindex="0" aria-label=/g) || []).length === ks.length
        && (v === '3' || v === '4' || (h.match(/class="lk"/g) || []).length === R.pre.length + R.pre.reduce((a, q) => a + q.cs.length, 0)); }).every(Boolean); });
    check('js/atlas.js', 'every version of the tree (v1 left to right, v2 radial, v3 weighted, v4 class split) draws every unit with a ring a skill and the same plan, nothing undefined; v1 and v2 draw a link a branch', verOK.every(Boolean), verOK.map((x, i) => 'v' + (i + 1) + (x ? ' ok' : ' FAILED')).join(' '));
    check('js/atlas.js', 'v4\'s ring splits the students checked on the skill by ALPS\'s five levels; with those not checked twice they add up to every student, and so do the three groups', one.T.TB[0].units.every((U, u) => { one.T.S.v11.u[0] = u; const R = one.T.rdSel(); return R.pre.flatMap(q => [q.k].concat(q.cs)).every(k => { const c = one.T.rdSplit(k, R.ids); return c.F + c.H + c.E + c.o === R.ids.length && c.l.reduce((a, b) => a + b, 0) + c.o === R.ids.length && c.l[4] === c.F; }); }));
    one.T.S.v11.ver = 'now';
    if (exSrc) {
      const ex = runApp('?books', ['data/class.js', 'data/sample.js', 'data/example.js', 'data/prereqs.js']);
      check('js/atlas.js', 'with the example\'s books on, the class\'s units still read the graph and the added books\' units fall back on the coverage weights, every tree whole', !!ex.T.PRQ && ex.trees.every(t => ex.T.RDG(t.u) === (ex.T.DUI[t.u] < A.units.length)) && ex.trees.some(t => !ex.T.RDG(t.u)) && ok(ex.trees));
      check('js/atlas.js', 'with the example\'s books on, a unit with nothing readable says it is too early to tell', early(ex) && ex.trees.some(t => /^Too early to tell for /.test(t.ans)));
    }
  }
  // a chart is never stretched across a wide page: it is handed its width, and shares its row with the panel that explains it or with a second chart
  const atlasJs = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
  check('js/atlas.js', 'no chart takes the full page width by itself: each is drawn to the width it is handed', !/[,{(\s]W=VW\(\)/.test(atlasJs));
  check('js/atlas.js', 'every chart view pairs its chart with a panel or another chart; pace keeps the solid and dashed tracks from main', (atlasJs.match(/\bduo\(/g) || []).length >= 7 && /aria-label="Pace tracks/.test(atlasJs) && /class="duo even"/.test(atlasJs) && /stroke-dasharray:4 3/.test(atlasJs));
  check('js/atlas.js', 'the fading view opens on the faded skills only, with a tick to show all, and with no skill picked', /v10:\{u:'all',all:false,k:-1/.test(atlasJs) && /id="v10all"/.test(atlasJs) && /if\(!rows\.some\(o=>o\.k===Z\.k\)\)Z\.k=-1/.test(atlasJs));
  check('js/atlas.js', 'the grid shows the started units only, folded under the unit\'s chart and cards, with no per-student summary bar and no trend row', /return TAUGHT\.map\(u=>\(\{t:'u',id:u,u\}\)\)\}/.test(atlasJs) && /fold\('v2grid'/.test(atlasJs) && /<div id="v2top"><\/div>/.test(atlasJs) && !/function trendN\(/.test(atlasJs) && !/const sum2=/.test(atlasJs) && !/Class trend/.test(atlasJs));
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
    /,skp=c\[3\]\/n>=\.29;/.test(atlasJs) && /\$\{skp\?\(isLogged\(pk\)\?'<span class="pill good">Planned<\/span>':'<button class="btn small primary" type="button" data-act="v8plan">Assign it as coursework<\/button>'\):''\}/.test(atlasJs)
      && /logAct\(sKey7\(tb,sl\.j,sl\.s\),7,`Assigned \$\{nm\} in \$\{J\} as coursework`,'plan'\)/.test(atlasJs) && (atlasJs.match(/data-act="v8plan"/g) || []).length === 1);
  check('js/atlas.js', 'shared weak skills are drawn as pale areas with a thin line, not as solid bands', /style="fill:\$\{col\};opacity:\.16"\/><polyline/.test(atlasJs));
  check('js/atlas.js', 'a day picked on a weak-skill line shows who was where on its bar; a second day on the same skill splits the class by change (lost it, beginning or attempted, familiar or proficient, got it, held) in the point\'s table; a day on another skill compares the two on the later day, in cards that open the table and list no names; buttons only on today\'s lists, a past day offers "Compare with now"',
    /function ptSel\(\)/.test(atlasJs) && /function ptGroups\(P\)/.test(atlasJs) && /data-act="v7pt" data-r="\$\{o\.i\}" data-j="\$\{k\}"/.test(atlasJs)
      && /groups:\[\['lost','Lost it'\],\['re','Beginning or attempted'\],\['dev','Familiar or proficient'\],\['got','Got it'\],\['held','Held'\]\]/.test(atlasJs) && /ptActs\(P,\[\['lost',G\.lost,'Give a review set','Review set planned',/.test(atlasJs) && /\['re',re,'Form a group','Group planned',/.test(atlasJs)
      && /j:Math\.max\(Q\[0\]\.j,j\)/.test(atlasJs) && /ptPast\('Compare with now'\)/.test(atlasJs) && /g&&now\?ptBtn\(P,g,label\)/.test(atlasJs) && /'Form a group'/.test(atlasJs) && /e\.key==='ArrowLeft'\|\|e\.key==='ArrowRight'/.test(atlasJs)
      && /ptCard\(P,'Beginning or attempted on both',ph\('One group for both skills'\)/.test(atlasJs) && /data-act="tblopen" data-k="\$\{P\.kind==='skills'\?P\.m1\.k:P\.m\.k\}" data-f="pt" data-g="\$\{tg\|\|g\}"/.test(atlasJs)
      && !/ptNames|roster\(G\.|fold\('v7(sec|held)'/.test(atlasJs) && !/ptCard\(P,'(Lost it|Beginning or attempted|Got it|Held)'/.test(atlasJs) && (src => !!src && !/roster\(/.test(src))((atlasJs.match(/const ptCard=\(P,title,hint,names,g,label,now,tg\)=>[^\n]*/) || [])[0]));
  check('js/atlas.js', 'a picked point opens the same table, read as of its day: one day with the level the line has for it, two days with a level column each (the later day sorts), two skills with a level column each and both skills\' questions; the point\'s question lists and their bars are gone',
    /function tblCfg\(T\)\{/.test(atlasJs) && /if\(P\.kind==='one'\)\{const k=P\.m\.k,d=BE\(P\.j\)/.test(atlasJs) && /cols:\[\{k,d:a,lab:'On '\+dayDate\(a\)\},\{k,d:b,lab:now\?'Now':'On '\+dayDate\(b\)\}\]/.test(atlasJs) && /cols:\[\{k:k1,d,lab:ASKS\[k1\]\},\{k:k2,d,lab:ASKS\[k2\]\}\]/.test(atlasJs)
      && /T\.s=T\.s0=P&&P\.kind==='time'\?'lv1':'lv0'/.test(atlasJs) && (atlasJs.match(/\$\{tblGoPt\(P\)\}/g) || []).length === 3 && !/function ptQs|const qList|const qRow|const QKEY|function ptQOne|function ptQTwo|const qBar/.test(atlasJs));
  check('js/atlas.js', 'a picked day is drawn: the class that day as one keyed bar as ALPS draws it (its five levels, mastered first, then unavailable), two days as two bars on one scale; the bars are the counts, so neither one day nor two days has cards and no line repeats who is unavailable, and today\'s actions are buttons under the bars, each for the group its hover names; the students beginning or attempted get a group only while they are under half of those checked',
    /const stBar=g=>/.test(atlasJs) && /\$\{stRow\(now\?'The class now':'That day',G,m\.sv\[j\]\)\}\$\{stKey\(\[G\]\)\}/.test(atlasJs) && /\$\{stRow\('On '\+A,GA,m\.sv\[P\.a\]\)\}\$\{stRow\(now\?'Now':'On '\+dayDate\(BE\(P\.b\)\),GB,m\.sv\[P\.b\]\)\}\$\{stKey\(\[GA,GB\]\)\}/.test(atlasJs)
      && /const STP=\[4,3,2,1,0\]\.map\(b=>\[b,'l'\+b,LV\[b\],LVCOL\[b\]\]\)\.concat\(\[\['early','ua','Unavailable',''\]\]\);/.test(atlasJs)
      && /\$\{now\?ptActs\(P,\[\['ny',whole\?\[\]:G\.ny,'Form a group','Group planned','beginning or attempted'\],/.test(atlasJs) && /\['dev',G\.dev,'Give a practice set','Practice set planned',/.test(atlasJs) && /const ptActs=\(P,acts\)=>/.test(atlasJs)
      && !/ptCard\(P,gsw\('(E|H|F)'\)/.test(atlasJs) && !/Unavailable · \$\{G\.early\.length\}/.test(atlasJs) && !/class="qn"/.test(atlasJs));
  check('css/atlas.css', 'the panel\'s bars use the theme: ALPS\'s level colours for a level, white text only on the two darkest', [0, 1, 2].every(b => new RegExp('\\.sb \\.l' + b + '\\{background:var\\(--lv-' + 'baf'[b] + '\\)\\}').test(atlas)) && /\.sb \.l3\{background:var\(--lv-p\);color:var\(--on-lv\)\}/.test(atlas) && /\.sb \.l4\{background:var\(--lv-m\);color:var\(--on-lv\)\}/.test(atlas) && /\.sb i\{[^}]*font-size:12px/.test(atlas) && !/\.sb \.(gu|rt|ft)\{|\.qlist|\.sw\.empty/.test(atlas));
  check('js/atlas.js', 'the weak-skills line is the share of the students checked on a skill who have mastered it, drawn upward so lower is worse, and a row\'s status comes from that line over the last 30 days of class work', /sv\.push\(ch>=8\?Math\.round\(sec\/ch\*100\):null\)/.test(atlasJs) && /f1\(yb-hh\(m\.sv\[k\]\)\)/.test(atlasJs) && /st=now<8\?'Recovered':d<=-10\?'Getting worse':d>=10\?'Improving':'Still weak'/.test(atlasJs) && /who have mastered it, five days at a time: lower is worse/.test(atlasJs) && /if\(q>=0\)\{ch\+\+;if\(q===4\)sec\+\+;else if\(q<2\)ny\+\+\}/.test(atlasJs) && !/yt\+hh\(/.test(atlasJs));
  // every page has one priority number, and that number is what the tabs, the overview's flags and the bar for a followed student show
  const priIds = ((atlasJs.match(/const PRI=\[([^;]*)\];/) || [])[1] || '').match(/\[(\d+),'/g) || [], priSet = priIds.map(t => +t.slice(1).split(',')[0]);
  check('js/atlas.js', 'every page in the rail has exactly one priority, 1 to 7, and the by-unit and faded views keep their ids under the skills page', priSet.length === 7 && new Set(priSet).size === 7 && [2, 3, 4, 6, 7, 10, 11].every(k => priSet.includes(k)) && /PN\[5\]=PN\[6\]\+\.4;PN\[9\]=PN\[6\]\+\.5/.test(atlasJs), priSet.join(' '));
  check('js/atlas.js', 'no priority number is shown: the rail\'s order carries it, and the overview and the bar for a followed student name pages, not numbers',
    !/\$\{PN\[k\]\}<\/span>/.test(atlasJs) && !/\$\{PN\[f\.v\]\}<\/span>/.test(atlasJs) && !/class="rn[ "]/.test(atlasJs) && !/class="vchip/.test(atlasJs) && /tp\(`Open \$\{VM\[f\.v\]\.s\}`\)/.test(atlasJs) && /GROUPS=\[\['Students',\[2,3,4\]\],\['Content',\[6,7\]\],\['Act and check',\[10,11\]\]\]/.test(atlasJs));
  // the changes of 13 October 2026, from the first-time-teacher review (reports/first-time-teacher-review.md): what a teacher sees first on each page, and how a unit and pace are judged
  check('js/atlas.js', 'a unit\'s level is ALPS\'s unit band on its key skills (checked by its own summary, test, exercise and practice lessons, and carried forward): the band of the mean score on the ones with a level, capped by the share that is (25%, 50%, 80%)',
    /const TESTRE=\/summary\|test\|exam\|exercises\|practice\|frq\/i;/.test(atlasJs) && /\(LISTED\[k\]>=2&&KIT\[k\]\.length>=3\)\|\|need\.has\(k\)/.test(atlasJs)
      && /const f=avg\(e\.map\(k=>CUR\[i\]\[k\]\)\),cv=e\.length\/ks\.length,l=lvOf\(f\),b=Math\.min\(l,cv<\.25\?1:cv<\.5\?2:cv<\.8\?3:4\);/.test(atlasJs) && !/HARD\[|hardNY/.test(atlasJs));
  check('js/atlas.js', 'a skill\'s level is ALPS\'s: Beginning, Attempted, Familiar, Proficient, Mastered at 40, 55, 65 and 80; the groups acted on fold them (mastered; familiar or proficient; beginning or attempted) and a weekly level keeps all five',
    /const LV=\['Beginning','Attempted','Familiar','Proficient','Mastered'\],LVC=\['B','A','F','P','M'\]/.test(atlasJs) && /const lvOf=c=>c>=\.8\?4:c>=\.65\?3:c>=\.55\?2:c>=\.4\?1:0;/.test(atlasJs)
      && /const catFrom=\(ev,c\)=>ev===0\?'N':ev<2\?'Q':c>=\.8\?'F':c>=\.55\?'H':'E';/.test(atlasJs) && /a\.push\(!e\|\|e\.ev<2\?-1:lvOf\(e\.c\)\)/.test(atlasJs) && /const G3=x=>x<0\?-1:x>3\?2:x>1\?1:0;/.test(atlasJs));
  check('js/atlas.js', 'a student\'s level is drawn as ALPS\'s battery (four blocks, as many filled as the level) in the grid, its key and the cards, and the groups are ALPS\'s: struggling and low engagement',
    /const battery=\(x,y,w,h,mc\)=>/.test(atlasJs) && /const fill=battery\(x,y,w,fh,c\.mc\);/.test(atlasJs) && /return battery\(x,y\+4,pw,11,q\.mc\)/.test(atlasJs) && /const RAMPKEY=\(\)=>`<span class="lt">Performance<\/span>\$\{LVC\.map/.test(atlasJs)
      && /stuck:'Struggling'/.test(atlasJs) && /off:'Low engagement'/.test(atlasJs) && /s:'Engagement and performance'/.test(atlasJs));
  check('js/atlas.js', 'no page says the old words: secure, not yet, developing, stuck despite effort, not doing the work, effort and mastery',
    !/Effort and mastery|Stuck despite effort|Not doing the work|not doing the work|'Not yet'|'Developing'|'Secure'|% secure|not yet secure|Not secure|>Secure|Skills secure/.test(atlasJs));
  check('js/atlas.js', 'pace projects only the target unit\'s skills, with unknown estimates kept separate', /function paceScope\(u\)/.test(atlasJs) && /function paceOf\(i\)/.test(atlasJs) && /Too early to tell/.test(atlasJs) && !/const FIN=/.test(atlasJs));
  check('js/atlas.js', 'the goal has a target-unit picker, a calendar date and sorting, without a whole-course skill slider', /pickCtl\('v4unit'/.test(atlasJs) && /type="date" id="v4date"/.test(atlasJs) && /pickCtl\('v4sort'/.test(atlasJs) && !/id="v4goal"/.test(atlasJs));
  check('js/atlas.js', 'the grid and profile still use the same unit standing', /,st=n\.t==='u'\?standU\(i,k\):n\.t==='j'\?standJ\(i,k\):/.test(atlasJs) && /\['M','P'\]\.includes\(standU\(i,u\)\.s\)/.test(atlasJs) && /const SL=\{M:'Mastered',P:'Proficient',F:'Familiar',A:'Attempted',B:'Beginning',Q:'Unavailable'/.test(atlasJs));
  check('js/atlas.js', 'the grid\'s key sits beside the unit picker on Engagement and performance, and no page shows sparklines or numbered flag chips', /const CELLKEY=\(\)=>/.test(atlasJs) && /\$\{pick\}\$\{CELLKEY\(\)\}/.test(atlasJs) && !/secSpark|class="vchips"/.test(atlasJs));
  check('js/atlas.js', 'an invented sample row is attached to nobody: not a profile moment, not a flag, not a mark on a followed student, not a name in a panel, and never in the headline', /IVS\.forEach\(d=>\{if\(d\.sample\)return;/.test(atlasJs) && /IVS\.filter\(d=>!d\.sample&&d\.who\.length<N/.test(atlasJs) && /got=sel!==null&&!d\.sample&&/.test(atlasJs) && /const real=IVS\.filter\(d=>!d\.sample\)/.test(atlasJs) && /Invented: no student of this class did it\./.test(atlasJs) && /fold\('v12sample'/.test(atlasJs));
  check('js/atlas.js', 'the three skills pages are one page with three views (weak now, by unit, faded), and the old addresses still open their view', /const toPage=k=>\{if\(k===5\)\{S\.v7\.view='unit';return 6\}if\(k===9\)\{S\.v7\.view='faded';return 6\}/.test(atlasJs) && /const vSk=\(\)=>skTabs\(\)\+/.test(atlasJs) && /OLDSLUG=\{'overview':2,'effort':2,'weak-skills':6,'worked':11\}/.test(atlasJs) && /\[\['weak','Weak now'\],\['unit','By unit'\],\['faded','Faded'\]\]/.test(atlasJs));
  check('js/atlas.js', 'weak skills run under a heading a status with no status word on each row, the faded ones say what they fell from, and empty statuses have no tab', /T\(10,y\+gh-12,`\$\{g\.st\} · \$\{g\.all\}`/.test(atlasJs) && /`faded: \$\{Math\.round\(fd\.a\)\}% → \$\{Math\.round\(fd\.b\)\}%`/.test(atlasJs) && /STS\.filter\(st=>cnt\(st\)\)/.test(atlasJs) && !/T\(xb\+BWD\+34,yc\+4,m\.st/.test(atlasJs));
  check('js/atlas.js', 'stall points opens on the worst questions as one ranked list, with the outline one click away, and a link into the outline opens that view', /\[\['worst','Worst questions'\],\['outline','By unit'\]\]/.test(atlasJs) && /\.slice\(0,8\);/.test(atlasJs) && /S\.v8\.view='outline'\}/.test(atlasJs));
  // where they stall on a skill (asked 2026-10-23: the link used to open the lesson that first named the skill): Stall points narrowed to the questions that check it
  check('js/atlas.js', 'a skill\'s "Where they stall" opens Stall points narrowed to the questions that check that skill, worst first, the worst picked, with a bar naming the skill and "All questions"; the rail and a student\'s flag open it on every question, and no link points at the lesson that first named the skill',
    /const whereLink=k=>stallN\(k\)\?`<button class="lnk" type="button" data-act="gosk" data-k="\$\{k\}">Where they stall →<\/button>`:'';/.test(atlasJs) && (atlasJs.match(/\$\{whereLink\((k0|m\.k)\)\}/g) || []).length === 2
      && /case 'gosk':\{const k=\+d\.k,w=worstQs\(tree7\(0,k\),k\);if\(!w\.length\)break;S\.v8\.k=k;S\.v8\.view='worst';S\.v8\.tb=0;S\.v8\.sel\[0\]=\{j:w\[0\]\.j,s:w\[0\]\.s\};go\(7\);return\}/.test(atlasJs)
      && /case 'v8k':S\.v8\.k=null;reView\(\);break;/.test(atlasJs) && /case 'go':if\(\+d\.v===7\)S\.v8\.k=null;go\(\+d\.v\);break;/.test(atlasJs) && /S\.v8\.k=k===undefined\?null:k;/.test(atlasJs)
      && /data-act="v8k">All questions<\/button><\/p>`;/.test(atlasJs) && /\+ctl\+kbar\+leg\+duo\(/.test(atlasJs) && !/data-act="gosub" data-j="\$\{jOf\(/.test(atlasJs) && !/\bjOf\b/.test(atlasJs));
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const runSk = search => {
      const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
      const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
        location: { search, hash: '#skills', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
      ['data/class.js', 'data/sample.js', 'data/example.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
      vm.runInContext(atlasJs.replace(boot, 'globalThis.SK_TEST={S,WEAK,FD,SG,hard5,KIT,SUBS,ASK,tree7,worstQs,stallN,whereLink,h8,v7,v6list,v8,v10};'), ctx, { filename: 'js/atlas.js' });
      return ctx.SK_TEST;
    };
    // every skill the Skills page lists (weak now, by unit, faded): the link shows exactly when a question on Stall points checks it, and following it narrows the page to those questions
    const stallOK = search => { const X = runSk(search), H = X.hard5(0), ks = [...new Set(X.WEAK.map(m => m.k).concat(H.T.flatMap(U => U.subs.flatMap(J => J.ks.map(K => K.k))), X.FD.map(o => o.k)))], base = X.h8(), bad = [];
      let shown = 0;
      ks.forEach(k => { const n = X.stallN(k), l = X.whereLink(k); if (!!n !== !!l) { bad.push(X.ASK[k] + ': link'); return; } if (!n) return; shown++;
        const w = X.worstQs(X.tree7(0, k), k); X.S.v8.k = k; X.S.v8.view = 'worst'; X.S.v8.tb = 0; X.S.v8.sel[0] = { j: w[0].j, s: w[0].s };
        const ans = X.h8(), html = X.v8(), on = ix => X.KIT[k].includes(ix);
        if (!w.every(C => on(X.SUBS[C.j].its[C.s])) || (html.match(/data-act="v8c"/g) || []).length !== Math.min(8, n) || !html.includes('data-act="v8k"') || !html.includes(`>${X.ASK[k]} · ${n} question`)
          || !(ans.startsWith(`On ${X.ASK[k]}: `) || ans === `Nobody is stalling on ${X.ASK[k]} so far.`) || /undefined|NaN/.test(ans + html)) bad.push(X.ASK[k]);
        X.S.v8.view = 'outline'; const out = X.v8(); if (/undefined|NaN/.test(out) || !/data-act="v8unit"/.test(out)) bad.push(X.ASK[k] + ': outline'); });
      X.S.v8.k = null; X.S.v8.view = 'worst'; if (X.h8() !== base) bad.push('the page\'s own answer changed');
      return { bad, shown, all: ks.length }; };
    let s1, s2, R;
    try { s1 = stallOK(''); s2 = stallOK('?books'); R = runSk(''); } catch (e) { check('js/atlas.js', 'the Skills page\'s links run on the page\'s own code', false, e.message); }
    if (s1) {
    check('js/atlas.js', 'on every skill the Skills page lists, with and without the example\'s books, "Where they stall" shows when a question checks the skill, and following it lists only those questions, worst first, with the skill named in the answer and the bar', !s1.bad.length && !s2.bad.length && s1.shown > 0 && s2.shown > 0, s1.bad.concat(s2.bad).slice(0, 4).join('; '));
    // no view of a skill offers a reteach, since the product has none: weak now and by unit show the skill's state, the class now and the way into its table
    const noRe = h => !/>Reteach|Reteach planned|data-act="v7plan"/.test(h), wk = R.WEAK.map((m, r) => { R.S.v7.r = r; R.S.v7.pts = []; return R.v7(); }), uk = R.WEAK.map(m => { R.S.v6.sel[0] = m.k; return R.v6list(0); });
    check('js/atlas.js', 'no skill\'s panel offers a reteach, on weak now or by unit: the panel shows the skill\'s state, the class now and the way into its table',
      wk.length > 0 && wk.every(noRe) && uk.every(noRe) && wk.every(h => /data-act="tblopen"/.test(h)) && uk.every(h => /data-act="tblopen"/.test(h)));
    // faded: a dot is never pinned to the edge of the axis, and the hover says a date, not a week
    R.S.v10.all = true; const fh = R.v10(), ticks = [...fh.matchAll(/y="20\.0" text-anchor="middle" class="t3">(\d+)<\/text>/g)].map(m => +m[1]), lo = ticks.length ? ticks[0] : NaN, mn = Math.min(...R.FD.flatMap(o => [o.a, o.b]));
    check('js/atlas.js', 'the faded view\'s axis starts low enough for every dot (the class\'s average when taught and later, and the followed student\'s), and its hover gives the day the class first met the skill, not a week',
      lo <= mn && ticks[ticks.length - 1] === 100 && /const sv=rows\.flatMap\(o=>\[o\.a,o\.b\]\)\.concat\(/.test(atlasJs) && /when taught \(first met on \$\{dayDate\(KT\[o\.k\]\)\}\)/.test(atlasJs) && !/\(week \$\{KT/.test(atlasJs), `axis from ${lo}, lowest dot ${Math.round(mn)}`);
    }
  }
  check('js/atlas.js', 'ready for a unit asks which unit is next, picks the first not started after the one the class is in (no line of text says so), marks the started ones, and shows the readiness line under it, unfolded', /const rdDef=tb=>\{const ok=/.test(atlasJs) && /pickCtl\('v11unit',R\.u,unitOpts\(/.test(atlasJs) && /u===CU\?' \(now\)':TB0\[u\]\.on\?' \(done\)':''/.test(atlasJs) && /<\/div>\$\{R\.pre\.length\?rdLine\(R\):''\}/.test(atlasJs) && !/fold\('v11line'|The first unit not started after/.test(atlasJs));
  check('js/atlas.js', 'stretches with no class work are hatched and no line runs through them, on Drifting and on a profile, and every recent figure names its dates', /const quietRects=/.test(atlasJs) && /const RB=NBK-1,RSTART=BS\(RB\);/.test(atlasJs) && /P=live\.map\(j=>f1\(px\(j\)\)/.test(atlasJs) && /ap=live\.map\(j=>/.test(atlasJs) && /the latest work was on \$\{dayDateY\(LASTWORK\)\}/.test(atlasJs) && /`Work, \$\{RECENT\}`/.test(atlasJs));
  // time is in days and dates: today is the export date (or ?today=), recent is the last five days, breaks are read from the data, and nothing is assumed about class days or weeks
  check('js/atlas.js', 'every page has an "As of" date picker under the answer that re-reads the pages as of that day, with a way back to today', /id="asof"/.test(atlasJs) && /asOfUrl=iso=>withQ\('today',iso\)/.test(atlasJs) && /case 'today':location\.assign\(asOfUrl\(isoOf\(EXPORTDAY\)\)\)/.test(atlasJs) && /const DEMODAY=/.test(atlasJs) && /const demoDay=k=>k===3&&!ASOF&&!JUDGE&&DEMODAY!==TODAY;/.test(atlasJs) && /max="\$\{isoOf\(EXPORTDAY\)\}"/.test(atlasJs));
  check('js/atlas.js', 'today is the export date unless the address says otherwise, and nothing is counted in weeks or assumes a class day', /D\.meta\.exported\?dayOf\(D\.meta\.exported\)/.test(atlasJs) && /\[\?&\]today=\(\\d\{4\}-\\d\{2\}-\\d\{2\}\)/.test(atlasJs) && (atlasJs.match(/\bweeks?\b/gi) || []).length <= 3 && !/wkOf|CDAYS|half the class worked|classDays/.test(atlasJs) && /const RECHECK=21,/.test(atlasJs));
  check('js/atlas.js', 'effort is any work in five-day blocks against the student\'s own normal, breaks are blocks in which nobody worked, and drifting is judged only while classmates are not low too', /const B5=5,/.test(atlasJs) && /const WB=ALL\.map\(i=>\{const a=new Array\(NBK\)\.fill\(0\);AT\[i\]\.forEach/.test(atlasJs) && /ONB=CTOT\.map\(t=>t>0\)/.test(atlasJs) && /const CLASSLOW=!CLASSIDLE&&NJUDGE>0&&NLOW>=NJUDGE\/2;/.test(atlasJs) && /const JUDGE=!TOOFEW&&!CLASSIDLE&&!CLASSLOW;/.test(atlasJs) && /WB\[i\]\[j\]<NORM\[i\]\/2/.test(atlasJs));
  check('js/atlas.js', 'a time axis carries dates only, never unit bands, and the skills page filters by unit instead (the skills introduced through a unit)', !/BANDU\.forEach/.test(atlasJs) && !/for\(const u of BANDU\)/.test(atlasJs) && /pickCtl\('v7unit',uf,\[\['all','All units'\]\]\.concat\(units\.map/.test(atlasJs) && /uok=k=>uf==='all'\|\|uOf\(k\)<=\+uf/.test(atlasJs));
  check('js/atlas.js', 'a picker with many options (a unit, a book) is one select grouped by book, never a row of buttons', /const pickCtl=/.test(atlasJs) && /const unitOpts=us=>MULTI&&PICK===null\?BKON\.map/.test(atlasJs) && !/seg\('v11u'|seg\('v2pick'|seg\('v10u'|seg\('bk'|seg\('v7u'/.test(atlasJs) && /pickCtl\('bksel'/.test(atlasJs) && /pickCtl\('v10unit'/.test(atlasJs));
  check('js/atlas.js', 'work on earlier or later units shows on the profile only, as catching up or working ahead', /function sideWork\(i\)/.test(atlasJs) && /Catching up: \$\{swTxt\(sw\.back\)\}/.test(atlasJs) && /Working ahead: \$\{swTxt\(sw\.ahead\)\}/.test(atlasJs) && !/Catching up/.test(atlasJs.slice(atlasJs.indexOf('function flags('), atlasJs.indexOf('/* ---------- view 2: engagement and performance'))));
  check('js/atlas.js', 'the engagement and performance page opens on the unit\'s chart and cards, with the started units as a row of buttons and the others counted', /pickCtl\('v2unit',E\.sel\.id,unitOpts\(TAUGHT\)/.test(atlasJs) && /\+\$\{ns\.length\} not started/.test(atlasJs) && /tp0\.innerHTML=none\?/.test(atlasJs));
  // a card or a student picked beside the chart (asked 2026-10-23): the points that belong to it stay in focus and every other point is dimmed
  check('js/atlas.js', 'on Engagement and performance a card\'s heading is a switch that picks its students out on the chart, a student followed is picked out the same way, the latest pick wins, and a second click or Esc shows everyone again',
    /const dim2=P=>\{const g=S\.v2\.hl,F=new Set\(P\.filter\(p=>g\?p\.c\.g===g:p\.i===S\.stu\)\.map\(p=>p\.i\)\);return i=>F\.size&&!F\.has\(i\)\?' dim':''\};/.test(atlasJs)
      && /<button class="dl agh" type="button" data-act="v2hl" data-g="\$\{g\}" aria-pressed="\$\{on\}"/.test(atlasJs) && /case 'v2hl':\{S\.v2\.hl=S\.v2\.hl===d\.g\?null:d\.g;/.test(atlasJs)
      && /S\.stu=S\.stu===i\?null:i;if\(S\.stu!==null\)S\.v2\.hl=null;/.test(atlasJs) && /case 'prof':\{if\(S\.stu!==\+d\.i\)S\.v2\.hl=null;/.test(atlasJs) && /if\(S\.view===2&&S\.v2\.hl\)\{[^}]*S\.v2\.hl=null;hideTip\(\);v2draw\(\);/.test(atlasJs)
      && /<g class="hit\$\{dm\(p\.i\)\}" data-act="stu"/.test(atlasJs) && /\.ag\.on\{border-color:var\(--accent\)/.test(atlas) && /\.viz \.dim\{opacity:\.28\}/.test(atlas));
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const runV2 = search => {
      const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
      const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
        location: { search, hash: '#engagement', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
      ['data/class.js', 'data/sample.js', 'data/example.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
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
  // a followed student on the Skills page's By unit view, as Stall points shows one (asked 2026-10-23): a mark on a skill, counts on a unit or subunit
  check('js/atlas.js', 'on By unit a followed student has a column as on Stall points: on a skill the mark for where they are, on a subunit or unit how many of its skills each mark stands for (a skill once), never a mark a skill',
    /const cnt5=\(i,ks\)=>\{const c=\{E:0,H:0\},seen=new Set\(\);/.test(atlasJs) && /const smR5=\(i,ks\)=>\{const c=cnt5\(i,ks\);return \(c\.E\?`<span class="pmn"><i class="sd e"><\/i>\$\{c\.E\}<\/span>`:''\)\+\(c\.H\?`<span class="pmn"><i class="sd h"><\/i>\$\{c\.H\}<\/span>`:''\)\};/.test(atlasJs)
      && /\$\{one\?smk5\(sel,ks\):smR5\(sel,ks\)\}/.test(atlasJs) && /\$\{sc\(\[K\],true\)\}/.test(atlasJs) && /\.hc\.fol \.hr\{grid-template-columns:minmax\(0,min\(38%,460px\)\) minmax\(120px,1fr\) 84px 66px\}/.test(atlas));
  {
    const vm = require('node:vm'), boot = 'renderHead();fromHash();render();';
    const nodes = new Map(), node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1450, classList: { toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } }); return nodes.get(id); };
    const ctx = vm.createContext({ window: { innerWidth: 1750, addEventListener() {} }, document: { querySelector: node, getElementById: id => node('#' + id), addEventListener() {} },
      location: { search: '', hash: '#hardest', pathname: '/index.html', assign() {}, replace() {} }, setTimeout() { return 1; }, clearTimeout() {}, console });
    ['data/class.js', 'data/sample.js', 'data/example.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
    let bu = null;
    try { vm.runInContext(atlasJs.replace(boot, 'globalThis.BU_TEST={S,v6list,v7,WEAK,hard5,mast,lvOf,LV,lvAll5,ALL,NM};'), ctx, { filename: 'js/atlas.js' }); bu = ctx.BU_TEST; } catch (e) { check('js/atlas.js', 'By unit runs on the page\'s own code', false, e.message); }
    if (bu) { const bad = []; let rowsN = 0;
      // every student followed, the outline opened down to its skills: each row's marks read off the drawing against the levels the page has
      const H = bu.hard5(0), E = bu.S.v6.ex[0] = { U: [], J: [] }, { us, js } = bu.lvAll5(0); E.U = us.slice(); E.J = js.slice();
      bu.ALL.forEach(i => { bu.S.stu = i; const h = bu.v6list(0), cnt = ks => { const c = { E: 0, H: 0 }, seen = new Set(); ks.forEach(K => { if (K.p === null || seen.has(K.k)) return; seen.add(K.k); const m = bu.mast(i, K.k); if (m && c[m.cat] !== undefined) c[m.cat]++; }); return c; };
        const want = r => `${r.E ? `<span class="pmn"><i class="sd e"></i>${r.E}</span>` : ''}${r.H ? `<span class="pmn"><i class="sd h"></i>${r.H}</span>` : ''}`;
        const marks = [...h.replace(/<li class="hh"[^]*?<\/li>/, '').matchAll(/<span class="hs">((?:(?!<span class="sr">|<\/span><\/button>)[^])*)/g)].map(m => m[1]);   // the rows, not the column's heading
        const exp = []; H.T.filter(U => U.on).forEach(U => { exp.push(want(cnt(U.subs.flatMap(J => J.ks)))); U.subs.filter(J => J.on && J.ks.length).forEach(J => { exp.push(want(cnt(J.ks))); J.ks.forEach(K => { const m = K.p === null ? null : bu.mast(i, K.k), c = m ? m.cat : 'N'; exp.push(c === 'E' ? '<i class="sd e"></i>' : c === 'H' ? '<i class="sd h"></i>' : ''); }); }); });
        rowsN += exp.length; if (marks.length < exp.length || exp.some(v => !marks.includes(v))) bad.push(bu.NM[i]);
        if (/(<i class="sd [eh]"><\/i>){2}/.test(h.replace(/<div class="legend[^]*?<\/div>/, ''))) bad.push(bu.NM[i] + ': a mark a skill'); });
      bu.S.stu = null;
      check('js/atlas.js', 'with every student followed, By unit opened down to its skills draws on each unit and subunit the counts of its distinct skills by mark, on each skill one mark, and nowhere two marks side by side', !bad.length && rowsN > 0, `${bad.slice(0, 4).join('; ')} · ${rowsN} rows`);
      // the class now on a skill's panel (asked 2026-10-23: as a picked day's bar): every skill By unit can pick, and every weak skill, read off the bar's own counts
      const bad2 = []; let bars = 0; const want = k => { const c = [0, 0, 0, 0, 0], u = [0]; bu.ALL.forEach(i => { const m = bu.mast(i, k); if (m && m.ev >= 2 && m.c !== null) c[bu.lvOf(m.c)]++; else u[0]++; }); return [4, 3, 2, 1, 0].filter(b => c[b]).map(b => `${c[b]} ${bu.LV[b].toLowerCase()}`).concat(u[0] ? [`${u[0]} unavailable`] : []).join(', '); };
      const read = h => { const m = h.match(/<div class="sbs"><div class="sbrow"><p class="sbl"><b>The class now<\/b> · (\d+)% of the (\d+) checked mastered<\/p><span class="sb" role="img" aria-label="([^"]+)">/); return m ? m[3] : null; };
      H.T.forEach(U => U.subs.forEach(J => J.ks.forEach(K => { if (K.p === null) return; bu.S.v6.sel[0] = K.k; const got = read(bu.v6list(0)); bars++; if (got !== want(K.k)) bad2.push(`by unit ${K.k}: ${got}`); })));
      bu.WEAK.forEach((m, r) => { bu.S.v7.r = r; bu.S.v7.pts = []; bu.S.v7.more = true; const got = read(bu.v7()); bars++; if (got !== want(m.k)) bad2.push(`weak ${m.k}: ${got}`); }); bu.S.v7.more = false;
      check('js/atlas.js', 'a skill\'s panel on Weak now and By unit draws the class now as a picked day is drawn: one bar of every student by level with the counts in it, mastered first, then unavailable, under the share mastered, with its key; the thin bar and its line of counts are gone',
        !bad2.length && bars > 0 && /const nowBar=k=>/.test(atlasJs) && /\$\{nowBar\(m\.k\)\}/.test(atlasJs) && /nowBar\(k0\)/.test(atlasJs) && !/The class now<\/span>\$\{hbar/.test(atlasJs) && !/\.evs\{|\.ev\{/.test(atlas), `${bad2.slice(0, 4).join('; ')} · ${bars} panels`); }
  }
  // a skill's students and questions as one table, ALPS's results table, in a dialog (asked 2026-10-23): it takes the place of the name lists on the Skills page's panels
  check('js/atlas.js', 'each view of the Skills page opens a skill\'s table from its panel, and the panels no longer list the students: the table names them, with the level and score behind each, their last activity, and ALPS\'s result a question, in ALPS\'s own labels, with no trend and no tried column',
    (atlasJs.match(/\$\{tblGo\((m\.k,'weak'|k0,'unit'|k,'faded')\)\}/g) || []).length === 4 && !/whoCol\('Beginning or attempted'|whoCol\('Slipped 20\+ points'|whoCol\(`Weak around/.test(atlasJs) && !/\bmNow\b|\bmThen\b/.test(atlasJs)
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
      ['data/class.js', 'data/sample.js', 'data/example.js', 'data/prereqs.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
      vm.runInContext(atlasJs.replace(boot, 'globalThis.TB_TEST={S,tblHTML,tblGo,openTbl,ptSel,ptGroups,STW,BE,estOf,KIT,IWHO,N,CAT,CUR,EV,MT,ML,LV,lvOf,credit,AT,WEAK,FD,SG,fadeKind,hard5,NM,ASK,ALL,NBC,v7,v6list,v10};'), ctx, { filename: 'js/atlas.js' });
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
            const got = [...r.matchAll(/<td class="q[^"]*"[^>]*><span class="rs" role="img" aria-label="([^"]+)">/g)].map(m => m[1]);
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
      let points = 0, actions = 0;
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
          const got = [...r.matchAll(/<td class="q[^"]*"[^>]*><span class="rs" role="img" aria-label="([^"]+)">/g)].map(m => m[1]), exp = qs.map(ix => { const a = X.AT[i].get(ix); return RSW(a && a[6] <= d ? a : null); });
          if (got.join() !== exp.join()) bad.push(`${name} · ${X.NM[i]}: marks`); });
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
      X.S.v7.pts = []; X.S.v7.r = 0; X.S.v7.more = false; X.S.tbl = null; return { bad, tables, marks, skills: ks.length, seen, points, actions }; };
    let t1, t2;
    try { t1 = tableOK(''); t2 = tableOK('?books'); } catch (e) { check('js/atlas.js', 'the skill\'s table runs on the page\'s own code', false, e.message); }
    if (t1) check('js/atlas.js', 'on every skill the Skills page lists, with and without the example\'s books, and on points picked on every weak skill\'s line (one day, two days, two skills), the table shows the questions a quarter of the class started (or, ticked, every one anybody started), a row a student weakest first, each level and score as the page has them, the slip arrow exactly when the score fell 20 points since taught, each mark ALPS\'s result on that attempt (correct on first attempt, correct after retries, rapid retries when the retries took three seconds or less, not yet correct, not started), the first row the count not yet correct, each group just its students, and it opens on the group the view is about, or on everyone; a point\'s table has the level the line has for its day (a column a day, or a skill), the marks of the attempts made by then, and the panel\'s groups',
      !t1.bad.length && !t2.bad.length && t1.tables > 0 && t2.tables > 0 && t1.points > 0 && t2.points > 0 && t1.actions > 0 && ['Correct on first attempt', 'Correct after retries', 'Rapid retries: all retries within 3 seconds', 'Not yet correct', 'Not started'].every(v => t1.seen[v] > 0), `${t1.bad.concat(t2.bad).slice(0, 4).join('; ')} · ${t1.skills + t2.skills} skills, ${t1.tables + t2.tables} tables (${t1.points + t2.points} for points, ${t1.actions + t2.actions} with today's actions), ${t1.marks + t2.marks} marks`);
  }
  check('js/atlas.js', 'my actions opens on the log, and the headline counts real sets only', /const prog=`<div class="detail lead" id="log"><div class="dhead"><h3>My actions today<\/h3>/.test(atlasJs) && /return prog\+sets\+fence\}/.test(atlasJs) && /s:'My actions'/.test(atlasJs));
  // students are listed to be scanned, not as chips: one list everywhere, a row a student, alphabetical, in columns, with the number behind a place
  check('js/atlas.js', 'every list of students is one list: a row a student in alphabetical order, in columns once it is long, the number behind each place at the right under a short caption, and no chips left on any page',
    /const roster=\(rows,o\)=>\{/.test(atlasJs) && /\.sort\(\(a,b\)=>a\.n\.localeCompare\(b\.n\)\)/.test(atlasJs) && /<ul class="roster\$\{rs\.length>6&&o\.cols!==false\?' cols':''\}">/.test(atlasJs) && /const names=\(a,val\)=>roster\(/.test(atlasJs)
      && /const gcap=E\.sel\.t==='u'\?'key skills mastered':E\.sel\.t==='j'\?'skills mastered':'score';/.test(atlasJs) && /rcap\(g==='stuck'\?gcap:'questions tried'\)/.test(atlasJs) && /E\.sel\.t==='k'\?Math\.round\(c\.st\.f\*100\)\+'%'/.test(atlasJs) && /rcap\('questions tried, of their normal'\)/.test(atlasJs) && /\{rm:\['v11rm',key\]\}/.test(atlasJs)
      && !/class="names|class="fl-names|class="chipx|<span class="gn">/.test(atlasJs) && !/\.names\{|\.fl-names\{|\.chipx|\.gn\{/.test(atlas) && /\.roster\.cols\{columns:150px/.test(atlas) && /\.dgrid\{display:grid;grid-template-columns:minmax\(0,1fr\)/.test(atlas));
  // ready for a unit has four other versions to compare (v1 to v4), switched beside the unit and opened from the address
  check('js/atlas.js', 'ready for a unit offers the current tree and four versions of it (left to right, radial, weighted, class split) with the same rings, links, key and plan, switched in one select beside the unit, opened with ?rv=1 to 4, each with its own "How to read" of fifty words or so',
    /const RDV=\[\['now','Current'\],\['1','v1 · Left to right'\],\['2','v2 · Radial'\],\['3','v3 · Weighted'\],\['4','v4 · Class split'\]\];/.test(atlasJs) && /\$\{pickCtl\('v11ver',S\.v11\.ver,RDV,'Version'\)\}/.test(atlasJs) && /const RV0=\(location\.search\.match\(\/\[\?&\]rv=\(\[1-4\]\)/.test(atlasJs)
      && /else if\(id==='v11ver'\)\{S\.v11\.ver=t\.value;/.test(atlasJs) && !/v11lane|rdLaneAct|class="lanes"|class="rdg"|class="gob"/.test(atlasJs) && /HOWK=k=>k===10&&S\.v11\.ver!=='now'&&RDHOW\[S\.v11\.ver\]/.test(atlasJs) && /const RDT=\{'1':rdTreeLR,'2':rdTreeRadial\};/.test(atlasJs) && /if\(V==='1'\|\|V==='2'\)s=RDT\[V\]\(/.test(atlasJs) && /const ring1=\(x,y,r,sw,p,k\)=>p===null\?noRing\(x,y,r\):V==='4'\?splitRing\(/.test(atlasJs) && !/rdModel|tmSplit|class="otree"/.test(atlasJs)
      && (src => src.length === 4 && src.every(t => t.split(/\s+/).length <= 53))(((atlasJs.match(/const RDHOW=\{([^]*?)\};/) || [])[1] || '').split('\n').map(l => (l.match(/^\s*'\d':'(.*)',?$/) || [])[1]).filter(Boolean)));
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

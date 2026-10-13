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
  ['--on-mas', '--ms-s'], ['--on-mas', '--ms-m'], ['--ink', '--ms-d'], ['--ink', '--ms-n']].forEach(pair => {
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
  check('css/atlas.css', 'a standing is one colour that only gets darker: not yet, developing, proficient, mastered', (m => m.every(Boolean) && m.every((c, i) => !i || (lum(m[i - 1]) > lum(c) && ratio(m[i - 1], c) >= 1.5)))([av['--ms-n'], av['--ms-d'], av['--ms-s'], av['--ms-m']]), `${av['--ms-n']} ${av['--ms-d']} ${av['--ms-s']} ${av['--ms-m']}`);
  // data/sample.js is the one place with invented numbers: it must say so, and the screen must mark every row that comes from it
  const sampleSrc = (() => { try { return fs.readFileSync(path.join(root, 'data/sample.js'), 'utf8'); } catch (e) { return null; } })();
  if (sampleSrc) {
    const w = {}; new Function('window', sampleSrc)(w); const iv = (w.ATLAS_SAMPLE || {}).interventions || [], script = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
    check('data/sample.js', 'the sample file says its numbers are invented', /INVENTED/.test(sampleSrc));
    check('data/sample.js', 'every sample row has an estimate inside its range', iv.length > 0 && iv.every(d => d.lo <= d.est && d.est <= d.hi));
    check('data/sample.js', 'every student a sample row names is in the class', iv.every(d => d.who === 'all' || d.who.every(n => A.students.includes(n))));
    check('js/atlas.js', 'rows from the sample file are marked as sample on screen', /sample:true/.test(script) && /· sample/.test(script) && /<span class=\\?"pill\\?">Sample<\/span>/.test(script));
    // the four things a teacher can do in the product: a reteach, coursework, content to practice, a group. Nothing is sent, launched, marked or changed in the course
    check('js/atlas.js', 'every action a page offers, and every sample row, is a reteach, coursework, content to practice or a group; nothing is sent, launched or marked', !/Message home|Check in|check-in|Not a concern|required check|worked example|Talk to them|coding club|Messages home|Stretch task|Message copied/.test(script + sampleSrc)
      && /Reteach in a small group/.test(script) && /Generate practice/.test(script) && /Assign the practice/.test(script) && /Stretch set/.test(script) && /Give a review set/.test(script) && /Assign it as coursework/.test(script) && /Reteach this/.test(script) && /Reteach in a small group/.test(script));
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
  check('js/atlas.js', 'every page and a profile have the same book filter, the first control under the answer: all the books, or one with work; the pick is in the address and a change reloads the page',
    /id="ans">\$\{HL\[k\]\(\)\}<\/p>\$\{bkBar\(\)\}\$\{body\}/.test(atlasSrc) && /<\/div><\/div>\$\{bkBar\(\)\}/.test(atlasSrc) && /location\.search\.match\(\/\[\?&\]book=\(\[\^&#\]\*\)\/\)/.test(atlasSrc) && /id==='bksel'\)location\.assign\(bkUrl\(/.test(atlasSrc) && /\[\['all','All books'\]\]\.concat\(BKON\.map/.test(atlasSrc));
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
    /const EXQ=\/\[\?&\]books\(\?=\[&=\]\|\$\)\/\.test\(location\.search\);/.test(atlasSrc) && /b\.att===D\.att\.length\)\}\)\(\);/.test(atlasSrc) && /const EX=EXQ&&EXOK\?/.test(atlasSrc) && /' Books: '/.test(atlasSrc) && /' \(listed, no work yet\)'/.test(atlasSrc) && /is invented \(data\/example\.js\); the rest is real\./.test(atlasSrc)
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
  // the look follows Material UI: Roboto, a 4px corner, the elevation shadows, and selection in the primary colour
  check('css/atlas.css', 'the stylesheet follows Material UI: Roboto, 4px corners, elevation, selection in the primary colour',
    /--font:"Roboto"/.test(atlas) && /--radius:4px/.test(atlas) && /--e1:0 2px 1px -1px rgba\(0,0,0,\.2\)/.test(atlas) && /--accent:var\(--blue\)/.test(atlas) && /family=Roboto/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
  check('js/atlas.js', 'shared weak skills are drawn as pale areas with a thin line, not as solid bands', /style="fill:\$\{col\};opacity:\.16"\/><polyline/.test(atlasJs));
  // every page has one priority number, and that number is what the tabs, the overview's flags and the bar for a followed student show
  const priIds = ((atlasJs.match(/const PRI=\[([^;]*)\];/) || [])[1] || '').match(/\[(\d+),'/g) || [], priSet = priIds.map(t => +t.slice(1).split(',')[0]);
  check('js/atlas.js', 'every page in the rail has exactly one priority, 1 to 7, and the by-unit and faded views keep their ids under the skills page', priSet.length === 7 && new Set(priSet).size === 7 && [2, 3, 4, 6, 7, 10, 11].every(k => priSet.includes(k)) && /PN\[5\]=PN\[6\]\+\.4;PN\[9\]=PN\[6\]\+\.5/.test(atlasJs), priSet.join(' '));
  check('js/atlas.js', 'no priority number is shown: the rail\'s order carries it, and the overview and the bar for a followed student name pages, not numbers',
    !/\$\{PN\[k\]\}<\/span>/.test(atlasJs) && !/\$\{PN\[f\.v\]\}<\/span>/.test(atlasJs) && !/class="rn[ "]/.test(atlasJs) && !/class="vchip/.test(atlasJs) && /tp\(`Open \$\{VM\[f\.v\]\.s\}`\)/.test(atlasJs) && /GROUPS=\[\['Students',\[2,3,4\]\],\['Content',\[6,7\]\],\['Act and check',\[10,11\]\]\]/.test(atlasJs));
  // the changes of 13 October 2026, from the first-time-teacher review (reports/first-time-teacher-review.md): what a teacher sees first on each page, and how a unit and pace are judged
  check('js/atlas.js', 'a unit\'s standing comes from its key skills (checked by its own summary, test, exercise and practice lessons, and carried forward) with mastered gated by its hard ones',
    /const TESTRE=\/summary\|test\|exam\|exercises\|practice\|frq\/i;/.test(atlasJs) && /\(LISTED\[k\]>=2&&KIT\[k\]\.length>=3\)\|\|need\.has\(k\)/.test(atlasJs) && /f>=\.9&&!hardNY\?'M':\(f>=\.6&&n<=\.25\)\?'P':\(f>=\.3\|\|n<=\.5\)\?'D':'N'/.test(atlasJs) && /w\.slice\(0,Math\.ceil\(w\.length\/3\)\)/.test(atlasJs));
  check('js/atlas.js', 'pace projects only the target unit\'s skills, with unknown estimates kept separate', /function paceScope\(u\)/.test(atlasJs) && /function paceOf\(i\)/.test(atlasJs) && /Too early to tell/.test(atlasJs) && !/const FIN=/.test(atlasJs));
  check('js/atlas.js', 'the goal has a target-unit picker, a calendar date and sorting, without a whole-course skill slider', /pickCtl\('v4unit'/.test(atlasJs) && /type="date" id="v4date"/.test(atlasJs) && /pickCtl\('v4sort'/.test(atlasJs) && !/id="v4goal"/.test(atlasJs));
  check('js/atlas.js', 'the grid and profile still use the same unit standing', /const st=n\.t==='u'\?standU\(i,k\):n\.t==='j'\?standJ\(i,k\):/.test(atlasJs) && /\['M','P'\]\.includes\(standU\(i,u\)\.s\)/.test(atlasJs) && /const SL=\{M:'Mastered',P:'Proficient',D:'Developing',N:'Not yet'/.test(atlasJs));
  check('js/atlas.js', 'the grid\'s key sits beside the unit picker on Effort and mastery, and no page shows sparklines or numbered flag chips', /const CELLKEY=\(\)=>/.test(atlasJs) && /\$\{pick\}\$\{CELLKEY\(\)\}/.test(atlasJs) && !/secSpark|class="vchips"/.test(atlasJs));
  check('js/atlas.js', 'an invented sample row is attached to nobody: not a profile moment, not a flag, not a mark on a followed student, not a name in a panel, and never in the headline', /IVS\.forEach\(d=>\{if\(d\.sample\)return;/.test(atlasJs) && /IVS\.filter\(d=>!d\.sample&&d\.who\.length<N/.test(atlasJs) && /got=sel!==null&&!d\.sample&&/.test(atlasJs) && /const real=IVS\.filter\(d=>!d\.sample\)/.test(atlasJs) && /Invented: no student of this class did it\./.test(atlasJs) && /fold\('v12sample'/.test(atlasJs));
  check('js/atlas.js', 'the three skills pages are one page with three views (weak now, by unit, faded), and the old addresses still open their view', /const toPage=k=>\{if\(k===5\)\{S\.v7\.view='unit';return 6\}if\(k===9\)\{S\.v7\.view='faded';return 6\}/.test(atlasJs) && /const vSk=\(\)=>skTabs\(\)\+/.test(atlasJs) && /OLDSLUG=\{'overview':2,'weak-skills':6,'worked':11\}/.test(atlasJs) && /\[\['weak','Weak now'\],\['unit','By unit'\],\['faded','Faded'\]\]/.test(atlasJs));
  check('js/atlas.js', 'weak skills run under a heading a status with no status word on each row, the faded ones say what they fell from, and empty statuses have no tab', /T\(10,y\+gh-12,`\$\{g\.st\} · \$\{g\.all\}`/.test(atlasJs) && /`faded: \$\{Math\.round\(fd\.a\)\}% → \$\{Math\.round\(fd\.b\)\}%`/.test(atlasJs) && /STS\.filter\(st=>cnt\(st\)\)/.test(atlasJs) && !/T\(xb\+BWD\+34,yc\+4,m\.st/.test(atlasJs));
  check('js/atlas.js', 'stall points opens on the worst questions as one ranked list, with the outline one click away, and a link into the outline opens that view', /\[\['worst','Worst questions'\],\['outline','By unit'\]\]/.test(atlasJs) && /\.slice\(0,8\);/.test(atlasJs) && /S\.v8\.view='outline'\}/.test(atlasJs));
  check('js/atlas.js', 'ready for a unit asks which unit is next, picks the first not started after the one the class is in, marks the started ones, and folds the readiness line', /const rdDef=tb=>\{const ok=/.test(atlasJs) && /pickCtl\('v11unit',R\.u,unitOpts\(/.test(atlasJs) && /u===CU\?' \(now\)':TB0\[u\]\.on\?' \(done\)':''/.test(atlasJs) && /fold\('v11line'/.test(atlasJs));
  check('js/atlas.js', 'stretches with no class work are hatched and no line runs through them, on Drifting and on a profile, and every recent figure names its dates', /const quietRects=/.test(atlasJs) && /const RB=NBK-1,RSTART=BS\(RB\);/.test(atlasJs) && /P=live\.map\(j=>f1\(px\(j\)\)/.test(atlasJs) && /ap=live\.map\(j=>/.test(atlasJs) && /the latest work was on \$\{dayDateY\(LASTWORK\)\}/.test(atlasJs) && /`Work, \$\{RECENT\}`/.test(atlasJs));
  // time is in days and dates: today is the export date (or ?today=), recent is the last five days, breaks are read from the data, and nothing is assumed about class days or weeks
  check('js/atlas.js', 'every page has an "As of" date picker under the answer that re-reads the pages as of that day, with a way back to today', /id="asof"/.test(atlasJs) && /asOfUrl=iso=>withQ\('today',iso\)/.test(atlasJs) && /case 'today':location\.assign\(asOfUrl\(isoOf\(EXPORTDAY\)\)\)/.test(atlasJs) && /const DEMODAY=/.test(atlasJs) && /const demoDay=k=>k===3&&!ASOF&&!JUDGE&&DEMODAY!==TODAY;/.test(atlasJs) && /max="\$\{isoOf\(EXPORTDAY\)\}"/.test(atlasJs));
  check('js/atlas.js', 'today is the export date unless the address says otherwise, and nothing is counted in weeks or assumes a class day', /D\.meta\.exported\?dayOf\(D\.meta\.exported\)/.test(atlasJs) && /\[\?&\]today=\(\\d\{4\}-\\d\{2\}-\\d\{2\}\)/.test(atlasJs) && (atlasJs.match(/\bweeks?\b/gi) || []).length <= 3 && !/wkOf|CDAYS|half the class worked|classDays/.test(atlasJs) && /const RECHECK=21,/.test(atlasJs));
  check('js/atlas.js', 'effort is any work in five-day blocks against the student\'s own normal, breaks are blocks in which nobody worked, and drifting is judged only while classmates are not low too', /const B5=5,/.test(atlasJs) && /const WB=ALL\.map\(i=>\{const a=new Array\(NBK\)\.fill\(0\);AT\[i\]\.forEach/.test(atlasJs) && /ONB=CTOT\.map\(t=>t>0\)/.test(atlasJs) && /const CLASSLOW=!CLASSIDLE&&NJUDGE>0&&NLOW>=NJUDGE\/2;/.test(atlasJs) && /const JUDGE=!TOOFEW&&!CLASSIDLE&&!CLASSLOW;/.test(atlasJs) && /WB\[i\]\[j\]<NORM\[i\]\/2/.test(atlasJs));
  check('js/atlas.js', 'a time axis carries dates only, never unit bands, and the skills page filters by unit instead (the skills introduced through a unit)', !/BANDU\.forEach/.test(atlasJs) && !/for\(const u of BANDU\)/.test(atlasJs) && /pickCtl\('v7unit',uf,\[\['all','All units'\]\]\.concat\(units\.map/.test(atlasJs) && /uok=k=>uf==='all'\|\|uOf\(k\)<=\+uf/.test(atlasJs));
  check('js/atlas.js', 'a picker with many options (a unit, a book) is one select grouped by book, never a row of buttons', /const pickCtl=/.test(atlasJs) && /const unitOpts=us=>MULTI&&PICK===null\?BKON\.map/.test(atlasJs) && !/seg\('v11u'|seg\('v2pick'|seg\('v10u'|seg\('bk'|seg\('v7u'/.test(atlasJs) && /pickCtl\('bksel'/.test(atlasJs) && /pickCtl\('v10unit'/.test(atlasJs));
  check('js/atlas.js', 'work on earlier or later units shows on the profile only, as catching up or working ahead', /function sideWork\(i\)/.test(atlasJs) && /Catching up: \$\{swTxt\(sw\.back\)\}/.test(atlasJs) && /Working ahead: \$\{swTxt\(sw\.ahead\)\}/.test(atlasJs) && !/Catching up/.test(atlasJs.slice(atlasJs.indexOf('function flags('), atlasJs.indexOf('/* ---------- view 2: effort and mastery'))));
  check('js/atlas.js', 'the effort page opens on the unit\'s chart and cards, with the started units as a row of buttons and the others counted', /pickCtl\('v2unit',E\.sel\.id,unitOpts\(TAUGHT\)/.test(atlasJs) && /\+\$\{ns\.length\} not started/.test(atlasJs) && /tp0\.innerHTML=none\?/.test(atlasJs));
  check('js/atlas.js', 'my actions opens on the log, and the headline counts real sets only', /const prog=`<div class="detail lead" id="log"><div class="dhead"><h3>My actions today<\/h3>/.test(atlasJs) && /return prog\+sets\+fence\}/.test(atlasJs) && /s:'My actions'/.test(atlasJs));
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

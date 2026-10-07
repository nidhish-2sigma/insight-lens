/* Insight Lens mock · the row every screen is built from.

   A finding is shown as three columns, read left to right: what we see, how we know, what to do and why.
   Words are kept to a short title, a few facts as chips, and one line of reason beside the button. The
   evidence is a small picture in one of two forms: labelled bars on one scale, or named students. The amber
   mark is always the group the action goes to, so a button can be checked against the picture beside it.

   Findings, ranking, actions and counts come from the shared insight records (04b-insights). This file only
   words and draws them, for the Brief and for every tab. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, h = IL.h, pct = IL.pct;
  if (!root.document) return;
  var plural = U.plural, R = (IL.R = {});

  function kindOf(s) { return s.id === 'good-up' ? 'up' : s.id === 'good-ready' ? 'ready' : s.id === 'fastwrong-class' ? 'fwclass' : s.id.split('-')[0]; }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function and(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  function letter(i) { return String.fromCharCode(65 + i); }
  function sidsOf(rows) { return rows.map(function (x) { return x.sid; }); }
  R.kindOf = kindOf; R.cap = cap; R.and = and;

  // ---------- the two evidence forms ----------
  // Labelled bars on one scale: the track is the whole, the fill is the share. A row with `sid` is a student.
  // o.cap is a few words above the bars saying what they measure; o.limit keeps the list short.
  R.bars = function (rows, max, o) {
    o = o || {};
    max = max || Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1;
    var shown = o.limit ? rows.slice(0, o.limit) : rows, list = o.list || rows.map(function (r) { return r.sid; }).filter(Boolean);
    var out = shown.map(function (r) {
      var w = r.v > 0 ? Math.max(2, U.clamp(r.v / max, 0, 1) * 100) : 0;
      var row = h('div', { class: 'mb-row' + (r.hot ? ' hot' : '') + (r.onClick ? ' click' : ''), tip: r.tip || null },
        h('span', { class: 'mb-lab', title: r.sid ? null : r.label }, r.sid ? IL.who(r.sid, list) : r.label),
        h('span', { class: 'mb-track' }, h('i', { class: 'mb-fill ' + (r.tone || 'grey'), style: 'width:' + w.toFixed(1) + '%' })),
        h('span', { class: 'mb-val' }, r.text));
      if (r.onClick) row.addEventListener('click', r.onClick);
      return row;
    });
    if (shown.length < rows.length) out.push(h('div', { class: 'mb-more' }, '+' + (rows.length - shown.length) + ' more'));
    return h('div', { class: 'mb' + (o.cls ? ' ' + o.cls : '') }, o.cap ? h('div', { class: 'mb-cap' }, o.cap) : null, out);
  };
  // One bar of parts, with an optional black line for a reference (typical, or the class median).
  R.meter = function (segs, ref, refTip) {
    return h('div', { class: 'wk-meter' }, h('div', { class: 'wk-bar' }, segs.map(function (s) { return s.v > 0 ? h('i', { class: 'mb-fill ' + s.tone, style: 'width:' + (U.clamp(s.v, 0, 1) * 100).toFixed(1) + '%', tip: s.tip || null }) : null; })),
      ref != null ? h('b', { class: 'wk-tick', style: 'left:' + (U.clamp(ref, 0, 1) * 100).toFixed(1) + '%', tip: refTip || null }) : null);
  };
  // Named students: amber for the ones the action goes to, grey for the rest. The reason is on the tooltip.
  R.pills = function (entries, list, max) {
    max = max || 6;
    list = list || sidsOf(entries.filter(function (e) { return !e.plain; }));
    var out = entries.slice(0, max).map(function (e) {
      return h('span', { class: 'pill' + (e.hot ? ' hot' : ''), tip: e.tip || null }, h('i'), e.plain ? IL.nm(e.sid) : IL.who(e.sid, list), e.tag ? h('small', null, e.tag) : null);
    });
    if (entries.length > max) out.push(h('span', { class: 'pill more', tip: IL.names(sidsOf(entries.slice(max)), 14) }, '+' + (entries.length - max) + ' more'));
    return h('div', { class: 'pills' }, out);
  };
  function students(rows, max, capText) {
    return R.bars(rows.map(function (r) { return { sid: r.sid, v: r.v, text: r.text, tone: 'amber', hot: true }; }), max, { cap: capText, limit: 4, list: sidsOf(rows) });
  }

  // ---------- actions, in the teacher's words ----------
  var WHAT = {
    Remediation: ['Assign practice to', 'one step easier than where they are stuck'],
    'Warm-up': ['Warm-up for', 'a starter at a level the class already handles'],
    'Exit Ticket': ['Exit ticket for', 'a close variant of this question'],
    Practice: ['Scaffolded version for', 'they arrange given lines instead of writing from scratch'],
    'Spiral Review': ['Review set for', 'the earlier topics that slipped'],
    Challenge: ['Challenge set for', 'one step harder than the current unit'],
    Pretest: ['Pretest for', 'what the next unit depends on']
  };
  function whoWords(a) { return a.whole ? 'the class' : a.targets.length === 1 ? IL.nm(a.targets[0]) : a.targets.length + ' students'; }
  R.whoWords = whoWords;
  R.actLabel = function (a) {
    if (a.kind === 'builder' && WHAT[a.recipe]) return WHAT[a.recipe][0] + ' ' + whoWords(a);
    return a.targets ? a.verb + ' ' + whoWords(a) : a.verb;
  };
  // the size of the action, shown small under the reason; what it contains is on the button's tooltip
  R.actSize = function (a) { return !a ? null : a.kind === 'builder' ? a.minutes + ' min' : a.kind === 'checkin' ? 'rechecked in a week' : null; };
  function actTip(a) {
    var who = a.targets && !a.whole && a.targets.length > 1 ? IL.names(a.targets, 12) : null;
    var what = a.kind === 'builder' && WHAT[a.recipe] ? a.minutes + ' minutes: ' + WHAT[a.recipe][1] + '.' : a.kind === 'checkin' ? 'Logs the check-in; the Lens looks again in a week.' : null;
    return [what, who].filter(Boolean).join('\n') || null;
  }
  R.doBtn = function (a, key, primary, label) {
    return h('button', { class: 'btn ' + (primary ? 'primary' : 'tonal'), tip: actTip(a), on: { click: function (e) { e.stopPropagation(); IL.run(a, key); } } }, label || R.actLabel(a));
  };
  R.altLink = function (a, key) { return ['or ', h('a', { tip: actTip(a), on: { click: function () { IL.run(a, key); } } }, R.actLabel(a))]; };

  // ---------- one finding: a short title, a few facts, a picture, and the reason its action follows ----------
  function title(s) {
    var k = kindOf(s), d = s.data, n = s.sids.length;
    if (k === 'gap') return 'Weak skill: “' + d.skill.name + '”';
    if (k === 'rt') return 'Shared wrong answer: “' + d.item.name + '”';
    if (k === 'code') return 'Code not passing: “' + d.item.name + '”';
    if (k === 'next') return 'Shaky before ' + d.sub.code + ' ' + d.sub.name;
    if (k === 'dip') return 'Class-wide drop, week of ' + T.fmtDay(d.flagged.point.week * 7);
    if (k === 'topic') return 'Chapter ' + d.unit.num + ' is behind typical results';
    if (k === 'unsolved') return 'Left unsolved: “' + d.items[0].item.name + '”';
    if (k === 'due') return 'Not started: “' + d.a.short + '”';
    if (k === 'decay') return 'Fewer finishing each assignment in chapter ' + d.decay.chapter;
    if (k === 'writegap') return 'They recognise more than they can write';
    if (k === 'vsnorm') return plural(d.below.length, 'question') + ' well below typical';
    if (k === 'blind') return plural(d.none.length, 'skill', 'skills') + ' in chapter ' + d.topic.unit.num + ' with no questions';
    if (k === 'transfer') return 'Same skill, different result by textbook';
    if (k === 'fwclass') return 'Fast, wrong first answers across the class';
    if (k === 'waiting') return d.toGrade ? plural(d.toGrade, 'submission') + ' to grade' : plural(d.questions.length, 'question') + ' waiting for a reply';
    if (k === 'quiet') return plural(n, 'student') + ' quiet for 2 weeks or more';
    if (k === 'streak') return plural(n, 'student') + ' not starting assigned work';
    if (k === 'pace') return plural(n, 'student') + ' behind on chapter ' + d.unit.num;
    if (k === 'absent') return plural(n, 'student') + ' missing class days';
    if (k === 'traj') return plural(n, 'student') + ' slipping against classmates';
    if (k === 'grind') return plural(n, 'student') + ': lots of time, few right answers';
    if (k === 'stuck') return plural(n, 'student') + ' stuck on code';
    if (k === 'late') return plural(n, 'student usually starts', 'students usually start') + ' late';
    if (k === 'retry') return plural(n, 'student retries', 'students retry') + ' within seconds';
    if (k === 'fastwrong') return plural(n, 'student answers', 'students answer') + ' fast and wrong';
    if (k === 'feedback') return plural(n, 'student has', 'students have') + ' not opened feedback';
    return s.text;
  }
  function chipsOf(s) {
    var k = kindOf(s), d = s.data;
    if (k === 'gap') return [d.blocked.length ? plural(d.blocked.length, 'later skill needs', 'later skills need') + ' it' : null];
    if (k === 'rt') return [d.correct + ' of ' + d.n + ' right first time'];
    if (k === 'code') return [d.topError ? 'same error: ' + d.topError.err : null];
    if (k === 'next') return ['the class reaches it next'];
    if (k === 'dip') return [d.flagged.fell.length ? 'mostly ' + and(d.flagged.fell.slice(0, 3).map(function (x) { return x.sub.code; })) : null];
    if (k === 'due') return ['due ' + T.fmtDayLong(d.a.dueDay)];
    if (k === 'decay') return [d.decay.from + ' finished the first, ' + d.decay.to + ' the latest'];
    if (k === 'waiting') return [d.toGrade ? 'oldest ' + plural(d.oldestDays, 'day') : null, d.questions.length ? plural(d.questions.length, 'student question') : null, d.failed.length ? plural(d.failed.length, 'auto-grade failure') : null];
    if (k === 'topic') return [d.unit.name];
    if (k === 'pace') return ['class median ' + Math.round(d.median) + '%'];
    return [];
  }
  // what one finding adds to a row about a weak skill or a group of students
  var NOUN = { quiet: 'quiet 2+ weeks', streak: 'not starting work', absent: 'missing class days', pace: 'behind on the chapter', roster: 'never signed in', traj: 'slipping', grind: 'time, few right answers',
    stuck: 'stuck on code', late: 'usually late', retry: 'retry in seconds', fastwrong: 'fast and wrong', feedback: 'feedback unopened' };
  function adds(s) {
    var k = kindOf(s), d = s.data;
    if (k === 'next') return 'needed next, in ' + d.sub.code;
    if (k === 'gap') return d.blocked.length ? plural(d.blocked.length, 'later skill needs', 'later skills need') + ' it' : null;
    if (k === 'fu') return d.before != null ? d.improved + ' of ' + d.rows.length + ' improved after ' + T.fmtDay(d.action.day) + ' practice' : 'check-in ' + T.fmtDay(d.action.day) + ' to review';
    if (k === 'rt') return 'shared wrong answer on a question';
    if (k === 'code') return d.failing.length + ' failing its code question';
    if (k === 'unsolved') return d.items[0].students.length + ' never solved a question';
    return NOUN[k] && s.sids.length ? s.sids.length + ' ' + NOUN[k] : null;
  }
  var ORDER = ['next', 'gap', 'fu', 'rt', 'code', 'unsolved'];

  function evidence(s, m) {
    var k = kindOf(s), d = s.data, B = R.bars;
    if (k === 'gap') {
      var st = d.stat, n = d.below.length;
      return B([{ label: 'Class, right first time', v: st.p, text: pct(st.p), tone: n ? 'blue' : 'amber', hot: !n },
        { label: 'Students under 35%', v: n / Math.max(1, st.nStudents), text: n + ' of ' + st.nStudents, tone: 'amber', hot: !!n, tip: n ? IL.names(sidsOf(d.below), 14) : null }], 1);
    }
    if (k === 'rt') {
      var top = d.picks[d.top].length, other = d.n - d.correct - top, lab = d.item.opts.labels, key = d.item.opts.key;
      return B([{ label: 'Chose ' + letter(d.top) + ' (wrong)', v: top, text: String(top), tone: 'amber', hot: true, tip: (lab ? '“' + lab[d.top] + '”\n' : '') + IL.names(d.picks[d.top], 14) },
        { label: 'Chose ' + letter(key) + ' (right)', v: d.correct, text: String(d.correct), tone: 'blue', tip: lab ? '“' + lab[key] + '”' : null },
        { label: 'Other wrong answers', v: other, text: String(other), tone: 'grey' }], d.n, { cap: 'First answers from ' + d.n + ' students' });
    }
    if (k === 'code') return B([{ label: 'Still failing', v: d.failing.length, text: String(d.failing.length), tone: 'amber', hot: true, tip: IL.names(d.failing, 14) },
      { label: 'Passed after fixes', v: d.afterFixes.length, text: String(d.afterFixes.length), tone: 'part' },
      { label: 'Passed first run', v: d.firstRun.length, text: String(d.firstRun.length), tone: 'blue' }], d.n, { cap: 'The ' + d.n + ' students who ran it' });
    if (k === 'next') return B(d.rows.slice(0, 4).map(function (r) {
      return { label: r.skill.name, v: r.stat ? r.stat.p : 0, text: r.stat ? pct(r.stat.p) : 'not seen', tone: r.state === 'shaky' ? 'amber' : 'blue', hot: r.state === 'shaky' };
    }), 1, { cap: 'Right first time on the skills it needs' });
    if (k === 'dip') {
      var f = d.flagged;
      return B(d.series.slice(-4).map(function (x) {
        var hot = !!f && x === f.point;
        return { label: 'Week of ' + T.fmtDay(x.week * 7), v: Math.max(0, -x.gap), text: (x.gap > 0 ? '+' : x.gap < 0 ? '−' : '') + Math.abs(Math.round(x.gap * 100)) + ' pts', tone: hot ? 'amber' : 'grey', hot: hot };
      }), 0.3, { cap: 'Points below typical results' });
    }
    if (k === 'topic') return B([{ label: 'This class', v: d.stat.onNorm, text: pct(d.stat.onNorm), tone: 'amber', hot: true }, { label: 'Typical elsewhere', v: d.stat.norm, text: pct(d.stat.norm), tone: 'grey' }], 1, { cap: 'Right first time, same questions' });
    if (k === 'unsolved') {
      var tu = d.items[0];
      return B([{ label: 'Never solved', v: tu.students.length, text: String(tu.students.length), tone: 'amber', hot: true, tip: IL.names(tu.students, 14) },
        { label: 'Solved in the end', v: tu.n - tu.students.length, text: String(tu.n - tu.students.length), tone: 'blue' }], tu.n, { cap: 'The ' + tu.n + ' students who tried it' });
    }
    if (k === 'due') return B([{ label: 'Not started', v: d.notStarted.length, text: String(d.notStarted.length), tone: 'amber', hot: true, tip: IL.names(d.notStarted, 14) },
      { label: 'Started', v: d.started.length, text: String(d.started.length), tone: 'blue' }], d.eligible.length, { cap: 'The ' + d.eligible.length + ' students it was assigned to' });
    if (k === 'decay') {
      var rows = m.funnel.rows.filter(function (x) { return x.a.kind === 'lesson' && x.a.chapterNum === d.decay.chapter; });
      if (rows.length > 4) rows = [rows[0]].concat(rows.slice(-3));
      return B(rows.map(function (x, i) {
        var last = i === rows.length - 1;
        return { label: x.a.short, v: x.completed.length / Math.max(1, x.eligible.length), text: x.completed.length + ' of ' + x.eligible.length, tone: last ? 'amber' : 'blue', hot: last };
      }), 1, { cap: 'Students who finished, oldest first', cls: 'wide' });
    }
    if (k === 'fu' && d.before != null) return B([{ label: 'Before', v: d.before, text: pct(d.before), tone: 'grey' }, { label: 'After, new questions', v: d.after, text: pct(d.after), tone: 'blue' }], 1, { cap: 'Right first time, same students' });
    if (k === 'fu') return R.pills(d.rows.map(function (r) { return { sid: r.sid, hot: r.state !== 'active', tip: r.state === 'active' ? 'active again' : 'still no recorded activity' }; }));
    if (k === 'writegap') {
      var fm = {}; m.format.forEach(function (x) { fm[x.key] = x; });
      return B([{ label: 'Multiple choice', v: fm.mchoice.p, text: pct(fm.mchoice.p), tone: 'blue' }, { label: 'Written code', v: fm.activecode.p, text: pct(fm.activecode.p), tone: 'amber', hot: true }], 1, { cap: 'Right first time, by kind of question' });
    }
    if (k === 'vsnorm') return B(d.below.slice(0, 3).map(function (r) { return { label: r.item.name, v: r.p, text: pct(r.p) + ' · typical ' + pct(r.norm), tone: 'amber', hot: true, onClick: function () { IL.ev.item(r.item.id); } }; }), 1, { cap: 'Furthest below typical, of ' + d.below.length, cls: 'wide' });
    if (k === 'blind') return B([{ label: 'No questions anywhere', v: d.none.length, text: String(d.none.length), tone: 'amber', hot: true, tip: d.none.map(function (x) { return x.name; }).join('\n') }, { label: 'Have questions', v: d.taught - d.none.length, text: String(d.taught - d.none.length), tone: 'blue' }], d.taught, { cap: 'The ' + d.taught + ' skills taught in chapter ' + d.topic.unit.num });
    if (k === 'transfer') {
      var tf = d[0], low = tf.primary.p < tf.other.p;
      return B([{ label: tf.primary.tb.short, v: tf.primary.p, text: pct(tf.primary.p), tone: low ? 'amber' : 'blue', hot: low }, { label: tf.other.tb.short, v: tf.other.p, text: pct(tf.other.p), tone: low ? 'blue' : 'amber', hot: !low }], 1, { cap: '“' + tf.skill.name + '”, right first time' });
    }
    if (k === 'fwclass') return B([{ label: 'Median student', v: d.median, text: pct(d.median), tone: 'amber', hot: true }], 1, { cap: 'First answers wrong in under 5 seconds' });
    if (k === 'waiting') return d.byAsg.length ? B(d.byAsg.slice(0, 3).map(function (x, i) { return { label: x.a.short, v: x.n, text: String(x.n), tone: 'amber', hot: i === 0 }; }), null, { cap: 'To grade, by assignment' }) : null;
    // students, one bar each, on the measure that put them here
    if (k === 'quiet') return students(d.map(function (q) { return { sid: q.sid, v: q.run, text: q.run + ' weeks' }; }), Math.max(4, Math.max.apply(null, d.map(function (q) { return q.run; }))), 'Class weeks with no activity');
    if (k === 'streak') { var on = d.filter(function (r) { return !r.never; }); return students(on.map(function (r) { return { sid: r.sid, v: r.run, text: r.run + ' in a row' }; }), Math.max(4, Math.max.apply(null, on.map(function (r) { return r.run; }))), 'Assignments not started'); }
    if (k === 'pace') return students(d.behind.map(function (x) { return { sid: x.sid, v: x.pc, text: x.pc + '%' }; }), 100, 'Chapter ' + d.unit.num + ' complete');
    if (k === 'absent') return students(d.absent.map(function (x) { return { sid: x.sid, v: x.missed / Math.max(1, x.of), text: x.missed + ' of ' + x.of }; }), 1, 'Class days with no activity');
    if (k === 'traj') return students(d.map(function (x) { return { sid: x.sid, v: Math.abs(Math.min(0, x.last)), text: '−' + Math.abs(Math.round(x.last * 100)) + ' pts' }; }).sort(U.by(function (x) { return x.v; }, true)), 0.5, 'Points below classmates');
    if (k === 'grind') return students(s.sids.map(function (sid) { return { sid: sid, v: m.stu[sid].fts, text: pct(m.stu[sid].fts) }; }), 1, 'Right first time · class median ' + pct(m.medianFts));
    if (k === 'stuck') {
      var per = {}; d.filter(function (x) { return !x.lastOk; }).forEach(function (x) { per[x.sid] = Math.max(per[x.sid] || 0, x.runs); });
      var sr = Object.keys(per).map(function (sid) { return { sid: sid, v: per[sid], text: per[sid] + ' runs' }; }).sort(U.by(function (x) { return x.v; }, true));
      return students(sr, null, 'Runs on one question, still not passing');
    }
    if (k === 'late') return students(d.students.map(function (x) { return { sid: x.sid, v: x.late / Math.max(1, x.started), text: x.late + ' of ' + x.started }; }), 1, 'Recent assignments started late');
    if (k === 'retry') return students(d.flagged.map(function (x) { return { sid: x.sid, v: x.rapid, text: pct(x.rapid) }; }), 1, 'Retries within 3 seconds of a wrong answer');
    if (k === 'fastwrong') return students(d.flagged.map(function (x) { return { sid: x.sid, v: x.v, text: pct(x.v) }; }), 1, 'First answers wrong in under 5 seconds');
    if (k === 'roster') return R.pills(d.never.map(function (sid) { return { sid: sid, hot: true, tip: 'never signed in' }; }).concat(d.off.map(function (sid) { return { sid: sid, plain: true, tag: 'not on roster' }; })));
    if (s.sids.length) return R.pills(s.sids.map(function (sid) { return { sid: sid, hot: k !== 'up' && k !== 'ready', tip: s.reason ? s.reason(sid) : null }; }));
    return null;
  }
  function because(s) {
    var k = kindOf(s), d = s.data, a = s.act;
    if (k === 'gap') return a.whole ? 'It is low across the whole class, so everyone gets it.' : plural(d.below.length, 'student is', 'students are') + ' under 35% on this skill.';
    if (k === 'rt') return (d.tier === 1 ? 'More chose ' + letter(d.top) + ' than the right answer' : 'Most wrong answers were ' + letter(d.top)) + ': a shared misunderstanding.';
    if (k === 'code') return plural(d.failing.length, 'student has', 'students have') + ' run it repeatedly without a pass.';
    if (k === 'next') return 'The class starts ' + d.sub.code + ' next, and it builds on this.';
    if (k === 'dip') return 'The drop is across the class, not a few students.';
    if (k === 'topic') return 'The whole chapter is behind; its subunits show where.';
    if (k === 'unsolved') return plural(d.items[0].students.length, 'student') + ' tried it and never got it right.';
    if (k === 'due') return pct(d.notStarted.length / Math.max(1, d.eligible.length)) + ' have not opened it, and it is due ' + T.fmtDayLong(d.a.dueDay) + '.';
    if (k === 'decay') return 'Each assignment is finished by fewer students than the last.';
    if (k === 'writegap') return 'Recognising an answer is well ahead of writing one.';
    if (k === 'vsnorm') return 'They went 20 points or more worse here than elsewhere.';
    if (k === 'blind') return 'With no questions, there is nothing to tell you how these are going.';
    if (k === 'transfer') return 'The same skill differs by 20 points or more between textbooks.';
    if (k === 'fwclass') return 'It is a habit across the class, not a few students.';
    if (k === 'waiting') return d.toGrade ? 'The oldest has waited ' + plural(d.oldestDays, 'day') + '.' : 'A student is waiting for your reply.';
    if (k === 'quiet') return 'No recorded work for 2 or more class weeks.';
    if (k === 'streak') return 'Their last 2 or more assignments are not started.';
    if (k === 'pace') return 'They are 15 points or more behind the class median.';
    if (k === 'absent') return 'No activity on 3 or more class days.';
    if (k === 'traj') return 'They dropped sharply, or have stayed well below classmates.';
    if (k === 'grind') return 'More time than classmates, with fewer right answers.';
    if (k === 'stuck') return 'Ten or more runs, and still not passing.';
    if (k === 'late') return 'Most of their recent work started on the last day or later.';
    if (k === 'retry') return 'They retry within 3 seconds of a wrong answer.';
    if (k === 'fastwrong') return 'A quarter or more of their first answers are fast and wrong.';
    if (k === 'feedback') return 'Feedback you wrote has not been opened.';
    if (k === 'roster') return d.never.length ? 'They are on the roster and have never signed in.' : 'An active account is not on the roster.';
    if (k === 'up') return 'Up 15 points or more against classmates in two weeks.';
    if (k === 'ready') return 'High results on ' + ((s.sub.match(/chapter \S+/) || ['their latest chapter'])[0]) + ', and all assigned work done.';
    return s.why ? cap(s.why.replace(/^(Shown|Fires) (when|for|because) /, '')) : null;
  }
  // one finding on its own (a card on a tab, a lower-impact line)
  R.signal = function (s, ctx) {
    var ev = null;
    try { ev = evidence(s, ctx.m); } catch (e) { ev = null; }
    return { title: title(s), chips: chipsOf(s).filter(Boolean), evid: ev, why: because(s), linked: !!(ev && ev.querySelector('.hot')) };
  };
  // A card on a tab. Where the card lists several things of one kind, the bars are that list and the amber one
  // is the item the action is for.
  function hotFirst(a, b) { return (b.hot ? 1 : 0) - (a.hot ? 1 : 0); }
  R.card = function (c, lead, ctx) {
    var m = ctx.m, p = R.signal(lead, ctx), k = kindOf(lead), d = lead.data;
    if (c.id === 'UN-2' && k === 'gap' && m.gaps.roots.length > 1) {
      p.title = plural(m.gaps.roots.length, 'weak skill') + ' that later work builds on';
      p.chips = ['start with “' + d.skill.name + '”'];
      p.evid = R.bars(m.gaps.roots.map(function (g) { var hot = g.skill.id === d.skill.id; return { label: g.skill.name, v: g.stat.p, text: pct(g.stat.p), tone: hot ? 'amber' : 'blue', hot: hot, tip: 'Open the evidence', onClick: function () { IL.openGap(g); } }; }).sort(hotFirst), 1, { cap: 'Class, right first time', limit: 4, cls: 'wide' });
      p.listed = true; p.linked = true;
    } else if (c.id === 'UN-3' && k === 'rt' && c.rows.length > 1) {
      p.title = plural(c.rows.length, 'question') + ' with a shared wrong answer';
      p.chips = ['start with “' + d.item.name + '”'];
      p.evid = R.bars(c.rows.map(function (r) { var hot = r.item.id === d.item.id; return { label: r.item.name, v: r.picks[r.top].length / Math.max(1, r.n), text: r.picks[r.top].length + ' of ' + r.n, tone: hot ? 'amber' : 'grey', hot: hot, tip: 'Open this question', onClick: function () { IL.ev.item(r.item.id); } }; }).sort(hotFirst), 1, { cap: 'Students who chose the same wrong answer', limit: 4, cls: 'wide' });
      p.listed = true; p.linked = true;
    } else if (c.id === 'UN-4' && k === 'code' && c.rows.length > 1) {
      p.title = plural(c.rows.length, 'code question') + ' many cannot pass yet';
      p.chips = ['start with “' + d.item.name + '”'];
      p.evid = R.bars(c.rows.map(function (r) { var hot = r.item.id === d.item.id; return { label: r.item.name, v: r.failing.length / Math.max(1, r.n), text: r.failing.length + ' of ' + r.n, tone: hot ? 'amber' : 'grey', hot: hot, tip: 'Open the runs', onClick: function () { IL.ev.item(r.item.id); } }; }).sort(hotFirst), 1, { cap: 'Students still failing', limit: 4, cls: 'wide' });
      p.listed = true; p.linked = true;
    }
    return p;
  };
  // a theme from the Brief: one cause, with the finding that justifies its action drawn beside it
  R.theme = function (th, ctx) {
    var ins = ctx.ins, lead = th.members[0], a = th.act, o = { title: th.text, chips: [], evid: null, why: null, linked: false, tags: [] };
    if (th.people) {
      var on = th.people.filter(function (x) { return !x.off; }), open = on.filter(function (x) { return !x.treated; }), done = on.filter(function (x) { return x.treated; }), n = th.people.length;
      o.title = th.lane === 'presence' ? plural(n, 'student') + ' not showing up or not starting work' : th.lane === 'struggle' ? plural(n, 'student') + ' working hard, not getting there' : plural(n, 'student') + ' with a working habit to mention';
      o.chips = th.members.map(adds).filter(Boolean);
      o.evid = R.pills(th.people.map(function (x) {
        return { sid: x.sid, plain: x.off, hot: !x.treated && !x.off, tip: x.reasons.join('\n') + (x.treated ? '\nalready followed up' : ''), tag: x.off ? 'not on roster' : null };
      }), th.sids);
      o.linked = open.length > 0;
      if (a && a.kind === 'checkin') {
        var when = done.length && ins.treatedStu[done[0].sid] ? ' (' + T.fmtDay(ins.treatedStu[done[0].sid].day) + ')' : '';
        o.why = !open.length ? 'All followed up once; this checks in again.' : !done.length ? 'None of them has been followed up yet.'
          : plural(open.length, 'has', 'have') + ' had no follow-up; ' + and(done.slice(0, 2).map(function (x) { return IL.nm(x.sid); })) + ' already ' + (done.length > 1 ? 'have' : 'has') + when + '.';
      } else o.why = because(lead);
      return o;
    }
    var gs = th.members.filter(function (s) { return kindOf(s) === 'gap'; })[0], owner = th.members.filter(function (s) { return s.act === a; })[0] || lead, face = gs || lead;
    var p = R.signal(owner, ctx);
    o.title = gs ? title(gs) : th.anchor ? '“' + th.anchor.name + '” is tripping students up' : title(lead);
    if (gs || th.anchor) ORDER.forEach(function (kind) { th.members.forEach(function (s) { if (kindOf(s) === kind) { var t = adds(s); if (t) o.chips.push(t); } }); });
    else o.chips = chipsOf(face).filter(Boolean);
    o.evid = p.evid; o.linked = p.linked; o.why = p.why;
    if (!o.evid && owner !== lead) o.evid = R.signal(lead, ctx).evid;
    if (th.followup && !th.members.some(function (s) { return kindOf(s) === 'fu'; })) o.tags.push(h('span', { class: 'tag' }, (th.followup.action.type || 'Follow-up') + ' assigned ' + T.fmtDay(th.followup.action.day)));
    return o;
  };

  // ---------- the row ----------
  R.head = function () {
    return h('div', { class: 'ia-head' }, h('span'), h('span', null, 'What we see'), h('span', null, 'How we know', h('small', null, h('i'), 'who the action is for')), h('span', null, 'What to do, and why'));
  };
  R.secHead = function (text, n) { return h('div', { class: 'ia-sec' }, h('h3', null, text), n ? h('span', { class: 'count' }, String(n)) : null); };
  R.moreRow = function (label, open, fn) { return h('div', { class: 'ia-morerow' }, h('button', { class: 'link-btn', 'aria-expanded': open ? 'true' : 'false', on: { click: fn } }, (open ? '▾ ' : '▸ ') + label)); };
  // o: id, card, rank, cls, title, chips, tags, more, evid, btn, why, linked, size, alt, detail
  R.line = function (o) {
    var chips = (o.chips || []).filter(Boolean).slice(0, 3);
    var el = h('div', { class: 'ia-row' + (o.cls ? ' ' + o.cls : ''), 'data-theme': o.id || null, 'data-card': o.card || null },
      h('div', { class: 'ia-rank' + (o.rank ? '' : ' none') }, o.rank ? String(o.rank) : ''),
      h('div', { class: 'ia-see' }, o.tags && o.tags.length ? h('div', { class: 'ia-tags' }, o.tags) : null, h('h4', null, o.title),
        chips.length ? h('div', { class: 'ia-facts' }, chips.map(function (c) { return typeof c === 'string' ? h('span', { class: 'fact' }, c) : c; })) : null, o.more || null),
      h('div', { class: 'ia-know' }, o.evid || null),
      h('div', { class: 'ia-do' }, o.btn || null,
        o.why ? h('p', { class: 'ia-because' + (o.linked ? ' linked' : '') }, h('b', null, 'Why: '), o.why) : null,
        o.size || o.alt ? h('p', { class: 'ia-alt' }, o.size || null, o.size && o.alt ? ' · ' : null, o.alt || null) : null));
    if (o.detail) el.appendChild(o.detail);
    return el;
  };
  R.moreBtn = function (open, fn, words) {
    return h('button', { class: 'link-btn ia-more', 'aria-expanded': open ? 'true' : 'false', on: { click: function (e) { e.stopPropagation(); fn(); } } }, (open ? '▾ ' : '▸ ') + (words || 'Full analysis'));
  };

  // ---------- did an action work? the same three columns ----------
  R.follow = function (f, ctx, o) {
    o = o || {};
    var a = f.action, ci = a.kind === 'check-in', sec = ctx.sec, world = ctx.world, due = f.status === 'recheck due', st = ctx.st, key = 'fu:' + a.id, open = !!st.expand[key];
    var review = function () { a.reviewed = true; if (ci) a.recheckDay = T.day(world.now) + 99; sec._m = {}; IL.render(); IL.toast('Marked as reviewed.'); };
    var state = h('span', { class: 'tag ' + (due ? 'warn' : f.status === 'done' ? 'good' : '') }, due ? 'recheck due' : f.status === 'done' ? 'reviewed' : 'waiting for new work');
    var tags = [h('span', { class: 'tag info' }, a.type || 'Action'), h('span', { class: 'tag' }, T.fmtDay(a.day)), state];
    var reviewAlt = due ? ['or ', h('a', { on: { click: review } }, 'mark reviewed')] : null;
    var more = o.detail ? R.moreBtn(open, function () { st.expand[key] = !open; IL.render(); }, 'Each student') : null;
    var detail = o.detail && open ? h('div', { class: 'ia-detail one' }, h('div', null, IL.followupPicture(f))) : null;
    if (ci && f.status === 'waiting') return R.line({ id: 'fu-' + a.id, card: 'fu-' + a.id, tags: tags, title: 'Check-in with ' + (a.students.length === 1 ? IL.nm(a.students[0]) : a.students.length + ' students') + ' logged',
      evid: R.pills(a.students.map(function (sid) { return { sid: sid }; }), a.students), why: 'The Lens looks again on ' + T.fmtDayLong(a.recheckDay) + '.' });
    if (ci) {
      var quiet = f.rows.filter(function (r) { return r.state !== 'active'; });
      var who = and(quiet.slice(0, 2).map(function (r) { return IL.nm(r.sid); })) + (quiet.length > 2 ? ' and ' + (quiet.length - 2) + ' more' : '');
      return R.line({ id: 'fu-' + a.id, card: 'fu-' + a.id, tags: tags, title: quiet.length ? who + ' still quiet after your check-in' : 'Everyone you checked in with is active again',
        evid: R.pills(f.rows.map(function (r) { return { sid: r.sid, hot: r.state !== 'active', tip: r.state === 'active' ? 'active again, last on ' + T.fmtDay(r.lastDay) : 'no recorded activity since ' + (r.lastDay != null ? T.fmtDay(r.lastDay) : 'the start of term') }; }), a.students),
        linked: quiet.length > 0,
        btn: quiet.length ? h('button', { class: 'btn tonal', on: { click: function () { IL.openStudent(quiet[0].sid, sidsOf(quiet)); } } }, quiet.length === 1 ? 'Open ' + IL.nm(quiet[0].sid) : 'Open the ' + quiet.length + ' students')
          : due ? h('button', { class: 'btn tonal', on: { click: review } }, 'Mark reviewed') : null,
        why: quiet.length ? 'A week on, there is still no recorded work.' : 'They are working again.', alt: quiet.length ? reviewAlt : null });
    }
    var same = f.rows.filter(function (r) { return r.state === 'same'; }).map(function (r) { return r.sid; }), none = f.rows.filter(function (r) { return r.state === 'none'; }).map(function (r) { return r.sid; });
    var skill = a.skills && a.skills[0] && world.skills[a.skills[0]] ? world.skills[a.skills[0]].name : a.title;
    if (f.status === 'waiting' || f.before == null) return R.line({ id: 'fu-' + a.id, card: 'fu-' + a.id, tags: tags, title: '“' + skill + '”: waiting for new work', chips: [plural(a.students.length, 'student'), 'recheck ' + T.fmtDayLong(a.recheckDay)],
      evid: R.pills(a.students.map(function (sid) { return { sid: sid }; }), a.students), why: 'There is nothing to compare until they do the new questions.' });
    var btn = null, why;
    if (same.length) {
      btn = h('button', { class: 'btn tonal', tip: IL.names(same, 12), on: { click: function () { IL.builder({ recipe: 'Remediation', minutes: 15, sids: same, skills: a.skills, reason: 'try a different approach' }); } } }, 'Try a different approach for ' + (same.length === 1 ? IL.nm(same[0]) : same.length + ' students'));
      why = plural(same.length, 'student') + ' did the new questions and did not improve.';
    } else if (none.length) {
      btn = h('button', { class: 'btn tonal', tip: IL.names(none, 12), on: { click: function () { IL.toast('Would send a three-question recheck to ' + plural(none.length, 'student') + '.'); } } }, 'Send a short recheck to ' + (none.length === 1 ? IL.nm(none[0]) : none.length + ' students'));
      why = plural(none.length, 'student has', 'students have') + ' not done the new questions yet.';
    } else { btn = due ? h('button', { class: 'btn tonal', on: { click: review } }, 'Mark reviewed') : null; why = 'Everyone with new work improved.'; }
    return R.line({ id: 'fu-' + a.id, card: 'fu-' + a.id, tags: tags, title: '“' + skill + '”: ' + f.improved + ' of ' + f.rows.length + ' improved',
      chips: [f.same ? f.same + ' no change' : null, f.noWork ? f.noWork + ' no new work yet' : null, f.firstEvidence ? f.firstEvidence + ' with nothing earlier to compare' : null],
      more: more, detail: detail,
      evid: R.bars([{ label: 'Before', v: f.before, text: pct(f.before), tone: 'grey' }, { label: 'After, new questions', v: f.after, text: pct(f.after), tone: 'blue' }], 1, { cap: 'Right first time, same students' }),
      btn: btn, why: why, alt: (same.length || none.length) ? reviewAlt : null });
  };

  // ---------- one student: the next step their flags point to ----------
  R.step = function (sid, ctx) {
    var ins = ctx.ins, m = ctx.m, sum = ins.summary(sid), x = m.stu[sid];
    var weakest = function () { return IL.M.student(ctx.world, ctx.sec, sid).clusters.slice(0, 2).map(function (o) { return o.skill.id; }); };
    var mk = function (label, fn) { return h('button', { class: 'btn small tonal', tip: sum.step, on: { click: function (e) { e.stopPropagation(); fn(); } } }, label); };
    if (x && x.never) return mk('Re-invite', function () { IL.toast('Would re-send the invitation to ' + IL.nm(sid) + '.'); });
    if (sum.treated) return mk('Review follow-up', function () { IL.go({ tab: 'followups' }); });
    if (sum.lane === 'presence') return mk('Check in', function () { IL.logCheckin([sid]); });
    if (sum.lane === 'struggle') return mk('Assign practice', function () { var sk = weakest(); if (sk.length) IL.builder({ recipe: 'Remediation', minutes: 15, sids: [sid], skills: sk, reason: 'weakest skills' }); else IL.logCheckin([sid]); });
    if (sum.lane === 'habit') return mk('Open student', function () { IL.openStudent(sid); });
    if (sum.lane === 'good') return mk('Challenge', function () { IL.builder({ recipe: 'Challenge', minutes: 20, sids: [sid], skills: m.next ? m.next.sub.skills.slice(0, 2) : weakest(), reason: 'stretch' }); });
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);

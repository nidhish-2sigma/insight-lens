/* Insight Lens mock · insights: the one shared definition of everything the Lens says.

   Every card on every tab is declared here once, with: what it needs from the data, its time basis, its
   trigger rule, the list its headline counts, a "nothing notable" headline, and the signals it raises.
   A signal is one fired finding: who it affects, how badly, how soon, which skills or units it is about,
   and the exact list its action will act on. The Brief, the tab counts, the card headlines, the student
   flags and the button labels are all read from these records, so they cannot disagree with each other,
   and a new section (or a new insight) behaves the same way without extra work.

   Nothing in this file touches the DOM: tools/check.js runs the same code against every section. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, M = IL.M;
  var I = (IL.I = {});
  function pct(x) { return x == null ? '–' : Math.round(x * 100) + '%'; }
  var plural = U.plural;

  // What a section's data may or may not be able to support, in the teacher's words.
  I.NEEDS = {
    work: 'recorded work', assignments: 'assigned work with due dates', norms: 'typical results from other classes',
    graph: 'a prerequisite map for these skills', code: 'graded code questions', bands: 'learning bands for this skill set',
    multiTb: 'a second textbook', weeks2: 'two class weeks of work', weeks4: 'four class weeks of work', sessions: 'a shared class time'
  };
  I.BASIS = { window: null, term: 'whole term', now: 'right now', unit: 'current chapter', recent: 'recent assignments', last2: 'last 2 class weeks against the 2 before',
    lastweek: 'last class week', platform: 'all learners on the platform' };
  // Lanes group signals that are the same kind of problem; a theme never mixes lanes.
  I.LANES = { teach: 'Teach', work: 'Assigned work', presence: 'Check in', struggle: 'Support', habit: 'Habits', content: 'Content', good: 'Good news', admin: 'Waiting on you' };
  // The Brief answers two questions that never compete for the same rows: what to teach, and who to check on.
  // Each list shows every theme above the impact threshold, within a small range, and files the rest under
  // "lower impact". Between them the Brief shows three to eight rows.
  I.IMPACT_MIN = 0.15;
  I.LISTS = { teach: { lanes: ['teach', 'work', 'content'], min: 2, max: 5, title: 'What to teach or fix' },
    people: { lanes: ['presence', 'struggle', 'habit'], min: 1, max: 3, title: 'Who to check on' } };

  // The label of a button is always built here, from the list the button will act on.
  I.label = function (a) { return !a ? '' : !a.targets ? a.verb : a.verb + ' ' + (a.whole ? 'the class' : a.targets.length); };

  // The cards, in the order each tab lays them out. `reference` cards are maps of the class, always open.
  I.CARDS = [
    { id: 'BR-1a', tab: 'brief', title: 'Active', basis: 'lastweek', needs: ['work'] },
    { id: 'BR-1b', tab: 'brief', title: 'Assigned work', basis: 'window', needs: ['assignments'] },
    { id: 'BR-1c', tab: 'brief', title: 'First-try success', basis: 'window', needs: ['work'] },
    { id: 'BR-1d', tab: 'brief', title: 'Waiting on you', basis: 'now', needs: [] },

    { id: 'PR-1', tab: 'progress', title: 'Class frontier', basis: 'term', needs: ['work'], reference: true,
      rule: 'A chapter counts as opened when half the class has work in it. Order comes from when the class reached each chapter, not from the table of contents.',
      caveat: 'Supplemental units never count as behind.' },
    { id: 'PR-2', tab: 'progress', title: 'Pace spread', basis: 'unit', needs: ['work'],
      rule: 'Fires when a share of the class (6%, at least two students) is 15 points or more below the class median on the current chapter.' },
    { id: 'PR-7', tab: 'progress', title: 'Waiting on you', basis: 'now', needs: [],
      rule: 'Fires when anything has waited more than three days for a grade, or a student has asked a question.',
      caveat: 'Until written answers are graded, these questions show as “awaiting grading” in the unit grid.' },
    { id: 'PR-3', tab: 'progress', title: 'Assignment funnel', basis: 'recent', needs: ['assignments'],
      rule: 'Fires when completion drops 20 points or more through a chapter, or an assignment due within three days has not been started by 40% of eligible students.',
      caveat: 'Eligible means the student was assigned the work; a differentiated copy has its own row. Courseworks no one started are listed separately and never count as missing work.' },
    { id: 'PR-4', tab: 'progress', title: 'Missing-work streaks', basis: 'recent', needs: ['assignments'],
      rule: 'Fires for a student whose most recent two or more eligible assignments are all unstarted. Runs that have ended are listed apart and not counted.' },
    { id: 'PR-5', tab: 'progress', title: 'Start timing', basis: 'recent', needs: ['assignments'],
      rule: 'Fires when a quarter of started work began on the last day or later, or a share of the class is usually late.',
      caveat: 'This describes timing only. Work after a due date can be revision.' },
    { id: 'PR-6', tab: 'progress', title: 'Textbook balance', basis: 'term', needs: ['multiTb'], reference: false,
      caveat: 'Supplemental textbooks are differentiated practice. They are shown here and under Understanding, and are left out of bands.' },

    { id: 'UN-1', tab: 'understanding', title: 'Chapters and subunits', basis: 'term', needs: ['work'], reference: true,
      rule: 'A chapter is called out when the class is 5 points or more below typical results on the same questions.',
      caveat: 'First-try success, in the order the class worked.' },
    { id: 'UN-2', tab: 'understanding', title: 'Root gaps', basis: 'term', needs: ['work'],
      rule: 'A weak skill (class first try under 35%, with evidence from 40% of the class on two or more questions) that has no weak prerequisite of its own. Ranked by the later skills the class will actually reach; skills in a skipped unit are shown but not counted.',
      caveat: 'Class-level only. The prerequisite map is machine-built; the dependent skills are listed so you can disagree.' },
    { id: 'UN-5', tab: 'understanding', title: 'Depth and format', basis: 'term', needs: ['work'],
      rule: 'Fires when multiple choice runs 15 points or more ahead of written code.' },
    { id: 'UN-3', tab: 'understanding', title: 'Questions to reteach', basis: 'window', needs: ['work'],
      rule: 'Fires when a wrong answer was chosen at least as often as the right one, or one wrong answer took half of all wrong first answers.',
      caveat: 'A shared wrong answer is a pattern to look at, not a diagnosis. Use “Hide names” before showing this to the class.' },
    { id: 'UN-4', tab: 'understanding', title: 'Code sticking points', basis: 'window', needs: ['code'],
      rule: 'Fires when a quarter or more of the students who ran code on a question have not passed.',
      caveat: 'A failing test names behaviour, not a concept. Runs with no tests are not counted as failures.' },
    { id: 'UN-7', tab: 'understanding', title: 'Harder here than elsewhere', basis: 'term', needs: ['norms'],
      rule: 'Fires for questions that went 20 points or more worse here than typical.',
      caveat: 'Compared question by question with an anonymous pool of at least 200 learners. Never a ranking of classes or teachers.' },
    { id: 'UN-8', tab: 'understanding', title: 'Student trajectories', basis: 'last2', needs: ['weeks4'],
      rule: 'Fires for a fall of 20 points or more between fortnights, or two fortnights 15 points below classmates, with 15 first attempts in each.',
      caveat: 'Relative to classmates on the same questions, so harder content does not look like a decline. Not a prediction; it clears when the gap closes.' },
    { id: 'UN-9', tab: 'understanding', title: 'Ready for what is next', basis: 'term', needs: ['graph', 'work'],
      rule: 'Fires when a skill the next subunit builds on is under 40% first try.' },
    { id: 'UN-10', tab: 'understanding', title: 'Evidence blind spots', basis: 'term', needs: ['work'],
      rule: 'Fires when a skill taught in the current chapter has no questions in any attached textbook.',
      caveat: 'Hatching means “cannot be seen”. It is not zero.' },
    { id: 'UN-6', tab: 'understanding', title: 'Same skill, different textbook', basis: 'term', needs: ['multiTb'],
      rule: 'Fires when a skill differs by 20 points or more between the main textbook and another.',
      caveat: 'Lab and exam questions differ in format and depth from the main textbook, which accounts for some of the gap.' },
    { id: 'UN-12', tab: 'understanding', title: 'Class-wide dip', basis: 'term', needs: ['norms', 'weeks4'],
      rule: 'Fires when a week is 8 points or more further below typical than the previous month.',
      caveat: 'Measured against typical results on the same questions, so a harder unit does not look like a dip.' },
    { id: 'UN-11', tab: 'understanding', title: 'Question quality', basis: 'platform', needs: ['norms'],
      rule: 'Lists questions that stay hard after practice, or do not separate stronger from weaker students.',
      caveat: 'Measured across all learners on the platform, shown as “out of 10 students”. Response time is not used to judge a question.' },

    { id: 'EN-1', tab: 'engagement', title: 'Participation rhythm', basis: 'term', needs: ['work'], reference: true,
      rule: 'A class week is a week when at least 60% of the roster was active. Quiet weeks do not count toward inactivity.',
      caveat: 'Recorded activity in ALPS. It does not measure effort, or work done elsewhere.' },
    { id: 'EN-2', tab: 'engagement', title: 'Went quiet', basis: 'now', needs: ['weeks2'],
      rule: 'Fires for no recorded activity in two consecutive class weeks.',
      caveat: 'Absence, an access problem and work done elsewhere all look the same in the data. The card says “no recorded ALPS activity” and nothing more.' },
    { id: 'EN-5', tab: 'engagement', title: 'Roster and access check', basis: 'now', needs: [],
      rule: 'Fires when a rostered student has never signed in, or an active account is not on the roster.',
      caveat: 'Denominators are only right if the roster is.' },
    { id: 'EN-3', tab: 'engagement', title: 'In class and out of class', basis: 'window', needs: ['sessions'],
      rule: 'A class session is a clock hour when 40% or more of the roster was active. Fires for no activity on three or more class days in the window.',
      caveat: 'This is not attendance.' },
    { id: 'EN-4', tab: 'engagement', title: 'Activity map', basis: 'term', needs: ['work'],
      rule: 'Fires for 30% more recorded minutes than the class median with first try 8 points or more below it.',
      caveat: 'The lines are class medians. Recorded time is not effort and first-try success is not ability; the map only shows where to look. Students with no recent activity or too little work are not placed.' },

    { id: 'WH-1', tab: 'habits', title: 'Retry pattern', basis: 'term', needs: ['work'],
      rule: 'Fires for students in the top tenth for retries within three seconds of a wrong answer (and above 20%).',
      caveat: 'Only a wrong answer followed by a fast retry counts. This is why completion can look healthy while understanding is not.' },
    { id: 'WH-2', tab: 'habits', title: 'Fast wrong first answers', basis: 'term', needs: ['work'],
      rule: 'Fires when the class median is 20% or more, or a student is at 25% or more.',
      caveat: 'Questions that can be answered in a few seconds by anyone are left out.' },
    { id: 'WH-3', tab: 'habits', title: 'Unfinished business', basis: 'term', needs: ['work'],
      rule: 'Fires when a quarter or more of the students who tried a question never solved it.' },
    { id: 'WH-4', tab: 'habits', title: 'Stuck in code', basis: 'window', needs: ['code'],
      rule: 'Fires for 10 or more runs with no pass, the same failure six times running, or a pass that was then lost, while the question is still not passing.',
      caveat: 'One mark per run, in order.' },
    { id: 'WH-5', tab: 'habits', title: 'Help and feedback use', basis: 'now', needs: [],
      rule: 'Fires when feedback has not been opened.',
      caveat: 'Hatching means the signal was not recorded for this period.' },
    { id: 'WH-6', tab: 'habits', title: 'Process notes for review', basis: 'now', needs: ['code'],
      rule: 'A recorded event worth a look.', caveat: 'Shown here and on the student page only. Never counted on the Brief.' },

    { id: 'ST-5', tab: 'students', title: 'Movement', basis: 'last2', needs: ['weeks4'],
      rule: 'Improving or slipping means a change of 15 points or more against classmates, with at least 15 first attempts in each window.' },
    { id: 'FU-1', tab: 'followups', title: 'Action log', basis: 'now', needs: [],
      rule: 'A recheck is ready when its date has arrived.',
      caveat: 'The comparison is “after”, never “because of”. Students picked because they were lowest on a skill tend to rise somewhat on any recheck, so read small gains with care.' }
  ];

  // ---------- build everything for one section and scope ----------
  I.build = function (world, sec, m, opts) {
    opts = opts || {};
    var caps = m.caps, N = m.roster.length, b = m.b, today = T.day(world.now), now = world.now;
    var nm = function (sid) { return sec.students[sid] ? sec.students[sid].name : sid; };
    var rosterIds = m.roster.map(function (s) { return s.id; });
    var few = b.few, skillName = function (k) { return world.skills[k].name; };
    var out = { caps: caps, cards: {}, signals: [], N: N };
    var whole = function (sids) { return sids.length === N && N > 1; };

    I.CARDS.forEach(function (def) {
      var c = { id: def.id, tab: def.tab, title: def.title, basis: def.basis, needs: def.needs, reference: !!def.reference, rule: def.rule || null, caveat: def.caveat || null,
        missing: def.needs.filter(function (k) { return !caps[k]; }), fired: false, headline: null, quiet: null, warn: null, rows: [], signals: [] };
      c.ok = c.missing.length === 0;
      c.nodata = c.ok ? null : 'Not enough data yet: this needs ' + c.missing.map(function (k) { return I.NEEDS[k]; }).join(' and ') + '.';
      out.cards[def.id] = c;
    });
    var cards = out.cards;
    // set(id, {...}) fills a card; a card that lacks its data never fires and never shows a figure
    function set(id, o) { var c = cards[id]; if (!c.ok) return c; Object.keys(o).forEach(function (k) { c[k] = o[k]; }); return c; }
    function act(kind, verb, o) { o = o || {}; o.kind = kind; o.verb = verb; if (o.targets) { o.targets = U.uniq(o.targets); o.whole = whole(o.targets); } return o; }
    function sig(o) {
      var c = cards[o.card];
      if (c && !c.ok) return null;
      o.tab = c ? c.tab : o.tab;
      o.sids = U.uniq(o.sids || []); o.skills = o.skills || []; o.units = o.units || [];
      o.urgency = o.urgency == null ? 1 : o.urgency;
      o.reach = U.clamp(o.reach == null ? (o.sids.length / Math.max(1, N)) : o.reach, 0, 1);
      o.treated = o.treated || [];
      o.score = o.reach * o.sev * o.urgency;
      o.label = I.label(o.act);
      if (c) c.signals.push(o.id);
      out.signals.push(o);
      return o;
    }

    // who is already being followed up, and on which skills
    var treatedStu = {}, treatedSkill = {};
    m.followups.forEach(function (f) {
      var a = f.action;
      if (f.status === 'done') return;
      if (a.kind === 'check-in') a.students.forEach(function (sid) { treatedStu[sid] = a; });
      else (a.skills || []).forEach(function (k) { treatedSkill[k] = f; });
    });
    out.treatedStu = treatedStu;

    // ----- Brief tiles -----
    // compare like with like: the class and the typical rate on the questions that have a typical rate
    var p = m.pulse, vt = M.vsTypical(p.fts.classOnNorm != null ? p.fts.classOnNorm : p.fts.p, p.fts.norm);
    out.vsTypical = vt;
    var inactive = p.active.dots.filter(function (d) { return !d.on; }).map(function (d) { return d.sid; });
    set('BR-1a', { fired: p.active.of > 0 && p.active.n / p.active.of < 0.8, rows: inactive, headline: p.active.n + ' of ' + p.active.of + ' active' });
    set('BR-1b', { fired: p.work.cells > 0 && p.work.none / p.work.cells >= 0.3, headline: p.work.cells ? pct(p.work.onTime / p.work.cells) + ' started on time' : 'Nothing was due' });
    set('BR-1c', { fired: vt.tone === 'bad' || vt.tone === 'warn', headline: pct(vt.gap != null ? p.fts.classOnNorm : p.fts.p) + ' right first time' });

    // ----- Progress -----
    var main = m.frontier.filter(function (l) { return l.role === 'primary'; })[0], skipped = main ? main.units.filter(function (u) { return u.skipped; }) : [];
    var begun = main ? main.units.filter(function (u) { return u.opened; }) : [], unbegun = main ? main.units.filter(function (u) { return !u.opened; }) : [];
    var nums = function (us) { var x = us.map(function (u) { return u.num; }); return x.length < 2 ? x.join('') : x.slice(0, -1).join(', ') + ' and ' + x[x.length - 1]; };
    var unitWord = main && main.tb.supplemental ? '' : 'chapter';
    set('PR-1', { headline: begun.length ? 'Most of the class has started ' + (unitWord ? unitWord + (begun.length > 1 ? 's ' : ' ') : '') + nums(begun) + (unbegun.length ? '; ' + nums(unbegun) + (unbegun.length > 1 ? ' have' : ' has') + ' not been started.' : '.')
      : 'No chapter has been started by most of the class yet.' });

    var cur = m.pace[m.pace.length - 1];
    if (cur) {
      var behind = cur.behind.map(function (x) { return x.sid; }), paceFired = behind.length >= few(0.06, 2);
      set('PR-2', { fired: paceFired, rows: behind,
        headline: plural(behind.length, 'student is', 'students are') + ' 15 points or more behind the class on chapter ' + cur.unit.num + (cur.ahead.length ? ', and ' + cur.ahead.length + ' ' + (cur.ahead.length === 1 ? 'is' : 'are') + ' ahead' : '') + '.',
        quiet: behind.length ? 'Only ' + plural(behind.length, 'student is', 'students are') + ' well behind the class on chapter ' + cur.unit.num + '.' : 'No one is far from the class on chapter ' + cur.unit.num + '.' });
      if (paceFired) sig({ id: 'pace', card: 'PR-2', lane: 'presence', cat: 'progress', sids: behind, n: behind.length, sev: 0.5,
        text: plural(behind.length, 'student is', 'students are') + ' 15 points or more behind the class on chapter ' + cur.unit.num, sub: 'The class median is ' + Math.round(cur.median) + '% complete',
        why: cards['PR-2'].rule, noun: 'behind on chapter ' + cur.unit.num, reason: function (sid) { var d = cur.behind.filter(function (x) { return x.sid === sid; })[0]; return d.pc + '% through chapter ' + cur.unit.num + ' (class ' + Math.round(cur.median) + '%)'; },
        flag: { key: 'behind', label: 'behind on chapter ' + cur.unit.num, tone: 'warn' },
        facts: [['Class median', Math.round(cur.median) + '%', ''], ['Behind', behind.length, '15 points or more'], ['Far behind', cur.far.length, '25 points or more']],
        act: act('toast', 'Catch-up for', { targets: behind, text: 'Would open Create Coursework with a catch-up set' }), data: cur });
    } else set('PR-2', { quiet: 'Not enough work yet to compare pace.' });

    var w = m.waiting, waitFired = (w.toGrade > 0 && w.oldestDays >= 3) || w.questions.length > 0;
    set('PR-7', { fired: waitFired, rows: w.byAsg,
      headline: w.toGrade ? w.toGrade + ' to grade; the oldest has waited ' + plural(w.oldestDays, 'day') + (w.questions.length ? ', and ' + plural(w.questions.length, 'student is', 'students are') + ' waiting for a reply.' : '.') : plural(w.questions.length, 'student is', 'students are') + ' waiting for a reply.',
      quiet: w.toGrade ? w.toGrade + ' to grade, none older than three days.' : 'Nothing is waiting for a grade or a reply.' });
    set('BR-1d', { fired: waitFired, headline: w.toGrade + ' to grade' });
    if (waitFired) sig({ id: 'waiting', card: 'PR-7', lane: 'admin', cat: 'waiting', sids: [], reach: 1, sev: Math.min(1, 0.4 + w.oldestDays / 10), n: w.toGrade,
      text: w.toGrade ? w.toGrade + ' submissions are waiting for a grade' + (w.questions.length ? ', and ' + plural(w.questions.length, 'student is', 'students are') + ' waiting for a reply' : '') : plural(w.questions.length, 'student is', 'students are') + ' waiting for a reply',
      sub: w.toGrade ? 'The oldest has waited ' + plural(w.oldestDays, 'day') : '', why: cards['PR-7'].rule,
      facts: [['To grade', w.toGrade, ''], ['Oldest', plural(w.oldestDays, 'day'), 'rule: over 3 days'], ['Questions waiting', w.questions.length, ''], ['Auto-grading failed', w.failed.length, '']],
      act: act('toast', 'Open grading', { text: 'Would open the coursework dashboard at the first ungraded submission.' }), data: w });

    var fn = m.funnel, d = fn.decay, dueSoon = [];
    fn.rows.forEach(function (x) {
      var left = (x.a.dueT - now) / 1440;
      if (left > 0 && left <= 3 && x.eligible.length && x.notStarted.length / x.eligible.length >= 0.4) dueSoon.push(x);
    });
    set('PR-3', { fired: !!d || dueSoon.length > 0, rows: fn.rows,
      headline: (d ? 'Completion slid through chapter ' + d.chapter + ': from ' + d.from + ' students on the first assignment to ' + d.to + ' on the latest.' : '') +
        (dueSoon.length ? (d ? ' ' : '') + dueSoon[0].notStarted.length + ' of ' + dueSoon[0].eligible.length + ' have not started “' + dueSoon[0].a.short + '”, due ' + T.fmtDayLong(dueSoon[0].a.dueDay) + '.' : ''),
      quiet: 'Completion is holding steady across recent assignments.' });
    dueSoon.forEach(function (x) {
      sig({ id: 'due-' + x.a.id, card: 'PR-3', lane: 'work', cat: 'progress', sids: x.notStarted, n: x.notStarted.length, sev: 0.7, urgency: 1.5, units: [x.a.chapter],
        text: x.notStarted.length + ' of ' + x.eligible.length + ' have not started “' + x.a.short + '”', sub: 'Due ' + T.fmtDayLong(x.a.dueDay),
        why: 'Shown when an assignment is due within three days and at least 40% of eligible students have not started.', noun: 'an assignment due soon and not started',
        facts: [['Eligible', x.eligible.length, ''], ['Started', x.started.length, ''], ['Not started', x.notStarted.length, 'rule: 40% or more'], ['Due', T.fmtDayLong(x.a.dueDay), 'rule: within 3 days']],
        act: act('toast', 'Remind', { targets: x.notStarted, text: 'Would send a reminder' }), alts: [act('toast', 'Extend the due date', { text: 'Would open the due date for this assignment.' })], data: x });
    });
    if (d) {
      var lastRow = fn.rows.filter(function (x) { return x.decay; })[0], drop = lastRow.inProgress.concat(lastRow.notStarted);
      sig({ id: 'decay', card: 'PR-3', lane: 'work', cat: 'progress', sids: drop, n: d.from - d.to, reach: (d.from - d.to) / Math.max(1, N), sev: 0.7, units: [lastRow.a.chapter],
        text: 'Completion fell from ' + d.from + ' to ' + d.to + ' students across chapter ' + d.chapter, sub: lastRow.inProgress.length + ' started the latest assignment and did not finish',
        why: 'Shown when the completed share drops 20 points or more between the first and latest assignment of a chapter.', noun: 'completion falling through the chapter',
        facts: [['First assignment', d.from + ' completed', ''], ['Latest assignment', d.to + ' completed', 'rule: 20-point drop'], ['Assignments in chapter', d.n, '']],
        act: act('go', 'See the assignments', { tab: 'progress', focus: 'PR-3' }), data: { decay: d, row: lastRow } });
    }

    var ongoing = m.streaks.rows.filter(function (r) { return r.ongoing; }), ended = m.streaks.rows.filter(function (r) { return !r.ongoing; });
    var streakStu = ongoing.filter(function (r) { return !r.never; });
    set('PR-4', { fired: streakStu.length > 0, rows: ongoing.map(function (r) { return r.sid; }), ended: ended,
      headline: plural(ongoing.length, 'student has', 'students have') + ' not started their last two or more assignments.',
      quiet: ended.length ? 'No one is on a run of unstarted assignments now; ' + plural(ended.length, 'earlier run has', 'earlier runs have') + ' ended.' : 'No one has missed two assignments in a row.' });
    if (streakStu.length) sig({ id: 'streak', card: 'PR-4', lane: 'presence', cat: 'checkin', sids: streakStu.map(function (r) { return r.sid; }), n: streakStu.length, sev: 0.6,
      text: plural(streakStu.length, 'student has', 'students have') + ' not started their last two or more assignments', sub: 'Counted only while the run is still going',
      why: cards['PR-4'].rule, noun: 'not starting assigned work', reason: function (sid) { var r = ongoing.filter(function (x) { return x.sid === sid; })[0]; return 'last ' + r.run + ' assignments not started'; },
      flag: { key: 'streak', label: 'not starting work', tone: 'warn' },
      facts: [['Students', streakStu.length, 'run still going'], ['Rule', '2 in a row', 'live assignments only'], ['Runs that ended', ended.length, 'not counted']],
      act: act('checkin', 'Check in with', { targets: streakStu.map(function (r) { return r.sid; }) }), data: ongoing });

    var tm = m.timing, chronic = tm.students.map(function (x) { return x.sid; }), lateFired = tm.lateShare != null && (tm.lateShare >= 0.25 || chronic.length >= few(0.09, 2));
    set('PR-5', { fired: lateFired, rows: chronic,
      headline: pct(tm.lateShare) + ' of started work began on the last day or after the due date' + (chronic.length ? '; ' + plural(chronic.length, 'student is', 'students are') + ' usually late.' : '.'),
      quiet: tm.lateShare == null ? 'No started work to time yet.' : pct(tm.lateShare) + ' of started work began on the last day or later; no one is usually late.' });
    if (lateFired && chronic.length) sig({ id: 'late', card: 'PR-5', lane: 'habit', cat: 'habit', sids: chronic, n: chronic.length, sev: 0.35,
      text: plural(chronic.length, 'student starts', 'students start') + ' most work on the last day or after the due date', sub: 'Half or more of their recent assignments',
      why: cards['PR-5'].rule, noun: 'usually starting late', reason: function (sid) { var x = tm.students.filter(function (y) { return y.sid === sid; })[0]; return x.late + ' of ' + x.started + ' recent assignments started late'; },
      flag: { key: 'late', label: 'usually late', tone: '' },
      facts: [['Late share, class', pct(tm.lateShare), 'last day or after'], ['Usually late', chronic.length, 'half or more of 4+']],
      act: act('toast', 'Remind', { targets: chronic, text: 'Would send a start-early reminder' }), data: tm });

    if (cards['PR-6'].ok) {
      var low = m.balance.filter(function (x) { return x.role !== 'primary'; }).sort(U.by(function (x) { return x.questions; }))[0];
      set('PR-6', { quiet: 'Almost all recorded work is in ' + m.balance[0].tb.short + '; ' + low.tb.short + ' has ' + low.questions + ' questions attempted.' });
    }

    // ----- Understanding -----
    var topics = m.topicsOrdered.filter(function (t) { return t.stat && t.stat.n; });
    var worst = topics.filter(function (t) { return t.stat.gap != null; }).sort(U.by(function (t) { return t.stat.gap; }))[0];
    var wv = worst ? M.vsTypical(worst.stat.onNorm, worst.stat.norm) : null;
    set('UN-1', { fired: !!(wv && wv.gap <= -0.05), rows: topics,
      headline: wv && wv.gap <= -0.05 ? 'Chapter ' + worst.unit.num + ' is where the class is furthest from typical: ' + pct(worst.stat.onNorm) + ' right first time against ' + pct(worst.stat.norm) + ' elsewhere (' + wv.phrase + ').'
        : !caps.norms ? 'First-try success by chapter. There are no typical results to compare with yet.' : topics.length ? 'Every chapter is within 5 points of typical results.' : 'No chapter has enough work yet.' });
    if (wv && wv.gap <= -0.1) sig({ id: 'topic-' + worst.unit.id, card: 'UN-1', lane: 'teach', cat: 'gap', sids: [], reach: worst.stat.students / Math.max(1, N), sev: Math.min(1, 0.3 + Math.abs(wv.gap) * 3), units: [worst.chapter.id], n: wv.points,
      text: 'Chapter ' + worst.unit.num + ' is ' + wv.phrase + ': ' + pct(worst.stat.onNorm) + ' right first time against ' + pct(worst.stat.norm), sub: worst.unit.name + ' · ' + worst.stat.students + ' students · ' + worst.stat.n + ' first attempts',
      why: 'Shown when a chapter is 10 points or more below typical results on the same questions.', noun: 'the chapter running below typical',
      facts: [['This class', pct(worst.stat.onNorm), 'right first time'], ['Typical', pct(worst.stat.norm), 'same questions'], ['Gap', wv.phrase, 'rule: 10 points or more']],
      act: act('go', 'See the chapter', { tab: 'understanding', focus: 'UN-1', path: [worst.chapter.id] }), data: worst });

    var roots = m.gaps.roots, top = roots[0];
    set('UN-2', { fired: roots.length > 0, rows: roots,
      headline: top ? '“' + top.skill.name + '” is the gap to fix first: ' + pct(top.stat.p) + ' right first time' + (m.gaps.graph ? (top.blocked.length ? ', and ' + plural(top.blocked.length, 'later skill depends', 'later skills depend') + ' on it.' : ', the weakest of ' + roots.length + '.') : ', the weakest of ' + plural(roots.length, 'weak skill') + '.') : '',
      quiet: 'No weak skill with enough evidence.',
      warn: m.gaps.graph ? null : 'There is no prerequisite map for these skills, so weak skills are listed by first-try success and not by what depends on them.' });
    roots.slice(0, 4).forEach(function (g) {
      var sids = g.below.map(function (x) { return x.sid; });
      sig({ id: 'gap-' + g.skill.id, card: 'UN-2', lane: 'teach', cat: 'gap', sids: sids, skills: [g.skill.id], root: true, n: sids.length,
        reach: g.stat.nStudents / Math.max(1, N), sev: U.clamp(0.5 + (0.35 - g.stat.p) + 0.05 * g.blocked.length, 0, 1),
        text: '“' + g.skill.name + '” is at ' + pct(g.stat.p) + ' right first time' + (g.blocked.length ? ', and ' + plural(g.blocked.length, 'later skill depends', 'later skills depend') + ' on it' : ''),
        sub: g.stat.nItems + ' questions · ' + g.stat.nStudents + ' students · ' + sids.length + ' under 35%' + (g.inSkipped.length ? ' · ' + g.inSkipped.length + ' more dependent skills are in a skipped unit' : ''),
        why: cards['UN-2'].rule, noun: 'a weak skill others build on',
        facts: [['Class first try', pct(g.stat.p), 'rule: under 35%'], ['Questions behind it', g.stat.nItems, 'at least 2'], ['Students with evidence', g.stat.nStudents + ' of ' + N, 'at least ' + m.minN],
          ['Skills waiting on it', g.blocked.length, 'in units the class will reach'], ['In a skipped unit', g.inSkipped.length, 'not counted'], ['Students under 35%', sids.length, '3 or more questions each']],
        // a class-level gap with no student individually under the line is answered with the whole class
        act: sids.length ? act('builder', 'Remediation for', { recipe: 'Remediation', minutes: 15, targets: sids, skills: [g.skill.id], reason: g.skill.name })
          : act('builder', 'Warm-up for', { recipe: 'Warm-up', minutes: 8, targets: rosterIds, skills: [g.skill.id], reason: g.skill.name }),
        alts: sids.length ? [act('builder', 'Warm-up for', { recipe: 'Warm-up', minutes: 8, targets: rosterIds, skills: [g.skill.id], reason: g.skill.name })] : [], data: g });
    });

    var wg = m.writeGap, fmt = {}; m.format.forEach(function (f) { fmt[f.key] = f; });
    var wgFired = !!(wg && wg.cls >= 0.15);
    set('UN-5', { fired: wgFired, headline: wgFired ? 'They recognise more than they can write: ' + pct(fmt.mchoice.p) + ' on multiple choice, ' + pct(fmt.activecode.p) + ' on code.' : '',
      quiet: wg ? 'Multiple choice and written code are within 15 points of each other.' : 'First-try success by depth and question format.' });
    if (wgFired) sig({ id: 'writegap', card: 'UN-5', lane: 'content', cat: 'gap', sids: [], reach: 1, sev: U.clamp(wg.cls - (wg.typical || 0), 0.05, 0.35), n: Math.round(wg.cls * 100),
      text: 'They recognise more than they can write: ' + pct(fmt.mchoice.p) + ' on multiple choice, ' + pct(fmt.activecode.p) + ' on code', sub: 'Typical gap elsewhere: ' + Math.round((wg.typical || 0) * 100) + ' points',
      why: cards['UN-5'].rule, facts: [['Multiple choice', pct(fmt.mchoice.p), 'right first time'], ['Code', pct(fmt.activecode.p), 'right first time'], ['Gap here', Math.round(wg.cls * 100) + ' points', 'typical ' + Math.round((wg.typical || 0) * 100)]],
      act: act('go', 'See depth and format', { tab: 'understanding', focus: 'UN-5' }), data: wg });

    var rt = m.reteach, t1 = rt.filter(function (r) { return r.tier === 1; });
    set('UN-3', { fired: rt.length > 0, rows: rt,
      headline: t1.length ? 'On ' + plural(t1.length, 'question') + ', a wrong answer was chosen at least as often as the right one.' : 'On ' + plural(rt.length, 'question') + ', one wrong answer took half or more of the wrong first answers.',
      quiet: 'No common wrong answer in this window.' });
    rt.slice(0, 6).forEach(function (r) {
      var L = String.fromCharCode(65 + r.top);
      sig({ id: 'rt-' + r.item.id, card: 'UN-3', lane: 'teach', cat: 'reteach', sids: r.picks[r.top], skills: r.item.skills, units: [r.item.chapter], n: r.picks[r.top].length, reach: r.wrong / Math.max(1, N), sev: r.tier === 1 ? 0.9 : 0.6,
        text: r.picks[r.top].length + ' of ' + r.n + ' chose ' + L + ' first on “' + r.item.name + '”', sub: r.correct + ' chose the right answer',
        why: r.tier === 1 ? 'Shown because a wrong answer was chosen at least as often as the right one.' : 'Shown because half or more of the wrong first answers were the same option.', noun: 'a question with a shared wrong answer',
        facts: [['Answered', r.n + ' of ' + N, ''], ['Right first time', r.correct, ''], ['Top wrong answer', L + ', ' + r.picks[r.top].length, r.tier === 1 ? 'rule: wrong ≥ correct' : 'rule: ≥ half of wrong'], ['Typical elsewhere', r.item.norm.n >= 200 ? pct(r.item.norm.p) : 'no typical result yet', 'first try']],
        act: act('builder', 'Exit Ticket for', { recipe: 'Exit Ticket', minutes: 8, targets: rosterIds, skills: r.item.skills, reason: r.item.name }),
        alts: [act('item', 'Open the question', { item: r.item.id })], data: r });
    });

    var code = m.code;
    set('UN-4', { fired: code.length > 0, rows: code,
      headline: code.length ? code[0].failing.length + ' of ' + code[0].n + ' are still failing “' + code[0].item.name + '”' + (code[0].topError ? ', most on ' + code[0].topError.err + '.' : '.') : '',
      quiet: 'No coding question has a quarter or more of the class still failing.' });
    code.slice(0, 4).forEach(function (c) {
      sig({ id: 'code-' + c.item.id, card: 'UN-4', lane: 'teach', cat: 'code', sids: c.failing, skills: c.item.skills, units: [c.item.chapter], n: c.failing.length, sev: 0.75,
        text: c.failing.length + ' of ' + c.n + ' are still failing “' + c.item.name + '”', sub: c.topError ? plural(c.topError.students.length, 'student') + ' on the same error: ' + c.topError.err : c.hardTest.failing.length + ' fail test ' + c.hardTest.test,
        why: cards['UN-4'].rule, noun: 'a code question still failing',
        facts: [['Ran code', c.n, ''], ['Passed first run', c.firstRun.length, ''], ['Passed after fixes', c.afterFixes.length, ''], ['Still failing', c.failing.length, 'rule: 25% or more']],
        act: act('builder', 'Parsons version for', { recipe: 'Practice', minutes: 15, targets: c.failing, skills: c.item.skills, reason: c.item.name }),
        alts: [act('item', 'Open the runs', { item: c.item.id })], data: c });
    });

    var vn = m.vsNorm, attempted = Object.keys(b.itemAgg).length || 1;
    set('UN-7', { fired: vn.below.length > 0, rows: vn.below,
      headline: plural(vn.below.length, 'question') + ' went 20 points or more worse here than typical.', quiet: 'No question is well below typical results.' });
    if (vn.below.length) sig({ id: 'vsnorm', card: 'UN-7', lane: 'content', cat: 'gap', sids: [], reach: 1, sev: U.clamp((vn.below.length / attempted) * 1.2, 0.05, 0.4), n: vn.below.length,
      text: plural(vn.below.length, 'question') + ' went 20 points or more worse here than typical', sub: 'Of ' + attempted + ' questions this class has attempted',
      why: cards['UN-7'].rule, facts: [['Questions below', vn.below.length, '20 points or more'], ['Questions above', vn.above.length, '15 points or more'], ['Attempted', attempted, '']],
      act: act('go', 'See the questions', { tab: 'understanding', focus: 'UN-7' }), data: vn });

    var trList = m.traj.drop.concat(m.traj.sustained), trIds = trList.map(function (x) { return x.sid; });
    set('UN-8', { fired: trList.length > 0, rows: trIds,
      headline: [m.traj.drop.length ? plural(m.traj.drop.length, 'student') + ' dropped sharply against classmates' : null, m.traj.sustained.length ? plural(m.traj.sustained.length, 'student has', 'students have') + ' stayed well below classmates for two periods' : null].filter(Boolean).join('; ') + '.',
      quiet: 'No student has dropped or stayed well below classmates.' });
    if (trList.length) sig({ id: 'traj', card: 'UN-8', lane: 'struggle', cat: 'checkin', sids: trIds, n: trIds.length, sev: 0.7,
      text: plural(trIds.length, 'student is', 'students are') + ' slipping or staying well below classmates', sub: m.traj.drop.length + ' dropped 20 points or more · ' + m.traj.sustained.length + ' below for two fortnights',
      why: cards['UN-8'].rule, noun: 'slipping against classmates',
      reason: function (sid) { var x = trList.filter(function (y) { return y.sid === sid; })[0]; return x.kind === 'drop' ? 'dropped ' + Math.abs(Math.round(x.change * 100)) + ' points against classmates' : Math.abs(Math.round(x.last * 100)) + ' points below classmates for two fortnights'; },
      flag: { key: 'slipping', label: 'slipping', tone: 'warn' },
      facts: [['Dropped 20+ points', m.traj.drop.length, ''], ['Below for 2 periods', m.traj.sustained.length, '15 points or more'], ['Minimum work', '15 first attempts', 'per fortnight']],
      act: act('checkin', 'Check in with', { targets: trIds }), data: trList });

    var nx = m.next;
    if (nx) {
      var shaky = nx.rows.filter(function (r) { return r.state === 'shaky'; }), shakyStu = U.uniq([].concat.apply([], shaky.map(function (r) { return r.shaky; })));
      set('UN-9', { fired: shaky.length > 0, rows: nx.rows,
        headline: shaky.length + ' of the ' + plural(nx.rows.length, 'skill') + ' that “' + nx.sub.code + ' ' + nx.sub.name + '” builds on ' + (shaky.length === 1 ? 'is' : 'are') + ' shaky.',
        quiet: nx.rows.length ? 'The ' + plural(nx.rows.length, 'skill') + ' that “' + nx.sub.code + ' ' + nx.sub.name + '” builds on ' + (nx.rows.length === 1 ? 'is' : 'are') + ' in place.' : '“' + nx.sub.code + ' ' + nx.sub.name + '” builds on nothing the class has not met.' });
      if (shaky.length) sig({ id: 'next', card: 'UN-9', lane: 'teach', cat: 'gap', sids: shakyStu, skills: shaky.map(function (r) { return r.skill.id; }), n: shaky.length, reach: Math.max.apply(null, shaky.map(function (r) { return r.shaky.length; })) / Math.max(1, N), sev: 0.6, urgency: 1.2,
        text: shaky.length + ' of the ' + plural(nx.rows.length, 'skill') + ' that “' + nx.sub.code + ' ' + nx.sub.name + '” builds on ' + (shaky.length === 1 ? 'is' : 'are') + ' shaky', sub: shaky.map(function (r) { return r.skill.name + ' ' + pct(r.stat.p); }).join(' · '),
        why: cards['UN-9'].rule, noun: 'needed for the next subunit, ' + nx.sub.code,
        facts: [['Next subunit', nx.sub.code + ' ' + nx.sub.name, ''], ['Skills it builds on', nx.rows.length, ''], ['Shaky', shaky.length, 'rule: under 40%'], ['Students shaky on two or more', nx.multi.length, '']],
        act: act('builder', 'Warm-up for', { recipe: 'Warm-up', minutes: 8, targets: rosterIds, skills: shaky.map(function (r) { return r.skill.id; }).slice(0, 2), reason: 'before ' + nx.sub.code }),
        alts: [act('builder', 'Pretest for', { recipe: 'Pretest', minutes: 15, targets: rosterIds, skills: nx.rows.map(function (r) { return r.skill.id; }).slice(0, 3), reason: 'before ' + nx.sub.code })], data: nx });
    } else set('UN-9', { quiet: 'No upcoming subunit found.' });

    var blind = m.blind[m.blind.length - 1];
    if (blind) {
      set('UN-10', { fired: blind.none.length > 0, rows: blind.none,
        headline: blind.none.length + ' of the ' + blind.taught + ' skills taught in chapter ' + blind.topic.unit.num + ' have no questions in any attached textbook.',
        quiet: 'Every skill taught in chapter ' + blind.topic.unit.num + ' has questions somewhere.' });
      if (blind.none.length) sig({ id: 'blind', card: 'UN-10', lane: 'content', cat: 'content', sids: [], reach: blind.none.length / Math.max(1, blind.taught), sev: 0.5, n: blind.none.length,
        text: blind.none.length + ' of the ' + blind.taught + ' skills taught in chapter ' + blind.topic.unit.num + ' have no questions', sub: 'The Lens cannot report on: ' + blind.none.map(function (s) { return s.name; }).join(' · '),
        why: cards['UN-10'].rule, facts: [['Skills taught', blind.taught, 'chapter ' + blind.topic.unit.num], ['With questions here', blind.here, ''], ['No questions anywhere', blind.none.length, '']],
        act: act('toast', 'Generate questions', { text: 'Would open the quiz generator for ' + plural(blind.none.length, 'skill') + '.' }), data: blind });
    } else set('UN-10', { quiet: 'No chapter opened yet.' });

    if (cards['UN-6'].ok) {
      var tf = m.transfer.filter(function (t) { return Math.abs(t.gap) >= 0.2; });
      set('UN-6', { fired: tf.length > 0, rows: tf,
        headline: tf.length ? '“' + tf[0].skill.name + '” is at ' + pct(tf[0].primary.p) + ' in ' + tf[0].primary.tb.short + ' and ' + pct(tf[0].other.p) + ' in ' + tf[0].other.tb.short + '.' : '',
        quiet: 'No skill differs by 20 points or more between textbooks.' });
      if (tf.length) sig({ id: 'transfer', card: 'UN-6', lane: 'content', cat: 'gap', sids: [], reach: 0.5, sev: U.clamp(Math.abs(tf[0].gap) * 0.6, 0.1, 0.4), n: tf.length,
        text: '“' + tf[0].skill.name + '” is at ' + pct(tf[0].primary.p) + ' in ' + tf[0].primary.tb.short + ' and ' + pct(tf[0].other.p) + ' in ' + tf[0].other.tb.short, sub: plural(tf.length, 'skill differs', 'skills differ') + ' by 20 points or more between textbooks',
        why: cards['UN-6'].rule, facts: [[tf[0].primary.tb.short, pct(tf[0].primary.p), tf[0].primary.n + ' attempts'], [tf[0].other.tb.short, pct(tf[0].other.p), tf[0].other.n + ' attempts']],
        act: act('go', 'Compare textbooks', { tab: 'understanding', focus: 'UN-6' }), data: tf });
    }

    if (cards['UN-12'].ok) {
      var dp = m.dip.flagged;
      if (dp) {
        var pt = dp.point, wkV = M.vsTypical(pt.gap, 0), monthV = M.vsTypical(pt.trail, 0);
        var dipText = 'In the week of ' + T.fmtDay(pt.week * 7) + ' the class was ' + wkV.phrase + '; over the month before it was ' + monthV.phrase;
        set('UN-12', { fired: true, rows: dp.fell, headline: dipText + '.' });
        sig({ id: 'dip', card: 'UN-12', lane: 'teach', cat: 'gap', sids: [], reach: 1, sev: 0.75, n: wkV.points, units: U.uniq(dp.fell.map(function (f) { return f.sub.chapter; })),
          text: dipText, sub: dp.fell.length ? 'Fell most: ' + dp.fell.map(function (f) { return f.sub.code + ' ' + f.sub.name; }).join(' · ') : 'Typical results on the same questions',
          why: cards['UN-12'].rule, noun: 'a class-wide dip that week',
          facts: [['That week', wkV.phrase, pt.n + ' first attempts'], ['Month before', monthV.phrase, ''], ['Rule', '8 points further below', 'than the month before']],
          act: act('builder', 'Spiral Review for', { recipe: 'Spiral Review', minutes: 20, targets: rosterIds, skills: U.uniq([].concat.apply([], dp.fell.map(function (f) { return f.sub.skills.slice(0, 2); }))), reason: 'topics that fell' }), data: m.dip });
      } else set('UN-12', { quiet: m.dip.series.length ? 'No class-wide dip: the class has stayed near its usual level against typical.' : 'Not enough questions with a typical result yet.' });
    }
    if (cards['UN-11'].ok) {
      var ql = m.quality;
      set('UN-11', { fired: false, rows: ql.rows, quiet: ql.counts.hard + ' questions this class attempted stay hard even after practice; ' + ql.counts.flat + ' do not separate stronger from weaker students.' });
    }

    // ----- Engagement -----
    var wk = m.rhythm.weeks, quietWeeks = wk.filter(function (x) { return !x.classWeek; });
    set('EN-1', { headline: 'The class was active in ' + (wk.length - quietWeeks.length) + ' of ' + plural(wk.length, 'week') + (quietWeeks.length ? '; the week' + (quietWeeks.length > 1 ? 's' : '') + ' of ' + quietWeeks.slice(0, 3).map(function (x) { return T.fmtDay(x.week * 7); }).join(', ') + (quietWeeks.length > 3 ? ' and ' + (quietWeeks.length - 3) + ' more' : '') + ' ' + (quietWeeks.length > 1 ? 'were' : 'was') + ' quiet for everyone.' : '.') });

    var quiet = m.quiet.map(function (q) { return q.sid; });
    set('EN-2', { fired: quiet.length > 0, rows: quiet, headline: plural(quiet.length, 'student has', 'students have') + ' had no recorded activity for two or more class weeks.', quiet: 'No one has been quiet for two class weeks.' });
    if (quiet.length) sig({ id: 'quiet', card: 'EN-2', lane: 'presence', cat: 'checkin', sids: quiet, n: quiet.length, sev: 0.9, floor: 0.3,
      text: plural(quiet.length, 'student has', 'students have') + ' been quiet for two or more class weeks', sub: 'No recorded ALPS activity while most of the class was active',
      why: cards['EN-2'].rule, noun: 'gone quiet', reason: function (sid) { var q = m.quiet.filter(function (x) { return x.sid === sid; })[0]; return 'no activity for ' + q.run + ' class weeks (last ' + (q.lastDay != null ? T.fmtDay(q.lastDay) : 'never') + ')'; },
      flag: function (sid) { var q = m.quiet.filter(function (x) { return x.sid === sid; })[0]; return { key: 'quiet', label: 'quiet ' + q.run + ' wk', tone: 'warn' }; },
      facts: [['Students', quiet.length, ''], ['Rule', '2 class weeks', 'quiet weeks do not count']],
      act: act('checkin', 'Check in with', { targets: quiet }), alts: [act('toast', 'Confirm enrolment', { text: 'Would open People to confirm enrolment.' })], data: m.quiet });

    var rc = m.rosterCheck;
    set('EN-5', { fired: rc.never.length + rc.off.length > 0, rows: rc.never.concat(rc.off),
      headline: (rc.never.length ? plural(rc.never.length, 'rostered student has', 'rostered students have') + ' never signed in' : '') + (rc.never.length && rc.off.length ? '; ' : '') + (rc.off.length ? plural(rc.off.length, 'account') + ' with activity ' + (rc.off.length === 1 ? 'is' : 'are') + ' not on the roster' : '') + '.',
      quiet: 'Everyone on the roster has signed in, and every active account is on it.' });
    if (rc.never.length + rc.off.length) sig({ id: 'roster', card: 'EN-5', lane: 'presence', cat: 'checkin', sids: rc.never, n: rc.never.length + rc.off.length, sev: 0.9, floor: 0.3, extra: rc.off,
      reach: (rc.never.length + rc.off.length) / Math.max(1, N),
      text: (rc.never.length ? plural(rc.never.length, 'rostered student has', 'rostered students have') + ' never signed in' : '') + (rc.never.length && rc.off.length ? '; ' : '') + (rc.off.length ? plural(rc.off.length, 'active account is', 'active accounts are') + ' not on the roster' : ''),
      sub: 'Counts across the Lens are only right if the roster is', why: cards['EN-5'].rule, noun: 'a roster or access problem', reason: function () { return 'never signed in'; },
      flag: { key: 'never', label: 'never signed in', tone: 'warn' },
      facts: [['Never signed in', rc.never.length, 'on the roster'], ['Active, not on the roster', rc.off.length, '']],
      act: rc.never.length ? act('toast', 'Re-invite', { targets: rc.never, text: 'Would re-send invitations' }) : act('toast', 'Open People', { text: 'Would open People to fix the roster.' }), data: rc });

    if (cards['EN-3'].ok) {
      var absent = m.when.absent.map(function (x) { return x.sid; });
      var sc = Object.keys(m.when.sessionCells).filter(function (k) { return m.when.sessionCells[k] >= 3; });
      var sessHours = U.uniq(sc.map(function (k) { return +k.split(':')[1]; })).sort(function (a, c) { return a - c; }), sessDows = U.uniq(sc.map(function (k) { return +k.split(':')[0]; })).sort(function (a, c) { return a - c; });
      var wsp = m.when.split;
      set('EN-3', { fired: absent.length > 0, rows: absent,
        headline: plural(absent.length, 'student has', 'students have') + ' no activity on three or more class days in this window.',
        quiet: sessHours.length ? 'This class works together on ' + sessDows.map(function (dd) { return T.DOW[dd]; }).join(', ') + ' around ' + sessHours.map(function (x) { return x + ':00'; }).join(' and ') + '; ' + pct(wsp.inClass / wsp.total) + ' of recorded minutes fall in those sessions.' : 'A shared class time shows only on scattered days.' });
      if (absent.length) sig({ id: 'absent', card: 'EN-3', lane: 'presence', cat: 'checkin', sids: absent, n: absent.length, sev: 0.6,
        text: plural(absent.length, 'student has', 'students have') + ' no activity on three or more class days', sub: 'In this window; inferred class sessions, not attendance',
        why: cards['EN-3'].rule, noun: 'missing class sessions', reason: function (sid) { var x = m.when.absent.filter(function (y) { return y.sid === sid; })[0]; return 'no activity on ' + x.missed + ' of ' + x.of + ' class days'; },
        flag: { key: 'absent', label: 'missed class days', tone: 'warn' },
        facts: [['Students', absent.length, ''], ['Rule', '3 class days', 'in the window']], act: act('checkin', 'Check in with', { targets: absent }), data: m.when });
    }

    var grind = m.roster.filter(function (s) { return m.stu[s.id].strict === 'grind'; }).map(function (s) { return s.id; }), brq = m.map.quads.br;
    set('EN-4', { fired: grind.length > 0, rows: grind,
      headline: plural(brq.length, 'student is', 'students are') + ' in “' + M.QUAD.br + '”; ' + grind.length + ' of them by a wide margin.',
      quiet: 'Recorded activity and first-try success, one dot per student. No one is far out on both.' });
    if (grind.length) sig({ id: 'grind', card: 'EN-4', lane: 'struggle', cat: 'checkin', sids: grind, n: grind.length, sev: 0.6,
      text: plural(grind.length, 'student is', 'students are') + ' putting in far more time than classmates and getting far fewer right first time', sub: '30% more minutes than the class median, 8 points or more below it',
      why: cards['EN-4'].rule, noun: 'time going in without landing', reason: function (sid) { var x = m.stu[sid]; return x.minutes + ' minutes (class ' + Math.round(m.medianMinutes) + '), ' + pct(x.fts) + ' right first time'; },
      flag: { key: 'grind', label: 'time, not landing', tone: 'info' },
      facts: [['By a wide margin', grind.length, 'rule above'], ['In that quarter of the map', brq.length, 'above median time, below median first try']],
      act: act('builder', 'Remediation for', { recipe: 'Remediation', minutes: 15, targets: grind, skills: roots.slice(0, 1).map(function (g) { return g.skill.id; }), reason: M.QUAD.br.toLowerCase() }), data: m.map });

    // ----- Work habits -----
    var rtr = m.retry, rapid = rtr.flagged.map(function (x) { return x.sid; });
    set('WH-1', { fired: rapid.length > 0, rows: rapid,
      headline: pct(rtr.share) + ' of retries come within three seconds of a wrong answer; ' + plural(rapid.length, 'student does', 'students do') + ' this far more than the rest.',
      quiet: rtr.total ? pct(rtr.share) + ' of retries come within three seconds of a wrong answer; no student stands out.' : 'No retries recorded yet.' });
    if (rapid.length) sig({ id: 'retry', card: 'WH-1', lane: 'habit', cat: 'habit', sids: rapid, n: rapid.length, sev: 0.4,
      text: plural(rapid.length, 'student retries', 'students retry') + ' within three seconds far more than classmates', sub: 'Class: ' + pct(rtr.share) + ' of retries',
      why: cards['WH-1'].rule, noun: 'retrying within seconds', reason: function (sid) { var x = rtr.flagged.filter(function (y) { return y.sid === sid; })[0]; return pct(x.rapid) + ' of ' + x.retries + ' retries within three seconds'; },
      flag: { key: 'retry', label: 'rapid retries', tone: '' },
      facts: [['Class share', pct(rtr.share), 'within 3 seconds'], ['Flagged', rapid.length, 'top tenth and above 20%']],
      act: act('toast', 'Limit attempts next time', { text: 'Would set “attempts per question” to 2 on the next assignment.' }), data: rtr });

    var fw = m.fastWrong, fwIds = fw.flagged.map(function (x) { return x.sid; }), fwFired = fw.classNote || fwIds.length > 0;
    set('WH-2', { fired: fwFired, rows: fwIds,
      headline: fw.classNote ? 'Across the class, ' + pct(fw.median) + ' of first answers are wrong and under five seconds: a class habit, not a few students.' : plural(fwIds.length, 'student gives', 'students give') + ' a fast wrong first answer on a quarter or more of questions; most are near zero.',
      quiet: 'Very few first answers are both fast and wrong.' });
    if (fw.classNote) sig({ id: 'fastwrong-class', card: 'WH-2', lane: 'content', cat: 'habit', sids: [], reach: fw.dots.filter(function (x) { return x.v >= 0.2; }).length / Math.max(1, N), sev: 0.5, n: Math.round(fw.median * 100),
      text: 'Across the class, ' + pct(fw.median) + ' of first answers are wrong and under five seconds', sub: 'A class habit, not a few students',
      why: cards['WH-2'].rule, facts: [['Class median', pct(fw.median), 'rule: 20% is a class habit'], ['Students at 20% or more', fw.dots.filter(function (x) { return x.v >= 0.2; }).length, '']],
      act: act('toast', 'Feedback on submit', { text: 'Would switch feedback to “on submit” for the next assignment.' }), data: fw });
    if (fwIds.length) sig({ id: 'fastwrong', card: 'WH-2', lane: 'habit', cat: 'habit', sids: fwIds, n: fwIds.length, sev: 0.4,
      text: plural(fwIds.length, 'student gives', 'students give') + ' a fast wrong first answer on a quarter or more of questions', sub: 'Class median ' + pct(fw.median), why: cards['WH-2'].rule, noun: 'answering before reading',
      reason: function (sid) { var x = fw.dots.filter(function (y) { return y.sid === sid; })[0]; return pct(x.v) + ' of first answers wrong in under five seconds'; },
      flag: { key: 'fastwrong', label: 'fast wrong answers', tone: '' },
      facts: [['Class median', pct(fw.median), ''], ['Students at 25% or more', fwIds.length, 'and in the top tenth']],
      act: act('toast', 'Feedback on submit', { text: 'Would switch feedback to “on submit” for the next assignment.' }), data: fw });

    var un = m.unresolved, topUn = un.items[0], unFired = !!(topUn && topUn.students.length >= few(0.09, 2) && topUn.students.length / topUn.n >= 0.25);
    set('WH-3', { fired: unFired, rows: un.items,
      headline: topUn ? topUn.students.length + ' of the ' + topUn.n + ' students who tried “' + topUn.item.name + '” never solved it.' : '',
      quiet: topUn ? 'No question has been left unsolved by a quarter of the students who tried it.' : 'Nothing left unsolved.' });
    if (unFired) sig({ id: 'unsolved', card: 'WH-3', lane: 'teach', cat: 'reteach', sids: topUn.students, skills: topUn.item.skills, units: [topUn.item.chapter], n: topUn.students.length, sev: 0.5,
      text: topUn.students.length + ' of ' + topUn.n + ' never solved “' + topUn.item.name + '”', sub: 'Tried, and left without a correct answer',
      why: cards['WH-3'].rule, noun: 'a question left unsolved', facts: [['Tried it', topUn.n, ''], ['Never solved', topUn.students.length, 'rule: a quarter or more']],
      act: act('toast', 'Assign “finish these” to', { targets: topUn.students, text: 'Would assign each student their own “finish these” set' }), alts: [act('item', 'Open the question', { item: topUn.item.id })], data: un });

    if (cards['WH-4'].ok) {
      var still = m.stuck.filter(function (x) { return !x.lastOk; }), got = m.stuck.filter(function (x) { return x.lastOk; });
      var stillIds = U.uniq(still.map(function (x) { return x.sid; }));
      set('WH-4', { fired: still.length > 0, rows: stillIds, still: still, got: got,
        headline: plural(stillIds.length, 'student is', 'students are') + ' stuck on code that is still not passing (' + plural(still.length, 'question') + ')' + (got.length ? '; ' + got.length + ' more ' + (got.length === 1 ? 'was' : 'were') + ' passed after many runs.' : '.'),
        quiet: got.length ? 'No one is stuck now; ' + plural(got.length, 'question was', 'questions were') + ' passed after many runs.' : 'No one is stuck in code in this window.' });
      if (still.length) sig({ id: 'stuck', card: 'WH-4', lane: 'struggle', cat: 'code', sids: stillIds, n: stillIds.length, sev: 0.6,
        text: plural(stillIds.length, 'student is', 'students are') + ' stuck on code that is still not passing', sub: plural(still.length, 'question') + ' · many runs without a pass',
        why: cards['WH-4'].rule, noun: 'stuck in code', reason: function (sid) { var x = still.filter(function (y) { return y.sid === sid; }); return x[0].runs + ' runs on “' + x[0].item.name + '” without a pass' + (x.length > 1 ? ' (+' + (x.length - 1) + ' more)' : ''); },
        flag: { key: 'stuck', label: 'stuck in code', tone: 'warn' },
        facts: [['Students', stillIds.length, 'still not passing'], ['Questions', still.length, ''], ['Longest', still[0].runs + ' runs', 'rule: 10 or more']],
        act: act('item', 'Open the work', { item: still[0].item.id }), alts: [act('checkin', 'Check in with', { targets: stillIds })], data: m.stuck });
    }

    var fb = m.help, unseen = fb.feedback.filter(function (f) { return !f.seen; }), unseenIds = U.uniq(unseen.map(function (f) { return f.sid; }));
    set('WH-5', { fired: unseen.length > 0, rows: unseenIds,
      headline: plural(unseen.length, 'piece') + ' of feedback ' + (unseen.length === 1 ? 'has' : 'have') + ' not been opened, by ' + plural(unseenIds.length, 'student') + '.',
      quiet: fb.feedback.length ? 'All feedback has been opened.' : 'No feedback has been given yet.' });
    if (unseen.length) sig({ id: 'feedback', card: 'WH-5', lane: 'habit', cat: 'habit', sids: unseenIds, n: unseenIds.length, sev: 0.3,
      text: plural(unseenIds.length, 'student has', 'students have') + ' not opened feedback you gave', sub: plural(unseen.length, 'piece') + ' of feedback unopened',
      why: cards['WH-5'].rule, noun: 'feedback left unopened', reason: function (sid) { return unseen.filter(function (f) { return f.sid === sid; }).length + ' feedback not opened'; },
      flag: { key: 'feedback', label: 'feedback unopened', tone: '' }, facts: [['Feedback given', fb.feedback.length, ''], ['Opened', fb.seen, ''], ['Students with unopened', unseenIds.length, '']],
      act: act('toast', 'Nudge', { targets: unseenIds, text: 'Would send a nudge to open feedback' }), data: fb });
    if (cards['WH-6'].ok) set('WH-6', { fired: m.markers.length > 0, rows: m.markers, headline: plural(m.markers.length, 'recorded event is', 'recorded events are') + ' worth a look.', quiet: 'Nothing recorded.', exempt: 'Process notes are shown on this tab and the student page only, by design.' });

    // ----- Movement and good news -----
    var mv = m.movement, up = U.uniq(mv.improving.map(function (x) { return x.sid; }).concat(m.traj.rise.map(function (x) { return x.sid; })));
    if (cards['ST-5'].ok) set('ST-5', { fired: mv.improving.length + mv.slipping.length > 0, rows: mv.improving.concat(mv.slipping), headline: mv.improving.length + ' improving, ' + mv.slipping.length + ' slipping, ' + mv.steady.length + ' steady.', quiet: 'No one moved 15 points or more against classmates.' });
    if (up.length) sig({ id: 'good-up', tab: 'students', lane: 'good', cat: 'good', sids: up, n: up.length, sev: 0.8,
      text: plural(up.length, 'student has', 'students have') + ' improved against classmates', sub: '15 points or more on the same questions, in the last two class weeks',
      why: 'Shown when a student’s results relative to classmates rise 15 points or more between windows.', flag: { key: 'improving', label: 'improving', tone: 'good', good: true },
      facts: [['Students', up.length, ''], ['Rule', '+15 points', '15 first attempts in each window']], act: act('congrats', 'Congratulate', { targets: up }), data: mv });
    if (m.ready.length) {
      var rd = m.ready.map(function (x) { return x.sid; });
      sig({ id: 'good-ready', tab: 'students', lane: 'good', cat: 'good', sids: rd, n: rd.length, sev: 0.6,
        text: plural(rd.length, 'student looks', 'students look') + ' ready for more', sub: 'High first-try success on chapter ' + m.currentUnit.num + ' and all assigned work finished',
        why: 'Shown for 70% or more right first time on the current chapter, including reasoning questions, with assigned work complete.', flag: { key: 'ready', label: 'ready for more', tone: 'good', good: true },
        facts: [['Students', rd.length, ''], ['Rule', '70% first try', '15 or more questions']],
        act: act('builder', 'Challenge for', { recipe: 'Challenge', minutes: 20, targets: rd, skills: m.next ? m.next.sub.skills.slice(0, 2) : roots.slice(0, 1).map(function (g) { return g.skill.id; }), reason: 'stretch' }), data: m.ready });
    }

    // ----- Follow-ups whose recheck date has arrived -----
    var due = m.followups.filter(function (f) { return f.status === 'recheck due'; });
    set('FU-1', { fired: due.length > 0, rows: due, headline: plural(due.length, 'recheck is', 'rechecks are') + ' ready to review.', quiet: m.followups.length ? 'No recheck is due.' : 'Nothing logged yet. Actions you take from a card appear here.' });
    due.forEach(function (f) {
      var a = f.action, ci = a.kind === 'check-in';
      if (ci) {
        var stillQuiet = f.rows.filter(function (r) { return r.state !== 'active'; }).map(function (r) { return r.sid; });
        sig({ id: 'fu-' + a.id, card: 'FU-1', lane: 'presence', cat: 'followup', sids: a.students, n: stillQuiet.length, sev: stillQuiet.length ? 0.8 : 0.3, urgency: 1.1, followup: f,
          text: stillQuiet.length ? plural(stillQuiet.length, 'student is', 'students are') + ' still quiet a week after your check-in' : 'Everyone you checked in with is active again',
          sub: 'Checked in ' + T.fmtDay(a.day), why: 'Shown when the recheck date you set for an action has arrived.', noun: 'a check-in to review',
          reason: function (sid) { var r = f.rows.filter(function (x) { return x.sid === sid; })[0]; return 'you checked in ' + T.fmtDay(a.day) + ', ' + (r.state === 'active' ? 'active again' : 'still no activity'); },
          facts: [['Checked in', T.fmtDay(a.day), ''], ['Still quiet', stillQuiet.length + ' of ' + a.students.length, '']],
          act: act('go', 'Review the check-in', { tab: 'followups', focus: 'fu-' + a.id }), data: f });
      } else {
        sig({ id: 'fu-' + a.id, card: 'FU-1', lane: 'teach', cat: 'followup', sids: a.students, skills: a.skills || [], n: f.improved, reach: a.students.length / Math.max(1, N), sev: 0.5, urgency: 1.2, followup: f,
          text: 'Recheck ready: ' + a.title, sub: f.improved + ' of ' + f.rows.length + ' improved on new questions' + (f.noWork ? ' · ' + f.noWork + ' with no new work' : ''),
          why: 'Shown when the recheck date you set for an action has arrived.', noun: 'your ' + a.type + ' of ' + T.fmtDay(a.day) + ' is ready to review (' + f.improved + ' of ' + f.rows.length + ' improved)',
          facts: [['Before', pct(f.before), 'same skill'], ['After', pct(f.after), 'new questions'], ['Improved', f.improved + ' of ' + f.rows.length, '+15 points'], ['No change', f.same, ''], ['First evidence', f.firstEvidence, 'no earlier work to compare'], ['No new work', f.noWork, '']],
          act: act('go', 'Review the recheck', { tab: 'followups', focus: 'fu-' + a.id }), data: f });
      }
    });

    I.themes(world, sec, m, out, opts, treatedStu, treatedSkill);
    I.flags(sec, m, out);
    I.brief(world, sec, m, out);
    return out;
  };

  // ---------- themes: group signals by cause, then rank ----------
  I.themes = function (world, sec, m, out, opts, treatedStu, treatedSkill) {
    var N = out.N, sk = m.skill, nm = function (sid) { return sec.students[sid] ? sec.students[sid].name : sid; };
    var graphOn = m.caps.graph, rootSet = {};
    out.signals.forEach(function (s) { if (s.root) rootSet[s.skills[0]] = s; });
    var p = function (k) { return sk[k] ? sk[k].p : 1; };
    // A finding joins a root gap's theme through the prerequisite map only when it is also largely the
    // same students: at least half of the students in the finding are below on the root skill.
    function sameStudents(s, rootSig) {
      if (!s.sids.length) return true;
      var set = {}; rootSig.sids.forEach(function (x) { set[x] = true; });
      return s.sids.filter(function (x) { return set[x]; }).length / s.sids.length >= 0.5;
    }
    function keyOf(s) {
      if (s.lane === 'teach') {
        if (s.skills.length) {
          var own = s.skills.filter(function (k) { return rootSet[k]; }).sort(U.by(p));
          if (own.length) return 'skill:' + own[0];
          if (graphOn) {
            var via = [];
            s.skills.forEach(function (k) { world.skills[k].prereqs.forEach(function (q) { if (rootSet[q] && sameStudents(s, rootSet[q])) via.push(q); }); });
            if (via.length) return 'skill:' + U.uniq(via).sort(U.by(p))[0];
          }
          return 'skill:' + s.skills.slice().sort(U.by(p))[0];
        }
        return s.units.length ? 'unit:' + s.units[0] : s.id;
      }
      if (s.lane === 'work') return s.units.length ? 'work:' + s.units[0] : s.id;
      if (s.lane === 'presence' || s.lane === 'struggle' || s.lane === 'habit') return 'people:' + s.lane;
      return s.id;
    }
    var groups = {}, order = [];
    out.signals.forEach(function (s) {
      if (s.lane === 'admin' || s.lane === 'good') return;
      var k = keyOf(s); s.theme = k;
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(s);
    });
    out.themes = order.map(function (k) {
      var mem = groups[k].slice().sort(U.by(function (s) { return s.score; }, true)), lead = mem[0], lane = lead.lane;
      var th = { id: k, lane: lane, members: mem, cat: lead.cat, tab: lead.tab, card: lead.card, sids: U.uniq([].concat.apply([], mem.map(function (s) { return s.sids; }))),
        skills: U.uniq([].concat.apply([], mem.map(function (s) { return s.skills; }))), urgency: Math.max.apply(null, mem.map(function (s) { return s.urgency; })) };
      var people = k.indexOf('people:') === 0;
      if (people) {
        // one row per student, every reason they are here, students with no logged action first
        var per = {};
        mem.forEach(function (s) { s.sids.forEach(function (sid) { (per[sid] || (per[sid] = { sid: sid, reasons: [], sev: 0 })).reasons.push(s.reason ? s.reason(sid) : s.noun); per[sid].sev = Math.max(per[sid].sev, s.sev); }); });
        mem.forEach(function (s) { (s.extra || []).forEach(function (sid) { per[sid] = per[sid] || { sid: sid, reasons: ['active, not on the roster'], sev: s.sev, off: true }; }); });
        th.people = Object.keys(per).map(function (sid) { var x = per[sid]; x.treated = !!treatedStu[sid]; return x; })
          .sort(function (a, c) { return (a.treated - c.treated) || (c.sev - a.sev) || (c.reasons.length - a.reasons.length); });
        th.sids = th.people.filter(function (x) { return !x.off; }).map(function (x) { return x.sid; });
        var open = th.people.filter(function (x) { return !x.treated && !x.off; }), n = th.people.length;
        th.untreated = open.map(function (x) { return x.sid; });
        var floor = Math.max.apply(null, mem.map(function (s) { return open.length ? (s.floor || 0) : 0; }));
        th.reach = Math.max(n / Math.max(1, N), floor);
        th.sev = Math.max.apply(null, mem.map(function (s) { return s.sev; }));
        // students already being followed up weigh less than students nobody has looked at
        var share = n ? (open.length + 0.6 * (n - open.length - th.people.filter(function (x) { return x.off; }).length) + th.people.filter(function (x) { return x.off; }).length) / n : 1;
        th.score = th.reach * th.sev * th.urgency * share;
        th.text = lane === 'presence' ? plural(n, 'student is', 'students are') + ' not showing up or not starting work'
          : lane === 'struggle' ? plural(n, 'student is', 'students are') + ' working and not getting there' : plural(n, 'student has', 'students have') + ' a working habit worth a word';
        th.sub = th.people.slice(0, 3).map(function (x) { return nm(x.sid) + ': ' + x.reasons[0] + (x.treated ? ' (already followed up)' : ''); }).join(' · ') + (n > 3 ? ' · +' + (n - 3) + ' more' : '');
        th.count = n;
        var targets = (open.length ? open : th.people.filter(function (x) { return !x.off; })).map(function (x) { return x.sid; });
        th.act = lane === 'habit' ? lead.act : targets.length ? { kind: 'checkin', verb: 'Check in with', targets: targets, whole: false } : lead.act;
        th.alts = [].concat.apply([], mem.map(function (s) { return [s.act].concat(s.alts || []); })).filter(function (a) { return a && a.kind !== th.act.kind; });
        th.cat = lane === 'habit' ? 'habit' : lane === 'struggle' ? 'support' : 'checkin';
      } else {
        th.reach = Math.max.apply(null, mem.map(function (s) { return s.reach; }));
        th.sev = lead.sev;
        var fu = mem.filter(function (s) { return s.followup; })[0], anchor = k.indexOf('skill:') === 0 ? k.slice(6) : null;
        th.followup = fu ? fu.followup : (anchor && treatedSkill[anchor]) || null;
        th.treated = !!th.followup;
        th.score = lead.score * (1 + 0.1 * Math.min(3, mem.length - 1)) * (th.treated ? 0.7 : 1);
        var others = mem.filter(function (s) { return !s.followup; });
        if (anchor && others.length > 1) {
          var st = sk[anchor], kinds = U.groupBy(others, function (s) { return s.noun; }), bits = [];
          kinds.forEach(function (ss, noun) { bits.push(ss.length > 1 ? ss.length + ' × ' + noun : noun); });
          th.anchor = world.skills[anchor];
          th.text = '“' + world.skills[anchor].name + '” runs through ' + plural(others.length, 'finding') + (st ? ': ' + pct(st.p) + ' right first time' : '');
          th.sub = bits.join(' · ') + (fu ? ' · ' + fu.noun : '');
          th.count = others.length;
        } else {
          th.text = lead.text; th.count = lead.n;
          th.sub = lead.sub + mem.filter(function (s) { return s !== lead; }).map(function (s) { return ' · also ' + s.noun; }).join('');
        }
        var best = others.filter(function (s) { return s.act && s.act.kind === 'builder'; })[0] || others[0] || lead;
        th.act = best.act;
        th.alts = [].concat.apply([], mem.map(function (s) { return [s.act].concat(s.alts || []); })).filter(function (a) { return a && a !== th.act; });
        th.cat = lane === 'work' ? 'progress' : lane === 'content' ? 'content' : lead.cat;
      }
      // keep one alternative per distinct label
      var seen = {}; seen[I.label(th.act)] = true;
      th.alts = th.alts.filter(function (a) { var l = I.label(a); if (seen[l]) return false; seen[l] = true; return true; }).slice(0, 3);
      th.label = I.label(th.act);
      th.key = sec.id + ':' + th.id;
      th.state = opts.cards ? (opts.cards[th.key] || null) : null;
      return th;
    }).sort(U.by(function (t) { return t.score; }, true));

    var live = out.themes.filter(function (t) { return !t.state; });
    out.lists = {}; out.top = []; out.rest = [];
    Object.keys(I.LISTS).forEach(function (name) {
      var L = I.LISTS[name], mine = live.filter(function (t) { return L.lanes.indexOf(t.lane) >= 0; });
      var above = mine.filter(function (t) { return t.score >= I.IMPACT_MIN; });
      var n = Math.min(L.max, Math.max(Math.min(L.min, mine.length), above.length));
      out.lists[name] = { title: L.title, top: mine.slice(0, n), rest: mine.slice(n) };
      mine.forEach(function (t, i) { t.list = name; t.shown = i < n; });
      out.top = out.top.concat(mine.slice(0, n)); out.rest = out.rest.concat(mine.slice(n));
    });
    out.rest.sort(U.by(function (t) { return t.score; }, true));
    out.handled = out.themes.filter(function (t) { return t.state; });
    out.good = out.signals.filter(function (s) { return s.lane === 'good'; }).map(function (s) { s.key = sec.id + ':' + s.id; s.state = opts.cards ? (opts.cards[s.key] || null) : null; return s; });
    out.admin = out.signals.filter(function (s) { return s.lane === 'admin'; });
    // a count for every tab, from the same records: how many of its cards have fired
    out.tabCounts = {};
    Object.keys(out.cards).forEach(function (id) { var c = out.cards[id]; if (c.fired && c.tab !== 'brief') out.tabCounts[c.tab] = (out.tabCounts[c.tab] || 0) + 1; });
    out.byTab = function (tab) { return out.signals.filter(function (s) { return s.tab === tab && s.lane !== 'good'; }).sort(U.by(function (s) { return s.score; }, true)); };
  };

  // ---------- flags: what each student is flagged for, read from the signals that name them ----------
  I.flags = function (sec, m, out) {
    var flags = {};
    m.roster.forEach(function (s) { flags[s.id] = []; });
    out.signals.forEach(function (s) {
      if (!s.flag) return;
      s.sids.forEach(function (sid) {
        if (!flags[sid]) return;
        var f = typeof s.flag === 'function' ? s.flag(sid) : s.flag;
        flags[sid].push({ key: f.key, label: f.label, tone: f.tone, good: !!f.good, sev: f.good ? 0 : s.sev, signal: s.id, lane: s.lane, reason: s.reason ? s.reason(sid) : null });
      });
    });
    Object.keys(flags).forEach(function (sid) { flags[sid].sort(function (a, c) { return (a.good - c.good) || (c.sev - a.sev); }); });
    out.flags = flags;
    // attention is the number and severity of active flags; it orders lists, and is never shown as a score
    out.attention = {};
    Object.keys(flags).forEach(function (sid) { out.attention[sid] = U.sum(flags[sid].map(function (f) { return f.sev; })); });
    out.flagKeys = [];
    var seen = {};
    Object.keys(flags).forEach(function (sid) { flags[sid].forEach(function (f) { if (!seen[f.key]) { seen[f.key] = { key: f.key, label: f.label.replace(/\s\d+\s?wk$/, ''), n: 0, good: f.good }; out.flagKeys.push(seen[f.key]); } seen[f.key].n++; }); });
    out.flagKeys.sort(function (a, c) { return (a.good - c.good) || (c.n - a.n); });
    out.byAttention = m.roster.slice().sort(function (a, c) { return (out.attention[c.id] - out.attention[a.id]) || (a.name < c.name ? -1 : 1); }).map(function (s) { return s.id; });
    out.flagged = out.byAttention.filter(function (sid) { return out.attention[sid] > 0; });
    out.tabCounts.students = out.flagged.length;
    // a one-line reading of a student and the next step it suggests
    out.summary = function (sid) {
      var fs = flags[sid].filter(function (f) { return !f.good; }).sort(U.by(function (f) { return f.sev; }, true)), good = flags[sid].filter(function (f) { return f.good; });
      var x = m.stu[sid];
      if (x && x.never) return { text: 'On the roster and has never signed in.', step: 'Re-send the invitation or confirm enrolment.', lane: 'presence' };
      if (!fs.length) return { text: good.length ? 'Nothing flagged. ' + good.map(function (f) { return f.label.charAt(0).toUpperCase() + f.label.slice(1); }).join(' and ') + '.' : 'Nothing flagged.', step: good.length ? 'A stretch task would fit.' : 'No action suggested.', lane: good.length ? 'good' : null };
      var text = fs.slice(0, 3).map(function (f) { return f.reason || f.label; }).join('; ');
      var lane = fs[0].lane;
      return { text: text.charAt(0).toUpperCase() + text.slice(1) + '.', lane: lane, treated: !!out.treatedStu[sid],
        step: out.treatedStu[sid] ? 'You checked in on ' + T.fmtDay(out.treatedStu[sid].day) + '; review that follow-up.' : lane === 'presence' ? 'Check in, and confirm they can sign in.' : lane === 'struggle' ? 'A short practice set on their weakest skill, then a check-in.' : 'A word about how they are working.' };
    };
  };

  // ---------- the written brief: verdict, the teaching priority, who to check on ----------
  I.brief = function (world, sec, m, out) {
    var p = m.pulse, vt = out.vsTypical, parts = [];
    var verdict = p.active.n + ' of ' + p.active.of + ' students were active in the last class week' +
      (p.fts.p == null ? '.' : ', and the class is ' + (vt.gap == null ? 'at ' + pct(p.fts.p) + ' right first time (' + vt.word + ')' : vt.word + ' on first try (' + pct(p.fts.classOnNorm != null ? p.fts.classOnNorm : p.fts.p) + ' against ' + pct(p.fts.norm) + ')') + '.');
    parts.push({ kind: 'verdict', text: verdict, tone: vt.tone });
    var teach = out.lists.teach.top[0] || null, pl = out.lists.people.top.concat(out.lists.people.rest);
    var people = pl.filter(function (t) { return t.lane === 'presence'; })[0] || pl.filter(function (t) { return t.lane === 'struggle'; })[0] || pl[0] || null;
    if (teach) parts.push({ kind: 'teach', lead: 'Teaching priority: ', text: teach.text + '.', theme: teach });
    else parts.push({ kind: 'teach', lead: 'Teaching priority: ', text: 'nothing class-wide has fired.' });
    if (people) parts.push({ kind: 'people', lead: 'Check on: ', text: people.people.slice(0, 4).map(function (x) { return sec.students[x.sid].name; }).join(', ') + (people.people.length > 4 ? ' and ' + (people.people.length - 4) + ' more' : '') + ' (' + people.text.replace(/^\d+ students? (is|are|has|have) /, '') + ').', theme: people });
    else parts.push({ kind: 'people', lead: 'Check on: ', text: 'no one is flagged.' });
    out.brief = { parts: parts, teach: teach || null, people: people || null };
  };
})(typeof window !== 'undefined' ? window : globalThis);

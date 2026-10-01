/* Insight Lens mock · metrics.
   Everything the Lens shows is computed here from attempt-level records, following the metric dictionary
   in the design document: roster and eligible denominators, first try, class-active weeks, inferred class
   sessions, class-relative gaps, platform norms and minimum-evidence rules. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T;
  var M = (IL.M = {});

  var MIN_STUDENT_N = 15;       // first attempts needed for a student-level rate
  var WEAK = 0.35;              // class first-try below this on a skill counts as weak
  var NORM_MIN_LEARNERS = 200;

  function first(r) { return r.attempts[0]; }
  function graded(r) { return r.attempts[0].ok != null; }
  function ever(r) { for (var i = 0; i < r.attempts.length; i++) if (r.attempts[i].ok === true) return true; return false; }
  function lastOk(r) { return r.attempts[r.attempts.length - 1].ok; }
  function rate(n, d) { return d ? n / d : null; }
  M.first = first; M.graded = graded; M.ever = ever;

  M.windows = [
    { id: '2w', label: 'Last 2 class weeks' }, { id: '1w', label: 'Last class week' }, { id: '30d', label: 'Last 30 days' },
    { id: 'unit', label: 'This unit' }, { id: 'term', label: 'Whole term' }
  ];

  // ---------- section basics that do not depend on scope ----------
  function basics(world, sec) {
    if (sec._b) return sec._b;
    var b = {}, now = world.now, today = T.day(now), nowWeek = T.week(now);
    b.roster = sec.roster.filter(function (s) { return s.joined <= today; });
    b.rset = {}; b.roster.forEach(function (s) { b.rset[s.id] = true; });
    b.minN = Math.max(5, Math.ceil(0.4 * b.roster.length));
    // weekly activity
    b.weekActive = []; b.dayActive = {};
    for (var w = 0; w < nowWeek; w++) b.weekActive.push({});
    b.roster.forEach(function (s) {
      var days = sec.act[s.id] || {};
      Object.keys(days).forEach(function (d) {
        d = +d; var wk = Math.floor(d / 7);
        if (wk < nowWeek) b.weekActive[wk][s.id] = (b.weekActive[wk][s.id] || 0) + days[d].min;
        (b.dayActive[d] || (b.dayActive[d] = {}))[s.id] = days[d].min;
      });
    });
    b.classWeek = b.weekActive.map(function (m, wk) {
      var enrolled = b.roster.filter(function (s) { return s.joined <= wk * 7 + 6; }).length;
      return Object.keys(m).length >= 0.6 * enrolled;
    });
    b.classWeeks = []; b.classWeek.forEach(function (c, wk) { if (c) b.classWeeks.push(wk); });
    b.lastClassWeek = b.classWeeks[b.classWeeks.length - 1];
    // inferred class sessions: clock hours where at least 40% of the roster (min 5) were active
    var slot = {};
    b.roster.forEach(function (s) {
      var days = sec.act[s.id] || {};
      Object.keys(days).forEach(function (d) {
        Object.keys(days[d].hours).forEach(function (h) { var k = d + ':' + h; (slot[k] || (slot[k] = [])).push(s.id); });
      });
    });
    b.sessions = {}; b.sessionDays = {};
    Object.keys(slot).forEach(function (k) {
      if (slot[k].length >= Math.max(5, 0.4 * b.roster.length)) { b.sessions[k] = slot[k].length; b.sessionDays[k.split(':')[0]] = true; }
    });
    // per-item class totals (rostered students, graded first tries)
    b.itemAgg = {};
    sec.records.forEach(function (r) {
      if (!b.rset[r.sid] || !graded(r)) return;
      var a = b.itemAgg[r.item] || (b.itemAgg[r.item] = { n: 0, ok: 0, ever: 0 });
      a.n++; if (first(r).ok) a.ok++; if (ever(r)) a.ever++;
    });
    b.live = sec.assignments.filter(function (a) { return Object.keys(sec.asgWork[a.id]).length > 0; });
    b.zeroStart = sec.assignments.filter(function (a) { return Object.keys(sec.asgWork[a.id]).length === 0 && a.dueT < now; });
    b.primary = sec.textbooks[0].tb;
    sec._b = b;
    return b;
  }
  M.basics = basics;

  function windowStart(world, sec, b, win) {
    var cw = b.classWeeks;
    if (win === 'term') return 0;
    if (win === '1w') return cw.length ? cw[cw.length - 1] * 7 * 1440 : 0;
    if (win === '30d') return world.now - 30 * 1440;
    if (win === 'unit') {
      var lessons = sec.assignments.filter(function (a) { return a.kind === 'lesson'; });
      var cur = lessons[lessons.length - 1].chapter;
      return T.at(lessons.filter(function (a) { return a.chapter === cur; })[0].day, 0, 0);
    }
    return cw.length >= 2 ? cw[cw.length - 2] * 7 * 1440 : 0;
  }

  // class-relative gap for one student over a set of their records (leave-one-out on each item)
  function relGap(b, recs) {
    var n = 0, s = 0;
    recs.forEach(function (r) {
      if (!graded(r)) return;
      var a = b.itemAgg[r.item];
      if (!a || a.n < 4) return;
      var own = first(r).ok ? 1 : 0;
      s += own - (a.ok - own) / (a.n - 1); n++;
    });
    return { n: n, gap: n ? s / n : null };
  }

  // ---------- everything for one section and scope ----------
  M.build = function (world, sec, scope) {
    var key = scope.tb + '|' + scope.win;
    sec._m = sec._m || {};
    if (sec._m[key]) return sec._m[key];
    var b = basics(world, sec), now = world.now, today = T.day(now);
    var roster = b.roster, N = roster.length, byId = sec.students, items = sec.items;
    var from = windowStart(world, sec, b, scope.win);
    var inTb = function (it) { return scope.tb === 'all' || it.tb === scope.tb; };
    var recs = sec.records.filter(function (r) { return b.rset[r.sid] && inTb(items[r.item]); });
    var winRecs = recs.filter(function (r) { return first(r).t >= from; });
    var gradedRecs = recs.filter(graded), gradedWin = winRecs.filter(graded);
    var m = { scope: scope, from: from, roster: roster, minN: b.minN, b: b };
    var recsByStudent = U.groupBy(recs, function (r) { return r.sid; });
    var winByStudent = U.groupBy(winRecs, function (r) { return r.sid; });
    var name = function (sid) { return byId[sid].name; };

    // ----- per-student summaries -----
    var stu = {};
    roster.forEach(function (s) {
      var rs = (recsByStudent.get(s.id) || []), g = rs.filter(graded);
      var wr = (winByStudent.get(s.id) || []).filter(graded);
      var days = sec.act[s.id] || {}, minutes = 0, lastDay = null;
      Object.keys(days).forEach(function (d) { minutes += days[d].min; if (lastDay == null || +d > lastDay) lastDay = +d; });
      var retries = 0, rapid = 0, mcq = 0, cyc = 0, fw = 0;
      g.forEach(function (r) {
        var it = items[r.item];
        if (it.type === 'activecode') return;
        r.attempts.slice(1).forEach(function (a) { retries++; if (a.dur < 3) rapid++; });
        if (it.type === 'mchoice') { mcq++; if (r.attempts.length >= 4) cyc++; if (!first(r).ok && first(r).dur < 5) fw++; }
      });
      stu[s.id] = {
        s: s, n: g.length, fts: rate(g.filter(function (r) { return first(r).ok; }).length, g.length),
        wn: wr.length, wfts: rate(wr.filter(function (r) { return first(r).ok; }).length, wr.length),
        ever: rate(g.filter(ever).length, g.length), unresolved: g.filter(function (r) { return !ever(r); }),
        minutes: minutes, lastDay: lastDay, never: lastDay == null,
        retries: retries, rapid: rate(rapid, retries), mcq: mcq, cycling: rate(cyc, mcq), fastWrong: rate(fw, mcq),
        gap: relGap(b, rs).gap, wgap: relGap(b, wr)
      };
    });
    m.stu = stu;
    var withEvidence = roster.filter(function (s) { return stu[s.id].n >= MIN_STUDENT_N; });
    m.classFts = rate(gradedRecs.filter(function (r) { return first(r).ok; }).length, gradedRecs.length);
    m.classEver = rate(gradedRecs.filter(ever).length, gradedRecs.length);
    m.medianFts = U.median(withEvidence.map(function (s) { return stu[s.id].fts; }));
    m.medianMinutes = U.median(roster.filter(function (s) { return !stu[s.id].never; }).map(function (s) { return stu[s.id].minutes; }));

    // ----- assignments: who started, who finished, when -----
    function asgStat(a) {
      var work = sec.asgWork[a.id], elig = a.eligible.filter(function (id) { return b.rset[id]; });
      var o = { a: a, eligible: elig, started: [], completed: [], onTime: [], lateStart: [], lastDay: [], notStarted: [], inProgress: [], toGrade: 0 };
      elig.forEach(function (sid) {
        var w = work[sid];
        if (!w || w.t0 >= now) { o.notStarted.push(sid); return; }
        o.started.push(sid);
        if (w.items >= a.items.length) o.completed.push(sid); else o.inProgress.push(sid);
        if (w.t0 <= a.dueT) { o.onTime.push(sid); if (w.t0 > a.dueT - 1440) o.lastDay.push(sid); } else o.lateStart.push(sid);
      });
      a.items.forEach(function (id) {
        if (items[id].type !== 'shortanswer') return;
        elig.forEach(function (sid) { var r = sec.recIndex.get(sid + ':' + id); if (r && first(r).ok == null) o.toGrade++; });
      });
      return o;
    }
    var liveStats = b.live.filter(function (a) { return a.kind !== 'action' && inTb({ tb: a.tb }); }).map(asgStat).sort(U.by(function (x) { return x.a.dueT; }));
    m.funnel = { rows: liveStats, zero: b.zeroStart.filter(function (a) { return inTb({ tb: a.tb }); }) };
    // completion decay inside a chapter
    var byCh = U.groupBy(liveStats.filter(function (x) { return x.a.kind === 'lesson'; }), function (x) { return x.a.chapter; });
    byCh.forEach(function (rows) {
      if (rows.length < 3) return;
      var f = rows[0].completed.length / rows[0].eligible.length, l = rows[rows.length - 1].completed.length / rows[rows.length - 1].eligible.length;
      if (f - l >= 0.2) { rows[rows.length - 1].decay = { from: rows[0].completed.length, to: rows[rows.length - 1].completed.length, chapter: rows[0].a.chapterNum, first: rows[0], n: rows.length }; m.funnel.decay = rows[rows.length - 1].decay; }
    });

    // ----- missing-work streaks and start timing -----
    var due = liveStats.filter(function (x) { return x.a.dueT < now && (x.a.kind === 'lesson' || x.a.kind === 'quiz' || x.a.kind === 'review'); });
    var last8 = due.slice(-8), last6 = due.filter(function (x) { return x.a.kind === 'lesson'; }).slice(-6);
    m.streaks = { cols: last8.map(function (x) { return x.a; }), rows: [] };
    roster.forEach(function (s) {
      var cells = last8.map(function (x) { return x.eligible.indexOf(s.id) < 0 ? 'na' : x.started.indexOf(s.id) >= 0 ? 'yes' : 'no'; });
      var run = 0, best = 0, bestEnd = -1;
      cells.forEach(function (c, i) { if (c === 'no') { run++; if (run >= best) { best = run; bestEnd = i; } } else if (c === 'yes') run = 0; });
      if (best >= 2) m.streaks.rows.push({ sid: s.id, cells: cells, run: best, end: bestEnd, never: stu[s.id].never, ongoing: bestEnd === cells.length - 1 });
    });
    m.streaks.rows.sort(function (x, y) { return (y.ongoing - x.ongoing) || (y.run - x.run); });
    m.timing = { rows: last6.map(function (x) {
      return { a: x.a, early: x.onTime.length - x.lastDay.length, lastDay: x.lastDay.length, after: x.lateStart.length, started: x.started.length };
    }), students: [] };
    roster.forEach(function (s) {
      var cells = [], late = 0, st = 0;
      last6.forEach(function (x) {
        if (x.started.indexOf(s.id) < 0) { cells.push(x.eligible.indexOf(s.id) < 0 ? 'na' : 'none'); return; }
        st++;
        var c = x.lateStart.indexOf(s.id) >= 0 ? 'after' : x.lastDay.indexOf(s.id) >= 0 ? 'last' : 'early';
        if (c !== 'early') late++;
        cells.push(c);
      });
      if (st >= 4 && late / st >= 0.5) m.timing.students.push({ sid: s.id, cells: cells, late: late, started: st });
    });
    m.timing.students.sort(U.by(function (x) { return x.late; }, true));
    var tStart = U.sum(m.timing.rows.map(function (r) { return r.started; }));
    m.timing.lateShare = rate(U.sum(m.timing.rows.map(function (r) { return r.lastDay + r.after; })), tStart);

    // ----- frontier and pace (per textbook) -----
    function unitProgress(tb, subs, allSubs) {
      var total = 0, perSub = {};
      subs.forEach(function (sub) { perSub[sub.id] = true; });
      var its = sec.itemList.filter(function (it) { return perSub[it.sub] && !it.action; });
      var w = U.sum(its.map(function (it) { return it.est; }));
      var avgSub = subs.length ? w / subs.length : 0;
      total = w + (allSubs.length - subs.length) * avgSub;
      var out = {};
      roster.forEach(function (s) {
        var solved = 0, touched = 0;
        its.forEach(function (it) { var r = sec.recIndex.get(s.id + ':' + it.id); if (r) { touched++; if (ever(r)) solved += it.est; } });
        out[s.id] = { pc: total ? Math.round((100 * solved) / total) : 0, touched: touched };
      });
      return out;
    }
    m.frontier = [];
    sec.textbooks.forEach(function (x) {
      var tb = x.tb;
      if (!inTb({ tb: tb.id })) return;
      var opened = {}; sec.openedSubs.forEach(function (s) { opened[s.id] = true; });
      var lane = { tb: tb, role: x.role, units: [] };
      var units = tb.supplemental ? tb.chapters[0].subs.map(function (s) { return { id: s.id, num: s.code, name: s.name, subs: [s] }; })
        : tb.chapters.map(function (c) { return { id: c.id, num: c.num, name: c.name, subs: c.subs }; });
      units.forEach(function (u) {
        var open = u.subs.filter(function (s) { return opened[s.id]; });
        var pr = open.length ? unitProgress(tb, open, u.subs) : {};
        var vals = roster.map(function (s) { return pr[s.id] || { pc: 0, touched: 0 }; });
        var started = roster.filter(function (s) { return pr[s.id] && pr[s.id].touched > 0; });
        var firstDays = [];
        if (open.length) roster.forEach(function (s) {
          var d = null;
          sec.records.forEach(function (r) { if (r.sid === s.id && u.subs.some(function (sb) { return sb.id === items[r.item].sub; })) { var dd = T.day(first(r).t); if (d == null || dd < d) d = dd; } });
          if (d != null) firstDays.push(d);
        });
        lane.units.push({ id: u.id, num: u.num, name: u.name, subsOpen: open.length, subsAll: u.subs.length,
          done: vals.filter(function (v) { return v.pc >= 80; }).length,
          inProgress: vals.filter(function (v) { return v.touched > 0 && v.pc < 80; }).length,
          notStarted: vals.filter(function (v) { return v.touched === 0; }).length,
          started: started.length, opened: started.length >= 0.5 * N, firstDay: firstDays.length ? U.median(firstDays) : null,
          median: U.median(vals.map(function (v) { return v.pc; })), pr: pr });
      });
      var lastOpen = -1;
      lane.units.forEach(function (u, i) { if (u.opened) lastOpen = i; });
      lane.units.forEach(function (u, i) { u.skipped = !u.opened && i < lastOpen; });
      var order = lane.units.filter(function (u) { return u.opened; }).sort(U.by(function (u) { return u.firstDay; }));
      lane.current = order.length ? order[order.length - 1] : null;
      lane.order = order;
      m.frontier.push(lane);
    });
    var mainLane = m.frontier.filter(function (l) { return l.role === 'primary'; })[0] || m.frontier[0];
    m.pace = [];
    if (mainLane) mainLane.order.forEach(function (u) {
      var dots = roster.filter(function (s) { return !stu[s.id].never; }).map(function (s) { return { sid: s.id, pc: (u.pr[s.id] || { pc: 0 }).pc }; });
      var med = U.median(dots.map(function (d) { return d.pc; }));
      m.pace.push({ unit: u, dots: dots, median: med,
        behind: dots.filter(function (d) { return d.pc <= med - 15; }), far: dots.filter(function (d) { return d.pc <= med - 25; }),
        ahead: dots.filter(function (d) { return d.pc >= med + 15; }) });
    });
    m.currentUnit = mainLane && mainLane.current;

    // ----- textbook balance -----
    m.balance = sec.textbooks.map(function (x) {
      var rs = sec.records.filter(function (r) { return b.rset[r.sid] && items[r.item].tb === x.tb.id; }), g = rs.filter(graded);
      return { tb: x.tb, role: x.role, questions: U.uniq(rs.map(function (r) { return r.item; })).length, students: U.uniq(rs.map(function (r) { return r.sid; })).length,
        n: g.length, fts: rate(g.filter(function (r) { return first(r).ok; }).length, g.length) };
    });

    // ----- waiting on the teacher -----
    var pend = sec.records.filter(function (r) { return b.rset[r.sid] && items[r.item].type === 'shortanswer' && first(r).ok == null; });
    var pendBy = U.groupBy(pend, function (r) { return r.asg; });
    m.waiting = { toGrade: pend.length, byAsg: [], questions: sec.waiting.questions.filter(function (q) { return b.rset[q.sid]; }), failed: sec.waiting.failed };
    pendBy.forEach(function (rs, asg) {
      m.waiting.byAsg.push({ a: sec.assignments.filter(function (a) { return a.id === asg; })[0], n: rs.length, oldest: Math.min.apply(null, rs.map(function (r) { return first(r).t; })) });
    });
    m.waiting.byAsg.sort(U.by(function (x) { return x.oldest; }));
    m.waiting.oldest = pend.length ? Math.min.apply(null, pend.map(function (r) { return first(r).t; })) : null;
    m.waiting.oldestDays = m.waiting.oldest != null ? T.day(now) - T.day(m.waiting.oldest) : 0;

    // ----- pulse -----
    var lw = b.lastClassWeek, act = b.weekActive[lw] || {};
    var weeks8 = []; for (var w8 = Math.max(0, b.weekActive.length - 8); w8 < b.weekActive.length; w8++) weeks8.push(w8);
    var dueWin = liveStats.filter(function (x) { return x.a.dueT >= from && x.a.dueT < now; });
    function ftsWeek(wk) {
      var rs = gradedRecs.filter(function (r) { return T.week(first(r).t) === wk; });
      var withNorm = rs.filter(function (r) { return items[r.item].norm.n >= NORM_MIN_LEARNERS; });
      return { n: rs.length, p: rate(rs.filter(function (r) { return first(r).ok; }).length, rs.length),
        gap: withNorm.length ? U.mean(withNorm.map(function (r) { return (first(r).ok ? 1 : 0) - items[r.item].norm.p; })) : null, nn: withNorm.length };
    }
    var normWin = gradedWin.filter(function (r) { return items[r.item].norm.n >= NORM_MIN_LEARNERS; });
    m.pulse = {
      week: lw,
      active: { n: Object.keys(act).length, of: N, dots: roster.map(function (s) { return { sid: s.id, on: !!act[s.id] }; }),
        spark: weeks8.map(function (wk) { return Object.keys(b.weekActive[wk]).length; }), sparkClass: weeks8.map(function (wk) { return b.classWeek[wk]; }) },
      work: { onTime: U.sum(dueWin.map(function (x) { return x.onTime.length; })), late: U.sum(dueWin.map(function (x) { return x.lateStart.length; })),
        none: U.sum(dueWin.map(function (x) { return x.notStarted.length; })), cells: U.sum(dueWin.map(function (x) { return x.eligible.length; })), assignments: dueWin.length },
      fts: { p: rate(gradedWin.filter(function (r) { return first(r).ok; }).length, gradedWin.length), n: gradedWin.length,
        norm: normWin.length ? U.mean(normWin.map(function (r) { return items[r.item].norm.p; })) : null,
        classOnNorm: normWin.length ? rate(normWin.filter(function (r) { return first(r).ok; }).length, normWin.length) : null,
        spark: weeks8.map(function (wk) { return ftsWeek(wk).p; }) },
      waiting: m.waiting
    };

    // ----- topics: chapters and subunits with first-try, norm and bands -----
    function topicStat(subIds, unitId) {
      var set = {}; subIds.forEach(function (s) { set[s] = true; });
      var rs = gradedRecs.filter(function (r) { return set[items[r.item].sub] && !items[r.item].action; });
      var wn = rs.filter(function (r) { return items[r.item].norm.n >= NORM_MIN_LEARNERS; });
      var o = { n: rs.length, students: U.uniq(rs.map(function (r) { return r.sid; })).length,
        fts: rate(rs.filter(function (r) { return first(r).ok; }).length, rs.length), ever: rate(rs.filter(ever).length, rs.length),
        unresolved: rs.filter(function (r) { return !ever(r); }).length,
        norm: wn.length ? U.mean(wn.map(function (r) { return items[r.item].norm.p; })) : null,
        onNorm: wn.length ? rate(wn.filter(function (r) { return first(r).ok; }).length, wn.length) : null, bands: null };
      o.gap = o.norm != null ? o.onNorm - o.norm : null;
      if (sec.bands && unitId) {
        o.bands = { levels: [0, 0, 0, 0, 0], unattempted: 0 };
        roster.forEach(function (s) { var bd = sec.band[s.id + '|' + unitId]; if (bd && bd.state === 'scored') o.bands.levels[bd.level]++; else o.bands.unattempted++; });
      }
      return o;
    }
    m.topics = [];
    if (mainLane && !mainLane.tb.supplemental) {
      var openedSet = {}; sec.openedSubs.forEach(function (s) { openedSet[s.id] = true; });
      mainLane.units.forEach(function (u) {
        var ch = mainLane.tb.chapters.filter(function (c) { return c.id === u.id; })[0];
        var open = ch.subs.filter(function (s) { return openedSet[s.id]; });
        var t = { unit: u, chapter: ch, opened: u.opened, skipped: u.skipped, stat: open.length ? topicStat(open.map(function (s) { return s.id; }), ch.id) : null,
          subs: open.map(function (s) { return { sub: s, stat: topicStat([s.id], s.id) }; }) };
        m.topics.push(t);
      });
      m.topicsOrdered = mainLane.order.map(function (u) { return m.topics.filter(function (t) { return t.unit.id === u.id; })[0]; })
        .concat(m.topics.filter(function (t) { return t.skipped; }));
    } else m.topicsOrdered = [];

    // ----- skills: class evidence, root gaps, blind spots, transfer -----
    var sk = {};
    gradedRecs.forEach(function (r) {
      var it = items[r.item];
      it.skills.forEach(function (sid) {
        var o = sk[sid] || (sk[sid] = { id: sid, students: {}, items: {}, n: 0, ok: 0, byTb: {} });
        o.students[r.sid] = (o.students[r.sid] || 0) + 1; o.items[r.item] = true; o.n++;
        var okv = first(r).ok ? 1 : 0; o.ok += okv;
        var t = o.byTb[it.tb] || (o.byTb[it.tb] = { n: 0, ok: 0 }); t.n++; t.ok += okv;
      });
    });
    Object.keys(sk).forEach(function (sid) {
      var o = sk[sid];
      o.nStudents = Object.keys(o.students).length; o.nItems = Object.keys(o.items).length; o.p = o.ok / o.n;
      o.solid = o.nStudents >= b.minN && o.nItems >= 2; o.skill = world.skills[sid];
    });
    m.skill = sk;
    var weak = Object.keys(sk).filter(function (sid) { return sk[sid].solid && sk[sid].p < WEAK; });
    var weakSet = {}; weak.forEach(function (s) { weakSet[s] = true; });
    m.gaps = { weak: weak.length, solid: Object.keys(sk).filter(function (s) { return sk[s].solid; }).length, roots: [] };
    weak.forEach(function (sid) {
      var s = world.skills[sid];
      if (s.prereqs.some(function (p) { return weakSet[p]; })) return;
      var blocked = s.dependents.filter(function (d) { return !sk[d]; });
      var hop2 = {};
      s.dependents.forEach(function (d) { world.skills[d].dependents.forEach(function (d2) { if (!sk[d2]) hop2[d2] = true; }); });
      blocked.forEach(function (d) { hop2[d] = true; });
      var below = [];
      roster.forEach(function (st) {
        var n = 0, ok = 0;
        (recsByStudent.get(st.id) || []).forEach(function (r) {
          if (!graded(r)) return;
          var its = items[r.item].skills;
          if (its.indexOf(sid) >= 0 || its.some(function (x) { return s.dependents.indexOf(x) >= 0; })) { n++; if (first(r).ok) ok++; }
        });
        if (n >= 3 && ok / n < WEAK) below.push({ sid: st.id, n: n, ok: ok });
      });
      m.gaps.roots.push({ skill: s, stat: sk[sid], blocked: blocked, hop2: Object.keys(hop2), dependents: s.dependents, below: below,
        items: Object.keys(sk[sid].items).map(function (id) { return items[id]; }) });
    });
    m.gaps.roots.sort(function (x, y) { return (y.blocked.length - x.blocked.length) || (y.hop2.length - x.hop2.length) || (x.stat.p - y.stat.p); });

    // footprint of every skill across the textbooks attached to this section
    m.allSkills = [];
    var attached = sec.textbooks.map(function (x) { return x.tb; }), openIds = {};
    sec.openedSubs.forEach(function (s) { openIds[s.id] = true; });
    Object.keys(world.skills).forEach(function (sid) {
      var s = world.skills[sid];
      if (s.set !== sec.set) return;
      var foot = [];
      attached.forEach(function (tb) {
        var marks = [];
        tb.chapters.forEach(function (ch) { ch.subs.forEach(function (sub) {
          if (sub.skills.indexOf(sid) < 0) return;
          var only = sub.taughtOnly.indexOf(sid) >= 0;
          marks.push({ sub: sub, role: tb.supplemental ? 'assess' : only ? 'teach' : 'both', open: !!openIds[sub.id] });
        }); });
        if (marks.length) foot.push({ tb: tb, marks: marks });
      });
      if (!foot.length) return;
      var assessedHere = foot.some(function (f) { return f.marks.some(function (k) { return k.role !== 'teach'; }); });
      var touched = foot.some(function (f) { return f.marks.some(function (k) { return k.open; }); });
      m.allSkills.push({ skill: s, foot: foot, stat: sk[sid] || null, blind: !assessedHere, touched: touched });
    });
    m.blind = [];
    m.topics.filter(function (t) { return t.opened; }).forEach(function (t) {
      var taught = {}, here = {}, elsewhere = {}, none = {};
      t.subs.forEach(function (x) { x.sub.skills.forEach(function (sid) { taught[sid] = true; if (x.sub.taughtOnly.indexOf(sid) < 0) here[sid] = true; }); });
      Object.keys(taught).forEach(function (sid) {
        if (here[sid]) return;
        var s = world.skills[sid];
        var any = attached.some(function (tb) { return s.assessed.some(function (subId) { return tb.subs[subId]; }); });
        if (any) elsewhere[sid] = true; else none[sid] = true;
      });
      m.blind.push({ topic: t, taught: Object.keys(taught).length, here: Object.keys(here).length, elsewhere: Object.keys(elsewhere).map(function (x) { return world.skills[x]; }),
        none: Object.keys(none).map(function (x) { return world.skills[x]; }) });
    });
    m.transfer = [];
    Object.keys(sk).forEach(function (sid) {
      var tbs = Object.keys(sk[sid].byTb).filter(function (t) { return sk[sid].byTb[t].n >= 10; });
      if (tbs.length < 2) return;
      var prim = b.primary.id;
      if (tbs.indexOf(prim) < 0) return;
      tbs.forEach(function (t) {
        if (t === prim) return;
        var a = sk[sid].byTb[prim], c = sk[sid].byTb[t];
        m.transfer.push({ skill: world.skills[sid], primary: { tb: b.primary, p: a.ok / a.n, n: a.n }, other: { tb: world.textbooks[t], p: c.ok / c.n, n: c.n }, gap: a.ok / a.n - c.ok / c.n });
      });
    });
    m.transfer.sort(U.by(function (x) { return Math.abs(x.gap); }, true));

    // ----- questions: reteach, code sticking points, quality, norm comparison -----
    var recsByItem = U.groupBy(recs, function (r) { return r.item; });
    var winItems = {};
    winRecs.forEach(function (r) { winItems[r.item] = (winItems[r.item] || 0) + 1; });
    function inWindow(itemId) { var a = b.itemAgg[itemId]; return winItems[itemId] && a && winItems[itemId] >= 0.5 * a.n; }
    m.reteach = [];
    recsByItem.forEach(function (rs, itemId) {
      var it = items[itemId];
      if (it.type !== 'mchoice' || !inWindow(itemId)) return;
      var g = rs.filter(graded);
      if (g.length < b.minN) return;
      var picks = [], i;
      for (i = 0; i < it.opts.n; i++) picks.push([]);
      g.forEach(function (r) { picks[first(r).pick].push(r.sid); });
      var correct = picks[it.opts.key].length, wrong = g.length - correct, top = -1;
      picks.forEach(function (p, idx) { if (idx !== it.opts.key && (top < 0 || p.length > picks[top].length)) top = idx; });
      var tier = picks[top].length >= correct && picks[top].length >= 3 ? 1 : (picks[top].length >= 3 && picks[top].length / wrong >= 0.5 && wrong / g.length >= 0.3) ? 2 : 0;
      if (tier) m.reteach.push({ item: it, n: g.length, correct: correct, wrong: wrong, picks: picks, top: top, tier: tier, day: T.day(U.median(g.map(function (r) { return first(r).t; }))) });
    });
    m.reteach.sort(function (x, y) { return (x.tier - y.tier) || (y.picks[y.top].length / y.n - x.picks[x.top].length / x.n); });

    function codeStat(it, rs) {
      var o = { item: it, n: rs.length, firstRun: [], afterFixes: [], still: [], lost: [], runsToPass: [0, 0, 0, 0, 0], tests: [], errors: {} };
      for (var k = 1; k <= it.code.tests; k++) o.tests.push({ test: k, failing: [] });
      rs.forEach(function (r) {
        var passIdx = -1;
        r.attempts.forEach(function (a, i) { if (a.ok === true && passIdx < 0) passIdx = i; });
        var last = r.attempts[r.attempts.length - 1];
        if (passIdx === 0 && last.ok) o.firstRun.push(r.sid);
        else if (passIdx >= 0 && last.ok) o.afterFixes.push(r.sid);
        else if (passIdx >= 0) o.lost.push(r.sid);
        else o.still.push(r.sid);
        if (passIdx >= 0) o.runsToPass[Math.min(passIdx, 4)]++;
        if (!last.ok) {
          if (last.test) o.tests[last.test - 1].failing.push(r.sid);
          else if (last.err) (o.errors[last.err] || (o.errors[last.err] = [])).push(r.sid);
        }
      });
      o.failing = o.still.concat(o.lost);
      var topErr = Object.keys(o.errors).sort(function (x, y) { return o.errors[y].length - o.errors[x].length; })[0];
      o.topError = topErr ? { err: topErr, students: o.errors[topErr] } : null;
      o.hardTest = o.tests.slice().sort(function (x, y) { return y.failing.length - x.failing.length; })[0];
      return o;
    }
    M._codeStat = codeStat;
    m.code = [];
    recsByItem.forEach(function (rs, itemId) {
      var it = items[itemId];
      if (it.type !== 'activecode' || !it.code.graded || !inWindow(itemId)) return;
      var g = rs.filter(graded);
      if (g.length < Math.max(5, b.minN - 4)) return;
      var o = codeStat(it, g);
      if (o.failing.length >= 3 && o.failing.length / o.n >= 0.25) m.code.push(o);
    });
    m.code.sort(U.by(function (x) { return x.failing.length / x.n; }, true));

    m.vsNorm = { below: [], above: [] };
    Object.keys(b.itemAgg).forEach(function (id) {
      var it = items[id], a = b.itemAgg[id];
      if (!inTb(it) || it.action || a.n < b.minN || it.norm.n < NORM_MIN_LEARNERS) return;
      var gap = a.ok / a.n - it.norm.p, row = { item: it, p: a.ok / a.n, n: a.n, norm: it.norm.p, learners: it.norm.n, gap: gap };
      if (gap <= -0.2) m.vsNorm.below.push(row); else if (gap >= 0.15) m.vsNorm.above.push(row);
    });
    m.vsNorm.below.sort(U.by(function (x) { return x.gap; }));
    m.vsNorm.above.sort(U.by(function (x) { return x.gap; }, true));

    m.quality = { rows: [], counts: { hard: 0, easy: 0, flat: 0, ok: 0 } };
    Object.keys(b.itemAgg).forEach(function (id) {
      var it = items[id];
      if (!inTb(it) || it.action || it.norm.n < NORM_MIN_LEARNERS) return;
      var status = it.norm.p < 0.25 && it.pe < 0.6 ? 'hard' : it.norm.p > 0.9 ? 'easy' : it.dp < 0.2 ? 'flat' : 'ok';
      m.quality.counts[status]++;
      if (status !== 'ok') m.quality.rows.push({ item: it, status: status, p: it.norm.p, pe: it.pe, dp: it.dp, classN: b.itemAgg[id].n });
    });
    var qOrder = { hard: 0, flat: 1, easy: 2 };
    m.quality.rows.sort(function (x, y) { return (qOrder[x.status] - qOrder[y.status]) || (x.p - y.p); });

    // ----- depth and format -----
    function grp(keyFn) {
      var g = U.groupBy(gradedRecs.filter(function (r) { return !items[r.item].action; }), keyFn), out = [];
      g.forEach(function (rs, k) {
        var wn = rs.filter(function (r) { return items[r.item].norm.n >= NORM_MIN_LEARNERS; });
        out.push({ key: k, n: rs.length, p: rate(rs.filter(function (r) { return first(r).ok; }).length, rs.length), norm: wn.length ? U.mean(wn.map(function (r) { return items[r.item].norm.p; })) : null });
      });
      return out;
    }
    m.depth = grp(function (r) { return items[r.item].dok; }).sort(U.by(function (x) { return x.key; }));
    var order = ['fillintheblank', 'dragndrop', 'mchoice', 'parsonsprob', 'activecode'];
    m.format = grp(function (r) { return items[r.item].type; }).sort(U.by(function (x) { return order.indexOf(x.key); }));
    var fm = {}; m.format.forEach(function (f) { fm[f.key] = f; });
    m.writeGap = fm.mchoice && fm.activecode ? { cls: fm.mchoice.p - fm.activecode.p, typical: (fm.mchoice.norm || 0) - (fm.activecode.norm || 0) } : null;

    // ----- trajectories (fortnights of class weeks, counted back from the latest) -----
    var cw = b.classWeeks, periods = [];
    for (var i2 = cw.length; i2 > 0; i2 -= 2) periods.unshift(cw.slice(Math.max(0, i2 - 2), i2));
    m.periods = periods;
    var traj = [];
    roster.forEach(function (s) {
      var rs = (recsByStudent.get(s.id) || []).filter(graded);
      var series = periods.map(function (p) {
        var g = relGap(b, rs.filter(function (r) { return p.indexOf(T.week(first(r).t)) >= 0; }));
        return g.n >= MIN_STUDENT_N ? g : { n: g.n, gap: null };
      });
      var L = series.length, last = series[L - 1], prev = series[L - 2], kind = null;
      if (last && prev && last.gap != null && prev.gap != null) {
        if (last.gap <= -0.15 && prev.gap <= -0.15) kind = 'sustained';
        else if (last.gap - prev.gap <= -0.2) kind = 'drop';
        else if (last.gap - prev.gap >= 0.2) kind = 'rise';
      }
      stu[s.id].series = series; stu[s.id].traj = kind;
      if (kind) traj.push({ sid: s.id, series: series, kind: kind, last: last.gap, change: last.gap - prev.gap });
    });
    m.traj = { sustained: traj.filter(function (x) { return x.kind === 'sustained'; }).sort(U.by(function (x) { return x.last; })),
      drop: traj.filter(function (x) { return x.kind === 'drop'; }).sort(U.by(function (x) { return x.change; })),
      rise: traj.filter(function (x) { return x.kind === 'rise'; }).sort(U.by(function (x) { return x.change; }, true)) };

    // ----- movement between the last two class weeks and the two before -----
    var curW = cw.slice(-2), prevW = cw.slice(-4, -2);
    function minutesIn(sid, weeks) { return U.sum(weeks.map(function (wk) { return (b.weekActive[wk] || {})[sid] || 0; })); }
    var medCur = U.median(roster.map(function (s) { return minutesIn(s.id, curW); }).filter(function (x) { return x > 0; })) || 1;
    var medPrev = U.median(roster.map(function (s) { return minutesIn(s.id, prevW); }).filter(function (x) { return x > 0; })) || 1;
    m.movement = { cur: curW, prev: prevW, improving: [], slipping: [], steady: [], noEvidence: [], up: [], down: [] };
    roster.forEach(function (s) {
      if (stu[s.id].never) return;
      var rs = (recsByStudent.get(s.id) || []).filter(graded);
      var c = relGap(b, rs.filter(function (r) { return curW.indexOf(T.week(first(r).t)) >= 0; }));
      var p = relGap(b, rs.filter(function (r) { return prevW.indexOf(T.week(first(r).t)) >= 0; }));
      var row = { sid: s.id, cur: c, prev: p };
      if (c.n < MIN_STUDENT_N) m.movement.noEvidence.push(row);
      else if (p.n >= MIN_STUDENT_N && c.gap - p.gap >= 0.15) m.movement.improving.push(row);
      else if (p.n >= MIN_STUDENT_N && c.gap - p.gap <= -0.15) m.movement.slipping.push(row);
      else m.movement.steady.push(row);
      var sc = minutesIn(s.id, curW) / medCur, sp = minutesIn(s.id, prevW) / medPrev;
      if (sp >= 0.5 && sc < 0.5 * sp) m.movement.down.push({ sid: s.id, cur: minutesIn(s.id, curW), prev: minutesIn(s.id, prevW) });
      if (sc >= 0.5 && sp < 0.5 * sc && sp > 0) m.movement.up.push({ sid: s.id, cur: minutesIn(s.id, curW), prev: minutesIn(s.id, prevW) });
      stu[s.id].move = c.n < MIN_STUDENT_N ? 'none' : (p.n >= MIN_STUDENT_N && c.gap - p.gap >= 0.15) ? 'up' : (p.n >= MIN_STUDENT_N && c.gap - p.gap <= -0.15) ? 'down' : 'steady';
    });
    m.movement.improving.sort(U.by(function (x) { return x.cur.gap - x.prev.gap; }, true));
    m.movement.slipping.sort(U.by(function (x) { return x.cur.gap - x.prev.gap; }));

    // ----- class-wide dip against the norm -----
    var series = cw.map(function (wk) { var f = ftsWeek(wk); return { week: wk, gap: f.gap, n: f.nn, p: f.p }; }).filter(function (x) { return x.gap != null; });
    m.dip = { series: series, flagged: null };
    if (series.length >= 4) {
      for (var d = 3; d < series.length; d++) {
        var trail = U.mean(series.slice(Math.max(0, d - 4), d).map(function (x) { return x.gap; }));
        series[d].trail = trail;
        if (series[d].n >= 150 && series[d].gap <= trail - 0.08) series[d].dip = true;
      }
      var lastS = series[series.length - 1], prevS = series[series.length - 2];
      var hit = lastS.dip ? lastS : prevS && prevS.dip ? prevS : null;
      if (hit) {
        var wkRecs = gradedRecs.filter(function (r) { return T.week(first(r).t) === hit.week && items[r.item].norm.n >= NORM_MIN_LEARNERS; });
        var bySub = U.groupBy(wkRecs, function (r) { return items[r.item].sub; }), fell = [];
        bySub.forEach(function (rs, subId) {
          if (rs.length < 30) return;
          fell.push({ sub: world.textbooks[items[rs[0].item].tb].subs[subId], n: rs.length, gap: U.mean(rs.map(function (r) { return (first(r).ok ? 1 : 0) - items[r.item].norm.p; })) });
        });
        m.dip.flagged = { point: hit, fell: fell.sort(U.by(function (x) { return x.gap; })).slice(0, 3) };
      }
    }

    // ----- engagement -----
    m.rhythm = { weeks: b.weekActive.map(function (wkMap, wk) { return { week: wk, active: Object.keys(wkMap).length, classWeek: b.classWeek[wk] }; }), days: [] };
    for (var dd = 0; dd < b.weekActive.length * 7; dd++) m.rhythm.days.push(Object.keys(b.dayActive[dd] || {}).length);
    m.quiet = [];
    roster.forEach(function (s) {
      if (stu[s.id].never) return;
      var run = 0;
      for (var q = cw.length - 1; q >= 0; q--) { if (b.weekActive[cw[q]][s.id]) break; if (s.joined <= cw[q] * 7) run++; }
      var strip = [];
      for (var wq = Math.max(0, b.weekActive.length - 10); wq < b.weekActive.length; wq++) strip.push(!b.classWeek[wq] ? 'pale' : b.weekActive[wq][s.id] ? 'on' : 'off');
      stu[s.id].quietRun = run; stu[s.id].strip = strip;
      if (run >= 2) m.quiet.push({ sid: s.id, run: run, strip: strip, lastDay: stu[s.id].lastDay });
    });
    m.quiet.sort(U.by(function (x) { return x.run; }, true));
    // when the class works
    var grid = []; for (var g1 = 0; g1 < 7; g1++) { grid.push([]); for (var h1 = 0; h1 < 24; h1++) grid[g1].push(0); }
    var inSess = 0, sameDay = 0, other = 0;
    roster.forEach(function (s) {
      var days = sec.act[s.id] || {};
      Object.keys(days).forEach(function (dy) {
        Object.keys(days[dy].hours).forEach(function (h) {
          var mins = days[dy].hours[h];
          grid[(+dy) % 7][+h] += mins;
          if (b.sessions[dy + ':' + h]) inSess += mins; else if (b.sessionDays[dy]) sameDay += mins; else other += mins;
        });
      });
    });
    var cellCount = {};
    Object.keys(b.sessions).forEach(function (k) { var p = k.split(':'), kk = ((+p[0]) % 7) + ':' + p[1]; cellCount[kk] = (cellCount[kk] || 0) + 1; });
    var sessDaysWin = Object.keys(b.sessionDays).map(Number).filter(function (dy) { return dy * 1440 >= from; });
    m.when = { grid: grid, max: Math.max.apply(null, grid.map(function (r) { return Math.max.apply(null, r); })), sessionCells: cellCount,
      split: { inClass: inSess, sameDay: sameDay, other: other, total: inSess + sameDay + other }, sessionDays: Object.keys(b.sessionDays).length, absent: [] };
    roster.forEach(function (s) {
      if (stu[s.id].never) return;
      var miss = sessDaysWin.filter(function (dy) { return dy >= s.joined && !((sec.act[s.id] || {})[dy]); });
      if (miss.length >= 3) m.when.absent.push({ sid: s.id, missed: miss.length, of: sessDaysWin.length, days: sessDaysWin.map(function (dy) { return miss.indexOf(dy) < 0; }) });
    });
    m.when.absent.sort(U.by(function (x) { return x.missed; }, true));
    m.when.sessDaysWin = sessDaysWin.sort(function (x, y) { return x - y; });
    // activity map
    var medMin = m.medianMinutes, medF = m.medianFts;
    m.map = { medMin: medMin, medFts: medF, dots: [], low: [], quads: { tl: [], tr: [], bl: [], br: [] } };
    roster.forEach(function (s) {
      var x = stu[s.id];
      if (x.never) return;
      if (x.n < MIN_STUDENT_N) { m.map.low.push(s.id); return; }
      var q = (x.fts >= medF ? 't' : 'b') + (x.minutes >= medMin ? 'r' : 'l');
      m.map.dots.push({ sid: s.id, x: x.minutes, y: x.fts, q: q });
      m.map.quads[q].push(s.id);
      x.quad = q;
      x.strict = x.minutes >= 1.3 * medMin && x.fts <= medF - 0.08 ? 'grind' : x.minutes <= 0.75 * medMin && x.fts >= medF + 0.08 ? 'coast' : null;
    });
    m.rosterCheck = { never: roster.filter(function (s) { return stu[s.id].never; }).map(function (s) { return s.id; }),
      off: sec.all.filter(function (s) { return !s.rostered && sec.act[s.id]; }).map(function (s) { return s.id; }) };

    // ----- work habits -----
    var buckets = [0, 0, 0], allRetries = 0;
    gradedRecs.forEach(function (r) {
      if (items[r.item].type === 'activecode') return;
      r.attempts.slice(1).forEach(function (a) { allRetries++; buckets[a.dur < 3 ? 0 : a.dur <= 10 ? 1 : 2]++; });
    });
    var rapidVals = roster.filter(function (s) { return stu[s.id].retries >= 20; }).map(function (s) { return stu[s.id].rapid; });
    var p90r = U.quantile(rapidVals, 0.9);
    m.retry = { buckets: buckets, total: allRetries, share: rate(buckets[0], allRetries), p90: p90r, median: U.median(rapidVals),
      students: roster.filter(function (s) { return stu[s.id].retries >= 20; }).map(function (s) { return { sid: s.id, rapid: stu[s.id].rapid, retries: stu[s.id].retries, cycling: stu[s.id].cycling }; })
        .sort(U.by(function (x) { return x.rapid; }, true)) };
    m.retry.flagged = m.retry.students.filter(function (x) { return x.rapid >= p90r && x.rapid > 0.2; });
    var fwVals = roster.filter(function (s) { return stu[s.id].mcq >= MIN_STUDENT_N; }).map(function (s) { return { sid: s.id, v: stu[s.id].fastWrong }; });
    var fwP90 = U.quantile(fwVals.map(function (x) { return x.v; }), 0.9);
    m.fastWrong = { dots: fwVals, median: U.median(fwVals.map(function (x) { return x.v; })), p90: fwP90,
      flagged: fwVals.filter(function (x) { return x.v >= 0.25 && x.v >= fwP90; }).sort(U.by(function (x) { return x.v; }, true)) };
    m.fastWrong.classNote = m.fastWrong.median >= 0.2;
    var unres = {};
    gradedRecs.forEach(function (r) { if (!ever(r) && !items[r.item].action) (unres[r.item] || (unres[r.item] = [])).push(r.sid); });
    m.unresolved = { items: Object.keys(unres).map(function (id) { return { item: items[id], students: unres[id], n: b.itemAgg[id].n }; }).sort(U.by(function (x) { return x.students.length; }, true)),
      students: roster.map(function (s) { return { sid: s.id, n: stu[s.id].unresolved.length }; }).filter(function (x) { return x.n > 0; }).sort(U.by(function (x) { return x.n; }, true)) };
    m.unresolved.median = U.median(roster.filter(function (s) { return !stu[s.id].never; }).map(function (s) { return stu[s.id].unresolved.length; }));
    m.stuck = [];
    winRecs.forEach(function (r) {
      var it = items[r.item];
      if (it.type !== 'activecode' || !it.code.graded) return;
      var passIdx = -1, same = 1, maxSame = 1, prevErr = null;
      r.attempts.forEach(function (a, i) {
        if (a.ok === true && passIdx < 0) passIdx = i;
        if (a.ok === false) { var e = a.err || ('test ' + a.test); if (e === prevErr) { same++; maxSame = Math.max(maxSame, same); } else same = 1; prevErr = e; } else prevErr = null;
      });
      var last = r.attempts[r.attempts.length - 1], runs = r.attempts.length;
      var flags = [];
      if (maxSame >= 6) flags.push('Stuck on the same failure');
      if (passIdx >= 0 && !last.ok && runs >= 6) flags.push('Lost working progress');
      if ((runs >= 10 && passIdx < 0) || flags.length) {
        m.stuck.push({ sid: r.sid, item: it, rec: r, runs: runs, passed: passIdx >= 0, lastOk: !!last.ok, flags: flags, sameRun: maxSame,
          span: (last.t - (first(r).t - first(r).dur / 60)), err: prevErr });
      }
    });
    m.stuck.sort(U.by(function (x) { return x.runs; }, true));
    m.help = { feedback: sec.feedback.filter(function (f) { return b.rset[f.sid]; }), questions: m.waiting.questions };
    m.help.seen = m.help.feedback.filter(function (f) { return f.seen; }).length;
    m.markers = sec.markers;

    // ----- students who look ready for more -----
    m.ready = [];
    if (m.currentUnit) {
      var curSubs = {}; sec.openedSubs.forEach(function (s) { if (s.chapter === m.currentUnit.id) curSubs[s.id] = true; });
      roster.forEach(function (s) {
        var rs = (recsByStudent.get(s.id) || []).filter(function (r) { return graded(r) && curSubs[items[r.item].sub]; });
        if (rs.length < MIN_STUDENT_N || s.joined > today - 21) return;
        var ok = rs.filter(function (r) { return first(r).ok; }).length;
        var hard = rs.filter(function (r) { return items[r.item].dok === 3; }), hardOk = hard.filter(function (r) { return first(r).ok; }).length;
        var doneAll = last6.every(function (x) { return x.eligible.indexOf(s.id) < 0 || x.completed.indexOf(s.id) >= 0; });
        if (ok / rs.length >= 0.7 && hardOk >= 2 && doneAll) m.ready.push({ sid: s.id, ok: ok, n: rs.length, hardOk: hardOk, hard: hard.length });
      });
      m.ready.sort(U.by(function (x) { return x.ok / x.n; }, true));
    }

    // ----- readiness for the next subunit -----
    m.next = null;
    if (mainLane && !mainLane.tb.supplemental) {
      var allSubs = [], lastIdx = -1;
      mainLane.tb.chapters.forEach(function (c) { c.subs.forEach(function (s) { allSubs.push(s); }); });
      var lastLesson = sec.assignments.filter(function (a) { return a.kind === 'lesson'; }).slice(-1)[0];
      allSubs.forEach(function (s, i) { if (s.id === lastLesson.sub) lastIdx = i; });
      var nxt = allSubs[lastIdx + 1];
      if (nxt) {
        var pre = {};
        nxt.skills.forEach(function (sid) { world.skills[sid].prereqs.forEach(function (p) { if (nxt.skills.indexOf(p) < 0) pre[p] = true; }); });
        var rows = Object.keys(pre).map(function (sid) {
          var o = sk[sid], state = !o ? 'unseen' : o.p >= 0.5 ? 'solid' : o.p < 0.4 ? 'shaky' : 'mixed', shaky = [];
          if (o) roster.forEach(function (s) {
            var n = 0, ok = 0;
            (recsByStudent.get(s.id) || []).forEach(function (r) { if (graded(r) && items[r.item].skills.indexOf(sid) >= 0) { n++; if (first(r).ok) ok++; } });
            if (n >= 2 && ok / n < 0.4) shaky.push(s.id);
          });
          return { skill: world.skills[sid], stat: o || null, state: state, shaky: shaky };
        }).sort(U.by(function (x) { return x.stat ? x.stat.p : 2; }));
        var cnt = {};
        rows.forEach(function (r) { r.shaky.forEach(function (sid) { cnt[sid] = (cnt[sid] || 0) + 1; }); });
        m.next = { sub: nxt, rows: rows, multi: Object.keys(cnt).filter(function (sid) { return cnt[sid] >= 2; }) };
      }
    }

    // ----- follow-ups: what happened after each action -----
    m.followups = (sec.actions || []).concat(IL.state && IL.state.actions ? IL.state.actions.filter(function (a) { return a.sec === sec.id; }) : []).map(function (ac) {
      var o = { action: ac, rows: [], improved: 0, same: 0, noWork: 0 };
      var a = ac.asg ? sec.assignments.filter(function (x) { return x.id === ac.asg; })[0] : null;
      if (ac.kind === 'check-in') {
        ac.students.forEach(function (sid) { var x = stu[sid]; o.rows.push({ sid: sid, state: x && x.lastDay != null && x.lastDay > ac.day ? 'active' : 'quiet', lastDay: x ? x.lastDay : null }); });
        o.status = today >= ac.recheckDay ? 'recheck due' : 'waiting';
        return o;
      }
      if (!a) { o.status = 'waiting'; return o; }
      ac.students.forEach(function (sid) {
        var before = { n: 0, ok: 0 }, after = { n: 0, ok: 0 };
        sec.records.forEach(function (r) {
          if (r.sid !== sid || !graded(r)) return;
          var it = items[r.item];
          if (it.action === ac.id) { after.n++; if (first(r).ok) after.ok++; }
          else if (!it.action && first(r).t < ac.t && it.skills.some(function (s) { return ac.skills.indexOf(s) >= 0; })) { before.n++; if (first(r).ok) before.ok++; }
        });
        var state = after.n < 3 ? 'none' : before.n < 2 ? 'new' : after.ok / after.n - before.ok / before.n >= 0.15 ? 'improved' : 'same';
        if (state === 'improved') o.improved++; else if (state === 'none') o.noWork++; else o.same++;
        o.rows.push({ sid: sid, before: before, after: after, state: state });
      });
      var bb = { n: 0, ok: 0 }, aa = { n: 0, ok: 0 };
      o.rows.forEach(function (r) { bb.n += r.before.n; bb.ok += r.before.ok; aa.n += r.after.n; aa.ok += r.after.ok; });
      o.before = rate(bb.ok, bb.n); o.after = rate(aa.ok, aa.n);
      o.rows.sort(function (x, y) { var dx = x.after.n ? x.after.ok / x.after.n - (x.before.n ? x.before.ok / x.before.n : 0) : -9, dy = y.after.n ? y.after.ok / y.after.n - (y.before.n ? y.before.ok / y.before.n : 0) : -9; return dy - dx; });
      o.status = ac.reviewed ? 'done' : today >= ac.recheckDay ? 'recheck due' : 'waiting';
      return o;
    }).sort(U.by(function (x) { return x.action.t; }, true));

    // ----- since the last visit -----
    var lv = world.lastVisit;
    m.since = { t: lv, resolved: [], grew: [], joined: roster.filter(function (s) { return s.joined * 1440 > lv; }).map(function (s) { return s.id; }), newWork: null };
    liveStats.filter(function (x) { return x.a.dueT > lv - 14 * 1440 && x.a.day * 1440 < lv; }).forEach(function (x) {
      var work = sec.asgWork[x.a.id];
      var then = x.eligible.filter(function (sid) { return !work[sid] || work[sid].t0 > lv; }).length;
      if (then - x.notStarted.length >= 2) m.since.resolved.push({ a: x.a, then: then, now: x.notStarted.length });
    });
    m.since.resolved.sort(U.by(function (x) { return x.then - x.now; }, true));
    m.code.forEach(function (c) {
      var then = 0;
      c.failing.forEach(function (sid) { var r = sec.recIndex.get(sid + ':' + c.item.id); if (first(r).t <= lv) then++; });
      if (c.failing.length - then >= 2) m.since.grew.push({ item: c.item, then: then, now: c.failing.length });
    });
    var newRecs = recs.filter(function (r) { return first(r).t > lv; });
    m.since.newWork = { students: U.uniq(newRecs.map(function (r) { return r.sid; })).length, attempts: newRecs.length };

    sec._m[key] = m;
    return m;
  };

  // ---------- on-demand detail ----------
  M.engLevel = function (minutes, median) {
    if (!minutes) return 0;
    var r = minutes / (median || 1);
    return r < 0.5 ? 1 : r < 0.9 ? 2 : r < 1.5 ? 3 : 4;
  };
  M.BANDS = ['Beginning', 'Attempted', 'Familiar', 'Proficient', 'Mastered'];
  M.ENG = ['Pending', 'Low', 'Medium', 'High', 'Very high'];

  // Tint channel for a grid cell: the band when one exists, otherwise first-try success.
  M.FTS_BANDS = ['under 35%', '35 to 50%', '50 to 65%', '65 to 80%', '80% and over'];
  M.tint = function (c) {
    if (c.band && c.band.state === 'scored') return c.band.level;
    if (c.n >= 3) return c.fts < 0.35 ? 0 : c.fts < 0.5 ? 1 : c.fts < 0.65 ? 2 : c.fts < 0.8 ? 3 : 4;
    return null;
  };

  // student × column grid for one textbook.
  // path: [] chapters · [chapterId] subunits · [chapterId, subId] skills assessed in that subunit
  M.grid = function (world, sec, tbId, path) {
    var b = basics(world, sec), tb = world.textbooks[tbId];
    var opened = {}; sec.openedSubs.forEach(function (s) { opened[s.id] = true; });
    path = path == null ? [] : (typeof path === 'string' ? [path] : path.slice());
    // a supplemental textbook keeps everything in one chapter, so its subunits are the top level
    if (tb.supplemental && path.length === 1 && tb.subs[path[0]]) path = [tb.chapters[0].id, path[0]];
    var level = path.length >= 2 ? 'skill' : (path.length === 1 || tb.supplemental) ? 'sub' : 'chapter';
    var chapter = tb.supplemental ? tb.chapters[0] : path.length ? tb.chapters.filter(function (c) { return c.id === path[0]; })[0] : null;
    if (level !== 'chapter' && !chapter) { level = 'chapter'; path = []; }
    var sub = level === 'skill' ? tb.subs[path[1]] : null;
    if (level === 'skill' && !sub) { level = 'sub'; path = path.slice(0, 1); }
    var cols;
    if (level === 'chapter') {
      cols = tb.chapters.map(function (c) {
        return { id: c.id, kind: 'chapter', label: String(c.num), name: c.name, subs: c.subs, drill: true,
          open: c.subs.some(function (s) { return opened[s.id]; }) };
      });
    } else if (level === 'sub') {
      cols = chapter.subs.map(function (s) {
        return { id: s.id, kind: 'sub', label: s.code, name: s.name, subs: [s], drill: true, open: !!opened[s.id] };
      });
    } else {
      var bySkill = {};
      sec.itemList.forEach(function (it) {
        if (it.sub !== sub.id || it.action) return;
        it.skills.forEach(function (k) { (bySkill[k] || (bySkill[k] = [])).push(it); });
      });
      cols = Object.keys(bySkill).map(function (k) {
        return { id: k, kind: 'skill', label: world.skills[k].name, name: world.skills[k].name, skill: world.skills[k],
          subs: [sub], its: bySkill[k], open: !!opened[sub.id] };
      }).sort(U.by(function (c) { return c.name; }));
    }
    var cells = {};
    cols.forEach(function (col) {
      var its, total;
      if (col.kind === 'skill') { its = col.its; total = its.length; }
      else {
        var subSet = {}; col.subs.forEach(function (s) { subSet[s.id] = true; });
        its = sec.itemList.filter(function (it) { return subSet[it.sub] && !it.action; });
        total = its.length + col.subs.filter(function (s) { return !opened[s.id]; }).length * tb.perSub;
      }
      col.questions = its.length;
      var minutes = {};
      b.roster.forEach(function (s) {
        var c = { correct: 0, error: 0, pending: 0, untouched: 0, n: 0, ok: 0, min: 0, total: total, marks: [] };
        its.forEach(function (it) {
          var r = sec.recIndex.get(s.id + ':' + it.id);
          if (!r) { if (col.kind === 'skill') c.marks.push({ item: it, state: 'none' }); return; }
          r.attempts.forEach(function (a) { c.min += a.dur / 60; });
          var state = !graded(r) ? 'pending' : first(r).ok ? 'first' : ever(r) ? 'later' : 'wrong';
          if (ever(r)) c.correct++; else if (graded(r)) c.error++; else c.pending++;
          if (graded(r)) { c.n++; if (first(r).ok) c.ok++; }
          if (col.kind === 'skill') c.marks.push({ item: it, state: state, rec: r });
        });
        c.untouched = Math.max(0, total - c.correct - c.error - c.pending);
        c.fts = c.n ? c.ok / c.n : null;
        c.pc = total ? Math.round((100 * c.correct) / total) : 0;
        // bands are scored per unit, so below unit level the cell falls back to first-try success
        c.band = sec.bands && col.kind === 'chapter' ? (sec.band[s.id + '|' + col.id] || { state: 'unattempted' })
          : { state: c.n ? 'unavailable' : 'unattempted' };
        cells[s.id + '|' + col.id] = c;
        if (c.min > 0) minutes[s.id] = c.min;
      });
      var med = U.median(Object.keys(minutes).map(function (k) { return minutes[k]; })) || 1;
      b.roster.forEach(function (s) { var c = cells[s.id + '|' + col.id]; c.eng = M.engLevel(c.min, med); c.tint = M.tint(c); });
      var minCell = col.kind === 'skill' ? 1 : 3;
      var vals = b.roster.map(function (s) { return cells[s.id + '|' + col.id]; }).filter(function (c) { return c.n >= minCell; });
      col.classFts = vals.length ? U.sum(vals.map(function (c) { return c.ok; })) / U.sum(vals.map(function (c) { return c.n; })) : null;
      col.classPc = Math.round(U.mean(b.roster.map(function (s) { return cells[s.id + '|' + col.id].pc; })));
      col.started = b.roster.filter(function (s) { return cells[s.id + '|' + col.id].correct + cells[s.id + '|' + col.id].error + cells[s.id + '|' + col.id].pending > 0; }).length;
    });
    return { cols: cols, cells: cells, tb: tb, level: level, path: path, chapter: chapter, sub: sub,
      banded: sec.bands && level === 'chapter' };
  };

  M.verdict = function (cell, classFts) {
    var low, busy = cell.eng >= 3, perf;
    if (!cell.n && !cell.correct && !cell.error && !cell.pending) return null;
    if (cell.band.state === 'scored') { low = cell.band.level <= 2; perf = M.BANDS[cell.band.level]; if (low && cell.band.coverage < 50) return { tone: 'info', title: 'Early in the unit', body: cell.band.coverage + '% of this unit scored so far, at ' + M.ENG[cell.eng].toLowerCase() + ' activity. The band is ' + perf.toLowerCase() + '; it reflects how far the student is as well as how well.' }; }
    else if (cell.n >= 5 && classFts != null) { low = cell.fts <= classFts - 0.08; perf = Math.round(cell.fts * 100) + '% first try'; }
    else return null;
    var eng = M.ENG[cell.eng].toLowerCase();
    if (low && busy) return { tone: 'warn', title: 'Putting in the time, not landing it', body: eng.charAt(0).toUpperCase() + eng.slice(1) + ' recorded activity, ' + perf.toLowerCase() + '. The work is being done and it is not converting.' };
    if (low && !busy) return { tone: 'muted', title: 'Little recorded work in this unit', body: eng.charAt(0).toUpperCase() + eng.slice(1) + ' recorded activity, ' + perf.toLowerCase() + '. Few wrong answers to review, because little was attempted.' };
    if (!low && !busy) return { tone: 'good', title: 'Getting it without spending long', body: perf + ' on ' + eng + ' recorded activity. May be ready to move on.' };
    return { tone: 'info', title: 'On track', body: perf + ', ' + eng + ' recorded activity.' };
  };

  // evidence for one student in one grid cell (the cell inspector), at any of the three levels
  M.cell = function (world, sec, sid, tbId, colId, path) {
    var tb = world.textbooks[tbId], items = sec.items;
    if (path == null) {
      path = tb.chapters.some(function (c) { return c.id === colId; }) ? []
        : tb.subs[colId] ? [tb.subs[colId].chapter] : [];
    }
    var g = M.grid(world, sec, tbId, path);
    var cell = g.cells[sid + '|' + colId], col = g.cols.filter(function (c) { return c.id === colId; })[0];
    if (!col) return null;
    var recs, its;
    if (col.kind === 'skill') {
      var keep = {}; col.its.forEach(function (it) { keep[it.id] = true; });
      its = col.its;
      recs = sec.records.filter(function (r) { return r.sid === sid && keep[r.item]; });
    } else {
      var subSet = {}; col.subs.forEach(function (s) { subSet[s.id] = true; });
      its = sec.itemList.filter(function (it) { return subSet[it.sub] && !it.action; });
      recs = sec.records.filter(function (r) { return r.sid === sid && subSet[items[r.item].sub] && !items[r.item].action; });
    }
    var wrong = recs.filter(function (r) { return graded(r) && !ever(r); });
    var bySub = col.kind === 'skill' || col.subs.length < 2 ? [] : col.subs.map(function (s) {
      var rs = recs.filter(function (r) { return items[r.item].sub === s.id; });
      var n = sec.itemList.filter(function (it) { return it.sub === s.id && !it.action; }).length;
      var o = { sub: s, correct: rs.filter(ever).length, error: rs.filter(function (r) { return graded(r) && !ever(r); }).length, pending: rs.filter(function (r) { return !graded(r); }).length };
      o.total = n || tb.perSub; o.untouched = o.total - o.correct - o.error - o.pending;
      return o;
    });
    // at skill level the useful evidence is every question on that skill, answered or not
    var questions = col.kind !== 'skill' ? [] : its.map(function (it) {
      return { item: it, rec: sec.recIndex.get(sid + ':' + it.id) || null };
    });
    var retries = 0, rapid = 0;
    recs.forEach(function (r) { if (items[r.item].type !== 'activecode') r.attempts.slice(1).forEach(function (a) { retries++; if (a.dur < 3) rapid++; }); });
    return { cell: cell, col: col, grid: g, recs: recs, wrong: wrong, bySub: bySub, questions: questions,
      retries: retries, rapid: rapid, verdict: M.verdict(cell, col.classFts), classFts: col.classFts };
  };

  // one student across the term
  M.student = function (world, sec, sid) {
    var b = basics(world, sec), m = M.build(world, sec, { tb: 'all', win: '2w' }), items = sec.items, st = sec.students[sid];
    var recs = sec.records.filter(function (r) { return r.sid === sid; }), g = recs.filter(graded);
    var weeks = [];
    for (var w = 0; w < b.weekActive.length; w++) {
      var rs = g.filter(function (r) { return T.week(first(r).t) === w; }), rg = relGap(b, rs);
      weeks.push({ week: w, classWeek: b.classWeek[w], minutes: (b.weekActive[w] || {})[sid] || 0, n: rg.n, gap: rg.n >= 8 ? rg.gap : null });
    }
    var lessons = m.funnel.rows.filter(function (x) { return x.a.kind === 'lesson' || x.a.kind === 'quiz' || x.a.kind === 'review'; }).map(function (x) {
      return { a: x.a, state: x.eligible.indexOf(sid) < 0 ? 'na' : x.completed.indexOf(sid) >= 0 ? 'done' : x.started.indexOf(sid) >= 0 ? 'part' : 'no', late: x.lateStart.indexOf(sid) >= 0 };
    });
    // skill clusters
    var cl = {};
    g.forEach(function (r) {
      items[r.item].skills.forEach(function (k) { var o = cl[k] || (cl[k] = { skill: world.skills[k], n: 0, ok: 0 }); o.n++; if (first(r).ok) o.ok++; });
    });
    var clusters = Object.keys(cl).map(function (k) { return cl[k]; }).filter(function (o) { return o.n >= 3; });
    clusters.forEach(function (o) { o.p = o.ok / o.n; o.cls = m.skill[o.skill.id] ? m.skill[o.skill.id].p : null; });
    var fmt = {}, dok = {};
    g.forEach(function (r) {
      var it = items[r.item];
      var f = fmt[it.type] || (fmt[it.type] = { n: 0, ok: 0 }), d = dok[it.dok] || (dok[it.dok] = { n: 0, ok: 0 });
      f.n++; d.n++; if (first(r).ok) { f.ok++; d.ok++; }
    });
    // moments on the timeline
    var moments = [];
    m.topicsOrdered.forEach(function (t) {
      if (!t.opened) return;
      var rs = recs.filter(function (r) { return items[r.item].chapter === t.chapter.id; });
      if (rs.length) moments.push({ t: Math.min.apply(null, rs.map(function (r) { return first(r).t; })), kind: 'practised', label: 'Started ' + t.chapter.name, detail: rs.length + ' questions so far', unit: t.chapter.id });
    });
    weeks.forEach(function (wk) { if (wk.gap != null && wk.gap <= -0.2 && wk.n >= 12) moments.push({ t: T.at(wk.week * 7 + 4, 12, 0), kind: 'wrong', label: 'Many wrong first answers', detail: wk.n + ' questions, ' + Math.round(-wk.gap * 100) + ' points below classmates', week: wk.week }); });
    m.followups.forEach(function (f) { if (f.action.students.indexOf(sid) >= 0 && f.action.students.length < b.roster.length) moments.push({ t: f.action.t, kind: 'action', label: f.action.title, detail: 'You did this on ' + T.fmtDay(f.action.day), action: f.action.id }); });
    var q = m.quiet.filter(function (x) { return x.sid === sid; })[0];
    if (q) moments.push({ t: T.at((m.stu[sid].lastDay || 0) + 1, 9, 0), kind: 'quiet', label: 'Went quiet', detail: 'No recorded activity for ' + q.run + ' class weeks' });
    if (st.joined > 0) moments.push({ t: T.at(st.joined, 9, 0), kind: 'join', label: 'Joined the class', detail: T.fmtDayLong(st.joined) });
    moments.sort(U.by(function (x) { return x.t; }));
    return { st: st, s: m.stu[sid], recs: recs, weeks: weeks, lessons: lessons, clusters: clusters.sort(U.by(function (o) { return o.p; })), fmt: fmt, dok: dok, moments: moments,
      unresolved: g.filter(function (r) { return !ever(r) && !items[r.item].action; }), recent: recs.slice().sort(U.by(function (r) { return first(r).t; }, true)).slice(0, 12), m: m };
  };
})(typeof window !== 'undefined' ? window : globalThis);

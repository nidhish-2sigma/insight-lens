/* Insight Lens mock · tabs: Brief, Progress, Understanding, and the pictures shared by drawers and tabs.
   Headlines, firing, time basis and caveats come from the shared insight records (04b-insights); a tab only
   draws the evidence. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, M = IL.M, I = IL.I, h = IL.h, C = IL.C, pct = IL.pct;
  if (!root.document) return;
  var signed = function (v) { var r = Math.round(v * 100); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r); };
  var ids = function (rows) { return rows.map(function (x) { return x.sid; }); };

  // ---------- pictures shared by drawers and tabs ----------
  IL.funnelSegs = function (x) {
    return [{ n: x.completed.length, cls: 's-done', label: 'Completed', sids: x.completed }, { n: x.inProgress.length, cls: 's-prog', label: 'In progress', sids: x.inProgress },
      { n: x.notStarted.length, cls: 's-none', label: 'Not started', sids: x.notStarted }];
  };
  IL.gapPicture = function (m, g) {
    var world = IL.world, rows = m.gaps.roots.slice(0, 5), maxB = Math.max.apply(null, rows.map(function (r) { return r.blocked.length; })) || 1, graph = m.gaps.graph;
    var out = [h('div', { class: 'sub', style: 'display:grid;grid-template-columns:minmax(140px,260px) 1fr;gap:10px;margin-bottom:2px' }, h('span', null, 'Fix first'), h('span', null, graph ? 'class first try · later skills waiting on it (skills in a skipped unit in brackets)' : 'class first try'))];
    out.push(C.bars(rows.map(function (r, i) {
      return { label: (i + 1) + '  ' + r.skill.name, v: graph ? Math.max(0.3, r.blocked.length) : 0.3, color: graph ? '#5b6472' : 'transparent', text: graph ? r.blocked.length + ' waiting' + (r.inSkipped.length ? ' (+' + r.inSkipped.length + ' skipped)' : '') : r.stat.nItems + ' questions',
        pre: [C.meter(r.stat.p, pct(r.stat.p) + ' first try over ' + r.stat.nItems + ' questions'), h('span', { class: 'bar-val', style: 'width:34px' }, pct(r.stat.p))],
        tip: r.skill.name + '\n' + pct(r.stat.p) + ' first try · ' + r.stat.nItems + ' questions · ' + r.stat.nStudents + ' students',
        onClick: function () { IL.openGap(r); } };
    }), { max: maxB, span: 40 }));
    if (g) {
      if (g.blocked.length) out.push(h('p', { class: 'note' }, h('b', null, 'Needed for: '), g.blocked.slice(0, 6).map(function (k) { return world.skills[k].name; }).join(' · ') + (g.blocked.length > 6 ? ' · +' + (g.blocked.length - 6) + ' more' : '')));
      if (g.inSkipped.length) out.push(h('p', { class: 'note' }, h('b', null, 'In a skipped unit, not counted: '), g.inSkipped.slice(0, 6).map(function (k) { return world.skills[k].name; }).join(' · ') + (g.inSkipped.length > 6 ? ' · +' + (g.inSkipped.length - 6) + ' more' : '')));
      out.push(h('p', { class: 'note' }, h('b', null, 'Questions behind it: '), g.items.slice(0, 5).map(function (it, i) {
        var a = m.b.itemAgg[it.id];
        return [i ? ' · ' : '', h('a', { on: { click: function (e) { e.stopPropagation(); IL.ev.item(it.id); } } }, it.name), a ? ' (' + a.ok + ' of ' + a.n + ')' : ''];
      })));
    }
    return out;
  };
  // open the evidence for one root gap: the signal if it raised one, built the same way
  IL.openGap = function (g) {
    var s = IL.cur.ins.signals.filter(function (x) { return x.id === 'gap-' + g.skill.id; })[0];
    if (s) { var th = IL.cur.ins.themes.filter(function (t) { return t.members.indexOf(s) >= 0; })[0]; if (th) IL.openTheme(th); else IL.openSignal(s); return; }
    IL.drawer('“' + g.skill.name + '” is at ' + pct(g.stat.p) + ' right first time', g.stat.nItems + ' questions · ' + g.stat.nStudents + ' students', [h('div', null, IL.gapPicture(IL.cur.m, g))]);
  };
  IL.codePicture = function (c) {
    var out = [h('div', { class: 'split-row', style: 'grid-template-columns:96px 1fr auto' }, h('span', { class: 'sub' }, 'Outcome'),
      C.split([{ n: c.firstRun.length, cls: 's-done', label: 'Passed on the first run', sids: c.firstRun }, { n: c.afterFixes.length, cls: 's-part', label: 'Passed after fixes', sids: c.afterFixes }, { n: c.failing.length, cls: 's-bad', label: 'Still failing', sids: c.failing }], { size: 'tall' }),
      h('span', { class: 'val' }, 'first run ' + c.firstRun.length + ' · after fixes ' + c.afterFixes.length + ' · still failing ' + c.failing.length))];
    var maxR = Math.max.apply(null, c.runsToPass.concat([c.failing.length])) || 1;
    out.push(h('div', { class: 'split-row', style: 'grid-template-columns:96px 1fr;align-items:end' }, h('span', { class: 'sub' }, 'Runs to pass'),
      h('div', { style: 'display:flex;gap:10px;align-items:flex-end;height:50px' }, c.runsToPass.map(function (n, i) {
        return h('div', { style: 'text-align:center', tip: n + ' passed on run ' + (i === 4 ? '5 or later' : i + 1) }, h('div', { class: 'sub' }, String(n)), h('div', { style: 'width:22px;border-radius:3px 3px 0 0;background:#8fb1f1;height:' + Math.max(2, (n / maxR) * 22) + 'px' }), h('div', { class: 'sub' }, i === 4 ? '5+' : String(i + 1)));
      }), h('div', { style: 'text-align:center;margin-left:8px', tip: c.failing.length + ' have not passed' }, h('div', { class: 'sub' }, String(c.failing.length)), h('div', { style: 'width:22px;border-radius:3px 3px 0 0;background:#D3302F;height:' + Math.max(2, (c.failing.length / maxR) * 22) + 'px' }), h('div', { class: 'sub' }, 'not yet')))));
    if (c.tests.some(function (t) { return t.failing.length; })) out.push(h('div', { class: 'split-row', style: 'grid-template-columns:96px 1fr' }, h('span', { class: 'sub' }, 'Tests'),
      h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px' }, c.tests.map(function (t) {
        return h('span', { tip: t.failing.length ? 'Failing test ' + t.test + ':\n' + IL.names(t.failing) : 'No one is failing test ' + t.test, style: t === c.hardTest && t.failing.length ? 'font-weight:700;color:#7a5200' : '' },
          'test ' + t.test + (t.failing.length ? ' ✗ ' + t.failing.length : ' ✓'));
      }))));
    if (c.topError) out.push(h('div', { class: 'split-row', style: 'grid-template-columns:96px 1fr' }, h('span', { class: 'sub' }, 'Shared error'),
      h('span', null, h('span', { class: 'tag warn' }, c.topError.err), ' ' + U.plural(c.topError.students.length, 'student') + ': ', IL.whoList(c.topError.students, 5))));
    return out;
  };
  IL.dipPicture = function (m) {
    var sr = m.dip.series, f = m.dip.flagged;
    var out = [h('p', { class: 'sub', style: 'margin-bottom:6px' }, 'Points above or below typical on the same questions, by class week'),
      C.zero({ values: sr.map(function (x) { return x.gap; }), cw: 26, h: 80, amp: 0.3, labels: sr.map(function (x, i) { return i % 2 === 0 ? T.fmtDay(x.week * 7) : ''; }),
        tips: sr.map(function (x) { return 'Week of ' + T.fmtDay(x.week * 7) + ' · ' + x.n + ' first attempts'; }), mark: f ? sr.indexOf(f.point) : null, refLabel: '← typical', tailW: 60 })];
    if (f && f.fell.length) {
      out.push(h('p', { class: 'sub', style: 'margin:10px 0 2px' }, 'Furthest below typical that week'));
      out.push(C.bars(f.fell.map(function (x) { return { label: x.sub.code + ' ' + x.sub.name, v: Math.abs(x.gap), text: M.vsTypical(x.gap, 0).phrase + ' · ' + x.n + ' attempts', cls: 'amber' }; }), { span: 40 }));
    }
    return out;
  };
  IL.quietPicture = function (m) {
    var b = m.b, weeks = [];
    for (var w = Math.max(b.firstWeek, b.weekActive.length - 10); w < b.weekActive.length; w++) weeks.push(w);
    var off = Math.max(0, b.weekActive.length - 10);
    return [C.register({ cols: weeks.map(function (w) { return { label: T.fmtDay(w * 7).split(' ')[0], tip: 'Week of ' + T.fmtDay(w * 7) }; }), noteHead: 'last active',
      rows: m.quiet.map(function (q) { return { sid: q.sid, cells: q.strip.slice(weeks[0] - off).map(function (x) { return x === 'on' ? 'yes' : x === 'off' ? 'no' : 'pale'; }), note: (q.lastDay != null ? T.fmtDay(q.lastDay) : 'never') + ' · ' + q.run + ' class weeks' }; }),
      words: { yes: 'active', no: 'no recorded activity', pale: 'the class was quiet this week, so it does not count' } }),
      C.legend([{ cls: 's-done', label: 'active' }, { cls: 's-none', label: 'not active' }, { cls: 's-mute', label: 'class was quiet that week (does not count)' }])];
  };
  IL.trajPicture = function (m, list) {
    var labels = m.periods.map(function (p) { return T.fmtDay(p[0] * 7); });
    return [h('p', { class: 'sub', style: 'margin-bottom:4px' }, 'Compared with classmates on the same questions. Each bar is two class weeks; the line is the class’s own level.'),
      list.map(function (x) {
        return h('div', { class: 'strip-row', style: 'grid-template-columns:130px auto 1fr' }, IL.who(x.sid, ids(list)),
          C.zero({ values: x.series.map(function (s) { return s.gap; }), cw: 20, h: 44, amp: 0.45, tips: x.series.map(function (s, i) { return 'From ' + labels[i] + ' · ' + s.n + ' first attempts'; }), mark: x.series.length - 1 }),
          h('span', null, h('b', null, signed(x.last) + ' now'), ' · ' + (x.kind === 'sustained' ? 'below for 2 periods' : x.kind === 'drop' ? 'dropped ' + Math.abs(Math.round(x.change * 100)) + ' points' : 'rose ' + Math.round(x.change * 100) + ' points')));
      })];
  };
  IL.pacePicture = function (p) {
    // the axis covers the range the class is actually in, so the spread is readable
    var vals = p.dots.map(function (d) { return d.pc; }), hi = Math.min(100, Math.max(40, Math.ceil((Math.max.apply(null, vals) + 8) / 10) * 10));
    return [C.fit(function (W) { return C.strip({ w: W, dots: p.dots.map(function (d) { return { sid: d.sid, v: d.pc }; }), min: 0, max: hi, ticks: [0, hi / 2, hi], median: p.median, band: [Math.max(0, p.median - 15), Math.min(hi, p.median + 15)], fmt: function (v) { return Math.round(v) + '%'; },
      flag: function (d) { return d.v <= p.median - 15; }, label: 'Percent complete on chapter ' + p.unit.num }); }),
      C.legend([{ color: '#dfe2e8', label: 'a student, within 15 points of the median or ahead' }, { color: '#E9A400', label: '15 points or more behind' }]),
      p.behind.length ? h('p', { class: 'note' }, h('b', null, p.behind.length + ' behind: '), IL.whoList(ids(p.behind), 10)) : null,
      p.ahead.length ? h('p', { class: 'note' }, h('b', null, p.ahead.length + ' ahead: '), IL.whoList(ids(p.ahead), 10)) : null];
  };
  IL.streakPicture = function (m, rows) {
    return [C.register({ rot: true, cols: m.streaks.cols.map(function (a) { return { label: a.short.split(' ')[0] === 'Unit' ? a.short.slice(0, 11) : a.short.split(' ')[0], tip: a.name + ' · due ' + T.fmtDay(a.dueDay) }; }), noteHead: '',
      rows: rows.map(function (r) { return { sid: r.sid, cells: r.cells, run: [r.end - r.run + 1, r.end], note: r.never ? 'never signed in' : 'last ' + r.run + ' not started' }; }),
      words: { yes: 'started', no: 'not started', na: 'not assigned' } }),
      C.legend([{ cls: 's-done', label: 'started' }, { cls: 's-none', label: 'not started' }, { color: '#b9bec7', label: 'not assigned (dash)' }])];
  };
  // examples that are still unresolved come first; the count beside them is of the same list
  IL.stuckPicture = function (m, n) {
    return m.stuck.slice(0, n).map(function (x) {
      return h('div', { style: 'padding:6px 0;border-bottom:1px solid var(--line);cursor:pointer', on: { click: function () { IL.ev.item(x.item.id); } } },
        h('div', { style: 'font-size:12.5px;margin-bottom:4px' }, IL.who(x.sid, U.uniq(ids(m.stuck))), ' · ' + x.item.name + ' · ', h('b', null, x.runs + ' runs'), ' over ' + T.dur(x.span * 60) + ' · ', h('span', { class: 'tag ' + (x.lastOk ? '' : 'warn') }, x.lastOk ? 'passing now' : 'not passing')),
        C.tape(x.rec.attempts, { code: true }),
        h('div', { class: 'sub', style: 'margin-top:3px' }, x.flags.length ? x.flags.join(' · ') : 'Ten or more runs without a pass', x.sameRun >= 4 ? ' · same failure × ' + x.sameRun : ''));
    });
  };
  IL.movePicture = function (m, rows) {
    return C.fit(function (W) {
      return C.dumbbell({ w: W, labW: Math.round(W * 0.22), rows: rows.slice(0, 8).map(function (r) { return { sid: r.sid, a: r.prev.gap, b: r.cur.gap, aTip: r.prev.n + ' first attempts', bTip: r.cur.n + ' first attempts' }; }), min: -0.5, max: 0.5, zero: 0, aLabel: 'two class weeks before', bLabel: 'last two class weeks',
        fmt: signed, label: 'Gap to classmates, before and now' });
    });
  };
  // every outcome state is named once, and the numbers add up to the students in the action
  IL.followupWords = function (f) { return f.improved + ' improved · ' + f.same + ' no change · ' + f.firstEvidence + ' first evidence · ' + f.noWork + ' no new work'; };
  IL.followupPicture = function (f) {
    if (f.action.kind === 'check-in') return f.rows.map(function (r) { return h('p', null, IL.who(r.sid, ids(f.rows)), ': ', r.state === 'active' ? 'active again since ' + T.fmtDay(r.lastDay) : 'no recorded activity since ' + (r.lastDay != null ? T.fmtDay(r.lastDay) : 'the start of term')); });
    if (!f.rows.length || f.status === 'waiting') return h('p', { class: 'empty' }, 'Waiting for new work. The recheck is set for ' + T.fmtDayLong(f.action.recheckDay) + '.');
    var WORD = { improved: 'improved', same: 'no change', 'new': 'first evidence', none: 'no new work' };
    var rows = f.rows.slice(0, 12).map(function (r) {
      var a = r.before.n ? r.before.ok / r.before.n : null, b = r.after.n >= 3 ? r.after.ok / r.after.n : null;
      return { sid: r.sid, a: r.state === 'new' ? null : a, b: b, hollow: b == null ? 'no new work yet' : null, aTip: r.before.ok + ' of ' + r.before.n + ' before', bTip: r.after.ok + ' of ' + r.after.n + ' new questions', note: WORD[r.state] };
    });
    return [h('p', { class: 'finding', style: 'font-size:13.5px' }, IL.followupWords(f)),
      C.fit(function (W) { return C.dumbbell({ rows: rows, min: 0, max: 1, aLabel: 'before (same skill)', bLabel: 'after (new questions)', noteW: 100, labW: Math.round(W * 0.2), w: W }); }),
      f.firstEvidence ? h('p', { class: 'note' }, '“First evidence” means the student had no earlier work on this skill, so there is nothing to compare with. It is not counted as improved or as no change.') : null,
      f.rows.length > 12 ? h('p', { class: 'sub' }, '+' + (f.rows.length - 12) + ' more students') : null];
  };

  // ---------- the map of the material ----------
  // Every chapter of a textbook, then a chapter's subunits, then a subunit's skills. The map opens on all
  // chapters and the teacher chooses where to go: no unit is picked for them. One position (st.view.gridTb,
  // st.view.path) is shared by Progress, Understanding and the Students grid, so a unit opened in one place is
  // the unit shown in the others.
  IL.mapTb = function (ctx) {
    var st = ctx.st, sec = ctx.sec;
    return st.tb !== 'all' ? st.tb : (st.view.gridTb && sec.textbooks.some(function (x) { return x.tb.id === st.view.gridTb; }) ? st.view.gridTb : sec.textbooks[0].tb.id);
  };
  // a skill inside one subunit: its questions, who is struggling on it, and what to do about it
  IL.openSkill = function (k, tbId, subId) {
    var world = IL.world, sec = IL.cur.sec, m = IL.cur.m, R = IL.R, tb = world.textbooks[tbId], sub = tb.subs[subId], sk = world.skills[k], body = [];
    var g = M.grid(world, sec, tbId, [sub.chapter, subId]), col = g.cols.filter(function (c) { return c.id === k; })[0];
    if (!col) body.push(h('p', { class: 'empty' }, sub.taughtOnly.indexOf(k) >= 0 ? 'This skill is taught in ' + sub.code + ' and has no questions here, so there is nothing to report yet.' : 'No work on this skill in ' + sub.code + ' yet.'));
    else {
      body.push(IL.section(U.plural(col.its.length, 'question') + ' on this skill in ' + sub.code + ' · students right first time', R.bars(col.its.map(function (it) {
        var a = m.b.itemAgg[it.id];
        return { label: it.name, v: a && a.n ? a.ok / a.n : 0, text: a && a.n ? a.ok + ' of ' + a.n : 'not tried', tone: 'blue', tip: 'Open this question', onClick: function () { IL.ev.item(it.id); } };
      }), 1, { cls: 'wide' })));
      var low = m.roster.filter(function (st) { var c = g.cells[st.id + '|' + k]; return c && c.n >= 2 && c.fts < 0.35; }).map(function (st) { return st.id; });
      if (low.length) body.push(IL.section(U.plural(low.length, 'student') + ' under 35% on it', R.pills(low.map(function (sid) { var c = g.cells[sid + '|' + k]; return { sid: sid, hot: true, tip: c.ok + ' of ' + c.n + ' right first time' }; }), low, 12)));
      body.push(h('div', { class: 'actions' },
        low.length ? h('button', { class: 'btn primary', tip: IL.names(low, 12), on: { click: function () { IL.closeDrawer(); IL.builder({ recipe: 'Remediation', minutes: 10, sids: low, skills: [k], reason: sk.name }); } } }, 'Assign practice to ' + (low.length === 1 ? IL.nm(low[0]) : low.length + ' students')) : null,
        h('button', { class: 'btn', on: { click: function () { IL.state.view.gridTb = tbId; IL.state.view.path = [sub.chapter, subId]; IL.state.view.students = 'unit'; IL.closeDrawer(); IL.go({ tab: 'students', student: null }); } } }, 'Each student on this subunit')));
    }
    var others = U.uniq((sk.taught || []).concat(sk.assessed || [])).filter(function (id) { return id !== subId && tb.subs[id]; });
    if (others.length) body.push(IL.section('Also in', others.map(function (id) {
      var o = tb.subs[id];
      return h('p', null, h('a', { on: { click: function () { IL.state.view.gridTb = tbId; IL.state.view.path = [o.chapter, id]; IL.closeDrawer(); IL.render(); } } }, o.code + ' ' + o.name));
    })));
    IL.drawer(sk.name, tb.short + ' · ' + sub.code + ' ' + sub.name, body);
  };
  IL.unitMap = function (ctx, mode) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st, R = IL.R, und = mode === 'understanding';
    var tbId = IL.mapTb(ctx), tb = world.textbooks[tbId], P = M.progress(world, sec, tbId, Array.isArray(st.view.path) ? st.view.path : []), g = P.grid, path = g.path, level = g.level;
    st.view.path = path;
    var set = function (p) { return function () { IL.go({ view: Object.assign({}, st.view, { path: p }) }); }; };
    var sep = function () { return h('span', { class: 'sep' }, '›'); };
    var crumbs = [h('a', { class: path.length ? '' : 'on', on: { click: set([]) } }, tb.supplemental ? 'All units' : 'All chapters')];
    if (!tb.supplemental && path.length) crumbs.push(sep(), h('a', { class: path.length === 1 ? 'on' : '', on: { click: set(path.slice(0, 1)) } }, g.chapter.num + ' ' + g.chapter.name));
    if (level === 'skill') crumbs.push(sep(), h('a', { class: 'on' }, g.sub.code + ' ' + g.sub.name));
    var also = [und ? ['Progress', function () { IL.go({ tab: 'progress', focus: 'PR-1' }); }] : ['Understanding', function () { IL.go({ tab: 'understanding', focus: 'UN-1' }); }],
      ['Each student', function () { st.view.students = 'unit'; IL.go({ tab: 'students', student: null }); }]];
    var pickTb = sec.textbooks.length > 1 && st.tb === 'all' ? h('div', { class: 'chips', style: 'margin-bottom:10px' }, h('span', { class: 'sub' }, 'Textbook'),
      sec.textbooks.map(function (x) { return h('button', { class: 'chip' + (x.tb.id === tbId ? ' on' : ''), on: { click: function () { IL.go({ view: Object.assign({}, st.view, { gridTb: x.tb.id, path: [] }) }); } } }, h('i', { class: 'dot', style: 'background:' + x.tb.accent }), x.tb.short, h('small', null, x.role === 'primary' ? 'primary' : x.tb.kind.toLowerCase())); })) : null;
    // a typical result and learning bands exist for the main textbook's chapters and subunits
    var stat = {};
    m.topics.forEach(function (t) { if (t.stat) stat[t.chapter.id] = t.stat; t.subs.forEach(function (x) { stat[x.sub.id] = x.stat; }); });
    // at skill level: the skills the subunit teaches, then any other skill its questions are tagged with
    var items = level === 'skill'
      ? g.sub.skills.concat(g.cols.map(function (c) { return c.id; }).filter(function (k) { return g.sub.skills.indexOf(k) < 0; })).map(function (k) {
        var col = g.cols.filter(function (c) { return c.id === k; })[0] || null;
        return { id: k, code: '', name: world.skills[k].name, col: col, none: !col, why: g.sub.taughtOnly.indexOf(k) >= 0 ? 'taught here, no questions' : 'not started' };
      })
      : g.cols.map(function (col) { return { id: col.id, code: col.label, name: col.name, col: col, none: !col.open, why: 'not started' }; });
    var open = function (x) { return level === 'skill' ? function () { IL.openSkill(x.id, tbId, g.sub.id); } : set(path.concat([x.id])); };
    var noun = level === 'chapter' ? (tb.supplemental ? 'Unit' : 'Chapter') : level === 'sub' ? 'Subunit' : 'Skill', next = level === 'chapter' ? 'its subunits' : level === 'sub' ? 'its skills' : 'its questions';
    var lab = function (x) { return h('span', { class: 'lab', title: x.name }, x.code ? h('b', null, x.code) : null, x.name); };
    var row = function (x, cells) {
      var fn = open(x);
      return h('div', { class: 'um-row' + (x.none ? ' off' : ''), tabindex: 0, role: 'button', tip: 'Open ' + next, on: { click: fn, keydown: function (e) { if (e.key === 'Enter') fn(); } } }, lab(x), cells, h('span', { class: 'um-go' }, '›'));
    };
    var head, rows, legend = null;
    if (und) {
      var vals = items.map(function (x) {
        var s = stat[x.id], o = { s: s, val: null, norm: null };
        if (s && s.n) { o.v = M.vsTypical(s.onNorm != null ? s.onNorm : s.fts, s.norm); o.val = o.v.gap != null ? s.onNorm : s.fts; o.norm = o.v.gap != null ? s.norm : null; }
        else if (x.col && x.col.classFts != null) { o.val = x.col.classFts; o.v = { gap: null, tone: '' }; }
        return o;
      });
      var banded = vals.filter(function (o) { return o.s && o.s.bands; });
      var dv = banded.length ? Math.max.apply(null, banded.map(function (o) { var L = o.s.bands.levels; return Math.max(L[0] + L[1] + L[2] / 2, L[2] / 2 + L[3] + L[4]); })) : 1;
      head = [h('span', null, level === 'skill' ? 'Class, right first time' : 'Right first time' + (m.caps.norms ? ' · black line is typical' : '')), h('span'),
        h('span', null, level === 'skill' ? 'Questions' : ''), h('span', null, level === 'skill' ? 'Students under 35%' : banded.length ? 'Students by learning band, weakest on the left' : '')];
      rows = items.map(function (x, i) {
        var o = vals[i], col = x.col, low, last;
        if (o.val == null) return row(x, [h('span', { class: 'um-none' }, x.why), h('span'), h('span'), h('span')]);
        if (level === 'skill') {
          var ans = m.roster.filter(function (s) { var c = g.cells[s.id + '|' + x.id]; return c && c.n >= 2; }), under = ans.filter(function (s) { return g.cells[s.id + '|' + x.id].fts < 0.35; });
          low = o.val < 0.35;
          last = [h('span', { class: 'sub' }, String(col.questions)), h('span', { class: under.length ? 'um-low' : 'sub', tip: under.length ? IL.names(under.map(function (s) { return s.id; }), 14) : null }, under.length ? under.length + ' of ' + ans.length : 'none')];
        } else {
          low = o.v.tone === 'bad' || o.v.tone === 'warn';
          last = [o.v.gap != null ? h('span', { class: low ? 'tag warn' : 'sub' }, o.v.word) : h('span'), o.s && o.s.bands ? C.diverge(o.s.bands.levels, M.BANDS, dv) : h('span')];
        }
        return row(x, [R.meter([{ v: o.val, tone: low ? 'amber' : 'blue' }], o.norm, o.norm != null ? 'Typical: ' + pct(o.norm) : null), h('b', null, pct(o.val))].concat(last));
      });
      if (banded.length) legend = C.legend(M.BANDS.map(function (b, i) { return { cls: 's-b' + i, label: b }; }));
    } else {
      head = [h('span', null, 'Students'), h('span', { class: 'num' }, 'Done'), h('span', { class: 'num' }, 'In progress'), h('span', { class: 'num' }, 'Not started')];
      rows = items.map(function (x) {
        var o = x.col ? P.by[x.col.id] : null;
        if (!o || x.none) return row(x, [h('span', { class: 'um-none' }, x.why), h('span'), h('span'), h('span')]);
        return row(x, [C.split([{ n: o.done.length, cls: 's-done', label: 'Done', sids: o.done }, { n: o.inProgress.length, cls: 's-prog', label: 'In progress', sids: o.inProgress }, { n: o.notStarted.length, cls: 's-none', label: 'Not started', sids: o.notStarted }], { size: 'tall' }),
          h('b', { class: 'num' }, String(o.done.length)), h('span', { class: 'num' }, String(o.inProgress.length)), h('span', { class: 'num' }, String(o.notStarted.length))]);
      });
      legend = C.legend([{ cls: 's-done', label: 'done: 80% or more of its work solved' }, { cls: 's-prog', label: 'in progress' }, { cls: 's-none', label: 'not started' }]);
    }
    return [pickTb,
      h('div', { class: 'um-top' }, h('div', { class: 'crumbs' }, crumbs), h('span', { class: 'um-also' }, 'Same place in ', also.map(function (a, i) { return [i ? ' · ' : '', h('a', { on: { click: a[1] } }, a[0])]; }))),
      h('div', { class: 'um ' + (und ? 'und' : 'prog') }, h('div', { class: 'um-row um-head' }, h('span', null, noun), head, h('span')), rows), legend];
  };

  // ---------- Brief ----------
  IL.tabs.brief = { label: 'Brief', question: 'What needs me this week?',
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st, ins = ctx.ins, p = m.pulse, cards = ins.cards, vt = ins.vsTypical;

      // the written brief: the class in one line, the teaching priority, who to check on
      var br = h('div', { class: 'brief-ai' });
      ins.brief.parts.forEach(function (part) {
        var span = h('span', { class: 'bp bp-' + part.kind }, part.lead ? h('b', null, part.lead) : null,
          part.theme ? h('a', { on: { click: function () { IL.openTheme(part.theme); } } }, part.text) : part.text, ' ');
        br.appendChild(span);
      });
      el.appendChild(br);

      // four tiles: each number says what it counts, and carries a verdict where one can be given
      var tiles = h('div', { class: 'grid g4 tiles4' });
      var inactive = cards['BR-1a'].rows;
      tiles.appendChild(h('section', { class: 'card tile', on: { click: function () { IL.go({ tab: 'engagement' }); } } },
        h('div', { class: 'label' }, 'Active in the last class week'), h('div', { class: 'value' }, p.active.n + ' of ' + p.active.of + ' students'),
        C.dots(p.active.dots.map(function (d) { return { sid: d.sid, cls: d.on ? '' : 'off', tip: d.on ? 'active' : 'no recorded activity' }; })),
        h('div', { class: 'foot' }, inactive.length ? h('span', null, 'Not active: ', IL.whoList(inactive, 3)) : h('span', null, 'Everyone was active.'), h('span', null, 'week of ' + T.fmtDay(p.week * 7)))));
      var wk = cards['BR-1b'];
      tiles.appendChild(h('section', { class: 'card tile', on: { click: function () { IL.go({ tab: 'progress' }); } } },
        h('div', { class: 'label' }, 'Assigned work due in this window'),
        !wk.ok ? h('p', { class: 'empty nodata' }, wk.nodata) : !p.work.cells ? h('p', { class: 'empty' }, 'Nothing was due in this window.') : [
          h('div', { class: 'value' }, pct(p.work.onTime / p.work.cells) + ' started on time'),
          C.split([{ n: p.work.onTime, cls: 's-done', label: 'Started on time' }, { n: p.work.late, cls: 's-warn', label: 'Started after the due date' }, { n: p.work.none, cls: 's-none', label: 'Not started' }], { size: 'tall' }),
          h('div', { class: 'foot' }, h('span', null, p.work.onTime + ' on time · ' + p.work.late + ' late · ' + p.work.none + ' not started'), h('span', null, 'of ' + p.work.cells + ' student-assignments · ' + pct(p.work.completed / p.work.cells) + ' finished'))]));
      tiles.appendChild(h('section', { class: 'card tile', on: { click: function () { IL.go({ tab: 'understanding' }); } } },
        h('div', { class: 'label' }, 'Right first time in this window'),
        p.fts.p == null ? h('p', { class: 'empty' }, 'No graded answers in this window.') : [
          h('div', { class: 'value' }, pct(vt.gap != null ? p.fts.classOnNorm : p.fts.p), h('span', { class: 'tag ' + (vt.tone === 'bad' || vt.tone === 'warn' ? 'warn' : vt.tone === 'good' ? 'good' : '') }, vt.word)),
          vt.gap != null ? C.track({ value: p.fts.classOnNorm, ref: p.fts.norm, w: 230, valueLabel: 'this class', refLabel: 'typical for the same questions' }) : null,
          h('div', { class: 'foot' }, h('span', null, vt.gap != null ? '● this class   ┃ typical ' + pct(p.fts.norm) + ' on the same questions' : 'There is nothing to compare with yet.'), h('span', null, (vt.gap != null ? p.fts.nn : p.fts.n) + ' first answers'))]));
      var w = m.waiting, adm = ins.admin[0];
      tiles.appendChild(h('section', { class: 'card tile', on: { click: function () { IL.go({ tab: 'progress', focus: 'PR-7' }); } } },
        h('div', { class: 'label' }, 'Waiting on you'), h('div', { class: 'value' }, w.toGrade + ' to grade', w.toGrade ? h('span', { class: 'tag ' + (w.oldestDays >= 3 ? 'warn' : '') }, 'oldest ' + U.plural(w.oldestDays, 'day')) : null),
        h('div', { class: 'lines' }, h('div', null, U.plural(w.questions.length, 'student question') + ' unanswered'), h('div', null, U.plural(w.failed.length, 'auto-grading failure'))),
        adm ? h('div', { class: 'foot' }, IL.actBtn(adm.act, 'small primary')) : null));
      el.appendChild(tiles);

      // two lists that never compete for the same rows, each ranked by impact
      var qc = h('section', { class: 'card', style: 'margin-bottom:14px', 'data-card': 'BR-2' });
      var total = ins.top.length + ins.rest.length;
      qc.appendChild(h('div', { class: 'card-head' }, h('h3', null, 'This week'), h('span', { class: 'sub' }, total ? ins.top.length + ' of ' + total + ' findings shown, ranked by how many students each affects, how badly and how soon' : '')));
      ['teach', 'people'].forEach(function (name) {
        var L = ins.lists[name];
        qc.appendChild(h('h4', { class: 'list-head' }, L.title, L.top.length ? h('span', { class: 'sub' }, ' ' + L.top.length) : null));
        if (!L.top.length) qc.appendChild(h('p', { class: 'empty' }, name === 'teach' ? 'Nothing class-wide has fired.' : 'No one is flagged.'));
        L.top.forEach(function (th, i) { qc.appendChild(IL.themeRow(th, i + 1)); });
      });
      if (ins.rest.length) {
        var open = !!st.more.rest;
        qc.appendChild(h('div', { class: 'more-row' }, h('button', { class: 'link-btn', 'aria-expanded': open ? 'true' : 'false', on: { click: function () { st.more.rest = !open; IL.render(); } } }, (open ? '▾ ' : '▸ ') + ins.rest.length + ' more, lower impact')));
        if (open) ins.rest.forEach(function (th) { qc.appendChild(IL.themeRow(th, null, true)); });
      }
      ins.good.filter(function (g) { return !g.state; }).forEach(function (g) {
        qc.appendChild(h('div', { class: 'q-row compact good', tabindex: 0, role: 'button', on: { click: function () { IL.openSignal(g, g.key); } } }, h('span', { class: 'rank' }, ''),
          h('span', { class: 'text' }, h('span', { class: 'tagline' }, h('span', { class: 'tag good' }, 'Good news')), g.text), IL.actBtn(g.act, 'small', g.key)));
      });
      var handled = ins.handled.concat(ins.good.filter(function (g) { return g.state; }));
      if (handled.length) {
        var hOpen = !!st.more.handled;
        qc.appendChild(h('div', { class: 'more-row' }, h('button', { class: 'link-btn', on: { click: function () { st.more.handled = !hOpen; IL.render(); } } }, (hOpen ? '▾ ' : '▸ ') + handled.length + ' dealt with or set aside in this session')));
        if (hOpen) handled.forEach(function (th) {
          qc.appendChild(h('div', { class: 'q-row compact' }, h('span', { class: 'rank' }, ''), h('span', { class: 'text' }, h('span', { class: 'tagline' }, h('span', { class: 'tag' }, th.state === 'done' ? 'done' : th.state === 'later' ? 'not now' : 'not relevant')), th.text),
            h('button', { class: 'btn small', on: { click: function () { delete st.cards[th.key]; IL.render(); } } }, 'Put back')));
        });
      }
      el.appendChild(qc);
      IL.openers.q0 = function () { if (ins.top[0]) IL.openTheme(ins.top[0]); };
      IL.openers.q1 = function () { var t = ins.lists.people.top[0]; if (t) IL.openTheme(t); };
      IL.openers.builder = function () { var t = ins.top.filter(function (x) { return x.act && x.act.kind === 'builder'; })[0]; if (t) IL.run(t.act, t.key); };

      // since the last visit, and follow-ups whose recheck has arrived
      var s = m.since, ch = h('div', { class: 'changes' });
      s.resolved.slice(0, 3).forEach(function (x) { ch.appendChild(h('div', null, h('span', { class: 'mk ok' }, '✓'), h('span', null, 'Not started on “' + x.a.short + '”'), h('b', null, x.then + ' → ' + x.now + ' students'))); });
      s.grew.slice(0, 2).forEach(function (x) { ch.appendChild(h('div', null, h('span', { class: 'mk up' }, '▲'), h('span', null, 'Still failing “' + x.item.name + '”'), h('b', null, x.then + ' → ' + x.now + ' students'))); });
      if (s.joined.length) ch.appendChild(h('div', null, h('span', { class: 'mk new' }, '+'), h('span', null, IL.whoList(s.joined), ' joined the roster'), h('span')));
      ch.appendChild(h('div', null, h('span', { class: 'mk new' }, '+'), h('span', null, 'New work from ' + U.plural(s.newWork.students, 'student')), h('b', null, s.newWork.attempts + ' questions answered')));
      var due = m.followups.filter(function (f) { return f.status === 'recheck due'; });
      el.appendChild(h('div', { class: 'grid g2' },
        C.card({ title: 'Since your last visit', sub: T.fmtDayLong(T.day(s.t)) + ' afternoon', body: ch,
          tools: [h('button', { class: 'link-btn', on: { click: function () { IL.go({ tab: 'students', view: Object.assign({}, st.view, { students: 'movement' }) }); } } }, 'Movement →')] }),
        C.card({ title: 'Follow-ups due', sub: due.length ? U.plural(due.length, 'recheck is', 'rechecks are') + ' ready' : 'Nothing due',
          body: due.length ? due.map(function (f) {
            var ci = f.action.kind === 'check-in';
            return h('div', { class: 'fu-line', on: { click: function () { IL.go({ tab: 'followups', focus: 'fu-' + f.action.id }); } } },
              h('div', { style: 'font-weight:600;font-size:13px' }, f.action.title, ' ', h('span', { class: 'sub' }, '· ' + U.plural(f.action.students.length, 'student') + ' · ' + T.fmtDay(f.action.day))),
              ci ? h('div', { class: 'sub' }, f.rows.filter(function (r) { return r.state !== 'active'; }).length + ' of ' + f.rows.length + ' still with no recorded activity')
                : h('div', { class: 'sub' }, pct(f.before) + ' → ' + pct(f.after) + ' on new questions · ' + IL.followupWords(f)));
          }) : h('p', { class: 'empty' }, 'Actions you take from a finding appear here when their recheck date arrives.'),
          tools: [h('button', { class: 'link-btn', on: { click: function () { IL.go({ tab: 'followups' }); } } }, 'All follow-ups →')] })));
    } };

  // ---------- Progress ----------
  IL.tabs.progress = { label: 'Progress', question: 'Where is the class in the material, and is assigned work getting done?',
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st, ins = ctx.ins, cards = ins.cards;
      var cur = m.pace[m.pace.length - 1], wt = m.waiting, tm = m.timing;
      IL.layout(el, ctx, this, [
        { id: 'PR-1', build: function () { return { body: IL.unitMap(ctx, 'progress') }; } },
        { id: 'PR-2', half: true, build: function (c) {
          return { body: cur ? [h('p', { class: 'sub' }, 'Chapter ' + cur.unit.num + ' · percent complete · ' + (cur.dots.length > 80 ? 'columns count students' : 'one bubble per student') + ' · the shaded band is within 15 points of the median'), IL.pacePicture(cur)] : null,
            table: cur ? function () { return C.table(['Student', 'Chapter ' + cur.unit.num + ' complete'], cur.dots.slice().sort(U.by(function (d) { return d.pc; })).map(function (d) { return [IL.nm(d.sid), d.pc + '%']; })); } : null,
            actions: cur ? [IL.listBtn('Catch-up for', c.rows, function (list) { IL.toast('Would open Create Coursework with a catch-up set for ' + U.plural(list.length, 'student') + '.'); }),
              IL.listBtn('Challenge for', ids(cur.ahead), function (list) { IL.builder({ recipe: 'Challenge', minutes: 20, sids: list, skills: m.next ? m.next.sub.skills.slice(0, 2) : [], reason: 'ahead of the class' }); })] : null };
        } },
        { id: 'PR-7', half: true, build: function () {
          return { body: [wt.byAsg.map(function (x) { return h('div', { class: 'split-row', style: 'grid-template-columns:1fr auto auto;cursor:pointer', on: { click: function () { IL.toast('Would open the grading view for ' + x.a.short + '.'); } } },
            h('span', { class: 'lab' }, x.a.short), h('b', null, x.n + ' to grade'), h('span', { class: 'tag ' + (T.day(world.now) - T.day(x.oldest) >= 3 ? 'warn' : '') }, 'oldest ' + T.ago(x.oldest, world.now))); }),
            h('div', { class: 'dr-sec', style: 'margin-top:10px;padding-top:10px' }, h('h4', null, U.plural(wt.questions.length, 'question') + ' waiting for a reply'), wt.questions.map(function (q) { return h('p', { style: 'font-size:12.5px;margin-bottom:4px' }, IL.who(q.sid, ids(wt.questions)), ' · ' + sec.items[q.item].subCode + ' · ' + T.ago(q.t, world.now), h('br'), h('span', { class: 'sub' }, '“' + q.text + '”')); })),
            h('p', { class: 'note' }, U.plural(wt.failed.length, 'auto-grading failure') + ' ', wt.failed.length ? h('a', { on: { click: function () { IL.toast('Would retry auto-grading for ' + U.plural(wt.failed.length, 'submission') + '.'); } } }, 'Retry all ' + wt.failed.length) : null)],
            actions: ins.admin[0] ? [IL.actBtn(ins.admin[0].act, 'primary')] : null };
        } },
        { id: 'PR-3', build: function () {
          var rows = m.funnel.rows, showAll = st.view.funnel === 'all', vis = showAll ? rows : rows.slice(-10), tbody = [], lastCh = null;
          vis.forEach(function (x) {
            var chKey = x.a.kind === 'lesson' ? x.a.chapterNum : null;
            if (chKey && chKey !== lastCh) { tbody.push(h('tr', { class: 'sep' }, h('td', { colspan: 4 }, 'Chapter ' + chKey))); }
            if (chKey) lastCh = chKey;
            tbody.push(h('tr', { class: 'click', on: { click: function () { IL.toast('Would open the coursework dashboard for ' + x.a.short + '.'); } } },
              h('td', { style: 'white-space:nowrap;width:70px' }, T.fmtDay(x.a.dueDay)),
              h('td', { style: 'width:34%' }, x.a.short, x.a.audience ? h('span', { class: 'sub' }, ' · ' + x.a.audience) : null, x.a.kind !== 'lesson' ? h('span', { class: 'tag', style: 'margin-left:6px' }, x.a.kind === 'supp' ? IL.world.textbooks[x.a.tb].kind : x.a.kind) : null),
              h('td', null, C.split(IL.funnelSegs(x))),
              h('td', { class: 'num', style: 'white-space:nowrap;width:260px' }, h('b', null, pct(x.eligible.length ? x.completed.length / x.eligible.length : 0)), ' · ' + x.completed.length + ' of ' + x.eligible.length + ' done', x.toGrade ? h('span', { class: 'tag teacher', style: 'margin-left:6px' }, x.toGrade + ' to grade') : null,
                x.decay ? h('span', { class: 'tag warn', style: 'margin-left:6px', tip: 'Completed fell from ' + x.decay.from + ' to ' + x.decay.to + ' across this chapter' }, '▼ ' + (x.decay.from - x.decay.to) + ' fewer') : null)));
          });
          return { body: [h('div', { class: 'scroll-x' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Due'), h('th', null, 'Assignment'), h('th', null, 'Eligible students'), h('th', { class: 'num' }, 'Done'))), h('tbody', null, tbody))),
            C.legend([{ cls: 's-done', label: 'completed' }, { cls: 's-prog', label: 'in progress' }, { cls: 's-none', label: 'not started' }]),
            h('div', { class: 'actions' }, rows.length > 10 ? h('button', { class: 'btn small', on: { click: function () { st.view.funnel = showAll ? null : 'all'; IL.render(); } } }, showAll ? 'Show the latest 10' : 'Show all ' + rows.length) : null,
              m.funnel.zero.length ? h('span', { class: 'sub' }, 'No one has started (' + m.funnel.zero.length + '): ' + m.funnel.zero.map(function (a) { return a.name; }).join(' · ')) : null)] };
        } },
        { id: 'PR-4', half: true, build: function (c) {
          var ongoing = m.streaks.rows.filter(function (r) { return r.ongoing; });
          return { body: [IL.streakPicture(m, ongoing.slice(0, 10)), ongoing.length > 10 ? h('p', { class: 'sub' }, '+' + (ongoing.length - 10) + ' more') : null,
            c.ended && c.ended.length ? h('p', { class: 'note' }, h('b', null, 'Runs that have ended, not counted: '), IL.whoList(ids(c.ended), 8)) : null],
            actions: [IL.listBtn('Check in with', ids(ongoing.filter(function (r) { return !r.never; })), function (list) { IL.logCheckin(list); })] };
        } },
        { id: 'PR-5', half: true, build: function (c) {
          return { body: [h('p', { class: 'sub' }, 'Share of started work that began late, by assignment'),
            tm.rows.map(function (r) { var late = r.lastDay + r.after; return C.splitRow(r.a.short, [{ n: r.after, cls: 's-warn', label: 'After the due date' }, { n: r.lastDay, cls: 's-warn2', label: 'Last 24 hours' }, { n: r.early, cls: 's-mute', label: 'Early' }], h('span', null, h('b', null, pct(r.started ? late / r.started : 0) + ' late'), ' · ' + late + ' of ' + r.started)); }),
            C.legend([{ cls: 's-warn', label: 'after the due date' }, { cls: 's-warn2', label: 'in the last 24 hours' }, { cls: 's-mute', label: 'started early' }]),
            tm.students.length ? [h('p', { class: 'sub', style: 'margin:12px 0 4px' }, 'Usually late (last ' + tm.rows.length + ' assignments)'),
              C.register({ cols: tm.rows.map(function (r) { return { label: r.a.short.split(' ')[0], tip: r.a.short }; }), noteHead: '',
                rows: tm.students.slice(0, 6).map(function (x) { return { sid: x.sid, cells: x.cells, note: x.late + ' of ' + x.started + ' late' }; }), words: { early: 'started early', last: 'started in the last 24 hours', after: 'started after the due date', none: 'not started', na: 'not assigned' } }),
              tm.students.length > 6 ? h('p', { class: 'sub' }, '+' + (tm.students.length - 6) + ' more') : null] : null] };
        } },
        { id: 'PR-6', half: true, build: function () {
          var maxQ = Math.max.apply(null, m.balance.map(function (x) { return x.questions; }));
          return { body: C.bars(m.balance.map(function (x) { return { label: h('span', null, h('i', { class: 'dot', style: 'background:' + x.tb.accent + ';margin-right:6px' }), x.tb.name), v: x.questions, color: x.tb.accent,
            text: x.questions + ' questions · ' + x.students + ' students · first try ' + pct(x.fts), tip: x.tb.name + ' (' + x.role + ')\n' + x.n + ' first attempts' }; }), { max: maxQ, span: 46 }) };
        } }
      ]);
    } };

  // ---------- Understanding ----------
  IL.tabs.understanding = { label: 'Understanding', question: 'What do they get, what don’t they, and why?',
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st, ins = ctx.ins, N = m.roster.length;
      var rosterIds = m.roster.map(function (s) { return s.id; });
      var view = st.view.understanding || 'topics';
      IL.layout(el, ctx, this, [
        { id: 'UN-1', build: function () {
          var skillsView = null;
          if (view === 'skills') {
            var filt = st.view.skillFilter || 'touched';
            var list = m.allSkills.filter(function (x) { return filt === 'all' ? true : filt === 'blind' ? x.blind && x.touched : filt === 'weak' ? x.stat && x.stat.solid && x.stat.p < 0.35 : x.touched; })
              .sort(function (a, b) { return (a.stat ? a.stat.p : 2) - (b.stat ? b.stat.p : 2); });
            skillsView = h('div', null, h('div', { class: 'chips', style: 'margin-bottom:8px' }, [['touched', 'Reached by the class'], ['weak', 'Weak'], ['blind', 'No questions'], ['all', 'All in these textbooks']].map(function (f) {
              return h('button', { class: 'chip' + (filt === f[0] ? ' on' : ''), on: { click: function () { st.view.skillFilter = f[0]; IL.render(); } } }, f[1]);
            }), h('span', { class: 'sub', style: 'margin-left:8px' }, list.length + ' skills')),
              h('div', { style: 'max-height:420px;overflow:auto' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Skill'), sec.textbooks.map(function (x) { return h('th', null, h('i', { class: 'dot', style: 'background:' + x.tb.accent + ';margin-right:5px' }), x.tb.short); }), h('th', null, 'Class first try'))),
                h('tbody', null, list.slice(0, 60).map(function (x) {
                  return h('tr', null, h('td', null, x.skill.name), sec.textbooks.map(function (tbx) {
                    var f = x.foot.filter(function (ff) { return ff.tb.id === tbx.tb.id; })[0];
                    return h('td', null, f ? f.marks.map(function (k) { return h('span', { class: 'foot-mark', tip: k.sub.code + ' ' + k.sub.name + '\n' + (k.role === 'teach' ? 'taught, no questions' : k.role === 'assess' ? 'questions' : 'taught and has questions') + (k.open ? '' : '\nnot reached by the class yet') },
                      h('i', { class: 'fm ' + k.role + (k.open ? '' : ' closed') }), k.sub.code); }) : h('span', { class: 'sub' }, '–'));
                  }), h('td', { style: 'white-space:nowrap' }, x.blind ? h('span', { class: 'tag' }, 'no questions') : x.stat ? [C.meter(x.stat.p), ' ' + pct(x.stat.p) + ' · ' + x.stat.nStudents + ' students'] : h('span', { class: 'sub' }, 'not reached')));
                })))),
              C.legend([{ cls: 'fm teach', label: 'taught only' }, { cls: 'fm both', label: 'taught and has questions' }, { cls: 'fm assess', label: 'questions (supplemental)' }]));
          }
          return { tools: [h('span', { class: 'chips' }, h('button', { class: 'chip' + (view === 'topics' ? ' on' : ''), on: { click: function () { st.view.understanding = 'topics'; IL.render(); } } }, 'By chapter'),
            h('button', { class: 'chip' + (view === 'skills' ? ' on' : ''), on: { click: function () { st.view.understanding = 'skills'; IL.render(); } } }, 'All skills'))],
            body: view === 'skills' ? skillsView : IL.unitMap(ctx, 'understanding') };
        } },
        { id: 'UN-2', half: true, build: function (c) {
          var roots = m.gaps.roots, top = roots[0];
          return { sub: m.gaps.weak + ' weak skills among ' + m.gaps.solid + ' with solid class evidence' + (m.gaps.graph ? ' reduce to ' + U.plural(roots.length, 'root gap') : ''),
            body: top ? h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Fix first'), h('th', null, 'Class, right first time'), h('th', { class: 'num' }, 'Students under 35%'), h('th', { class: 'num' }, 'Later skills that need it'), h('th'))),
              h('tbody', null, roots.map(function (r, i) {
                return h('tr', { class: 'click', on: { click: function () { IL.openGap(r); } } }, h('td', null, (i + 1) + '  ' + r.skill.name),
                  h('td', { style: 'white-space:nowrap' }, C.meter(r.stat.p), ' ', h('b', null, pct(r.stat.p)), h('span', { class: 'sub' }, ' · ' + U.plural(r.stat.nItems, 'question'))),
                  h('td', { class: 'num' }, r.below.length + ' of ' + r.stat.nStudents),
                  h('td', { class: 'num' }, m.gaps.graph ? r.blocked.length + (r.inSkipped.length ? ' (+' + r.inSkipped.length + ' in a skipped unit)' : '') : '–'),
                  h('td', { class: 'num' }, h('span', { class: 'link-btn' }, 'Evidence')));
              }))) : null };
        } },
        { id: 'UN-5', half: true, build: function () {
          var LAB = { fillintheblank: 'Fill-in', dragndrop: 'Drag and drop', mchoice: 'Multiple choice', parsonsprob: 'Parsons', activecode: 'Code' };
          return { body: [h('p', { class: 'sub' }, 'By depth · right first time · first attempts'), C.bars(m.depth.map(function (d) { return { label: ['', 'Recall', 'Apply', 'Reason'][d.key], v: d.p, text: pct(d.p) + ' · ' + d.n + ' attempts' }; }), { max: 1, span: 55 }),
            h('p', { class: 'sub', style: 'margin-top:10px' }, 'By format' + (m.caps.norms ? ' (● class, ┃ typical)' : '')), m.format.map(function (f) {
              return h('div', { class: 'split-row', style: 'grid-template-columns:110px 170px auto' }, h('span', null, LAB[f.key] || f.key), C.track({ value: f.p, ref: f.norm, w: 170, valueLabel: 'this class', refLabel: 'typical' }), h('span', { class: 'val' }, pct(f.p) + (f.norm != null ? ' · typical ' + pct(f.norm) : '')));
            })] };
        } },
        { id: 'UN-3', build: function (c) {
          var rt = m.reteach, show = rt.slice(0, 4);
          return { body: [h('div', { class: 'grid g2' }, show.map(function (r) {
            return h('div', { class: 'inner' },
              h('div', { style: 'font-weight:600;font-size:13px;margin-bottom:2px' }, h('a', { on: { click: function () { IL.ev.item(r.item.id); } } }, r.item.name), ' ', h('span', { class: 'tag ' + (r.tier === 1 ? 'warn' : '') }, r.tier === 1 ? 'wrong beats right' : 'one wrong answer dominates')),
              h('div', { class: 'sub', style: 'margin-bottom:6px' }, r.item.subCode + ' · ' + r.n + ' answered · ' + r.correct + ' right first time'),
              C.options({ item: r.item, picks: r.picks, top: r.top }),
              h('div', { class: 'actions' }, IL.listBtn('Exit Ticket for', rosterIds, function (list) { IL.builder({ recipe: 'Exit Ticket', minutes: 8, sids: list, skills: r.item.skills, reason: r.item.name }); }, 'small primary'),
                h('button', { class: 'btn small', on: { click: function () { IL.ev.item(r.item.id); } } }, 'What happened next')));
          })), rt.length > show.length ? h('p', { class: 'sub', style: 'margin-top:8px' }, 'Showing ' + show.length + ' of the ' + rt.length + ' questions that meet the rule. The rest: ', rt.slice(show.length).map(function (r, i) { return [i ? ' · ' : '', h('a', { on: { click: function () { IL.ev.item(r.item.id); } } }, r.item.name)]; })) : null] };
        } },
        { id: 'UN-4', build: function () {
          return { body: h('div', { class: 'grid g2' }, m.code.slice(0, 4).map(function (c) {
            return h('div', { class: 'inner' },
              h('div', { style: 'font-weight:600;font-size:13px;margin-bottom:6px' }, h('a', { on: { click: function () { IL.ev.item(c.item.id); } } }, c.item.name), h('span', { class: 'sub', style: 'font-weight:400' }, ' · ' + c.item.subCode + ' · ' + c.n + ' ran code')),
              IL.codePicture(c), h('div', { class: 'actions' }, h('button', { class: 'btn small primary', on: { click: function () { IL.ev.item(c.item.id); } } }, 'Open the runs'),
                IL.listBtn('Parsons version for', c.failing, function (list) { IL.builder({ recipe: 'Practice', minutes: 15, sids: list, skills: c.item.skills, reason: c.item.name }); }, 'small')));
          })) };
        } },
        { id: 'UN-7', half: true, build: function () {
          var row = function (r) { return h('div', { class: 'split-row', style: 'grid-template-columns:minmax(120px,1fr) 170px auto;cursor:pointer', on: { click: function () { IL.ev.item(r.item.id); } } }, h('span', { class: 'lab' }, r.item.name), C.track({ value: r.p, ref: r.norm, w: 170, valueLabel: 'this class', refLabel: 'typical' }), h('span', { class: 'val' }, pct(r.p) + ' against ' + pct(r.norm))); };
          return { body: [h('p', { class: 'sub' }, '● this class   ┃ typical · showing ' + Math.min(5, m.vsNorm.below.length) + ' of ' + m.vsNorm.below.length), m.vsNorm.below.slice(0, 5).map(row),
            m.vsNorm.above.length ? [h('p', { class: 'sub', style: 'margin-top:10px' }, 'Easier here · showing ' + Math.min(3, m.vsNorm.above.length) + ' of ' + m.vsNorm.above.length), m.vsNorm.above.slice(0, 3).map(row)] : null] };
        } },
        { id: 'UN-8', half: true, build: function (c) {
          var trList = m.traj.drop.concat(m.traj.sustained);
          return { body: [IL.trajPicture(m, trList.slice(0, 6)), trList.length > 6 ? h('p', { class: 'sub' }, '+' + (trList.length - 6) + ' more: ', IL.whoList(ids(trList.slice(6)), 8)) : null],
            actions: [IL.listBtn('Check in with', c.rows, function (list) { IL.logCheckin(list); })] };
        } },
        { id: 'UN-9', half: true, build: function () {
          var nx = m.next, MARK = { solid: ['●', 'solid', 'good'], mixed: ['◐', 'mixed', ''], shaky: ['◐', 'shaky', 'warn'], unseen: ['○', 'not yet seen', ''] };
          if (!nx) return {};
          var shaky = nx.rows.filter(function (r) { return r.state === 'shaky'; });
          return { body: [h('table', { class: 't' }, h('tbody', null, nx.rows.map(function (r) {
            var mk = MARK[r.state];
            return h('tr', null, h('td', { style: 'width:110px' }, h('span', { class: 'tag ' + mk[2] }, mk[0] + ' ' + mk[1])), h('td', null, r.skill.name),
              h('td', { class: 'num' }, r.stat ? [C.meter(r.stat.p), ' ' + pct(r.stat.p)] : '–'), h('td', { class: 'num sub' }, r.shaky.length ? U.plural(r.shaky.length, 'student') + ' shaky' : ''));
          }))), nx.multi.length ? h('p', { class: 'note' }, h('b', null, U.plural(nx.multi.length, 'student is', 'students are') + ' shaky on two or more: '), IL.whoList(nx.multi, 8)) : null],
            actions: [IL.listBtn('Warm-up for', rosterIds, function (list) { IL.builder({ recipe: 'Warm-up', minutes: 8, sids: list, skills: (shaky.length ? shaky : nx.rows).map(function (r) { return r.skill.id; }).slice(0, 2), reason: 'before ' + nx.sub.code }); }, 'primary'),
              IL.listBtn('Pretest for', rosterIds, function (list) { IL.builder({ recipe: 'Pretest', minutes: 15, sids: list, skills: nx.rows.map(function (r) { return r.skill.id; }).slice(0, 3), reason: 'before ' + nx.sub.code }); })] };
        } },
        { id: 'UN-10', half: true, build: function () {
          var blind = m.blind[m.blind.length - 1];
          if (!blind) return {};
          return { body: [C.split([{ n: blind.here, cls: 's-done', label: 'Questions in this chapter' }, { n: blind.elsewhere.length, cls: 's-prog', label: 'Questions elsewhere in these textbooks' }, { n: blind.none.length, cls: 's-hatch', label: 'No questions anywhere' }], { size: 'tall' }),
            C.legend([{ cls: 's-done', label: 'questions here ' + blind.here }, { cls: 's-prog', label: 'elsewhere ' + blind.elsewhere.length }, { cls: 's-hatch', label: 'none ' + blind.none.length }]),
            blind.none.length ? h('p', { class: 'note' }, h('b', null, 'The Lens cannot report on: '), blind.none.map(function (s) { return s.name; }).join(' · ')) : null,
            h('p', { class: 'sub', style: 'margin-top:8px' }, 'No questions anywhere, by chapter: ' + m.blind.map(function (x) { return 'chapter ' + x.topic.unit.num + ', ' + x.none.length + ' of ' + x.taught; }).join(' · '))],
            actions: blind.none.length ? [h('button', { class: 'btn', on: { click: function () { IL.toast('Would open the quiz generator for ' + U.plural(blind.none.length, 'skill') + '.'); } } }, 'Generate questions for ' + blind.none.length)] : null };
        } },
        { id: 'UN-6', half: true, build: function (c) {
          var tf = c.rows.slice(0, 6);
          return { body: tf.length ? [C.fit(function (W) { return C.dumbbell({ rows: tf.map(function (t) { return { label: t.skill.name + ' (' + t.other.tb.short + ')', a: t.other.p, b: t.primary.p, aTip: t.other.tb.short + ' · ' + t.other.n + ' attempts', bTip: t.primary.tb.short + ' · ' + t.primary.n + ' attempts' }; }),
            min: 0, max: 1, labW: Math.round(W * 0.38), w: W, aLabel: 'other textbook', bLabel: sec.textbooks[0].tb.short, colors: ['#5b6472', '#1864F2'], upColor: '#9aa0aa', downColor: '#9aa0aa' }); }),
            c.rows.length > 6 ? h('p', { class: 'sub' }, 'Showing 6 of ' + c.rows.length) : null] : null };
        } },
        { id: 'UN-12', half: true, build: function () { return { body: m.dip.series.length ? IL.dipPicture(m) : null }; } },
        { id: 'UN-11', build: function () {
          var ql = m.quality, STAT = { hard: ['Too hard for now', 'warn', 'Add a scaffold'], flat: ['Not separating', '', 'Review the question'], easy: ['Too easy', '', 'Use as a warm-up'] };
          return { body: [h('div', { class: 'scroll-x' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Question'), h('th', null, 'Right first time'), h('th', null, 'After practice'), h('th', null, 'Separates'), h('th', null, 'Status'), h('th', null, 'Suggested'))),
            h('tbody', null, ql.rows.slice(0, 8).map(function (r) {
              return h('tr', { class: 'click', on: { click: function () { IL.ev.item(r.item.id); } } }, h('td', null, r.item.name), h('td', null, C.icons(r.p), ' ' + Math.round(r.p * 10) + ' of 10'), h('td', null, C.icons(r.pe), ' ' + Math.round(r.pe * 10) + ' of 10'), h('td', null, r.dp < 0.2 ? 'low' : 'good'),
                h('td', null, h('span', { class: 'tag ' + STAT[r.status][1] }, STAT[r.status][0])), h('td', { class: 'sub' }, STAT[r.status][2]));
            })))), ql.rows.length > 8 ? h('p', { class: 'sub' }, 'Showing 8 of ' + ql.rows.length) : null] };
        } }
      ]);
    } };
})(typeof window !== 'undefined' ? window : globalThis);

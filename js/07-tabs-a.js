/* Insight Lens mock · tabs: Brief, Progress, Understanding, and the pictures shared by cards and tabs. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, M = IL.M, h = IL.h, C = IL.C, pct = IL.pct;
  if (!root.document) return;
  var signed = function (v) { var r = Math.round(v * 100); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r); };

  // ---------- pictures shared by queue cards and tabs ----------
  IL.funnelSegs = function (x) {
    return [{ n: x.completed.length, cls: 's-done', label: 'Completed', sids: x.completed }, { n: x.inProgress.length, cls: 's-prog', label: 'In progress', sids: x.inProgress },
      { n: x.notStarted.length, cls: 's-none', label: 'Not started', sids: x.notStarted }];
  };
  IL.gapPicture = function (m, g) {
    var world = IL.world, rows = m.gaps.roots.slice(0, 5), maxB = Math.max.apply(null, rows.map(function (r) { return r.blocked.length; })) || 1;
    var out = [h('div', { class: 'sub', style: 'display:grid;grid-template-columns:minmax(140px,260px) 1fr;gap:10px;margin-bottom:2px' }, h('span', null, 'Fix first'), h('span', null, 'class first try · skills waiting on it'))];
    out.push(C.bars(rows.map(function (r, i) {
      return { label: (i + 1) + '  ' + r.skill.name, v: Math.max(0.3, r.blocked.length), color: '#7B3FB5', text: r.blocked.length + ' waiting',
        pre: [C.meter(r.stat.p, pct(r.stat.p) + ' first try over ' + r.stat.nItems + ' questions'), h('span', { class: 'bar-val', style: 'width:34px' }, pct(r.stat.p))],
        tip: r.skill.name + '\n' + pct(r.stat.p) + ' first try · ' + r.stat.nItems + ' questions · ' + r.stat.nStudents + ' students\n' + r.blocked.length + ' of ' + r.dependents.length + ' dependent skills not yet attempted',
        onClick: function () { IL.openGap(r); } };
    }), { max: maxB, span: 46 }));
    if (g) {
      out.push(h('p', { class: 'note' }, h('b', null, 'Needed for: '), g.blocked.slice(0, 6).map(function (k) { return world.skills[k].name; }).join(' · ') + (g.blocked.length > 6 ? ' · +' + (g.blocked.length - 6) + ' more' : '')));
      out.push(h('p', { class: 'note' }, h('b', null, 'Questions behind it: '), g.items.slice(0, 5).map(function (it, i) {
        var a = m.b.itemAgg[it.id];
        return [i ? ' · ' : '', h('a', { on: { click: function (e) { e.stopPropagation(); IL.ev.item(it.id); } } }, it.name), a ? ' (' + a.ok + ' of ' + a.n + ')' : ''];
      })));
    }
    return out;
  };
  IL.openGap = function (g) {
    var m = IL.metrics(), sids = g.below.map(function (x) { return x.sid; }), N = m.roster.length;
    IL.openCard({ id: 'gap-' + g.skill.id, tier: 2, cat: 'gap', text: '“' + g.skill.name + '” is at ' + pct(g.stat.p) + ' first try and ' + g.blocked.length + ' later skills depend on it', sub: g.stat.nItems + ' questions · ' + g.stat.nStudents + ' students', sids: sids,
      why: 'A weak skill with no weak prerequisite of its own. Ranked by how many not-yet-attempted skills depend on it.', picture: function () { return IL.gapPicture(m, g); },
      facts: [['Class first try', pct(g.stat.p), 'rule: under 35%'], ['Questions behind it', g.stat.nItems, 'at least 2'], ['Students with evidence', g.stat.nStudents + ' of ' + N, 'at least ' + m.minN], ['Skills waiting on it', g.blocked.length + ' of ' + g.dependents.length, 'not yet attempted'], ['Students under 35%', sids.length, '3 or more questions each']],
      primary: { label: 'Remediation for ' + sids.length, fn: function () { IL.builder({ recipe: 'Remediation', minutes: 15, sids: sids, skills: [g.skill.id], reason: g.skill.name }); } },
      secondary: [{ label: 'Warm-up for the class', fn: function () { IL.builder({ recipe: 'Warm-up', minutes: 8, sids: m.roster.map(function (s) { return s.id; }), skills: [g.skill.id], reason: g.skill.name }); } }] });
  };
  IL.codePicture = function (c) {
    var out = [h('div', { class: 'split-row', style: 'grid-template-columns:96px 1fr auto' }, h('span', { class: 'sub' }, 'Outcome'),
      C.split([{ n: c.firstRun.length, cls: 's-done', label: 'Passed on the first run', sids: c.firstRun }, { n: c.afterFixes.length, cls: 's-late', label: 'Passed after fixes', sids: c.afterFixes }, { n: c.failing.length, cls: 's-bad', label: 'Still failing', sids: c.failing }], { size: 'tall' }),
      h('span', { class: 'val' }, 'first run ' + c.firstRun.length + ' · after fixes ' + c.afterFixes.length + ' · still failing ' + c.failing.length))];
    var maxR = Math.max.apply(null, c.runsToPass.concat([c.failing.length])) || 1;
    out.push(h('div', { class: 'split-row', style: 'grid-template-columns:96px 1fr;align-items:end' }, h('span', { class: 'sub' }, 'Runs to pass'),
      h('div', { style: 'display:flex;gap:10px;align-items:flex-end;height:44px' }, c.runsToPass.map(function (n, i) {
        return h('div', { style: 'text-align:center', tip: n + ' passed on run ' + (i === 4 ? '5 or later' : i + 1) }, h('div', { style: 'width:22px;border-radius:3px 3px 0 0;background:#8fb1f1;height:' + Math.max(2, (n / maxR) * 30) + 'px' }), h('div', { class: 'sub', style: 'font-size:10.5px' }, i === 4 ? '5+' : String(i + 1)));
      }), h('div', { style: 'text-align:center;margin-left:8px', tip: c.failing.length + ' have not passed' }, h('div', { style: 'width:22px;border-radius:3px 3px 0 0;background:#D3302F;height:' + Math.max(2, (c.failing.length / maxR) * 30) + 'px' }), h('div', { class: 'sub', style: 'font-size:10.5px' }, 'not yet')))));
    if (c.tests.some(function (t) { return t.failing.length; })) out.push(h('div', { class: 'split-row', style: 'grid-template-columns:96px 1fr' }, h('span', { class: 'sub' }, 'Tests'),
      h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px' }, c.tests.map(function (t) {
        return h('span', { tip: t.failing.length ? 'Failing test ' + t.test + ':\n' + IL.names(t.failing) : 'No one is failing test ' + t.test, style: t === c.hardTest && t.failing.length ? 'font-weight:700;color:#946400' : '' },
          'test ' + t.test + (t.failing.length ? ' ✗ ' + t.failing.length : ' ✓'));
      }))));
    if (c.topError) out.push(h('div', { class: 'split-row', style: 'grid-template-columns:96px 1fr' }, h('span', { class: 'sub' }, 'Shared error'),
      h('span', null, h('span', { class: 'tag warn' }, c.topError.err), ' ' + U.plural(c.topError.students.length, 'student') + ': ', IL.whoList(c.topError.students, 5))));
    return out;
  };
  IL.dipPicture = function (m) {
    var sr = m.dip.series, f = m.dip.flagged;
    var out = [h('p', { class: 'sub', style: 'margin-bottom:6px' }, 'Class first-try compared with typical for the same questions, by class week'),
      C.zero({ values: sr.map(function (x) { return x.gap; }), cw: 26, h: 80, amp: 0.3, labels: sr.map(function (x, i) { return i % 2 === 0 ? T.fmtDay(x.week * 7).replace(' ', ' ') : ''; }),
        tips: sr.map(function (x) { return 'Week of ' + T.fmtDay(x.week * 7) + ' · ' + x.n + ' first attempts'; }), mark: f ? sr.indexOf(f.point) : null, refLabel: '← typical', tailW: 60 })];
    if (f && f.fell.length) {
      out.push(h('p', { class: 'sub', style: 'margin:10px 0 2px' }, 'Fell most that week'));
      out.push(C.bars(f.fell.map(function (x) { return { label: x.sub.code + ' ' + x.sub.name, v: Math.abs(x.gap), text: signed(x.gap) + ' points · ' + x.n + ' attempts', cls: 'amber' }; }), { span: 45 }));
    }
    return out;
  };
  IL.quietPicture = function (m) {
    var b = m.b, weeks = [];
    for (var w = Math.max(0, b.weekActive.length - 10); w < b.weekActive.length; w++) weeks.push(w);
    return [C.register({ cols: weeks.map(function (w) { return { label: T.fmtDay(w * 7).split(' ')[0], tip: 'Week of ' + T.fmtDay(w * 7) }; }), noteHead: 'last active',
      rows: m.quiet.map(function (q) { return { sid: q.sid, cells: q.strip.map(function (x) { return x === 'on' ? 'yes' : x === 'off' ? 'no' : 'pale'; }), note: (q.lastDay != null ? T.fmtDay(q.lastDay) : 'never') + ' · ' + q.run + ' class weeks' }; }),
      words: { yes: 'active', no: 'no recorded activity', pale: 'the class was quiet this week, so it does not count' } }),
      C.legend([{ cls: 's-done', label: 'active' }, { cls: 's-none', label: 'not active' }, { cls: 's-mute', label: 'class was quiet that week (does not count)' }])];
  };
  IL.trajPicture = function (m, list) {
    var labels = m.periods.map(function (p) { return T.fmtDay(p[0] * 7).split(' ')[1] === T.fmtDay(p[p.length - 1] * 7).split(' ')[1] ? T.fmtDay(p[0] * 7) : T.fmtDay(p[0] * 7); });
    return [h('p', { class: 'sub', style: 'margin-bottom:4px' }, 'Compared with classmates on the same questions. Each bar is two class weeks; the line is the class’s own level.'),
      list.map(function (x) {
        return h('div', { class: 'strip-row', style: 'grid-template-columns:130px auto 1fr' }, IL.who(x.sid),
          C.zero({ values: x.series.map(function (s) { return s.gap; }), cw: 20, h: 44, amp: 0.45, tips: x.series.map(function (s, i) { return 'From ' + labels[i] + ' · ' + s.n + ' first attempts'; }), mark: x.series.length - 1 }),
          h('span', null, h('b', null, signed(x.last) + ' now'), ' · ' + (x.kind === 'sustained' ? 'below for 2 periods' : x.kind === 'drop' ? 'dropped ' + Math.abs(Math.round(x.change * 100)) + ' points' : 'rose ' + Math.round(x.change * 100) + ' points')));
      })];
  };
  IL.pacePicture = function (p) {
    return [C.strip({ dots: p.dots.map(function (d) { return { sid: d.sid, v: d.pc }; }), median: p.median, band: [Math.max(0, p.median - 15), Math.min(100, p.median + 15)], fmt: function (v) { return Math.round(v) + '%'; },
      flag: function (d) { return d.v <= p.median - 15; }, label: 'Percent complete on chapter ' + p.unit.num }),
      p.behind.length ? h('p', { class: 'note' }, h('b', null, p.behind.length + ' behind: '), IL.whoList(p.behind.map(function (x) { return x.sid; }), 10)) : null,
      p.ahead.length ? h('p', { class: 'note' }, h('b', null, p.ahead.length + ' ahead: '), IL.whoList(p.ahead.map(function (x) { return x.sid; }), 10)) : null];
  };
  IL.streakPicture = function (m, rows) {
    return [C.register({ rot: true, cols: m.streaks.cols.map(function (a) { return { label: a.short.split(' ')[0] === 'Unit' ? a.short.slice(0, 11) : a.short.split(' ')[0], tip: a.name + ' · due ' + T.fmtDay(a.dueDay) }; }), noteHead: '',
      rows: rows.map(function (r) { return { sid: r.sid, cells: r.cells, run: [r.end - r.run + 1, r.end], note: r.never ? 'never active' : r.run + ' in a row' + (r.ongoing ? '' : ' (earlier)') }; }),
      words: { yes: 'started', no: 'not started', na: 'not assigned' } }),
      C.legend([{ cls: 's-done', label: 'started' }, { cls: 's-none', label: 'not started' }, { color: '#b9bec7', label: 'not assigned (dash)' }])];
  };
  IL.stuckPicture = function (m, n) {
    return m.stuck.slice(0, n).map(function (x) {
      return h('div', { style: 'padding:6px 0;border-bottom:1px solid var(--line);cursor:pointer', on: { click: function () { IL.ev.item(x.item.id); } } },
        h('div', { style: 'font-size:12.5px;margin-bottom:4px' }, IL.who(x.sid), ' · ' + x.item.name + ' · ', h('b', null, x.runs + ' runs'), ' over ' + T.dur(x.span * 60) + ' · ' + (x.lastOk ? 'passing now' : 'not passing now')),
        C.tape(x.rec.attempts, { code: true }),
        h('div', { class: 'sub', style: 'margin-top:3px' }, x.flags.length ? x.flags.join(' · ') : 'Ten or more runs without a pass', x.sameRun >= 4 ? ' · same failure × ' + x.sameRun : ''));
    });
  };
  IL.movePicture = function (m, rows) {
    return C.dumbbell({ rows: rows.slice(0, 8).map(function (r) { return { sid: r.sid, a: r.prev.gap, b: r.cur.gap, aTip: r.prev.n + ' first attempts', bTip: r.cur.n + ' first attempts' }; }), min: -0.5, max: 0.5, zero: 0, aLabel: 'two class weeks before', bLabel: 'last two class weeks',
      fmt: signed, label: 'Gap to classmates, before and now' });
  };
  IL.followupPicture = function (f) {
    if (f.action.kind === 'check-in') return f.rows.map(function (r) { return h('p', null, IL.who(r.sid), ': ', r.state === 'active' ? 'active again since ' + T.fmtDay(r.lastDay) : 'no recorded activity since ' + (r.lastDay != null ? T.fmtDay(r.lastDay) : 'the start of term')); });
    if (!f.rows.length || f.status === 'waiting') return h('p', { class: 'empty' }, 'Waiting for new work. The recheck is set for ' + T.fmtDayLong(f.action.recheckDay) + '.');
    var rows = f.rows.slice(0, 12).map(function (r) {
      var a = r.before.n ? r.before.ok / r.before.n : null, b = r.after.n >= 3 ? r.after.ok / r.after.n : null;
      return { sid: r.sid, a: a, b: b, hollow: b == null ? 'no new work yet' : null, aTip: r.before.ok + ' of ' + r.before.n + ' before', bTip: r.after.ok + ' of ' + r.after.n + ' new questions',
        note: r.state === 'improved' ? 'improved' : r.state === 'same' ? 'no change' : r.state === 'new' ? 'new evidence' : '' };
    });
    return [h('p', { class: 'finding', style: 'font-size:13.5px' }, f.improved + ' improved · ' + f.same + ' no change · ' + f.noWork + ' no new work'),
      C.dumbbell({ rows: rows, min: 0, max: 1, aLabel: 'before (same skill)', bLabel: 'after (new questions)', noteW: 84, w: 600 }),
      f.rows.length > 12 ? h('p', { class: 'sub' }, '+' + (f.rows.length - 12) + ' more students') : null];
  };

  // ---------- Brief ----------
  IL.tabs.brief = { label: 'Brief', question: 'What needs me this week?',
    badge: function (m) { return null; },
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st, p = m.pulse, q = IL.queue(ctx);

      // BR-5 written brief, built only from the cards below
      var ai = h('div', { class: 'brief-ai' }, h('span', { class: 'tag ai', style: 'margin-right:8px' }, 'Written brief · sample'));
      q.top.slice(0, 4).forEach(function (c) {
        var mm = /^(\D*?)(\d+(?: of \d+)?%?)(.*)$/.exec(c.text);
        if (mm) { ai.appendChild(document.createTextNode(mm[1])); ai.appendChild(h('span', { class: 'numchip', tip: 'Opens the card this number comes from', on: { click: function () { IL.openCard(c); } } }, mm[2])); ai.appendChild(document.createTextNode(mm[3] + '. ')); }
        else ai.appendChild(h('span', null, h('a', { on: { click: function () { IL.openCard(c); } } }, c.text), '. '));
      });
      ai.appendChild(h('span', { class: 'sub' }, ' Generated Monday 07:00 from the cards below; every number links to its card.'));
      el.appendChild(ai);

      // BR-1 pulse
      var weeks8 = []; for (var w = Math.max(0, m.b.weekActive.length - 8); w < m.b.weekActive.length; w++) weeks8.push(w);
      var tiles = h('div', { class: 'grid g4', style: 'margin-bottom:14px' });
      tiles.appendChild(h('section', { class: 'card tile', on: { click: function () { IL.go({ tab: 'engagement' }); } } },
        h('div', { class: 'label' }, 'Active in the last class week'), h('div', { class: 'value' }, p.active.n + ' of ' + p.active.of),
        C.dots(p.active.dots.map(function (d) { return { sid: d.sid, cls: d.on ? '' : 'off', tip: d.on ? 'active' : 'no recorded activity' }; })),
        h('div', { class: 'foot' }, h('span', null, 'week of ' + T.fmtDay(p.week * 7)), h('span', { tip: 'Students active in each of the last 8 weeks. Grey weeks were quiet for the whole class.' }, C.spark(p.active.spark, { bars: true, min: 0, max: p.active.of, pale: p.active.sparkClass.map(function (c) { return !c; }) })))));
      tiles.appendChild(h('section', { class: 'card tile', on: { click: function () { IL.go({ tab: 'progress' }); } } },
        h('div', { class: 'label' }, 'Assigned work started on time'), h('div', { class: 'value' }, p.work.onTime + ' of ' + p.work.cells),
        C.split([{ n: p.work.onTime, cls: 's-done', label: 'Started on time' }, { n: p.work.late, cls: 's-late', label: 'Started after the due date' }, { n: p.work.none, cls: 's-none', label: 'Not started' }], { size: 'tall' }),
        h('div', { class: 'foot' }, h('span', null, 'on time ' + p.work.onTime + ' · late ' + p.work.late + ' · not started ' + p.work.none), h('span', null, p.work.assignments + ' assignments due'))));
      tiles.appendChild(h('section', { class: 'card tile', on: { click: function () { IL.go({ tab: 'understanding' }); } } },
        h('div', { class: 'label' }, 'First-try success'), h('div', { class: 'value' }, pct(p.fts.p), p.fts.norm != null ? h('small', null, 'typical ' + pct(p.fts.norm)) : h('small', null, 'no norm yet')),
        C.track({ value: p.fts.classOnNorm, ref: p.fts.norm, w: 230, valueLabel: 'this class', refLabel: 'typical for the same questions' }),
        h('div', { class: 'foot' }, h('span', null, '● class   ┃ typical elsewhere'), h('span', null, p.fts.n + ' first attempts'))));
      tiles.appendChild(h('section', { class: 'card tile', on: { click: function () { IL.go({ tab: 'progress' }); } } },
        h('div', { class: 'label' }, 'Waiting on you'), h('div', { class: 'value' }, p.waiting.toGrade + ' to grade'),
        h('div', { style: 'font-size:12.5px;line-height:1.7' },
          h('div', null, p.waiting.toGrade ? h('span', { class: 'tag ' + (p.waiting.oldestDays >= 3 ? 'warn' : '') }, 'oldest ' + p.waiting.oldestDays + ' days') : 'nothing waiting'),
          h('div', null, U.plural(p.waiting.questions.length, 'student question') + ' unanswered'), h('div', null, p.waiting.failed.length + ' auto-grading failures'))));
      el.appendChild(tiles);

      // BR-2 queue
      var cats = {}; q.all.forEach(function (c) { cats[c.cat] = (cats[c.cat] || 0) + 1; });
      var shown = st.cat ? q.all.filter(function (c) { return c.cat === st.cat; }) : st.showAll ? q.all : q.top;
      var qc = h('section', { class: 'card', style: 'margin-bottom:14px' },
        h('div', { class: 'card-head' }, h('span', { class: 'card-id' }, 'BR-2'), h('h3', null, 'This week'), h('span', { class: 'sub' }, shown.length + ' of ' + q.all.length + ' shown'),
          h('div', { class: 'card-tools' }, q.handled.length ? h('span', { class: 'sub' }, q.handled.length + ' handled') : null)),
        h('div', { class: 'catbar', role: 'img', 'aria-label': 'Cards by type' }, Object.keys(IL.CATS).map(function (k) { return cats[k] ? h('span', { class: 'cat-' + k, style: 'flex:' + cats[k], tip: IL.CATS[k] + ': ' + cats[k] }) : null; })),
        h('div', { class: 'chips', style: 'margin-bottom:6px' },
          h('button', { class: 'chip' + (!st.cat && !st.showAll ? ' on' : ''), on: { click: function () { st.cat = null; st.showAll = false; IL.render(); } } }, 'Top ' + q.top.length),
          h('button', { class: 'chip' + (!st.cat && st.showAll ? ' on' : ''), on: { click: function () { st.cat = null; st.showAll = true; IL.render(); } } }, 'All ' + q.all.length),
          Object.keys(IL.CATS).map(function (k) { return cats[k] ? h('button', { class: 'chip' + (st.cat === k ? ' on' : ''), on: { click: function () { st.cat = st.cat === k ? null : k; IL.render(); } } }, h('i', { class: 'dot cat-' + k }), IL.CATS[k] + ' ' + cats[k]) : null; })));
      shown.forEach(function (c, i) {
        qc.appendChild(h('div', { class: 'q-row', tabindex: 0, role: 'button', on: { click: function () { IL.openCard(c); }, keydown: function (e) { if (e.key === 'Enter') IL.openCard(c); } } },
          h('span', { class: 'rank' }, String(i + 1)),
          h('span', null, h('span', { class: 'tag ' + (c.tier === 1 ? 'now' : c.tier === 4 ? 'good' : c.tier === 3 ? 'info' : 'warn') }, IL.CATS[c.cat]), c.state === 'watch' ? h('span', { class: 'sub' }, ' watching') : null),
          h('span', { class: 'text' }, c.text, h('small', null, c.sub)),
          h('span', { class: 'glyph' }, c.glyph()),
          h('button', { class: 'btn primary small', on: { click: function (e) { e.stopPropagation(); c.primary.fn(); } } }, c.primary.label)));
      });
      if (!shown.length) qc.appendChild(h('p', { class: 'empty' }, 'Nothing needs you right now. The Students tab shows the whole class.'));
      el.appendChild(qc);
      IL.openers.q0 = function () { if (q.top[0]) IL.openCard(q.top[0]); };
      IL.openers.q1 = function () { if (q.top[1]) IL.openCard(q.top[1]); };
      IL.openers.builder = function () { var g = q.all.filter(function (c) { return c.cat === 'gap'; })[0] || q.top[1]; if (g) g.primary.fn(); };

      // BR-3 and BR-4
      var s = m.since, ch = h('div', { class: 'changes' });
      s.resolved.slice(0, 3).forEach(function (x) { ch.appendChild(h('div', null, h('span', { class: 'mk ok' }, '✓'), h('span', null, 'Not started on “' + x.a.short + '”'), h('b', null, x.then + ' → ' + x.now))); });
      s.grew.slice(0, 2).forEach(function (x) { ch.appendChild(h('div', null, h('span', { class: 'mk up' }, '▲'), h('span', null, 'Still failing “' + x.item.name + '”'), h('b', null, x.then + ' → ' + x.now))); });
      if (s.joined.length) ch.appendChild(h('div', null, h('span', { class: 'mk new' }, '+'), h('span', null, IL.whoList(s.joined), ' joined the roster'), h('span')));
      ch.appendChild(h('div', null, h('span', { class: 'mk new' }, '+'), h('span', null, 'New work from ' + s.newWork.students + ' students'), h('b', null, s.newWork.attempts + ' questions')));
      var due = m.followups.filter(function (f) { return f.status === 'recheck due'; });
      el.appendChild(h('div', { class: 'grid g2' },
        C.card({ id: 'BR-3', title: 'Since your last visit', sub: T.fmtDayLong(T.day(s.t)) + ' afternoon', body: ch,
          tools: [h('button', { class: 'link-btn', on: { click: function () { IL.go({ tab: 'students', view: Object.assign({}, st.view, { students: 'movement' }) }); } } }, 'Movement →')] }),
        C.card({ id: 'BR-4', title: 'Follow-ups due', sub: due.length ? U.plural(due.length, 'recheck is', 'rechecks are') + ' ready' : 'Nothing due',
          body: due.length ? due.map(function (f) {
            var ci = f.action.kind === 'check-in';
            return h('div', { style: 'padding:8px 0;border-top:1px solid var(--line);cursor:pointer', on: { click: function () { IL.go({ tab: 'followups' }); } } },
              h('div', { style: 'font-weight:600;font-size:13px' }, f.action.title, ' ', h('span', { class: 'sub' }, '· ' + U.plural(f.action.students.length, 'student') + ' · ' + T.fmtDay(f.action.day))),
              ci ? h('div', { class: 'sub' }, f.rows[0].state === 'active' ? 'Active again' : 'Still no recorded activity')
                : h('div', { style: 'display:flex;gap:14px;align-items:center;margin-top:4px' }, C.dots(f.rows.map(function (r) { return { sid: r.sid, cls: r.state === 'improved' ? 'good' : r.state === 'none' ? 'off' : 'muted', tip: r.state === 'improved' ? 'improved' : r.state === 'none' ? 'no new work' : 'no change' }; })),
                  h('span', { style: 'font-size:12.5px' }, pct(f.before) + ' → ', h('b', null, pct(f.after)), ' on new questions')));
          }) : h('p', { class: 'empty' }, 'Actions you take from a card appear here when their recheck date arrives.'),
          tools: [h('button', { class: 'link-btn', on: { click: function () { IL.go({ tab: 'followups' }); } } }, 'All follow-ups →')] })));
    } };

  // ---------- Progress ----------
  IL.tabs.progress = { label: 'Progress', question: 'Where is the class in the material, and is assigned work getting done?',
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st, N = m.roster.length;

      // PR-1 frontier
      var main = m.frontier.filter(function (l) { return l.role === 'primary'; })[0], skipped = main ? main.units.filter(function (u) { return u.skipped; }) : [];
      var lanes = m.frontier.map(function (lane) {
        return h('div', { class: 'lane' }, h('div', { class: 'lane-head' }, h('span', { class: 'stripe', style: 'background:' + lane.tb.accent }), lane.tb.name, h('span', { class: 'sub', style: 'font-weight:400' }, lane.role === 'primary' ? 'primary' : lane.tb.kind.toLowerCase() + ' · supplemental')),
          h('div', { class: 'lane-units' }, lane.units.map(function (u) {
            var here = lane.role === 'primary' && lane.current && lane.current.id === u.id;
            return h('div', { class: 'unit' }, here ? h('span', { class: 'here' }, '▼ class is here') : null, h('div', { class: 'nm', title: u.name }, u.num + ' ' + u.name),
              u.skipped ? C.split([{ n: 1, cls: 's-hatch', label: 'Skipped by the class' }], { size: 'tall' })
                : C.split([{ n: u.done, cls: 's-done', label: 'Done (80% or more)' }, { n: u.inProgress, cls: 's-prog', label: 'In progress' }, { n: u.notStarted, cls: 's-none', label: 'Not started' }], { size: 'tall' }),
              h('div', { class: 'ct' }, u.skipped ? 'skipped · ' + u.started + ' started' : u.started === 0 ? 'not opened' : u.done + ' done · ' + u.inProgress + ' in progress' + (u.notStarted ? ' · ' + u.notStarted + ' not started' : '')));
          })));
      });
      el.appendChild(C.card({ id: 'PR-1', title: 'Class frontier',
        finding: main && main.current ? 'The class is in chapter ' + main.current.num + ', ' + main.current.name + '.' + (skipped.length ? ' Chapter ' + skipped.map(function (u) { return u.num; }).join(', ') + ' was skipped.' : '') : 'No chapter has been opened by most of the class yet.',
        body: [lanes, C.legend([{ cls: 's-done', label: 'done (80% or more of the chapter)' }, { cls: 's-prog', label: 'in progress' }, { cls: 's-none', label: 'not started' }, { cls: 's-hatch', label: 'skipped by the class' }])],
        table: function () { var rows = []; m.frontier.forEach(function (l) { l.units.forEach(function (u) { rows.push([l.tb.short, u.num + ' ' + u.name, u.done, u.inProgress, u.notStarted, u.skipped ? 'skipped' : u.opened ? 'opened' : '']); }); }); return C.table(['Textbook', 'Unit', 'Done', 'In progress', 'Not started', ''], rows); },
        guard: 'A chapter counts as opened when half the class has work in it. Order comes from when the class reached each chapter, not from the table of contents. Supplemental units never count as behind.' }));

      // PR-2 pace and PR-7 waiting
      var cur = m.pace[m.pace.length - 1];
      var wt = m.waiting;
      el.appendChild(h('div', { class: 'grid g-21', style: 'margin-top:14px' },
        C.card({ id: 'PR-2', title: 'Pace spread', finding: cur ? (cur.behind.length ? cur.behind.length + ' of ' + cur.dots.length + ' students are well behind the class on chapter ' + cur.unit.num + (cur.ahead.length ? ', and ' + cur.ahead.length + ' ' + (cur.ahead.length === 1 ? 'is' : 'are') + ' ahead' : '') + '.' : 'No one is far from the class on chapter ' + cur.unit.num + '.') : 'Not enough work yet.',
          body: cur ? [h('p', { class: 'sub' }, 'Chapter ' + cur.unit.num + ' · percent complete · one dot per student · shaded band is within 15 points of the median'), IL.pacePicture(cur)] : null,
          actions: cur && cur.behind.length ? [h('button', { class: 'btn', on: { click: function () { IL.toast('Would open Create Coursework with a catch-up set for ' + cur.behind.length + ' students.'); } } }, 'Catch-up for ' + cur.behind.length),
            cur.ahead.length ? h('button', { class: 'btn', on: { click: function () { IL.builder({ recipe: 'Challenge', minutes: 20, sids: cur.ahead.map(function (x) { return x.sid; }), skills: m.next ? m.next.sub.skills.slice(0, 2) : [], reason: 'ahead of the class' }); } } }, 'Challenge for ' + cur.ahead.length) : null] : null }),
        C.card({ id: 'PR-7', title: 'Waiting on you', finding: wt.toGrade ? wt.toGrade + ' to grade; the oldest has waited ' + wt.oldestDays + ' days.' : 'Nothing is waiting for a grade.',
          body: [wt.byAsg.map(function (x) { return h('div', { class: 'split-row', style: 'grid-template-columns:1fr auto auto;cursor:pointer', on: { click: function () { IL.toast('Would open the grading view for ' + x.a.short + '.'); } } },
            h('span', { class: 'lab' }, x.a.short), h('b', null, String(x.n)), h('span', { class: 'tag ' + (T.day(world.now) - T.day(x.oldest) >= 3 ? 'warn' : '') }, 'oldest ' + T.ago(x.oldest, world.now))); }),
            h('div', { class: 'dr-sec', style: 'margin-top:10px;padding-top:10px' }, h('h4', null, U.plural(wt.questions.length, 'question') + ' waiting'), wt.questions.map(function (q) { return h('p', { style: 'font-size:12.5px;margin-bottom:4px' }, IL.who(q.sid), ' · ' + sec.items[q.item].subCode + ' · ' + T.ago(q.t, world.now), h('br'), h('span', { class: 'sub' }, '“' + q.text + '”')); })),
            h('p', { class: 'note' }, wt.failed.length + ' auto-grading failures ', h('a', { on: { click: function () { IL.toast('Would retry auto-grading for ' + wt.failed.length + ' submissions.'); } } }, 'Retry all'))],
          guard: 'Until written answers are graded, these questions show as “awaiting grading” in the unit grid.' })));

      // PR-3 funnel
      var rows = m.funnel.rows, showAll = st.view.funnel === 'all', vis = showAll ? rows : rows.slice(-10), tbody = [], lastCh = null;
      vis.forEach(function (x) {
        var chKey = x.a.kind === 'lesson' ? x.a.chapterNum : null;
        if (chKey && chKey !== lastCh) { tbody.push(h('tr', { class: 'sep' }, h('td', { colspan: 4 }, 'Chapter ' + chKey))); }
        if (chKey) lastCh = chKey;
        tbody.push(h('tr', { class: 'click', on: { click: function () { IL.toast('Would open the coursework dashboard for ' + x.a.short + '.'); } } },
          h('td', { style: 'white-space:nowrap;width:70px' }, T.fmtDay(x.a.dueDay)),
          h('td', { style: 'width:34%' }, x.a.short, x.a.audience ? h('span', { class: 'sub' }, ' · ' + x.a.audience) : null, x.a.kind !== 'lesson' ? h('span', { class: 'tag', style: 'margin-left:6px' }, x.a.kind === 'supp' ? IL.world.textbooks[x.a.tb].kind : x.a.kind) : null),
          h('td', null, C.split(IL.funnelSegs(x))),
          h('td', { class: 'num', style: 'white-space:nowrap;width:200px' }, x.completed.length + ' of ' + x.eligible.length + ' done', x.toGrade ? h('span', { class: 'tag warn', style: 'margin-left:6px' }, x.toGrade + ' to grade') : null,
            x.decay ? h('span', { class: 'tag warn', style: 'margin-left:6px', tip: 'Completed fell from ' + x.decay.from + ' to ' + x.decay.to + ' across this chapter' }, '▼ ' + (x.decay.from - x.decay.to)) : null)));
      });
      var d = m.funnel.decay;
      el.appendChild(h('div', { style: 'margin-top:14px' }, C.card({ id: 'PR-3', title: 'Assignment funnel',
        finding: d ? 'Completion slid through chapter ' + d.chapter + ': from ' + d.from + ' students on the first assignment to ' + d.to + ' on the latest.' : 'Completion is holding steady across recent assignments.',
        body: [h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Due'), h('th', null, 'Assignment'), h('th', null, 'Eligible students'), h('th', { class: 'num' }, 'Done'))), h('tbody', null, tbody)),
          C.legend([{ cls: 's-done', label: 'completed' }, { cls: 's-prog', label: 'in progress' }, { cls: 's-none', label: 'not started' }]),
          h('div', { class: 'actions' }, rows.length > 10 ? h('button', { class: 'btn small', on: { click: function () { st.view.funnel = showAll ? null : 'all'; IL.render(); } } }, showAll ? 'Show the latest 10' : 'Show all ' + rows.length) : null,
            m.funnel.zero.length ? h('span', { class: 'sub', tip: m.funnel.zero.map(function (a) { return a.name; }).join('\n') }, '▸ No one has started (' + m.funnel.zero.length + '): ' + m.funnel.zero.map(function (a) { return a.name; }).join(' · ')) : null)],
        guard: 'Eligible means the student was assigned the work; a differentiated copy has its own row. Courseworks no one started are listed separately and never count as missing work.' })));

      // PR-4 streaks and PR-5 timing
      var sr = m.streaks.rows.slice(0, 8), tm = m.timing;
      el.appendChild(h('div', { class: 'grid g2', style: 'margin-top:14px' },
        C.card({ id: 'PR-4', title: 'Missing-work streaks', finding: sr.length ? U.plural(m.streaks.rows.length, 'student has', 'students have') + ' not started two or more assignments in a row.' : 'No one has missed two assignments in a row.',
          body: sr.length ? IL.streakPicture(m, sr) : null,
          actions: sr.length ? [h('button', { class: 'btn', on: { click: function () { IL.logCheckin(sr.filter(function (r) { return r.ongoing; }).map(function (r) { return r.sid; }), 'streak'); } } }, 'Log a check-in')] : null }),
        C.card({ id: 'PR-5', title: 'Start timing', finding: pct(tm.lateShare) + ' of started work began on the last day or after the due date.',
          body: [tm.rows.map(function (r) { return C.splitRow(r.a.short, [{ n: r.early, cls: 's-done', label: 'Early' }, { n: r.lastDay, cls: 's-late', label: 'Last 24 hours' }, { n: r.after, cls: 's-warn', label: 'After the due date' }], r.early + ' · ' + r.lastDay + ' · ' + r.after); }),
            C.legend([{ cls: 's-done', label: 'early' }, { cls: 's-late', label: 'last 24 hours' }, { cls: 's-warn', label: 'after the due date' }]),
            tm.students.length ? [h('p', { class: 'sub', style: 'margin:12px 0 4px' }, 'Usually late (last 6 assignments)'),
              C.register({ cols: tm.rows.map(function (r) { return { label: r.a.short.split(' ')[0], tip: r.a.short }; }), noteHead: '',
                rows: tm.students.slice(0, 6).map(function (x) { return { sid: x.sid, cells: x.cells, note: x.late + ' of ' + x.started + ' late' }; }), words: { early: 'started early', last: 'started in the last 24 hours', after: 'started after the due date', none: 'not started', na: 'not assigned' } })] : null],
          guard: 'This describes timing only. Work after a due date can be revision.' })));

      // PR-6 balance
      if (sec.textbooks.length > 1) {
        var maxQ = Math.max.apply(null, m.balance.map(function (x) { return x.questions; }));
        var low = m.balance.filter(function (x) { return x.role !== 'primary'; }).sort(U.by(function (x) { return x.questions; }))[0];
        el.appendChild(h('div', { style: 'margin-top:14px' }, C.card({ id: 'PR-6', title: 'Textbook balance',
          finding: 'Almost all recorded work is in ' + m.balance[0].tb.short + '; ' + low.tb.short + ' has ' + low.questions + ' questions attempted.',
          body: C.bars(m.balance.map(function (x) { return { label: h('span', null, h('i', { class: 'dot', style: 'background:' + x.tb.accent + ';margin-right:6px' }), x.tb.name), v: x.questions, color: x.tb.accent,
            text: x.questions + ' questions · ' + x.students + ' students · first try ' + pct(x.fts), tip: x.tb.name + ' (' + x.role + ')\n' + x.n + ' first attempts' }; }), { max: maxQ, span: 46 }),
          guard: 'Supplemental textbooks are differentiated practice. They are shown here and under Understanding, and are left out of bands.' })));
      }
    } };

  // ---------- Understanding ----------
  IL.tabs.understanding = { label: 'Understanding', question: 'What do they get, what don’t they, and why?',
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st, N = m.roster.length;
      var view = st.view.understanding || 'topics';

      // UN-1 topic strip + explorer, or all skills
      var worst = m.topicsOrdered.filter(function (t) { return t.stat && t.stat.gap != null; }).sort(U.by(function (t) { return t.stat.gap; }))[0];
      var sel = st.view.topic && m.topics.filter(function (t) { return t.unit.id === st.view.topic; })[0] || m.topicsOrdered.filter(function (t) { return t.opened; }).slice(-1)[0];
      var tiles = h('div', { class: 'tiles' }, m.topicsOrdered.map(function (t) {
        if (t.skipped || !t.stat) return h('div', { class: 'ttile skipped' }, h('div', { class: 'nm' }, t.unit.num + ' ' + t.unit.name), h('div', { class: 'ref', style: 'margin-top:10px' }, 'skipped by the class'));
        var g = t.stat.gap, cls = g == null ? '' : g <= -0.05 ? 'below' : g >= 0.05 ? 'above' : '';
        return h('div', { class: 'ttile ' + cls + (sel && sel.unit.id === t.unit.id ? ' on' : ''), tabindex: 0, on: { click: function () { st.view.topic = t.unit.id; IL.render(); } } },
          h('div', { class: 'nm', title: t.unit.name }, t.unit.num + ' ' + t.unit.name), h('div', { class: 'big' }, pct(t.stat.fts)),
          h('div', { class: 'ref' }, t.stat.norm != null ? 'typical ' + pct(t.stat.norm) + ' · ' + (cls === 'below' ? 'below' : cls === 'above' ? 'above' : 'near') : 'no norm yet'),
          t.stat.bands ? C.split(t.stat.bands.levels.map(function (n, i) { return { n: n, cls: 's-b' + i, label: M.BANDS[i] }; }).concat([{ n: t.stat.bands.unattempted, cls: 's-none', label: 'Not attempted' }]), { size: 'thin' })
            : h('div', { class: 'sub', style: 'font-size:11px' }, 'bands unavailable'),
          h('div', { class: 'sub', style: 'font-size:11px;margin-top:4px' }, t.stat.students + ' students · ' + t.stat.n + ' first attempts'));
      }));
      var explorer = null;
      if (sel && sel.stat) explorer = h('div', { style: 'margin-top:14px' }, h('p', { class: 'sub', style: 'margin-bottom:4px' }, 'Chapter ' + sel.unit.num + ' · ' + sel.chapter.name + ' · subunits (● class first try, ┃ typical elsewhere)'),
        sel.subs.map(function (x) {
          return h('div', { class: 'split-row', style: 'grid-template-columns:minmax(150px,240px) 210px 1fr auto' }, h('span', { class: 'lab' }, x.sub.code + ' ' + x.sub.name),
            C.track({ value: x.stat.onNorm != null ? x.stat.onNorm : x.stat.fts, ref: x.stat.norm, w: 200, valueLabel: 'this class', refLabel: 'typical' }),
            x.stat.bands ? C.split(x.stat.bands.levels.map(function (n, i) { return { n: n, cls: 's-b' + i, label: M.BANDS[i] }; }).concat([{ n: x.stat.bands.unattempted, cls: 's-none', label: 'Not attempted' }]), { size: 'thin' }) : h('span', { class: 'sub' }, 'bands unavailable for this skill set'),
            h('span', { class: 'val' }, pct(x.stat.fts) + (x.stat.norm != null ? ' vs ' + pct(x.stat.norm) : '') + ' · ' + x.stat.unresolved + ' unsolved'));
        }),
        sec.bands ? C.legend(M.BANDS.map(function (b, i) { return { cls: 's-b' + i, label: b }; }).concat([{ cls: 's-none', label: 'not attempted' }])) : null);
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
              }), h('td', { style: 'white-space:nowrap' }, x.blind ? h('span', { class: 'tag', tip: 'No questions exist for this skill in the attached textbooks, so nothing can be reported.' }, 'no questions') : x.stat ? [C.meter(x.stat.p), ' ' + pct(x.stat.p) + ' · ' + x.stat.nStudents + ' st'] : h('span', { class: 'sub' }, 'not reached')));
            })))),
          C.legend([{ color: '#90CAF9', label: 'taught only' }, { color: '#0D47A1', label: 'taught and has questions' }, { color: '#1876D2', label: 'questions (supplemental)' }]));
      }
      el.appendChild(C.card({ id: 'UN-1', title: 'Topic strip and unit explorer',
        finding: worst ? 'Chapter ' + worst.unit.num + ' is where the class is furthest below typical: ' + pct(worst.stat.onNorm) + ' first try against ' + pct(worst.stat.norm) + ' elsewhere.' : 'First-try success by chapter.',
        tools: [h('span', { class: 'chips' }, h('button', { class: 'chip' + (view === 'topics' ? ' on' : ''), on: { click: function () { st.view.understanding = 'topics'; IL.render(); } } }, 'By chapter'),
          h('button', { class: 'chip' + (view === 'skills' ? ' on' : ''), on: { click: function () { st.view.understanding = 'skills'; IL.render(); } } }, 'All skills'))],
        body: view === 'skills' ? skillsView : [tiles, explorer],
        guard: 'First-try success, in the order the class worked. Tiles are tinted when the class is 5 points or more below (amber) or above (blue) typical results on the same questions.' }));

      // UN-2 root gaps and UN-5 depth and format
      var roots = m.gaps.roots, top = roots[0];
      var wg = m.writeGap;
      el.appendChild(h('div', { class: 'grid g-21', style: 'margin-top:14px' },
        C.card({ id: 'UN-2', title: 'Root gaps', finding: top ? '“' + top.skill.name + '” is the gap to fix first: ' + pct(top.stat.p) + ' first try, and ' + top.blocked.length + ' later skills depend on it.' : 'No weak skill with enough evidence.',
          sub: m.gaps.weak + ' weak skills among ' + m.gaps.solid + ' with solid class evidence reduce to ' + roots.length + ' root gaps',
          body: top ? IL.gapPicture(m, top) : null,
          actions: top ? [h('button', { class: 'btn primary', on: { click: function () { IL.openGap(top); } } }, 'Open the top gap'), h('span', { class: 'sub' }, 'Select any row for its evidence')] : null,
          guard: 'Class-level only. The prerequisite graph is machine-built; the dependent skills are listed so you can disagree.' }),
        C.card({ id: 'UN-5', title: 'Depth and format', finding: wg && wg.cls >= 0.15 ? 'They recognise more than they can write: ' + pct(m.format.filter(function (f) { return f.key === 'mchoice'; })[0].p) + ' on multiple choice, ' + pct(m.format.filter(function (f) { return f.key === 'activecode'; })[0].p) + ' on code.' : 'First-try success by depth and question format.',
          body: [h('p', { class: 'sub' }, 'By depth'), C.bars(m.depth.map(function (d) { return { label: ['', 'Recall', 'Apply', 'Reason'][d.key], v: d.p, text: pct(d.p) + ' · ' + d.n }; }), { max: 1, span: 62 }),
            h('p', { class: 'sub', style: 'margin-top:10px' }, 'By format (● class, ┃ typical)'), m.format.map(function (f) {
              var lab = { fillintheblank: 'Fill-in', dragndrop: 'Drag and drop', mchoice: 'Multiple choice', parsonsprob: 'Parsons', activecode: 'Code' }[f.key];
              return h('div', { class: 'split-row', style: 'grid-template-columns:110px 170px auto' }, h('span', null, lab), C.track({ value: f.p, ref: f.norm, w: 170, valueLabel: 'this class', refLabel: 'typical' }), h('span', { class: 'val' }, pct(f.p)));
            })] })));

      // UN-3 reteach
      var rt = m.reteach.slice(0, 4);
      el.appendChild(h('div', { style: 'margin-top:14px' }, C.card({ id: 'UN-3', title: 'Questions to reteach',
        finding: rt.length ? 'On ' + U.plural(m.reteach.filter(function (r) { return r.tier === 1; }).length, 'question') + ' in this window, a wrong answer was chosen at least as often as the right one.' : 'No common wrong answer in this window.',
        body: h('div', { class: 'grid g2' }, rt.map(function (r) {
          return h('div', { style: 'border:1px solid var(--line);border-radius:8px;padding:10px 12px' },
            h('div', { style: 'font-weight:600;font-size:13px;margin-bottom:2px' }, h('a', { on: { click: function () { IL.ev.item(r.item.id); } } }, r.item.name), ' ', h('span', { class: 'tag ' + (r.tier === 1 ? 'warn' : '') }, r.tier === 1 ? 'wrong beats right' : 'one wrong answer dominates')),
            h('div', { class: 'sub', style: 'margin-bottom:6px' }, r.item.subCode + ' · ' + r.n + ' answered · ' + r.correct + ' right first time'),
            C.options({ item: r.item, picks: r.picks, top: r.top }),
            h('div', { class: 'actions' }, h('button', { class: 'btn small primary', on: { click: function () { IL.builder({ recipe: 'Exit Ticket', minutes: 8, sids: m.roster.map(function (s) { return s.id; }), skills: r.item.skills, reason: r.item.name }); } } }, 'Exit Ticket'),
              h('button', { class: 'btn small', on: { click: function () { IL.ev.item(r.item.id); } } }, 'What happened next')));
        })),
        actions: m.reteach.length > 4 ? [h('span', { class: 'sub' }, '+' + (m.reteach.length - 4) + ' more questions meet the rule in this window')] : null,
        guard: 'A shared wrong answer is a pattern to look at, not a diagnosis. Use “Hide names” in the top bar before showing this to the class.' })));

      // UN-4 code
      el.appendChild(h('div', { style: 'margin-top:14px' }, C.card({ id: 'UN-4', title: 'Code sticking points',
        finding: m.code.length ? m.code[0].failing.length + ' of ' + m.code[0].n + ' are still failing “' + m.code[0].item.name + '”' + (m.code[0].topError ? ', most on ' + m.code[0].topError.err + '.' : '.') : 'No coding question has a quarter or more of the class still failing.',
        body: h('div', { class: 'grid g2' }, m.code.slice(0, 4).map(function (c) {
          return h('div', { style: 'border:1px solid var(--line);border-radius:8px;padding:10px 12px' },
            h('div', { style: 'font-weight:600;font-size:13px;margin-bottom:6px' }, h('a', { on: { click: function () { IL.ev.item(c.item.id); } } }, c.item.name), h('span', { class: 'sub', style: 'font-weight:400' }, ' · ' + c.item.subCode + ' · ' + c.n + ' ran code')),
            IL.codePicture(c), h('div', { class: 'actions' }, h('button', { class: 'btn small primary', on: { click: function () { IL.ev.item(c.item.id); } } }, 'Open the runs'),
              h('button', { class: 'btn small', on: { click: function () { IL.builder({ recipe: 'Practice', minutes: 15, sids: c.failing, skills: c.item.skills, reason: c.item.name }); } } }, 'Parsons version for ' + c.failing.length)));
        })),
        guard: 'A failing test names behaviour, not a concept. Runs with no tests are not counted as failures.' })));

      // UN-7 vs norm, UN-8 trajectories
      var trList = m.traj.drop.concat(m.traj.sustained).slice(0, 6);
      el.appendChild(h('div', { class: 'grid g2', style: 'margin-top:14px' },
        C.card({ id: 'UN-7', title: 'Harder here than elsewhere', finding: m.vsNorm.below.length ? m.vsNorm.below.length + ' questions went 20 points or more worse here than in other classes.' : 'No question is well below other classes.',
          body: [h('p', { class: 'sub' }, '● this class   ┃ other classes'), m.vsNorm.below.slice(0, 5).map(function (r) {
            return h('div', { class: 'split-row', style: 'grid-template-columns:minmax(120px,1fr) 170px auto;cursor:pointer', on: { click: function () { IL.ev.item(r.item.id); } } }, h('span', { class: 'lab' }, r.item.name), C.track({ value: r.p, ref: r.norm, w: 170, valueLabel: 'this class', refLabel: 'other classes' }), h('span', { class: 'val' }, pct(r.p) + ' vs ' + pct(r.norm)));
          }), m.vsNorm.above.length ? [h('p', { class: 'sub', style: 'margin-top:10px' }, 'Easier here'), m.vsNorm.above.slice(0, 3).map(function (r) {
            return h('div', { class: 'split-row', style: 'grid-template-columns:minmax(120px,1fr) 170px auto;cursor:pointer', on: { click: function () { IL.ev.item(r.item.id); } } }, h('span', { class: 'lab' }, r.item.name), C.track({ value: r.p, ref: r.norm, w: 170, valueLabel: 'this class', refLabel: 'other classes' }), h('span', { class: 'val' }, pct(r.p) + ' vs ' + pct(r.norm)));
          })] : null],
          guard: 'Compared question by question with an anonymous pool of at least 200 learners. Never a ranking of classes or teachers.' }),
        C.card({ id: 'UN-8', title: 'Student trajectories', finding: trList.length ? m.traj.drop.length + ' dropped sharply against classmates; ' + m.traj.sustained.length + ' have stayed well below for two periods.' : 'No student has dropped or stayed well below classmates.',
          body: trList.length ? IL.trajPicture(m, trList) : null,
          guard: 'Relative to classmates on the same questions, so harder content does not look like a decline. Not a prediction; it clears when the gap closes.' })));

      // UN-9 next, UN-10 blind spots
      var nx = m.next, blind = m.blind.filter(function (x) { return x.topic.unit.id === (sel ? sel.unit.id : null); })[0] || m.blind[m.blind.length - 1];
      var MARK = { solid: ['●', 'solid', 'good'], mixed: ['◐', 'mixed', ''], shaky: ['◐', 'shaky', 'warn'], unseen: ['○', 'not yet seen', ''] };
      el.appendChild(h('div', { class: 'grid g2', style: 'margin-top:14px' },
        C.card({ id: 'UN-9', title: 'Ready for what is next', finding: nx ? (function () { var k = nx.rows.filter(function (r) { return r.state === 'shaky'; }).length; return k + ' of the ' + nx.rows.length + ' skills that “' + nx.sub.code + ' ' + nx.sub.name + '” builds on ' + (k === 1 ? 'is' : 'are') + ' shaky.'; })() : 'No upcoming unit found.',
          body: nx ? [h('table', { class: 't' }, h('tbody', null, nx.rows.map(function (r) {
            var mk = MARK[r.state];
            return h('tr', null, h('td', { style: 'width:110px' }, h('span', { class: 'tag ' + mk[2] }, mk[0] + ' ' + mk[1])), h('td', null, r.skill.name),
              h('td', { class: 'num' }, r.stat ? [C.meter(r.stat.p), ' ' + pct(r.stat.p)] : '–'), h('td', { class: 'num sub' }, r.shaky.length ? r.shaky.length + ' students shaky' : ''));
          }))), nx.multi.length ? h('p', { class: 'note' }, h('b', null, nx.multi.length + ' students are shaky on two or more: '), IL.whoList(nx.multi, 8)) : null] : null,
          actions: nx ? [h('button', { class: 'btn primary', on: { click: function () { IL.builder({ recipe: 'Warm-up', minutes: 8, sids: m.roster.map(function (s) { return s.id; }), skills: nx.rows.filter(function (r) { return r.state === 'shaky'; }).map(function (r) { return r.skill.id; }).slice(0, 2), reason: 'before ' + nx.sub.code }); } } }, 'Add a Warm-up'),
            h('button', { class: 'btn', on: { click: function () { IL.builder({ recipe: 'Pretest', minutes: 15, sids: m.roster.map(function (s) { return s.id; }), skills: nx.rows.map(function (r) { return r.skill.id; }).slice(0, 3), reason: 'before ' + nx.sub.code }); } } }, 'Pretest')] : null }),
        C.card({ id: 'UN-10', title: 'Evidence blind spots', finding: blind ? (blind.none.length ? blind.none.length + ' of the ' + blind.taught + ' skills taught in chapter ' + blind.topic.unit.num + ' have no questions in any attached textbook.' : 'Every skill taught in chapter ' + blind.topic.unit.num + ' has questions somewhere.') : '',
          body: blind ? [C.split([{ n: blind.here, cls: 's-done', label: 'Questions in this chapter' }, { n: blind.elsewhere.length, cls: 's-late', label: 'Questions elsewhere in these textbooks' }, { n: blind.none.length, cls: 's-hatch', label: 'No questions anywhere' }], { size: 'tall' }),
            C.legend([{ cls: 's-done', label: 'questions here ' + blind.here }, { cls: 's-late', label: 'elsewhere ' + blind.elsewhere.length }, { cls: 's-hatch', label: 'none ' + blind.none.length }]),
            blind.none.length ? h('p', { class: 'note' }, h('b', null, 'The Lens cannot report on: '), blind.none.map(function (s) { return s.name; }).join(' · ')) : null,
            h('p', { class: 'sub', style: 'margin-top:8px' }, 'No questions anywhere, by chapter: ' + m.blind.map(function (x) { return 'chapter ' + x.topic.unit.num + ', ' + x.none.length + ' of ' + x.taught; }).join(' · '))] : null,
          actions: blind && blind.none.length ? [h('button', { class: 'btn', on: { click: function () { IL.toast('Would open the quiz generator for ' + blind.none.length + ' skills.'); } } }, 'Generate questions')] : null,
          guard: 'Hatching means “cannot be seen”. It is not zero.' })));

      // UN-6 transfer, UN-11 quality, UN-12 dip
      var cards = [];
      if (sec.textbooks.length > 1 && m.transfer.length) {
        var tf = m.transfer.filter(function (t) { return Math.abs(t.gap) >= 0.2; }).slice(0, 6);
        cards.push(C.card({ id: 'UN-6', title: 'Same skill, different textbook', finding: tf.length ? '“' + tf[0].skill.name + '” is at ' + pct(tf[0].primary.p) + ' in ' + tf[0].primary.tb.short + ' and ' + pct(tf[0].other.p) + ' in ' + tf[0].other.tb.short + '.' : 'No large gap between textbooks.',
          body: tf.length ? [C.dumbbell({ rows: tf.map(function (t) { return { label: t.skill.name + ' (' + t.other.tb.short + ')', a: t.other.p, b: t.primary.p, aTip: t.other.tb.short + ' · ' + t.other.n + ' attempts', bTip: t.primary.tb.short + ' · ' + t.primary.n + ' attempts' }; }),
            min: 0, max: 1, labW: 250, w: 620, aLabel: 'supplemental', bLabel: sec.textbooks[0].tb.short, colors: ['#16A085', '#1864F2'], upColor: '#9aa0aa', downColor: '#9aa0aa' })] : null,
          guard: 'Lab and exam questions differ in format and depth from the main textbook, which accounts for some of the gap.' }));
      }
      var wide = [];
      var ql = m.quality, STAT = { hard: ['Too hard for now', 'warn', 'Add a scaffold'], flat: ['Not separating', '', 'Review the question'], easy: ['Too easy', '', 'Use as a warm-up'] };
      wide.push(C.card({ id: 'UN-11', title: 'Question quality', finding: ql.counts.hard + ' questions this class attempted stay hard even after practice; ' + ql.counts.flat + ' do not separate stronger from weaker students.',
        body: h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Question'), h('th', null, 'Right first time'), h('th', null, 'After practice'), h('th', null, 'Separates'), h('th', null, 'Status'), h('th', null, 'Suggested'))),
          h('tbody', null, ql.rows.slice(0, 8).map(function (r) {
            return h('tr', { class: 'click', on: { click: function () { IL.ev.item(r.item.id); } } }, h('td', null, r.item.name), h('td', null, C.icons(r.p)), h('td', null, C.icons(r.pe)), h('td', null, r.dp < 0.2 ? 'low' : 'good'),
              h('td', null, h('span', { class: 'tag ' + STAT[r.status][1] }, STAT[r.status][0])), h('td', { class: 'sub' }, STAT[r.status][2]));
          }))),
        guard: 'Measured across all learners on the platform, shown as “out of 10 students”. Response time is not used to judge a question.' }));
      cards.push(C.card({ id: 'UN-12', title: 'Class-wide dip', finding: m.dip.flagged ? 'In the week of ' + T.fmtDay(m.dip.flagged.point.week * 7) + ' the class fell ' + Math.round((m.dip.flagged.point.trail - m.dip.flagged.point.gap) * 100) + ' points below its level of the previous month.' : 'No class-wide dip: the class has stayed near its usual level against typical.',
        body: m.dip.series.length ? IL.dipPicture(m) : h('p', { class: 'empty' }, 'Not enough questions with a platform norm yet.'),
        guard: 'Measured against typical results on the same questions, so a harder unit does not look like a dip.' }));
      el.appendChild(h('div', { class: 'grid ' + (cards.length > 1 ? 'g2' : ''), style: 'margin-top:14px' }, cards));
      el.appendChild(h('div', { style: 'margin-top:14px' }, wide));
    } };
})(typeof window !== 'undefined' ? window : globalThis);

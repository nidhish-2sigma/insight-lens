/* Insight Lens mock · tabs: Engagement, Work habits, Students (grid, signals, side by side, movement, groups,
   student page), Follow-ups. Headlines, firing and student flags come from the shared insight records. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, M = IL.M, I = IL.I, h = IL.h, C = IL.C, pct = IL.pct;
  if (!root.document) return;
  var signed = function (v) { var r = Math.round(v * 100); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r); };
  var ids = function (rows) { return rows.map(function (x) { return x.sid; }); };

  // ---------- Engagement ----------
  IL.tabs.engagement = { label: 'Engagement', question: 'Who is showing up, and when?',
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, ins = ctx.ins, st = ctx.st, N = m.roster.length;
      IL.layout(el, ctx, this, [
        { id: 'EN-1', build: function () {
          var wk = m.rhythm.weeks, first = m.rhythm.firstWeek;
          var dayGrid = C.heat({ rows: T.DOW, cols: wk.map(function (x) { return T.fmtDay(x.week * 7).split(' ')[0]; }), max: N,
            value: function (r, c) { return m.rhythm.days[(c + first) * 7 + r] || 0; }, tip: function (r, c, v) { return T.fmtDayLong((c + first) * 7 + r) + '\n' + v + ' of ' + N + ' students active'; } });
          var anyLow = wk.some(function (x) { return x.classWeek && x.active < 0.9 * N; });
          return { body: [h('p', { class: 'sub' }, 'Students active each week, of ' + N + ' on the roster'),
            C.fit(function (W) {
              var cw = Math.max(34, Math.min(90, (W - 130) / wk.length));
              return C.columns({ vals: wk.map(function (x) { return { v: x.active, pale: !x.classWeek, warn: x.classWeek && x.active < 0.9 * N, label: T.fmtDay(x.week * 7), top: String(x.active), tip: 'Week of ' + T.fmtDay(x.week * 7) + '\n' + x.active + ' of ' + N + ' active' + (x.classWeek ? '' : '\nquiet week: does not count toward inactivity') }; }),
                max: N, w: W, cw: cw, h: 124, label: 'Students active per week' });
            }),
            C.legend([{ color: '#1864F2', label: 'class week' }].concat(anyLow ? [{ color: '#E9A400', label: 'class week with under 90% of the roster active' }] : []).concat(wk.some(function (x) { return !x.classWeek; }) ? [{ color: '#d9dce2', label: 'quiet week (break, or nothing assigned)' }] : [])),
            h('p', { class: 'more-line' }, h('button', { class: 'link-btn', on: { click: function () { st.view.days = !st.view.days; IL.render(); } } }, st.view.days ? '▾ By day' : '▸ By day')),
            st.view.days ? [h('p', { class: 'sub', style: 'margin:4px 0' }, 'Darker means more students active'), dayGrid] : null],
            table: function () { return C.table(['Week of', 'Students active', 'Class week'], wk.map(function (x) { return [T.fmtDay(x.week * 7), x.active + ' of ' + N, x.classWeek ? 'yes' : 'no']; })); } };
        } },
        { id: 'EN-2', half: true, build: function (c) {
          return { body: IL.quietPicture(m),
            actions: [IL.listBtn('Check in with', c.rows, function (list) { IL.logCheckin(list); }, 'primary'), h('button', { class: 'btn', on: { click: function () { IL.toast('Would open People to confirm enrolment.'); } } }, 'Confirm enrolment')] };
        } },
        { id: 'EN-5', half: true, build: function () {
          var rc = m.rosterCheck;
          return { body: [h('p', { class: 'sub' }, 'Never signed in (' + rc.never.length + ')'), rc.never.length ? C.named(rc.never, 'off') : h('p', { class: 'empty' }, 'None'),
            h('p', { class: 'sub', style: 'margin-top:10px' }, 'Active, not on the roster (' + rc.off.length + ')'), rc.off.length ? h('div', { class: 'named' }, rc.off.map(function (sid) { return h('span', null, h('i', { class: 'dot muted' }), IL.nm(sid)); })) : h('p', { class: 'empty' }, 'None')],
            actions: [IL.listBtn('Re-invite', rc.never, function (list) { IL.toast('Would re-send invitations to ' + U.plural(list.length, 'student') + '.'); })] };
        } },
        { id: 'EN-3', build: function () {
          var hours = []; for (var hr = 6; hr <= 22; hr++) hours.push(hr);
          var wsp = m.when.split;
          return { body: [h('p', { class: 'sub' }, 'When this class works · hour of day by weekday · whole term · outlined cells are inferred class sessions'),
            C.heat({ rows: T.DOW, cols: hours.map(function (x) { return String(x); }), max: m.when.max, value: function (r, c) { return m.when.grid[r][hours[c]]; },
              outline: function (r, c) { return (m.when.sessionCells[r + ':' + hours[c]] || 0) >= 3; }, tip: function (r, c, v) { return T.DOW[r] + ' ' + hours[c] + ':00\n' + v + ' recorded minutes this term' + ((m.when.sessionCells[r + ':' + hours[c]] || 0) >= 3 ? '\ninferred class session' : ''); } }),
            h('div', { style: 'margin-top:12px' }, C.splitRow('Recorded minutes', [{ n: wsp.inClass, cls: 's-done', label: 'In class sessions' }, { n: wsp.sameDay, cls: 's-part', label: 'Same day, outside the session' }, { n: wsp.other, cls: 's-prog', label: 'Other days, evenings and weekends' }],
              'in class ' + pct(wsp.inClass / wsp.total) + ' · same day ' + pct(wsp.sameDay / wsp.total) + ' · other ' + pct(wsp.other / wsp.total), { size: 'tall' })),
            C.legend([{ cls: 's-done', label: 'in class sessions' }, { cls: 's-part', label: 'same day, outside the session' }, { cls: 's-prog', label: 'other days' }]),
            m.when.absent.length ? [h('p', { class: 'sub', style: 'margin:12px 0 4px' }, 'No activity on three or more class days in this window'),
              C.register({ cols: m.when.sessDaysWin.map(function (d) { return { label: T.fmtDay(d).split(' ')[0], tip: T.fmtDayLong(d) }; }), noteHead: '',
                rows: m.when.absent.slice(0, 8).map(function (x) { return { sid: x.sid, cells: x.days.map(function (on) { return on ? 'yes' : 'no'; }), note: x.missed + ' of ' + x.of + ' class days' }; }), words: { yes: 'active', no: 'no recorded activity' } }),
              m.when.absent.length > 8 ? h('p', { class: 'sub' }, '+' + (m.when.absent.length - 8) + ' more') : null] : null],
            actions: [h('button', { class: 'btn', on: { click: function () { IL.toast('Would open class settings to confirm meeting times.'); } } }, 'Confirm class times')] };
        } },
        { id: 'EN-4', build: function (c) {
          var q = m.map.quads;
          var cell = function (title, list) { return h('td', { class: 'quad' }, h('div', { class: 'qt' }, title + ' (' + list.length + ')'), h('div', { class: 'ql' }, IL.whoList(list, 12))); };
          return { body: h('div', { class: 'grid g-21 linked' }, h('div', null, C.fit(function (W) {
              return C.quadrant({ w: W, dots: m.map.dots.map(function (d) { return { sid: d.sid, x: d.x, y: d.y, hot: m.stu[d.sid].strict === 'grind' }; }), medX: m.map.medMin, medY: m.map.medFts,
                names: M.QUAD, hotQuad: 'br', label: 'Recorded time and right first time, against the class medians',
                ends: { xLo: 'Less recorded time', xHi: 'More recorded time', yLo: 'Fewer right first time', yHi: 'More right first time' },
                endsShort: { xLo: 'Less time', xHi: 'More time', yLo: 'Fewer right', yHi: 'More right' },
                fmt: function (d) { return d.x + ' min, ' + pct(d.y) + ' right first time'; } });
            }),
            h('p', { class: 'sub', style: 'margin-top:6px' }, 'The axes cross at the class medians: ' + Math.round(m.map.medMin) + ' recorded minutes and ' + pct(m.map.medFts) + ' right first time. One bubble is one student; a number is that many students in the same place.'),
            C.legend([{ color: '#dfe2e8', label: 'a student' }, { color: '#E9A400', label: 'far more time and far fewer right first time (' + c.rows.length + ')' }])),
            h('div', null, h('table', { style: 'border-collapse:collapse;width:100%' }, h('tbody', null,
              h('tr', null, cell(M.QUAD.tl, q.tl), cell(M.QUAD.tr, q.tr)),
              h('tr', null, cell(M.QUAD.bl, q.bl), cell(M.QUAD.br, q.br)))),
              m.map.away.length ? h('p', { class: 'note' }, h('b', null, 'Not placed, no recent activity (' + m.map.away.length + '): '), IL.whoList(m.map.away)) : null,
              m.map.low.length ? h('p', { class: 'note' }, h('b', null, 'Not placed, too little work to say (' + m.map.low.length + '): '), IL.whoList(m.map.low)) : null,
              h('p', { class: 'sub', style: 'margin-top:8px' }, 'Point at a name to find its bubble.'))),
            actions: [IL.listBtn('Remediation for', c.rows, function (list) { IL.builder({ recipe: 'Remediation', minutes: 15, sids: list, skills: m.gaps.roots.slice(0, 1).map(function (g) { return g.skill.id; }), reason: M.QUAD.br.toLowerCase() }); }, 'primary')],
            table: function () { return C.table(['Student', 'Recorded minutes', 'Right first time', 'Questions'], m.map.dots.map(function (d) { return [IL.nm(d.sid), d.x, pct(d.y), m.stu[d.sid].n]; })); } };
        } }
      ]);
    } };

  // ---------- Work habits ----------
  IL.tabs.habits = { label: 'Work habits', question: 'How are they working?',
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, ins = ctx.ins, rt = m.retry;
      IL.layout(el, ctx, this, [
        { id: 'WH-1', half: true, build: function () {
          var ex = null;
          if (rt.flagged.length) {
            var sid = rt.flagged[0].sid;
            ex = sec.records.filter(function (r) { return r.sid === sid && sec.items[r.item].type === 'mchoice' && r.attempts.length >= 4 && r.attempts[1].dur < 3; })[0];
          }
          var show = rt.flagged.length ? rt.flagged : rt.students.slice(0, 3);
          return { body: [h('p', { class: 'sub' }, 'After a wrong answer, the next try came…'),
            C.splitRow('Class', [{ n: rt.buckets[0], cls: 's-warn', label: 'Within 3 seconds' }, { n: rt.buckets[1], cls: 's-mute', label: '3 to 10 seconds' }, { n: rt.buckets[2], cls: 's-done', label: 'Longer' }], pct(rt.buckets[0] / rt.total) + ' · ' + pct(rt.buckets[1] / rt.total) + ' · ' + pct(rt.buckets[2] / rt.total), { size: 'tall' }),
            show.slice(0, 6).map(function (x) { return C.splitRow(IL.who(x.sid, ids(show)), [{ n: Math.round(x.rapid * 100), cls: 's-warn', label: 'Within 3 seconds' }, { n: 100 - Math.round(x.rapid * 100), cls: 's-mute', label: 'Slower' }], pct(x.rapid) + ' of ' + x.retries + ' retries'); }),
            C.legend([{ cls: 's-warn', label: 'within 3 seconds' }, { cls: 's-mute', label: '3 to 10 seconds, or slower for a student' }, { cls: 's-done', label: 'longer' }]),
            ex ? h('div', { style: 'margin-top:10px' }, h('p', { class: 'sub' }, 'One question, one student: ', IL.who(ex.sid), ' on “' + sec.items[ex.item].name + '”'), C.tape(ex.attempts, { labelled: true })) : null],
            actions: [h('button', { class: 'btn', on: { click: function () { IL.toast('Would set “attempts per question” to 2 on the next assignment.'); } } }, 'Limit attempts next time'),
              h('button', { class: 'btn', on: { click: function () { IL.toast('Would switch feedback to “on submit” for the next assignment.'); } } }, 'Feedback on submit')] };
        } },
        { id: 'WH-2', half: true, build: function () {
          return { body: [h('p', { class: 'sub' }, 'Share of each student’s first answers that were wrong and under 5 seconds · ' + (m.fastWrong.dots.length > 80 ? 'columns count students' : 'one bubble per student')),
            C.fit(function (W) {
              // the axis covers the range the class is in, so the bubbles are not crushed against zero
              var hi = Math.max(20, Math.ceil((Math.max.apply(null, m.fastWrong.dots.map(function (d) { return d.v * 100; }).concat([0])) + 4) / 10) * 10);
              return C.strip({ w: W, dots: m.fastWrong.dots.map(function (d) { return { sid: d.sid, v: d.v * 100 }; }), min: 0, max: hi, median: m.fastWrong.median * 100, fmt: function (v) { return Math.round(v) + '%'; }, ticks: [0, hi / 2, hi],
                flag: function (d) { return m.fastWrong.flagged.some(function (f) { return f.sid === d.sid; }); }, label: 'Fast wrong first answers' });
            }),
            C.legend([{ color: '#dfe2e8', label: 'a student' }, { color: '#E9A400', label: 'at a quarter or more, and in the top tenth (' + m.fastWrong.flagged.length + ')' }]),
            m.fastWrong.flagged.length ? h('p', { class: 'note' }, h('b', null, 'Highest: '), m.fastWrong.flagged.map(function (f, i) { return [i ? ' · ' : '', IL.who(f.sid, ids(m.fastWrong.flagged)), ' ' + pct(f.v)]; })) : null],
            table: function () { return C.table(['Student', 'Fast wrong first answers'], m.fastWrong.dots.slice().sort(U.by(function (d) { return d.v; }, true)).map(function (d) { return [IL.nm(d.sid), pct(d.v)]; })); } };
        } },
        { id: 'WH-3', half: true, build: function () {
          var un = m.unresolved;
          return { body: [h('p', { class: 'sub' }, 'Most often left unsolved · students who tried and never got it right'),
            C.bars(un.items.slice(0, 6).map(function (x) { return { label: x.item.name, v: x.students.length, text: x.students.length + ' of ' + x.n + ' who tried', cls: 'red', tip: IL.names(x.students), onClick: function () { IL.ev.item(x.item.id); } }; }), { span: 42 }),
            h('p', { class: 'sub', style: 'margin:12px 0 4px' }, 'Per student · questions never solved · class median ' + Math.round(un.median)),
            un.students.slice(0, 5).map(function (x) { return h('div', { class: 'split-row', style: 'grid-template-columns:1fr auto' }, IL.who(x.sid, ids(un.students)), h('b', null, x.n + ' unsolved')); })],
            actions: [IL.listBtn('Assign “finish these” to', ids(un.students), function (list) { IL.toast('Would assign ' + U.plural(list.length, 'student') + ' their own “finish these” set.'); })] };
        } },
        { id: 'WH-4', half: true, build: function (c) {
          var still = c.still || [], got = c.got || [];
          return { body: m.stuck.length ? [IL.stuckPicture(m, 4), C.legend([{ cls: 's-done', label: 'passed' }, { cls: 's-bad', label: 'failed' }]),
            h('p', { class: 'sub', style: 'margin-top:6px' }, 'Showing ' + Math.min(4, m.stuck.length) + ' of ' + m.stuck.length + ': ' + still.length + ' not passing, ' + got.length + ' passed after many runs. Not passing comes first.')] : null,
            actions: [IL.listBtn('Check in with', c.rows, function (list) { IL.logCheckin(list); })] };
        } },
        { id: 'WH-5', half: true, build: function (c) {
          var fb = m.help;
          return { body: [C.splitRow('Feedback opened', [{ n: fb.seen, cls: 's-done', label: 'Opened' }, { n: fb.feedback.length - fb.seen, cls: 's-none', label: 'Not opened' }], fb.seen + ' of ' + fb.feedback.length + ' opened', { size: 'tall' }),
            c.rows.length ? h('p', { class: 'note' }, h('b', null, 'Not opened by ' + U.plural(c.rows.length, 'student') + ': '), IL.whoList(c.rows, 8)) : null,
            h('p', { class: 'sub', style: 'margin:12px 0 2px' }, 'Questions waiting for a reply · ', h('b', { style: 'color:var(--ink)' }, String(fb.questions.length))),
            fb.questions.map(function (q) { return h('p', { class: 'note', style: 'margin-top:4px' }, h('span', { class: 'tag teacher' }, T.ago(q.t, world.now)), ' ', IL.who(q.sid), ': “' + q.text + '”'); }),
            h('div', { style: 'height:8px' }),
            C.splitRow('Hints opened', [{ n: 1, cls: 's-hatch', label: 'Not recorded' }], 'not recorded yet', { size: 'tall' })],
            actions: [IL.listBtn('Nudge', c.rows, function (list) { IL.toast('Would send a nudge to open feedback to ' + U.plural(list.length, 'student') + '.'); }),
              fb.questions.length ? h('button', { class: 'btn primary', on: { click: function () { IL.toast('Would open the feedback thread.'); } } }, 'Reply to ' + fb.questions.length) : null] };
        } },
        { id: 'WH-6', half: true, build: function () {
          var mk = m.markers[0];
          return { body: mk ? h('div', { class: 'inner' }, h('div', { style: 'font-weight:600;font-size:13px' }, 'Paste record · ', IL.who(mk.sid), ' · ' + sec.items[mk.item].name),
            h('p', { class: 'note' }, 'A paste of ' + mk.chars + ' characters from outside ALPS (or an untraceable source). This records how the text entered the editor; it does not identify the source or imply misconduct.'),
            h('div', { class: 'actions' }, h('a', { on: { click: function () { IL.ev.item(mk.item); } } }, 'View in work history →'))) : null };
        } }
      ]);
    } };

  // ---------- Students ----------
  var MARK_WORD = { first: 'right first time', later: 'right after more than one try', wrong: 'never right', pending: 'awaiting grading', none: 'not started' };

  function ucell(sid, tbId, col, c, path) {
    if (!col.open) return h('div', { class: 'ucell closed', 'aria-label': 'not opened' });
    var touched = c.correct + c.error + c.pending;
    var tip = col.label + (col.kind === 'skill' ? '' : ' ' + col.name) + '\n'
      + 'Right first time: ' + (c.n ? c.ok + ' of ' + c.n + ' · ' + pct(c.fts) : 'no graded answers yet') + '\n'
      + 'Work completed: ' + c.pc + '% · ' + c.correct + ' correct, ' + c.error + ' incorrect, ' + c.pending + ' awaiting grading, ' + c.untouched + ' not started\n'
      + (c.band.state === 'scored' ? 'Learning band: ' + M.BANDS[c.band.level] + ' (' + c.band.coverage + '% of the unit scored)\n' : '')
      + 'Recorded activity: ' + M.ENG[c.eng] + ' (' + Math.round(c.min) + ' min)';
    return h('button', { class: 'ucell' + (c.tint != null ? ' t' + c.tint : '') + (col.kind === 'skill' ? ' sk' : ''), tip: tip,
      'aria-label': IL.nm(sid) + ', ' + col.label + ', ' + (c.n >= 3 ? pct(c.fts) + ' right first time' : 'not enough answers') + ', ' + c.pc + '% complete',
      on: { click: function () { IL.ev.cell(sid, tbId, col.id, path); } } },
      col.kind === 'skill'
        ? [h('span', { class: 'qmarks' }, c.marks.slice(0, 8).map(function (q) { return h('i', { class: 'qm ' + q.state, tip: q.item.name + '\n' + MARK_WORD[q.state] }); }),
            c.marks.length > 8 ? h('span', { class: 'more' }, '+' + (c.marks.length - 8)) : null),
          h('span', { class: 'val sm' }, c.n >= 3 ? pct(c.fts) : '')]
        : [h('span', { class: 'val' }, c.n >= 3 ? pct(c.fts) : touched ? c.n + 'q' : ''), touched === 0 ? h('span', { class: 'na' }, '–') : null]);
  }
  function flagTags(ins, sid, max) {
    var fs = ins.flags[sid] || [], out = fs.slice(0, max || 9).map(function (f) { return h('span', { class: 'tag ' + (f.good ? 'good' : f.tone === 'warn' ? 'warn' : ''), tip: f.reason || null }, f.label); });
    if (fs.length > (max || 9)) out.push(h('span', { class: 'tag' }, '+' + (fs.length - max)));
    return out;
  }
  // The student lists share one set of controls: who needs attention comes first, and a flag can filter the list.
  function listControls(ctx, extraSorts, cols) {
    var st = ctx.st, ins = ctx.ins, m = ctx.m;
    var sorts = [['attention', 'Needs attention first'], ['name', 'Name']].concat(extraSorts || []);
    var sort = st.view.sort || 'attention', flag = st.view.flag || null;
    if (!sorts.some(function (s) { return s[0] === sort; })) sort = 'attention';
    var opts = [['', 'All ' + m.roster.length + ' students'], ['flagged', 'Flagged · ' + ins.flagged.length]].concat(ins.flagKeys.map(function (k) { return [k.key, k.label.charAt(0).toUpperCase() + k.label.slice(1) + ' · ' + k.n]; }));
    var pick = h('label', { class: 'pick' }, h('span', null, 'Show'), h('select', { class: 'sel', 'aria-label': 'Filter students', on: { change: function (e) { st.view.flag = e.target.value || null; IL.render(); } } },
      opts.map(function (o) { return h('option', { value: o[0], selected: (flag || '') === o[0] ? 'selected' : null }, o[1]); })));
    var list = ins.byAttention.filter(function (sid) {
      if (!flag) return true;
      if (flag === 'flagged') return ins.attention[sid] > 0;
      return ins.flags[sid].some(function (f) { return f.key === flag; });
    });
    if (sort === 'name') list = list.slice().sort(U.by(function (sid) { return ctx.sec.students[sid].name; }));
    // a long roster shows its first rows (the ones that need attention, by default) and offers the rest
    var all = list, LIMIT = 40, cut = !st.view.all && list.length > LIMIT;
    if (cut) list = list.slice(0, LIMIT);
    var more = all.length > LIMIT ? h('p', { class: 'more-row' }, h('button', { class: 'link-btn', on: { click: function () { st.view.all = !st.view.all; IL.render(); } } }, cut ? 'Showing the first ' + LIMIT + ' of ' + all.length + '. Show all ' + all.length : 'Show the first ' + LIMIT + ' only')) : null;
    var tools = [pick, h('label', { class: 'pick' }, h('span', null, 'Sort'), h('select', { class: 'sel', 'aria-label': 'Sort students', on: { change: function (e) { st.view.sort = e.target.value; IL.render(); } } },
      sorts.map(function (o) { return h('option', { value: o[0], selected: sort === o[0] ? 'selected' : null }, o[1]); })))];
    if (cols && ['attention', 'name'].indexOf(sort) < 0) tools.push(h('select', { class: 'sel', 'aria-label': 'Column to sort by', on: { change: function (e) { st.view.sortCol = e.target.value; IL.render(); } } },
      cols.map(function (c) { return h('option', { value: c.id, selected: st.view.sortCol === c.id ? 'selected' : null }, c.kind === 'skill' ? c.name : c.label + ' ' + c.name); })));
    return { sort: sort, flag: flag, list: list, all: all, more: more, tools: tools };
  }

  function gridView(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st, ins = ctx.ins;
    // the grid shows one textbook at a time, and says which
    var tbId = st.tb !== 'all' ? st.tb : (st.view.gridTb && sec.textbooks.some(function (x) { return x.tb.id === st.view.gridTb; }) ? st.view.gridTb : sec.textbooks[0].tb.id), tb = world.textbooks[tbId];
    var path = Array.isArray(st.view.path) ? st.view.path : [];
    var g = M.grid(world, sec, tbId, path);
    path = g.path; st.view.path = path;
    var level = g.level, open = g.cols.filter(function (c) { return c.open; });
    var ctl = listControls(ctx, [['result', 'Lowest first try'], ['done', 'Least complete'], ['time', 'Most time']], open);
    var sortCol = open.filter(function (c) { return c.id === st.view.sortCol; })[0] || open.slice(-1)[0];
    var order = ctl.list.slice();
    if (['result', 'done', 'time'].indexOf(ctl.sort) >= 0 && sortCol) {
      var key = { result: function (c) { return c.n >= 3 ? c.fts : 2; }, done: function (c) { return c.pc; }, time: function (c) { return -c.min; } }[ctl.sort];
      order.sort(U.by(function (sid) { return key(g.cells[sid + '|' + sortCol.id]); }));
    }
    var crumbs = [h('a', { class: path.length ? '' : 'on', on: { click: function () { st.view.path = []; IL.go({}); } } }, tb.supplemental ? 'All units' : 'All chapters')];
    if (path.length) crumbs.push(h('span', { class: 'sep' }, '›'), h('a', { class: path.length === 1 ? 'on' : '', on: { click: function () { st.view.path = path.slice(0, 1); IL.go({}); } } }, tb.supplemental ? tb.name : g.chapter.num + ' ' + g.chapter.name));
    if (level === 'skill') crumbs.push(h('span', { class: 'sep' }, '›'), h('a', { class: 'on' }, g.sub.code + ' ' + g.sub.name));

    var legend = [h('span', { class: 'lg-lab' }, 'Right first time')].concat(M.FTS_BANDS.map(function (b2, i) { return h('span', null, h('i', { class: 'sw t' + i }), b2); }));
    var second = level === 'skill'
      ? [h('span', { class: 'lg-lab' }, 'One dot per question')].concat(['first', 'later', 'wrong', 'pending', 'none'].map(function (k) { return h('span', null, h('i', { class: 'qm ' + k }), MARK_WORD[k]); }))
      : null;

    var head = h('tr', null, h('th', { class: 'name' }, 'Student · ' + order.length + ' shown'),
      g.cols.map(function (c) {
        var drillable = c.drill && c.open;
        return h('th', { class: c.open ? '' : 'dim' },
          h('div', { class: 'ch' + (drillable ? ' link' : ''), tip: c.name + (drillable ? '\nOpen its ' + (c.kind === 'chapter' ? 'subunits' : 'skills') : ''),
            on: drillable ? { click: function () { st.view.path = path.concat([c.id]); IL.go({}); } } : null },
            c.kind === 'skill' ? h('b', { class: 'clamp' }, c.name) : [h('b', null, c.label), h('span', null, c.name)],
            drillable ? h('span', { class: 'go' }, '›') : null),
          c.open ? h('div', { class: 'col-n' }, c.questions + ' questions') : null);
      }));
    var classRow = h('tr', { class: 'cls-row' }, h('td', { class: 'name' }, h('b', null, 'Class'), h('span', { class: 'sub' }, ' ' + m.roster.length + ' students')),
      g.cols.map(function (c) {
        if (!c.open) return h('td', null, h('div', { class: 'ucell closed lab' }, c.kind === 'chapter' && m.topics.some(function (t) { return t.unit.id === c.id && t.skipped; }) ? 'skipped' : 'not opened'));
        return h('td', null, h('div', { class: 'ucell cls', tip: c.name + '\nClass right first time ' + pct(c.classFts) + '\nMean completion ' + c.classPc + '%\n' + c.started + ' of ' + m.roster.length + ' students have started' },
          h('b', null, pct(c.classFts)), h('small', null, c.classPc + '% done')));
      }));
    var rows = order.map(function (sid) {
      return h('tr', null, h('td', { class: 'name' }, IL.who(sid, order), h('span', { class: 'flags', tip: (ins.flags[sid] || []).map(function (f) { return f.label + (f.reason ? ': ' + f.reason : ''); }).join('\n') || null }, flagTags(ins, sid, 1))),
        g.cols.map(function (c) { return h('td', null, ucell(sid, tbId, c, g.cells[sid + '|' + c.id], path)); }));
    });
    var sub = level === 'chapter' ? 'Select a cell for its evidence, or a column heading to go a level deeper.'
      : level === 'sub' ? 'Subunits of ' + g.chapter.num + ' ' + g.chapter.name + '. Select a column heading to see the skills it assesses.'
      : 'Skills assessed in ' + g.sub.code + ' ' + g.sub.name + '. A question counts toward every skill it is tagged with, so columns overlap.';
    var pickTb = sec.textbooks.length > 1 && st.tb === 'all' ? h('div', { class: 'chips', style: 'margin-bottom:10px' }, h('span', { class: 'sub' }, 'Textbook'),
      sec.textbooks.map(function (x) { return h('button', { class: 'chip' + (x.tb.id === tbId ? ' on' : ''), on: { click: function () { st.view.gridTb = x.tb.id; st.view.path = []; IL.go({}); } } }, h('i', { class: 'dot', style: 'background:' + x.tb.accent }), x.tb.short, h('small', null, x.role === 'primary' ? 'primary' : x.tb.kind.toLowerCase())); })) : null;
    el.appendChild(C.card({ title: 'By chapter · ' + tb.name, sub: sub, basis: IL.basisLabel('term'), tools: ctl.tools,
      guard: 'Colour is a summary of first-try success, never a grade, and a cell with fewer than three graded answers shows no colour. Completion, recorded activity and, where they exist, learning bands are in a cell’s tooltip and its evidence drawer.',
      body: [pickTb, h('div', { class: 'crumbs' }, crumbs),
        h('div', { class: 'legend grid-legend', style: 'margin-bottom:8px' }, legend), second ? h('div', { class: 'legend grid-legend', style: 'margin-bottom:8px' }, second) : null,
        h('div', { class: 'ugrid-wrap' }, h('table', { class: 'ugrid', style: '--cols:' + g.cols.length + ';--cell:' + (level === 'skill' ? 190 : 150) + 'px' }, h('thead', null, head), h('tbody', null, classRow, rows))),
        ctl.more, !order.length ? h('p', { class: 'empty' }, 'No student matches this filter.') : null] }));
  }

  // The default view. One row per student with something flagged: the reasons, three small pictures of their
  // work, and the next step those reasons point to. Everyone else is one click away.
  function signalView(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, ins = ctx.ins, st = ctx.st, R = IL.R, today = T.day(world.now);
    var ctl = listControls(ctx);
    var has = function (sid) { return (ins.flags[sid] || []).length > 0; };
    var fold = !ctl.flag && !st.view.rest, list = fold ? ctl.list.filter(has) : ctl.list, rest = ctl.list.length - list.length;
    var rows = list.map(function (sid) {
      var x = m.stu[sid], days = [], a = sec.act[sid] || {};
      for (var d = today - 14; d < today; d++) days.push(a[d] ? a[d].min : 0);
      var reg = m.streaks.cols.slice(-5).map(function (asg) { var w = sec.asgWork[asg.id][sid]; return asg.eligible.indexOf(sid) < 0 ? 'na' : w ? 'yes' : 'no'; });
      var low = x.n >= 15 && x.fts < m.medianFts - 0.08;
      return h('tr', { class: 'click', on: { click: function () { IL.openStudent(sid, list); } } }, h('td', { class: 'stu-name' }, IL.who(sid, list)),
        h('td', null, h('span', { class: 'flags wrap' }, flagTags(ins, sid, 3), !has(sid) ? h('span', { class: 'sub' }, 'nothing flagged') : null)),
        h('td', null, x.n >= 15 ? h('span', { class: 'stu-fts' }, R.meter([{ v: x.fts, tone: low ? 'amber' : 'blue' }], m.medianFts, 'Class median ' + pct(m.medianFts)), h('b', null, pct(x.fts))) : h('span', { class: 'sub' }, x.n ? 'too little work' : '–')),
        h('td', { class: 'spark-cell', tip: U.sum(days.slice(7)) + ' minutes in the last 7 days, ' + U.sum(days.slice(0, 7)) + ' in the 7 before' }, C.spark(days, { bars: true, min: 0, max: Math.max(30, Math.max.apply(null, days)), w: 110, h: 22 })),
        m.caps.assignments ? h('td', null, reg.map(function (c) { return h('i', { class: 'cellmark cm-' + c, style: 'margin-right:4px' }); })) : null,
        h('td', { class: 'stu-do' }, R.step(sid, ctx)));
    });
    var need = list.filter(function (sid) { return ins.attention[sid] > 0; }).length, well = list.filter(function (sid) { return has(sid) && !(ins.attention[sid] > 0); }).length;
    el.appendChild(C.card({ title: fold ? U.plural(need, 'student needs', 'students need') + ' attention' + (well ? ' · ' + well + ' doing well' : '') : U.plural(rows.length, 'student'), tools: ctl.tools,
      guard: 'There is no overall score: the order is the number and seriousness of each student’s flags, the same ones that feed the Brief. Private to the teacher; with “Hide names” on, names are replaced by numbers.',
      body: [h('div', { class: 'scroll-x' }, h('table', { class: 't stu' }, h('thead', null, h('tr', null, h('th', null, 'Student'), h('th', null, 'Flagged for'), h('th', null, 'Right first time · black line is the class'), h('th', null, 'Minutes a day, last 14 days'), m.caps.assignments ? h('th', null, 'Last 5 assignments') : null, h('th', null, 'Next step'))), h('tbody', null, rows))),
        m.caps.assignments ? C.legend([{ cls: 'cellmark cm-yes', label: 'started' }, { cls: 'cellmark cm-no', label: 'not started' }, { cls: 'cellmark cm-na', label: 'not assigned' }]) : null,
        fold && rest ? h('p', { class: 'more-line' }, h('button', { class: 'link-btn', on: { click: function () { st.view.rest = true; IL.render(); } } }, '▸ ' + U.plural(rest, 'student') + ' with nothing flagged')) : null,
        ctl.more, !rows.length ? h('p', { class: 'empty' }, 'No student matches this filter.') : null] }));
  }

  function sideBySideView(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, ins = ctx.ins;
    var ctl = listControls(ctx);
    var grids = sec.textbooks.map(function (x) { return { tb: x.tb, role: x.role, g: M.grid(world, sec, x.tb.id, null) }; });
    var head1 = h('tr', null, h('th', { class: 'name' }), grids.map(function (x) { return h('th', { colspan: x.g.cols.length, style: 'border-bottom:3px solid ' + x.tb.accent + ';text-align:left' }, x.tb.short, h('span', { class: 'sub', style: 'font-weight:400' }, ' · ' + (x.role === 'primary' ? 'primary' : x.tb.kind.toLowerCase()))); }));
    var head2 = h('tr', null, h('th', { class: 'name' }, 'Student'), grids.map(function (x) { return x.g.cols.map(function (c) { return h('th', { tip: c.name }, c.label); }); }));
    var mini = function (c, col) {
      if (!col.open) return h('div', { style: 'width:46px;height:20px;border-radius:4px', class: 's-hatch', tip: col.name + ': not opened' });
      return h('div', { style: 'width:46px', tip: col.name + '\n' + c.correct + ' correct · ' + c.error + ' incorrect · ' + c.pending + ' awaiting grading · ' + c.untouched + ' not started' + (c.n ? '\nright first time ' + pct(c.fts) : '') },
        C.split([{ n: c.correct, cls: 's-done', label: 'Correct' }, { n: c.error, cls: 's-bad', label: 'Incorrect' }, { n: c.pending, cls: 's-grade', label: 'Awaiting grading' }, { n: Math.max(0, c.untouched), cls: 's-none', label: 'Not started' }], { size: 'thin' }),
        h('div', { class: 'sub', style: 'text-align:center' }, c.n >= 3 ? pct(c.fts) : '–'));
    };
    var classRow = h('tr', null, h('td', { class: 'name', style: 'font-weight:600' }, 'Class'), grids.map(function (x) { return x.g.cols.map(function (c) { return h('td', { style: 'text-align:center;font-weight:600;font-size:12px' }, c.open ? pct(c.classFts) : '–'); }); }));
    var rows = ctl.list.map(function (sid) {
      return h('tr', null, h('td', { class: 'name' }, IL.who(sid, ctl.list)), grids.map(function (x) { return x.g.cols.map(function (c) { return h('td', null, mini(x.g.cells[sid + '|' + c.id], c)); }); }));
    });
    el.appendChild(C.card({ title: 'Side by side', sub: 'Every textbook attached to this section, at chapter level. Each cell: questions by state, with right first time underneath.', tools: ctl.tools, basis: IL.basisLabel('term'),
      guard: 'Supplemental textbooks appear here and nowhere in the bands.',
      body: [C.legend([{ cls: 's-done', label: 'correct' }, { cls: 's-bad', label: 'incorrect' }, { cls: 's-grade', label: 'awaiting grading' }, { cls: 's-none', label: 'not started' }, { cls: 's-hatch', label: 'not opened' }]),
        h('div', { class: 'scroll-x', style: 'margin-top:8px' }, h('table', { class: 'ugrid', style: '--cols:' + U.sum(grids.map(function (x) { return x.g.cols.length; })) + ';--cell:62px' }, h('thead', null, head1, head2), h('tbody', null, classRow, rows))), ctl.more] }));
  }

  function movementView(el, ctx) {
    var m = ctx.m, ins = ctx.ins, mv = m.movement, c5 = ins.cards['ST-5'];
    var moved = mv.improving.concat(mv.slipping);
    el.appendChild(C.card({ ins: c5,
      sub: c5.ok ? 'The last two class weeks (from ' + T.fmtDay(mv.cur[0] * 7) + ') against the two before (from ' + T.fmtDay((mv.prev[0] || 0) * 7) + ')' : null,
      body: function () { return [C.split([{ n: mv.improving.length, cls: 's-good', label: 'Improving', sids: ids(mv.improving) }, { n: mv.slipping.length, cls: 's-warn', label: 'Slipping', sids: ids(mv.slipping) },
        { n: mv.steady.length, cls: 's-mute', label: 'Steady', sids: ids(mv.steady) }, { n: mv.noEvidence.length, cls: 's-none', label: 'Too little recent work to say', sids: ids(mv.noEvidence) }], { size: 'tall' }),
        C.legend([{ cls: 's-good', label: 'improving ' + mv.improving.length }, { cls: 's-warn', label: 'slipping ' + mv.slipping.length }, { cls: 's-mute', label: 'steady ' + mv.steady.length }, { cls: 's-none', label: 'too little recent work ' + mv.noEvidence.length }]),
        h('p', { class: 'note' }, h('b', null, 'Recorded minutes: '), mv.up.length + ' up', mv.up.length ? [' (', IL.whoList(ids(mv.up), 5), ')'] : '', ' · ' + mv.down.length + ' down', mv.down.length ? [' (', IL.whoList(ids(mv.down), 5), ')'] : ''),
        moved.length ? [h('p', { class: 'sub', style: 'margin:12px 0 2px' }, 'Points above or below classmates on the same questions, before and now. Steady students are not drawn.'), IL.movePicture(m, moved)] : null,
        mv.noEvidence.length ? h('p', { class: 'note' }, h('b', null, 'Too little recent work to say: '), IL.whoList(ids(mv.noEvidence), 10)) : null]; },
      actions: [IL.listBtn('Congratulate', ids(mv.improving), function (list) { IL.toast('Congratulations sent to ' + U.plural(list.length, 'student') + '.'); }),
        IL.listBtn('Check in with', ids(mv.slipping), function (list) { IL.logCheckin(list); })] }));
    var order = m.roster.filter(function (s) { return !m.stu[s.id].never; }).sort(U.by(function (s) { return m.stu[s.id].lastDay; }, true)).map(function (s) { return s.id; });
    var rows = order.map(function (sid) {
      var x = m.stu[sid];
      return h('tr', { class: 'click', on: { click: function () { IL.openStudent(sid, order); } } }, h('td', null, IL.who(sid, order)), h('td', null, T.fmtDayLong(x.lastDay)), h('td', { class: 'num' }, x.wn), h('td', { class: 'num' }, x.wn ? pct(x.wfts) : '–'),
        h('td', { class: 'num' }, x.wgap.n >= 15 ? signed(x.wgap.gap) + ' points' : '–'), h('td', null, x.move === 'up' ? h('span', { class: 'tag good' }, 'improving') : x.move === 'down' ? h('span', { class: 'tag warn' }, 'slipping') : x.move === 'none' ? h('span', { class: 'tag' }, 'too little recent work') : ''));
    });
    el.appendChild(h('div', { style: 'margin-top:14px' }, C.card({ title: 'Recent activity', sub: 'Most recently active first. Select a row for the student page.',
      body: h('div', { style: 'overflow:auto;max-height:420px' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Student'), h('th', null, 'Last activity'), h('th', { class: 'num' }, 'Questions in this window'), h('th', { class: 'num' }, 'Right first time'), h('th', { class: 'num' }, 'Against classmates'), h('th', null, ''))), h('tbody', null, rows))) })));
  }

  // Suggested groups are the Brief's themes that come with a list of students and a set to assign. Membership
  // is a suggestion: it is not saved, and it expires with its evidence.
  function groupsView(el, ctx) {
    var m = ctx.m, ins = ctx.ins, R = IL.R, card = h('section', { class: 'card ia' }), n = 0;
    card.appendChild(R.head());
    ins.themes.filter(function (t) { return t.act && t.act.kind === 'builder' && !t.act.whole && t.act.targets.length >= m.b.few(0.06, 2) && !t.state; }).slice(0, 5).forEach(function (t) {
      var p = R.theme(t, ctx);
      card.appendChild(R.line({ id: t.id, rank: ++n, title: p.title, chips: p.chips, evid: R.pills(t.act.targets.map(function (sid) { return { sid: sid, hot: true }; }), t.act.targets, 10),
        btn: R.doBtn(t.act, t.key, n === 1), why: p.why, linked: true, size: R.actSize(t.act), alt: [h('a', { on: { click: function () { IL.openTheme(t); } } }, 'see the evidence')] }));
    });
    ins.good.forEach(function (g) {
      if (g.act.kind !== 'builder' || g.act.targets.length < 2 || g.state) return;
      var p = R.signal(g, ctx);
      card.appendChild(R.line({ id: g.id, rank: ++n, title: p.title, evid: p.evid, btn: R.doBtn(g.act, g.key, false), why: p.why, size: R.actSize(g.act) }));
    });
    el.appendChild(n ? card : h('p', { class: 'empty' }, 'No group has enough shared evidence yet.'));
  }

  function studentPage(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, ins = ctx.ins, st = ctx.st, sid = st.student, d = M.student(world, sec, sid), x = d.s, s = d.st, items = sec.items;
    if (!x) { el.appendChild(h('p', { class: 'empty' }, 'This account is not on the roster.')); return; }
    // previous and next follow the list the teacher came from; with none, the order of attention
    var fromList = st.stuList && st.stuList.indexOf(sid) >= 0;
    var order = fromList ? st.stuList.filter(function (id) { return m.stu[id]; }) : ins.byAttention, idx = order.indexOf(sid);
    var prev = order[(idx - 1 + order.length) % order.length], next = order[(idx + 1) % order.length];
    var sum = ins.summary(sid);
    el.appendChild(h('div', { class: 'stu-head' }, h('div', { class: 'avatar' }, IL.state.hideNames ? '··' : s.initials), h('div', null, h('h2', null, IL.nm(sid)),
      h('div', { class: 'sub' }, x.n + ' questions · ' + pct(x.fts) + ' right first time (class median ' + pct(m.medianFts) + ') · ' + x.minutes + ' recorded minutes · last active ' + (x.lastDay != null ? T.fmtDayLong(x.lastDay) : 'never'))),
      h('div', { class: 'spacer' }),
      h('span', { class: 'sub' }, (idx + 1) + ' of ' + order.length + (fromList ? ' in the list you came from' : ', by need of attention')),
      h('button', { class: 'btn', on: { click: function () { IL.go({ tab: 'students', student: null }); } } }, 'All students'),
      order.length > 1 ? h('button', { class: 'btn', on: { click: function () { IL.go({ tab: 'students', student: prev }); } } }, '‹ ' + IL.nm(prev)) : null,
      order.length > 1 ? h('button', { class: 'btn', on: { click: function () { IL.go({ tab: 'students', student: next }); } } }, IL.nm(next) + ' ›') : null));
    var weakSkills = d.clusters.slice(0, 2).map(function (o) { return o.skill.id; });
    var step = sum.treated ? h('button', { class: 'btn', on: { click: function () { IL.go({ tab: 'followups' }); } } }, 'Review the follow-up')
      : sum.lane === 'presence' ? IL.listBtn('Check in with', [sid], function (list) { IL.logCheckin(list); }, 'primary')
      : (sum.lane === 'struggle' && weakSkills.length) ? IL.listBtn('Practice set for', [sid], function (list) { IL.builder({ recipe: 'Remediation', minutes: 15, sids: list, skills: weakSkills, reason: 'weakest skills' }); }, 'primary')
      : sum.lane === 'good' && weakSkills.length ? IL.listBtn('Challenge for', [sid], function (list) { IL.builder({ recipe: 'Challenge', minutes: 20, sids: list, skills: m.next ? m.next.sub.skills.slice(0, 2) : weakSkills, reason: 'stretch' }); }) : null;
    el.appendChild(h('section', { class: 'card summary ' + (sum.lane || '') }, h('div', { class: 'sum-main' }, h('p', { class: 'finding' }, sum.text), h('p', { class: 'next' }, h('b', null, 'Suggested next step: '), sum.step), h('div', { class: 'flags wrap' }, flagTags(ins, sid, 9))), step));
    if (x.never) return;

    var wkLabels = d.weeks.map(function (w, i) { return i % 2 === 0 ? T.fmtDay(w.week * 7) : ''; });
    var cw = 40, maxMin = Math.max(60, Math.max.apply(null, d.weeks.map(function (w) { return w.minutes; })));
    var minBars = IL.s('svg', { width: d.weeks.length * (cw + 4), height: 44, role: 'img', 'aria-label': 'Recorded minutes per week' });
    d.weeks.forEach(function (w, i) {
      var bh = Math.max(1, (w.minutes / maxMin) * 38);
      minBars.appendChild(IL.s('rect', { x: i * (cw + 4) + 2 + (cw - 22) / 2, y: 42 - bh, width: 22, height: bh, rx: 3, fill: w.classWeek ? '#8fb1f1' : '#d9dce2', 'data-tip': 'Week of ' + T.fmtDay(w.week * 7) + '\n' + w.minutes + ' recorded minutes', tabindex: 0 }));
    });
    var lessonCols = d.lessons.slice(-14);
    el.appendChild(C.card({ title: 'Timeline', sub: 'Three strips on one time axis. Bars above the line mean better than classmates on the same questions.', basis: IL.basisLabel('term'),
      guard: 'Moments are events in the work, not labels for the student.',
      body: [h('div', { class: 'scroll-x' }, h('div', { class: 'strip-row' }, h('span', null, 'Right first time against classmates'), C.zero({ values: d.weeks.map(function (w) { return w.gap; }), cw: cw, h: 60, amp: 0.45, tips: d.weeks.map(function (w) { return 'Week of ' + T.fmtDay(w.week * 7) + ' · ' + w.n + ' first attempts'; }), refLabel: 'class level', tailW: 70 })),
        h('div', { class: 'strip-row' }, h('span', null, 'Recorded minutes per week'), minBars),
        h('div', { class: 'strip-row' }, h('span', null, 'Week of'), h('div', { style: 'display:flex' }, d.weeks.map(function (w, i) { return h('span', { style: 'width:' + (cw + 4) + 'px;font-size:12px;color:#5f636a;text-align:center;white-space:nowrap' }, wkLabels[i]); })))),
        lessonCols.length ? h('div', { class: 'strip-row' }, h('span', null, 'Assigned work (latest ' + lessonCols.length + ')'), h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, lessonCols.map(function (l) {
          return h('i', { class: 'cellmark cm-' + (l.state === 'done' ? 'yes' : l.state === 'part' ? 'part' : l.state === 'no' ? 'no' : 'na'), tip: l.a.short + '\n' + (l.state === 'done' ? 'completed' : l.state === 'part' ? 'started, not finished' : l.state === 'no' ? 'not started' : 'not assigned') + (l.late ? ' · started after the due date' : '') });
        }))) : null,
        lessonCols.length ? C.legend([{ cls: 'cellmark cm-yes', label: 'completed' }, { cls: 'cellmark cm-part', label: 'started, not finished' }, { cls: 'cellmark cm-no', label: 'not started' }, { cls: 'cellmark cm-na', label: 'not assigned' }]) : null,
        h('div', { class: 'moments' }, d.moments.map(function (mo) {
          return h('span', { class: 'moment ' + mo.kind, tabindex: 0, tip: mo.detail, on: { click: function () {
            if (mo.unit) IL.ev.cell(sid, sec.textbooks[0].tb.id, mo.unit);
            else if (mo.action) IL.go({ tab: 'followups', focus: 'fu-' + mo.action });
            else if (mo.week != null) IL.drawer('Week of ' + T.fmtDay(mo.week * 7), IL.nm(sid) + ' · ' + mo.detail, IL.section('Wrong first answers that week', d.recs.filter(function (r) { return T.week(r.attempts[0].t) === mo.week && r.attempts[0].ok === false; }).slice(0, 14).map(function (r) {
              return h('div', { class: 'strip-row', style: 'grid-template-columns:1fr auto' }, h('a', { on: { click: function () { IL.ev.item(r.item); } } }, items[r.item].name), C.tape(r.attempts, { code: items[r.item].type === 'activecode' }));
            })));
            else IL.toast(mo.label + ': ' + mo.detail);
          } } }, h('i'), h('small', null, T.fmt(mo.t)), mo.label);
        }))] }));

    var weak = d.clusters.slice(0, 5), strong = d.clusters.slice(-4).reverse().filter(function (o) { return weak.indexOf(o) < 0; });
    var fmtRow = function (k, lab) { var f = d.fmt[k]; return f && f.n >= 3 ? { label: lab, v: f.ok / f.n, text: f.ok + ' of ' + f.n }: null; };
    var skillRow = function (o) { return h('div', { class: 'split-row', style: 'grid-template-columns:minmax(120px,1fr) 170px auto' }, h('span', { class: 'lab' }, o.skill.name), C.track({ value: o.p, ref: o.cls, w: 170, valueLabel: IL.nm(sid), refLabel: 'class' }), h('span', { class: 'val' }, o.ok + ' of ' + o.n + ' right first time')); };
    var unGroups = U.groupBy(d.unresolved, function (r) { return items[r.item].subCode; }), unNodes = [];
    unGroups.forEach(function (rs, code) { unNodes.push(h('div', { style: 'margin-bottom:6px' }, h('span', { class: 'sub' }, code + ' · '), rs.slice(0, 4).map(function (r, i) { return [i ? ' · ' : '', h('a', { on: { click: function () { IL.ev.item(r.item); } } }, items[r.item].name)]; }), rs.length > 4 ? ' · +' + (rs.length - 4) : '')); });
    el.appendChild(h('div', { class: 'grid g2', style: 'margin-top:14px' },
      C.card({ title: 'Weakest and strongest skills', sub: 'Right first time, with at least three questions each. ● this student, ┃ the class.',
        body: [weak.length ? weak.map(skillRow) : h('p', { class: 'empty' }, 'Not enough work on any one skill yet.'),
          strong.length ? [h('p', { class: 'sub', style: 'margin:10px 0 2px' }, 'Strongest'), strong.map(skillRow)] : null],
        actions: weak.length ? [IL.listBtn('Practice set on the weakest two for', [sid], function (list) { IL.builder({ recipe: 'Remediation', minutes: 15, sids: list, skills: weak.slice(0, 2).map(function (o) { return o.skill.id; }), reason: 'weakest skills' }); })] : null }),
      C.card({ title: 'Depth, format and habits',
        body: [h('p', { class: 'sub' }, 'By depth · right first time'), C.bars([1, 2, 3].map(function (k) { var o = d.dok[k]; return o ? { label: ['', 'Recall', 'Apply', 'Reason'][k], v: o.ok / o.n, text: o.ok + ' of ' + o.n } : null; }).filter(Boolean), { max: 1, span: 55 }),
          h('p', { class: 'sub', style: 'margin-top:8px' }, 'By format · right first time'), C.bars([fmtRow('fillintheblank', 'Fill-in'), fmtRow('mchoice', 'Multiple choice'), fmtRow('parsonsprob', 'Parsons'), fmtRow('activecode', 'Code')].filter(Boolean), { max: 1, span: 55 }),
          h('div', { class: 'facts', style: 'margin-top:10px' },
            h('div', null, h('span', null, 'Retries within 3 seconds'), h('span', null, x.retries >= 20 ? pct(x.rapid) : '–'), h('span', null, 'class median ' + pct(m.retry.median))),
            h('div', null, h('span', null, 'Fast wrong first answers'), h('span', null, x.mcq >= 15 ? pct(x.fastWrong) : '–'), h('span', null, 'class median ' + pct(m.fastWrong.median))),
            h('div', null, h('span', null, 'Questions never solved'), h('span', null, x.unresolved.length), h('span', null, 'class median ' + Math.round(m.unresolved.median))))] })));
    el.appendChild(h('div', { class: 'grid g2', style: 'margin-top:14px' },
      C.card({ title: 'Unfinished business · ' + d.unresolved.length, sub: 'Attempted and never solved, by subunit', body: unNodes.length ? unNodes : h('p', { class: 'empty' }, 'Nothing left unsolved.'),
        actions: d.unresolved.length ? [h('button', { class: 'btn', on: { click: function () { IL.toast('Would assign ' + IL.nm(sid) + ' a “finish these” set of ' + U.plural(d.unresolved.length, 'question') + '.'); } } }, 'Assign “finish these” (' + d.unresolved.length + ' questions)')] : null }),
      C.card({ title: 'Recent work', body: h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Question'), h('th', null, 'When'), h('th', null, 'Attempts, in order'))), h('tbody', null, d.recent.slice(0, 9).map(function (r) {
        return h('tr', { class: 'click', on: { click: function () { IL.ev.item(r.item); } } }, h('td', null, items[r.item].name), h('td', { style: 'white-space:nowrap' }, T.fmt(r.attempts[0].t)), h('td', null, C.tape(r.attempts.slice(0, 16), { code: items[r.item].type === 'activecode' })));
      }))) })));
  }

  IL.tabs.students = { label: 'Students', question: 'Who needs what?',
    render: function (el, ctx) {
      var st = ctx.st, sec = ctx.sec;
      if (st.student) { studentPage(el, ctx); return; }
      var view = st.view.students || 'signal';
      if (view === 'all') view = 'side';
      var views = [['signal', 'Who needs what'], ['unit', 'By chapter']];
      if (sec.textbooks.length > 1) views.push(['side', 'Textbooks side by side']);
      views.push(['movement', 'Movement'], ['groups', 'Suggested groups']);
      if (!views.some(function (v) { return v[0] === view; })) view = 'signal';
      el.appendChild(h('p', { class: 'question' }, h('b', null, this.label), this.question + ' ', h('span', { class: 'tally' }, ctx.ins.flagged.length + ' of ' + ctx.m.roster.length + ' students are flagged for something.')));
      el.appendChild(h('div', { class: 'viewtabs' }, views.map(function (v) {
        return h('button', { class: 'chip' + (view === v[0] ? ' on' : ''), on: { click: function () { st.view.students = v[0]; IL.go({}); } } }, v[1]);
      })));
      if (view === 'signal') signalView(el, ctx); else if (view === 'side') sideBySideView(el, ctx); else if (view === 'movement') movementView(el, ctx); else if (view === 'groups') groupsView(el, ctx); else gridView(el, ctx);
      IL.openers.cell = function () {
        var tb = sec.textbooks[0].tb, g = M.grid(ctx.world, sec, tb.id, null), col = g.cols.filter(function (c) { return c.open; })[1] || g.cols[0];
        var grind = ctx.m.roster.filter(function (s) { return ctx.m.stu[s.id].strict === 'grind'; })[0] || ctx.m.roster[0];
        IL.ev.cell(grind.id, tb.id, col.id);
      };
    } };

  // ---------- Follow-ups ----------
  // Thresholds for this class. In this mock, changing one only shows what it would flag now.
  function rules(ctx) {
    var m = ctx.m, st = ctx.st, r = (st.rules = st.rules || { quiet: 2, behind: 15, fast: 25, weak: 35 }), cur = m.pace[m.pace.length - 1];
    var preview = {
      quiet: function (v) { return U.plural(m.roster.filter(function (s) { return (m.stu[s.id].quietRun || 0) >= v; }).length, 'student'); },
      behind: function (v) { return cur ? U.plural(cur.dots.filter(function (d) { return d.pc <= cur.median - v; }).length, 'student') : '–'; },
      fast: function (v) { return U.plural(m.fastWrong.dots.filter(function (d) { return d.v * 100 >= v; }).length, 'student'); },
      weak: function (v) { return U.plural(Object.keys(m.skill).filter(function (k) { return m.skill[k].solid && m.skill[k].p * 100 < v; }).length, 'skill'); } };
    var defs = [['quiet', 'Went quiet after', 'class weeks', 1, 1, 4, 6, 5], ['behind', 'Behind the class by', 'points', 5, 5, 40, 9, 6], ['fast', 'Fast wrong answers above', '%', 5, 10, 50, 4, 3], ['weak', 'Weak skill below', '% first try', 5, 20, 50, 11, 9]];
    return [h('div', { class: 'ia-rules' }, defs.map(function (dd) {
      var k = dd[0];
      return h('div', { class: 'rule' },
        h('div', { class: 'rule-top' }, h('span', null, dd[1]),
          h('span', { style: 'white-space:nowrap' }, h('button', { class: 'btn small', 'aria-label': 'Lower', on: { click: function () { r[k] = Math.max(dd[4], r[k] - dd[3]); IL.render(); } } }, '−'), ' ', h('b', null, r[k] + ' ' + dd[2]), ' ',
            h('button', { class: 'btn small', 'aria-label': 'Raise', on: { click: function () { r[k] = Math.min(dd[5], r[k] + dd[3]); IL.render(); } } }, '+'))),
        h('div', { class: 'rule-bot' }, h('span', null, 'Would flag now: ', h('b', { style: 'color:var(--ink)' }, preview[k](r[k]))), h('span', { class: 'spacer', style: 'flex:1' }), h('span', null, dd[7] + ' of ' + dd[6] + ' marked useful')));
    })), h('p', { class: 'ia-rule' }, 'In this mock the thresholds only change the preview. The “marked useful” counts are illustrative. Feedback tunes ranking, never the underlying counts, and is not used to rank teachers.')];
  }
  IL.tabs.followups = { label: 'Follow-ups', question: 'What did I do, and did it help?',
    render: function (el, ctx) {
      var m = ctx.m, st = ctx.st, ins = ctx.ins, R = IL.R, c1 = ins.cards['FU-1'], card = h('section', { class: 'card ia', style: 'margin-bottom:10px' });
      el.appendChild(h('p', { class: 'question' }, h('b', null, this.label), this.question));
      card.appendChild(R.head());
      [['recheck due', 'Ready to review'], ['waiting', 'Waiting for new work'], ['done', 'Reviewed']].forEach(function (g) {
        var list = m.followups.filter(function (f) { return f.status === g[0]; });
        if (!list.length) return;
        card.appendChild(R.secHead(g[1], list.length));
        list.forEach(function (f) { card.appendChild(R.follow(f, ctx, { detail: true })); });
      });
      el.appendChild(m.followups.length ? card : h('p', { class: 'empty' }, 'Nothing logged yet. Actions you take from a finding appear here.'));
      if (m.followups.length) el.appendChild(h('p', { class: 'ia-rule', style: 'border:0;margin:0 0 14px;padding:0 2px' }, c1.caveat));
      var open = !!st.more.rules, box = h('section', { class: 'card ia ia-rest' });
      box.appendChild(R.moreRow('Thresholds for this class', open, function () { st.more.rules = !open; IL.render(); }));
      if (open) box.appendChild(h('div', { class: 'ia-since', style: 'max-width:640px;padding-top:12px' }, rules(ctx)));
      el.appendChild(box);
    } };
})(typeof window !== 'undefined' ? window : globalThis);

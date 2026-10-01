/* Insight Lens mock · tabs: Engagement, Work habits, Students (grid, signals, movement, groups, student page), Follow-ups. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, M = IL.M, h = IL.h, C = IL.C, pct = IL.pct;
  if (!root.document) return;
  var signed = function (v) { var r = Math.round(v * 100); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r); };

  // ---------- Engagement ----------
  IL.tabs.engagement = { label: 'Engagement', question: 'Who is showing up, and when?',
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, b = ctx.b, N = m.roster.length;

      // EN-1 rhythm
      var wk = m.rhythm.weeks, quietWeeks = wk.filter(function (x) { return !x.classWeek; });
      var dayGrid = C.heat({ rows: T.DOW, cols: wk.map(function (x) { return T.fmtDay(x.week * 7).split(' ')[0]; }), max: N,
        value: function (r, c) { return m.rhythm.days[c * 7 + r] || 0; }, tip: function (r, c, v) { return T.fmtDayLong(c * 7 + r) + '\n' + v + ' of ' + N + ' students active'; } });
      el.appendChild(C.card({ id: 'EN-1', title: 'Participation rhythm',
        finding: 'The class was active in ' + (wk.length - quietWeeks.length) + ' of ' + wk.length + ' weeks' + (quietWeeks.length ? '; the week' + (quietWeeks.length > 1 ? 's' : '') + ' of ' + quietWeeks.map(function (x) { return T.fmtDay(x.week * 7); }).join(' and ') + ' ' + (quietWeeks.length > 1 ? 'were' : 'was') + ' quiet for everyone.' : '.'),
        body: [h('p', { class: 'sub' }, 'Students active each week'),
          C.fit(function (W) {
            var cw = Math.max(34, (W - 130) / wk.length);
            return C.columns({ vals: wk.map(function (x) { return { v: x.active, pale: !x.classWeek, label: T.fmtDay(x.week * 7), top: String(x.active), tip: 'Week of ' + T.fmtDay(x.week * 7) + '\n' + x.active + ' of ' + N + ' active' + (x.classWeek ? '' : '\nquiet week: does not count toward inactivity') }; }),
              max: N, ref: N, refLabel: 'roster ' + N, w: W, cw: cw, bw: Math.max(22, Math.min(52, cw * 0.46)), h: 150, label: 'Students active per week' });
          }),
          C.legend([{ color: '#1864F2', label: 'class week (60% or more active)' }, { color: '#d9dce2', label: 'quiet week (break, or nothing assigned)' }]),
          h('p', { class: 'sub', style: 'margin:12px 0 4px' }, 'By day · darker means more students'), dayGrid],
        table: function () { return C.table(['Week of', 'Students active', 'Class week'], wk.map(function (x) { return [T.fmtDay(x.week * 7), x.active + ' of ' + N, x.classWeek ? 'yes' : 'no']; })); },
        guard: 'Recorded activity in ALPS. It does not measure effort, or work done elsewhere.' }));

      // EN-2 quiet and EN-5 roster check
      var rc = m.rosterCheck;
      el.appendChild(h('div', { class: 'grid g-21', style: 'margin-top:14px' },
        C.card({ id: 'EN-2', title: 'Went quiet', finding: m.quiet.length ? U.plural(m.quiet.length, 'student has', 'students have') + ' had no recorded activity for two or more class weeks.' : 'No one has been quiet for two class weeks.',
          body: m.quiet.length ? IL.quietPicture(m) : null,
          actions: m.quiet.length ? [h('button', { class: 'btn primary', on: { click: function () { IL.logCheckin(m.quiet.map(function (q) { return q.sid; }), 'quiet'); } } }, 'Log a check-in'),
            h('button', { class: 'btn', on: { click: function () { IL.toast('Would open People to confirm enrolment.'); } } }, 'Confirm enrolment')] : null,
          guard: 'Absence, an access problem and work done elsewhere all look the same in the data. The card says “no recorded ALPS activity” and nothing more.' }),
        C.card({ id: 'EN-5', title: 'Roster and access check', finding: rc.never.length || rc.off.length ? U.plural(rc.never.length, 'rostered student has', 'rostered students have') + ' never signed in' + (rc.off.length ? '; ' + U.plural(rc.off.length, 'account') + ' with activity is not on the roster.' : '.') : 'Everyone on the roster has signed in.',
          body: [h('p', { class: 'sub' }, 'Never active (' + rc.never.length + ')'), rc.never.length ? C.named(rc.never, 'off') : h('p', { class: 'empty' }, 'None'),
            h('p', { class: 'sub', style: 'margin-top:10px' }, 'Active, not on the roster (' + rc.off.length + ')'), rc.off.length ? C.named(rc.off, 'muted') : h('p', { class: 'empty' }, 'None')],
          actions: rc.never.length ? [h('button', { class: 'btn', on: { click: function () { IL.toast('Would re-send invitations to ' + rc.never.length + ' students.'); } } }, 'Re-invite')] : null,
          guard: 'Denominators are only right if the roster is.' })));

      // EN-3 when
      var hours = []; for (var hr = 6; hr <= 22; hr++) hours.push(hr);
      var wsp = m.when.split, sc = Object.keys(m.when.sessionCells).filter(function (k) { return m.when.sessionCells[k] >= 3; });
      var sessHours = U.uniq(sc.map(function (k) { return +k.split(':')[1]; })).sort(function (a, c) { return a - c; });
      var sessDows = U.uniq(sc.map(function (k) { return +k.split(':')[0]; })).sort(function (a, c) { return a - c; });
      el.appendChild(h('div', { style: 'margin-top:14px' }, C.card({ id: 'EN-3', title: 'In class and out of class',
        finding: sessHours.length ? 'This class works together on ' + sessDows.map(function (d) { return T.DOW[d]; }).join(', ') + ' around ' + sessHours.map(function (x) { return x + ':00'; }).join(' and ') + '; ' + pct(wsp.inClass / wsp.total) + ' of recorded minutes fall in those sessions.'
          : 'No shared class time could be inferred: most work is done at different times.',
        body: [h('p', { class: 'sub' }, 'When this class works · hour of day by weekday · outlined cells are inferred class sessions'),
          C.heat({ rows: T.DOW, cols: hours.map(function (x) { return String(x); }), max: m.when.max, value: function (r, c) { return m.when.grid[r][hours[c]]; },
            outline: function (r, c) { return (m.when.sessionCells[r + ':' + hours[c]] || 0) >= 3; }, tip: function (r, c, v) { return T.DOW[r] + ' ' + hours[c] + ':00\n' + v + ' recorded minutes this term' + ((m.when.sessionCells[r + ':' + hours[c]] || 0) >= 3 ? '\ninferred class session' : ''); } }),
          h('div', { style: 'margin-top:12px' }, C.splitRow('Recorded minutes', [{ n: wsp.inClass, cls: 's-done', label: 'In class sessions' }, { n: wsp.sameDay, cls: 's-late', label: 'Same day, outside the session' }, { n: wsp.other, cls: 's-prog', label: 'Other days, evenings and weekends' }],
            'in class ' + pct(wsp.inClass / wsp.total) + ' · same day ' + pct(wsp.sameDay / wsp.total) + ' · other ' + pct(wsp.other / wsp.total), { size: 'tall' })),
          m.when.absent.length ? [h('p', { class: 'sub', style: 'margin:12px 0 4px' }, 'No activity on three or more class days in this window'),
            C.register({ cols: m.when.sessDaysWin.map(function (d) { return { label: T.fmtDay(d).split(' ')[0], tip: T.fmtDayLong(d) }; }), noteHead: '',
              rows: m.when.absent.slice(0, 6).map(function (x) { return { sid: x.sid, cells: x.days.map(function (on) { return on ? 'yes' : 'no'; }), note: x.missed + ' of ' + x.of + ' class days' }; }), words: { yes: 'active', no: 'no recorded activity' } })] : null],
        actions: [h('button', { class: 'btn', on: { click: function () { IL.toast('Would open class settings to confirm meeting times.'); } } }, 'Confirm class times')],
        guard: 'A class session is a clock hour when 40% or more of the roster was active. This is not attendance.' })));

      // EN-4 activity map
      var q = m.map.quads;
      var cell = function (title, ids, tone) { return h('td', { style: 'vertical-align:top;width:50%;padding:10px;border:1px solid var(--line)' }, h('div', { style: 'font-weight:600;font-size:12.5px;margin-bottom:4px' }, title + ' (' + ids.length + ')'), h('div', { style: 'font-size:12px;line-height:1.7' }, IL.whoList(ids, 12))); };
      var strict = m.roster.filter(function (s) { return m.stu[s.id].strict === 'grind'; });
      el.appendChild(h('div', { style: 'margin-top:14px' }, C.card({ id: 'EN-4', title: 'Activity map',
        finding: strict.length ? U.plural(strict.length, 'student stands', 'students stand') + ' out: far more recorded time than classmates, and far fewer answers right first time.' : 'Recorded activity and first-try success, one dot per student.',
        body: h('div', { class: 'grid g-21' }, C.fit(function (W) { return C.scatter({ w: W, dots: m.map.dots.map(function (d) { return { sid: d.sid, x: d.x, y: d.y, hot: m.stu[d.sid].strict === 'grind' }; }), medX: m.map.medMin, medY: m.map.medFts }); }),
          h('div', null, h('table', { style: 'border-collapse:collapse;width:100%' }, h('tbody', null,
            h('tr', null, cell('Getting it without spending long', q.tl), cell('On track', q.tr)),
            h('tr', null, cell('Little recorded work', q.bl), cell('Putting in the time, not landing it', q.br)))),
            m.map.low.length ? h('p', { class: 'note' }, h('b', null, 'Not placed (too little work to say): '), IL.whoList(m.map.low)) : null,
            h('p', { class: 'note' }, 'Amber dots: at least 30% more recorded minutes than the class median, and 8 points or more below it on first try.'))),
        actions: strict.length ? [h('button', { class: 'btn primary', on: { click: function () { IL.builder({ recipe: 'Remediation', minutes: 15, sids: strict.map(function (s) { return s.id; }), skills: m.gaps.roots.slice(0, 1).map(function (g) { return g.skill.id; }), reason: 'putting in the time, not landing it' }); } } }, 'Remediation for ' + strict.length)] : null,
        table: function () { return C.table(['Student', 'Recorded minutes', 'First try', 'Questions'], m.map.dots.map(function (d) { return [IL.nm(d.sid), d.x, pct(d.y), m.stu[d.sid].n]; })); },
        guard: 'The lines are class medians. Recorded time is not effort and first-try success is not ability; the map only shows where to look.' })));
    } };

  // ---------- Work habits ----------
  IL.tabs.habits = { label: 'Work habits', question: 'How are they working?',
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, N = m.roster.length, rt = m.retry;

      // WH-1 retry pattern
      var ex = null;
      if (rt.flagged.length) {
        var sid = rt.flagged[0].sid;
        ex = sec.records.filter(function (r) { return r.sid === sid && sec.items[r.item].type === 'mchoice' && r.attempts.length >= 4 && r.attempts[1].dur < 3; })[0];
      }
      el.appendChild(h('div', { class: 'grid g2' },
        C.card({ id: 'WH-1', title: 'Retry pattern', finding: pct(rt.share) + ' of retries come within three seconds of a wrong answer.',
          body: [h('p', { class: 'sub' }, 'After a wrong answer, the next try came…'),
            C.splitRow('Class', [{ n: rt.buckets[0], cls: 's-warn', label: 'Within 3 seconds' }, { n: rt.buckets[1], cls: 's-late', label: '3 to 10 seconds' }, { n: rt.buckets[2], cls: 's-done', label: 'Longer' }], pct(rt.buckets[0] / rt.total) + ' · ' + pct(rt.buckets[1] / rt.total) + ' · ' + pct(rt.buckets[2] / rt.total), { size: 'tall' }),
            rt.students.slice(0, 5).map(function (x) { return C.splitRow(IL.who(x.sid), [{ n: Math.round(x.rapid * 100), cls: 's-warn', label: 'Within 3 seconds' }, { n: 100 - Math.round(x.rapid * 100), cls: 's-mute', label: 'Slower' }], pct(x.rapid) + ' of ' + x.retries); }),
            C.legend([{ cls: 's-warn', label: 'within 3 s' }, { cls: 's-late', label: '3–10 s' }, { cls: 's-done', label: 'longer' }]),
            ex ? h('div', { style: 'margin-top:10px' }, h('p', { class: 'sub' }, 'One question, one student: ', IL.who(ex.sid), ' on “' + sec.items[ex.item].name + '”'), C.tape(ex.attempts, { labelled: true })) : null],
          actions: [h('button', { class: 'btn', on: { click: function () { IL.toast('Would set “attempts per question” to 2 on the next assignment.'); } } }, 'Limit attempts next time'),
            h('button', { class: 'btn', on: { click: function () { IL.toast('Would switch feedback to “on submit” for the next assignment.'); } } }, 'Feedback on submit')],
          guard: 'Only a wrong answer followed by a fast retry counts. This is why completion can look healthy while understanding is not.' }),
        C.card({ id: 'WH-2', title: 'Fast wrong first answers',
          finding: m.fastWrong.classNote ? 'Across the class, ' + pct(m.fastWrong.median) + ' of first answers are wrong and under five seconds: a class habit, not a few students.' : m.fastWrong.flagged.length ? 'Most students are near zero; ' + U.plural(m.fastWrong.flagged.length, 'student does', 'students do') + ' this on a quarter or more of questions.' : 'Very few first answers are both fast and wrong.',
          body: [h('p', { class: 'sub' }, 'Share of each student’s first answers that were wrong and under 5 seconds'),
            C.fit(function (W) {
              return C.strip({ w: W, dots: m.fastWrong.dots.map(function (d) { return { sid: d.sid, v: d.v * 100 }; }), min: 0, max: 60, median: m.fastWrong.median * 100, fmt: function (v) { return Math.round(v) + '%'; }, ticks: [0, 20, 40, 60],
                flag: function (d) { return m.fastWrong.flagged.some(function (f) { return f.sid === d.sid; }); }, label: 'Fast wrong first answers' });
            }),
            m.fastWrong.flagged.length ? h('p', { class: 'note' }, h('b', null, 'Highest: '), m.fastWrong.flagged.map(function (f, i) { return [i ? ' · ' : '', IL.who(f.sid), ' ' + pct(f.v)]; })) : null],
          guard: 'Questions that can be answered in a few seconds by anyone are left out.' })));

      // WH-3 unfinished, WH-4 stuck
      var un = m.unresolved;
      el.appendChild(h('div', { class: 'grid g2', style: 'margin-top:14px' },
        C.card({ id: 'WH-3', title: 'Unfinished business', finding: un.items.length ? un.items[0].students.length + ' students never solved “' + un.items[0].item.name + '”.' : 'Nothing left unsolved.',
          body: [h('p', { class: 'sub' }, 'Most often left unsolved · students'),
            C.bars(un.items.slice(0, 6).map(function (x) { return { label: x.item.name, v: x.students.length, text: x.students.length + ' of ' + x.n, cls: 'red', tip: IL.names(x.students), onClick: function () { IL.ev.item(x.item.id); } }; }), { span: 50 }),
            h('p', { class: 'sub', style: 'margin:12px 0 4px' }, 'Per student · class median ' + Math.round(un.median) + ' unsolved'),
            un.students.slice(0, 5).map(function (x) { return h('div', { class: 'split-row', style: 'grid-template-columns:1fr auto' }, IL.who(x.sid), h('b', null, x.n + ' unsolved')); })],
          actions: un.students.length ? [h('button', { class: 'btn', on: { click: function () { IL.toast('Would assign each student their own “finish these” set.'); } } }, 'Assign “finish these”')] : null }),
        C.card({ id: 'WH-4', title: 'Stuck in code', finding: m.stuck.length ? U.plural(U.uniq(m.stuck.map(function (x) { return x.sid; })).length, 'student') + ' ran the same code question many times without a pass; ' + m.stuck.filter(function (x) { return !x.lastOk; }).length + ' of those ' + m.stuck.length + ' attempts are still not passing.' : 'No one is stuck in code in this window.',
          body: m.stuck.length ? [IL.stuckPicture(m, 4), C.legend([{ cls: 's-done', label: 'passed' }, { cls: 's-bad', label: 'failed' }]), m.stuck.length > 4 ? h('p', { class: 'sub', style: 'margin-top:6px' }, '+' + (m.stuck.length - 4) + ' more') : null] : null,
          guard: 'One mark per run, in order. Opens the work history at that question.' })));

      // WH-5 help and feedback, WH-6 process notes
      var fb = m.help, unseen = fb.feedback.filter(function (f) { return !f.seen; });
      var mk = m.markers[0];
      el.appendChild(h('div', { class: 'grid g2', style: 'margin-top:14px' },
        C.card({ id: 'WH-5', title: 'Help and feedback use', finding: unseen.length ? U.plural(unseen.length, 'piece') + ' of feedback ' + (unseen.length === 1 ? 'has' : 'have') + ' not been opened' + (fb.questions.length ? ', and ' + U.plural(fb.questions.length, 'student is', 'students are') + ' waiting for a reply.' : '.') : 'All feedback has been opened.',
          body: [C.splitRow('Feedback seen', [{ n: fb.seen, cls: 's-done', label: 'Seen' }, { n: fb.feedback.length - fb.seen, cls: 's-none', label: 'Not opened' }], fb.seen + ' of ' + fb.feedback.length, { size: 'tall' }),
            unseen.length ? h('p', { class: 'note' }, h('b', null, 'Not opened: '), IL.whoList(U.uniq(unseen.map(function (f) { return f.sid; })), 8)) : null,
            h('p', { class: 'sub', style: 'margin:12px 0 2px' }, 'Questions waiting for a reply · ', h('b', { style: 'color:var(--ink)' }, String(fb.questions.length))),
            fb.questions.map(function (q) { return h('p', { class: 'note', style: 'margin-top:4px' }, h('span', { class: 'tag warn' }, T.ago(q.t, world.now)), ' ', IL.who(q.sid), ': “' + q.text + '”'); }),
            h('div', { style: 'height:8px' }),
            C.splitRow('Hints opened', [{ n: 1, cls: 's-hatch', label: 'Not recorded' }], 'not recorded yet', { size: 'tall' })],
          actions: fb.questions.length ? [h('button', { class: 'btn primary', on: { click: function () { IL.toast('Would open the feedback thread.'); } } }, 'Reply')] : null,
          guard: 'Hatching means the signal was not recorded for this period.' }),
        C.card({ id: 'WH-6', title: 'Process notes for review', finding: mk ? 'One recorded event is worth a look.' : 'Nothing recorded.',
          body: mk ? h('div', { style: 'border:1px solid var(--line);border-radius:8px;padding:10px 12px' }, h('div', { style: 'font-weight:600;font-size:13px' }, 'Paste record · ', IL.who(mk.sid), ' · ' + sec.items[mk.item].name),
            h('p', { class: 'note' }, 'A paste of ' + mk.chars + ' characters from outside ALPS (or an untraceable source). This records how the text entered the editor; it does not identify the source or imply misconduct.'),
            h('div', { class: 'actions' }, h('a', { on: { click: function () { IL.ev.item(mk.item); } } }, 'View in work history →'), h('span', { class: 'spacer' }), h('span', { class: 'sub' }, 'Was this useful?'),
              h('button', { class: 'btn small', on: { click: function () { IL.toast('Noted as useful.'); } } }, 'Useful'), h('button', { class: 'btn small', on: { click: function () { IL.toast('Noted as not useful.'); } } }, 'Not useful'))) : null,
          guard: 'Shown here and on the student page only. Never counted on the Brief.' })));
    } };

  // ---------- Students ----------
  var BAND_COLOR = ['#D7D7D7', '#E3F2FD', '#90CAF9', '#1876D2', '#0D47A1'];

  function covBar(c) {
    var t = c.total || 1, seg = function (n, cls) { return n > 0 ? h('i', { class: cls, style: 'flex:' + n }) : null; };
    return h('span', { class: 'cov' }, seg(c.correct, 'c'), seg(c.error, 'e'), seg(c.pending, 'p'), seg(c.untouched, 'u'));
  }

  var MARK_WORD = { first: 'right first time', later: 'right after more than one try', wrong: 'never right', pending: 'awaiting grading', none: 'not started' };

  function ucell(sid, tbId, col, c, path, banded) {
    if (!col.open) return h('div', { class: 'ucell closed', 'aria-label': 'not opened' });
    var touched = c.correct + c.error + c.pending;
    var tip = col.label + (col.kind === 'skill' ? '' : ' ' + col.name) + '\n'
      + (banded && c.band.state === 'scored' ? 'Band: ' + M.BANDS[c.band.level] + ' (' + c.band.coverage + '% of the unit scored)' + (c.band.capped ? ', capped by coverage' : '') + '\n' : '')
      + 'First try: ' + (c.n ? c.ok + ' of ' + c.n + ' · ' + pct(c.fts) : 'no graded answers yet') + '\n'
      + 'Complete: ' + c.pc + '% · ' + c.correct + ' correct, ' + c.error + ' incorrect, ' + c.pending + ' awaiting grading, ' + c.untouched + ' not started\n'
      + 'Recorded activity: ' + M.ENG[c.eng] + ' (' + Math.round(c.min) + ' min)';
    var tint = col.kind === 'skill' && c.n < 3 ? null : c.tint;
    return h('button', { class: 'ucell' + (tint != null ? ' t' + tint : '') + (col.kind === 'skill' ? ' sk' : ''), tip: tip,
      'aria-label': IL.nm(sid) + ', ' + col.label + ', ' + (c.n >= 3 ? pct(c.fts) + ' right first time' : 'not enough answers') + ', ' + c.pc + '% complete',
      on: { click: function () { IL.ev.cell(sid, tbId, col.id, path); } } },
      col.kind === 'skill'
        ? [h('span', { class: 'qmarks' }, c.marks.slice(0, 8).map(function (q) { return h('i', { class: 'qm ' + q.state, tip: q.item.name + '\n' + MARK_WORD[q.state] }); }),
            c.marks.length > 8 ? h('span', { class: 'more' }, '+' + (c.marks.length - 8)) : null),
          h('span', { class: 'val sm' }, c.n >= 3 ? pct(c.fts) : '')]
        : [h('span', { class: 'eng' }, [1, 2, 3, 4].map(function (k) { return h('i', { class: k <= c.eng ? '' : 'o', style: 'height:' + (2 + k * 1.6) + 'px' }); })),
          h('span', { class: 'val' }, c.n >= 3 ? pct(c.fts) : touched ? c.n + 'q' : ''),
          touched === 0 ? h('span', { class: 'na' }, '–') : null,
          covBar(c)]);
  }

  var SORTS = [['name', 'Name'], ['result', 'Lowest first try'], ['done', 'Least complete'], ['time', 'Most time']];

  function gridView(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st;
    var tbId = st.tb !== 'all' ? st.tb : sec.textbooks[0].tb.id, tb = world.textbooks[tbId];
    var path = Array.isArray(st.view.path) ? st.view.path : [];
    var g = M.grid(world, sec, tbId, path);
    path = g.path;
    st.view.path = path;
    var level = g.level, banded = g.banded;
    var open = g.cols.filter(function (c) { return c.open; });

    // breadcrumb
    var crumbs = [h('a', { class: path.length ? '' : 'on', on: { click: function () { st.view.path = []; IL.render(); } } }, tb.supplemental ? 'All units' : 'All chapters')];
    if (path.length) {
      crumbs.push(h('span', { class: 'sep' }, '›'),
        h('a', { class: path.length === 1 ? 'on' : '', on: { click: function () { st.view.path = path.slice(0, 1); IL.render(); } } },
          tb.supplemental ? tb.name : g.chapter.num + ' ' + g.chapter.name));
    }
    if (level === 'skill') crumbs.push(h('span', { class: 'sep' }, '›'), h('a', { class: 'on' }, g.sub.code + ' ' + g.sub.name));

    // what the colour means at this level
    var legend = banded
      ? [h('span', { class: 'lg-lab' }, 'Band')].concat(M.BANDS.map(function (b2, i) { return h('span', null, h('i', { class: 'sw t' + i }), b2); }))
      : [h('span', { class: 'lg-lab' }, 'Right first time')].concat(M.FTS_BANDS.map(function (b2, i) { return h('span', null, h('i', { class: 'sw t' + i }), b2); }));
    var marksLegend = [h('span', { class: 'lg-lab' }, 'One dot per question')].concat(['first', 'later', 'wrong', 'pending', 'none'].map(function (k) {
      return h('span', null, h('i', { class: 'qm ' + k }), MARK_WORD[k]);
    }));

    var sort = st.view.sort || 'name';
    var sortCol = open.filter(function (c) { return c.id === st.view.sortCol; })[0] || g.cols.filter(function (c) { return c.open; }).slice(-1)[0];
    var roster = m.roster.slice().sort(U.by(function (s) { return s.name; }));
    if (sort !== 'name' && sortCol) {
      var key = { result: function (c) { return c.n >= 3 ? c.fts : 2; }, done: function (c) { return c.pc; }, time: function (c) { return -c.min; } }[sort];
      roster.sort(U.by(function (s) { return key(g.cells[s.id + '|' + sortCol.id]); }));
    }

    var head = h('tr', null,
      h('th', { class: 'name' }, 'Student'),
      g.cols.map(function (c) {
        var drillable = c.drill && c.open;
        return h('th', { class: c.open ? '' : 'dim' },
          h('div', { class: 'ch' + (drillable ? ' link' : ''), tip: c.name + (drillable ? '\nOpen its ' + (c.kind === 'chapter' ? 'subunits' : 'skills') : ''),
            on: drillable ? { click: function () { st.view.path = path.concat([c.id]); st.view.sort = 'name'; IL.render(); } } : null },
            c.kind === 'skill' ? h('b', { class: 'clamp' }, c.name) : [h('b', null, c.label), h('span', null, c.name)],
            drillable ? h('span', { class: 'go' }, '›') : null),
          c.open ? h('div', { class: 'col-n' }, c.questions + 'q') : null);
      }));

    var classRow = h('tr', { class: 'cls-row' }, h('td', { class: 'name' }, h('b', null, 'Class'), h('span', { class: 'sub' }, ' ' + m.roster.length)),
      g.cols.map(function (c) {
        if (!c.open) return h('td', null, h('div', { class: 'ucell closed lab' }, c.kind === 'chapter' && m.topics.some(function (t) { return t.unit.id === c.id && t.skipped; }) ? 'skipped' : 'not opened'));
        return h('td', null, h('div', { class: 'ucell cls', tip: c.name + '\nClass first try ' + pct(c.classFts) + '\nMean completion ' + c.classPc + '%\n' + c.started + ' of ' + m.roster.length + ' students have started' },
          h('b', null, pct(c.classFts)), h('small', null, c.classPc + '% done')));
      }));

    var rows = roster.map(function (s) {
      var x = m.stu[s.id], note = x.never ? 'never active' : x.quietRun >= 2 ? 'quiet ' + x.quietRun + ' wk' : null;
      return h('tr', null,
        h('td', { class: 'name' }, IL.who(s.id), note ? h('span', { class: 'sub' }, ' ' + note) : null),
        g.cols.map(function (c) { return h('td', null, ucell(s.id, tbId, c, g.cells[s.id + '|' + c.id], path, banded)); }));
    });

    var sub = level === 'chapter' ? 'One row per student, one column per chapter. Select a cell for its evidence, or a column heading to go a level deeper.'
      : level === 'sub' ? 'Subunits of ' + g.chapter.num + ' ' + g.chapter.name + '. Select a column heading to see the skills it assesses.'
      : 'Skills assessed in ' + g.sub.code + ' ' + g.sub.name + '. A question counts toward every skill it is tagged with, so columns overlap.';
    if (!banded) sub += level === 'chapter' ? ' Bands are unavailable for this skill set, so colour shows first-try success.' : ' Colour shows first-try success; bands are scored per unit only.';

    el.appendChild(C.card({ id: 'ST-1', title: 'By unit · ' + tb.name, sub: sub,
      tools: [h('span', { class: 'sub' }, 'Sort'), h('select', { class: 'sel', 'aria-label': 'Sort students',
        on: { change: function (e) { st.view.sort = e.target.value; IL.render(); } } },
        SORTS.map(function (o) { return h('option', { value: o[0], selected: sort === o[0] ? 'selected' : null }, o[1]); })),
        sort !== 'name' ? h('select', { class: 'sel', 'aria-label': 'Column to sort by', on: { change: function (e) { st.view.sortCol = e.target.value; IL.render(); } } },
          open.map(function (c) { return h('option', { value: c.id, selected: sortCol && sortCol.id === c.id ? 'selected' : null }, c.kind === 'skill' ? c.name : c.label + ' ' + c.name); })) : null],
      body: [h('div', { class: 'crumbs' }, crumbs),
        h('div', { class: 'ugrid-wrap' }, h('table', { class: 'ugrid', style: '--cols:' + g.cols.length + ';--cell:' + (level === 'skill' ? 190 : 150) + 'px' }, h('thead', null, head), h('tbody', null, classRow, rows))),
        h('div', { class: 'legend grid-legend' }, level === 'skill' ? marksLegend : legend),
        level === 'skill'
          ? h('div', { class: 'legend grid-legend' }, h('span', { class: 'lg-lab' }, 'Colour and number'), h('span', null, 'right first time, shown once a student has answered three or more questions on the skill'))
          : h('div', { class: 'legend grid-legend' }, h('span', { class: 'lg-lab' }, 'Bottom strip'),
            h('span', null, h('i', { class: 'sw c' }), 'correct'), h('span', null, h('i', { class: 'sw e' }), 'incorrect'),
            h('span', null, h('i', { class: 'sw p' }), 'awaiting grading'), h('span', null, h('i', { class: 'sw u' }), 'not started'),
            h('span', { class: 'lg-lab', style: 'margin-left:10px' }, 'Left bars'), h('span', null, 'recorded activity against the class'),
            h('span', { class: 'lg-lab', style: 'margin-left:10px' }, 'Number'), h('span', null, 'right first time'))],
      guard: 'Colour is a summary, never a grade. A band is capped by how much of the unit has been scored, and a cell with fewer than three graded answers shows no colour at all.' }));
  }

  function signalView(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, today = T.day(world.now);
    var rows = m.roster.slice().sort(U.by(function (s) { return s.name; })).map(function (s) {
      var x = m.stu[s.id], days = [], last7 = 0, prev7 = 0, a = sec.act[s.id] || {};
      for (var d = today - 14; d < today; d++) { var v = a[d] ? a[d].min : 0; days.push(v); if (d >= today - 7) last7 += v; else prev7 += v; }
      var reg = m.streaks.cols.slice(-5).map(function (asg) { var w = sec.asgWork[asg.id][s.id]; return asg.eligible.indexOf(s.id) < 0 ? 'na' : w ? 'yes' : 'no'; });
      var tags = [];
      if (x.never) tags.push(h('span', { class: 'tag' }, 'never active'));
      else if (x.quietRun >= 2) tags.push(h('span', { class: 'tag warn' }, 'quiet ' + x.quietRun + ' wk'));
      if (x.move === 'down' || x.traj === 'drop') tags.push(h('span', { class: 'tag warn' }, 'slipping'));
      if (x.move === 'up' || x.traj === 'rise') tags.push(h('span', { class: 'tag good' }, 'improving'));
      if (m.ready.some(function (r) { return r.sid === s.id; })) tags.push(h('span', { class: 'tag good' }, 'ready for more'));
      if (x.strict === 'grind') tags.push(h('span', { class: 'tag info' }, 'time, not landing'));
      return h('tr', { class: 'click', on: { click: function () { IL.openStudent(s.id); } } }, h('td', null, IL.who(s.id)),
        h('td', null, x.n >= 15 ? h('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, C.track({ value: x.fts, ref: m.medianFts, w: 150, valueLabel: IL.nm(s.id), refLabel: 'class median' }), h('b', null, pct(x.fts))) : h('span', { class: 'sub' }, x.n ? 'low evidence (' + x.n + ')' : '–')),
        h('td', { class: 'spark-cell', tip: last7 + ' minutes in the last 7 days, ' + prev7 + ' in the 7 before' }, C.spark(days, { bars: true, min: 0, max: Math.max(30, Math.max.apply(null, days)), w: 110, h: 22 })),
        h('td', { class: 'num' }, last7 - prev7 === 0 ? '0' : (last7 > prev7 ? '+' : '−') + Math.abs(last7 - prev7)),
        h('td', null, x.retries >= 20 ? h('span', { style: 'display:inline-flex;align-items:center;gap:6px;width:120px' }, C.split([{ n: Math.round(x.rapid * 100), cls: 's-warn', label: 'Within 3 seconds' }, { n: 100 - Math.round(x.rapid * 100), cls: 's-mute', label: 'Slower' }], { size: 'thin' }), h('span', { class: 'sub' }, pct(x.rapid))) : h('span', { class: 'sub' }, '–')),
        h('td', { class: 'num' }, x.unresolved.length || '–'),
        h('td', null, reg.map(function (c) { return h('i', { class: 'cellmark cm-' + c, style: 'margin-right:4px' }); })), h('td', null, tags));
    });
    el.appendChild(C.card({ id: 'ST-1', title: 'By signal', sub: 'One row per student across every tab. No overall score and no rank; sorted by name.',
      body: h('div', { style: 'overflow:auto' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Student'), h('th', null, 'First try vs class median'), h('th', null, 'Last 14 days'), h('th', { class: 'num' }, 'Minutes vs prior week'), h('th', null, 'Retries within 3 s'), h('th', { class: 'num' }, 'Unsolved'), h('th', null, 'Last 5 assignments'), h('th', null, ''))), h('tbody', null, rows))),
      guard: 'Last 5 assignments: ● started, ○ not started, – not assigned. Private to the teacher; with “Hide names” on, names are replaced by numbers.' }));
  }

  function allTextbooksView(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world;
    var grids = sec.textbooks.map(function (x) { return { tb: x.tb, role: x.role, g: M.grid(world, sec, x.tb.id, null) }; });
    var head1 = h('tr', null, h('th', { class: 'name' }), grids.map(function (x) { return h('th', { colspan: x.g.cols.length, style: 'border-bottom:3px solid ' + x.tb.accent + ';text-align:left' }, x.tb.short, h('span', { class: 'sub', style: 'font-weight:400' }, ' · ' + (x.role === 'primary' ? 'primary' : x.tb.kind.toLowerCase()))); }));
    var head2 = h('tr', null, h('th', { class: 'name' }, 'Student'), grids.map(function (x) { return x.g.cols.map(function (c) { return h('th', { tip: c.name }, c.label); }); }));
    var mini = function (c, col) {
      if (!col.open) return h('div', { style: 'width:46px;height:20px;border-radius:4px', class: 's-hatch', tip: col.name + ': not opened' });
      var t = c.total || 1;
      return h('div', { style: 'width:46px', tip: col.name + '\n' + c.correct + ' correct · ' + c.error + ' incorrect · ' + c.pending + ' awaiting grading · ' + c.untouched + ' not started' + (c.n ? '\nfirst try ' + pct(c.fts) : '') },
        C.split([{ n: c.correct, cls: 's-done', label: 'Correct' }, { n: c.error, cls: 's-bad', label: 'Incorrect' }, { n: c.pending, cls: 's-grade', label: 'Awaiting grading' }, { n: Math.max(0, c.untouched), cls: 's-none', label: 'Not started' }], { size: 'thin' }),
        h('div', { class: 'sub', style: 'font-size:10.5px;text-align:center' }, c.n >= 3 ? pct(c.fts) : '–'));
    };
    var classRow = h('tr', null, h('td', { class: 'name', style: 'font-weight:600' }, 'Class'), grids.map(function (x) { return x.g.cols.map(function (c) { return h('td', { style: 'text-align:center;font-weight:600;font-size:12px' }, c.open ? pct(c.classFts) : '–'); }); }));
    var rows = m.roster.slice().sort(U.by(function (s) { return s.name; })).map(function (s) {
      return h('tr', null, h('td', { class: 'name' }, IL.who(s.id)), grids.map(function (x) { return x.g.cols.map(function (c) { return h('td', null, mini(x.g.cells[s.id + '|' + c.id], c)); }); }));
    });
    el.appendChild(C.card({ id: 'ST-1', title: 'All textbooks', sub: 'Every textbook attached to this section, side by side at chapter level. Each cell: questions by state, and first-try success.',
      body: [h('div', { style: 'overflow-x:auto' }, h('table', { class: 'ugrid', style: '--cols:' + U.sum(grids.map(function (x) { return x.g.cols.length; })) + ';--cell:62px' }, h('thead', null, head1, head2), h('tbody', null, classRow, rows))),
        C.legend([{ cls: 's-done', label: 'correct' }, { cls: 's-bad', label: 'incorrect' }, { cls: 's-grade', label: 'awaiting grading' }, { cls: 's-none', label: 'not started' }, { cls: 's-hatch', label: 'not opened' }])],
      guard: 'Supplemental textbooks appear here and nowhere in the bands.' }));
  }

  function movementView(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, mv = m.movement, N = m.roster.length;
    var moved = mv.improving.concat(mv.slipping);
    el.appendChild(C.card({ id: 'ST-5', title: 'Movement',
      finding: mv.improving.length + ' improving, ' + mv.slipping.length + ' slipping, ' + mv.steady.length + ' steady.',
      sub: 'The last two class weeks (from ' + T.fmtDay(mv.cur[0] * 7) + ') against the two before (from ' + T.fmtDay((mv.prev[0] || 0) * 7) + ')',
      body: [C.split([{ n: mv.improving.length, cls: 's-good', label: 'Improving', sids: mv.improving.map(function (x) { return x.sid; }) }, { n: mv.slipping.length, cls: 's-warn', label: 'Slipping', sids: mv.slipping.map(function (x) { return x.sid; }) },
        { n: mv.steady.length, cls: 's-mute', label: 'Steady', sids: mv.steady.map(function (x) { return x.sid; }) }, { n: mv.noEvidence.length, cls: 's-none', label: 'No recent evidence', sids: mv.noEvidence.map(function (x) { return x.sid; }) }], { size: 'tall' }),
        C.legend([{ cls: 's-good', label: 'improving ' + mv.improving.length }, { cls: 's-warn', label: 'slipping ' + mv.slipping.length }, { cls: 's-mute', label: 'steady ' + mv.steady.length }, { cls: 's-none', label: 'no recent evidence ' + mv.noEvidence.length }]),
        h('p', { class: 'note' }, h('b', null, 'Recorded activity: '), mv.up.length + ' up', mv.up.length ? [' (', IL.whoList(mv.up.map(function (x) { return x.sid; }), 5), ')'] : '', ' · ' + mv.down.length + ' down', mv.down.length ? [' (', IL.whoList(mv.down.map(function (x) { return x.sid; }), 5), ')'] : ''),
        moved.length ? [h('p', { class: 'sub', style: 'margin:12px 0 2px' }, 'Gap to classmates on the same questions, before and now. Steady students are not drawn.'), IL.movePicture(m, moved)] : h('p', { class: 'empty' }, 'No one moved 15 points or more.'),
        mv.noEvidence.length ? h('p', { class: 'note' }, h('b', null, 'No recent evidence: '), IL.whoList(mv.noEvidence.map(function (x) { return x.sid; }), 10)) : null],
      actions: [mv.improving.length ? h('button', { class: 'btn', on: { click: function () { IL.toast('Congratulations sent to ' + mv.improving.length + ' students.'); } } }, 'Congratulate ' + mv.improving.length) : null,
        mv.slipping.length ? h('button', { class: 'btn', on: { click: function () { IL.logCheckin(mv.slipping.map(function (x) { return x.sid; }), 'traj'); } } }, 'Check in with ' + mv.slipping.length) : null],
      guard: 'Improving or slipping means a change of 15 points or more against classmates, with at least 15 first attempts in each window.' }));
    var rows = m.roster.filter(function (s) { return !m.stu[s.id].never; }).sort(U.by(function (s) { return m.stu[s.id].lastDay; }, true)).map(function (s) {
      var x = m.stu[s.id];
      return h('tr', { class: 'click', on: { click: function () { IL.openStudent(s.id); } } }, h('td', null, IL.who(s.id)), h('td', null, T.fmtDayLong(x.lastDay)), h('td', { class: 'num' }, x.wn), h('td', { class: 'num' }, x.wn ? pct(x.wfts) : '–'),
        h('td', { class: 'num' }, x.wgap.n >= 15 ? signed(x.wgap.gap) : '–'), h('td', null, x.move === 'up' ? h('span', { class: 'tag good' }, 'improving') : x.move === 'down' ? h('span', { class: 'tag warn' }, 'slipping') : x.move === 'none' ? h('span', { class: 'tag' }, 'no recent evidence') : ''));
    });
    el.appendChild(h('div', { style: 'margin-top:14px' }, C.card({ title: 'Recent activity', sub: 'The existing Recent Activity table, in this window. Select a row for the student page.',
      body: h('div', { style: 'overflow:auto;max-height:420px' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Student'), h('th', null, 'Last activity'), h('th', { class: 'num' }, 'Questions'), h('th', { class: 'num' }, 'Right first time'), h('th', { class: 'num' }, 'vs classmates'), h('th', null, ''))), h('tbody', null, rows))) })));
  }

  function groupsView(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, groups = [];
    m.gaps.roots.slice(0, 2).forEach(function (g) {
      if (g.below.length >= 3) groups.push({ recipe: 'Remediation', title: g.skill.name, sids: g.below.map(function (x) { return x.sid; }).slice(0, 8), skills: [g.skill.id], evidence: 'each under 35% first try over 3 or more questions on this skill and what depends on it',
        strength: g.below.every(function (x) { return x.n >= 5; }) ? 'strong evidence' : 'some evidence', pic: C.bars(g.below.slice(0, 5).map(function (x) { return { label: IL.who(x.sid), v: x.ok / x.n, text: x.ok + ' of ' + x.n }; }), { max: 1, span: 50 }) });
    });
    m.reteach.slice(0, 1).forEach(function (r) {
      groups.push({ recipe: 'Exit Ticket', title: 'Same wrong answer on “' + r.item.name + '”', sids: r.picks[r.top], skills: r.item.skills, evidence: 'all chose ' + String.fromCharCode(65 + r.top) + ' first', strength: 'one question', pic: C.options({ item: r.item, picks: r.picks, top: r.top }) });
    });
    m.code.slice(0, 1).forEach(function (c) {
      groups.push({ recipe: 'Practice', title: 'Still failing “' + c.item.name + '”', sids: c.failing, skills: c.item.skills, evidence: c.topError ? 'most on ' + c.topError.err : 'have not passed', strength: 'one question',
        pic: [C.split([{ n: c.firstRun.length, cls: 's-done', label: 'First run' }, { n: c.afterFixes.length, cls: 's-late', label: 'After fixes' }, { n: c.failing.length, cls: 's-bad', label: 'Still failing' }], { size: 'tall' }),
          C.legend([{ cls: 's-done', label: 'passed first run ' + c.firstRun.length }, { cls: 's-late', label: 'passed after fixes ' + c.afterFixes.length }, { cls: 's-bad', label: 'still failing ' + c.failing.length }])] });
    });
    var cur = m.pace[m.pace.length - 1];
    if (cur && cur.behind.length >= 3) groups.push({ recipe: 'Textbook Unit', title: 'Behind on chapter ' + cur.unit.num, sids: cur.behind.map(function (x) { return x.sid; }), skills: [], evidence: '15 points or more below the class median', strength: 'current state', pic: null, toast: true });
    if (m.ready.length >= 2) groups.push({ recipe: 'Challenge', title: 'Ready for more', sids: m.ready.map(function (x) { return x.sid; }), skills: m.next ? m.next.sub.skills.slice(0, 2) : [], evidence: '70% or more right first time on the current chapter, work complete', strength: 'strong evidence', pic: null });
    var count = {};
    groups.forEach(function (g) { g.sids.forEach(function (s) { count[s] = (count[s] || 0) + 1; }); });
    el.appendChild(h('p', { class: 'sub', style: 'margin-bottom:10px' }, h('span', { class: 'card-id' }, 'ST-2'), ' Suggested groups. Each shares a next step. Membership is a suggestion: it is not saved, and it expires with its evidence.'));
    el.appendChild(h('div', { class: 'grid g2' }, groups.map(function (g) {
      var overlap = g.sids.filter(function (s) { return count[s] > 1; }).length;
      return h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('span', { class: 'tag info' }, g.recipe), h('h3', null, g.title), h('div', { class: 'card-tools' }, h('span', { class: 'tag' }, g.strength))),
        C.named(g.sids, '', 12), h('p', { class: 'note' }, U.plural(g.sids.length, 'student') + ' · ' + g.evidence + (overlap ? ' · ' + overlap + ' also in another group' : '')),
        g.pic ? h('div', { style: 'margin-top:10px' }, g.pic) : null,
        h('div', { class: 'actions' }, h('button', { class: 'btn primary', on: { click: function () { if (g.toast || !g.skills.length) IL.toast('Would open Create Coursework with the ' + g.recipe + ' recipe for ' + g.sids.length + ' students.'); else IL.builder({ recipe: g.recipe, minutes: 15, sids: g.sids, skills: g.skills, reason: g.title }); } } }, 'Generate Coursework')));
    })));
    if (!groups.length) el.appendChild(h('p', { class: 'empty' }, 'No group has enough shared evidence yet.'));
  }

  function studentPage(el, ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, sid = ctx.st.student, d = M.student(world, sec, sid), x = d.s, s = d.st, items = sec.items;
    var order = m.roster.slice().sort(U.by(function (r) { return r.name; })), idx = order.map(function (r) { return r.id; }).indexOf(sid);
    var prev = order[(idx - 1 + order.length) % order.length], next = order[(idx + 1) % order.length];
    var tags = [];
    if (!x) { el.appendChild(h('p', { class: 'empty' }, 'This account is not on the roster.')); return; }
    if (x.never) tags.push(h('span', { class: 'tag' }, 'never active'));
    if (x.quietRun >= 2) tags.push(h('span', { class: 'tag warn' }, 'quiet for ' + x.quietRun + ' class weeks'));
    if (x.traj === 'drop' || x.move === 'down') tags.push(h('span', { class: 'tag warn' }, 'slipping against classmates'));
    if (x.traj === 'rise' || x.move === 'up') tags.push(h('span', { class: 'tag good' }, 'improving against classmates'));
    if (x.strict === 'grind') tags.push(h('span', { class: 'tag info' }, 'putting in the time, not landing it'));
    if (m.ready.some(function (r) { return r.sid === sid; })) tags.push(h('span', { class: 'tag good' }, 'ready for more'));
    el.appendChild(h('div', { class: 'stu-head' }, h('div', { class: 'avatar' }, IL.state.hideNames ? '··' : s.initials), h('div', null, h('h2', null, IL.nm(sid)),
      h('div', { class: 'sub' }, x.n + ' questions · ' + pct(x.fts) + ' right first time (class median ' + pct(m.medianFts) + ') · ' + x.minutes + ' recorded minutes · last active ' + (x.lastDay != null ? T.fmtDayLong(x.lastDay) : 'never'))),
      h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, tags), h('div', { class: 'spacer' }),
      h('button', { class: 'btn', on: { click: function () { IL.go({ tab: 'students', student: null }); } } }, 'All students'),
      h('button', { class: 'btn', on: { click: function () { IL.openStudent(prev.id); } } }, '‹ ' + IL.nm(prev.id)), h('button', { class: 'btn', on: { click: function () { IL.openStudent(next.id); } } }, IL.nm(next.id) + ' ›')));
    if (x.never) { el.appendChild(C.card({ title: 'No recorded work', body: h('p', { class: 'empty' }, 'This student is on the roster and has never signed in. Check their invitation under People.') })); return; }

    // ST-3 timeline: three aligned strips, never one chart with three lines
    var wkLabels = d.weeks.map(function (w, i) { return i % 2 === 0 ? T.fmtDay(w.week * 7) : ''; });
    var cw = 40, maxMin = Math.max(60, Math.max.apply(null, d.weeks.map(function (w) { return w.minutes; })));
    var minBars = IL.s('svg', { width: d.weeks.length * (cw + 4), height: 44, role: 'img', 'aria-label': 'Recorded minutes per week' });
    d.weeks.forEach(function (w, i) {
      var bh = Math.max(1, (w.minutes / maxMin) * 38);
      minBars.appendChild(IL.s('rect', { x: i * (cw + 4) + 2 + (cw - 22) / 2, y: 42 - bh, width: 22, height: bh, rx: 3, fill: w.classWeek ? '#8fb1f1' : '#d9dce2', 'data-tip': 'Week of ' + T.fmtDay(w.week * 7) + '\n' + w.minutes + ' recorded minutes', tabindex: 0 }));
    });
    var lessonCols = d.lessons.slice(-14);
    el.appendChild(C.card({ id: 'ST-3', title: 'Timeline', sub: 'Three strips on one time axis. Bars above the line mean better than classmates on the same questions.',
      body: [h('div', { class: 'strip-row' }, h('span', null, 'First try vs classmates'), C.zero({ values: d.weeks.map(function (w) { return w.gap; }), cw: cw, h: 60, amp: 0.45, tips: d.weeks.map(function (w) { return 'Week of ' + T.fmtDay(w.week * 7) + ' · ' + w.n + ' first attempts'; }), refLabel: 'class level', tailW: 70 })),
        h('div', { class: 'strip-row' }, h('span', null, 'Recorded minutes per week'), minBars),
        h('div', { class: 'strip-row' }, h('span', null, 'Weeks from'), h('div', { style: 'display:flex' }, d.weeks.map(function (w, i) { return h('span', { style: 'width:' + (cw + 4) + 'px;font-size:10.5px;color:#7c7f85;text-align:center' }, wkLabels[i]); }))),
        h('div', { class: 'strip-row' }, h('span', null, 'Assigned work (latest ' + lessonCols.length + ')'), h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, lessonCols.map(function (l) {
          return h('i', { class: 'cellmark cm-' + (l.state === 'done' ? 'yes' : l.state === 'part' ? 'last' : l.state === 'no' ? 'no' : 'na'), tip: l.a.short + '\n' + (l.state === 'done' ? 'completed' : l.state === 'part' ? 'started, not finished' : l.state === 'no' ? 'not started' : 'not assigned') + (l.late ? ' · started after the due date' : '') });
        }))),
        h('div', { class: 'moments' }, d.moments.map(function (mo) {
          return h('span', { class: 'moment ' + mo.kind, tabindex: 0, tip: mo.detail, on: { click: function () {
            if (mo.unit) IL.ev.cell(sid, sec.textbooks[0].tb.id, mo.unit);
            else if (mo.action) IL.go({ tab: 'followups' });
            else if (mo.week != null) IL.drawer('Week of ' + T.fmtDay(mo.week * 7), IL.nm(sid) + ' · ' + mo.detail, IL.section('First answers that week', d.recs.filter(function (r) { return T.week(r.attempts[0].t) === mo.week && r.attempts[0].ok === false; }).slice(0, 14).map(function (r) {
              return h('div', { class: 'strip-row', style: 'grid-template-columns:1fr auto' }, h('a', { on: { click: function () { IL.ev.item(r.item); } } }, items[r.item].name), C.tape(r.attempts, { code: items[r.item].type === 'activecode' }));
            })));
            else IL.toast(mo.label + ': ' + mo.detail);
          } } }, h('i'), h('small', null, T.fmt(mo.t)), mo.label);
        }))],
      guard: 'Moments are events in the work, not labels for the student.' }));

    // clusters, profile, unresolved, habits
    var weak = d.clusters.slice(0, 5), strong = d.clusters.slice(-4).reverse();
    var fmtRow = function (k, lab) { var f = d.fmt[k]; return f && f.n >= 3 ? { label: lab, v: f.ok / f.n, text: f.ok + ' of ' + f.n } : null; };
    var unGroups = U.groupBy(d.unresolved, function (r) { return items[r.item].subCode; }), unNodes = [];
    unGroups.forEach(function (rs, code) { unNodes.push(h('div', { style: 'margin-bottom:6px' }, h('span', { class: 'sub' }, code + ' · '), rs.slice(0, 4).map(function (r, i) { return [i ? ' · ' : '', h('a', { on: { click: function () { IL.ev.item(r.item); } } }, items[r.item].name)]; }), rs.length > 4 ? ' · +' + (rs.length - 4) : '')); });
    el.appendChild(h('div', { class: 'grid g2', style: 'margin-top:14px' },
      C.card({ title: 'Weakest and strongest skills', sub: 'First try, with at least three questions each. ┃ marks the class.',
        body: [weak.map(function (o) { return h('div', { class: 'split-row', style: 'grid-template-columns:minmax(120px,1fr) 170px auto' }, h('span', { class: 'lab' }, o.skill.name), C.track({ value: o.p, ref: o.cls, w: 170, valueLabel: IL.nm(sid), refLabel: 'class' }), h('span', { class: 'val' }, o.ok + ' of ' + o.n)); }),
          h('p', { class: 'sub', style: 'margin:10px 0 2px' }, 'Strongest'), strong.map(function (o) { return h('div', { class: 'split-row', style: 'grid-template-columns:minmax(120px,1fr) 170px auto' }, h('span', { class: 'lab' }, o.skill.name), C.track({ value: o.p, ref: o.cls, w: 170, valueLabel: IL.nm(sid), refLabel: 'class' }), h('span', { class: 'val' }, o.ok + ' of ' + o.n)); })],
        actions: weak.length ? [h('button', { class: 'btn primary', on: { click: function () { IL.builder({ recipe: 'Remediation', minutes: 15, sids: [sid], skills: weak.slice(0, 2).map(function (o) { return o.skill.id; }), reason: 'weakest skills' }); } } }, 'Personal practice set')] : null }),
      C.card({ title: 'Depth, format and habits',
        body: [h('p', { class: 'sub' }, 'By depth'), C.bars([1, 2, 3].map(function (k) { var o = d.dok[k]; return o ? { label: ['', 'Recall', 'Apply', 'Reason'][k], v: o.ok / o.n, text: o.ok + ' of ' + o.n } : null; }).filter(Boolean), { max: 1, span: 55 }),
          h('p', { class: 'sub', style: 'margin-top:8px' }, 'By format'), C.bars([fmtRow('fillintheblank', 'Fill-in'), fmtRow('mchoice', 'Multiple choice'), fmtRow('parsonsprob', 'Parsons'), fmtRow('activecode', 'Code')].filter(Boolean), { max: 1, span: 55 }),
          h('div', { class: 'facts', style: 'margin-top:10px' },
            h('div', null, h('span', null, 'Quick retries (under 3 s)'), h('span', null, x.retries >= 20 ? pct(x.rapid) : '–'), h('span', null, 'class median ' + pct(m.retry.median))),
            h('div', null, h('span', null, 'Fast wrong first answers'), h('span', null, x.mcq >= 15 ? pct(x.fastWrong) : '–'), h('span', null, 'class median ' + pct(m.fastWrong.median))),
            h('div', null, h('span', null, 'Unsolved questions'), h('span', null, x.unresolved.length), h('span', null, 'class median ' + Math.round(m.unresolved.median))))] })));
    el.appendChild(h('div', { class: 'grid g2', style: 'margin-top:14px' },
      C.card({ title: 'Unfinished business · ' + d.unresolved.length, sub: 'Attempted and never solved, by subunit', body: unNodes.length ? unNodes : h('p', { class: 'empty' }, 'Nothing left unsolved.'),
        actions: d.unresolved.length ? [h('button', { class: 'btn', on: { click: function () { IL.toast('Would assign ' + IL.nm(sid) + ' a “finish these” set of ' + d.unresolved.length + ' questions.'); } } }, 'Assign “finish these”')] : null }),
      C.card({ title: 'Recent work', body: h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Question'), h('th', null, 'When'), h('th', null, 'Attempts'))), h('tbody', null, d.recent.slice(0, 9).map(function (r) {
        return h('tr', { class: 'click', on: { click: function () { IL.ev.item(r.item); } } }, h('td', null, items[r.item].name), h('td', { style: 'white-space:nowrap' }, T.fmt(r.attempts[0].t)), h('td', null, C.tape(r.attempts.slice(0, 16), { code: items[r.item].type === 'activecode' })));
      }))) })));
  }

  IL.tabs.students = { label: 'Students', question: 'Who needs what?',
    render: function (el, ctx) {
      var st = ctx.st, sec = ctx.sec;
      if (st.student) { studentPage(el, ctx); return; }
      var view = st.view.students || 'unit';
      var views = [['unit', 'By unit'], ['signal', 'By signal']];
      if (sec.textbooks.length > 1) views.push(['all', 'All textbooks']);
      views.push(['movement', 'Movement'], ['groups', 'Suggested groups']);
      el.appendChild(h('div', { class: 'viewtabs' }, views.map(function (v) {
        return h('button', { class: 'chip' + (view === v[0] ? ' on' : ''), on: { click: function () { st.view.students = v[0]; IL.go({}); } } }, v[1]);
      })));
      if (view === 'signal') signalView(el, ctx); else if (view === 'all') allTextbooksView(el, ctx); else if (view === 'movement') movementView(el, ctx); else if (view === 'groups') groupsView(el, ctx); else gridView(el, ctx);
      IL.openers.cell = function () {
        var tb = sec.textbooks[0].tb, g = M.grid(ctx.world, sec, tb.id, null), col = g.cols.filter(function (c) { return c.open; })[1] || g.cols[0];
        var grind = ctx.m.roster.filter(function (s) { return ctx.m.stu[s.id].strict === 'grind'; })[0] || ctx.m.roster[0];
        IL.ev.cell(grind.id, tb.id, col.id);
      };
    } };

  // ---------- Follow-ups ----------
  IL.tabs.followups = { label: 'Follow-ups', question: 'What did I do, and did it help?',
    badge: function (m) { var n = m.followups.filter(function (f) { return f.status === 'recheck due'; }).length; return n || null; },
    render: function (el, ctx) {
      var m = ctx.m, sec = ctx.sec, world = ctx.world, st = ctx.st, N = m.roster.length;
      var TAG = { 'recheck due': 'warn', done: 'good', waiting: '' };
      var log = m.followups.map(function (f) {
        var a = f.action, ci = a.kind === 'check-in';
        return h('section', { class: 'card', style: 'margin-bottom:12px' },
          h('div', { class: 'card-head' }, h('span', { class: 'tag info' }, a.type), h('h3', null, a.title), h('div', { class: 'card-tools' }, h('span', { class: 'tag ' + TAG[f.status] }, f.status === 'done' ? 'reviewed' : f.status)),
          ),
          h('p', { class: 'sub', style: 'margin-bottom:10px' }, T.fmtDayLong(a.day) + ' · ' + (a.students.length >= N - 2 ? 'whole class (' + a.students.length + ')' : U.plural(a.students.length, 'student')) + ' · recheck ' + T.fmtDayLong(a.recheckDay) + (a.user ? ' · added in this session' : '')),
          !ci && f.status !== 'waiting' && f.before != null ? h('p', { class: 'finding', style: 'font-size:14px' }, 'First try on this skill: ' + pct(f.before) + ' before, ' + pct(f.after) + ' after, on new questions.') : null,
          IL.followupPicture(f),
          h('div', { class: 'actions' },
            f.status === 'recheck due' ? h('button', { class: 'btn primary', on: { click: function () { a.reviewed = true; if (ci) a.recheckDay = T.day(world.now) + 99; sec._m = {}; IL.render(); IL.toast('Marked as reviewed.'); } } }, 'Mark reviewed') : null,
            !ci && f.noWork ? h('button', { class: 'btn', on: { click: function () { IL.toast('Would send a three-question recheck to ' + f.noWork + ' students.'); } } }, 'Send a short recheck to ' + f.noWork) : null,
            !ci && f.same ? h('button', { class: 'btn', on: { click: function () { IL.builder({ recipe: 'Remediation', minutes: 15, sids: f.rows.filter(function (r) { return r.state === 'same'; }).map(function (r) { return r.sid; }), skills: a.skills, reason: 'try a different approach' }); } } }, 'Try a different approach for ' + f.same) : null,
            ci ? h('button', { class: 'btn', on: { click: function () { IL.openStudent(a.students[0]); } } }, 'Open student') : null));
      });
      var due = m.followups.filter(function (f) { return f.status === 'recheck due'; }).length;
      el.appendChild(h('div', { class: 'grid g-21' },
        h('div', null, h('p', { class: 'sub', style: 'margin-bottom:10px' }, h('span', { class: 'card-id' }, 'FU-1'), ' ', h('span', { class: 'card-id' }, 'FU-2'), ' Action log, newest first, with what happened on fresh work afterwards. ' + (due ? U.plural(due, 'recheck is', 'rechecks are') + ' ready to review.' : '')), log,
          h('p', { class: 'guard' }, 'The comparison is “after”, never “because of”. Students picked because they were lowest on a skill tend to rise somewhat on any recheck, so read small gains with care.')),
        (function () {
          var rules = (st.rules = st.rules || { quiet: 2, behind: 15, fast: 25, weak: 35 });
          var cur = m.pace[m.pace.length - 1];
          var preview = {
            quiet: function (v) { return m.roster.filter(function (s) { return (m.stu[s.id].quietRun || 0) >= v; }).length + ' students'; },
            behind: function (v) { return cur ? cur.dots.filter(function (d) { return d.pc <= cur.median - v; }).length + ' students' : '–'; },
            fast: function (v) { return m.fastWrong.dots.filter(function (d) { return d.v * 100 >= v; }).length + ' students'; },
            weak: function (v) { return Object.keys(m.skill).filter(function (k) { return m.skill[k].solid && m.skill[k].p * 100 < v; }).length + ' skills'; } };
          var defs = [['quiet', 'Went quiet after', 'class weeks', 1, 1, 4, 6, 5], ['behind', 'Behind the class by', 'points', 5, 5, 40, 9, 6], ['fast', 'Fast wrong answers above', '%', 5, 10, 50, 4, 3], ['weak', 'Weak skill below', '% first try', 5, 20, 50, 11, 9]];
          return C.card({ id: 'FU-3', title: 'Rules and feedback', sub: 'Thresholds for this class. Changing one shows what it would flag now.',
            body: defs.map(function (dd) {
              var k = dd[0];
              return h('div', { class: 'rule' },
                h('div', { class: 'rule-top' }, h('span', null, dd[1]),
                  h('span', { style: 'white-space:nowrap' }, h('button', { class: 'btn small', 'aria-label': 'Lower', on: { click: function () { rules[k] = Math.max(dd[4], rules[k] - dd[3]); IL.render(); } } }, '−'), ' ', h('b', null, rules[k] + ' ' + dd[2]), ' ',
                    h('button', { class: 'btn small', 'aria-label': 'Raise', on: { click: function () { rules[k] = Math.min(dd[5], rules[k] + dd[3]); IL.render(); } } }, '+'))),
                h('div', { class: 'rule-bot' }, h('span', null, 'Would flag now: ', h('b', { style: 'color:var(--ink)' }, preview[k](rules[k]))), h('span', { class: 'spacer', style: 'flex:1' }),
                  h('span', { style: 'width:70px' }, C.split([{ n: dd[7], cls: 's-good', label: 'Marked useful' }, { n: dd[6] - dd[7], cls: 's-mute', label: 'Not marked useful' }], { size: 'thin' })), h('span', null, dd[7] + ' of ' + dd[6] + ' useful')));
            }),
            guard: 'In this mock the thresholds only change the preview column. “Fired · useful” counts are illustrative. Feedback tunes ranking, never the underlying counts, and is not used to rank teachers.' });
        })()));
    } };
})(typeof window !== 'undefined' ? window : globalThis);

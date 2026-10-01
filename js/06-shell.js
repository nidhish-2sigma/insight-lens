/* Insight Lens mock · shell: state, frame, scope bar, evidence drawer, practice-set builder and the priority queue. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, M = IL.M, h = IL.h, C = IL.C, pct = IL.pct;
  if (!root.document) return;
  var doc = root.document;

  IL.world = IL.generate();
  IL.state = { sec: 's1', tab: 'brief', tb: 'all', win: '2w', hideNames: false, view: {}, cards: {}, useful: {}, actions: [], student: null, open: null, showAll: false, cat: null };
  IL.tabs = {};
  IL.tabOrder = ['brief', 'progress', 'understanding', 'engagement', 'habits', 'students', 'followups'];

  IL.sec = function () { return IL.world.sections.filter(function (s) { return s.id === IL.state.sec; })[0]; };
  IL.metrics = function () { return M.build(IL.world, IL.sec(), { tb: IL.state.tb, win: IL.state.win }); };
  IL.nm = function (sid) {
    var st = IL.sec().students[sid];
    if (!st) return sid;
    return IL.state.hideNames ? 'Student ' + (st.idx + 1 < 10 ? '0' : '') + (st.idx + 1) : st.name;
  };
  IL.who = function (sid) { return h('span', { class: 'who', on: { click: function (e) { e.stopPropagation(); IL.openStudent(sid); } } }, IL.nm(sid)); };
  IL.whoList = function (sids, max) {
    max = max || 8;
    var out = [];
    sids.slice(0, max).forEach(function (sid, i) { if (i) out.push(' · '); out.push(IL.who(sid)); });
    if (sids.length > max) out.push(' · +' + (sids.length - max) + ' more');
    return out;
  };

  // ---------- routing ----------
  IL.go = function (patch) {
    Object.keys(patch).forEach(function (k) { IL.state[k] = patch[k]; });
    if (patch.sec) { IL.state.tb = 'all'; IL.state.student = null; IL.state.view = {}; IL.state.cat = null; IL.state.showAll = false; }
    if (patch.tab && patch.student === undefined) IL.state.student = null;
    var st = IL.state, hash = '#/' + st.sec + '/' + st.tab + (st.student ? '/' + st.student : '');
    var q = [];
    if (st.tb !== 'all') q.push('tb=' + st.tb);
    if (st.win !== '2w') q.push('win=' + st.win);
    if (st.view[st.tab]) q.push('view=' + st.view[st.tab]);
    if (q.length) hash += '?' + q.join('&');
    if (root.location.hash !== hash) root.history.replaceState(null, '', hash);
    IL.closeDrawer(); IL.render();
    var main = doc.querySelector('.main'); if (main && patch.tab) main.scrollTop = 0;
  };
  IL.openStudent = function (sid) { IL.go({ tab: 'students', student: sid }); };
  function readHash() {
    var m = /^#\/([^/?]+)\/([^/?]+)(?:\/([^?]+))?(?:\?(.*))?$/.exec(root.location.hash || '');
    if (!m) return;
    var st = IL.state;
    if (IL.world.sections.some(function (s) { return s.id === m[1]; }) && st.sec !== m[1]) { st.sec = m[1]; st.cat = null; st.showAll = false; }
    if (IL.tabs[m[2]]) st.tab = m[2];
    st.student = m[3] || null;
    (m[4] || '').split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0] === 'tb') st.tb = p[1]; else if (p[0] === 'win') st.win = p[1]; else if (p[0] === 'view') st.view[st.tab] = p[1];
      else if (p[0] === 'open') st.open = p[1]; else if (p[0] === 'names' && p[1] === 'off') st.hideNames = true;
    });
  }

  // ---------- frame ----------
  var RAIL = [['◐', 'Insight Lens', true], ['▤', 'Coursework'], ['▦', 'Textbook'], ['◇', 'Sandbox'], ['▣', 'Projects'], ['☺', 'People'], ['＋', 'Create Coursework']];
  IL.render = function () {
    var st = IL.state, sec = IL.sec(), world = IL.world, m = IL.metrics(), tab = IL.tabs[st.tab];
    var app = doc.getElementById('app');
    var keep = doc.querySelector('.main'), scroll = keep ? keep.scrollTop : 0;
    app.textContent = '';
    app.appendChild(h('header', { class: 'topbar' },
      h('div', { class: 'logo' }, 'A'), h('span', { class: 'brand' }, 'ALPS'),
      h('div', { class: 'sections', role: 'tablist', 'aria-label': 'Section' }, world.sections.map(function (s) {
        return h('button', { class: 'sec-btn' + (s.id === st.sec ? ' on' : ''), on: { click: function () { IL.go({ sec: s.id, tab: st.tab === 'students' ? 'students' : st.tab }); } } },
          s.name, h('small', null, s.period + ' · ' + s.roster.length + ' students'));
      })),
      h('div', { class: 'spacer' }),
      h('span', { class: 'demo-date', tip: 'The mock is frozen at this moment. Twelve weeks of work have been recorded.' }, T.fmtDayLong(T.day(world.now)) + ' 2026 · 07:30'),
      h('button', { class: 'toggle' + (st.hideNames ? ' on' : ''), tip: 'Replace names with numbers, for showing the screen to the class', on: { click: function () { st.hideNames = !st.hideNames; IL.render(); } } }, st.hideNames ? 'Names hidden' : 'Hide names'),
      h('div', { class: 'avatar', tip: sec.teacher }, 'MA')));
    app.appendChild(h('nav', { class: 'rail', 'aria-label': 'Main navigation' },
      RAIL.map(function (r) { return h('div', { class: 'rail-item ' + (r[2] ? 'on' : 'off'), tip: r[2] ? null : 'Not part of this mock' }, h('span', { class: 'ic' }, r[0]), r[1]); }),
      h('div', { class: 'rail-note' }, 'Student Breakdown, Performance Dashboard and Recent Activity now live inside Insight Lens, under Students and Understanding.')));
    var main = h('main', { class: 'main' });
    main.appendChild(h('div', { class: 'lens-head' },
      h('div', { class: 'lens-title' }, h('h1', null, 'Insight Lens'), h('span', null, sec.name + ' · ' + sec.period)),
      h('div', { class: 'tabs', role: 'tablist' }, IL.tabOrder.map(function (k) {
        var t = IL.tabs[k], n = t.badge ? t.badge(m, sec) : null;
        return h('button', { class: 'tab' + (k === st.tab ? ' on' : ''), role: 'tab', 'aria-selected': k === st.tab, on: { click: function () { IL.go({ tab: k }); } } }, t.label + (n ? ' (' + n + ')' : ''));
      }))));
    var b = m.b;
    var withWork = m.roster.filter(function (s) { return m.stu[s.id].wn > 0; }).length;
    main.appendChild(h('div', { class: 'scope' },
      h('div', null, h('label', null, 'Textbook'), h('span', { class: 'chips' },
        h('button', { class: 'chip' + (st.tb === 'all' ? ' on' : ''), on: { click: function () { IL.go({ tb: 'all' }); } } }, 'All textbooks'),
        sec.textbooks.map(function (x) {
          return h('button', { class: 'chip' + (st.tb === x.tb.id ? ' on' : ''), tip: x.tb.name + ' · ' + x.role, on: { click: function () { IL.go({ tb: x.tb.id }); } } },
            h('i', { class: 'dot', style: 'background:' + x.tb.accent }), x.tb.short, h('small', null, x.role === 'primary' ? 'primary' : x.tb.kind.toLowerCase()));
        }))),
      h('div', null, h('label', null, 'Window'), h('span', { class: 'chips' }, M.windows.map(function (w) {
        return h('button', { class: 'chip' + (st.win === w.id ? ' on' : ''), on: { click: function () { IL.go({ win: w.id }); } } }, w.label);
      }))),
      h('div', { class: 'fresh', tip: 'Class weeks are weeks when at least 60% of the roster was active.\nQuiet weeks are skipped, so a holiday does not distort a comparison.' },
        'Since ' + T.fmt(m.from) + ' · ' + withWork + ' of ' + m.roster.length + ' students have work in this window · updated 14 min ago')));
    var content = h('div', { class: 'content' });
    if (tab.question && !(st.tab === 'students' && st.student)) content.appendChild(h('p', { class: 'question' }, h('b', null, tab.label), tab.question));
    tab.render(content, { world: world, sec: sec, m: m, st: st, b: b });
    main.appendChild(content);
    app.appendChild(main);
    main.scrollTop = scroll;
    if (st.open) { var o = st.open; st.open = null; if (IL.openers[o]) IL.openers[o](); }
  };
  IL.openers = {};

  // ---------- tooltip, toast, drawer, modal ----------
  var tip = doc.getElementById('tip');
  function showTip(el, x, y) {
    tip.textContent = el.getAttribute('data-tip'); tip.hidden = false;
    var r = tip.getBoundingClientRect(), vw = root.innerWidth, vh = root.innerHeight;
    tip.style.left = Math.max(6, Math.min(vw - r.width - 6, x + 12)) + 'px';
    tip.style.top = (y + 18 + r.height > vh ? y - r.height - 10 : y + 18) + 'px';
  }
  doc.addEventListener('pointermove', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
  });
  doc.addEventListener('focusin', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el) { var r = el.getBoundingClientRect(); showTip(el, r.left, r.bottom - 12); }
  });
  doc.addEventListener('focusout', function () { tip.hidden = true; });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { IL.closeDrawer(); IL.closeModal(); } });

  var toastTimer;
  IL.toast = function (text) {
    var t = doc.getElementById('toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  };
  var drawer = doc.getElementById('drawer'), scrim = doc.getElementById('drawer-scrim');
  scrim.addEventListener('click', function () { IL.closeDrawer(); });
  IL.drawer = function (title, sub, body, tag) {
    drawer.textContent = '';
    drawer.appendChild(h('div', { class: 'dr-head' }, h('div', { style: 'flex:1' }, tag || null, h('h2', null, title)), h('button', { class: 'dr-close', 'aria-label': 'Close', on: { click: IL.closeDrawer } }, '×')));
    if (sub) drawer.appendChild(h('p', { class: 'sub' }, sub));
    drawer.appendChild(h('div', null, body));
    drawer.hidden = false; scrim.hidden = false; drawer.scrollTop = 0;
  };
  IL.closeDrawer = function () { drawer.hidden = true; scrim.hidden = true; };
  IL.section = function (title) { var args = Array.prototype.slice.call(arguments, 1); return h('div', { class: 'dr-sec' }, h('h4', null, title), args); };
  var modal = doc.getElementById('modal');
  modal.addEventListener('click', function (e) { if (e.target === modal) IL.closeModal(); });
  IL.closeModal = function () { modal.hidden = true; modal.textContent = ''; };

  // ---------- evidence drawers ----------
  var SAMPLE = {
    ArrayIndexOutOfBoundsException: ['public static double average(int[] nums) {', '    int sum = 0;', '    for (int i = 0; i <= nums.length; i++) {      // runs one past the end', '        sum += nums[i];', '    }', '    return (double) sum / nums.length;', '}', 2],
    StringIndexOutOfBoundsException: ['int count = 0;', 'for (int i = 0; i <= word.length(); i++) {       // runs one past the end', '    if ("aeiou".indexOf(word.charAt(i)) >= 0) count++;', '}', 'return count;', 1],
    'missing return statement': ['public static String grade(int score) {', '    if (score >= 90) {', '        return "A";', '    } else if (score >= 80) {', '        return "B";', '    }                                           // nothing returned below 80', '}', 5],
    'cannot find symbol': ['int total = 0;', 'for (int i = 0; i < words.length; i++) {', '    totl += words[i].length();                  // name was never declared', '}', 2],
    IndexError: ['def count_long(words):', '    count = 0', '    for i in range(len(words) + 1):             # one index too many', '        if len(words[i]) > 5:', '            count += 1', '    return count', 2],
    NameError: ['for n in nums:', '    total = total + n                           # total used before it is set', 'print(total)', 1],
    TypeError: ['copy = original', 'copy = copy + 4                                 # adds a number to a list', 'print(copy)', 1]
  };
  function sampleCode(err, lang) {
    var sm = SAMPLE[err] || SAMPLE[lang === 'python' ? 'NameError' : 'cannot find symbol'], hl = sm[sm.length - 1];
    var pre = h('pre', { class: 'code' });
    sm.slice(0, -1).forEach(function (line, i) { pre.appendChild(h('span', { class: i === hl ? 'hl' : '' }, line + '\n')); });
    return pre;
  }

  IL.ev = {};
  IL.ev.students = function (title, sub, sids, note) {
    IL.drawer(title, sub, [IL.section(U.plural(sids.length, 'student'), C.named(sids, '', 40)), note ? h('p', { class: 'guard' }, note) : null]);
  };
  IL.ev.item = function (itemId) {
    var sec = IL.sec(), m = IL.metrics(), it = sec.items[itemId], tb = IL.world.textbooks[it.tb];
    var recs = sec.records.filter(function (r) { return r.item === itemId && m.b.rset[r.sid]; });
    var g = recs.filter(M.graded), body = [];
    var meta = tb.short + ' · ' + it.subCode + ' · ' + it.type + ' · depth ' + it.dok + ' · ' + it.skills.map(function (k) { return IL.world.skills[k].name; }).join(', ');
    if (it.type === 'mchoice') {
      var picks = []; for (var i = 0; i < it.opts.n; i++) picks.push([]);
      g.forEach(function (r) { picks[r.attempts[0].pick].push(r.sid); });
      var top = -1; picks.forEach(function (p, idx) { if (idx !== it.opts.key && (top < 0 || p.length > picks[top].length)) top = idx; });
      body.push(IL.section('First answers · ' + g.length + ' students', C.options({ item: it, picks: picks, top: top }), h('p', { class: 'note' }, 'Select a bar to see who chose it.')));
      var wrong = g.filter(function (r) { return !r.attempts[0].ok; }).slice(0, 8);
      body.push(IL.section('What happened next', wrong.map(function (r) {
        return h('div', { class: 'strip-row' }, IL.who(r.sid), C.tape(r.attempts, { labelled: true }));
      }), h('p', { class: 'note' }, 'Each mark is one attempt with the time since the previous one.')));
    } else if (it.type === 'activecode' && it.code.graded) {
      var o = M._codeStat(it, g);
      body.push(IL.section('Outcome · ' + o.n + ' ran code', C.split([
        { n: o.firstRun.length, cls: 's-done', label: 'Passed on the first run', sids: o.firstRun }, { n: o.afterFixes.length, cls: 's-late', label: 'Passed after fixes', sids: o.afterFixes },
        { n: o.failing.length, cls: 's-bad', label: 'Still failing', sids: o.failing }], { size: 'tall' }),
        C.legend([{ cls: 's-done', label: 'first run ' + o.firstRun.length }, { cls: 's-late', label: 'after fixes ' + o.afterFixes.length }, { cls: 's-bad', label: 'still failing ' + o.failing.length }])));
      if (o.topError) body.push(IL.section('Most common error now', h('p', null, h('span', { class: 'tag warn' }, o.topError.err), ' ', U.plural(o.topError.students.length, 'student') + ': ', IL.whoList(o.topError.students)),
        h('p', { class: 'sub', style: 'margin:10px 0 6px' }, 'A representative latest run (sample text in this mock)'), sampleCode(o.topError.err, it.code.lang)));
      body.push(IL.section('Runs, in order', o.failing.slice(0, 8).map(function (sid) {
        var r = sec.recIndex.get(sid + ':' + itemId);
        return h('div', { class: 'strip-row' }, h('span', null, IL.who(sid), ' · ' + r.attempts.length + ' runs'), C.tape(r.attempts, { code: true }));
      }), C.legend([{ cls: 's-done', label: 'passed' }, { cls: 's-bad', label: 'failed' }])));
    } else {
      var ok = g.filter(function (r) { return r.attempts[0].ok; }).map(function (r) { return r.sid; });
      body.push(IL.section('First try · ' + g.length + ' students', C.split([{ n: ok.length, cls: 's-done', label: 'Right first time', sids: ok },
        { n: g.length - ok.length, cls: 's-bad', label: 'Wrong first time', sids: g.filter(function (r) { return !r.attempts[0].ok; }).map(function (r) { return r.sid; }) }], { size: 'tall' })));
    }
    var a = m.b.itemAgg[itemId];
    body.push(IL.section('Facts', h('div', { class: 'facts' },
      h('div', null, h('span', null, 'Right first time'), h('span', null, a ? a.ok + ' of ' + a.n : '–'), h('span', null, 'this class')),
      h('div', null, h('span', null, 'Solved eventually'), h('span', null, a ? a.ever + ' of ' + a.n : '–'), h('span', null, '')),
      h('div', null, h('span', null, 'Typical first try'), h('span', null, it.norm.n >= 200 ? pct(it.norm.p) : 'not enough data'), h('span', null, it.norm.n + ' learners elsewhere')))));
    IL.drawer(it.name, meta, body);
  };

  IL.ev.cell = function (sid, tbId, colId, path) {
    var sec = IL.sec(), d = M.cell(IL.world, sec, sid, tbId, colId, path);
    if (!d) return;
    var c = d.cell, col = d.col, items = sec.items, skill = col.kind === 'skill';
    var total = c.correct + c.error + c.pending + c.untouched, touched = c.correct + c.error + c.pending, body = [];
    var head = touched === 0 ? (skill ? 'No questions on this skill attempted yet' : 'Nothing opened in this unit yet')
      : skill ? c.ok + ' of ' + c.n + ' right first time on this skill' : c.pc + '% complete';
    body.push(h('p', { class: 'finding', style: 'margin-top:8px' }, head));
    body.push(h('p', { class: 'sub' }, c.correct + ' of ' + total + ' questions right · ' + Math.round(c.min) + ' recorded minutes' + (c.n ? ' · ' + c.ok + ' of ' + c.n + ' right first time' : '')));
    if (d.verdict) body.push(h('div', { class: 'verdict ' + d.verdict.tone }, h('b', null, d.verdict.title), d.verdict.body));
    var bandLine = c.band.state === 'scored' ? M.BANDS[c.band.level] + ' · ' + c.band.coverage + '% of the unit scored' + (c.band.capped ? ' (band capped by coverage)' : '')
      : c.band.state === 'unavailable' ? (d.grid.level === 'chapter' ? 'Unavailable: no validated model for this skill set yet' : 'Scored per unit only') : 'Not attempted';
    body.push(IL.section(total + ' questions · ' + touched + ' touched',
      C.split([{ n: c.correct, cls: 's-done', label: 'Correct' }, { n: c.error, cls: 's-bad', label: 'Incorrect' }, { n: c.pending, cls: 's-grade', label: 'Awaiting grading' }, { n: c.untouched, cls: 's-none', label: 'Not started' }], { size: 'tall' }),
      C.legend([{ cls: 's-done', label: 'correct ' + c.correct }, { cls: 's-bad', label: 'incorrect ' + c.error }, { cls: 's-grade', label: 'awaiting grading ' + c.pending }, { cls: 's-none', label: 'not started ' + c.untouched }]),
      h('div', { class: 'facts', style: 'margin-top:10px' },
        h('div', null, h('span', null, 'Band'), h('span', null, bandLine), h('span', null, '')),
        h('div', null, h('span', null, 'First try'), h('span', null, c.n ? pct(c.fts) : '–'), h('span', null, 'class ' + pct(d.classFts))),
        h('div', null, h('span', null, 'Recorded activity'), h('span', null, M.ENG[c.eng]), h('span', null, Math.round(c.min) + ' min')),
        h('div', null, h('span', null, 'Quick retries'), h('span', null, d.retries ? d.rapid + ' of ' + d.retries : '–'), h('span', null, 'under 3 seconds')))));
    if (skill) {
      body.push(IL.section('Every question on this skill · ' + d.questions.length, d.questions.map(function (q) {
        var row = h('div', { class: 'strip-row', style: 'grid-template-columns: 1fr auto' },
          h('a', { on: { click: function () { IL.ev.item(q.item.id); } } }, q.item.name),
          q.rec ? C.tape(q.rec.attempts, { code: q.item.type === 'activecode' }) : h('span', { class: 'sub' }, 'not started'));
        if (!q.rec) row.style.opacity = 0.6;
        return row;
      })));
      var others = (col.skill.taught || []).concat(col.skill.assessed || []).filter(function (id) { return id !== col.subs[0].id; });
      if (others.length) body.push(h('p', { class: 'note' }, h('b', null, 'This skill also appears in: '),
        U.uniq(others).map(function (id) { var sb = IL.world.textbooks[tbId].subs[id]; return sb ? sb.code + ' ' + sb.name : null; }).filter(Boolean).join(' · ') || 'no other subunit of this textbook'));
    } else if (d.wrong.length) {
      var groups = U.groupBy(d.wrong, function (r) { return items[r.item].subCode; }), nodes = [];
      groups.forEach(function (rs, code) {
        nodes.push(h('p', { class: 'sub', style: 'margin-top:8px' }, code));
        rs.slice(0, 6).forEach(function (r) {
          nodes.push(h('div', { class: 'strip-row', style: 'grid-template-columns: 1fr auto' }, h('a', { on: { click: function () { IL.ev.item(r.item); } } }, items[r.item].name), C.tape(r.attempts, { code: items[r.item].type === 'activecode' })));
        });
      });
      body.push(IL.section('Wrong answers · ' + d.wrong.length, nodes));
    }
    if (d.bySub.length > 1) {
      body.push(IL.section('Where it sits · ' + d.bySub.length + ' subunits', d.bySub.map(function (x) {
        var started = x.correct + x.error + x.pending > 0;
        var note = x.error ? x.error + ' wrong' : x.pending ? x.pending + ' ungraded' : x.correct === x.total ? 'all correct' : x.correct ? x.correct + ' of ' + x.total : 'not started';
        var row = C.splitRow(x.sub.code + ' ' + x.sub.name, [{ n: x.correct, cls: 's-done', label: 'Correct' }, { n: x.error, cls: 's-bad', label: 'Incorrect' }, { n: x.pending, cls: 's-grade', label: 'Awaiting grading' }, { n: Math.max(0, x.untouched), cls: 's-none', label: 'Not started' }], note, { size: 'thin' });
        if (!started) row.style.opacity = 0.55;
        return row;
      })));
    }
    var acts = [h('button', { class: 'btn', on: { click: function () { IL.openStudent(sid); } } }, 'Open student page')];
    if (col.drill && col.open) acts.push(h('button', { class: 'btn', on: { click: function () {
      IL.state.view.path = (d.grid.path || []).concat([col.id]); IL.state.view.students = 'unit'; IL.closeDrawer(); IL.go({ tab: 'students', student: null });
    } } }, col.kind === 'chapter' ? 'Open its subunits' : 'Open its skills'));
    if (skill) acts.push(h('button', { class: 'btn primary', on: { click: function () {
      IL.closeDrawer(); IL.builder({ recipe: 'Remediation', minutes: 10, sids: [sid], skills: [col.id], reason: 'this skill' });
    } } }, 'Practice set on this skill'));
    acts.push(h('button', { class: 'btn', on: { click: function () { IL.toast('Would open ' + IL.nm(sid) + '’s textbook at ' + col.label + '.'); } } }, 'Open in their textbook'));
    body.push(h('div', { class: 'actions' }, acts));
    var where = skill ? IL.world.textbooks[tbId].short + ' · ' + col.subs[0].code + ' · skill'
      : IL.world.textbooks[tbId].short + ' · ' + col.label + ' ' + col.name;
    IL.drawer(IL.nm(sid) + (skill ? ' · ' + col.name : ''), where, body);
  };

  // ---------- practice-set builder ----------
  var RECIPES = ['Remediation', 'Practice', 'Warm-up', 'Exit Ticket', 'Spiral Review', 'Challenge', 'Pretest', 'Unit Quiz'];
  var WHY = {
    Remediation: 'one step easier than where the group is failing',
    Challenge: 'one step harder than the current unit',
    'Warm-up': 'short, at the level the class already handles',
    'Exit Ticket': 'a close variant of the question most of them missed',
    'Spiral Review': 'drawn from earlier topics that have slipped',
    Practice: 'slightly challenging but reachable',
    Pretest: 'checks what the next unit depends on',
    'Unit Quiz': 'the same questions for everyone'
  };
  IL.builder = function (o) {
    var sec = IL.sec(), world = IL.world, st = { recipe: o.recipe || 'Remediation', minutes: o.minutes || 15, sids: o.sids.slice(), kept: {} };
    var skillNames = o.skills.map(function (k) { return world.skills[k].name; });
    function suggest() {
      var set = {};
      o.skills.forEach(function (k) { set[k] = true; world.skills[k].dependents.forEach(function (d) { set[d] = true; }); });
      var real = sec.itemList.filter(function (it) {
        return !it.action && it.skills.some(function (k) { return set[k]; }) && !st.sids.some(function (sid) { return sec.recIndex.has(sid + ':' + it.id); });
      }).slice(0, 3).map(function (it) { return { label: it.name, type: it.type, est: it.est, src: world.textbooks[it.tb].short + ' ' + it.subCode }; });
      var types = ['mchoice', 'parsonsprob', 'fillintheblank', 'mchoice', 'activecode', 'mchoice', 'parsonsprob'], est = { mchoice: 90, parsonsprob: 180, fillintheblank: 75, activecode: 330 }, out = real, used = U.sum(real.map(function (x) { return x.est; })), i = 0;
      while (used + est[types[i % types.length]] <= st.minutes * 60 && i < 14) {
        var t = types[i % types.length];
        out.push({ label: 'New · ' + skillNames[i % skillNames.length] + ' · ' + IL.content.variants[t][i % IL.content.variants[t].length], type: t, est: est[t], src: 'generated' });
        used += est[t]; i++;
      }
      return out;
    }
    function draw() {
      var items = suggest();
      var kept = items.filter(function (x, i) { return st.kept[i] !== false; }), used = U.sum(kept.map(function (x) { return x.est; }));
      modal.textContent = '';
      var due = T.fmtDayLong(T.day(world.now) + 7);
      modal.appendChild(h('div', { class: 'modal-box', role: 'dialog', 'aria-label': 'Practice set' },
        h('div', { class: 'modal-head' }, h('h2', null, 'Practice set'), h('span', { class: 'sub' }, o.reason || ''), h('button', { class: 'dr-close', 'aria-label': 'Close', on: { click: IL.closeModal } }, '×')),
        h('div', { class: 'modal-body' },
          h('div', null,
            h('div', { class: 'field' }, h('label', null, 'For · ' + U.plural(st.sids.length, 'student')), C.named(st.sids, '', 14)),
            h('div', { class: 'field' }, h('label', null, 'Recipe'), h('span', { class: 'chips' }, RECIPES.map(function (r) {
              return h('button', { class: 'chip' + (st.recipe === r ? ' on' : ''), on: { click: function () { st.recipe = r; draw(); } } }, r);
            }))),
            h('div', { class: 'field' }, h('label', null, 'Time budget'), h('span', { class: 'chips' }, [8, 15, 20, 30].map(function (mm) {
              return h('button', { class: 'chip' + (st.minutes === mm ? ' on' : ''), on: { click: function () { st.minutes = mm; st.kept = {}; draw(); } } }, mm + ' min');
            }))),
            h('div', { class: 'field' }, h('label', null, 'Questions · ' + kept.length + ' of ' + items.length + ' kept'),
              items.map(function (x, i) {
                var out = st.kept[i] === false;
                return h('div', { class: 'pitem' + (out ? ' out' : '') }, h('span', { class: 'sub' }, String(i + 1)), h('span', null, x.label, ' ', h('span', { class: 'sub' }, '· ' + x.src)),
                  h('span', { class: 'sub' }, '~' + Math.max(1, Math.round(x.est / 60)) + ' min'),
                  h('button', { class: 'x', on: { click: function () { st.kept[i] = out ? true : false; draw(); } } }, out ? 'add back' : 'remove'));
              }),
              h('div', { class: 'bar-wrap', style: 'margin-top:8px' }, C.meter(used / (st.minutes * 60)), h('span', { class: 'sub' }, Math.round(used / 60) + ' of ' + st.minutes + ' minutes')))),
          h('div', null,
            h('div', { class: 'why' }, h('b', null, 'Why these'), h('p', { style: 'margin-top:6px' }, 'Targets ' + skillNames.join(' and ') + ': ' + WHY[st.recipe] + '.'),
              h('p', { style: 'margin-top:6px' }, 'A mix of reading and writing questions. None has been seen by these ' + st.sids.length + ' students.')),
            h('div', { class: 'field', style: 'margin-top:14px' }, h('label', null, 'Recheck'), h('p', { class: 'sub' }, 'On ' + due + ' the Lens compares first-try success on these new questions with their earlier work on the same skill.')))),
        h('div', { class: 'modal-foot' },
          h('button', { class: 'btn', on: { click: function () { IL.toast('Saved as a draft.'); IL.closeModal(); } } }, 'Save as draft'),
          h('button', { class: 'btn', on: { click: function () { IL.toast('Would open the student view of this set.'); } } }, 'Preview as student'),
          h('button', { class: 'btn', on: { click: function () { IL.toast('Would open the full Create Coursework flow with these choices.'); } } }, 'More options…'),
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn primary', on: { click: function () {
            var today = T.day(world.now);
            IL.state.actions.push({ id: 'user-' + (IL.state.actions.length + 1), sec: sec.id, type: st.recipe, title: st.recipe + ' · ' + skillNames[0], day: today, t: world.now, skills: o.skills, students: st.sids, asg: null,
              recheckDay: today + 7, reviewed: false, user: true });
            sec._m = {};
            if (o.cardId) IL.state.cards[IL.sec().id + ':' + o.cardId] = 'done';
            IL.closeModal(); IL.closeDrawer(); IL.render();
            IL.toast(st.recipe + ' assigned to ' + U.plural(st.sids.length, 'student') + '. Recheck set for ' + due + '.');
          } } }, 'Assign to ' + st.sids.length))));
      modal.hidden = false;
    }
    draw();
  };

  // ---------- priority queue ----------
  var CATS = { waiting: 'Waiting', reteach: 'Reteach', gap: 'Gap', code: 'Code', progress: 'Progress', followup: 'Follow-up', checkin: 'Check-in', good: 'Good news' };
  IL.CATS = CATS;
  IL.queue = function (ctx) {
    var m = ctx.m, sec = ctx.sec, world = ctx.world, N = m.roster.length, out = [], today = T.day(world.now);
    var rosterIds = m.roster.map(function (s) { return s.id; });
    function card(c) { c.score = (c.reach != null ? c.reach : 0.2) * (c.sev != null ? c.sev : 0.5); c.key = sec.id + ':' + c.id; out.push(c); }

    // tier 1: things that stop being useful soon
    var w = m.waiting;
    if (w.toGrade && (w.oldestDays >= 3 || w.questions.length)) card({ id: 'waiting', tier: 1, cat: 'waiting', tab: 'progress',
      text: w.toGrade + ' submissions are waiting for a grade' + (w.questions.length ? ', and ' + U.plural(w.questions.length, 'student is', 'students are') + ' waiting for a reply' : ''),
      sub: 'The oldest has waited ' + w.oldestDays + ' days', reach: 1, sev: 1,
      why: 'Shown when anything has waited more than three days, or a student has asked a question.',
      glyph: function () { return w.byAsg.slice(0, 2).map(function (x) { return h('div', { class: 'mini', tip: x.a.name }, h('b', null, String(x.n)), ' · ' + x.a.short); }); },
      picture: function () { return [C.bars(w.byAsg.map(function (x) { return { label: x.a.short, v: x.n, text: x.n + ' to grade · oldest ' + T.ago(x.oldest, world.now), cls: 'amber' }; }), { span: 26 }),
        w.questions.map(function (q) { return h('p', { class: 'note' }, IL.who(q.sid), ' asked on ' + sec.items[q.item].subCode + ': “' + q.text + '”'); })]; },
      facts: [['To grade', w.toGrade, ''], ['Oldest', w.oldestDays + ' days', 'rule: over 3 days'], ['Questions waiting', w.questions.length, ''], ['Auto-grading failed', w.failed.length, '']],
      primary: { label: 'Open grading', fn: function () { IL.toast('Would open the coursework dashboard at the first ungraded submission.'); } } });
    m.funnel.rows.forEach(function (x) {
      var left = (x.a.dueT - world.now) / 1440;
      if (left > 0 && left <= 3 && x.notStarted.length / x.eligible.length >= 0.4) card({ id: 'due-' + x.a.id, tier: 1, cat: 'progress', tab: 'progress',
        text: x.notStarted.length + ' of ' + x.eligible.length + ' have not started “' + x.a.short + '”', sub: 'Due ' + T.fmtDayLong(x.a.dueDay), reach: x.notStarted.length / x.eligible.length, sev: 0.9,
        why: 'Shown when an assignment is due within three days and at least 40% of eligible students have not started.', sids: x.notStarted,
        glyph: function () { return C.split([{ n: x.started.length, cls: 's-done', label: 'Started' }, { n: x.notStarted.length, cls: 's-none', label: 'Not started' }]); },
        picture: function () { return [C.split([{ n: x.completed.length, cls: 's-done', label: 'Completed', sids: x.completed }, { n: x.inProgress.length, cls: 's-prog', label: 'In progress', sids: x.inProgress }, { n: x.notStarted.length, cls: 's-none', label: 'Not started', sids: x.notStarted }], { size: 'tall' }),
          h('p', { class: 'note' }, 'Not started: ', IL.whoList(x.notStarted, 20))]; },
        facts: [['Eligible', x.eligible.length, ''], ['Started', x.started.length, ''], ['Not started', x.notStarted.length, 'rule: 40% or more'], ['Due', T.fmtDayLong(x.a.dueDay), 'rule: within 3 days']],
        primary: { label: 'Remind ' + x.notStarted.length + ' students', fn: function () { IL.toast('Would send a reminder to ' + x.notStarted.length + ' students.'); } }, secondary: [{ label: 'Extend the due date', fn: function () { IL.toast('Would open the due date for this assignment.'); } }] });
    });
    m.followups.filter(function (f) { return f.status === 'recheck due'; }).forEach(function (f) {
      var ci = f.action.kind === 'check-in';
      card({ id: 'fu-' + f.action.id, tier: 1, cat: 'followup', tab: 'followups', text: ci ? IL.nm(f.action.students[0]) + ' is still quiet a week after your check-in' : 'Recheck ready: ' + f.action.title,
        sub: ci ? 'Last active ' + (f.rows[0].lastDay != null ? T.fmtDay(f.rows[0].lastDay) : 'never') : f.improved + ' of ' + f.rows.length + ' improved on new questions', reach: 0.6, sev: 0.7,
        why: 'Shown when the recheck date you set for an action has arrived.', sids: f.action.students,
        glyph: function () { return ci ? C.dots(f.rows.map(function (r) { return { sid: r.sid, cls: r.state === 'active' ? '' : 'off' }; })) : C.dots(f.rows.map(function (r) { return { sid: r.sid, cls: r.state === 'improved' ? 'good' : r.state === 'none' ? 'off' : 'muted', tip: r.state }; })); },
        picture: function () { return IL.followupPicture(f); },
        facts: ci ? [['Checked in', T.fmtDay(f.action.day), ''], ['Active since', f.rows[0].state === 'active' ? 'yes' : 'no', '']] : [['Before', pct(f.before), 'same skill'], ['After', pct(f.after), 'new questions'], ['Improved', f.improved + ' of ' + f.rows.length, '+15 points'], ['No new work', f.noWork, '']],
        primary: { label: 'Review in Follow-ups', fn: function () { IL.go({ tab: 'followups' }); } } });
    });

    // tier 2: class decisions
    m.reteach.slice(0, 3).forEach(function (r) {
      var L = String.fromCharCode(65 + r.top);
      card({ id: 'rt-' + r.item.id, tier: 2, cat: 'reteach', tab: 'understanding', text: r.picks[r.top].length + ' of ' + r.n + ' chose ' + L + ' first on “' + r.item.name + '”',
        sub: r.correct + ' chose the right answer', reach: r.wrong / N, sev: r.tier === 1 ? 1 : 0.7, sids: r.picks[r.top],
        why: r.tier === 1 ? 'Shown because a wrong answer was chosen at least as often as the right one.' : 'Shown because half or more of the wrong first answers were the same option.',
        glyph: function () { return h('div', null, r.picks.map(function (p, i) { return h('div', { class: 'bar-wrap', style: 'gap:4px;height:9px' }, h('span', { class: 'sub', style: 'width:10px;font-size:9px' }, String.fromCharCode(65 + i)), h('span', { class: 'bar ' + (i === r.item.opts.key ? '' : i === r.top ? 'amber' : 'grey'), style: 'height:6px;width:' + Math.max(2, (p.length / r.n) * 100) + '%' })); })); },
        picture: function () { return C.options({ item: r.item, picks: r.picks, top: r.top }); },
        facts: [['Answered', r.n + ' of ' + N, ''], ['Right first time', r.correct, ''], ['Top wrong answer', L + ', ' + r.picks[r.top].length, r.tier === 1 ? 'rule: wrong ≥ correct' : 'rule: ≥ half of wrong'], ['Typical elsewhere', r.item.norm.n >= 200 ? pct(r.item.norm.p) : '–', 'first try']],
        primary: { label: 'Exit Ticket on this', fn: function () { IL.builder({ recipe: 'Exit Ticket', minutes: 8, sids: rosterIds, skills: r.item.skills, reason: r.item.name, cardId: 'rt-' + r.item.id }); } },
        secondary: [{ label: 'Open the question', fn: function () { IL.ev.item(r.item.id); } }, { label: 'Generate a similar question', fn: function () { IL.toast('Would generate a close variant with the quiz generator.'); } }] });
    });
    var acted = {};
    m.followups.forEach(function (f) { (f.action.skills || []).forEach(function (k) { acted[k] = true; }); });
    m.gaps.roots.filter(function (g) { return !acted[g.skill.id] && g.blocked.length >= 2; }).slice(0, 1).forEach(function (g) {
      var sids = g.below.map(function (x) { return x.sid; });
      card({ id: 'gap-' + g.skill.id, tier: 2, cat: 'gap', tab: 'understanding', text: '“' + g.skill.name + '” is at ' + pct(g.stat.p) + ' first try and ' + g.blocked.length + ' later skills depend on it',
        sub: g.stat.nItems + ' questions · ' + g.stat.nStudents + ' students', reach: Math.max(0.5, sids.length / N), sev: Math.min(1, 0.5 + g.blocked.length / 12), sids: sids,
        why: 'Shown because this is the weak skill with the most not-yet-attempted skills waiting on it.',
        glyph: function () { return h('div', { class: 'bar-wrap' }, h('span', { class: 'sub' }, 'blocks'), h('span', { class: 'bar', style: 'background:#7B3FB5;width:' + Math.min(70, g.blocked.length * 6) + '%' }), h('span', { class: 'bar-val' }, String(g.blocked.length))); },
        picture: function () { return IL.gapPicture(m, g); },
        facts: [['Class first try', pct(g.stat.p), 'rule: under 35%'], ['Questions behind it', g.stat.nItems, 'at least 2'], ['Students with evidence', g.stat.nStudents + ' of ' + N, 'at least ' + m.minN], ['Skills waiting on it', g.blocked.length + ' of ' + g.dependents.length, 'not yet attempted'], ['Students under 35%', sids.length, '3 or more questions each']],
        primary: { label: 'Remediation for ' + sids.length, fn: function () { IL.builder({ recipe: 'Remediation', minutes: 15, sids: sids, skills: [g.skill.id], reason: g.skill.name, cardId: 'gap-' + g.skill.id }); } },
        secondary: [{ label: 'Warm-up for the class', fn: function () { IL.builder({ recipe: 'Warm-up', minutes: 8, sids: rosterIds, skills: [g.skill.id], reason: g.skill.name, cardId: 'gap-' + g.skill.id }); } }] });
    });
    m.code.slice(0, 2).forEach(function (c) {
      card({ id: 'code-' + c.item.id, tier: 2, cat: 'code', tab: 'understanding', text: c.failing.length + ' of ' + c.n + ' are still failing “' + c.item.name + '”',
        sub: c.topError ? U.plural(c.topError.students.length, 'student') + ' on the same error: ' + c.topError.err : c.hardTest.failing.length + ' fail test ' + c.hardTest.test, reach: c.failing.length / N, sev: 0.85, sids: c.failing,
        why: 'Shown when a quarter or more of the students who ran code on a question have not passed.',
        glyph: function () { return C.split([{ n: c.firstRun.length, cls: 's-done', label: 'First run' }, { n: c.afterFixes.length, cls: 's-late', label: 'After fixes' }, { n: c.failing.length, cls: 's-bad', label: 'Still failing' }]); },
        picture: function () { return IL.codePicture(c); },
        facts: [['Ran code', c.n, ''], ['Passed first run', c.firstRun.length, ''], ['Passed after fixes', c.afterFixes.length, ''], ['Still failing', c.failing.length, 'rule: 25% or more']],
        primary: { label: 'Open the runs', fn: function () { IL.ev.item(c.item.id); } },
        secondary: [{ label: 'Assign a Parsons version', fn: function () { IL.builder({ recipe: 'Practice', minutes: 15, sids: c.failing, skills: c.item.skills, reason: c.item.name, cardId: 'code-' + c.item.id }); } }] });
    });
    if (m.funnel.decay) {
      var d = m.funnel.decay, lastRow = m.funnel.rows.filter(function (x) { return x.decay; })[0];
      card({ id: 'decay', tier: 2, cat: 'progress', tab: 'progress', text: 'Completion fell from ' + d.from + ' to ' + d.to + ' students across chapter ' + d.chapter, sub: lastRow.inProgress.length + ' started the latest assignment and did not finish',
        reach: (d.from - d.to) / N, sev: 0.7, sids: lastRow.inProgress.concat(lastRow.notStarted), why: 'Shown when the completed share drops 20 points or more between the first and latest assignment of a chapter.',
        glyph: function () { return h('div', null, m.funnel.rows.filter(function (x) { return x.a.kind === 'lesson' && x.a.chapterNum === d.chapter; }).slice(-4).map(function (x) { return h('div', { style: 'margin:2px 0' }, C.split(IL.funnelSegs(x), { size: 'thin' })); })); },
        picture: function () { return m.funnel.rows.filter(function (x) { return x.a.kind === 'lesson' && x.a.chapterNum === d.chapter; }).map(function (x) { return C.splitRow(x.a.short, IL.funnelSegs(x), x.completed.length + ' done'); }); },
        facts: [['First assignment', d.from + ' completed', ''], ['Latest assignment', d.to + ' completed', 'rule: 20-point drop'], ['Assignments in chapter', d.n, '']],
        primary: { label: 'See the assignments', fn: function () { IL.go({ tab: 'progress' }); } } });
    }
    if (m.dip.flagged) {
      var p = m.dip.flagged.point;
      card({ id: 'dip', tier: 2, cat: 'gap', tab: 'understanding', text: 'The class fell ' + Math.round((p.trail - p.gap) * 100) + ' points below its usual level in the week of ' + T.fmtDay(p.week * 7),
        sub: 'Compared with typical results on the same questions', reach: 1, sev: 0.75, why: 'Shown when the weekly gap to typical falls 8 points or more below the previous month.',
        glyph: function () { return C.zero({ values: m.dip.series.slice(-8).map(function (x) { return x.gap; }), cw: 12, h: 34, amp: 0.3, mark: Math.min(7, m.dip.series.length - 1) - (m.dip.series[m.dip.series.length - 1] === p ? 0 : 1) }); },
        picture: function () { return IL.dipPicture(m); },
        facts: [['This week', Math.round(p.gap * 100) + ' points', 'against typical'], ['Previous month', Math.round(p.trail * 100) + ' points', ''], ['First attempts', p.n, 'rule: 150 or more']],
        primary: { label: 'Spiral Review for the class', fn: function () { IL.builder({ recipe: 'Spiral Review', minutes: 20, sids: rosterIds, skills: U.uniq([].concat.apply([], m.dip.flagged.fell.map(function (f) { return f.sub.skills.slice(0, 2); }))), reason: 'topics that fell', cardId: 'dip' }); } } });
    }

    // tier 3: individual check-ins
    if (m.quiet.length) {
      var qs = m.quiet.map(function (x) { return x.sid; });
      card({ id: 'quiet', tier: 3, cat: 'checkin', tab: 'engagement', text: U.plural(qs.length, 'student has', 'students have') + ' been quiet for two or more class weeks', sub: 'No recorded ALPS activity while most of the class was active',
        reach: qs.length / N, sev: 0.9, sids: qs, why: 'Shown when a student has no recorded activity in two consecutive weeks in which at least 60% of the class was active.',
        glyph: function () { return C.dots(qs.map(function (sid) { return { sid: sid, cls: 'off' }; }), { big: true }); },
        picture: function () { return IL.quietPicture(m); },
        facts: [['Students', qs.length, ''], ['Rule', '2 class weeks', 'quiet weeks do not count']],
        primary: { label: 'Log a check-in', fn: function () { IL.logCheckin(qs, 'quiet'); } } });
    }
    var tr = m.traj.drop.concat(m.traj.sustained).slice(0, 6);
    if (tr.length) card({ id: 'traj', tier: 3, cat: 'checkin', tab: 'understanding', text: U.plural(m.traj.drop.length, 'student') + ' dropped sharply against classmates; ' + m.traj.sustained.length + ' have stayed well below',
      sub: 'On the same questions, over the last two fortnights', reach: tr.length / N, sev: 0.7, sids: tr.map(function (x) { return x.sid; }),
      why: 'Shown for a fall of 20 points or more between fortnights, or two fortnights 15 points below classmates.',
      glyph: function () { return C.dots(tr.map(function (x) { return { sid: x.sid, cls: 'warn', tip: x.kind }; }), { big: true }); },
      picture: function () { return IL.trajPicture(m, tr); },
      facts: [['Dropped 20+ points', m.traj.drop.length, ''], ['Below for 2 periods', m.traj.sustained.length, '15 points or more'], ['Minimum work', '15 first attempts', 'per fortnight']],
      primary: { label: 'Open the first student', fn: function () { IL.openStudent(tr[0].sid); } } });
    var cur = m.pace[m.pace.length - 1];
    if (cur && cur.far.length >= 2) card({ id: 'pace', tier: 3, cat: 'progress', tab: 'progress', text: cur.far.length + ' students are far behind the class on chapter ' + cur.unit.num, sub: '25 points or more below the class median of ' + Math.round(cur.median) + '%',
      reach: cur.far.length / N, sev: 0.5, sids: cur.far.map(function (x) { return x.sid; }), why: 'Shown when two or more students are 25 points below the class median on the current chapter.',
      glyph: function () { return C.dots(cur.far.map(function (x) { return { sid: x.sid, cls: 'warn' }; }), { big: true }); },
      picture: function () { return IL.pacePicture(cur); },
      facts: [['Class median', Math.round(cur.median) + '%', ''], ['Far behind', cur.far.length, '25 points'], ['Behind', cur.behind.length, '15 points']],
      primary: { label: 'Assign a catch-up', fn: function () { IL.toast('Would open Create Coursework with the Textbook Unit recipe for ' + cur.far.length + ' students.'); } } });
    var sr = m.streaks.rows.filter(function (r) { return r.ongoing && !r.never && !m.quiet.some(function (q) { return q.sid === r.sid; }); });
    if (sr.length) card({ id: 'streak', tier: 3, cat: 'checkin', tab: 'progress', text: U.plural(sr.length, 'student has', 'students have') + ' not started the last ' + Math.min.apply(null, sr.map(function (r) { return r.run; })) + ' or more assignments',
      sub: 'They have been active, but not on assigned work', reach: sr.length / N, sev: 0.6, sids: sr.map(function (r) { return r.sid; }), why: 'Shown for a run of two or more unstarted assignments that the student was eligible for.',
      glyph: function () { return C.dots(sr.map(function (r) { return { sid: r.sid, cls: 'off' }; }), { big: true }); },
      picture: function () { return IL.streakPicture(m, sr); }, facts: [['Students', sr.length, ''], ['Rule', '2 in a row', 'live assignments only']],
      primary: { label: 'Log a check-in', fn: function () { IL.logCheckin(sr.map(function (r) { return r.sid; }), 'streak'); } } });
    var stuckIds = U.uniq(m.stuck.map(function (x) { return x.sid; }));
    if (stuckIds.length) card({ id: 'stuck', tier: 3, cat: 'code', tab: 'habits', text: U.plural(stuckIds.length, 'student is', 'students are') + ' stuck in code: many runs without passing', sub: m.stuck.length + ' questions in the last two class weeks',
      reach: stuckIds.length / N, sev: 0.6, sids: stuckIds, why: 'Shown for 10 or more runs with no pass, the same failure six times running, or a pass that was then lost.',
      glyph: function () { return C.tape(m.stuck[0].rec.attempts.slice(0, 14), { code: true }); },
      picture: function () { return IL.stuckPicture(m, 5); }, facts: [['Students', stuckIds.length, ''], ['Questions', m.stuck.length, ''], ['Longest', m.stuck[0].runs + ' runs', 'rule: 10 or more']],
      primary: { label: 'Open the work', fn: function () { IL.ev.item(m.stuck[0].item.id); } } });

    // tier 4: good news
    if (m.movement.improving.length || m.traj.rise.length) {
      var up = U.uniq(m.movement.improving.map(function (x) { return x.sid; }).concat(m.traj.rise.map(function (x) { return x.sid; })));
      card({ id: 'good-up', tier: 4, cat: 'good', tab: 'students', text: U.plural(up.length, 'student has', 'students have') + ' improved against classmates', sub: '15 points or more on the same questions, in the last two class weeks',
        reach: up.length / N, sev: 0.8, sids: up, why: 'Shown when a student’s results relative to classmates rise 15 points or more between windows.',
        glyph: function () { return C.dots(up.map(function (sid) { return { sid: sid, cls: 'good' }; }), { big: true }); },
        picture: function () { return IL.movePicture(m, m.movement.improving); }, facts: [['Students', up.length, ''], ['Rule', '+15 points', '15 first attempts in each window']],
        primary: { label: 'Send congratulations', fn: function () { IL.state.cards[sec.id + ':good-up'] = 'done'; IL.closeDrawer(); IL.render(); IL.toast('Congratulations sent to ' + U.plural(up.length, 'student') + '.'); } } });
    }
    if (m.ready.length) {
      var rd = m.ready.map(function (x) { return x.sid; });
      card({ id: 'good-ready', tier: 4, cat: 'good', tab: 'students', text: U.plural(rd.length, 'student looks', 'students look') + ' ready for more', sub: 'High first-try success on chapter ' + m.currentUnit.num + ' and all assigned work finished',
        reach: rd.length / N, sev: 0.6, sids: rd, why: 'Shown for 70% or more right first time on the current chapter, including reasoning questions, with assigned work complete.',
        glyph: function () { return C.dots(rd.map(function (sid) { return { sid: sid, cls: 'good' }; }), { big: true }); },
        picture: function () { return m.ready.map(function (x) { return h('p', { style: 'margin:4px 0' }, h('i', { class: 'dot good' }), ' ', IL.who(x.sid), '  ' + x.ok + ' of ' + x.n + ' right first time, including ' + x.hardOk + ' of ' + x.hard + ' reasoning questions'); }); },
        facts: [['Students', rd.length, ''], ['Rule', '70% first try', '15 or more questions']],
        primary: { label: 'Assign a Challenge', fn: function () { IL.builder({ recipe: 'Challenge', minutes: 20, sids: rd, skills: (m.next ? m.next.sub.skills.slice(0, 2) : []), reason: 'stretch', cardId: 'good-ready' }); } } });
    }

    out.forEach(function (c) { c.state = IL.state.cards[c.key] || null; });
    var live = out.filter(function (c) { return !c.state || c.state === 'watch'; }).sort(function (a, b) { return (a.tier - b.tier) || (b.score - a.score); });
    var picked = [], perTab = {}, good = live.filter(function (c) { return c.tier === 4; })[0];
    live.forEach(function (c) {
      if (picked.length >= (good && picked.indexOf(good) < 0 ? 4 : 5) || c.tier === 4) return;
      if ((perTab[c.tab] || 0) >= 2) return;
      perTab[c.tab] = (perTab[c.tab] || 0) + 1; picked.push(c);
    });
    if (good) picked.push(good);
    return { all: live, top: picked, handled: out.filter(function (c) { return c.state && c.state !== 'watch'; }) };
  };

  IL.logCheckin = function (sids, kind) {
    var world = IL.world, sec = IL.sec(), today = T.day(world.now);
    IL.state.actions.push({ id: 'user-' + (IL.state.actions.length + 1), sec: sec.id, type: 'Check-in', kind: 'check-in', title: 'Check-in with ' + U.plural(sids.length, 'student'), day: today, t: world.now, skills: [], students: sids, asg: null, recheckDay: today + 7, reviewed: false, user: true });
    IL.state.cards[sec.id + ':' + kind] = 'done'; sec._m = {};
    IL.closeDrawer(); IL.render();
    IL.toast('Check-in logged for ' + U.plural(sids.length, 'student') + '. The Lens will look again on ' + T.fmtDayLong(today + 7) + '.');
  };

  // the full card, as a drawer
  IL.openCard = function (c) {
    var body = [h('p', { class: 'sub', style: 'margin-bottom:10px' }, c.why), h('div', null, c.picture())];
    body.push(IL.section('Facts used', h('div', { class: 'facts' }, c.facts.map(function (f) { return h('div', null, h('span', null, f[0]), h('span', null, String(f[1])), h('span', null, f[2] || '')); }))));
    if (c.sids && c.sids.length) body.push(IL.section(U.plural(c.sids.length, 'student'), C.named(c.sids, '', 24)));
    var acts = [h('button', { class: 'btn primary', on: { click: c.primary.fn } }, c.primary.label)];
    (c.secondary || []).forEach(function (s) { acts.push(h('button', { class: 'btn', on: { click: s.fn } }, s.label)); });
    body.push(h('div', { class: 'actions' }, acts));
    function setState(v, msg) { return function () { IL.state.cards[c.key] = v; IL.closeDrawer(); IL.render(); IL.toast(msg); }; }
    var useful = IL.state.useful[c.key];
    body.push(h('div', { class: 'controls' },
      h('button', { class: 'btn small', on: { click: setState('done', 'Marked done.') } }, 'Done'),
      h('button', { class: 'btn small', on: { click: setState('watch', 'Watching: this will come back if it persists.') } }, 'Watch'),
      h('button', { class: 'btn small', on: { click: setState('dismissed', 'Dismissed for today.') } }, 'Dismiss for today'),
      h('button', { class: 'btn small', on: { click: setState('irrelevant', 'Marked not relevant. This kind of card will rank lower.') } }, 'Not relevant'),
      h('span', { class: 'spacer' }), 'Useful?',
      h('button', { class: 'btn small' + (useful === true ? ' primary' : ''), on: { click: function () { IL.state.useful[c.key] = true; IL.toast('Thanks. Noted as useful.'); IL.openCard(c); } } }, '✓'),
      h('button', { class: 'btn small' + (useful === false ? ' primary' : ''), on: { click: function () { IL.state.useful[c.key] = false; IL.toast('Thanks. Noted as not useful.'); IL.openCard(c); } } }, '✗')));
    IL.drawer(c.text, c.sub, body, h('span', { class: 'tag ' + (c.tier === 1 ? 'now' : c.tier === 4 ? 'good' : c.tier === 3 ? 'info' : 'warn'), style: 'margin-bottom:6px' }, CATS[c.cat]));
  };

  root.addEventListener('hashchange', function () { readHash(); IL.render(); });
  IL.boot = function () { readHash(); IL.render(); };
})(typeof window !== 'undefined' ? window : globalThis);

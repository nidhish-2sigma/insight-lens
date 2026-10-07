/* Insight Lens mock · shell: state, frame, scope controls, tab layout, evidence drawers, the practice-set builder,
   and how a theme or an action from the shared insight records (04b-insights) is shown and run. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, M = IL.M, I = IL.I, h = IL.h, C = IL.C, pct = IL.pct;
  if (!root.document) return;
  var doc = root.document;

  IL.world = IL.generate();
  IL.state = { sec: 's1', tab: 'brief', tb: 'all', win: '2w', hideNames: false, view: {}, cards: {}, useful: {}, actions: [], student: null, stuList: null,
    open: null, focus: null, expand: {}, info: {}, more: {} };
  IL.tabs = {};
  IL.tabOrder = ['brief', 'progress', 'understanding', 'engagement', 'habits', 'students', 'followups'];

  IL.sec = function () { return IL.world.sections.filter(function (s) { return s.id === IL.state.sec; })[0]; };
  IL.metrics = function () { return M.build(IL.world, IL.sec(), { tb: IL.state.tb, win: IL.state.win }); };
  // the shared insight records for the section and scope on screen
  IL.ins = function () { return I.build(IL.world, IL.sec(), IL.metrics(), { cards: IL.state.cards }); };
  IL.nm = function (sid) {
    var st = IL.sec().students[sid];
    if (!st) return sid;
    return IL.state.hideNames ? 'Student ' + (st.idx + 1 < 10 ? '0' : '') + (st.idx + 1) : st.name;
  };
  // what a student's bubble says: initials, or the student's number when names are hidden
  IL.ini = function (sid) {
    var st = IL.sec().students[sid];
    return !st ? '?' : IL.state.hideNames ? String(st.idx + 1) : st.initials;
  };
  // a name opens that student; the list it sits in becomes the list that previous/next walks through
  IL.who = function (sid, list) { return h('span', { class: 'who', tabindex: 0, role: 'link', 'data-sids': sid, on: { click: function (e) { e.stopPropagation(); IL.openStudent(sid, list); } } }, IL.nm(sid)); };
  IL.whoList = function (sids, max) {
    max = max || 8;
    var out = [];
    sids.slice(0, max).forEach(function (sid, i) { if (i) out.push(' · '); out.push(IL.who(sid, sids)); });
    if (sids.length > max) out.push(' · +' + (sids.length - max) + ' more');
    return out;
  };
  // a card says so only when its time basis differs from the window selected
  IL.basisLabel = function (basis) {
    var win = IL.state.win;
    if (!basis || basis === 'window') return null;
    if ((basis === 'term' && win === 'term') || (basis === 'unit' && win === 'unit') || (basis === 'lastweek' && win === '1w')) return null;
    return I.BASIS[basis];
  };
  IL.usesWindow = function (tab, ins) { return Object.keys(ins.cards).some(function (id) { var c = ins.cards[id]; return c.tab === tab && c.ok && c.basis === 'window'; }); };

  // ---------- routing ----------
  IL.go = function (patch) {
    Object.keys(patch).forEach(function (k) { IL.state[k] = patch[k]; });
    if (patch.sec) { IL.state.tb = 'all'; IL.state.student = null; IL.state.stuList = null; IL.state.view = {}; IL.state.expand = {}; IL.state.more = {}; }
    if (patch.tab && patch.student === undefined) IL.state.student = null;
    var st = IL.state, hash = '#/' + st.sec + '/' + st.tab + (st.student ? '/' + st.student : '');
    var q = [];
    if (st.tb !== 'all') q.push('tb=' + st.tb);
    if (st.win !== '2w') q.push('win=' + st.win);
    if (st.view[st.tab]) q.push('view=' + st.view[st.tab]);
    if (st.view.gridTb) q.push('book=' + st.view.gridTb);
    if (Array.isArray(st.view.path) && st.view.path.length) q.push('path=' + st.view.path.join(','));
    if (q.length) hash += '?' + q.join('&');
    if (root.location.hash !== hash) root.history.replaceState(null, '', hash);
    IL.closeDrawer(); IL.render();
    var main = doc.querySelector('.main'); if (main && patch.tab && !patch.focus) main.scrollTop = 0;
  };
  IL.openStudent = function (sid, list) {
    IL.state.stuList = list && list.length > 1 ? U.uniq(list) : null;
    IL.go({ tab: 'students', student: sid });
  };
  function readHash() {
    var m = /^#\/([^/?]+)\/([^/?]+)(?:\/([^?]+))?(?:\?(.*))?$/.exec(root.location.hash || '');
    if (!m) return;
    var st = IL.state;
    if (IL.world.sections.some(function (s) { return s.id === m[1]; }) && st.sec !== m[1]) { st.sec = m[1]; st.expand = {}; st.more = {}; }
    if (IL.tabs[m[2]]) st.tab = m[2];
    st.student = m[3] || null;
    (m[4] || '').split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0] === 'tb') st.tb = p[1]; else if (p[0] === 'win') st.win = p[1]; else if (p[0] === 'view') st.view[st.tab] = p[1];
      else if (p[0] === 'book') st.view.gridTb = p[1]; else if (p[0] === 'path') st.view.path = decodeURIComponent(p[1]).split(',');
      else if (p[0] === 'open') st.open = p[1]; else if (p[0] === 'focus') st.focus = p[1]; else if (p[0] === 'names' && p[1] === 'off') st.hideNames = true;
    });
  }

  // ---------- frame ----------
  var RAIL = [['◐', 'Insight Lens', true], ['▤', 'Coursework'], ['▦', 'Textbook'], ['◇', 'Sandbox'], ['▣', 'Projects'], ['☺', 'People'], ['＋', 'Create Coursework']];
  function select(label, value, options, onChange, bare) {
    return h('label', { class: 'pick' }, bare ? null : h('span', null, label),
      h('select', { class: 'sel', 'aria-label': label, on: { change: function (e) { onChange(e.target.value); } } },
        options.map(function (o) { return o.group ? h('optgroup', { label: o.group }, o.options.map(opt)) : opt(o); })));
    function opt(o) { return h('option', { value: o.value, selected: o.value === value ? 'selected' : null }, o.label); }
  }
  IL.render = function () {
    var st = IL.state, sec = IL.sec(), world = IL.world, m = IL.metrics(), ins = IL.ins(), tab = IL.tabs[st.tab];
    IL.cur = { m: m, ins: ins, sec: sec };
    var app = doc.getElementById('app');
    var keep = doc.querySelector('.main'), scroll = keep ? keep.scrollTop : 0;
    app.textContent = '';
    // one section picker for any number of sections
    var mine = world.sections.filter(function (s) { return s.group !== 'test'; }), tests = world.sections.filter(function (s) { return s.group === 'test'; });
    var secOpt = function (s) { return { value: s.id, label: s.name + ' · ' + s.period + (s.group === 'test' ? '' : ' · ' + s.roster.length + ' students') }; };
    app.appendChild(h('header', { class: 'topbar' },
      h('div', { class: 'logo' }, 'A'), h('span', { class: 'brand' }, 'ALPS'), h('span', { class: 'product' }, 'Insight Lens'),
      select('Section', st.sec, [{ group: 'My sections', options: mine.map(secOpt) }].concat(tests.length ? [{ group: 'Test shapes (mock only)', options: tests.map(secOpt) }] : []), function (v) { IL.go({ sec: v }); }),
      h('div', { class: 'spacer' }),
      h('span', { class: 'demo-date', tip: 'The mock is frozen at this moment.\nClass weeks are weeks when at least 60% of the roster was active; quiet weeks are skipped, so a holiday does not distort a comparison.' }, T.fmtDayLong(T.day(world.now)) + ' 2026 · 07:30 · updated 14 min ago'),
      h('button', { class: 'toggle' + (st.hideNames ? ' on' : ''), tip: 'Replace names with numbers, for showing the screen to the class', on: { click: function () { st.hideNames = !st.hideNames; IL.render(); } } }, st.hideNames ? 'Names hidden' : 'Hide names'),
      h('div', { class: 'avatar', tip: sec.teacher }, 'MA')));
    app.appendChild(h('nav', { class: 'rail', 'aria-label': 'Main navigation' },
      RAIL.map(function (r) { return h('div', { class: 'rail-item ' + (r[2] ? 'on' : 'off'), tip: r[2] ? null : 'Not part of this mock' }, h('span', { class: 'ic' }, r[0]), h('span', { class: 'rl' }, r[1])); }),
      h('div', { class: 'rail-note' }, 'Student Breakdown, Performance Dashboard and Recent Activity now live inside Insight Lens, under Students and Understanding.')));
    var main = h('main', { class: 'main' });
    // tabs and scope share one compact, sticky row; a control appears only where something uses it
    var scope = [];
    if (sec.textbooks.length > 1) scope.push(select('Textbook', st.tb, [{ value: 'all', label: 'All textbooks' }].concat(sec.textbooks.map(function (x) { return { value: x.tb.id, label: x.tb.short + ' (' + (x.role === 'primary' ? 'primary' : x.tb.kind.toLowerCase()) + ')' }; })), function (v) { IL.go({ tb: v }); }, true));
    if (IL.usesWindow(st.tab, ins) && !(st.tab === 'students' && st.student)) scope.push(select('Window', st.win, M.windows.map(function (w) { return { value: w.id, label: w.id === 'unit' && m.currentUnit ? 'Latest ' + (m.currentUnit.num && !/^\d/.test(String(m.currentUnit.num)) ? 'unit' : 'chapter') + ' started (' + m.currentUnit.num + ')' : w.label }; }), function (v) { IL.go({ win: v }); }, true));
    main.appendChild(h('div', { class: 'lens-head' },
      h('div', { class: 'tabs', role: 'tablist' }, IL.tabOrder.map(function (k) {
        var t = IL.tabs[k], n = k === 'brief' ? null : ins.tabCounts[k];
        return h('button', { class: 'tab' + (k === st.tab ? ' on' : ''), role: 'tab', 'aria-selected': k === st.tab, tip: n ? (k === 'students' ? n + ' students flagged' : n + ' of this tab’s cards have something to look at') : null,
          on: { click: function () { IL.go({ tab: k }); } } }, t.label, n ? h('span', { class: 'count' }, String(n)) : null);
      })),
      scope.length ? h('div', { class: 'scope' }, scope) : null));
    var content = h('div', { class: 'content' });
    if (sec.shape) content.appendChild(h('p', { class: 'shape-note' }, h('b', null, 'Test shape: ' + sec.shape + '. '), 'Not one of the demo sections. It is here to show that the same rules hold on data they were not tuned for.'));
    tab.render(content, { world: world, sec: sec, m: m, st: st, b: m.b, ins: ins });
    main.appendChild(content);
    app.appendChild(main);
    main.scrollTop = scroll;
    IL.runFits();
    if (st.open) { var o = st.open; st.open = null; if (IL.openers[o]) IL.openers[o](); }
    // deep link: land on the item itself, not the top of its tab
    if (st.focus) {
      var f = st.focus; st.focus = null;
      var target = doc.querySelector('[data-card="' + f + '"]');
      if (target) {
        main.scrollTop = Math.max(0, target.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 64);
        target.classList.add('focus'); setTimeout(function () { target.classList.remove('focus'); }, 2600);
      }
    }
  };
  IL.openers = {};

  // Lays out a tab from its card specs. The map of the class comes first. Every card with something to look at
  // is then one row in the shared form (what we see, how we know, what to do and why), most important first,
  // and its full picture opens in place under the row. Cards with nothing notable, and cards the data cannot
  // support, are a line each at the bottom.
  IL.layout = function (el, ctx, tab, specs) {
    var ins = ctx.ins, st = ctx.st, R = IL.R, firedList = [], refs = [], quiet = [], nodata = [], sig = {};
    ins.signals.forEach(function (s) { sig[s.id] = s; });
    specs.forEach(function (sp, i) {
      var c = ins.cards[sp.id], x = { sp: sp, c: c, i: i };
      if (!c.ok) nodata.push(x);
      else if (c.reference) refs.push(x);
      else if (c.fired) {
        x.sigs = c.signals.map(function (id) { return sig[id]; }).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
        x.rank = x.sigs.length ? x.sigs[0].score : 0.001; firedList.push(x);
      } else quiet.push(x);
    });
    firedList.sort(function (a, b) { return (b.rank - a.rank) || (a.i - b.i); });
    var isOpen = function (x, dflt) { var e = st.expand[x.c.id]; return e == null ? dflt : e; };
    el.appendChild(h('p', { class: 'question' }, h('b', null, tab.label), tab.question));
    function build(x, canHide) {
      var o = x.sp.build(x.c) || {};
      o.ins = x.c;
      if (canHide) o.onHide = function () { st.expand[x.c.id] = false; IL.render(); };
      return C.card(o);
    }
    function show(x) { return function () { st.expand[x.c.id] = true; st.focus = x.c.id; IL.render(); }; }
    // one card with something to look at, as a row; its own chart is the full analysis
    function cardRow(x, rank) {
      var c = x.c, lead = x.sigs[0] || null, open = isOpen(x, false), p = lead ? R.card(c, lead, ctx) : { title: String(c.headline || c.title).replace(/\.$/, ''), chips: [], evid: null, why: null, linked: false };
      var toggle = function () { st.expand[c.id] = !open; IL.render(); };
      var a = lead && lead.act, self = !a || (a.kind === 'go' && a.tab === c.tab), alt = !self && lead.alts && lead.alts[0], chips = p.chips.slice(), detail = null;
      if (x.sigs.length > 1 && !p.listed) chips.push('+' + (x.sigs.length - 1) + ' more like this');
      if (open) {
        var o = x.sp.build(c) || {};
        detail = h('div', { class: 'ia-detail one' }, h('div', null, h('h5', null, c.title + (IL.basisLabel(c.basis) ? ' · ' + IL.basisLabel(c.basis) : '')),
          h('p', { class: 'ia-headline' }, c.headline), o.sub ? h('p', { class: 'sub', style: 'margin-bottom:8px' }, o.sub) : null,
          typeof o.body === 'function' ? o.body() : o.body, o.actions && self ? h('div', { class: 'actions' }, o.actions) : null,
          c.rule || c.caveat ? h('p', { class: 'ia-rule' }, c.rule ? [h('b', null, 'How this is worked out. '), c.rule + ' '] : null, c.caveat ? [h('b', null, 'Read with care. '), c.caveat] : null) : null));
      }
      return R.line({ card: c.id, rank: rank, cls: open ? 'open' : '', title: p.title, chips: chips, evid: p.evid,
        more: self ? null : R.moreBtn(open, toggle),
        btn: self ? h('button', { class: 'btn ' + (rank === 1 ? 'primary' : 'tonal'), 'aria-expanded': open ? 'true' : 'false', on: { click: toggle } }, open ? 'Hide the detail' : 'See the detail') : R.doBtn(a, null, rank === 1),
        why: p.why, linked: p.linked && !self, size: self ? null : R.actSize(a), alt: alt ? R.altLink(alt, null) : null, detail: detail });
    }
    // the map of the class
    refs.filter(function (x) { return isOpen(x, true); }).forEach(function (x) { el.appendChild(h('div', { class: 'row' }, build(x, true))); });
    // what stands out, one row each, most important first
    if (firedList.length) {
      var list = h('section', { class: 'card ia', style: 'margin-bottom:14px' });
      list.appendChild(R.head());
      firedList.forEach(function (x, i) { list.appendChild(cardRow(x, i + 1)); });
      el.appendChild(list);
    } else el.appendChild(h('p', { class: 'empty' }, 'Nothing on this tab needs you right now.'));
    // a quiet card the teacher asked to see
    quiet.filter(function (x) { return isOpen(x, false); }).forEach(function (x) { el.appendChild(h('div', { class: 'row' }, build(x, true))); });
    var lineQuiet = quiet.filter(function (x) { return !isOpen(x, false); }), hiddenRefs = refs.filter(function (x) { return !isOpen(x, true); });
    if (lineQuiet.length || hiddenRefs.length) el.appendChild(h('section', { class: 'card quiet-card' }, h('div', { class: 'card-head' }, h('h3', null, 'Nothing notable'), h('span', { class: 'sub' }, U.plural(lineQuiet.length + hiddenRefs.length, 'card'))),
      hiddenRefs.concat(lineQuiet).map(function (x) { return C.quietLine(x.c, show(x)); })));
    if (nodata.length) el.appendChild(h('section', { class: 'card quiet-card' }, h('div', { class: 'card-head' }, h('h3', null, 'Not available for this section yet'), h('span', { class: 'sub' }, U.plural(nodata.length, 'card'))),
      nodata.map(function (x) { return C.quietLine(x.c); })));
  };

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
  // Inside a card marked "linked", pointing at a student's name lights their bubble, and the other way round.
  var lit = [];
  function unlight() { lit.forEach(function (el) { el.classList.remove('hl'); }); lit = []; }
  doc.addEventListener('pointerover', function (e) {
    var el = e.target.closest ? e.target.closest('[data-sids]') : null, box = el && el.closest('.linked');
    unlight();
    if (!box) return;
    var want = el.getAttribute('data-sids').split(' ');
    [].forEach.call(box.querySelectorAll('[data-sids]'), function (x) {
      if (x.getAttribute('data-sids').split(' ').some(function (id) { return want.indexOf(id) >= 0; })) { x.classList.add('hl'); lit.push(x); }
    });
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { IL.closeDrawer(); IL.closeModal(); }
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('who')) e.target.click();
  });

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
    IL.runFits();
  };
  IL.closeDrawer = function () { drawer.hidden = true; scrim.hidden = true; };
  IL.section = function (title) { var args = Array.prototype.slice.call(arguments, 1); return h('div', { class: 'dr-sec' }, h('h4', null, title), args); };
  var modal = doc.getElementById('modal');
  modal.addEventListener('click', function (e) { if (e.target === modal) IL.closeModal(); });
  IL.closeModal = function () { modal.hidden = true; modal.textContent = ''; };

  // ---------- actions: every button is built from the list it will act on ----------
  IL.run = function (a, key) {
    var sec = IL.sec();
    if (!a) return;
    if (a.kind === 'builder') IL.builder({ recipe: a.recipe, minutes: a.minutes, sids: a.targets, skills: a.skills, reason: a.reason, key: key });
    else if (a.kind === 'checkin') IL.logCheckin(a.targets, key);
    else if (a.kind === 'go') { IL.closeDrawer(); if (a.path) { IL.state.view.gridTb = sec.textbooks[0].tb.id; IL.state.view.path = a.path.slice(); } IL.go({ tab: a.tab, focus: a.focus }); }
    else if (a.kind === 'item') IL.ev.item(a.item);
    else if (a.kind === 'congrats') { if (key) IL.state.cards[key] = 'done'; IL.closeDrawer(); IL.render(); IL.toast('Congratulations sent to ' + U.plural(a.targets.length, 'student') + '.'); }
    else IL.toast((a.text || 'Would do: ' + a.verb) + (a.targets ? (/\.$/.test(a.text || '') ? '' : ' for ' + U.plural(a.targets.length, 'student') + '.') : ''));
  };
  // The words on a button come from the list it acts on: one student is named, the whole roster is
  // "the class", and anything else is the length of the list.
  function listWords(verb, sids) {
    return verb + ' ' + (sids.length === 1 ? IL.nm(sids[0]) : sids.length === IL.cur.m.roster.length && sids.length > 1 ? 'the class' : sids.length);
  }
  IL.actBtn = function (a, cls, key) {
    if (!a) return null;
    return h('button', { class: 'btn ' + (cls || ''), tip: a.targets && !a.whole && a.targets.length > 1 ? IL.names(a.targets, 12) : null, on: { click: function (e) { e.stopPropagation(); IL.run(a, key); } } }, a.targets ? listWords(a.verb, a.targets) : I.label(a));
  };
  // for buttons built on a tab from a list in hand: the number shown is the length of that list
  IL.listBtn = function (verb, sids, fn, cls) {
    if (!sids || !sids.length) return null;
    return h('button', { class: 'btn ' + (cls || ''), tip: sids.length > 1 ? IL.names(sids, 12) : null, on: { click: function (e) { e.stopPropagation(); fn(sids); } } }, listWords(verb, sids));
  };
  IL.logCheckin = function (sids, key) {
    var world = IL.world, sec = IL.sec(), today = T.day(world.now);
    IL.state.actions.push({ id: 'user-' + (IL.state.actions.length + 1), sec: sec.id, type: 'Check-in', kind: 'check-in', title: 'Check-in with ' + U.plural(sids.length, 'student'), day: today, t: world.now, skills: [], students: sids.slice(), asg: null, recheckDay: today + 7, reviewed: false, user: true });
    sec._m = {};
    IL.closeDrawer(); IL.render();
    IL.toast('Check-in logged for ' + U.plural(sids.length, 'student') + '. The Lens will look again on ' + T.fmtDayLong(today + 7) + '.');
  };

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
    IL.drawer(title, sub, [IL.section(U.plural(sids.length, 'student'), C.named(sids, '', 40)), note ? h('p', { class: 'note' }, note) : null]);
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
        return h('div', { class: 'strip-row' }, IL.who(r.sid, wrong.map(function (x) { return x.sid; })), C.tape(r.attempts, { labelled: true }));
      }), h('p', { class: 'note' }, 'Each mark is one attempt with the time since the previous one.')));
    } else if (it.type === 'activecode' && it.code.graded) {
      var o = M._codeStat(it, g);
      body.push(IL.section('Outcome · ' + o.n + ' ran code', C.split([
        { n: o.firstRun.length, cls: 's-done', label: 'Passed on the first run', sids: o.firstRun }, { n: o.afterFixes.length, cls: 's-part', label: 'Passed after fixes', sids: o.afterFixes },
        { n: o.failing.length, cls: 's-bad', label: 'Still failing', sids: o.failing }], { size: 'tall' }),
        C.legend([{ cls: 's-done', label: 'first run ' + o.firstRun.length }, { cls: 's-part', label: 'after fixes ' + o.afterFixes.length }, { cls: 's-bad', label: 'still failing ' + o.failing.length }])));
      if (o.topError) body.push(IL.section('Most common error now', h('p', null, h('span', { class: 'tag warn' }, o.topError.err), ' ', U.plural(o.topError.students.length, 'student') + ': ', IL.whoList(o.topError.students)),
        h('p', { class: 'sub', style: 'margin:10px 0 6px' }, 'A representative latest run (sample text in this mock)'), sampleCode(o.topError.err, it.code.lang)));
      body.push(IL.section('Runs, in order', o.failing.slice(0, 8).map(function (sid) {
        var r = sec.recIndex.get(sid + ':' + itemId);
        return h('div', { class: 'strip-row' }, h('span', null, IL.who(sid, o.failing), ' · ' + r.attempts.length + ' runs'), C.tape(r.attempts, { code: true }));
      }), C.legend([{ cls: 's-done', label: 'passed' }, { cls: 's-bad', label: 'failed' }])));
    } else {
      var ok = g.filter(function (r) { return r.attempts[0].ok; }).map(function (r) { return r.sid; });
      body.push(IL.section('First try · ' + g.length + ' students', C.split([{ n: ok.length, cls: 's-done', label: 'Right first time', sids: ok },
        { n: g.length - ok.length, cls: 's-bad', label: 'Wrong first time', sids: g.filter(function (r) { return !r.attempts[0].ok; }).map(function (r) { return r.sid; }) }], { size: 'tall' }),
        C.legend([{ cls: 's-done', label: 'right first time ' + ok.length }, { cls: 's-bad', label: 'wrong first time ' + (g.length - ok.length) }])));
    }
    var a = m.b.itemAgg[itemId];
    body.push(IL.section('Facts', h('div', { class: 'facts' },
      h('div', null, h('span', null, 'Right first time'), h('span', null, a ? a.ok + ' of ' + a.n : '–'), h('span', null, 'this class')),
      h('div', null, h('span', null, 'Solved eventually'), h('span', null, a ? a.ever + ' of ' + a.n : '–'), h('span', null, '')),
      h('div', null, h('span', null, 'Typical first try'), h('span', null, it.norm.n >= 200 ? pct(it.norm.p) : 'not enough data yet'), h('span', null, it.norm.n >= 200 ? it.norm.n + ' learners elsewhere' : '')))));
    IL.drawer(it.name, meta, body);
  };

  IL.ev.cell = function (sid, tbId, colId, path) {
    var sec = IL.sec(), d = M.cell(IL.world, sec, sid, tbId, colId, path);
    if (!d) return;
    var c = d.cell, col = d.col, items = sec.items, skill = col.kind === 'skill';
    var total = c.correct + c.error + c.pending + c.untouched, touched = c.correct + c.error + c.pending, body = [];
    // one reading first; then each number with the name of what it measures
    if (d.verdict) body.push(h('div', { class: 'verdict ' + d.verdict.tone }, h('b', null, d.verdict.title), d.verdict.body));
    else body.push(h('p', { class: 'finding', style: 'margin-top:8px' }, touched === 0 ? (skill ? 'No questions on this skill attempted yet.' : 'Nothing opened in this unit yet.') : c.n ? c.ok + ' of ' + c.n + ' right first time. Too few answers to say more.' : 'Work is waiting for a grade.'));
    var bandLine = c.band.state === 'scored' ? M.BANDS[c.band.level] + ' · ' + c.band.coverage + '% of the unit scored' + (c.band.capped ? ' (capped by coverage)' : '')
      : c.band.state === 'unavailable' ? (d.grid.level === 'chapter' ? 'Not available for this skill set' : 'Scored per chapter only') : 'Not attempted';
    body.push(IL.section('What the cell shows',
      h('div', { class: 'facts' },
        h('div', null, h('span', null, 'Right first time'), h('span', null, c.n ? pct(c.fts) + ' (' + c.ok + ' of ' + c.n + ')' : '–'), h('span', null, 'class ' + pct(d.classFts))),
        h('div', null, h('span', null, 'Work completed'), h('span', null, c.pc + '% (' + c.correct + ' of ' + total + ')'), h('span', null, 'solved in the end')),
        h('div', null, h('span', null, 'Learning band'), h('span', null, bandLine), h('span', null, 'from the learner model')),
        h('div', null, h('span', null, 'Recorded activity'), h('span', null, M.ENG[c.eng]), h('span', null, Math.round(c.min) + ' min')),
        h('div', null, h('span', null, 'Retries within 3 seconds'), h('span', null, d.retries ? d.rapid + ' of ' + d.retries : '–'), h('span', null, '')))));
    body.push(IL.section(total + ' questions · ' + touched + ' attempted',
      C.split([{ n: c.correct, cls: 's-done', label: 'Correct' }, { n: c.error, cls: 's-bad', label: 'Incorrect' }, { n: c.pending, cls: 's-grade', label: 'Awaiting grading' }, { n: c.untouched, cls: 's-none', label: 'Not started' }], { size: 'tall' }),
      C.legend([{ cls: 's-done', label: 'correct ' + c.correct }, { cls: 's-bad', label: 'incorrect ' + c.error }, { cls: 's-grade', label: 'awaiting grading ' + c.pending }, { cls: 's-none', label: 'not started ' + c.untouched }])));
    if (skill) {
      body.push(IL.section('Every question on this skill · ' + d.questions.length, d.questions.map(function (q) {
        var row = h('div', { class: 'strip-row', style: 'grid-template-columns: 1fr auto' },
          h('a', { on: { click: function () { IL.ev.item(q.item.id); } } }, q.item.name),
          q.rec ? C.tape(q.rec.attempts, { code: q.item.type === 'activecode' }) : h('span', { class: 'sub' }, 'not started'));
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
      body.push(IL.section('Never solved · ' + d.wrong.length, nodes));
    }
    if (d.bySub.length > 1) {
      body.push(IL.section('Where it sits · ' + d.bySub.length + ' subunits', d.bySub.map(function (x) {
        var note = x.error ? x.error + ' wrong' : x.pending ? x.pending + ' ungraded' : x.correct === x.total ? 'all correct' : x.correct ? x.correct + ' of ' + x.total : 'not started';
        return C.splitRow(x.sub.code + ' ' + x.sub.name, [{ n: x.correct, cls: 's-done', label: 'Correct' }, { n: x.error, cls: 's-bad', label: 'Incorrect' }, { n: x.pending, cls: 's-grade', label: 'Awaiting grading' }, { n: Math.max(0, x.untouched), cls: 's-none', label: 'Not started' }], note, { size: 'thin' });
      })));
    }
    var acts = [h('button', { class: 'btn', on: { click: function () { IL.openStudent(sid); } } }, 'Open student page')];
    if (col.drill && col.open) acts.push(h('button', { class: 'btn', on: { click: function () {
      IL.state.view.path = (d.grid.path || []).concat([col.id]); IL.state.view.students = 'unit'; IL.closeDrawer(); IL.go({ tab: 'students', student: null });
    } } }, col.kind === 'chapter' ? 'Open its subunits' : 'Open its skills'));
    if (skill) acts.push(IL.listBtn('Practice set on this skill for', [sid], function (list) { IL.closeDrawer(); IL.builder({ recipe: 'Remediation', minutes: 10, sids: list, skills: [col.id], reason: 'this skill' }); }, 'primary'));
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
  // What a question looks like before it is assigned. Wording is sample text in this mock.
  function preview(x, lang) {
    var py = lang === 'python', skill = x.skill || 'this skill', out = [];
    var code = py ? ['total = 0', 'for n in nums[1:]:', '    total = total + n', 'print(total)'] : ['int total = 0;', 'for (int i = 1; i < nums.length; i++) {', '    total += nums[i];', '}', 'System.out.println(total);'];
    if (x.type === 'mchoice') {
      out.push(h('p', null, x.item && x.item.opts.stem ? x.item.opts.stem : 'With nums holding 4, 7 and 9, what does this print?'));
      if (!(x.item && x.item.opts.stem)) out.push(h('pre', { class: 'code' }, code.join('\n')));
      (x.item ? x.item.opts.labels : ['20', '16', '9', 'An error']).forEach(function (l, i) { out.push(h('div', { class: 'pv-opt' }, h('b', null, String.fromCharCode(65 + i)), l)); });
    } else if (x.type === 'parsonsprob') {
      out.push(h('p', null, 'Drag these lines into a working solution that adds every value except the first.'));
      [code[2], code[0], code[code.length - 1], code[1]].forEach(function (l) { out.push(h('div', { class: 'pv-line' }, l.trim())); });
    } else if (x.type === 'fillintheblank') {
      out.push(h('p', null, 'Complete the line so the loop skips the first value and stops at the last one.'));
      out.push(h('pre', { class: 'code' }, py ? 'for n in nums[ ____ :]:' : 'for (int i = ____ ; i < nums.length; i++) {'));
    } else {
      out.push(h('p', null, 'Write the code. The tests call it with an empty list, one value and several values.'));
      out.push(h('pre', { class: 'code' }, py ? 'def total_after_first(nums):\n    # your code here' : 'public static int totalAfterFirst(int[] nums) {\n    // your code here\n}'));
    }
    out.push(h('p', { class: 'sub' }, 'Targets ' + skill + '. Sample wording in this mock; the real question appears here before you assign it.'));
    return h('div', { class: 'pv' }, out);
  }
  IL.builder = function (o) {
    var sec = IL.sec(), world = IL.world, st = { recipe: o.recipe || 'Remediation', minutes: o.minutes || 15, sids: o.sids.slice(), kept: {}, open: {} };
    var skills = o.skills && o.skills.length ? o.skills : [];
    var skillNames = skills.map(function (k) { return world.skills[k].name; });
    if (!skillNames.length) skillNames = ['the current unit'];
    function suggest() {
      var set = {};
      skills.forEach(function (k) { set[k] = true; world.skills[k].dependents.forEach(function (d) { set[d] = true; }); });
      var real = sec.itemList.filter(function (it) {
        return !it.action && it.type !== 'shortanswer' && it.skills.some(function (k) { return set[k]; }) && !st.sids.some(function (sid) { return sec.recIndex.has(sid + ':' + it.id); });
      }).slice(0, 3).map(function (it) { return { label: it.name, type: it.type, est: it.est, src: world.textbooks[it.tb].short + ' ' + it.subCode, item: it.type === 'mchoice' ? it : null, skill: world.skills[it.skills[0]].name }; });
      var types = (m0.caps.code ? ['mchoice', 'parsonsprob', 'fillintheblank', 'mchoice', 'activecode', 'mchoice', 'parsonsprob'] : ['mchoice', 'parsonsprob', 'fillintheblank', 'mchoice', 'mchoice', 'parsonsprob']);
      var est = { mchoice: 90, parsonsprob: 180, fillintheblank: 75, activecode: 330 }, out = real, used = U.sum(real.map(function (x) { return x.est; })), i = 0;
      while (used + est[types[i % types.length]] <= st.minutes * 60 && i < 14) {
        var t = types[i % types.length];
        out.push({ label: 'New · ' + skillNames[i % skillNames.length] + ' · ' + IL.content.variants[t][i % IL.content.variants[t].length], type: t, est: est[t], src: 'generated', skill: skillNames[i % skillNames.length] });
        used += est[t]; i++;
      }
      return out;
    }
    var m0 = IL.metrics();
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
              return h('button', { class: 'chip' + (st.minutes === mm ? ' on' : ''), on: { click: function () { st.minutes = mm; st.kept = {}; st.open = {}; draw(); } } }, mm + ' min');
            }))),
            h('div', { class: 'field' }, h('label', null, 'Questions · ' + kept.length + ' of ' + items.length + ' kept · select one to read it'),
              items.map(function (x, i) {
                var out = st.kept[i] === false, shown = !!st.open[i];
                return h('div', { class: 'pwrap' },
                  h('div', { class: 'pitem' + (out ? ' out' : '') }, h('span', { class: 'sub' }, String(i + 1)),
                    h('button', { class: 'ptitle', 'aria-expanded': shown ? 'true' : 'false', on: { click: function () { st.open[i] = !shown; draw(); } } }, h('span', { class: 'car' }, shown ? '▾' : '▸'), x.label, ' ', h('span', { class: 'sub' }, '· ' + x.src)),
                    h('span', { class: 'sub' }, '~' + Math.max(1, Math.round(x.est / 60)) + ' min'),
                    h('button', { class: 'x', on: { click: function () { st.kept[i] = out ? true : false; draw(); } } }, out ? 'add back' : 'remove')),
                  shown ? preview(x, sec.set) : null);
              }),
              h('div', { class: 'bar-wrap', style: 'margin-top:8px' }, C.meter(used / (st.minutes * 60)), h('span', { class: 'sub' }, Math.round(used / 60) + ' of ' + st.minutes + ' minutes')))),
          h('div', null,
            h('div', { class: 'why' }, h('b', null, 'Why these'), h('p', { style: 'margin-top:6px' }, 'Targets ' + skillNames.join(' and ') + ': ' + WHY[st.recipe] + '.'),
              h('p', { style: 'margin-top:6px' }, 'A mix of reading and writing questions. None has been seen by these ' + U.plural(st.sids.length, 'student') + '.')),
            h('div', { class: 'field', style: 'margin-top:14px' }, h('label', null, 'Recheck'), h('p', { class: 'sub' }, 'On ' + due + ' the Lens compares first-try success on these new questions with their earlier work on the same skill.')))),
        h('div', { class: 'modal-foot' },
          h('button', { class: 'btn', on: { click: function () { IL.toast('Saved as a draft.'); IL.closeModal(); } } }, 'Save as draft'),
          h('button', { class: 'btn', on: { click: function () { items.forEach(function (x, i) { st.open[i] = true; }); draw(); } } }, 'Read all questions'),
          h('button', { class: 'btn', on: { click: function () { IL.toast('Would open the full Create Coursework flow with these choices.'); } } }, 'More options…'),
          h('div', { class: 'spacer' }),
          h('button', { class: 'btn primary', on: { click: function () {
            var today = T.day(world.now);
            IL.state.actions.push({ id: 'user-' + (IL.state.actions.length + 1), sec: sec.id, type: st.recipe, title: st.recipe + ' · ' + skillNames[0], day: today, t: world.now, skills: skills, students: st.sids, asg: null,
              recheckDay: today + 7, reviewed: false, user: true });
            sec._m = {};
            if (o.key) IL.state.cards[o.key] = 'done';
            IL.closeModal(); IL.closeDrawer(); IL.render();
            IL.toast(st.recipe + ' assigned to ' + U.plural(st.sids.length, 'student') + '. Recheck set for ' + due + '.');
          } } }, 'Assign to ' + st.sids.length))));
      modal.hidden = false;
    }
    draw();
  };

  // ---------- themes and signals on screen ----------
  IL.laneTag = function (lane) { return h('span', { class: 'tag' + (lane === 'good' ? ' good' : '') }, I.LANES[lane]); };
  function kindOf(s) { return s.id === 'good-up' ? 'up' : s.id === 'good-ready' ? 'ready' : s.id.split('-')[0]; }
  // the picture behind one signal
  IL.picture = function (s) {
    var m = IL.cur.m, sec = IL.cur.sec, world = IL.world, k = kindOf(s), d = s.data;
    if (k === 'waiting') return [C.bars(d.byAsg.map(function (x) { return { label: x.a.short, v: x.n, text: x.n + ' to grade · oldest ' + T.ago(x.oldest, world.now), cls: 'amber' }; }), { span: 26 }),
      d.questions.map(function (q) { return h('p', { class: 'note' }, IL.who(q.sid), ' asked on ' + sec.items[q.item].subCode + ': “' + q.text + '”'); })];
    if (k === 'due') return [C.split([{ n: d.completed.length, cls: 's-done', label: 'Completed', sids: d.completed }, { n: d.inProgress.length, cls: 's-prog', label: 'In progress', sids: d.inProgress }, { n: d.notStarted.length, cls: 's-none', label: 'Not started', sids: d.notStarted }], { size: 'tall' }),
      C.legend([{ cls: 's-done', label: 'completed ' + d.completed.length }, { cls: 's-prog', label: 'in progress ' + d.inProgress.length }, { cls: 's-none', label: 'not started ' + d.notStarted.length }])];
    if (k === 'decay') return m.funnel.rows.filter(function (x) { return x.a.kind === 'lesson' && x.a.chapterNum === d.decay.chapter; }).map(function (x) { return C.splitRow(x.a.short, IL.funnelSegs(x), x.completed.length + ' done'); });
    if (k === 'fu') return IL.followupPicture(d);
    if (k === 'rt') return C.options({ item: d.item, picks: d.picks, top: d.top });
    if (k === 'gap') return IL.gapPicture(m, d);
    if (k === 'code') return IL.codePicture(d);
    if (k === 'dip') return IL.dipPicture(m);
    if (k === 'quiet') return IL.quietPicture(m);
    if (k === 'traj') return IL.trajPicture(m, d.slice(0, 8));
    if (k === 'pace') return IL.pacePicture(d);
    if (k === 'streak') return IL.streakPicture(m, d);
    if (k === 'stuck') return IL.stuckPicture(m, 5);
    if (k === 'up') return IL.movePicture(m, d.improving);
    if (k === 'ready') return d.map(function (x) { return h('p', { style: 'margin:4px 0' }, h('i', { class: 'dot good' }), ' ', IL.who(x.sid), '  ' + x.ok + ' of ' + x.n + ' right first time, including ' + x.hardOk + ' of ' + x.hard + ' reasoning questions'); });
    return null;
  };
  function factsBlock(facts) {
    return IL.section('Facts used', h('div', { class: 'facts' }, facts.map(function (f) { return h('div', null, h('span', null, f[0]), h('span', null, String(f[1])), h('span', null, f[2] || '')); })));
  }
  // labelled evidence for a row on the Brief: a small mark and the words that say what it shows
  IL.evidence = function (th) {
    var m = IL.cur.m, lead = th.members ? th.members[0] : th, k = kindOf(lead), d = lead.data;
    if (th.people) {
      var open = th.people.filter(function (x) { return !x.treated && !x.off; }).length, done = th.people.filter(function (x) { return x.treated; }).length, off = th.people.filter(function (x) { return x.off; }).length;
      return [C.chips(th.people.filter(function (x) { return !x.off; }).map(function (x) { return { sid: x.sid, cls: x.treated ? '' : 'hot', tip: x.reasons.join('; ') + (x.treated ? '\nalready followed up' : '') }; }), 7),
        h('span', { class: 'cap' }, open + ' not yet followed up' + (done ? ' · ' + done + ' already followed up' : '') + (off ? ' · ' + off + ' not on the roster' : ''))];
    }
    if (th.anchor && m.skill[th.anchor.id]) { var st = m.skill[th.anchor.id]; return [C.meter(st.p), h('span', { class: 'cap' }, pct(st.p) + ' right first time · ' + st.nStudents + ' students · ' + st.nItems + ' questions')]; }
    if (k === 'gap') return [C.meter(d.stat.p), h('span', { class: 'cap' }, pct(d.stat.p) + ' right first time · ' + d.below.length + ' students under 35%')];
    if (k === 'rt') return [C.split([{ n: d.picks[d.top].length, cls: 's-warn', label: 'Chose ' + String.fromCharCode(65 + d.top) }, { n: d.correct, cls: 's-done', label: 'Right answer' }, { n: d.n - d.correct - d.picks[d.top].length, cls: 's-mute', label: 'Other wrong answers' }]),
      h('span', { class: 'cap' }, String.fromCharCode(65 + d.top) + ' ' + d.picks[d.top].length + ' · right answer ' + d.correct + ' · other ' + (d.n - d.correct - d.picks[d.top].length))];
    if (k === 'code') return [C.split([{ n: d.firstRun.length, cls: 's-done', label: 'Passed on the first run' }, { n: d.afterFixes.length, cls: 's-part', label: 'Passed after fixes' }, { n: d.failing.length, cls: 's-bad', label: 'Still failing' }]),
      h('span', { class: 'cap' }, 'first run ' + d.firstRun.length + ' · after fixes ' + d.afterFixes.length + ' · still failing ' + d.failing.length)];
    if (k === 'due') return [C.split([{ n: d.started.length, cls: 's-done', label: 'Started' }, { n: d.notStarted.length, cls: 's-none', label: 'Not started' }]), h('span', { class: 'cap' }, 'started ' + d.started.length + ' · not started ' + d.notStarted.length)];
    if (k === 'decay') return [null, h('span', { class: 'cap' }, d.decay.from + ' completed the first assignment · ' + d.decay.to + ' the latest')];
    if (k === 'fu') return [null, h('span', { class: 'cap' }, d.improved + ' improved · ' + d.same + ' no change · ' + d.firstEvidence + ' first evidence · ' + d.noWork + ' no new work')];
    return [null, null];
  };
  IL.setTheme = function (key, v, msg) { IL.state.cards[key] = v; IL.closeDrawer(); IL.render(); if (msg) IL.toast(msg); };
  function triage(key) {
    var useful = IL.state.useful[key];
    var menu = h('details', { class: 'menu' }, h('summary', { class: 'btn small' }, 'Feedback'),
      h('div', { class: 'menu-items' },
        h('button', { class: 'btn small' + (useful === true ? ' primary' : ''), on: { click: function () { IL.state.useful[key] = true; menu.open = false; IL.toast('Thanks. Noted as useful.'); } } }, 'This was useful'),
        h('button', { class: 'btn small' + (useful === false ? ' primary' : ''), on: { click: function () { IL.state.useful[key] = false; menu.open = false; IL.toast('Thanks. Noted as not useful.'); } } }, 'This was not useful'),
        h('button', { class: 'btn small', on: { click: function () { IL.setTheme(key, 'irrelevant', 'Marked not relevant for this class. This kind of finding will rank lower.'); } } }, 'Not relevant for this class')));
    return h('div', { class: 'controls' },
      h('button', { class: 'btn small', tip: 'I have dealt with this', on: { click: function () { IL.setTheme(key, 'done', 'Marked done.'); } } }, 'Done'),
      h('button', { class: 'btn small', tip: 'Set aside; it comes back if it is still true next week', on: { click: function () { IL.setTheme(key, 'later', 'Set aside. It comes back if it is still true next week.'); } } }, 'Not now'),
      h('span', { class: 'spacer' }), menu);
  }
  function actionsBlock(a, alts, key) {
    return h('div', { class: 'actions' }, [IL.actBtn(a, 'primary', key)].concat((alts || []).map(function (x) { return IL.actBtn(x, '', key); })));
  }
  // one signal, on its own
  IL.openSignal = function (s, key) {
    var pic = IL.picture(s), body = [h('p', { class: 'sub', style: 'margin-bottom:10px' }, s.why), pic ? h('div', null, pic) : null];
    if (s.facts) body.push(factsBlock(s.facts));
    if (s.sids.length) body.push(IL.section(U.plural(s.sids.length, 'student'), C.named(s.sids, '', 24)));
    body.push(actionsBlock(s.act, s.alts, key));
    if (key) body.push(triage(key));
    IL.drawer(s.text, s.sub, body, IL.laneTag(s.lane));
  };
  // a theme: one cause, its evidence underneath, one recommended action
  IL.openTheme = function (th) {
    var body = [], lead = th.members[0];
    if (th.people) {
      body.push(h('p', { class: 'sub', style: 'margin-bottom:10px' }, 'One row per student, with every reason they are here. Students nobody has followed up yet come first.'));
      body.push(h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Student'), h('th', null, 'Why'), h('th', null, ''))),
        h('tbody', null, th.people.map(function (x) {
          return h('tr', null, h('td', { style: 'white-space:nowrap' }, x.off ? IL.nm(x.sid) : IL.who(x.sid, th.sids)), h('td', null, x.reasons.join('; ')),
            h('td', null, x.treated ? h('span', { class: 'tag' }, 'followed up') : x.off ? h('span', { class: 'tag' }, 'not on roster') : h('span', { class: 'tag warn' }, 'no action yet')));
        }))));
      body.push(IL.section('Where each reason comes from', th.members.map(function (s) {
        return h('div', { class: 'ev-row' }, h('span', null, s.text), h('button', { class: 'link-btn', on: { click: function () { IL.openSignal(s); } } }, 'Evidence'));
      })));
    } else if (th.members.length > 1) {
      body.push(h('p', { class: 'sub', style: 'margin-bottom:10px' }, 'These findings share a skill, or build on one the class is weak on and involve largely the same students. They are shown as one so they get one response.'));
      var pic = IL.picture(lead);
      if (pic) body.push(h('div', null, pic));
      body.push(IL.section('Evidence · ' + U.plural(th.members.length, 'finding'), th.members.map(function (s) {
        return h('div', { class: 'ev-row' }, h('span', null, h('b', null, s.text), h('small', null, s.sub)), h('button', { class: 'link-btn', on: { click: function () { IL.openSignal(s); } } }, 'Open'));
      })));
    } else {
      body.push(h('p', { class: 'sub', style: 'margin-bottom:10px' }, lead.why));
      var p1 = IL.picture(lead);
      if (p1) body.push(h('div', null, p1));
    }
    if (th.followup && !th.people) body.push(h('p', { class: 'note' }, h('b', null, 'Already followed up: '), th.followup.action.title + ' on ' + T.fmtDay(th.followup.action.day) + '. ',
      h('a', { on: { click: function () { IL.closeDrawer(); IL.go({ tab: 'followups', focus: 'fu-' + th.followup.action.id }); } } }, 'See what happened')));
    if (lead.facts && !th.people) body.push(factsBlock(lead.facts));
    if (!th.people && th.sids.length) body.push(IL.section(U.plural(th.sids.length, 'student') + ' involved', C.named(th.sids, '', 24)));
    body.push(h('div', { class: 'dr-sec' }, h('h4', null, 'Recommended'), actionsBlock(th.act, th.alts, th.key)));
    body.push(triage(th.key));
    IL.drawer(th.text, th.people ? null : th.sub, body, IL.laneTag(th.lane));
  };
  // a row for a theme, used by the Brief lists
  IL.themeRow = function (th, rank, compact) {
    var ev = compact ? [null, null] : IL.evidence(th);
    return h('div', { class: 'q-row' + (compact ? ' compact' : ''), tabindex: 0, role: 'button', 'data-theme': th.id, on: { click: function () { IL.openTheme(th); }, keydown: function (e) { if (e.key === 'Enter' && e.target === e.currentTarget) IL.openTheme(th); } } },
      h('span', { class: 'rank' }, rank ? String(rank) : ''),
      h('span', { class: 'text' }, h('span', { class: 'tagline' }, IL.laneTag(th.lane), th.followup ? h('span', { class: 'tag' }, 'followed up ' + T.fmtDay(th.followup.action.day)) : null), th.text, compact ? null : h('small', null, th.sub)),
      compact ? null : h('span', { class: 'glyph' }, ev[0], ev[1]),
      IL.actBtn(th.act, compact ? 'small' : 'primary small', th.key));
  };

  root.addEventListener('hashchange', function () { readHash(); IL.render(); });
  IL.boot = function () { readHash(); IL.render(); };
})(typeof window !== 'undefined' ? window : globalThis);

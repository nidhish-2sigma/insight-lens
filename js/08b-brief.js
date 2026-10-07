/* Insight Lens mock · the Brief: how the class is doing, then what needs the teacher, with the analysis and
   the action side by side. Rows are drawn by the shared row (05b-rows); themes, ranking and actions come from
   the shared insight records (04b-insights).

   The earlier Brief is no longer a tab, and still opens from its link: index.html#/s1/briefOld */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, M = IL.M, h = IL.h, C = IL.C, pct = IL.pct, R = IL.R;
  if (!root.document) return;
  var plural = U.plural, cap = R.cap, and = R.and;
  // how many rows each list opens with; the rest are one click away
  var VISIBLE = { teach: 3, people: 2 };

  function facts(s) {
    return s.facts ? h('div', { class: 'facts' }, s.facts.map(function (f) { return h('div', null, h('span', null, f[0]), h('span', null, String(f[1])), h('span', null, f[2] || '')); })) : null;
  }
  // A weak skill in full: every question behind the figure, weakest first, and the later skills that need it.
  function skillDetail(g, m) {
    var world = IL.world, out = [], qs = g.items.map(function (it) { var a = m.b.itemAgg[it.id]; return a && a.n ? { it: it, a: a } : null; }).filter(Boolean).sort(U.by(function (x) { return x.a.ok / x.a.n; }));
    var name = function (k) { return world.skills[k].name; };
    if (qs.length) {
      out.push(h('h5', null, 'The ' + plural(qs.length, 'question') + ' on this skill · students right first time'));
      out.push(R.bars(qs.map(function (x) { return { label: x.it.name, v: x.a.ok / x.a.n, text: x.a.ok + ' of ' + x.a.n, tone: 'blue', tip: 'Open this question', onClick: function () { IL.ev.item(x.it.id); } }; }), 1, { cls: 'wide' }));
    }
    var tb0 = IL.cur.sec.textbooks[0].tb, where = U.uniq((g.skill.taught || []).concat(g.skill.assessed || [])).map(function (id) { return tb0.subs[id]; }).filter(Boolean);
    if (where.length) {
      out.push(h('h5', null, 'Where it sits in ' + tb0.short));
      out.push(h('p', { class: 'ia-list' }, where.map(function (sb, i) {
        return [i ? ' · ' : '', h('a', { on: { click: function () { IL.state.view.gridTb = tb0.id; IL.state.view.path = [sb.chapter, sb.id]; IL.go({ tab: 'understanding', focus: 'UN-1' }); } } }, sb.code + ' ' + sb.name)];
      })));
    }
    if (g.blocked.length) { out.push(h('h5', null, plural(g.blocked.length, 'later skill') + ' that ' + (g.blocked.length === 1 ? 'needs' : 'need') + ' it')); out.push(h('p', { class: 'ia-list' }, g.blocked.map(name).join(' · '))); }
    if (g.inSkipped.length) out.push(h('p', { class: 'sub' }, 'Not counted, because the class skipped their unit: ' + g.inSkipped.map(name).join(' · ')));
    return out;
  }
  // the full analysis, opened in place under its row
  function detail(th, m) {
    var lead = th.members[0], a = th.act, left = [], right = [], gs = th.members.filter(function (s) { return R.kindOf(s) === 'gap'; })[0];
    if (th.people) {
      left.push(h('h5', null, 'Every student, with every reason they are here'));
      left.push(h('table', { class: 't' }, h('tbody', null, th.people.map(function (x) {
        return h('tr', null, h('td', { style: 'white-space:nowrap' }, x.off ? IL.nm(x.sid) : IL.who(x.sid, th.sids)), h('td', null, x.reasons.join('; ')),
          h('td', null, x.treated ? h('span', { class: 'tag' }, 'followed up') : x.off ? h('span', { class: 'tag' }, 'not on roster') : h('span', { class: 'tag warn' }, 'no action yet')));
      }))));
    } else {
      if (th.members.length > 1) {
        left.push(h('h5', null, 'The ' + th.members.length + ' findings behind this row'));
        left.push(h('ul', { class: 'ia-found' }, th.members.map(function (s) { return h('li', null, h('b', null, s.text), s.sub ? h('span', null, s.sub) : null); })));
      }
      if (gs) left = left.concat(skillDetail(gs.data, m));
      else {
        var pic = IL.picture(lead), fx = facts(lead);
        if (pic) { left.push(h('h5', null, 'In more detail')); left.push(h('div', { class: 'ia-pic' }, pic)); }
        if (fx) { left.push(h('h5', null, 'The numbers used')); left.push(fx); }
      }
    }
    var targets = a && a.targets ? a.targets : th.sids;
    if (a && a.whole) right.push(h('h5', null, 'Goes to the whole class'));
    else if (targets.length) { right.push(h('h5', null, plural(targets.length, 'student') + ' this goes to')); right.push(C.named(targets, '', 30)); }
    if (th.alts && th.alts.length) { right.push(h('h5', null, 'Other things you could do')); right.push(h('div', { class: 'actions' }, th.alts.map(function (x) { return R.doBtn(x, th.key); }))); }
    if (lead.why) { right.push(h('h5', null, 'How this is worked out')); right.push(h('p', { class: 'sub' }, lead.why)); }
    right.push(h('div', { class: 'actions ia-triage' },
      h('button', { class: 'btn small', tip: 'I have dealt with this', on: { click: function () { IL.setTheme(th.key, 'done', 'Marked done.'); } } }, 'Done'),
      h('button', { class: 'btn small', tip: 'Set aside; it comes back if it is still true next week', on: { click: function () { IL.setTheme(th.key, 'later', 'Set aside. It comes back if it is still true next week.'); } } }, 'Not now')));
    return h('div', { class: 'ia-detail' }, h('div', null, left), h('div', null, right));
  }
  function themeRow(th, rank, primary, ctx) {
    var st = ctx.st, key = 'wk:' + th.id, open = !!st.expand[key], p = R.theme(th, ctx), a = th.act, alt = th.alts && th.alts[0];
    return R.line({ id: th.id, rank: rank, cls: open ? 'open' : '', title: p.title, chips: p.chips, tags: p.tags, evid: p.evid,
      more: R.moreBtn(open, function () { st.expand[key] = !open; IL.render(); }),
      btn: a ? R.doBtn(a, th.key, primary) : null, why: p.why, linked: p.linked, size: R.actSize(a), alt: alt ? R.altLink(alt, th.key) : null,
      detail: open ? detail(th, ctx.m) : null });
  }

  // Practice sets raised by separate weak skills usually name many of the same students. One set, where each
  // student gets their own weakest of those skills, replaces them.
  function combine(vis, ctx) {
    var sets = vis.filter(function (th) { return th.act && th.act.kind === 'builder' && th.act.recipe === 'Remediation' && !th.act.whole; });
    if (sets.length < 2) return null;
    var count = {};
    sets.forEach(function (th) { th.act.targets.forEach(function (sid) { count[sid] = (count[sid] || 0) + 1; }); });
    var all = Object.keys(count), multi = all.filter(function (sid) { return count[sid] > 1; }), N = ctx.m.roster.length;
    if (!multi.length) return null;
    var skills = U.uniq([].concat.apply([], sets.map(function (th) { return th.act.skills; })));
    var a = { kind: 'builder', verb: 'Remediation for', recipe: 'Remediation', minutes: 20, targets: all, skills: skills, reason: 'each student’s weakest of ' + skills.length + ' skills', whole: all.length === N && N > 1 };
    return R.line({ cls: 'ia-combine', title: 'These ' + sets.length + ' practice sets overlap',
      evid: R.bars([{ label: 'In two or more sets', v: multi.length, text: multi.length + ' of ' + all.length, tone: 'amber', hot: true, tip: IL.names(multi, 14) },
        { label: 'In one set only', v: all.length - multi.length, text: (all.length - multi.length) + ' of ' + all.length, tone: 'grey' }], all.length, { cap: 'The ' + all.length + ' students they name' }),
      btn: R.doBtn(a, null, false, 'One combined set for ' + R.whoWords(a)), linked: true,
      why: 'Each student gets their own weakest of these skills, in one set.', size: '20 min, in place of the ' + sets.length + ' above' });
  }

  // ---------- how the class is doing: four readings, one form ----------
  function badge(state) {
    var w = { ok: ['✓', 'On track'], att: ['!', 'Needs attention'], na: ['–', 'No data yet'] }[state];
    return h('span', { class: 'wk-badge ' + state }, h('i', null, w[0]), w[1]);
  }
  var meter = R.meter;
  function tile(o) {
    return h('div', { class: 'wk-tile', tabindex: 0, role: 'link', on: { click: o.go, keydown: function (e) { if (e.key === 'Enter' && e.target === e.currentTarget) o.go(); } } },
      h('div', { class: 'wk-top' }, h('span', { class: 'wk-lab' }, o.label), badge(o.state)),
      o.empty ? h('p', { class: 'empty' }, o.empty) : [h('div', { class: 'wk-num' }, h('b', null, o.big), h('span', null, o.unit)), o.bar || null, h('div', { class: 'wk-foot' }, o.foot)],
      o.extra || null);
  }
  function status(ctx) {
    var m = ctx.m, ins = ctx.ins, st = ctx.st, p = m.pulse, cards = ins.cards, vt = ins.vsTypical, w = m.waiting, tiles = [];
    var win = M.windows.filter(function (x) { return x.id === st.win; })[0], winWords = win ? win.label.toLowerCase().replace(/^last /, 'the last ') : 'this window';
    var inactive = cards['BR-1a'].rows || [];
    tiles.push({ name: 'showing up', label: 'Showing up', state: cards['BR-1a'].fired ? 'att' : 'ok', go: function () { IL.go({ tab: 'engagement' }); },
      big: p.active.n + ' of ' + p.active.of, unit: 'students active last class week', bar: meter([{ v: p.active.of ? p.active.n / p.active.of : 0, tone: 'blue' }]),
      foot: inactive.length ? ['Not active: ', IL.whoList(inactive, 3)] : 'Everyone was active.' });
    var wk = cards['BR-1b'], pw = p.work, started = pw.onTime + pw.late;
    tiles.push({ name: 'assigned work', label: 'Assigned work', state: !wk.ok || !pw.cells ? 'na' : wk.fired ? 'att' : 'ok', go: function () { IL.go({ tab: 'progress' }); },
      empty: !wk.ok ? wk.nodata : !pw.cells ? 'Nothing was due in ' + winWords + '.' : null,
      big: pw.cells ? pct(started / pw.cells) : '', unit: 'of assigned work started',
      bar: pw.cells ? meter([{ v: pw.onTime / pw.cells, tone: 'blue', tip: 'Started on time: ' + pct(pw.onTime / pw.cells) }, { v: pw.late / pw.cells, tone: 'part', tip: 'Started after the due date: ' + pct(pw.late / pw.cells) }]) : null,
      foot: pw.cells ? pct(pw.none / pw.cells) + ' not started · ' + plural(pw.assignments, 'assignment') + ' due' : null });
    var val = vt.gap != null ? p.fts.classOnNorm : p.fts.p;
    tiles.push({ name: 'understanding', label: 'Understanding', state: p.fts.p == null ? 'na' : vt.tone === 'bad' || vt.tone === 'warn' ? 'att' : 'ok', go: function () { IL.go({ tab: 'understanding' }); },
      empty: p.fts.p == null ? 'No graded answers in ' + winWords + '.' : null,
      big: pct(val), unit: 'of answers right first time', bar: p.fts.p == null ? null : meter([{ v: val, tone: vt.tone === 'bad' || vt.tone === 'warn' ? 'amber' : 'blue' }], vt.gap != null ? p.fts.norm : null, 'Typical on the same questions: ' + pct(p.fts.norm)),
      foot: vt.gap != null ? ['Typical: ' + pct(p.fts.norm) + ' ', h('span', { class: 'wk-key' }, '(black line)')] : 'No typical results to compare with yet.' });
    var adm = ins.admin[0], wait = [w.toGrade ? 'oldest ' + plural(w.oldestDays, 'day') : null, w.questions.length ? plural(w.questions.length, 'question') : null, w.failed.length ? plural(w.failed.length, 'auto-grade failure') : null].filter(Boolean);
    tiles.push({ name: 'grading', label: 'Waiting on you', state: cards['BR-1d'].fired ? 'att' : 'ok', go: function () { IL.go({ tab: 'progress', focus: 'PR-7' }); },
      big: String(w.toGrade), unit: w.toGrade === 1 ? 'submission to grade' : 'submissions to grade', foot: wait.length ? cap(wait.join(' · ')) : 'Nothing is waiting.',
      extra: adm ? h('div', { class: 'wk-act' }, R.doBtn(adm.act, null, false)) : null });
    var fine = tiles.filter(function (t) { return t.state === 'ok'; }).map(function (t) { return t.name; }), att = tiles.filter(function (t) { return t.state === 'att'; }).map(function (t) { return t.name; });
    var verdict = !att.length ? 'The class is on track this week.' : !fine.length ? cap(and(att)) + ' all need attention.'
      : cap(and(fine)) + (fine.length > 1 ? ' are' : ' is') + ' on track. ' + cap(and(att)) + (att.length > 1 ? ' need' : ' needs') + ' attention.';
    return h('section', { class: 'card wk-status' },
      h('div', { class: 'wk-verdict' }, h('h3', null, verdict), h('span', { class: 'sub' }, 'Week of ' + T.fmtDay(p.week * 7) + ' · ' + m.roster.length + ' students')),
      h('div', { class: 'wk-tiles' }, tiles.map(tile)));
  }

  // ---------- the tab ----------
  IL.tabs.briefOld = IL.tabs.brief;
  IL.tabs.briefOld.label = 'Earlier Brief';
  // the earlier Brief follows the Window control exactly as it did under its own name
  var usesWindow = IL.usesWindow;
  IL.usesWindow = function (tab, ins) { return usesWindow(tab === 'briefOld' ? 'brief' : tab, ins); };

  IL.tabs.brief = { label: 'Brief', question: 'What needs me this week, and why?',
    render: function (el, ctx) {
      var m = ctx.m, st = ctx.st, ins = ctx.ins;
      var toggle = function (k) { return function () { st.more[k] = !st.more[k]; IL.render(); }; };
      el.appendChild(h('p', { class: 'question' }, h('b', null, this.label), this.question));
      el.appendChild(status(ctx));

      var card = h('section', { class: 'card ia', 'data-card': 'BR-2' });
      card.appendChild(R.head());
      ['teach', 'people'].forEach(function (name) {
        var all = ins.lists[name].top, key = 'wk-' + name, open = !!st.more[key], vis = open ? all : all.slice(0, VISIBLE[name]);
        card.appendChild(R.secHead(ins.lists[name].title, all.length));
        if (!all.length) card.appendChild(h('p', { class: 'empty ia-empty' }, name === 'teach' ? 'Nothing class-wide needs reteaching or fixing this week.' : 'No one needs a check-in this week.'));
        vis.forEach(function (th, i) { card.appendChild(themeRow(th, i + 1, i === 0, ctx)); });
        if (name === 'teach') { var one = combine(vis, ctx); if (one) card.appendChild(one); }
        if (all.length > VISIBLE[name]) card.appendChild(R.moreRow(open ? 'Show the top ' + VISIBLE[name] + ' only' : (all.length - VISIBLE[name]) + ' more', open, toggle(key)));
      });
      var due = m.followups.filter(function (f) { return f.status === 'recheck due'; });
      if (due.length) {
        card.appendChild(R.secHead('Did it work?', due.length));
        due.forEach(function (f) { card.appendChild(R.follow(f, ctx)); });
      }
      var good = ins.good.filter(function (g) { return !g.state; });
      if (good.length) {
        card.appendChild(R.secHead('Good news', good.length));
        good.forEach(function (g) {
          var p = R.signal(g, ctx);
          card.appendChild(R.line({ id: g.id, title: p.title, evid: p.evid, btn: R.doBtn(g.act, g.key, false), why: p.why, size: R.actSize(g.act) }));
        });
      }
      el.appendChild(card);

      // everything else stays one click away: lower-impact findings, what was dealt with, what changed
      var rest = h('section', { class: 'card ia ia-rest' });
      if (ins.rest.length) {
        var rOpen = !!st.more['wk-rest'];
        rest.appendChild(R.moreRow(ins.rest.length + ' more findings, lower impact', rOpen, toggle('wk-rest')));
        if (rOpen) ins.rest.forEach(function (th) { rest.appendChild(themeRow(th, null, false, ctx)); });
      }
      var handled = ins.handled.concat(ins.good.filter(function (g) { return g.state; }));
      if (handled.length) {
        var hOpen = !!st.more['wk-handled'];
        rest.appendChild(R.moreRow(handled.length + ' dealt with or set aside in this session', hOpen, toggle('wk-handled')));
        if (hOpen) handled.forEach(function (th) {
          rest.appendChild(h('div', { class: 'ia-compact' }, h('span', null, h('span', { class: 'tag' }, th.state === 'done' ? 'done' : th.state === 'later' ? 'not now' : 'not relevant'), ' ' + th.text),
            h('button', { class: 'link-btn', on: { click: function () { delete st.cards[th.key]; IL.render(); } } }, 'Put back')));
        });
      }
      var s = m.since, ch = [];
      s.resolved.slice(0, 3).forEach(function (x) { ch.push(h('div', null, h('span', { class: 'mk ok' }, '✓'), h('span', null, 'Not started on “' + x.a.short + '”'), h('b', null, x.then + ' → ' + x.now + ' students'))); });
      s.grew.slice(0, 2).forEach(function (x) { ch.push(h('div', null, h('span', { class: 'mk up' }, '▲'), h('span', null, 'Still failing “' + x.item.name + '”'), h('b', null, x.then + ' → ' + x.now + ' students'))); });
      if (s.joined.length) ch.push(h('div', null, h('span', { class: 'mk new' }, '+'), h('span', null, IL.whoList(s.joined), ' joined the roster'), h('span')));
      ch.push(h('div', null, h('span', { class: 'mk new' }, '+'), h('span', null, 'New work from ' + plural(s.newWork.students, 'student')), h('b', null, s.newWork.attempts + ' questions answered')));
      var sOpen = !!st.more['wk-since'];
      rest.appendChild(R.moreRow(plural(ch.length, 'change') + ' since your last visit, ' + T.fmtDayLong(T.day(s.t)), sOpen, toggle('wk-since')));
      if (sOpen) rest.appendChild(h('div', { class: 'changes ia-since' }, ch));
      el.appendChild(rest);
    } };
})(typeof window !== 'undefined' ? window : globalThis);

/* Insight Lens mock · world generator.
   Builds two sections and simulates twelve weeks of student work at attempt level, so every number in the
   Lens is computed from events (and reconciles across views) rather than typed in. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U, T = IL.T, C = IL.content;

  var NOW = T.at(84, 7, 30);          // Monday 16 Nov 2026, 07:30: the weekly-brief moment
  var LAST_VISIT = T.at(78, 16, 0);   // the teacher last opened the Lens on Tuesday afternoon
  var WEEKS = 12;

  var TYPE_EASE = { mchoice: 0.45, fillintheblank: 1.6, dragndrop: 1.2, parsonsprob: -0.6, activecode: -0.75, shortanswer: 0 };
  var DOK_EASE = { 1: 0.4, 2: 0, 3: -0.45 };
  var TYPE_MIX = {
    java: [['mchoice', 0.40], ['activecode', 0.28], ['parsonsprob', 0.12], ['fillintheblank', 0.11], ['dragndrop', 0.09]],
    python: [['mchoice', 0.44], ['activecode', 0.24], ['parsonsprob', 0.14], ['fillintheblank', 0.14], ['dragndrop', 0.04]]
  };
  var DOK_MIX = { mchoice: [0.25, 0.5, 0.25], fillintheblank: [0.6, 0.4, 0], dragndrop: [0.7, 0.3, 0], parsonsprob: [0, 0.6, 0.4], activecode: [0, 0.35, 0.65], shortanswer: [0, 0.3, 0.7] };
  var EST = { mchoice: 60, fillintheblank: 45, dragndrop: 60, parsonsprob: 120, activecode: 300, shortanswer: 360 };

  // ---------- curricula and skills ----------
  function buildCurricula() {
    var skills = {}, tbs = {};
    Object.keys(C.textbooks).forEach(function (id) {
      var spec = C.textbooks[id];
      var tb = { id: id, name: spec.name, short: spec.short, kind: spec.kind, lang: spec.lang, set: spec.set, accent: spec.accent,
        supplemental: !!spec.supplemental, itemType: spec.itemType || null, perSub: spec.perSub || 10, ease: spec.ease || 0, chapters: [], subs: {} };
      spec.chapters.forEach(function (ch) {
        var chapter = { id: id + ':' + ch[0], num: ch[0], name: ch[1], tb: id, subs: [] };
        ch[2].forEach(function (s) {
          var sub = { id: id + ':' + s[0], code: s[0], name: s[1], tb: id, chapter: chapter.id, chapterNum: ch[0], skills: [], taughtOnly: [] };
          s[2].split('|').forEach(function (raw) {
            var only = raw.charAt(0) === '~';
            var nm = only ? raw.slice(1) : raw;
            var sid = spec.set + ':' + nm;
            var sk = skills[sid] || (skills[sid] = { id: sid, name: nm, set: spec.set, taught: [], assessed: [], prereqs: [], dependents: [] });
            if (!tb.supplemental) sk.taught.push(sub.id);
            if (!only) sk.assessed.push(sub.id);
            sub.skills.push(sid);
            if (only) sub.taughtOnly.push(sid);
          });
          chapter.subs.push(sub);
          tb.subs[sub.id] = sub;
        });
        tb.chapters.push(chapter);
      });
      tbs[id] = tb;
    });
    function link(a, b) {
      if (!skills[a] || !skills[b] || a === b) return;
      if (skills[b].prereqs.indexOf(a) < 0) { skills[b].prereqs.push(a); skills[a].dependents.push(b); }
    }
    Object.keys(C.edges).forEach(function (set) {
      C.edges[set].forEach(function (e) { link(set + ':' + e[0], set + ':' + e[1]); });
    });
    // inside one subunit, later skills lean on the first one
    Object.keys(tbs).forEach(function (id) {
      var tb = tbs[id];
      if (tb.supplemental) return;
      tb.chapters.forEach(function (ch) {
        ch.subs.forEach(function (sub) {
          for (var i = 1; i < sub.skills.length; i++) link(sub.skills[0], sub.skills[i]);
        });
      });
    });
    return { textbooks: tbs, skills: skills };
  }

  // ---------- students ----------
  function personaOf(p, i) {
    var out = {};
    Object.keys(p).forEach(function (k) {
      if (k === 'joined') { if (p.joined[i] != null) out.joined = p.joined[i]; }
      else if (p[k].indexOf(i) >= 0) out[k] = p[k].indexOf(i) + 1;
    });
    return out;
  }

  function makeStudents(sec, spec, rng) {
    sec.students = {}; sec.all = [];
    var quietDays = [67, 60, 63];
    spec.students.forEach(function (full, i) {
      var parts = full.split(' ');
      var p = personaOf(spec.personas, i);
      var theta = U.clamp(rng.normal() * spec.thetaSd + spec.thetaShift, -1.9, 1.9);
      var st = {
        id: spec.id + '-' + (i + 1), idx: i, first: parts[0], last: parts[1], name: parts[0] + ' ' + parts[1].charAt(0) + '.', full: full,
        initials: parts[0].charAt(0) + parts[1].charAt(0), theta: theta,
        diligence: U.clamp(0.955 + rng.normal() * 0.03, 0.82, 0.995), finish: U.clamp(0.9 + rng.normal() * 0.06, 0.6, 0.985),
        guess: rng() * 0.3, fast: U.clamp((spec.fastFirst || 0.03) * (0.35 + rng() * 1.5), 0, 0.6),
        quit: 0.02 + rng() * 0.05, late: rng() * 0.22, pace: U.clamp(Math.exp(rng.normal() * 0.38 + 0.42 * theta), 0.45, 2.4),
        persona: p, rostered: !p.offRoster, never: !!p.never, joined: p.joined || 0, quietFrom: null, skip: {}
      };
      if (p.grind) { st.theta = -1.05 - rng() * 0.35; st.pace = 1.75 + rng() * 0.3; st.diligence = 0.992; st.finish = 0.975; st.quit = 0.012; st.fast = 0.01; st.guess = 0.05; }
      if (p.coast) { st.theta = 1.0 + rng() * 0.45; st.pace = 0.58; }
      if (p.ready) { st.theta = Math.max(st.theta, 1.25 + rng() * 0.3); st.diligence = 0.995; st.finish = 0.985; }
      if (p.guess) { st.guess = 0.78 + rng() * 0.18; st.fast = 0.4 + rng() * 0.14; }
      if (p.late) st.late = 0.72 + rng() * 0.2;
      if (p.stuck) { st.theta = Math.min(st.theta, -0.55); st.quit = 0.01; }
      if (p.quiet) st.quietFrom = quietDays[(p.quiet - 1) % quietDays.length];
      if (p.offRoster) st.quietFrom = 23;
      sec.students[st.id] = st;
      sec.all.push(st);
    });
    sec.roster = sec.all.filter(function (s) { return s.rostered; });
  }

  function ability(st, t) {
    var day = t / 1440, ramp = U.clamp((day - 63) / 10, 0, 1);
    return st.theta + (st.persona.slip ? -1.25 * ramp : 0) + (st.persona.rise ? 1.1 * ramp : 0);
  }

  // ---------- items ----------
  function pickWeighted(rng, pairs) { return pairs[rng.weighted(pairs.map(function (p) { return p[1]; }))][0]; }

  // Option text for generated multiple-choice questions, chosen by the kind of question. Uses no random draws.
  var OPTION_POOLS = {
    'predict the output': [['0 1 2 3', '1 2 3 4', '0 1 2', '1 2 3', 'Nothing is printed'], ['6', '10', '15', '5', 'An error is reported'], ['true', 'false', 'true true', 'false true', 'It does not compile']],
    'trace the code': [['x is 3, y is 7', 'x is 4, y is 7', 'x is 3, y is 8', 'x is 4, y is 8', 'The loop never ends'], ['count is 4', 'count is 5', 'count is 6', 'count is 0', 'count is never set']],
    'spot the error': [['Line 2', 'Line 4', 'Line 5', 'Line 7', 'There is no error'], ['The loop condition', 'The starting value', 'The update step', 'The return statement', 'There is no error']],
    'which is true': [['I only', 'II only', 'I and II only', 'II and III only', 'I, II and III'], ['Always true', 'True only when the list is empty', 'True only on the first pass', 'Never true', 'It depends on the input']]
  };
  function optionLabels(name, n, id, lang) {
    var kind = String(name).split(' · ')[1], pools = OPTION_POOLS[kind] || OPTION_POOLS['which is true'];
    var pool = pools[id % pools.length].slice();
    if (lang === 'python') pool = pool.map(function (x) { return x === 'It does not compile' ? 'A SyntaxError is raised' : x === 'An error is reported' ? 'An error is raised' : x; });
    return pool.slice(0, n);
  }
  // The most common failure should make sense for the question: an array question fails on an array index, and so on.
  function fittingError(name, lang, stage, picked) {
    if (stage !== 'runtime') return picked;
    var n = String(name).toLowerCase();
    if (lang === 'java') {
      if (/file|scanner/.test(n)) return 'NoSuchElementException';
      if (/substring|string|char/.test(n)) return 'StringIndexOutOfBoundsException';
      if (/array|travers|2d|loop bounds|index/.test(n)) return 'ArrayIndexOutOfBoundsException';
      if (/object|null|constructor|instance|reference|class/.test(n)) return 'NullPointerException';
      if (/division|remainder/.test(n)) return 'ArithmeticException';
      return 'NullPointerException';
    }
    if (/list|index|slic|string|travers|range/.test(n)) return 'IndexError';
    if (/division|average|remainder/.test(n)) return 'ZeroDivisionError';
    if (/variable|scope|function|parameter/.test(n)) return 'NameError';
    return 'TypeError';
  }

  function newItem(world, sec, rng, o) {
    var tb = world.textbooks[o.tb];
    sec._names = sec._names || {};
    var seen = (sec._names[o.name] = (sec._names[o.name] || 0) + 1);
    var item = { id: ++world._seq, tb: o.tb, chapter: o.chapter, sub: o.sub, subCode: o.subCode, name: seen > 1 ? o.name + ' (' + seen + ')' : o.name, type: o.type, dok: o.dok, skills: o.skills,
      b: o.b != null ? o.b : rng.normal() * 0.65, est: Math.round(EST[o.type] * (0.7 + rng() * 0.7)), action: o.action || null };
    var base = TYPE_EASE[item.type] + DOK_EASE[item.dok] - item.b + tb.ease;
    item.ease = base;
    var learners = tb.supplemental ? rng.int(90, 420) : rng.int(260, 1800);
    item.norm = { p: U.clamp(U.sigmoid(base + rng.normal() * 0.22), 0.04, 0.97), n: learners };
    item.pe = U.clamp(item.norm.p + (1 - item.norm.p) * (0.72 + rng() * 0.25), 0.3, 0.995);
    item.dp = U.clamp(0.42 + rng() * 0.5, 0, 1);
    var q = rng();
    if (q < 0.035 && item.norm.p < 0.4) { item.norm.p = 0.1 + rng() * 0.12; item.pe = 0.3 + rng() * 0.25; item.b += 0.9; item.ease -= 0.9; }
    else if (q < 0.08 && item.type !== 'activecode') { item.norm.p = 0.92 + rng() * 0.05; item.pe = 0.99; item.b -= 1.6; item.ease += 1.6; item.dp = 0.1 + rng() * 0.15; }
    else if (q < 0.15) { item.dp = 0.05 + rng() * 0.14; }
    if (item.type === 'mchoice') {
      var n = o.n || (rng.chance(0.3) ? 5 : 4);
      var key = o.key != null ? o.key : rng.int(0, n - 1);
      var w = [];
      for (var i = 0; i < n; i++) w.push(i === key ? 0 : 0.45 + 0.55 * rng());
      if (o.dominant) {
        var dom = o.wrong != null ? o.wrong : (key + 1) % n;
        var rest = (1 - o.dominant) / Math.max(1, n - 2);
        for (var j = 0; j < n; j++) w[j] = j === key ? 0 : j === dom ? o.dominant : rest;
      }
      item.opts = { n: n, key: key, w: w, labels: o.labels || optionLabels(o.name, n, item.id, tb.lang), stem: o.stem || null };
    }
    if (item.type === 'activecode') {
      var errs = C.errors[tb.lang];
      var stage = o.stage || (rng.chance(0.5) ? 'compile' : 'runtime');
      item.code = { tests: o.tests || rng.int(3, 5), hard: 0, err: o.err || fittingError(o.name, tb.lang, stage, rng.pick(errs[stage])), stage: stage, graded: o.graded !== false && (o.tests ? true : rng.chance(0.86)), lang: tb.lang };
      item.code.hard = o.hard || rng.int(2, item.code.tests);
    }
    sec.items[item.id] = item;
    sec.itemList.push(item);
    return item;
  }

  function assessable(sub) { return sub.skills.filter(function (s) { return sub.taughtOnly.indexOf(s) < 0; }); }

  function itemsForSub(world, sec, rng, tb, sub) {
    var out = [], pool = assessable(sub), sig = C.signature[sub.id] || [];
    sig.forEach(function (s) {
      out.push(newItem(world, sec, rng, { tb: tb.id, chapter: sub.chapter, sub: sub.id, subCode: sub.code, name: s.name, type: s.type, dok: s.dok,
        skills: [tb.set + ':' + s.skill], b: s.b, n: s.n, key: s.key, wrong: s.wrong, dominant: s.dominant, labels: s.labels, stem: s.stem,
        tests: s.tests, hard: s.hard, err: s.err, stage: s.stage }));
    });
    var k = 0;
    while (out.length < tb.perSub) {
      var type = tb.itemType || pickWeighted(rng, TYPE_MIX[tb.lang]);
      var dok = 1 + rng.weighted(DOK_MIX[type]);
      var main = pool[k % pool.length];
      var skills = [main];
      var sk = world.skills[main];
      if (rng.chance(0.45)) {
        var extra = sk.prereqs.length && rng.chance(0.6) ? rng.pick(sk.prereqs) : rng.pick(pool);
        if (extra !== main && world.skills[extra].assessed.length) skills.push(extra);
      }
      out.push(newItem(world, sec, rng, { tb: tb.id, chapter: sub.chapter, sub: sub.id, subCode: sub.code,
        name: sk.name + ' · ' + rng.pick(C.variants[type]), type: type, dok: dok, skills: skills }));
      k++;
    }
    return out;
  }

  // ---------- lesson plan and assignments ----------
  function isClassDay(sec, day) {
    return sec.spec.classDows.indexOf(((day % 7) + 7) % 7) >= 0 && sec.spec.quietWeeks.indexOf(Math.floor(day / 7)) < 0;
  }

  function eligibleOn(sec, day) {
    return sec.all.filter(function (s) { return s.joined <= day; }).map(function (s) { return s.id; });
  }

  function addAssignment(sec, a) {
    a.id = sec.id + '-w' + (sec.assignments.length + 1);
    a.dueT = T.at(a.dueDay, 23, 59);
    sec.assignments.push(a);
    return a;
  }

  function planLessons(world, sec, rng) {
    var spec = sec.spec, primary = world.textbooks[spec.textbooks[0].id];
    sec.openedSubs = [];
    spec.chapterOrder.forEach(function (num) {
      var ch = primary.chapters.filter(function (c) { return c.num === num; })[0];
      ch.subs.slice(0, spec.opened[num]).forEach(function (s) { sec.openedSubs.push(s); });
    });
    var days = [];
    for (var w = 0; w < WEEKS; w++) {
      if (spec.quietWeeks.indexOf(w) >= 0) continue;
      spec.lessonDows.forEach(function (d) { days.push(w * 7 + d); });
    }
    var perChapter = {};
    sec.openedSubs.forEach(function (sub, i) {
      var idx = perChapter[sub.chapterNum] = (perChapter[sub.chapterNum] == null ? 0 : perChapter[sub.chapterNum] + 1);
      var items = itemsForSub(world, sec, rng, primary, sub);
      addAssignment(sec, { name: 'ALPS ' + sub.code + ': ' + sub.name, short: sub.code + ' ' + sub.name, kind: 'lesson', tb: primary.id, chapter: sub.chapter, chapterNum: sub.chapterNum,
        sub: sub.id, day: days[i], dueDay: days[i] + spec.dueAfter, items: items.map(function (x) { return x.id; }), eligible: eligibleOn(sec, days[i]), lessonIdx: i, idxInChapter: idx, points: 10 });
    });
    sec.lessonCount = sec.openedSubs.length;

    spec.supp.forEach(function (s) {
      var tb = world.textbooks[s.tb], sub = tb.subs[s.tb + ':' + s.sub];
      var items = itemsForSub(world, sec, rng, tb, sub);
      sec.openedSubs.push(sub);
      addAssignment(sec, { name: tb.short + ' · ' + sub.code + ': ' + sub.name, short: sub.code + ' ' + sub.name, kind: 'supp', tb: tb.id, chapter: sub.chapter, chapterNum: sub.chapterNum,
        sub: sub.id, day: s.day, dueDay: s.due, items: items.map(function (x) { return x.id; }), eligible: eligibleOn(sec, s.day), use: s.use, points: 10 });
    });

    spec.specials.forEach(function (s) {
      var chapter, items, a;
      if (s.kind === 'abandoned') {
        var sub0 = primary.subs[primary.id + ':' + s.sub];
        var src = sec.assignments.filter(function (x) { return x.sub === sub0.id; })[0];
        addAssignment(sec, { name: s.name, short: s.name, kind: 'abandoned', tb: primary.id, chapter: sub0.chapter, chapterNum: sub0.chapterNum, sub: sub0.id,
          day: s.day, dueDay: s.due, items: src.items.slice(0, 6), eligible: eligibleOn(sec, s.day), points: 6 });
        return;
      }
      chapter = primary.chapters.filter(function (c) { return c.num === s.chapter; })[0];
      var pool = [];
      chapter.subs.slice(0, spec.opened[s.chapter]).forEach(function (sub) { assessable(sub).forEach(function (k) { pool.push([sub, k]); }); });
      items = [];
      for (var i = 0; i < s.n; i++) {
        var pk = pool[(i * 3 + 1) % pool.length];
        var frq = s.frq && i < s.frq;   // written questions come first, so most students reach them
        var type = frq ? 'shortanswer' : s.kind === 'quiz' ? (rng.chance(0.8) ? 'mchoice' : 'fillintheblank') : pickWeighted(rng, TYPE_MIX[primary.lang]);
        items.push(newItem(world, sec, rng, { tb: primary.id, chapter: chapter.id, sub: pk[0].id, subCode: pk[0].code,
          name: (frq ? 'Free response · ' : s.kind === 'quiz' ? 'Test · ' : 'Review · ') + world.skills[pk[1]].name,
          type: type, dok: frq ? 3 : 1 + rng.weighted(DOK_MIX[type]), skills: [pk[1]] }));
      }
      var elig = eligibleOn(sec, s.day);
      if (s.audienceCut) {
        var low = sec.roster.slice().sort(U.by(function (x) { return x.theta; })).slice(0, s.audienceCut).map(function (x) { return x.id; });
        elig = elig.filter(function (id) { return low.indexOf(id) < 0; });
        addAssignment(sec, { name: s.name + ' (supported version)', short: s.name + ' (supported)', kind: s.kind, tb: primary.id, chapter: chapter.id, chapterNum: s.chapter, sub: null,
          day: s.day, dueDay: s.due, items: items.map(function (x) { return x.id; }), eligible: low, use: s.use, points: 14, audience: 'support group' });
      }
      a = addAssignment(sec, { name: s.name, short: s.name, kind: s.kind, tb: primary.id, chapter: chapter.id, chapterNum: s.chapter, sub: null,
        day: s.day, dueDay: s.due, items: items.map(function (x) { return x.id; }), eligible: elig, use: s.use, points: s.kind === 'quiz' ? 20 : 14 });
    });
  }

  // ---------- simulation ----------
  function easeFor(world, sec, item) {
    var weak = 0, strong = 0;
    item.skills.forEach(function (sid) {
      var nm = world.skills[sid].name;
      if (sec.spec.weak[nm]) weak = Math.max(weak, sec.spec.weak[nm]);
      if (sec.spec.strong[nm]) strong = Math.max(strong, sec.spec.strong[nm]);
    });
    return item.ease - weak + strong;
  }

  function failInfo(item, rng, prev, sticky) {
    if (prev && rng.chance(sticky ? 0.85 : 0.3)) return prev;
    var r = rng();
    if (r < 0.5) return { err: item.code.err, stage: item.code.stage };
    if (r < 0.68) { var errs = C.errors[item.code.lang]; var stage = rng.chance(0.5) ? 'compile' : 'runtime'; return { err: rng.pick(errs[stage]), stage: stage }; }
    return { test: rng.chance(0.72) ? item.code.hard : rng.int(1, item.code.tests) };
  }

  function attemptItem(world, sec, st, item, t, rng, boost) {
    var z = ability(st, t) + (boost || 0) + easeFor(world, sec, item);
    var atts = [], pace = st.pace, spec = sec.spec;
    function push(durSec, ok, extra) {
      t += durSec / 60;
      var a = { t: t, ok: ok, dur: Math.round(durSec) };
      if (extra) Object.keys(extra).forEach(function (k) { a[k] = extra[k]; });
      atts.push(a);
    }
    function wrongPick(tried) {
      var w = item.opts.w.map(function (x, i) { return tried.indexOf(i) >= 0 || i === item.opts.key ? 0 : x; });
      return rng.weighted(w);
    }
    var ok, d, n, tried, quick;
    if (item.type === 'mchoice') {
      n = item.opts.n;
      var fast = rng.chance(st.fast);
      d = fast ? rng.range(2, 4.6) : U.clamp(rng.lognormal(20, 0.6) * pace, 6, 260);
      ok = rng.chance(fast ? 1 / n : U.sigmoid(z));
      tried = [ok ? item.opts.key : wrongPick([])];
      push(d, ok, { pick: tried[0] });
      while (!ok && tried.length < n) {
        if (rng.chance(st.quit)) break;
        quick = rng.chance(U.clamp(spec.retryFast + 0.5 * st.guess, 0, 0.95));
        d = quick ? rng.range(1, 2.9) : U.clamp(rng.lognormal(11, 0.6) * pace, 3.2, 120);
        var left = n - tried.length;
        ok = left === 1 ? true : rng.chance(quick ? 1 / left : 0.62);
        var pk = ok ? item.opts.key : wrongPick(tried);
        tried.push(pk);
        push(d, ok, { pick: pk });
      }
    } else if (item.type === 'fillintheblank' || item.type === 'dragndrop') {
      ok = rng.chance(U.sigmoid(z));
      push(U.clamp(rng.lognormal(item.type === 'dragndrop' ? 40 : 25, 0.5) * pace, 5, 240), ok);
      n = 1;
      while (!ok && n < 5) {
        if (rng.chance(st.quit * 1.5)) break;
        quick = rng.chance(spec.retryFast * 0.6 + 0.3 * st.guess);
        ok = rng.chance(quick ? 0.3 : 0.6);
        push(quick ? rng.range(1.2, 2.9) : U.clamp(rng.lognormal(14, 0.6) * pace, 3.2, 120), ok);
        n++;
      }
    } else if (item.type === 'parsonsprob') {
      ok = rng.chance(U.sigmoid(z));
      push(U.clamp(rng.lognormal(70, 0.5) * pace, 15, 500), ok);
      n = 1;
      while (!ok && n < 9) {
        if (rng.chance(st.quit * 2)) break;
        quick = rng.chance(spec.retryFast * 0.35 + 0.2 * st.guess);
        ok = rng.chance(quick ? 0.18 : 0.42);
        push(quick ? rng.range(1.5, 2.9) : U.clamp(rng.lognormal(24, 0.6) * pace, 3.2, 200), ok);
        n++;
      }
    } else if (item.type === 'activecode') {
      d = U.clamp(rng.lognormal(140 + 50 * item.dok, 0.5) * pace, 30, 900);
      if (!item.code.graded) {
        n = rng.int(1, 4);
        push(d, null);
        while (--n > 0) push(U.clamp(rng.lognormal(45, 0.6) * pace, 8, 300), null);
        return { attempts: atts, t: t };
      }
      var stuck = !!st.persona.stuck, info = null, run = 1;
      ok = rng.chance(U.sigmoid(z));
      if (!ok) info = failInfo(item, rng, null, stuck);
      push(d, ok, ok ? null : info);
      while (!ok && run < 34) {
        if (rng.chance(stuck ? 0.012 : st.quit * 1.6 + 0.03)) break;
        ok = rng.chance(U.clamp(U.sigmoid(z + 0.7 + 0.12 * run), 0.05, stuck ? 0.14 : 0.78));
        if (!ok) info = failInfo(item, rng, info, stuck);
        push(U.clamp(rng.lognormal(stuck ? 38 : 52, 0.6) * pace, 8, 400), ok, ok ? null : info);
        run++;
      }
      if (ok && rng.chance(stuck ? 0.34 : 0.045)) {   // kept editing after a pass and broke it
        push(U.clamp(rng.lognormal(70, 0.5) * pace, 10, 300), false, failInfo(item, rng, null, false));
        if (!stuck && rng.chance(0.55)) push(U.clamp(rng.lognormal(50, 0.5) * pace, 10, 300), true);
      }
    } else {  // shortanswer: written response waiting for the teacher
      push(U.clamp(rng.lognormal(210, 0.4) * pace, 60, 900), null, { written: true });
    }
    return { attempts: atts, t: t };
  }

  function startProb(sec, st, a) {
    if (st.never) return 0;
    if (st.quietFrom != null && a.day >= st.quietFrom) return 0;
    var p = st.diligence;
    if (a.kind === 'lesson') {
      if (st.skip[a.lessonIdx]) return 0;
      p *= 1 - 0.004 * a.idxInChapter;
      var dec = sec.spec.chapterDecay[a.chapterNum];
      if (dec) p *= dec.start[Math.min(a.idxInChapter, dec.start.length - 1)];
    }
    if (a.use != null) p *= a.use;
    return p;
  }

  function finishProb(sec, st, a) {
    var p = st.finish;
    if (a.kind === 'lesson') {
      var dec = sec.spec.chapterDecay[a.chapterNum];
      if (dec) p *= dec.finish[Math.min(a.idxInChapter, dec.finish.length - 1)];
    }
    return p;
  }

  function startTime(sec, st, a, rng) {
    var spec = sec.spec, late = st.late, w;
    if (a.kind === 'quiz') return { t: T.at(a.day, spec.classHour, rng.int(2, 8)), inClass: true };
    if (a.kind === 'action') w = [0.55, 0.3, 0.12, 0.03];
    else if (spec.mode === 'in-class') w = [Math.max(0.1, 0.8 - 0.62 * late), 0.13, 0.04 + 0.3 * late, 0.03 + 0.32 * late];
    else w = [Math.max(0.08, 0.5 - 0.35 * late), 0.26, 0.13 + 0.12 * late, 0.11 + 0.2 * late];
    if (a.kind === 'supp') w = [0.12, 0.5, 0.25, 0.13];
    var k = rng.weighted(w);
    if (k === 0) return { t: T.at(a.day, spec.classHour, rng.int(3, 16)), inClass: true };
    if (k === 1) return { t: T.at(a.day + rng.int(0, Math.max(0, a.dueDay - a.day - 1)), rng.int(16, 21), rng.int(0, 59)), inClass: false };
    if (k === 2) return { t: T.at(a.dueDay, rng.int(14, 23), rng.int(0, 58)), inClass: false };
    return { t: T.at(a.dueDay + rng.int(1, 4), rng.int(15, 21), rng.int(0, 59)), inClass: false };
  }

  function nextStart(sec, t, wasInClass, rng) {
    var day = T.day(t);
    if (wasInClass && rng.chance(0.5)) {
      var d = day + 1;
      while (!isClassDay(sec, d)) d++;
      return { t: T.at(d, sec.spec.classHour, rng.int(2, 10)), inClass: true };
    }
    var d2 = T.hour(t) < 17 ? day : day + 1;
    return { t: T.at(d2, rng.int(17, 21), rng.int(0, 59)), inClass: false };
  }

  function sessionEnd(sec, start, rng) {
    if (start.inClass) return T.at(T.day(start.t), sec.spec.classHour, sec.spec.classLen);
    return start.t + rng.int(22, 60);
  }

  function addRecord(sec, st, item, a, attempts) {
    var rec = { sid: st.id, item: item.id, asg: a.id, attempts: attempts };
    sec.records.push(rec);
    sec.recIndex.set(st.id + ':' + item.id, rec);
  }

  function simAssignment(world, sec, a, rng, boostFor) {
    if (a.kind === 'abandoned') return;
    a.eligible.forEach(function (sid) {
      var st = sec.students[sid];
      if (!rng.chance(startProb(sec, st, a))) return;
      var s = startTime(sec, st, a, rng);
      var t = s.t;
      if (!s.inClass && sec.spec.quietWeeks.indexOf(T.week(t)) >= 0 && rng.chance(0.85)) t += 7 * 1440;   // little gets done over a break
      if (t >= world.now) return;
      if (st.quietFrom != null && T.day(t) >= st.quietFrom) return;
      var all = rng.chance(finishProb(sec, st, a));
      var k = all ? a.items.length : Math.max(1, Math.round(a.items.length * rng.range(0.25, 0.8)));
      var end = sessionEnd(sec, s, rng), inClass = s.inClass;
      if (a.kind === 'lesson' || a.kind === 'supp') {
        var rd = U.clamp(rng.lognormal(3.6, 0.5) * st.pace, 1, 12);
        sec.reads.push({ sid: sid, t: t + rd, dur: Math.round(rd * 60), asg: a.id });
        t += rd;
      }
      for (var i = 0; i < k; i++) {
        if (t >= world.now) break;
        if (st.quietFrom != null && T.day(t) >= st.quietFrom) break;
        var item = sec.items[a.items[i]];
        if (sec.recIndex.has(sid + ':' + item.id)) continue;
        var res = attemptItem(world, sec, st, item, t, rng, boostFor ? boostFor(st) : 0);
        var kept = res.attempts.filter(function (x) { return x.t < world.now; });
        if (kept.length) addRecord(sec, st, item, a, kept);
        t = res.t;
        if (t > end && i < k - 1) {
          var ns = nextStart(sec, t, inClass, rng);
          t = ns.t; inClass = ns.inClass; end = sessionEnd(sec, ns, rng);
        }
      }
    });
  }

  // ---------- teacher actions already taken (so Follow-ups has real rechecks) ----------
  function clusterFts(sec, sid, skillIds, beforeT) {
    var n = 0, ok = 0;
    sec.records.forEach(function (r) {
      if (r.sid !== sid) return;
      var f = r.attempts[0];
      if (f.ok == null || f.t >= beforeT) return;
      var item = sec.items[r.item];
      if (item.action) return;
      if (item.skills.some(function (s) { return skillIds.indexOf(s) >= 0; })) { n++; if (f.ok) ok++; }
    });
    return { n: n, ok: ok, p: n ? ok / n : null };
  }

  function seedActions(world, sec, rng) {
    var spec = sec.spec, primary = world.textbooks[spec.textbooks[0].id];
    sec.actions = [];
    spec.actions.forEach(function (ac, k) {
      var action = { id: sec.id + '-act' + (k + 1), type: ac.type, title: ac.title, day: ac.day, t: T.at(ac.day, 15, 20), skills: [], students: [], asg: null,
        recheckDay: ac.day + (ac.recheckAfter || 7), seeded: true, reviewed: ac.day + (ac.recheckAfter || 7) < 78 };
      if (ac.who === 'quiet') {
        action.students = sec.roster.filter(function (s) { return s.persona.quiet === 1; }).map(function (s) { return s.id; });
        action.recheckDay = ac.day + 7; action.reviewed = false; action.kind = 'check-in';
        sec.actions.push(action);
        return;
      }
      action.skills = ac.skills.map(function (n) { return spec.set + ':' + n; });
      var cutoff = T.at(ac.day, 0, 0), pool;
      if (ac.who === 'class') pool = eligibleOn(sec, ac.day).filter(function (id) { return sec.students[id].rostered; });
      else {
        pool = sec.roster.filter(function (s) { return !s.never && s.joined <= ac.day && (s.quietFrom == null || s.quietFrom > ac.day + 3); })
          .map(function (s) { return { id: s.id, f: clusterFts(sec, s.id, action.skills, cutoff) }; })
          .filter(function (x) { return x.f.n >= 3; })
          .sort(U.by(function (x) { return x.f.p; })).slice(0, ac.who).map(function (x) { return x.id; });
      }
      action.students = pool;
      var sub = primary.subs[world.skills[action.skills[0]].taught[0]];
      var items = [];
      for (var i = 0; i < ac.n; i++) {
        var type = i % 3 === 2 ? 'parsonsprob' : i % 3 === 1 ? 'fillintheblank' : 'mchoice';
        var sid = action.skills[i % action.skills.length];
        items.push(newItem(world, sec, rng, { tb: primary.id, chapter: sub.chapter, sub: sub.id, subCode: sub.code, action: action.id,
          name: world.skills[sid].name + ' · new practice ' + (i + 1), type: type, dok: 2, skills: [sid], b: rng.normal() * 0.3 }));
      }
      var a = addAssignment(sec, { name: ac.title, short: ac.title, kind: 'action', tb: primary.id, chapter: sub.chapter, chapterNum: sub.chapterNum, sub: sub.id,
        day: ac.day + 1, dueDay: ac.day + 4, items: items.map(function (x) { return x.id; }), eligible: pool, use: ac.who === 'class' ? 0.95 : 0.99,
        audience: ac.who === 'class' ? null : 'group of ' + pool.length, points: 0, action: action.id });
      while (!isClassDay(sec, a.day)) { a.day++; a.dueDay++; a.dueT = T.at(a.dueDay, 23, 59); }
      action.asg = a.id;
      var skipOne = ac.who === 'class' ? null : pool[pool.length - 1];
      var flat = ac.who === 'class' ? null : pool[pool.length - 2];
      var boosts = {};
      pool.forEach(function (id) { boosts[id] = id === flat ? 0.05 : ac.boost * (0.75 + rng() * 0.5) + (ac.who === 'class' ? 0 : 0.35); });
      var saved = a.eligible;
      a.eligible = pool.filter(function (id) { return id !== skipOne; });
      simAssignment(world, sec, a, rng, function (st) { return boosts[st.id] || 0; });
      a.eligible = saved;
      sec.actions.push(action);
    });
  }

  // ---------- derived stores: activity, bands, things waiting on the teacher ----------
  function finalize(world, sec, rng) {
    var spec = sec.spec;
    // recorded activity, minute by minute, from attempts and reading
    var marks = {};
    function mark(sid, tEnd, durSec) {
      var m = marks[sid] || (marks[sid] = new Set());
      var a = Math.floor(tEnd - Math.min(durSec, 300) / 60), b = Math.floor(tEnd);
      for (var x = a; x <= b; x++) m.add(x);
    }
    sec.records.forEach(function (r) { r.attempts.forEach(function (a) { mark(r.sid, a.t, a.dur); }); });
    sec.reads.forEach(function (r) { if (r.t < world.now) mark(r.sid, r.t, r.dur); });
    sec.act = {};
    Object.keys(marks).forEach(function (sid) {
      var days = {};
      marks[sid].forEach(function (m) {
        var d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
        var o = days[d] || (days[d] = { min: 0, hours: {} });
        o.min++; o.hours[h] = (o.hours[h] || 0) + 1;
      });
      sec.act[sid] = days;
    });

    // first/last work per student and assignment
    sec.asgWork = {};
    sec.assignments.forEach(function (a) { sec.asgWork[a.id] = {}; });
    sec.records.forEach(function (r) {
      var w = sec.asgWork[r.asg][r.sid] || (sec.asgWork[r.asg][r.sid] = { t0: Infinity, t1: -Infinity, items: 0 });
      w.t0 = Math.min(w.t0, r.attempts[0].t - r.attempts[0].dur / 60);
      w.t1 = Math.max(w.t1, r.attempts[r.attempts.length - 1].t);
      w.items++;
    });

    // learner-model bands (section 1 only; section 2's skill set has no validated scores)
    sec.band = {};
    if (sec.bands) {
      var primary = world.textbooks[spec.textbooks[0].id];
      var units = [];
      primary.chapters.forEach(function (ch) { units.push({ id: ch.id, subs: ch.subs }); ch.subs.forEach(function (s) { units.push({ id: s.id, subs: [s] }); }); });
      var bySub = {};
      sec.records.forEach(function (r) {
        var it = sec.items[r.item];
        if (it.tb !== primary.id || r.attempts[0].ok == null) return;
        var k = r.sid + '|' + it.sub;
        var o = bySub[k] || (bySub[k] = { n: 0, ok: 0 });
        o.n++; if (r.attempts[0].ok) o.ok++;
      });
      sec.all.forEach(function (st) {
        units.forEach(function (u) {
          var n = 0, ok = 0;
          u.subs.forEach(function (s) { var o = bySub[st.id + '|' + s.id]; if (o) { n += o.n; ok += o.ok; } });
          if (!n) { sec.band[st.id + '|' + u.id] = { state: 'unattempted' }; return; }
          var coverage = Math.min(100, Math.round((100 * n) / (u.subs.length * primary.perSub)));
          var quality = U.clamp(0.5 + 0.085 * st.theta + 0.17 * (ok / n - 0.5) + rng.normal() * 0.03, 0.2, 0.9);
          var lvl = quality >= 0.62 ? 4 : quality >= 0.545 ? 3 : quality >= 0.485 ? 2 : quality >= 0.425 ? 1 : 0;
          var cap = coverage < 25 ? 1 : coverage < 50 ? 2 : coverage < 80 ? 3 : 4;
          sec.band[st.id + '|' + u.id] = { state: 'scored', level: Math.min(lvl, cap), raw: lvl, quality: Math.round(quality * 100), coverage: coverage, capped: lvl > cap };
        });
      });
    }

    // things waiting on the teacher
    sec.waiting = { questions: [], failed: [] };
    (spec.questions || []).forEach(function (q, i) {
      var st = sec.all[q.who];
      var cand = sec.records.filter(function (r) { return r.sid === st.id && sec.items[r.item].subCode === q.sub && sec.items[r.item].type === 'activecode'; })[0]
        || sec.records.filter(function (r) { return r.sid === st.id && sec.items[r.item].subCode === q.sub; })[0];
      if (cand) sec.waiting.questions.push({ sid: st.id, item: cand.item, asg: cand.asg, t: world.now - (i + 1) * 1440 - 400, text: q.text });
    });
    var recentCode = sec.records.filter(function (r) { var it = sec.items[r.item]; return it.type === 'activecode' && it.code.graded && r.attempts[0].t > T.at(63, 0, 0); });
    rng.shuffle(recentCode).slice(0, spec.gradingFailed || 0).forEach(function (r) { sec.waiting.failed.push({ sid: r.sid, item: r.item, asg: r.asg }); });

    // feedback given on code, and whether the student has opened it
    sec.feedback = [];
    var fbPool = rng.shuffle(sec.records.filter(function (r) { var it = sec.items[r.item]; return it.type === 'activecode' && it.code.graded && r.attempts[0].t > T.at(49, 0, 0); }));
    var seen = spec.feedbackSeen || [0, 0];
    fbPool.slice(0, seen[1]).forEach(function (r, i) {
      sec.feedback.push({ sid: r.sid, item: r.item, asg: r.asg, t: r.attempts[r.attempts.length - 1].t + 600, kind: i % 3 === 0 ? 'teacher' : 'AI', seen: i < seen[0] });
    });

    // one recorded paste, kept as a review cue only
    var paste = sec.records.filter(function (r) { var it = sec.items[r.item]; return it.type === 'activecode' && it.code.graded && r.attempts.length === 1 && r.attempts[0].ok && r.attempts[0].t > T.at(70, 0, 0); })[0];
    sec.markers = paste ? [{ sid: paste.sid, item: paste.item, asg: paste.asg, kind: 'large_paste', chars: 676, t: paste.attempts[0].t }] : [];
  }

  function buildSection(world, spec) {
    var rng = IL.rng(spec.seed);
    var sec = { id: spec.id, spec: spec, name: spec.name, period: spec.period, teacher: spec.teacher, set: spec.set, bands: spec.bands, mode: spec.mode,
      textbooks: spec.textbooks.map(function (x) { return { tb: world.textbooks[x.id], role: x.role }; }),
      items: {}, itemList: [], assignments: [], records: [], recIndex: new Map(), reads: [] };
    makeStudents(sec, spec, rng);
    planLessons(world, sec, rng);
    // students with a run of unstarted assignments
    sec.all.forEach(function (st) {
      if (!st.persona.streak) return;
      var last = sec.lessonCount - 1;
      if (st.persona.streak === 1) { st.skip[last] = st.skip[last - 1] = st.skip[last - 2] = true; }
      else { st.skip[last - 1] = st.skip[last - 2] = true; }
    });
    sec.assignments.slice().sort(U.by(function (a) { return a.day; })).forEach(function (a) { simAssignment(world, sec, a, rng); });
    seedActions(world, sec, rng);
    finalize(world, sec, rng);
    return sec;
  }

  IL.generate = function () {
    var cur = buildCurricula();
    var world = { now: NOW, lastVisit: LAST_VISIT, weeks: WEEKS, textbooks: cur.textbooks, skills: cur.skills, sections: [], _seq: 1000 };
    C.sections.forEach(function (spec) { world.sections.push(buildSection(world, spec)); });
    return world;
  };
})(typeof window !== 'undefined' ? window : globalThis);

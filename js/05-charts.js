/* Insight Lens mock · the eleven visual forms, plus a small DOM helper.
   Marks follow the design document, section 6.6: students as countable dots, split bars with 2px gaps,
   a drawn reference in every comparison, and "not started" as an outline, never a grey fill.
   Labels and names are always set as text, never as HTML. */
(function (root) {
  'use strict';
  var IL = root.IL, U = IL.U;
  if (!root.document) return;
  var doc = root.document, NS = 'http://www.w3.org/2000/svg';

  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
    else if (typeof c === 'string' || typeof c === 'number') el.appendChild(doc.createTextNode(String(c)));
    else el.appendChild(c);
  }
  function make(create) {
    return function (tag, attrs) {
      var el = create(tag), a = attrs || {};
      Object.keys(a).forEach(function (k) {
        var v = a[k];
        if (v == null || v === false) return;
        if (k === 'class') el.setAttribute('class', v);
        else if (k === 'text') el.textContent = v;
        else if (k === 'tip') { el.setAttribute('data-tip', v); if (!el.hasAttribute('tabindex') && tag !== 'button' && tag !== 'a') el.setAttribute('tabindex', '0'); }
        else if (k === 'on') Object.keys(v).forEach(function (e) { el.addEventListener(e, v[e]); });
        else el.setAttribute(k, v);
      });
      for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
      return el;
    };
  }
  var h = (IL.h = make(function (t) { return doc.createElement(t); }));
  var s = (IL.s = make(function (t) { return doc.createElementNS(NS, t); }));
  var C = (IL.C = {});

  // A chart that fills its column is drawn at that column's width, not stretched from a fixed
  // viewBox: stretching would scale its type and marks with it. The holder is measured after it
  // is in the document, and rebuilt on resize.
  IL._fits = [];
  C.fit = function (build, opts) {
    var holder = h('div', { class: 'fit' });
    holder._build = build; holder._opts = opts || {};
    IL._fits.push(holder);
    return holder;
  };
  IL.runFits = function () {
    IL._fits = IL._fits.filter(function (el) { return el.isConnected; });
    IL._fits.forEach(function (el) {
      var o = el._opts, box = el.clientWidth || (el.parentNode && el.parentNode.clientWidth) || 0;
      if (!box) return;
      var w = Math.round(Math.max(o.min || 360, Math.min(o.max || 1600, box)));
      if (el._w === w) return;
      el._w = w; el.textContent = '';
      add(el, el._build(w));
    });
  };
  var fitTimer = null;
  root.addEventListener('resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(function () { IL._fits.forEach(function (el) { el._w = null; }); IL.runFits(); }, 150); });

  function pct(x) { return x == null ? '–' : Math.round(x * 100) + '%'; }
  IL.pct = pct;
  function names(sids, max) {
    max = max || 10;
    var out = sids.slice(0, max).map(function (id) { return IL.nm(id); }).join(', ');
    return out + (sids.length > max ? ', +' + (sids.length - max) + ' more' : '');
  }
  IL.names = names;

  // ----- roster dots -----
  C.dots = function (entries, opts) {
    opts = opts || {};
    var list = entries.map(function (e) { return e.sid; });
    return h('div', { class: 'dots' }, entries.map(function (e) {
      return h('button', { class: 'dot ' + (e.cls || '') + (opts.big ? ' big' : ''), tip: IL.nm(e.sid) + (e.tip ? '\n' + e.tip : ''), 'aria-label': IL.nm(e.sid) + (e.tip ? ', ' + e.tip : ''),
        on: { click: function (ev) { ev.stopPropagation(); IL.openStudent(e.sid, list); } } });
    }));
  };
  C.named = function (sids, cls, max) {
    max = max || 12;
    var out = sids.slice(0, max).map(function (id) { return h('span', null, h('i', { class: 'dot ' + (cls || '') }), IL.who(id, sids)); });
    if (sids.length > max) out.push(h('span', { class: 'sub' }, '+' + (sids.length - max) + ' more'));
    return h('div', { class: 'named' }, out);
  };

  // ----- split bar -----
  C.split = function (segs, opts) {
    opts = opts || {};
    var total = U.sum(segs.map(function (x) { return x.n; }));
    var el = h('div', { class: 'split ' + (opts.size || ''), role: 'img', 'aria-label': segs.map(function (x) { return x.label + ' ' + x.n; }).join(', ') });
    segs.forEach(function (x) {
      if (!x.n) return;
      var tip = x.label + ': ' + x.n + (total ? ' of ' + total : '') + (x.sids && x.sids.length ? '\n' + names(x.sids) : '');
      var seg = h('span', { class: x.cls, style: 'flex:' + x.n + ' 1 0', tip: tip });
      if (x.onClick) { seg.style.cursor = 'pointer'; seg.addEventListener('click', function (ev) { ev.stopPropagation(); x.onClick(); }); }
      el.appendChild(seg);
    });
    return el;
  };
  C.splitRow = function (label, segs, val, opts) {
    opts = opts || {};
    var row = h('div', { class: 'split-row' }, h('div', { class: 'lab', title: typeof label === 'string' ? label : '' }, label), C.split(segs, opts), h('div', { class: 'val' }, val));
    if (opts.onClick) { row.style.cursor = 'pointer'; row.addEventListener('click', opts.onClick); }
    return row;
  };
  C.legend = function (items) {
    return h('div', { class: 'legend' }, items.map(function (it) { return h('span', null, it.cls || it.color ? h('i', { class: it.cls || null, style: it.color ? 'background:' + it.color : null }) : null, it.label); }));
  };

  // ----- marker track: a value against a drawn reference -----
  C.track = function (o) {
    var w = o.w || 200, hh = 26, pad = 8, min = o.min != null ? o.min : 0, max = o.max != null ? o.max : 1;
    var x = function (v) { return pad + ((U.clamp(v, min, max) - min) / (max - min)) * (w - 2 * pad); };
    var svg = s('svg', { width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, role: 'img',
      'aria-label': (o.valueLabel || 'value') + ' ' + pct(o.value) + (o.ref != null ? ', ' + (o.refLabel || 'reference') + ' ' + pct(o.ref) : '') });
    svg.appendChild(s('line', { x1: pad, x2: w - pad, y1: 13, y2: 13, class: 'axis' }));
    if (o.ref != null && o.value != null) {
      var below = o.value < o.ref;
      svg.appendChild(s('line', { x1: x(o.value), x2: x(o.ref), y1: 13, y2: 13, stroke: Math.abs(o.value - o.ref) < 0.03 ? '#9aa0aa' : below ? '#E9A400' : '#1864F2', 'stroke-width': 4, 'stroke-linecap': 'round' }));
    }
    if (o.ref != null) svg.appendChild(s('line', { x1: x(o.ref), x2: x(o.ref), y1: 5, y2: 21, stroke: '#1c1e21', 'stroke-width': 2, 'data-tip': (o.refLabel || 'reference') + ' ' + pct(o.ref) }));
    if (o.value != null) svg.appendChild(s('circle', { cx: x(o.value), cy: 13, r: 5.5, fill: o.color || '#1864F2', stroke: '#fff', 'stroke-width': 2, 'data-tip': (o.valueLabel || 'value') + ' ' + pct(o.value) }));
    return svg;
  };

  // ----- student bubbles -----
  // One student is one bubble that says who it is: initials (or the student's number when names are
  // hidden) inside a circle big enough to read. Bubbles that would overlap merge into one that shows a
  // count. Attention is the only colour; everyone else is neutral. The form follows the Student Breakdown
  // graph in the ALPS app.
  var NEUTRAL = '#dfe2e8', HOT = '#E9A400';
  function bubble(o) {
    var n = o.sids.length, g = s('g', { class: 'bubble' + (o.hot ? ' hot' : ''), tabindex: 0, role: 'button', 'data-sids': o.sids.join(' '), 'data-tip': o.tip,
      'aria-label': n > 1 ? n + ' students' : IL.nm(o.sids[0]) });
    g.appendChild(s('circle', { cx: o.x, cy: o.y, r: Math.max(o.r, 12), fill: 'transparent', stroke: 'none' }));      // a hit target that is never smaller than 24px
    g.appendChild(s('circle', { class: 'b', cx: o.x, cy: o.y, r: o.r, fill: o.hot ? HOT : NEUTRAL, stroke: '#fff', 'stroke-width': 2 }));
    var label = n > 1 ? String(n) : (o.text ? IL.ini(o.sids[0]) : null);
    if (label) g.appendChild(s('text', { x: o.x, y: o.y + 4.2, 'text-anchor': 'middle', class: 'bt' }, label));
    g.addEventListener('click', function (ev) { ev.stopPropagation(); if (n > 1) IL.ev.students(n + ' students', o.groupTitle || null, o.sids); else IL.openStudent(o.sids[0], o.all); });
    g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') g.dispatchEvent(new MouseEvent('click')); });
    return g;
  }
  // the same mark outside a chart: a short row of initials, with the rest as a count
  C.chips = function (entries, max) {
    max = max || 8;
    var all = entries.map(function (e) { return e.sid; });
    var out = entries.slice(0, max).map(function (e) {
      return h('button', { class: 'bub ' + (e.cls || ''), tip: IL.nm(e.sid) + (e.tip ? '\n' + e.tip : ''), 'aria-label': IL.nm(e.sid), 'data-sids': e.sid,
        on: { click: function (ev) { ev.stopPropagation(); IL.openStudent(e.sid, all); } } }, IL.ini(e.sid));
    });
    if (entries.length > max) out.push(h('span', { class: 'bub more' }, '+' + (entries.length - max)));
    return h('span', { class: 'bubs' }, out);
  };

  // ----- bubble strip: every student along one scale -----
  C.strip = function (o) {
    var N = o.dots.length;
    if (N > 80) return C.hist(o);
    var w = o.w || 640, pad = 20, min = o.min != null ? o.min : 0, max = o.max != null ? o.max : 100;
    var x = function (v) { return pad + ((U.clamp(v, min, max) - min) / (max - min)) * (w - 2 * pad); };
    var all = o.dots.map(function (d) { return d.sid; }), r = N <= 40 ? 11 : 8, pts, rows;
    // A crowded strip shrinks its neutral bubbles; a flagged student always keeps a bubble big enough to
    // carry initials, because those are the ones the reader is looking for.
    function place() {
      var levels = [];
      pts = o.dots.slice().sort(U.by(function (d) { return d.v; })).map(function (d) { var hot = o.flag ? o.flag(d) : false; return { d: d, x: x(d.v), lvl: 0, hot: hot, r: hot ? Math.max(r, 11) : r }; });
      pts.forEach(function (p) { var l = 0; while (levels[l] && p.x - levels[l].x < levels[l].r + p.r + 1) l++; levels[l] = p; p.lvl = l; });
      rows = Math.max(1, levels.length);
    }
    place();
    while (rows > 7 && r > 6) { r -= 1; place(); }
    var top = 22, base = top + Math.max(rows * (2 * r + 1), 24), hh = base + 28;
    var svg = s('svg', { class: 'flex', width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, preserveAspectRatio: 'xMinYMin meet', role: 'img', 'aria-label': o.label || 'distribution of students' });
    if (o.band) svg.appendChild(s('rect', { x: x(o.band[0]), y: top - 4, width: Math.max(0, x(o.band[1]) - x(o.band[0])), height: base - top + 6, fill: '#f1f3f7', rx: 3 }));
    svg.appendChild(s('line', { x1: pad, x2: w - pad, y1: base + 4, y2: base + 4, class: 'axis' }));
    (o.ticks || [min, (min + max) / 2, max]).forEach(function (t) { svg.appendChild(s('text', { x: x(t), y: base + 20, 'text-anchor': 'middle' }, (o.fmt || String)(t))); });
    if (o.median != null) {
      var mx = x(o.median), right = mx > w * 0.72;
      svg.appendChild(s('line', { x1: mx, x2: mx, y1: 14, y2: base + 4, stroke: '#1c1e21', 'stroke-width': 1.5 }));
      svg.appendChild(s('text', { x: mx + (right ? -5 : 5), y: 11, 'text-anchor': right ? 'end' : 'start', 'font-weight': 600 }, (o.medianLabel || 'class median') + ' ' + (o.fmt || String)(o.median)));
    }
    pts.forEach(function (p) {
      svg.appendChild(bubble({ sids: [p.d.sid], all: all, x: p.x, y: base - p.r - 1 - p.lvl * (2 * r + 1), r: p.r, text: p.r >= 11, hot: p.hot,
        tip: IL.nm(p.d.sid) + '\n' + (o.fmt || String)(p.d.v) + (p.d.tip ? '\n' + p.d.tip : '') }));
    });
    return svg;
  };
  // a class too large to draw one bubble each: the same scale as columns of counts
  C.hist = function (o) {
    var w = o.w || 640, pad = 20, min = o.min != null ? o.min : 0, max = o.max != null ? o.max : 100, bins = 12, step = (max - min) / bins, hgt = 96, top = 26, base = top + hgt;
    var x = function (v) { return pad + ((U.clamp(v, min, max) - min) / (max - min)) * (w - 2 * pad); };
    var cnt = [], hot = [], who = [];
    for (var b = 0; b < bins; b++) { cnt.push(0); hot.push(0); who.push([]); }
    o.dots.forEach(function (d) { var k = Math.min(bins - 1, Math.max(0, Math.floor((U.clamp(d.v, min, max) - min) / step))); cnt[k]++; who[k].push(d.sid); if (o.flag && o.flag(d)) hot[k]++; });
    var top1 = Math.max.apply(null, cnt) || 1, slot = (w - 2 * pad) / bins, bw = Math.min(24, slot - 6);
    var svg = s('svg', { class: 'flex', width: w, height: base + 28, viewBox: '0 0 ' + w + ' ' + (base + 28), preserveAspectRatio: 'xMinYMin meet', role: 'img', 'aria-label': o.label || 'distribution of students' });
    if (o.band) svg.appendChild(s('rect', { x: x(o.band[0]), y: top - 6, width: Math.max(0, x(o.band[1]) - x(o.band[0])), height: hgt + 8, fill: '#f1f3f7', rx: 3 }));
    svg.appendChild(s('line', { x1: pad, x2: w - pad, y1: base, y2: base, class: 'axis' }));
    cnt.forEach(function (n, k) {
      if (!n) return;
      var bx = pad + k * slot + (slot - bw) / 2, bh = Math.max(3, (n / top1) * hgt), hh2 = (hot[k] / n) * bh;
      var g = s('g', { class: 'mark', tabindex: 0, 'data-tip': n + ' students between ' + (o.fmt || String)(min + k * step) + ' and ' + (o.fmt || String)(min + (k + 1) * step) + (hot[k] ? '\n' + hot[k] + ' flagged' : '') });
      g.appendChild(s('rect', { x: bx, y: base - bh, width: bw, height: bh, rx: 3, fill: NEUTRAL }));
      if (hot[k]) g.appendChild(s('rect', { x: bx, y: base - hh2, width: bw, height: hh2, fill: HOT }));
      g.appendChild(s('text', { x: bx + bw / 2, y: base - bh - 4, 'text-anchor': 'middle' }, String(n)));
      g.addEventListener('click', function () { IL.ev.students(n + ' students', (o.label || '') + ' · ' + (o.fmt || String)(min + k * step) + ' to ' + (o.fmt || String)(min + (k + 1) * step), who[k]); });
      svg.appendChild(g);
    });
    (o.ticks || [min, (min + max) / 2, max]).forEach(function (t) { svg.appendChild(s('text', { x: x(t), y: base + 16, 'text-anchor': 'middle' }, (o.fmt || String)(t))); });
    if (o.median != null) {
      var mx = x(o.median), right = mx > w * 0.72;
      svg.appendChild(s('line', { x1: mx, x2: mx, y1: 12, y2: base, stroke: '#1c1e21', 'stroke-width': 1.5 }));
      svg.appendChild(s('text', { x: mx + (right ? -5 : 5), y: 10, 'text-anchor': right ? 'end' : 'start', 'font-weight': 600 }, (o.medianLabel || 'class median') + ' ' + (o.fmt || String)(o.median)));
    }
    return svg;
  };

  // ----- register: students by occasions -----
  C.register = function (o) {
    var head = h('tr', null, h('th'), o.cols.map(function (c) { return h('th', { class: o.rot ? 'rot' : '', tip: c.tip || null }, o.rot ? h('div', null, c.label) : c.label); }), o.noteHead ? h('th', { class: 'note' }, o.noteHead) : null);
    var body = o.rows.map(function (r) {
      return h('tr', null, h('td', { class: 'name' }, r.name || IL.who(r.sid, o.rows.map(function (x) { return x.sid; }))),
        r.cells.map(function (c, i) {
          var inRun = r.run && i >= r.run[0] && i <= r.run[1];
          return h('td', { class: (inRun ? 'run ' : '') + (c === 'pale' ? 'pale' : ''), tip: (o.cols[i].tip || o.cols[i].label) + ': ' + (o.words[c] || c) },
            c === 'pale' ? h('i', { class: 'cellmark cm-pale' }) : h('i', { class: 'cellmark cm-' + c }));
        }), r.note ? h('td', { class: 'note' }, r.note) : null);
    });
    return h('div', { style: 'overflow-x:auto' }, h('table', { class: 'reg' }, h('thead', null, head), h('tbody', null, body)));
  };

  // ----- option bars -----
  C.options = function (o) {
    var it = o.item, max = Math.max.apply(null, o.picks.map(function (p) { return p.length; })) || 1;
    var wrap = h('div');
    if (it.opts.stem) wrap.appendChild(h('div', { class: 'stem' }, it.opts.stem));
    var who = h('div', { class: 'note', hidden: true });
    o.picks.forEach(function (p, i) {
      var isKey = i === it.opts.key, isTop = i === o.top;
      var row = h('div', { class: 'opt' + (isKey ? ' key' : '') + (isTop ? ' top' : ''), tip: p.length + ' chose ' + String.fromCharCode(65 + i) + ' first' + (p.length ? '\n' + names(p) : ''),
        on: { click: function (ev) { ev.stopPropagation(); who.hidden = false; who.textContent = ''; add(who, [h('b', null, String.fromCharCode(65 + i) + (isKey ? ' (correct)' : '') + ': '), p.length ? p.map(function (sid, k) { return [k ? ', ' : '', IL.who(sid, p)]; }) : 'no one']); } } },
        h('span', { class: 'letter' }, String.fromCharCode(65 + i) + (isKey ? ' ✓' : '')),
        h('span', { class: 'text', title: it.opts.labels ? it.opts.labels[i] : '' }, it.opts.labels ? it.opts.labels[i] : 'option ' + String.fromCharCode(65 + i)),
        h('span', { class: 'bar-wrap' }, h('span', { class: 'bar', style: 'width:' + Math.max(1, (p.length / max) * 78) + '%' }), h('span', { class: 'bar-val' }, String(p.length)),
          isTop ? h('span', { class: 'flag' }, '← most common first answer') : isKey ? h('span', { class: 'flag' }, 'correct') : null));
      wrap.appendChild(row);
    });
    wrap.appendChild(who);
    return wrap;
  };

  // ----- dumbbell -----
  C.dumbbell = function (o) {
    var labW = o.labW || 150, w = o.w || 560, rowH = 26, pad = 34, min = o.min != null ? o.min : 0, max = o.max != null ? o.max : 1;
    var x = function (v) { return labW + pad + ((U.clamp(v, min, max) - min) / (max - min)) * (w - labW - 2 * pad - (o.noteW || 0)); };
    var hh = o.rows.length * rowH + 22;
    var svg = s('svg', { class: 'flex', width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, preserveAspectRatio: 'xMinYMin meet', role: 'img', 'aria-label': o.label || 'before and after' });
    var fmt = o.fmt || function (v) { return Math.round(v * 100); };
    if (o.zero != null) svg.appendChild(s('line', { x1: x(o.zero), x2: x(o.zero), y1: 16, y2: hh - 2, class: 'axis' }));
    svg.appendChild(s('text', { x: labW + pad, y: 10, fill: '#5f636a' }, o.aLabel || 'before'));
    svg.appendChild(s('text', { x: w - (o.noteW || 0) - pad, y: 10, 'text-anchor': 'end', fill: '#5f636a' }, o.bLabel || 'after'));
    o.rows.forEach(function (r, i) {
      var y = 22 + i * rowH + rowH / 2;
      var lab = s('text', { x: 0, y: y + 4, class: r.sid ? 'mark' : '' }, r.sid ? IL.nm(r.sid) : r.label);
      if (r.sid) lab.addEventListener('click', function () { IL.openStudent(r.sid, o.rows.map(function (x) { return x.sid; }).filter(Boolean)); });
      svg.appendChild(lab);
      svg.appendChild(s('line', { x1: labW + pad, x2: w - (o.noteW || 0) - pad, y1: y, y2: y, class: 'grid' }));
      if (r.a != null && r.b != null) {
        svg.appendChild(s('line', { x1: x(r.a), x2: x(r.b), y1: y, y2: y, stroke: r.b >= r.a ? (o.upColor || '#1864F2') : (o.downColor || '#E9A400'), 'stroke-width': 3, 'stroke-linecap': 'round' }));
      }
      if (r.a != null) {
        svg.appendChild(s('circle', { cx: x(r.a), cy: y, r: 5, fill: o.colors ? o.colors[0] : '#fff', stroke: o.colors ? '#fff' : '#5b6472', 'stroke-width': 2, 'data-tip': (o.aLabel || 'before') + ': ' + fmt(r.a) + (r.aTip ? '\n' + r.aTip : '') }));
        svg.appendChild(s('text', { x: x(r.a) + (r.b != null && r.b < r.a ? 9 : -9), y: y + 4, 'text-anchor': r.b != null && r.b < r.a ? 'start' : 'end' }, String(fmt(r.a))));
      }
      if (r.b != null) {
        svg.appendChild(s('circle', { cx: x(r.b), cy: y, r: 5.5, fill: o.colors ? o.colors[1] : (r.a != null && r.b < r.a ? '#E9A400' : '#1864F2'), stroke: '#fff', 'stroke-width': 2, 'data-tip': (o.bLabel || 'after') + ': ' + fmt(r.b) + (r.bTip ? '\n' + r.bTip : '') }));
        svg.appendChild(s('text', { x: x(r.b) + (r.a != null && r.b < r.a ? -9 : 9), y: y + 4, 'text-anchor': r.a != null && r.b < r.a ? 'end' : 'start', 'font-weight': 600 }, String(fmt(r.b))));
      } else if (r.hollow) {
        svg.appendChild(s('text', { x: x(r.a != null ? r.a : min) + 14, y: y + 4, fill: '#5f636a' }, r.hollow));
      }
      if (r.note) svg.appendChild(s('text', { x: w - (o.noteW || 0) + 4, y: y + 4, fill: '#4d4f53' }, r.note));
    });
    return svg;
  };

  // ----- zero-line columns: above or below a reference over time -----
  C.zero = function (o) {
    var n = o.values.length, cw = o.cw || 22, gap = 4, labW = o.labW || (o.labels ? 12 : 0), w = labW + n * (cw + gap) + (o.tailW || 0), hh = o.h || 54, mid = hh / 2 + (o.axisLabels ? -4 : 0), amp = o.amp || 0.4;
    var svg = s('svg', { width: w, height: hh + (o.labels ? 14 : 0), viewBox: '0 0 ' + w + ' ' + (hh + (o.labels ? 14 : 0)), role: 'img', 'aria-label': o.label || 'trend against the reference' });
    svg.appendChild(s('line', { x1: labW, x2: labW + n * (cw + gap), y1: mid, y2: mid, stroke: '#1c1e21', 'stroke-width': 1 }));
    o.values.forEach(function (v, i) {
      var x0 = labW + i * (cw + gap) + gap / 2;
      if (v == null) { svg.appendChild(s('rect', { x: x0, y: mid - 1.5, width: cw, height: 3, fill: '#d9dce2', 'data-tip': (o.tips ? o.tips[i] : '') || 'not enough work to say' })); return; }
      var hgt = Math.max(2, (Math.min(Math.abs(v), amp) / amp) * (hh / 2 - 4));
      var marked = o.mark != null && o.mark === i;
      svg.appendChild(s('rect', { x: x0, y: v >= 0 ? mid - hgt : mid, width: cw, height: hgt, rx: 2, fill: v >= 0 ? (marked ? '#0b3fa8' : '#8fb1f1') : (marked ? '#946400' : '#E9A400'),
        'data-tip': (o.tips ? o.tips[i] + '\n' : '') + (v >= 0 ? '+' : '−') + Math.abs(Math.round(v * 100)) + ' points', tabindex: 0 }));
    });
    if (o.labels) o.labels.forEach(function (l, i) { if (l) svg.appendChild(s('text', { x: labW + i * (cw + gap) + gap / 2 + cw / 2, y: hh + 11, 'text-anchor': 'middle', fill: '#5f636a' }, l)); });
    if (o.refLabel) svg.appendChild(s('text', { x: labW + n * (cw + gap) + 4, y: mid + 4, fill: '#5f636a' }, o.refLabel));
    return svg;
  };

  // ----- heat grid -----
  C.heat = function (o) {
    var cols = o.cols.length;
    var grid = h('div', { class: 'heat', style: 'grid-template-columns: 38px repeat(' + cols + ', minmax(14px, 1fr))' });
    grid.appendChild(h('div'));
    o.cols.forEach(function (c) { grid.appendChild(h('div', { class: 'hh' }, c)); });
    o.rows.forEach(function (r, ri) {
      grid.appendChild(h('div', { class: 'hl' }, r));
      o.cols.forEach(function (c, ci) {
        var v = o.value(ri, ci), a = o.max ? Math.pow(v / o.max, 0.6) : 0;
        var cell = h('div', { class: 'hc' + (o.outline && o.outline(ri, ci) ? ' sess' : ''), style: v ? 'background: rgba(24,100,242,' + (0.08 + 0.88 * a).toFixed(2) + ')' : null, tip: o.tip(ri, ci, v) });
        grid.appendChild(cell);
      });
    });
    return grid;
  };

  // ----- tape: what happened, in order -----
  C.tape = function (attempts, o) {
    o = o || {};
    var el = h('div', { class: 'tape' + (o.labelled ? ' labelled' : '') });
    attempts.forEach(function (a, i) {
      var cls = a.ok === true ? 'ok' : a.ok === false ? 'no' : 'null';
      var what = a.ok === true ? (o.code ? 'passed' : 'correct') : a.ok === false ? (a.err ? a.err : a.test ? 'failed test ' + a.test : 'wrong') : 'no result';
      if (o.code && i > 0 && a.dur > 240) el.appendChild(h('i', { class: 'gap', tip: 'pause of ' + IL.T.dur(a.dur) }));
      var mark = h('i', { class: cls, tip: (o.code ? 'run ' : 'attempt ') + (i + 1) + ': ' + what + '\nafter ' + IL.T.dur(a.dur) });
      if (o.labelled) el.appendChild(h('span', null, mark, (a.ok ? '✓ ' : '✗ ') + IL.T.dur(a.dur))); else el.appendChild(mark);
    });
    return el;
  };

  // ----- ranked bars -----
  C.bars = function (rows, o) {
    o = o || {};
    var max = o.max || Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1;
    return h('div', null, rows.map(function (r) {
      var row = h('div', { class: 'bar-row', tip: r.tip || null },
        h('div', { class: 'lab', title: typeof r.label === 'string' ? r.label : '' }, r.label),
        h('div', { class: 'bar-wrap' }, r.pre || null, h('span', { class: 'bar ' + (r.cls || ''), style: 'width:' + Math.max(0.5, (r.v / max) * (o.span || 70)) + '%' + (r.color ? ';background:' + r.color : '') }), h('span', { class: 'bar-val' }, r.text != null ? r.text : String(r.v))));
      if (r.onClick) { row.style.cursor = 'pointer'; row.addEventListener('click', r.onClick); }
      return row;
    }));
  };
  // ----- centred bar for an ordered scale -----
  // Five ordered bands, centred on the middle one: the weaker bands run left, the stronger ones right, so a
  // column of these shows at a glance which rows lean weak. `scale` is the largest half across the rows.
  C.diverge = function (levels, labels, scale) {
    var mid = levels[2] / 2, sc = scale || Math.max(levels[0] + levels[1] + mid, mid + levels[3] + levels[4]) || 1;
    var seg = function (n, i) { return n > 0 ? h('span', { class: 's-b' + i, style: 'width:' + ((n / sc) * 100).toFixed(2) + '%', tip: labels[i] + ': ' + levels[i] }) : null; };
    return h('div', { class: 'dv', role: 'img', 'aria-label': labels.map(function (l, i) { return l + ' ' + levels[i]; }).join(', ') },
      h('div', { class: 'dv-l' }, seg(levels[0], 0), seg(levels[1], 1), seg(mid, 2)), h('div', { class: 'dv-r' }, seg(mid, 2), seg(levels[3], 3), seg(levels[4], 4)));
  };
  C.meter = function (p, tip) { return h('span', { class: 'meter', tip: tip || null }, h('i', { style: 'width:' + Math.round(U.clamp(p, 0, 1) * 100) + '%' })); };
  C.icons = function (p) {
    var k = Math.round(U.clamp(p, 0, 1) * 10), out = [];
    for (var i = 0; i < 10; i++) out.push(h('i', { class: i < k ? '' : 'o' }));
    return h('span', { class: 'icons', tip: k + ' of 10', role: 'img', 'aria-label': k + ' of 10' }, out);
  };

  // ----- sparkline and columns -----
  C.spark = function (vals, o) {
    o = o || {};
    var w = o.w || 96, hh = o.h || 22, ok = vals.filter(function (v) { return v != null; });
    var min = o.min != null ? o.min : Math.min.apply(null, ok), max = o.max != null ? o.max : Math.max.apply(null, ok), span = max - min || 1;
    var svg = s('svg', { width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, 'aria-hidden': 'true' });
    if (o.bars) {
      var bw = w / vals.length;
      vals.forEach(function (v, i) {
        var bh = v == null ? 0 : Math.max(1, ((v - (o.min || 0)) / ((o.max || max) - (o.min || 0) || 1)) * (hh - 2));
        svg.appendChild(s('rect', { x: i * bw + 0.5, y: hh - bh, width: Math.max(1, bw - 1.5), height: bh, rx: 1, fill: o.pale && o.pale[i] ? '#d9dce2' : (i === vals.length - 1 ? '#1864F2' : '#a9c2f5') }));
      });
      return svg;
    }
    var pts = [];
    vals.forEach(function (v, i) { if (v != null) pts.push([(i / (vals.length - 1)) * (w - 6) + 3, hh - 3 - ((v - min) / span) * (hh - 6)]); });
    if (pts.length > 1) svg.appendChild(s('polyline', { points: pts.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: '#9aa0aa', 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    if (pts.length) svg.appendChild(s('circle', { cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 2.5, fill: '#1864F2' }));
    return svg;
  };
  C.columns = function (o) {
    var n = o.vals.length, cw = o.cw || 30, bw = Math.min(o.bw || 22, cw - 8, 24), gap = 6, padL = 30, w = o.w || (padL + n * (cw + gap) + 90), hh = o.h || 120, top = 34, base = hh - 20;
    var y = function (v) { return base - (v / o.max) * (base - top); };
    var svg = s('svg', { class: 'flex', width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, preserveAspectRatio: 'xMinYMin meet', role: 'img', 'aria-label': o.label || '' });
    svg.appendChild(s('line', { x1: padL, x2: w - 90, y1: base, y2: base, class: 'axis' }));
    svg.appendChild(s('line', { x1: padL, x2: w - 90, y1: y(o.max), y2: y(o.max), class: 'grid' }));
    svg.appendChild(s('text', { x: padL - 6, y: y(o.max) + 4, 'text-anchor': 'end' }, String(o.max)));
    if (o.ref != null) {
      svg.appendChild(s('line', { x1: padL, x2: w - 90, y1: y(o.ref), y2: y(o.ref), stroke: '#1c1e21', 'stroke-width': 1 }));
      svg.appendChild(s('text', { x: w - 86, y: y(o.ref) + 4 }, o.refLabel || ''));
    }
    svg.appendChild(s('text', { x: padL - 6, y: base + 4, 'text-anchor': 'end' }, '0'));
    o.vals.forEach(function (v, i) {
      var x0 = padL + i * (cw + gap) + gap / 2, hgt = Math.max(1, base - y(v.v));
      svg.appendChild(s('rect', { x: x0 + (cw - bw) / 2, y: base - hgt, width: bw, height: hgt, rx: 3, fill: v.pale ? '#d9dce2' : v.warn ? '#E9A400' : '#1864F2', 'data-tip': v.tip, tabindex: 0 }));
      if (v.label) svg.appendChild(s('text', { x: x0 + cw / 2, y: base + 14, 'text-anchor': 'middle', fill: '#5f636a' }, v.label));
      if (v.top) svg.appendChild(s('text', { x: x0 + cw / 2, y: base - hgt - 4, 'text-anchor': 'middle', 'font-weight': v.warn ? 700 : 400 }, v.top));
    });
    return svg;
  };

  // ----- quadrant map: each student against two class medians -----
  // The axes cross in the middle, at the class medians, and are named in words at their ends, so the four
  // quarters can be read without a scale. Each half of an axis is stretched separately so the class fills
  // the plot instead of bunching in one corner; exact values are in the tooltip and the table view.
  var quadSeq = 0;
  C.quadrant = function (o) {
    // on a narrow screen the plot is taller, the end labels shorter, and the quarter names take two lines
    var w = o.w || 760, N = o.dots.length, narrow = w < 520, gut = narrow ? 42 : 26, ph = Math.round(narrow ? U.clamp(w * 0.95, 300, 400) : U.clamp(w * 0.56, 340, 480)), hh = ph + 2 * gut;
    var r = N <= 45 ? (narrow ? 12 : 13) : N <= 90 ? 11 : 9, withText = r >= 12, pad = r + 12, cx = w / 2, cy = gut + ph / 2, top = gut, bot = gut + ph, id = 'qd' + (++quadSeq);
    var xs = o.dots.map(function (d) { return d.x; }).concat([o.medX]), ys = o.dots.map(function (d) { return d.y; }).concat([o.medY]);
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    function half(v, lo, mid, hi, a, c, b) { return v <= mid ? (mid === lo ? c : a + ((v - lo) / (mid - lo)) * (c - a)) : (hi === mid ? c : c + ((v - mid) / (hi - mid)) * (b - c)); }
    var X = function (v) { return half(v, x0, o.medX, x1, pad, cx, w - pad); }, Y = function (v) { return half(v, y0, o.medY, y1, bot - pad, cy, top + pad); };
    var svg = s('svg', { class: 'flex qmap', width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, role: 'img', 'aria-label': o.label || 'Each student against the class medians' });
    var defs = s('defs');
    defs.appendChild(s('marker', { id: id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse' }, s('path', { d: 'M1 1 L9 5 L1 9', fill: 'none', stroke: '#8d939e', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })));
    svg.appendChild(defs);
    svg.appendChild(s('rect', { x: 0.5, y: top + 0.5, width: w - 1, height: ph - 1, rx: 8, fill: '#fafbfc', stroke: '#e7e8ec' }));
    // the quarter that needs attention is the only one with a tint
    if (o.hotQuad) { var q = o.hotQuad; svg.appendChild(s('rect', { x: q.charAt(1) === 'r' ? cx : 1, y: q.charAt(0) === 'b' ? cy : top + 1, width: cx - 1, height: ph / 2 - 1, fill: '#FDF6E6' })); }
    svg.appendChild(s('line', { x1: 8, x2: w - 8, y1: cy, y2: cy, stroke: '#8d939e', 'stroke-width': 1.5, 'marker-start': 'url(#' + id + ')', 'marker-end': 'url(#' + id + ')' }));
    svg.appendChild(s('line', { x1: cx, x2: cx, y1: bot - 8, y2: top + 8, stroke: '#8d939e', 'stroke-width': 1.5, 'marker-start': 'url(#' + id + ')', 'marker-end': 'url(#' + id + ')' }));
    // each axis is named in words at its two ends, on the axis
    var L = narrow && o.endsShort ? o.endsShort : o.ends, pw = function (t) { return Math.round(t.length * 6.7 + 20); }, zones = [];
    function pill(px, py, text, rot) {
      var wd = pw(text), g = s('g', { transform: 'translate(' + px + ',' + py + ')' + (rot ? ' rotate(-90)' : '') });
      g.appendChild(s('rect', { x: -wd / 2, y: -12, width: wd, height: 24, rx: 12, fill: '#fff', stroke: '#c9ccd3' }));
      g.appendChild(s('text', { x: 0, y: 4.2, 'text-anchor': 'middle', class: 'pl' }, text));
      svg.appendChild(g);
      zones.push(rot ? { x0: px - 12, x1: px + 12, y0: py - wd / 2, y1: py + wd / 2, rot: true } : { x0: px - wd / 2, x1: px + wd / 2, y0: py - 12, y1: py + 12 });
    }
    pill(20 + pw(L.xLo) / 2, cy, L.xLo); pill(w - 20 - pw(L.xHi) / 2, cy, L.xHi);
    pill(cx, top + 20 + pw(L.yHi) / 2, L.yHi, true); pill(cx, bot - 20 - pw(L.yLo) / 2, L.yLo, true);
    // the name of each quarter and how many students are in it, outside the plot so nothing covers it
    var cnt = { tl: 0, tr: 0, bl: 0, br: 0 };
    o.dots.forEach(function (d) { cnt[(d.y >= o.medY ? 't' : 'b') + (d.x >= o.medX ? 'r' : 'l')]++; });
    [['tl', 4, top - (narrow ? 25 : 9), 'start'], ['tr', w - 4, top - 9, 'end'], ['bl', 4, bot + 18, 'start'], ['br', w - 4, bot + (narrow ? 34 : 18), 'end']].forEach(function (c) {
      svg.appendChild(s('text', { x: c[1], y: c[2], 'text-anchor': c[3], class: 'qn' }, o.names[c[0]] + ' · ' + cnt[c[0]]));
    });
    // A bubble that would sit on an axis label is moved just clear of it, staying in its own quarter.
    var pts = o.dots.map(function (d) {
      var p = { d: d, px: X(d.x), py: Y(d.y) };
      zones.forEach(function (z) {
        if (p.px < z.x0 - r - 2 || p.px > z.x1 + r + 2 || p.py < z.y0 - r - 2 || p.py > z.y1 + r + 2) return;
        if (z.rot) p.px = d.x >= o.medX ? z.x1 + r + 3 : z.x0 - r - 3; else p.py = d.y >= o.medY ? z.y0 - r - 3 : z.y1 + r + 3;
      });
      return p;
    });
    // bubbles that would overlap merge into one that carries a count (never mixing flagged with not flagged)
    var used = {}, clusters = [], all = o.dots.map(function (d) { return d.sid; });
    pts.forEach(function (p, i) {
      if (used[i]) return;
      var cl = [p]; used[i] = true;
      pts.forEach(function (q2, k) {
        if (k === i || used[k] || !!q2.d.hot !== !!p.d.hot) return;
        if (Math.hypot(p.px - q2.px, p.py - q2.py) < r * Math.sqrt(cl.length) + r) { cl.push(q2); used[k] = true; }
      });
      clusters.push(cl);
    });
    clusters.sort(function (a, b) { return b.length - a.length; }).forEach(function (cl) {
      var n = cl.length, rad = Math.min(r * Math.sqrt(n), 3 * r);
      if (n > 1) rad = Math.max(rad, 12);
      var gx = U.clamp(U.mean(cl.map(function (p) { return p.px; })), rad + 3, w - rad - 3), gy = U.clamp(U.mean(cl.map(function (p) { return p.py; })), top + rad + 3, bot - rad - 3);
      svg.appendChild(bubble({ sids: cl.map(function (p) { return p.d.sid; }), all: all, x: gx, y: gy, r: rad, text: withText, hot: cl[0].d.hot, groupTitle: o.label,
        tip: cl.map(function (p) { return IL.nm(p.d.sid) + ' · ' + o.fmt(p.d); }).slice(0, 8).join('\n') + (n > 8 ? '\n+' + (n - 8) + ' more' : '') }));
    });
    return svg;
  };

  // ----- card: reads its headline, time basis, missing data and caveats from the shared insight record -----
  // o.ins is the record from 04b-insights. Without one (drawers, the student page) the card is plain.
  C.card = function (o) {
    var ins = o.ins || null, st = IL.state, id = ins ? ins.id : (o.id || null);
    var nodata = ins && !ins.ok;
    var body = h('div', null, nodata ? h('p', { class: 'empty nodata' }, ins.nodata) : (typeof o.body === 'function' ? o.body() : o.body)), tableWrap = h('div', { hidden: true }), showing = false;
    var tools = [];
    if (o.table && !nodata) tools.push(h('button', { class: 'link-btn', on: { click: function (ev) {
      showing = !showing;
      if (showing && !tableWrap.firstChild) add(tableWrap, o.table());
      tableWrap.hidden = !showing; body.hidden = showing; ev.target.textContent = showing ? 'Chart' : 'Table';
    } } }, 'Table'));
    if (o.tools && !nodata) tools = tools.concat(o.tools);
    // a card says so when its time basis is not the window the teacher has selected
    var basis = ins ? IL.basisLabel(ins.basis) : (o.basis || null);
    var rule = ins ? ins.rule : null, caveat = ins ? ins.caveat : (o.guard || null);
    var info = null, infoOpen = !!(id && st.info[id]);
    if (rule || caveat || (ins && ins.id)) {
      info = h('div', { class: 'card-info', hidden: !infoOpen },
        rule ? h('p', null, h('b', null, 'How this is worked out. '), rule) : null,
        caveat ? h('p', null, h('b', null, 'Read with care. '), caveat) : null,
        ins ? h('p', { class: 'spec' }, 'Time basis: ' + (IL.I.BASIS[ins.basis] || 'the window selected above') + ' · design reference ' + ins.id) : null);
      tools.push(h('button', { class: 'info-btn', 'aria-label': 'How this is worked out', 'aria-expanded': infoOpen ? 'true' : 'false', tip: 'How this is worked out',
        on: { click: function (ev) { info.hidden = !info.hidden; if (id) st.info[id] = !info.hidden; ev.currentTarget.setAttribute('aria-expanded', info.hidden ? 'false' : 'true'); } } }, 'i'));
    }
    if (o.onHide) tools.push(h('button', { class: 'link-btn', on: { click: o.onHide } }, 'Hide'));
    var finding = nodata ? null : ins ? (ins.fired || ins.reference ? ins.headline : (ins.quiet || ins.headline)) : o.finding;
    return h('section', { class: 'card ' + (o.cls || '') + (ins && ins.fired ? ' fired' : ''), 'data-card': id },
      h('div', { class: 'card-head' }, h('h3', null, o.title || (ins && ins.title)), basis ? h('span', { class: 'basis', tip: 'This card does not follow the Window control. It covers: ' + basis }, basis) : null, h('div', { class: 'card-tools' }, tools)),
      finding ? h('p', { class: 'finding' }, finding) : null,
      !nodata && ins && ins.warn ? h('p', { class: 'warnline' }, ins.warn) : null,
      !nodata && o.sub ? h('p', { class: 'sub', style: 'margin:-6px 0 10px' }, o.sub) : null, body, tableWrap,
      !nodata && o.actions ? h('div', { class: 'actions' }, o.actions) : null, info);
  };
  // one headline for a fired card that is not open
  C.firedLine = function (ins, onShow) {
    return h('div', { class: 'quiet-line fired-line', 'data-card': ins.id, tabindex: 0, role: 'button', on: { click: onShow, keydown: function (e) { if (e.key === 'Enter') onShow(); } } },
      h('b', null, ins.title), h('span', null, ins.headline), h('button', { class: 'link-btn', on: { click: function (e) { e.stopPropagation(); onShow(); } } }, 'Show evidence'));
  };
  // one line for a card that has nothing notable, or cannot be computed for this section
  C.quietLine = function (ins, onShow) {
    return h('div', { class: 'quiet-line', 'data-card': ins.id },
      h('b', null, ins.title), h('span', null, ins.ok ? (ins.quiet || ins.headline || 'Nothing notable.') : ins.nodata),
      ins.ok ? h('button', { class: 'link-btn', on: { click: onShow } }, 'Show') : null);
  };
  C.table = function (head, rows) {
    return h('table', { class: 't' }, h('thead', null, h('tr', null, head.map(function (x) { return h('th', null, x); }))),
      h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (c) { return h('td', null, c); })); })));
  };
})(typeof window !== 'undefined' ? window : globalThis);

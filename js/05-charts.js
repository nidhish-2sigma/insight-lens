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
    return h('div', { class: 'dots' }, entries.map(function (e) {
      return h('button', { class: 'dot ' + (e.cls || '') + (opts.big ? ' big' : ''), tip: IL.nm(e.sid) + (e.tip ? '\n' + e.tip : ''), 'aria-label': IL.nm(e.sid),
        on: { click: function (ev) { ev.stopPropagation(); IL.openStudent(e.sid); } } });
    }));
  };
  C.named = function (sids, cls, max) {
    max = max || 12;
    var out = sids.slice(0, max).map(function (id) { return h('span', null, h('i', { class: 'dot ' + (cls || '') }), IL.who(id)); });
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
    return h('div', { class: 'legend' }, items.map(function (it) { return h('span', null, h('i', { class: it.cls || '', style: it.color ? 'background:' + it.color : null }), it.label); }));
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

  // ----- dot strip: every student along one scale -----
  C.strip = function (o) {
    var w = o.w || 640, pad = 14, r = 5, min = o.min != null ? o.min : 0, max = o.max != null ? o.max : 100;
    var x = function (v) { return pad + ((U.clamp(v, min, max) - min) / (max - min)) * (w - 2 * pad); };
    var pts = o.dots.slice().sort(U.by(function (d) { return d.v; })).map(function (d) { return { d: d, x: x(d.v), lvl: 0 }; });
    var levels = [];
    pts.forEach(function (p) {
      var l = 0;
      while (levels[l] != null && p.x - levels[l] < 2 * r + 1.5) l++;
      levels[l] = p.x; p.lvl = l;
    });
    var rows = Math.min(6, levels.length), base = 14 + rows * (2 * r + 1), hh = base + 30;
    var svg = s('svg', { class: 'flex', width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, preserveAspectRatio: 'xMinYMin meet', role: 'img', 'aria-label': o.label || 'distribution of students' });
    if (o.band) svg.appendChild(s('rect', { x: x(o.band[0]), y: 4, width: Math.max(0, x(o.band[1]) - x(o.band[0])), height: base - 2, fill: '#eef1f6', rx: 3 }));
    svg.appendChild(s('line', { x1: pad, x2: w - pad, y1: base + 4, y2: base + 4, class: 'axis' }));
    (o.ticks || [min, (min + max) / 2, max]).forEach(function (t) {
      svg.appendChild(s('text', { x: x(t), y: base + 18, 'text-anchor': 'middle' }, (o.fmt || String)(t)));
    });
    if (o.median != null) {
      svg.appendChild(s('line', { x1: x(o.median), x2: x(o.median), y1: 2, y2: base + 4, stroke: '#1c1e21', 'stroke-width': 2 }));
      svg.appendChild(s('text', { x: x(o.median) + 5, y: 11, 'font-weight': 600 }, (o.medianLabel || 'class median') + ' ' + (o.fmt || String)(o.median)));
    }
    pts.forEach(function (p) {
      var flagged = o.flag ? o.flag(p.d) : false;
      var c = s('circle', { cx: p.x, cy: base - r - Math.min(p.lvl, 5) * (2 * r + 1), r: r, fill: flagged ? (o.flagColor || '#E9A400') : '#8fb1f1', stroke: '#fff', 'stroke-width': 1.5, class: 'mark',
        'data-tip': IL.nm(p.d.sid) + '\n' + (o.fmt || String)(p.d.v) + (p.d.tip ? '\n' + p.d.tip : ''), tabindex: 0 });
      c.addEventListener('click', function () { IL.openStudent(p.d.sid); });
      svg.appendChild(c);
    });
    return svg;
  };

  // ----- register: students by occasions -----
  C.register = function (o) {
    var head = h('tr', null, h('th'), o.cols.map(function (c) { return h('th', { class: o.rot ? 'rot' : '', tip: c.tip || null }, o.rot ? h('div', null, c.label) : c.label); }), o.noteHead ? h('th', { class: 'note' }, o.noteHead) : null);
    var body = o.rows.map(function (r) {
      return h('tr', null, h('td', { class: 'name' }, r.name || IL.who(r.sid)),
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
        on: { click: function (ev) { ev.stopPropagation(); who.hidden = false; who.textContent = ''; add(who, [h('b', null, String.fromCharCode(65 + i) + (isKey ? ' (correct)' : '') + ': '), p.length ? p.map(function (sid, k) { return [k ? ', ' : '', IL.who(sid)]; }) : 'no one']); } } },
        h('span', { class: 'letter' }, String.fromCharCode(65 + i) + (isKey ? ' ✓' : '')),
        h('span', { class: 'text' }, it.opts.labels ? it.opts.labels[i] : 'option ' + String.fromCharCode(65 + i)),
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
    svg.appendChild(s('text', { x: labW + pad, y: 10, fill: '#7c7f85' }, o.aLabel || 'before'));
    svg.appendChild(s('text', { x: w - (o.noteW || 0) - pad, y: 10, 'text-anchor': 'end', fill: '#7c7f85' }, o.bLabel || 'after'));
    o.rows.forEach(function (r, i) {
      var y = 22 + i * rowH + rowH / 2;
      var lab = s('text', { x: 0, y: y + 4, class: r.sid ? 'mark' : '' }, r.sid ? IL.nm(r.sid) : r.label);
      if (r.sid) lab.addEventListener('click', function () { IL.openStudent(r.sid); });
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
        svg.appendChild(s('text', { x: x(r.a != null ? r.a : min) + 14, y: y + 4, fill: '#7c7f85' }, r.hollow));
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
      svg.appendChild(s('rect', { x: x0, y: v >= 0 ? mid - hgt : mid, width: cw, height: hgt, rx: 2, fill: v >= 0 ? (marked ? '#0b3fa8' : '#8fb1f1') : (marked ? '#946400' : '#edc04a'),
        'data-tip': (o.tips ? o.tips[i] + '\n' : '') + (v >= 0 ? '+' : '−') + Math.abs(Math.round(v * 100)) + ' points', tabindex: 0 }));
    });
    if (o.labels) o.labels.forEach(function (l, i) { if (l) svg.appendChild(s('text', { x: labW + i * (cw + gap) + gap / 2 + cw / 2, y: hh + 11, 'text-anchor': 'middle', fill: '#7c7f85' }, l)); });
    if (o.refLabel) svg.appendChild(s('text', { x: labW + n * (cw + gap) + 4, y: mid + 4, fill: '#7c7f85' }, o.refLabel));
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
    var n = o.vals.length, cw = o.cw || 30, bw = Math.min(o.bw || 22, cw - 8), gap = 6, padL = 30, w = o.w || (padL + n * (cw + gap) + 90), hh = o.h || 120, top = 14, base = hh - 20;
    var y = function (v) { return base - (v / o.max) * (base - top); };
    var svg = s('svg', { class: 'flex', width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, preserveAspectRatio: 'xMinYMin meet', role: 'img', 'aria-label': o.label || '' });
    svg.appendChild(s('line', { x1: padL, x2: w - 90, y1: base, y2: base, class: 'axis' }));
    if (o.ref != null) {
      svg.appendChild(s('line', { x1: padL, x2: w - 90, y1: y(o.ref), y2: y(o.ref), stroke: '#1c1e21', 'stroke-width': 1 }));
      svg.appendChild(s('text', { x: w - 86, y: y(o.ref) + 4 }, o.refLabel || ''));
    }
    svg.appendChild(s('text', { x: padL - 6, y: base + 4, 'text-anchor': 'end' }, '0'));
    o.vals.forEach(function (v, i) {
      var x0 = padL + i * (cw + gap) + gap / 2, hgt = Math.max(1, base - y(v.v));
      svg.appendChild(s('rect', { x: x0 + (cw - bw) / 2, y: base - hgt, width: bw, height: hgt, rx: 3, fill: v.pale ? '#d9dce2' : '#1864F2', 'data-tip': v.tip, tabindex: 0 }));
      if (v.label) svg.appendChild(s('text', { x: x0 + cw / 2, y: base + 14, 'text-anchor': 'middle', fill: '#7c7f85' }, v.label));
      if (v.top) svg.appendChild(hgt > 20 ? s('text', { x: x0 + cw / 2, y: base - hgt + 13, 'text-anchor': 'middle', style: 'fill:#fff;font-weight:600' }, v.top) : s('text', { x: x0 + cw / 2, y: base - hgt - 3, 'text-anchor': 'middle' }, v.top));
    });
    return svg;
  };

  // ----- scatter for the activity map -----
  C.scatter = function (o) {
    var w = o.w || 760, hh = Math.round(Math.max(360, Math.min(520, w * 0.55))), padL = 46, padB = 34, padT = 12, padR = 14;
    var xs = o.dots.map(function (d) { return d.x; }), xmax = Math.max.apply(null, xs) * 1.06 || 1, ymin = 0, ymax = 1;
    var x = function (v) { return padL + (v / xmax) * (w - padL - padR); }, y = function (v) { return hh - padB - ((v - ymin) / (ymax - ymin)) * (hh - padB - padT); };
    var svg = s('svg', { class: 'flex', width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, role: 'img', 'aria-label': 'Each student by recorded activity and first-try success' });
    svg.appendChild(s('rect', { x: padL, y: padT, width: w - padL - padR, height: hh - padB - padT, fill: '#fafbfc', stroke: '#e7e8ec' }));
    svg.appendChild(s('line', { x1: x(o.medX), x2: x(o.medX), y1: padT, y2: hh - padB, stroke: '#1c1e21', 'stroke-width': 1 }));
    svg.appendChild(s('line', { x1: padL, x2: w - padR, y1: y(o.medY), y2: y(o.medY), stroke: '#1c1e21', 'stroke-width': 1 }));
    var q = [['Getting it without spending long', padL + 8, padT + 16, 'start'], ['On track', w - padR - 8, padT + 16, 'end'],
      ['Little recorded work', padL + 8, hh - padB - 8, 'start'], ['Putting in the time, not landing it', w - padR - 8, hh - padB - 8, 'end']];
    q.forEach(function (t) { svg.appendChild(s('text', { x: t[1], y: t[2], 'text-anchor': t[3], fill: '#7c7f85', 'font-style': 'italic' }, t[0])); });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) { svg.appendChild(s('text', { x: padL - 6, y: y(t) + 4, 'text-anchor': 'end' }, Math.round(t * 100) + '%')); });
    svg.appendChild(s('text', { x: padL, y: hh - 8, fill: '#4d4f53' }, 'recorded ALPS activity (minutes this term) →'));
    svg.appendChild(s('text', { x: x(o.medX) + 4, y: hh - padB + 14, fill: '#7c7f85' }, 'class median ' + Math.round(o.medX)));
    svg.appendChild(s('text', { x: 12, y: padT + 10, fill: '#4d4f53', transform: 'rotate(-90 12 ' + (padT + 10) + ')', 'text-anchor': 'end' }, 'first-try success ↑'));
    o.dots.forEach(function (d) {
      var g = s('g', { class: 'mark', tabindex: 0, 'data-tip': IL.nm(d.sid) + '\n' + Math.round(d.y * 100) + '% first try · ' + d.x + ' recorded minutes' });
      g.appendChild(s('circle', { cx: x(d.x), cy: y(d.y), r: 12, fill: 'transparent' }));
      g.appendChild(s('circle', { cx: x(d.x), cy: y(d.y), r: 7, fill: d.hot ? '#E9A400' : '#1864F2', 'fill-opacity': 0.85, stroke: '#fff', 'stroke-width': 2 }));
      g.addEventListener('click', function () { IL.openStudent(d.sid); });
      svg.appendChild(g);
    });
    return svg;
  };

  // ----- card wrapper with a table view -----
  C.card = function (o) {
    var body = h('div', null, o.body), tableWrap = h('div', { hidden: true }), showing = false;
    var tools = [];
    if (o.table) tools.push(h('button', { class: 'link-btn', on: { click: function (ev) {
      showing = !showing;
      if (showing && !tableWrap.firstChild) add(tableWrap, o.table());
      tableWrap.hidden = !showing; body.hidden = showing; ev.target.textContent = showing ? 'Chart' : 'Table';
    } } }, 'Table'));
    if (o.tools) tools = tools.concat(o.tools);
    return h('section', { class: 'card ' + (o.cls || '') },
      h('div', { class: 'card-head' }, o.id ? h('span', { class: 'card-id' }, o.id) : null, h('h3', null, o.title), h('div', { class: 'card-tools' }, tools)),
      o.finding ? h('p', { class: 'finding' }, o.finding) : null, o.sub ? h('p', { class: 'sub', style: 'margin:-6px 0 10px' }, o.sub) : null, body, tableWrap,
      o.actions ? h('div', { class: 'actions' }, o.actions) : null, o.guard ? h('p', { class: 'guard' }, o.guard) : null);
  };
  C.table = function (head, rows) {
    return h('table', { class: 't' }, h('thead', null, h('tr', null, head.map(function (x) { return h('th', null, x); }))),
      h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (c) { return h('td', null, c); })); })));
  };
})(typeof window !== 'undefined' ? window : globalThis);

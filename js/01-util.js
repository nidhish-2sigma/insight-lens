/* Insight Lens mock · utilities: seeded randomness, small stats helpers, mock-time helpers.
   Time is kept as minutes since the first Monday of term, so nothing depends on the viewer's time zone. */
(function (root) {
  'use strict';
  var IL = (root.IL = root.IL || {});

  // Deterministic PRNG (mulberry32) so the mock shows the same class every time it loads.
  IL.rng = function (seed) {
    var a = seed >>> 0;
    var r = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); };
    r.range = function (lo, hi) { return lo + r() * (hi - lo); };
    r.pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };
    r.chance = function (p) { return r() < p; };
    r.normal = function () {
      var u = 0, v = 0;
      while (!u) u = r();
      while (!v) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    r.lognormal = function (median, sigma) { return median * Math.exp(sigma * r.normal()); };
    r.weighted = function (weights) {
      var total = 0, i;
      for (i = 0; i < weights.length; i++) total += weights[i];
      var x = r() * total;
      for (i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; }
      return weights.length - 1;
    };
    r.shuffle = function (arr) {
      var a2 = arr.slice();
      for (var i = a2.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var tmp = a2[i]; a2[i] = a2[j]; a2[j] = tmp; }
      return a2;
    };
    return r;
  };

  var U = (IL.U = {});
  U.sigmoid = function (x) { return 1 / (1 + Math.exp(-x)); };
  U.clamp = function (x, lo, hi) { return Math.max(lo, Math.min(hi, x)); };
  U.sum = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; };
  U.mean = function (a) { return a.length ? U.sum(a) / a.length : null; };
  U.quantile = function (a, q) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; });
    var pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  };
  U.median = function (a) { return U.quantile(a, 0.5); };
  U.groupBy = function (arr, fn) {
    var m = new Map();
    arr.forEach(function (x) { var k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
    return m;
  };
  U.pct = function (n, d) { return d ? Math.round((100 * n) / d) : null; };
  U.uniq = function (arr) { return Array.from(new Set(arr)); };
  U.by = function (fn, desc) { return function (a, b) { var x = fn(a), y = fn(b); return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); }; };
  U.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); };

  // Mock time. Day 0 is Monday 24 Aug 2026; t is minutes since that midnight.
  var T = (IL.T = {});
  T.TERM_START_UTC = Date.UTC(2026, 7, 24);
  T.MIN_PER_DAY = 1440;
  T.at = function (day, hour, min) { return day * 1440 + (hour || 0) * 60 + (min || 0); };
  T.day = function (t) { return Math.floor(t / 1440); };
  T.week = function (t) { return Math.floor(T.day(t) / 7); };
  T.dow = function (t) { return ((T.day(t) % 7) + 7) % 7; };          // 0 = Monday
  T.hour = function (t) { return Math.floor((((t % 1440) + 1440) % 1440) / 60); };
  T.date = function (day) { return new Date(T.TERM_START_UTC + day * 86400000); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  T.DOW = DOW;
  T.fmtDay = function (day) { var d = T.date(day); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
  T.fmtDayLong = function (day) { return DOW[((day % 7) + 7) % 7] + ' ' + T.fmtDay(day); };
  T.fmt = function (t) { return T.fmtDay(T.day(t)); };
  T.fmtTime = function (t) {
    var m = ((t % 1440) + 1440) % 1440, h = Math.floor(m / 60), mi = Math.floor(m % 60);
    return T.fmtDayLong(T.day(t)) + ', ' + (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
  };
  T.monthOfWeek = function (w) { return MON[T.date(w * 7).getUTCMonth()]; };
  T.ago = function (t, now) {
    var d = T.day(now) - T.day(t);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    return d + ' days ago';
  };
  T.dur = function (sec) {
    sec = Math.round(sec);
    if (sec < 60) return sec + ' s';
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ' min' + (s && m < 10 ? ' ' + s + ' s' : '');
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Insight Lens mock · start. */
(function (root) {
  'use strict';
  if (!root.document) return;
  try {
    root.IL.boot();
  } catch (e) {
    var app = root.document.getElementById('app');
    app.textContent = 'The mock failed to start: ' + e.message;
    throw e;
  }
})(typeof window !== 'undefined' ? window : globalThis);

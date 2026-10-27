// Semantic contract, root isolation and lifecycle checks; no browser dependency.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const listeners = new Map(), nodes = new Map();
const target = name => ({
  addEventListener(event, fn) { const key = name + ':' + event; if (!listeners.has(key)) listeners.set(key, new Set()); listeners.get(key).add(fn); },
  removeEventListener(event, fn) { listeners.get(name + ':' + event)?.delete(fn); }
});
const node = id => {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false, clientWidth: 1200, classList: { add() {}, remove() {}, toggle() {} }, style: { setProperty() {} }, focus() {}, querySelectorAll() { return []; }, querySelector() { return null; } });
  return nodes.get(id);
};
const doc = { ...target('document'), querySelector(s) { return s === '[data-insight-lens]' ? null : node(s); }, querySelectorAll() { return []; } };
const ctx = vm.createContext({ window: { ...target('window'), innerWidth: 1200 }, document: doc, location: { search: '', hash: '', pathname: '/index.html' }, history: { replaceState() { throw Error('Host routing was accessed'); } }, URL, setTimeout() {}, clearTimeout() {}, console });
for (const file of ['js/alps-design-system.js', 'data/class.js', 'data/example.js', 'data/prereqs.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
const design = ctx.window.INSIGHT_ALPS;
assert.deepEqual(Array.from(design.performance, l => l.label), ['Beginning', 'Attempted', 'Familiar', 'Proficient', 'Mastered']);
assert.deepEqual(Array.from({ length: 5 }, (_, i) => design.theme['level-' + i].fallback.toUpperCase()), ['#D7D7D7', '#E3F2FD', '#90CAF9', '#1876D2', '#0D47A1']);
assert.equal(design.theme['brand-accent'].fallback, '#FF9C39');
assert.equal(design.theme.primary.fallback, '#1864F2');
assert.equal(design.theme.correct.fallback, '#408B4D');
assert.equal(design.theme.incorrect.fallback, '#DC3545');
assert.equal(design.theme.warning.fallback, '#E19F01');
const source = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
const expose = 'globalThis.ALPSTEST={itemKey,itemLabel,qIcon,glyph,rsOf,RIC,IT,D,S,go,cellMark};';
vm.runInContext(source.replace('renderHead();fromHash();render();', expose), ctx);
const original = JSON.stringify(ctx.window.ATLAS_DATA), routeEvents = [];
const appRoot = { ...node('root'), ...target('root'), nodeType: 1, querySelector: node };
const config = { embedded: true, search: '?books', hash: '#skills', onNavigate: route => routeEvents.push(route) };
const app = ctx.window.InsightLens.mount(appRoot, config);
let t = ctx.ALPSTEST;
assert.equal(t.itemKey('Click or drag', 'clickablearea'), 'clickablearea');
assert.equal(t.itemKey('Click or drag', 'dragndrop'), 'dragndrop');
assert.equal(t.itemKey('Click or drag'), 'unknown', 'ambiguous format must not acquire a false item type');
assert.equal(t.itemKey('Parsons', 'parsonprob'), 'parsonsprob', 'export alias maps to canonical ALPS type');
assert.equal(t.itemLabel('Click or drag', 'clickablearea'), 'Clickable area');
assert.equal(t.itemLabel('Click or drag', 'dragndrop'), 'Drag and drop');
assert.notEqual(design.itemColors.clickablearea, design.itemColors.dragndrop);
assert(t.glyph(6).includes(design.icons.skill.paths[0]), 'Skills uses the shared head-and-gear asset');
for (const [f, type] of [['Code', 'activecode'], ['MCQ', 'mchoice'], ['FITB', 'fillintheblank'], ['Parsons', 'parsonsprob'], ['Click or drag', 'clickablearea'], ['Click or drag', 'dragndrop']]) {
  const icon = t.qIcon(f, type);
  assert(icon.includes(design.icons[type].paths[0]));
  assert(icon.includes('--il-item-' + type));
}
assert(t.RIC.c1.includes('var(--il-good)') && t.RIC.c1.includes('<circle'));
assert(t.RIC.nc.includes('var(--il-bad)') && t.RIC.nc.includes('<circle'));
assert(!t.RIC.rr.includes('--il-watch'), 'rapid retry speed must not use pending-grading amber');
assert(t.RIC.rr.includes('--il-ink-2'), 'rapid retry remains distinct from ordinary retry');
assert.equal(t.rsOf(null), 'ns');
assert(t.IT.every(it => it.type === t.D.items[it.ix].type), 'raw item type is retained separately from scoring format');
assert.equal(JSON.stringify(ctx.window.ATLAS_DATA), original, 'mount does not expand or mutate host data');
assert(![...listeners.keys()].some(key => key.startsWith('document:')), 'events attach to the mounted root');
assert(!listeners.has('window:hashchange'), 'embedded mode does not subscribe to host routing');
app.navigate('?books&book=java-short-labs#engagement');
assert.equal(ctx.ALPSTEST.S.view, 2);
assert.equal(routeEvents.length, 1);
assert.equal(JSON.stringify(ctx.window.ATLAS_DATA), original, 'navigation does not duplicate example books in host data');
app.destroy();
assert([...listeners.values()].every(set => set.size === 0), 'destroy removes every root and window listener');
assert.equal(appRoot.innerHTML, '');
const remount = ctx.window.InsightLens.mount(appRoot, { embedded: true });
const replacement = ctx.window.InsightLens.mount(appRoot, { embedded: true });
remount.destroy(); // An old React cleanup must not destroy the replacement.
assert.equal(appRoot.__insightLens, replacement);
replacement.destroy();
assert([...listeners.values()].every(set => set.size === 0));
const savedData=ctx.window.ATLAS_DATA;
delete ctx.window.ATLAS_DATA;
const empty=ctx.window.InsightLens.mount(appRoot,{embedded:true});
assert(node('#view').innerHTML.includes('No class data yet'));
empty.destroy();assert.equal(appRoot.innerHTML,'');
ctx.window.ATLAS_DATA=savedData;
for (const name of ['alps-theme', 'atlas', 'skills-review', 'ready-actions-review', 'comparison', 'visuals']) {
  const css = fs.readFileSync(path.join(root, 'css', name + '.css'), 'utf8');
  const declarations = [...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]);
  assert(declarations.every(token => token.startsWith('--il-')), name + ' declares only private variables');
  assert(!/^[ \t]*(?::root|html\b|body\s*\{)/m.test(css), name + ' leaves host globals alone');
}
console.log('ALPS theme checks passed: canonical icons and colors, distinct item types, immutable host data, root events, local routing and clean remounts.');

// Recount the rendered question outcomes from the real student records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/atlas.js'), 'utf8');
const boot = 'renderHead();fromHash();render();';
let questions = 0, unmarked = 0, links = 0, scopes = 0, overlappingScopes = 0;
for (const search of ['', '?books', '?books&book=java-short-labs', '?today=2025-11-19']) {
  const context = vm.createContext({
    window: { innerWidth: 1440, addEventListener() {} },
    document: { addEventListener() {}, querySelector(s) { return s === '[data-insight-lens]' ? {} : null; } },
    location: { search, hash: '#stall-points', pathname: '/index.html' },
    setTimeout() {}, clearTimeout() {}, console
  });
  for (const file of ['js/alps-design-system.js','data/class.js', 'data/example.js', 'data/prereqs.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  vm.runInContext(source.replace(boot, 'globalThis.STALL_REVIEW={S,ALL,tree7,cOut,v8,open7,ex7,stallScopeCounts};'), context);
  const X = context.STALL_REVIEW;
  X.S.view = 7; X.S.v8.all = true; X.S.fold['pv-sp-unit'] = true;
  const tree = X.tree7(0, null), rows = tree.flatMap(U => U.subs.flatMap(J => J.cs));
  const html = X.v8();
  assert(!/undefined|NaN|Infinity/.test(html));
  assert(!html.includes('id="v8ver"'), 'format versions are absent from ordinary use');
  const ranked = html.split('id="pv-sp-unit"')[0];
  assert.equal((ranked.match(/class="visual-row visual-choice/g) || []).length, rows.length);
  const verifyScope=(key,cs)=>{
    const count=q=>X.ALL.filter(i=>cs.some(C=>X.cOut(0,C.j)[C.s][i]===q)).length;
    const expected={notCorrect:count(2),skipped:count(3),total:X.ALL.length,questions:cs.length};
    assert.deepEqual(JSON.parse(JSON.stringify(X.stallScopeCounts(0,cs,X.ALL))),expected,'unit and lesson counts include each student once per outcome');
    const summary=html.match(new RegExp(`data-fold="${key}"[^>]*><summary[^>]*data-not-correct="(\\d+)" data-skipped="(\\d+)" data-total="(\\d+)" data-questions="(\\d+)"`));
    assert(summary,'every recorded unit and lesson has an expandable comparison row');
    assert.deepEqual(summary.slice(1).map(Number),[expected.notCorrect,expected.skipped,expected.total,expected.questions]);
    if(expected.notCorrect+expected.skipped>expected.total)overlappingScopes++;
    scopes++;
  };
  tree.filter(U=>U.on).forEach(U=>{const lessons=U.subs.filter(J=>J.on&&J.cs.length);verifyScope('stall-unit-'+U.u,lessons.flatMap(J=>J.cs));lessons.forEach(J=>verifyScope('stall-lesson-'+J.j,J.cs));});
  for (const C of rows) {
    const outcome = X.cOut(0, C.j)[C.s];
    const counts = [0, 1, 2, 3, 4].map(q => X.ALL.filter(i => outcome[i] === q).length);
    assert.deepEqual(Array.from(C.t), counts, 'question counts reflect each student once');
    const bar=ranked.match(new RegExp(`<button[^>]*data-act="v8c" data-j="${C.j}" data-s="${C.s}"[^>]*>[^]*?</button>`));
    assert(bar&&bar[0].includes(`data-counts="${counts.join(',')}"`),'the primary outcome bar has the same exact partition');
    assert.equal(counts.reduce((a,b)=>a+b,0),C.n);
    for(const q of [0,1,2,3,4])if(counts[q])assert(bar[0].includes(`data-outcome="${q}" style="width:${counts[q]/C.n*100}%`),'each segment uses the full student-count scale');
    assert(bar[0].includes(`${counts[2]+counts[3]} of ${C.n} to review`));
    for(const count of counts.filter(Boolean))assert(bar[0].includes(`class="outcome-count" aria-hidden="true">${count}</span>`),'exact counts remain in the primary stacked bar');
    if (C.kind === 'r') {
      assert(!/correct first time/.test(bar[0]), 'an unmarked attempt is not displayed as achievement');
      assert(bar[0].includes('no working check')); unmarked++;
    }
    X.S.fold['stall-unit-' + tree.find(U => U.subs.some(J => J.j === C.j)).u] = false;
    X.S.fold['stall-lesson-' + C.j] = false;
    X.open7(0, C.j, C.s);
    assert(X.S.fold['stall-lesson-' + C.j], 'a linked question reopens its lesson');
    links++; questions++;
  }
  assert(html.includes('The two groups can overlap'), 'unique parent outcomes are not presented as a partition');
  assert(html.includes('student–question records'), 'pooled distributions name their denominator');
}
assert(questions > 0 && unmarked > 0 && overlappingScopes > 0);
console.log(`Stall review checks passed: ${questions} question outcomes, ${unmarked} unmarked items, ${links} linked questions, ${scopes} unique-student comparisons (${overlappingScopes} overlapping groups).`);

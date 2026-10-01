// Quick look at the generated world: node tools/smoke.js
const path = require('path');
['01-util', '02-content', '03-generate'].forEach(f => require(path.join(__dirname, '..', 'js', f + '.js')));
const IL = globalThis.IL, U = IL.U, T = IL.T;
const t0 = Date.now();
const w = IL.generate();
console.log('generated in', Date.now() - t0, 'ms');
w.sections.forEach(sec => {
  const graded = sec.records.filter(r => r.attempts[0].ok != null);
  const fts = U.mean(graded.map(r => r.attempts[0].ok ? 1 : 0));
  const ev = U.mean(graded.map(r => r.attempts.some(a => a.ok) ? 1 : 0));
  const byType = U.groupBy(graded, r => sec.items[r.item].type);
  const perStu = U.groupBy(graded, r => r.sid);
  const sf = [...perStu.values()].map(rs => U.mean(rs.map(r => r.attempts[0].ok ? 1 : 0)));
  const retries = []; graded.forEach(r => { if (sec.items[r.item].type === 'mchoice') r.attempts.slice(1).forEach(a => retries.push(a.dur)); });
  const mins = Object.values(sec.act).map(d => U.sum(Object.values(d).map(x => x.min)));
  console.log(`\n== ${sec.id} ${sec.name} · roster ${sec.roster.length} · items ${sec.itemList.length} · assignments ${sec.assignments.length} · records ${sec.records.length} · attempts ${U.sum(sec.records.map(r => r.attempts.length))}`);
  console.log(' first-try', fts.toFixed(3), '· eventual', ev.toFixed(3), '· per-student FTS min/med/max', U.quantile(sf, 0).toFixed(2), U.median(sf).toFixed(2), U.quantile(sf, 1).toFixed(2));
  console.log(' by type:', [...byType].map(([k, rs]) => `${k} ${U.mean(rs.map(r => r.attempts[0].ok ? 1 : 0)).toFixed(2)} (n${rs.length})`).join(' · '));
  console.log(' mcq retries <3s:', (retries.filter(d => d < 3).length / retries.length).toFixed(2), 'of', retries.length, '· median retry gap', U.median(retries));
  console.log(' active minutes per student: med', U.median(mins), 'max', Math.max(...mins), '· per week ≈', Math.round(U.median(mins) / 11));
  const pend = sec.records.filter(r => r.attempts.every(a => a.ok == null) && sec.items[r.item].type === 'shortanswer').length;
  console.log(' to grade', pend, '· questions', sec.waiting.questions.length, '· failed', sec.waiting.failed.length, '· feedback', sec.feedback.length, '· markers', sec.markers.length, '· actions', sec.actions.map(a => a.type + ':' + a.students.length).join(', '));
  const les = sec.assignments.filter(a => a.kind === 'lesson');
  console.log(' lessons:', les.map(a => { const wk = sec.asgWork[a.id]; const st = Object.keys(wk).length; const done = Object.values(wk).filter(x => x.items >= a.items.length).length; return `${a.short.split(' ')[0]}:${st}/${done}`; }).join(' '));
});

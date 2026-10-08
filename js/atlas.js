/* Insight Lens mock · the Course Atlas: a table of every student, student profiles and nine views of one
   class, on real class data. data/class.js (written by tools/export-atlas.py from the database) holds the facts;
   this script works out every figure from them: the data layer first, then one function per view, then rendering
   and events.

   Colours and type come from css/atlas.css, which answers this script's colour names from the Insight Lens theme. */
(function(){
'use strict';
/* ---------- utilities ---------- */
const f1=n=>(+n).toFixed(1);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sgn=v=>v>0?'+'+v:v<0?'−'+Math.abs(v):'0';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pc=(a,b)=>b?Math.round(a/b*100):0;
const pl=(n,s,p)=>n===1?s:(p||s+'s');
const andList=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
const sum=a=>a.reduce((x,y)=>x+y,0);
const NUMW=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
const numWord=n=>NUMW[n]||String(n);
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- the class ----------
   Everything below is worked out from data/class.js, which tools/export-atlas.py writes from the database.
   That file holds facts only: who is in the class, the textbook outline, each student's result on each question
   and when. Every figure on screen is computed here, so another class only needs another export. */
const D=window.ATLAS_DATA;
if(!D){const v=document.getElementById('view');if(v)v.innerHTML='<p class="none" style="padding:24px">No class data yet. Run tools/export-atlas.py to write data/class.js, then reload.</p>';return}
const YEAR=36; // the class has no term dates in the database, so a school year of 36 weeks is assumed (used by the pace page only)
const CLASS={name:esc(D.meta.name),subject:esc(D.meta.textbook),weeks:YEAR};
const NM=(function(){const seen={};return D.students.map(s=>{let n=esc(s);if(seen[n])n+=' '+(++seen[n]);else seen[n]=1;return n})})();
const ID={};NM.forEach((n,i)=>{ID[n]=i});
const N=NM.length,NWK=CLASS.weeks,ALL=NM.map((_,i)=>i);
const avg=a=>a.length?sum(a)/a.length:null;
const qt=(a,p)=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor((s.length-1)*p)]};
const cut=(s,n)=>s.length>n?s.slice(0,n-1).trimEnd()+'…':s;

/* ---------- time: days count from the Monday of the first week of work ---------- */
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const wkOf=d=>Math.floor(d/7)+1;
const dayDate=d=>{const t=new Date(D.meta.day0+'T12:00:00');t.setDate(t.getDate()+d);return t.getDate()+' '+MON[t.getMonth()]};
const ACTD=NM.map(()=>new Set());D.daily.forEach(r=>{if(r[2]>0||r[3]>0)ACTD[r[0]].add(r[1])});
/* "now" is the last week in which at least half the class worked; nothing after it is used */
const NOW=(function(){const by={};ACTD.forEach((s,i)=>s.forEach(d=>{const w=wkOf(d);(by[w]=by[w]||new Set()).add(i)}));return Math.max(1,...Object.keys(by).map(Number).filter(w=>by[w].size>=N/2))})();
const LASTDAY=NOW*7-1;
const wkTxt=o=>!o.wk?'not started':o.wk[0]===o.wk[1]?`week ${o.wk[0]}`:`weeks ${o.wk[0]}–${o.wk[1]}`;

/* ---------- questions and each student's result on them ---------- */
const FMT=['MCQ','FITB','Parsons','Code','Click or drag'];
const FOF={mchoice:'MCQ',fillintheblank:'FITB',parsonsprob:'Parsons',parsonprob:'Parsons',activecode:'Code',clickablearea:'Click or drag',dragndrop:'Click or drag'};
/* q = quick question, t = longer task; seconds each usually takes */
const FKIND={MCQ:'q',FITB:'q',Parsons:'t',Code:'t','Click or drag':'q'};
const FSEC={MCQ:60,FITB:60,Parsons:120,Code:420,'Click or drag':60};
/* formats with lettered options, where it helps to see who chose each one */
const IT=D.items.map((it,ix)=>({ix,name:esc(it.name||'Untitled'),f:FOF[it.type]||null,j:it.sub,u:D.subs[it.sub].u,ks:it.skills||[]}));
/* AT[student].get(question) = [student, question, right first try, right within 3, ever right, tries, first day, seconds, last day, the try that was first right, seconds on the first try] */
const AT=NM.map(()=>new Map());D.att.forEach(a=>{if(a[6]<=LASTDAY&&IT[a[1]].f)AT[a[0]].set(a[1],a)});
const IWHO=IT.map(()=>[]);AT.forEach((m,i)=>m.forEach((a,ix)=>IWHO[ix].push(i)));
/* credit for one question: a quick question counts when right first time (half on the second try);
   a code or Parsons task counts when right within three tries (half within six) */
const credit=a=>{const r=a[9],q=FKIND[IT[a[1]].f]==='q';return !r?0:q?(r===1?1:r===2?.5:0):(r<=3?1:r<=6?.5:0)};
/* eight or more tried it and nobody's answer was ever marked right: it has no working check, so it can't show who understands */
const NOCHK=IT.map((it,ix)=>IWHO[ix].length>=8&&!IWHO[ix].some(i=>AT[i].get(ix)[4]));
/* the class's questions: the ones at least a quarter of the class tried */
const CI=IT.map((it,ix)=>!!it.f&&IWHO[ix].length>=N/4);

/* ---------- the textbook: every unit and subunit, started or not ----------
   A subunit is started once a quarter of the class has tried one of its questions. Its weeks are when the class
   worked on it (10th to 90th percentile of each student's first try), not a plan: the database holds no plan. */
const SUBS=D.subs.map((s,j)=>{const fd=new Map();s.items.forEach(ix=>IWHO[ix].forEach(i=>{const d=AT[i].get(ix)[6];if(!fd.has(i)||d<fd.get(i))fd.set(i,d)}));
  const days=[...fd.values()],its=s.items.filter(ix=>CI[ix]),on=fd.size>=N/4&&its.length>0;
  return {id:j,u:s.u,n:esc(s.code+' '+s.name),s:esc(s.code),on,wk:on?[wkOf(qt(days,.1)),wkOf(qt(days,.9))]:null,mid:on?qt(days,.5):null,its,
    t:s.skills.filter(k=>k[1]).map(k=>k[0]),a:s.skills.filter(k=>k[2]).map(k=>k[0])}});
const TB=[{n:CLASS.subject,s:CLASS.subject,who:NM,units:D.units.map(U=>{const js=U.subs,on=js.filter(j=>SUBS[j].on);
  return {n:esc(U.name),s:'Unit '+esc(U.num),js,subs:js.map(j=>SUBS[j]),on:on.length>0,
    wk:on.length?[Math.min(...on.map(j=>SUBS[j].wk[0])),Math.max(...on.map(j=>wkOf(SUBS[j].mid)))]:null,mid:on.length?Math.max(...on.map(j=>SUBS[j].mid)):null}})}];
const inTB=()=>true,tbWho=()=>ALL.slice();
const TB0=TB[0].units,J0=j=>SUBS[j];
const TBU=(tb,u)=>TB0[u],TBJ=(tb,j)=>SUBS[j];
const uJs=(tb,u)=>TB0[u].js;            // a unit's subunits, in textbook order
const uOfJ=j=>SUBS[j].u;
const tU=(tb,u)=>TB0[u].on;
const jSk=(tb,j)=>{const s=SUBS[j];return [...new Set(s.t.concat(s.a))]};
const uSk=(tb,u)=>[...new Set(TB0[u].js.filter(j=>SUBS[j].on).flatMap(j=>jSk(tb,j)))];
const UN=TB0.map(U=>[U.n,U.s]),SUB=SUBS.map(s=>s.n);

/* ---------- skills ----------
   Each subunit lists the few skills it gives most teaching weight to; each question is tagged with skills.
   A skill is taught once a started subunit lists it. */
const ASK=D.skills.map(esc),ASKS=D.skills.map(s=>esc(cut(s,18))),ASKM=D.skills.map(s=>esc(cut(s,27))),SK=ASK,SKS=ASKS;
const skn=k=>k>=0&&k!==null&&ASK[k]?ASK[k]:'no skill tagged';
const KIT=ASK.map(()=>[]);IT.forEach(it=>{if(it.f&&!NOCHK[it.ix])it.ks.forEach(k=>KIT[k].push(it.ix))});  // questions that check each skill
const chk5=k=>KIT[k].length>0;
const KTAUGHT=ASK.map(()=>false);D.subs.forEach(s=>s.skills.forEach(q=>{if(q[1])KTAUGHT[q[0]]=true}));
const KT=ASK.map(()=>null),KHOME=ASK.map(()=>null);  // the week the class first met each skill, and the subunit where it did
TB0.forEach(U=>U.js.forEach(j=>{const s=SUBS[j];if(s.on)jSk(0,j).forEach(k=>{if(KT[k]===null||s.mid<SUBS[KHOME[k]].mid){KT[k]=s.wk[0];KHOME[k]=j}})}));
TB0.forEach(U=>U.js.forEach(j=>jSk(0,j).forEach(k=>{if(KHOME[k]===null)KHOME[k]=j})));
const taught=k=>KT[k]!==null;
const TSK=ASK.map((_,k)=>k).filter(taught).sort((a,b)=>SUBS[KHOME[a]].mid-SUBS[KHOME[b]].mid||a-b);  // taught skills, in the order the class met them
const NK=TSK.length;
/* the course plan, as far as the data shows one: the class keeps meeting new skills at the rate it has so far */
const NSK=Math.max(NK+2,Math.min(ASK.length,Math.round(NK*NWK/NOW)));
const uOf=k=>SUBS[KHOME[k]].u,jOf=k=>KHOME[k];
const tbOfSub=k=>[{ix:0,t:KTAUGHT[k],a:chk5(k)}];
/* a later check of a skill counts once it comes this many weeks after the student first met it (fading skills) */
const RECHECK=3,LATER='three or more weeks later';

/* ---------- mastery ----------
   The evidence for a student on a skill is every question tagged with it that they tried, in date order, plus
   repeat tries in a practice set the teacher targeted. MT = average credit when first taught, ML = average credit
   on checks RECHECK or more weeks later, EV = number of checks, CUR = current estimate, CAT = category. */
const EVD=NM.map(()=>ASK.map(()=>null));
AT.forEach((m,i)=>m.forEach((a,ix)=>{if(NOCHK[ix])return;const c=credit(a);IT[ix].ks.forEach(k=>{(EVD[i][k]=EVD[i][k]||[]).push({d:a[6],c})})}));
D.sets.forEach(st=>st.rows.forEach(([i,ix,ok1,ever,d])=>{const a=AT[i].get(ix);if(!a||NOCHK[ix]||d>LASTDAY||d<a[6]+14)return;IT[ix].ks.forEach(k=>{(EVD[i][k]=EVD[i][k]||[]).push({d,c:ok1?1:ever?.5:0})})}));
EVD.forEach(r=>r.forEach(e=>{if(e)e.sort((x,y)=>x.d-y.d)}));
function estOf(i,k,day){const all=EVD[i][k];if(!all)return null;const e=all.filter(x=>x.d<=day);if(!e.length)return null;
  const t0=e[0].d,a=e.filter(x=>x.d<t0+RECHECK*7),b=e.filter(x=>x.d>=t0+RECHECK*7),mt=avg(a.map(x=>x.c)),ml=b.length?avg(b.map(x=>x.c)):null;
  return {mt,ml,ev:e.length,c:ml===null?mt:.4*mt+.6*ml}}
const catFrom=(ev,c)=>ev===0?'N':ev<2?'Q':c>=.8?'F':c>=.6?'H':'E';
const MT=[],ML=[],EV=[],CUR=[],CAT=[];
ALL.forEach(i=>{MT[i]=[];ML[i]=[];EV[i]=[];CUR[i]=[];CAT[i]=[];ASK.forEach((_,k)=>{const e=taught(k)?estOf(i,k,LASTDAY):null;
  MT[i][k]=e?e.mt:null;ML[i][k]=e?e.ml:null;EV[i][k]=e?e.ev:0;CUR[i][k]=e?e.c:null;CAT[i][k]=!taught(k)?'X':catFrom(e?e.ev:0,e?e.c:0)})});
const CL={F:'Secure',H:'Developing',E:'Not yet',Q:'Only one check so far',N:'No evidence yet',X:'Not taught yet'};
const mast=(i,k)=>taught(k)?{c:CUR[i][k],ev:EV[i][k],cat:CAT[i][k]}:null;
const fCount=i=>TSK.filter(k=>CAT[i][k]==='F').length;
/* where each student stood on each taught skill at the end of each week: 2 secure, 1 developing, 0 not yet, -1 fewer than two checks */
const STW=ALL.map(i=>{const o={};TSK.forEach(k=>{const a=[];for(let w=1;w<=NOW;w++){const e=estOf(i,k,w*7-1);a.push(!e||e.ev<2?-1:e.c>=.8?2:e.c>=.6?1:0)}o[k]=a});return o});
/* the share of the skills taught by the end of week w that were secure then */
function secAt(i,w){const ks=TSK.filter(k=>KT[k]<=w);return ks.length?ks.filter(k=>STW[i][k][w-1]===2).length/ks.length:0}

/* ---------- views 2 and 5: practice done and mastery for any unit, subunit or skill ----------
   Practice done is the share of the class's questions there that the student tried. */
const nodeItems=n=>n.t==='u'?TB0[n.id].js.flatMap(j=>SUBS[j].on?SUBS[j].its:[]):n.t==='j'?(SUBS[n.id].on?SUBS[n.id].its:[]):
  (n.j!==undefined&&SUBS[n.j].its.some(ix=>IT[ix].ks.includes(n.id))?SUBS[n.j].its.filter(ix=>IT[ix].ks.includes(n.id)):KIT[n.id].filter(ix=>CI[ix]));
const nodeSkills=n=>n.t==='u'?uSk(0,n.id):n.t==='j'?jSk(0,n.id):[n.id];
const cellMemo=new Map();
function cellN(i,tb,n){const key=i+n.t+n.id+(n.t==='k'&&n.j!==undefined?'/'+n.j:'');let b=cellMemo.get(key);
  if(b===undefined){const its=nodeItems(n);if(!its.length)b=null;else{let d=0;its.forEach(ix=>{if(AT[i].has(ix))d++});const ks=nodeSkills(n).filter(k=>EV[i][k]>=2);b={e:d/its.length,m:ks.length?avg(ks.map(k=>CUR[i][k])):null}}cellMemo.set(key,b)}
  if(!b)return {g:'x'};
  const e=b.e,m=b.m,mc=m===null?'U':m>=.8?'S':m>=.6?'D':'N',doing=e>=S.v2.line/100;
  return {e,m,mc,doing,g:doing?(mc==='S'?'on':mc==='D'?'go':mc==='N'?'stuck':'early'):(mc==='S'?'coast':'off')}}
const cell2=(i,n)=>cellN(i,0,n);
const KS2={u:u=>({t:'u',id:u}),j:j=>({t:'j',id:j}),k:k=>({t:'k',id:k})};

/* ---------- view 4: pace ---------- */
const PS=[['Short, not catching up','var(--bad)','tbad','bad'],['Short, but catching up','var(--watch)','twatch','watch'],['Ahead now, but slowing','var(--watch)','twatch','watch'],['On pace','var(--neutral)','t2','neutral'],['Ahead','var(--good)','tgood','good']];
const PSI={};PS.forEach((p,ix)=>{PSI[p[0]]=ix});
/* recent = the last 30% of the skills taught; earlier = the rest */
function paceOf(i,goal){const c=TSK.map(k=>CAT[i][k]),now=c.filter(x=>x==='F').length,at=Math.round(NK*.7);
  const fs=(a,b)=>{const e=c.slice(a,b).filter(x=>x==='F'||x==='H'||x==='E');return e.length?e.filter(x=>x==='F').length/e.length:0};
  const rec=fs(at,NK),ear=fs(0,at),due=goal*NOW/NWK,proj=Math.min(NSK,now+rec*(NSK-NK));let st;
  if(now>=due&&rec<=ear-.4)st='Ahead now, but slowing';
  else if(proj>=goal)st=now>=due+2?'Ahead':'On pace';
  else if(rec>=ear+.15)st='Short, but catching up';
  else st='Short, not catching up';
  return {now,rec,ear,due,proj,st}}

/* ---------- view 3: weekly activity ----------
   The class's work in a week is every question a quarter of the class first tried that week. A student's activity
   is the share of it they had tried by the end of the week. Work in a practice set the teacher targeted counts
   too. Weeks with almost no class work (breaks) carry the last value forward and are left out of the rules. */
const WI=[];for(let w=0;w<=NOW;w++)WI[w]=[];
/* one piece of work = a map of student to the week they first did it; it belongs to each week a quarter of the class first did it in */
const addWork=m=>{const by={};m.forEach(w=>{by[w]=(by[w]||0)+1});Object.keys(by).forEach(w=>{if(by[w]>=N/4&&+w<=NOW)WI[+w].push(m)})};
IT.forEach(it=>{if(CI[it.ix])addWork(new Map(IWHO[it.ix].map(i=>[i,wkOf(AT[i].get(it.ix)[6])])))});
D.sets.forEach(st=>{const by={};st.rows.forEach(([i,ix,o,e,d])=>{if(d>LASTDAY)return;const m=by[ix]=by[ix]||new Map(),w=wkOf(d);if(!m.has(i)||w<m.get(i))m.set(i,w)});Object.keys(by).forEach(ix=>addWork(by[ix]))});
const CW=[];for(let w=1;w<=NOW;w++)if(WI[w].length>=5)CW.push(w);
const WORKC=ALL.map(i=>CW.map(w=>{let d=0;WI[w].forEach(m=>{if(m.has(i)&&m.get(i)<=w)d++});return Math.round(d/WI[w].length*100)}));
const WORK=ALL.map(i=>{const o=[];let v=WORKC[i].length?WORKC[i][0]:0;for(let w=1;w<=NOW;w++){const ix=CW.indexOf(w);if(ix>=0)v=WORKC[i][ix];o.push(v)}return o});
/* each student's normal range comes from the first BASEN weeks of class work; BASE is the calendar week that ends them */
const BASEN=Math.max(2,Math.min(8,Math.round(CW.length*.6))),BASE=CW[BASEN-1]||NOW;
const BAND=WORKC.map(a=>{const b=a.slice(0,BASEN),m=b.length?sum(b)/b.length:0,sd=b.length?Math.sqrt(sum(b.map(y=>(y-m)*(y-m)))/b.length):0,h=Math.max(12,1.6*sd);return {m,lo:m-h,hi:Math.min(100,m+h)}});
/* drifting = two weeks running below the band, still below it on average since then, and below it in the latest week of class work */
const DR=WORKC.map((a,i)=>{const lo=BAND[i].lo;if(!(a[a.length-1]<lo))return 0;for(let w=BASEN;w<a.length-1;w++){if(a[w]<lo&&a[w+1]<lo){const rest=a.slice(w);if(sum(rest)/rest.length<lo)return CW[w]}}return 0});
const WATCH=WORKC.map((a,i)=>!DR[i]&&a.length>BASEN&&a[a.length-1]<BAND[i].lo);
/* the signals beside each line: class days with no work, assigned sets not finished, and the change in accuracy */
const CDAYS=(function(){const by={};ACTD.forEach(s=>s.forEach(d=>{by[d]=(by[d]||0)+1}));return Object.keys(by).map(Number).filter(d=>by[d]>=N/2&&d<=LASTDAY).sort((a,b)=>a-b)})();
const SIG={};NM.forEach((n,i)=>{const rc=CDAYS.slice(-6),miss=rc.filter(d=>!ACTD[i].has(d)).length,work=D.coursework.filter(c=>c.due<=LASTDAY&&c.due>LASTDAY-35&&!c.done.includes(i)).length;
  const base=[],late=[],cutA=BASE*7,cutB=(CW[Math.max(0,CW.length-3)]-1)*7;AT[i].forEach((a,ix)=>{if(NOCHK[ix])return;if(a[6]<cutA)base.push(credit(a));if(a[6]>=cutB)late.push(credit(a))});
  const acc=base.length>=5&&late.length>=5?Math.round((avg(late)-avg(base))*100):0,p=[];
  if(miss>=2)p.push(`no work on ${miss} of the last ${rc.length} class days`);if(work>=2)p.push(`${work} assigned sets unfinished`);if(acc<=-10)p.push(`accuracy down ${-acc} points`);
  const t=p.length?andList(p):'doing less of each week’s work than before';
  SIG[n]={idle:0,acc,miss,work,of:rc.length,pat:t[0].toUpperCase()+t.slice(1)+'.'}});


/* ---------- view 6: shared weak skills ----------
   A skill is a shared weakness when a fifth of the class or more is "not yet" on it at the same time (mastery under 60% on two or
   more checks). One lifeline per skill: its thickness is the share of the class not yet secure on it at the end of each week, so a
   line that thins is a skill the class is getting on top of. */
const SG={'Getting worse':'p','Still weak':'p',Improving:'f',Recovered:'g'};
const SC={p:['var(--bad)','tbad','Still weak','bad'],f:['var(--neutral)','t2','Improving','neutral'],g:['var(--gone)','tgone','Recovered','gone']};
const WEAK=(function(){const rows=[];
  TSK.forEach(k=>{if(!chk5(k))return;const cnt=[];for(let w=0;w<NOW;w++)cnt.push(ALL.filter(i=>STW[i][k][w]===0).length);
    const v=cnt.map(c=>Math.round(c/N*100)),peak=Math.max(...v),now=v[NOW-1];if(peak<20||Math.max(...cnt)<5)return;
    const pw=v.indexOf(peak),ago=v[Math.max(0,NOW-5)],st=now<8?'Recovered':now<=peak*.6?'Improving':now-ago>=10?'Getting worse':'Still weak';
    const who=ALL.filter(i=>STW[i][k][NOW-1]===0),was=ALL.filter(i=>STW[i][k][pw]===0&&!who.includes(i));
    rows.push({k,n:cut(D.skills[k],36),v,st,now:who.map(i=>NM[i]),peak:was.map(i=>NM[i]),pkv:peak,lastv:now,pw:pw+1})});
  const pick=(f,key)=>rows.filter(r=>SG[r.st]===f).sort((a,b)=>key(b)-key(a)||a.k-b.k);
  return pick('p',r=>r.lastv).concat(pick('f',r=>r.pkv-r.lastv),pick('g',r=>r.pkv))})();

/* how many of the still-weak skills each student is weak in. A student is flagged for being in the top quarter of the class on that count, and flagged red in the top tenth */
const WEAKN=ALL.map(i=>WEAK.filter(m=>SG[m.st]==='p'&&m.now.includes(NM[i])).length),WEAKQ=qt(WEAKN,.75),WEAKT=qt(WEAKN,.9);

/* ---------- view 7: stall points ----------
   A started subunit's content is the class's questions in it, in textbook order. Each student's outcome on each:
   0 right first time, 1 right after retries, 2 gave up (tried, never right), 3 skipped (never tried).
   A task with no working check (kind r) only shows who tried it. Reading and video opens are not recorded
   reliably for this class, so they are left out. */
const ctOf=(tb,j)=>SUBS[j].on?SUBS[j].its.map(ix=>[IT[ix].name,NOCHK[ix]?'r':'q',ix]):[];
const cMemo={};
function cOut(tb,j){if(cMemo[j])return cMemo[j];return cMemo[j]=(SUBS[j].on?SUBS[j].its:[]).map(ix=>ALL.map(i=>{const a=AT[i].get(ix);return !a?3:NOCHK[ix]?0:a[9]===1?0:a[4]?1:2}))}
const cCnt=(tb,j)=>cOut(tb,j).map(o=>{const c=[0,0,0,0];o.forEach(x=>{c[x]++});return c});
const STALL={},XSTALL={};

/* ---------- item quality, used when a practice set is built ----------
   It has no page of its own (the Item health page was removed), but a practice set still leaves out questions that are broken or misleading.
   p = share who earned full credit; d = that share in the stronger half of the class minus the weaker half
   (halves by each student's average credit on everything else). Broken = a bug report, or no working check. */
const OVERALL=ALL.map(i=>{const c=[];AT[i].forEach((a,ix)=>{if(!NOCHK[ix])c.push(credit(a))});return c.length?avg(c):0});
const HALF=(function(){const o=ALL.slice().sort((a,b)=>OVERALL[b]-OVERALL[a]||a-b),top=new Set(o.slice(0,Math.ceil(N/2)));return i=>top.has(i)})();
const BUG={};D.bugs.forEach(([ix,st,t])=>{if(t&&!BUG[ix])BUG[ix]=t.replace(/''/g,'’').replace(/'/g,'’')});
const ITEMS=[];IT.forEach(it=>{const ix=it.ix,who=IWHO[ix];if(!CI[ix]||who.length<10)return;const full=i=>credit(AT[i].get(ix))===1,T=who.filter(HALF),B=who.filter(i=>!HALF(i));
  const p=pc(who.filter(full).length,who.length),pt=T.length?pc(T.filter(full).length,T.length):p,pb=B.length?pc(B.filter(full).length,B.length):p;
  const br=NOCHK[ix]?'Nothing marks it right':BUG[ix]?cut(BUG[ix],64):null;
  ITEMS.push({id:ITEMS.length,ix,tb:0,name:it.name,u:it.u,j:it.j,f:it.f,k:it.ks.length?it.ks[0]:-1,p,pt,pb,d:Math.round(pt-pb)/100,n:who.length,
    t:clamp(Math.round(qt(who.map(i=>AT[i].get(ix)[7]),.5)),20,900),br,bug:!!BUG[ix]&&!NOCHK[ix],bn:who.length})});
/* with about 18 students in each half, only a clear gap means anything: stronger half 15+ points worse is misleading, under 5 points better doesn't separate */
const ZMIS=-.15,ZWEAK=.05;
const zone9=it=>it.br?'broken':it.d<=ZMIS?'mis':it.p>90?'easy':it.p<25?'hard':it.d<ZWEAK?'weak':'ok';

/* ---------- view 9: fading ---------- */
const FD=TSK.map(k=>{const ids=ALL.filter(i=>ML[i][k]!==null);if(ids.length<8)return null;const a=avg(ids.map(i=>MT[i][k]))*100,b=avg(ids.map(i=>ML[i][k]))*100;
  return {k,a,b,d:b-a,n:ids.length,sl:ids.filter(i=>MT[i][k]-ML[i][k]>=.2).map(i=>NM[i])}}).filter(Boolean);

/* ---------- view 10: readiness ----------
   What each unit builds on: skills an earlier unit teaches that this unit's subunits use most, from the textbook's
   coverage weights. The skill graph itself lives outside the database, so there is no second level of roots.
   Keys are textbook:unit; f = the subunit that uses the skill most. */
const READY={};D.units.forEach((U,u)=>{READY['0:'+u]=(U.pre||[]).map(([k,j])=>({k,f:esc(cut(D.subs[j].code+' '+D.subs[j].name,22)),c:null}))});

/* ---------- where the class is: the unit and subunit with its latest work. Nothing is assumed about what comes next. ---------- */
const TAUGHT=TB0.map((_,u)=>u).filter(u=>TB0[u].on);
const TAUGHTJ=TB0.flatMap(U=>U.js.filter(j=>SUBS[j].on));
const CU=TAUGHT.slice().sort((a,b)=>TB0[b].mid-TB0[a].mid)[0]||0;
/* The overview shows the unit the class is on and the two it worked on before that, not every started unit: a class far into the course
   can have ten or more of those, too many for one row of a table. The latest OVN by when the class worked on them, shown in course order */
const OVN=3,OVU=TAUGHT.slice().sort((a,b)=>TB0[a].mid-TB0[b].mid).slice(-OVN).sort((a,b)=>a-b);
const CJ=TB0[CU].js.filter(j=>SUBS[j].on).sort((a,b)=>SUBS[b].mid-SUBS[a].mid)[0]||0;
const NU=-1,NXT=TB0[CU].n,NXTWHEN='';
const XKS=jSk(0,CJ).filter(chk5).slice(0,2);
const PRE=(READY['0:'+CU]||[]).filter(q=>taught(q.k)&&chk5(q.k));
/* how many of those skills each student is not secure on, and the class median: a gap most of the class shares is a class finding, not a flag on a student */
const PREGAP=ALL.map(i=>PRE.filter(q=>CAT[i][q.k]==='E'||CAT[i][q.k]==='H').length),PREMED=PREGAP.length?qt(PREGAP,.5):0;
const DRAFT={},PROBE=[],PROBEF='MCQ';

/* ---------- view 11: practice sets the teacher targeted ----------
   For each set: students who did it against classmates who didn't, on the change in credit on later questions that
   check the same skills (questions in the set itself are left out). The range is the middle 90% of 400 resamples. */
const IVS=D.sets.map((st,sx)=>{const did=[...new Set(st.rows.map(r=>r[0]))],own=new Set(st.rows.map(r=>r[1])),kc={};
  own.forEach(ix=>IT[ix].ks.forEach(k=>{kc[k]=(kc[k]||0)+1}));const ks=Object.keys(kc).map(Number).sort((a,b)=>kc[b]-kc[a]).slice(0,4),kset=new Set(ks);
  const chg=i=>{const pre=[],post=[];AT[i].forEach((a,ix)=>{if(NOCHK[ix]||!IT[ix].ks.some(k=>kset.has(k)))return;if(a[6]<st.day)pre.push(credit(a));else if(a[6]>st.day+2&&!own.has(ix))post.push(credit(a))});return pre.length>=2&&post.length>=2?avg(post)-avg(pre):null};
  const A=did.map(chg).filter(v=>v!==null),B=ALL.filter(i=>!did.includes(i)).map(chg).filter(v=>v!==null);let est=null,lo=null,hi=null;
  if(A.length>=4&&B.length>=4){est=Math.round((avg(A)-avg(B))*100);const r=rng(900+sx),bs=[],pick=a=>a.map(()=>a[Math.floor(r()*a.length)]);for(let q=0;q<400;q++)bs.push((avg(pick(A))-avg(pick(B)))*100);bs.sort((x,y)=>x-y);lo=Math.round(bs[20]);hi=Math.round(bs[379])}
  return {n:esc(st.name),sn:esc(st.name),who:did.map(i=>NM[i]),wk:'Week '+wkOf(st.day),est,lo,hi,na:A.length,nb:B.length,ks,
    dose:`${own.size} questions · ${dayDate(st.day)}`,
    cmp:est===null?`only ${A.length+B.length} students have later work to compare`:`${A.length} who did it vs ${B.length} who didn’t`,
    rec:est===null?'Check again after more work.':lo>0?'Keep it.':est>=5?'Promising. Check again after the next unit.':'No clear effect yet.'}});
const verdict=d=>d.est===null?{t:'Too early to tell',c:'',m:'var(--neutral)',k:'t3'}:d.lo>0?{t:'Worked',c:'good',m:'var(--good)',k:'tgood'}:d.est>=5?{t:'Promising, not proven',c:'watch',m:'var(--watch)',k:'twatch'}:{t:'No clear effect',c:'neutral',m:'var(--neutral)',k:'t2'};
/* invented rows from data/sample.js, so this view's chart has something to show. Each carries sample:true and is marked "sample" wherever it appears.
   The list then runs from what clearly worked down to what can't be judged yet */
((window.ATLAS_SAMPLE||{}).interventions||[]).forEach(d=>{const who=d.who==='all'?NM.slice():(d.who||[]).map(esc).filter(n=>ID[n]!==undefined);if(who.length<3)return;
  IVS.push({n:esc(d.n),sn:esc(d.sn||d.n),who,wk:esc(d.wk),est:d.est,lo:d.lo,hi:d.hi,dose:esc(d.dose),cmp:esc(d.cmp),rec:esc(d.rec),sample:true})});
IVS.sort((a,b)=>{const r=d=>d.est===null?3:d.lo>0?0:d.est>=5?1:2;return r(a)-r(b)||(b.est||0)-(a.est||0)});

/* this week's work: 0 = tried none of the latest week's class work */
const stage5=n=>{const a=WORKC[ID[n]];return a.length&&a[a.length-1]===0?0:4};
const RULE0={};

/* ---------- state ---------- */
/* page ids: 0 overview, 2 effort and mastery, 3 drifting, 4 pace, 5 hardest content, 6 shared weak skills, 7 stall points, 9 fading, 10 readiness, 11 what worked.
   Ids 1 and 8 were the lesson replay ("Attention now") and Item health, which were removed; the other ids stayed as they were, so flags, links and the action log still point at the same pages.
   The number a teacher sees on a tab is not the id but the page's priority (PRI, below). State keys keep their original names (v6 = hardest content, v7 = shared weak skills, and so on). */
const S={view:0,stu:null,log:[],
  v2:{tb:0,at:{u:null,j:null},pg:0,sel:{t:'u',id:0},sort:'start',line:60},
  v3:{dismissed:[],checked:[],sent:[],open:null,text:{},all:false},
  v4:{goal:Math.round(NSK*2/3),sort:'status'},
  v6:{tb:0,sort:'hard',ex:{},sel:{},xf:'all'},
  v7:{r:0,f:'all',more:false},
  v8:{tb:0,ex:{},sel:{},sort:'course'},
  v10:{u:'all',all:false,k:-1,sort:'drop'},
  v11:{th:60,tb:0,u:{},rm:{},acc:{}},
  v12:{r:0,f:'all'},
  td:{gen:null,rm:{},ex:{},bud:{}},ov:{sort:'flags',dir:-1},prof:0};
const R5=()=>RULE0;
const $=s=>document.querySelector(s);
/* the width a chart has to fill: the inside of the view. Charts are drawn to this width, so they fill the page and their text stays the size of the text around them */
const VW=()=>{const v=$('#view');return Math.max(640,Math.floor((v&&v.clientWidth?v.clientWidth:800)-50))};
/* On a wide page a chart doesn't stretch across the row: it shares the row with the panel that explains it, or with a second chart.
   duoW is the chart's width for a share f of the row. It is 0 when the page is too narrow to give the chart `min` and the panel 340px:
   then the two stack, and the chart takes the full width. duoB is the room inside the panel beside a chart of width a. */
const DGAP=40;
const duoW=(f,min,w)=>{w=w||VW();const a=Math.min(1040,Math.floor((w-DGAP)*f));return a>=min&&w-DGAP-a>=340?a:0};
const duoB=(a,w)=>(w||VW())+2-DGAP-a;
/* a view whose content is narrower than the page sits in the middle of it: controls, legend and chart together, w wide at most */
const stage=(w,h)=>`<div class="stage" style="max-width:${w+2}px">${h}</div>`;
const duo=(a,left,right,cls)=>a?`<div class="duo${cls?' '+cls:''}" style="--a:${a}px;grid-template-columns:${a}px minmax(0,1fr)"><div class="duo-a">${left}</div><div class="duo-b">${right}</div></div>`:left+right;

/* ---------- view meta ---------- */
const VM=[{q:'How is each student doing?',k:'Student table',s:'Overview',w:'Weekly'},
null, /* id 1: the lesson replay, removed */
{q:'Who is doing the work, and is it turning into mastery?',k:'Effort and mastery grid',s:'Effort and mastery',w:'Weekly'},
{q:'Who is drifting, and since when?',k:'Watchlist with normal ranges',s:'Drifting',w:'Weekly'},
{q:'Is each student on pace to reach the goal?',k:'Pace tracks',s:'On pace',w:'Every two weeks'},
{q:'Which units, subunits and skills are hardest?',k:'Ranked bars',s:'Hardest content',w:'End of each unit'},
{q:'Which skills are many students weak in, and is that changing?',k:'Weekly areas',s:'Shared weak skills',w:'Weekly'},
{q:'Where do students stall, skip or give up?',k:'Stacked bars',s:'Stall points',w:'After each lesson'},
null, /* id 8: item health, removed */
{q:'Which skills fade after they’re taught?',k:'Before and after',s:'Fading skills',w:'Monthly'},
{q:'Is the class ready for each unit, and what first?',k:'Readiness tree',s:'Ready for a unit',w:'Before each unit'},
{q:'Did what I did work?',k:'Effect ranges',s:'What worked',w:'After each change'}];
/* The number on each tab is the page's priority: how much its question helps a teacher who is teaching this class, 1 the most.
   It is a judgement, kept in this one list: page ids from most to least helpful, each with the reason shown as the tab's tooltip.
   Everything on screen that names a page by number (the tabs, the flags in the overview, the bar for a followed student) uses these numbers. */
const PRI=[[0,'every student at a glance, with one next step each'],[6,'what to reteach to the whole class'],[2,'who needs a reteach, and who needs a nudge'],[3,'catches a student who is slipping away, early'],
  [10,'what to shore up before the next unit'],[7,'where the material loses students'],[5,'where to spend more class time'],[9,'what to bring back in warm-ups'],
  [4,'who will fall short by the end of the year'],[11,'whether to keep doing what you tried']];
const PN={},PWHY={};PRI.forEach(([k,why],ix)=>{PN[k]=ix+1;PWHY[k]=why});
/* the groups in the rail, each in priority order */
const GROUPS=[['Students',[0,2,3,4]],['Content',[5,6,7,9]],['Act and check',[10,11]]].map(([g,ks])=>[g,ks.slice().sort((a,b)=>PN[a]-PN[b])]);
/* a page's name in the address bar, so a link doesn't depend on any numbering */
const SLUG={0:'overview',2:'effort',3:'drifting',4:'pace',5:'hardest',6:'weak-skills',7:'stall-points',9:'fading',10:'ready',11:'worked'};
const HOW=['One row per student. Weekly work is the share of each week’s class work they tried, with their own normal range in gray; the figure is the latest week, red when it is below their normal. Skills secure is the share of the skills taught so far that are secure, week by week, with an arrow when it moved two points or more in four weeks. By unit shows the unit the class is on and the two it worked on before that (Effort and mastery has every unit): the darker the green, the more secure, and the bar under it is practice done, red when under the line. Flagged in lists the pages that flag the student, by the number on their tab; a number opens that page. Next step is the one thing to do first. Click a heading to sort, a name for the profile.',
'', /* id 1: removed */
'One row per student; columns are the textbook’s units. Click a unit to see its subunits, and a subunit to see its skills; the trail above the grid takes you back up. Ten columns show at a time: the arrows beside the trail page through the rest. Each cell is a small bar: the darker the green, the more secure (pale is not yet, mid is developing, dark is secure, from the average credit on questions tagged with the skills there). The thin line under it is the share of the class’s questions the student tried, red when under your line, and a red dot is stuck despite effort. An empty column with a gray heading is one the class hasn’t started. The Class row shows how the class divides in each column. The bar at the right divides each student’s taught skills into secure, developing and not yet; the gray rest has fewer than two checks so far, and the figure is how many are secure. The line at the foot of a column is the class’s share of secure standings there week by week, with where it is now and an arrow when it moved three points or more in four weeks. “drifting” beside a name is a student the Drifting page flags. The chart below places everyone for the column you pick.',
`One row per student who has dropped. The line is the share of each week’s class work the student tried that week. The gray band is their own normal range from weeks 1 to ${BASE}. The line turns red once it stays below the band. Weeks with almost no class work are skipped.`,
`Each track runs from 0 to ${NSK} skills: the ${NK} the class has met so far, continued at the same rate to week ${NWK}. The class has no term dates in the database, so a ${NWK}-week year is assumed. The solid bar is skills secure now; the dashed part is where they will be by week ${NWK} at their recent pace. The black line is the goal and the dotted line is where they should be today. The goal starts at the class’s median projection; move it to your own target to see who it changes.`,
'Each bar splits the students who have been checked: red not yet, amber developing, green secure. The figure beside it is the share not secure yet. Units open into subunits, and subunits into the skills they teach; sort hardest first or in textbook order. Click a skill to see who is struggling. A skill no question checks gets no bar, and neither does one that fewer than eight students have been checked on.',
'One row per skill that a fifth of the class or more has been weak in at the same time: not yet secure, which is under 60% on two or more checks. The small area is the share of the class not yet secure at the end of each week, so an area that sinks is a skill the class is getting on top of. The bar and the figure beside it are the students who are not yet secure now. Click a row for who they are; with a student followed, a dot marks the skills that student is weak in.',
'Units open into subunits, and subunits into their questions in the order students meet them. Each bar splits the class: red gave up (tried, never right), amber skipped (never tried), pale green needed retries, and green got it right first time. A unit or subunit pools all its questions. Only questions a quarter of the class tried are listed. Reading and video opens aren’t recorded reliably for this class, so they are left out.',
'', /* id 8: removed */
`One row per skill that faded: of the skills at least eight students met again ${LATER}, those whose class average fell 8 points or more. The open dot is the average when the skill was first taught; the solid dot is the same students on the later check. Tick “Show all” to see every skill that was checked again, steady and grown ones too. Click a skill to see every student beside it: dots in the red area slipped 20 points or more. Click it again to close.`,
'Pick a unit; the one with the class’s latest work is picked for you. The unit sits at the top, with the skills it builds on below it: skills an earlier unit teaches that this unit’s questions use most. Each ring shows how many students are secure now. Red is below your readiness line, amber is close, green is ready. A dashed ring is a skill the class hasn’t been taught, or one no question checks. The plan updates as you move the line.',
'One row per thing you tried. The dot is the best estimate of extra points gained, against a comparison group; the bar is the range it could plausibly be. A bar fully right of zero worked. Rows marked sample are invented, to show the chart: the database holds one targeted practice set for this class so far, with too little later work to judge it. Everything you log on any page is listed underneath.'];
const TBL=[
['Class and outline','Students; every unit, subunit and question, in textbook order','section, section_user, app_user, curriculum_unit_order, unit, curriculum_unit_item, item','Real. Names are the anonymised ones'],
['Overview','The figures of Effort and mastery, Drifting and On pace, one row per student','As those pages','Real'],
['Effort and mastery','Questions tried, and credit on each skill’s questions','interaction_summary, item_skill, unit_skill_coverage','Real'],
['Drifting','Share of each week’s class work tried; assigned sets finished','interaction_summary, student_activity_hour, coursework, coursework_status','Real. Attendance isn’t recorded'],
['On pace','Skills secure now, and the recent rate','As Effort and mastery','Real. A 36-week year is assumed'],
['Hardest content','Students not secure on each skill','As Effort and mastery','Real'],
['Shared weak skills','Students not yet secure on each skill, week by week','As Effort and mastery','Real'],
['Stall points','Each student’s outcome on each question','interaction_summary','Real. Reading and video opens left out'],
['Fading skills','Credit when taught against later checks','interaction_summary, coursework_item','Real'],
['Ready for a unit','Earlier skills each unit uses most','unit_skill_coverage','Approximate. The skill graph is outside the database'],
['What worked','Later credit for students who did a targeted set','coursework, coursework_item, interaction_summary','One real set. Rows marked sample are invented (data/sample.js)']];

/* ---------- helpers ---------- */
const tips=new Map();let tipN=0;
const tp=h=>{const id='t'+(++tipN);tips.set(id,h);return ` data-tip="${id}"`};
const T=(x,y,t,o)=>{o=o||{};return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${o.a||'start'}" class="${o.c||'t2'}"${o.w?` font-weight="${o.w}"`:''}${o.s?` style="font-size:${o.s}px"`:''}>${t}</text>`};
const NB=(x,y,n)=>`<g class="nbg"><circle cx="${f1(x)}" cy="${f1(y)}" r="9" style="fill:var(--ink)"/><text x="${f1(x)}" y="${f1(y+4)}" text-anchor="middle" style="fill:var(--surface);font-weight:700;font-size:12px">${n}</text></g>`;
const nbH=n=>`<span class="nb" aria-hidden="true">${n}</span>`;
const nmBtn=(n,extra)=>`<button class="nm${S.stu===ID[n]?' on':''}" type="button" data-act="stu" data-i="${ID[n]}">${n}${extra||''}</button>`;
const names=a=>a.length?`<div class="names">${a.map(n=>nmBtn(n)).join('')}</div>`:'<p class="none">None</p>';
const whoCol=(t,c,a)=>`<div><p class="dl"><i class="sw" style="background:${c}"></i>${t} · ${a.length}</p>${names(a)}</div>`;
const stat=(l,v)=>`<div class="stat"><span class="l">${l}</span><span class="v">${v}</span></div>`;
const takes=a=>`<ol class="takes">${a.map((t,i)=>`<li><span class="nb">${i+1}</span><span>${t}</span></li>`).join('')}</ol>`;
const fig=s=>`<div class="fig">${s}</div>`;
const seg=(act,cur,opts,label)=>`<div class="seg" role="group" aria-label="${label}">${opts.map(o=>`<button type="button" data-act="${act}" data-f="${o[0]}" aria-pressed="${String(cur)===String(o[0])}">${o[1]}</button>`).join('')}</div>`;
const HATCH=`<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:var(--surface-2)"/><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--hatch);stroke-width:2.2"/></pattern>`;
const IC={
up:'<svg class="ic up" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 L10.5 6.5 H7.3 V10.5 H4.7 V6.5 H1.5 Z" fill="currentColor"/></svg>',
down:'<svg class="ic down" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10.5 L10.5 5.5 H7.3 V1.5 H4.7 V5.5 H1.5 Z" fill="currentColor"/></svg>',
sad:'<svg class="ic sad" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="4.2" cy="4.8" r=".85" fill="currentColor"/><circle cx="7.8" cy="4.8" r=".85" fill="currentColor"/><path d="M3.8 8.7 Q6 6.9 8.2 8.7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
check:'<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.3 6.4 L4.9 9 L9.7 3.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
x:'<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 3.2 L8.8 8.8 M8.8 3.2 L3.2 8.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
leak:'<svg class="ic" viewBox="0 0 12 12" aria-hidden="true" style="width:14px;height:14px"><path d="M2.5 1.5 V6 Q2.5 8.5 5 8.5 H10 M7.5 6 L10 8.5 L7.5 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
const GL={
0:'<rect x="2" y="1" width="9" height="7" rx="1" fill="currentColor"/><rect x="13" y="1" width="9" height="7" rx="1" fill="currentColor" opacity=".5"/><rect x="2" y="10" width="9" height="7" rx="1" fill="currentColor" opacity=".5"/><rect x="13" y="10" width="9" height="7" rx="1" fill="currentColor" opacity=".5"/>',
2:'<circle cx="4" cy="4.5" r="3" fill="currentColor"/><circle cx="12" cy="4.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M12 2 A2.5 2.5 0 0 0 12 7 Z" fill="currentColor"/><circle cx="20" cy="4.5" r="3" fill="currentColor"/><circle cx="4" cy="13.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="13.5" r="3" fill="currentColor"/><circle cx="20" cy="13.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 1.4"/>',
3:'<rect x="1" y="3" width="22" height="6" fill="currentColor" opacity=".25"/><path d="M1 6 L6 5 L10 7 L13 6 L16 11 L19 13 L23 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="16" cy="11" r="1.9" fill="currentColor"/>',
4:'<rect x="1" y="3" width="11" height="4" rx="1" fill="currentColor"/><line x1="12" y1="5" x2="20" y2="5" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 1.5"/><rect x="1" y="11" width="6" height="4" rx="1" fill="currentColor"/><line x1="7" y1="13" x2="11" y2="13" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 1.5"/><line x1="17" y1="1" x2="17" y2="17" stroke="currentColor" stroke-width="1.3"/>',
5:'<rect x="1" y="1" width="22" height="3.4" rx="1" fill="currentColor" opacity=".45"/><rect x="4" y="5.6" width="16" height="3.4" rx="1" fill="currentColor" opacity=".65"/><rect x="7" y="10.2" width="10" height="3.4" rx="1" fill="currentColor" opacity=".85"/><rect x="9.5" y="14.8" width="5" height="3" rx="1" fill="currentColor"/>',
6:'<rect x="1" y="1" width="22" height="4.5" rx="1" fill="currentColor" opacity=".45"/><rect x="1" y="6.7" width="10.5" height="4.5" rx="1" fill="currentColor" opacity=".75"/><rect x="12.5" y="6.7" width="10.5" height="4.5" rx="1" fill="currentColor" opacity=".45"/><rect x="1" y="12.4" width="4.9" height="4.6" rx="1" fill="currentColor"/><rect x="6.7" y="12.4" width="4.8" height="4.6" rx="1" fill="currentColor" opacity=".75"/><rect x="12.5" y="12.4" width="4.8" height="4.6" rx="1" fill="currentColor" opacity=".45"/><rect x="18.2" y="12.4" width="4.8" height="4.6" rx="1" fill="currentColor" opacity=".45"/>',
7:'<path d="M1 5 C6 1,13 1,23 5 C13 9,6 9,1 5Z" fill="currentColor"/><path d="M4 13 C7 10,10 11,13 13 C10 15.5,7 15.5,4 13Z" fill="currentColor" opacity=".5"/><path d="M16 13 L19 10 L22 13 L19 16Z" fill="currentColor" opacity=".8"/>',
8:'<rect x="1" y="3" width="4.5" height="14" fill="currentColor" opacity=".45"/><rect x="7" y="6" width="4.5" height="11" fill="currentColor" opacity=".45"/><rect x="13" y="9" width="4.5" height="8" fill="currentColor" opacity=".45"/><rect x="13" y="3" width="4.5" height="6" fill="currentColor"/><rect x="19" y="8" width="4" height="9" fill="currentColor" opacity=".45"/>',
10:'<line x1="4" y1="1" x2="4" y2="17" stroke="currentColor" stroke-width="1"/><line x1="20" y1="1" x2="20" y2="17" stroke="currentColor" stroke-width="1"/><line x1="4" y1="3.5" x2="20" y2="13" stroke="currentColor" stroke-width="2"/><line x1="4" y1="7" x2="20" y2="6" stroke="currentColor" stroke-width="1.2" opacity=".55"/><line x1="4" y1="11" x2="20" y2="9.5" stroke="currentColor" stroke-width="1.2" opacity=".55"/>',
11:'<circle cx="12" cy="3" r="2.4" fill="currentColor"/><path d="M12 5.4 L4.5 10.6 M12 5.4 V10.6 M12 5.4 L19.5 10.6" stroke="currentColor" stroke-width="1"/><circle cx="4.5" cy="13.6" r="2.8" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="13.6" r="2.8" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="19.5" cy="13.6" r="2.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-dasharray="4.4 2"/>',
12:'<line x1="8" y1="1" x2="8" y2="17" stroke="currentColor" stroke-width="1.2"/><line x1="11" y1="5" x2="22" y2="5" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="5" r="2.4" fill="currentColor"/><line x1="3" y1="13" x2="14" y2="13" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="13" r="2.4" fill="currentColor"/>'};
const GRIDG='<rect x="1" y="1" width="6" height="4.4" rx="1" fill="currentColor"/><rect x="9.6" y="1.5" width="5" height="3.4" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="17" y="1" width="6" height="4.4" rx="1" fill="currentColor"/><rect x="1" y="7" width="6" height="4.4" rx="1" fill="currentColor"/><rect x="9" y="7" width="6" height="4.4" rx="1" fill="currentColor"/><rect x="17.6" y="7.5" width="5" height="3.4" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="1.6" y="13.5" width="5" height="3.4" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="13" width="6" height="4.4" rx="1" fill="currentColor"/><rect x="17" y="13" width="6" height="4.4" rx="1" fill="currentColor"/>';
const DUMB='<line x1="9" y1="3" x2="21" y2="3" stroke="currentColor" stroke-width="2" opacity=".5"/><circle cx="9" cy="3" r="2.4" fill="currentColor"/><circle cx="21" cy="3" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="13" y1="9" x2="20" y2="9" stroke="currentColor" stroke-width="2" opacity=".5"/><circle cx="13" cy="9" r="2.4" fill="currentColor"/><circle cx="20" cy="9" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="17" y1="15" x2="21" y2="15" stroke="currentColor" stroke-width="2" opacity=".5"/><circle cx="17" cy="15" r="2.4" fill="currentColor"/><circle cx="21" cy="15" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="2" y1="1" x2="2" y2="17" stroke="currentColor" stroke-width="1"/>';
const RANKG='<rect x="1" y="1.5" width="22" height="3.6" rx="1" fill="currentColor"/><rect x="6" y="7.2" width="15" height="3.6" rx="1" fill="currentColor" opacity=".6"/><rect x="6" y="12.9" width="9" height="3.6" rx="1" fill="currentColor" opacity=".6"/>';
const STALLG='<rect x="1" y="1.5" width="7" height="3.6" rx="1" fill="currentColor"/><rect x="9" y="1.5" width="14" height="3.6" rx="1" fill="currentColor" opacity=".3"/><rect x="6" y="7.2" width="3" height="3.6" rx="1" fill="currentColor"/><rect x="10" y="7.2" width="13" height="3.6" rx="1" fill="currentColor" opacity=".3"/><rect x="6" y="12.9" width="10" height="3.6" rx="1" fill="currentColor"/><rect x="17" y="12.9" width="6" height="3.6" rx="1" fill="currentColor" opacity=".3"/>';
const GLN={0:GL[0],2:GRIDG,3:GL[3],4:GL[4],5:RANKG,6:GL[7],7:STALLG,9:DUMB,10:GL[11],11:GL[12]};
const glyph=k=>`<svg class="glyph" viewBox="0 0 24 18" width="24" height="18" aria-hidden="true">${GLN[k]}</svg>`;

/* ---------- action log and toast ---------- */
let logSeq=0,toastT=null;
const clock=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
function toast(msg){const el=$('#toast');if(!el)return;el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{el.hidden=true},3400)}
function logAct(key,v,t,kind,quiet){S.log=S.log.filter(e=>e.key!==key);S.log.push({key,v,t,kind:kind||'done',at:clock(),n:++logSeq});if(!quiet)toast(`Logged: ${t}.${kind==='plan'?` It now waits in ${VM[11].s} as in progress.`:''}`);renderLogChip()}
function unlog(key){S.log=S.log.filter(e=>e.key!==key);renderLogChip()}
const isLogged=key=>S.log.some(e=>e.key===key);
const vFrom=v=>v==='p'?'Profile':VM[v]?VM[v].s:'Overview';
function renderLogChip(){const c=$('#logchip'),n=$('#logn');if(!c||!n)return;n.textContent=S.log.length;c.classList.toggle('has',S.log.length>0)}

/* ---------- per-student flags across views ---------- */
const slipped=i=>TSK.filter(k=>ML[i][k]!==null&&MT[i][k]-ML[i][k]>=.2);
function flags(i){const n=NM[i],f=[];
  const gu={};TAUGHT.forEach(u=>{gu[u]=cell2(i,KS2.u(u)).g});const st=TAUGHT.filter(u=>gu[u]==='stuck'),of=TAUGHT.filter(u=>gu[u]==='off'),co=TAUGHT.filter(u=>gu[u]==='coast');
  if(stage5(n)===0)f.push({v:2,l:'bad',t:'None of the latest week’s work'});
  if(st.length)f.push({v:2,l:st.length>=2?'bad':'watch',t:`Stuck · ${st.length>=2?st.length+' units':UN[st[0]][0]}`});
  if(of.length)f.push({v:2,l:of.length>=2?'bad':'watch',t:`Not doing the work · ${of.length>=2?of.length+' units':UN[of[0]][0]}`});
  if(co.length)f.push({v:2,l:'good',t:`Coasting in ${andList(co.map(u=>UN[u][0]))}`});
  if(DR[i]&&!S.v3.dismissed.includes(n))f.push({v:3,l:'bad',t:`Drifting since week ${DR[i]}`});else if(WATCH[i])f.push({v:3,l:'watch',t:'One low week'});
  const p=paceOf(i,S.v4.goal);f.push({v:4,l:PS[PSI[p.st]][3],t:p.st});
  if(WEAKN[i]>=3&&WEAKN[i]>WEAKQ)f.push({v:6,l:WEAKN[i]>WEAKT?'bad':'watch',t:`Weak in ${WEAKN[i]} of the ${WEAK.filter(m=>SG[m.st]==='p').length} shared weak skills`});
  const o8=cOut(0,CJ).map(o=>o[i]),g8=o8.filter(x=>x===2).length,k8=o8.filter(x=>x===3).length;
  if(g8>=2)f.push({v:7,l:'watch',t:`Gave up on ${g8} · ${SUBS[CJ].s}`});if(k8>=3&&k8>=o8.length/2&&o8.some(x=>x<3))f.push({v:7,l:'watch',t:`Skipped ${k8} of ${o8.length} · ${SUBS[CJ].s}`});
  const sl=slipped(i),rc=TSK.filter(k=>ML[i][k]!==null).length,sp=rc>=6?sl.length/rc:0;if(sp>=.4)f.push({v:9,l:'bad',t:`Slipped on ${sl.length} of ${rc} skills`});else if(sp>=.3)f.push({v:9,l:'watch',t:`Slipped on ${sl.length} of ${rc} skills`});
  if(PRE.length){const nr=PREGAP[i];if(nr>=2&&nr>PREMED)f.push({v:10,l:nr===PRE.length?'bad':'watch',t:`${nr} of ${PRE.length} gaps · ${TB0[CU].s}`});else if(PRE.every(q=>CAT[i][q.k]==='F'))f.push({v:10,l:'good',t:`Ready · ${TB0[CU].s}`})}
  const iv=IVS.filter(d=>d.who.length<N&&d.who.includes(n));if(iv.length)f.push({v:11,l:'neutral',t:`Did ${iv.length} targeted practice ${pl(iv.length,'set')}`});
  return f}

/* ---------- view 2: effort and mastery, per textbook, with unit, subunit and skill drill-down ---------- */
const nodeName=(n,tb)=>{tb=tb===undefined?S.v2.tb:tb;return n.t==='u'?TBU(tb,n.id).n:n.t==='j'?TBJ(tb,n.id).n:ASK[n.id]};
const nodeUnit=n=>n.t==='u'?n.id:n.t==='j'?uOfJ(n.id):(n.j!==undefined?uOfJ(n.j):uOf(n.id));
const LEVEL2={u:'Unit',j:'Subunit',k:'Skill'};
const MCOL={S:['var(--m-mas)','var(--bg-good)'],D:['var(--watch)','var(--bg-watch)'],N:['var(--bad)','var(--bg-bad)'],U:['var(--neutral)','var(--surface-2)']};
const MLAB={S:'Secure',D:'Developing',N:'Not yet',U:'Too early'};
const GLAB={on:'On track',go:'Keep going',stuck:'Stuck despite effort',early:'Too early to tell',coast:'Coasting',off:'Not doing the work'};
/* mastery is one colour, pale to dark: not yet, developing, secure. Red is kept for the two problem marks: the practice bar under a cell when it is under the line (amber when coasting), and the dot for stuck despite effort */
const MRAMP={S:'var(--ms-s)',D:'var(--ms-d)',N:'var(--ms-n)'};
const effCol=c=>c.doing?'var(--axis)':c.g==='coast'?'var(--watch)':'var(--bad)';
function cellMark(x,y,w,h,c){const fh=Math.max(6,h-5),eb=y+fh+2,ew=Math.max(1.5,w*clamp(c.e||0,0,1));
  const fill=c.mc==='U'?`<rect x="${f1(x+.5)}" y="${f1(y+.5)}" width="${f1(w-1)}" height="${f1(fh-1)}" rx="2.5" style="fill:var(--surface-2);stroke:var(--neutral);stroke-width:1"/>`:`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(fh)}" rx="2.5" style="fill:${MRAMP[c.mc]}"/>`;
  return fill+`<rect x="${f1(x)}" y="${f1(eb)}" width="${f1(w)}" height="3" rx="1.5" style="fill:var(--surface-2)"/><rect x="${f1(x)}" y="${f1(eb)}" width="${f1(ew)}" height="3" rx="1.5" style="fill:${effCol(c)}"/>`+(c.g==='stuck'?`<circle cx="${f1(x+w-Math.min(5,w/3))}" cy="${f1(y+fh/2)}" r="3.2" style="fill:var(--bad);stroke:var(--surface);stroke-width:1.5"/>`:'')}
const sq2=(mc,doing,g,e)=>`<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">${cellMark(1,1,20,12,{mc,doing,g,e:e!==undefined?e:(doing?.9:.3)})}</svg>`;
/* textbook tabs, shared by views 2, 5 and 8 */
const tbTabs=(act,cur,extra)=>TB.length<2?'':`<div class="tbtabs" role="group" aria-label="Textbook">${TB.map((T,ix)=>`<button type="button" data-act="${act}" data-f="${ix}" aria-pressed="${String(cur)===String(ix)}"><b>${T.n}</b><span>${T.who.length} students</span></button>`).join('')}${extra||''}</div>`;
/* the grid shows one level at a time: every unit, or one unit's subunits, or one subunit's skills (S.v2.at says where) */
/* a page of the grid holds this many columns, at every level */
const PG2=10;
/* where the page on show starts. The last page slides back so that it is a full page too, and the grid always fills the width */
const pg2From=()=>Math.min(S.v2.pg*PG2,Math.max(0,cols2().length-PG2));
/* the page a level opens on: the first one with something the class has started */
function pg2Start(){const ix=cols2().findIndex(o=>o.t==='u'?TB0[o.id].on:o.t==='j'?SUBS[o.id].on:true);return ix<0?0:Math.floor(ix/PG2)}
/* move to a level. Going down opens its starting page; coming back up opens the page that holds where you came from */
function at2(u,j,from){const E=S.v2;E.at={u,j};E.pg=from===undefined?pg2Start():Math.max(0,Math.floor(from/PG2))}
function cols2(){const A=S.v2.at;
  if(A.j!==null)return jSk(0,A.j).map(k=>({t:'k',id:k,u:A.u,j:A.j}));
  if(A.u!==null)return uJs(0,A.u).map(j=>({t:'j',id:j,u:A.u,j}));
  return TB0.map((_,u)=>({t:'u',id:u,u}))}
function h2(){const tb=S.v2.tb,ids=tbWho(tb),us=TB[tb].units.map((_,u)=>u).filter(u=>tU(tb,u)).map(u=>{const g=ids.map(i=>cellN(i,tb,{t:'u',id:u}).g);return {u,stuck:g.filter(x=>x==='stuck').length,off:g.filter(x=>x==='off').length}});
  const a=us.slice().sort((p,q)=>q.stuck-p.stuck||p.u-q.u)[0],b=us.find(o=>o.u===CU)||us[us.length-1];
  const A=TBU(tb,a.u).n,B=TBU(tb,b.u).n;if(a.stuck&&a.u===b.u)return `${A}: ${a.stuck} stuck despite effort, ${b.off} not doing the work.`;
  return `${a.stuck?`${a.stuck} stuck despite effort in ${A}`:'Nobody is stuck despite effort'}; ${b.off} not doing the work in ${B}.`}
function v2(){const E=S.v2,A=E.at,nc=cols2().length,np=Math.max(1,Math.ceil(nc/PG2)),what=A.j!==null?'skills':A.u!==null?'subunits':'units';E.pg=clamp(E.pg,0,np-1);
  const p0=pg2From(),pager=np>1?`<span class="pager2" role="group" aria-label="Pages of ${what}"><button class="btn small" type="button" data-act="v2pg" data-f="-1" aria-label="Previous ${PG2} ${what}"${E.pg?'':' disabled'}>‹</button><span>${p0+1}–${Math.min(nc,p0+PG2)} of ${nc} ${what}</span><button class="btn small" type="button" data-act="v2pg" data-f="1" aria-label="Next ${PG2} ${what}"${E.pg<np-1?'':' disabled'}>›</button></span>`:'';
  const up=(f,t)=>`<button class="lnk" type="button" data-act="v2up" data-f="${f}">${t}</button><span class="sep" aria-hidden="true">›</span>`;
  const crumb=`<nav class="crumbs" aria-label="Where you are in the textbook">${A.u===null?'<b>All units</b>':up('all','All units')+(A.j===null?`<b>${TB0[A.u].n}</b>`:up('u',TB0[A.u].n)+`<b>${SUBS[A.j].n}</b>`)}${pager}</nav>`;
  const bar=(w,col)=>`<svg width="30" height="6" aria-hidden="true"><rect x="0" y="1.5" width="30" height="3" rx="1.5" style="fill:var(--surface-2)"/><rect x="0" y="1.5" width="${w}" height="3" rx="1.5" style="fill:${col}"/></svg>`;
  /* the key reads along one line, to the right of the controls: what the colour says, then the two marks under and on a cell */
  const leg=`<div class="legend key2"><span class="ramp">${['N','D','S'].map(m=>`<i class="sw" style="background:${MRAMP[m]}"></i>`).join('')}Not yet → secure</span><span><i class="sw" style="background:var(--surface);box-shadow:inset 0 0 0 1px var(--neutral)"></i>Too early</span><span>${bar(22,'var(--axis)')}Practice done</span><span>${bar(9,'var(--bad)')}Under your line</span><span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.6" style="fill:var(--bad)"/></svg>Stuck despite effort</span></div>`;
  const ctl=`${crumb}<div class="controls"><label class="rng" for="v2line">Doing the work: at least <output id="v2lo">${E.line}% of practice</output><input type="range" id="v2line" min="40" max="80" step="5" value="${E.line}"></label><label class="sel" for="v2sort">Sort <select id="v2sort">${[['start','By name'],['stuck','Stuck first'],['off','Not doing the work first']].map(o=>`<option value="${o[0]}"${E.sort===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></label>${leg}</div>`;
  return ctl+'<div id="v2c"></div>'}
/* everyone in the picked column, placed by practice done (across) and mastery (up) */
function v2scatter(tb,n,ids,W){const L=58,R=18,T0=14,B=T0+Math.round(clamp((W-L-R)*.46,256,380)),H=B+40,x=e=>L+clamp(e,0,1)*(W-L-R),y=m=>B-clamp(m,0,1)*(B-T0),ln=S.v2.line/100,sel=S.stu,P=[],early=[];
  ids.forEach(i=>{const c=cellN(i,tb,n);if(c.g==='x'||c.g==='na')return;if(c.m===null)early.push(NM[i]);else P.push({i,c,X:x(c.e),Y:y(c.m)})});
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="${nodeName(n,tb)}: each student placed by practice done and mastery">`;
  s+=`<rect x="${f1(x(ln))}" y="${f1(y(.6))}" width="${f1(x(1)-x(ln))}" height="${f1(y(0)-y(.6))}" style="fill:var(--bad);opacity:.08"/><rect x="${f1(x(0))}" y="${f1(y(.8))}" width="${f1(x(ln)-x(0))}" height="${f1(y(0)-y(.8))}" style="fill:var(--bad);opacity:.08"/><rect x="${f1(x(0))}" y="${f1(y(1))}" width="${f1(x(ln)-x(0))}" height="${f1(y(.8)-y(1))}" style="fill:var(--watch);opacity:.1"/>`;
  [0,.25,.5,.75,1].forEach(v=>{s+=`<line x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${T0}" y2="${B}" class="grid"/>`+T(x(v),B+16,Math.round(v*100)+'%',{a:'middle',c:'t3'})});
  [0,.6,.8,1].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="grid"/>`+T(L-8,y(v)+4,Math.round(v*100)+'%',{a:'end',c:'t3'})});
  s+=`<line x1="${f1(x(ln))}" x2="${f1(x(ln))}" y1="${T0}" y2="${B}" class="axis"/><line x1="${L}" x2="${W-R}" y1="${f1(y(.8))}" y2="${f1(y(.8))}" class="axis"/>`;
  const rl=(tx,ty,t,a,c)=>T(tx,ty,t,{a,c,w:700});
  /* each region's name goes in the corner of its region that has the fewest dots under it, so a cluster doesn't sit on the words */
  const under=b=>P.filter(p=>p.X+5>b.x&&p.X-5<b.x+b.w&&p.Y+5>b.y&&p.Y-5<b.y+b.h).length;
  const RL=[['On track','tgood',64,[[x(ln)+8,y(1)+16,'start'],[W-R-8,y(1)+16,'end']]],['Keep going','t2',78,[[x(ln)+8,y(.8)+16,'start'],[W-R-8,y(.8)+16,'end'],[x(ln)+8,y(.6)-7,'start'],[W-R-8,y(.6)-7,'end']]],
    ['Stuck despite effort','tbad',132,[[W-R-8,B-8,'end'],[x(ln)+8,B-8,'start']]],['Coasting','twatch',70,[[L+8,y(1)+16,'start'],[x(ln)-8,y(1)+16,'end']]],['Not doing the work','tbad',130,[[L+8,B-8,'start'],[x(ln)-8,B-8,'end']]]]
    .map(([t,cl,w,cands])=>{let best=null;cands.forEach(([tx,ty,a])=>{const b={x:a==='end'?tx-w:tx,y:ty-11,w,h:14},k=under(b);if(!best||k<best.k)best={t,cl,tx,ty,a,b,k}});return best});
  s+=RL.map(o=>rl(o.tx,o.ty,o.t,o.a,o.cl)).join('');
  s+=T((L+W-R)/2,B+34,'Share of the class’s questions tried',{a:'middle'})+`<text x="16" y="${f1((T0+B)/2)}" text-anchor="middle" transform="rotate(-90 16 ${f1((T0+B)/2)})" class="t2">Mastery</text>`;
  const COL={on:'var(--good)',go:'var(--ink-3)',stuck:'var(--bad)',off:'var(--bad)',coast:'var(--watch)'},boxes=[];
  const hit=(b)=>boxes.some(o=>b.x<o.x+o.w&&b.x+b.w>o.x&&b.y<o.y+o.h&&b.y+b.h>o.y);
  P.forEach(p=>boxes.push({x:p.X-5,y:p.Y-5,w:10,h:10}));boxes.push({x:x(ln)-2,y:T0,w:4,h:B-T0},{x:L,y:y(.8)-2,w:W-L-R,h:4});RL.forEach(o=>boxes.push(o.b));
  const lab=[];P.filter(p=>['stuck','off','coast'].includes(p.c.g)||p.i===sel).sort((a,b)=>(b.i===sel)-(a.i===sel)||a.Y-b.Y).forEach(p=>{const nm=NM[p.i],w=nm.length*6.6+4,cand=[[p.X+8,p.Y-6,'start'],[p.X-8-w,p.Y-6,'end'],[p.X-w/2,p.Y-20,'middle'],[p.X-w/2,p.Y+8,'middle'],[p.X+7,p.Y-17,'start'],[p.X+7,p.Y+5,'start'],[p.X-7-w,p.Y-17,'end'],[p.X-7-w,p.Y+5,'end'],[p.X-w/2,p.Y-31,'middle'],[p.X-w/2,p.Y+19,'middle']];
    for(const [bx,by,a] of cand){const b={x:bx,y:by,w,h:12};if(bx<L||bx+w>W-R||by<T0||by+12>B)continue;if(!hit(b)){boxes.push(b);lab.push({p,b,a});break}}});
  P.forEach(p=>{const on=p.i===sel;s+=`<g class="hit" data-act="stu" data-i="${p.i}"${tp(`<b>${NM[p.i]}</b> · ${GLAB[p.c.g]}<br>Did ${Math.round(p.c.e*100)}% of the practice · mastery ${Math.round(p.c.m*100)}%`)}><circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="11" fill="transparent"/>${on?`<circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="8.5" style="fill:none;stroke:var(--accent);stroke-width:2"/>`:''}<circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="5" style="fill:${COL[p.c.g]};stroke:var(--surface);stroke-width:2"/></g>`});
  lab.forEach(o=>{const tx=o.a==='start'?o.b.x:o.a==='end'?o.b.x+o.b.w:o.b.x+o.b.w/2;s+=T(tx,o.b.y+10,NM[o.p.i],{a:o.a,c:o.p.i===sel?'tacc':'t1',w:o.p.i===sel?700:null})});
  s+='</svg>';
  return fig(s)+(early.length?`<p class="hint">Too early to tell: ${andList(early)}.</p>`:'')}
/* the class's share of secure standings in a unit, subunit or skill at the end of each week; null while fewer than eight standings exist */
const trendMemo=new Map();
function trendN(n){const key=n.t+n.id;let a=trendMemo.get(key);if(a)return a;const ks=nodeSkills(n).filter(k=>STW[0][k]!==undefined);a=[];
  for(let w=0;w<NOW;w++){let num=0,den=0;ALL.forEach(i=>ks.forEach(k=>{const v=STW[i][k][w];if(v>=0){den++;if(v===2)num++}}));a.push(den>=8?num/den:null)}
  trendMemo.set(key,a);return a}
/* a run of weekly shares as a small line, on the weeks of the course so that columns line up in time, and scaled to its own range so its direction shows */
function trendLine(x,y,w,h,a){const pts=a.map((v,ix)=>v===null?null:[ix,v]).filter(Boolean);if(pts.length<2)return '';
  const vs=pts.map(q=>q[1]),lo=Math.min(...vs),hi=Math.max(...vs),mid=(lo+hi)/2,span=Math.max(.15,hi-lo),px=ix=>x+ix/Math.max(1,NOW-1)*w,py=v=>y+h/2-(v-mid)/span*(h-5),e=pts[pts.length-1];
  return `<polyline points="${pts.map(q=>f1(px(q[0]))+','+f1(py(q[1]))).join(' ')}" fill="none" style="stroke:var(--ink-3);stroke-width:1.5;stroke-linejoin:round"/><circle cx="${f1(px(e[0]))}" cy="${f1(py(e[1]))}" r="2.4" style="fill:var(--ink-3)"/>`}
/* how a student's taught skills divide: secure, developing, not yet; the rest have fewer than two checks so far */
const sum2=i=>{const c={F:0,H:0,E:0};TSK.forEach(k=>{const q=CAT[i][k];if(c[q]!==undefined)c[q]++});return c};
function v2draw(){const c=$('#v2c');if(!c)return;const E=S.v2,A=E.at,tb=0,sel=S.stu,cs=cols2().slice(pg2From(),pg2From()+PG2),ids=tbWho(tb),lv=A.j!==null?'k':A.u!==null?'j':'u',n=cs.length;
  /* A calm table: a row a student, a column a unit. Each cell is one small bar whose green says how secure, with a thin line under it for practice done,
     and white space around it, so the eye reads down a column or along a row. Columns share the page up to a comfortable width; with only a few of them
     the table is narrower and sits in the middle. Names of columns are written on a slant, so none is cut short to fit */
  const room=c.clientWidth||900,tight=room<1100,L=tight?146:168,BW=tight?64:96,SUMW=BW+80,rh=23,cw=Math.floor(clamp((room-L-SUMW-4)/Math.max(1,n),tight?60:70,132)),pw=Math.round(clamp(cw-34,tight?30:36,64)),NC=lv==='k'?30:26,tagX=22+Math.max(...ids.map(i=>NM[i].length))*6.4;
  const lab=o=>o.t==='u'?D.units[o.id].name:o.t==='j'?D.subs[o.id].name:D.skills[o.id],code=o=>o.t==='u'?TB0[o.id].s:o.t==='j'?SUBS[o.id].s:'',onCol=o=>o.t==='u'?TB0[o.id].on:o.t==='j'?SUBS[o.id].on:true;
  const hH=Math.round(clamp(Math.max(0,...cs.map(o=>cut(lab(o),NC).length))*6.5*.643+20,48,150)),yF=6+hH,yC=yF+22,top=yC+28,bot=top+ids.length*rh,yT=bot+8,H=yT+36;
  cs.forEach((o,ix)=>{o.w=cw;o.x=L+ix*cw;o.cx=o.x+cw/2});const xR=L+n*cw,xs=xR+22,W=xR+SUMW;
  if(E.sort!=='start'){const pr=E.sort==='off'?{off:0,coast:1,stuck:2,early:3,go:4,on:5}:{stuck:0,off:1,go:2,early:3,coast:4,on:5};ids.sort((a,b)=>(pr[cellN(a,tb,E.sel).g]??9)-(pr[cellN(b,tb,E.sel).g]??9)||a-b)}
  let s=`<svg class="viz mgrid" viewBox="0 0 ${W} ${H}" style="width:${W}px;min-width:${W}px;max-width:none" role="group" aria-label="Effort and mastery grid: ${ids.length} students by ${n} ${lv==='u'?'units':lv==='j'?'subunits of '+TB0[A.u].n:'skills of '+SUBS[A.j].n}"><defs>${HATCH}</defs>`;
  const picked=o=>o.t===E.sel.t&&o.id===E.sel.id;
  cs.forEach(o=>{if(picked(o))s+=`<rect x="${o.x+4}" y="${yF-3}" width="${cw-8}" height="${bot-yF+6}" rx="8" style="fill:var(--accent-soft)"/>`});
  /* column headings: the name on a slant, its number under it. A unit or subunit opens the level below; a skill is picked for the chart underneath. Gray is not started */
  const head=(o,attrs,tip,pk)=>{const st=onCol(o),tx=o.cx-pw/2+8,ty=yF-8,cd=code(o);
    return `<g class="hit" ${attrs} tabindex="0" role="button"${tp(tip)}><rect x="${o.x+3}" y="${yF-3}" width="${cw-6}" height="22" rx="4" fill="transparent"/><text x="${f1(tx)}" y="${f1(ty)}" transform="rotate(-40 ${f1(tx)} ${f1(ty)})" class="${pk?'t1':st?'tlink':'t3'}"${pk?' font-weight="700"':''}>${esc(cut(lab(o),NC))}</text>${cd?T(o.cx,yF+12,cd,{a:'middle',c:st?'t1':'t3',w:700}):''}</g>`};
  cs.forEach(o=>{
    if(o.t==='u'){const U=TB0[o.id];s+=head(o,`data-act="v2u" data-u="${o.id}" aria-label="${U.n}: show its subunits"`,`<b>${U.n}</b> · ${wkTxt(U)}<br><span>Click to see its ${U.js.length} subunits</span>`,picked(o))}
    else if(o.t==='j'){const J=SUBS[o.id],nk=jSk(0,o.id).length;s+=head(o,`data-act="v2j" data-j="${o.id}" aria-label="${J.n}: show its skills"`,`<b>${J.n}</b> · ${wkTxt(J)}<br><span>${nk?`Click to see its ${nk} ${pl(nk,'skill')}`:'No skills mapped yet'}</span>`,picked(o))}
    else{const k=o.id,here=tbOfSub(k)[0];s+=head(o,`data-act="v2k" data-k="${k}" data-j="${o.j}" aria-pressed="${picked(o)}" aria-label="${ASK[k]}"`,`<b>${ASK[k]}</b><br><span>${taught(k)?`First met in week ${KT[k]}`:'Not started'} · ${here.t&&here.a?'taught and checked':here.t?'taught, but no question checks it':'checked here'}</span>`,picked(o))}});
  s+=T(10,yF+12,'Student',{c:'t2',w:700})+T(xs,yF+12,tight?`Secure of ${NK}`:`Secure, of ${NK} skills`,{c:'t2',w:700});
  /* one bar for how a set of skills divides: secure, developing, not yet, darkest first so that the secure part can be compared from row to row */
  const split=(x,y,w,parts,tot)=>{let xx=x,g=`<rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="8" rx="2" style="fill:var(--surface-2)"/>`;parts.forEach(([v,col])=>{if(v<=0)return;const ww=w*v/tot;g+=`<rect x="${f1(xx)}" y="${f1(y)}" width="${f1(Math.max(1.5,ww-1))}" height="8" rx="1.5" style="fill:${col}"/>`;xx+=ww});return g};
  /* the class: how its students divide in each column, and on average across all skills */
  s+=`<line x1="4" x2="${W-4}" y1="${yC-2}" y2="${yC-2}" class="grid"/>`+T(10,yC+16,'Class',{c:'t2',w:700});
  cs.forEach(o=>{const cc=ids.map(i=>cellN(i,tb,o)).filter(q=>q.g!=='x'&&q.g!=='na'),x=o.cx-pw/2;
    if(!cc.length){s+=`<g${tp(`<b>${nodeName(o,tb)}</b><br>Not started`)}><rect x="${f1(x)}" y="${yC+8}" width="${pw}" height="8" rx="2" fill="url(#hatch)" opacity=".7"/></g>`;return}
    const m={S:0,D:0,N:0,U:0};cc.forEach(q=>m[q.mc]++);
    s+=`<g${tp(`<b>Class · ${nodeName(o,tb)}</b><br>${m.S} secure · ${m.D} developing · ${m.N} not yet${m.U?` · ${m.U} too early`:''}<br><span>${cc.filter(q=>q.g==='stuck').length} stuck despite effort · ${cc.filter(q=>q.g==='off').length} not doing the work</span>`)}><rect x="${o.x+2}" y="${yC}" width="${cw-4}" height="24" fill="transparent"/>${split(x,yC+8,pw,[[m.S,MRAMP.S],[m.D,MRAMP.D],[m.N,MRAMP.N],[m.U,'var(--neutral)']],cc.length)}</g>`});
  const SUM={};ids.forEach(i=>{SUM[i]=sum2(i)});const cm={F:avg(ids.map(i=>SUM[i].F)),H:avg(ids.map(i=>SUM[i].H)),E:avg(ids.map(i=>SUM[i].E))};
  const sumG=(y,q,who)=>`<g${tp(`<b>${who}</b><br>${Math.round(q.F)} secure · ${Math.round(q.H)} developing · ${Math.round(q.E)} not yet<br><span>${Math.round(NK-q.F-q.H-q.E)} of the ${NK} have fewer than two checks so far</span>`)}><rect x="${xR+12}" y="${f1(y-7)}" width="${SUMW-16}" height="22" fill="transparent"/>${split(xs,y,BW,[[q.F,MRAMP.S],[q.H,MRAMP.D],[q.E,MRAMP.N]],NK)}${T(xs+BW+10,y+8,Math.round(q.F),{c:'t1',w:who==='Class average'?700:null})}</g>`;
  s+=sumG(yC+8,cm,'Class average');
  /* one cell: the bar, the line of practice under it, and a dot when the student is stuck despite effort */
  const pill=(cx,y,q)=>{const x=cx-pw/2,ew=Math.max(1.5,pw*clamp(q.e||0,0,1));
    return (q.mc==='U'?`<rect x="${f1(x+.5)}" y="${f1(y+4.5)}" width="${pw-1}" height="10" rx="3" style="fill:var(--surface);stroke:var(--neutral);stroke-width:1"/>`:`<rect x="${f1(x)}" y="${f1(y+4)}" width="${pw}" height="11" rx="3" style="fill:${MRAMP[q.mc]}"/>`)
      +`<rect x="${f1(x)}" y="${f1(y+17)}" width="${pw}" height="3" rx="1.5" style="fill:var(--surface-2)"/><rect x="${f1(x)}" y="${f1(y+17)}" width="${f1(ew)}" height="3" rx="1.5" style="fill:${effCol(q)}"/>`
      +(q.g==='stuck'?`<circle cx="${f1(x+pw-5.5)}" cy="${f1(y+9.5)}" r="3.2" style="fill:var(--bad);stroke:var(--surface);stroke-width:1.5"/>`:'')};
  ids.forEach((i,ri)=>{const y=top+ri*rh,on=sel===i,nm=NM[i];
    s+=`<line x1="4" x2="${W-4}" y1="${y}" y2="${y}" class="grid"/>`;
    if(on)s+=`<rect x="2" y="${y+1}" width="${W-4}" height="${rh-2}" rx="5" style="fill:none;stroke:var(--accent);stroke-width:1.5"/>`;
    s+=`<g class="hit" data-act="stu" data-i="${i}"><rect x="4" y="${y+1}" width="${L-8}" height="${rh-2}" fill="transparent"/>${T(10,y+rh/2+4.5,nm,{c:on?'tacc':'t1',w:on?700:null})}${drifting(i)?T(tagX,y+rh/2+4.5,'drifting',{c:'tbad'}):''}</g>`;
    cs.forEach(o=>{const cc=cellN(i,tb,o),at=`data-act="v2sel" data-t="${o.t}" data-id="${o.id}"${o.t==='k'?` data-j="${o.j}"`:''}`,hitR=`<rect x="${o.x+3}" y="${y+1}" width="${cw-6}" height="${rh-2}" fill="transparent"/>`;
      if(cc.g==='x'||cc.g==='na'){s+=`<g class="hit" ${at}>${hitR}</g>`;return}
      s+=`<g class="hit" ${at}${tp(`<b>${nm} · ${nodeName(o,tb)}</b><br>${GLAB[cc.g]}<br><span>Tried ${Math.round(cc.e*100)}% of the class’s questions · mastery ${cc.m===null?'too early to tell':Math.round(cc.m*100)+'%'}</span>`)}>${hitR}${pill(o.cx,y,cc)}</g>`});
    s+=sumG(y+7,SUM[i],nm)});
  /* the class over time: for each column, the share of standings that were secure week by week, with where it is now */
  const tcell=(x,w,a,name)=>{const v=a.filter(q=>q!==null);if(v.length<2)return '';const now=v[v.length-1],then=v[Math.max(0,v.length-5)],d=Math.round((now-then)*100),up=d>=3,dn=d<=-3,sw=w-44;
    return `<g${tp(`<b>${name}</b><br>Class share secure: ${Math.round(then*100)}% ${v.length>=5?'four weeks ago':'at first'} → ${Math.round(now*100)}% now`)}><rect x="${f1(x-3)}" y="${yT}" width="${f1(w+6)}" height="30" fill="transparent"/>${sw>=22?trendLine(x,yT+5,sw,20,a):''}${T(x+w,yT+19.5,`${up?'↑ ':dn?'↓ ':''}${Math.round(now*100)}%`,{a:'end',c:up?'tgood':dn?'tbad':'t2',w:up||dn?700:null})}</g>`};
  s+=`<line x1="4" x2="${W-4}" y1="${bot}" y2="${bot}" style="stroke:var(--axis)"/>`+T(10,yT+19.5,'Class trend',{c:'t2',w:700})+T(82,yT+19.5,'share secure',{c:'t3'});
  cs.forEach(o=>{const tw=Math.min(cw-12,86);s+=tcell(o.cx-tw/2,tw,trendN(o),nodeName(o,tb))});
  s+=tcell(xs,BW+34,Array.from({length:NOW},(_,w)=>avg(ids.map(i=>SECW[i][w]))),'All skills taught so far');
  s+=`<line x1="${xR+10}" x2="${xR+10}" y1="${yF-2}" y2="${H-6}" class="grid"/></svg>`;
  const all=ids.map(i=>({n:NM[i],c:cellN(i,tb,E.sel)})),by=g=>all.filter(o=>o.c.g===g).map(o=>o.n);
  const why=n=>'';
  const MSQ={stuck:['N',true],off:['N',false],coast:['S',false]};
  const grp=(g,act)=>{const a=by(g);if(!a.length)return '';const key=`v2:${tb}:${E.sel.t}${E.sel.id}:${g}`;
    return `<div class="ag"><p class="dl">${sq2(MSQ[g][0],MSQ[g][1],g)}${GLAB[g]} · ${a.length}</p><div class="fl-names">${a.map(n=>`<span class="who5">${nmBtn(n)}${why(n)?`<span class="why">${why(n)}</span>`:''}</span>`).join('')}</div><p class="fl-act">${isLogged(key)?'<span class="pill good">Logged</span>':`<button class="btn small" type="button" data-act="v2log" data-g="${g}">${act}</button>`}</p></div>`};
  const gs=grp('stuck','Reteach in a small group')+grp('off','Talk to them')+grp('coast','Offer a stretch task'),da=duoW(.58,520);
  const det=`<div class="detail"><div class="dhead"><h3>${nodeName(E.sel,tb)}</h3><span class="pill good">${by('on').length} on track</span><span class="pill">${by('go').length} keep going</span>${by('early').length?`<span class="pill">${by('early').length} too early to tell</span>`:''}</div>${duo(da,v2scatter(tb,E.sel,ids,da||VW()),gs?`<div class="ags">${gs}</div>`:'<p class="none">Nobody here is stuck, coasting or not doing the work.</p>','cards')}</div>`;
  const none=all.every(o=>o.c.g==='x'||o.c.g==='na'),det0=`<div class="detail"><div class="dhead"><h3>${nodeName(E.sel,tb)}</h3><span class="hint">${LEVEL2[E.sel.t]}${E.sel.t!=='u'?' in '+TBU(tb,nodeUnit(E.sel)).n:''}</span></div><p class="none">Nothing to place here yet: the class hasn’t started it, or no question checks it.</p></div>`;
  c.innerHTML=(cs.length?fig(s):'<p class="none">No skills are mapped to this subunit.</p>')+(none?det0:det);const an=$('#ans');if(an)an.textContent=h2()}

/* ---------- view 3: drift watchlist ---------- */
const flagged3=()=>NM.map((_,i)=>i).filter(i=>DR[i]&&!S.v3.dismissed.includes(NM[i])).sort((a,b)=>DR[a]-DR[b]||a-b);
const watch3=()=>NM.map((_,i)=>i).filter(i=>WATCH[i]);
function h3(){const n=flagged3().length;return n?`${n} ${pl(n,'student is','students are')} drifting below their own normal.`:'Nobody is drifting below their own normal.'}
function spark(i,w,h,full){const a=WORK[i],b=BAND[i],lo=0,hi=100,px=wk=>3+(wk-1)*(w-6)/(NOW-1),py=v=>h-3-(clamp(v,lo,hi)-lo)/(hi-lo)*(h-6),d=DR[i];
  const pts=a.map((v,ix)=>f1(px(ix+1))+','+f1(py(v)));
  let s=`<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${NM[i]}: weekly activity ${a[0]} in week 1, ${a[NOW-1]} in week ${NOW}; normal range ${Math.round(b.lo)} to ${Math.round(b.hi)}">`;
  s+=`<rect x="3" y="${f1(py(b.hi))}" width="${w-6}" height="${f1(py(b.lo)-py(b.hi))}" rx="2" style="fill:var(--neutral);opacity:.32"/>`;
  if(full)s+=`<line x1="${f1(px(BASE+.5))}" x2="${f1(px(BASE+.5))}" y1="2" y2="${h-2}" style="stroke:var(--ink-3);stroke-width:1;stroke-dasharray:2 2;opacity:.6"/>`;
  if(d){s+=`<polyline points="${pts.slice(0,d-1).join(' ')}" fill="none" style="stroke:var(--ink-3);stroke-width:1.6;stroke-linejoin:round"/><polyline points="${pts.slice(d-2).join(' ')}" fill="none" style="stroke:var(--bad);stroke-width:2.4;stroke-linejoin:round"/><circle cx="${f1(px(d))}" cy="${f1(py(a[d-1]))}" r="${full?4:2.6}" style="fill:var(--bad);stroke:var(--surface);stroke-width:1.5"/>`}
  else{s+=`<polyline points="${pts.join(' ')}" fill="none" style="stroke:var(--ink-3);stroke-width:1.6;stroke-linejoin:round"/>`;if(WATCH[i])s+=`<circle cx="${f1(px(NOW))}" cy="${f1(py(a[NOW-1]))}" r="${full?4:2.6}" style="fill:var(--watch);stroke:var(--surface);stroke-width:1.5"/>`}
  return s+'</svg>'}
const draftMsg=n=>{const g=SIG[n],b=[];if(g.miss)b.push(`done no work on ${g.miss} of the last ${g.of} class days`);if(g.work)b.push(`left ${g.work} assigned ${pl(g.work,'set')} unfinished`);if(!b.length)b.push('been doing less of each week’s work');
  return `Hello, this is the ${CLASS.subject} teacher for ${CLASS.name}. Since week ${DR[ID[n]]}, ${n} has ${andList(b)}. ${n} did well earlier in the course, and I would like to help get things back on track. Could we find ten minutes to talk this week?`};
function v3(){const sel=S.stu,Z=S.v3,fl=flagged3(),wt=watch3(),SW=Math.round(clamp((VW()-200)*.46,290,620)); /* the activity line and the signals share the row about evenly, so the line isn't pulled flat */
  const axis=`<svg class="spark" viewBox="0 0 ${SW} 16" width="${SW}" height="16" aria-hidden="true">${[1,BASE,Math.round((BASE+NOW)/2),NOW].map(w=>`<text x="${f1(3+(w-1)*(SW-6)/(NOW-1))}" y="12" text-anchor="${w===1?'start':w===NOW?'end':'middle'}">Wk ${w}</text>`).join('')}</svg>`;
  const row=(i,watch)=>{const n=NM[i],g=SIG[n],on=sel===i,ck=Z.checked.includes(n),sn=Z.sent.includes(n),op=Z.open===n;
    const sigs=[[g.miss>=2,`No work on ${g.miss} of ${g.of} class days`],[g.work>=2,`${g.work} sets unfinished`],[g.acc<=-10,`Accuracy ${sgn(g.acc)} pts`]].filter(q=>q[0]).map(q=>`<span class="sg bad">${q[1]}</span>`).join('');
    let h=`<div class="wl-r${on?' on':''}${watch?' watch':''}"><div class="wl-who"><button class="nmx" type="button" data-act="stu" data-i="${i}">${n}</button>${watch?'<span class="pill watch">One low week</span>':`<span class="pill bad">Since week ${DR[i]}</span>`}</div><div>${spark(i,SW,46,true)}</div>
    <div class="wl-sig"><div class="sigs">${sigs||'<span class="sg">Doing less each week</span>'}</div>${watch?'':`<div class="acts"><button class="btn small${ck?' done':''}" type="button" data-act="v3check" data-n="${n}" aria-pressed="${ck}">${ck?IC.check+' Checked in':'Check in'}</button><button class="btn small${sn?' done':''}" type="button" data-act="v3msg" data-n="${n}" aria-expanded="${op}">${sn?IC.check+' Message sent':'Message home'}</button><button class="btn small ghost" type="button" data-act="v3dismiss" data-n="${n}">Not a concern</button></div>`}</div>`;
    if(op)h+=`<div class="draft"><label for="v3txt">Message to ${n}’s family</label><textarea id="v3txt" data-n="${n}">${esc(Z.text[n]||draftMsg(n))}</textarea><div class="acts"><button class="btn small" type="button" data-act="v3copy" data-n="${n}">Copy text</button><button class="btn small primary" type="button" data-act="v3sent" data-n="${n}">Mark as sent</button><button class="btn small ghost" type="button" data-act="v3msg" data-n="${n}">Cancel</button></div></div>`;
    return h+'</div>'};
  let follow='';
  if(sel!==null&&!fl.includes(sel)&&!wt.includes(sel)){const i=sel,n=NM[i],dis=Z.dismissed.includes(n);
    follow=`<div class="wl-r on" style="margin-bottom:10px;--sw:${SW}px"><div class="wl-who"><button class="nmx" type="button" data-act="stu" data-i="${i}">${n}</button><span class="pill">${dis?'Not a concern':'Normal'}</span></div><div>${spark(i,SW,46,true)}</div><div class="wl-sig"><p class="pat">${dis?'You marked this student as not a concern.':'Inside their normal range.'}</p></div></div>`}
  const rest=NM.map((_,i)=>i).filter(i=>!fl.includes(i)&&!wt.includes(i));
  const dis=Z.dismissed.length?`<p class="hint" style="margin-top:10px">Not a concern: ${Z.dismissed.map(n=>`${n} <button class="lnk" type="button" data-act="v3undo" data-n="${n}">Undo</button>`).join(' · ')}</p>`:'';
  const others=`<div class="controls" style="margin-top:14px"><button class="btn small" type="button" data-act="v3all" aria-expanded="${Z.all}">${Z.all?'Hide':'Show'} the other ${rest.length} students</button></div>${Z.all?`<div class="minis">${rest.map(i=>`<button class="mini${sel===i?' on':''}" type="button" data-act="stu" data-i="${i}">${spark(i,64,22,false)}<span>${NM[i]}</span></button>`).join('')}</div>`:''}`;
  const list=fl.length||wt.length?`<div class="wl" style="--sw:${SW}px"><div class="wl-h"><span></span>${axis}<span>Gray band: normal range</span></div>${fl.map(i=>row(i,false)).join('')}${wt.map(i=>row(i,true)).join('')}</div>`:'<p class="none">Nobody is below their normal range.</p>';
  return follow+list+dis+others}

/* ---------- view 4: pace tracks ---------- */
function h4(){const g=S.v4.goal,P=NM.map((n,i)=>paceOf(i,g)),c=s=>P.filter(p=>p.st===s).length,nc=c('Short, not catching up'),cu=c('Short, but catching up');
  if(!nc&&!cu)return `Everyone is on pace for ${g} skills.`;
  return `${nc+cu} ${pl(nc+cu,'student')} will miss the goal of ${g}. ${nc} ${nc===1?'isn’t':'aren’t'} catching up.`}
function v4(){const z=S.v4;
  return `<div class="controls"><label class="rng" for="v4goal">Goal by week ${NWK} <output id="v4go">${z.goal} skills</output><input type="range" id="v4goal" min="${GOALMIN}" max="${NSK-2}" step="1" value="${z.goal}"></label><label class="sel" for="v4sort">Sort <select id="v4sort">${[['status','By status'],['proj','By projection'],['name','By name']].map(o=>`<option value="${o[0]}"${z.sort===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></label></div>
  <div class="legend">${PS.map(p=>`<span><i class="sw" style="background:${p[1]}"></i>${p[0]}</span>`).join('')}<span><svg width="24" height="10" aria-hidden="true"><line x1="1" y1="5" x2="23" y2="5" style="stroke:var(--ink-2);stroke-width:2.5;stroke-dasharray:4 3"/></svg>Projected</span></div><div id="v4c" class="fig"></div>`}
function v4draw(){const c=$('#v4c');if(!c)return;const goal=S.v4.goal,P=NM.map((n,i)=>Object.assign({i},paceOf(i,goal)));
  let blocks;
  if(S.v4.sort==='status')blocks=PS.map(p=>({p,ids:P.filter(o=>o.st===p[0]).sort((a,b)=>a.proj-b.proj||a.i-b.i)})).filter(b=>b.ids.length);
  else{const a=P.slice();if(S.v4.sort==='proj')a.sort((x,y)=>y.proj-x.proj||x.i-y.i);else if(S.v4.sort==='name')a.sort((x,y)=>NM[x.i].localeCompare(NM[y.i]));blocks=[{p:null,ids:a}]}
  /* on a wide page the class is two charts side by side on one scale, so the tracks aren't pulled long and the whole class shows at once.
     The status groups are dealt out whole when that keeps the two about the same length; otherwise the list is cut in half, and a group cut in two is named again as continued */
  const half=Math.min(900,Math.floor((VW()-DGAP)/2)),two=half>=450&&N>=12;let cols=[blocks];
  if(two){let k=0,best=Infinity,acc=0;blocks.forEach((b,ix)=>{acc+=b.ids.length;if(ix<blocks.length-1&&Math.abs(N-2*acc)<best){best=Math.abs(N-2*acc);k=ix+1}});
    if(k&&best<=N*.24)cols=[blocks.slice(0,k),blocks.slice(k)];
    else{const A=[],B=[];let room=Math.ceil(N/2);blocks.forEach(b=>{const m=b.ids.length;if(room>=m){A.push(b);room-=m}else if(room>0){A.push({p:b.p,ids:b.ids.slice(0,room),n:m});B.push({p:b.p,ids:b.ids.slice(room),n:m,cont:true});room=0}else B.push(b)});cols=[A,B]}}
  const due=goal*NOW/NWK;
  const chart=(bl,W,part)=>{const rows=bl.reduce((t,b)=>t+b.ids.length,0),L=86,x0=98,x1=W-80,rh=19,gh=28,top=46,sx=v=>x0+v/NSK*(x1-x0),bot=top+bl.filter(b=>b.p).length*gh+rows*rh,H=bot+44;
    let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="Pace tracks${part}: skills secure now and projected to week ${NWK} for ${rows} ${pl(rows,'student')}, against a goal of ${goal}">`;
    for(let v=0;v<=NSK;v+=NSK>40?Math.ceil(NSK/80)*10:4)s+=`<line x1="${f1(sx(v))}" x2="${f1(sx(v))}" y1="${top-6}" y2="${bot+6}" class="grid"/>`+T(sx(v),bot+22,v,{a:'middle',c:'t3'});
    s+=T((x0+x1)/2,H-6,'Skills secure',{a:'middle'});
    s+=`<line x1="${f1(sx(due))}" x2="${f1(sx(due))}" y1="${top-14}" y2="${bot+6}" style="stroke:var(--ink-3);stroke-width:1.5;stroke-dasharray:2 3"/>`+T(sx(due)-5,top-18,`${sx(due)>=126?'Due by today':'Due'}: ${Math.round(due*10)/10}`,{a:'end',c:'t3'});
    s+=`<line x1="${f1(sx(goal))}" x2="${f1(sx(goal))}" y1="${top-14}" y2="${bot+6}" style="stroke:var(--ink);stroke-width:2"/>`+T(sx(goal)+5,top-18,`Goal: ${goal}`,{c:'t1',w:700});
    let y=top;
    bl.forEach(b=>{if(b.p){s+=`<text x="${x0}" y="${y+18}" class="${b.p[2]}" font-weight="700" style="font-size:12.5px;paint-order:stroke;stroke:var(--surface);stroke-width:6px;stroke-linejoin:round">${b.p[0]} · ${b.cont?'continued':b.n||b.ids.length}</text>`;y+=gh}
      b.ids.forEach(o=>{const i=o.i,p=PS[PSI[o.st]],col=p[1],yc=y+rh/2,on=S.stu===i;
        s+=`<g class="row${on?' on':''}" data-act="stu" data-i="${i}" tabindex="0" role="button" aria-label="${NM[i]}: ${o.st}; ${o.now} secure now, about ${Math.round(o.proj)} by week ${NWK}"${tp(`<b>${NM[i]}</b> · ${o.st}<br>${o.now} secure now, about ${Math.round(o.proj)} by week ${NWK}<br><span>Recent pace ${Math.round(o.rec*100)}%, earlier ${Math.round(o.ear*100)}%</span>`)}><rect class="rbg" x="2" y="${y}" width="${W-4}" height="${rh}" rx="4"/>`;
        s+=T(L,yc+4,NM[i],{a:'end',c:on?'tacc':'t1',w:on?700:null});
        s+=`<line x1="${f1(sx(0))}" x2="${f1(sx(NSK))}" y1="${f1(yc)}" y2="${f1(yc)}" style="stroke:var(--surface-2);stroke-width:8;stroke-linecap:round"/>`;
        if(o.now>0)s+=`<rect x="${f1(sx(0))}" y="${f1(yc-4)}" width="${f1(sx(o.now)-sx(0))}" height="8" rx="2" style="fill:${col}"/>`;
        if(o.proj>o.now+.05)s+=`<line x1="${f1(sx(o.now))}" x2="${f1(sx(o.proj))}" y1="${f1(yc)}" y2="${f1(yc)}" style="stroke:${col};stroke-width:3;stroke-dasharray:4 3"/>`;
        s+=`<circle cx="${f1(sx(o.proj))}" cy="${f1(yc)}" r="3.6" style="fill:var(--surface);stroke:${col};stroke-width:2"/>`;
        s+=T(x1+14,yc+4,`${o.now} → ${Math.round(o.proj)}`,{c:p[2]})+'</g>';y+=rh})});
    return s+'</svg>'};
  c.innerHTML=two?`<div class="duo even" style="grid-template-columns:repeat(2,${half}px)"><div class="duo-a">${chart(cols[0],half,', first of two charts')}</div><div class="duo-b">${chart(cols[1],half,', second of two charts')}</div></div>`:chart(blocks,VW(),'');
  const an=$('#ans');if(an)an.textContent=h4()}

/* ---------- view 6 (Q5): hardest content, as ranked bars per textbook ----------
   Each row is a unit, subunit or skill; the bar is the share of students not secure yet.
   A skill counts only when an item checks it somewhere: a skill nothing checks has no evidence, so it gets no bar. */
const EMPTYK={c:{F:[],H:[],E:[],Q:[],N:[]},a:0,ns:0,p:null};
function statK(k,ids){const c={F:[],H:[],E:[],Q:[],N:[]};ids.forEach(i=>{const m=mast(i,k);if(m)c[m.cat].push(NM[i])});const a=c.F.length+c.H.length+c.E.length;return {c,a,ns:c.E.length+c.H.length,p:a>=8?(c.E.length+c.H.length)/a:null}}
const st5=(k,ids)=>chk5(k)?statK(k,ids):EMPTYK;
const eo=s=>({a:s.a,e:s.c.E.length,h:s.c.H.length,p:s.p});
const pool5=ss=>{let a=0,e=0,h=0;ss.forEach(s=>{if(s.p!==null){a+=s.a;e+=s.c.E.length;h+=s.c.H.length}});return {a,e,h,p:a?(e+h)/a:null}};
const whereTxt=k=>`${SUBS[KHOME[k]].s} · ${chk5(k)?`${KIT[k].length} ${pl(KIT[k].length,'question')}`:'no question checks it'}`;
/* units or subunits the class hasn't started: one line of names, so the list stays about what there is evidence for */
const nsRow=items=>items.length?`<li class="ns"><p class="nsrow"><span class="nsl">Not started</span>${items.join('')}</p></li>`:'';
const pc5=p=>Math.round(p*100)+'%';
function tree5(tb){const ids=tbWho(tb);
  return TB[tb].units.map((U,u)=>{const subs=uJs(tb,u).map(j=>{const J=TBJ(tb,j),on=J.on,ks=on?jSk(tb,j).map(k=>{const s=st5(k,ids);return {k,s,p:s.p}}):[];return Object.assign({j,J,on,ks},pool5(ks.map(x=>x.s)))});
    return Object.assign({u,U,on:tU(tb,u),subs},pool5(subs.flatMap(x=>x.ks.map(y=>y.s))))})}
/* hardest unit and skill; a tie between skills goes to the one in the hardest unit, then course order */
function hard5(tb){const T=tree5(tb);let hu=null,hk=null;
  T.forEach(U=>{if(U.p!==null&&(!hu||U.p>hu.p+1e-9))hu=U});
  T.forEach(U=>U.subs.forEach(J=>J.ks.forEach(K=>{if(K.p===null)return;if(!hk||K.p>hk.p+1e-9||(Math.abs(K.p-hk.p)<1e-9&&hu&&U.u===hu.u&&hk.u!==hu.u))hk={k:K.k,p:K.p,u:U.u,j:J.j}})));
  const nv=[...new Set(T.flatMap(U=>U.subs.flatMap(J=>J.ks.filter(K=>!chk5(K.k)).map(K=>K.k))))];
  return {T,hu,hk,nv}}
function h6(){const tb=S.v6.tb;const {hu,hk,nv}=hard5(tb),Tb=TB[tb],n=nv.length;
  const tail=n?` ${n} taught ${pl(n,'skill has','skills have')} no item that checks ${n===1?'it':'them'}.`:'';
  if(!hk||hk.p<.15)return 'Nothing stands out as hard yet.';
  return `Hardest unit: ${hu.U.n}. Hardest skill: ${ASK[hk.k]}.`}
function v6(){return v6list(S.v6.tb)}
/* which rows are open: none to begin with. The headline and the panel beside the list already name the hardest skill */
function ex5(tb,H){if(!S.v6.ex[tb])S.v6.ex[tb]={U:[],J:[]};return S.v6.ex[tb]}
function sel5(tb,H){const all=H.T.flatMap(U=>U.subs.flatMap(J=>J.ks.map(K=>K.k)));let k=S.v6.sel[tb];if(!all.includes(k))k=S.v6.sel[tb]=H.hk?H.hk.k:all[0];return k}
const lvAll5=tb=>{const us=TB[tb].units.map((_,u)=>u).filter(u=>tU(tb,u)),js=us.flatMap(u=>uJs(tb,u)).filter(j=>TBJ(tb,j).on&&jSk(tb,j).length);return {us,js}};
const level5=tb=>{const E=S.v6.ex[tb],{us,js}=lvAll5(tb);if(!E.U.length)return 'u';if(us.every(x=>E.U.includes(x))){if(!js.some(x=>E.J.includes(x)))return 'j';if(js.every(x=>E.J.includes(x)))return 'k'}return ''};
const CHEV='<svg class="chev" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M3.5 1.8 L7 5 L3.5 8.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const WARNI='<svg class="wi" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M.5 11 L11.5 11 L6 1 Z" style="fill:var(--watch)"/></svg>';
const hbar=(o,lv)=>{const w=v=>f1(v/o.a*100);return `<span class="hb b${lv}" aria-hidden="true"><i style="width:${w(o.e)}%;background:var(--hd-ny)"></i><i style="width:${w(o.h)}%;background:var(--hd-dv)"></i><i style="width:${w(o.a-o.e-o.h)}%;background:var(--ok-fill)"></i></span>`};
/* where else a skill lives, shown only when this textbook teaches it or checks it but not both */
const tag5=()=>'';
/* the followed student: one mark per skill not secure (dot = not yet, ring = developing) */
const smk5=(i,ks)=>ks.map(K=>{if(K.p===null)return '';const m=mast(i,K.k),c=m?m.cat:'N';return c==='E'?'<i class="sd e"></i>':c==='H'?'<i class="sd h"></i>':''}).join('');
const ssr5=(i,ks)=>{const c={E:0,H:0};ks.forEach(K=>{if(K.p===null)return;const m=mast(i,K.k);if(m&&c[m.cat]!==undefined)c[m.cat]++});const t=[c.E?c.E+' not yet':'',c.H?c.H+' developing':''].filter(Boolean).join(', ');return t?`<span class="sr">${NM[i]}: ${t}</span>`:''};
const LEG5=`<span class="lt">Students</span><span><i class="sw" style="background:var(--hd-ny)"></i>Not yet</span><span><i class="sw" style="background:var(--hd-dv)"></i>Developing</span><span><i class="sw" style="background:var(--ok-fill)"></i>Secure</span>`;
function v6list(tb){const H=hard5(tb),T=H.T,ids=tbWho(tb),Tb=TB[tb],E=ex5(tb,H),k0=sel5(tb,H),hard=S.v6.sort!=='course',sel=S.stu,fol=sel!==null&&ids.includes(sel);
  const ord=a=>hard?a.slice().sort((x,y)=>(y.p===null?-1:y.p)-(x.p===null?-1:x.p)):a;
  const pc=o=>`<span class="hp">${o.p===null?'':pc5(o.p)}</span>`;
  const sc=ks=>fol?`<span class="hs">${smk5(sel,ks)}${ssr5(sel,ks)}</span>`:'';
  const nvw=ks=>{const n=ks.filter(K=>K.p===null&&!chk5(K.k)).length;return n?`<span class="tg wq"${tp(`${n} ${pl(n,'skill has','skills have')} no item that checks ${n===1?'it':'them'}`)}>${WARNI}<span class="sr">${n} ${pl(n,'skill')} no item checks</span></span>`:''};
  const off=(lv,name,txt)=>`<div class="hr l${lv} off"><span class="hn"><span class="chs"></span>${name}</span><span class="hx">${txt}</span><span class="hp"></span>${fol?'<span class="hs"></span>':''}</div>`;
  const skRow=K=>{const on=K.k===k0,s=K.s;
    return `<li><button type="button" class="hr l2${on?' on':''}" data-act="v6sk" data-k="${K.k}" aria-pressed="${on}"${tp(`<b>${ASK[K.k]}</b><br>${K.p===null?(chk5(K.k)?'Fewer than eight students have been checked on it':'Taught, but no question or activity checks it'):`${s.c.F.length} secure · ${s.c.H.length} developing · ${s.c.E.length} not yet`}<br><span>${whereTxt(K.k)}</span>`)}><span class="hn"><span class="chs"></span><span>${ASK[K.k]}${tag5(tb,K.k)}</span></span>${K.p===null?(chk5(K.k)?'<span class="hx">Too few checked yet</span>':`<span class="hx w">${WARNI}No item checks it</span>`):hbar(eo(s),2)}${pc(K)}${sc([K])}</button></li>`};
  const subRow=J=>{if(!J.on||!J.ks.length)return `<li>${off(1,J.J.n,J.on?'No skills yet':'Not started')}</li>`;const o=E.J.includes(J.j);
    return `<li><button type="button" class="hr l1" data-act="v6sub" data-j="${J.j}" aria-expanded="${o}"><span class="hn">${CHEV}<span>${J.J.n}${nvw(J.ks)}</span></span>${J.p===null?'<span class="hx">No evidence yet</span>':hbar(J,1)}${pc(J)}${sc(J.ks)}</button>${o?`<ul>${ord(J.ks).map(skRow).join('')}</ul>`:''}</li>`};
  const unitRow=U=>{if(!U.on)return `<li class="hu">${off(0,`<b>${U.U.n}</b>`,'Not started')}</li>`;const o=E.U.includes(U.u);
    return `<li class="hu"><button type="button" class="hr l0" data-act="v6unit" data-u="${U.u}" aria-expanded="${o}"><span class="hn">${CHEV}<span><b>${U.U.n}</b>${nvw(U.subs.flatMap(J=>J.ks))}</span></span>${U.p===null?'<span class="hx">No evidence yet</span>':hbar(U,0)}${pc(U)}${sc(U.subs.flatMap(J=>J.ks))}</button>${o?`<ul>${ord(U.subs.filter(J=>J.on)).map(subRow).join('')}${nsRow(U.subs.filter(J=>!J.on).map(J=>`<i${tp(J.J.n)}>${J.J.s}</i>`))}</ul>`:''}</li>`};
  const note=[ids.length<NM.length?`${ids.length} of ${NM.length} students use ${Tb.n}.`:'',sel!==null&&!fol?`${NM[sel]} doesn’t use it.`:''].filter(Boolean).join(' ');
  const ctl=`<div class="controls"><span class="sel">Show ${seg('v6lvl',level5(tb),[['u','Units'],['j','Subunits'],['k','Skills']],'Show rows down to')}</span><label class="sel" for="v6sort">Sort <select id="v6sort"><option value="hard"${hard?' selected':''}>Hardest first</option><option value="course"${hard?'':' selected'}>Course order</option></select></label></div>`;
  const leg=`<div class="legend mleg">${LEG5}${fol?`<span class="lt">${NM[sel]}</span><span><i class="sd e"></i>Not yet</span><span><i class="sd h"></i>Developing</span>`:''}</div>`;
  const list=`<ul class="hc${fol?' fol':''}" aria-label="${Tb.n}: units, subunits and skills, with the share of students not secure yet"><li class="hh" aria-hidden="true"><div class="hr"><span class="hn"></span><span class="hx"></span><span class="hp">Not secure</span>${fol?`<span class="hs">${NM[sel]}</span>`:''}</div></li>${ord(T.filter(U=>U.on)).map(unitRow).join('')}${nsRow(T.filter(U=>!U.on).map(U=>`<i>${U.U.n}</i>`))}</ul>`;
  const K0=T.flatMap(U=>U.subs.flatMap(J=>J.ks)).find(K=>K.k===k0),s0=K0?K0.s:EMPTYK,p0=s0.p;
  const det=`<div class="detail"><div class="dhead"><h3>${ASK[k0]}</h3>${p0===null?`<span class="pill watch">${chk5(k0)?'Too few checked yet':'No item checks it'}</span>`:`<span class="pill ${p0>=.45?'bad':p0>=.3?'watch':'good'}">${pc5(p0)} not secure</span>`}<span class="hint">${whereTxt(k0)}</span>${taught(k0)&&p0!==null?`<button class="lnk" type="button" data-act="gosub" data-j="${jOf(k0)}">Where they stall →</button>`:''}</div>
  ${p0===null?`<p class="none">${chk5(k0)?'Fewer than eight students have been checked on this skill, so the share would mislead.':'No question or activity checks this skill yet, so there is no evidence of who has it.'}</p>`:`<div class="dgrid">${whoCol('Not yet','var(--hd-ny)',s0.c.E)}${whoCol('Developing','var(--hd-dv)',s0.c.H)}</div>`}</div>`;
  return (note?`<p class="hint" style="margin:0 0 10px">${note}</p>`:'')+ctl+leg+duo(duoW(.6,560),list,det,'stick')}


/* ---------- view 6: lifelines of the skills many students are weak in ---------- */
function h7(){if(!WEAK.length)return 'No skill is weak for a fifth of the class at once.';const n=k=>WEAK.filter(m=>SG[m.st]===k).length,p=n('p'),f=n('f'),g=n('g');
  return `${p} ${pl(p,'skill is','skills are')} weak for a fifth of the class or more${f?`; ${f} ${f===1?'is':'are'} improving`:''}${g?`; ${g} ${g===1?'has':'have'} recovered`:''}.`}
function v7(){const sel=S.stu,f=S.v7.f;
  const every=WEAK.map((m,i)=>({m,i})).filter(o=>f==='all'||SG[o.m.st]===f),few=f==='all'?['p','f','g'].flatMap(g=>every.filter(o=>SG[o.m.st]===g).slice(0,g==='p'?8:3)):every.slice(0,12),rows=S.v7.more?every:few;
  if(rows.length&&!rows.some(o=>o.i===S.v7.r))S.v7.r=rows[0].i;
  const cnt=k=>WEAK.filter(m=>SG[m.st]===k).length;
  const ctl=`<div class="controls">${seg('v7f',f,[['all',`All · ${WEAK.length}`],['p',`Still weak · ${cnt('p')}`],['f',`Improving · ${cnt('f')}`],['g',`Recovered · ${cnt('g')}`]],'Filter by status')}</div>`;
  const leg=`<div class="legend"><span><svg width="26" height="12" aria-hidden="true"><path d="M1 11 L1 8 L7 5 L13 6 L19 2 L25 3 L25 11 Z" style="fill:var(--bad);opacity:.16"/><path d="M1 8 L7 5 L13 6 L19 2 L25 3" fill="none" style="stroke:var(--bad);stroke-width:1.5;stroke-linejoin:round"/></svg>Share of the class not yet secure, week by week</span>${sel!==null?`<span><i class="sw" style="background:var(--accent);border-radius:50%"></i>${NM[sel]} is weak in it</span><span><i class="sw" style="border:1.6px solid var(--accent);border-radius:50%"></i>was earlier</span>`:''}</div>`;
  /* Each skill is one row: a small area for the share of the class not yet secure week by week, then where it stands now as a bar and a count.
     The area is pale with a thin line on top, so a page of weak skills doesn't read as a wall of red, and the count carries the size.
     The weeks run from the first to today: nothing is drawn after it, so the rest of the year would only squeeze the rows */
  const da=duoW(.6,600),W=da||VW(),L=250,R=206,T0=46,rh=38,H=T0+rows.length*rh+26,xt=W-R,st=(xt-L)/NOW,x=w=>L+(w+.5)*st,vmax=Math.max(20,...rows.map(o=>o.m.pkv)),ah=rh-15,BWD=56,xb=xt+18;
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="One row per skill across weeks 1 to ${NOW}; the height of each area is the share of the class not yet secure on it that week">`;
  TAUGHT.forEach((u,ti)=>{const U=TB0[u],a=L+(U.wk[0]-1)*st,uw=(U.wk[1]-U.wk[0]+1)*st;if(ti%2)s+=`<rect x="${f1(a)}" y="${T0-22}" width="${f1(uw)}" height="${rows.length*rh+22}" style="fill:var(--band)"/>`;s+=T(a+uw/2,T0-9,U.s,{a:'middle',c:'t2'})});
  s+=`<line x1="${f1(xt)}" x2="${f1(xt)}" y1="${T0-22}" y2="${T0+rows.length*rh}" style="stroke:var(--axis);stroke-width:1"/>`+T(xt,T0-28,'Today',{a:'middle',c:'t2',w:700})+T(xb,T0-9,'Not yet now',{c:'t3',w:700});
  rows.forEach((o,ri)=>{const m=o.m,top=T0+ri*rh,yc=top+rh/2,yb=top+rh-7,g=SG[m.st],col=SC[g][0],lcol=g==='f'?'var(--ink-3)':col,hh=v=>v/vmax*ah,holds=sel!==null&&m.now.includes(NM[sel]),held=sel!==null&&m.peak.includes(NM[sel]),dim=sel!==null&&!holds&&!held;
    s+=`<g class="row${S.v7.r===o.i?' on':''}${dim?' dim':''}" data-act="v7row" data-r="${o.i}" tabindex="0" role="button" aria-label="${esc(m.n)}, ${m.st}: ${m.now.length} of ${N} students not yet secure. Show details"><rect class="rbg" x="2" y="${top+1}" width="${W-4}" height="${rh-2}" rx="4"/>`;
    s+=T(L-14,yc+4,esc(m.n),{a:'end',c:holds?'tacc':'t1',w:holds?700:null});
    if(holds)s+=`<circle cx="14" cy="${f1(yc)}" r="4.5" style="fill:var(--accent)"/>`;else if(held)s+=`<circle cx="14" cy="${f1(yc)}" r="4" style="fill:none;stroke:var(--accent);stroke-width:1.6"/>`;
    s+=`<line x1="${L}" y1="${yb}" x2="${f1(xt)}" y2="${yb}" class="grid"/>`;
    /* one area for each run of weeks in which 5% or more of the class was not yet secure */
    let w=0;while(w<NOW){if(m.v[w]>=5){let e=w;while(e<NOW-1&&m.v[e+1]>=5)e++;const line=[];for(let k=w;k<=e;k++)line.push(f1(x(k))+','+f1(yb-hh(m.v[k])));
      const open=e===NOW-1;if(open)line.push(f1(xt)+','+f1(yb-hh(m.v[NOW-1])));const x0=f1(x(w)-st/2),x1=open?f1(xt):f1(x(e)+st/2);
      s+=`<polygon points="${x0},${yb} ${line.join(' ')} ${x1},${yb}" style="fill:${col};opacity:.16"/><polyline points="${x0},${yb} ${line.join(' ')}${open?'':` ${x1},${yb}`}" fill="none" style="stroke:${lcol};stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round"/>`;
      if(open)s+=`<circle cx="${f1(xt)}" cy="${f1(yb-hh(m.v[NOW-1]))}" r="3.4" style="fill:${lcol};stroke:var(--surface);stroke-width:1.5"/>`;w=e+1}else w++}
    /* now: a bar for the share of the class, and how many students that is */
    s+=`<rect x="${f1(xb)}" y="${f1(yc-3)}" width="${BWD}" height="6" rx="3" style="fill:var(--surface-2)"/><rect x="${f1(xb)}" y="${f1(yc-3)}" width="${f1(Math.max(m.now.length?3:0,BWD*m.lastv/100))}" height="6" rx="3" style="fill:${col}"/>`+T(xb+BWD+8,yc+4,m.now.length,{c:'t1',w:700});
    s+=T(xb+BWD+34,yc+4,m.st,{c:SC[g][1],w:700});
    for(let k=0;k<NOW;k++){const v=m.v[k];s+=`<rect x="${f1(L+k*st)}" y="${top+1}" width="${f1(st)}" height="${rh-2}" fill="transparent"${tp(`<b>${esc(m.n)}</b><br>Week ${k+1}: ${v>=5?`${v}% of the class not yet secure`:'under 5% not yet secure'}`)}/>`}
    s+=`<rect x="${f1(xt+4)}" y="${top+1}" width="${R-8}" height="${rh-2}" fill="transparent"${tp(`<b>${esc(m.n)}</b><br>${m.now.length} of ${N} students not yet secure now (${m.lastv}%)<br><span>At its worst, ${m.pkv}% in week ${m.pw}</span>`)}/>`;
    s+='</g>'});
  if(!rows.length)s+=T(W/2,T0+20,'Nothing matches this filter.',{a:'middle',c:'t3'});
  [...new Set([0,Math.round(NOW/2)-1,NOW-1])].forEach(k=>{s+=T(x(k),H-6,k===0?'Week 1':k+1,{a:'middle',c:'t3'})});
  s+='</svg>';
  let det='';
  if(rows.length){const i=S.v7.r,m=WEAK[i],g=SG[m.st],sk=statK(m.k,ALL);
    det=`<div class="detail"><div class="dhead"><h3>${ASK[m.k]}</h3><span class="pill ${SC[g][3]}">${m.st}</span><span class="hint">${whereTxt(m.k)}</span>${g==='p'?(isLogged('v7:'+m.k)?'<span class="pill good">Reteach planned</span>':`<button class="btn small primary" type="button" data-act="v7plan" data-r="${i}">Plan a reteach</button>`):''}<button class="lnk" type="button" data-act="gosub" data-j="${jOf(m.k)}">Where they stall →</button></div>
    <div class="evs"><div class="ev"><span>The class now</span>${hbar(eo(sk),2)}<span class="hint">${sk.c.E.length} not yet · ${sk.c.H.length} developing · ${sk.c.F.length} secure</span></div></div>
    <div class="dgrid">${m.now.length?whoCol('Not yet','var(--hd-ny)',m.now):'<p class="none">Nobody is weak in it now.</p>'}${m.peak.length?whoCol(`Weak in week ${m.pw}, not now`,'var(--neutral)',m.peak):''}</div></div>`}
  const more=every.length>few.length?`<div class="controls" style="margin:8px 0 0"><button class="btn small" type="button" data-act="v7more" aria-expanded="${S.v7.more}">${S.v7.more?'Show the top few':`Show all ${every.length}`}</button></div>`:'';
  return ctl+leg+duo(da,fig(s)+more,det,'stick')}

/* ---------- view 8 (Q7): stall points, rolled up from content to subunits and units ----------
   Same outline as Q5: units open into subunits, subunits into their content in the order students meet it.
   Each bar splits the students who use the textbook: gave up, skipped, needed retries, and the rest got it first time.
   A unit or subunit pools all of its content. */
const pathMark=(cx,y,o)=>o===0?`<circle cx="${f1(cx)}" cy="${y}" r="6" style="fill:var(--accent)"/>`:o===1?`<circle cx="${f1(cx)}" cy="${y}" r="5.2" style="fill:var(--surface);stroke:var(--accent);stroke-width:2"/><path d="M${f1(cx)} ${y-5.2} A5.2 5.2 0 0 0 ${f1(cx)} ${y+5.2} Z" style="fill:var(--accent)"/>`:o===2?`<path d="M${f1(cx-5)} ${y-5} L${f1(cx+5)} ${y+5} M${f1(cx+5)} ${y-5} L${f1(cx-5)} ${y+5}" style="stroke:var(--accent);stroke-width:2.4;stroke-linecap:round"/>`:`<circle cx="${f1(cx)}" cy="${y}" r="5.2" style="fill:none;stroke:var(--accent);stroke-width:1.6;stroke-dasharray:2.5 2"/>`;
const pm7=o=>`<svg class="pm" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">${pathMark(7,7,o)}</svg>`;
const OUT7=['First time','Needed retries','Gave up','Skipped'];
const pool7=cs=>{const t=[0,0,0,0];let n=0;cs.forEach(x=>{x.t.forEach((v,q)=>t[q]+=v);n+=x.n});return {t,n}};
function tree7(tb){
  return TB[tb].units.map((U,u)=>{const subs=uJs(tb,u).map(j=>{const J=TBJ(tb,j),on=J.on,ct=ctOf(tb,j);
      const cs=on?cCnt(tb,j).map((c,s)=>({s,j,nm:ct[s][0],kind:ct[s][1],t:c,n:c[0]+c[1]+c[2]+c[3]})):[];
      return Object.assign({j,J,on,cs},pool7(cs))});
    return Object.assign({u,U,on:tU(tb,u),subs},pool7(subs.flatMap(x=>x.cs)))})}
/* where the most students gave up, and where the most skipped */
function worst7(T){let g=null,k=null;T.forEach(U=>U.subs.forEach(J=>J.cs.forEach(C=>{if(!g||C.t[2]>g.t[2])g=Object.assign({u:U.u},C);if(!k||C.t[3]>k.t[3])k=Object.assign({u:U.u},C)})));return {g,k}}
function h8(){const tb=S.v8.tb,Tb=TB[tb],{g,k}=worst7(tree7(tb)),n=tbWho(tb).length,of=v=>n<NM.length?`${v} of ${n}`:v,JN=j=>TBJ(tb,j).n;
  if(!g)return `Nothing in ${Tb.n} has started yet.`;
  if(g.t[2]<2&&k.t[3]<3)return `Nobody is stalling in ${Tb.n} so far.`;
  const JS=j=>TBJ(tb,j).s;if(g.j===k.j)return `${JS(g.j)}: ${g.t[2]} gave up at ${g.nm}, ${k.t[3]} skipped ${k.nm}.`;
  return `${g.t[2]} gave up at ${g.nm} (${JS(g.j)}); ${k.t[3]} skipped ${k.nm} (${JS(k.j)}).`}
/* which rows are open: none to begin with. The headline and the panel beside the list already name the worst stall point */
function ex7(tb,T){if(!S.v8.ex[tb])S.v8.ex[tb]={U:[],J:[]};return S.v8.ex[tb]}
function sel7(tb,T){const all=T.flatMap(U=>U.subs.flatMap(J=>J.cs));let s=S.v8.sel[tb];if(!s||!all.some(C=>C.j===s.j&&C.s===s.s)){const {g}=worst7(T);s=S.v8.sel[tb]=g?{j:g.j,s:g.s}:{j:all[0].j,s:0}}return s}
function open7(tb,j,s){const E=ex7(tb,tree7(tb)),u=uOfJ(j);if(!E.U.includes(u))E.U.push(u);if(!E.J.includes(j))E.J.push(j);S.v8.sel[tb]={j,s};S.v8.tb=tb}
const lvAll7=tb=>{const us=TB[tb].units.map((_,u)=>u).filter(u=>tU(tb,u)),js=us.flatMap(u=>uJs(tb,u)).filter(j=>TBJ(tb,j).on&&ctOf(tb,j).length);return {us,js}};
const level7=tb=>{const E=S.v8.ex[tb],{us,js}=lvAll7(tb);if(!E.U.length)return 'u';if(us.every(x=>E.U.includes(x))){if(!js.some(x=>E.J.includes(x)))return 'j';if(js.every(x=>E.J.includes(x)))return 'c'}return ''};
const sKey7=(tb,j,s)=>tb===0?`v8:${j}:${s}`:`v8:${tb}:${j}:${s}`;
const OUTLEG7=`<span class="lt">Students</span><span><i class="sw" style="background:var(--st-gu)"></i>Gave up</span><span><i class="sw" style="background:var(--st-sk)"></i>Skipped</span><span><i class="sw" style="background:var(--st-rt)"></i>Needed retries</span><span><i class="sw" style="background:var(--ok-fill)"></i>First time</span>`;
function v8(){const tb=S.v8.tb,T=tree7(tb),ids=tbWho(tb),Tb=TB[tb],E=ex7(tb,T),sl=sel7(tb,T),srt=S.v8.sort,su=S.stu,fol=su!==null&&ids.includes(su);
  const key=o=>!o.n?-1:srt==='gu'?o.t[2]/o.n:srt==='sk'?o.t[3]/o.n:0;
  const ord=a=>srt==='course'?a:a.slice().sort((x,y)=>key(y)-key(x));
  const pc=(o,q,cls)=>`<span class="hp ${cls}">${o.n?Math.round(o.t[q]/o.n*100)+'%':''}</span>`;
  const nums=(o,lv)=>pc(o,2,'g'+(lv===2&&o.t[2]/o.n>=.18?' hot':''))+pc(o,3,'k'+(lv===2&&o.t[3]/o.n>=.29?' warm':''));
  const bar=(o,lv)=>{const w=v=>f1(v/o.n*100);return `<span class="hb b${lv}" aria-hidden="true"><i style="width:${w(o.t[2])}%;background:var(--st-gu)"></i><i style="width:${w(o.t[3])}%;background:var(--st-sk)"></i><i style="width:${w(o.t[1])}%;background:var(--st-rt)"></i><i style="width:${w(o.t[0])}%;background:var(--ok-fill)"></i></span>`};
  /* the followed student: their outcome on each piece of content, and on a unit or subunit how many they gave up on or skipped */
  const oc=(j,s)=>cOut(tb,j)[s][su];
  const smC=C=>{const o=oc(C.j,C.s);return o<0?'':`${pm7(o)}<span class="sr">${NM[su]}: ${OUT7[o].toLowerCase()}</span>`};
  const smR=cs=>{let g=0,k=0;cs.forEach(C=>{const o=oc(C.j,C.s);if(o===2)g++;else if(o===3)k++});return (g?`<span class="pmn">${pm7(2)}${g}</span>`:'')+(k?`<span class="pmn">${pm7(3)}${k}</span>`:'')+(g||k?`<span class="sr">${NM[su]}: ${[g?'gave up on '+g:'',k?'skipped '+k:''].filter(Boolean).join(', ')}</span>`:'')};
  const sc=f=>fol?`<span class="hs">${f()}</span>`:'';
  const tipR=(name,cs)=>{const gs=new Set(),ks=new Set();cs.forEach(C=>{const O=cOut(tb,C.j)[C.s];ids.forEach(i=>{if(O[i]===2)gs.add(i);else if(O[i]===3)ks.add(i)})});
    return `<b>${name}</b><br>${gs.size} ${pl(gs.size,'student')} gave up on something here · ${ks.size} skipped something<br><span>The bar pools all ${cs.length} pieces of content</span>`};
  const off=(lv,name,txt)=>`<div class="hr l${lv} off"><span class="hn"><span class="chs"></span>${name}</span><span class="hx">${txt}</span><span class="hp g"></span><span class="hp k"></span>${fol?'<span class="hs"></span>':''}</div>`;
  const cRow=C=>{const on=sl.j===C.j&&sl.s===C.s,t=C.t;
    return `<li><button type="button" class="hr l2${on?' on':''}" data-act="v8c" data-j="${C.j}" data-s="${C.s}" aria-pressed="${on}"${tp(`<b>${C.nm}</b><br>${C.kind==='r'?`${t[0]} tried it · ${t[3]} skipped · nothing marks it right`:`${t[0]} first time · ${t[1]} after retries<br>${t[2]} gave up · ${t[3]} skipped`}`)}><span class="hn"><span class="chs"></span><span>${C.nm}</span></span>${bar(C,2)}${nums(C,2)}${sc(()=>smC(C))}</button></li>`};
  const jRow=J=>{if(!J.on||!J.cs.length)return `<li>${off(1,J.J.n,J.on?'No content yet':'Not started')}</li>`;const o=E.J.includes(J.j);
    return `<li><button type="button" class="hr l1" data-act="v8sub" data-j="${J.j}" aria-expanded="${o}"${tp(tipR(J.J.n,J.cs))}><span class="hn">${CHEV}<span>${J.J.n}</span></span>${bar(J,1)}${nums(J,1)}${sc(()=>smR(J.cs))}</button>${o?`<ul>${ord(J.cs).map(cRow).join('')}</ul>`:''}</li>`};
  const uRow=U=>{if(!U.on)return `<li class="hu">${off(0,`<b>${U.U.n}</b>`,'Not started')}</li>`;const o=E.U.includes(U.u),cs=U.subs.flatMap(J=>J.cs);
    return `<li class="hu"><button type="button" class="hr l0" data-act="v8unit" data-u="${U.u}" aria-expanded="${o}"${tp(tipR(U.U.n,cs))}><span class="hn">${CHEV}<b>${U.U.n}</b></span>${bar(U,0)}${nums(U,0)}${sc(()=>smR(cs))}</button>${o?`<ul>${ord(U.subs.filter(J=>J.on)).map(jRow).join('')}${nsRow(U.subs.filter(J=>!J.on).map(J=>`<i${tp(J.J.n)}>${J.J.s}</i>`))}</ul>`:''}</li>`};
  const note=[ids.length<NM.length?`${ids.length} of ${NM.length} students use ${Tb.n}.`:'',su!==null&&!fol?`${NM[su]} doesn’t use it.`:''].filter(Boolean).join(' ');
  const ctl=`<div class="controls"><span class="sel">Show ${seg('v8lvl',level7(tb),[['u','Units'],['j','Subunits'],['c','Content']],'Show rows down to')}</span><label class="sel" for="v8sort">Sort <select id="v8sort">${[['course','Course order'],['gu','Most gave up first'],['sk','Most skipped first']].map(([v,l])=>`<option value="${v}"${srt===v?' selected':''}>${l}</option>`).join('')}</select></label></div>`;
  const leg=`<div class="legend mleg">${OUTLEG7}${fol?`<span class="lt">${NM[su]}</span>${[2,3,1,0].map(o=>`<span>${pm7(o)}${OUT7[o]}</span>`).join('')}`:''}</div>`;
  const list=`<ul class="hc v7${fol?' fol':''}" aria-label="${Tb.n}: where students gave up, skipped or needed retries, by unit, subunit and content"><li class="hh" aria-hidden="true"><div class="hr"><span class="hn"></span><span class="hx"></span><span class="hp g">Gave up</span><span class="hp k">Skipped</span>${fol?`<span class="hs">${NM[su]}</span>`:''}</div></li>${ord(T.filter(U=>U.on)).map(uRow).join('')}${nsRow(T.filter(U=>!U.on).map(U=>`<i>${U.U.n}</i>`))}</ul>`;
  /* detail: the selected piece of content */
  const U0=T.find(U=>U.subs.some(J=>J.j===sl.j)),J0=U0.subs.find(J=>J.j===sl.j),C0=J0.cs[sl.s],c=C0.t,n=C0.n,O=cOut(tb,sl.j)[sl.s];
  const by=[0,1,2,3].map(q=>ids.filter(i=>O[i]===q).map(i=>NM[i])),stall=c[2]/n>=.18,skp=c[3]/n>=.29,act=skp||c[2]/n>=.1;
  const nt=((tb===0?STALL[sl.j]:XSTALL[tb+':'+sl.j])||{})[sl.s],pk=sKey7(tb,sl.j,sl.s);
  const chg=skp?'Make it a required check':'Add a worked example first';
  const det=`<div class="detail"><div class="dhead"><h3>${C0.nm}</h3><span class="hint">${J0.J.s}</span>${stall?'<span class="pill bad">Stall point</span>':skp?'<span class="pill watch">Often skipped</span>':''}${act?(isLogged(pk)?'<span class="pill good">Planned</span>':`<button class="btn small primary" type="button" data-act="v8plan">${chg}</button>`):''}</div>
  ${nt?`<p class="dtext">${nt}</p>`:''}<div class="dgrid">${by[2].length?whoCol('Gave up','var(--st-gu)',by[2]):''}${by[3].length?whoCol('Skipped','var(--st-sk)',by[3]):''}${C0.kind==='q'&&by[1].length?whoCol('Needed retries','var(--st-rt)',by[1]):''}${!by[2].length&&!by[3].length?'<p class="none">Nobody gave up on or skipped this.</p>':''}</div></div>`;
  return tbTabs('v8tb',tb)+(note?`<p class="hint" style="margin:0 0 10px">${note}</p>`:'')+ctl+leg+duo(duoW(.6,560),list,det,'stick')}

/* ---------- view 10: fade slopes ---------- */
const fadeKind=d=>d<=-8?'fade':d>=5?'up':'flat';
const dTxt=d=>`${d<=-.5?'−':d>=.5?'+':''}${Math.abs(Math.round(d))}`;
const PREK=new Set(PRE.map(q=>q.k));
function h10(){if(!FD.length)return 'No skill has been checked again three or more weeks after it was taught.';const f=FD.filter(o=>fadeKind(o.d)==='fade').sort((a,b)=>a.d-b.d);if(!f.length)return `None of the ${FD.length} skills checked again later has faded.`;
  const need=f.filter(o=>PREK.has(o.k)),top=f[0];
  return `${f.length} of ${FD.length} rechecked skills faded, most of all ${SK[top.k]}.`}
/* one row per skill: open dot = class average when taught, solid dot = four weeks later; biggest drop first */
function v10(){const Z=S.v10,sel=S.stu;
  /* the view opens on the skills that faded, which is the answer to its question; a tick brings in every skill that was checked again */
  const inU=FD.filter(o=>Z.u==='all'||uOf(o.k)===+Z.u);
  let rows=inU.filter(o=>Z.all||fadeKind(o.d)==='fade');
  rows=Z.sort==='order'?rows.slice().sort((a,b)=>a.k-b.k):rows.slice().sort((a,b)=>a.d-b.d||a.k-b.k);
  /* nothing is picked to begin with: the chart of every student appears beside the rows when a skill is clicked, and goes when it is clicked again */
  if(!rows.some(o=>o.k===Z.k))Z.k=-1;const pk=Z.k>=0?FD.find(q=>q.k===Z.k):null;
  const ctl=`<div class="controls">${seg('v10u',Z.u,[['all','All units']].concat([...new Set(FD.map(o=>uOf(o.k)))].map(u=>[String(u),UN[u][0]])),'Unit')}<label class="sel" for="v10sort">Sort <select id="v10sort"><option value="drop"${Z.sort!=='order'?' selected':''}>Biggest drop first</option><option value="order"${Z.sort==='order'?' selected':''}>Course order</option></select></label><label class="chk" for="v10all"><input type="checkbox" id="v10all"${Z.all?' checked':''}> Show all ${inU.length}</label></div>`;
  const dot=(f,st)=>`<svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" style="fill:${f};${st||''}"/></svg>`;
  const leg=`<div class="legend"><span>${dot('var(--surface)','stroke:var(--ink-3);stroke-width:1.6')}When taught</span><span>${dot('var(--bad)')}Later: down 8+</span>${Z.all?`<span>${dot('var(--neutral)')}Steady</span><span>${dot('var(--good)')}Grew</span>`:''}${sel!==null?`<span><svg width="22" height="10" aria-hidden="true"><line x1="3" y1="5" x2="19" y2="5" style="stroke:var(--accent);stroke-width:1.6"/><circle cx="19" cy="5" r="3" style="fill:var(--accent)"/></svg>${NM[sel]}</span>`:''}</div>`;
  const sv=sel!==null?rows.flatMap(o=>ML[sel][o.k]===null?[]:[MT[sel][o.k]*100,ML[sel][o.k]*100]):[],lo=Math.max(0,Math.min(40,Math.floor((sv.length?Math.min(...sv):40)/10)*10));
  /* alone, the rows are a chart of modest width in the middle of the page; with a skill picked they share a wider stage with its chart */
  const da=pk?duoW(.6,620,Math.min(VW(),1360)):0,SWD=Math.min(VW(),da?1360:920),W=da||SWD,wide=W>=700;
  if(!rows.length)return stage(SWD,ctl+`<p class="none">${Z.all?'No skill here has been checked again three or more weeks after it was taught.':`No skill here has faded.${inU.length?` Tick “Show all” for the ${inU.length} that were checked again.`:''}`}</p>`);
  /* a narrow chart leaves out the last column: the panel beside it says which unit builds on the skill */
  const LX=198,X0=214,X1=W-(wide?238:156),hi=100,x=v=>X0+(clamp(v,lo,hi)-lo)/(hi-lo)*(X1-X0),T0=30,rh=(sel!==null?28:24)+(rows.length<=12?6:0),H=T0+rows.length*rh+8;
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="Each skill's class average when taught and ${LATER}, ${Z.sort==='order'?'in course order':'biggest drop first'}">`;
  for(let v=lo;v<=100;v+=lo<30?20:10){s+=`<line x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${T0-4}" y2="${H-6}" class="grid"/>`+T(x(v),T0-10,v,{a:'middle',c:'t3'})}
  s+=T(X1+24,T0-10,'Change',{c:'t3',w:700})+T(X1+76,T0-10,'Slipped 20+',{c:'t3',w:700})+(wide?T(X1+156,T0-10,'Built on now',{c:'t3',w:700}):'');
  rows.forEach((o,ri)=>{const y=T0+ri*rh+rh/2-(sel!==null?3:0),kd=fadeKind(o.d),col=kd==='fade'?'var(--bad)':kd==='up'?'var(--good)':'var(--neutral)',on=o.k===Z.k,need=PREK.has(o.k);
    s+=`<g class="row${on?' on':''}" data-act="v10line" data-k="${o.k}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${SK[o.k]}: ${Math.round(o.a)} when taught, ${Math.round(o.b)} ${LATER}, ${o.sl.length} slipped"${tp(`<b>${dTxt(o.d)} points</b> · ${SK[o.k]}<br>${Math.round(o.a)}% when taught (week ${KT[o.k]}) → ${Math.round(o.b)}% ${LATER}<br><span>${o.sl.length} slipped 20+ points${need?` · needed for ${NXT}`:''}</span>`)}><rect class="rbg" x="2" y="${f1(T0+ri*rh+1)}" width="${W-4}" height="${rh-2}" rx="5"/>`;
    if(kd==='fade')s+=`<rect x="2" y="${f1(T0+ri*rh+3)}" width="4" height="${rh-6}" rx="2" style="fill:var(--bad)"/>`;
    s+=T(LX,y+4,ASKM[o.k],{a:'end',c:on||kd==='fade'?'t1':'t2',w:on||kd==='fade'?700:null});
    s+=`<line x1="${f1(x(o.a))}" x2="${f1(x(o.b))}" y1="${f1(y)}" y2="${f1(y)}" style="stroke:${col};stroke-width:4;stroke-linecap:round;opacity:.5"/><circle cx="${f1(x(o.a))}" cy="${f1(y)}" r="4.5" style="fill:var(--surface);stroke:var(--ink-3);stroke-width:1.8"/><circle cx="${f1(x(o.b))}" cy="${f1(y)}" r="5" style="fill:${col};stroke:var(--surface);stroke-width:2"/>`;
    if(sel!==null&&ML[sel][o.k]!==null){const a=MT[sel][o.k]*100,b=ML[sel][o.k]*100,sy=y+9;s+=`<line x1="${f1(x(a))}" x2="${f1(x(b))}" y1="${f1(sy)}" y2="${f1(sy)}" style="stroke:var(--accent);stroke-width:1.6"/><circle cx="${f1(x(a))}" cy="${f1(sy)}" r="2.6" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.4"/><circle cx="${f1(x(b))}" cy="${f1(sy)}" r="3" style="fill:var(--accent)"/>`}
    s+=T(X1+24,y+4,dTxt(o.d),{c:kd==='fade'?'tbad':kd==='up'?'tgood':'t3',w:kd==='fade'?700:null});
    s+=T(X1+76,y+4,o.sl.length||'–',{c:o.sl.length?'t1':'t3'});
    if(need&&wide)s+=T(X1+156,y+4,TB0[CU].s,{c:kd==='fade'?'tbad':'t2',w:kd==='fade'?700:null});
    s+='</g>'});
  s+='</svg>';
  return stage(SWD,ctl+leg+duo(da,fig(s),pk?v10det(pk,da?Math.min(520,duoB(da,SWD)):0):'','stick'))}
/* the picked skill: every student, score when taught (across) against four weeks later (up) */
function v10det(o,w){const k=o.k,kd=fadeKind(o.d),sel=S.stu,W=w||520,L=50,R=22,T0=12,B=262,H=B+40,lo=0,hi=100,x=v=>L+(clamp(v,lo,hi)-lo)/(hi-lo)*(W-L-R),y=v=>B-(clamp(v,lo,hi)-lo)/(hi-lo)*(B-T0);
  const P=ALL.filter(i=>ML[i][k]!==null).map(i=>({i,a:MT[i][k]*100,b:ML[i][k]*100})).map(p=>Object.assign(p,{X:x(p.a),Y:y(p.b),sl:p.a-p.b>=20}));
  let s=`<svg class="viz small" viewBox="0 0 ${W} ${H}" role="group" aria-label="${SK[k]}: each student's score when taught against ${LATER}">`;
  s+=`<path d="M${f1(x(lo+20))} ${f1(y(lo))} L${f1(x(hi))} ${f1(y(hi-20))} L${f1(x(hi))} ${f1(y(lo))} Z" style="fill:var(--bad);opacity:.08"/>`;
  [0,20,40,60,80,100].forEach(v=>{s+=`<line x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${T0}" y2="${B}" class="grid"/><line x1="${L}" x2="${W-R}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="grid"/>`+T(x(v),B+16,v+'%',{a:'middle',c:'t3'})+T(L-7,y(v)+4,v,{a:'end',c:'t3'})});
  s+=`<line x1="${f1(x(lo))}" y1="${f1(y(lo))}" x2="${f1(x(hi))}" y2="${f1(y(hi))}" class="axis"/><line x1="${f1(x(lo+20))}" y1="${f1(y(lo))}" x2="${f1(x(hi))}" y2="${f1(y(hi-20))}" style="stroke:var(--bad);stroke-width:1;opacity:.6"/>`;
  s+=T(x(hi)-6,y(hi)+16,'No change',{a:'end',c:'t3',w:700})+T(x(hi)-6,B-8,'Slipped 20+ points',{a:'end',c:'tbad',w:700});
  s+=T((L+W-R)/2,B+34,'When taught',{a:'middle'})+`<text x="14" y="${f1((T0+B)/2)}" text-anchor="middle" transform="rotate(-90 14 ${f1((T0+B)/2)})" class="t2">On the later check</text>`;
  const boxes=P.map(p=>({x:p.X-5,y:p.Y-5,w:10,h:10})).concat([{x:x(hi)-80,y:y(hi)+5,w:76,h:14},{x:x(hi)-122,y:B-19,w:118,h:14}]),hit=b=>boxes.some(q=>b.x<q.x+q.w&&b.x+b.w>q.x&&b.y<q.y+q.h&&b.y+b.h>q.y),lab=[];
  P.filter(p=>p.sl||p.i===sel).sort((a,b)=>(b.i===sel)-(a.i===sel)||(b.a-b.b)-(a.a-a.b)).forEach(p=>{const nm=NM[p.i],w=nm.length*6.6+4;
    for(const [bx,by,a] of [[p.X+8,p.Y-6,'start'],[p.X-8-w,p.Y-6,'end'],[p.X-w/2,p.Y-20,'middle'],[p.X-w/2,p.Y+8,'middle'],[p.X+7,p.Y+5,'start'],[p.X-7-w,p.Y+5,'end']]){const b={x:bx,y:by,w,h:12};if(bx<L||bx+w>W-R||by<T0||by+12>B)continue;if(!hit(b)){boxes.push(b);lab.push({p,b,a});break}}});
  P.forEach(p=>{const on=p.i===sel,col=p.sl?'var(--bad)':'var(--ink-3)';s+=`<g class="hit" data-act="stu" data-i="${p.i}"${tp(`<b>${NM[p.i]}</b><br>${Math.round(p.a)}% when taught → ${Math.round(p.b)}% ${LATER}`)}><circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="12" fill="transparent"/>${on?`<circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="8.5" style="fill:none;stroke:var(--accent);stroke-width:2"/>`:''}<circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="${p.sl?5:4}" style="fill:${col};stroke:var(--surface);stroke-width:2;opacity:${p.sl||on?1:.75}"/></g>`});
  lab.forEach(o=>{const tx=o.a==='start'?o.b.x:o.a==='end'?o.b.x+o.b.w:o.b.x+o.b.w/2;s+=T(tx,o.b.y+10,NM[o.p.i],{a:o.a,c:o.p.i===sel?'tacc':'t1',w:o.p.i===sel?700:null})});
  s+='</svg>';
  const need=PREK.has(k),act=kd==='fade'?(isLogged('v10:'+k)?'<span class="pill good">Review scheduled</span>':`<button class="btn small primary" type="button" data-act="v10plan" data-k="${k}">Schedule a review</button>`):'';
  const side=`<div class="fside"><div class="dhead"><h3>${SK[k]}</h3><span class="pill ${kd==='fade'?'bad':kd==='up'?'good':''}">${Math.round(o.a)}% → ${Math.round(o.b)}%</span><button class="x shut" type="button" data-act="v10close" aria-label="Close ${SK[k]}">${IC.x}</button></div>
    <p class="hint">${SUBS[jOf(k)].s} · week ${KT[k]} · ${o.n} students rechecked${need?` · ${TB0[CU].s} builds on it`:''}</p>
    ${o.sl.length?whoCol('Slipped 20+ points','var(--bad)',o.sl):'<p class="none">Nobody slipped 20 points or more.</p>'}<div class="tc-act">${act}</div></div>`;
  /* beside the rows the panel is one column: the skill and its action, the chart, then who slipped. Under them it is the chart with the rest to its right */
  const shut=`<button class="x shut" type="button" data-act="v10close" aria-label="Close ${SK[k]}">${IC.x}</button>`;
  if(w)return `<div class="detail"><div class="dhead"><h3>${SK[k]}</h3><span class="pill ${kd==='fade'?'bad':kd==='up'?'good':''}">${Math.round(o.a)}% → ${Math.round(o.b)}%</span>${act}${shut}</div>
    <p class="hint">${SUBS[jOf(k)].s} · week ${KT[k]} · ${o.n} students rechecked${need?` · ${TB0[CU].s} builds on it`:''}</p>${fig(s)}${o.sl.length?whoCol('Slipped 20+ points','var(--bad)',o.sl):'<p class="none">Nobody slipped 20 points or more.</p>'}</div>`;
  return `<div class="detail"><div class="fdet">${fig(s)}${side}</div></div>`}

/* ---------- view 11 (Q10): readiness tree, for any unit of any textbook ----------
   The unit sits at the top, the skills it builds on below it, and the skills those build on at the bottom.
   Rings are the share of the textbook's students who are secure now. A skill no item checks has no evidence. */
const ringCol=(p,th)=>p>=80?'good':p>=th?'watch':'bad';
/* by default the next unit, or the current one when a textbook has nothing after it */
const rdDef=tb=>CU;
const rdState=U=>!U.on?'later':U===TB0[CU]?'now':'past';
function rdSel(){const tb=S.v11.tb;let u=S.v11.u[tb];if(u===undefined)u=S.v11.u[tb]=rdDef(tb);const U=TB[tb].units[u],key=tb+':'+u;return {tb,u,U,key,pre:READY[key]||[],ids:tbWho(tb),st:rdState(U)}}
const secOf=(i,k)=>{const m=mast(i,k);return !!m&&m.cat==='F'};
const rdF=(k,ids)=>ids.filter(i=>secOf(i,k)).map(i=>NM[i]);
/* a skill that isn't taught yet, or that no item checks, has no share */
const rdTaught=k=>taught(k);
const rdWhy=k=>!rdTaught(k)?'Not taught yet':!chk5(k)?'Taught, but no question or activity checks it':'';
const rdP=(k,ids)=>rdWhy(k)?null:pc(rdF(k,ids).length,ids.length);
function planNow(){const th=S.v11.th,R=rdSel(),rm=S.v11.rm[R.key]||{},names=R.ids.map(i=>NM[i]);
  const r=R.pre.map(q=>({k:q.k,c:q.c,p:rdP(q.k,R.ids)})).filter(o=>o.p!==null),amb=r.filter(o=>o.p>=th&&o.p<80);
  const gaps=n=>amb.filter(o=>!secOf(ID[n],o.k)).length;
  return {R,red:r.filter(o=>o.p<th).sort((a,b)=>a.p-b.p),amb,gaps,grp:names.filter(n=>gaps(n)>0&&!(rm.grp||[]).includes(n)).sort((a,b)=>gaps(b)-gaps(a)||ID[a]-ID[b]),
    ext:r.length?names.filter(n=>r.every(o=>secOf(ID[n],o.k))&&!(rm.ext||[]).includes(n)):[]}}
function h11(){const P=planNow(),R=P.R,nm=R.U.n;
  if(!R.pre.length)return `${nm} doesn’t build on skills from an earlier unit, as far as the textbook’s coverage shows.`;
  if(R.st==='next'||R.st==='later'){if(P.red.length)return `Not ready for ${nm}. Reteach ${ASK[P.red[0].k]} first.`;return P.amb.length?`Nearly ready for ${nm}. Run small groups first.`:`Ready for ${nm}.`}
  if(P.red.length)return `${nm}: reteach ${ASK[P.red[0].k]} first.`;
  return P.amb.length?`Most of what ${nm} builds on is secure. Run small groups first.`:`Everything ${nm} builds on is secure.`}
function ring(x,y,r,sw,p,col,on,th){const C=2*Math.PI*r,a=th/100*2*Math.PI-Math.PI/2,c=Math.cos(a),s=Math.sin(a);
  return `${on?`<circle cx="${x}" cy="${y}" r="${r+sw/2+7}" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.5"/>`:''}<circle cx="${x}" cy="${y}" r="${r}" style="fill:none;stroke:var(--surface-2);stroke-width:${sw}"/><circle cx="${x}" cy="${y}" r="${r}" transform="rotate(-90 ${x} ${y})" style="fill:none;stroke:var(--${col});stroke-width:${sw};stroke-dasharray:${f1(C*p/100)} ${f1(C)}"/><line x1="${f1(x+c*(r-sw/2-3))}" y1="${f1(y+s*(r-sw/2-3))}" x2="${f1(x+c*(r+sw/2+3))}" y2="${f1(y+s*(r+sw/2+3))}" style="stroke:var(--ink);stroke-width:2"/>`}
/* a skill nothing checks: a dashed gray ring with no share */
const noRing=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" style="fill:none;stroke:var(--neutral);stroke-width:2;stroke-dasharray:3 4"/>`;
const NOEV=`<span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" style="fill:none;stroke:var(--neutral);stroke-width:1.6;stroke-dasharray:2 2"/></svg>No item checks it</span>`;
function v11(){const th=S.v11.th,R=rdSel(),Tb=TB[R.tb];
  const us=Tb.units.map((U,u)=>{const st=rdState(U);return [String(u),U.s+(st==='now'?' · latest':'')]});
  const out=S.stu!==null&&!R.ids.includes(S.stu),ks=R.pre.flatMap(q=>q.c!==null?[q.k,q.c]:[q.k]),noev=ks.some(k=>rdTaught(k)&&!chk5(k)),nyet=ks.some(k=>!rdTaught(k));
  const note=[R.ids.length<NM.length?`${R.ids.length} of ${NM.length} students use ${Tb.n}.`:'',out?`${NM[S.stu]} doesn’t use it.`:''].filter(Boolean).join(' ');
  return `${tbTabs('v11tb',R.tb)}${note?`<p class="hint" style="margin:0 0 10px">${note}</p>`:''}<div class="controls"><span class="sel">Unit ${seg('v11u',R.u,us,'Unit')}</span>${R.pre.length?`<label class="rng" for="v11th">Readiness line <output id="v11o">${th}% secure</output><input type="range" id="v11th" min="40" max="80" step="5" value="${th}"></label>`:''}</div>
  ${R.pre.length?`<div class="legend"><span><i class="sw" style="background:var(--bad)"></i>Below your line</span><span><i class="sw" style="background:var(--watch)"></i>Under 80%</span><span><i class="sw" style="background:var(--good)"></i>Ready</span><span><svg width="12" height="12" aria-hidden="true"><line x1="6" y1="0" x2="6" y2="12" style="stroke:var(--ink);stroke-width:2"/></svg>Your line</span>${noev?NOEV:''}${nyet?NOEV.replace('No item checks it','Not taught yet'):''}</div>`:''}<div id="v11c"></div>`}
function v11draw(){const c=$('#v11c');if(!c)return;const th=S.v11.th,P=planNow(),R=P.R,ids=R.ids,n=ids.length,sel=S.stu!==null&&ids.includes(S.stu)?S.stu:null,an=$('#ans');
  if(!R.pre.length){c.innerHTML='<p class="none">Pick another unit to see what it builds on.</p>';if(an)an.textContent=h11();return}
  /* the rings stay close under the unit rather than spreading over the row; a long skill name takes two lines */
  const N=R.pre.length,da=duoW(.58,Math.max(560,N*150+20)),W=da||VW(),H=R.pre.some(q=>q.c!==null)?376:262,rx=W/2,ry=40,gap=clamp((W-100)/Math.max(1,N),150,240),xs=R.pre.map((_,ix)=>rx+(ix-(N-1)/2)*gap),cy=166,gy=316,nch=Math.floor((gap-14)/7);
  const two=t=>{if(t.length<=nch)return [t];const at=t.lastIndexOf(' ',nch);return at<1?[cut(t,nch)]:[t.slice(0,at),cut(t.slice(at+1),nch)]};
  const sub=R.st==='later'?'Not started':R.st==='now'?`Latest work · ${wkTxt(R.U)}`:`Worked on in ${wkTxt(R.U)}`;
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="Readiness tree for ${R.U.n}: the skills it needs, each a ring showing the share of students secure">`;
  xs.forEach((x,ix)=>{s+=`<path d="M${rx} ${ry+24} C${rx} ${ry+74} ${x} ${cy-96} ${x} ${cy-50}" fill="none" style="stroke:var(--rule);stroke-width:2"/>`;if(R.pre[ix].c!==null)s+=`<line x1="${x}" y1="${cy+86}" x2="${x}" y2="${gy-32}" style="stroke:var(--rule);stroke-width:2"/>`});
  s+=`<rect x="${rx-110}" y="${ry-22}" width="220" height="46" rx="10" style="fill:var(--surface-2);stroke:var(--ink-3)"/>`+T(rx,ry-2,R.U.n,{a:'middle',c:'t1',w:700,s:14})+T(rx,ry+15,sub,{a:'middle',c:'t3'});
  const mark=(x,y,i,k)=>{const f=secOf(i,k);return `<circle cx="${x}" cy="${y}" r="7" style="fill:${f?'var(--accent)':'var(--surface)'};stroke:var(--accent);stroke-width:2"/>`};
  R.pre.forEach((q,ix)=>{const x=xs[ix],p=rdP(q.k,ids),on=false;
    s+=`<g tabindex="0" aria-label="${ASK[q.k]}: ${p===null?rdWhy(q.k).toLowerCase():p+'% secure'}"${tp(`<b>${ASK[q.k]}</b><br>${p===null?rdWhy(q.k):`${rdF(q.k,ids).length} of ${n} secure`}<br><span>Needed for ${q.f}</span>`)}><rect x="${x-88}" y="${cy-52}" width="176" height="132" fill="transparent"/>${p===null?noRing(x,cy,36)+T(x,cy+6,rdTaught(q.k)?'?':'–',{a:'middle',c:'t3',w:700,s:15}):ring(x,cy,36,11,p,ringCol(p,th),on,th)+T(x,cy+6,p+'%',{a:'middle',c:'t1',w:700,s:15})}${two(D.skills[q.k]).map((t,li)=>T(x,cy+60+li*16,esc(t),{a:'middle',c:on?'tacc':'t1',w:700})).join('')}${sel!==null&&p!==null?mark(x+38,cy-38,sel,q.k):''}</g>`;
    if(q.c!==null){const k2=q.c,p2=rdP(k2,ids),on2=false;
      s+=`<g tabindex="0" aria-label="${ASK[k2]}: ${p2===null?rdWhy(k2).toLowerCase():p2+'% secure'}"${tp(`<b>${ASK[k2]}</b><br>${p2===null?rdWhy(k2):`${rdF(k2,ids).length} of ${n} secure`}<br><span>Builds toward ${ASK[q.k]}</span>`)}><rect x="${x-80}" y="${gy-30}" width="160" height="62" fill="transparent"/>${p2===null?noRing(x,gy,22)+T(x,gy+4,rdTaught(k2)?'?':'–',{a:'middle',c:'t3',w:700}):ring(x,gy,22,7,p2,ringCol(p2,th),on2,th)+T(x,gy+4,p2+'%',{a:'middle',c:'t1',w:700})}${T(x,gy+44,ASK[k2],{a:'middle',c:on2?'tacc':p2===null?'t3':'t2',w:700})}${sel!==null&&p2!==null?mark(x+26,gy-24,sel,k2):''}</g>`}});
  if(sel!==null)s+=`<circle cx="14" cy="16" r="6" style="fill:var(--accent)"/>`+T(26,20,`${NM[sel]} is secure`,{c:'tacc',w:700})+`<circle cx="14" cy="34" r="6" style="fill:var(--surface);stroke:var(--accent);stroke-width:2"/>`+T(26,38,'not yet',{c:'tacc'});
  s+='</svg>';
  const rm=S.v11.rm[R.key]||{},acc=!!S.v11.acc[R.key];
  const card=(cls,title,body)=>`<div class="pcard ${cls}"><h4>${title}</h4>${body}</div>`;
  const chips=(key,list,cnt)=>list.length?`<div class="names">${list.map(nm=>`<span class="chipx">${nmBtn(nm,cnt&&cnt(nm)>1?`<span class="gn">${cnt(nm)}</span>`:'')}<button class="x" type="button" data-act="v11rm" data-g="${key}" data-n="${nm}" aria-label="Remove ${nm} from this group">${IC.x}</button></span>`).join('')}</div>`:'<p class="none">Nobody left.</p>';
  const rb=P.red.length?P.red.map(o=>{const cc=o.c!==null?rdP(o.c,ids):null;return `<p><b>${ASK[o.k]}</b> · ${o.p}% secure${cc!==null&&cc<th?`. Start with ${ASK[o.c]} (${cc}%).`:''}</p>`}).join(''):'<p class="none">Nothing below your line.</p>';
  const ab=P.amb.length?`<p>${P.amb.map(o=>`<b>${ASK[o.k]}</b> · ${o.p}%`).join('<br>')}</p>${chips('grp',P.grp,P.gaps)}`:'<p class="none">None.</p>';
  const anyRm=Object.keys(rm).some(g=>rm[g].length);
  const plan=`<div class="detail"><div class="dhead"><h3>What to do first</h3>${acc?'<span class="pill good">Accepted</span>':''}</div><div class="plan">${card('bad','Reteach to everyone',rb)}${card('watch','Small groups',ab)}${card('good','Ready to go further',chips('ext',P.ext))}</div>
  <div class="planbar">${acc?'<button class="btn small" type="button" data-act="v11undo">Undo</button>':'<button class="btn primary" type="button" data-act="v11accept">Accept plan</button>'}${anyRm?'<button class="lnk" type="button" data-act="v11restore">Put removed names back</button>':''}</div></div>`;
  c.innerHTML=duo(da,fig(s),plan);if(an)an.textContent=h11();
  /* on a narrow screen the tree scrolls sideways: start centred on the unit */
  const fg=c.querySelector('.fig');if(fg&&fg.scrollWidth>fg.clientWidth)fg.scrollLeft=(fg.scrollWidth-fg.clientWidth)/2}
const rdPfx=R=>`v11:${R.key}:`;
function acceptPlan(){const P=planNow(),R=P.R,pf=rdPfx(R),nm=R.U.n;S.log=S.log.filter(e=>!e.key.startsWith(pf));
  P.red.forEach(o=>logAct(pf+'r'+o.k,10,`Whole-class reteach of ${ASK[o.k]} ${R.st==='next'||R.st==='later'?'before':'for'} ${nm}`,'plan',true));
  if(P.amb.length&&P.grp.length)logAct(pf+'grp',10,`Small group on ${andList(P.amb.map(o=>ASK[o.k]))} for ${nm}: ${andList(P.grp)}`,'plan',true);
  if(P.ext.length)logAct(pf+'ext',10,`Stretch task for ${andList(P.ext)}`,'done',true);
  S.v11.acc[R.key]=true;toast(`Plan accepted. ${S.log.filter(e=>e.key.startsWith(pf)).length} actions logged.`)}

/* ---------- view 12: effect ranges ---------- */
function h12(){if(!IVS.length)return 'No targeted practice set is recorded for this class.';const w=IVS.filter(d=>d.lo>0).map(d=>d.sn||d.n),e=IVS.filter(d=>d.est===null).length;return w.length?`${w.length} ${pl(w.length,'thing')} worked: ${andList(w)}.`:e===IVS.length?`${IVS.length} targeted ${pl(IVS.length,'set')} so far; too early to tell if ${IVS.length===1?'it':'they'} worked.`:'Nothing has clearly worked yet.'}
function v12(){const sel=S.stu,f=S.v12.f;
  const rows=IVS.map((d,i)=>({d,i})).filter(o=>f==='all'||(f==='worked')===(o.d.lo>0));
  if(rows.length&&!rows.some(o=>o.i===S.v12.r))S.v12.r=rows[0].i;
  const da=rows.length?duoW(.6,620):0,W=da||VW(),L=262,R=146,rh=50,T0=38,x=v=>L+(clamp(v,-10,25)+10)/35*(W-L-R),H=T0+rows.length*rh+44;
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="Effect ranges: extra points gained after each thing tried, against its comparison group">`;
  s+=`<rect x="${f1(x(0))}" y="${T0-12}" width="${f1(x(25)-x(0))}" height="${rows.length*rh+12}" style="fill:var(--bg-good)"/>`+T(x(0)+8,T0-18,'helped →',{c:'tgood',w:700})+T(x(0)-8,T0-18,'← hurt',{a:'end',c:'t3'});
  [-10,10,20].forEach(t=>{s+=`<line x1="${f1(x(t))}" x2="${f1(x(t))}" y1="${T0-12}" y2="${T0+rows.length*rh}" class="grid" stroke-dasharray="2 3"/>`});
  [-10,0,10,20].forEach(t=>{s+=T(x(t),T0+rows.length*rh+16,sgn(t),{a:'middle',c:'t3'})});
  s+=`<line x1="${f1(x(0))}" x2="${f1(x(0))}" y1="${T0-12}" y2="${T0+rows.length*rh}" class="axis"/>`+T((x(-10)+x(25))/2,H-6,'Extra points vs the comparison group',{a:'middle'});
  rows.forEach((o,ri)=>{const d=o.d,v=verdict(d),yc=T0+ri*rh+rh/2,got=sel!==null&&d.who.includes(NM[sel]),wh=d.who.length===N?'Whole class':d.who.length+' students';
    s+=`<g class="row${S.v12.r===o.i?' on':''}" data-act="v12row" data-r="${o.i}" tabindex="0" role="button" aria-label="${d.n}: ${v.t}${d.sample?' (sample)':''}"${tp(`<b>${d.n}</b>${d.sample?' · sample':''}<br>${d.est===null?d.cmp:`${sgn(d.est)} points (range ${sgn(d.lo)} to ${sgn(d.hi)})`}`)}><rect class="rbg" x="2" y="${f1(yc-rh/2+2)}" width="${W-4}" height="${rh-4}" rx="6"/>`;
    s+=T(12,yc-3,d.n,{c:'t1',w:700})+T(12,yc+13,`${wh} · ${d.wk}${d.sample?' · sample':''}`,{c:'t3'});
    if(d.est===null)s+=T(x(0)+10,yc+4,'Not enough later work to compare yet',{c:'t3'});else s+=`<line x1="${f1(x(d.lo))}" y1="${f1(yc)}" x2="${f1(x(d.hi))}" y2="${f1(yc)}" style="stroke:${v.m};stroke-width:4;stroke-linecap:round" opacity=".6"/><circle cx="${f1(x(d.est))}" cy="${f1(yc)}" r="${f1(4+Math.sqrt(d.who.length))}" style="fill:${v.m};stroke:var(--surface);stroke-width:1.5"/>`;
    s+=T(W-R+14,yc+(got?-3:4),v.t,{c:v.k,w:700});if(got)s+=T(W-R+14,yc+13,`${NM[sel]} did this`,{c:'tacc'});
    s+='</g>'});
  s+='</svg>';
  const ctl=`<div class="controls">${seg('v12f',f,[['all',`All · ${IVS.length}`],['worked',`Worked · ${IVS.filter(d=>d.lo>0).length}`],['other',`Not proven · ${IVS.filter(d=>d.lo<=0).length}`]],'Filter interventions')}</div>`;
  const leg=`<div class="legend"><span><i class="sw" style="background:var(--good)"></i>Worked</span><span><i class="sw" style="background:var(--watch)"></i>Promising</span><span><i class="sw" style="background:var(--neutral)"></i>No clear effect</span>${IVS.some(d=>d.sample)?'<span><span class="pill">Sample</span>invented rows, to show the chart</span>':''}</div>`;
  let det='';
  if(rows.length){const d=IVS[S.v12.r],v=verdict(d);det=`<div class="detail"><div class="dhead"><h3>${d.n}</h3><span class="pill ${v.c}">${v.t}</span>${d.sample?'<span class="pill">Sample</span>':''}<span class="dnext">${d.rec}</span></div><p class="hint">${d.dose} · ${d.sample?'compared with ':''}${d.cmp}</p>${d.who.length<N?whoCol(d.sample?'Who got it':'Who did it','var(--accent)',d.who):''}</div>`}
  const lg=S.log.length?`<ul class="log">${S.log.slice().reverse().map(e=>`<li><time>${e.at}</time><span class="vp">${vFrom(e.v)}</span><span>${esc(e.t)}</span><span class="pill ${e.kind==='plan'?'watch':'good'}">${e.kind==='plan'?'In progress':'Done'}</span></li>`).join('')}</ul>`:'<p class="none">Nothing logged yet.</p>';
  const prog=`<div class="detail" id="log"><div class="dhead"><h3>Action log</h3><span class="pill">${S.log.length}</span></div>${lg}</div>`;
  return (IVS.length?ctl+leg+duo(da,fig(s),det):'<p class="none">The database records no practice set targeted at part of this class, so there is nothing to compare yet.</p>')+prog}

/* ---------- practice sets: built for one student, from their profile ---------- */
const cq=t=>esc(t).replace(/`([^`]+)`/g,'<code>$1</code>');
const TCAT={stuck:['Stuck despite effort','Doing the work, not secure','bad','students'],off:['Not doing the work','Little or no practice','bad','students'],item:['Flagged items','Reported, or can’t be marked','bad','items'],drop:['Class-wide drops','Fading for everyone','watch','skills'],ext:['Ready for extension','Secure, finishing early','good','students']};
const SETN={stuck:'Practice set',off:'Catch-up set',drop:'Review warm-up',ext:'Stretch set'};
const ZWHY={broken:'broken',mis:'misleading',easy:'too easy',hard:'too hard',weak:'doesn’t separate'};
const okIt=it=>zone9(it)==='ok';
/* a short set from the item bank: healthy items only, easiest first, trimmed to the time budget. Nothing is drafted: every item is one from the item bank */
const whoOf=c=>c.cat==='drop'?c.who:c.who.filter(n=>!(S.td.ex[c.id]||[]).includes(n));
function genSet(c){const who=whoOf(c),bank=ITEMS.filter(it=>c.ks.includes(it.k)),use=bank.filter(okIt),rows=[];
  const B=it=>({key:'b'+it.id,f:it.f,nm:it.name,k:it.k,note:`${it.p}% get it right`,sec:it.t});
  const N=(key,f,q,k,note)=>({key,f,nm:q,k,note,sec:FSEC[f],draft:true});
  const fi=f=>FMT.indexOf(f),quick=use.filter(it=>FKIND[it.f]!=='t').sort((a,b)=>b.p-a.p),task=use.filter(it=>FKIND[it.f]==='t').sort((a,b)=>fi(a.f)-fi(b.f)||b.p-a.p);
  const probes=[];
  if(c.cat==='stuck'){if(quick[0])rows.push(B(quick[0]));rows.push(...probes.slice(0,2),...quick.slice(1).map(B),...task.map(B))}
  else if(c.cat==='off')rows.push(...quick.slice(0,3).map(B),...task.slice(0,1).map(B));
  else if(c.cat==='drop'){c.ks.forEach(k=>{const q=use.filter(it=>it.k===k).sort((a,b)=>(FKIND[a.f]==='t')-(FKIND[b.f]==='t')||b.d-a.d)[0];if(q)rows.push(B(q))});
    c.ks.forEach(k=>{if(DRAFT[k]&&(rows.length<3||!rows.some(r=>r.k===k)))rows.push(N('n'+k,DRAFT[k][0],DRAFT[k][1],k,'New question'))});rows.push(...probes.slice(0,1))}
  else{c.ks.forEach(k=>{if(DRAFT[k])rows.push(N('n'+k,DRAFT[k][0],DRAFT[k][1],k,k>=NK?`Preview of ${NXT||UN[uOf(k)][0]}`:'Stretch'))});
    if(!rows.length)rows.push(...use.slice().sort((a,b)=>a.p-b.p).slice(0,3).map(B))}
  const rm=S.td.rm[c.id]||[],cand=rows.slice(0,6).filter(r=>!rm.includes(r.key)),bud=(S.td.bud[c.id]||15)*60,items=[];let tot=0;
  cand.forEach(r=>{if(items.length&&tot+r.sec>bud)return;items.push(r);tot+=r.sec});
  return {items,cut:cand.length-items.length,skip:c.cat==='ext'?[]:bank.filter(it=>!okIt(it)),min:Math.max(1,Math.round(tot/60))}}
const setFor=c=>{const w=whoOf(c);return c.cat==='drop'?'the whole class':w.length===1?w[0]:`${w.length} students`};
function whyItems(c,g){const w=whoOf(c),b=[],pr=g.items.filter(r=>r.key[0]==='p'),last=g.items[g.items.length-1],one=w.length===1;
  if(c.cat==='stuck')b.push(`Targets ${c.s}, where ${one?w[0]+' is':'they are'} doing the work but not secure yet.`);
  else if(c.cat==='off')b.push(`Short on purpose: ${one?w[0]+' hasn’t':'they haven’t'} been doing the work in ${c.t}${c.tb?' ('+TB[c.tb].n+')':''}.`);
  else if(c.cat==='drop')b.push('One item per faded skill, as a warm-up for the whole class.');
  else b.push('The hardest healthy questions on what the class is working on now.');
  if(c.cat!=='ext'&&g.items.length>1)b.push(`Easiest first${last&&FKIND[last.f]==='t'?`, ending with a ${last.f} task`:''}.`);
  const src=[...new Set(g.items.filter(r=>!r.draft).map(r=>ITEMS[+r.key.slice(1)].tb))];if(src.length>1)b.push(`Pulls items from ${andList(src.map(x=>TB[x].n))}.`);
  if(g.skip.length)b.push(`Leaves out ${andList(g.skip.slice(0,3).map(it=>`${it.name} (${ZWHY[zone9(it)]})`))}${g.skip.length>3?` and ${g.skip.length-3} more`:''}.`);
  if(g.cut)b.push(`${g.cut} more ${pl(g.cut,'item')} didn’t fit in ${S.td.bud[c.id]||15} minutes.`);
  return b}
const gRow=(r,ix,c)=>`<li${r.draft?' class="new"':''}><span class="gi">${ix+1}</span><span class="fmt${r.draft?' new':''}"${r.draft?tp('Drafted for this group. Check it before you assign the set.'):''}>${r.draft?'New · ':''}${r.f}</span><span class="gq"><b>${r.draft?cq(r.nm):r.nm}</b><span>${skn(r.k)}</span></span><span class="gn2">${r.note}</span><button class="x" type="button" data-act="tdrm" data-id="${c.id}" data-k="${r.key}" aria-label="Remove ${r.draft?'the new question':r.nm}">${IC.x}</button></li>`;
function genPanel(c){const g=genSet(c),cat=TCAT[c.cat],rm=(S.td.rm[c.id]||[]).length,ex=S.td.ex[c.id]||[],bud=S.td.bud[c.id]||15,many=c.cat!=='drop'&&c.who.length>1,why=whyItems(c,g);
  const forRow=many?`<div class="gfor"><span class="gl">For</span>${c.who.map(n=>{const out=ex.includes(n);return `<span class="who5${out?' out':''}">${nmBtn(n)}<button class="x sm" type="button" data-act="tdex" data-id="${c.id}" data-n="${n}" aria-label="${out?'Put '+n+' back in':'Leave '+n+' out'}">${out?'↺':IC.x}</button></span>`}).join('')}</div>`:'';
  const budRow=`<div class="gfor"><span class="gl">Time</span><div class="seg" role="group" aria-label="Time budget">${[10,15,20].map(m=>`<button type="button" data-act="tdbud" data-id="${c.id}" data-f="${m}" aria-pressed="${bud===m}">${m} min</button>`).join('')}</div></div>`;
  return `<section class="detail gen" id="gen" aria-label="${SETN[c.cat]} for ${c.t}"><div class="dhead"><h3>${SETN[c.cat]} · ${c.t}</h3><span class="pill ${cat[2]}">${cat[0]}</span><span class="hint">${g.items.length} ${pl(g.items.length,'item')} · about ${g.min} min · for ${setFor(c)}</span></div>
  ${forRow}${budRow}
  ${g.items.length?`<ol class="gset">${g.items.map((r,ix)=>gRow(r,ix,c)).join('')}</ol>`:'<p class="none">Every item is removed.</p>'}
  ${why.length?`<details class="gwhy"><summary class="dl">Why these items</summary><ul>${why.map(t=>`<li>${t}</li>`).join('')}</ul></details>`:''}
  <div class="tc-act"><button class="btn primary" type="button" data-act="tdassign" data-id="${c.id}"${g.items.length&&whoOf(c).length?'':' disabled'}>Assign to ${setFor(c)}</button><button class="btn" type="button" data-act="tdclose" data-id="${c.id}">Close</button>${rm?`<button class="lnk" type="button" data-act="tdreset" data-id="${c.id}">Put back ${rm} removed</button>`:''}</div></section>`}

/* a student counts as drifting until the teacher marks them as not a concern */
const drifting=i=>DR[i]&&!S.v3.dismissed.includes(NM[i]);

/* ---------- student profile ---------- */
function profCard(i){const n=NM[i];let best=null;
  for(const j of TAUGHTJ){const c=cell2(i,KS2.j(j));if(c.m===null||c.m>=.8)continue;const pri=c.g==='stuck'||c.g==='off'?0:1;if(!best||pri<best.pri||(pri===best.pri&&c.m<best.m))best={j,m:c.m,g:c.g,pri}}
  if(!best)return {id:'p'+i,cat:'ext',tb:0,n:1,u:CU,js:[],ks:XKS,who:[n],t:UN[CU][0],s:'a stretch'};
  const j=best.j;return {id:'p'+i,cat:best.g==='off'?'off':'stuck',tb:0,n:1,u:uOfJ(j),js:[j],ks:jSk(0,j),who:[n],t:UN[uOfJ(j)][0],s:SUB[j]}}
const cardById=id=>/^p\d+$/.test(id)?profCard(+id.slice(1)):null;
function profMoments(i){const n=NM[i],m=[];
  IVS.forEach(d=>{if(d.who.length<NM.length&&d.who.includes(n))m.push({w:+(d.wk.match(/\d+/)||[NOW])[0],k:'iv',t:d.sample?`${d.n} (sample)`:`Did the practice set ${d.n}`})});
  if(drifting(i))m.push({w:DR[i],k:'bad',t:'Activity fell below their normal'});
  slipped(i).slice(0,2).forEach(k=>m.push({w:Math.min(NOW,KT[k]+RECHECK),k:'bad',t:`Slipped on ${SK[k]}`}));
  return m.sort((a,b)=>a.w-b.w)}
function profTL(i,W){const L=40,R=104,top=30,ph=130,H=top+ph+50,x=w=>L+(w-1)*(W-L-R)/(NOW-1),y=v=>top+(1-v)*ph,n=NM[i],d=drifting(i)?DR[i]:0,b=BAND[i];
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="${n}: share of taught skills secure, and weekly activity, weeks 1 to ${NOW}">`;
  for(const u of TAUGHT){const U=TB0[u],x0=Math.max(L-6,x(U.wk[0]-.5)),x1=Math.min(W-R+6,x(U.wk[1]+.5));s+=`<rect x="${f1(x0)}" y="${top-4}" width="${f1(x1-x0)}" height="${ph+8}" style="fill:${u%2?'var(--band)':'transparent'}"/>`+T((x0+x1)/2,top-10,U.n.length*6.4>(x1-x0)*1.5?U.s:U.n,{a:'middle',c:'t3'})}
  [0,.5,1].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${f1(y(v))}" y2="${f1(y(v))}" style="stroke:var(--rule)"/>`+T(L-6,y(v)+4,Math.round(v*100)+(v===1?'%':''),{a:'end',c:'t3'})});
  s+=`<rect x="${L}" y="${f1(y(b.hi/100))}" width="${W-L-R}" height="${f1(y(b.lo/100)-y(b.hi/100))}" style="fill:var(--neutral);opacity:.28"/>`;
  const ap=WORK[i].map((v,ix)=>f1(x(ix+1))+','+f1(y(v/100)));
  s+=d?`<polyline points="${ap.slice(0,d).join(' ')}" fill="none" style="stroke:var(--ink-3);stroke-width:1.8;stroke-linejoin:round"/><polyline points="${ap.slice(d-1).join(' ')}" fill="none" style="stroke:var(--bad);stroke-width:2.2;stroke-linejoin:round"/>`:`<polyline points="${ap.join(' ')}" fill="none" style="stroke:var(--ink-3);stroke-width:1.8;stroke-linejoin:round"/>`;
  const mp=[];for(let w=1;w<=NOW;w++)mp.push(f1(x(w))+','+f1(y(secAt(i,w))));
  s+=`<polyline points="${mp.join(' ')}" fill="none" style="stroke:var(--good);stroke-width:2.8;stroke-linejoin:round"/>`;
  const ma=secAt(i,NOW),aa=WORK[i][NOW-1]/100;let ym=y(ma)+4,ya=y(aa)+4;if(Math.abs(ym-ya)<15){const mid=(ym+ya)/2;if(ma>=aa){ym=mid-8;ya=mid+8}else{ym=mid+8;ya=mid-8}}
  s+=T(W-R+8,ym,`Secure ${Math.round(ma*100)}%`,{c:'tgood',w:700})+T(W-R+8,ya,`Activity ${Math.round(aa*100)}`,{c:d?'tbad':'t2',w:700});
  const yl=top+ph+22,M=profMoments(i),cnt={},seen={};M.forEach(o=>{cnt[o.w]=(cnt[o.w]||0)+1});
  M.forEach(o=>{const ix=seen[o.w]=(seen[o.w]||0)+1,cx=x(o.w)+(ix-1-(cnt[o.w]-1)/2)*12,col=o.k==='iv'||o.k==='good'?'var(--good)':o.k==='mis'?'var(--watch)':'var(--bad)';
    s+=`<g${tp(`<b>Week ${o.w}</b><br>${esc(o.t)}`)}>${o.k==='iv'?`<path d="M${f1(cx)} ${yl-6} L${f1(cx+6)} ${yl} L${f1(cx)} ${yl+6} L${f1(cx-6)} ${yl} Z" style="fill:${col}"/>`:`<circle cx="${f1(cx)}" cy="${yl}" r="5" style="fill:${col}"/>`}</g>`});
  s+=T(x(1),H-6,'Wk 1',{a:'middle',c:'t3'})+T(x(NOW),H-6,`Wk ${NOW}`,{a:'middle',c:'t3'});
  return s+'</svg>'}
function vProf(){const i=S.prof,n=NM[i],pv=(i+NM.length-1)%NM.length,nx=(i+1)%NM.length,gc=profCard(i),open=S.td.gen===gc.id,done=isLogged('td:'+gc.id),M=profMoments(i),da=duoW(.62,620);
  const us=TB.map((Tb,tb)=>inTB(tb,n)?`<div class="usnaps">${Tb.units.map((U,u)=>{if(!tU(tb,u))return '';const c=cellN(i,tb,{t:'u',id:u});if(c.g==='x'||c.g==='na')return '';
    return `<button class="usnap" type="button" data-act="profu" data-tb="${tb}" data-u="${u}"${tp(`<b>${U.n}</b> · ${Tb.n}<br>${GLAB[c.g]}<br><span>Did ${Math.round(c.e*100)}% of the practice · mastery ${c.m===null?'too early to tell':Math.round(c.m*100)+'%'}</span>`)}>${sq2(c.mc,c.doing,c.g,c.e)}<b>${U.n}</b><span>${GLAB[c.g]}</span></button>`}).join('')}${(()=>{const ns=Tb.units.filter((U,u)=>!tU(tb,u));return ns.length?`<span class="usnap next"${tp(ns.map(U=>U.n).join('<br>'))}><span>+${ns.length} not started</span></span>`:''})()}</div>`:'').join('');
  const leg=`<div class="legend"><span><i class="ln" style="background:var(--good)"></i>Skills secure</span><span><i class="ln" style="background:var(--ink-3)"></i>Weekly activity</span><span><i class="sw" style="background:var(--neutral);opacity:.45"></i>${n}’s normal range</span><span><svg width="12" height="12" aria-hidden="true"><path d="M6 1 L11 6 L6 11 L1 6 Z" style="fill:var(--good)"/></svg>Targeted practice</span><span><i class="sw" style="background:var(--bad);border-radius:50%"></i>Concern</span></div>`;
  const ml=M.length?`<ol class="moms">${M.map(o=>`<li><span class="mw">Wk ${o.w}</span><span class="mk ${o.k}" aria-hidden="true"></span><span>${esc(o.t)}</span></li>`).join('')}</ol>`:'<p class="none">Nothing notable.</p>';
  const pp=paceOf(i,S.v4.goal),wa=WORKC[i],pst=`<div class="statrow psum">${stat('Skills secure',`${fCount(i)} of ${NK}`)}${stat('Latest week’s work',(wa.length?wa[wa.length-1]:0)+'%')}${stat('Pace',pp.st)}${drifting(i)?stat('Drifting','since week '+DR[i]):''}</div>`;
  return `<div class="prof"><div class="phead"><div><p class="eyebrow">Student profile</p><h2 class="pname">${n}</h2></div><div class="pnav"><button class="btn small" type="button" data-act="prof" data-i="${pv}" aria-label="Previous student: ${NM[pv]}">← ${NM[pv]}</button><button class="btn small" type="button" data-act="prof" data-i="${nx}" aria-label="Next student: ${NM[nx]}">${NM[nx]} →</button></div></div>
  ${pst}${us}${leg}${duo(da,fig(profTL(i,da||VW())),da?`<div class="detail"><div class="dhead"><h3>Moments</h3><span class="pill">${M.length}</span></div>${ml}</div>`:`<details class="data"><summary>Moments · ${M.length}</summary>${ml}</details>`)}
  <div class="tc-act">${done?'<span class="pill good">Set assigned</span>':`<button class="btn primary${open?' on':''}" type="button" data-act="tdgen" data-id="${gc.id}" aria-expanded="${open}">Generate practice</button>`}<span class="hint">${gc.cat==='ext'?'Stretch set':`${SETN[gc.cat]} · ${SUBS[gc.js[0]].s}`}</span></div>${open&&!done?genPanel(gc):''}</div>`}

/* ---------- students overview: one row per student. The two trends, where they stand in each unit, what flags them, and one next step ---------- */
const PSHORT={'Short, not catching up':'Short of goal','Short, but catching up':'Catching up','Ahead now, but slowing':'Slowing','On pace':'On pace','Ahead':'Ahead'};
/* the share of taught skills secure, week by week, on one scale for every row so the lines can be compared */
const SECW=ALL.map(i=>{const o=[];for(let w=1;w<=NOW;w++)o.push(secAt(i,w));return o});
const SECMAX=Math.max(.3,Math.ceil(Math.max(...SECW.flat())*10)/10);
function secSpark(i,w,h){const a=SECW[i],px=k=>3+k*(w-6)/Math.max(1,a.length-1),py=v=>h-3-clamp(v/SECMAX,0,1)*(h-6),e=a.length-1;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${NM[i]}: share of taught skills secure, ${Math.round(a[0]*100)}% in week 1, ${Math.round(a[e]*100)}% now"><polyline points="${a.map((v,k)=>f1(px(k))+','+f1(py(v))).join(' ')}" fill="none" style="stroke:var(--good);stroke-width:1.8;stroke-linejoin:round"/><circle cx="${f1(px(e))}" cy="${f1(py(a[e]))}" r="2.6" style="fill:var(--good)"/></svg>`}
/* the one next step for a student, from what flags them: the worst thing first */
function ovStep(i){const n=NM[i],g=OVU.map(u=>({u,g:cell2(i,KS2.u(u)).g})),st=g.filter(o=>o.g==='stuck').pop(),of=g.filter(o=>o.g==='off').pop(),p=paceOf(i,S.v4.goal).st;
  if(drifting(i)||WATCH[i])return {key:'v3c:'+n,l:'Check in',t:`Checked in with ${n}`,kind:'done',chk:true};
  if(st)return {key:`ov:${i}:reteach`,l:'Small-group reteach',t:`Small-group reteach for ${n} in ${UN[st.u][0]}`,kind:'plan'};
  if(of)return {key:`ov:${i}:talk`,l:'Talk to them',t:`Talked with ${n} about the work in ${UN[of.u][0]}`,kind:'done'};
  if(p.startsWith('Short'))return {gen:true,l:'Generate practice'};
  if(p==='Ahead'||g.some(o=>o.g==='coast'))return {key:`ov:${i}:stretch`,l:'Stretch task',t:`Stretch task for ${n}`,kind:'done'};
  return null}
function h0(){const d=ALL.filter(i=>drifting(i)).length,st=ALL.filter(i=>OVU.some(u=>cell2(i,KS2.u(u)).g==='stuck')).length,sh=ALL.filter(i=>paceOf(i,S.v4.goal).st.startsWith('Short')).length;
  return `${d} drifting, ${st} stuck despite effort, ${sh} short of the goal.`}
function vOverview(){const O=S.ov,sel=S.stu,goal=S.v4.goal;
  const rows=ALL.map(i=>{const a=WORKC[i],last=a.length?a[a.length-1]:0,sec=SECW[i][NOW-1],sec0=SECW[i][Math.max(0,NOW-5)],p=paceOf(i,goal),byV={};
    flags(i).forEach(f=>{if((f.l==='bad'||f.l==='watch')&&(!byV[f.v]||f.l==='bad'))byV[f.v]=f});
    const vs=Object.keys(byV).map(Number).sort((x,y)=>PN[x]-PN[y]);
    return {i,n:NM[i],last,below:a.length>0&&last<BAND[i].lo,sec,ds:Math.round((sec-sec0)*100),p,byV,vs,bad:vs.filter(v=>byV[v].l==='bad').length}});
  const key={name:r=>r.n,act:r=>r.last,sec:r=>r.sec,pace:r=>r.p.proj,flags:r=>r.vs.length+r.bad/10}[O.sort];
  rows.sort((a,b)=>{const x=key(a),y=key(b);return (typeof x==='string'?x.localeCompare(y):x-y)*O.dir||a.i-b.i});
  const th=(k,l)=>`<th aria-sort="${O.sort===k?(O.dir>0?'ascending':'descending'):'none'}"><button type="button" class="ths" data-act="ovsort" data-f="${k}">${l}${O.sort===k?`<span aria-hidden="true">${O.dir>0?' ↑':' ↓'}</span>`:''}</button></th>`;
  const cw=34,tr=r=>{const i=r.i,st=ovStep(i),ps=PS[PSI[r.p.st]][3],b=BAND[i];
    const units=`<svg width="${OVU.length*cw}" height="18" viewBox="0 0 ${OVU.length*cw} 18" role="group" aria-label="${r.n}: mastery and practice in the class’s latest ${OVU.length} ${pl(OVU.length,'unit')}">${OVU.map((u,x)=>{const c=cell2(i,KS2.u(u));return `<g class="hit" data-act="ovu" data-i="${i}" data-u="${u}"${tp(`<b>${TB0[u].n}</b><br>${GLAB[c.g]}<br><span>Tried ${Math.round(c.e*100)}% of the class’s questions · mastery ${c.m===null?'too early to tell':Math.round(c.m*100)+'%'}</span>`)}>${cellMark(x*cw+1,1,cw-4,16,c)}</g>`}).join('')}</svg>`;
    const next=!st?'<span class="hint">–</span>':st.gen?`<button class="btn small" type="button" data-act="ovgen" data-i="${i}">${st.l}</button>`:isLogged(st.key)?'<span class="pill good">Logged</span>':`<button class="btn small" type="button" data-act="ovact" data-i="${i}">${st.l}</button>`;
    return `<tr${sel===i?' class="on"':''}><td><button class="nmx" type="button" data-act="prof" data-i="${i}"${tp(`Open ${r.n}’s profile`)}>${r.n}</button></td>
      <td><span class="ovc"${tp(`Latest week of class work: ${r.last}%<br><span>Their normal range: ${Math.round(Math.max(0,b.lo))}–${Math.round(b.hi)}%${DR[i]?` · below it since week ${DR[i]}`:''}</span>`)}>${spark(i,112,26,false)}<b${r.below?' class="neg"':''}>${r.last}%</b></span></td>
      <td><span class="ovc"${tp(`${fCount(i)} of ${NK} taught skills secure<br><span>${r.ds>0?'Up':r.ds<0?'Down':'No change'}${r.ds?` ${Math.abs(r.ds)} points`:''} in four weeks</span>`)}>${secSpark(i,112,26)}<b>${Math.round(r.sec*100)}%</b>${r.ds>=2?IC.up:r.ds<=-2?IC.down:''}</span></td>
      <td>${units}</td>
      <td><span class="pill${ps==='neutral'?'':' '+ps}"${tp(`${r.p.now} skills secure now, about ${Math.round(r.p.proj)} by week ${NWK}<br><span>Goal: ${goal}</span>`)}>${PSHORT[r.p.st]}</span></td>
      <td><span class="vchips">${r.vs.length?r.vs.map(v=>`<button class="vchip ${r.byV[v].l}" type="button" data-act="gofor" data-v="${v}" data-i="${i}" aria-label="${VM[v].s}: ${esc(r.byV[v].t)}"${tp(`<b>${VM[v].s}</b><br>${esc(r.byV[v].t)}`)}>${PN[v]}</button>`).join(''):'<span class="hint">–</span>'}</span></td>
      <td>${next}</td></tr>`};
  return `<div class="tbl ovt"><table><thead><tr>${th('name','Student')}${th('act','Weekly work')}${th('sec','Skills secure')}<th><span${tp(TAUGHT.length>OVU.length?`The unit the class is on and the ${OVU.length-1} before it<br><span>${TAUGHT.length} units are started; all of them are in ${VM[2].s}</span>`:'Every unit the class has started')}>${TAUGHT.length>OVU.length?`Last ${OVU.length} ${pl(OVU.length,'unit')}`:'By unit'}</span><span class="ovus">${OVU.map(u=>`<i${tp(TB0[u].n)}>${esc(D.units[u].num)}</i>`).join('')}</span></th>${th('pace','Pace')}${th('flags','Flagged in')}<th>Next step</th></tr></thead><tbody>${rows.map(tr).join('')}</tbody></table></div>`}

/* ---------- render ---------- */
const HL=[h0,null,h2,h3,h4,h6,h7,h8,null,h10,h11,h12];
const VF=[vOverview,null,v2,v3,v4,v6,v7,v8,null,v10,v11,v12];
const DRAW={2:v2draw,4:v4draw,10:v11draw};
const ord=n=>n+(n%10===1&&n%100!==11?'st':n%10===2&&n%100!==12?'nd':n%10===3&&n%100!==13?'rd':'th');
/* the top bar names the class; the footer says which weeks the data covers */
function renderHead(){
  $('#cname').textContent=`${D.meta.name} · ${D.meta.textbook} · ${N} students`;
  const ft=$('#foot');if(ft)ft.textContent=`Anonymised class data, ${dayDate(0)} to ${dayDate(LASTDAY)} (week ${NOW}). Nothing here is saved.`;
  const src=$('#src');if(src)src.innerHTML=`<div class="tbl"><table><thead><tr><th>Page</th><th>Worked out from</th><th>Database tables</th><th>How real</th></tr></thead><tbody>${TBL.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`;
  try{document.title=`Insight Lens · ${D.meta.name}`}catch(_){}}
function renderThread(){const el=$('#thread');if(S.stu===null){el.hidden=true;el.innerHTML='';return}
  const i=S.stu,fl=flags(i).filter(f=>f.l==='bad'||f.l==='watch').sort((a,b)=>PN[a.v]-PN[b.v]);el.hidden=false;
  el.innerHTML=`<div class="th-who"><span class="eyebrow">Following</span><b>${NM[i]}</b></div><div class="th-flags">${fl.length?fl.map(f=>`<button class="flag" type="button" data-act="${f.v===7?'gosub':f.v===10?'gonext':'go'}" data-v="${f.v}"${f.v===7?` data-j="${CJ}"`:''}><span class="lvl ${f.l}"></span><span class="vn"${tp(VM[f.v].s)}>${PN[f.v]}</span>${esc(f.t)}</button>`).join(''):'<span class="hint">No concerns on any page.</span>'}</div>${S.view==='p'&&S.prof===i?'':`<button class="btn small" type="button" data-act="prof" data-i="${i}">Open profile</button>`}<button class="btn small" type="button" data-act="clear">Stop following</button>`}
function renderRail(){let h='';
  GROUPS.forEach(([g,ks],gi)=>{h+=`<p class="rg"><span>${g}</span>${gi?'':'<span class="rp">Priority</span>'}</p>`+ks.map(k=>`<button type="button" data-act="go" data-v="${k}"${S.view===k?' aria-current="page"':''} aria-label="${VM[k].s}, priority ${PN[k]} of ${PRI.length}" title="Priority ${PN[k]} of ${PRI.length}: ${PWHY[k]}">${glyph(k)}<span class="rq">${VM[k].s}</span><span class="rn${PN[k]<=3?' top':''}" aria-hidden="true">${PN[k]}</span></button>`).join('')});
  $('#rail').innerHTML=h}
function frame(k,body){return `<div class="vhead"><h2 class="q">${VM[k].q}</h2><details class="how"><summary>How to read</summary><p>${HOW[k]}</p></details></div><p class="answer" id="ans">${HL[k]()}</p>${body}`}
/* a slider's track is filled up to its thumb: the stylesheet draws it from --p, which is kept here */
const rngFill=e=>e.style.setProperty('--p',((e.value-e.min)/Math.max(1,e.max-e.min)*100).toFixed(1)+'%');
function renderView(){const k=S.view,el=$('#view');if(k==='p'){el.innerHTML=vProf();return}el.innerHTML=frame(k,VF[k]());if(DRAW[k])DRAW[k]();el.querySelectorAll('input[type=range]').forEach(rngFill)}
function render(){tips.clear();tipN=0;hideTip();renderThread();renderRail();renderView();renderLogChip()}
const reView=()=>{tips.clear();tipN=0;hideTip();renderView()};

/* ---------- tooltip ---------- */
const tipEl=$('#tip');let tipT=null;
function showTip(id,cx,cy){const h=tips.get(id);if(!h){hideTip();return}tipEl.innerHTML=h;tipEl.hidden=false;const r=tipEl.getBoundingClientRect();let x=cx+14,y=cy+14;if(x+r.width>innerWidth-8)x=cx-r.width-14;if(y+r.height>innerHeight-8)y=cy-r.height-14;tipEl.style.left=Math.max(8,x)+'px';tipEl.style.top=Math.max(8,y)+'px'}
function hideTip(){if(tipEl)tipEl.hidden=true}
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const t=e.target.closest?e.target.closest('[data-tip]'):null;if(t)showTip(t.dataset.tip,e.clientX,e.clientY);else hideTip()});
document.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;const t=e.target.closest?e.target.closest('[data-tip]'):null;if(t){showTip(t.dataset.tip,e.clientX,e.clientY);clearTimeout(tipT);tipT=setTimeout(hideTip,2600)}else hideTip()});
document.addEventListener('focusin',e=>{const t=e.target.closest?e.target.closest('[data-tip]'):null;if(t){const b=t.getBoundingClientRect();showTip(t.dataset.tip,b.left+b.width/2,b.top+b.height/2)}});
document.addEventListener('focusout',hideTip);
window.addEventListener('scroll',hideTip,{passive:true});

/* ---------- events ---------- */
function go(k){S.view=k;try{history.replaceState(null,'',k==='p'?'#s-'+encodeURIComponent(NM[S.prof]):'#'+SLUG[k])}catch(_){}render();const v=$('#view');if(v&&v.getBoundingClientRect().top<64)v.scrollIntoView({block:'start'})}
const ATTRS=['v','i','k','r','s','f','u','j','n','g','t','id'];
function refocus(a,ds){const sel=`[data-act="${a}"]`+ATTRS.filter(x=>ds[x]!==undefined).map(x=>`[data-${x}="${String(ds[x]).replace(/"/g,'')}"]`).join('');let el=null;try{el=document.querySelector('#view '+sel)||document.querySelector(sel)}catch(_){}if(el&&el.focus)el.focus({preventScroll:true})}
const refocusId=id=>{const el=document.getElementById(id);if(el)el.focus({preventScroll:true})};
const GOALMIN=Math.max(1,Math.round(NSK*.15));
const maxGaveUp=j=>{const g=cCnt(0,j).map(c=>c[2]);return g.indexOf(Math.max(...g))};
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t)return;const a=t.dataset.act,d=Object.assign({},t.dataset);
  switch(a){
  case 'stu':{const i=+d.i;S.stu=S.stu===i?null:i;render();break}
  case 'clear':S.stu=null;render();break;
  case 'go':go(+d.v);break;
  case 'gofor':S.stu=+d.i;if(+d.v===7)open7(0,CJ,maxGaveUp(CJ));if(+d.v===10){S.v11.tb=0;S.v11.u[0]=rdDef(0)}go(+d.v);break;
  case 'log':go(11);{const l=$('#log');if(l&&l.scrollIntoView)l.scrollIntoView({block:'start'})}break;
  case 'v2u':{const u=+d.u;at2(u,null);S.v2.sel={t:'u',id:u};reView();break}
  case 'v2j':{const j=+d.j;at2(uOfJ(j),j);S.v2.sel={t:'j',id:j};reView();break}
  case 'v2k':S.v2.sel={t:'k',id:+d.k,j:+d.j};reView();break;
  case 'v2sel':{const id=+d.id,E=S.v2;if(d.t==='u'){at2(id,null);E.sel={t:'u',id}}else if(d.t==='j'){at2(uOfJ(id),id);E.sel={t:'j',id}}else E.sel={t:'k',id,j:+d.j};reView();break}
  case 'v2up':{const E=S.v2,u=E.at.u,j=E.at.j;E.sel={t:'u',id:u};if(d.f==='all')at2(null,null,u);else at2(u,null,TB0[u].js.indexOf(j));reView();break}
  case 'v2pg':S.v2.pg+=+d.f;reView();break;
  case 'v2log':{const E=S.v2,tb=E.tb,g=d.g,nm=nodeName(E.sel,tb)+(tb?` (${TB[tb].s})`:''),who=tbWho(tb).filter(i=>cellN(i,tb,E.sel).g===g).map(i=>NM[i]);
    const txt=g==='stuck'?`Small-group reteach on ${nm} for ${andList(who)}`:g==='off'?`Talked with ${andList(who)} about ${nm}`:`Stretch task in ${nm} for ${andList(who)}`;
    logAct(`v2:${tb}:${E.sel.t}${E.sel.id}:${g}`,2,txt,g==='stuck'?'plan':'done');v2draw();break}
  case 'v3check':{const n=d.n,c=S.v3.checked;if(c.includes(n)){S.v3.checked=c.filter(x=>x!==n);unlog('v3c:'+n)}else{c.push(n);logAct('v3c:'+n,3,`Checked in with ${n}`)}reView();break}
  case 'v3msg':{const n=d.n;S.v3.open=S.v3.open===n?null:n;reView();if(S.v3.open){const ta=$('#v3txt');if(ta)ta.focus({preventScroll:true});return}break}
  case 'v3copy':{const ta=$('#v3txt');if(!ta)break;const txt=ta.value,ok=()=>toast('Message copied. Paste it into your school’s messaging app.'),fb=()=>{ta.focus();ta.select();let done=false;try{done=document.execCommand('copy')}catch(_){}if(done)ok();else toast('Select the text and copy it with your keyboard.')};
    try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,fb);else fb()}catch(_){fb()}return}
  case 'v3sent':{const n=d.n;if(!S.v3.sent.includes(n))S.v3.sent.push(n);S.v3.open=null;logAct('v3m:'+n,3,`Message home about ${n}`);render();break}
  case 'v3dismiss':{const n=d.n;if(!S.v3.dismissed.includes(n))S.v3.dismissed.push(n);if(S.v3.open===n)S.v3.open=null;toast(`${n} marked as not a concern. Undo is below the list.`);render();return}
  case 'v3undo':S.v3.dismissed=S.v3.dismissed.filter(x=>x!==d.n);render();return;
  case 'v3all':S.v3.all=!S.v3.all;reView();break;
  case 'v6unit':{const E=S.v6.ex[S.v6.tb],u=+d.u;if(!E)break;const ix=E.U.indexOf(u);if(ix>=0)E.U.splice(ix,1);else E.U.push(u);reView();break}
  case 'v6sub':{const E=S.v6.ex[S.v6.tb],j=+d.j;if(!E)break;const ix=E.J.indexOf(j);if(ix>=0)E.J.splice(ix,1);else E.J.push(j);reView();break}
  case 'v6sk':S.v6.sel[S.v6.tb]=+d.k;reView();break;
  case 'v6lvl':{const tb=S.v6.tb,E=S.v6.ex[tb];if(!E)break;const {us,js}=lvAll5(tb);if(d.f==='u'){E.U=[];E.J=[]}else if(d.f==='j'){E.U=us.slice();E.J=[]}else{E.U=us.slice();E.J=js.slice()}reView();break}
  case 'gosub':{const j=+d.j;open7(0,j,maxGaveUp(j));go(7);return}
  case 'v7f':S.v7.f=d.f;S.v7.more=false;reView();break;
  case 'v7more':S.v7.more=!S.v7.more;reView();break;
  case 'v7row':S.v7.r=+d.r;reView();break;
  case 'v7plan':{const m=WEAK[+d.r];logAct('v7:'+m.k,6,`Reteach ${m.n} for the ${m.now.length} students not yet secure on it`,'plan');reView();break}
  case 'v8tb':S.v8.tb=+d.f;reView();break;
  case 'v8unit':{const E=S.v8.ex[S.v8.tb],u=+d.u;if(!E)break;const ix=E.U.indexOf(u);if(ix>=0)E.U.splice(ix,1);else E.U.push(u);reView();break}
  case 'v8sub':{const E=S.v8.ex[S.v8.tb],j=+d.j;if(!E)break;const ix=E.J.indexOf(j);if(ix>=0)E.J.splice(ix,1);else E.J.push(j);reView();break}
  case 'v8c':S.v8.sel[S.v8.tb]={j:+d.j,s:+d.s};reView();break;
  case 'v8lvl':{const tb=S.v8.tb,E=S.v8.ex[tb];if(!E)break;const {us,js}=lvAll7(tb);if(d.f==='u'){E.U=[];E.J=[]}else if(d.f==='j'){E.U=us.slice();E.J=[]}else{E.U=us.slice();E.J=js.slice()}reView();break}
  case 'v8plan':{const tb=S.v8.tb,sl=S.v8.sel[tb];if(!sl)break;const c=cCnt(tb,sl.j)[sl.s],n=c[0]+c[1]+c[2]+c[3],nm=ctOf(tb,sl.j)[sl.s][0],J=TBJ(tb,sl.j).n;logAct(sKey7(tb,sl.j,sl.s),7,c[3]/n>=.29?`Make ${nm} in ${J} a required check`:`Scaffold before ${nm} in ${J}`,'plan');reView();break}
  case 'v10u':S.v10.u=d.f;reView();break;
  case 'v10line':S.v10.k=S.v10.k===+d.k?-1:+d.k;reView();break;
  case 'v10close':S.v10.k=-1;reView();break;
  case 'v10plan':logAct('v10:'+d.k,9,`Spaced review of ${SK[+d.k]} in warm-ups`,'plan');reView();break;
  case 'v11rm':{const R=rdSel(),r=S.v11.rm[R.key]=S.v11.rm[R.key]||{};r[d.g]=(r[d.g]||[]).concat(d.n);S.v11.acc[R.key]=false;v11draw();renderLogChip();return}
  case 'v11restore':{const R=rdSel();S.v11.rm[R.key]={};S.v11.acc[R.key]=false;v11draw();break}
  case 'v11tb':S.v11.tb=+d.f;reView();break;
  case 'v11u':S.v11.u[S.v11.tb]=+d.f;reView();break;
  case 'gonext':S.v11.tb=0;S.v11.u[0]=rdDef(0);go(10);return;
  case 'v11accept':acceptPlan();v11draw();break;
  case 'v11undo':{const R=rdSel(),pf=rdPfx(R);S.log=S.log.filter(x=>!x.key.startsWith(pf));S.v11.acc[R.key]=false;renderLogChip();v11draw();break}
  case 'v12f':S.v12.f=d.f;reView();break;
  case 'v12row':S.v12.r=+d.r;reView();break;
  case 'ovsort':{const O=S.ov,k=d.f;if(O.sort===k)O.dir=-O.dir;else{O.sort=k;O.dir=k==='flags'?-1:1}reView();break}
  case 'ovact':{const i=+d.i,st=ovStep(i);if(!st||st.gen)break;if(st.chk&&!S.v3.checked.includes(NM[i]))S.v3.checked.push(NM[i]);logAct(st.key,0,st.t,st.kind);render();break}
  case 'ovgen':{const i=+d.i;S.prof=i;S.stu=i;S.td.gen='p'+i;go('p');return}
  case 'ovu':{const u=+d.u;S.stu=+d.i;at2(u,null);S.v2.sel={t:'u',id:u};go(2);return}
  case 'tdgen':{S.td.gen=S.td.gen===d.id?null:d.id;reView();const g=$('#gen');if(!g)break;if(g.scrollIntoView)g.scrollIntoView({block:'nearest'});if(e.detail===0){const b=g.querySelector('[data-act="tdassign"]');if(b)b.focus({preventScroll:true})}return}
  case 'tdrm':{(S.td.rm[d.id]=S.td.rm[d.id]||[]).push(d.k);reView();const b=$('#gen [data-act="tdassign"]');if(e.detail===0&&b)b.focus({preventScroll:true});return}
  case 'tdreset':S.td.rm[d.id]=[];reView();{const b=$('#gen [data-act="tdassign"]');if(e.detail===0&&b)b.focus({preventScroll:true})}return;
  case 'tdclose':{S.td.gen=null;reView();const b=document.querySelector(`[data-act="tdgen"][data-id="${d.id}"]`);if(e.detail===0&&b)b.focus({preventScroll:true});return}
  case 'tdassign':{const c=cardById(d.id);if(!c)return;const g=genSet(c),pr=/^p\d+$/.test(c.id);
    logAct('td:'+c.id,pr?'p':0,`${SETN[c.cat]} on ${pr&&c.cat!=='ext'?c.s:c.t} (${g.items.length} ${pl(g.items.length,'item')}) for ${setFor(c)}`,'plan');S.td.gen=null;render();return}
  case 'tdex':{const L=S.td.ex[d.id]=S.td.ex[d.id]||[];if(L.includes(d.n))S.td.ex[d.id]=L.filter(x=>x!==d.n);else L.push(d.n);reView();break}
  case 'tdbud':S.td.bud[d.id]=+d.f;reView();break;
  case 'prof':{S.prof=+d.i;S.stu=+d.i;S.td.gen=null;go('p');return}
  case 'profu':{const u=+d.u;at2(u,null);S.v2.sel={t:'u',id:u};go(2);return}
  case 'v6tb':S.v6.tb=d.f==='x'?'x':+d.f;reView();break;
  case 'v6xf':S.v6.xf=d.f;reView();break;
  default:return}
  if(e.detail===0&&!['go','gofor','log','stu','clear'].includes(a))refocus(a,d)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(S.stu!==null){S.stu=null;render()}return}
  const t=e.target;if((e.key==='Enter'||e.key===' ')&&t.getAttribute&&t.getAttribute('role')==='button'&&t.namespaceURI==='http://www.w3.org/2000/svg'){e.preventDefault();t.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
document.addEventListener('input',e=>{const t=e.target,id=t.id;if(t.type==='range')rngFill(t);
  if(id==='v4goal'){S.v4.goal=+t.value;const o=$('#v4go');if(o)o.textContent=t.value+' skills';v4draw();renderThread()}
  else if(id==='v2line'){S.v2.line=+t.value;const o=$('#v2lo');if(o)o.textContent=t.value+'% of practice';v2draw();renderThread()}
  else if(id==='v11th'){S.v11.th=+t.value;S.v11.acc={};const o=$('#v11o');if(o)o.textContent=t.value+'% secure';v11draw()}
  else if(id==='v3txt')S.v3.text[t.dataset.n]=t.value});
document.addEventListener('change',e=>{const t=e.target,id=t.id;
  if(id==='v2sort'){S.v2.sort=t.value;reView();refocusId('v2sort')}
  else if(id==='v4sort'){S.v4.sort=t.value;v4draw()}
  else if(id==='v8sort'){S.v8.sort=t.value;reView();refocusId('v8sort')}
  else if(id==='v10all'){S.v10.all=t.checked;reView();refocusId('v10all')}
  else if(id==='v10sort'){S.v10.sort=t.value;reView();refocusId('v10sort')}
  else if(id==='v6sort'){S.v6.sort=t.value;reView();refocusId('v6sort')}});
function fromHash(){const h=location.hash||'',ps=h.match(/^#s-(.+)$/);let pn=null;if(ps){try{pn=decodeURIComponent(ps[1])}catch(_){pn=ps[1]}}if(pn!==null&&ID[pn]!==undefined){S.view='p';S.prof=ID[pn];S.stu=S.prof;return}const nm=Object.keys(SLUG).find(k=>'#'+SLUG[k]===h),m=h.match(/^#q(\d{1,2})$/),k=nm!==undefined?+nm:m?+m[1]:0;S.view=VM[k]?k:0}
window.addEventListener('hashchange',()=>{fromHash();render()});
let rzT=null,rzW=window.innerWidth;
window.addEventListener('resize',()=>{if(window.innerWidth===rzW)return;rzW=window.innerWidth;clearTimeout(rzT);rzT=setTimeout(reView,160)});
/* defaults that depend on the class: the effort and mastery grid starts on all units, with the one where the most students are stuck picked */
(function(){const b=TAUGHT.map(u=>({u,n:ALL.filter(i=>cell2(i,KS2.u(u)).g==='stuck').length})).sort((x,y)=>y.n-x.n)[0];S.v2.sel={t:'u',id:b&&b.n?b.u:CU};
  /* the pace goal starts at the class’s median projection, so the view opens on who is above and below the middle; the teacher moves it to their own target */
  S.v4.goal=clamp(Math.round(qt(ALL.map(i=>paceOf(i,0).proj),.5)),GOALMIN,NSK-2)})();
renderHead();fromHash();render();
})();

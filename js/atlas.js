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
/* ---------- books ----------
   A class can list more than one book (section_curriculum). Every unit, lesson and question belongs to one book; a skill is shared by the books that
   check it. The export lists the books in meta.books and marks each unit and assignment with its book (tb); a class with one book has neither, and
   nothing on its pages says "book". The example at index.html?books adds books with invented work to the real class (data/example.js): it is read
   only when the address asks for it and only when it was built for this very export, and the page says "Example" the whole time it is on. */
const EXQ=/[?&]books(?=[&=]|$)/.test(location.search);
const EXOK=(function(){const B=window.ATLAS_BOOKS,b=B&&B.base;return !!(b&&!D.meta.books&&Array.isArray(B.books)&&b.section===D.meta.section&&b.units===D.units.length&&b.subs===D.subs.length&&b.items===D.items.length&&b.skills===D.skills.length&&b.att===D.att.length)})();
const EX=EXQ&&EXOK?(function(){const B=window.ATLAS_BOOKS;D.units.forEach(U=>{U.tb=0});D.units=D.units.concat(B.units);D.subs=D.subs.concat(B.subs);D.items=D.items.concat(B.items);D.skills=D.skills.concat(B.skills);D.att=D.att.concat(B.att);D.meta.books=B.books;return B})():null;
const BOOKS=(D.meta.books||[{id:D.meta.textbookId,name:D.meta.textbook,short:D.meta.textbook,role:'primary',added:null}]).map(b=>({id:b.id,n:esc(b.name),s:esc(b.short||b.name),nr:b.name,sr:b.short||b.name,role:b.role,added:b.added===undefined?null:b.added,inv:!!b.invented}));
D.units.forEach(U=>{U.tb=U.tb||0});
const bookOfItem=it=>D.units[D.subs[it.sub].u].tb;
/* a book has work once a student has answered a question in it. A book with none is named in the footer and nowhere else */
const GTYPE={mchoice:1,fillintheblank:1,parsonsprob:1,parsonprob:1,activecode:1,clickablearea:1,dragndrop:1};
const BWORK=BOOKS.map(()=>0);D.att.forEach(a=>{const it=D.items[a[1]];if(it&&GTYPE[it.type])BWORK[bookOfItem(it)]++});
const BKON=BOOKS.map((_,tb)=>tb).filter(tb=>BWORK[tb]>0);
const MULTI=BKON.length>1;                                                  // only then does any page say "book"
const MAINP=BKON.filter(tb=>BOOKS[tb].role==='primary'),MAIN=MAINP.length?MAINP[0]:BKON.length?BKON[0]:0;   // the main book: the first primary book with work. It sets where the class is
/* the book filter: ?book=<id> narrows every page to that book. Nothing picked, or a book with no work, is "All books" */
const PICK=(function(){if(!MULTI)return null;const m=location.search.match(/[?&]book=([^&#]*)/);if(!m)return null;let v=m[1];try{v=decodeURIComponent(v)}catch(_){}const tb=BOOKS.findIndex(b=>b.id===v);return BKON.includes(tb)?tb:null})();
const BL=BOOKS.map((_,tb)=>String.fromCharCode(65+tb));                    // A, B, C: a book's letter, keyed by the filter, for the places with little room
const bkTag=tb=>MULTI&&tb!==(PICK===null?MAIN:PICK)?BL[tb]+' · ':'';       // a unit or lesson says its book wherever it is not the book the page is about
/* a book of labs: nine in ten of its questions are coding tasks. A lab is work done and never a check on a skill: the few real sections with labs show
   a median of seven runs a lab and half never marked right, so counted as questions the labs would mark most of the class "not yet" on every skill they touch */
const LABB=BOOKS.map((_,tb)=>{if(!MULTI)return false;let g=0,c=0;D.items.forEach(it=>{if(GTYPE[it.type]&&bookOfItem(it)===tb){g++;if(it.type==='activecode')c++}});return g>0&&c>=.9*g});
const ISLAB=D.items.map(it=>LABB[bookOfItem(it)]);
const LABV=MULTI&&PICK!==null&&LABB[PICK];                                   // the page is about a book of labs
/* the view: the units and lessons of the books in view (every book with work, or the one picked), numbered afresh. D.units, D.subs and D.items keep every book */
const UIX=[],VU=[];D.units.forEach((U,u)=>{const ok=BKON.includes(U.tb)&&(PICK===null||U.tb===PICK);UIX[u]=ok?VU.length:-1;if(ok)VU.push(U)});
const JIX=[],VJ=[];D.subs.forEach((s,j)=>{const u=UIX[s.u];JIX[j]=u>=0?VJ.length:-1;if(u>=0)VJ.push(Object.assign({},s,{u}))});
VU.forEach((U,x)=>{VU[x]=Object.assign({},U,{subs:U.subs.map(j=>JIX[j]).filter(j=>j>=0)})});
if(MULTI&&PICK!==null){D.coursework=D.coursework.filter(c=>(c.tb||0)===PICK);D.sets=D.sets.map(st=>Object.assign({},st,{rows:st.rows.filter(r=>JIX[D.items[r[1]].sub]>=0)})).filter(st=>st.rows.length)}
const CLASS={name:esc(D.meta.name),subject:esc(D.meta.textbook)};
const NM=(function(){const seen={};return D.students.map(s=>{let n=esc(s);if(seen[n])n+=' '+(++seen[n]);else seen[n]=1;return n})})();
const ID={};NM.forEach((n,i)=>{ID[n]=i});
const N=NM.length,ALL=NM.map((_,i)=>i);
const avg=a=>a.length?sum(a)/a.length:null;
const qt=(a,p)=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor((s.length-1)*p)]};
const cut=(s,n)=>s.length>n?s.slice(0,n-1).trimEnd()+'…':s;

/* ---------- time: days count from day0, the first day of work; today is the export date ----------
   Nothing is counted in weeks, and no class day or timetable is assumed. "Recent" is the last five days. Every series on a chart runs in
   five-day blocks counted back from today, so the latest block is always the last five days. A block in which nobody in the class worked
   is a break, read from the data. Open index.html?today=YYYY-MM-DD to read the pages as of another day. */
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY0=new Date(D.meta.day0+'T12:00:00'),DAYMS=86400000;
const dayOf=iso=>Math.round((new Date(iso+'T12:00:00')-DAY0)/DAYMS);
const dateOf=d=>{const t=new Date(DAY0);t.setDate(t.getDate()+d);return t};
const isoOf=d=>{const t=dateOf(d),p=n=>String(n).padStart(2,'0');return `${t.getFullYear()}-${p(t.getMonth()+1)}-${p(t.getDate())}`};
const dayDate=d=>{const t=dateOf(d);return t.getDate()+' '+MON[t.getMonth()]+(t.getFullYear()!==DAY0.getFullYear()?' '+t.getFullYear():'')};
const dayDateY=d=>{const t=dateOf(d);return t.getDate()+' '+MON[t.getMonth()]+' '+t.getFullYear()};
const ACTD=NM.map(()=>new Set());D.daily.forEach(r=>{if(r[2]>0||r[3]>0)ACTD[r[0]].add(r[1])});
const EXPORTDAY=Math.max(4,D.meta.exported?dayOf(D.meta.exported):Math.max(0,...D.att.map(a=>a[6])));
const TODAY=(function(){const q=location.search.match(/[?&]today=(\d{4}-\d{2}-\d{2})/),d=q?dayOf(q[1]):EXPORTDAY;return Math.min(EXPORTDAY,Math.max(4,isNaN(d)?EXPORTDAY:d))})();
const LASTDAY=TODAY;
const ASOF=/[?&]today=/.test(location.search);   // the pages are being read as of a chosen day, not the export date
/* the first and the latest day anyone in the class worked, up to today */
const LASTWORK=Math.max(0,...D.att.filter(a=>a[6]<=LASTDAY).map(a=>a[6])),FIRSTWORK=Math.min(LASTWORK,...D.att.filter(a=>a[6]<=LASTDAY).map(a=>a[6]));
/* five-day blocks: block NBK-1 is the last five days; BS and BE are a block's first and last day. Charts show the blocks up to a little after the latest work, so an idle tail does not squeeze the rest */
const B5=5,NBK=Math.ceil((TODAY+1)/B5),BE=j=>TODAY-B5*(NBK-1-j),BS=j=>Math.max(0,BE(j)-B5+1);
const NBC=(function(){let n=0;for(let j=0;j<NBK;j++)if(BS(j)<=Math.min(TODAY,LASTWORK+10))n=j+1;return Math.max(1,n)})();
const blockOf=d=>NBK-1-Math.floor((TODAY-d)/B5);
const whenTxt=o=>!o.d?'not started':o.d[0]===o.d[1]?dayDate(o.d[0]):`${dayDate(o.d[0])} to ${dayDate(o.d[1])}`;

/* ---------- questions and each student's result on them ---------- */
const FMT=['MCQ','FITB','Parsons','Code','Click or drag'];
const FOF={mchoice:'MCQ',fillintheblank:'FITB',parsonsprob:'Parsons',parsonprob:'Parsons',activecode:'Code',clickablearea:'Click or drag',dragndrop:'Click or drag'};
/* q = quick question, t = longer task; seconds each usually takes */
const FKIND={MCQ:'q',FITB:'q',Parsons:'t',Code:'t','Click or drag':'q'};
const FSEC={MCQ:60,FITB:60,Parsons:120,Code:420,'Click or drag':60};
/* formats with lettered options, where it helps to see who chose each one */
const IT=D.items.map((it,ix)=>{const j=JIX[it.sub];return {ix,name:esc(it.name||'Untitled'),f:FOF[it.type]||null,j,u:j>=0?VJ[j].u:-1,tb:bookOfItem(it),lab:ISLAB[ix],ks:it.skills||[]}});
/* AT[student].get(question) = [student, question, right first try, right within 3, ever right, tries, first day, seconds, last day, the try that was first right, seconds on the first try] */
const AT=NM.map(()=>new Map());D.att.forEach(a=>{if(a[6]<=LASTDAY&&IT[a[1]].f)AT[a[0]].set(a[1],a)});
const IWHO=IT.map(()=>[]);AT.forEach((m,i)=>m.forEach((a,ix)=>IWHO[ix].push(i)));
/* credit for one question: a quick question counts when right first time (half on the second try);
   a code or Parsons task counts when right within three tries (half within six) */
const credit=a=>{const r=a[9],q=FKIND[IT[a[1]].f]==='q';return !r?0:q?(r===1?1:r===2?.5:0):(r<=3?1:r<=6?.5:0)};
/* eight or more tried it and nobody's answer was ever marked right: it has no working check, so it can't show who understands */
const NOCHK=IT.map((it,ix)=>!it.lab&&IWHO[ix].length>=8&&!IWHO[ix].some(i=>AT[i].get(ix)[4]));
/* evidence for a skill is a question with a working check that is not a lab */
const EVOK=ix=>!NOCHK[ix]&&!IT[ix].lab;
/* the class's questions: the ones at least a quarter of the class tried */
const CIALL=IT.map((it,ix)=>!!it.f&&IWHO[ix].length>=N/4),CI=CIALL.map((v,ix)=>v&&IT[ix].j>=0);   // CI: the class's questions in the books in view; CIALL: in every book
/* a lesson of any book is started once a quarter of the class has tried one of its questions: this is what decides which skills the class has met at all */
const ONJ=D.subs.map(s=>{const fd=new Set();s.items.forEach(ix=>IWHO[ix].forEach(i=>fd.add(i)));return fd.size>=N/4&&s.items.some(ix=>CIALL[ix])});

/* ---------- the textbook: every unit and subunit, started or not ----------
   A subunit is started once a quarter of the class has tried one of its questions. Its days are when the class
   worked on it (10th to 90th percentile of each student's first try), not a plan: the database holds no plan. */
const SUBS=VJ.map((s,j)=>{const fd=new Map();s.items.forEach(ix=>IWHO[ix].forEach(i=>{const d=AT[i].get(ix)[6];if(!fd.has(i)||d<fd.get(i))fd.set(i,d)}));
  const days=[...fd.values()],its=s.items.filter(ix=>CI[ix]),on=fd.size>=N/4&&its.length>0;
  return {id:j,u:s.u,tb:VU[s.u].tb,lab:LABB[VU[s.u].tb],n:bkTag(VU[s.u].tb)+esc(s.code+' '+s.name),s:bkTag(VU[s.u].tb)+esc(s.code),on,d:on?[qt(days,.1),qt(days,.9)]:null,mid:on?qt(days,.5):null,its,
    t:s.skills.filter(k=>k[1]).map(k=>k[0]),a:s.skills.filter(k=>k[2]).map(k=>k[0])}});
const TB=[{n:CLASS.subject,s:CLASS.subject,who:NM,units:VU.map(U=>{const js=U.subs,on=js.filter(j=>SUBS[j].on),tag=bkTag(U.tb);
  return {n:esc(U.name)+(tag?' ('+BOOKS[U.tb].s+')':''),nb:esc(U.name),s:tag+'Unit '+esc(U.num),num:esc(U.num),tb:U.tb,lab:LABB[U.tb],js,subs:js.map(j=>SUBS[j]),on:on.length>0,
    d:on.length?[Math.min(...on.map(j=>SUBS[j].d[0])),Math.max(...on.map(j=>SUBS[j].mid))]:null,mid:on.length?Math.max(...on.map(j=>SUBS[j].mid)):null}})}];
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
const KIT=ASK.map(()=>[]);IT.forEach(it=>{if(it.f&&EVOK(it.ix))it.ks.forEach(k=>KIT[k].push(it.ix))});  // questions that check each skill, in every book
const chk5=k=>KIT[k].length>0;
const KTAUGHT=ASK.map(()=>false);VJ.forEach(s=>s.skills.forEach(q=>{if(q[1])KTAUGHT[q[0]]=true}));
/* a skill the class has met in any book: a started lesson of any book names it. A level is worked out for these, whichever book is picked */
const KTA=ASK.map(()=>false);D.subs.forEach((s,j)=>{if(ONJ[j])s.skills.forEach(q=>{KTA[q[0]]=true})});
const KT=ASK.map(()=>null),KHOME=ASK.map(()=>null);  // the day the class first met each skill, and the subunit where it did
TB0.forEach(U=>U.js.forEach(j=>{const s=SUBS[j];if(s.on&&!s.lab)jSk(0,j).forEach(k=>{if(KT[k]===null||s.mid<SUBS[KHOME[k]].mid){KT[k]=s.d[0];KHOME[k]=j}})}));
TB0.forEach(U=>U.js.forEach(j=>{const s=SUBS[j];if(s.on&&s.lab)jSk(0,j).forEach(k=>{if(KT[k]===null){KT[k]=s.d[0];KHOME[k]=j}})}));   // a lab is a skill's home only when no lesson with a question is
TB0.forEach(U=>U.js.forEach(j=>jSk(0,j).forEach(k=>{if(KHOME[k]===null)KHOME[k]=j})));
const taught=k=>KT[k]!==null;
const TSK=ASK.map((_,k)=>k).filter(taught).sort((a,b)=>SUBS[KHOME[a]].mid-SUBS[KHOME[b]].mid||a-b);  // taught skills, in the order the class met them
const NK=TSK.length;
const uOf=k=>SUBS[KHOME[k]].u,jOf=k=>KHOME[k];
const tbOfSub=k=>[{ix:0,t:KTAUGHT[k],a:chk5(k)}];
/* a later check of a skill counts once it comes this many days after the student first met it (fading skills) */
const RECHECK=21,LATER='21 days or more later';

/* ---------- mastery ----------
   The evidence for a student on a skill is every question tagged with it that they tried, in date order, plus
   repeat tries in a practice set the teacher targeted. MT = average credit when first taught, ML = average credit
   on checks RECHECK or more days later, EV = number of checks, CUR = current estimate, CAT = category. */
const EVD=NM.map(()=>ASK.map(()=>null));
AT.forEach((m,i)=>m.forEach((a,ix)=>{if(!EVOK(ix))return;const c=credit(a);IT[ix].ks.forEach(k=>{(EVD[i][k]=EVD[i][k]||[]).push({d:a[6],c})})}));
D.sets.forEach(st=>st.rows.forEach(([i,ix,ok1,ever,d])=>{const a=AT[i].get(ix);if(!a||!EVOK(ix)||d>LASTDAY||d<a[6]+14)return;IT[ix].ks.forEach(k=>{(EVD[i][k]=EVD[i][k]||[]).push({d,c:ok1?1:ever?.5:0})})}));
EVD.forEach(r=>r.forEach(e=>{if(e)e.sort((x,y)=>x.d-y.d)}));
function estOf(i,k,day){const all=EVD[i][k];if(!all)return null;const e=all.filter(x=>x.d<=day);if(!e.length)return null;
  const t0=e[0].d,a=e.filter(x=>x.d<t0+RECHECK),b=e.filter(x=>x.d>=t0+RECHECK),mt=avg(a.map(x=>x.c)),ml=b.length?avg(b.map(x=>x.c)):null;
  return {mt,ml,ev:e.length,c:ml===null?mt:.4*mt+.6*ml}}
const catFrom=(ev,c)=>ev===0?'N':ev<2?'Q':c>=.8?'F':c>=.6?'H':'E';
const MT=[],ML=[],EV=[],CUR=[],CAT=[];
/* a level is one level: the evidence is every question on the skill in every book, so it does not change with the book picked */
ALL.forEach(i=>{MT[i]=[];ML[i]=[];EV[i]=[];CUR[i]=[];CAT[i]=[];ASK.forEach((_,k)=>{const e=KTA[k]?estOf(i,k,LASTDAY):null;
  MT[i][k]=e?e.mt:null;ML[i][k]=e?e.ml:null;EV[i][k]=e?e.ev:0;CUR[i][k]=e?e.c:null;CAT[i][k]=!KTA[k]?'X':catFrom(e?e.ev:0,e?e.c:0)})});
const CL={F:'Secure',H:'Developing',E:'Not yet',Q:'Only one check so far',N:'No evidence yet',X:'Not taught yet'};
const mast=(i,k)=>KTA[k]?{c:CUR[i][k],ev:EV[i][k],cat:CAT[i][k]}:null;
const fCount=i=>TSK.filter(k=>CAT[i][k]==='F').length;
/* where each student stood on each taught skill at the end of each five-day block (the blocks a chart shows): 2 secure, 1 developing, 0 not yet, -1 fewer than two checks */
const STW=ALL.map(i=>{const o={};TSK.forEach(k=>{const a=[];for(let j=0;j<NBC;j++){const e=estOf(i,k,BE(j));a.push(!e||e.ev<2?-1:e.c>=.8?2:e.c>=.6?1:0)}o[k]=a});return o});
/* the share of the skills taught by the end of block j that were secure then */
function secAt(i,j){const ks=TSK.filter(k=>KT[k]<=BE(j));return ks.length?ks.filter(k=>STW[i][k][j]===2).length/ks.length:0}

/* ---------- key skills: the ones a unit is for ----------
   A teacher judges a unit by its key skills, not by a count of every skill its lessons name. A unit's key skills are the ones its own summary,
   test, exercise and practice lessons check (what the book assesses) that are also carried forward: named by two or more lessons and checked by
   three or more questions, or needed by a later unit. In the product a teacher would edit this list; here it is worked out from the book.
   Standing in a unit comes from the key skills the class has been checked on so far: mastered (secure on 90% or more, and on every hard one),
   proficient (secure on 60% or more and not yet on 25% or fewer), developing (secure on 30% or more, or not yet on half or fewer), not yet. */
const TESTRE=/summary|test|exam|exercises|practice|frq/i;
const LISTED=ASK.map(()=>0);D.subs.forEach(s=>s.skills.forEach(q=>{LISTED[q[0]]++}));
const DUI=[];UIX.forEach((v,du)=>{if(v>=0)DUI[v]=du});                                            // a unit in view, back to its place in D.units
const laterNeed=du=>{const o=new Set();D.units.forEach((U2,u2)=>{if(u2>du)(U2.pre||[]).forEach(x=>o.add(x[0]))});return o};
const KEY=TB0.map((U,u)=>{const A=new Set(),need=laterNeed(DUI[u]);U.js.forEach(j=>{const sb=VJ[j];if(TESTRE.test(sb.code+' '+sb.name))sb.skills.forEach(q=>{if(q[2])A.add(q[0])})});
  return [...A].filter(k=>(LISTED[k]>=2&&KIT[k].length>=3)||need.has(k))});
const KEYC=KEY.map(ks=>ks.filter(k=>KTA[k]&&chk5(k)));                                            // the key skills the class has been checked on so far
const shareSec=k=>{let a=0,f=0;ALL.forEach(i=>{const c=CAT[i][k];if(c==='F'||c==='H'||c==='E'){a++;if(c==='F')f++}});return a>=8?f/a:null};
/* the hard key skills of a unit: the bottom third by the class's share secure. They gate "mastered", not "proficient" */
const HARD=KEYC.map(ks=>{const w=ks.map(k=>({k,p:shareSec(k)})).filter(o=>o.p!==null).sort((a,b)=>a.p-b.p);return new Set(w.slice(0,Math.ceil(w.length/3)).map(o=>o.k))});
const SL={M:'Mastered',P:'Proficient',D:'Developing',N:'Not yet',Q:'Too early to tell',X:'Not started',U:'Too early to tell',L:'Doing the labs'};
const SRANK={M:4,P:3,D:2,N:1,Q:0,X:0,U:0,L:0};
/* a student's standing on a set of skills: s the word, f and n the shares secure and not yet, close the skills checked but not secure, e how many were checked */
function standK(i,ks,hard){const e=ks.filter(k=>CAT[i][k]==='F'||CAT[i][k]==='H'||CAT[i][k]==='E'),close=e.filter(k=>CAT[i][k]!=='F');
  if(e.length<2)return {s:'Q',f:0,n:0,close,e:e.length};
  const f=e.filter(k=>CAT[i][k]==='F').length/e.length,n=e.filter(k=>CAT[i][k]==='E').length/e.length,hardNY=hard?[...hard].some(k=>CAT[i][k]==='E'):false;
  return {s:f>=.9&&!hardNY?'M':(f>=.6&&n<=.25)?'P':(f>=.3||n<=.5)?'D':'N',f,n,close,e:e.length}}
const standMemo=new Map();
function standU(i,u){const key=i+':'+u;let o=standMemo.get(key);if(!o){o=TB0[u].on?standK(i,KEYC[u],HARD[u]):{s:'X',f:0,n:0,close:[],e:0};standMemo.set(key,o)}return o}
const standJ=(i,j)=>standK(i,jSk(0,j).filter(k=>KTA[k]&&chk5(k)),null);

/* ---------- practice done and standing for any unit, subunit or skill ----------
   Practice done is the share of the class's questions there that the student tried. The level is their standing: on the unit's key skills,
   on a lesson's skills, or on the one skill (secure reads as proficient there). */
const nodeItems=n=>n.t==='u'?TB0[n.id].js.flatMap(j=>SUBS[j].on?SUBS[j].its:[]):n.t==='j'?(SUBS[n.id].on?SUBS[n.id].its:[]):
  (n.j!==undefined&&SUBS[n.j].its.some(ix=>IT[ix].ks.includes(n.id))?SUBS[n.j].its.filter(ix=>IT[ix].ks.includes(n.id)):KIT[n.id].filter(ix=>CI[ix]));
const nodeSkills=n=>n.t==='u'?uSk(0,n.id):n.t==='j'?jSk(0,n.id):[n.id];
const cellMemo=new Map();
function cellN(i,tb,n){const key=i+n.t+n.id+(n.t==='k'&&n.j!==undefined?'/'+n.j:'');let b=cellMemo.get(key);
  if(b===undefined){const its=nodeItems(n);if(!its.length)b=null;else{let d=0;its.forEach(ix=>{if(AT[i].has(ix))d++});const k=n.id,c=CAT[i][k];
    const st=n.t==='u'?standU(i,k):n.t==='j'?standJ(i,k):{s:c==='F'?'P':c==='H'?'D':c==='E'?'N':'Q',f:EV[i][k]>=2&&CUR[i][k]!==null?CUR[i][k]:0,n:c==='E'?1:0,close:c==='F'||EV[i][k]<2?[]:[k],e:EV[i][k]>=2?1:0};
    b={e:d/its.length,lab:its.every(ix=>IT[ix].lab),st}}cellMemo.set(key,b)}
  if(!b)return {g:'x'};
  /* a unit or lesson of labs is work done, with no level: a student is doing the labs, or not */
  if(b.lab){const doing=b.e>=S.v2.line/100;return {e:b.e,m:null,mc:'L',lab:true,doing,st:b.st,g:doing?'labs':'off'}}
  const e=b.e,mc=b.st.s==='X'||b.st.s==='Q'?'U':b.st.s,doing=e>=S.v2.line/100,high=mc==='M'||mc==='P';   // too early to tell draws as the hollow mark
  return {e,m:b.st.f,mc,doing,st:b.st,g:doing?(high?'on':mc==='D'?'go':mc==='N'?'stuck':'early'):(high?'coast':'off')}}
const cell2=(i,n)=>cellN(i,0,n);
const KS2={u:u=>({t:'u',id:u}),j:j=>({t:'j',id:j}),k:k=>({t:'k',id:k})};
/* what a cell says of itself */
const cellTip=(i,c,name)=>`<b>${NM[i]} · ${name}</b><br>${c.lab?GLAB[c.g]:c.mc==='U'?SL.U:SL[c.mc]}${!c.lab&&c.mc!=='U'&&c.st.e?` · secure on ${c.st.e-c.st.close.length} of ${c.st.e} ${c.st.e===1?'skill':'skills'}`:''}<br><span>Tried ${Math.round(c.e*100)}% of the class’s questions${c.doing?'':' · under the line'}</span>`;

/* ---------- view 3: effort, in five-day blocks ----------
   A student's work in a block is the questions they first tried in it, on any unit: a student catching up on an earlier unit, or working
   ahead, is working. A block in which nobody in the class worked is a break and is left out. A student's normal is the middle of their
   earlier blocks that were not breaks (the latest two left out, so a recent fall does not set the normal); low is under half of it.
   Drifting = low in the last five days and in the live block before, judged only while classmates are not low too: when the class as a
   whole has stopped or slowed, the page says so and singles out nobody. */
const WB=ALL.map(i=>{const a=new Array(NBK).fill(0);AT[i].forEach(a0=>{const d=a0[6];if(d<=TODAY){const j=blockOf(d);if(j>=0)a[j]++}});return a});
const CTOT=Array.from({length:NBK},(_,j)=>sum(ALL.map(i=>WB[i][j]))),ONB=CTOT.map(t=>t>0);
const NORM=ALL.map(i=>{const v=[];for(let j=0;j<NBK-2;j++)if(ONB[j])v.push(WB[i][j]);return v.length>=3?qt(v,.5):null});
const LOWB=(i,j)=>NORM[i]!==null&&ONB[j]&&WB[i][j]<NORM[i]/2;
const RB=NBK-1,RSTART=BS(RB);   // the recent block: the last five days
const CLASSIDLE=!ONB[RB],NJUDGE=ALL.filter(i=>NORM[i]!==null).length,NLOW=ALL.filter(i=>LOWB(i,RB)).length;
const CNORM=(function(){const v=[];for(let j=0;j<NBK-2;j++)if(ONB[j])v.push(CTOT[j]);return v.length?qt(v,.5):0})();   // the class's usual work in five days
const CLASSLOW=!CLASSIDLE&&NJUDGE>0&&NLOW>=NJUDGE/2;
/* a book the class has used for a few days gives too little work to judge drifting: then nobody is judged, and the page says so */
const TOOFEW=MULTI&&PICK!==null&&ONB.filter(Boolean).length<4;
const JUDGE=!TOOFEW&&!CLASSIDLE&&!CLASSLOW;
const prevLive=j=>{let p=j-1;while(p>=0&&!ONB[p])p--;return p};
/* DR[i] = the first day of the run of low blocks that reaches today, or -1 */
const DR=ALL.map(i=>{if(!JUDGE||!LOWB(i,RB))return -1;const p=prevLive(RB);if(p<0||!LOWB(i,p))return -1;let j=p,q=prevLive(j);while(q>=0&&LOWB(i,q)){j=q;q=prevLive(j)}return BS(j)});
const WATCH=ALL.map(i=>JUDGE&&DR[i]<0&&LOWB(i,RB));
/* for a demo, the Drifting page opens on the latest day it can judge: at the export date the class may be idle or winding down, and the page would say so and
   name nobody. DEMODAY is the latest day on which the class was working and fewer than half were low, by the same rules as above; the page moves to it
   when it is opened without a day in the address, the address then says the day, and "Back to today" returns to the export date */
const DEMODAY=(function(){const PS=ALL.map(i=>{const c=new Array(EXPORTDAY+2).fill(0);AT[i].forEach(a=>{if(a[6]<=EXPORTDAY)c[a[6]+1]++});for(let k=1;k<c.length;k++)c[k]+=c[k-1];return c});
  const judgeAt=d=>{const nb=Math.ceil((d+1)/B5),be=j=>d-B5*(nb-1-j),bs=j=>Math.max(0,be(j)-B5+1),rb=nb-1,sumB=(i,j)=>PS[i][be(j)+1]-PS[i][bs(j)];
    const ctot=[];for(let j=0;j<nb;j++){let t=0;ALL.forEach(i=>{t+=sumB(i,j)});ctot.push(t)}if(!ctot[rb])return false;
    let nj=0,nl=0;ALL.forEach(i=>{const v=[];for(let j=0;j<nb-2;j++)if(ctot[j])v.push(sumB(i,j));if(v.length<3)return;nj++;if(sumB(i,rb)<qt(v,.5)/2)nl++});return nj>0&&nl<nj/2};
  for(let d=EXPORTDAY;d>=4;d--)if(judgeAt(d))return d;return EXPORTDAY})();
/* the signals beside each line: days with no work in the last five, assigned sets not finished, and the change in accuracy over the last 30 days */
const SIG={};NM.forEach((n,i)=>{let miss=0;for(let d=RSTART;d<=TODAY;d++)if(!ACTD[i].has(d))miss++;const work=D.coursework.filter(c=>c.due<=TODAY&&c.due>TODAY-35&&!c.done.includes(i)).length;
  const base=[],late=[];AT[i].forEach((a,ix)=>{if(!EVOK(ix)||a[6]>TODAY)return;if(a[6]>TODAY-30)late.push(credit(a));else base.push(credit(a))});
  const acc=base.length>=5&&late.length>=5?Math.round((avg(late)-avg(base))*100):0;
  SIG[n]={acc,miss,work,of:TODAY-RSTART+1}});
/* work on units the class has moved past (catching up) or has not started (working ahead); shown on the profile only */
function sideWork(i){const back=[],ahead=[];TB0.forEach((U,u)=>{if(U.lab)return;let n=0,last=-1;U.js.forEach(j=>VJ[j].items.forEach(ix=>{const a=AT[i].get(ix);if(!a||a[6]>TODAY)return;if(U.on){if(u!==CU&&U.d&&a[6]>U.d[1]){n++;last=Math.max(last,a[6])}}else{n++;last=Math.max(last,a[6])}}));if(n)(U.on?back:ahead).push({u,n,last})});return {back,ahead}}

/* ---------- view 6: shared weak skills ----------
   A skill is a shared weakness when a fifth of the class or more is "not yet" on it at the same time (mastery under 60% on two or
   more checks). One lifeline per skill: its thickness is the share of the class not yet secure on it at the end of each five-day block, so a
   line that thins is a skill the class is getting on top of. */
const SG={'Getting worse':'p','Still weak':'p',Improving:'f',Recovered:'g'};
const SC={p:['var(--bad)','tbad','Still weak','bad'],f:['var(--neutral)','t2','Improving','neutral'],g:['var(--gone)','tgone','Recovered','gone']};
const WEAK=(function(){const rows=[];
  TSK.forEach(k=>{if(!chk5(k))return;const cnt=[];for(let j=0;j<NBC;j++)cnt.push(ALL.filter(i=>STW[i][k][j]===0).length);
    const v=cnt.map(c=>Math.round(c/N*100)),peak=Math.max(...v),now=v[NBC-1];if(peak<20||Math.max(...cnt)<5)return;
    const pw=v.indexOf(peak),ago=v[Math.max(0,NBC-7)],st=now<8?'Recovered':now<=peak*.6?'Improving':now-ago>=10?'Getting worse':'Still weak';   // worse: up 10 points over 30 days
    const who=ALL.filter(i=>STW[i][k][NBC-1]===0),was=ALL.filter(i=>STW[i][k][pw]===0&&!who.includes(i));
    rows.push({k,n:cut(D.skills[k],36),v,st,now:who.map(i=>NM[i]),peak:was.map(i=>NM[i]),pkv:peak,lastv:now,pwd:BE(pw)})});
  const pick=(f,key)=>rows.filter(r=>SG[r.st]===f).sort((a,b)=>key(b)-key(a)||a.k-b.k);
  return pick('p',r=>r.lastv).concat(pick('f',r=>r.pkv-r.lastv),pick('g',r=>r.pkv))})();

/* how many of the still-weak skills each student is weak in. A student is flagged for being in the top quarter of the class on that count, and flagged red in the top tenth */
const WEAKN=ALL.map(i=>WEAK.filter(m=>SG[m.st]==='p'&&m.now.includes(NM[i])).length),WEAKQ=qt(WEAKN,.75),WEAKT=qt(WEAKN,.9);

/* ---------- view 7: stall points ----------
   A started subunit's content is the class's questions in it, in textbook order. Each student's outcome on each:
   0 right first time, 1 right after retries, 2 gave up (tried, never right), 3 skipped (never tried).
   A task with no working check (kind r) only shows who tried it. Reading and video opens are not recorded
   reliably for this class, so they are left out. */
const ctOf=(tb,j)=>SUBS[j].on?SUBS[j].its.map(ix=>[IT[ix].name,IT[ix].lab?'l':NOCHK[ix]?'r':'q',ix]):[];
const cMemo={};
function cOut(tb,j){if(cMemo[j])return cMemo[j];return cMemo[j]=(SUBS[j].on?SUBS[j].its:[]).map(ix=>ALL.map(i=>{const a=AT[i].get(ix);return !a?3:NOCHK[ix]?0:a[9]===1?0:a[4]?1:2}))}
const cCnt=(tb,j)=>cOut(tb,j).map(o=>{const c=[0,0,0,0];o.forEach(x=>{c[x]++});return c});
const STALL={},XSTALL={};

/* ---------- item quality, used when a practice set is built ----------
   It has no page of its own (the Item health page was removed), but a practice set still leaves out questions that are broken or misleading.
   p = share who earned full credit; d = that share in the stronger half of the class minus the weaker half
   (halves by each student's average credit on everything else). Broken = a bug report, or no working check. */
const OVERALL=ALL.map(i=>{const c=[];AT[i].forEach((a,ix)=>{if(EVOK(ix))c.push(credit(a))});return c.length?avg(c):0});
const HALF=(function(){const o=ALL.slice().sort((a,b)=>OVERALL[b]-OVERALL[a]||a-b),top=new Set(o.slice(0,Math.ceil(N/2)));return i=>top.has(i)})();
const BUG={};D.bugs.forEach(([ix,st,t])=>{if(t&&!BUG[ix])BUG[ix]=t.replace(/''/g,'’').replace(/'/g,'’')});
/* the bank is every book's questions but the labs: a practice set may pull from any book */
const ITEMS=[];IT.forEach(it=>{const ix=it.ix,who=IWHO[ix];if(!CIALL[ix]||it.lab||who.length<10)return;const full=i=>credit(AT[i].get(ix))===1,T=who.filter(HALF),B=who.filter(i=>!HALF(i));
  const p=pc(who.filter(full).length,who.length),pt=T.length?pc(T.filter(full).length,T.length):p,pb=B.length?pc(B.filter(full).length,B.length):p;
  const br=NOCHK[ix]?'Nothing marks it right':BUG[ix]?cut(BUG[ix],64):null;
  ITEMS.push({id:ITEMS.length,ix,tb:it.tb,name:it.name,u:it.u,j:it.j,f:it.f,k:it.ks.length?it.ks[0]:-1,p,pt,pb,d:Math.round(pt-pb)/100,n:who.length,
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
const READY={};VU.forEach((U,u)=>{READY['0:'+u]=(U.pre||[]).map(([k,j])=>({k,f:esc(cut(bkTag(D.units[D.subs[j].u].tb)+D.subs[j].code+' '+D.subs[j].name,22)),c:null}))});   // pre names lessons of any book

/* ---------- where the class is: the unit and subunit with its latest work. Nothing is assumed about what comes next. ---------- */
const TAUGHT=TB0.map((_,u)=>u).filter(u=>TB0[u].on);
const TAUGHTJ=TB0.flatMap(U=>U.js.filter(j=>SUBS[j].on));
/* with several books, the main book sets where the class is; with one picked, that book does */
const CUA=TAUGHT.filter(u=>!MULTI||PICK!==null||TB0[u].tb===MAIN),CU=(CUA.length?CUA:TAUGHT).slice().sort((a,b)=>TB0[b].mid-TB0[a].mid)[0]||0;
/* the units a tree lists: under "All books" the labs are left out (a lab is not ranked with a question) and named under the list; the bands of time on a chart are the main book's */
const TREEU=TB0.map((U,u)=>u).filter(u=>!(MULTI&&PICK===null&&TB0[u].lab)),BANDU=TAUGHT.filter(u=>!MULTI||PICK!==null||TB0[u].tb===MAIN);
const CJ=TB0[CU].js.filter(j=>SUBS[j].on).sort((a,b)=>SUBS[b].mid-SUBS[a].mid)[0]||0;
const NU=-1,NXT=TB0[CU].n,NXTWHEN='';
const XKS=jSk(0,CJ).filter(chk5).slice(0,2);
const PRE=(READY['0:'+CU]||[]).filter(q=>taught(q.k)&&chk5(q.k));
/* how many of those skills each student is not secure on, and the class median: a gap most of the class shares is a class finding, not a flag on a student */
const PREGAP=ALL.map(i=>PRE.filter(q=>CAT[i][q.k]==='E'||CAT[i][q.k]==='H').length),PREMED=PREGAP.length?qt(PREGAP,.5):0;
const DRAFT={},PROBE=[],PROBEF='MCQ';

/* ---------- pace: a target unit's skills, by a chosen date ----------
   Count the target's key skills and the earlier skills its lessons use, once each. Earlier skills come from the same book's coverage,
   not every skill in every preceding unit. Read all lessons, including unstarted ones: the readiness export's top four prerequisites
   would omit some of the target's requirements. Evidence may come from any book; labs and broken checks stay out of it.
   Project net gains in the 30-day period ending at each student's latest check on this exact set, capped at its size.
   Extend from the selected As of day to the goal date, assuming work continues (or resumes) at that observed pace.
   Do not extrapolate across the unrecorded gap from the last check to As of. Missing history stays unknown. */
const STU=TAUGHT.filter(u=>!TB0[u].lab&&(!MULTI||PICK!==null||TB0[u].tb===MAIN));   // the started units a student has a standing in
const PS=[['Short, not catching up','var(--bad)','tbad','bad'],['Short, but catching up','var(--watch)','twatch','watch'],['Ahead now, but slowing','var(--watch)','twatch','watch'],['On pace','var(--neutral)','t2','neutral'],['Ahead','var(--good)','tgood','good'],['Too early to tell','var(--neutral)','t3','neutral']];
const PSI={};PS.forEach((p,ix)=>{PSI[p[0]]=ix});
const paceUnits=()=>TB0.map((U,u)=>u).filter(u=>!TB0[u].lab&&(!MULTI||PICK!==null||TB0[u].tb===MAIN));
const paceScopeMemo=new Map(),paceMemo=new Map();
function paceScope(u){if(paceScopeMemo.has(u))return paceScopeMemo.get(u);
  const U=TB0[u],du=DUI[u],earlier=new Set();
  if(U.lab){const o={target:[],previous:[],ks:[],first:TODAY};paceScopeMemo.set(u,o);return o}
  D.units.forEach((B,b)=>{if(b<du&&B.tb===U.tb&&!LABB[B.tb])B.subs.forEach(j=>D.subs[j].skills.forEach(([k,t])=>{if(t)earlier.add(k)}))});
  const used=[...new Set(U.js.flatMap(j=>jSk(0,j)))];
  const real=k=>KIT[k].length>=3&&KIT[k].filter(ix=>IT[ix].f==='Parsons').length<KIT[k].length*.9;
  const target=KEY[u].length?KEY[u].slice():used.filter(k=>!earlier.has(k)&&LISTED[k]>=2&&real(k));
  const previous=used.filter(k=>earlier.has(k)&&real(k)&&!target.includes(k));
  const ks=[...new Set(target.concat(previous))],days=ks.map(k=>KT[k]).filter(d=>d!==null);
  const o={target,previous,ks,first:days.length?Math.min(...days):TODAY};paceScopeMemo.set(u,o);return o}
const PACE_WINDOW=30;
const paceNum=n=>String(Math.round(n*10)/10);
function paceOf(i){const {u,day}=S.v4,key=i+':'+u+':'+day;if(paceMemo.has(key))return paceMemo.get(key);
  const scope=paceScope(u),goal=scope.ks.length,days=new Set();
  scope.ks.forEach(k=>(EVD[i][k]||[]).forEach(e=>{if(e.d<=TODAY)days.add(e.d)}));
  const end=days.size?Math.max(...days):null,start=end===null?TODAY:Math.max(FIRSTWORK-1,end-PACE_WINDOW),prev=Math.max(FIRSTWORK-1,start-PACE_WINDOW);
  const count=d=>scope.ks.filter(k=>{const e=estOf(i,k,d);return e&&e.ev>=2&&e.c>=.8}).length;
  const now=count(TODAY),before=count(start),rec=end!==null&&end>start?(now-before)/(end-start):0,ear=start>prev?(before-count(prev))/(start-prev):0;
  const checked=scope.ks.filter(k=>{const e=estOf(i,k,TODAY);return e&&e.ev>=2}).length;
  const enough=goal>0&&checked>=Math.min(2,goal)&&(now===goal||days.size>=2),proj=enough?Math.min(goal,now+Math.max(0,rec)*Math.max(0,day-TODAY)):null;
  const due=goal*clamp((TODAY-scope.first+1)/Math.max(1,day-scope.first+1),0,1);let st;
  if(!enough)st='Too early to tell';
  else if(now===goal)st='Ahead';
  else if(day>TODAY&&now>=due&&rec<ear-.5/PACE_WINDOW)st='Ahead now, but slowing';
  else if(proj>=goal)st=now>=due+2?'Ahead':'On pace';
  else st=rec>0&&rec>ear+.5/PACE_WINDOW?'Short, but catching up':'Short, not catching up';
  const close=scope.ks.filter(k=>{const e=estOf(i,k,TODAY);return !e||e.ev<2||e.c<.8});
  const o={now,rec,ear,start,end,due,proj,st,goal,checked,close,behind:enough&&proj<goal,key:PS[PSI[st]][3],label:st};paceMemo.set(key,o);return o}
const paceSummary=p=>`${p.now} of ${p.goal} secure now${p.proj===null?' · more checks needed':` · about ${paceNum(p.proj)} by ${dayDateY(S.v4.day)}`}`;

/* ---------- view 11: practice sets the teacher targeted ----------
   For each set: students who did it against classmates who didn't, on the change in credit on later questions that
   check the same skills (questions in the set itself are left out). The range is the middle 90% of 400 resamples. */
const IVS=D.sets.map((st,sx)=>{const did=[...new Set(st.rows.map(r=>r[0]))],own=new Set(st.rows.map(r=>r[1])),kc={};
  own.forEach(ix=>IT[ix].ks.forEach(k=>{kc[k]=(kc[k]||0)+1}));const ks=Object.keys(kc).map(Number).sort((a,b)=>kc[b]-kc[a]).slice(0,4),kset=new Set(ks);
  const chg=i=>{const pre=[],post=[];AT[i].forEach((a,ix)=>{if(!EVOK(ix)||!IT[ix].ks.some(k=>kset.has(k)))return;if(a[6]<st.day)pre.push(credit(a));else if(a[6]>st.day+2&&!own.has(ix))post.push(credit(a))});return pre.length>=2&&post.length>=2?avg(post)-avg(pre):null};
  const A=did.map(chg).filter(v=>v!==null),B=ALL.filter(i=>!did.includes(i)).map(chg).filter(v=>v!==null);let est=null,lo=null,hi=null;
  if(A.length>=4&&B.length>=4){est=Math.round((avg(A)-avg(B))*100);const r=rng(900+sx),bs=[],pick=a=>a.map(()=>a[Math.floor(r()*a.length)]);for(let q=0;q<400;q++)bs.push((avg(pick(A))-avg(pick(B)))*100);bs.sort((x,y)=>x-y);lo=Math.round(bs[20]);hi=Math.round(bs[379])}
  return {n:esc(st.name),sn:esc(st.name),who:did.map(i=>NM[i]),when:dayDate(st.day),day:st.day,est,lo,hi,na:A.length,nb:B.length,ks,
    dose:`${own.size} questions · ${dayDate(st.day)}`,
    cmp:est===null?`only ${A.length+B.length} students have later work to compare`:`${A.length} who did it vs ${B.length} who didn’t`,
    rec:est===null?'Check again after more work.':lo>0?'Keep it.':est>=5?'Promising. Check again after the next unit.':'No clear effect yet.'}});
const verdict=d=>d.est===null?{t:'Too early to tell',c:'',m:'var(--neutral)',k:'t3'}:d.lo>0?{t:'Worked',c:'good',m:'var(--good)',k:'tgood'}:d.est>=5?{t:'Promising, not proven',c:'watch',m:'var(--watch)',k:'twatch'}:{t:'No clear effect',c:'neutral',m:'var(--neutral)',k:'t2'};
/* invented rows from data/sample.js, so this view's chart has something to show. Each carries sample:true and is marked "sample" wherever it appears.
   The list then runs from what clearly worked down to what can't be judged yet */
((window.ATLAS_SAMPLE||{}).interventions||[]).forEach(d=>{const who=d.who==='all'?NM.slice():(d.who||[]).map(esc).filter(n=>ID[n]!==undefined);if(who.length<3)return;
  IVS.push({n:esc(d.n),sn:esc(d.sn||d.n),who,when:esc(d.when||''),est:d.est,lo:d.lo,hi:d.hi,dose:esc(d.dose),cmp:esc(d.cmp),rec:esc(d.rec),sample:true})});
IVS.sort((a,b)=>{const r=d=>d.est===null?3:d.lo>0?0:d.est>=5?1:2;return r(a)-r(b)||(b.est||0)-(a.est||0)});

/* no work in the last five days, while the class was working */
const NOWORK=i=>JUDGE&&WB[i][RB]===0;
const RULE0={};

/* ---------- state ---------- */
/* page ids: 0 was the overview (removed), 2 effort and mastery, 3 drifting, 4 pace, 5 hardest content, 6 shared weak skills, 7 stall points, 9 fading, 10 readiness, 11 what worked.
   Ids 1 and 8 were the lesson replay ("Attention now") and Item health, which were removed; the other ids stayed as they were, so flags, links and the action log still point at the same pages.
   The number a teacher sees on a tab is not the id but the page's priority (PRI, below). State keys keep their original names (v6 = hardest content, v7 = shared weak skills, and so on). */
const S={view:2,stu:null,log:[],
  v2:{tb:0,at:{u:null,j:null},pg:0,sel:{t:'u',id:0},sort:'start',line:60},
  v3:{all:false},
  v4:{u:0,day:TODAY+30,sort:'status'},
  v6:{tb:0,sort:'hard',ex:{},sel:{},xf:'all'},
  v7:{r:0,f:'all',more:false,view:'weak',u:'all'},
  v8:{tb:0,ex:{},sel:{},sort:'course',view:'worst'},
  v10:{u:'all',all:false,k:-1},
  v11:{th:60,tb:0,u:{},rm:{},acc:{}},
  v12:{r:0,f:'all'},
  td:{gen:null,rm:{},ex:{},bud:{}},fold:{},prof:0};
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
/* a part of a page one click away, remembering whether it is open */
const fold=(id,sum,body)=>`<details class="fold" data-fold="${id}"${S.fold[id]?' open':''}><summary>${sum}</summary>${body}</details>`;
const duo=(a,left,right,cls)=>a?`<div class="duo${cls?' '+cls:''}" style="--a:${a}px;grid-template-columns:${a}px minmax(0,1fr)"><div class="duo-a">${left}</div><div class="duo-b">${right}</div></div>`:left+right;

/* ---------- view meta ---------- */
const VM=[null, /* id 0: the overview, removed; a student's flags live in the bar for a followed student, and the next step on their profile */
null, /* id 1: the lesson replay, removed */
{q:'Who is doing the work, and is it turning into mastery?',k:'Effort and mastery grid',s:'Effort and mastery',w:'Weekly'},
{q:'Who is drifting, and since when?',k:'Watchlist with normal ranges',s:'Drifting',w:'Weekly'},
{q:'Will each student reach the target unit’s key skills by the goal date?',k:'Pace tracks',s:'On pace',w:'Every fortnight'},
{q:'Which units, subunits and skills are hardest?',k:'Ranked bars',s:'Skills · by unit',w:'End of each unit'},
{q:'Which skills are many students weak in, and which first?',k:'Weekly areas',s:'Skills',w:'Weekly'},
{q:'Where do students stall, skip or give up?',k:'Stacked bars',s:'Stall points',w:'After each lesson'},
null, /* id 8: item health, removed */
{q:'Which skills fade after they’re taught?',k:'Before and after',s:'Skills · faded',w:'Monthly'},
{q:'Which unit do you teach next, and is the class ready for it?',k:'Readiness tree',s:'Ready for a unit',w:'Before each unit'},
{q:'What have I done, and did it work?',k:'Log and effect ranges',s:'My actions',w:'After each change'}];
/* Each page's priority: how much its question helps a teacher who is teaching this class, 1 the most. It is a judgement, kept in this one
   list, and it sets the order of the rail and of a student's flags. No number is shown: a first-time teacher read the numbers as counts.
   Pages 5 (by unit) and 9 (faded) are views of the Skills page (6) now, and keep their ids so that flags and the log still point at them. */
const PRI=[[6,'what to reteach to the whole class'],[2,'who needs a reteach, and who needs a nudge'],[3,'catches a student who is slipping away, early'],
  [10,'what to shore up before the next unit'],[7,'where the material loses students'],[4,'who is projected to miss the unit goal'],[11,'what you did, and whether it worked']];
const PN={},PWHY={};PRI.forEach(([k,why],ix)=>{PN[k]=ix+1;PWHY[k]=why});PN[5]=PN[6]+.4;PN[9]=PN[6]+.5;PWHY[5]=PWHY[9]=PWHY[6];
/* the groups in the rail, each in priority order */
const GROUPS=[['Students',[2,3,4]],['Content',[6,7]],['Act and check',[10,11]]].map(([g,ks])=>[g,ks.slice().sort((a,b)=>PN[a]-PN[b])]);
/* a page's name in the address bar, so a link doesn't depend on any numbering; the old names still open the page they named */
const SLUG={2:'effort',3:'drifting',4:'pace',5:'hardest',6:'skills',7:'stall-points',9:'fading',10:'ready',11:'actions'};
const OLDSLUG={'overview':2,'weak-skills':6,'worked':11};   // the old names still open a page: the overview's link lands on the first page
/* with several books, two sentences are added to the pages that show them (below, after the list) */
const HOW=['', /* id 0: the overview, removed */
'', /* id 1: removed */
'Everyone in the unit on show, placed by the share of its questions they tried (across) and of its key skills they are secure on (up). Red regions need a step; the cards name who and offer it. Folded under the chart, every student by unit, with the same marks as the key above.',
'One row per student working less than their own normal. The line is the questions they tried per five days, on any unit; the gray band is their own normal range. Red is where it stays under half their normal while the class is working. Hatched stretches had no class work.',
'Pick a unit and date. Only its key skills and earlier skills used here count. Solid bars show secure now; dashed bars estimate gains by your date, assuming learning continues at each student’s latest observed pace. Black is the goal; dotted is today’s share. Hover for the evidence dates.',
'Units open into subunits, and subunits into their skills. Each bar splits the students checked: red not yet, amber developing, green secure; the figure is the share not secure. A skill no question checks has no bar, nor one that fewer than eight students were checked on.',
'One row a skill a fifth of the class is weak in. The area is the share of the class not yet secure, five days at a time; the bar and figure are who is not yet secure now. Rows run by status, worst first. Click a row for names and a reteach.',
'Worst questions first: where the most students gave up (tried, never right) or skipped (never tried). Each bar splits the class: red gave up, amber skipped, pale green needed retries, green first time. By unit opens the whole outline. Only questions a quarter of the class tried count.',
'', /* id 8: removed */
`One row a skill eight or more students met again ${LATER} and whose average fell 8 points or more. The open dot is the average when taught, the solid dot the later check. Tick Show all for every rechecked skill. Click a skill for every student.`,
'Pick the unit you teach next. Under it are the skills it builds on; each ring is the share of students secure now: red below your line, amber under 80%, green ready. A dashed ring is a skill not taught yet or not checked. The cards are the plan.',
'Everything you logged today, newest first. Below it, each practice set you targeted: the dot is the extra points gained against students who did not do it, the bar the range it could be; a bar right of zero worked. Sample rows are invented and fenced off.'];
if(MULTI){const BK=` The Book row keys each book to a letter; a book narrows the page to its units and the skills they use. A level counts every book’s questions, so it does not change with the book. A unit of labs is work done, not a check: a gray bar, no level.`;
  HOW[2]+=BK+' Columns are grouped by book.';[3,4,5,6,7,9,10].forEach(k=>{HOW[k]+=BK})}
const TBL=[
['Class and outline','Students; every unit, subunit and question, in textbook order','section, section_user, app_user, curriculum_unit_order, unit, curriculum_unit_item, item','Real. Names are the anonymised ones'],
['Effort and mastery','Questions tried, and credit on each skill’s questions','interaction_summary, item_skill, unit_skill_coverage','Real'],
['Drifting','Questions tried per five days, on any unit, against each student’s own normal; assigned sets finished','interaction_summary, student_activity_hour, coursework, coursework_status','Real. Attendance isn’t recorded'],
['On pace','Target unit’s key skills and earlier skills it uses; secure-skill gains in the 30-day period ending at each student’s latest check','As Effort and mastery','Real evidence; conditional projection if learning continues or resumes at the latest observed pace. Earlier skills inferred from textbook coverage'],
['Skills · by unit','Students not secure on each skill','As Effort and mastery','Real'],
['Skills','Students not yet secure on each skill, five days at a time','As Effort and mastery','Real'],
['Stall points','Each student’s outcome on each question','interaction_summary','Real. Reading and video opens left out'],
['Skills · faded','Credit when taught against later checks','interaction_summary, coursework_item','Real'],
['Ready for a unit','Earlier skills each unit uses most','unit_skill_coverage','Approximate. The skill graph is outside the database'],
['My actions','What you logged; later credit for students who did a targeted set','coursework, coursework_item, interaction_summary','One real set. Rows marked sample are invented (data/sample.js)']];
if(BOOKS.length>1)TBL.splice(1,0,['Books','Which book each unit, lesson, question and assignment is in. A skill is shared by the books that check it','section_curriculum, curriculum, coursework.curriculum_id',EX?'The list and the main book are real; the added books’ outlines are real and their work is invented (data/example.js)':'Real']);

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
/* a picker with many options (a unit, a book) is one select, not a row of buttons; opts are [value,label] pairs, or [group,[pairs]] groups */
const selOpt=(cur,o)=>`<option value="${o[0]}"${String(cur)===String(o[0])?' selected':''}>${o[1]}</option>`;
const pickCtl=(id,cur,opts,label)=>`<label class="sel" for="${id}">${label} <select id="${id}">${opts.map(o=>Array.isArray(o[1])?`<optgroup label="${o[0]}">${o[1].map(x=>selOpt(cur,x)).join('')}</optgroup>`:selOpt(cur,o)).join('')}</select></label>`;
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
const vFrom=v=>v==='p'?'Profile':VM[v]?VM[v].s:'';
function renderLogChip(){const c=$('#logchip'),n=$('#logn');if(!c||!n)return;n.textContent=S.log.length;c.classList.toggle('has',S.log.length>0)}

/* ---------- per-student flags across views ---------- */
const slipped=i=>TSK.filter(k=>ML[i][k]!==null&&MT[i][k]-ML[i][k]>=.2);
function flags(i){const n=NM[i],f=[];
  const gu={};TAUGHT.forEach(u=>{gu[u]=cell2(i,KS2.u(u)).g});const st=TAUGHT.filter(u=>gu[u]==='stuck'),of=TAUGHT.filter(u=>gu[u]==='off'),co=TAUGHT.filter(u=>gu[u]==='coast');
  if(NOWORK(i))f.push({v:2,l:'bad',t:'No work in the last 5 days'});
  if(st.length)f.push({v:2,l:st.length>=2?'bad':'watch',t:`Stuck · ${st.length>=2?st.length+' units':UN[st[0]][0]}`});
  if(of.length)f.push({v:2,l:of.length>=2?'bad':'watch',t:`Not doing the work · ${of.length>=2?of.length+' units':UN[of[0]][0]}`});
  if(co.length)f.push({v:2,l:'good',t:`Coasting in ${andList(co.map(u=>UN[u][0]))}`});
  if(DR[i]>=0)f.push({v:3,l:'bad',t:`Drifting since ${dayDate(DR[i])}`});else if(WATCH[i])f.push({v:3,l:'watch',t:'Working less in the last 5 days'});
  const p=paceOf(i);if(p.behind||p.st==='Ahead')f.push({v:4,l:p.key,t:p.label+' · '+TB0[S.v4.u].s+' · '+paceSummary(p)});
  if(WEAKN[i]>=3&&WEAKN[i]>WEAKQ)f.push({v:6,l:WEAKN[i]>WEAKT?'bad':'watch',t:`Weak in ${WEAKN[i]} of the ${WEAK.filter(m=>SG[m.st]==='p').length} shared weak skills`});
  const o8=cOut(0,CJ).map(o=>o[i]),g8=o8.filter(x=>x===2).length,k8=o8.filter(x=>x===3).length;
  if(g8>=2)f.push({v:7,l:'watch',t:`${LABV?'Not right yet on':'Gave up on'} ${g8} · ${SUBS[CJ].s}`});if(k8>=3&&k8>=o8.length/2&&o8.some(x=>x<3))f.push({v:7,l:'watch',t:`Skipped ${k8} of ${o8.length} · ${SUBS[CJ].s}`});
  const sl=slipped(i),rc=TSK.filter(k=>ML[i][k]!==null).length,sp=rc>=6?sl.length/rc:0;if(sp>=.4)f.push({v:9,l:'bad',t:`Slipped on ${sl.length} of ${rc} skills`});else if(sp>=.3)f.push({v:9,l:'watch',t:`Slipped on ${sl.length} of ${rc} skills`});
  if(PRE.length){const nr=PREGAP[i];if(nr>=2&&nr>PREMED)f.push({v:10,l:nr===PRE.length?'bad':'watch',t:`${nr} of ${PRE.length} gaps · ${TB0[CU].s}`});else if(PRE.every(q=>CAT[i][q.k]==='F'))f.push({v:10,l:'good',t:`Ready · ${TB0[CU].s}`})}
  const iv=IVS.filter(d=>!d.sample&&d.who.length<N&&d.who.includes(n));if(iv.length)f.push({v:11,l:'neutral',t:`Did ${iv.length} targeted practice ${pl(iv.length,'set')}`});
  return f}

/* a unit in a picker: its number and name, with where the class is; under "All books" the units are grouped by book */
const unitOpt=u=>[String(u),`${TB0[u].s.replace(/^[A-Z] · /,'')} · ${TB0[u].nb}${u===CU?' (now)':TB0[u].on?' (done)':''}`];
const unitOpts=us=>MULTI&&PICK===null?BKON.map(tb=>[`${BL[tb]} · ${BOOKS[tb].s}`,us.filter(u=>TB0[u].tb===tb).map(unitOpt)]).filter(g=>g[1].length):us.map(unitOpt);

/* ---------- view 2: effort and mastery, per textbook, with unit, subunit and skill drill-down ---------- */
const nodeName=(n,tb)=>{tb=tb===undefined?S.v2.tb:tb;return n.t==='u'?TBU(tb,n.id).n:n.t==='j'?TBJ(tb,n.id).n:ASK[n.id]};
const nodeUnit=n=>n.t==='u'?n.id:n.t==='j'?uOfJ(n.id):(n.j!==undefined?uOfJ(n.j):uOf(n.id));
const LEVEL2={u:'Unit',j:'Subunit',k:'Skill'};
const MCOL={S:['var(--m-mas)','var(--bg-good)'],D:['var(--watch)','var(--bg-watch)'],N:['var(--bad)','var(--bg-bad)'],U:['var(--neutral)','var(--surface-2)']};
const MLAB={M:'Mastered',P:'Proficient',D:'Developing',N:'Not yet',U:'Too early',L:'Labs: no level'};
const GLAB={on:'On track',go:'Keep going',stuck:'Stuck despite effort',early:'Too early to tell',coast:'Coasting',off:'Not doing the work',labs:'Doing the labs'};
/* standing is one colour, pale to dark: not yet, developing, proficient, mastered. Red is kept for the two problem marks: the practice bar under a cell when it is under the line (amber when coasting), and the dot for stuck despite effort */
const MRAMP={M:'var(--ms-m)',P:'var(--ms-s)',D:'var(--ms-d)',N:'var(--ms-n)'};
const RAMPKEY=()=>`<span class="ramp">${['N','D','P','M'].map(m=>`<i class="sw" style="background:${MRAMP[m]}"></i>`).join('')}Not yet → mastered</span>`;
const effCol=c=>c.doing?'var(--axis)':c.g==='coast'?'var(--watch)':'var(--bad)';
function cellMark(x,y,w,h,c){const fh=Math.max(6,h-5),eb=y+fh+2,ew=Math.max(1.5,w*clamp(c.e||0,0,1));
  /* a labs cell is one gray bar, the share of the labs tried, red when under the line: work done, no level */
  if(c.mc==='L')return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="2.5" style="fill:var(--surface-2)"/><rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(1.5,w*clamp(c.e||0,0,1)))}" height="${f1(h)}" rx="2.5" style="fill:${c.doing?'var(--ink-3)':'var(--bad)'}"/>`;
  const fill=c.mc==='U'?`<rect x="${f1(x+.5)}" y="${f1(y+.5)}" width="${f1(w-1)}" height="${f1(fh-1)}" rx="2.5" style="fill:var(--surface-2);stroke:var(--neutral);stroke-width:1"/>`:`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(fh)}" rx="2.5" style="fill:${MRAMP[c.mc]}"/>`;
  return fill+`<rect x="${f1(x)}" y="${f1(eb)}" width="${f1(w)}" height="3" rx="1.5" style="fill:var(--surface-2)"/><rect x="${f1(x)}" y="${f1(eb)}" width="${f1(ew)}" height="3" rx="1.5" style="fill:${effCol(c)}"/>`+(c.g==='stuck'?`<circle cx="${f1(x+w-Math.min(5,w/3))}" cy="${f1(y+fh/2)}" r="3.2" style="fill:var(--bad);stroke:var(--surface);stroke-width:1.5"/>`:'')}
const sq2=(mc,doing,g,e)=>`<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">${cellMark(1,1,20,12,{mc,doing,g,e:e!==undefined?e:(doing?.9:.3)})}</svg>`;
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
  if(A.u!==null)return uJs(0,A.u).filter(j=>SUBS[j].on).map(j=>({t:'j',id:j,u:A.u,j}));
  return TAUGHT.map(u=>({t:'u',id:u,u}))}
function h2(){const tb=S.v2.tb,ids=tbWho(tb),us=TB[tb].units.map((_,u)=>u).filter(u=>tU(tb,u)).map(u=>{const g=ids.map(i=>cellN(i,tb,{t:'u',id:u}).g);return {u,stuck:g.filter(x=>x==='stuck').length,off:g.filter(x=>x==='off').length}});
  const a=us.slice().sort((p,q)=>q.stuck-p.stuck||p.u-q.u)[0],b=us.find(o=>o.u===CU)||us[us.length-1];
  const A=TBU(tb,a.u).n,B=TBU(tb,b.u).n;if(a.stuck&&a.u===b.u)return `${A}: ${a.stuck} stuck despite effort, ${b.off} not doing the work.`;
  return `${a.stuck?`${a.stuck} stuck despite effort in ${A}`:'Nobody is stuck despite effort'}; ${b.off} not doing the work in ${B}.`}
function v2(){const E=S.v2,A=E.at,ns=TB0.filter(U=>!U.on);
  /* the unit on show, among the ones the class has started; the others are counted. A subunit or skill picked in the grid is named in its place, with the way back up */
  const pick=A.u===null?`${pickCtl('v2unit',E.sel.id,unitOpts(TAUGHT),'Unit')}${ns.length?`<span class="usnap next"${tp(ns.map(U=>U.nb).join('<br>'))}><span>+${ns.length} not started</span></span>`:''}`
    :`<nav class="crumbs" aria-label="Where you are in the textbook"><button class="lnk" type="button" data-act="v2up" data-f="all">All units</button><span class="sep" aria-hidden="true">›</span>${A.j===null?`<b>${TB0[A.u].n}</b>`:`<button class="lnk" type="button" data-act="v2up" data-f="u">${TB0[A.u].n}</button><span class="sep" aria-hidden="true">›</span><b>${SUBS[A.j].n}</b>`}</nav>`;
  const what=A.j!==null?`by skill of ${SUBS[A.j].s}`:A.u!==null?`by subunit of ${TB0[A.u].s}`:'by unit';
  const line=`<label class="rng" for="v2line">Doing the work: at least <output id="v2lo">${E.line}% of practice</output><input type="range" id="v2line" min="40" max="80" step="5" value="${E.line}"></label><label class="sel" for="v2sort">Sort <select id="v2sort">${[['start','By name'],['stuck','Stuck first'],['off','Not doing the work first']].map(o=>`<option value="${o[0]}"${E.sort===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></label>`;
  return `<div class="controls">${pick}${CELLKEY()}</div><div id="v2top"></div>${fold('v2grid',`Every student, ${what}`,`<div class="controls" style="margin:12px 0">${line}</div><div id="v2c"></div>`)}`}
/* everyone in the picked column, placed by practice done (across) and mastery (up) */
function v2scatter(tb,n,ids,W){const L=58,R=18,T0=14,B=T0+Math.round(clamp((W-L-R)*.46,256,380)),H=B+40,x=e=>L+clamp(e,0,1)*(W-L-R),y=m=>B-clamp(m,0,1)*(B-T0),ln=S.v2.line/100,sel=S.stu,P=[],early=[];
  ids.forEach(i=>{const c=cellN(i,tb,n);if(c.g==='x'||c.g==='na')return;if(c.mc==='U'||c.mc==='Q')early.push(NM[i]);else P.push({i,c,X:x(c.e),Y:y(c.m)})});
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="${nodeName(n,tb)}: each student placed by practice done and mastery">`;
  s+=`<rect x="${f1(x(ln))}" y="${f1(y(.3))}" width="${f1(x(1)-x(ln))}" height="${f1(y(0)-y(.3))}" style="fill:var(--bad);opacity:.08"/><rect x="${f1(x(0))}" y="${f1(y(.6))}" width="${f1(x(ln)-x(0))}" height="${f1(y(0)-y(.6))}" style="fill:var(--bad);opacity:.08"/><rect x="${f1(x(0))}" y="${f1(y(1))}" width="${f1(x(ln)-x(0))}" height="${f1(y(.6)-y(1))}" style="fill:var(--watch);opacity:.1"/>`;
  [0,.25,.5,.75,1].forEach(v=>{s+=`<line x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${T0}" y2="${B}" class="grid"/>`+T(x(v),B+16,Math.round(v*100)+'%',{a:'middle',c:'t3'})});
  [0,.3,.6,.9,1].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="grid"/>`+T(L-8,y(v)+4,Math.round(v*100)+'%',{a:'end',c:'t3'})});
  s+=`<line x1="${f1(x(ln))}" x2="${f1(x(ln))}" y1="${T0}" y2="${B}" class="axis"/><line x1="${L}" x2="${W-R}" y1="${f1(y(.6))}" y2="${f1(y(.6))}" class="axis"/>`;
  const rl=(tx,ty,t,a,c)=>T(tx,ty,t,{a,c,w:700});
  /* each region's name goes in the corner of its region that has the fewest dots under it, so a cluster doesn't sit on the words */
  const under=b=>P.filter(p=>p.X+5>b.x&&p.X-5<b.x+b.w&&p.Y+5>b.y&&p.Y-5<b.y+b.h).length;
  const RL=[['On track','tgood',64,[[x(ln)+8,y(1)+16,'start'],[W-R-8,y(1)+16,'end']]],['Keep going','t2',78,[[x(ln)+8,y(.6)+16,'start'],[W-R-8,y(.6)+16,'end'],[x(ln)+8,y(.3)-7,'start'],[W-R-8,y(.3)-7,'end']]],
    ['Stuck despite effort','tbad',132,[[W-R-8,B-8,'end'],[x(ln)+8,B-8,'start']]],['Coasting','twatch',70,[[L+8,y(1)+16,'start'],[x(ln)-8,y(1)+16,'end']]],['Not doing the work','tbad',130,[[L+8,B-8,'start'],[x(ln)-8,B-8,'end']]]]
    .map(([t,cl,w,cands])=>{let best=null;cands.forEach(([tx,ty,a])=>{const b={x:a==='end'?tx-w:tx,y:ty-11,w,h:14},k=under(b);if(!best||k<best.k)best={t,cl,tx,ty,a,b,k}});return best});
  s+=RL.map(o=>rl(o.tx,o.ty,o.t,o.a,o.cl)).join('');
  s+=T((L+W-R)/2,B+34,'Share of the class’s questions tried',{a:'middle'})+`<text x="16" y="${f1((T0+B)/2)}" text-anchor="middle" transform="rotate(-90 16 ${f1((T0+B)/2)})" class="t2">Share of key skills secure</text>`;
  const COL={on:'var(--good)',go:'var(--ink-3)',stuck:'var(--bad)',off:'var(--bad)',coast:'var(--watch)'},boxes=[];
  const hit=(b)=>boxes.some(o=>b.x<o.x+o.w&&b.x+b.w>o.x&&b.y<o.y+o.h&&b.y+b.h>o.y);
  P.forEach(p=>boxes.push({x:p.X-5,y:p.Y-5,w:10,h:10}));boxes.push({x:x(ln)-2,y:T0,w:4,h:B-T0},{x:L,y:y(.8)-2,w:W-L-R,h:4});RL.forEach(o=>boxes.push(o.b));
  const lab=[];P.filter(p=>['stuck','off','coast'].includes(p.c.g)||p.i===sel).sort((a,b)=>(b.i===sel)-(a.i===sel)||a.Y-b.Y).forEach(p=>{const nm=NM[p.i],w=nm.length*6.6+4,cand=[[p.X+8,p.Y-6,'start'],[p.X-8-w,p.Y-6,'end'],[p.X-w/2,p.Y-20,'middle'],[p.X-w/2,p.Y+8,'middle'],[p.X+7,p.Y-17,'start'],[p.X+7,p.Y+5,'start'],[p.X-7-w,p.Y-17,'end'],[p.X-7-w,p.Y+5,'end'],[p.X-w/2,p.Y-31,'middle'],[p.X-w/2,p.Y+19,'middle']];
    for(const [bx,by,a] of cand){const b={x:bx,y:by,w,h:12};if(bx<L||bx+w>W-R||by<T0||by+12>B)continue;if(!hit(b)){boxes.push(b);lab.push({p,b,a});break}}});
  P.forEach(p=>{const on=p.i===sel;s+=`<g class="hit" data-act="stu" data-i="${p.i}"${tp(cellTip(p.i,p.c,nodeName(n,tb)))}><circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="11" fill="transparent"/>${on?`<circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="8.5" style="fill:none;stroke:var(--accent);stroke-width:2"/>`:''}<circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="5" style="fill:${COL[p.c.g]};stroke:var(--surface);stroke-width:2"/></g>`});
  lab.forEach(o=>{const tx=o.a==='start'?o.b.x:o.a==='end'?o.b.x+o.b.w:o.b.x+o.b.w/2;s+=T(tx,o.b.y+10,NM[o.p.i],{a:o.a,c:o.p.i===sel?'tacc':'t1',w:o.p.i===sel?700:null})});
  s+='</svg>';
  return fig(s)+(early.length?`<p class="hint">Too early to tell: ${andList(early)}.</p>`:'')}
/* a unit or lesson of labs has no level, so its chart has one axis: everyone placed by the share of its labs they tried, stacked where shares coincide */
function v2strip(tb,n,ids,W){const L=58,R=18,T0=34,ln=S.v2.line/100,x=e=>L+clamp(e,0,1)*(W-L-R),sel=S.stu,P=[],cols={};
  ids.forEach(i=>{const c=cellN(i,tb,n);if(c.g==='x'||c.g==='na')return;const k=Math.round(c.e*40);P.push({i,c,e:c.e,row:cols[k]||0});cols[k]=(cols[k]||0)+1});
  const rh=13,B=T0+Math.max(1,...P.map(p=>p.row+1))*rh+8,H=B+40;
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="${nodeName(n,tb)}: each student placed by the share of its labs they tried">`;
  s+=`<rect x="${f1(x(0))}" y="${T0-10}" width="${f1(x(ln)-x(0))}" height="${B-T0+10}" style="fill:var(--bad);opacity:.08"/>`;
  [0,.25,.5,.75,1].forEach(v=>{s+=`<line x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${T0-10}" y2="${B}" class="grid"/>`+T(x(v),B+16,Math.round(v*100)+'%',{a:'middle',c:'t3'})});
  s+=`<line x1="${f1(x(ln))}" x2="${f1(x(ln))}" y1="${T0-10}" y2="${B}" class="axis"/>`+T(x(ln)-8,T0-16,'Not doing the labs',{a:'end',c:'tbad',w:700})+T(x(ln)+8,T0-16,'Doing the labs',{c:'t2',w:700});
  s+=T((L+W-R)/2,B+34,'Share of the labs tried',{a:'middle'});
  P.forEach(p=>{const on=p.i===sel,X=x(p.e),Y=B-7-p.row*rh;s+=`<g class="hit" data-act="stu" data-i="${p.i}"${tp(`<b>${NM[p.i]}</b> · ${GLAB[p.c.g]}<br>Tried ${Math.round(p.e*100)}% of the labs`)}><circle cx="${f1(X)}" cy="${f1(Y)}" r="10" fill="transparent"/>${on?`<circle cx="${f1(X)}" cy="${f1(Y)}" r="8.5" style="fill:none;stroke:var(--accent);stroke-width:2"/>`:''}<circle cx="${f1(X)}" cy="${f1(Y)}" r="5" style="fill:${p.c.doing?'var(--ink-3)':'var(--bad)'};stroke:var(--surface);stroke-width:2"/></g>`});
  return fig(s+'</svg>')}
function v2draw(){const c=$('#v2c'),tp0=$('#v2top');if(!c||!tp0)return;const E=S.v2,A=E.at,tb=0,sel=S.stu,cs=cols2().slice(pg2From(),pg2From()+PG2),ids=tbWho(tb),lv=A.j!==null?'k':A.u!==null?'j':'u',n=cs.length;
  /* first the unit's chart and its cards: everyone placed by practice done and standing, then who to act on, with the button each */
  const all=ids.map(i=>({n:NM[i],c:cellN(i,tb,E.sel)})),by=g=>all.filter(o=>o.c.g===g).map(o=>o.n);
  const MSQ={stuck:['N',true],off:['N',false],coast:['P',false]};
  const grp=(g,act)=>{const a=by(g);if(!a.length)return '';const key=`v2:${tb}:${E.sel.t}${E.sel.id}:${g}`;
    return `<div class="ag"><p class="dl">${sq2(MSQ[g][0],MSQ[g][1],g)}${GLAB[g]} · ${a.length}</p><div class="fl-names">${a.map(n=>`<span class="who5">${nmBtn(n)}</span>`).join('')}</div><p class="fl-act">${isLogged(key)?'<span class="pill good">Logged</span>':`<button class="btn small" type="button" data-act="v2log" data-g="${g}">${act}</button>`}</p></div>`};
  const isLab=all.some(o=>o.c.lab),gs=isLab?grp('off','Assign the labs'):grp('stuck','Reteach in a small group')+grp('off','Assign the practice')+grp('coast','Give a stretch set'),da=duoW(.58,520);
  const pills=isLab?`<span class="pill good">${by('labs').length} doing the labs</span><span class="hint">A lab is work, not a check: no level</span>`:`<span class="pill good">${by('on').length} on track</span><span class="pill">${by('go').length} keep going</span>${by('early').length?`<span class="pill">${by('early').length} too early to tell</span>`:''}`;
  const none=all.every(o=>o.c.g==='x'||o.c.g==='na');
  tp0.innerHTML=none?`<div class="detail lead"><div class="dhead"><h3>${nodeName(E.sel,tb)}</h3><span class="hint">${LEVEL2[E.sel.t]}${E.sel.t!=='u'?' in '+TBU(tb,nodeUnit(E.sel)).n:''}</span></div><p class="none">Nothing to place here yet: the class hasn’t started it, or no question checks it.</p></div>`
    :`<div class="detail lead"><div class="dhead"><h3>${nodeName(E.sel,tb)}</h3>${pills}</div>${duo(da,isLab?v2strip(tb,E.sel,ids,da||VW()):v2scatter(tb,E.sel,ids,da||VW()),gs?`<div class="ags">${gs}</div>`:`<p class="none">${isLab?'Everyone here is doing the labs.':'Nobody here is stuck, coasting or not doing the work.'}</p>`,'cards')}</div>`;
  /* then the grid, folded: a row a student, a column a unit the class has started (or one unit's subunits, or one subunit's skills). Each cell is one small bar
     whose green says the standing, with a thin line under it for practice done. Columns share the page up to a comfortable width; with a few of them the table sits in the middle */
  const nc=cols2().length,np=Math.max(1,Math.ceil(nc/PG2)),what=lv==='k'?'skills':lv==='j'?'subunits':'units',p0=pg2From();
  const pager=np>1?`<div class="controls" style="margin:0 0 12px"><span class="pager2" role="group" aria-label="Pages of ${what}"><button class="btn small" type="button" data-act="v2pg" data-f="-1" aria-label="Previous ${PG2} ${what}"${E.pg?'':' disabled'}>‹</button><span>${p0+1}–${Math.min(nc,p0+PG2)} of ${nc} ${what}</span><button class="btn small" type="button" data-act="v2pg" data-f="1" aria-label="Next ${PG2} ${what}"${E.pg<np-1?'':' disabled'}>›</button></span></div>`:'';
  if(!cs.length){c.innerHTML=pager+`<p class="none">${lv==='k'?'No skills are mapped to this subunit.':'Nothing started here yet.'}</p>`;const an=$('#ans');if(an)an.textContent=h2();return}
  const room=c.clientWidth||900,tight=room<1100,L=tight?146:168,rh=23,cw=Math.floor(clamp((room-L-16)/Math.max(1,n),tight?60:70,132)),pw=Math.round(clamp(cw-34,tight?30:36,64)),NC=lv==='k'?30:26,tagX=22+Math.max(...ids.map(i=>NM[i].length))*6.4;
  const lab=o=>o.t==='u'?VU[o.id].name:o.t==='j'?VJ[o.id].name:D.skills[o.id],code=o=>o.t==='u'?TB0[o.id].s:o.t==='j'?SUBS[o.id].s:'';
  const gH=lv==='u'&&MULTI&&PICK===null?22:0,hH=Math.round(clamp(Math.max(0,...cs.map(o=>cut(lab(o),NC).length))*6.5*.643+20,48,150)),yF=6+gH+hH,yC=yF+22,top=yC+28,bot=top+ids.length*rh,H=bot+12;
  cs.forEach((o,ix)=>{o.w=cw;o.x=L+ix*cw;o.cx=o.x+cw/2});const xR=L+n*cw,W=xR+12;
  if(E.sort!=='start'){const pr=E.sort==='off'?{off:0,coast:1,stuck:2,early:3,go:4,on:5}:{stuck:0,off:1,go:2,early:3,coast:4,on:5};ids.sort((a,b)=>(pr[cellN(a,tb,E.sel).g]??9)-(pr[cellN(b,tb,E.sel).g]??9)||a-b)}
  let s=`<svg class="viz mgrid" viewBox="0 0 ${W} ${H}" style="width:${W}px;min-width:${W}px;max-width:none" role="group" aria-label="Effort and mastery grid: ${ids.length} students by ${n} ${lv==='u'?'units':lv==='j'?'subunits of '+TB0[A.u].n:'skills of '+SUBS[A.j].n}"><defs>${HATCH}</defs>`;
  const picked=o=>o.t===E.sel.t&&o.id===E.sel.id;
  cs.forEach(o=>{if(picked(o))s+=`<rect x="${o.x+4}" y="${yF-3}" width="${cw-8}" height="${bot-yF+6}" rx="8" style="fill:var(--accent-soft)"/>`});
  /* column headings: the name on a slant, its number under it. A unit or subunit opens the level below; a skill is picked for the chart above */
  const head=(o,attrs,tip,pk)=>{const tx=o.cx-pw/2+8,ty=yF-8,cd=code(o);
    return `<g class="hit" ${attrs} tabindex="0" role="button"${tp(tip)}><rect x="${o.x+3}" y="${yF-3}" width="${cw-6}" height="22" rx="4" fill="transparent"/><text x="${f1(tx)}" y="${f1(ty)}" transform="rotate(-40 ${f1(tx)} ${f1(ty)})" class="${pk?'t1':'tlink'}"${pk?' font-weight="700"':''}>${esc(cut(lab(o),NC))}</text>${cd?T(o.cx,yF+12,cd,{a:'middle',c:'t1',w:700}):''}</g>`};
  cs.forEach(o=>{
    if(o.t==='u'){const U=TB0[o.id];s+=head(o,`data-act="v2u" data-u="${o.id}" aria-label="${U.n}: show its subunits"`,`<b>${U.n}</b> · ${whenTxt(U)}<br><span>Click to see its ${U.js.length} subunits</span>`,picked(o))}
    else if(o.t==='j'){const J=SUBS[o.id],nk=jSk(0,o.id).length;s+=head(o,`data-act="v2j" data-j="${o.id}" aria-label="${J.n}: show its skills"`,`<b>${J.n}</b> · ${whenTxt(J)}<br><span>${nk?`Click to see its ${nk} ${pl(nk,'skill')}`:'No skills mapped yet'}</span>`,picked(o))}
    else{const k=o.id,here=tbOfSub(k)[0];s+=head(o,`data-act="v2k" data-k="${k}" data-j="${o.j}" aria-pressed="${picked(o)}" aria-label="${ASK[k]}"`,`<b>${ASK[k]}</b><br><span>${taught(k)?`First met on ${dayDate(KT[k])}`:'Not started'} · ${here.t&&here.a?'taught and checked':here.t?'taught, but no question checks it':'checked here'}</span>`,picked(o))}});
  /* with several books, the unit columns are grouped by book: the book's letter and name over its run of columns */
  if(gH){let k=0;while(k<cs.length){let e=k;while(e+1<cs.length&&TB0[cs[e+1].id].tb===TB0[cs[k].id].tb)e++;const tb=TB0[cs[k].id].tb,x0=cs[k].x+4,x1=cs[e].x+cw-4;s+=`<line x1="${f1(x0)}" x2="${f1(x1)}" y1="${gH-2}" y2="${gH-2}" style="stroke:var(--axis)"/>`+T(x0,gH-8,`${BL[tb]} · ${BOOKS[tb].s}`,{c:'t2',w:700});k=e+1}}
  s+=T(10,yF+12,'Student',{c:'t2',w:700});
  /* one bar for how the class divides in a column, darkest first, so the mastered part can be compared from column to column */
  const split=(x,y,w,parts,tot)=>{let xx=x,g=`<rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="8" rx="2" style="fill:var(--surface-2)"/>`;parts.forEach(([v,col])=>{if(v<=0)return;const ww=w*v/tot;g+=`<rect x="${f1(xx)}" y="${f1(y)}" width="${f1(Math.max(1.5,ww-1))}" height="8" rx="1.5" style="fill:${col}"/>`;xx+=ww});return g};
  s+=`<line x1="4" x2="${W-4}" y1="${yC-2}" y2="${yC-2}" class="grid"/>`+T(10,yC+16,'Class',{c:'t2',w:700});
  cs.forEach(o=>{const cc=ids.map(i=>cellN(i,tb,o)).filter(q=>q.g!=='x'&&q.g!=='na'),x=o.cx-pw/2;
    if(!cc.length){s+=`<g${tp(`<b>${nodeName(o,tb)}</b><br>Not started`)}><rect x="${f1(x)}" y="${yC+8}" width="${pw}" height="8" rx="2" fill="url(#hatch)" opacity=".7"/></g>`;return}
    if(cc[0].lab){const dn=cc.filter(q=>q.doing).length;s+=`<g${tp(`<b>Class · ${nodeName(o,tb)}</b><br>${dn} doing the labs · ${cc.length-dn} not`)}><rect x="${o.x+2}" y="${yC}" width="${cw-4}" height="24" fill="transparent"/>${split(x,yC+8,pw,[[dn,'var(--ink-3)'],[cc.length-dn,'var(--bad)']],cc.length)}</g>`;return}
    const m={M:0,P:0,D:0,N:0,U:0};cc.forEach(q=>m[q.mc]++);
    s+=`<g${tp(`<b>Class · ${nodeName(o,tb)}</b><br>${m.M} mastered · ${m.P} proficient · ${m.D} developing · ${m.N} not yet${m.U?` · ${m.U} too early`:''}<br><span>${cc.filter(q=>q.g==='stuck').length} stuck despite effort · ${cc.filter(q=>q.g==='off').length} not doing the work</span>`)}><rect x="${o.x+2}" y="${yC}" width="${cw-4}" height="24" fill="transparent"/>${split(x,yC+8,pw,[[m.M,MRAMP.M],[m.P,MRAMP.P],[m.D,MRAMP.D],[m.N,MRAMP.N],[m.U,'var(--neutral)']],cc.length)}</g>`});
  /* one cell: the bar, the line of practice under it, and a dot when the student is stuck despite effort */
  const pill=(cx,y,q)=>{const x=cx-pw/2,ew=Math.max(1.5,pw*clamp(q.e||0,0,1));
    if(q.mc==='L')return `<rect x="${f1(x)}" y="${f1(y+4)}" width="${pw}" height="16" rx="3" style="fill:var(--surface-2)"/><rect x="${f1(x)}" y="${f1(y+4)}" width="${f1(ew)}" height="16" rx="3" style="fill:${q.doing?'var(--ink-3)':'var(--bad)'}"/>`;
    return (q.mc==='U'?`<rect x="${f1(x+.5)}" y="${f1(y+4.5)}" width="${pw-1}" height="10" rx="3" style="fill:var(--surface);stroke:var(--neutral);stroke-width:1"/>`:`<rect x="${f1(x)}" y="${f1(y+4)}" width="${pw}" height="11" rx="3" style="fill:${MRAMP[q.mc]}"/>`)
      +`<rect x="${f1(x)}" y="${f1(y+17)}" width="${pw}" height="3" rx="1.5" style="fill:var(--surface-2)"/><rect x="${f1(x)}" y="${f1(y+17)}" width="${f1(ew)}" height="3" rx="1.5" style="fill:${effCol(q)}"/>`
      +(q.g==='stuck'?`<circle cx="${f1(x+pw-5.5)}" cy="${f1(y+9.5)}" r="3.2" style="fill:var(--bad);stroke:var(--surface);stroke-width:1.5"/>`:'')};
  ids.forEach((i,ri)=>{const y=top+ri*rh,on=sel===i,nm=NM[i];
    s+=`<line x1="4" x2="${W-4}" y1="${y}" y2="${y}" class="grid"/>`;
    if(on)s+=`<rect x="2" y="${y+1}" width="${W-4}" height="${rh-2}" rx="5" style="fill:none;stroke:var(--accent);stroke-width:1.5"/>`;
    s+=`<g class="hit" data-act="stu" data-i="${i}"><rect x="4" y="${y+1}" width="${L-8}" height="${rh-2}" fill="transparent"/>${T(10,y+rh/2+4.5,nm,{c:on?'tacc':'t1',w:on?700:null})}${drifting(i)?T(tagX,y+rh/2+4.5,'drifting',{c:'tbad'}):''}</g>`;
    cs.forEach(o=>{const cc=cellN(i,tb,o),at=`data-act="v2sel" data-t="${o.t}" data-id="${o.id}"${o.t==='k'?` data-j="${o.j}"`:''}`,hitR=`<rect x="${o.x+3}" y="${y+1}" width="${cw-6}" height="${rh-2}" fill="transparent"/>`;
      if(cc.g==='x'||cc.g==='na'){s+=`<g class="hit" ${at}>${hitR}</g>`;return}
      s+=`<g class="hit" ${at}${tp(cellTip(i,cc,nodeName(o,tb)))}>${hitR}${pill(o.cx,y,cc)}</g>`})});
  c.innerHTML=pager+fig(s+'</svg>');const an=$('#ans');if(an)an.textContent=h2()}

/* ---------- view 3: drift watchlist ---------- */
const flagged3=()=>ALL.filter(i=>DR[i]>=0).sort((a,b)=>DR[a]-DR[b]||a-b);
const watch3=()=>ALL.filter(i=>WATCH[i]);
const RECENT=`${dayDate(RSTART)} to ${dayDate(TODAY)}`,NLIVE=ONB.filter(Boolean).length;
function h3(){if(TOOFEW)return `Too little to judge: ${BOOKS[PICK].s} has work in ${numWord(NLIVE)} five-day ${pl(NLIVE,'block')}, and drifting needs four or more.`;
  if(CLASSIDLE)return `No class work from ${RECENT}; the latest was on ${dayDate(LASTWORK)}.`;
  if(CLASSLOW)return `The class as a whole is working less: ${NLOW} of ${NJUDGE} are under half their normal in the five days to ${dayDate(TODAY)}, so nobody is singled out.`;
  const n=flagged3().length;return n?`${n} ${pl(n,'student is','students are')} drifting below their own normal.`:'Nobody is drifting below their own normal.'}
/* the blocks with no class work are hatched (breaks), and the line runs through the blocks that had some, so a break does not read as a stretch of nothing */
const quietRects=(x,y,h,x0,x1)=>{let s='',q=0;while(q<NBC){if(!ONB[q]){let e=q;while(e<NBC-1&&!ONB[e+1])e++;const a=Math.max(x0,x(q-.5)),b=Math.min(x1,x(e+.5));if(b>a)s+=`<rect x="${f1(a)}" y="${y}" width="${f1(b-a)}" height="${h}" fill="url(#hatch)" opacity=".75"/>`;q=e+1}else q++}return s};
const liveBlocks=()=>{const o=[];for(let j=0;j<NBC;j++)if(ONB[j])o.push(j);return o};
/* a student's work, block by block: questions tried per five days against their own normal (the band runs from half of it to one and a half times it) */
function spark(i,w,h,full){const a=WB[i],nm=NORM[i],hi=Math.max(1,nm?nm*2:0,...a.slice(0,NBC)),px=j=>3+j*(w-6)/Math.max(1,NBC-1),py=v=>h-3-clamp(v,0,hi)/hi*(h-6),d=DR[i],dj=d>=0?blockOf(d):-1;
  const live=liveBlocks(),P=live.map(j=>f1(px(j))+','+f1(py(a[j]))),di=live.indexOf(dj);
  let s=`<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${NM[i]}: questions tried per five days, ${a[RB]} in the last five; normal ${nm===null?'not known yet':nm}">`;
  s+=quietRects(px,2,h-4,1,w-1)+(nm?`<rect x="3" y="${f1(py(nm*1.5))}" width="${w-6}" height="${f1(py(nm/2)-py(nm*1.5))}" rx="2" style="fill:var(--neutral);opacity:.32"/>`:'');
  if(d>=0&&di>=0){s+=`<polyline points="${P.slice(0,di).join(' ')}" fill="none" style="stroke:var(--ink-3);stroke-width:1.6;stroke-linejoin:round"/><polyline points="${P.slice(Math.max(0,di-1)).join(' ')}" fill="none" style="stroke:var(--bad);stroke-width:2.4;stroke-linejoin:round"/><circle cx="${f1(px(dj))}" cy="${f1(py(a[dj]))}" r="${full?4:2.6}" style="fill:var(--bad);stroke:var(--surface);stroke-width:1.5"/>`}
  else{s+=`<polyline points="${P.join(' ')}" fill="none" style="stroke:var(--ink-3);stroke-width:1.6;stroke-linejoin:round"/>`;if(WATCH[i])s+=`<circle cx="${f1(px(RB))}" cy="${f1(py(a[RB]))}" r="${full?4:2.6}" style="fill:var(--watch);stroke:var(--surface);stroke-width:1.5"/>`}
  return s+'</svg>'}
/* the page offers no button: of the things the product can do (a reteach, coursework, content to practice, a group), none answers a student who has stopped working. The row says who, since when and what the signals are */
function v3(){const sel=S.stu,Z=S.v3,fl=flagged3(),wt=watch3(),SW=Math.round(clamp((VW()-200)*.46,290,620)); /* the activity line and the signals share the row about evenly, so the line isn't pulled flat */
  const ticks=[...new Set([0,Math.round((NBC-1)/2),NBC-1])],axis=`<svg class="spark" viewBox="0 0 ${SW} 16" width="${SW}" height="16" aria-hidden="true">${ticks.map(j=>`<text x="${f1(3+j*(SW-6)/Math.max(1,NBC-1))}" y="12" text-anchor="${j===0?'start':j===NBC-1?'end':'middle'}">${dayDate(j===NBC-1?BE(j):BS(j))}</text>`).join('')}</svg>`;
  const defs=`<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs>${HATCH}</defs></svg>`;
  const row=(i,watch)=>{const n=NM[i],g=SIG[n],on=sel===i;
    const sigs=[[g.miss>=2,`No work on ${g.miss} of the last ${g.of} days`],[g.work>=2,`${g.work} sets unfinished`],[g.acc<=-10,`Accuracy ${sgn(g.acc)} pts`]].filter(q=>q[0]).map(q=>`<span class="sg bad">${q[1]}</span>`).join('');
    let h=`<div class="wl-r${on?' on':''}${watch?' watch':''}"><div class="wl-who"><button class="nmx" type="button" data-act="stu" data-i="${i}">${n}</button>${watch?'<span class="pill watch">Working less</span>':`<span class="pill bad">Since ${dayDate(DR[i])}</span>`}</div><div>${spark(i,SW,46,true)}</div>
    <div class="wl-sig"><div class="sigs">${sigs||`<span class="sg">${RECENT}: ${WB[i][RB]} ${pl(WB[i][RB],'question')}, normal ${NORM[i]}</span>`}</div></div>`;
    return h+'</div>'};
  let follow='';
  if(sel!==null&&!fl.includes(sel)&&!wt.includes(sel)){const i=sel,n=NM[i];
    follow=`<div class="wl-r on" style="margin-bottom:10px;--sw:${SW}px"><div class="wl-who"><button class="nmx" type="button" data-act="stu" data-i="${i}">${n}</button><span class="pill">${JUDGE?'Normal':'Not judged'}</span></div><div>${spark(i,SW,46,true)}</div><div class="wl-sig"><p class="pat">${JUDGE?'Inside their normal range.':`${RECENT}: ${WB[i][RB]} ${pl(WB[i][RB],'question')}${NORM[i]===null?'':`, normal ${NORM[i]}`}.`}</p></div></div>`}
  const rest=ALL.filter(i=>!fl.includes(i)&&!wt.includes(i));
  const others=`<div class="controls" style="margin-top:14px"><button class="btn small" type="button" data-act="v3all" aria-expanded="${Z.all}">${Z.all?'Hide':'Show'} ${rest.length===N?'all':'the other'} ${rest.length} students</button></div>${Z.all?`<div class="minis">${rest.map(i=>`<button class="mini${sel===i?' on':''}" type="button" data-act="stu" data-i="${i}">${spark(i,64,22,false)}<span>${NM[i]}</span></button>`).join('')}</div>`:''}`;
  /* when the class as a whole is idle or slow, that is the finding: no student is singled out */
  const note=TOOFEW?`<p class="none">A five-day block counts once anyone in the class worked in ${BOOKS[PICK].s}; it has ${NLIVE?numWord(NLIVE):'none'}, so nobody is judged here. All books, or the main book, has the whole class’s work.</p>`
    :CLASSIDLE?`<p class="none">Nobody is judged while the class is not working: no questions were tried by anyone from ${RECENT}. The latest work was on ${dayDateY(LASTWORK)}. Pick a day under the answer to read the page as of then.</p>`
    :CLASSLOW?`<p class="none">The class tried ${CTOT[RB]} ${pl(CTOT[RB],'question')} from ${RECENT}, against ${CNORM} in a usual five days. That is the class slowing, not a student drifting.</p>`:'';
  const list=!JUDGE?note:fl.length?`<div class="wl" style="--sw:${SW}px"><div class="wl-h"><span></span>${axis}<span>Gray band: normal range · hatched: no class work</span></div>${fl.map(i=>row(i,false)).join('')}</div>`:'<p class="none">Nobody is below their normal range.</p>';
  /* one low block is worth a look, not a row each */
  const low=JUDGE&&wt.length?`<p class="hint" style="margin-top:12px">${wt.length} more ${pl(wt.length,'is','are')} under half their normal in the last five days: ${wt.map(i=>nmBtn(NM[i])).join(' ')}</p>`:'';
  return defs+follow+list+low+others}

/* ---------- view 4: pace tracks (the same solid/dashed chart as main) ---------- */
function h4(){if(!paceUnits().length)return 'This book records lab practice. Pick a book with skill checks to set a pace goal.';
  const P=ALL.map(i=>paceOf(i)),goal=paceScope(S.v4.u).ks.length;
  if(!goal)return 'No key skills are listed for this unit. Pick another target unit.';
  const early=P.filter(p=>p.proj===null).length,on=P.filter(p=>p.proj!==null&&p.proj>=goal).length;
  return `${on} projected to reach all ${goal} skills by ${dayDateY(S.v4.day)} · ${N-on-early} short${early?` · ${early} need more checks`:''}.`}
function v4(){const z=S.v4,us=paceUnits();if(!us.length)return '<p class="none">Lab practice has no skill standing to project.</p>';
  const scope=paceScope(z.u),goal=scope.ks.length,unit=pickCtl('v4unit',z.u,unitOpts(us),'Target unit');
  const by=`<label class="sel" for="v4date">By <input type="date" id="v4date" min="${isoOf(TODAY)}" value="${isoOf(z.day)}"></label>`;
  const sort=pickCtl('v4sort',z.sort,[['status','By status'],['proj','By projection'],['name','By name']],'Sort');
  const list=ks=>ks.length?`<ul>${ks.map(k=>`<li>${ASK[k]}${!chk5(k)?' <span class="hint">· no working checks</span>':''}</li>`).join('')}</ul>`:'<p class="none">None separately.</p>';
  const skills=fold('v4skills',`Skills in this goal (${goal})`,`<div class="pace-skills"><div><h3>Target unit · ${scope.target.length}</h3>${list(scope.target)}</div><div><h3>Earlier skills used here · ${scope.previous.length}</h3>${list(scope.previous)}</div></div>`);
  const histories=ALL.map(i=>paceOf(i)).filter(p=>p.end!==null),latest=histories.length?Math.max(...histories.map(p=>p.end)):null,old=histories.some(p=>TODAY-p.end>PACE_WINDOW);
  const plan=`Goal: all ${goal} ${pl(goal,'skill')} secure · ${scope.target.length} in the target unit + ${scope.previous.length} earlier skills. Projections assume work ${old?'resumes':'continues'} at each student’s latest observed 30-day pace.${latest!==null?` Latest check on these skills: ${dayDateY(latest)}.`:' More checks are needed before estimating.'}`;
  return `<div class="controls">${unit}${by}${sort}</div><p class="hint" style="margin:-6px 0 12px">${plan}</p>
  <div class="legend">${PS.map(p=>`<span><i class="sw" style="background:${p[1]}"></i>${p[0]}</span>`).join('')}</div>
  <div class="legend"><span><i class="ln" style="background:var(--ink-2)"></i>Secure now</span><span><svg width="24" height="10" aria-hidden="true"><line x1="1" y1="5" x2="23" y2="5" style="stroke:var(--ink-2);stroke-width:2.5;stroke-dasharray:4 3"/></svg>Projected to your date</span><span><svg width="12" height="12" aria-hidden="true"><line x1="6" y1="0" x2="6" y2="12" style="stroke:var(--ink);stroke-width:2"/></svg>Goal</span><span><svg width="12" height="12" aria-hidden="true"><line x1="6" y1="0" x2="6" y2="12" style="stroke:var(--ink-3);stroke-width:1.5;stroke-dasharray:2 3"/></svg>Due by today</span></div><div id="v4c" class="fig"></div>${skills}`}
function v4draw(){const c=$('#v4c');if(!c)return;const goal=paceScope(S.v4.u).ks.length,P=ALL.map(i=>Object.assign({i},paceOf(i)));
  if(!goal){c.innerHTML='<p class="none">No key skills to project.</p>';return}
  let blocks;
  if(S.v4.sort==='status')blocks=PS.map(p=>({p,ids:P.filter(o=>o.st===p[0]).sort((a,b)=>(a.proj??-1)-(b.proj??-1)||a.i-b.i)})).filter(b=>b.ids.length);
  else{const a=P.slice();if(S.v4.sort==='proj')a.sort((x,y)=>(y.proj??-1)-(x.proj??-1)||x.i-y.i);else a.sort((x,y)=>NM[x.i].localeCompare(NM[y.i]));blocks=[{p:null,ids:a}]}
  const half=Math.min(900,Math.floor((VW()-DGAP)/2)),two=half>=450&&N>=12;let cols=[blocks];
  if(two){let k=0,best=Infinity,acc=0;blocks.forEach((b,ix)=>{acc+=b.ids.length;if(ix<blocks.length-1&&Math.abs(N-2*acc)<best){best=Math.abs(N-2*acc);k=ix+1}});
    if(k&&best<=N*.24)cols=[blocks.slice(0,k),blocks.slice(k)];
    else{const A=[],B=[];let room=Math.ceil(N/2);blocks.forEach(b=>{const m=b.ids.length;if(room>=m){A.push(b);room-=m}else if(room>0){A.push({p:b.p,ids:b.ids.slice(0,room),n:m});B.push({p:b.p,ids:b.ids.slice(room),n:m,cont:true});room=0}else B.push(b)});cols=[A,B]}}
  const due=P.length?P[0].due:0;
  const chart=(bl,W,part)=>{const rows=bl.reduce((t,b)=>t+b.ids.length,0),L=100,x0=112,x1=W-96,rh=21,gh=30,top=54,sx=v=>x0+v/goal*(x1-x0),bot=top+bl.filter(b=>b.p).length*gh+rows*rh,H=bot+44;
    let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="Pace tracks${part}: required skills secure now and projected to ${dayDateY(S.v4.day)}, against a goal of ${goal}">`;
    const step=Math.max(1,Math.ceil(goal/6));for(let v=0;v<goal;v+=step)s+=`<line x1="${f1(sx(v))}" x2="${f1(sx(v))}" y1="${top-6}" y2="${bot+6}" class="grid"/>`+T(sx(v),bot+22,v,{a:'middle',c:'t3'});
    s+=T(sx(goal),bot+22,goal,{a:'middle',c:'t3'})+T((x0+x1)/2,H-6,'Required skills secure',{a:'middle'});
    s+=`<line x1="${f1(sx(due))}" x2="${f1(sx(due))}" y1="${top-14}" y2="${bot+6}" style="stroke:var(--ink-3);stroke-width:1.5;stroke-dasharray:2 3"/>`+T(sx(due)-5,36,`Due: ${paceNum(due)}`,{a:'end',c:'t3'});
    s+=`<line x1="${f1(sx(goal))}" x2="${f1(sx(goal))}" y1="${top-30}" y2="${bot+6}" style="stroke:var(--ink);stroke-width:2"/>`+T(sx(goal)+5,18,`Goal: ${goal}`,{c:'t1',w:700});
    s+=T(x1+14,36,'Now → est.',{c:'t3'});
    let y=top;
    bl.forEach(b=>{if(b.p){s+=`<text x="${x0}" y="${y+18}" class="${b.p[2]}" font-weight="700" style="font-size:12.5px;paint-order:stroke;stroke:var(--surface);stroke-width:6px;stroke-linejoin:round">${b.p[0]} · ${b.cont?'continued':b.n||b.ids.length}</text>`;y+=gh}
      b.ids.forEach(o=>{const i=o.i,p=PS[PSI[o.st]],col=p[1],yc=y+rh/2,on=S.stu===i;
        const tip=`<b>${NM[i]}</b> · ${o.st}<br>${paceSummary(o)}<br><span>${o.checked} skills checked${o.end!==null?` · observed pace ${dayDateY(o.start)} to ${dayDateY(o.end)}<br>Net gains ${paceNum(o.rec*PACE_WINDOW)} per 30 days; projection assumes this pace resumes from ${dayDateY(TODAY)}`:''}${o.close.length?`<br>To close: ${o.close.slice(0,4).map(k=>ASK[k]).join(', ')}${o.close.length>4?` and ${o.close.length-4} more`:''}`:''}</span>`;
        s+=`<g class="row${on?' on':''}" data-act="stu" data-i="${i}" tabindex="0" role="button" aria-label="${NM[i]}: ${o.st}; ${paceSummary(o)}"${tp(tip)}><rect class="rbg" x="2" y="${y}" width="${W-4}" height="${rh}" rx="4"/>`;
        s+=T(L,yc+4,NM[i],{a:'end',c:on?'tacc':'t1',w:on?700:null});
        s+=`<line x1="${f1(sx(0))}" x2="${f1(sx(goal))}" y1="${f1(yc)}" y2="${f1(yc)}" style="stroke:var(--surface-2);stroke-width:8;stroke-linecap:round"/>`;
        if(o.now>0)s+=`<rect x="${f1(sx(0))}" y="${f1(yc-4)}" width="${f1(sx(o.now)-sx(0))}" height="8" rx="2" style="fill:${col}"/>`;
        if(o.proj!==null){if(o.proj>o.now+.05)s+=`<line x1="${f1(sx(o.now))}" x2="${f1(sx(o.proj))}" y1="${f1(yc)}" y2="${f1(yc)}" style="stroke:${col};stroke-width:3;stroke-dasharray:4 3"/>`;
          s+=`<circle cx="${f1(sx(o.proj))}" cy="${f1(yc)}" r="3.6" style="fill:var(--surface);stroke:${col};stroke-width:2"/>`}
        s+=T(x1+14,yc+4,`${o.now} → ${o.proj===null?'?':'~'+paceNum(o.proj)}`,{c:p[2]})+'</g>';y+=rh})});
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
const whereTxt=k=>`Introduced in ${SUBS[KHOME[k]].s} ${esc(cut(VJ[KHOME[k]].name,36))} · ${chk5(k)?`${KIT[k].length} ${pl(KIT[k].length,'question')}`:'no question checks it'}`;
/* where a skill was first introduced, big enough to check at a glance: the unit, the subunit, the day the class met it, and the questions on it. It opens the grid at that subunit with the skill picked */
const introCard=k=>{const j=KHOME[k],u=SUBS[j].u;return `<button class="intro" type="button" data-act="gointro" data-k="${k}" data-j="${j}"${tp('Open Effort and mastery at this subunit, with the skill picked')}><span class="l">Introduced in</span><b>${TB0[u].s} · ${TB0[u].nb}</b><span class="j">${SUBS[j].n}</span><span class="m">${taught(k)?`First met on ${dayDate(KT[k])}`:'Not started by the class'} · ${chk5(k)?`${KIT[k].length} ${pl(KIT[k].length,'question')} check it`:'no question checks it'}</span></button>`};
/* under "All books" an outline is grouped by book: a heading a book, then its units, then its units not started. The labs are left out and named under the list */
const treeBody=(T,ord,unitRow,nsI)=>MULTI&&PICK===null?BKON.filter(tb=>!LABB[tb]).map(tb=>{const Ts=T.filter(U=>TB0[U.u].tb===tb);return Ts.length?`<li class="hg"><div class="hr hgr"><span class="hn"><b>${BL[tb]} · ${BOOKS[tb].s}</b></span></div></li>`+ord(Ts.filter(U=>U.on)).map(unitRow).join('')+nsRow(Ts.filter(U=>!U.on).map(nsI)):''}).join('')
  :ord(T.filter(U=>U.on)).map(unitRow).join('')+nsRow(T.filter(U=>!U.on).map(nsI));
const labsNote=what=>MULTI&&PICK===null&&BKON.some(tb=>LABB[tb])?`<p class="hint" style="margin:8px 0 0">A lab is work, not a check, so ${what}. The labs are under ${andList(BKON.filter(tb=>LABB[tb]).map(tb=>`<button class="lnk" type="button" data-act="bk" data-f="${esc(BOOKS[tb].id)}">${BL[tb]} · ${BOOKS[tb].s}</button>`))}.</p>`:'';
const labsLevelNote=()=>LABV?`<p class="hint" style="margin:0 0 10px">A lab is not a check. These are the class’s levels on the skills each lab practises, from the questions on them in the other books.</p>`:'';
/* units or subunits the class hasn't started: one line of names, so the list stays about what there is evidence for */
const nsRow=items=>items.length?`<li class="ns"><p class="nsrow"><span class="nsl"${tp(`Not started: ${items.map(h=>String(h).replace(/<[^>]+>/g,'')).join(', ')}`)}>+${items.length} not started</span></p></li>`:'';
const pc5=p=>Math.round(p*100)+'%';
function tree5(tb){const ids=tbWho(tb);
  return TREEU.map(u=>{const U=TB[tb].units[u],subs=uJs(tb,u).map(j=>{const J=TBJ(tb,j),on=J.on,ks=on?jSk(tb,j).map(k=>{const s=st5(k,ids);return {k,s,p:s.p}}):[];return Object.assign({j,J,on,ks},pool5(ks.map(x=>x.s)))});
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
const lvAll5=tb=>{const us=TREEU.filter(u=>tU(tb,u)),js=us.flatMap(u=>uJs(tb,u)).filter(j=>TBJ(tb,j).on&&jSk(tb,j).length);return {us,js}};
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
  const nvw=ks=>'';   // a unit's skills with no question are noted on their own rows, not flagged beside the unit's name
  const off=(lv,name,txt)=>`<div class="hr l${lv} off"><span class="hn"><span class="chs"></span>${name}</span><span class="hx">${txt}</span><span class="hp"></span>${fol?'<span class="hs"></span>':''}</div>`;
  const skRow=K=>{const on=K.k===k0,s=K.s;
    return `<li><button type="button" class="hr l2${on?' on':''}" data-act="v6sk" data-k="${K.k}" aria-pressed="${on}"${tp(`<b>${ASK[K.k]}</b><br>${K.p===null?(chk5(K.k)?'Fewer than eight students have been checked on it':'Taught, but no question or activity checks it'):`${s.c.F.length} secure · ${s.c.H.length} developing · ${s.c.E.length} not yet`}<br><span>${whereTxt(K.k)}</span>`)}><span class="hn"><span class="chs"></span><span>${ASK[K.k]}${tag5(tb,K.k)}</span></span>${K.p===null?(chk5(K.k)?'<span class="hx">Too few checked yet</span>':`<span class="hx w">${WARNI}No item checks it</span>`):hbar(eo(s),2)}${pc(K)}${sc([K])}</button></li>`};
  const subRow=J=>{if(!J.on||!J.ks.length)return `<li>${off(1,J.J.n,J.on?'No skills yet':'Not started')}</li>`;const o=E.J.includes(J.j);
    return `<li><button type="button" class="hr l1" data-act="v6sub" data-j="${J.j}" aria-expanded="${o}"><span class="hn">${CHEV}<span>${J.J.n}${nvw(J.ks)}</span></span>${J.p===null?'<span class="hx">No evidence yet</span>':hbar(J,1)}${pc(J)}${sc(J.ks)}</button>${o?`<ul>${ord(J.ks).map(skRow).join('')}</ul>`:''}</li>`};
  const unitRow=U=>{if(!U.on)return `<li class="hu">${off(0,`<b>${U.U.nb}</b>`,'Not started')}</li>`;const o=E.U.includes(U.u);
    return `<li class="hu"><button type="button" class="hr l0" data-act="v6unit" data-u="${U.u}" aria-expanded="${o}"><span class="hn">${CHEV}<span><b>${U.U.nb}</b>${nvw(U.subs.flatMap(J=>J.ks))}</span></span>${U.p===null?'<span class="hx">No evidence yet</span>':hbar(U,0)}${pc(U)}${sc(U.subs.flatMap(J=>J.ks))}</button>${o?`<ul>${ord(U.subs.filter(J=>J.on)).map(subRow).join('')}${nsRow(U.subs.filter(J=>!J.on).map(J=>`<i${tp(J.J.n)}>${J.J.s}</i>`))}</ul>`:''}</li>`};
  const note=[ids.length<NM.length?`${ids.length} of ${NM.length} students use ${Tb.n}.`:'',sel!==null&&!fol?`${NM[sel]} doesn’t use it.`:''].filter(Boolean).join(' ');
  const ctl=`<div class="controls"><span class="sel">Show ${seg('v6lvl',level5(tb),[['u','Units'],['j','Subunits'],['k','Skills']],'Show rows down to')}</span><label class="sel" for="v6sort">Sort <select id="v6sort"><option value="hard"${hard?' selected':''}>Hardest first</option><option value="course"${hard?'':' selected'}>Course order</option></select></label></div>`;
  const leg=`<div class="legend mleg">${LEG5}${fol?`<span class="lt">${NM[sel]}</span><span><i class="sd e"></i>Not yet</span><span><i class="sd h"></i>Developing</span>`:''}</div>`;
  const list=`<ul class="hc${fol?' fol':''}" aria-label="${Tb.n}: units, subunits and skills, with the share of students not secure yet"><li class="hh" aria-hidden="true"><div class="hr"><span class="hn"></span><span class="hx"></span><span class="hp">Not secure</span>${fol?`<span class="hs">${NM[sel]}</span>`:''}</div></li>${treeBody(T,ord,unitRow,U=>`<i>${U.U.nb}</i>`)}</ul>${labsNote('they are not ranked here')}`;
  const K0=T.flatMap(U=>U.subs.flatMap(J=>J.ks)).find(K=>K.k===k0),s0=K0?K0.s:EMPTYK,p0=s0.p;
  const det=`<div class="detail"><div class="dhead"><h3>${ASK[k0]}</h3>${p0===null?`<span class="pill watch">${chk5(k0)?'Too few checked yet':'No item checks it'}</span>`:`<span class="pill ${p0>=.45?'bad':p0>=.3?'watch':'good'}">${pc5(p0)} not secure</span>`}${taught(k0)&&p0!==null?`<button class="lnk" type="button" data-act="gosub" data-j="${jOf(k0)}">Where they stall →</button>`:''}</div>
  ${introCard(k0)}
  ${p0===null?`<p class="none">${chk5(k0)?'Fewer than eight students have been checked on this skill, so the share would mislead.':'No question or activity checks this skill yet, so there is no evidence of who has it.'}</p>`:`<div class="dgrid">${whoCol('Not yet','var(--hd-ny)',s0.c.E)}${whoCol('Developing','var(--hd-dv)',s0.c.H)}</div>`}</div>`;
  return (note?`<p class="hint" style="margin:0 0 10px">${note}</p>`:'')+labsLevelNote()+ctl+leg+duo(duoW(.6,560),list,det,'stick')}


/* ---------- the skills page: the skills many students are weak in now, the same skills by unit, and the ones that faded ----------
   One page, three views. Pages 5 (by unit) and 9 (faded) keep their ids for flags and the log; the rail shows one entry. */
const STS=['Getting worse','Still weak','Improving','Recovered'];
const SKV=()=>S.v7.view==='unit'?5:S.v7.view==='faded'?9:6;
const skTabs=()=>`<div class="controls"><span class="sel">View ${seg('v7view',S.v7.view,[['weak','Weak now'],['unit','By unit'],['faded','Faded']],'View of the skills')}</span></div>`;
const hSk=()=>S.v7.view==='unit'?h6():S.v7.view==='faded'?h10():h7();
const vSk=()=>skTabs()+(S.v7.view==='unit'?v6list(S.v6.tb):S.v7.view==='faded'?v10():v7());
function h7(){if(!WEAK.length)return 'No skill is weak for a fifth of the class at once.';const p=WEAK.filter(m=>SG[m.st]==='p'),f=WEAK.filter(m=>SG[m.st]==='f').length,first=p[0];
  if(!first)return `No skill is weak for a fifth of the class now${f?`; ${f} ${f===1?'is':'are'} improving`:''}.`;
  return `${ASK[first.k]} first: ${first.now.length} of ${N} not yet secure. ${p.length} ${pl(p.length,'skill is','skills are')} weak for a fifth of the class or more${f?`, ${f} improving`:''}.`}
function v7(){const sel=S.stu,uf=S.v7.u,uok=k=>uf==='all'||uOf(k)<=+uf,inU=WEAK.filter(m=>uok(m.k)),cnt=st=>inU.filter(m=>m.st===st).length;if(S.v7.f!=='all'&&!cnt(S.v7.f))S.v7.f='all';const ff=S.v7.f;
  /* the unit filter shows the skills introduced through a unit: a student may redo an earlier unit's work at any time, so a time axis cannot carry units, and the units are a filter instead */
  const units=STU.filter(u=>!TB0[u].lab),uctl=units.length>1?pickCtl('v7unit',uf,[['all','All units']].concat(units.map(u=>[String(u),`Through ${TB0[u].s} · ${TB0[u].nb}`])),'Skills'):'';
  /* the rows run by status, worst first, under a heading a status; a few of each to begin with, all of them on a click */
  const inF=WEAK.map((m,i)=>({m,i})).filter(o=>uok(o.m.k)&&(ff==='all'||o.m.st===ff)),byS=STS.map(st=>inF.filter(o=>o.m.st===st));
  const groups=byS.map((a,ix)=>({st:STS[ix],rows:S.v7.more?a:(ff==='all'?a.slice(0,ix<2?6:3):a.slice(0,12)),all:a.length})).filter(g=>g.rows.length),rows=groups.flatMap(g=>g.rows);
  if(rows.length&&!rows.some(o=>o.i===S.v7.r))S.v7.r=rows[0].i;
  const ctl=`<div class="controls">${uctl}${seg('v7f',ff,[['all',`All · ${inU.length}`]].concat(STS.filter(st=>cnt(st)).map(st=>[st,`${st} · ${cnt(st)}`])),'Filter by status')}</div>`;
  const leg=`<div class="legend"><span><svg width="26" height="12" aria-hidden="true"><path d="M1 11 L1 8 L7 5 L13 6 L19 2 L25 3 L25 11 Z" style="fill:var(--bad);opacity:.16"/><path d="M1 8 L7 5 L13 6 L19 2 L25 3" fill="none" style="stroke:var(--bad);stroke-width:1.5;stroke-linejoin:round"/></svg>Share of the class not yet secure, five days at a time</span>${sel!==null?`<span><i class="sw" style="background:var(--accent);border-radius:50%"></i>${NM[sel]} is weak in it</span><span><i class="sw" style="border:1.6px solid var(--accent);border-radius:50%"></i>was earlier</span>`:''}</div>`;
  /* Each skill is one row: a small area for the share of the class not yet secure, five days at a time, then where it stands now as a bar and a count.
     The area is pale with a thin line on top, so a page of weak skills doesn't read as a wall of red, and the count carries the size.
     The blocks run from the first day of work to a little after the latest: nothing is drawn after it, so an idle stretch would only squeeze the rows */
  const da=duoW(.6,600),W=da||VW(),L=250,R=126,T0=46,rh=38,gh=28,xt=W-R,st=(xt-L)/NBC,x=j=>L+(j+.5)*st,xd=d=>L+((d-BS(0))/B5)*st,vmax=Math.max(20,...rows.map(o=>o.m.pkv)),ah=rh-15,BWD=56,xb=xt+18,body=rows.length*rh+groups.length*gh,H=T0+body+26;
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="One row per skill from ${dayDate(BS(0))} to ${dayDate(BE(NBC-1))}, grouped by status; the height of each area is the share of the class not yet secure on it, five days at a time">`;
  /* the time axis carries dates only: a unit cannot be placed on it, because a student may redo an earlier unit's work at any time */
  s+=`<line x1="${f1(xt)}" x2="${f1(xt)}" y1="${T0-22}" y2="${T0+body}" style="stroke:var(--axis);stroke-width:1"/>`+T(xt,T0-28,NBC===NBK?'Today':dayDate(BE(NBC-1)),{a:'middle',c:'t2',w:700})+T(xb,T0-9,'Not yet now',{c:'t3',w:700});
  let y=T0;
  groups.forEach(g=>{const col=SC[SG[g.st]][1];s+=`<line x1="4" x2="${W-4}" y1="${f1(y+gh-6)}" y2="${f1(y+gh-6)}" class="grid"/>`+T(10,y+gh-12,`${g.st} · ${g.all}`,{c:col,w:700});y+=gh;
    g.rows.forEach(o=>{const m=o.m,top=y,yc=top+rh/2,yb=top+rh-7,gk=SG[m.st],col=SC[gk][0],lcol=gk==='f'?'var(--ink-3)':col,hh=v=>v/vmax*ah,holds=sel!==null&&m.now.includes(NM[sel]),held=sel!==null&&m.peak.includes(NM[sel]),dim=sel!==null&&!holds&&!held,fd=FD.find(q=>q.k===m.k),fdd=!!fd&&fadeKind(fd.d)==='fade';
      s+=`<g class="row${S.v7.r===o.i?' on':''}${dim?' dim':''}" data-act="v7row" data-r="${o.i}" tabindex="0" role="button" aria-label="${esc(m.n)}, ${m.st}: ${m.now.length} of ${N} students not yet secure. Show details"><rect class="rbg" x="2" y="${top+1}" width="${W-4}" height="${rh-2}" rx="4"/>`;
      /* the name; under it, when the skill was once higher, what it fell from: a skill forgotten is taught again differently from one never learned */
      s+=T(L-14,fdd?yc-1:yc+4,esc(m.n),{a:'end',c:holds?'tacc':'t1',w:holds?700:null})+(fdd?T(L-14,yc+13,`faded: ${Math.round(fd.a)}% → ${Math.round(fd.b)}%`,{a:'end',c:'t3'}):'');
      if(holds)s+=`<circle cx="14" cy="${f1(yc)}" r="4.5" style="fill:var(--accent)"/>`;else if(held)s+=`<circle cx="14" cy="${f1(yc)}" r="4" style="fill:none;stroke:var(--accent);stroke-width:1.6"/>`;
      s+=`<line x1="${L}" y1="${yb}" x2="${f1(xt)}" y2="${yb}" class="grid"/>`;
      /* one area for each run of blocks in which 5% or more of the class was not yet secure */
      let w=0;while(w<NBC){if(m.v[w]>=5){let e=w;while(e<NBC-1&&m.v[e+1]>=5)e++;const line=[];for(let k=w;k<=e;k++)line.push(f1(x(k))+','+f1(yb-hh(m.v[k])));
        const open=e===NBC-1;if(open)line.push(f1(xt)+','+f1(yb-hh(m.v[NBC-1])));const x0=f1(x(w)-st/2),x1=open?f1(xt):f1(x(e)+st/2);
        s+=`<polygon points="${x0},${yb} ${line.join(' ')} ${x1},${yb}" style="fill:${col};opacity:.16"/><polyline points="${x0},${yb} ${line.join(' ')}${open?'':` ${x1},${yb}`}" fill="none" style="stroke:${lcol};stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round"/>`;
        if(open)s+=`<circle cx="${f1(xt)}" cy="${f1(yb-hh(m.v[NBC-1]))}" r="3.4" style="fill:${lcol};stroke:var(--surface);stroke-width:1.5"/>`;w=e+1}else w++}
      /* now: a bar for the share of the class, and how many students that is */
      s+=`<rect x="${f1(xb)}" y="${f1(yc-3)}" width="${BWD}" height="6" rx="3" style="fill:var(--surface-2)"/><rect x="${f1(xb)}" y="${f1(yc-3)}" width="${f1(Math.max(m.now.length?3:0,BWD*m.lastv/100))}" height="6" rx="3" style="fill:${col}"/>`+T(xb+BWD+8,yc+4,m.now.length,{c:'t1',w:700});
      for(let k=0;k<NBC;k++){const v=m.v[k];s+=`<rect x="${f1(L+k*st)}" y="${top+1}" width="${f1(st)}" height="${rh-2}" fill="transparent"${tp(`<b>${esc(m.n)}</b><br>${dayDate(BS(k))} to ${dayDate(BE(k))}: ${v>=5?`${v}% of the class not yet secure`:'under 5% not yet secure'}`)}/>`}
      s+=`<rect x="${f1(xt+4)}" y="${top+1}" width="${R-8}" height="${rh-2}" fill="transparent"${tp(`<b>${esc(m.n)}</b> · ${m.st}<br>${m.now.length} of ${N} students not yet secure now (${m.lastv}%)<br><span>At its worst, ${m.pkv}% around ${dayDate(m.pwd)}</span>`)}/>`;
      s+='</g>';y+=rh})});
  if(!rows.length)s+=T(W/2,T0+20,'Nothing matches this filter.',{a:'middle',c:'t3'});
  [...new Set([0,Math.round((NBC-1)/2),NBC-1])].forEach(k=>{s+=T(x(k),H-6,dayDate(k===NBC-1?BE(k):BS(k)),{a:'middle',c:'t3'})});
  s+='</svg>';
  let det='';
  if(rows.length){const i=S.v7.r,m=WEAK[i],g=SG[m.st],sk=statK(m.k,ALL);
    det=`<div class="detail"><div class="dhead"><h3>${ASK[m.k]}</h3><span class="pill ${SC[g][3]}">${m.st}</span>${g==='p'?(isLogged('v7:'+m.k)?'<span class="pill good">Reteach planned</span>':`<button class="btn small primary" type="button" data-act="v7plan" data-r="${i}">Reteach</button>`):''}<button class="lnk" type="button" data-act="gosub" data-j="${jOf(m.k)}">Where they stall →</button></div>
    ${introCard(m.k)}
    <div class="evs"><div class="ev"><span>The class now</span>${hbar(eo(sk),2)}<span class="hint">${sk.c.E.length} not yet · ${sk.c.H.length} developing · ${sk.c.F.length} secure</span></div></div>
    <div class="dgrid">${m.now.length?whoCol('Not yet','var(--hd-ny)',m.now):'<p class="none">Nobody is weak in it now.</p>'}${m.peak.length?whoCol(`Weak around ${dayDate(m.pwd)}, not now`,'var(--neutral)',m.peak):''}</div></div>`}
  const more=inF.length>rows.length||S.v7.more?`<div class="controls" style="margin:8px 0 0"><button class="btn small" type="button" data-act="v7more" aria-expanded="${S.v7.more}">${S.v7.more?'Show the top few':`Show all ${inF.length}`}</button></div>`:'';
  return ctl+leg+duo(da,fig(s)+more,det,'stick')}

/* ---------- view 8 (Q7): stall points, rolled up from content to subunits and units ----------
   Same outline as Q5: units open into subunits, subunits into their content in the order students meet it.
   Each bar splits the students who use the textbook: gave up, skipped, needed retries, and the rest got it first time.
   A unit or subunit pools all of its content. */
const pathMark=(cx,y,o)=>o===0?`<circle cx="${f1(cx)}" cy="${y}" r="6" style="fill:var(--accent)"/>`:o===1?`<circle cx="${f1(cx)}" cy="${y}" r="5.2" style="fill:var(--surface);stroke:var(--accent);stroke-width:2"/><path d="M${f1(cx)} ${y-5.2} A5.2 5.2 0 0 0 ${f1(cx)} ${y+5.2} Z" style="fill:var(--accent)"/>`:o===2?`<path d="M${f1(cx-5)} ${y-5} L${f1(cx+5)} ${y+5} M${f1(cx+5)} ${y-5} L${f1(cx-5)} ${y+5}" style="stroke:var(--accent);stroke-width:2.4;stroke-linecap:round"/>`:`<circle cx="${f1(cx)}" cy="${y}" r="5.2" style="fill:none;stroke:var(--accent);stroke-width:1.6;stroke-dasharray:2.5 2"/>`;
const pm7=o=>`<svg class="pm" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">${pathMark(7,7,o)}</svg>`;
const OUT7=['First time','Needed retries','Gave up','Skipped'],OUT7L=['Ran right first time','Ran right after more runs','Not right yet','Skipped'];
/* on a page about labs, "gave up" is "not right yet" and is gray, not red: half of all labs are never marked right, so that is a lab's usual state and the share is what matters */
const OUTV=LABV?OUT7L:OUT7,CGU=LABV?'var(--neutral)':'var(--st-gu)',HOT7=LABV?.7:.18;
const pool7=cs=>{const t=[0,0,0,0];let n=0;cs.forEach(x=>{x.t.forEach((v,q)=>t[q]+=v);n+=x.n});return {t,n}};
function tree7(tb){
  return TREEU.map(u=>{const U=TB[tb].units[u],subs=uJs(tb,u).map(j=>{const J=TBJ(tb,j),on=J.on,ct=ctOf(tb,j);
      const cs=on?cCnt(tb,j).map((c,s)=>({s,j,nm:ct[s][0],kind:ct[s][1],t:c,n:c[0]+c[1]+c[2]+c[3]})):[];
      return Object.assign({j,J,on,cs},pool7(cs))});
    return Object.assign({u,U,on:tU(tb,u),subs},pool7(subs.flatMap(x=>x.cs)))})}
/* where the most students gave up, and where the most skipped */
function worst7(T){let g=null,k=null;T.forEach(U=>U.subs.forEach(J=>J.cs.forEach(C=>{if(!g||C.t[2]>g.t[2])g=Object.assign({u:U.u},C);if(!k||C.t[3]>k.t[3])k=Object.assign({u:U.u},C)})));return {g,k}}
function h8(){const tb=S.v8.tb,Tb=TB[tb],{g,k}=worst7(tree7(tb)),n=tbWho(tb).length,of=v=>n<NM.length?`${v} of ${n}`:v,JN=j=>TBJ(tb,j).n,what=LABV?BOOKS[PICK].s:Tb.n;
  if(!g)return `Nothing in ${what} has started yet.`;
  if(g.t[2]<2&&k.t[3]<3)return `Nobody is stalling in ${what} so far.`;
  const JS=j=>TBJ(tb,j).s,gu=LABV?`have not got ${g.nm} to run yet`:`gave up at ${g.nm}`;if(g.j===k.j)return `${JS(g.j)}: ${g.t[2]} ${gu}, ${k.t[3]} skipped ${k.nm}.`;
  return `${g.t[2]} ${gu} (${JS(g.j)}); ${k.t[3]} skipped ${k.nm} (${JS(k.j)}).`}
/* which rows are open: none to begin with. The headline and the panel beside the list already name the worst stall point */
function ex7(tb,T){if(!S.v8.ex[tb])S.v8.ex[tb]={U:[],J:[]};return S.v8.ex[tb]}
function sel7(tb,T){const all=T.flatMap(U=>U.subs.flatMap(J=>J.cs));let s=S.v8.sel[tb];if(!s||!all.some(C=>C.j===s.j&&C.s===s.s)){const {g}=worst7(T);s=S.v8.sel[tb]=g?{j:g.j,s:g.s}:{j:all[0].j,s:0}}return s}
function open7(tb,j,s){const E=ex7(tb,tree7(tb)),u=uOfJ(j);if(!E.U.includes(u))E.U.push(u);if(!E.J.includes(j))E.J.push(j);S.v8.sel[tb]={j,s};S.v8.tb=tb;S.v8.view='outline'}
const lvAll7=tb=>{const us=TREEU.filter(u=>tU(tb,u)),js=us.flatMap(u=>uJs(tb,u)).filter(j=>TBJ(tb,j).on&&ctOf(tb,j).length);return {us,js}};
const level7=tb=>{const E=S.v8.ex[tb],{us,js}=lvAll7(tb);if(!E.U.length)return 'u';if(us.every(x=>E.U.includes(x))){if(!js.some(x=>E.J.includes(x)))return 'j';if(js.every(x=>E.J.includes(x)))return 'c'}return ''};
const sKey7=(tb,j,s)=>tb===0?`v8:${j}:${s}`:`v8:${tb}:${j}:${s}`;
const OUTLEG7=`<span class="lt">Students</span><span><i class="sw" style="background:${CGU}"></i>${OUTV[2]}</span><span><i class="sw" style="background:var(--st-sk)"></i>Skipped</span><span><i class="sw" style="background:var(--st-rt)"></i>${OUTV[1]}</span><span><i class="sw" style="background:var(--ok-fill)"></i>${OUTV[0]}</span>`;
function v8(){const tb=S.v8.tb,T=tree7(tb),ids=tbWho(tb),Tb=TB[tb],E=ex7(tb,T),sl=sel7(tb,T),srt=S.v8.sort,su=S.stu,fol=su!==null&&ids.includes(su);
  const key=o=>!o.n?-1:srt==='gu'?o.t[2]/o.n:srt==='sk'?o.t[3]/o.n:0;
  const ord=a=>srt==='course'?a:a.slice().sort((x,y)=>key(y)-key(x));
  const pc=(o,q,cls)=>`<span class="hp ${cls}">${o.n?Math.round(o.t[q]/o.n*100)+'%':''}</span>`;
  const nums=(o,lv)=>pc(o,2,'g'+(lv===2&&o.t[2]/o.n>=HOT7?' hot':''))+pc(o,3,'k'+(lv===2&&o.t[3]/o.n>=.29?' warm':''));
  const bar=(o,lv)=>{const w=v=>f1(v/o.n*100);return `<span class="hb b${lv}" aria-hidden="true"><i style="width:${w(o.t[2])}%;background:${CGU}"></i><i style="width:${w(o.t[3])}%;background:var(--st-sk)"></i><i style="width:${w(o.t[1])}%;background:var(--st-rt)"></i><i style="width:${w(o.t[0])}%;background:var(--ok-fill)"></i></span>`};
  /* the followed student: their outcome on each piece of content, and on a unit or subunit how many they gave up on or skipped */
  const oc=(j,s)=>cOut(tb,j)[s][su];
  const smC=C=>{const o=oc(C.j,C.s);return o<0?'':`${pm7(o)}<span class="sr">${NM[su]}: ${OUTV[o].toLowerCase()}</span>`};
  const smR=cs=>{let g=0,k=0;cs.forEach(C=>{const o=oc(C.j,C.s);if(o===2)g++;else if(o===3)k++});return (g?`<span class="pmn">${pm7(2)}${g}</span>`:'')+(k?`<span class="pmn">${pm7(3)}${k}</span>`:'')+(g||k?`<span class="sr">${NM[su]}: ${[g?(LABV?'not right yet on ':'gave up on ')+g:'',k?'skipped '+k:''].filter(Boolean).join(', ')}</span>`:'')};
  const sc=f=>fol?`<span class="hs">${f()}</span>`:'';
  const tipR=(name,cs)=>{const gs=new Set(),ks=new Set();cs.forEach(C=>{const O=cOut(tb,C.j)[C.s];ids.forEach(i=>{if(O[i]===2)gs.add(i);else if(O[i]===3)ks.add(i)})});
    return `<b>${name}</b><br>${gs.size} ${pl(gs.size,'student')} ${LABV?'have a lab here not right yet':'gave up on something here'} · ${ks.size} skipped something<br><span>The bar pools all ${cs.length} ${LABV?'labs':'pieces of content'}</span>`};
  const off=(lv,name,txt)=>`<div class="hr l${lv} off"><span class="hn"><span class="chs"></span>${name}</span><span class="hx">${txt}</span><span class="hp g"></span><span class="hp k"></span>${fol?'<span class="hs"></span>':''}</div>`;
  const cRow=C=>{const on=sl.j===C.j&&sl.s===C.s,t=C.t;
    return `<li><button type="button" class="hr l2${on?' on':''}" data-act="v8c" data-j="${C.j}" data-s="${C.s}" aria-pressed="${on}"${tp(`<b>${C.nm}</b><br>${C.kind==='r'?`${t[0]} tried it · ${t[3]} skipped · nothing marks it right`:`${t[0]} ${OUTV[0].toLowerCase()} · ${t[1]} ${OUTV[1].toLowerCase()}<br>${t[2]} ${OUTV[2].toLowerCase()} · ${t[3]} skipped`}`)}><span class="hn"><span class="chs"></span><span>${C.nm}</span></span>${bar(C,2)}${nums(C,2)}${sc(()=>smC(C))}</button></li>`};
  const jRow=J=>{if(!J.on||!J.cs.length)return `<li>${off(1,J.J.n,J.on?'No content yet':'Not started')}</li>`;const o=E.J.includes(J.j);
    return `<li><button type="button" class="hr l1" data-act="v8sub" data-j="${J.j}" aria-expanded="${o}"${tp(tipR(J.J.n,J.cs))}><span class="hn">${CHEV}<span>${J.J.n}</span></span>${bar(J,1)}${nums(J,1)}${sc(()=>smR(J.cs))}</button>${o?`<ul>${ord(J.cs).map(cRow).join('')}</ul>`:''}</li>`};
  const uRow=U=>{if(!U.on)return `<li class="hu">${off(0,`<b>${U.U.nb}</b>`,'Not started')}</li>`;const o=E.U.includes(U.u),cs=U.subs.flatMap(J=>J.cs);
    return `<li class="hu"><button type="button" class="hr l0" data-act="v8unit" data-u="${U.u}" aria-expanded="${o}"${tp(tipR(U.U.n,cs))}><span class="hn">${CHEV}<b>${U.U.nb}</b></span>${bar(U,0)}${nums(U,0)}${sc(()=>smR(cs))}</button>${o?`<ul>${ord(U.subs.filter(J=>J.on)).map(jRow).join('')}${nsRow(U.subs.filter(J=>!J.on).map(J=>`<i${tp(J.J.n)}>${J.J.s}</i>`))}</ul>`:''}</li>`};
  const note=[ids.length<NM.length?`${ids.length} of ${NM.length} students use ${Tb.n}.`:'',su!==null&&!fol?`${NM[su]} doesn’t use it.`:''].filter(Boolean).join(' ');
  /* the first view is the answer: the questions where the most students gave up or skipped, worst first. The outline of the book is the second view */
  const view=S.v8.view||'worst',vw=`<span class="sel">View ${seg('v8view',view,[['worst','Worst questions'],['outline','By unit']],'View')}</span>`;
  const ctl=`<div class="controls">${vw}${view==='outline'?`<span class="sel">Show ${seg('v8lvl',level7(tb),[['u','Units'],['j','Subunits'],['c','Content']],'Show rows down to')}</span><label class="sel" for="v8sort">Sort <select id="v8sort">${[['course','Course order'],['gu','Most gave up first'],['sk','Most skipped first']].map(([v,l])=>`<option value="${v}"${srt===v?' selected':''}>${l}</option>`).join('')}</select></label>`:''}</div>`;
  const worst=T.flatMap(U=>U.subs.flatMap(J=>J.cs)).filter(C=>C.n&&(C.t[2]>=2||C.t[3]>=3)).sort((a,b)=>(b.t[2]+b.t[3])-(a.t[2]+a.t[3])||b.t[2]-a.t[2]).slice(0,8);
  const wRow=C=>{const on=sl.j===C.j&&sl.s===C.s,t=C.t;
    return `<li><button type="button" class="hr l0${on?' on':''}" data-act="v8c" data-j="${C.j}" data-s="${C.s}" aria-pressed="${on}"${tp(`<b>${C.nm}</b> · ${TBJ(tb,C.j).n}<br>${C.kind==='r'?`${t[0]} tried it · ${t[3]} skipped · nothing marks it right`:`${t[0]} ${OUTV[0].toLowerCase()} · ${t[1]} ${OUTV[1].toLowerCase()}<br>${t[2]} ${OUTV[2].toLowerCase()} · ${t[3]} skipped`}`)}><span class="hn"><span>${C.nm}<span class="tg">${TBJ(tb,C.j).s}</span></span></span>${bar(C,1)}${nums(C,2)}${sc(()=>smC(C))}</button></li>`};
  const wList=`<ul class="hc v7${fol?' fol':''}" aria-label="The questions where the most students gave up or skipped, worst first"><li class="hh" aria-hidden="true"><div class="hr"><span class="hn"></span><span class="hx"></span><span class="hp g">${LABV?'Not right yet':'Gave up'}</span><span class="hp k">Skipped</span>${fol?`<span class="hs">${NM[su]}</span>`:''}</div></li>${worst.map(wRow).join('')}</ul>${worst.length?'':'<p class="none">Nobody has given up on or skipped a question yet.</p>'}`;
  const leg=`<div class="legend mleg">${OUTLEG7}${fol?`<span class="lt">${NM[su]}</span>${[2,3,1,0].map(o=>`<span>${pm7(o)}${OUTV[o]}</span>`).join('')}`:''}</div>`;
  const list=`<ul class="hc v7${fol?' fol':''}" aria-label="${Tb.n}: where students gave up, skipped or needed retries, by unit, subunit and content"><li class="hh" aria-hidden="true"><div class="hr"><span class="hn"></span><span class="hx"></span><span class="hp g">${LABV?'Not right yet':'Gave up'}</span><span class="hp k">Skipped</span>${fol?`<span class="hs">${NM[su]}</span>`:''}</div></li>${treeBody(T,ord,uRow,U=>`<i>${U.U.nb}</i>`)}</ul>${labsNote('they are not listed with the questions')}`;
  /* detail: the selected piece of content */
  const U0=T.find(U=>U.subs.some(J=>J.j===sl.j)),J0=U0.subs.find(J=>J.j===sl.j),C0=J0.cs[sl.s],c=C0.t,n=C0.n,O=cOut(tb,sl.j)[sl.s];
  const by=[0,1,2,3].map(q=>ids.filter(i=>O[i]===q).map(i=>NM[i])),stall=c[2]/n>=HOT7,skp=c[3]/n>=.29,act=skp||c[2]/n>=(LABV?.5:.1);
  const nt=((tb===0?STALL[sl.j]:XSTALL[tb+':'+sl.j])||{})[sl.s],pk=sKey7(tb,sl.j,sl.s);
  const chg=skp?'Assign it as coursework':'Reteach this';
  const det=`<div class="detail"><div class="dhead"><h3>${C0.nm}</h3><span class="hint">${J0.J.s}</span>${stall?`<span class="pill bad">${LABV?'Hardest lab':'Stall point'}</span>`:skp?'<span class="pill watch">Often skipped</span>':''}${act?(isLogged(pk)?'<span class="pill good">Planned</span>':`<button class="btn small primary" type="button" data-act="v8plan">${chg}</button>`):''}</div>
  ${nt?`<p class="dtext">${nt}</p>`:''}<div class="dgrid">${by[2].length?whoCol(OUTV[2],CGU,by[2]):''}${by[3].length?whoCol('Skipped','var(--st-sk)',by[3]):''}${C0.kind!=='r'&&by[1].length?whoCol(OUTV[1],'var(--st-rt)',by[1]):''}${!by[2].length&&!by[3].length?`<p class="none">${LABV?'Everyone who tried this lab got it to run.':'Nobody gave up on or skipped this.'}</p>`:''}</div></div>`;
  return (note?`<p class="hint" style="margin:0 0 10px">${note}</p>`:'')+ctl+leg+duo(duoW(.6,560),view==='outline'?list:wList,det,'stick')}

/* ---------- view 10: fade slopes ---------- */
const fadeKind=d=>d<=-8?'fade':d>=5?'up':'flat';
const dTxt=d=>`${d<=-.5?'−':d>=.5?'+':''}${Math.abs(Math.round(d))}`;
const PREK=new Set(PRE.map(q=>q.k));
function h10(){if(!FD.length)return 'No skill has been checked again 21 days or more after it was taught.';const f=FD.filter(o=>fadeKind(o.d)==='fade').sort((a,b)=>a.d-b.d);if(!f.length)return `None of the ${FD.length} skills checked again later has faded.`;
  const top=f[0];
  return `${SK[top.k]} was ${Math.round(top.a)}% when taught and is ${Math.round(top.b)}% now: ${f.length} of ${FD.length} rechecked skills faded.`}
/* one row per skill: open dot = class average when taught, solid dot = the later check; biggest drop first */
function v10(){const Z=S.v10,sel=S.stu;
  /* the view opens on the skills that faded, which is the answer to its question; a tick brings in every skill that was checked again */
  const inU=FD.filter(o=>Z.u==='all'||uOf(o.k)===+Z.u);
  let rows=inU.filter(o=>Z.all||fadeKind(o.d)==='fade');
  rows=rows.slice().sort((a,b)=>a.d-b.d||a.k-b.k);
  /* nothing is picked to begin with: the chart of every student appears beside the rows when a skill is clicked, and goes when it is clicked again */
  if(!rows.some(o=>o.k===Z.k))Z.k=-1;const pk=Z.k>=0?FD.find(q=>q.k===Z.k):null;
  const fdu=[...new Set(FD.map(o=>uOf(o.k)))];if(MULTI)fdu.sort((a,b)=>a-b);
  const ctl=`<div class="controls">${pickCtl('v10unit',Z.u,[['all','All units']].concat(fdu.map(u=>[String(u),`${TB0[u].s} · ${TB0[u].nb}`])),'Unit')}<label class="chk" for="v10all"><input type="checkbox" id="v10all"${Z.all?' checked':''}> Show all ${inU.length}</label></div>`;
  const dot=(f,st)=>`<svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" style="fill:${f};${st||''}"/></svg>`;
  const leg=`<div class="legend"><span>${dot('var(--surface)','stroke:var(--ink-3);stroke-width:1.6')}When taught</span><span>${dot('var(--bad)')}Later: down 8+</span>${Z.all?`<span>${dot('var(--neutral)')}Steady</span><span>${dot('var(--good)')}Grew</span>`:''}${sel!==null?`<span><svg width="22" height="10" aria-hidden="true"><line x1="3" y1="5" x2="19" y2="5" style="stroke:var(--accent);stroke-width:1.6"/><circle cx="19" cy="5" r="3" style="fill:var(--accent)"/></svg>${NM[sel]}</span>`:''}</div>`;
  const sv=sel!==null?rows.flatMap(o=>ML[sel][o.k]===null?[]:[MT[sel][o.k]*100,ML[sel][o.k]*100]):[],lo=Math.max(0,Math.min(40,Math.floor((sv.length?Math.min(...sv):40)/10)*10));
  /* alone, the rows are a chart of modest width in the middle of the page; with a skill picked they share a wider stage with its chart */
  const da=pk?duoW(.6,620,Math.min(VW(),1360)):0,SWD=Math.min(VW(),da?1360:920),W=da||SWD,wide=W>=700;
  if(!rows.length)return stage(SWD,ctl+`<p class="none">${Z.all?'No skill here has been checked again 21 days or more after it was taught.':`No skill here has faded.${inU.length?` Tick “Show all” for the ${inU.length} that were checked again.`:''}`}</p>`);
  /* a narrow chart leaves out the last column: the panel beside it says which unit builds on the skill */
  const LX=198,X0=214,X1=W-(wide?276:156),hi=100,x=v=>X0+(clamp(v,lo,hi)-lo)/(hi-lo)*(X1-X0),T0=30,rh=(sel!==null?28:24)+(rows.length<=12?6:0),H=T0+rows.length*rh+8;
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="Each skill's class average when taught and ${LATER}, biggest drop first">`;
  for(let v=lo;v<=100;v+=lo<30?20:10){s+=`<line x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${T0-4}" y2="${H-6}" class="grid"/>`+T(x(v),T0-10,v,{a:'middle',c:'t3'})}
  s+=T(X1+24,T0-10,'Change',{c:'t3',w:700})+T(X1+76,T0-10,'Slipped 20+',{c:'t3',w:700})+(wide?T(X1+150,T0-10,`Needed in ${TB0[CU].s}`,{c:'t3',w:700}):'');
  rows.forEach((o,ri)=>{const y=T0+ri*rh+rh/2-(sel!==null?3:0),kd=fadeKind(o.d),col=kd==='fade'?'var(--bad)':kd==='up'?'var(--good)':'var(--neutral)',on=o.k===Z.k,need=PREK.has(o.k);
    s+=`<g class="row${on?' on':''}" data-act="v10line" data-k="${o.k}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${SK[o.k]}: ${Math.round(o.a)} when taught, ${Math.round(o.b)} ${LATER}, ${o.sl.length} slipped"${tp(`<b>${dTxt(o.d)} points</b> · ${SK[o.k]}<br>${Math.round(o.a)}% when taught (week ${KT[o.k]}) → ${Math.round(o.b)}% ${LATER}<br><span>${o.sl.length} slipped 20+ points${need?` · needed for ${NXT}`:''}</span>`)}><rect class="rbg" x="2" y="${f1(T0+ri*rh+1)}" width="${W-4}" height="${rh-2}" rx="5"/>`;
    s+=T(LX,y+4,ASKM[o.k],{a:'end',c:on||kd==='fade'?'t1':'t2',w:on||kd==='fade'?700:null});
    s+=`<line x1="${f1(x(o.a))}" x2="${f1(x(o.b))}" y1="${f1(y)}" y2="${f1(y)}" style="stroke:${col};stroke-width:4;stroke-linecap:round;opacity:.5"/><circle cx="${f1(x(o.a))}" cy="${f1(y)}" r="4.5" style="fill:var(--surface);stroke:var(--ink-3);stroke-width:1.8"/><circle cx="${f1(x(o.b))}" cy="${f1(y)}" r="5" style="fill:${col};stroke:var(--surface);stroke-width:2"/>`;
    if(sel!==null&&ML[sel][o.k]!==null){const a=MT[sel][o.k]*100,b=ML[sel][o.k]*100,sy=y+9;s+=`<line x1="${f1(x(a))}" x2="${f1(x(b))}" y1="${f1(sy)}" y2="${f1(sy)}" style="stroke:var(--accent);stroke-width:1.6"/><circle cx="${f1(x(a))}" cy="${f1(sy)}" r="2.6" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.4"/><circle cx="${f1(x(b))}" cy="${f1(sy)}" r="3" style="fill:var(--accent)"/>`}
    s+=T(X1+24,y+4,dTxt(o.d),{c:kd==='fade'?'tbad':kd==='up'?'tgood':'t3',w:kd==='fade'?700:null});
    s+=T(X1+76,y+4,o.sl.length||'–',{c:o.sl.length?'t1':'t3'});
    if(need&&wide)s+=T(X1+150,y+4,'yes',{c:kd==='fade'?'tbad':'t2',w:kd==='fade'?700:null});
    s+='</g>'});
  s+='</svg>';
  return stage(SWD,ctl+leg+duo(da,fig(s),pk?v10det(pk,da?Math.min(520,duoB(da,SWD)):0):'','stick'))}
/* the picked skill: every student, score when taught (across) against the later check (up) */
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
  const need=PREK.has(k),act=kd==='fade'?(isLogged('v10:'+k)?'<span class="pill good">Review set planned</span>':`<button class="btn small primary" type="button" data-act="v10plan" data-k="${k}">Give a review set</button>`):'';
  const side=`<div class="fside"><div class="dhead"><h3>${SK[k]}</h3><span class="pill ${kd==='fade'?'bad':kd==='up'?'good':''}">${Math.round(o.a)}% → ${Math.round(o.b)}%</span><button class="x shut" type="button" data-act="v10close" aria-label="Close ${SK[k]}">${IC.x}</button></div>
    ${introCard(k)}<p class="hint">${o.n} students rechecked${need?` · ${TB0[CU].s} builds on it`:''}</p>
    ${o.sl.length?whoCol('Slipped 20+ points','var(--bad)',o.sl):'<p class="none">Nobody slipped 20 points or more.</p>'}<div class="tc-act">${act}</div></div>`;
  /* beside the rows the panel is one column: the skill and its action, the chart, then who slipped. Under them it is the chart with the rest to its right */
  const shut=`<button class="x shut" type="button" data-act="v10close" aria-label="Close ${SK[k]}">${IC.x}</button>`;
  if(w)return `<div class="detail"><div class="dhead"><h3>${SK[k]}</h3><span class="pill ${kd==='fade'?'bad':kd==='up'?'good':''}">${Math.round(o.a)}% → ${Math.round(o.b)}%</span>${act}${shut}</div>
    ${introCard(k)}<p class="hint">${o.n} students rechecked${need?` · ${TB0[CU].s} builds on it`:''}</p>${fig(s)}${o.sl.length?whoCol('Slipped 20+ points','var(--bad)',o.sl):'<p class="none">Nobody slipped 20 points or more.</p>'}</div>`;
  return `<div class="detail"><div class="fdet">${fig(s)}${side}</div></div>`}

/* ---------- view 11 (Q10): readiness tree, for any unit of any textbook ----------
   The unit sits at the top, the skills it builds on below it, and the skills those build on at the bottom.
   Rings are the share of the textbook's students who are secure now. A skill no item checks has no evidence. */
const ringCol=(p,th)=>p>=80?'good':p>=th?'watch':'bad';
/* the data holds no plan, so the page asks which unit is next and picks the first one not started; the unit the class is in when every unit is started */
const rdDef=tb=>{const ok=(U,u)=>!U.on&&(!MULTI||PICK!==null||U.tb===MAIN);let nx=TB0.findIndex((U,u)=>u>CU&&ok(U,u));if(nx<0)nx=TB0.findIndex(ok);return nx>=0?nx:CU};
const rdState=U=>!U.on?'later':U===TB0[CU]?'now':'past';
function rdSel(){const tb=S.v11.tb;let u=S.v11.u[tb];if(u===undefined)u=S.v11.u[tb]=rdDef(tb);const U=TB[tb].units[u],key=tb+':'+u;return {tb,u,U,key,pre:READY[key]||[],ids:tbWho(tb),st:rdState(U)}}
const secOf=(i,k)=>{const m=mast(i,k);return !!m&&m.cat==='F'};
const rdF=(k,ids)=>ids.filter(i=>secOf(i,k)).map(i=>NM[i]);
/* a skill that isn't taught yet, or that no item checks, has no share */
const rdTaught=k=>KTA[k];
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
  /* one select, every unit of every book in it, grouped by book under "All books" */
  const unitSeg=pickCtl('v11unit',R.u,unitOpts(Tb.units.map((U,u)=>u)),'Next unit');
  const why=`<p class="hint" style="margin:0 0 10px">${R.U.n}: ${R.st==='later'?`picked as the first unit not started after ${TB0[CU].s}; pick another if you teach another next`:R.st==='now'?'the unit the class is in':'a unit the class has done'}.</p>`;
  const out=S.stu!==null&&!R.ids.includes(S.stu),ks=R.pre.flatMap(q=>q.c!==null?[q.k,q.c]:[q.k]),noev=ks.some(k=>rdTaught(k)&&!chk5(k)),nyet=ks.some(k=>!rdTaught(k));
  const note=[R.ids.length<NM.length?`${R.ids.length} of ${NM.length} students use ${Tb.n}.`:'',out?`${NM[S.stu]} doesn’t use it.`:''].filter(Boolean).join(' ');
  return `${note?`<p class="hint" style="margin:0 0 10px">${note}</p>`:''}<div class="controls">${unitSeg}</div>${why}
  ${R.pre.length?`<div class="legend"><span><i class="sw" style="background:var(--bad)"></i>Below your line</span><span><i class="sw" style="background:var(--watch)"></i>Under 80%</span><span><i class="sw" style="background:var(--good)"></i>Ready</span><span><svg width="12" height="12" aria-hidden="true"><line x1="6" y1="0" x2="6" y2="12" style="stroke:var(--ink);stroke-width:2"/></svg>Your line</span>${noev?NOEV:''}${nyet?NOEV.replace('No item checks it','Not taught yet'):''}</div>`:''}<div id="v11c"></div>${R.pre.length?fold('v11line','Your readiness line',`<div class="controls" style="margin:12px 0 0"><label class="rng" for="v11th">Secure for at least <output id="v11o">${th}% of the class</output><input type="range" id="v11th" min="40" max="80" step="5" value="${th}"></label></div>`):''}`}
function v11draw(){const c=$('#v11c');if(!c)return;const th=S.v11.th,P=planNow(),R=P.R,ids=R.ids,n=ids.length,sel=S.stu!==null&&ids.includes(S.stu)?S.stu:null,an=$('#ans');
  if(!R.pre.length){c.innerHTML='<p class="none">Pick another unit to see what it builds on.</p>';if(an)an.textContent=h11();return}
  /* the rings stay close under the unit rather than spreading over the row; a long skill name takes two lines */
  const N=R.pre.length,da=duoW(.58,Math.max(560,N*150+20)),W=da||VW(),H=R.pre.some(q=>q.c!==null)?376:262,rx=W/2,ry=40,gap=clamp((W-100)/Math.max(1,N),150,240),xs=R.pre.map((_,ix)=>rx+(ix-(N-1)/2)*gap),cy=166,gy=316,nch=Math.floor((gap-14)/7);
  const two=t=>{if(t.length<=nch)return [t];const at=t.lastIndexOf(' ',nch);return at<1?[cut(t,nch)]:[t.slice(0,at),cut(t.slice(at+1),nch)]};
  const sub=R.st==='later'?'Not started':R.st==='now'?`Latest work · ${whenTxt(R.U)}`:`Worked on ${whenTxt(R.U)}`;
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
  if(P.ext.length)logAct(pf+'ext',10,`Stretch set for ${andList(P.ext)}`,'plan',true);
  S.v11.acc[R.key]=true;toast(`Plan accepted. ${S.log.filter(e=>e.key.startsWith(pf)).length} actions logged.`)}

/* ---------- view 12: my actions, and whether the practice sets worked ----------
   The log of everything the teacher did today comes first. Under it, each targeted practice set with its effect range; the invented sample
   rows are fenced off, named as invented, and attached to nobody: the headline counts real sets only. */
function h12(){const real=IVS.filter(d=>!d.sample),n=S.log.length,lg=n?`${n} ${pl(n,'action')} logged today. `:'';
  if(!real.length)return lg+'No targeted practice set is recorded for this class yet.';
  const w=real.filter(d=>d.lo>0).map(d=>d.sn||d.n),e=real.filter(d=>d.est===null);
  if(w.length)return lg+`${w.length} ${pl(w.length,'set')} worked: ${andList(w)}.`;
  if(e.length===real.length)return lg+(real.length===1?`Too early to tell for the one set you targeted (${real[0].sn}, ${real[0].when}).`:`Too early to tell for the ${real.length} sets you targeted.`);
  return lg+'No targeted set has clearly worked yet.'}
function v12(){const sel=S.stu,all=IVS.map((d,i)=>({d,i})),real=all.filter(o=>!o.d.sample),samp=all.filter(o=>o.d.sample);
  if(!IVS.some((d,i)=>i===S.v12.r))S.v12.r=real.length?real[0].i:0;
  const lg=S.log.length?`<ul class="log">${S.log.slice().reverse().map(e=>`<li><time>${e.at}</time><span class="vp">${vFrom(e.v)}</span><span>${esc(e.t)}</span><span class="pill ${e.kind==='plan'?'watch':'good'}">${e.kind==='plan'?'In progress':'Done'}</span></li>`).join('')}</ul>`:'<p class="none">Nothing logged yet. Every button on every page logs here.</p>';
  const prog=`<div class="detail lead" id="log"><div class="dhead"><h3>My actions today</h3><span class="pill">${S.log.length}</span></div>${lg}</div>`;
  const leg=`<div class="legend"><span><i class="sw" style="background:var(--good)"></i>Worked</span><span><i class="sw" style="background:var(--watch)"></i>Promising</span><span><i class="sw" style="background:var(--neutral)"></i>No clear effect</span><span><i class="sw" style="background:var(--surface);box-shadow:inset 0 0 0 1px var(--neutral)"></i>Too early to tell</span></div>`;
  const da=duoW(.6,620),W=da||VW(),L=262,R=150,rh=50,T0=38,x=v=>L+(clamp(v,-10,25)+10)/35*(W-L-R);
  /* one row a set: the dot is the best estimate of extra points gained against the students who did not do it, the bar the range it could plausibly be */
  const chart=rows=>{const H=T0+rows.length*rh+44;
    let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="Effect ranges: extra points gained after each practice set, against its comparison group">`;
    s+=`<rect x="${f1(x(0))}" y="${T0-12}" width="${f1(x(25)-x(0))}" height="${rows.length*rh+12}" style="fill:var(--bg-good)"/>`+T(x(0)+8,T0-18,'helped →',{c:'tgood',w:700})+T(x(0)-8,T0-18,'← hurt',{a:'end',c:'t3'});
    [-10,10,20].forEach(t=>{s+=`<line x1="${f1(x(t))}" x2="${f1(x(t))}" y1="${T0-12}" y2="${T0+rows.length*rh}" class="grid" stroke-dasharray="2 3"/>`});
    [-10,0,10,20].forEach(t=>{s+=T(x(t),T0+rows.length*rh+16,sgn(t),{a:'middle',c:'t3'})});
    s+=`<line x1="${f1(x(0))}" x2="${f1(x(0))}" y1="${T0-12}" y2="${T0+rows.length*rh}" class="axis"/>`+T((x(-10)+x(25))/2,H-6,'Extra points vs the comparison group',{a:'middle'});
    rows.forEach((o,ri)=>{const d=o.d,v=verdict(d),yc=T0+ri*rh+rh/2,got=sel!==null&&!d.sample&&d.who.includes(NM[sel]),wh=d.who.length===N?'Whole class':d.who.length+' students';
      s+=`<g class="row${S.v12.r===o.i?' on':''}" data-act="v12row" data-r="${o.i}" tabindex="0" role="button" aria-label="${d.n}: ${v.t}${d.sample?' (sample)':''}"${tp(`<b>${d.n}</b>${d.sample?' · sample':''}<br>${d.est===null?d.cmp:`${sgn(d.est)} points (range ${sgn(d.lo)} to ${sgn(d.hi)})`}`)}><rect class="rbg" x="2" y="${f1(yc-rh/2+2)}" width="${W-4}" height="${rh-4}" rx="6"/>`;
      s+=T(12,yc-3,d.n,{c:'t1',w:700})+T(12,yc+13,`${wh} · ${d.when}${d.sample?' · sample':''}`,{c:'t3'});
      if(d.est===null)s+=`<circle cx="${f1(x(0))}" cy="${f1(yc)}" r="5" style="fill:var(--surface);stroke:var(--neutral);stroke-width:1.5"/>`;else s+=`<line x1="${f1(x(d.lo))}" y1="${f1(yc)}" x2="${f1(x(d.hi))}" y2="${f1(yc)}" style="stroke:${v.m};stroke-width:4;stroke-linecap:round" opacity=".6"/><circle cx="${f1(x(d.est))}" cy="${f1(yc)}" r="${f1(4+Math.sqrt(d.who.length))}" style="fill:${v.m};stroke:var(--surface);stroke-width:1.5"/>`;
      s+=T(W-R+14,yc+(got?-3:4),v.t,{c:v.k,w:700});if(got)s+=T(W-R+14,yc+13,`${NM[sel]} did this`,{c:'tacc'});
      s+='</g>'});
    return fig(s+'</svg>')};
  const detFor=rows=>{const o=rows.find(q=>q.i===S.v12.r);if(!o)return '<p class="hint">Click a row for its detail.</p>';const d=o.d,v=verdict(d);
    return `<div class="detail"><div class="dhead"><h3>${d.n}</h3><span class="pill ${v.c}">${v.t}</span>${d.sample?'<span class="pill">Sample</span>':''}<span class="dnext">${d.rec}</span></div><p class="hint">${d.dose} · ${d.sample?'compared with ':''}${d.cmp}</p>${d.sample?'<p class="hint">Invented: no student of this class did it.</p>':d.who.length<N?whoCol('Who did it','var(--accent)',d.who):''}</div>`};
  const sets=`<div class="detail"><div class="dhead"><h3>Did the practice sets work?</h3>${real.length?`<span class="hint">${real.length} targeted ${pl(real.length,'set')}, judged on later work on the same skills</span>`:''}</div>${real.length?leg+duo(da,chart(real),detFor(real)):'<p class="none">The database records no practice set targeted at part of this class, so there is nothing to compare yet.</p>'}</div>`;
  const fence=samp.length?fold('v12sample',`Sample rows · ${samp.length} <span class="pill">invented, to show the chart</span>`,`<p class="hint" style="margin:8px 0 12px">These rows are invented (data/sample.js). They show what the chart says once a set has later work to judge it by; they are about nobody in this class.</p>${leg}${duo(da,chart(samp),detFor(samp))}`):'';
  return prog+sets+fence}

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
  const src=[...new Set(g.items.filter(r=>!r.draft).map(r=>ITEMS[+r.key.slice(1)].tb))];if(src.length>1)b.push(`Pulls items from ${andList(src.map(x=>BOOKS[x].n))}.`);
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
const drifting=i=>DR[i]>=0;

/* ---------- student profile ---------- */
function profCard(i){const n=NM[i];let best=null;
  for(const j of TAUGHTJ){const c=cell2(i,KS2.j(j));if(c.mc==='U'||c.mc==='M'||c.mc==='P'||c.lab)continue;const pri=c.g==='stuck'||c.g==='off'?0:1;if(!best||pri<best.pri||(pri===best.pri&&c.m<best.m))best={j,m:c.m,g:c.g,pri}}
  if(!best)return {id:'p'+i,cat:'ext',tb:0,n:1,u:CU,js:[],ks:XKS,who:[n],t:UN[CU][0],s:'a stretch'};
  const j=best.j;return {id:'p'+i,cat:best.g==='off'?'off':'stuck',tb:0,n:1,u:uOfJ(j),js:[j],ks:jSk(0,j),who:[n],t:UN[uOfJ(j)][0],s:SUB[j]}}
const cardById=id=>/^p\d+$/.test(id)?profCard(+id.slice(1)):null;
function profMoments(i){const n=NM[i],m=[];
  IVS.forEach(d=>{if(d.sample)return;if(d.who.length<NM.length&&d.who.includes(n))m.push({w:d.day,k:'iv',t:`Did the practice set ${d.n}`})});   // an invented row is about nobody
  if(drifting(i))m.push({w:DR[i],k:'bad',t:'Work fell below their normal'});
  slipped(i).slice(0,2).forEach(k=>m.push({w:Math.min(TODAY,KT[k]+RECHECK),k:'bad',t:`Slipped on ${SK[k]}`}));
  return m.sort((a,b)=>a.w-b.w)}
function profTL(i,W){const L=40,R=120,top=30,ph=130,H=top+ph+50,x=j=>L+j*(W-L-R)/Math.max(1,NBC-1),xd=d=>Math.min(x(NBC-1),L+((d-BS(0))/B5)*(W-L-R)/Math.max(1,NBC-1)),y=v=>top+(1-v)*ph,n=NM[i],d=drifting(i)?DR[i]:-1,dj=d>=0?blockOf(d):-1,nm=NORM[i],a=WB[i],hi=Math.max(1,nm?nm*2:0,...a.slice(0,NBC)),yw=v=>top+ph-clamp(v,0,hi)/hi*ph;
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="${n}: share of taught skills secure, and questions tried per five days, ${dayDate(BS(0))} to ${dayDate(BE(NBC-1))}"><defs>${HATCH}</defs>`;
  /* dates only on the time axis: a unit's work can be redone at any time, so no unit is placed on it */
  [0,.5,1].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${f1(y(v))}" y2="${f1(y(v))}" style="stroke:var(--rule)"/>`+T(L-6,y(v)+4,Math.round(v*100)+(v===1?'%':''),{a:'end',c:'t3'})});
  if(!TOOFEW&&nm)s+=`<rect x="${L}" y="${f1(yw(nm*1.5))}" width="${W-L-R}" height="${f1(yw(nm/2)-yw(nm*1.5))}" style="fill:var(--neutral);opacity:.28"/>`+T(L+6,yw(nm)+4,`normal ${nm} per 5 days`,{c:'t3'});   // with too little work in the book there is no work line
  s+=quietRects(x,top-4,ph+8,L,W-R);
  const live=liveBlocks(),ap=live.map(j=>f1(x(j))+','+f1(yw(a[j]))),di=live.indexOf(dj);
  if(!TOOFEW)s+=d>=0&&di>=0?`<polyline points="${ap.slice(0,di).join(' ')}" fill="none" style="stroke:var(--ink-3);stroke-width:1.8;stroke-linejoin:round"/><polyline points="${ap.slice(Math.max(0,di-1)).join(' ')}" fill="none" style="stroke:var(--bad);stroke-width:2.2;stroke-linejoin:round"/>`:`<polyline points="${ap.join(' ')}" fill="none" style="stroke:var(--ink-3);stroke-width:1.8;stroke-linejoin:round"/>`;
  const mp=[];for(let j=0;j<NBC;j++)mp.push(f1(x(j))+','+f1(y(secAt(i,j))));
  s+=`<polyline points="${mp.join(' ')}" fill="none" style="stroke:var(--good);stroke-width:2.8;stroke-linejoin:round"/>`;
  const ma=secAt(i,NBC-1),aw=a[RB];let ym=y(ma)+4,ya=yw(aw)+4;if(Math.abs(ym-ya)<15){const mid=(ym+ya)/2;if(ym<=ya){ym=mid-8;ya=mid+8}else{ym=mid+8;ya=mid-8}}
  s+=T(W-R+8,ym,`Secure ${Math.round(ma*100)}%`,{c:'tgood',w:700})+(TOOFEW?'':T(W-R+8,ya,`Last 5 days: ${aw}`,{c:d>=0?'tbad':'t2',w:700}));
  const yl=top+ph+22,M=profMoments(i),cnt={},seen={};M.forEach(o=>{cnt[o.w]=(cnt[o.w]||0)+1});
  M.forEach(o=>{const ix=seen[o.w]=(seen[o.w]||0)+1,cx=xd(o.w)+(ix-1-(cnt[o.w]-1)/2)*12,col=o.k==='iv'||o.k==='good'?'var(--good)':o.k==='mis'?'var(--watch)':'var(--bad)';
    s+=`<g${tp(`<b>${dayDate(o.w)}</b><br>${esc(o.t)}`)}>${o.k==='iv'?`<path d="M${f1(cx)} ${yl-6} L${f1(cx+6)} ${yl} L${f1(cx)} ${yl+6} L${f1(cx-6)} ${yl} Z" style="fill:${col}"/>`:`<circle cx="${f1(cx)}" cy="${yl}" r="5" style="fill:${col}"/>`}</g>`});
  s+=T(x(0),H-6,dayDate(BS(0)),{a:'middle',c:'t3'})+T(x(NBC-1),H-6,dayDate(BE(NBC-1)),{a:'middle',c:'t3'});
  return s+'</svg>'}
function vProf(){const i=S.prof,n=NM[i],pv=(i+NM.length-1)%NM.length,nx=(i+1)%NM.length,gc=profCard(i),open=S.td.gen===gc.id,done=isLogged('td:'+gc.id),M=profMoments(i),da=duoW(.62,620);
  /* a chip a unit the class has started, in the order of the books; with several books in view, a row a book with its name first */
  const groups=MULTI&&PICK===null?BKON.map(tb=>TB0.map((U,u)=>u).filter(u=>TB0[u].tb===tb)):[TB0.map((U,u)=>u)],tb=0;
  const us=groups.map(us0=>us0.length?`<div class="usnaps">${MULTI&&PICK===null?`<span class="usnap lbl">${BL[TB0[us0[0]].tb]} · ${BOOKS[TB0[us0[0]].tb].s}</span>`:''}${us0.map(u=>{const U=TB0[u];if(!tU(tb,u))return '';const c=cellN(i,tb,{t:'u',id:u});if(c.g==='x'||c.g==='na')return '';
    return `<button class="usnap" type="button" data-act="profu" data-tb="${tb}" data-u="${u}"${tp(cellTip(i,c,U.n))}>${sq2(c.mc,c.doing,c.g,c.e)}<b>${U.nb}</b><span>${c.lab?GLAB[c.g]:SL[c.mc]}${c.doing||c.lab?'':' · not doing the work'}</span></button>`}).join('')}${(()=>{const ns=us0.filter(u=>!tU(tb,u)).map(u=>TB0[u]);return ns.length?`<span class="usnap next"${tp(ns.map(U=>U.nb).join('<br>'))}><span>+${ns.length} not started</span></span>`:''})()}</div>`:'').join('');
  const leg=`<div class="legend"><span><i class="ln" style="background:var(--good)"></i>Skills secure</span>${TOOFEW?'':`<span><i class="ln" style="background:var(--ink-3)"></i>Questions tried per 5 days</span><span><i class="sw" style="background:var(--neutral);opacity:.45"></i>${n}’s normal range</span><span><i class="sw hatch"></i>No class work</span>`}<span><svg width="12" height="12" aria-hidden="true"><path d="M6 1 L11 6 L6 11 L1 6 Z" style="fill:var(--good)"/></svg>Targeted practice</span><span><i class="sw" style="background:var(--bad);border-radius:50%"></i>Concern</span></div>`;
  const ml=M.length?`<ol class="moms">${M.map(o=>`<li><span class="mw">${dayDate(o.w)}</span><span class="mk ${o.k}" aria-hidden="true"></span><span>${esc(o.t)}</span></li>`).join('')}</ol>`:'<p class="none">Nothing notable.</p>';
  const pp=paceOf(i),np=STU.filter(u=>['M','P'].includes(standU(i,u).s)).length;
  const pst=`<div class="statrow psum">${stat('Proficient or better',`${np} of ${STU.length} ${pl(STU.length,'unit')}`)}${stat(`Work, ${RECENT}`,TOOFEW?'–':CLASSIDLE?'no class work':`${WB[i][RB]} ${pl(WB[i][RB],'question')} · normal ${NORM[i]===null?'–':NORM[i]}`)}${stat('Pace · '+TB0[S.v4.u].s,pp.label+' · '+paceSummary(pp))}${drifting(i)?stat('Drifting','since '+dayDate(DR[i])):''}</div>`;
  /* work the class's current unit does not show: catching up on a unit the class has moved past, or working ahead of it */
  const sw=sideWork(i),swTxt=o=>andList(o.map(q=>`${q.n} ${pl(q.n,'question')} on ${TB0[q.u].s}`))+`, the latest on ${dayDate(Math.max(...o.map(q=>q.last)))}`;
  const side=[sw.back.length?`Catching up: ${swTxt(sw.back)}`:'',sw.ahead.length?`Working ahead: ${swTxt(sw.ahead)}`:''].filter(Boolean).join(' · ');
  return `<div class="prof"><div class="phead"><div><p class="eyebrow">Student profile</p><h2 class="pname">${n}</h2></div><div class="pnav"><button class="btn small" type="button" data-act="prof" data-i="${pv}" aria-label="Previous student: ${NM[pv]}">← ${NM[pv]}</button><button class="btn small" type="button" data-act="prof" data-i="${nx}" aria-label="Next student: ${NM[nx]}">${NM[nx]} →</button></div></div>${bkBar()}
  ${pst}${side?`<p class="hint" style="margin:-8px 0 14px">${side}</p>`:''}${us}${leg}${duo(da,fig(profTL(i,da||VW())),da?`<div class="detail"><div class="dhead"><h3>Moments</h3><span class="pill">${M.length}</span></div>${ml}</div>`:`<details class="data"><summary>Moments · ${M.length}</summary>${ml}</details>`)}
  <div class="tc-act">${done?'<span class="pill good">Set assigned</span>':`<button class="btn primary${open?' on':''}" type="button" data-act="tdgen" data-id="${gc.id}" aria-expanded="${open}">Generate practice</button>`}<span class="hint">${gc.cat==='ext'?'Stretch set':`${SETN[gc.cat]} · ${SUBS[gc.js[0]].s}`}</span></div>${open&&!done?genPanel(gc):''}</div>`}

/* ---------- the key for the grid's cells (Effort and mastery) ---------- */
const bar6=(w,col)=>`<svg width="30" height="6" aria-hidden="true"><rect x="0" y="1.5" width="30" height="3" rx="1.5" style="fill:var(--surface-2)"/><rect x="0" y="1.5" width="${w}" height="3" rx="1.5" style="fill:${col}"/></svg>`;
const labKey=`<span><svg width="30" height="10" aria-hidden="true"><rect x="0" y="0" width="30" height="10" rx="2" style="fill:var(--surface-2)"/><rect x="0" y="0" width="19" height="10" rx="2" style="fill:var(--ink-3)"/></svg>Labs tried (no level)</span>`;
const CELLKEY=()=>LABV?`<div class="legend key2">${labKey}<span>${bar6(9,'var(--bad)')}Under the line</span></div>`:`<div class="legend key2">${RAMPKEY()}<span><i class="sw" style="background:var(--surface);box-shadow:inset 0 0 0 1px var(--neutral)"></i>Too early</span><span>${bar6(22,'var(--axis)')}Practice done</span><span>${bar6(9,'var(--bad)')}Under the line</span><span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.6" style="fill:var(--bad)"/></svg>Stuck despite effort</span>${TB0.some(U=>U.lab&&U.on)?labKey:''}</div>`;

/* ---------- render ---------- */
const HL=[null,null,h2,h3,h4,h6,hSk,h8,null,h10,h11,h12];
const VF=[null,null,v2,v3,v4,v6,vSk,v8,null,v10,v11,v12];
const VQ=k=>VM[k===6?SKV():k].q,HOWK=k=>HOW[k===6?SKV():k];
const DRAW={2:v2draw,4:v4draw,10:v11draw};
const ord=n=>n+(n%10===1&&n%100!==11?'st':n%10===2&&n%100!==12?'nd':n%10===3&&n%100!==13?'rd':'th');
/* the top bar names the class; the footer says which days the data covers, what day it is, and when the class last worked */
function renderHead(){
  $('#cname').textContent=`${D.meta.name} · ${D.meta.textbook}${BOOKS.length>1?` + ${BOOKS.length-1} ${pl(BOOKS.length-1,'book')}`:''} · ${N} students`;
  /* the footer is the one place every book is named, a book with no work yet among them; the example says what in it is invented */
  const bl=BOOKS.length>1?' Books: '+BOOKS.map((b,tb)=>`${BKON.includes(tb)?BL[tb]+' ':''}${b.sr}${tb===MAIN?' (main)':''}${tb!==MAIN&&b.added!==null&&b.added>0?`, from ${dayDate(b.added)}`:''}${BKON.includes(tb)?'':' (listed, no work yet)'}`).join(' · ')+'.':'';
  const inv=EX?BKON.filter(tb=>BOOKS[tb].inv).map(tb=>BOOKS[tb].sr):[];
  const ft=$('#foot');if(ft)ft.textContent=`Anonymised class data from ${dayDateY(0)}. Today is ${dayDateY(TODAY)}${TODAY!==EXPORTDAY?' (as chosen in the address)':' (the export date)'}; the latest work was on ${dayDateY(LASTWORK)}. Nothing here is saved.${bl}${inv.length?` The work in ${andList(inv)} is invented (data/example.js); the rest is real.`:''}`;
  /* the top bar carries a chip only while the example is on; a teacher-facing page has no demo chrome otherwise */
  const chip=$('#demochip');if(chip&&EX){chip.textContent=`Example · work in ${andList(inv)} is invented`;chip.hidden=false}
  /* the way to the example and back lives in the footer, with the rest of what is said about the data */
  const swh=EX?'<button class="lnk" type="button" data-act="exoff">Back to the class as recorded</button>':!MULTI&&EXOK?`<button class="lnk" type="button" data-act="exon">See an example with ${numWord(window.ATLAS_BOOKS.books.length-1)} more books</button>`:'';
  if(ft&&swh)ft.innerHTML=esc(ft.textContent)+` <span class="fsw">${swh}</span>`;
  const src=$('#src');if(src)src.innerHTML=`<div class="tbl"><table><thead><tr><th>Page</th><th>Worked out from</th><th>Database tables</th><th>How real</th></tr></thead><tbody>${TBL.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`;
  try{document.title=`Insight Lens · ${D.meta.name}`}catch(_){}}
function renderThread(){const el=$('#thread');if(S.stu===null){el.hidden=true;el.innerHTML='';return}
  const i=S.stu,fl=flags(i).filter(f=>f.l==='bad'||f.l==='watch').sort((a,b)=>PN[a.v]-PN[b.v]);el.hidden=false;
  el.innerHTML=`<div class="th-who"><span class="eyebrow">Following</span><b>${NM[i]}</b></div><div class="th-flags">${fl.length?fl.map(f=>`<button class="flag" type="button" data-act="${f.v===7?'gosub':f.v===10?'gonext':'go'}" data-v="${f.v}"${f.v===7?` data-j="${CJ}"`:''}${tp(`Open ${VM[f.v].s}`)}><span class="lvl ${f.l}"></span>${esc(f.t)}</button>`).join(''):'<span class="hint">No concerns on any page.</span>'}</div>${S.view==='p'&&S.prof===i?'':`<button class="btn small" type="button" data-act="prof" data-i="${i}">Open profile</button>`}<button class="btn small" type="button" data-act="clear">Stop following</button>`}
function renderRail(){let h='';
  GROUPS.forEach(([g,ks])=>{h+=`<p class="rg"><span>${g}</span></p>`+ks.map(k=>`<button type="button" data-act="go" data-v="${k}"${S.view===k?' aria-current="page"':''} aria-label="${VM[k].s}" title="${PWHY[k][0].toUpperCase()+PWHY[k].slice(1)}">${glyph(k)}<span class="rq">${VM[k].s}</span></button>`).join('')});
  $('#rail').innerHTML=h}
/* the book filter: once two books have work, the first control under the answer on every page and under the name on a profile. "All books", or one book with work.
   The pick is part of the address (?book=<id>), so a link keeps it and Back returns to the book before; a change reloads the page, which works everything out again for that book */
/* the same bar also carries the day the pages are read as of: a date picker that reloads with ?today=, and the way back to today (the export date) */
const asOfCtl=()=>`<label class="sel" for="asof">As of <input type="date" id="asof" value="${isoOf(TODAY)}" min="${isoOf(0)}" max="${isoOf(EXPORTDAY)}"></label>${TODAY!==EXPORTDAY?`<button class="lnk" type="button" data-act="today">Back to today (${dayDate(EXPORTDAY)})</button>`:''}`;
const bkBar=()=>`<div class="controls bkbar">${MULTI?pickCtl('bksel',PICK===null?'all':esc(BOOKS[PICK].id),[['all','All books']].concat(BKON.map(tb=>[esc(BOOKS[tb].id),`${BL[tb]} · ${BOOKS[tb].s}`])),'Book'):''}${asOfCtl()}</div>`;
const withQ=(name,val)=>{const q=location.search.replace(/^\?/,'').split('&').filter(p=>p&&!(new RegExp('^'+name+'(=|$)')).test(p)&&!/^r=/.test(p));if(val!==null)q.push(name+'='+encodeURIComponent(val));return location.pathname+(q.length?'?'+q.join('&'):'')+location.hash};
const bkUrl=id=>withQ('book',id),asOfUrl=iso=>withQ('today',iso);
function frame(k,body){return `<div class="vhead"><h2 class="q">${VQ(k)}</h2><details class="how"><summary>How to read</summary><p>${HOWK(k)}</p></details></div><p class="answer" id="ans">${HL[k]()}</p>${bkBar()}${body}`}
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
/* pages 5 and 9 are views of the Skills page */
const toPage=k=>{if(k===5){S.v7.view='unit';return 6}if(k===9){S.v7.view='faded';return 6}if(k===6)S.v7.view='weak';return k};
/* the Drifting page, opened without a day in the address while the class is idle or slowed: move to the latest day it can judge */
const demoDay=k=>k===3&&!ASOF&&!JUDGE&&DEMODAY!==TODAY;
function go(k){k=toPage(k);if(demoDay(k)){location.assign(asOfUrl(isoOf(DEMODAY)).split('#')[0]+'#'+SLUG[k]);return}S.view=k;try{history.replaceState(null,'',k==='p'?'#s-'+encodeURIComponent(NM[S.prof]):'#'+SLUG[k==6&&S.v7.view==='unit'?5:k==6&&S.v7.view==='faded'?9:k])}catch(_){}render();const v=$('#view');if(v&&v.getBoundingClientRect().top<64)v.scrollIntoView({block:'start'})}
const ATTRS=['v','i','k','r','s','f','u','j','n','g','t','id'];
function refocus(a,ds){const sel=`[data-act="${a}"]`+ATTRS.filter(x=>ds[x]!==undefined).map(x=>`[data-${x}="${String(ds[x]).replace(/"/g,'')}"]`).join('');let el=null;try{el=document.querySelector('#view '+sel)||document.querySelector(sel)}catch(_){}if(el&&el.focus)el.focus({preventScroll:true})}
const refocusId=id=>{const el=document.getElementById(id);if(el)el.focus({preventScroll:true})};
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
  case 'v2up':{const E=S.v2,u=E.at.u,j=E.at.j;E.sel={t:'u',id:u};if(d.f==='all')at2(null,null,TAUGHT.indexOf(u));else at2(u,null,uJs(0,u).filter(x=>SUBS[x].on).indexOf(j));reView();break}
  case 'v2pg':S.v2.pg+=+d.f;reView();break;
  case 'v2log':{const E=S.v2,tb=E.tb,g=d.g,nm=nodeName(E.sel,tb)+(tb?` (${TB[tb].s})`:''),who=tbWho(tb).filter(i=>cellN(i,tb,E.sel).g===g).map(i=>NM[i]);
    const txt=g==='stuck'?`Small-group reteach on ${nm} for ${andList(who)}`:g==='off'?`Assigned the ${LABV?'labs':'practice'} in ${nm} to ${andList(who)}`:`Stretch set in ${nm} for ${andList(who)}`;
    logAct(`v2:${tb}:${E.sel.t}${E.sel.id}:${g}`,2,txt,'plan');v2draw();break}
  case 'v3all':S.v3.all=!S.v3.all;reView();break;
  case 'v6unit':{const E=S.v6.ex[S.v6.tb],u=+d.u;if(!E)break;const ix=E.U.indexOf(u);if(ix>=0)E.U.splice(ix,1);else E.U.push(u);reView();break}
  case 'v6sub':{const E=S.v6.ex[S.v6.tb],j=+d.j;if(!E)break;const ix=E.J.indexOf(j);if(ix>=0)E.J.splice(ix,1);else E.J.push(j);reView();break}
  case 'v6sk':S.v6.sel[S.v6.tb]=+d.k;reView();break;
  case 'v6lvl':{const tb=S.v6.tb,E=S.v6.ex[tb];if(!E)break;const {us,js}=lvAll5(tb);if(d.f==='u'){E.U=[];E.J=[]}else if(d.f==='j'){E.U=us.slice();E.J=[]}else{E.U=us.slice();E.J=js.slice()}reView();break}
  case 'gosub':{const j=+d.j;open7(0,j,maxGaveUp(j));go(7);return}
  case 'gointro':{const j=+d.j,k=+d.k;at2(uOfJ(j),j);S.v2.sel={t:'k',id:k,j};S.fold.v2grid=true;go(2);return}
  case 'v7view':go(d.f==='unit'?5:d.f==='faded'?9:6);return;
  case 'v8view':S.v8.view=d.f;reView();break;
  case 'v7f':S.v7.f=d.f;S.v7.more=false;reView();break;
  case 'v7more':S.v7.more=!S.v7.more;reView();break;
  case 'v7row':S.v7.r=+d.r;reView();break;
  case 'v7plan':{const m=WEAK[+d.r];logAct('v7:'+m.k,6,`Reteach ${m.n} for the ${m.now.length} students not yet secure on it`,'plan');reView();break}
  case 'v8tb':S.v8.tb=+d.f;reView();break;
  case 'v8unit':{const E=S.v8.ex[S.v8.tb],u=+d.u;if(!E)break;const ix=E.U.indexOf(u);if(ix>=0)E.U.splice(ix,1);else E.U.push(u);reView();break}
  case 'v8sub':{const E=S.v8.ex[S.v8.tb],j=+d.j;if(!E)break;const ix=E.J.indexOf(j);if(ix>=0)E.J.splice(ix,1);else E.J.push(j);reView();break}
  case 'v8c':S.v8.sel[S.v8.tb]={j:+d.j,s:+d.s};reView();break;
  case 'v8lvl':{const tb=S.v8.tb,E=S.v8.ex[tb];if(!E)break;const {us,js}=lvAll7(tb);if(d.f==='u'){E.U=[];E.J=[]}else if(d.f==='j'){E.U=us.slice();E.J=[]}else{E.U=us.slice();E.J=js.slice()}reView();break}
  case 'v8plan':{const tb=S.v8.tb,sl=S.v8.sel[tb];if(!sl)break;const c=cCnt(tb,sl.j)[sl.s],n=c[0]+c[1]+c[2]+c[3],nm=ctOf(tb,sl.j)[sl.s][0],J=TBJ(tb,sl.j).n;logAct(sKey7(tb,sl.j,sl.s),7,c[3]/n>=.29?`Assigned ${nm} in ${J} as coursework`:`Reteach ${nm} in ${J}`,'plan');reView();break}
  case 'v10line':S.v10.k=S.v10.k===+d.k?-1:+d.k;reView();break;
  case 'v10close':S.v10.k=-1;reView();break;
  case 'v10plan':logAct('v10:'+d.k,9,`Review set on ${SK[+d.k]}, as a warm-up`,'plan');reView();break;
  case 'v11rm':{const R=rdSel(),r=S.v11.rm[R.key]=S.v11.rm[R.key]||{};r[d.g]=(r[d.g]||[]).concat(d.n);S.v11.acc[R.key]=false;v11draw();renderLogChip();return}
  case 'v11restore':{const R=rdSel();S.v11.rm[R.key]={};S.v11.acc[R.key]=false;v11draw();break}
  case 'v11tb':S.v11.tb=+d.f;reView();break;
  case 'gonext':S.v11.tb=0;S.v11.u[0]=rdDef(0);go(10);return;
  case 'v11accept':acceptPlan();v11draw();break;
  case 'v11undo':{const R=rdSel(),pf=rdPfx(R);S.log=S.log.filter(x=>!x.key.startsWith(pf));S.v11.acc[R.key]=false;renderLogChip();v11draw();break}
  case 'v12f':S.v12.f=d.f;reView();break;
  case 'v12row':S.v12.r=+d.r;reView();break;
  case 'tdgen':{S.td.gen=S.td.gen===d.id?null:d.id;reView();const g=$('#gen');if(!g)break;if(g.scrollIntoView)g.scrollIntoView({block:'nearest'});if(e.detail===0){const b=g.querySelector('[data-act="tdassign"]');if(b)b.focus({preventScroll:true})}return}
  case 'tdrm':{(S.td.rm[d.id]=S.td.rm[d.id]||[]).push(d.k);reView();const b=$('#gen [data-act="tdassign"]');if(e.detail===0&&b)b.focus({preventScroll:true});return}
  case 'tdreset':S.td.rm[d.id]=[];reView();{const b=$('#gen [data-act="tdassign"]');if(e.detail===0&&b)b.focus({preventScroll:true})}return;
  case 'tdclose':{S.td.gen=null;reView();const b=document.querySelector(`[data-act="tdgen"][data-id="${d.id}"]`);if(e.detail===0&&b)b.focus({preventScroll:true});return}
  case 'tdassign':{const c=cardById(d.id);if(!c)return;const g=genSet(c),pr=/^p\d+$/.test(c.id);
    logAct('td:'+c.id,pr?'p':2,`${SETN[c.cat]} on ${pr&&c.cat!=='ext'?c.s:c.t} (${g.items.length} ${pl(g.items.length,'item')}) for ${setFor(c)}`,'plan');S.td.gen=null;render();return}
  case 'tdex':{const L=S.td.ex[d.id]=S.td.ex[d.id]||[];if(L.includes(d.n))S.td.ex[d.id]=L.filter(x=>x!==d.n);else L.push(d.n);reView();break}
  case 'tdbud':S.td.bud[d.id]=+d.f;reView();break;
  case 'prof':{S.prof=+d.i;S.stu=+d.i;S.td.gen=null;go('p');return}
  case 'profu':{const u=+d.u;at2(u,null);S.v2.sel={t:'u',id:u};go(2);return}
  case 'exon':location.assign(location.pathname+'?books'+location.hash);return;
  case 'today':location.assign(asOfUrl(isoOf(EXPORTDAY)));return;
  case 'exoff':location.assign(location.pathname+location.hash);return;
  case 'v6tb':S.v6.tb=d.f==='x'?'x':+d.f;reView();break;
  case 'v6xf':S.v6.xf=d.f;reView();break;
  default:return}
  if(e.detail===0&&!['go','gofor','log','stu','clear'].includes(a))refocus(a,d)});
/* a folded part of a page remembers whether it is open; the grid is drawn when its fold opens, at the width it then has */
document.addEventListener('toggle',e=>{const t=e.target;if(!t||t.tagName!=='DETAILS'||!t.dataset.fold)return;S.fold[t.dataset.fold]=t.open;if(t.dataset.fold==='v2grid'&&t.open)v2draw()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(S.stu!==null){S.stu=null;render()}return}
  const t=e.target;if((e.key==='Enter'||e.key===' ')&&t.getAttribute&&t.getAttribute('role')==='button'&&t.namespaceURI==='http://www.w3.org/2000/svg'){e.preventDefault();t.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
document.addEventListener('input',e=>{const t=e.target,id=t.id;if(t.type==='range')rngFill(t);
  if(id==='v2line'){S.v2.line=+t.value;const o=$('#v2lo');if(o)o.textContent=t.value+'% of practice';v2draw();renderThread()}
  else if(id==='v11th'){S.v11.th=+t.value;S.v11.acc={};const o=$('#v11o');if(o)o.textContent=t.value+'% of the class';v11draw()}
});
document.addEventListener('change',e=>{const t=e.target,id=t.id;
  if(id==='v2sort'){S.v2.sort=t.value;reView();refocusId('v2sort')}
  else if(id==='v2unit'){S.v2.sel={t:'u',id:+t.value};reView();refocusId('v2unit')}
  else if(id==='v11unit'){S.v11.u[S.v11.tb]=+t.value;reView();refocusId('v11unit')}
  else if(id==='v7unit'){S.v7.u=t.value;S.v7.more=false;reView();refocusId('v7unit')}
  else if(id==='v10unit'){S.v10.u=t.value;reView();refocusId('v10unit')}
  else if(id==='bksel')location.assign(bkUrl(t.value==='all'?null:t.value));
  else if(id==='asof'){if(/^\d{4}-\d{2}-\d{2}$/.test(t.value))location.assign(asOfUrl(t.value))}
  else if(id==='v4date'){const d=dayOf(t.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(t.value)||!Number.isFinite(d)||d<TODAY||isoOf(d)!==t.value){t.value=isoOf(S.v4.day);toast('Choose a goal date on or after '+dayDateY(TODAY)+'.');return}S.v4.day=d;reView();renderThread();refocusId('v4date')}
  else if(id==='v4unit'){S.v4.u=+t.value;reView();renderThread();refocusId('v4unit')}
  else if(id==='v4sort'){S.v4.sort=t.value;reView();refocusId('v4sort')}
  else if(id==='v8sort'){S.v8.sort=t.value;reView();refocusId('v8sort')}
  else if(id==='v10all'){S.v10.all=t.checked;reView();refocusId('v10all')}
  else if(id==='v6sort'){S.v6.sort=t.value;reView();refocusId('v6sort')}});
function fromHash(){const h=location.hash||'',ps=h.match(/^#s-(.+)$/);let pn=null;if(ps){try{pn=decodeURIComponent(ps[1])}catch(_){pn=ps[1]}}if(pn!==null&&ID[pn]!==undefined){S.view='p';S.prof=ID[pn];S.stu=S.prof;return}const nm=Object.keys(SLUG).find(k=>'#'+SLUG[k]===h),old=OLDSLUG[h.slice(1)],m=h.match(/^#q(\d{1,2})$/),k=nm!==undefined?+nm:old!==undefined?old:m?+m[1]:2;S.view=VM[k]?toPage(k):2;if(demoDay(S.view))location.replace(asOfUrl(isoOf(DEMODAY)))}
window.addEventListener('hashchange',()=>{fromHash();render()});
let rzT=null,rzW=window.innerWidth;
window.addEventListener('resize',()=>{if(window.innerWidth===rzW)return;rzW=window.innerWidth;clearTimeout(rzT);rzT=setTimeout(reView,160)});
/* defaults that depend on the class: the effort and mastery grid starts on all units, with the one where the most students are stuck picked */
(function(){const b=TAUGHT.map(u=>({u,n:ALL.filter(i=>cell2(i,KS2.u(u)).g==='stuck').length})).sort((x,y)=>y.n-x.n)[0];S.v2.sel={t:'u',id:b&&b.n?b.u:CU};
  /* start at the current unit, with a date the teacher can replace; lab practice has no skill standing */
  const pus=paceUnits();S.v4.u=pus.includes(CU)?CU:pus[0]??CU})();
renderHead();fromHash();render();
})();

/* Insight Lens mock · the Course Atlas: interactive charts, student profiles and seven views of one
   class, on real class data. data/class.js (written by tools/export-atlas.py from the database) holds the facts;
   this script works out every figure from them: the data layer first, then one function per view, then rendering
   and events.

   Colours and type come from css/atlas.css, which answers this script's colour names from the Insight Lens theme. */
(function(){
'use strict';
// The host supplies a root and can own routing. All handlers are removed on destroy.
const SHELL=`<header class="topbar">
    <div class="logo">A</div><span class="brand">ALPS</span><span class="product">Insight Lens</span>
    <span class="classname" id="cname"></span>
    <div class="spacer"></div>
    <button class="demo-date" id="demochip" type="button" data-act="exoff" hidden></button>
    <button id="logchip" class="logchip" type="button" data-act="log">My actions <b id="logn">0</b></button>
    <div class="avatar">MA</div>
  </header>
  <div class="shell">
    <nav id="rail" class="rail" aria-label="Views"></nav>
    <div class="page">
      <div id="thread" class="thread" role="region" aria-label="Followed student" hidden></div>
      <main id="view" class="view" tabindex="-1"></main>
    </div>
  </div>
  <div id="tip" role="tooltip" hidden></div>
  <div id="toast" role="status" aria-live="polite" hidden></div>
  <div id="dlg" class="dlg-wrap" hidden></div>`;
function mount(root,options={}){
  if(!root)throw new Error('InsightLens.mount needs a root element');
  if(root.__insightLens)root.__insightLens.destroy();
  let stop=null,active=true;
  const handle={
    destroy(){active=false;if(stop){stop();stop=null}if(root.__insightLens===handle)delete root.__insightLens},
    routeChanged(route){options={...options,...route};if(options.onNavigate)options.onNavigate(route)},
    navigate(url){if(!active)return;const next=new URL(url,'https://insight-lens.local/'+(options.search||'')+(options.hash||''));if(stop)stop();options={...options,search:next.search,hash:next.hash};stop=start(root,options,handle);if(options.onNavigate)options.onNavigate({search:next.search,hash:next.hash})}
  };
  root.__insightLens=handle;
  stop=start(root,options,handle);
  return handle;
}
function start(root,options,handle){
  if(!window.INSIGHT_ALPS)throw new Error('Load alps-design-system.js before mounting Insight Lens.');
  // Lightweight DOM stubs in numerical checks deliberately fall back to document.
  const UIROOT=root&&root.nodeType===1?root:document;
  if(UIROOT!==document){UIROOT.classList.add('insight-lens');UIROOT.classList.toggle('il-embedded',!!options.embedded);UIROOT.innerHTML=SHELL}
  const unlisten=[];
  const listen=(target,event,fn,opts)=>{target.addEventListener(event,fn,opts);unlisten.push(()=>target.removeEventListener(event,fn,opts))};
  const location=options.embedded?{pathname:'/',search:options.search||'',hash:options.hash||'#engagement',assign:url=>handle.navigate(url)}:globalThis.location;
  const history=options.embedded?{replaceState(_state,_unused,url){const next=new URL(url,'https://insight-lens.local/'+location.search+location.hash);location.search=next.search;location.hash=next.hash;handle.routeChanged({search:next.search,hash:next.hash})}}:globalThis.history;
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
// Example-book expansion mutates the working copy; never mutate host data on remount.
const originalData=options.data||window.ATLAS_DATA;
const D=originalData?JSON.parse(JSON.stringify(originalData)):null;
if(!D){const v=UIROOT.querySelector('#view');if(v)v.innerHTML='<p class="none" style="padding:24px">No class data yet. Run tools/export-atlas.py to write data/class.js, then reload.</p>';return ()=>{if(UIROOT!==document)UIROOT.innerHTML=''}}
/* ---------- books ----------
   A class can list more than one book (section_curriculum). Every unit, lesson and question belongs to one book; a skill is shared by the books that
   check it. The export lists the books in meta.books and marks each unit and assignment with its book (tb); a class with one book has neither, and
   nothing on its pages says "book". The example at index.html?books adds books with invented work to the real class (data/example.js): it is read
   only when the address asks for it and only when it was built for this very export, and the page says "Example" the whole time it is on. */
/* prerequisites, two levels back, from the learner model's skill graph (data/prereqs.js, written by tools/export-prereqs.py). It is read only
   when it was built for this very export; the prerequisite skills the class file does not carry go at the end of the skill list, after any
   example book's, with the class's questions that check them as their only evidence */
const PRQ=(function(){const P=options.prereqs||window.ATLAS_PREREQS,b=P&&P.base;return b&&b.section===D.meta.section&&b.units===D.units.length&&b.subs===D.subs.length&&b.items===D.items.length&&b.skills===D.skills.length&&Array.isArray(P.units)&&Array.isArray(P.skills)&&Array.isArray(P.tags)?P:null})();
const EXQ=/[?&]books(?=[&=]|$)/.test(location.search);
const EXOK=(function(){const B=window.ATLAS_BOOKS,b=B&&B.base;return !!(b&&!D.meta.books&&Array.isArray(B.books)&&b.section===D.meta.section&&b.units===D.units.length&&b.subs===D.subs.length&&b.items===D.items.length&&b.skills===D.skills.length&&b.att===D.att.length)})();
const EX=EXQ&&EXOK?(function(){const B=window.ATLAS_BOOKS;D.units.forEach(U=>{U.tb=0});D.units=D.units.concat(B.units);D.subs=D.subs.concat(B.subs);D.items=D.items.concat(B.items);D.skills=D.skills.concat(B.skills);D.att=D.att.concat(B.att);D.meta.books=B.books;return B})():null;
const PRX0=D.skills.length;if(PRQ)D.skills=D.skills.concat(PRQ.skills);
const prk=k=>PRQ&&k>=PRQ.base.skills?PRX0+(k-PRQ.base.skills):k;   // a prerequisite's number in the skill list on show
const BOOKS=(D.meta.books||[{id:D.meta.textbookId,name:D.meta.textbook,short:D.meta.textbook,role:'primary',added:null}]).map(b=>({id:b.id,n:esc(b.name),s:esc(b.short||b.name),nr:b.name,sr:b.short||b.name,role:b.role,added:b.added===undefined?null:b.added,inv:!!b.invented}));
D.units.forEach(U=>{U.tb=U.tb||0});
const bookOfItem=it=>D.units[D.subs[it.sub].u].tb;
/* a book has work once a student has answered a question in it. A book with none is counted in the top bar, and no page shows it */
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
   a median of seven runs a lab and half never marked right, so counted as questions the labs would mark most of the class beginning on every skill they touch */
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
const dayDate=d=>{const t=dateOf(d);return t.getDate()+' '+MON[t.getMonth()]+(t.getFullYear()!==dateOf(TODAY).getFullYear()?' '+t.getFullYear():'')};   // the year when it isn't the page's own
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
const IT=D.items.map((it,ix)=>{const j=JIX[it.sub],rw={};(it.skills||[]).forEach((k,x)=>{rw[k]=it.rel&&it.rel[x]!=null?it.rel[x]:1});return {ix,name:esc(it.name||'Untitled'),f:FOF[it.type]||null,type:it.type,j,u:j>=0?VJ[j].u:-1,tb:bookOfItem(it),lab:ISLAB[ix],ks:it.skills||[],rw}});
const relOf=(ix,k)=>IT[ix].rw[k]!==undefined?IT[ix].rw[k]:PRW[k]&&PRW[k][ix]!==undefined?PRW[k][ix]:1;   // how much a question tells about a skill
/* AT[student].get(question) = [student, question, right first try, right within 3, ever right, tries, first day, seconds, last day, the try that was first right, seconds on the first try] */
const AT=NM.map(()=>new Map());D.att.forEach(a=>{if(a[6]<=LASTDAY&&IT[a[1]].f)AT[a[0]].set(a[1],a)});
const IWHO=IT.map(()=>[]);AT.forEach((m,i)=>m.forEach((a,ix)=>IWHO[ix].push(i)));
/* credit for one question: a quick question counts when right first time (half on the second try);
   a code or Parsons task counts when right within three tries (half within six) */
const credit=a=>{const r=a[9],q=FKIND[IT[a[1]].f]==='q';return !r?0:q?(r===1?1:r===2?.5:0):(r<=3?1:r<=6?.5:.25)};   // a code task right at last still beats one never right
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
const PRW={};if(PRQ)PRQ.tags.forEach((ixs,x)=>{PRW[PRX0+x]={};ixs.forEach((ix,n)=>{PRW[PRX0+x][ix]=PRQ.tagRel&&PRQ.tagRel[x]?PRQ.tagRel[x][n]:1;if(IT[ix]&&IT[ix].f&&EVOK(ix))KIT[PRX0+x].push(ix)})});   // a prerequisite the class file does not carry: the class's questions tagged with it
const chk5=k=>KIT[k].length>0;
const KTAUGHT=ASK.map(()=>false);VJ.forEach(s=>s.skills.forEach(q=>{if(q[1])KTAUGHT[q[0]]=true}));
/* a skill the class has met in any book: a started lesson of any book names it. A level is worked out for these, whichever book is picked */
const KTA=ASK.map(()=>false);D.subs.forEach((s,j)=>{if(ONJ[j])s.skills.forEach(q=>{KTA[q[0]]=true})});
if(PRQ)PRQ.skills.forEach((_,x)=>{if(KIT[PRX0+x].some(ix=>IWHO[ix].length))KTA[PRX0+x]=true});   // a prerequisite is met once a student answered a question on it
const KT=ASK.map(()=>null),KHOME=ASK.map(()=>null);  // the day the class first met each skill, and the subunit where it did
TB0.forEach(U=>U.js.forEach(j=>{const s=SUBS[j];if(s.on&&!s.lab)jSk(0,j).forEach(k=>{if(KT[k]===null||s.mid<SUBS[KHOME[k]].mid){KT[k]=s.d[0];KHOME[k]=j}})}));
TB0.forEach(U=>U.js.forEach(j=>{const s=SUBS[j];if(s.on&&s.lab)jSk(0,j).forEach(k=>{if(KT[k]===null){KT[k]=s.d[0];KHOME[k]=j}})}));   // a lab is a skill's home only when no lesson with a question is
TB0.forEach(U=>U.js.forEach(j=>jSk(0,j).forEach(k=>{if(KHOME[k]===null)KHOME[k]=j})));
const taught=k=>KT[k]!==null;
const TSK=ASK.map((_,k)=>k).filter(taught).sort((a,b)=>SUBS[KHOME[a]].mid-SUBS[KHOME[b]].mid||a-b);  // taught skills, in the order the class met them
const NK=TSK.length;
const uOf=k=>SUBS[KHOME[k]].u;
const tbOfSub=k=>[{ix:0,t:KTAUGHT[k],a:chk5(k)}];
/* a later check of a skill counts once it comes this many days after the student first met it (fading skills) */
const RECHECK=21,LATER='21 days or more later';

/* ---------- performance: a score and a level on each skill ----------
   The evidence for a student on a skill is every question tagged with it that they tried, in date order, plus
   repeat tries in a practice set the teacher targeted. MT = average credit when first taught, ML = average credit
   on checks RECHECK or more days later, EV = number of checks, CUR = current estimate (the score), CAT = the level's group. */
const EVD=NM.map(()=>ASK.map(()=>null));
AT.forEach((m,i)=>m.forEach((a,ix)=>{if(!EVOK(ix))return;const c=credit(a);IT[ix].ks.forEach(k=>{(EVD[i][k]=EVD[i][k]||[]).push({d:a[6],c,w:relOf(ix,k)})})}));
D.sets.forEach(st=>st.rows.forEach(([i,ix,ok1,ever,d])=>{const a=AT[i].get(ix);if(!a||!EVOK(ix)||d>LASTDAY||d<a[6]+14)return;IT[ix].ks.forEach(k=>{(EVD[i][k]=EVD[i][k]||[]).push({d,c:ok1?1:ever?.5:0,w:relOf(ix,k)})})}));
/* the evidence for a prerequisite the class file does not carry: the same, from the class's questions tagged with it */
if(PRQ){const byIx={};PRQ.skills.forEach((_,x)=>KIT[PRX0+x].forEach(ix=>{(byIx[ix]=byIx[ix]||[]).push(PRX0+x)}));
  AT.forEach((m,i)=>m.forEach((a,ix)=>{const ks=byIx[ix];if(!ks)return;const c=credit(a);ks.forEach(k=>{(EVD[i][k]=EVD[i][k]||[]).push({d:a[6],c,w:relOf(ix,k)})})}));
  D.sets.forEach(st=>st.rows.forEach(([i,ix,ok1,ever,d])=>{const ks=byIx[ix],a=AT[i].get(ix);if(!ks||!a||d>LASTDAY||d<a[6]+14)return;ks.forEach(k=>{(EVD[i][k]=EVD[i][k]||[]).push({d,c:ok1?1:ever?.5:0,w:relOf(ix,k)})})}))}
EVD.forEach(r=>r.forEach(e=>{if(e)e.sort((x,y)=>x.d-y.d)}));
/* the score on a skill (asked 2026-10-26: "There is a relevance score in the db for every item skill pair. Let's use that as well and weight the items
   that have more relevance higher"): each answer's credit weighted by its question's relevance to the skill, the answers in the first 21 days
   (mt) and those later (ml) averaged apart. There is a later score only once there are two later answers, as a level needs two answers; then it
   counts 60%. Until then a later answer counts like any other answer, in one average with the rest, so no answer is dropped. One later question
   no longer decides a level, a fade or a slip (one hard question on 10 Nov read as the whole class forgetting Class Instantiation in Java) */
const wavg=xs=>{let s=0,n=0;xs.forEach(x=>{const w=x.w===undefined?1:x.w;s+=w*x.c;n+=w});return n?s/n:0};   // an answer with no weight counts fully
function estOf(i,k,day){const all=EVD[i][k];if(!all)return null;const e=all.filter(x=>x.d<=day);if(!e.length)return null;
  const t0=e[0].d,a=e.filter(x=>x.d<t0+RECHECK),b=e.filter(x=>x.d>=t0+RECHECK),mt=wavg(a),ml=b.length>=2?wavg(b):null;
  return {mt,ml,ev:e.length,c:ml===null?wavg(e):.4*mt+.6*ml}}
/* ALPS's five performance levels and its cuts: 40, 55, 65 and 80 on a score of 0 to 100. A skill's level is the band of its score. For the
   groups a teacher acts on, the levels fold into three: mastered (F), familiar or proficient (H), beginning or attempted (E) */
const LV=['Beginning','Attempted','Familiar','Proficient','Mastered'],LVC=['B','A','F','P','M'],LVCOL=['var(--il-lv-b)','var(--il-lv-a)','var(--il-lv-f)','var(--il-lv-p)','var(--il-lv-m)'];
const lvOf=c=>{const p=Math.round(c*100);return p>=80?4:p>=65?3:p>=55?2:p>=40?1:0};   // banded on the whole percent shown, as ALPS does
const GBG={E:`linear-gradient(90deg,${LVCOL[0]} 50%,${LVCOL[1]} 50%)`,H:`linear-gradient(90deg,${LVCOL[2]} 50%,${LVCOL[3]} 50%)`,F:LVCOL[4]};
const catFrom=(ev,c)=>ev===0?'N':ev<2?'Q':lvOf(c)===4?'F':lvOf(c)>=2?'H':'E';
const MT=[],ML=[],EV=[],CUR=[],CAT=[];
/* a level is one level: the evidence is every question on the skill in every book, so it does not change with the book picked */
ALL.forEach(i=>{MT[i]=[];ML[i]=[];EV[i]=[];CUR[i]=[];CAT[i]=[];ASK.forEach((_,k)=>{const e=KTA[k]?estOf(i,k,LASTDAY):null;
  MT[i][k]=e?e.mt:null;ML[i][k]=e?e.ml:null;EV[i][k]=e?e.ev:0;CUR[i][k]=e?e.c:null;CAT[i][k]=!KTA[k]?'X':catFrom(e?e.ev:0,e?e.c:0)})});
const CL={F:'Mastered',H:'Familiar or proficient',E:'Beginning or attempted',Q:'Unavailable',N:'Not attempted',X:'Not taught yet'};
const mast=(i,k)=>KTA[k]?{c:CUR[i][k],ev:EV[i][k],cat:CAT[i][k]}:null;
const fCount=i=>TSK.filter(k=>CAT[i][k]==='F').length;
/* where each student stood on each taught skill at the end of each five-day block (the blocks a chart shows): their level, 0 beginning to 4 mastered, -1 fewer than two checks */
const STW=ALL.map(i=>{const o={};TSK.forEach(k=>{const a=[];for(let j=0;j<NBC;j++){const e=estOf(i,k,BE(j));a.push(!e||e.ev<2?-1:lvOf(e.c))}o[k]=a});return o});
/* a level folded into the three groups: 2 mastered, 1 familiar or proficient, 0 beginning or attempted, -1 fewer than two checks */
const G3=x=>x<0?-1:x>3?2:x>1?1:0;
/* the share of the skills taught by the end of block j that were mastered then */
function secAt(i,j){const ks=TSK.filter(k=>KT[k]<=BE(j));return ks.length?ks.filter(k=>STW[i][k][j]===4).length/ks.length:0}

/* ---------- key skills: the ones a unit is for ----------
   A teacher judges a unit by its key skills, not by a count of every skill its lessons name. A unit's key skills are the ones its own summary,
   test, exercise and practice lessons check (what the book assesses) that are also carried forward: named by two or more lessons and checked by
   three or more questions, or needed by a later unit. In the product a teacher would edit this list; here it is worked out from the book.
   A student's level in a unit is ALPS's unit band, read on the key skills the class has been checked on so far: the band of the student's mean
   score on the ones they have a level on, capped by the share of them that is (ALPS's coverage caps: under a quarter at most attempted, under
   half at most familiar, under 80% at most proficient). */
const TESTRE=/summary|test|exam|exercises|practice|frq/i;
const LISTED=ASK.map(()=>0);D.subs.forEach(s=>s.skills.forEach(q=>{LISTED[q[0]]++}));
const DUI=[];UIX.forEach((v,du)=>{if(v>=0)DUI[v]=du});                                            // a unit in view, back to its place in D.units
const laterNeed=du=>{const o=new Set();D.units.forEach((U2,u2)=>{if(u2>du)(U2.pre||[]).forEach(x=>o.add(x[0]))});return o};
const KEY=TB0.map((U,u)=>{const A=new Set(),need=laterNeed(DUI[u]);U.js.forEach(j=>{const sb=VJ[j];if(TESTRE.test(sb.code+' '+sb.name))sb.skills.forEach(q=>{if(q[2])A.add(q[0])})});
  return [...A].filter(k=>(LISTED[k]>=2&&KIT[k].length>=3)||need.has(k))});
const KEYC=KEY.map(ks=>ks.filter(k=>KTA[k]&&chk5(k)));                                            // the key skills the class has been checked on so far
/* a level's code is the initial of ALPS's level (M P F A B); it is not a skill's group (F H E). Q is no level yet, which ALPS calls unavailable */
const SL={M:'Mastered',P:'Proficient',F:'Familiar',A:'Attempted',B:'Beginning',Q:'Unavailable',X:'Not started',U:'Unavailable',L:'Doing the labs'};
const LVN={B:0,A:1,F:2,P:3,M:4};
/* a student's level on a set of skills: s the level's code, f the mean score on the skills they have a level on, cv the share of the skills that is,
   cap whether that share lowered the level, close the skills with a level but not mastered, e how many have a level */
function standK(i,ks){const e=ks.filter(k=>CAT[i][k]==='F'||CAT[i][k]==='H'||CAT[i][k]==='E'),close=e.filter(k=>CAT[i][k]!=='F');
  if(!e.length)return {s:'Q',f:0,cv:0,cap:false,close,e:0};
  const f=avg(e.map(k=>CUR[i][k])),cv=e.length/ks.length,l=lvOf(f),b=Math.min(l,cv<.25?1:cv<.5?2:cv<.8?3:4);
  return {s:LVC[b],f,cv,cap:b<l,close,e:e.length}}
const standMemo=new Map();
function standU(i,u){const key=i+':'+u;let o=standMemo.get(key);if(!o){o=TB0[u].on?standK(i,KEYC[u]):{s:'X',f:0,cv:0,cap:false,close:[],e:0};standMemo.set(key,o)}return o}
const standJ=(i,j)=>standK(i,jSk(0,j).filter(k=>KTA[k]&&chk5(k)));

/* ---------- engagement and performance for any unit, subunit or skill ----------
   Engagement is the share of the class's questions there that the student tried. The level is ALPS's: the unit band on the unit's key skills
   or on a lesson's skills, or the one skill's own level. */
const nodeItems=n=>n.t==='u'?TB0[n.id].js.flatMap(j=>SUBS[j].on?SUBS[j].its:[]):n.t==='j'?(SUBS[n.id].on?SUBS[n.id].its:[]):
  (n.j!==undefined&&SUBS[n.j].its.some(ix=>IT[ix].ks.includes(n.id))?SUBS[n.j].its.filter(ix=>IT[ix].ks.includes(n.id)):KIT[n.id].filter(ix=>CI[ix]));
const nodeSkills=n=>n.t==='u'?uSk(0,n.id):n.t==='j'?jSk(0,n.id):[n.id];
const cellMemo=new Map();
function cellN(i,tb,n){const key=i+n.t+n.id+(n.t==='k'&&n.j!==undefined?'/'+n.j:'');let b=cellMemo.get(key);
  if(b===undefined){const its=nodeItems(n);if(!its.length)b=null;else{let d=0;its.forEach(ix=>{if(AT[i].has(ix))d++});const k=n.id,c=CAT[i][k];
    const lv=EV[i][k]>=2&&CUR[i][k]!==null,st=n.t==='u'?standU(i,k):n.t==='j'?standJ(i,k):{s:lv?LVC[lvOf(CUR[i][k])]:'Q',f:lv?CUR[i][k]:0,close:c==='F'||!lv?[]:[k],e:lv?1:0};
    b={e:d/its.length,lab:its.every(ix=>IT[ix].lab),st}}cellMemo.set(key,b)}
  if(!b)return {g:'x'};
  /* a unit or lesson of labs is work done, with no level: a student is doing the labs, or not */
  if(b.lab){const doing=b.e>=S.v2.line/100;return {e:b.e,m:null,mc:'L',lab:true,doing,st:b.st,g:doing?'labs':'off'}}
  const e=b.e,mc=b.st.s==='X'||b.st.s==='Q'?'U':b.st.s,doing=e>=S.v2.line/100,high=mc==='M'||mc==='P';   // too early to tell draws as the hollow mark
  return {e,m:b.st.f,mc,doing,st:b.st,g:doing?(high?'on':mc==='F'?'go':mc==='A'||mc==='B'?'stuck':'early'):(high?'coast':'off')}}
const cell2=(i,n)=>cellN(i,0,n);
const KS2={u:u=>({t:'u',id:u}),j:j=>({t:'j',id:j}),k:k=>({t:'k',id:k})};
/* what a cell says of itself */
const cellTip=(i,c,name)=>{const t=c.st,n=t&&t.cv?Math.round(t.e/t.cv):0;
  return `<b>${NM[i]} · ${name}</b><br>${c.lab?GLAB[c.g]:SL[c.mc]}${!c.lab&&c.mc!=='U'&&t.e?(t.cv===undefined?` · score ${Math.round(t.f*100)}%`:` · performance ${Math.round(t.f*100)}% on ${t.e} of ${n} ${pl(n,'skill')}, ${t.e-t.close.length} mastered${t.cap?`; held at ${SL[c.mc].toLowerCase()} until more of them have a level`:''}`):''}<br><span>Engagement: tried ${Math.round(c.e*100)}% of the class’s questions${c.doing?'':' · under the line'}</span>`};

/* ---------- view 3: engagement, in five-day blocks ----------
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
/* Latest judgeable historical day, offered explicitly without changing the selected date. */
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
   A skill is a shared weakness when a fifth of the class or more is beginning or attempted on it at the same time (a score under 55% on two or
   more checks). One line per skill: the share of the students with a level on it (eight or more) who have mastered it, at the end of each five-day block,
   drawn upward, so a hard skill sits low or falls (lower is worse, as on every other line in the mock). A row's status comes from that same
   line over the last 30 days of class work (the last six blocks with work): getting worse when it fell 10 points or more, improving when it
   rose 10 or more, recovered when under 8% of the class is beginning or attempted, still weak otherwise. */
const SG={'Getting worse':'p','Still weak':'p',Improving:'f',Recovered:'g'};
const SC={p:['var(--il-bad)','tbad','Still weak','bad'],f:['var(--il-neutral)','t2','Improving','neutral'],g:['var(--il-gone)','tgone','Recovered','gone']};
const WEAK=(function(){const rows=[];
  /* the last seven blocks with class work, newest first: the line's change over the last 30 days of class work is its value now against the seventh */
  const LB=[];for(let j=NBC-1;j>=0&&LB.length<7;j--)if(ONB[j])LB.push(j);
  TSK.forEach(k=>{if(!chk5(k))return;const cnt=[],sv=[],nc=[];
    for(let j=0;j<NBC;j++){let ny=0,sec=0,ch=0;ALL.forEach(i=>{const q=STW[i][k][j];if(q>=0){ch++;if(q===4)sec++;else if(q<2)ny++}});cnt.push(ny);nc.push(ch);sv.push(ch>=8?Math.round(sec/ch*100):null)}
    const v=cnt.map(c=>Math.round(c/N*100)),peak=Math.max(...v),now=v[NBC-1];if(peak<20||Math.max(...cnt)<5)return;
    const sNow=sv[NBC-1],sAgo=LB.length>=7?sv[LB[6]]:null,d=sNow!==null&&sAgo!==null?sNow-sAgo:0;
    const pw=v.indexOf(peak),st=now<8?'Recovered':d<=-10?'Getting worse':d>=10?'Improving':'Still weak';
    const who=ALL.filter(i=>G3(STW[i][k][NBC-1])===0),was=ALL.filter(i=>G3(STW[i][k][pw])===0&&!who.includes(i));
    rows.push({k,n:cut(D.skills[k],36),v,sv,nc,sNow,st,now:who.map(i=>NM[i]),peak:was.map(i=>NM[i]),pkv:peak,lastv:now,pwd:BE(pw)})});
  const pick=(f,key)=>rows.filter(r=>SG[r.st]===f).sort((a,b)=>key(b)-key(a)||a.k-b.k);
  return pick('p',r=>r.lastv).concat(pick('f',r=>r.pkv-r.lastv),pick('g',r=>r.pkv))})();

/* how many of the still-weak skills each student is weak in. A student is flagged for being in the top quarter of the class on that count, and flagged red in the top tenth */
const WEAKN=ALL.map(i=>WEAK.filter(m=>SG[m.st]==='p'&&m.now.includes(NM[i])).length),WEAKQ=qt(WEAKN,.75),WEAKT=qt(WEAKN,.9);

/* ---------- view 7: stall points ----------
   A started subunit's content is the class's questions in it, in textbook order. Each student's outcome on each:
   0 right first time, 1 right after retries, 2 gave up (tried, never right), 3 skipped (never tried, though they have got to it),
   4 not reached yet (never tried, and nothing they have done is at it or past it). A task with no working check (kind r) only shows who
   tried it. Where a student has got to: the latest started lesson, in the order the class worked on them, that they have worked in (tried
   one of its questions, or opened its content); a lesson the class worked on later counts as past this one */
const RANKJ=(function(){const r=SUBS.map(()=>-1);SUBS.map((s,j)=>j).filter(j=>SUBS[j].on).sort((a,b)=>SUBS[a].mid-SUBS[b].mid||a-b).forEach((j,x)=>{r[j]=x});return r})();
const FRONT=ALL.map(i=>{let f=-1;AT[i].forEach((a,ix)=>{const j=IT[ix].j;if(j>=0&&RANKJ[j]>f)f=RANKJ[j]});return f});
D.opens.forEach(([i,ix,d])=>{const j=IT[ix]?IT[ix].j:-1;if(d<=LASTDAY&&j>=0&&RANKJ[j]>FRONT[i])FRONT[i]=RANKJ[j]});
const ctOf=(tb,j)=>SUBS[j].on?SUBS[j].its.map(ix=>[IT[ix].name,IT[ix].lab?'l':NOCHK[ix]?'r':'q',ix]):[];
const cMemo={};
function cOut(tb,j){if(cMemo[j])return cMemo[j];return cMemo[j]=(SUBS[j].on?SUBS[j].its:[]).map(ix=>ALL.map(i=>{const a=AT[i].get(ix);return !a?(FRONT[i]>=RANKJ[j]?3:4):NOCHK[ix]?0:a[9]===1?0:a[4]?1:2}))}
const cCnt=(tb,j)=>cOut(tb,j).map(o=>{const c=[0,0,0,0,0];o.forEach(x=>{c[x]++});return c});
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
  ITEMS.push({id:ITEMS.length,ix,tb:it.tb,name:it.name,u:it.u,j:it.j,f:it.f,type:it.type,k:it.ks.length?it.ks[0]:-1,p,pt,pb,d:Math.round(pt-pb)/100,n:who.length,
    t:clamp(Math.round(qt(who.map(i=>AT[i].get(ix)[7]),.5)),20,900),br,bug:!!BUG[ix]&&!NOCHK[ix],bn:who.length})});
/* with about 18 students in each half, only a clear gap means anything: stronger half 15+ points worse is misleading, under 5 points better doesn't separate */
const ZMIS=-.15,ZWEAK=.05;
const zone9=it=>it.br?'broken':it.d<=ZMIS?'mis':it.p>90?'easy':it.p<25?'hard':it.d<ZWEAK?'weak':'ok';

/* ---------- view 9: fading ---------- */
const FD=TSK.map(k=>{const ids=ALL.filter(i=>ML[i][k]!==null);if(ids.length<8)return null;const a=avg(ids.map(i=>MT[i][k]))*100,b=avg(ids.map(i=>ML[i][k]))*100;
  return {k,a,b,d:b-a,n:ids.length,sl:ids.filter(i=>MT[i][k]-ML[i][k]>=.2).map(i=>NM[i])}}).filter(Boolean);

/* ---------- view 10: readiness ----------
   What a unit needs, from the learner model's skill graph: the skills its own skills need that it does not use itself (level 1, strongest
   first: the model's confidence times how much the unit uses what they lead to), and what each of those needs (level 2, cs). A unit the
   graph says nothing about (an example book's) falls back on the coverage weights: skills an earlier unit teaches that its lessons use most.
   Keys are textbook:unit; f says what needs the skill. */
const RDG=u=>!!PRQ&&DUI[u]!==undefined&&DUI[u]<PRQ.units.length;   // the graph covers this unit
/* a student's level on a skill, as on every page: worked out from the class's answers (the score and its band, above), 0 beginning to 4
   mastered, or null with fewer than two checks: one is unavailable, none not attempted. A prerequisite no started lesson lists still has the
   class's answers on its questions, and they count here: whether a lesson taught it is the book under the ring, not a reason for no share */
const rdEst=(i,k)=>KTA[k]?null:estOf(i,k,LASTDAY);
const rdLv=(i,k)=>{const c=CAT[i][k];if(c==='F'||c==='H'||c==='E')return lvOf(CUR[i][k]);const e=rdEst(i,k);return e&&e.ev>=2?lvOf(e.c):null};
const rdUn=(i,k)=>{if(KTA[k])return CAT[i][k]==='Q';const e=rdEst(i,k);return !!e&&e.ev===1};   // no level, though the student answered one of its questions
/* a prerequisite says who is ready only when eight or more students have a level on it; its share is of those students */
const rdChk=(i,k)=>rdLv(i,k)!==null;
const RDN=ASK.map(()=>-1),rdN=k=>RDN[k]>=0?RDN[k]:(RDN[k]=ALL.filter(i=>rdChk(i,k)).length);
const rdOK=k=>chk5(k)&&rdN(k)>=8;
const READY={};VU.forEach((U,u)=>{const G=RDG(u)?PRQ.units[DUI[u]]:null;
  READY['0:'+u]=G?G.map(([k,sc,need,cs,nq])=>({k:prk(k),f:esc(andList(need)),sc,nq,qn:(PRQ.questions||[])[DUI[u]],cs:cs.map(([k2])=>prk(k2))}))
    :(U.pre||[]).map(([k,j])=>({k,f:esc(cut(bkTag(D.units[D.subs[j].u].tb)+D.subs[j].code+' '+D.subs[j].name,22)),cs:[]}))});   // pre names lessons of any book

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
const PRE=(READY['0:'+CU]||[]).filter(q=>rdOK(q.k)).slice(0,4);
/* how many of those skills each student has not mastered, and the class median: a gap most of the class shares is a class finding, not a flag on a student */
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
const PS=[['Short, not catching up','var(--il-bad)','tbad','bad'],['Short, but catching up','var(--il-watch)','twatch','watch'],['Ahead now, but slowing','var(--il-watch)','twatch','watch'],['On pace','var(--il-neutral)','t2','neutral'],['Ahead','var(--il-good)','tgood','good'],['Too early to tell','var(--il-neutral)','t3','neutral']];
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
  const count=d=>scope.ks.filter(k=>{const e=estOf(i,k,d);return e&&e.ev>=2&&lvOf(e.c)===4}).length;
  const now=count(TODAY),before=count(start),rec=end!==null&&end>start?(now-before)/(end-start):0,ear=start>prev?(before-count(prev))/(start-prev):0;
  const checked=scope.ks.filter(k=>{const e=estOf(i,k,TODAY);return e&&e.ev>=2}).length;
  const enough=goal>0&&checked>=Math.min(2,goal)&&(now===goal||days.size>=2),proj=enough?Math.min(goal,now+Math.max(0,rec)*Math.max(0,day-TODAY)):null;
  const due=goal*clamp((TODAY-scope.first+1)/Math.max(1,day-scope.first+1),0,1);let st;
  if(!enough)st='Too early to tell';
  else if(now===goal)st='Ahead';
  else if(day>TODAY&&now>=due&&rec<ear-.5/PACE_WINDOW)st='Ahead now, but slowing';
  else if(proj>=goal)st=now>=due+2?'Ahead':'On pace';
  else st=rec>0&&rec>ear+.5/PACE_WINDOW?'Short, but catching up':'Short, not catching up';
  const close=scope.ks.filter(k=>{const e=estOf(i,k,TODAY);return !e||e.ev<2||lvOf(e.c)<4});
  const o={now,rec,ear,start,end,due,proj,st,goal,checked,close,behind:enough&&proj<goal,key:PS[PSI[st]][3],label:st};paceMemo.set(key,o);return o}
const paceSummary=p=>`${p.now} of ${p.goal} mastered now${p.proj===null?' · more checks needed':` · about ${paceNum(p.proj)} by ${dayDateY(S.v4.day)}${p.end!==null&&TODAY-p.end>PACE_WINDOW?', if work resumes':''}`}`;

/* ---------- view 11: the sets the teacher gave, and whether they worked ----------
   Every set the database records for this class: the practice sets targeted at part of it, and the sets assigned to all of it with a due date.
   For each, the students who did it (a targeted set's students; an assigned set's finishers) against classmates who didn't, on the change in
   credit on later questions that check the same skills, the set's own questions left out. A set is judged when four or more on each side have
   two checks before it and two after; the range is the middle 90% of 400 resamples. Nothing here is invented */
function judgeSet(o,sx){const {did,own,day}=o,kc={};
  own.forEach(ix=>IT[ix].ks.forEach(k=>{kc[k]=(kc[k]||0)+1}));const ks=Object.keys(kc).map(Number).sort((a,b)=>kc[b]-kc[a]).slice(0,4),kset=new Set(ks);
  const chg=i=>{const pre=[],post=[];AT[i].forEach((a,ix)=>{if(!EVOK(ix)||!IT[ix].ks.some(k=>kset.has(k)))return;if(a[6]<day)pre.push(credit(a));else if(a[6]>day+2&&!own.has(ix))post.push(credit(a))});return pre.length>=2&&post.length>=2?avg(post)-avg(pre):null};
  const A=did.map(chg).filter(v=>v!==null),B=ALL.filter(i=>!did.includes(i)).map(chg).filter(v=>v!==null);let est=null,lo=null,hi=null;
  if(A.length>=4&&B.length>=4){est=Math.round((avg(A)-avg(B))*100);const r=rng(900+sx),bs=[],pick=a=>a.map(()=>a[Math.floor(r()*a.length)]);for(let q=0;q<400;q++)bs.push((avg(pick(A))-avg(pick(B)))*100);bs.sort((x,y)=>x-y);lo=Math.round(bs[20]);hi=Math.round(bs[379])}
  const did1=o.kind==='assigned'?'finished it':'did it',nq=[...own].filter(ix=>IT[ix].f).length;
  /* a short name for the headline: the product's "ALPS " before an assigned set's number and its lesson range in brackets left out */
  const sn=o.kind==='assigned'?o.name.replace(/^ALPS\s+/,'').replace(/:\s*/,' ').replace(/\s*\([^)]*\)\s*$/,''):o.name;
  return {n:esc(o.name),sn:esc(sn),nr:o.name,kind:o.kind,who:did.map(i=>NM[i]),when:o.kind==='assigned'?`due ${dayDate(day)}`:dayDate(day),day,est,lo,hi,na:A.length,nb:B.length,ks,
    nq,dose:`${nq} ${pl(nq,'question')} · ${o.kind==='assigned'?`due ${dayDate(day)} · ${did.length} of ${N} finished`:dayDate(day)}`,
    cmp:est===null?`only ${A.length} who ${did1} and ${B.length} who didn’t have later work on its skills to compare`:`compared on later work: ${A.length} of the ${did.length} who ${did1}, ${B.length} of the ${N-did.length} who didn’t`,
    rec:est===null?'Check again after more work.':lo>0?'Keep it.':est>=5?'Check again after the next unit.':''}}
const IVS=D.sets.map((st,sx)=>judgeSet({name:st.name,kind:'targeted',did:[...new Set(st.rows.map(r=>r[0]))],own:new Set(st.rows.map(r=>r[1])),day:st.day},sx))
  .concat(D.coursework.filter(c=>(c.items||[]).length&&!D.sets.some(st=>st.name===c.name)).map((c,cx)=>judgeSet({name:c.name,kind:'assigned',did:c.done.slice(),own:new Set(c.items),day:c.due},D.sets.length+cx)));
const verdict=d=>d.est===null?{t:'Awaiting evidence',c:'',m:'var(--il-neutral)',k:'t3'}:d.lo>0?{t:'Clear positive difference',c:'good',m:'var(--il-good)',k:'tgood'}:d.hi<0?{t:'Clear negative difference',c:'bad',m:'var(--il-bad)',k:'tbad'}:{t:'Uncertain difference',c:'neutral',m:'var(--il-neutral)',k:'t2'};
/* the list runs from what clearly worked down to what can't be judged yet */
IVS.sort((a,b)=>{const r=d=>d.est===null?3:d.lo>0?0:d.est>=5?1:2;return r(a)-r(b)||(b.est||0)-(a.est||0)||a.day-b.day});

/* no work in the last five days, while the class was working */
const NOWORK=i=>JUDGE&&WB[i][RB]===0;
const RULE0={};

/* ---------- state ---------- */
/* page ids: 0 was the overview (removed), 2 engagement and performance, 3 drifting, 4 pace, 5 hardest content, 6 shared weak skills, 7 stall points, 9 fading, 10 readiness, 11 what worked.
   Ids 1 and 8 were the lesson replay ("Attention now") and Item health, which were removed; the other ids stayed as they were, so flags, links and the action log still point at the same pages.
   The number a teacher sees on a tab is not the id but the page's priority (PRI, below). State keys keep their original names (v6 = hardest content, v7 = shared weak skills, and so on). */
const RV0=(location.search.match(/[?&]rv=(2)(?=&|$)/)||[])[1]||'now';   // ?rv=2 opens the radial version of Ready for a unit
const FV0=(location.search.match(/[?&]fv=([1-5])(?=&|$)/)||[])[1]||'now';   // ?fv=1 to 5 opens a version of the bar for a followed student
const SV0=(location.search.match(/[?&]sv=([1-9]|10)(?=&|$)/)||[])[1]||'now';   // ?sv=1 to 5 opens a version of Stall points
const S={view:2,stu:null,fv:FV0,log:[],
  v2:{tb:0,at:{u:null,j:null},pg:0,sel:{t:'u',id:0},sort:'start',line:60,hl:null,detail:null,overlap:null},
  v3:{all:false,detail:null},
  v4:{u:0,day:TODAY+30,sort:'status',detail:null,reference:false},
  v6:{tb:0,sort:'hard',ex:{},sel:{},xf:'all'},
  v7:{r:0,f:'all',more:false,view:'weak',u:'all',pts:[]},
  v8:{tb:0,ex:{},sel:{},selw:{},sort:'course',view:'worst',k:null,ver:SV0,gj:null,oj:{}},
  v10:{u:'all',all:false,k:-1,sall:false},
  v11:{lv:'P',grp:null,tb:0,u:{},rm:{},acc:{},ver:RV0,allSkills:false,zoom:{key:null,multiple:1}},
  v12:{r:0,f:'all'},
  td:{gen:null,rm:{},ex:{},bud:{}},fold:{},pvGo:null,prof:0,
  tbl:null};   // a skill's table, open over the page: {k, from, f (who is shown), s and dir (the sort), q (a question picked), all}
const R5=()=>RULE0;
const $=s=>UIROOT.querySelector(s);
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
const duo=(a,left,right,cls)=>a?`<div class="duo${cls?' '+cls:''}" style="--il-a:${a}px;grid-template-columns:${a}px minmax(0,1fr)"><div class="duo-a">${left}</div><div class="duo-b">${right}</div></div>`:left+right;

/* Shared chart framing. Each page supplies its own visual and explicit units. */
const chartAxis=(ticks,max=100)=>`<div class="visual-axis" aria-hidden="true">${ticks.filter((t,i)=>i===ticks.map(q=>q[0]).lastIndexOf(t[0])).map(t=>`<span style="left:${max?t[0]/max*100:0}%">${t[1]}</span>`).join('')}</div>`;
const chartHead=(label,axis,reading)=>`<div class="visual-row visual-head"><span>${label}</span>${axis}<span>${reading||''}</span></div>`;
const chartGrid=(ticks=[0,25,50,75,100])=>ticks.map(v=>`<i class="lane-grid" style="left:${v}%"></i>`).join('');
const chartStudentActions=i=>`<div class="student-actions">${nmBtn(NM[i])}${pinBtn(i)}</div>`;
const levelLegend=(order=[0,1,2,3,4])=>`<div class="legend visual-legend">${order.map(b=>`<span>${lsw(b)}${LV[b]}</span>`).join('')}<span><i class="sw hatch"></i>One check</span><span><i class="sw unattempted"></i>Not attempted</span></div>`;
function pairedPlot(a,b,label,col){return `<span class="paired-plot graphic-lane" role="img" aria-label="${label}" data-initial="${a}" data-later="${b}">${chartGrid()}<i class="paired-link" style="left:${Math.min(a,b)}%;width:${Math.abs(b-a)}%;background:${col}"></i><i class="paired-dot initial" style="left:${a}%"></i><i class="paired-dot later" style="left:${b}%;background:${col}"></i></span>`}
function masteryPlot(p){return `<span class="mastery-plot graphic-lane" role="img" aria-label="${p.now} of ${p.goal} mastered; ${p.proj===null?'more checks needed':'estimated '+paceNum(p.proj)}" data-now="${p.now}" data-projected="${p.proj===null?'':p.proj}" data-goal="${p.goal}">${chartGrid([0,50,100])}<i class="mastery-base"></i><i class="mastery-now" style="width:${p.goal?p.now/p.goal*100:0}%"></i>${p.proj===null?'':`<i class="mastery-estimate" style="left:${p.now/p.goal*100}%;width:${(p.proj-p.now)/p.goal*100}%"></i><i class="paired-dot estimate" style="left:${p.proj/p.goal*100}%"></i>`}<i class="goal-tick"></i>${S.v4.reference?`<i class="reference-tick" style="left:${p.due/p.goal*100}%"></i>`:''}</span>`}
function activityTrace(i,from=Math.max(0,RB-7),to=RB){const nm=NORM[i],h=64,w=480,x=j=>4+(j-from)/Math.max(1,to-from)*(w-8),y=v=>h-6-clamp(v,0,200)/200*(h-12),a=WB[i];
  let body='';[50,100].forEach(v=>{body+=`<line x1="4" x2="${w-4}" y1="${y(v)}" y2="${y(v)}" class="${v===100?'usual-reference':'low-reference'}" vector-effect="non-scaling-stroke"/>`});
  for(let j=from;j<=to;j++)if(!ONB[j])body+=`<rect x="${Math.max(0,x(j)-((w-8)/Math.max(1,to-from))/2)}" y="0" width="${(w-8)/Math.max(1,to-from)}" height="${h}" class="quiet-period" style="fill:url(#activity-quiet-${i})"/>`;
  if(nm>0){let run=[];const flush=()=>{if(!run.length)return;body+=`<polyline points="${run.map(j=>x(j)+','+y(a[j]/nm*100)).join(' ')}" class="activity-line" vector-effect="non-scaling-stroke"/>`;if(DR[i]>=0){const red=run.filter(j=>BE(j)>=DR[i]);if(red.length)body+=`<polyline points="${red.map(j=>x(j)+','+y(a[j]/nm*100)).join(' ')}" class="activity-line alert-line" vector-effect="non-scaling-stroke"/>`}run=[]};
    for(let j=from;j<=to;j++){if(ONB[j])run.push(j);else flush();if(ONB[j]&&a[j]/nm*100>200)body+=`<path d="M${x(j)-4} 8 L${x(j)} 2 L${x(j)+4} 8" class="overflow-mark" vector-effect="non-scaling-stroke"/>`}flush();
    if(ONB[to])body+=`<circle cx="${x(to)}" cy="${y(a[to]/nm*100)}" r="3" class="trace-end ${JUDGE&&(DR[i]>=0||WATCH[i])?'attention':''}"/>`;
  }
  return `<span class="activity-trace"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${NM[i]}: activity compared with own usual, 0 to 200 percent, ${dayDateY(BS(from))} to ${dayDateY(BE(to))}"><defs><pattern id="activity-quiet-${i}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--il-surface-2)"/><path d="M0 6L6 0" stroke="var(--il-axis)" stroke-width="1"/></pattern></defs>${body}</svg>${nm>0?'':`<span class="trace-empty">${nm===0?'Usual count is zero':'More history needed'}</span>`}</span>`}

/* ---------- view meta ---------- */
const VM=[null, /* id 0: the overview, removed; a student's flags live in the bar for a followed student, and the next step on their profile */
null, /* id 1: the lesson replay, removed */
{q:'Who is engaged, and is it showing in their performance?',k:'Engagement and performance grid',s:'Engagement and performance',w:'Weekly'},
{q:'Who is drifting, and since when?',k:'Watchlist with normal ranges',s:'Drifting',w:'Weekly'},
{q:'Will each student reach the target unit’s goal by your date?',k:'Pace tracks',s:'On pace',w:'Every fortnight'},
{q:'Which units, subunits and skills are hardest?',k:'Ranked bars',s:'Skills · by unit',w:'End of each unit'},
{q:'Which skills are many students weak in, and which first?',k:'Weekly areas',s:'Skills',w:'Weekly'},
{q:'Which questions need more practice or were skipped?',k:'Outcome counts',s:'Stall points',w:'After each lesson'},
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
const SLUG={2:'engagement',3:'drifting',4:'pace',5:'hardest',6:'skills',7:'stall-points',9:'fading',10:'ready',11:'actions'};
const OLDSLUG={'overview':2,'effort':2,'weak-skills':6,'worked':11};   // the old names still open a page: the overview's link lands on the first page
/* with several books, two sentences are added to the pages that show them (below, after the list) */
const HOW=['', /* id 0: the overview, removed */
'', /* id 1: removed */
'Each dot is a student: practice attempted across, recorded skill score up. Both axes use fixed 0–100 scales. Open dots mark coverage-limited levels; coverage never moves a score. Counts mark coincident students; selecting them exposes the names. Summary cards filter the plot. Exact figures and student evidence remain available.',
'Activity histories share dates and a 0–200% scale. The dashed baseline is 100% of each student’s own usual; the alert threshold is 50%. Red marks the sustained drop while the class is working. Gaps are periods without class work. Select a trace for exact counts and the full history.',
'Tracks count goal skills, not elapsed time. Solid is mastered now; dashed is a conditional estimate by your date. Goal skills include the target unit and earlier skills it uses. Open evidence for dates and assumptions. The optional dotted marker is an even-pace reference, not an assigned schedule.',
'Units expand into lessons and skills. Bars show assessed student–skill pairs by all five mastery levels; each skill counts once per unit. The rate includes proficient students who are not yet mastered. Counts identify foundational weakness separately. Select a skill for students, unknown evidence and underlying questions.',
'Each bar is the whole class: red is beginning or attempted, grey is other assessed students, hatching is one check, and empty is not attempted. Select a skill for all five levels, students and questions. History and explicit date/skill comparisons remain available.',
'Each bar counts students by outcome. Numbers appear inside segments; hover for narrow ones. Skipped means no attempt on this question, with recorded activity in this or a later lesson. Select a question to see its student groups. Parent rows count unique students; expanded distributions count student–question records.',
'', /* id 8: removed */
`Open dots are initial scores, filled dots later scores; both class and student plots share 0–100. Line direction and length show the change. Select a pair for evidence dates and sample sizes. Class flags use 8 points, student flags 20; all rechecked skills remain available.`,
'Tree and Radial connect prerequisites to the selected unit. Each graph starts fitted to the screen; zoom in for detail and use Fit to see it all again. Rings show assessed students by mastery level, with the share at target inside; unknown levels are excluded. A filled book means taught, an open book means not taught yet. Select a skill for evidence and unknown counts. The expandable table retains every prerequisite and underlying relationship. Readiness uses 60% and 80% group thresholds, separate from individual mastery levels; missing evidence qualifies the verdict.',
'Your action log is separate from measured outcomes. Dots estimate the score-gain difference between students who finished a set and the comparison group; ranges show uncertainty. These are observational comparisons. Sets without enough later evidence are listed separately, without a plotted estimate.'];
if(MULTI){const BK=` The Textbook row keys each textbook to a letter; a textbook narrows the page to its units and the skills they use. A level counts every textbook’s questions, so it does not change with the textbook. A unit of labs is work done, not a check: a gray bar, no level.`;
  HOW[2]+=BK+' Columns are grouped by textbook.';[3,4,5,6,7,9,10].forEach(k=>{HOW[k]+=BK})}

/* ---------- helpers ---------- */
const tips=new Map();let tipN=0;
const tp=h=>{const id='t'+(++tipN);tips.set(id,h);return ` data-tip="${id}"`};
const T=(x,y,t,o)=>{o=o||{};return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${o.a||'start'}" class="${o.c||'t2'}"${o.w?` font-weight="${o.w}"`:''}${o.s?` style="font-size:${o.s}px"`:''}>${t}</text>`};
const NB=(x,y,n)=>`<g class="nbg"><circle cx="${f1(x)}" cy="${f1(y)}" r="9" style="fill:var(--il-ink)"/><text x="${f1(x)}" y="${f1(y+4)}" text-anchor="middle" style="fill:var(--il-surface);font-weight:700;font-size:12px">${n}</text></g>`;
const nbH=n=>`<span class="nb" aria-hidden="true">${n}</span>`;
const reviewPage=()=>true;
const nmBtn=(n,extra)=>`<button class="nm${S.stu===ID[n]?' on':''}" type="button" data-act="${reviewPage()?'prof':'stu'}" data-i="${ID[n]}">${n}${extra||''}</button>`;
const pinBtn=i=>`<button class="btn small pin" type="button" data-act="pin" data-i="${i}" aria-pressed="${S.stu===i}" aria-label="${S.stu===i?'Stop following':'Follow'} ${NM[i]}">${S.stu===i?'Following':'Follow'}</button>`;
const measureTrack=(value,label,tone)=>`<span class="metric-track${tone?' '+tone:''}" role="img" aria-label="${esc(label)}"><span style="width:${clamp(value,0,100)}%"></span></span>`;
/* students are listed to be scanned, not as chips: one row a student, in alphabetical order, in columns that run down then across;
   where the page has the number behind a student's place in the list, it sits at the right of the row, and a short caption names it.
   A name still opens the student, as everywhere. o.rm adds a button to take a student out of a group */
const roster=(rows,o)=>{o=o||{};if(!rows.length)return `<p class="none">${o.none||'None'}</p>`;
  const rs=rows.map(r=>typeof r==='string'?{n:r}:r).sort((a,b)=>a.n.localeCompare(b.n));
  return `<ul class="roster${rs.length>6&&o.cols!==false?' cols':''}">${rs.map(r=>`<li>${nmBtn(r.n)}${r.v?`<span class="rv">${r.v}</span>`:''}${o.rm?`<button class="x" type="button" data-act="${o.rm[0]}" data-g="${o.rm[1]}" data-n="${r.n}" aria-label="Remove ${r.n} from this group">${IC.x}</button>`:''}</li>`).join('')}</ul>`};
const rcap=t=>t?`<span class="rcap">${t}</span>`:'';
const names=(a,val)=>roster(a.map(n=>({n,v:val?val(n):''})));
const whoCol=(t,c,a,val,cap)=>`<div><p class="dl"><i class="sw${/lv-|--il-st-|--il-ok-fill|--il-na-/.test(c)?' lv':''}" style="background:${c}"></i>${t} · ${a.length}${rcap(cap)}</p>${names(a,val)}</div>`;
const takes=a=>`<ol class="takes">${a.map((t,i)=>`<li><span class="nb">${i+1}</span><span>${t}</span></li>`).join('')}</ol>`;
const fig=s=>`<div class="fig">${s}</div>`;
/* a picker with many options (a unit, a book) is one select, not a row of buttons; opts are [value,label] pairs, or [group,[pairs]] groups */
const selOpt=(cur,o)=>`<option value="${o[0]}"${String(cur)===String(o[0])?' selected':''}>${o[1]}</option>`;
const pickCtl=(id,cur,opts,label)=>`<label class="sel" for="${id}">${label} <select id="${id}">${opts.map(o=>Array.isArray(o[1])?`<optgroup label="${o[0]}">${o[1].map(x=>selOpt(cur,x)).join('')}</optgroup>`:selOpt(cur,o)).join('')}</select></label>`;
const seg=(act,cur,opts,label)=>`<div class="seg" role="group" aria-label="${label}">${opts.map(o=>`<button type="button" data-act="${act}" data-f="${o[0]}" aria-pressed="${String(cur)===String(o[0])}">${o[1]}</button>`).join('')}</div>`;
const HATCH=`<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:var(--il-surface-2)"/><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--il-hatch);stroke-width:2.2"/></pattern>`;
const IC={
up:'<svg class="ic up" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 L10.5 6.5 H7.3 V10.5 H4.7 V6.5 H1.5 Z" fill="currentColor"/></svg>',
down:'<svg class="ic down" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10.5 L10.5 5.5 H7.3 V1.5 H4.7 V5.5 H1.5 Z" fill="currentColor"/></svg>',
sad:'<svg class="ic sad" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="4.2" cy="4.8" r=".85" fill="currentColor"/><circle cx="7.8" cy="4.8" r=".85" fill="currentColor"/><path d="M3.8 8.7 Q6 6.9 8.2 8.7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
check:'<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.3 6.4 L4.9 9 L9.7 3.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
x:'<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 3.2 L8.8 8.8 M8.8 3.2 L3.2 8.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
grid:'<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.6 1.6 H5.1 V5.1 H1.6 Z M6.9 1.6 H10.4 V5.1 H6.9 Z M1.6 6.9 H5.1 V10.4 H1.6 Z M6.9 6.9 H10.4 V10.4 H6.9 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
leak:'<svg class="ic" viewBox="0 0 12 12" aria-hidden="true" style="width:14px;height:14px"><path d="M2.5 1.5 V6 Q2.5 8.5 5 8.5 H10 M7.5 6 L10 8.5 L7.5 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
const DESIGN=window.INSIGHT_ALPS;
const iconBody=key=>{const icon=DESIGN.icons[key]||DESIGN.icons.unknown;return `<svg viewBox="${icon.viewBox}" width="100%" height="100%" aria-hidden="true" focusable="false">${icon.paths.map(d=>`<path d="${d}" fill="currentColor"/>`).join('')}</svg>`};
const NAVICON={0:'grid',2:'analytics',3:'down',4:'monitoring',5:'skill',6:'skill',7:'assignment',9:'skill',10:'book',11:'history'};
const glyph=k=>`<svg class="glyph" data-alps-icon="${NAVICON[k]}" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">${iconBody(NAVICON[k])}</svg>`;

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
/* A flag: the page it comes from (v), its level (l), its status in a few words (s), a short detail (d) and the full one (dl); t is the one line
   the current bar draws */
function flags(i){const n=NM[i],f=[],F=(v,l,t,s,d,dl)=>f.push({v,l,t,s,d:d||'',dl:dl||d||''});
  const gu={};TAUGHT.forEach(u=>{gu[u]=cell2(i,KS2.u(u)).g});const st=TAUGHT.filter(u=>gu[u]==='stuck'),of=TAUGHT.filter(u=>gu[u]==='off'),co=TAUGHT.filter(u=>gu[u]==='coast');
  const un=a=>a.length>=2?a.length+' units':UN[a[0]][0];
  if(NOWORK(i))F(2,'bad','No work in the last 5 days','No work','in the last 5 days');
  if(st.length)F(2,'bad',`Struggling · ${un(st)}`,'Struggling',un(st));
  if(of.length)F(2,'bad',`Low engagement · ${un(of)}`,'Low engagement',un(of));
  if(co.length)F(2,'good',`Coasting in ${andList(co.map(u=>UN[u][0]))}`,'Coasting',`in ${andList(co.map(u=>UN[u][0]))}`);
  if(DR[i]>=0)F(3,'bad',`Drifting since ${dayDate(DR[i])}`,'Drifting',`since ${dayDate(DR[i])}`);else if(WATCH[i])F(3,'watch','Working less in the last 5 days','Working less','in the last 5 days');
  const p=paceOf(i),pu=TB0[S.v4.u].s;if(p.behind||p.st==='Ahead')F(4,p.key,p.label+' · '+pu+' · '+paceSummary(p),p.label,`${pu} · ${p.now} of ${p.goal} mastered now`,`${pu} · ${paceSummary(p)}`);
  const wm=WEAK.filter(m=>SG[m.st]==='p').length;if(WEAKN[i]>=3&&WEAKN[i]>WEAKQ)F(6,WEAKN[i]>WEAKT?'bad':'watch',`Weak in ${WEAKN[i]} of the class’s ${wm} weak skills`,'Weak skills',`${WEAKN[i]} of the class’s ${wm}`);
  const o8=cOut(0,CJ).map(o=>o[i]),g8=o8.filter(x=>x===2).length,k8=o8.filter(x=>x===3).length,cj=SUBS[CJ].s;
  if(g8>=2)F(7,'watch',`${LABV?'Not right yet on':'Gave up on'} ${g8} · ${cj}`,LABV?'Not right yet':'Gave up',`on ${g8} in ${cj}`);if(k8>=3&&k8>=o8.length/2&&o8.some(x=>x<3))F(7,'watch',`Skipped ${k8} of ${o8.length} · ${cj}`,'Skipped',`${k8} of ${o8.length} in ${cj}`);
  const sl=slipped(i),rc=TSK.filter(k=>ML[i][k]!==null).length,sp=rc>=6?sl.length/rc:0;if(sp>=.3)F(9,sp>=.4?'bad':'watch',`Slipped on ${sl.length} of ${rc} skills`,'Slipped',`on ${sl.length} of ${rc} skills`);
  if(PRE.length){const nr=PREGAP[i],cu=TB0[CU].s;if(nr>=2&&nr>PREMED)F(10,nr===PRE.length?'bad':'watch',`Not ready for ${cu}: ${nr} of the ${PRE.length} skills it builds on`,'Not ready',`for ${cu}: ${nr} of ${PRE.length} skills`,`for ${cu}: ${nr} of the ${PRE.length} skills it builds on`);else if(PRE.every(q=>CAT[i][q.k]==='F'))F(10,'good',`Ready · ${cu}`,'Ready',`for ${cu}`)}
  const iv=IVS.filter(d=>d.kind==='targeted'&&d.who.length<N&&d.who.includes(n));if(iv.length)F(11,'neutral',`Did ${iv.length} targeted practice ${pl(iv.length,'set')}`,'Targeted practice',`did ${iv.length} ${pl(iv.length,'set')}`);
  return f}

/* a unit in a picker: its number and name, with where the class is; under "All books" the units are grouped by book */
const unitOpt=u=>[String(u),`${TB0[u].s.replace(/^[A-Z] · /,'')} · ${TB0[u].nb}${reviewPage()?(u===CU?' (current)':TB0[u].on?' (started)':' (not started)'):(u===CU?' (now)':TB0[u].on?' (done)':'')}`];
const unitOpts=us=>MULTI&&PICK===null?BKON.map(tb=>[`${BL[tb]} · ${BOOKS[tb].s}`,us.filter(u=>TB0[u].tb===tb).map(unitOpt)]).filter(g=>g[1].length):us.map(unitOpt);

/* ---------- view 2: engagement and performance, per textbook, with unit, subunit and skill drill-down ---------- */
const nodeName=(n,tb)=>{tb=tb===undefined?S.v2.tb:tb;return n.t==='u'?TBU(tb,n.id).n:n.t==='j'?TBJ(tb,n.id).n:ASK[n.id]};
const MLAB={M:'Mastered',P:'Proficient',F:'Familiar',A:'Attempted',B:'Beginning',U:'Unavailable',L:'Labs: no level'};
const GLAB={on:'On track',go:'Nearly there',stuck:'Struggling',early:'Too early to tell',coast:'Coasting',off:'Low engagement',labs:'Doing the labs'};
/* a level is ALPS's battery: four blocks, as many filled in the level's colour as the level (none for beginning, four for mastered), and four
   dashed outlines when there is no level yet (unavailable). Red is kept for the two problem marks: the engagement line under a cell when it is
   under the line (amber when coasting), and the dot for struggling */
const MRAMP={M:LVCOL[4],P:LVCOL[3],F:LVCOL[2],A:LVCOL[1],B:LVCOL[0]};
const battery=(x,y,w,h,mc)=>{const g=w>=30?2:1.5,bw=(w-3*g)/4;let s='';for(let q=0;q<4;q++){const bx=x+q*(bw+g);
  /* attempted's block is so pale that on the picked column's tint it would vanish and read as beginning: it keeps a thin outline in the next blue */
  s+=mc==='U'?`<rect x="${f1(bx+.5)}" y="${f1(y+.5)}" width="${f1(bw-1)}" height="${f1(h-1)}" style="fill:var(--il-ua-2);stroke:var(--il-ua-line);stroke-dasharray:2 1.5"/>`
    :mc==='A'&&!q?`<rect x="${f1(bx+.5)}" y="${f1(y+.5)}" width="${f1(bw-1)}" height="${f1(h-1)}" style="fill:var(--il-lv-a);stroke:var(--il-lv-f);stroke-width:1"/>`
    :`<rect x="${f1(bx)}" y="${f1(y)}" width="${f1(bw)}" height="${f1(h)}" style="fill:${LVN[mc]>q?MRAMP[mc]:'var(--il-lv-b)'}"/>`}return s};
const batt=m=>`<svg width="24" height="10" viewBox="0 0 24 10" aria-hidden="true">${battery(0,0,24,10,m)}</svg>`;
const RAMPKEY=()=>`<span class="lt">Performance</span>${LVC.slice().reverse().map(m=>`<span>${batt(m)}${SL[m]}</span>`).join('')}`;
/* ALPS's look for a level with no number: hatched pale gray */
const UAH=`<pattern id="ua" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" style="fill:var(--il-ua-2)"/><rect width="4" height="8" style="fill:var(--il-ua-1)"/></pattern>`;
const effCol=c=>c.doing?'var(--il-axis)':c.g==='coast'?'var(--il-watch)':'var(--il-bad)';
function cellMark(x,y,w,h,c){const fh=Math.max(6,h-5),eb=y+fh+2,ew=Math.max(1.5,w*clamp(c.e||0,0,1));
  /* a labs cell is one gray bar, the share of the labs tried, red when under the line: work done, no level */
  if(c.mc==='L')return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="2.5" style="fill:var(--il-surface-2)"/><rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(1.5,w*clamp(c.e||0,0,1)))}" height="${f1(h)}" rx="2.5" style="fill:${c.doing?'var(--il-ink-3)':'var(--il-bad)'}"/>`;
  const fill=battery(x,y,w,fh,c.mc);
  return fill+`<rect x="${f1(x)}" y="${f1(eb)}" width="${f1(w)}" height="3" rx="1.5" style="fill:var(--il-surface-2)"/><rect x="${f1(x)}" y="${f1(eb)}" width="${f1(ew)}" height="3" rx="1.5" style="fill:${effCol(c)}"/>`+(c.g==='stuck'?`<circle cx="${f1(x+w-Math.min(5,w/3))}" cy="${f1(y+fh/2)}" r="3.2" style="fill:var(--il-bad);stroke:var(--il-surface);stroke-width:1.5"/>`:'')}
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
/* the answer is about what the chart shows: the unit (or subunit or skill) on show, how many are on track, and how many are in each group the
   panel beside the chart names, so a card's count is the panel's */
const f2=()=>{const tb=S.v2.tb,E=S.v2,ids=tbWho(tb),cs=ids.map(i=>cellN(i,tb,E.sel)),n=g=>cs.filter(c=>c.g===g).length;
  return {nm:nodeName(E.sel,tb),N:ids.length,lab:cs.some(c=>c.lab),on:n('on'),go:n('go'),stuck:n('stuck'),off:n('off'),coast:n('coast'),labs:n('labs')}};
function h2(){const f=f2(),ln=S.v2.line;if(f.lab)return `${f.nm}: ${f.labs} of ${f.N} meet the practice threshold; ${f.off} tried under ${ln}% of eligible labs. Labs do not assess a level.`;
  return `${f.nm}: ${f.on} of ${f.N} on track${f.go?` and ${f.go} nearly there`:''}; ${f.stuck} need support, ${f.off} are below the ${ln}% practice threshold, and ${f.coast} have high performance with fewer attempts.`}
/* every chart's name: what it shows, in a teacher's words, seven words at most (asked 2026-10-26: "Use accurate name (not more than 5-7
   words) for all the graphs for a teacher to understand quickly what the graph is about"). {u} is a unit's name, {n} a student's */
const CT={eng:'Each student’s engagement and performance',labs:'Each student’s share of labs tried',grid:'Each student’s level and engagement',
  drift:'Recent work compared with usual',pace:'Goal skills mastered',weak:'Skills needing support now',
  unit:'Students’ levels by unit and skill',fade:'Initial and later class scores',fade1:'Initial and later student scores',
  ready:'Skills {u} builds on',sets:'Estimated score-gain differences after practice',prof:'{n}: skills mastered and questions tried',units:'{n}’s level in each unit'};
const ctT=t=>`<h3 class="ctt">${t}</h3>`;
function v2(){const E=S.v2,A=E.at,ns=TB0.filter(U=>!U.on);
  /* The selected unit, with breadcrumbs retained for a lesson or skill opened from another view. */
  const pick=A.u===null?`${pickCtl('v2unit',E.sel.id,unitOpts(TAUGHT),'Unit')}${ns.length?`<span class="usnap next"${tp(ns.map(U=>U.nb).join('<br>'))}><span>+${ns.length} ${pl(ns.length,'unit')} not started</span></span>`:''}`
    :`<nav class="crumbs" aria-label="Where you are in the textbook"><button class="lnk" type="button" data-act="v2up" data-f="all">All units</button><span class="sep" aria-hidden="true">›</span>${A.j===null?`<b>${TB0[A.u].n}</b>`:`<button class="lnk" type="button" data-act="v2up" data-f="u">${TB0[A.u].n}</button><span class="sep" aria-hidden="true">›</span><b>${SUBS[A.j].n}</b>`}</nav>`;
  const line=`<label class="rng eng-practice-control" for="v2line"><span>Practice threshold</span><output id="v2lo">${E.line}% of eligible practice</output><input type="range" id="v2line" min="40" max="80" step="5" value="${E.line}"></label>`;
  return `${A.u===null?toHead(pick):`<div class="controls eng-crumbs">${pick}</div>`}${mcard(`<div class="eng-analysis"><div class="eng-panel-head"><div id="v2heading"></div><div id="v2display" class="eng-panel-display"></div></div><div class="eng-panel-toolbar"><div id="v2filters" class="eng-panel-filters"></div><div class="eng-practice-setting">${line}</div></div><div id="v2top"></div></div>`)}`}

/* The comparison uses the same fields for everyone. A score and the resulting mastery level remain separate: limited coverage can cap the level,
   but must never move a student's score down the scale. Counts keep the population behind each percentage visible. */
const ENGSTATUS={on:'On track',go:'Nearly there',stuck:'Needs support',early:'More checks needed',coast:'High performance, fewer attempts',off:'Below practice threshold',labs:'Meets practice threshold',x:'No eligible practice',na:'Not assessed'};
const ENGSTYLE={on:['good','check'],labs:['good','check'],go:['neutral','skill'],stuck:['bad','skill'],off:['bad','assignment'],coast:['watch','assignment'],early:['neutral','skill'],x:['neutral',null],na:['neutral',null]};
const engIcon=key=>key==='check'?IC.check:key?`<svg class="eng-icon" data-alps-icon="${key}" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">${iconBody(key)}</svg>`:'<span class="eng-icon" aria-hidden="true">–</span>';
const engStatus=c=>{const [tone,icon]=ENGSTYLE[c.g]||ENGSTYLE.na;return `<span class="pill eng-status ${tone}">${engIcon(icon)}<span>${ENGSTATUS[c.g]||'Not assessed'}</span></span>`};
const eligibleSkills2=(n,lab)=>lab?[]:n.t==='u'?KEYC[n.id]:n.t==='j'?jSk(0,n.id).filter(k=>KTA[k]&&chk5(k)):KTA[n.id]&&chk5(n.id)?[n.id]:[];
function evidence2(i,n,c){const its=nodeItems(n),ks=eligibleSkills2(n,c.lab);
  return {its,ks,tried:its.filter(ix=>AT[i].has(ix)).length,checked:c.lab?0:c.st?c.st.e:0,total:ks.length,score:c.lab||!c.st||!c.st.e?null:Math.round(c.st.f*100)}}
const masteryReading2=(c,score,fullScale=false)=>c.lab?'Not assessed':score===null?'More checks needed':`<span class="eng-mastery"><span class="eng-level">${batt(c.mc)}<span>${SL[c.mc]}</span></span><span class="eng-mastery-score"><span aria-hidden="true">·</span> <b>${score}</b>${fullScale?' <span>/ 100</span>':''}</span></span>`;
function evidenceTip2(i,c,n){const a=evidence2(i,n,c);return `<b>${NM[i]} · ${nodeName(n,0)}</b><br>${c.lab?'Not assessed · labs are practice':a.score===null?'More checks needed':`Score ${a.score} of 100 · ${SL[c.mc]}${c.st.cap?' (coverage cap)':''}`}<br>${c.lab?'':`${a.checked} of ${a.total} skills checked<br>`}${a.tried} of ${a.its.length} eligible ${c.lab?'labs':'questions'} tried (${pc(a.tried,a.its.length)}%)<br>${ENGSTATUS[c.g]||'Not assessed'}`}
function studentEvidence2(i,n,c){const a=evidence2(i,n,c),nm=NM[i],unseen=a.ks.filter(k=>!c.st||!a.checked||EV[i][k]<2),needs=(c.st?c.st.close:[]).slice().sort((a,b)=>CUR[i][a]-CUR[i][b]),mastered=a.checked-needs.length,met=a.its.length&&a.tried/a.its.length>=S.v2.line/100;
  const complete=!c.lab&&a.total>0&&a.checked===a.total,practiceTone=!a.its.length?'neutral':met?'good':c.g==='coast'?'watch':'bad';
  const card=(key,label,value,note='',state='neutral',symbol='skill')=>`<div class="eng-stat" data-metric="${key}" data-state="${state}"${key==='mastery'&&a.score!==null?` style="--il-stat-accent:${MRAMP[c.mc]}"`:''}><dt>${engIcon(symbol)}<span>${label}</span></dt><dd class="eng-stat-value">${value}</dd>${note?`<dd class="eng-stat-note">${note}</dd>`:''}</div>`;
  const empty=t=>`<span class="eng-stat-text">${t}</span>`;
  const mastery=c.lab?empty('Not assessed'):a.score===null?empty('More checks needed'):`<span class="eng-stat-number"><b>${a.score}</b> <span>/ 100</span></span><span class="eng-stat-band">${batt(c.mc)}${SL[c.mc]}</span>`;
  const metrics=card('mastery','Mastery',mastery,c.st&&c.st.cap?'Coverage limits the level':a.score!==null?'Average across checked skills':'')
    +card('coverage','Skills checked',c.lab?empty('Not assessed'):`<span class="eng-stat-number"><b>${a.checked}</b> <span>/ ${a.total}</span></span>`,c.lab?'':a.checked?`${mastered} mastered · ${needs.length} still developing`:a.total?'At least two checks per skill':'No eligible skill checks',complete?'good':'neutral','check')
    +card('practice',c.lab?'Labs tried':'Questions tried',`<span class="eng-stat-number"><b>${a.tried}</b> <span>/ ${a.its.length}</span></span>${a.its.length?`<span class="pill eng-stat-percent ${practiceTone}">${pc(a.tried,a.its.length)}%</span>`:''}`,a.its.length?`${met?'Meets':'Below'} ${S.v2.line}% threshold`:'No eligible practice yet',practiceTone,'assignment');
  const skills=(ks,unknown)=>`<div class="eng-skill-cards">${ks.map(k=>`<button class="eng-skill-card" type="button" data-act="tblopen" data-k="${k}" data-f="all" data-unknown="${unknown}" style="--il-skill-level:${unknown?'var(--il-ua-line)':MRAMP[LVC[lvOf(CUR[i][k])]]}"><span class="eng-skill-name"><span class="eng-skill-icon" aria-hidden="true">${nIc(SKIC)}</span><span>${ASK[k]}</span></span><span class="eng-skill-open" aria-hidden="true">→</span><span class="eng-skill-reading">${unknown?`<span>${EV[i][k]} of 2 checks needed</span>`:`<span class="eng-skill-level">${batt(LVC[lvOf(CUR[i][k])])}<span>${LV[lvOf(CUR[i][k])]}</span></span><span class="eng-skill-score"><b>${Math.round(CUR[i][k]*100)}</b> <span>/ 100</span></span>`}</span><span class="sr">Open students and questions</span></button>`).join('')}</div>`;
  const group=(title,ks,unknown)=>`<details class="eng-skill-group" open><summary><span>${title}</span> <span class="eng-section-count">${ks.length}</span></summary>${skills(ks,unknown)}</details>`;
  const initials=nm.split(/\s+/).slice(0,2).map(part=>part[0]).join('');
  return `<section id="eng-evidence-panel" class="dlg eng-evidence" role="dialog" aria-modal="true" aria-labelledby="eng-evidence-title" tabindex="-1"><div class="eng-evidence-head"><div class="eng-evidence-heading"><span class="eng-student-avatar" aria-hidden="true">${initials}</span><div><h2 id="eng-evidence-title">${nm}</h2><p class="eng-evidence-context">${n.t==='u'?'Unit':n.t==='j'?'Lesson':'Skill'} · ${nodeName(n,0)}</p></div></div><div class="student-actions">${engStatus(c)}<button class="btn small" type="button" data-act="prof" data-i="${i}" aria-label="Open ${nm}’s profile">Open profile</button></div><button class="x eng-evidence-close" type="button" data-act="v2close" aria-label="Close evidence" title="Close evidence">${IC.x}</button></div><div class="eng-evidence-body">${S.v2.overlap?`<button class="lnk eng-overlap-back" type="button" data-act="v2overlapback">← All ${S.v2.overlap.length} overlapping students</button>`:''}<dl class="eng-evidence-metrics">${metrics}</dl>${c.lab?'<p class="evidence-note">Labs record participation; scores and skill levels are not assessed.</p>':''}${needs.length?group('Skills still developing',needs,false):''}${unseen.length?group('Skills needing more checks',unseen,true):''}</div></section>`}

function studentTable2(ids,tb,n,group=false){const E=S.v2,filtered=ids.filter(i=>!E.hl||cellN(i,tb,n).g===E.hl),rank=E.sort==='off'?{off:0,coast:1,stuck:2,early:3,go:4,on:5,labs:5}:{stuck:0,off:1,go:2,early:3,coast:4,on:5,labs:5};
  filtered.sort((a,b)=>E.sort==='start'?NM[a].localeCompare(NM[b]):(rank[cellN(a,tb,n).g]??9)-(rank[cellN(b,tb,n).g]??9)||NM[a].localeCompare(NM[b]));
  const items=nodeItems(n),isLab=items.length>0&&items.every(ix=>IT[ix].lab),totalSkills=eligibleSkills2(n,isLab).length,scoreScale='score out of 100',skillScale=isLab?'Not assessed':totalSkills?`out of ${totalSkills}`:'No eligible skills',practiceScale=items.length?`out of ${items.length}`:'No eligible practice';
  const limit=group?Infinity:window.innerWidth<700?6:12,visible=E.all?filtered:filtered.slice(0,limit),rows=visible.map(i=>{const c=cellN(i,tb,n),a=evidence2(i,n,c),selected=E.detail===i;
    const mastery=masteryReading2(c,a.score)+(a.score!==null&&c.st.cap?'<span class="evidence-note eng-coverage-limit"><i class="sw hollow" aria-hidden="true"></i>Limited by coverage</span>':'');
    const complete=a.total>0&&a.checked===a.total,coverage=c.lab?'Not assessed':`<span class="eng-count${complete?' complete':''}" title="${a.checked} of ${a.total} eligible skills have at least two checks">${engIcon(complete?'check':'skill')}<span>${a.checked}</span></span>${!a.total?'<span class="evidence-note">No eligible skill checks</span>':!complete?`<span class="evidence-note">${a.total-a.checked} ${a.total-a.checked===1?'needs':'need'} more checks</span>`:''}`;
    const met=a.its.length&&a.tried/a.its.length>=E.line/100,practiceTone=!a.its.length?'neutral':met?'good':c.g==='coast'?'watch':'bad';
    const practice=`<span class="eng-count eng-practice ${practiceTone}" title="${a.its.length?`${a.tried} of ${a.its.length} tried (${pc(a.tried,a.its.length)}%); ${met?'meets':'below'} the ${E.line}% practice threshold`:'No eligible practice'}">${engIcon(!a.its.length?'assignment':met?'check':'assignment')}<b>${a.tried}</b></span><span class="evidence-note eng-practice-rate ${practiceTone}">${a.its.length?pc(a.tried,a.its.length)+'%':'No eligible practice'}</span>`;
    return `<tr${selected?' class="selected"':''} data-student="${i}"><th scope="row" data-label="Student"><div class="student-actions">${nmBtn(NM[i])}<button class="btn small pin" type="button" data-act="pin" data-i="${i}" aria-pressed="${S.stu===i}" aria-label="${S.stu===i?'Stop following':'Follow'} ${NM[i]}">${S.stu===i?'Following':'Follow'}</button></div></th><td data-label="Mastery" data-scale="${scoreScale}">${mastery}</td><td data-label="Checked skills"${isLab?'':` data-scale="${skillScale}"`}>${coverage}</td><td data-label="${isLab?'Labs':'Questions'} tried" data-scale="${practiceScale}">${practice}</td><td data-label="Status and evidence">${engStatus(c)}<button class="lnk eng-evidence-btn" type="button" data-act="v2detail" data-i="${i}" aria-haspopup="dialog" aria-controls="eng-evidence-panel">View evidence</button></td></tr>`}).join('');
  return `<p class="measure-note"><b>Showing ${visible.length} of ${filtered.length} students${E.hl?' · '+ENGSTATUS[E.hl]:''}</b>${filtered.length>limit?` <label class="chk" for="v2all"><input type="checkbox" id="v2all"${E.all?' checked':''}> Show all ${filtered.length}</label>`:''}${E.hl?' <button class="lnk" type="button" data-act="v2hl" data-g="'+E.hl+'">Show everyone</button>':''}</p><div class="table-scroll"><table class="metric-table responsive-table eng-student-table"><caption class="sr">${nodeName(n,tb)}: comparable score, level, evidence coverage and practice for each student</caption><thead><tr><th scope="col">Student</th><th scope="col">Mastery<br>${scoreScale}</th><th scope="col">Checked skills<br>${skillScale}</th><th scope="col">${isLab?'Labs':'Questions'} tried<br>${practiceScale}</th><th scope="col">Status and evidence</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No students match this filter.</td></tr>'}</tbody></table></div><p class="hint">View evidence for skills and questions.</p>`}
/* the points in focus: the students of the card picked beside the chart (S.v2.hl), or else the student followed. dim2 gives the class that
   dims every other point; with nothing picked, or no point here for what is picked, nothing is dimmed */
const dim2=P=>{const g=S.v2.hl,F=new Set(P.filter(p=>g?p.c.g===g:p.i===S.stu).map(p=>p.i));return i=>F.size&&!F.has(i)?' dim':''};
// Group intersecting marks at the rendered scale without moving any student's coordinates.
const pointTone2=p=>({on:'good',go:'neutral',stuck:'bad',off:'bad',coast:'watch'})[p.c?.g]||'neutral';
const overlapRadius2=(count,scale=1)=>12*scale*Math.sqrt(count/2);
function overlapGroups2(points,distance=14){const seen=new Set(),groups=[];
  points.forEach((p,i)=>{if(seen.has(i))return;const members=[p],queue=[i];seen.add(i);
    for(let q=0;q<queue.length;q++){const a=points[queue[q]];points.forEach((b,j)=>{if(!seen.has(j)&&pointTone2(a)===pointTone2(b)&&(a.X-b.X)**2+(a.Y-b.Y)**2<=distance**2){seen.add(j);queue.push(j);members.push(b)}})}
    if(members.length>1)groups.push(members.sort((a,b)=>a.i-b.i))});return groups}
function overlapMarkers2(points,labels,L,R,T,B,scale){const placed=[],intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const dots=points.map(p=>({x:p.X-7*scale,y:p.Y-7*scale,w:14*scale,h:14*scale}));
  return overlapGroups2(points,14*scale).map((members,index)=>({members,index})).sort((a,b)=>b.members.length-a.members.length).map(({members,index})=>{const r=overlapRadius2(members.length,scale),xs=members.map(p=>p.X),ys=members.map(p=>p.Y),left=Math.min(...xs)-7*scale,right=Math.max(...xs)+7*scale,top=Math.min(...ys)-7*scale,bottom=Math.max(...ys)+7*scale,cy=(top+bottom)/2,cx=(left+right)/2,candidates=[];
    const xcut=L+(R-L)*S.v2.line/100,y65=B-(B-T)*.65,y55=B-(B-T)*.55,side=members.every(p=>p.c.e>=S.v2.line/100)?[xcut,R]:members.every(p=>p.c.e<S.v2.line/100)?[L,xcut]:[L,R],band=members.every(p=>p.c.m>=.65)?[T,y65]:members.every(p=>p.c.m>=.55&&p.c.m<.65)?[y65,y55]:members.every(p=>p.c.m<.55)?[y55,B]:[T,B];
    const limits=(lo,hi,outerLo,outerHi)=>hi-lo>=2*r+4*scale?[lo+r+2*scale,hi-r-2*scale]:Array(2).fill(clamp((lo+hi)/2,outerLo+r+2*scale,outerHi-r-2*scale)),[minX,maxX]=limits(...side,L,R),[minY,maxY]=limits(...band,T,B);
    [1,3,5,7].forEach(step=>[0,-2,2].forEach(d=>{candidates.push([left-step*r-6*scale,cy+d*r],[right+step*r+6*scale,cy+d*r])}));
    [-2,0,2].forEach(d=>candidates.push([cx+d*r,top-r-6*scale],[cx+d*r,bottom+r+6*scale]));
    let best=null;candidates.forEach(([x,y])=>{x=clamp(x,minX,maxX);y=clamp(y,minY,maxY);const box={x:x-r-2*scale,y:y-r-2*scale,w:2*r+4*scale,h:2*r+4*scale},score=10000*placed.filter(b=>intersects(b,box)).length+1000*dots.filter(b=>intersects(b,box)).length+100*labels.filter(b=>intersects(b,box)).length+Math.hypot(x-cx,y-cy)/(100*scale);
      if(!best||score<best.score)best={x,y,r,box,score,members,index,left,right,top,bottom}});placed.push(best.box);return best}).sort((a,b)=>a.index-b.index)}
function overlapEvidence2(ids,n){return `<section id="eng-evidence-panel" class="dlg eng-evidence" role="dialog" aria-modal="true" aria-labelledby="eng-evidence-title" tabindex="-1"><div class="eng-evidence-head"><h2 id="eng-evidence-title">${ids.length} overlapping students · ${nodeName(n,0)}</h2><button class="x eng-evidence-close" type="button" data-act="v2close" aria-label="Close group" title="Close group">${IC.x}</button></div><div class="eng-evidence-body" data-overlap="true"><p class="eng-overlap-note">These marks overlap at this chart scale. Exact values are shown below. Select a student’s evidence to inspect their skills.</p><div class="eng-overlap-list review-view">${studentTable2(ids,0,n,true)}</div></div></section>`}
/* everyone in the picked column, placed by engagement (across) and performance (up) */
function v2scatter(tb,n,ids,W){const scale=1;W=Math.max(640,W);const L=66,R=24,T0=32,B=T0+Math.round(clamp((W-L-R)*.46,240,360)),H=B+48,x=e=>L+clamp(e,0,1)*(W-L-R),y=m=>B-clamp(m,0,1)*(B-T0),ln=S.v2.line/100,sel=S.v2.detail??S.stu,P=[],early=[];
  ids.forEach(i=>{const c=cellN(i,tb,n);if(c.g==='x'||c.g==='na')return;if(c.mc==='U'||c.mc==='Q')early.push(NM[i]);else P.push({i,c,X:x(c.e),Y:y(c.m)})});
  const dm=dim2(P),COL={on:'var(--il-good)',go:'var(--il-ink-3)',stuck:'var(--il-bad)',off:'var(--il-bad)',coast:'var(--il-watch-ink)'};
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="${nodeName(n,tb)}: actual score from 0 to 100 against percentage of eligible questions tried">`;
  s+=`<rect x="${f1(x(ln))}" y="${f1(y(.55))}" width="${f1(x(1)-x(ln))}" height="${f1(y(0)-y(.55))}" style="fill:var(--il-bad);opacity:.08"/><rect x="${f1(x(0))}" y="${f1(y(.65))}" width="${f1(x(ln)-x(0))}" height="${f1(y(0)-y(.65))}" style="fill:var(--il-bad);opacity:.08"/><rect x="${f1(x(0))}" y="${f1(y(1))}" width="${f1(x(ln)-x(0))}" height="${f1(y(.65)-y(1))}" style="fill:var(--il-watch);opacity:.1"/>`;
  // Score bands use ALPS's level palette; coverage-limited levels retain their actual score position.
  [0,.4,.55,.65,.8].forEach((v,b)=>{const hi=[.4,.55,.65,.8,1][b];s+=`<rect x="${L-5}" y="${f1(y(hi))}" width="5" height="${f1(y(v)-y(hi))}" style="fill:${LVCOL[b]}"/>`});
  [0,.25,.5,.75,1].forEach(v=>{s+=`<line x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${T0}" y2="${B}" class="grid"/>`+T(x(v),B+18,Math.round(v*100)+'%',{a:'middle',c:'t2'})});
  [0,.4,.55,.65,.8,1].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="grid"/>`+T(L-12,y(v)+4,Math.round(v*100),{a:'end',c:'t2'})});
  s+=T(L,T0-15,'Score · 0–100',{c:'t1',w:700})+`<line x1="${f1(x(ln))}" x2="${f1(x(ln))}" y1="${T0}" y2="${B}" class="axis"/><line x1="${L}" x2="${W-R}" y1="${f1(y(.65))}" y2="${f1(y(.65))}" class="axis"/>`+T(x(ln),T0-15,`Practice threshold ${S.v2.line}%`,{a:ln>.65?'end':'start',c:'t2'});
  // Place region names in the least crowded corner, then fit student names around the marks.
  const under=b=>P.filter(p=>p.X+5>b.x&&p.X-5<b.x+b.w&&p.Y+5>b.y&&p.Y-5<b.y+b.h).length;
  const RL=[['On track','tgood',64,[[x(ln)+8,y(1)+16,'start'],[W-R-8,y(1)+16,'end']]],['Nearly there','t2',80,[[x(ln)+8,y(.65)+15,'start'],[W-R-8,y(.65)+15,'end'],[x(ln)+8,y(.55)-5,'start'],[W-R-8,y(.55)-5,'end']]],
    ['Struggling','tbad',72,[[W-R-8,B-8,'end'],[x(ln)+8,B-8,'start']]],['Coasting','twatch',70,[[L+8,y(1)+16,'start'],[x(ln)-8,y(1)+16,'end']]],['Low engagement','tbad',104,[[L+8,B-8,'start'],[x(ln)-8,B-8,'end']]]]
    .map(([t,cl,w,cands])=>{let best=null;cands.forEach(([tx,ty,a])=>{const b={x:a==='end'?tx-w:tx,y:ty-11,w,h:14},k=under(b);if(!best||k<best.k)best={t,cl,tx,ty,a,b,k}});return best});
  s+=RL.map(o=>T(o.tx,o.ty,o.t,{a:o.a,c:o.cl,w:700})).join('');
  const overlaps=overlapMarkers2(P,RL.map(o=>o.b),L,W-R,T0,B,scale);
  const boxes=[],hit=b=>boxes.some(o=>b.x<o.x+o.w&&b.x+b.w>o.x&&b.y<o.y+o.h&&b.y+b.h>o.y);
  P.forEach(p=>{const r=p.i===sel?10:5;boxes.push({x:p.X-r,y:p.Y-r,w:2*r,h:2*r})});boxes.push({x:x(ln)-2,y:T0,w:4,h:B-T0},{x:L,y:y(.65)-2,w:W-L-R,h:4});RL.forEach(o=>boxes.push(o.b));
  overlaps.forEach(o=>boxes.push(o.box));
  const lab=[];P.filter(p=>['stuck','off','coast'].includes(p.c.g)||p.i===sel).sort((a,b)=>!!dm(a.i)-!!dm(b.i)||(b.i===sel)-(a.i===sel)||a.Y-b.Y).forEach(p=>{const nm=NM[p.i],w=nm.length*6.6+4,o=p.i===sel?4:0;
    const cand=[[p.X+8+o,p.Y-6,'start'],[p.X-8-o-w,p.Y-6,'end'],[p.X-w/2,p.Y-20-o,'middle'],[p.X-w/2,p.Y+8+o,'middle'],[p.X+7+o,p.Y-17-o,'start'],[p.X+7+o,p.Y+5+o,'start'],[p.X-7-o-w,p.Y-17-o,'end'],[p.X-7-o-w,p.Y+5+o,'end'],[p.X-w/2,p.Y-31-o,'middle'],[p.X-w/2,p.Y+19+o,'middle']];
    for(const[bx,by,a]of cand){const b={x:bx,y:by,w,h:12};if(bx<L||bx+w>W-R||by<T0||by+12>B)continue;if(!hit(b)){boxes.push(b);lab.push({p,b,a});break}}});
  P.slice().sort((a,b)=>!!dm(b.i)-!!dm(a.i)).forEach(p=>{const on=p.i===sel,tip=evidenceTip2(p.i,p.c,n),a=evidence2(p.i,n,p.c);s+=`<g class="hit${dm(p.i)}" data-act="v2detail" data-i="${p.i}" tabindex="0" role="button" aria-label="${NM[p.i]}: score ${a.score} of 100; ${a.tried} of ${a.its.length} questions tried; view evidence" aria-pressed="${on}"${tp(tip)}><circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="11" fill="transparent"/><circle class="point-focus-ring" cx="${f1(p.X)}" cy="${f1(p.Y)}" r="8.5" aria-hidden="true"/>${on?`<circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="8.5" style="fill:none;stroke:var(--il-accent);stroke-width:2"/>`:''}<circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="6.5" fill="none" stroke="var(--il-surface)" stroke-width="2" aria-hidden="true"/><circle cx="${f1(p.X)}" cy="${f1(p.Y)}" r="5" class="score-dot${p.c.st&&p.c.st.cap?' limited-evidence':''}" style="fill:${p.c.st&&p.c.st.cap?'var(--il-surface)':COL[p.c.g]};stroke:${COL[p.c.g]};stroke-width:2"/></g>`});
  overlaps.forEach(o=>{const ids=o.members.map(p=>p.i),count=ids.length,tone=pointTone2(o.members[0]);s+=`<g class="overlap-marker" data-tone="${tone}" style="--il-overlap-color:${COL[o.members[0].c.g]};--il-overlap-label:${tone==='good'?'#000':'#fff'}" data-act="v2overlap" data-students="${ids.join(',')}" tabindex="0" role="button" aria-haspopup="dialog" aria-controls="eng-evidence-panel" aria-label="${count} overlapping students; choose a student to view exact scores and practice"${tp(`<b>${count} overlapping students</b><br>Select to choose a student`)}><circle cx="${f1(o.x)}" cy="${f1(o.y)}" r="${f1(o.r+2*scale)}" fill="transparent"/><circle class="overlap-badge" cx="${f1(o.x)}" cy="${f1(o.y)}" r="${f1(o.r)}"/>${T(o.x,o.y+4*scale,count,{a:'middle',c:'overlap-label',s:12*scale})}</g>`});
  lab.forEach(o=>{const tx=o.a==='start'?o.b.x:o.a==='end'?o.b.x+o.b.w:o.b.x+o.b.w/2;s+=T(tx,o.b.y+10,NM[o.p.i],{a:o.a,c:(o.p.i===sel?'tacc':'t1')+dm(o.p.i),w:o.p.i===sel?700:null})});
  const picked=P.find(p=>p.i===sel);
  s+=T((L+W-R)/2,B+40,W<500?'Practice tried · %':'Questions tried · % of eligible practice',{a:'middle',c:'t1',w:700});
  const peers=picked?P.filter(p=>Math.abs(p.X-picked.X)<1&&Math.abs(p.Y-picked.Y)<1):[];
  return fig(s+'</svg>')+(peers.length>1?`<div class="point-peers"><span class="hint">${peers.length} students at this position</span>${peers.map(p=>`<button type="button" class="btn small" data-act="v2detail" data-i="${p.i}" aria-pressed="${p.i===sel}">${NM[p.i]}</button>`).join('')}</div>`:'')+`<div class="legend">${overlaps.length?'<span><i class="overlap-key" aria-hidden="true">2</i>Circle size = student count · select a group</span>':''}<span><i class="sw" style="background:var(--il-good)"></i>On track</span><span><i class="sw" style="background:var(--il-bad)"></i>Needs support or more practice</span><span><i class="sw" style="background:var(--il-watch-ink)"></i>High score, fewer attempts</span><span><i class="sw hollow"></i>Level limited by coverage</span></div>${early.length?`<div class="unscored-students"><span class="hint">More checks needed · ${early.length}</span>${early.map(nm=>`<button class="lnk" type="button" data-act="v2detail" data-i="${ID[nm]}">${nm}</button>`).join('')}</div>`:''}`}
/* a unit or lesson of labs has no level, so its chart has one axis: everyone placed by the share of its labs they tried, stacked where shares coincide */
function v2strip(tb,n,ids,W){const L=58,R=18,T0=34,ln=S.v2.line/100,x=e=>L+clamp(e,0,1)*(W-L-R),sel=S.stu,P=[],cols={};
  ids.forEach(i=>{const c=cellN(i,tb,n);if(c.g==='x'||c.g==='na')return;const k=Math.round(c.e*40);P.push({i,c,e:c.e,row:cols[k]||0});cols[k]=(cols[k]||0)+1});
  const rh=13,B=T0+Math.max(1,...P.map(p=>p.row+1))*rh+8,H=B+40,dm=dim2(P);
  let s=`<svg class="viz" viewBox="0 0 ${W} ${H}" role="group" aria-label="${nodeName(n,tb)}: each student placed by the share of its labs they tried">`;
  s+=`<rect x="${f1(x(0))}" y="${T0-10}" width="${f1(x(ln)-x(0))}" height="${B-T0+10}" style="fill:var(--il-bad);opacity:.08"/>`;
  [0,.25,.5,.75,1].forEach(v=>{s+=`<line x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${T0-10}" y2="${B}" class="grid"/>`+T(x(v),B+16,Math.round(v*100)+'%',{a:'middle',c:'t3'})});
  s+=`<line x1="${f1(x(ln))}" x2="${f1(x(ln))}" y1="${T0-10}" y2="${B}" class="axis"/>`+T(x(ln),T0-16,`Practice threshold ${S.v2.line}%`,{a:'middle',c:'t2',w:700});
  s+=T((L+W-R)/2,B+34,'Share of the labs tried',{a:'middle'});
  P.forEach(p=>{const on=p.i===(S.v2.detail??sel),X=x(p.e),Y=B-7-p.row*rh;s+=`<g class="hit${dm(p.i)}" data-act="v2detail" data-i="${p.i}" role="button" tabindex="0" aria-label="${NM[p.i]}: ${Math.round(p.e*100)}% of eligible labs tried; view evidence" aria-pressed="${on}"${tp(evidenceTip2(p.i,p.c,n))}><circle cx="${f1(X)}" cy="${f1(Y)}" r="10" fill="transparent"/><circle class="point-focus-ring" cx="${f1(X)}" cy="${f1(Y)}" r="8.5" aria-hidden="true"/>${on?`<circle cx="${f1(X)}" cy="${f1(Y)}" r="8.5" style="fill:none;stroke:var(--il-accent);stroke-width:2"/>`:''}<circle cx="${f1(X)}" cy="${f1(Y)}" r="5" style="fill:${p.c.doing?'var(--il-ink-3)':'var(--il-bad)'};stroke:var(--il-surface);stroke-width:2"/></g>`});
  return fig(s+'</svg>')}
function v2draw(){const tp0=$('#v2top');if(!tp0)return;const E=S.v2,tb=0,ids=tbWho(tb);
  const all=ids.map(i=>({i,n:NM[i],c:cellN(i,tb,E.sel)})),isLab=all.some(o=>o.c.lab),mode=E.mode||'relationship';
  if(E.hl&&!all.some(o=>o.c.g===E.hl))E.hl=null;
  const filters=[['all','Everyone'],...Object.keys(ENGSTATUS).filter(g=>all.some(o=>o.c.g===g)).map(g=>[g,ENGSTATUS[g]])];
  const actionGroups=(isLab?[['off','Assign the labs']]:[['stuck','Form a support group'],['off','Assign practice'],['coast','Give a stretch set']]).filter(([g])=>all.some(o=>o.c.g===g));
  const actions=actionGroups.map(([g,label])=>{const key=`v2:${tb}:${E.sel.t}${E.sel.id}:${g}`,count=all.filter(o=>o.c.g===g).length;return isLogged(key)?`<span class="pill">${label} · ${count} · logged</span>`:`<button class="btn small" type="button" data-act="v2log" data-g="${g}">${label} · ${count}</button>`}).join('');
  const controls=`${pickCtl('v2filter',E.hl||'all',filters,'Students')}${mode==='table'?pickCtl('v2sort',E.sort,[['start','By name'],['stuck','Needs support first'],['off','Below practice threshold first']],'Sort'):''}`;
  const heading=$('#v2heading'),display=$('#v2display'),filterHost=$('#v2filters');
  if(heading)heading.innerHTML=`<h3>${isLab?'Each student’s lab practice':'Each student’s score and practice'}</h3><p>${E.sel.t==='u'?'Unit':E.sel.t==='j'?'Lesson':'Skill'} · ${nodeName(E.sel,tb)}</p>`;
  if(display)display.innerHTML=seg('v2mode',mode,[['relationship',isLab?'Practice distribution':'Score and practice'],['table','Exact figures']],'Engagement display');
  if(filterHost)filterHost.innerHTML=controls;
  const plotted=E.hl?ids.filter(i=>cellN(i,tb,E.sel).g===E.hl):ids;
  const chartW=Math.max(220,Math.floor(($('#view')?.clientWidth||800)-(window.innerWidth<640?32:48)));
  const relation=mode==='relationship'?`<div class="eng-relationship">${isLab?v2strip(tb,E.sel,plotted,chartW):v2scatter(tb,E.sel,plotted,chartW)}</div>`:studentTable2(ids,tb,E.sel);
  tp0.innerHTML=`<div class="eng-chart-content">${mode==='relationship'?`<p class="eng-chart-hint"><b>${plotted.length} students</b>${E.hl?' · '+ENGSTATUS[E.hl]:''}<span>Select a student or group for evidence</span></p>`:''}${relation}</div>${actions?`<div class="controls eng-group-actions" aria-label="Actions for the selected unit"><span class="eng-action-label">Class actions</span>${actions}</div>`:''}`;
  setAns(2)}

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
const QUIET=()=>liveBlocks().length<NBC;   // a stretch the charts hatch: the key names it only when one is drawn
/* Expanded activity history uses one absolute count scale across students. */
const SPG=30,NICE=[10,20,30,40,50,60,80,100,120,150,200,300,400,500,600,800,1000],niceUp=v=>NICE.find(n=>n>=v)||Math.ceil(v/200)*200;
function spark(i,w,h,full){const a=WB[i],nm=NORM[i],hi0=Math.max(1,...ALL.map(student=>NORM[student]?NORM[student]*2:0),...WB.flatMap(history=>history.slice(0,NBC))),hi=full?niceUp(hi0):hi0,g=full?SPG:0,pd=full?8:3,px=j=>g+3+j*(w-2*g-6)/Math.max(1,NBC-1),yb=h-pd,py=v=>yb-clamp(v,0,hi)/hi*(yb-pd),d=DR[i],dj=d>=0?blockOf(d):-1;
  const live=liveBlocks(),P=live.map(j=>f1(px(j))+','+f1(py(a[j]))),di=live.indexOf(dj);
  let s=`<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${NM[i]}: questions tried in each 5 days, ${a[RB]} in the last 5 days; their normal ${nm===null?'not known yet':nm}">`;
  const hs=(w-2*g-6)/Math.max(1,NBC-1)/2;s+=quietRects(px,2,h-4,full&&live.length?px(live[0])-hs:g+1,w-g-1)+(nm?`<rect x="${g+3}" y="${f1(py(nm*1.5))}" width="${w-2*g-6}" height="${f1(py(nm/2)-py(nm*1.5))}" rx="2" style="fill:var(--il-neutral);opacity:.32"/>`:'');
  if(full)[hi,hi/2,0].forEach(v=>{s+=`<line x1="${g}" x2="${w-g}" y1="${f1(py(v))}" y2="${f1(py(v))}" style="stroke:var(--il-rule)${v?';opacity:.6':''}"/><text x="${g-6}" y="${f1(py(v)+4)}" text-anchor="end">${v}</text>`});
  if(d>=0&&di>=0){s+=`<polyline points="${P.slice(0,di+1).join(' ')}" fill="none" style="stroke:var(--il-ink-3);stroke-width:1.6;stroke-linejoin:round"/><polyline points="${P.slice(di).join(' ')}" fill="none" style="stroke:var(--il-bad);stroke-width:2.4;stroke-linejoin:round"/><circle cx="${f1(px(dj))}" cy="${f1(py(a[dj]))}" r="${full?4:2.6}" style="fill:var(--il-bad);stroke:var(--il-surface);stroke-width:1.5"/>`}
  else{s+=`<polyline points="${P.join(' ')}" fill="none" style="stroke:var(--il-ink-3);stroke-width:1.6;stroke-linejoin:round"/>`;if(WATCH[i])s+=`<circle cx="${f1(px(RB))}" cy="${f1(py(a[RB]))}" r="${full?4:2.6}" style="fill:var(--il-watch);stroke:var(--il-surface);stroke-width:1.5"/>`}
  if(full&&live.length){const e=live[live.length-1];s+=`<text x="${f1(px(e)+8)}" y="${f1(py(a[e])+4)}" style="fill:var(--il-ink);font-weight:700">${a[e]}</text>`;
    for(let j=0;j<NBC;j++){const x0=j?(px(j-1)+px(j))/2:g,x1=j<NBC-1?(px(j)+px(j+1))/2:w-g;
      s+=`<rect x="${f1(x0)}" y="0" width="${f1(x1-x0)}" height="${h}" fill="transparent"${tp(`<b>${NM[i]} · ${dayDate(BS(j))} to ${dayDate(BE(j))}</b><br>${ONB[j]?`${a[j]} ${pl(a[j],'question')} tried${nm===null?'':`<br><span>Their normal: ${nm} in 5 days</span>`}`:'Nobody in the class worked'}`)}/>`}}
  return s+'</svg>'}
/* A common row and reference scale for every student; the alert rules above stay unchanged. */
const activePeriodLink=k=>DEMODAY!==TODAY?`<button class="btn small" type="button" data-act="activeperiod" data-v="${k}">View latest active period</button>`:'';
function activityReading(i){const usual=NORM[i],work=WB[i][RB];
  return {work,usual,ratio:usual>0?work/usual*100:null,
    status:!JUDGE?'Not judged':usual===null?'More history needed':DR[i]>=0?'Sustained drop':WATCH[i]?'Low in latest period':'No activity alert',
    tone:JUDGE?(DR[i]>=0?'bad':WATCH[i]?'watch':''):''}}
function activityTrack(a){if(a.ratio===null)return `<span class="evidence-note">${a.usual===0?'Usual count is zero':'More history needed'}</span>`;
  return `<b>${a.ratio<50&&paceNum(a.ratio)==='50'?'Under 50':paceNum(a.ratio)}% of usual${a.ratio>200?' →':''}</b><span class="activity-track ${a.tone}" aria-hidden="true"><span style="width:${Math.min(100,a.ratio/2)}%"></span><i class="activity-half"></i><i class="activity-usual"></i></span>${a.ratio>200?'<small>Above the 200% display range</small>':''}`}
function activityEvidence(i){const a=activityReading(i),g=SIG[NM[i]],W=Math.min(760,Math.max(180,Math.floor(($('#view')?.clientWidth||800)-96))),ticks=[...new Set([0,Math.round((NBC-1)/2),NBC-1])];
  const history=Array.from({length:NBK},(_,j)=>`<tr><th scope="row">${dayDateY(BS(j))} – ${dayDateY(BE(j))}</th><td>${WB[i][j]}</td><td>${ONB[j]?(NORM[i]>0?paceNum(WB[i][j]/NORM[i]*100)+'%':'No usual comparison'):'No class work · excluded'}</td></tr>`).join('');
  return `<section class="comparison-detail" id="activity-evidence" aria-label="${NM[i]}: activity evidence"><div class="dhead"><h3>${NM[i]} · activity evidence</h3>${chartStudentActions(i)}<button class="btn small" type="button" data-act="v3detail" data-i="${i}">Close</button></div><p><b>${a.work} questions</b> · usual ${a.usual===null?'not established':a.usual} per five days${DR[i]>=0?' · sustained drop since '+dayDateY(DR[i]):''}.</p><p class="hint">${g.miss} of the last ${g.of} days without recorded work · ${g.work} unfinished sets · accuracy change ${sgn(g.acc)} points. These are recorded signals, not attendance.</p><svg width="0" height="0" aria-hidden="true"><defs>${HATCH}</defs></svg><p class="scale-label">Questions tried in each 5 days · shared count scale</p>${spark(i,W,110,true)}<div class="history-dates">${ticks.map(j=>`<span>${dayDateY(j===NBC-1?BE(j):BS(j))}</span>`).join('')}</div><p class="hint">Shading: half to 1½ times their usual. Hatching: no class work.</p>${fold('activity-history-'+i,'All periods and question counts',`<div class="table-scroll"><table class="metric-table"><thead><tr><th>Five-day period</th><th>Questions tried</th><th>Compared with usual</th></tr></thead><tbody>${history}</tbody></table></div>`)}</section>`}
function v3(){const Z=S.v3,attention=ALL.filter(i=>DR[i]>=0||WATCH[i]),ids=(Z.all?ALL:attention).slice().sort((a,b)=>(DR[b]>=0)-(DR[a]>=0)||Number(WATCH[b])-Number(WATCH[a])||NM[a].localeCompare(NM[b]));
  const note=TOOFEW?'More class history is needed before judging individuals.':CLASSIDLE?'No recorded class work in this period; individual alerts are paused.':CLASSLOW?'The class is working less; individual alerts are paused.':'';
  const controls=`<label class="chk" for="v3all"><input type="checkbox" id="v3all"${Z.all?' checked':''}> Show everyone · ${N}</label>`;
  const from=Math.max(0,RB-7),dates=chartAxis([[0,dayDate(BS(from))],[.5,dayDate(BE(Math.round((from+RB)/2)))],[1,dayDate(TODAY)]],1);
  const rows=ids.map(i=>{const a=activityReading(i),selected=Z.detail===i;return `<div class="visual-row${selected?' selected':''}" data-student="${i}"><div class="visual-name">${nmBtn(NM[i])}</div><button class="plot-select" type="button" data-act="v3detail" data-i="${i}" aria-expanded="${selected}" aria-controls="activity-evidence" aria-label="${NM[i]}: ${a.status}; ${a.work} questions, usual ${a.usual===null?'not established':a.usual}; inspect history">${activityTrace(i,from,RB)}</button><div class="visual-reading"><b>${a.work} / ${a.usual===null?'?':a.usual}</b><small>questions / usual</small><span class="status-${a.tone||'neutral'}">${DR[i]>=0?'Since '+dayDate(DR[i]):a.status}</span></div></div>`}).join('');
  const method=fold('activity-method','How activity is measured','<p>Count newly tried questions on any unit in five-day blocks. Usual is the median of earlier blocks with class work, excluding the latest two; it needs three earlier blocks. A sustained drop means below half usual for two consecutive active blocks. Nobody is singled out while the class is idle, at least half are low, or the selected textbook has too little history. A missing usual or a zero usual has no percentage comparison.</p>');
  return mcard(chd(CT.drift,controls)+`<p class="scale-label">Work relative to own usual · 0–200% · 100% = usual</p><p class="hint">${RECENT}${MULTI?' · '+(PICK===null?'All textbooks':BOOKS[PICK].s):''}</p>${note?`<div class="empty-context"><p>${note}</p>${activePeriodLink(3)}</div>`:''}<div class="visual-list activity-chart" data-scroll="activity">${chartHead('Student',dates,'Latest 5 days')}${rows||'<p class="none">No individual activity alerts. Select “Show everyone” to compare the class.</p>'}</div><div class="legend"><span><i class="ln"></i>100% · own usual</span><span><i class="ln alert"></i>50% · alert threshold</span><span><i class="sw hatch"></i>No class work</span><span>↑ Above 200%; exact counts in evidence</span></div>${Z.detail!==null&&ids.includes(Z.detail)?activityEvidence(Z.detail):''}${method}`)}

/* ---------- view 4: current mastery and conditional forecast, on one skill-count scale ---------- */
function h4(){if(!paceUnits().length)return 'Lab practice does not provide skill forecasts.';
  const P=ALL.map(i=>paceOf(i)),goal=paceScope(S.v4.u).ks.length;
  if(!goal)return 'No goal skills are listed for this unit.';
  const on=P.filter(p=>p.proj!==null&&p.proj>=goal).length;
  return `${on} of ${N} estimated to master ${goal} goal skills by ${dayDateY(S.v4.day)}, if recent pace continues.`}
function v4(){const z=S.v4,us=paceUnits();if(!us.length)return '<p class="none">Lab practice has no skill standing to project.</p>';
  const scope=paceScope(z.u),goal=scope.ks.length,unit=pickCtl('v4unit',z.u,unitOpts(us),'Target unit');
  const by=`<label class="sel" for="v4date">Forecast to <input type="date" id="v4date" min="${isoOf(TODAY)}" value="${isoOf(z.day)}"></label>`,sort=pickCtl('v4sort',z.sort,[['status','By status'],['proj','By estimate'],['name','By name']],'Sort');
  const list=ks=>ks.length?`<ul>${ks.map(k=>`<li>${skNm(k)}${!chk5(k)?' · no working checks':''}</li>`).join('')}</ul>`:'<p>None separately.</p>';
  const skills=fold('v4skills',`Skills in this goal · ${goal}`,`<div class="pace-skills"><div><h3>Target unit · ${scope.target.length}</h3>${list(scope.target)}</div><div><h3>Earlier skills used here · ${scope.previous.length}</h3>${list(scope.previous)}</div></div>`);
  const old=ALL.some(i=>{const p=paceOf(i);return p.end!==null&&TODAY-p.end>PACE_WINDOW});
  return `${toHead(unit+by+sort)}<section class="mcard">${chd(CT.pace)}<p class="scale-label">Goal skills mastered · 0–${goal} skills · Goal: ${goal}</p><div class="legend"><span><i class="ln" style="background:var(--il-ink-2)"></i>Mastered now</span><span><svg width="24" height="10" aria-hidden="true"><line x1="1" y1="5" x2="23" y2="5" style="stroke:var(--il-ink-2);stroke-width:2.5;stroke-dasharray:4 3"/></svg>Estimated by ${dayDateY(z.day)}</span></div><p class="hint">${old?'Projections assume work resumes at each student’s latest pace.':'Estimates assume learning continues at each student’s recent pace.'}</p>${old?activePeriodLink(4):''}<div id="v4c"></div>${fold('pace-method','Forecast assumptions and reference',`<p>The last 30 days ending at each student’s latest check set their observed rate. Extend that rate from the selected As of date to the forecast date, capped at the goal. No gains are added across an unrecorded gap; a flat or falling rate adds no gains. At least two checked skills (one for a one-skill goal) and two check dates are needed unless the goal is already mastered. The even-pace reference spreads the goal evenly from the class’s first encounter to your date; it is not a recorded timetable.</p><label class="chk" for="v4reference"><input type="checkbox" id="v4reference"${z.reference?' checked':''}> Show even-pace reference</label>`)}${skills}</section>`}
function paceTrack(p){const x=v=>8+v/p.goal*224;
  return `<svg class="pace-track" viewBox="0 0 240 30" role="img" aria-label="${p.now} of ${p.goal} skills mastered; ${p.proj===null?'more checks needed':'estimated '+paceNum(p.proj)+' by '+dayDateY(S.v4.day)}"><line x1="8" x2="232" y1="15" y2="15" style="stroke:var(--il-surface-2);stroke-width:8"/>${p.now?`<rect x="8" y="11" width="${f1(x(p.now)-8)}" height="8" rx="2" style="fill:var(--il-ink-2)"/>`:''}${p.proj!==null?`${p.proj>p.now?`<line x1="${f1(x(p.now))}" x2="${f1(x(p.proj))}" y1="15" y2="15" style="stroke:var(--il-ink-2);stroke-width:3;stroke-dasharray:4 3"/>`:''}<circle cx="${f1(x(p.proj))}" cy="15" r="4" style="fill:var(--il-surface);stroke:var(--il-ink-2);stroke-width:2"/>`:''}${S.v4.reference?`<line x1="${f1(x(p.due))}" x2="${f1(x(p.due))}" y1="2" y2="28" style="stroke:var(--il-ink-3);stroke-width:1.5;stroke-dasharray:2 3"/>`:''}<line x1="232" x2="232" y1="5" y2="25" style="stroke:var(--il-ink);stroke-width:2"/></svg>`}
function paceEvidence(i){const p=paceOf(i),scope=paceScope(S.v4.u),need=ks=>ks.length?`<ul>${ks.map(k=>`<li><button class="lnk" type="button" data-act="tblopen" data-k="${k}" data-f="all">${ASK[k]}</button></li>`).join('')}</ul>`:'<p>None.</p>';
  return `<section class="comparison-detail" id="pace-evidence" aria-label="${NM[i]}: forecast evidence"><div class="dhead"><h3>${NM[i]} · forecast evidence</h3>${chartStudentActions(i)}<button class="btn small" type="button" data-act="v4detail" data-i="${i}">Close</button></div><p>${paceSummary(p)}. ${p.checked} of ${p.goal} goal skills checked.</p><p>${p.end===null?'No checks on these goal skills.':`Evidence window: ${dayDateY(p.start)} – ${dayDateY(p.end)}. Net gains: ${paceNum(p.rec*PACE_WINDOW)} skills per 30 days. Estimate assumes this rate ${TODAY-p.end>PACE_WINDOW?'resumes':'continues'} from ${dayDateY(TODAY)}.`}</p><p class="hint">Even-pace reference: ${paceNum(p.due)} skills as of ${dayDateY(TODAY)}. Status “${p.st}” uses this reference and observed rates; it is not an assigned schedule.</p>${fold('pace-needs-'+i,`Goal skills still to master · ${p.close.length}`,need(p.close))}${fold('pace-scope-'+i,'Target and earlier skills',`<h4>Target unit</h4>${need(scope.target)}<h4>Earlier skills used here</h4>${need(scope.previous)}`)}</section>`}
function v4draw(){const c=$('#v4c');if(!c)return;const goal=paceScope(S.v4.u).ks.length,P=ALL.map(i=>Object.assign({i},paceOf(i)));
  if(!goal){c.innerHTML='<p class="none">No key skills to project.</p>';return}
  P.sort((a,b)=>S.v4.sort==='name'?NM[a.i].localeCompare(NM[b.i]):S.v4.sort==='proj'?(b.proj??-1)-(a.proj??-1)||NM[a.i].localeCompare(NM[b.i]):PSI[a.st]-PSI[b.st]||(a.proj??-1)-(b.proj??-1)||NM[a.i].localeCompare(NM[b.i]));
  const axis=chartAxis([[0,'0'],[Math.round(goal/2),Math.round(goal/2)],[goal,goal+' · goal']],goal);
  const rows=P.map(p=>{const selected=S.v4.detail===p.i;return `<div class="visual-row${selected?' selected':''}" data-student="${p.i}"><div class="visual-name">${nmBtn(NM[p.i])}</div><button class="plot-select" type="button" data-act="v4detail" data-i="${p.i}" aria-expanded="${selected}" aria-controls="pace-evidence" aria-label="${NM[p.i]}: ${paceSummary(p)}; ${p.st}; inspect evidence">${masteryPlot(p)}</button><div class="visual-reading"><b>${p.now} → ${p.proj===null?'?':'~'+paceNum(p.proj)}</b><small>of ${goal} skills</small><span class="status-${p.key}">${p.st}</span></div></div>`}).join('');
  c.innerHTML=`${S.v4.reference?`<p class="hint">Dotted marker: even-pace reference · ${paceNum(P[0].due)} skills as of ${dayDateY(TODAY)}.</p>`:''}<div class="visual-list pace-chart" data-scroll="pace" aria-label="Goal skills mastered · 0–${goal} · Goal: ${goal}">${chartHead('Student',axis,'Now → estimate')}${rows}</div>${S.v4.detail!==null?paceEvidence(S.v4.detail):''}`;
  setAns(4)}

/* ---------- view 6 (Q5): hardest content, as ranked bars per textbook ----------
   Each row is a unit, subunit or skill; the bar is the class by mastery level, the figure the share not mastered yet.
   A skill counts only when an item checks it somewhere: a skill nothing checks has no evidence, so it gets no bar. */
const EMPTYK={c:{F:[],H:[],E:[],Q:[],N:[]},l:[0,0,0,0,0],a:0,ns:0,p:null};
function statK(k,ids){const c={F:[],H:[],E:[],Q:[],N:[]},l=[0,0,0,0,0];ids.forEach(i=>{const m=mast(i,k);if(m){c[m.cat].push(NM[i]);if(m.cat==='F'||m.cat==='H'||m.cat==='E')l[lvOf(m.c)]++}});const a=c.F.length+c.H.length+c.E.length;return {c,l,a,ns:c.E.length+c.H.length,p:a>=8?(c.E.length+c.H.length)/a:null}}
const st5=(k,ids)=>chk5(k)?statK(k,ids):EMPTYK;
const eo=s=>({a:s.a,l:s.l,p:s.p});
const pool5=ss=>{let a=0;const l=[0,0,0,0,0];ss.forEach(s=>{if(s.p!==null){a+=s.a;s.l.forEach((v,b)=>{l[b]+=v})}});return {a,l,p:a?(a-l[4])/a:null}};
const whereTxt=k=>`Introduced in ${SUBS[KHOME[k]].s} ${esc(cut(VJ[KHOME[k]].name,36))} · ${chk5(k)?`${KIT[k].length} ${pl(KIT[k].length,'question')}`:'no question checks it'}`;
/* where a skill was first introduced, big enough to check at a glance: the unit, the subunit, the day the class met it, and the questions on it. It opens the grid at that subunit with the skill picked */
const introCard=(k,compact=false)=>{compact=compact&&KIT[k].some(ix=>IWHO[ix].length);const j=KHOME[k],u=SUBS[j].u;return `<button class="intro" type="button" data-act="gointro" data-k="${k}" data-j="${j}"${tp('Open Engagement and performance at this subunit, with the skill picked')}><span class="l">Introduced in</span><b>${TB0[u].s} · ${TB0[u].nb}</b><span class="j">${SUBS[j].n}</span><span class="m">${taught(k)?`First met on ${dayDate(KT[k])}`:'Not started by the class'}${compact?'':` · ${chk5(k)?`${KIT[k].length} ${pl(KIT[k].length,'question')} check it`:'no question checks it'}`}</span></button>`};
/* where the class stalls on a skill: Stall points narrowed to the questions that check it, worst first. Shown only when such a question is there to see */
const whereLink=k=>stallN(k)?`<button class="lnk" type="button" data-act="gosk" data-k="${k}">Where they stall →</button>`:'';
/* under "All books" an outline is grouped by book: a heading a book, then its units, then its units not started. The labs are left out and named under the list */
const treeBody=(T,ord,unitRow,nsI)=>MULTI&&PICK===null?BKON.filter(tb=>!LABB[tb]).map(tb=>{const Ts=T.filter(U=>TB0[U.u].tb===tb);return Ts.length?`<li class="hg"><div class="hr hgr"><span class="hn"><b>${BL[tb]} · ${BOOKS[tb].s}</b></span></div></li>`+ord(Ts.filter(U=>U.on)).map(unitRow).join('')+nsRow(Ts.filter(U=>!U.on).map(nsI)):''}).join('')
  :ord(T.filter(U=>U.on)).map(unitRow).join('')+nsRow(T.filter(U=>!U.on).map(nsI));
const labsNote=what=>MULTI&&PICK===null&&BKON.some(tb=>LABB[tb])?`<p class="hint" style="margin:8px 0 0">A lab is work, not a check, so ${what}. The labs are under ${andList(BKON.filter(tb=>LABB[tb]).map(tb=>`<button class="lnk" type="button" data-act="bk" data-f="${esc(BOOKS[tb].id)}">${BL[tb]} · ${BOOKS[tb].s}</button>`))}.</p>`:'';
const labsLevelNote=()=>LABV?`<p class="hint" style="margin:0 0 10px">A lab is not a check. These are the class’s levels on the skills each lab practises, from the questions on them in the other textbooks.</p>`:'';
/* units or subunits the class hasn't started: one line of names, so the list stays about what there is evidence for */
const nsRow=items=>items.length?`<li class="ns"><p class="nsrow"><span class="nsl"${tp(`Not started: ${items.map(h=>String(h).replace(/<[^>]+>/g,'')).join(', ')}`)}>+${items.length} not started</span></p></li>`:'';
const pc5=p=>Math.round(p*100)+'%';
function tree5(tb){const ids=tbWho(tb);
  return TREEU.map(u=>{const U=TB[tb].units[u],subs=uJs(tb,u).map(j=>{const J=TBJ(tb,j),on=J.on,ks=on?jSk(tb,j).map(k=>{const s=st5(k,ids);return {k,s,p:s.p}}):[];return Object.assign({j,J,on,ks},pool5(ks.map(x=>x.s)))});
    return Object.assign({u,U,on:tU(tb,u),subs},pool5([...new Map(subs.flatMap(x=>x.ks.map(y=>[y.k,y.s]))).values()]))})}
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
/* the skill picked in the list, or none: the list opens with nothing picked, and its panel comes with a click */
function sel5(tb,H){const all=H.T.flatMap(U=>U.subs.flatMap(J=>J.ks.map(K=>K.k)));let k=S.v6.sel[tb];if(k==null||!all.includes(k))k=S.v6.sel[tb]=null;return k}
const lvAll5=tb=>{const us=TREEU.filter(u=>tU(tb,u)),js=us.flatMap(u=>uJs(tb,u)).filter(j=>TBJ(tb,j).on&&jSk(tb,j).length);return {us,js}};
const level5=tb=>{const E=S.v6.ex[tb],{us,js}=lvAll5(tb);if(!E.U.length)return 'u';if(us.every(x=>E.U.includes(x))){if(!js.some(x=>E.J.includes(x)))return 'j';if(js.every(x=>E.J.includes(x)))return 'k'}return ''};
const CHEV='<svg class="chev" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M3.5 1.8 L7 5 L3.5 8.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const WARNI='<svg class="wi" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M.5 11 L11.5 11 L6 1 Z" style="fill:var(--il-watch)"/></svg>';
/* the class on a unit, subunit or skill as ALPS draws it: one bar of the students checked, by level, mastered first */
const hbar=(o,lv)=>{const w=v=>f1(v/o.a*100);return `<span class="hb b${lv}" aria-hidden="true">${[4,3,2,1,0].map(b=>o.l[b]?`<i style="width:${w(o.l[b])}%;background:${LVCOL[b]}"></i>`:'').join('')}</span>`};
/* where else a skill lives, shown only when this textbook teaches it or checks it but not both */
const tag5=()=>'';
/* the followed student, in the class key's own colours as on Stall points: on a skill, the square of their level; on a subunit or unit, how many of
   its skills they have not mastered, by group, each group's square split between its two levels' colours, a skill once however many lessons list it */
const smk5=(i,ks)=>ks.map(K=>{if(K.p===null)return '';const m=mast(i,K.k),c=m?m.cat:'N';return c==='F'||c==='H'||c==='E'?lsw(lvOf(m.c)):''}).join('');
const cnt5=(i,ks)=>{const c={E:0,H:0},seen=new Set();ks.forEach(K=>{if(K.p===null||seen.has(K.k))return;seen.add(K.k);const m=mast(i,K.k);if(m&&c[m.cat]!==undefined)c[m.cat]++});return c};
const smR5=(i,ks)=>{const c=cnt5(i,ks);return (c.E?`<span class="pmn">${gsw('E')}${c.E}</span>`:'')+(c.H?`<span class="pmn">${gsw('H')}${c.H}</span>`:'')};
const ssr5=(i,ks,one)=>{if(one){const K=ks[0],m=K&&K.p!==null?mast(i,K.k):null;return m&&'FHE'.includes(m.cat)?`<span class="sr">${NM[i]}: ${LV[lvOf(m.c)].toLowerCase()}</span>`:''}
  const c=cnt5(i,ks),t=[c.E?c.E+' beginning or attempted':'',c.H?c.H+' familiar or proficient':''].filter(Boolean).join(', ');return t?`<span class="sr">${NM[i]}: ${t}</span>`:''};
const lsw=b=>`<i class="sw lv" style="background:${LVCOL[b]}"></i>`,gsw=g=>`<i class="sw lv" style="background:${GBG[g]}"></i>`;
const lvTxt=l=>[4,3,2,1,0].filter(b=>l[b]).map(b=>`${l[b]} ${LV[b].toLowerCase()}`).join(' · ');
const LEG5=`<span class="lt">Mastery levels</span>${[4,3,2,1,0].map(b=>`<span>${lsw(b)}${LV[b]}</span>`).join('')}`;
function unitHeatmap(tb,u){if(u===undefined||u===null)return '';const unit=hard5(tb).T.find(o=>o.u===u);if(!unit||!unit.on)return '';
  const ids=tbWho(tb).slice().sort((a,b)=>NM[a].localeCompare(NM[b])),ks=[...new Set(unit.subs.flatMap(J=>J.ks.map(K=>K.k)))],page=clamp(S.v6.hmPage||0,0,Math.max(0,Math.ceil(ks.length/12)-1)),shown=ks.slice(page*12,page*12+12),selected=S.v6.cell;
  const top=`<div class="controls"><h3>${unit.U.n} · students × skills</h3>${ks.length>12?`<span>${page*12+1}–${Math.min(ks.length,page*12+12)} of ${ks.length} skills</span><button class="btn small" type="button" data-act="heatpage" data-f="-1"${page?'':' disabled'}>Previous skills</button><button class="btn small" type="button" data-act="heatpage" data-f="1"${(page+1)*12<ks.length?'':' disabled'}>Next skills</button>`:''}</div>`;
  const cells=ids.map((i,r)=>`<tr><th scope="row">${nmBtn(NM[i])}</th>${shown.map((k,c)=>{const m=mast(i,k),lv=m&&m.ev>=2?lvOf(m.c):-1,on=selected&&selected.i===i&&selected.k===k,label=lv>=0?LV[lv]:(m&&m.ev?'One check · level unavailable':'Not attempted'),tab=selected&&shown.includes(selected.k)?on:r===0&&c===0;
    return `<td><button class="heat-cell${on?' on':''}${lv<0?(m&&m.ev?' one-check':' not-attempted'):''}" type="button" data-act="unitcell" data-i="${i}" data-k="${k}" data-row="${r}" data-col="${c}" tabindex="${tab?0:-1}" aria-pressed="${!!on}" aria-label="${NM[i]}, ${ASK[k]}: ${label}${lv>=0?', score '+Math.round(m.c*100)+' of 100':''}; inspect evidence" style="${lv>=0?'background:'+LVCOL[lv]:''}"${tp(`<b>${NM[i]} · ${ASK[k]}</b><br>${label}${lv>=0?' · '+Math.round(m.c*100)+'/100':''}`)}><span class="sr">${label}</span>${lv<0?'<span aria-hidden="true">'+(m&&m.ev?'?':'–')+'</span>':''}</button></td>`}).join('')}</tr>`).join('');
  let detail='';if(selected&&ids.includes(selected.i)&&ks.includes(selected.k)){const {i,k}=selected,m=mast(i,k),label=m&&m.ev>=2?`${LV[lvOf(m.c)]} · score ${Math.round(m.c*100)}/100`:m&&m.ev?'One check · more evidence needed':'Not attempted';
    detail=`<section class="comparison-detail" id="unit-cell-evidence"><div class="dhead"><h3>${NM[i]} · ${skNm(k)}</h3>${chartStudentActions(i)}</div><p>${label}. ${m?m.ev:0} checks. Skill scores retain retry credit, relevance weights and later-check weighting.</p>${tblGo(k,'unit')}</section>`}
  return `<section class="unit-heatmap">${top}${levelLegend()}${shown.length?`<div class="heatmap-scroll" data-scroll="unit-skills"><table class="skill-heatmap"><caption class="sr">Every student on the same five mastery levels. Arrow keys move between cells; Enter opens evidence.</caption><thead><tr><th scope="col">Student</th>${shown.map(k=>`<th scope="col"><button class="lnk" type="button" data-act="v6sk" data-k="${k}">${skNm(k)}</button></th>`).join('')}</tr></thead><tbody>${cells}</tbody></table></div>`:'<p class="none">No taught skills are listed in this unit yet.</p>'}${detail}</section>`}

function v6list(tb){const H=hard5(tb),T=H.T,ids=tbWho(tb),Tb=TB[tb],E=ex5(tb,H),k0=sel5(tb,H),hard=S.v6.sort!=='course',sel=S.stu,fol=sel!==null&&ids.includes(sel);
  const ord=a=>hard?a.slice().sort((x,y)=>(y.p===null?-1:y.p)-(x.p===null?-1:x.p)):a;
  const pc=o=>{const s=o.s||o,known=o.p!==null;return `<span class="hp"><span class="unit-metric-label" aria-hidden="true">Not mastered</span>${known?`<b>${pc5(o.p)}</b><span class="sr"> not mastered</span>`:'<span aria-label="More evidence needed">—</span>'}</span><span class="he"><span class="unit-metric-label" aria-hidden="true">Need support</span>${known?`<b>${s.l[0]+s.l[1]}</b><span aria-hidden="true"> / ${s.a}</span><span class="sr"> of ${s.a} assessed student–skill results at Beginning or Attempted</span>`:'<span aria-label="More evidence needed">—</span>'}</span>`};
  const sc=(ks,one)=>fol?`<span class="hs">${one?smk5(sel,ks):smR5(sel,ks)}${ssr5(sel,ks,one)}</span>`:'';
  const nvw=ks=>'';   // a unit's skills with no question are noted on their own rows, not flagged beside the unit's name
  const off=(lv,name,txt)=>`<div class="hr l${lv} off"><span class="hn"><span class="chs"></span>${name}</span><span class="hx">${txt}</span><span class="hp"></span><span class="he"></span>${fol?'<span class="hs"></span>':''}</div>`;
  const skRow=K=>{const on=K.k===k0,s=K.s;
    return `<li><button type="button" class="hr l2${on?' on':''}" data-act="v6sk" data-k="${K.k}" aria-pressed="${on}"${tp(`<b>${ASK[K.k]}</b><br>${K.p===null?(chk5(K.k)?'Fewer than eight students have been checked on it':'Taught, but no question or activity checks it'):lvTxt(s.l)}<br><span>${whereTxt(K.k)}</span>`)}><span class="hn"><span class="chs"></span><span>${skNm(K.k)}${tag5(tb,K.k)}</span></span>${K.p===null?(chk5(K.k)?'<span class="hx">Too few checked yet</span>':`<span class="hx w">${WARNI}No item checks it</span>`):hbar(eo(s),2)}${pc(K)}${sc([K],true)}</button></li>`};
  const subRow=J=>{if(!J.on||!J.ks.length)return `<li>${off(1,J.J.n,J.on?'No skills yet':'Not started')}</li>`;const o=E.J.includes(J.j);
    return `<li><button type="button" class="hr l1" data-act="v6sub" data-j="${J.j}" aria-expanded="${o}"><span class="hn">${CHEV}<span>${J.J.n}${nvw(J.ks)}</span></span>${J.p===null?'<span class="hx">No evidence yet</span>':hbar(J,1)}${pc(J)}${sc(J.ks)}</button>${o?`<ul>${ord(J.ks).map(skRow).join('')}</ul>`:''}</li>`};
  const unitRow=U=>{if(!U.on)return `<li class="hu">${off(0,`<b>${U.U.nb}</b>`,'Not started')}</li>`;const o=E.U.includes(U.u);
    return `<li class="hu"><button type="button" class="hr l0" data-act="v6unit" data-u="${U.u}" aria-expanded="${o}"><span class="hn">${CHEV}<span><b>${U.U.nb}</b>${nvw(U.subs.flatMap(J=>J.ks))}</span></span>${U.p===null?'<span class="hx">No evidence yet</span>':hbar(U,0)}${pc(U)}${sc(U.subs.flatMap(J=>J.ks))}</button>${o?`<ul>${ord(U.subs.filter(J=>J.on)).map(subRow).join('')}${nsRow(U.subs.filter(J=>!J.on).map(J=>`<i${tp(J.J.n)}>${J.J.s}</i>`))}</ul>`:''}</li>`};
  const note=[ids.length<NM.length?`${ids.length} of ${NM.length} students use ${Tb.n}.`:'',sel!==null&&!fol?`${NM[sel]} doesn’t use it.`:''].filter(Boolean).join(' ');
  const ctl=toHead(`<span class="sel">Show ${seg('v6lvl',level5(tb),[['u','Units'],['j','Subunits'],['k','Skills']],'Show rows down to')}</span><label class="sel" for="v6sort">Sort <select id="v6sort"><option value="hard"${hard?' selected':''}>Hardest first</option><option value="course"${hard?'':' selected'}>Course order</option></select></label>`);
  const leg=`<div class="legend mleg">${LEG5}${fol?`<span class="lt">${NM[sel]}</span><span>${gsw('E')}Beginning or attempted</span><span>${gsw('H')}Familiar or proficient</span>`:''}</div>`;
  const list=`<ul class="hc skills-unit${fol?' fol':''}" aria-label="${Tb.n}: units, subunits and skills, with the share of assessed student–skill pairs not mastered yet"><li class="hh" aria-hidden="true"><div class="hr"><span class="hn">Unit, lesson or skill</span><span class="hx">Mastery breakdown</span><span class="hp">Not mastered</span><span class="he">Need support<small>Beginning / Attempted</small></span>${fol?`<span class="hs">${NM[sel]}</span>`:''}</div></li>${treeBody(T,ord,unitRow,U=>`<i>${U.U.nb}</i>`)}</ul>${labsNote('they are not ranked here')}`;
  const K0=k0===null?null:T.flatMap(U=>U.subs.flatMap(J=>J.ks)).find(K=>K.k===k0),s0=K0?K0.s:EMPTYK,p0=s0.p;
  const det=k0===null?'':`<div class="detail skills-unit-detail"><div class="dhead skills-detail-head"><div class="skills-detail-title"><span class="skills-detail-icon">${engIcon('skill')}</span><div><span class="skills-detail-label">Selected skill</span><h3>${skNm(k0)}</h3></div></div>${p0===null?`<span class="pill watch">${chk5(k0)?'Too few checked yet':'No item checks it'}</span>`:`<span class="pill ${p0>=.45?'bad':p0>=.3?'watch':'good'}">${pc5(p0)} not mastered</span>`}${whereLink(k0)}</div>
  ${p0===null?`<p class="none">${chk5(k0)?'Fewer than eight students have been checked on this skill, so the share would mislead.':'No question or activity checks this skill yet, so there is no evidence of who has it.'}</p>`:skillsSnapshot(k0)}
  <div class="skill-evidence">${introCard(k0)}${tblGo(k0,'unit')}</div></div>`;
  return (note?`<p class="hint" style="margin:0 0 10px">${note}</p>`:'')+labsLevelNote()+ctl+leg+(det?duo(duoW(.6,560),list,det,'stick'):stage(Math.min(VW(),960),list))+unitHeatmap(tb,S.v6.heat)}


/* ---------- a page's views, all on the page ----------
   A page with more than one view shows them all, one under another, each a section that folds (asked 2026-10-26: "Instead view filters to
   view one view at a time. In every page, make collapsible views and show all views in a scrollable way"). A section is open until folded and
   remembers it; a link into a view opens its section and scrolls to it */
/* every card opens on the same header: its chart's name on the left and the chart's own filters on the right (a page's filters sit beside the
   page's title instead). A card that folds has the chevron before the name; folded, the header alone shows. It is open until folded, unless it
   starts folded (shut) */
const chd=(name,ctl)=>`<div class="cthd">${ctT(name)}${ctl?`<div class="vctl">${ctl}</div>`:''}</div>`;
const pvOpen=(id,shut)=>{const f=S.fold['pv-'+id];return f===undefined?!shut:f!==false};
const pvSec=(id,name,body,ctl,shut)=>{const o=pvOpen(id,shut);return `<section class="mcard pv${o?'':' shut'}" id="pv-${id}">${chd(`<button class="pvt" type="button" data-act="pvfold" data-id="${id}" aria-expanded="${o}">${CHEV}<span>${name}</span></button>`,o?ctl:'')}${o?`<div class="pvb">${body}</div>`:''}</section>`};
const pvScroll=()=>{const id=S.pvGo;S.pvGo=null;const e=id?UIROOT.querySelector('#'+('pv-'+id)):null;if(!e||!e.scrollIntoView)return false;e.scrollIntoView({block:'start'});return true};
/* ---------- the skills page: the skills many students are weak in now, the same skills by unit, and the ones that faded ----------
   One page, three views, all on it, laid out as every page is: the page's question, its filters and "How to read" in the title row, the answer
   cards under it, then a card a view, named by its chart, with the view's own filters on the right of the name. Pages 5 (by unit) and 9
   (faded) keep their ids for flags and the log, and open the page at their card; the rail shows one entry. */
const STS=['Getting worse','Still weak','Improving','Recovered'];
const hSk=()=>[h7(),h6(),h10()].join(' ');
/* the page's answer: what to teach first and how many skills are weak, the hardest unit, and the skill that faded most */
const cSk=()=>{const first=weakIn().find(m=>SG[m.st]==='p'),hardest=hard5(S.v6.tb).hk,faded=FD.filter(o=>fadeKind(o.d)==='fade').sort((a,b)=>a.d-b.d)[0],w=c7().map((c,i)=>Object.assign(c,{act:'skillsection',group:'sk-weak'},i===0&&first?{k:first.k}:{})),u=c6().map((c,i)=>Object.assign(c,{act:'skillsection',group:'sk-unit'},i===1&&hardest?{k:hardest.k}:{})),f=c10().map((c,i)=>Object.assign(c,{act:'skillsection',group:'sk-faded'},i===0&&faded?{k:faded.k}:{}));return [...w,...u,...f]};
/* "How to read" for the page: a short paragraph a chart, led by the chart's name */
const HOWSK=()=>[[CT.weak,6],[CT.unit,5],[CT.fade,9]].map(([t,k])=>`<p><b>${t}.</b> ${HOW[k]}</p>`).join('');
const reviewSection=(id,name,description,icon,body,ctl,shut)=>{const o=pvOpen(id,shut);return `<section class="mcard pv${o?'':' shut'}" id="pv-${id}"><div class="cthd skills-section-head"><h3 class="ctt"><button class="pvt" type="button" data-act="pvfold" data-id="${id}" aria-expanded="${o}"${o?` aria-controls="${id}-content"`:''}>${CHEV}<span class="skills-section-icon">${engIcon(icon)}</span><span class="skills-section-title"><span>${name}</span><small>${description}</small></span></button></h3></div>${o?`${ctl?`<div class="vctl skills-section-controls" aria-label="${name}: controls">${ctl}</div>`:''}<div class="pvb" id="${id}-content">${body}</div>`:''}</section>`};
const vSk=()=>{const sec=f=>{PCTL='';const b=f(),c=PCTL;PCTL='';return [b,c]},[w,cw]=sec(v7),[u,cu]=sec(()=>v6list(S.v6.tb)),[f,cf]=sec(v10);
  return reviewSection('sk-weak',CT.weak+' · '+weakIn().length+' skills','Compare support needs and evidence coverage across the class.','skill',w,cw)+reviewSection('sk-unit',CT.unit+' · '+hard5(S.v6.tb).T.filter(U=>U.p!==null).length+' units assessed','Explore units, lessons and skills on the same mastery scale.','book',u,cu,true)+reviewSection('sk-faded',CT.fade+' · '+FD.filter(o=>fadeKind(o.d)==='fade').length+' skills','Compare the same students’ initial and later mastery scores.','history',f,cf,true)};
function h7(){const L=weakIn();if(!L.length)return 'No skill is weak for a fifth of the class at once.';const p=L.filter(m=>SG[m.st]==='p'),o=L.length-p.length,first=p[0];
  if(!first)return `No skill is weak for a fifth of the class now; ${o} ${o===1?'is':'are'} getting better.`;
  return `${ASK[first.k]} first: ${first.now.length} of ${N} beginning or attempted. ${p.length} of the ${L.length} ${pl(L.length,'skill')} tracked ${p.length===1?'is':'are'} weak for a fifth of the class or more${o?`; ${o} ${o===1?'is':'are'} getting better`:''}.`}
/* ---------- points on the weak-skills lines: who was where on a day, and who changed between two ----------
   A point is one five-day block on a skill's line. One point lists the students by where they stood that day. Two points on one skill compare the
   days: students are grouped by where they are on the later day and split by where they were on the earlier one, because the action is about the
   later day. Two points on two skills compare the skills on one day, the later of the two. Buttons appear only on today's lists; a past day offers
   "Compare with now" instead, so nothing is acted on for students who have moved since. "Lost it" is a change of level (mastered, then not); the
   Faded view's "Slipped 20+ points" is a change of score, and the two keep their own names. */
function ptSel(){const P=(S.v7.pts||[]).filter(p=>WEAK[p.r]&&WEAK[p.r].sv[p.j]!==null);if(!P.length)return null;
  if(P.length===1)return {kind:'one',r:P[0].r,m:WEAK[P[0].r],j:P[0].j};
  const [p,q]=P;if(p.r===q.r)return {kind:'time',r:p.r,m:WEAK[p.r],a:Math.min(p.j,q.j),b:Math.max(p.j,q.j)};
  return {kind:'skills',r1:p.r,r2:q.r,m1:WEAK[p.r],m2:WEAK[q.r],j:Math.max(p.j,q.j)}}
/* who was where on one day: each mastery level, and unavailable (fewer than two checks by then); ny, dev and sec are the three groups acted on */
const dayG=(m,j)=>{const g={lv:[[],[],[],[],[]],ny:[],dev:[],sec:[],early:[]};ALL.forEach(i=>{const x=STW[i][m.k][j];if(x>=0)g.lv[x].push(NM[i]);(x<0?g.early:x>3?g.sec:x>1?g.dev:g.ny).push(NM[i])});return g};
function ptGroups(P){const at=(m,j,i)=>G3(STW[i][m.k][j]);
  if(P.kind==='one')return dayG(P.m,P.j);
  if(P.kind==='time'){const g={lost:[],never:[],fell:[],dev:[],got:[],held:[],early:[]};
    ALL.forEach(i=>{const x=at(P.m,P.a,i),y=at(P.m,P.b,i),n=NM[i];if(y<0)g.early.push(n);else if(x===2)(y===2?g.held:g.lost).push(n);else if(y===0)(x===1?g.fell:g.never).push(n);else if(y===1)g.dev.push(n);else g.got.push(n)});return g}
  const a=ALL.filter(i=>at(P.m1,P.j,i)===0),b=ALL.filter(i=>at(P.m2,P.j,i)===0);
  return {both:a.filter(i=>b.includes(i)).map(i=>NM[i]),one:a.filter(i=>!b.includes(i)).map(i=>NM[i]),two:b.filter(i=>!a.includes(i)).map(i=>NM[i])}}
/* the panel's pictures. The class on a day is one bar, every student once, as ALPS draws it: the five levels, mastered first, and unavailable
   (hatched). A part shows its count when it is wide enough to hold it */
const sbSeg=(cls,n,N)=>n>0?`<i class="${cls}" style="width:${f1(n/N*100)}%">${n/N>=.025?n:''}</i>`:'';
const STP=[4,3,2,1,0].map(b=>[b,'l'+b,LV[b],LVCOL[b]]).concat([['early','ua','Unknown: fewer than two checks','']]);
const stN=(g,k)=>(k==='early'?g.early:g.lv[k]).length;
const stSw=c=>c?`<i class="sw lv" style="background:${c}"></i>`:'<i class="sw ua"></i>';
const stBar=g=>{const N=STP.reduce((a,[k])=>a+stN(g,k),0);return N?`<span class="sb" role="img" aria-label="${STP.filter(([k])=>stN(g,k)).map(([k,,l])=>`${stN(g,k)} ${l.toLowerCase()}`).join(', ')}">${STP.map(([k,c])=>sbSeg(c,stN(g,k),N)).join('')}</span>`:''};
const stKey=gs=>`<div class="legend sbkey">${STP.filter(([k])=>gs.some(g=>stN(g,k))).map(([,,l,c])=>`<span>${stSw(c)}${l}</span>`).join('')}</div>`;
/* Current evidence keeps all five levels and unknown students on the same class-count scale. */
function skillsSnapshot(k,compact=false){const st=statK(k,ALL),g={lv:st.l.map(n=>Array(n)),early:Array(N-st.a)};
  return `<section class="skills-snapshot" aria-label="Current class evidence">${compact?'':`<div class="skills-snapshot-meta"><p class="skills-snapshot-date">Evidence as of ${dayDateY(LASTDAY)}</p><span>${N} students</span></div>`}<div class="sbs">${stBar(g)}${stKey([g])}${N>st.a?`<p class="skills-snapshot-note">Unknown: ${st.c.Q.length} ${pl(st.c.Q.length,'needs','need')} more checks · ${st.c.N.length} not started</p>`:''}</div></section>`}
const ptKey=(P,g)=>`v7p:${P.kind==='skills'?P.m1.k+'+'+P.m2.k:P.m.k}:${g}:${P.kind==='time'?P.a+'-'+P.b:P.j}`;
/* Group actions retain the existing eligibility rules and history-specific keys. */
const ptActs=(P,acts)=>{const b=acts.filter(a=>a[1].length).map(([g,names,label,done,who])=>isLogged(ptKey(P,g))?`<span class="pill good">${done}</span>`:`<button class="btn small" type="button" data-act="v7act" data-g="${g}"${tp(`For the ${names.length} ${who}`)}>${label}</button>`);return b.length?`<div class="tc-act">${b.join('')}</div>`:''};
const ptPast=label=>`<div class="tc-act"><button class="btn small" type="button" data-act="v7cmp">${label}</button><span class="hint">Actions use the latest recorded levels.</span></div>`;
/* All three modes replace the same result area; dates never append a second skill panel. */
function weakRecord(m,j,label){const g=dayG(m,j),ids=ALL.filter(i=>STW[i][m.k][j]<0),q=ids.filter(i=>{const e=estOf(i,m.k,BE(j));return e&&e.ev===1}).length;
  return {g,label,q,notStarted:ids.length-q,assessed:N-ids.length,pct:m.sv[j]};}
function weakDistributions(records,sameNote='',joiner=' → '){const equal=sameNote&&records.length===2&&STP.every(([k])=>stN(records[0].g,k)===stN(records[1].g,k))&&records[0].q===records[1].q&&records[0].notStarted===records[1].notStarted,shown=equal?[{...records[0],label:records.map(r=>r.label).join(joiner)}]:records;
  return `<div class="sbs weak-distributions" data-distributions="${records.length}" data-equal="${!!equal}">${shown.map(r=>`<div class="sbrow"><div class="weak-distribution-label"><b>${r.label}</b><span>${r.pct}% mastered · ${r.assessed} assessed</span></div>${stBar(r.g)}${r.g.early.length?`<p class="skills-snapshot-note">${r.q} ${pl(r.q,'needs','need')} more checks · ${r.notStarted} not started</p>`:''}</div>`).join('')}${equal?`<p class="skills-snapshot-note">${sameNote}</p>`:''}${stKey(records.map(r=>r.g))}</div>`;}
function weakGroup(P,key,label,n,detail=''){const k=P.kind==='skills'?P.m1.k:P.m.k;
  return `<div class="weak-group" data-group="${key||'unknown'}" data-count="${n}">${key&&n?`<button class="lnk" type="button" data-act="tblopen" data-k="${k}" data-f="pt" data-g="${key}"><span>${label}</span><b>${n}</b></button>`:`<span class="weak-group-static"><span>${label}</span><b>${n}</b></span>`}${detail?`<small>${detail}</small>`:''}</div>`;}
function weakComparison(P){const G=ptGroups(P),now=(P.kind==='time'?P.b:P.j)===NBC-1;
  if(P.kind==='time'){const re=G.never.concat(G.fell);return `<section class="weak-comparison-summary" aria-label="Students by change"><h5>Students by change</h5><div class="weak-group-grid">${weakGroup(P,'lost','Lost mastery',G.lost.length)}${weakGroup(P,'got','Reached mastery',G.got.length)}${weakGroup(P,'held','Stayed mastered',G.held.length)}${weakGroup(P,'dev','Other familiar / proficient',G.dev.length)}${weakGroup(P,'re','Other beginning / attempted',re.length,`${G.never.length} previously beginning, attempted or unknown · ${G.fell.length} previously familiar or proficient`)}${weakGroup(P,null,'Unknown at later date',G.early.length)}</div>${now?ptActs(P,[['lost',G.lost,'Give a review set','Review set planned','previously mastered, below mastered later'],['re',re,'Form a group','Group planned','beginning or attempted, excluding students who lost mastery'],['dev',G.dev,'Give a practice set','Practice set planned','familiar or proficient']]):ptPast('Compare with latest')}</section>`;}
  const same=G.both.length&&!G.one.length&&!G.two.length,other=N-G.both.length-G.one.length-G.two.length;
  return `<section class="weak-comparison-summary" aria-label="Support overlap"><h5>Beginning or attempted</h5><div class="weak-group-grid">${weakGroup(P,'both','Both skills',G.both.length)}${weakGroup(P,'one','This skill only',G.one.length)}${weakGroup(P,'two','Comparison skill only',G.two.length)}${weakGroup(P,null,'Other levels or unknown',other)}</div>${now?ptActs(P,[['both',G.both,same?'Form a group for both':'Form a group','Group planned','beginning or attempted on both skills']]):ptPast('Compare using latest levels')}</section>`;}
function ptPanel(P){const G=ptGroups(P),now=(P.kind==='time'?P.b:P.j)===NBC-1,date=j=>dayDateY(BE(j));
  if(P.kind==='one'){const m=P.m,j=P.j,ch=G.ny.length+G.dev.length+G.sec.length,whole=G.ny.length>=ch/2;
    return `<section class="weak-mode-result" data-mode="one"><h4>Class mastery <span>· ${N} students</span></h4>${weakDistributions([weakRecord(m,j,date(j))])}${now?ptActs(P,[['ny',whole?[]:G.ny,'Form a group','Group planned','beginning or attempted'],['dev',G.dev,'Give a practice set','Practice set planned','familiar or proficient']]):ptPast('Compare with latest')}</section>`;}
  if(P.kind==='time'){const m=P.m,records=P.a===P.b?[weakRecord(m,P.a,date(P.a))]:[weakRecord(m,P.a,date(P.a)),weakRecord(m,P.b,date(P.b))];
    return `<section class="weak-mode-result" data-mode="time"><h4>Mastery by date <span>· ${N} students at each date</span></h4>${weakDistributions(records,'Same level totals at both dates. Individual changes are counted below.')}</section>`;}
  return `<section class="weak-mode-result" data-mode="skills"><h4>Mastery on ${date(P.j)} <span>· ${N} students</span></h4>${weakDistributions([weakRecord(P.m1,P.j,'This skill'),weakRecord(P.m2,P.j,P.m2.n)],'Same level totals for both skills. Support overlap is counted below.',' and ')}</section>`;}

/* The overview compares current evidence in aligned rows. A selected skill keeps its full historical distribution and comparisons. */
const weakDates=m=>m.sv.map((v,j)=>v===null?-1:j).filter(j=>j>=0);
const weakChange=m=>{const work=[];for(let j=NBC-1;j>=0&&work.length<7;j--)if(ONB[j])work.push(j);const b=NBC-1,a=work[6];return a===undefined||m.sv[a]===null||m.sv[b]===null?null:{a,b,d:m.sv[b]-m.sv[a]}};
function v7History(r){const m=WEAK[r],ds=weakDates(m);if(!ds.length)return '<p class="none">More checks needed before a history can be compared.</p>';
  const P=ptSel(),mode=P?(P.kind==='time'?'dates':P.kind==='skills'?'skills':'day'):(S.v7.mode||'day'),last=ds[ds.length-1],a=P&&P.kind==='time'?P.a:ds.filter(j=>j<=last-6).pop()??ds[0],b=P?(P.kind==='time'?P.b:P.j):last;
  S.v7.mode=mode;
  const options=(vals,on)=>vals.map(j=>`<option value="${j}"${j===on?' selected':''}>${dayDateY(BE(j))} · ${m.nc[j]} assessed</option>`).join('');
  const others=WEAK.map((q,i)=>({q,i})).filter(o=>o.i!==r&&o.q.sv[b]!==null),r2=P&&P.kind==='skills'?P.r2:others[0]?.i;
  const controls=`<div class="skill-compare">${seg('v7mode',mode,[['day','Inspect date'],['dates','Compare dates'],['skills','Compare skills']],'History mode')}<div class="skill-compare-picks">${mode==='dates'?`<label class="sel" for="v7day-a">From <select id="v7day-a">${options(ds,a)}</select></label>`:''}<label class="sel" for="v7day-b">${mode==='dates'?'To':'Date'} <select id="v7day-b">${options(ds,b)}</select></label>${mode==='skills'?`<label class="sel" for="v7skill-b">Skill <select id="v7skill-b">${others.map(o=>`<option value="${o.i}"${o.i===r2?' selected':''}>${o.q.n}</option>`).join('')}</select></label>`:''}<button class="btn small" type="button" data-act="v7compare"${mode==='skills'&&!others.length?' disabled':''}>${mode==='day'?'Apply date':'Compare'}</button></div></div>`;
  const mobile=window.innerWidth<=650,W=mobile?320:600,L=mobile?38:44,R=24,T0=12,H=180,bot=142,first=ds[0],x=j=>L+(last===first ? .5 : (j-first)/(last-first))*(W-L-R),y=v=>bot-v/100*(bot-T0),selected=P?(P.kind==='time'?[P.a,P.b]:[P.j]):[];
  let s=`<svg class="viz skill-history-chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="${m.n}: mastered students among assessed students, 0 to 100 percent, every five days">`;
  [0,25,50,75,100].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`+T(L-8,y(v)+4,v+'%',{a:'end',c:'t3'})});
  let run=[];const flush=()=>{if(run.length)s+=`<polyline points="${run.join(' ')}" fill="none" style="stroke:var(--il-ink-2);stroke-width:2.5;stroke-linejoin:round"/>`;run=[]};
  m.sv.forEach((v,j)=>{if(v===null){flush();return}run.push(`${f1(x(j))},${f1(y(v))}`)});flush();
  ds.forEach(j=>{const on=selected.includes(j),v=m.sv[j];s+=`<g class="row${on?' on':''}" role="button" tabindex="0" data-act="v7pt" data-r="${r}" data-j="${j}" aria-label="${dayDateY(BE(j))}: ${v}% of ${m.nc[j]} assessed students mastered; inspect this date"><circle cx="${f1(x(j))}" cy="${f1(y(v))}" r="${on?5:3}" style="fill:${on?'var(--il-accent)':'var(--il-ink-2)'}"/><circle cx="${f1(x(j))}" cy="${f1(y(v))}" r="10" fill="transparent"/></g>`});
  [...new Set(mobile?[first,last]:[first,ds[Math.floor((ds.length-1)/2)],last])].forEach(j=>{s+=T(x(j),166,dayDate(BE(j)),{a:first===last?'middle':j===first?'start':j===last?'end':'middle',c:'t3'})});
  s+=T(x(last),Math.max(T0+12,y(m.sv[last])-10),m.sv[last]+'%',{a:'end',c:'t3'})+'</svg>';
  return `<section class="skill-history" aria-label="Mastery history and comparisons"><h4>Mastery over time</h4><p class="measure-note">Mastered among assessed · 0–100%. Assessed count can change by date.</p>${fig(s)}${controls}</section>`}
function v7(){const sel=S.stu,uf=S.v7.u,uok=k=>uf==='all'||uOf(k)<=+uf,inU=WEAK.filter(m=>uok(m.k)),cnt=st=>inU.filter(m=>m.st===st).length;if(S.v7.f!=='all'&&!cnt(S.v7.f))S.v7.f='all';const ff=S.v7.f;
  const units=STU.filter(u=>!TB0[u].lab),uctl=units.length>1?pickCtl('v7unit',uf,[['all','All units']].concat(units.map(u=>[String(u),`Through ${TB0[u].s} · ${TB0[u].nb}`])),'Skills'):'';
  const inF=WEAK.map((m,i)=>({m,i})).filter(o=>uok(o.m.k)&&(ff==='all'||o.m.st===ff)),rows=inF.slice(0,S.v7.more?inF.length:12);
  if(rows.length&&!rows.some(o=>o.i===S.v7.r)){S.v7.r=rows[0].i;S.v7.pts=[]}
  let P=ptSel();if(P&&!inF.some(o=>o.i===(P.r??P.r1))){S.v7.pts=[];P=null}
  const more=inF.length>12||S.v7.more?`<label class="chk" for="v7more"><input type="checkbox" id="v7more"${S.v7.more?' checked':''}> Show all ${inF.length} skills</label>`:'';
  const ctl=toHead(`${uctl}${seg('v7f',ff,[['all',`All · ${inU.length}`]].concat(STS.filter(st=>cnt(st)).map(st=>[st,`${st} · ${cnt(st)}`])),'Filter by status')}${more}`);
  const table=rows.length?`<div class="table-scroll"><table class="metric-table skill-overview"><caption class="sr">Skills ranked by status and number of students at beginning or attempted</caption><thead><tr><th>Skill</th><th>Weak now</th><th>Assessed</th><th>Unknown</th><th>Mastery change</th><th>Details</th></tr></thead><tbody>${rows.map(({m,i})=>{const st=statK(m.k,ALL),change=weakChange(m),held=sel!==null&&m.now.includes(NM[sel]);return `<tr class="${S.v7.r===i?'selected ':''}${held?'followed':''}"><th scope="row">${skNm(m.k)}<small>${m.st}${held?' · '+NM[sel]+' is weak here':''}</small></th><td data-label="Weak now"><b>${m.now.length}</b> of ${N}<small>Beginning or attempted</small></td><td data-label="Assessed">${st.a} of ${N}</td><td data-label="Unknown">${N-st.a} of ${N}<small>${st.c.Q.length} need more checks · ${st.c.N.length} not started</small></td><td data-label="Mastery change">${change?`<b>${dTxt(change.d)} percentage points</b><small>${dayDateY(BE(change.a))} → ${dayDateY(BE(change.b))}<br>${m.nc[change.a]} → ${m.nc[change.b]} assessed</small>`:'More checks needed'}</td><td data-label="Details"><button type="button" class="btn small" data-act="v7row" data-r="${i}" aria-pressed="${S.v7.r===i}">${S.v7.r===i?'Selected':'Inspect'}</button></td></tr>`}).join('')}</tbody></table></div>`:'<p class="none">Nothing matches this filter.</p>';
  let det='';if(rows.length){const m=WEAK[S.v7.r];det=`<section class="skill-selected" id="weak-evidence" aria-labelledby="weak-skill-title-${S.v7.r}"><div class="weak-evidence-toolbar"><p>Evidence as of ${dayDateY(LASTDAY)}</p><div class="weak-evidence-actions">${P?'<button class="lnk" type="button" data-act="v7now">Latest evidence</button>':''}${whereLink(m.k)}${P?tblGoPt(P):tblGo(m.k,'weak')}</div></div><div class="weak-evidence-layout"><section class="weak-current">${P?ptPanel(P):`<h4>Class mastery <span>· ${N} students</span></h4>${skillsSnapshot(m.k,true)}`}<div class="skill-evidence">${introCard(m.k,true)}</div></section>${v7History(S.v7.r)}</div>${P&&P.kind!=='one'?weakComparison(P):''}</section>`}
  const bars=rows.map(({m,i})=>{const st=statK(m.k,ALL),on=S.v7.r===i,parts=[[m.now.length,'needs-support'],[Math.max(0,st.a-m.now.length),'other-assessed'],[st.c.Q.length,'one-check'],[N-st.a-st.c.Q.length,'not-attempted']];
    return `<button type="button" class="visual-row visual-choice${on?' selected':''}" id="weak-skill-${i}" data-act="v7row" data-r="${i}" data-weak="${m.now.length}" data-assessed="${st.a}" data-unknown="${N-st.a}" aria-pressed="${on}" aria-expanded="${on}"${on?' aria-controls="weak-evidence"':''} aria-label="${m.n}: ${m.now.length} of ${N} beginning or attempted, ${st.a} assessed, ${N-st.a} unknown; inspect skill"><span class="visual-name" id="weak-skill-title-${i}">${skNm(m.k)}<small><span class="skills-trend" data-state="${SC[SG[m.st]][3]}">${m.st}</span></small></span>${on?'':`<span class="composition-lane">${parts.map(([n,c])=>n?`<i class="${c}" style="width:${n/N*100}%"></i>`:'').join('')}</span>`}<span class="visual-reading skills-support-count"><b>${m.now.length} / ${N}</b></span></button>${on?det:''}`}).join('');
  const chart=`<p class="scale-label">Students needing support · 0–${N} students</p><div class="legend"><span><i class="sw" style="background:var(--il-bad)"></i>Needs support (Beginning / Attempted)</span><span><i class="sw" style="background:var(--il-neutral)"></i>Other assessed</span><span><i class="sw hatch"></i>One check</span><span><i class="sw unattempted"></i>Not attempted</span></div><div class="visual-list weak-chart" data-scroll="weak">${chartHead('Skill',chartAxis([[0,'0'],[N/2,N/2],[N,N+' students']],N),'Need support')}${bars||'<p class="none">Nothing matches this filter.</p>'}</div>`;
  return ctl+'<details class="fold"><summary>Definitions and change window</summary><p><b>Weak now</b> means beginning or attempted. Assessed means at least two checks; unknown students are kept separate. Mastery change uses the last 30 days of class work; dates and assessed populations are shown for both ends.</p></details>'+chart+fold('weak-figures','Exact skill figures',table)}

/* ---------- view 8 (Q7): stall points, rolled up from content to subunits and units ----------
   Same outline as Q5: units open into subunits, subunits into their content in the order students meet it.
   Each bar splits the students who use the textbook: gave up, skipped, needed retries, and the rest got it first time.
   A unit or subunit pools all of its content. */
const OUT7=['First time','Needed retries','Gave up','Skipped','Not reached yet'],OUT7L=['Ran right first time','Ran right after more runs','Not right yet','Skipped','Not reached yet'];
/* on a page about labs, "gave up" is "not right yet" and is gray, not red: half of all labs are never marked right, so that is a lab's usual state and the share is what matters */
const OUTV=LABV?OUT7L:OUT7,CGU=LABV?'var(--il-neutral)':'var(--il-st-gu)',HOT7=LABV?.7:.18;
/* a followed student's result on a piece of content is the class key's own square in the class's colour (0 first time, 1 needed retries, 2 gave up,
   3 skipped), so one key reads both the bars and the student's column */
const pm7=o=>`<i class="sw lv pm" style="background:${o===0?'var(--il-ok-fill)':o===1?'var(--il-st-rt)':o===2?CGU:o===3?'var(--il-st-sk)':'var(--il-na-fill)'}" aria-hidden="true"></i>`;
const pool7=cs=>{const t=[0,0,0,0,0];let n=0;cs.forEach(x=>{x.t.forEach((v,q)=>t[q]+=v);n+=x.n});return {t,n}};
/* k narrows the outline to one skill's questions (the ones that check it), and to the units and subunits that hold them: where the class stalls on that skill */
function tree7(tb,k){const ok=k===null||k===undefined?null:new Set(KIT[k]);
  const T=TREEU.map(u=>{const U=TB[tb].units[u],subs=uJs(tb,u).map(j=>{const J=TBJ(tb,j),on=J.on,ct=ctOf(tb,j);
      const cs=on?cCnt(tb,j).map((c,s)=>({s,j,nm:ct[s][0],f:IT[ct[s][2]].f,type:IT[ct[s][2]].type,kind:ct[s][1],t:c,n:c[0]+c[1]+c[2]+c[3]+c[4]})).filter(C=>!ok||ok.has(ct[C.s][2])):[];
      return Object.assign({j,J,on,cs},pool7(cs))});
    return Object.assign({u,U,on:tU(tb,u),subs},pool7(subs.flatMap(x=>x.cs)))});
  return ok?T.map(U=>Object.assign({},U,{subs:U.subs.filter(J=>J.cs.length)})).filter(U=>U.subs.length):T}
/* where the most students gave up, and where the most skipped */
function worst7(T){let g=null,k=null;T.forEach(U=>U.subs.forEach(J=>J.cs.forEach(C=>{if(!g||C.t[2]>g.t[2])g=Object.assign({u:U.u},C);if(!k||C.t[3]>k.t[3])k=Object.assign({u:U.u},C)})));return {g,k}}
/* the worst questions, ranked: the most who gave up or skipped, then the most who gave up. On the whole class a question needs two who gave up or three who
   skipped to be listed; on one skill every one of its questions is ranked, the most retries breaking a tie, so a skill nobody gives up on still shows where it takes retries */
const worstQs=(T,k)=>T.flatMap(U=>U.subs.flatMap(J=>J.cs)).filter(C=>C.n&&(k!==null||C.t[2]>=2||C.t[3]>=3)).sort((a,b)=>(b.t[2]+b.t[3])-(a.t[2]+a.t[3])||b.t[2]-a.t[2]||(k===null?0:b.t[1]-a.t[1])).slice(0,8);
/* the skill the page is narrowed to, if any. "Where they stall" on a skill's panel sets it; "All questions", the rail and a student's flag clear it */
const k8=()=>{const k=S.v8.k;if(k===null)return null;if(!tree7(S.v8.tb,k).length)S.v8.k=null;return S.v8.k};
const stallN=k=>tree7(0,k).reduce((a,U)=>a+U.subs.reduce((b,J)=>b+J.cs.length,0),0);
function h8(){const tb=S.v8.tb,Tb=TB[tb],K=k8(),{g,k}=worst7(tree7(tb,K)),n=tbWho(tb).length,of=v=>n<NM.length?`${v} of ${n}`:v,JN=j=>TBJ(tb,j).n,what=LABV?BOOKS[PICK].s:Tb.n;
  if(!g)return `Nothing in ${what} has started yet.`;
  if(g.t[2]<2&&k.t[3]<3)return K===null?`Nobody is stalling in ${what} so far.`:`Nobody is stalling on ${ASK[K]} so far.`;
  const JS=j=>TBJ(tb,j).s,gu=`tried ${g.nm} but are not yet correct`;
  /* on one skill: the same two clauses, each only when it passes the page's own line (two gave up, three skipped) */
  if(K!==null)return `On ${ASK[K]}: ${[g.t[2]>=2?`${g.t[2]} ${gu} (${JS(g.j)})`:'',k.t[3]>=3?`${k.t[3]} skipped ${k.nm} (${JS(k.j)})`:''].filter(Boolean).join('; ')}.`;
  if(g.j===k.j)return `${JS(g.j)}: ${g.t[2]} ${gu}, ${k.t[3]} skipped ${k.nm}.`;
  return `${g.t[2]} ${gu} (${JS(g.j)}); ${k.t[3]} skipped ${k.nm} (${JS(k.j)}).`}
/* which rows are open: none to begin with. The headline and the panel beside the list already name the worst stall point */
function ex7(tb,T){if(!S.v8.ex[tb])S.v8.ex[tb]={U:[],J:[]};return S.v8.ex[tb]}
/* the worst questions keep a pick of their own: their first question to begin with */
function selW7(tb,worst){let s=S.v8.selw[tb];if(!s||!worst.some(C=>C.j===s.j&&C.s===s.s))s=S.v8.selw[tb]=worst.length?{j:worst[0].j,s:worst[0].s}:null;return s}
function sel7(tb,T){const all=T.flatMap(U=>U.subs.flatMap(J=>J.cs));let s=S.v8.sel[tb];if(s&&!all.some(C=>C.j===s.j&&C.s===s.s))s=S.v8.sel[tb]=null;return s||null}
/* open the outline at one question; with a skill, the outline holds that skill's questions only */
function open7(tb,j,s,k){const E=ex7(tb),u=uOfJ(j);if(!E.U.includes(u))E.U.push(u);if(!E.J.includes(j))E.J.push(j);S.v8.k=k===undefined?null:k;S.v8.sel[tb]={j,s};S.v8.tb=tb;S.v8.view='outline';S.fold['stall-unit-'+u]=true;S.fold['stall-lesson-'+j]=true;S.pvGo='sp-unit'}
const lvAll7=T=>{const us=T.filter(U=>U.on).map(U=>U.u),js=T.flatMap(U=>U.on?U.subs.filter(J=>J.on&&J.cs.length).map(J=>J.j):[]);return {us,js}};
const level7=(tb,T)=>{const E=S.v8.ex[tb],{us,js}=lvAll7(T);if(!E.U.length)return 'u';if(us.every(x=>E.U.includes(x))){if(!js.some(x=>E.J.includes(x)))return 'j';if(js.every(x=>E.J.includes(x)))return 'c'}return ''};
const sKey7=(tb,j,s)=>tb===0?`v8:${j}:${s}`:`v8:${tb}:${j}:${s}`;
const OUTLEG7=lead=>`<span class="lt">${lead}</span><span><i class="sw lv" style="background:${CGU}"></i>${OUTV[2]}</span><span><i class="sw lv" style="background:var(--il-st-sk)"></i>Skipped</span><span><i class="sw lv" style="background:var(--il-st-rt)"></i>${OUTV[1]}</span><span><i class="sw lv" style="background:var(--il-ok-fill)"></i>${OUTV[0]}</span><span><i class="sw na"></i>${OUTV[4]}</span>`;
/* ---------- Stall points, five other versions to compare (asked 2026-10-26) ----------
   The current bars stack a question's students, and on a lesson or unit every student on every question, so the middle parts float and a
   lesson's questions blur into one. Five other ways, switched in one select beside the view and opened with ?sv=1 to 5: v1 diverging bars,
   centred on one line between the students who did not get it (gave up, skipped) and the ones who did (needed retries, first time), not reached
   yet apart; v2 a column an outcome, every bar on its own baseline; v3 dots on one scale, a lesson or unit a small dot for each of its questions
   and a tick for all of it; v4 a grid of students by lessons, a lesson opening to students by its questions; v5 a square a student */
const SVV=[['now','Current'],['First five',[['1','v1 · Diverging'],['2','v2 · A column an outcome'],['3','v3 · Dots on one scale'],['4','v4 · Student grid'],['5','v5 · Every student']]],
  ['Simple graphs',[['6','v6 · Bar chart'],['7','v7 · Rings'],['8','v8 · Columns along the course'],['9','v9 · Funnel'],['10','v10 · Course map']]]];
const SVHOW={
 '1':'Each bar is centred on one line: left, the students who gave up (red, outermost) or skipped (amber); right, the ones who needed retries (pale green) or got it first time (green). A lesson or unit pools every student on every question. Not reached yet sits apart, at the right.',
 '2':'Each outcome has a column of its own, on its own baseline, so one outcome compares down the page: gave up, skipped, needed retries, first time, not reached yet, as a share of the class; a lesson or unit, of every student on every question. Red and amber figures are the high ones.',
 '3':'One scale, 0 to 100% of the class: red for who gave up, amber for who skipped. A question is a dot on each line. A lesson or unit has a small dot for each of its questions, so a few bad ones stand out, and a tick for all of it.',
 '4':'A row is a student, most given up on or skipped first. A column is a lesson: a cell is the share of it they gave up on or skipped, green for none, darker red for more, empty not reached yet. Click a lesson: its columns are its questions, a cell each result.',
 '5':'A square is a student. On a question each takes their result: red gave up, amber skipped, pale green needed retries, green first time, empty not reached yet. On a lesson or unit each takes their share of it given up on or skipped, green for none, darker red for more, most first.',
 '6':'Each bar is part of the class: red who gave up, amber who skipped, on a gray track that is the whole class. Strong colour means a stall point or often skipped; pale, fewer. A lesson or unit shows its worst question for each, named beside the bar.',
 '7':'Each ring is the whole class: red gave up, amber skipped, green got it, empty not reached yet. On a lesson or unit each student counts once, by the worst of theirs there. The number inside is how many gave up or skipped: red for a stall point, amber when often skipped.',
 '8':'Each pair of columns is a lesson, in course order: red is the most students who gave up on one of its questions, amber the most who skipped one. Strong colour marks a stall point or often skipped. Click a lesson to see its questions; click a question for who.',
 '9':'Each question as steps: how many got to it, how many of those tried it, and how many got it right. The amber part dropped out by skipping, the red part by giving up. A lesson or unit shows its worst question’s steps, named above them.',
 '10':'Each tile is a lesson, a row a unit; its number is how many students gave up on or skipped something there. Strong red or amber once enough did (the key says how many), pale when fewer, green when nobody did. Click a tile for its questions, and a question for who.'};
/* each version's chart names, the worst questions' and the outline's, seven words at most; v4's, v8's and v10's outline name follows the lesson opened */
const SVT={now:['Results on the worst questions','Results by unit, lesson and question'],'1':['Didn’t get it vs got it','Didn’t get it vs got it'],
  '2':['Share of the class per result','Share per result, by unit'],'3':['Share who gave up or skipped','Gave up or skipped, by unit'],
  '4':['Each student on the worst questions','Each student in each lesson'],'5':['Each student’s result, one square each','Each student, one square, by unit'],
  '6':['Students who gave up or skipped','Worst question in each unit and lesson'],'7':['The class’s results on each question','The class’s results by unit and lesson'],
  '8':['Students who gave up or skipped','Worst question in each lesson'],'9':['Got to it, tried, got it right','Worst question’s steps, by unit and lesson'],
  '10':['Students who gave up or skipped','Gave up or skipped, per lesson']};
const OC7=['var(--il-ok-fill)','var(--il-st-rt)',CGU,'var(--il-st-sk)','var(--il-na-fill)'];   // an outcome's colour, by its code
const OCR7={2:0,3:1,1:2,0:3,4:4};   // a row of students runs as the key does: gave up, skipped, needed retries, first time, not reached yet
const shr=(o,q)=>o.n?o.t[q]/o.n*100:0;
/* v1: the outcomes either side of one line, not reached yet apart at the right, each part a share of the class */
const dvBar=(o,lv)=>`<span class="vk dv b${lv}" aria-hidden="true"><span class="vl"><i style="width:${f1(shr(o,2))}%;background:${CGU}"></i><i style="width:${f1(shr(o,3))}%;background:var(--il-st-sk)"></i></span><span class="vr"><i style="width:${f1(shr(o,1))}%;background:var(--il-st-rt)"></i><i style="width:${f1(shr(o,0))}%;background:var(--il-ok-fill)"></i></span><span class="vz">${o.t[4]?`<i class="na" style="width:${f1(shr(o,4))}%"></i>`:''}</span></span>`;
const DVHEAD=`<span class="vk dv hd" aria-hidden="true"><span class="vl">← didn’t get it</span><span class="vr">got it →</span><span class="vz">not reached</span></span>`;
/* v2: a column an outcome, every bar on its own baseline, with its figure */
const clRow=(o,lv)=>`<span class="vk cl" aria-hidden="true">${[2,3,1,0,4].map(q=>{const v=shr(o,q),hot=lv===2&&(q===2&&v>=HOT7*100||q===3&&v>=29);return `<span class="vc"><span class="vt"><i${q===4?' class="na"':''} style="width:${f1(v)}%;background:${OC7[q]}"></i></span><b${hot?` class="${q===2?'hot':'warm'}"`:''}>${Math.round(v)}%</b></span>`}).join('')}</span>`;
const CLHEAD=()=>`<span class="vk cl hd" aria-hidden="true">${[2,3,1,0,4].map(q=>`<span class="vc">${OUTV[q]}</span>`).join('')}</span>`;
/* v3: dots on one scale of the class, gave up on the upper line and skipped on the lower; a lesson or unit has a small dot for each of its
   questions and a tick for all of it */
const dtRow=(o,lv,cs)=>{const lane=(q,y)=>{const col=q===2?CGU:'var(--il-st-sk)';return lv===2?`<i class="vd" style="left:${f1(shr(o,q))}%;top:${y}px;background:${col}"></i>`:cs.map(C=>`<i class="vd vd2" style="left:${f1(shr(C,q))}%;top:${y}px;background:${col}"></i>`).join('')+`<i class="vtk" style="left:${f1(shr(o,q))}%;top:${y}px;background:${col}"></i>`};
  return `<span class="vk dt" aria-hidden="true"><span class="vg" style="top:6px"></span><span class="vg" style="top:16px"></span>${lane(2,6)}${lane(3,16)}</span>`};
const DTHEAD=`<span class="vk dt ax" aria-hidden="true">${[0,50,100].map(v=>`<i style="left:${v}%">${v}%</i>`).join('')}</span>`;
/* v4's lessons and v5's lessons and units: a student's share of the questions they reached that they gave up on or skipped, green for none, darker
   red for more; none reached is empty, as not reached yet */
const trb=(tb,cs,i)=>{let r=0,k=0;cs.forEach(C=>{const o=cOut(tb,C.j)[C.s][i];if(o!==4){r++;if(o===2||o===3)k++}});return {r,k,v:r?k/r:-1}};
const trCol=v=>v<0?'var(--il-na-fill)':v===0?'var(--il-ok-fill)':v<.1?'var(--il-tr-1)':v<.25?'var(--il-tr-2)':v<.5?'var(--il-tr-3)':CGU;
const TRKEY=lead=>`<span class="lt">${lead}</span><span>${[0,.05,.2,.4,.6].map(v=>`<i class="sw lv" style="background:${trCol(v)}"></i>`).join('')}none to half or more given up on or skipped</span><span><i class="sw na"></i>${OUTV[4]}</span>`;
/* v5: a square a student, in the key's order on a question; on a lesson or unit, by their share of it given up on or skipped, most first */
const ppRow=(tb,lv,cs,ids)=>{const sq=7,cells=lv===2?ids.map(i=>({i,o:cOut(tb,cs[0].j)[cs[0].s][i]})).sort((a,b)=>OCR7[a.o]-OCR7[b.o]||a.i-b.i).map(c=>({f:OC7[c.o],na:c.o===4}))
    :ids.map(i=>Object.assign({i},trb(tb,cs,i))).sort((a,b)=>b.v-a.v||a.i-b.i).map(c=>({f:trCol(c.v),na:c.v<0}));
  return `<svg class="vk pp" viewBox="0 0 ${cells.length*sq} 12" width="${cells.length*sq}" height="12" aria-hidden="true">${cells.map((c,x)=>`<rect x="${x*sq+.5}" y=".5" width="${sq-1.6}" height="11" rx="1.2" style="fill:${c.f};stroke:${c.na?'var(--il-na-line)':'none'}"/>`).join('')}</svg>`};
/* v4: a grid, a row a student (most given up on or skipped first) and a column a lesson (a cell their share of it given up on or skipped) or a
   question (a cell their result). A lesson's column opens it; a question's column picks it for the panel; a name opens the student */
function grid8(tb,cols,kind,ids,W,sl,su){const L=112,R=66,Ht=kind==='j'?54:110,rh=13,n=cols.length,cw=Math.round(clamp((W-L-R)/Math.max(1,n),8,32)),gw=n*cw,H=Ht+ids.length*rh+6;
  const cell=(c,i)=>kind==='j'?(t=>({f:trCol(t.v),na:t.v<0,k:t.k}))(trb(tb,c.J.cs,i)):(o=>({f:OC7[o],na:o===4,k:o===2||o===3?1:0}))(cOut(tb,c.C.j)[c.C.s][i]);
  const M=ids.map(i=>cols.map(c=>cell(c,i))),ord=ids.map((i,ix)=>({i,ix,t:M[ix].reduce((a,x)=>a+x.k,0)})).sort((a,b)=>b.t-a.t||a.i-b.i);
  let s=`<svg class="viz gr8" width="${L+gw+R}" height="${H}" viewBox="0 0 ${L+gw+R} ${H}" role="group" aria-label="Students by ${kind==='j'?'lessons':'questions'}: ${kind==='j'?'each cell a student’s share of a lesson given up on or skipped':'each cell a student’s result'}">`;
  const me=ord.findIndex(o=>o.i===su);if(me>=0)s+=`<rect x="2" y="${Ht+me*rh-1}" width="${L+gw+R-4}" height="${rh+1}" rx="3" style="fill:var(--il-accent-soft)"/>`;
  cols.forEach((c,x)=>{const x0=L+x*cw,cx=x0+cw/2,on=kind==='c'&&!!sl&&sl.j===c.C.j&&sl.s===c.C.s,o=kind==='j'?c.J:c.C,lab=kind==='j'?c.J.J.s:cut(c.C.nm,20);
    const tip=kind==='j'?`<b>${c.J.J.n}</b><br>${ids.filter(i=>trb(tb,c.J.cs,i).k>0).length} gave up on or skipped something · ${o.t[4]?`${ids.filter(i=>trb(tb,c.J.cs,i).v<0).length} not reached yet · `:''}${c.J.cs.length} ${pl(c.J.cs.length,'question')}<br><span>Click to open it</span>`
      :`<b>${c.C.nm}</b><br>${o.t[2]} gave up · ${o.t[3]} skipped · ${o.t[1]} needed retries · ${o.t[0]} first time${o.t[4]?` · ${o.t[4]} not reached yet`:''}`;
    s+=`<g class="hit" ${kind==='j'?`data-act="v8gj" data-j="${c.J.j}"`:`data-act="v8c" data-j="${c.C.j}" data-s="${c.C.s}"`} tabindex="0" role="button" aria-label="${kind==='j'?`${c.J.J.n}: open it`:`${c.C.nm}: pick it`}"${tp(tip)}><rect x="${x0}" y="0" width="${cw}" height="${H}" fill="transparent"/>`
      +(kind==='c'?gIc(cx-Math.min(12,cw-2)/2,Ht-16,itemKey(c.C.f,c.C.type),Math.min(12,cw-2)):'')
      +`<text transform="translate(${f1(cx+3)} ${Ht-(kind==='c'?20:6)}) rotate(-55)" class="${on?'tacc':'t2'}"${on?' font-weight="700"':''}>${esc(lab)}</text>`
      +ord.map((r,ri)=>{const v=M[r.ix][x];return `<rect x="${x0+1}" y="${Ht+ri*rh+1}" width="${cw-2}" height="${rh-2}" rx="1.5" style="fill:${v.f};stroke:${v.na?'var(--il-na-line)':'none'}"/>`}).join('')
      +(on?`<rect x="${x0+.5}" y="${Ht-1}" width="${cw-1}" height="${ids.length*rh+2}" rx="2" style="fill:none;stroke:var(--il-accent);stroke-width:1.6"/>`:'')+'</g>'});
  ord.forEach((r,ri)=>{const y=Ht+ri*rh+rh-3;s+=`<g class="hit" data-act="stu" data-i="${r.i}">${T(L-8,y,NM[r.i],{a:'end',c:r.i===su?'tacc':'t1'})}</g>`});
  return s+'</svg>'}

/* ---------- Stall points, five plainer versions, as simple graphs (asked 2026-10-26: none of v1 to v5 reads quickly; then, of a first
   plainer five in words, labels and cards: "the visualization should be based on some graphs") ----------
   Charts a teacher already knows, on counts of students: a bar chart, rings, columns along the course, a funnel and a map of the course.
   Nothing is pooled: a lesson or unit shows its worst question, or how many of its questions are stall points or often skipped. Red and amber
   are strong only on a stall point or an often skipped question, and pale below the page's lines.
   v6 bars, two a row on a track of the whole class; v7 rings, as on Ready for a unit; v8 columns, a pair a lesson in course order, opening to a
   lesson's questions; v9 a funnel a question, got to it, tried it, got it right; v10 a map of the course, a tile a lesson */
const SPW=LABV?'Hardest lab':'Stall point';   // the panel's own pills
const isSt8=C=>C.n>0&&C.t[2]/C.n>=HOT7,isSk8=C=>C.n>0&&C.t[3]/C.n>=.29;
const minGU=n=>Math.ceil(HOT7*n-1e-9),minSK=n=>Math.ceil(.29*n-1e-9);   // the fewest students that make one, in a class of n
/* a lesson or unit by its questions, as the panel names one (a stall point before often skipped): its stall points, its often skipped ones,
   the ones nobody has reached, where the most gave up, where the most skipped, and the worst: the most who gave up or skipped, the most who
   gave up breaking a tie */
const roll8=cs=>{const top=f=>cs.reduce((a,C)=>f(C)>(a?f(a):0)?C:a,null);return {st:cs.filter(isSt8),sk:cs.filter(C=>isSk8(C)&&!isSt8(C)),na:cs.filter(C=>C.t[4]===C.n),gu:top(C=>C.t[2]),kp:top(C=>C.t[3]),w:top(C=>C.t[2]+C.t[3]+C.t[2]/1e3)}};
/* a lesson's or unit's students, each once by the worst of theirs there (asked 2026-10-26, when 2.6's ring read all fine because each of its
   questions had 8 to 10 skipped, under the line, though 8 students had skipped every one): gave up on something, else skipped something, else
   got all they reached, else not reached any of it yet; and how many skipped every one of its questions */
const who8=(tb,cs,ids)=>{const w={gu:0,sk:0,ok:0,na:0,all:0};ids.forEach(i=>{let g=0,k=0,r=0;cs.forEach(C=>{const o=cOut(tb,C.j)[C.s][i];if(o===2)g=1;else if(o===3)k++;else if(o===0||o===1)r=1});
  w[g?'gu':k?'sk':r?'ok':'na']++;if(cs.length&&k===cs.length)w.all++});return w};
const GUS=LABV?'have a lab not running yet':'gave up on something';
const wst8=C=>(C.t[2]+C.t[3])*1e3+C.t[2];   // worst first: the most who gave up or skipped, then the most who gave up
const nobody8=cs=>cs.every(C=>C.t[4]===C.n);   // nobody has reached any of it yet
const GUW=LABV?'have not got it to run':OUTV[2].toLowerCase(),NONE8=`Nobody ${LABV?'is stuck':'gave up or skipped'}`;
const guCol=C=>isSt8(C)?CGU:'var(--il-tr-2)',skCol=C=>isSk8(C)?'var(--il-st-sk)':'var(--il-sk-2)';   // strong past the page's line, pale below it
const pc8=(v,n)=>f1(n?v/n*100:0);
/* a scale of students: round ticks, evenly spaced, up to the class */
const ax8=n=>{const st=n<=12?2:n<=30?5:n<=80?10:50,tk=[];for(let v=0;v<=n;v+=st)tk.push(v);return tk};
const HEAD8=n=>`<span class="vk b6 hd"><span class="b6l"><span class="b6a">${ax8(n).map(v=>`<i style="left:${pc8(v,n)}%">${v}</i>`).join('')}</span><span class="b6x">students, of ${n}</span></span></span>`;
const lane8=(segs,txt)=>`<span class="b6l"><span class="b6t">${segs.map(([w,c,na])=>`<i style="width:${w}%;background:${c}"${na?' class="na"':''}></i>`).join('')}</span><span class="b6x">${txt}</span></span>`;
const yet8=lv=>`<span class="vk b6"><span class="b6x">Nobody has reached ${lv===2?'it':'any of it'} yet</span></span>`;
/* v6: two bars a row on a track that is the whole class: who gave up, who skipped. A lesson or unit: the most on any one of its questions, named */
const bars6=(o,lv,cs)=>{if(nobody8(cs))return yet8(lv);const n=cs[0].n,r=lv===2?null:roll8(cs),g=lv===2?o:r.gu,k=lv===2?o:r.kp;
  const lab=(C,q,w,c)=>C&&C.t[q]?`<b${c?` class="${c}"`:''}>${C.t[q]}</b> ${w}${lv<2?`<span class="b6q"> · ${qNm(C.f,C.nm,C.type)}</span>`:''}`:`nobody ${w}`;
  return `<span class="vk b6">${lane8(g&&g.t[2]?[[pc8(g.t[2],n),guCol(g)]]:[],lab(g,2,GUW,g&&isSt8(g)?'bad':''))}${lane8(k&&k.t[3]?[[pc8(k.t[3],n),skCol(k)]]:[],lab(k,3,'skipped',k&&isSk8(k)?'watch':''))}</span>`};
/* v7: rings, as on Ready for a unit, each the whole class: gave up, skipped, got it, not reached yet, with how many gave up or skipped inside
   (asked 2026-10-26 "why is the number inside the rings sometimes using gave up and other times skipped?": it was the larger of the two, so the
   list, ordered by both together, read 29, 20, 15, 27), red for a stall point and amber for an often skipped one. On a lesson or unit each student counts once, by the worst of theirs there, so a lesson's ring shows what its questions' rings show.
   A ring with nothing to flag has no number (asked 2026-10-26) */
const ring8=(parts,r,sw)=>{const tot=parts.reduce((a,p)=>a+p[0],0),c=r+sw/2+1,C=2*Math.PI*r,on=parts.filter(p=>p[0]>0),gp=on.length>1?Math.min(2,C/60):0;let off=0,s='';
  const arc=(rr,col,w,d,o)=>`<circle cx="${c}" cy="${c}" r="${f1(rr)}" transform="rotate(-90 ${c} ${c})" style="fill:none;stroke:${col};stroke-width:${w};stroke-dasharray:${f1(d*rr/r)} ${f1(2*Math.PI*rr)};stroke-dashoffset:${f1(-o*rr/r)}"/>`;
  on.forEach(([v,col,na])=>{const L=tot?C*v/tot:0,d=Math.max(.6,L-gp);s+=arc(r,col,sw,d,off)+(na?arc(r-sw/2+.5,'var(--il-na-line)',1,d,off)+arc(r+sw/2-.5,'var(--il-na-line)',1,d,off):'');off+=L});
  return s};
/* the ring is the count: the line beside a lesson's or unit's ring names only its worst question, under one heading, and a question's ring stands
   alone; the counts are in the ring's parts and the row's hover (asked 2026-10-26, of v7: "This is looking too verbose") */
const HEAD7='<span class="vk r7 hd"><i class="r7s"></i><span class="b6x">Worst question</span></span>';
const rings7=(tb,o,lv,cs,ids)=>{const R=14,SW=6,c=R+SW/2+1,z=2*c;let parts,num,cls,txt;
  if(lv===2){const t=o.t;parts=[[t[2],CGU],[t[3],'var(--il-st-sk)'],[t[0]+t[1],'var(--il-ok-fill)'],[t[4],'var(--il-na-fill)',1]];
    num=nobody8(cs)||!(t[2]+t[3])?'':t[2]+t[3];cls=isSt8(o)?'bad':isSk8(o)?'watch':'';
    txt=nobody8(cs)?'Nobody has reached it yet':''}
  else{const w=who8(tb,cs,ids),n=ids.length,r=roll8(cs),sg=w.gu>=minGU(n),sk=w.sk>=minSK(n);parts=[[w.gu,CGU],[w.sk,'var(--il-st-sk)'],[w.ok,'var(--il-ok-fill)'],[w.na,'var(--il-na-fill)',1]];
    num=w.gu+w.sk||'';cls=sg?'bad':sk?'watch':'';
    txt=w.na===n?'Nobody has reached it yet':r.w?`<span class="b6q">${qNm(r.w.f,r.w.nm,r.w.type)}</span>`:''}
  return `<span class="vk r7"><svg viewBox="0 0 ${z} ${z}" width="${z}" height="${z}" aria-hidden="true">${ring8(parts,R,SW)}${num===''?'':`<text x="${c}" y="${f1(c+4.5)}" text-anchor="middle"${cls?` class="${cls}"`:''}>${num}</text>`}</svg><span class="b6x">${txt}</span></span>`};
/* v9: a funnel a question: how many got to it, how many of those tried it, how many of those got it right. Each step's track is the whole
   class, and the part lost at that step is coloured, amber for skipping and red for giving up. A lesson or unit: its worst question's funnel */
const fun9=(o,lv,cs)=>{if(nobody8(cs))return yet8(lv);const C=lv===2?o:roll8(cs).w;if(!C)return `<span class="vk b6"><span class="b6x">${NONE8}</span></span>`;
  const t=C.t,n=C.n,r=n-t[4],tr=r-t[3],ok=t[0]+t[1],P=v=>pc8(v,n);
  return `<span class="vk b6 f9">${lv<2?`<span class="f9q">Worst question: ${qNm(C.f,C.nm,C.type)}</span>`:''}${lane8([[P(r),'var(--il-f9-a)'],...(t[4]?[[P(t[4]),'var(--il-na-fill)',1]]:[])],`${r} got to it${t[4]?` · ${t[4]} ${OUTV[4].toLowerCase()}`:''}`)}${lane8([[P(tr),'var(--il-f9-a)'],...(t[3]?[[P(t[3]),skCol(C)]]:[])],`${tr} tried it${t[3]?` · <b${isSk8(C)?' class="watch"':''}>${t[3]}</b> skipped`:''}`)}${lane8([[P(ok),'var(--il-ok-fill)'],...(t[2]?[[P(t[2]),guCol(C)]]:[])],`${ok} got it right${t[2]?` · <b${isSt8(C)?' class="bad"':''}>${t[2]}</b> ${GUW}`:''}`)}</span>`};
/* a followed student on v8's and v10's charts: their result on a question, or on a lesson the worst of theirs (gave up, else skipped, else got
   it), in the class key's own colours */
const me8=(tb,cs,su)=>{let w=-1;cs.forEach(C=>{const o=cOut(tb,C.j)[C.s][su];if(o<0)return;const r=o===2?3:o===3?2:o===4?0:1;if(r>w)w=r});return w<0?null:[OC7[4],OC7[0],OC7[3],OC7[2]][w]};
/* v8: columns along the course, a pair a lesson in course order under its unit: the most students who gave up on one of its questions (red)
   and the most who skipped one (amber), a count over the strong ones. One scale of students with round ticks. A lesson opens to its questions,
   a pair each; the worst questions are drawn the same way */
function col8(tb,items,kind,W,su){const n=items.length?items[0].n:0,L=kind==='c'?72:40,R=8,T0=28,PH=180,LB=kind==='j'?36:150,GH=kind==='j'?24:0,H=T0+PH+LB+GH,pw=(W-L-R)/Math.max(1,items.length),cw=clamp((pw-5)/2,3,22),y=v=>T0+PH-(n?v/n*PH:0);
  let s=`<svg class="viz c8v" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="group" aria-label="${kind==='j'?'Each lesson in course order':'Each question'}: the most students who gave up on ${kind==='j'?'one of its questions':'it'}, and the most who skipped ${kind==='j'?'one':'it'}">`;
  ax8(n).forEach(v=>{s+=`<line x1="${L}" x2="${f1(W-R)}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="grid"${v?' style="opacity:.6"':''}/>`+T(L-6,y(v)+4,v,{a:'end',c:'t3'})});
  s+=T(L,T0-14,`Students, of ${n}${kind==='j'?': the most on one question of the lesson':''}`,{c:'t3'});
  items.forEach((it,x)=>{const x0=L+x*pw,cx=x0+pw/2,bar=(v,col,xx)=>v?`<rect x="${f1(xx)}" y="${f1(y(v))}" width="${f1(cw)}" height="${f1(T0+PH-y(v))}" rx="1.5" style="fill:${col}"/>`:'';
    s+=`<g class="hit" ${it.act} tabindex="0" role="button" aria-label="${it.aria}"${tp(it.tip)}><rect x="${f1(x0)}" y="${T0-6}" width="${f1(pw)}" height="${PH+LB+6}" rx="3" fill="${it.on?'var(--il-accent-soft)':'transparent'}"/>`
      +bar(it.g.v,it.g.col,cx-cw-1)+bar(it.k.v,it.k.col,cx+1)
      +(it.g.strong&&(kind==='c'||!it.k.strong||it.g.v>=it.k.v)?T(cx-cw/2-1,y(it.g.v)-4,it.g.v,{a:'middle',c:'tbad',w:700}):'')+(it.k.strong&&(kind==='c'||!it.g.strong||it.k.v>it.g.v)?T(cx+cw/2+1,y(it.k.v)-4,it.k.v,{a:'middle',c:'twatch',w:700}):'')
      +(it.me?`<rect x="${f1(cx-4)}" y="${T0+PH+3}" width="8" height="8" rx="1.5" style="fill:${it.me};stroke:var(--il-na-line)"/>`:'')
      +(kind==='c'?gIc(cx-6,T0+PH+(it.me?14:4),itemKey(it.f,it.type)):'')
      +`<text transform="translate(${f1(cx+4)} ${T0+PH+(it.me?16:10)+(kind==='c'?14:0)}) rotate(-55)" text-anchor="end" class="${it.on?'tacc':'t2'}"${it.on?' font-weight="700"':''}>${esc(it.lab)}</text></g>`});
  if(kind==='j'){let x=0;while(x<items.length){let e=x;while(e+1<items.length&&items[e+1].grp===items[x].grp)e++;const x0=L+x*pw+3,x1=L+(e+1)*pw-3,yy=T0+PH+LB+4;
    s+=`<line x1="${f1(x0)}" x2="${f1(x1)}" y1="${yy}" y2="${yy}" style="stroke:var(--il-axis);stroke-width:1"/>`+T((x0+x1)/2,yy+15,esc(cut(items[x].grp,Math.max(4,Math.floor((x1-x0)/7)))),{a:'middle',c:'t2'});x=e+1}}
  return s+'</svg>'}
/* v10: a map of the course, a row a unit and a tile a lesson in course order. A tile counts students, as v7's rings do: on a lesson, how many
   gave up on or skipped something there (each once, by the worst of theirs); on a question, how many gave up on or skipped it. Strong red once
   enough gave up to pass the page's line, strong amber once enough skipped, pale red or amber when fewer did, green when nobody did (and no
   number), empty when nobody has reached it. A lesson opens to its questions, a tile each; the worst questions are drawn the same way */
const ST10={bad:['var(--il-m-bad)','tbad'],watch:['var(--il-m-watch)','twatch'],bad2:['var(--il-m-bad2)','t2'],watch2:['var(--il-m-watch2)','t2'],good:['var(--il-m-good)','tgood'],na:['var(--il-na-fill)','t3']};
function map10(rows,kind,W){const LW=kind==='j'?150:0,tw=kind==='j'?50:156,th=kind==='j'?44:52,g=6,per=Math.max(1,Math.floor((W-LW+g)/(tw+g)));let y=0,s='';
  rows.forEach(r=>{const lines=Math.max(1,Math.ceil(r.tiles.length/per));if(r.lab){const w=r.lab.split(' '),a=[];w.forEach(x=>{if(a.length&&(a[a.length-1]+' '+x).length<=20)a[a.length-1]+=' '+x;else a.push(x)});const ln=a.length>2?[a[0],cut(a.slice(1).join(' '),20)]:a;
      ln.forEach((t,i)=>{s+=`<text x="0" y="${y+th/2+4+(i-(ln.length-1)/2)*15}" class="t1">${esc(t)}</text>`})}
    r.tiles.forEach((t,x)=>{const tx=LW+(x%per)*(tw+g),ty=y+Math.floor(x/per)*(th+g),[fill,tc]=ST10[t.st];
      s+=`<g class="hit" ${t.act} tabindex="0" role="button" aria-label="${t.aria}"${tp(t.tip)}><rect x="${tx+.5}" y="${ty+.5}" width="${tw-1}" height="${th-1}" rx="4" style="fill:${fill};stroke:${t.on?'var(--il-accent)':t.st==='na'?'var(--il-na-line)':'none'};stroke-width:${t.on?2:1}"/>`
        +(kind==='j'?T(tx+7,ty+15,esc(t.lab),{c:'t3'}):gIc(tx+7,ty+6,itemKey(t.f,t.type))+T(tx+23,ty+15,esc(cut(t.lab,20)),{c:'t3'}))+(t.st==='na'||!t.v?'':T(tx+7,ty+th-9,t.v,{c:tc,w:700,s:kind==='j'?15:17}))
        +(kind==='c'&&t.st!=='na'&&t.v?T(tx+(t.v>9?30:22),ty+th-10,t.w,{c:'t3'}):'')
        +(t.me?`<rect x="${tx+tw-13}" y="${ty+6}" width="8" height="8" rx="1.5" style="fill:${t.me};stroke:var(--il-na-line)"/>`:'')+'</g>'});
    y+=lines*(th+g)+(kind==='j'?10:0)});
  return `<svg class="viz m10" width="${W}" height="${Math.max(th,y-g)}" viewBox="0 0 ${W} ${Math.max(th,y-g)}" role="group" aria-label="${kind==='j'?'A map of the course: a row a unit, a tile a lesson':'A tile a question'}">${s}</svg>`}

function v8(){if(/[?&]dev=1(?:&|$)/.test(location.search))return v8Prototype();return v8Review()}
/* Parent counts are unique students per outcome, never a stacked partition. */
function stallScopeCounts(tb,cs,ids){const notCorrect=new Set(),skipped=new Set();cs.forEach(C=>{const outcomes=cOut(tb,C.j)[C.s];ids.forEach(i=>{if(outcomes[i]===2)notCorrect.add(i);if(outcomes[i]===3)skipped.add(i)})});return {notCorrect:notCorrect.size,skipped:skipped.size,total:ids.length,questions:cs.length}}
function v8Review(){const tb=S.v8.tb,K=k8(),T=tree7(tb,K),E=ex7(tb,T),ids=tbWho(tb),all=T.flatMap(U=>U.subs.flatMap(J=>J.cs)),n=ids.length,rank=S.v8.rank||'attention';
  const ordered=all.slice().sort((a,b)=>rank==='course'?a.j-b.j||a.s-b.s:rank==='skipped'?b.t[3]-a.t[3]||b.t[2]-a.t[2]:(b.t[2]+b.t[3])-(a.t[2]+a.t[3])||b.t[2]-a.t[2]);
  const rows=S.v8.focus?ordered.filter(C=>C.j+':'+C.s===S.v8.focus):S.v8.all?ordered:ordered.filter(C=>K!==null||C.t[2]>=2||C.t[3]>=3).slice(0,8),sl=selW7(tb,rows),selected=sl&&all.find(C=>C.j===sl.j&&C.s===sl.s);
  const inline=($('#view')?.clientWidth||window.innerWidth)<960;
  const resultNames=['Correct first time','Correct after retries','Tried, not yet correct','Skipped','Not reached yet'],colors=['var(--il-ok-fill)','var(--il-st-rt)','var(--il-bad)','var(--il-st-sk)','var(--il-na-fill)'];
  const outcomes=C=>{const labels=C.kind==='r'?['Tried · no working check',...resultNames.slice(1)]:resultNames,parts=C.t.map((v,q)=>({v:v-(q===0?(C.unmarked||0):0),label:labels[q],color:C.kind==='r'&&q===0?'var(--il-neutral)':colors[q]}));if(C.unmarked)parts.push({v:C.unmarked,label:'Tried · no working check',color:'var(--il-neutral)'});return `<div class="outcome-track" role="img" aria-label="${parts.map(p=>`${p.v} ${p.label.toLowerCase()}`).join('; ')}">${parts.map(p=>p.v?`<i style="width:${p.v/C.n*100}%;background:${p.color}"></i>`:'').join('')}</div><p class="hint">${parts.filter(p=>p.v).map(p=>`${p.v} ${p.label.toLowerCase()}`).join(' · ')}</p>`};
  const detail=(C,w)=>{if(!C)return '';const panelId='stall-detail-'+(w?'attention':'lesson-'+C.j),O=cOut(tb,C.j)[C.s],key=sKey7(tb,C.j,C.s),by=resultNames.map((_,q)=>ids.filter(i=>O[i]===q).map(i=>NM[i]));
    return `<aside class="stall-detail" id="${panelId}" data-scroll="${panelId}-${C.j}-${C.s}" aria-labelledby="${panelId}-title"><div class="stall-evidence-head"><span class="stall-evidence-label">Students by outcome</span><h3 id="${panelId}-title">${qNm(C.f,C.nm,C.type)}</h3></div>${C.kind==='r'?'<p class="evidence-note">This question has no working correctness check; trying it does not establish success.</p>':''}${C.t[3]/C.n>=.29?`<p>${isLogged(key)?'<span class="pill good">Coursework planned</span>':`<button class="btn primary" type="button" data-act="v8plan" data-w="${w?1:''}">Assign it as coursework</button>`}</p>`:''}<div class="dgrid">${[2,3,1,0,4].map(q=>{const names=by[q];return names.length?`<section class="stall-outcome-group" style="--il-outcome-color:${C.kind==='r'&&q===0?'var(--il-neutral)':colors[q]}"><h4><span><i class="sw" aria-hidden="true"></i>${C.kind==='r'&&q===0?'Tried · no working check':resultNames[q]}</span><b>${names.length}</b></h4>${roster(names.map(n=>({n})))}</section>`:''}).join('')}</div></aside>`};
  const outcomeLane=C=>{const colors={2:'var(--il-bad)',3:'var(--il-st-sk)',1:'var(--il-st-rt)',0:C.kind==='r'?'var(--il-neutral)':'var(--il-ok-fill)',4:'var(--il-na-fill)'},labels=C.kind==='r'?['Tried · no working check',...resultNames.slice(1)]:resultNames;
    return `<span class="composition-lane question-outcomes" role="img" aria-label="${C.t[2]+C.t[3]} of ${C.n} to review; ${C.t.map((v,q)=>`${v} ${labels[q].toLowerCase()}`).join('; ')}">${[2,3,1,0,4].map(q=>C.t[q]?`<i class="outcome-segment${q===4?' not-reached':''}" data-digits="${String(C.t[q]).length}" data-outcome="${q}" style="width:${C.n?C.t[q]/C.n*100:0}%;background:${colors[q]};color:${q===2?'var(--il-on-ny)':'var(--il-ink)'}"${tp(`${C.t[q]} of ${C.n} · ${labels[q]}`)}><span class="outcome-count" aria-hidden="true">${C.t[q]}</span></i>`:'').join('')}</span>`};
  const table=(list,picked=sl,scope='attention')=>{const primary=scope==='attention',chosen=picked&&list.find(C=>picked.j===C.j&&picked.s===C.s);
    const chart=`<div class="visual-list stall-chart" data-scroll="stall-${scope}"><div class="visual-row visual-head"><span>Question</span>${chartAxis([[0,'0'],[n/2,n/2],[n,n+' students']],n)}</div>${list.map(C=>{const on=!!chosen&&chosen.j===C.j&&chosen.s===C.s;return `<button class="visual-row visual-choice${on?' selected':''}" type="button" data-act="v8c" data-j="${C.j}" data-s="${C.s}" data-counts="${C.t.join(',')}" data-total="${C.n}" aria-pressed="${on}" aria-expanded="${on}"${on?` aria-controls="stall-detail-${primary?'attention':'lesson-'+C.j}"`:''} aria-label="${C.nm}: ${C.t[2]+C.t[3]} of ${C.n} to review; ${C.t[2]} tried, not yet correct; ${C.t[3]} skipped; inspect question"><span class="visual-name">${qNm(C.f,C.nm,C.type)}<small>${TBJ(tb,C.j).n}</small></span>${outcomeLane(C)}</button>${inline&&on?detail(C,primary):''}`}).join('')}</div>`;
    return primary?chart:`<div class="stall-layout${inline||!chosen?' is-inline':''}"><div>${chart}</div>${!inline&&chosen?detail(chosen,false):''}</div>`};


  const scopeSummary=(name,code,cs,lessonCount)=>{const c=stallScopeCounts(tb,cs,ids);
    const metric=(value,label,tone)=>`<span class="scope-count ${value?tone:'is-empty'}"><span class="scope-mobile-label">${label}</span><span class="scope-value"><b>${value}</b><span> / ${c.total}</span></span>${measureTrack(c.total?value/c.total*100:0,`${value} of ${c.total} students ${label.toLowerCase()} on at least one question`,tone)}</span>`;
    return `<summary class="scope-summary" data-not-correct="${c.notCorrect}" data-skipped="${c.skipped}" data-total="${c.total}" data-questions="${c.questions}" aria-label="${code} ${name}: ${c.notCorrect} of ${c.total} students tried but are not yet correct on at least one question; ${c.skipped} skipped at least one question. Open to see ${lessonCount===null?'questions':'lessons'}."><span class="scope-name">${CHEV}<span><b>${code}${code?' · ':''}${name}</b><small>${lessonCount===null?'':`${lessonCount} ${pl(lessonCount,'lesson')} · `}${c.questions} ${pl(c.questions,'question')}</small></span></span>${metric(c.notCorrect,'Not yet correct','bad')}${metric(c.skipped,'Skipped','watch')}</summary>`};
  const aggregate=cs=>{const t=[0,0,0,0,0];let unmarked=0;cs.forEach(C=>{C.t.forEach((v,q)=>t[q]+=v);if(C.kind==='r')unmarked+=C.t[0]});const total=t.reduce((a,v)=>a+v,0);return `<details class="scope-aggregate"><summary>All question outcomes · ${total} student–question records</summary>${outcomes({t,n:total,unmarked})}</details>`};
  const expanded=(key,fallback)=>S.fold[key]===undefined?fallback:S.fold[key];
  const pickedOutline=sel7(tb,T);
  const outline=T.filter(U=>U.on).map(U=>{const lessons=U.subs.filter(J=>J.on&&J.cs.length),cs=lessons.flatMap(J=>J.cs);
    return `<details class="scope-unit" data-fold="stall-unit-${U.u}"${expanded('stall-unit-'+U.u,E.U.includes(U.u))?' open':''}>${scopeSummary(U.U.n,U.U.s,cs,lessons.length)}<div class="scope-children">${lessons.map(J=>`<details class="scope-lesson" data-fold="stall-lesson-${J.j}"${expanded('stall-lesson-'+J.j,E.J.includes(J.j))?' open':''}>${scopeSummary(J.J.n,'',J.cs,null)}<div class="scope-lesson-body">${table(J.cs,pickedOutline,'lesson-'+J.j)}</div></details>`).join('')}${aggregate(cs)}</div></details>`}).join('');
  const ctl=pickCtl('v8rank',rank,[['attention','Most needing practice'],['skipped','Most skipped'],['course','Course order']],'Sort')+`<label class="chk" for="v8showall"><input type="checkbox" id="v8showall"${S.v8.all?' checked':''}> Show all ${all.length} questions</label>`;
  const filter=K===null?'':`<p class="rdfor"><span class="pill acc">${skNm(K)} · ${all.length} questions</span><button class="lnk" type="button" data-act="v8k">All questions</button></p>`;
  const top=`<p class="measure-note">Showing ${rows.length} of ${all.length} questions. Counts describe recorded outcomes, without inferring why a student stopped.</p>${S.v8.focus?'<button class="btn small" type="button" data-act="stallpick" data-g="">Clear question filter</button>':''}<div class="stall-layout${inline||!selected?' is-inline':''}"><div>${rows.length?table(rows):'<p class="none">No questions meet the attention threshold. Show all questions to inspect every result.</p>'}</div>${!inline?detail(selected,true):''}</div>`;
  const countHelp='<p>Not yet correct: a student tried at least one question and has not answered it correctly. Skipped: no attempt on a question, with recorded activity in the same or a later lesson. Each student counts once per column within a unit or lesson. The two groups can overlap.</p><p>All question outcomes counts student–question records, so a student can contribute several question results. Questions without a working check remain separate from correct answers.</p>';
  const hierarchy=`<p class="scope-intro">Open a unit to find its lessons and questions.</p><p class="scope-note">Counts show students with at least one question in that category. A student can be in both columns.</p><div class="stall-outline scope-compare"><div class="scope-columns" aria-hidden="true"><span>Unit / lesson</span><span>Not yet correct<small>on at least one tried question</small></span><span>Skipped<small>at least one question</small></span></div>${outline||'<p class="none">No recorded questions in this scope.</p>'}</div>${fold('stall-counts','How counts work',countHelp)}`;

  const key='<div class="legend"><span><i class="sw" style="background:var(--il-bad)"></i>Tried, not yet correct</span><span><i class="sw" style="background:var(--il-st-sk)"></i>Skipped</span><span><i class="sw" style="background:var(--il-st-rt)"></i>Correct after retries</span><span><i class="sw" style="background:var(--il-ok-fill)"></i>Correct first time</span><span><i class="sw unattempted"></i>Not reached</span><span><i class="sw" style="background:var(--il-neutral)"></i>Tried · no working check</span></div>';
  return filter+reviewSection('sp-worst','Questions needing practice','Select a question to inspect its student outcomes.','assignment',key+top,ctl)+reviewSection('sp-unit','Review by unit and lesson','Explore the students who need support in each part of the course.','book',hierarchy,'',true)}
function v8Prototype(){const tb=S.v8.tb,K=k8(),T=tree7(tb,K),ids=tbWho(tb),Tb=TB[tb],E=ex7(tb,T),slO=sel7(tb,T),srt=S.v8.sort,su=S.stu,fol=su!==null&&ids.includes(su),V=S.v8.ver;let sl=slO;
  const NEW=+V>=6;   // v6 to v10: no figure columns and no scale
  /* on v6 to v10 a lesson or unit sorts by its worst question, as its row tells it */
  const key=o=>!o.n?-1:srt==='course'?0:NEW&&(o.cs||o.subs)?(o.cs||o.subs.flatMap(J=>J.cs)).reduce((a,C)=>Math.max(a,C.n?C.t[srt==='gu'?2:3]/C.n:0),0):srt==='gu'?o.t[2]/o.n:srt==='sk'?o.t[3]/o.n:0;
  const ord=a=>srt==='course'?a:a.slice().sort((x,y)=>key(y)-key(x));
  const pc=(o,q,cls)=>`<span class="hp ${cls}">${o.n?Math.round(o.t[q]/o.n*100)+'%':''}</span>`;
  const nums=(o,lv)=>pc(o,2,'g'+(lv===2&&o.t[2]/o.n>=HOT7?' hot':''))+pc(o,3,'k'+(lv===2&&o.t[3]/o.n>=.29?' warm':''));
  const bar=(o,lv)=>{const w=v=>f1(v/o.n*100);return `<span class="hb b${lv}" aria-hidden="true"><i style="width:${w(o.t[2])}%;background:${CGU}"></i><i style="width:${w(o.t[3])}%;background:var(--il-st-sk)"></i><i style="width:${w(o.t[1])}%;background:var(--il-st-rt)"></i><i style="width:${w(o.t[0])}%;background:var(--il-ok-fill)"></i><i class="na" style="width:${w(o.t[4])}%"></i></span>`};
  /* the row's mark in the version picked: the current bar, or v1, v2, v3, v5, v6, v7 or v9's; v2, v6, v7 and v9 carry their own counts, so the two columns go */
  const gfx=(o,lv,cs)=>V==='1'?dvBar(o,lv):V==='2'?clRow(o,lv):V==='3'?dtRow(o,lv,cs):V==='5'?ppRow(tb,lv,cs,ids):V==='6'?bars6(o,lv,cs):V==='7'?rings7(tb,o,lv,cs,ids):V==='9'?fun9(o,lv,cs):bar(o,lv);
  const numsV=(o,lv)=>V==='2'||NEW?'':nums(o,lv);
  const headV=o=>(V==='1'?DVHEAD:V==='2'?CLHEAD():V==='3'?DTHEAD:V==='6'||V==='9'?HEAD8(ids.length):V==='7'&&o?HEAD7:'');   // o: the outline, whose lessons name their worst question
  const headN=()=>V==='2'||NEW?'':`<span class="hp g">${LABV?'Not right yet':'Gave up'}</span><span class="hp k">Skipped</span>`;
  /* the followed student: their outcome on each piece of content, and on a unit or subunit how many they gave up on or skipped */
  const oc=(j,s)=>cOut(tb,j)[s][su];
  const smC=C=>{const o=oc(C.j,C.s);return o<0?'':`${pm7(o)}<span class="sr">${NM[su]}: ${OUTV[o].toLowerCase()}</span>`};
  const smR=cs=>{let g=0,k=0;cs.forEach(C=>{const o=oc(C.j,C.s);if(o===2)g++;else if(o===3)k++});return (g?`<span class="pmn">${pm7(2)}${g}</span>`:'')+(k?`<span class="pmn">${pm7(3)}${k}</span>`:'')+(g||k?`<span class="sr">${NM[su]}: ${[g?(LABV?'not right yet on ':'gave up on ')+g:'',k?'skipped '+k:''].filter(Boolean).join(', ')}</span>`:'')};
  const sc=f=>fol?`<span class="hs">${f()}</span>`:'';
  const tipR=(name,cs)=>{const gs=new Set(),ks=new Set(),ns=new Set();cs.forEach(C=>{const O=cOut(tb,C.j)[C.s];ids.forEach(i=>{if(O[i]===2)gs.add(i);else if(O[i]===3)ks.add(i);else if(O[i]===4)ns.add(i)})});
    return `<b>${name}</b><br>${gs.size} ${pl(gs.size,'student')} ${LABV?'have a lab here not right yet':'gave up on something here'} · ${ks.size} skipped something${ns.size?` · ${ns.size} ${pl(ns.size,'has','have')} not reached all of it yet`:''}<br><span>The bar pools all ${cs.length} ${LABV?'labs':'pieces of content'}</span>`};
  const off=(lv,name,txt)=>`<div class="hr l${lv} off"><span class="hn"><span class="chs"></span>${name}</span><span class="hx">${txt}</span><span class="hp g"></span><span class="hp k"></span>${fol?'<span class="hs"></span>':''}</div>`;
  const cRow=C=>{const on=!!sl&&sl.j===C.j&&sl.s===C.s,t=C.t;
    return `<li><button type="button" class="hr l2${on?' on':''}" data-act="v8c" data-j="${C.j}" data-s="${C.s}" aria-pressed="${on}"${tp(`<b>${C.nm}</b><br>${C.kind==='r'?`${t[0]} tried it · ${t[3]} skipped · nothing marks it right`:`${t[0]} ${OUTV[0].toLowerCase()} · ${t[1]} ${OUTV[1].toLowerCase()}<br>${t[2]} ${OUTV[2].toLowerCase()} · ${t[3]} skipped`}${t[4]?` · ${t[4]} not reached yet`:''}`)}><span class="hn"><span class="chs"></span><span>${qNm(C.f,C.nm,C.type)}</span></span>${gfx(C,2,[C])}${numsV(C,2)}${sc(()=>smC(C))}</button></li>`};
  const jRow=J=>{if(!J.on||!J.cs.length)return `<li>${off(1,J.J.n,J.on?'No content yet':'Not started')}</li>`;const o=E.J.includes(J.j);
    return `<li><button type="button" class="hr l1" data-act="v8sub" data-j="${J.j}" aria-expanded="${o}"${tp(tipR(J.J.n,J.cs))}><span class="hn">${CHEV}<span>${J.J.n}</span></span>${gfx(J,1,J.cs)}${numsV(J,1)}${sc(()=>smR(J.cs))}</button>${o?`<ul>${ord(J.cs).map(cRow).join('')}</ul>`:''}</li>`};
  const uRow=U=>{if(!U.on)return `<li class="hu">${off(0,`<b>${U.U.nb}</b>`,'Not started')}</li>`;const o=E.U.includes(U.u),cs=U.subs.flatMap(J=>J.cs);
    return `<li class="hu"><button type="button" class="hr l0" data-act="v8unit" data-u="${U.u}" aria-expanded="${o}"${tp(tipR(U.U.n,cs))}><span class="hn">${CHEV}<b>${U.U.nb}</b></span>${gfx(U,0,cs)}${numsV(U,0)}${sc(()=>smR(cs))}</button>${o?`<ul>${ord(U.subs.filter(J=>J.on)).map(jRow).join('')}${nsRow(U.subs.filter(J=>!J.on).map(J=>`<i${tp(J.J.n)}>${J.J.s}</i>`))}</ul>`:''}</li>`};
  const note=[ids.length<NM.length?`${ids.length} of ${NM.length} students use ${Tb.n}.`:'',su!==null&&!fol?`${NM[su]} doesn’t use it.`:''].filter(Boolean).join(' ');
  /* both views on the page, worst questions first: the questions where the most students gave up or skipped, then the outline of the book;
     the version picks how both are drawn, and Show and Sort sit in the By unit section */
  const ctl=toHead(pickCtl('v8ver',V,SVV,'Version')),ctlU=!['4','8','10'].includes(V)?`<span class="sel">Show ${seg('v8lvl',level7(tb,T),[['u','Units'],['j','Subunits'],['c','Content']],'Show rows down to')}</span><label class="sel" for="v8sort">Sort <select id="v8sort">${[['course','Course order'],['gu','Most gave up first'],['sk','Most skipped first']].map(([v,l])=>`<option value="${v}"${srt===v?' selected':''}>${l}</option>`).join('')}</select></label>`:'';
  const worst=worstQs(T,K),slW=selW7(tb,worst),nK=K===null?0:T.reduce((a,U)=>a+U.subs.reduce((b,J)=>b+J.cs.length,0),0);
  /* narrowed to one skill: a bar says which, with the way back to every question, as a group on Ready for a unit does */
  const kbar=K===null?'':`<p class="rdfor"><span class="pill acc">${skNm(K)} · ${nK} ${pl(nK,'question')}</span><button class="lnk" type="button" data-act="v8k">All questions</button></p>`;
  const wRow=C=>{const on=!!sl&&sl.j===C.j&&sl.s===C.s,t=C.t;
    return `<li><button type="button" class="hr l0${on?' on':''}" data-act="v8c" data-j="${C.j}" data-s="${C.s}" aria-pressed="${on}"${tp(`<b>${C.nm}</b> · ${TBJ(tb,C.j).n}<br>${C.kind==='r'?`${t[0]} tried it · ${t[3]} skipped · nothing marks it right`:`${t[0]} ${OUTV[0].toLowerCase()} · ${t[1]} ${OUTV[1].toLowerCase()}<br>${t[2]} ${OUTV[2].toLowerCase()} · ${t[3]} skipped`}${t[4]?` · ${t[4]} not reached yet`:''}`)}><span class="hn"><span>${qNm(C.f,C.nm,C.type)}<span class="tg">${TBJ(tb,C.j).s}</span></span></span>${V==='now'?bar(C,1):gfx(C,2,[C])}${numsV(C,2)}${sc(()=>smC(C))}</button></li>`};
  const noneW=worst.length?'':'<p class="none">Nobody has given up on or skipped a question yet.</p>',allK=nK>worst.length?`<p class="hint" style="margin:8px 0 0"><button class="lnk" type="button" data-act="v8allk">All ${nK} by unit</button></p>`:'';
  const wList=()=>`<ul class="hc v7 vs${V}${fol?' fol':''}" aria-label="The questions${K===null?'':' on '+ASK[K]} where the most students gave up or skipped, worst first"><li class="hh" aria-hidden="true"><div class="hr"><span class="hn"></span><span class="hx">${headV()}</span>${headN()}${fol?`<span class="hs">${NM[su]}</span>`:''}</div></li>${worst.map(wRow).join('')}</ul>${noneW}${allK}`;
  /* v4: a grid of students by every started lesson, or by the questions of the lesson opened, or by the worst questions */
  const GJ=V==='4'&&S.v8.gj!==null?T.flatMap(U=>U.subs).find(J=>J.j===S.v8.gj&&J.on&&J.cs.length):null;if(V==='4'&&!GJ)S.v8.gj=null;
  const gKind=vw=>vw==='outline'&&!GJ?'j':'c',da8=duoW(.6,560);
  const gridOf=vw=>{const k=gKind(vw),gj=vw==='outline'?GJ:null,cols=k==='j'?T.filter(U=>U.on).flatMap(U=>U.subs.filter(J=>J.on&&J.cs.length).map(J=>({J}))):(gj?gj.cs:worst).map(C=>({C}));
    return (gj?`<p class="rdfor"><span class="pill acc">${gj.J.n}</span><button class="lnk" type="button" data-act="v8gj" data-j="">All lessons</button></p>`:'')+(cols.length?fig(grid8(tb,cols,k,ids,da8||VW(),sl,fol?su:null)):'<p class="none">Nothing has started yet.</p>')};
  const DTKEY=`<span class="lt">Share of the class</span><span><i class="vdk" style="background:${CGU}"></i>${OUTV[2]}</span><span><i class="vdk" style="background:var(--il-st-sk)"></i>Skipped</span><span><i class="vdk vd2"></i>Each question of a lesson or unit</span><span><i class="vtkk"></i>All of it</span>`;
  const n8=ids.length,sw8=c=>`<i class="sw" style="background:${c}"></i>`,NA8='<i class="sw na"></i>';
  const KEY6=`<span class="lt">Students, of the ${n8}</span><span>${sw8(CGU)}${sw8('var(--il-tr-2)')}${OUTV[2]}: strong from ${minGU(n8)}, a ${SPW.toLowerCase()}</span><span>${sw8('var(--il-st-sk)')}${sw8('var(--il-sk-2)')}Skipped: strong from ${minSK(n8)}, often skipped</span>`;
  const KEYQ=`<span>${sw8(CGU)}${OUTV[2]}</span><span>${sw8('var(--il-st-sk)')}Skipped</span><span>${sw8('var(--il-ok-fill)')}Got it</span><span>${NA8}${OUTV[4]}</span>`;
  /* the followed student on v8's and v10's charts: a square in the class key's colours, their result (on a lesson, the worst of theirs) */
  const KEYME=fol?`<i class="ksep" aria-hidden="true"></i><span class="lt"><b class="me8">${NM[su]}</b></span>${KEYQ}`:'';
  const LEG8=vw=>({'6':KEY6,'7':`<span class="lt">Students</span>${KEYQ}<span>in the ring: gave up or skipped${vw==='outline'?', each student once, at their worst':''}</span>`,
    '8':KEY6+KEYME,'9':`<span class="lt">Students, of the ${n8}</span><span>${sw8('var(--il-f9-a)')}Got to it, tried it</span><span>${sw8('var(--il-ok-fill)')}Got it right</span><span>${sw8('var(--il-st-sk)')}${sw8('var(--il-sk-2)')}Skipped</span><span>${sw8(CGU)}${sw8('var(--il-tr-2)')}${OUTV[2]}</span><span>${NA8}${OUTV[4]}</span>`,
    '10':`<span class="lt">Students</span><span>${sw8('var(--il-m-bad)')}${minGU(n8)} or more of the ${n8} ${GUW}</span><span>${sw8('var(--il-m-watch)')}${minSK(n8)} or more skipped</span><span>${sw8('var(--il-m-bad2)')}${sw8('var(--il-m-watch2)')}fewer</span><span>${sw8('var(--il-m-good)')}nobody</span><span>${NA8}${OUTV[4]}</span>`+KEYME})[V];
  const legOf=vw=>NEW?(LEG8(vw)?`<div class="legend mleg">${LEG8(vw)}</div>`:''):`<div class="legend mleg">${V==='3'?DTKEY:V==='4'&&gKind(vw)==='j'?TRKEY('A student in a lesson'):OUTLEG7(fol&&V!=='4'?`Students and ${NM[su]}`:'Students')}${V==='5'&&vw==='outline'?`<i class="ksep" aria-hidden="true"></i>${TRKEY('A student in a lesson or unit')}`:''}</div>`;
  const list=()=>`<ul class="hc v7 vs${V}${fol?' fol':''}" aria-label="${Tb.n}: where students gave up, skipped or needed retries, by unit, subunit and content"><li class="hh" aria-hidden="true"><div class="hr"><span class="hn"></span><span class="hx">${headV(1)}</span>${headN()}${fol?`<span class="hs">${NM[su]}</span>`:''}</div></li>${treeBody(T,ord,uRow,U=>`<i>${U.U.nb}</i>`)}</ul>${labsNote('they are not listed with the questions')}`;
  /* v8 and v10: one chart for the page. By unit, every started lesson in course order; a lesson opens to its questions, with the way back
     above; the worst questions are drawn the same way */
  const OJ=(V==='8'||V==='10')&&S.v8.oj[tb]!=null?T.flatMap(U=>U.subs).find(J=>J.j===S.v8.oj[tb]&&J.on&&J.cs.length)||null:null;if((V==='8'||V==='10')&&!OJ)S.v8.oj[tb]=null;
  const back8=OJ?`<nav class="crumbs" aria-label="Where you are in ${Tb.n}"><button class="lnk" type="button" data-act="v8oj" data-j="">All lessons</button><span class="sep" aria-hidden="true">›</span><b>${OJ.J.n}</b></nav>`:'';
  const nsP=!OJ?(ns=>ns.length?`<p class="hint" style="margin:8px 0 0">Not started yet: ${ns.map(U=>U.U.s).join(', ')}</p>`:'')(T.filter(U=>!U.on)):'',W8=duoW(.6,560)||VW();
  const qTip=C=>`<b>${C.nm}</b> · ${TBJ(tb,C.j).s}<br>${C.t[2]} ${GUW} · ${C.t[3]} skipped · ${C.t[0]+C.t[1]} got it${C.t[4]?` · ${C.t[4]} ${OUTV[4].toLowerCase()}`:''}<br><span>Click to see who</span>`;
  const jTip=(J,r)=>`<b>${J.J.n}</b><br>${r.st.length} ${pl(r.st.length,SPW.toLowerCase())} · ${r.sk.length} often skipped · of ${J.cs.length} ${pl(J.cs.length,'question')}<br>${r.gu?`Most who ${GUW} on one: ${r.gu.t[2]}, ${r.gu.nm}`:`Nobody ${GUW}`}<br>${r.kp?`Most who skipped one: ${r.kp.t[3]}, ${r.kp.nm}`:'Nobody skipped'}<br><span>Click to open its questions</span>`;
  const lsn8=T.filter(U=>U.on).flatMap(U=>U.subs.filter(J=>J.on&&J.cs.length).map(J=>({U,J,r:roll8(J.cs)})));
  const it8q=C=>({n:C.n,f:C.f,lab:cut(C.nm,24),act:`data-act="v8c" data-j="${C.j}" data-s="${C.s}"`,aria:`${C.nm}: ${C.t[2]} ${GUW}, ${C.t[3]} skipped`,tip:qTip(C),on:!!sl&&sl.j===C.j&&sl.s===C.s,
    g:{v:C.t[2],col:guCol(C),strong:isSt8(C)},k:{v:C.t[3],col:skCol(C),strong:isSk8(C)},me:fol?me8(tb,[C],su):null});
  const it8j=({U,J,r})=>({n:ids.length,lab:J.J.s,grp:U.U.nb,act:`data-act="v8oj" data-j="${J.j}"`,aria:`${J.J.n}: at most ${r.gu?r.gu.t[2]:0} ${GUW} and ${r.kp?r.kp.t[3]:0} skipped on one question`,tip:jTip(J,r),on:false,
    g:{v:r.gu?r.gu.t[2]:0,col:r.gu?guCol(r.gu):'',strong:!!r.gu&&isSt8(r.gu)},k:{v:r.kp?r.kp.t[3]:0,col:r.kp?skCol(r.kp):'',strong:!!r.kp&&isSk8(r.kp)},me:fol?me8(tb,J.cs,su):null});
  const chart8=vw=>vw!=='outline'?fig(col8(tb,worst.map(it8q),'c',W8,su))+noneW+allK:back8+fig(OJ?col8(tb,OJ.cs.map(it8q),'c',W8,su):col8(tb,lsn8.map(it8j),'j',W8,su))+nsP;
  const st10=(gu,sk,nb)=>nb?'na':gu>=minGU(ids.length)?'bad':sk>=minSK(ids.length)?'watch':gu+sk?(gu>=sk?'bad2':'watch2'):'good';
  const t10q=C=>({f:C.f,lab:C.nm,st:st10(C.t[2],C.t[3],nobody8([C])),v:C.t[2]+C.t[3],w:'gave up or skipped',act:`data-act="v8c" data-j="${C.j}" data-s="${C.s}"`,aria:`${C.nm}: ${C.t[2]} ${GUW}, ${C.t[3]} skipped`,tip:qTip(C),on:!!sl&&sl.j===C.j&&sl.s===C.s,me:fol?me8(tb,[C],su):null});
  const t10j=({J,r})=>{const w=who8(tb,J.cs,ids);return {lab:J.J.s,st:st10(w.gu,w.sk,w.na===ids.length),v:w.gu+w.sk,act:`data-act="v8oj" data-j="${J.j}"`,aria:`${J.J.n}: ${w.gu+w.sk} gave up on or skipped something there: ${w.gu} ${GUS}, ${w.sk} skipped something`,
    tip:`<b>${J.J.n}</b><br>${w.gu} ${GUS} · ${w.sk} skipped something${w.all?` (${w.all} all of it)`:''} · ${w.ok} got all they reached${w.na?` · ${w.na} ${OUTV[4].toLowerCase()}`:''}${r.w?`<br>Worst question: ${r.w.nm}, ${r.w.t[2]} ${GUW}, ${r.w.t[3]} skipped`:''}<br><span>Click to open its ${J.cs.length} questions</span>`,on:false,me:fol?me8(tb,J.cs,su):null}};
  const map10h=vw=>vw!=='outline'?fig(map10([{lab:'',tiles:worst.map(t10q)}],'c',W8))+noneW+allK:back8+fig(OJ?map10([{lab:'',tiles:OJ.cs.map(t10q)}],'c',W8):map10(T.filter(U=>U.on).map(U=>({lab:U.U.nb,tiles:lsn8.filter(o=>o.U===U).map(t10j)})),'j',W8))+nsP;
  /* a card's panel: the piece of content picked in that card (the worst questions and the outline each keep their own pick) */
  const detOf=(sl,w)=>{if(!sl)return '';const U0=T.find(U=>U.subs.some(J=>J.j===sl.j)),J0=U0.subs.find(J=>J.j===sl.j),C0=J0.cs.find(C=>C.s===sl.s),c=C0.t,n=C0.n,O=cOut(tb,sl.j)[sl.s];
  const by=[0,1,2,3,4].map(q=>ids.filter(i=>O[i]===q).map(i=>NM[i])),stall=c[2]/n>=HOT7,skp=c[3]/n>=.29;
  const nt=((tb===0?STALL[sl.j]:XSTALL[tb+':'+sl.j])||{})[sl.s],pk=sKey7(tb,sl.j,sl.s);
  return `<div class="detail"><div class="dhead"><h3>${qNm(C0.f,C0.nm,C0.type)}</h3><span class="hint">${J0.J.s}</span>${stall?`<span class="pill bad">${LABV?'Hardest lab':'Stall point'}</span>`:skp?'<span class="pill watch">Often skipped</span>':''}${skp?(isLogged(pk)?'<span class="pill good">Planned</span>':`<button class="btn small primary" type="button" data-act="v8plan" data-w="${w?1:''}">Assign it as coursework</button>`):''}</div>
  ${nt?`<p class="dtext">${nt}</p>`:''}<div class="dgrid">${by[2].length?whoCol(OUTV[2],CGU,by[2]):''}${by[3].length?whoCol('Skipped','var(--il-st-sk)',by[3]):''}${C0.kind!=='r'&&by[1].length?whoCol(OUTV[1],'var(--il-st-rt)',by[1]):''}${by[4].length?whoCol(OUTV[4],'var(--il-na-fill)',by[4]):''}${!by[2].length&&!by[3].length?`<p class="none">${LABV?'Everyone who tried this lab got it to run.':'Nobody gave up on or skipped this.'}</p>`:''}</div></div>`};
  const mainOf=vw=>V==='4'?gridOf(vw):V==='8'?chart8(vw):V==='10'?map10h(vw):vw==='outline'?list():wList();
  const svT=vw=>{const t=SVT[V]||SVT.now;return vw!=='outline'?t[0]:V==='4'&&GJ?'Each student on each question':(V==='8'||V==='10')&&OJ?'Students who gave up or skipped':t[1]};
  /* each view is a card, named by its chart: the chart, and beside it the panel for the question picked in it */
  const withP=(m,d)=>d?duo(da8,m,d,'stick'):stage(Math.min(VW(),960),m);
  sl=slW;const wB=legOf('worst')+withP(mainOf('worst'),detOf(slW,true));sl=slO;const oB=legOf('outline')+withP(mainOf('outline'),detOf(slO,false));
  const secs=pvSec('sp-worst',svT('worst'),wB)+pvSec('sp-unit',svT('outline'),oB,ctlU);
  return (note?`<p class="hint" style="margin:0 0 10px">${note}</p>`:'')+ctl+kbar+secs}

/* ---------- view 10: fade slopes ---------- */
const fadeKind=d=>d<=-8?'fade':d>=5?'up':'flat';
const dTxt=d=>`${d<=-.5?'−':d>=.5?'+':''}${Math.abs(Math.round(d))}`;
const PREK=new Set(PRE.map(q=>q.k));
function h10(){if(!FD.length)return 'No skill has been checked again 21 days or more after it was taught.';const f=FD.filter(o=>fadeKind(o.d)==='fade').sort((a,b)=>a.d-b.d);if(!f.length)return `None of the ${FD.length} skills checked again later has faded.`;
  const top=f[0];
  return `${SK[top.k]} was ${Math.round(top.a)}% when first met and was ${Math.round(top.b)}% on later checks: ${f.length} of ${FD.length} rechecked skills faded.`}
/* A fixed score scale is shared by class and student rows. Initial/later windows are evidence windows, not deadlines. */
function fadeEvidence(k,i){const ids=i===undefined?ALL.filter(s=>ML[s][k]!==null):[i],a=[],b=[];ids.forEach(s=>{const ev=(EVD[s][k]||[]).filter(e=>e.d<=LASTDAY);if(!ev.length)return;const cut=ev[0].d+RECHECK;ev.forEach(e=>(e.d<cut?a:b).push(e.d))});
  const span=ds=>!ds.length?'No evidence':dayDate(Math.min(...ds))+(Math.max(...ds)>Math.min(...ds)?'–'+dayDate(Math.max(...ds)):'');return {a:span(a),b:span(b),an:a.length,bn:b.length,n:ids.length}}
const fadeTrack=(a,b,col)=>`<svg class="fade-track" viewBox="0 0 220 26" role="img" aria-label="Score scale 0 to 100: initial ${Math.round(a)}, later ${Math.round(b)}"><line x1="10" x2="210" y1="13" y2="13" style="stroke:var(--il-rule);stroke-width:2"/>${[0,20,40,60,80,100].map(v=>`<line x1="${10+2*v}" x2="${10+2*v}" y1="7" y2="19" style="stroke:var(--il-rule);stroke-width:1"/>`).join('')}<line x1="${10+2*a}" x2="${10+2*b}" y1="13" y2="13" style="stroke:${col};stroke-width:4;opacity:.55"/><circle cx="${10+2*a}" cy="13" r="4.5" style="fill:var(--il-surface);stroke:var(--il-ink-3);stroke-width:1.6"/><circle cx="${10+2*b}" cy="13" r="5" style="fill:${col};stroke:var(--il-surface);stroke-width:1.5"/></svg>`;
const fadeScale='<span class="fade-scale"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>';
const fadeScoreAxis=label=>`<div class="fade-score-axis"><span class="fade-axis-label">${label} (out of 100)</span>${chartAxis([0,20,40,60,80,100].map(v=>[v,v]))}</div>`;
const fadeLegend='<div class="legend"><span><i class="fade-open"></i>Initial checks</span><span><i class="fade-solid"></i>Later checks · at least 21 days after each student’s first check</span></div>';
function v10(){const Z=S.v10,sel=S.stu,inU=FD.filter(o=>Z.u==='all'||uOf(o.k)===+Z.u),rows=inU.filter(o=>Z.all||fadeKind(o.d)==='fade').slice().sort((a,b)=>a.d-b.d||a.k-b.k);
  if(!rows.some(o=>o.k===Z.k))Z.k=-1;const fdu=[...new Set(FD.map(o=>uOf(o.k)))];if(MULTI)fdu.sort((a,b)=>a-b);
  const ctl=toHead(`${pickCtl('v10unit',Z.u,[['all','All units']].concat(fdu.map(u=>[String(u),`${TB0[u].s} · ${TB0[u].nb}`])),'Unit')}<label class="chk" for="v10all"><input type="checkbox" id="v10all"${Z.all?' checked':''}> Show all ${inU.length} rechecked skills</label>`);
  if(!rows.length)return ctl+`<p class="none">${Z.all?'No skill here has at least two later checks for eight students.':`No skill here has faded.${inU.length?` Select “Show all” for the ${inU.length} skills rechecked later.`:''}`}</p>`;
  const table=`<div class="table-scroll fade-exact-scroll" data-scroll="faded-figures"><table class="metric-table fade-table"><caption class="sr">Initial and later class averages out of 100, exact evidence windows, score changes and rechecked students</caption><colgroup><col class="fade-col-skill"><col class="fade-col-initial"><col class="fade-col-later"><col class="fade-col-comparison"><col class="fade-col-change"><col class="fade-col-rechecked"><col class="fade-col-action"></colgroup><thead><tr><th scope="col">Skill</th><th scope="col"><span class="fade-col-label"><i class="fade-open" aria-hidden="true"></i>Initial average</span><small>score out of 100</small></th><th scope="col"><span class="fade-col-label"><i class="fade-solid" aria-hidden="true"></i>Later average</span><small>score out of 100</small></th><th scope="col">Average mastery score${fadeScale}</th><th scope="col">Change<small>points</small></th><th scope="col">Rechecked<small>out of ${N} students</small></th><th scope="col">Details</th></tr></thead><tbody>${rows.map(o=>{const kd=fadeKind(o.d),tone=kd==='fade'?'bad':kd==='up'?'good':'neutral',col=kd==='fade'?'var(--il-bad)':kd==='up'?'var(--il-good)':'var(--il-neutral)',ev=fadeEvidence(o.k),change=Math.round(o.b)-Math.round(o.a),on=o.k===Z.k;return `<tr class="${on?'selected':''}" data-skill="${o.k}" data-state="${tone}"><th scope="row"><span class="fade-skill-name">${skNm(o.k)}</span>${PREK.has(o.k)?`<small class="fade-prerequisite">${engIcon('book')}Needed for ${TB0[CU].s}</small>`:''}</th><td class="fade-score-cell" data-label="Initial average · out of 100"><b>${Math.round(o.a)}</b><small>${ev.a}</small></td><td class="fade-score-cell fade-later-score" data-label="Later average · out of 100"><b>${Math.round(o.b)}</b><small>${ev.b}</small></td><td class="fade-comparison-cell" data-label="Average mastery score · out of 100">${fadeTrack(o.a,o.b,col)}<span class="fade-row-scale" aria-hidden="true">${fadeScale}</span></td><td data-label="Change · points"><span class="fade-change" data-state="${tone}">${change<0?IC.down:change>0?IC.up:'<span aria-hidden="true">–</span>'}<b>${dTxt(change)}</b></span></td><td data-label="Rechecked · out of ${N} students"><b class="fade-rechecked">${o.n}</b><small class="fade-student-drop${o.sl.length?' has-drops':''}">${o.sl.length?IC.down:''}${o.sl.length} down 20+ pts</small></td><td data-label="Details"><button type="button" class="btn small" data-act="v10line" data-k="${o.k}" aria-pressed="${on}"${on?' aria-controls="fade-evidence"':''} aria-label="${on?'Close':'Inspect'} ${SK[o.k]} evidence">${on?'Close':'Inspect'}</button></td></tr>`}).join('')}</tbody></table></div>`;

  const graph=`<div class="visual-list fade-chart" data-scroll="faded">${chartHead('Skill',fadeScoreAxis('Average mastery score'),'Change')}${rows.map(o=>{const kd=fadeKind(o.d),on=o.k===Z.k,col=kd==='fade'?'var(--il-bad)':kd==='up'?'var(--il-good)':'var(--il-ink-3)';return `<button class="visual-row visual-choice${on?' selected':''}" id="fade-skill-${o.k}" type="button" data-act="v10line" data-k="${o.k}" aria-pressed="${on}" aria-expanded="${on}"${on?' aria-controls="fade-evidence"':''} aria-label="${SK[o.k]}: ${Math.round(o.a)} initial, ${Math.round(o.b)} later; ${o.n} rechecked students; inspect evidence"><span class="visual-name" id="fade-skill-title-${o.k}">${skNm(o.k)}<small>${o.n} rechecked students</small></span>${pairedPlot(o.a,o.b,`${SK[o.k]}: score ${Math.round(o.a)} to ${Math.round(o.b)} on a 0–100 scale`,col)}<span class="visual-reading skills-score-change" data-state="${kd==='fade'?'bad':kd==='up'?'good':'neutral'}"><b>${dTxt(Math.round(o.b)-Math.round(o.a))} pts</b></span></button>${on?`<section class="skill-selected" id="fade-evidence" aria-labelledby="fade-skill-title-${o.k}">${v10side(o)}${v10stu(o)}</section>`:''}`}).join('')}</div>`;
  return ctl+fadeLegend+graph+fold('faded-figures','Exact scores, dates and thresholds',`<div class="fade-exact-notes"><span>Same students in each score pair</span><span>Class flag: <b>drop ≥8 points</b></span><span>Student flag: <b>drop ≥20 points</b></span></div>${table}`)}

/* Student drilldowns retain their check periods; class averages are already shown in the chart. */
function fadePeriodTable(ev,a,b,tone){return `<table class="fade-periods"><caption class="sr">Initial and later mastery scores, evidence windows and check counts</caption><thead><tr><th scope="col">Check period</th><th scope="col">Mastery score<br>out of 100</th><th scope="col">Evidence window</th><th scope="col">Checks</th></tr></thead><tbody>${[['initial','Initial checks',a,ev.a,ev.an],['later','Later checks',b,ev.b,ev.bn]].map(([period,label,score,window,n])=>`<tr data-period="${period}" data-state="${period==='later'?tone:'neutral'}"><th scope="row"><i class="${period==='initial'?'fade-open':'fade-solid'}" aria-hidden="true"></i>${label}</th><td class="period-score" data-label="Mastery score"><b>${Math.round(score)}</b><span class="fade-mobile-label"> / 100</span></td><td class="period-window">${window}</td><td class="period-count">${n}<span class="fade-mobile-label"> ${pl(n,'check')}</span></td></tr>`).join('')}</tbody></table>`;}
function v10stu(o){const k=o.k,Z=S.v10,P=ALL.filter(i=>ML[i][k]!==null).map(i=>({i,a:MT[i][k]*100,b:ML[i][k]*100})),sl=P.filter(p=>p.a-p.b>=20),rows=(Z.sall||!sl.length?P:sl).slice().sort((p,q)=>(Math.round(p.b)-Math.round(p.a))-(Math.round(q.b)-Math.round(q.a))||NM[p.i].localeCompare(NM[q.i]));
  if(!rows.some(p=>p.i===Z.student))Z.student=undefined;
  const tick=sl.length&&P.length>sl.length?`<label class="chk" for="v10sall"><input type="checkbox" id="v10sall"${Z.sall?' checked':''}> Show all ${P.length} rechecked students</label>`:'';
  return `<div class="fstu">${chd(CT.fade1,tick)}<p class="hint">${rows.length} of ${P.length} rechecked students${sl.length&&!Z.sall?' · score dropped at least 20 points':''}</p><div class="visual-list student-fade-chart" data-scroll="student-faded">${chartHead('Student',fadeScoreAxis('Mastery score'),'Change')}${rows.map(p=>{const d=p.b-p.a,on=Z.student===p.i,tone=d<=-20?'bad':d>=20?'good':'neutral',col=tone==='bad'?'var(--il-bad)':tone==='good'?'var(--il-good)':'var(--il-ink-3)';return `<div class="visual-row${on?' selected':''}" data-student="${p.i}" id="fade-result-${p.i}"><span class="visual-name" id="fade-student-name-${p.i}">${nmBtn(NM[p.i])}</span><button class="plot-select" type="button" data-act="fadeinspect" data-i="${p.i}" data-k="${k}" aria-expanded="${on}"${on?' aria-controls="fade-student-evidence"':''} aria-label="${NM[p.i]}: initial ${Math.round(p.a)}, later ${Math.round(p.b)}; inspect evidence">${pairedPlot(p.a,p.b,`${NM[p.i]}: ${Math.round(p.a)} initial, ${Math.round(p.b)} later`,col)}</button><span class="visual-reading skills-score-change" data-state="${tone}"><b>${dTxt(Math.round(p.b)-Math.round(p.a))} pts</b></span></div>${on?`<section class="fade-student-evidence" id="fade-student-evidence" aria-labelledby="fade-student-name-${p.i}"><div class="fade-student-toolbar"><span>Check periods</span><div><button class="btn small" type="button" data-act="prof" data-i="${p.i}">Open profile</button>${pinBtn(p.i)}<button class="x" type="button" data-act="fadestudentclose" aria-label="Close student check periods">${IC.x}</button></div></div>${fadePeriodTable(fadeEvidence(k,p.i),p.a,p.b,tone)}</section>`:''}`}).join('')}</div></div>`}

function v10side(o){const k=o.k,kd=fadeKind(o.d),act=kd==='fade'?(isLogged('v10:'+k)?'<span class="pill good">Review set planned</span>':`<button class="btn small primary" type="button" data-act="v10plan" data-k="${k}">Give a review set</button>`):'';
  return `<div class="detail skills-fade-detail"><div class="fade-evidence-toolbar"><p>Matched students in both averages</p><div class="fade-evidence-actions">${act}${tblGo(k,'faded')}</div><button class="x" type="button" data-act="v10close" aria-label="Close ${SK[k]} evidence">${IC.x}</button></div><p class="fade-method-note">Each student needs at least two later checks. Scores retain attempt credit and skill relevance weighting.</p></div>`}

/* ---------- a skill's table: every student by question, in a dialog ----------
   ALPS's results table, in ALPS's own words, for a skill now or for a point picked on its line. A row a student: their level and the score behind
   it (an arrow when the score had slipped 20 points or more since the skill was taught) and their last activity; then ALPS's result a question. A
   point reads the table as of its day, the later of two: the level is the one the line has for that day, and a question counts from the day it was
   first tried, with the result it ended with, as the levels count it (95% of the records start and end on one day). Two days have a level column
   each, two skills a level column each and both skills' questions. The questions are the class's (a quarter of the class had started them by then),
   by lesson in the order the class met them; a tick adds the ones only a few started. The first row counts who of the students shown is not yet
   correct on each. It opens from a panel on the students the panel is about, with the panel's action, if it has one, beside the name */
/* ALPS's canonical ItemTypeIcon paths and palette. Formats still drive scoring;
   raw item types drive icons so clickable-area and drag/drop stay distinct. */
const QD={Code:'activecode',MCQ:'mchoice',FITB:'fillintheblank',Parsons:'parsonsprob','Click or drag':'unknown'};
const QFN={MCQ:'Multiple choice',FITB:'Fill in the blank',Parsons:'Parsons problem',Code:'Code','Click or drag':'Click or drag'};
const itemKey=(f,type)=>{const t=type==='parsonprob'?'parsonsprob':type;return DESIGN.icons[t]?t:QD[f]||'unknown'};
const itemLabel=(f,type)=>DESIGN.itemLabels[itemKey(f,type)]||QFN[f]||'Question';
const itemInk=key=>`var(--il-item-${key},#575757)`;
const qIcon=(f,type)=>{const key=itemKey(f,type);return `<svg class="qi" data-alps-icon="${key}" viewBox="0 0 12 12" width="16" height="16" aria-hidden="true" focusable="false" style="color:${itemInk(key)}"><svg width="12" height="12">${iconBody(key)}</svg></svg>`};
const SKD='skill',SKIC=`<svg width="12" height="12">${iconBody('skill')}</svg>`;
const nIc=p=>`<svg class="ni" viewBox="0 0 12 12" aria-hidden="true" focusable="false">${p}</svg>`,skNm=k=>nIc(SKIC)+ASK[k],qNm=(f,nm,type)=>qIcon(f,type)+nm;
const gIc=(x,y,key,z=12)=>key?`<svg class="qi" x="${f1(x)}" y="${f1(y)}" width="${z}" height="${z}" aria-hidden="true" focusable="false" style="color:${key==='skill'?'var(--il-ink-3)':itemInk(key)}">${iconBody(key)}</svg>`:'';
/* a question's lesson, also for one in a book that is not in view */
const qLsn=ix=>{const j=IT[ix].j,s=D.subs[D.items[ix].sub];return j>=0?{c:SUBS[j].s,n:SUBS[j].n}:{c:esc(BL[IT[ix].tb]+' · '+s.code),n:esc(BL[IT[ix].tb]+' · '+s.code+' '+s.name)}};
/* Lens question evidence, extending ALPS Correct / Incorrect with attempt detail: correct on the first attempt; correct after retries, or rapid retries when
   all the time on those retries came to three seconds or less (so every one of them was within three seconds); not yet correct; not started.
   Opened-but-unanswered questions and attempts with unknown results are not exported, so those states are not inferred. */
const RS={c1:'Correct on first attempt',cr:'Correct after retries',rr:'Rapid retries: all retries within 3 seconds',nc:'Not yet correct',ns:'Not started'};
const rsOf=a=>!a?'ns':a[9]===1?'c1':a[4]?(a[7]-a[10]<=3?'rr':'cr'):'nc';
/* Correct stays green, incorrect red, unattempted empty. A neutral + badge marks rapid retries; it does not mean pending grading. */
const RIC=(()=>{const sq=(f,l)=>l?`<circle cx="9" cy="11" r="8.5" style="fill:${f};stroke:${l}"/>`:`<circle cx="9" cy="11" r="9" style="fill:${f}"/>`,
    ln='fill:none;stroke:var(--il-surface);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round',
    rt='<path transform="translate(1.56 3.56) scale(.62)" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" style="fill:var(--il-good)"/>',
    svg=b=>`<svg class="qm" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">${b}</svg>`,
    rtF=rt.replace('fill:var(--il-good)','fill:var(--il-surface)'),rtN=rt.replace('style="fill:var(--il-good)"','style="fill:var(--il-good);opacity:.45"'),
    badge='<circle cx="16" cy="4" r="3.6" style="fill:var(--il-ink-2);stroke:var(--il-surface);stroke-width:1.2"/><path d="M16 2.3 V5.7 M14.3 4 H17.7" style="fill:none;stroke:var(--il-surface);stroke-width:1.3;stroke-linecap:round"/>',
    rtG=rt.replace('style="fill:var(--il-good)"','style="fill:var(--il-ink-3);opacity:.55"'),
    full=sq('var(--il-ok-fill)')+rtF,half=sq('var(--il-green-tint)','var(--il-ok-fill)')+rt,quarter=sq('var(--il-surface)','var(--il-green-line)')+rtN,none=sq('var(--il-surface)','var(--il-axis)')+rtG;
  return {c1:svg(sq('var(--il-good)')+`<path d="M5.1 11.3 L7.9 14.1 L13 8.6" style="${ln}"/>`),cr:svg(half),crF:svg(full),crQ:svg(quarter),crN:svg(none),
    rr:svg(half+badge),rrF:svg(full+badge),rrQ:svg(quarter+badge),rrN:svg(none+badge),
    nc:svg(sq('var(--il-bad)')+`<path d="M6.3 8.3 L11.7 13.7 M11.7 8.3 L6.3 13.7" style="${ln}"/>`),ns:svg(sq('var(--il-surface)','var(--il-axis)'))}})();
/* the questions on a skill a table shows as of day d: the class's (a quarter of the class had started them), or with all, every one anybody had
   started; by lesson in the order the class met them, then as the lesson lists them */
function tblQs(k,all,d){if(d===undefined)d=LASTDAY;const sub=ix=>D.items[ix].sub,by=ix=>IWHO[ix].filter(i=>AT[i].get(ix)[6]<=d),first={};
  const qs=KIT[k].filter(ix=>by(ix).length>=(all?1:N/4));qs.forEach(ix=>{const s=sub(ix),t=by(ix).map(i=>AT[i].get(ix)[6]).sort((a,b)=>a-b),m=t[t.length>>1];if(first[s]===undefined||m<first[s])first[s]=m});
  return qs.sort((a,b)=>first[sub(a)]-first[sub(b)]||sub(a)-sub(b)||D.subs[sub(a)].items.indexOf(a)-D.subs[sub(b)].items.indexOf(b))}
/* a table's question columns: each skill's, the second skill's without the ones the first already has */
const tblQ=(C,all)=>{const seen=new Set();return C.ks.flatMap(k=>tblQs(k,all,C.d).filter(ix=>!seen.has(ix)).map(ix=>{seen.add(ix);return {ix,k}}))};
/* a student's level on a skill as of day d, as the page has it (from every check by then, -1 with fewer than two), and whether the score had slipped */
const tlvAt=(i,k,d)=>{const e=estOf(i,k,d),ev=e?e.ev:0;return {ev,sc:e?e.c:null,lv:ev>=2?lvOf(e.c):-1,cat:catFrom(ev,e?e.c:0),slip:!!e&&e.ml!==null&&e.mt-e.ml>=.2,mt:e?e.mt:null,ml:e?e.ml:null}};
/* a row: ALPS's result on each question as of the table's day, a level for each level column, and the last day by then they answered a question on the skills */
function tblRow(i,C,Q){const d=C.d,a=Q.map(q=>{const x=AT[i].get(q.ix);return x&&x[6]<=d?x:null});let last=-1;
  C.ks.forEach(k=>KIT[k].forEach(ix=>{const x=AT[i].get(ix);if(x&&x[6]<=d)last=Math.max(last,x[8]<=d?x[8]:x[6])}));
  return {i,a,o:a.map(rsOf),L:C.cols.map(c=>tlvAt(i,c.k,c.d)),last}}
/* the skill's name in the dialog carries what the view it was opened from says of it, and that view's action */
const tblTop=(k,from)=>{if(from==='faded'){const o=FD.find(q=>q.k===k);if(!o)return '';const kd=fadeKind(o.d);
    return `<span class="pill ${kd==='fade'?'bad':kd==='up'?'good':''}">${Math.round(o.a)}% → ${Math.round(o.b)}%</span>`+(kd!=='fade'?'':isLogged('v10:'+k)?'<span class="pill good">Review set planned</span>':`<button class="btn small primary" type="button" data-act="v10plan" data-k="${k}">Give a review set</button>`)}
  const m=WEAK.find(q=>q.k===k),s=statK(k,ALL);
  return from==='weak'&&m?`<span class="pill ${SC[SG[m.st]][3]}">${m.st}</span>`:s.p!==null?`<span class="pill ${s.p>=.45?'bad':s.p>=.3?'watch':'good'}">${pc5(s.p)} not mastered</span>`:''};
/* what a table is about. From a skill's panel, the skill now; from a point, the skill on that day, the skill on two days, or two skills on one day.
   Each has its title and pill, its level columns, the day its results are read as of, its groups (the panel's own, then unavailable and not
   started), the group it opens on, and the action each group has on today's lists */
function tblCfg(T){const P=T.P,ids=a=>new Set(a.map(n=>ID[n]));
  const noLv=x=>[['Q','More checks needed',r=>r.L[x].lv<0&&r.L[x].cat==='Q'],['N','Not started',r=>r.L[x].lv<0&&r.L[x].cat!=='Q']];
  if(!P){const k=T.k,lv=c=>r=>r.L[0].lv>=0&&r.L[0].cat===c,fd=FD.find(o=>o.k===k);
    return {ks:[k],d:LASTDAY,title:ASK[k],top:tblTop(k,T.from),cols:[{k,d:LASTDAY,lab:'Mastery'}],act:()=>'',
      groups:[['E','Beginning or attempted',lv('E')],['H','Familiar or proficient',lv('H')],['F','Mastered',lv('F')],['sl','Slipped 20+',r=>r.L[0].slip]].concat(noLv(0)),
      def:T.from==='faded'?(fd&&fadeKind(fd.d)==='fade'?['sl']:[]):WEAK.some(m=>m.k===k&&SG[m.st]==='p')?['E']:[]}}
  const G=ptGroups(P),now=(P.kind==='time'?P.b:P.j)===NBC-1,
    btn=(g,l)=>!now?'':isLogged(ptKey(P,g))?'<span class="pill good">Planned</span>':`<button class="btn small primary" type="button" data-act="v7act" data-g="${g}">${l}</button>`;
  if(P.kind==='one'){const k=P.m.k,d=BE(P.j),ch=G.ny.length+G.dev.length+G.sec.length,whole=G.ny.length>=ch/2,s={ny:ids(G.ny),dev:ids(G.dev),sec:ids(G.sec)};
    return {ks:[k],d,title:ASK[k],top:`<span class="pill">${now?'Now':'On '+dayDate(d)}</span>`,cols:[{k,d,lab:now?'Mastery':'Mastery on '+dayDate(d)}],
      groups:[['ny','Beginning or attempted',r=>s.ny.has(r.i)],['dev','Familiar or proficient',r=>s.dev.has(r.i)],['sec','Mastered',r=>s.sec.has(r.i)]].concat(noLv(0)),def:['ny'],
      act:g=>g==='ny'&&!whole?btn('ny','Form a group'):g==='dev'?btn('dev','Give a practice set'):''}}
  if(P.kind==='time'){const k=P.m.k,a=BE(P.a),b=BE(P.b),s={lost:ids(G.lost),re:ids(G.never.concat(G.fell)),dev:ids(G.dev),got:ids(G.got),held:ids(G.held)};
    return {ks:[k],d:b,title:ASK[k],top:`<span class="pill">${dayDate(a)} to ${now?'now':dayDate(b)}</span>`,cols:[{k,d:a,lab:'On '+dayDate(a)},{k,d:b,lab:now?'Now':'On '+dayDate(b)}],
      groups:[['lost','Lost it'],['re','Beginning or attempted'],['dev','Familiar or proficient'],['got','Got it'],['held','Held']].map(([g,l])=>[g,l,r=>s[g].has(r.i)]).concat(noLv(1)),def:['lost','re','dev'],
      act:g=>g==='lost'?btn('lost','Give a review set'):g==='re'?btn('re','Form a group'):g==='dev'?btn('dev','Give a practice set'):''}}
  const k1=P.m1.k,k2=P.m2.k,d=BE(P.j),same=G.both.length&&!G.one.length&&!G.two.length,s={both:ids(G.both),one:ids(G.one),two:ids(G.two)};
  return {ks:[k1,k2],d,title:`${ASK[k1]} and ${ASK[k2]}`,top:`<span class="pill">${now?'Now':'On '+dayDate(d)}</span>`,cols:[{k:k1,d,lab:nIc(SKIC)+ASKS[k1]},{k:k2,d,lab:nIc(SKIC)+ASKS[k2]}],
    groups:[['both','Beginning or attempted on both'],['one',`Beginning or attempted on ${ASKS[k1]} only`],['two',`Beginning or attempted on ${ASKS[k2]} only`]].map(([g,l])=>[g,l,r=>s[g].has(r.i)]),def:['both'],
    act:g=>g==='both'?btn('both',same?'Form a group for both':'Form a group'):''}}
/* Selected results expose exact evidence without requiring a hover or a larger icon vocabulary. */
function tblCellDetail(T,C,Q){if(!T.cell)return '<p class="tbl-evidence-help">Select a result to inspect attempts, partial credit, timing, and its weight in the score.</p>';
  const {i,ix}=T.cell,q=Q.find(q=>q.ix===ix);if(!q||!ALL.includes(i))return '';const raw=AT[i].get(ix),a=raw&&raw[6]<=C.d?raw:null,o=rsOf(a),cr=a?credit(a):0;
  const weights=C.ks.filter(k=>KIT[k].includes(ix)).map(k=>{if(!a||!EVOK(ix))return `${ASK[k]}: ${!a?'no result yet':IT[ix].lab?'lab practice is not assessed':'no working correctness check; excluded from the score'}`;const ev=(EVD[i][k]||[]).filter(e=>e.d<=C.d),cut=ev[0]?.d+RECHECK,later=ev.filter(e=>e.d>=cut),isLater=a[6]>=cut,group=later.length>=2?ev.filter(e=>isLater?e.d>=cut:e.d<cut):ev,share=later.length>=2?(isLater?.6:.4):1,denom=sum(group.map(e=>e.w??1)),weight=denom?share*relOf(ix,k)/denom:0;return `${ASK[k]}: ${Math.round(relOf(ix,k)*100)}% skill relevance · ${(weight*100).toFixed(1)}% of the score · ${(cr*weight*100).toFixed(1)} score points${later.length>=2?` (${isLater?'later':'initial'} evidence group: ${isLater?60:40}% of the score)`:' (all checks averaged until two later checks exist)'}`});
  return `<section class="tbl-evidence" aria-label="Selected result" tabindex="-1"><div class="dhead"><h3>${NM[i]} · ${qNm(IT[ix].f,IT[ix].name,IT[ix].type)}</h3><button type="button" class="x" data-act="tblcellclose" aria-label="Close result" title="Close result">${IC.x}</button></div><p class="tbl-result-status">${RIC[o]}<b>${RS[o]}</b></p>${a?`<dl class="cell-facts"><div><dt>Attempts</dt><dd><strong>${a[5]} total</strong><span>${a[9]?`First correct on attempt ${a[9]}`:'None correct'}</span></dd></div><div><dt>Question credit</dt><dd><strong>${Math.round(cr*100)}%</strong>${!EVOK(ix)?'<span>Excluded from the skill score</span>':''}</dd></div><div><dt>Recorded time</dt><dd><strong>${a[7]}s total</strong><span>${a[10]}s first attempt · ${Math.max(0,a[7]-a[10])}s retries combined</span></dd></div><div><dt>Recorded dates</dt><dd><strong>${dayDateY(a[6])}</strong>${a[8]>a[6]?`<span>Completed ${dayDateY(a[8])}</span>`:''}</dd></div></dl>${a[8]>C.d?'<p class="evidence-note">This export stores the final result of a question started by the selected date. Its recorded completion is after that date.</p>':''}`:'<p>No attempt had started by this evidence date.</p>'}<div class="evidence-note tbl-score-weights"><h4>Contribution to mastery score</h4>${weights.map(t=>`<p>${t}</p>`).join('')}</div></section>`}
function tblHTML(){const T=S.tbl,C=tblCfg(T),Q=tblQ(C,T.all),nc=tblQ(C,false).length,nq=tblQ(C,true).length,R=ALL.map(i=>tblRow(i,C,Q)),G=C.groups,inG=(g,r)=>g==='all'||G.find(x=>x[0]===g)[2](r),cnt=g=>R.filter(r=>inG(g,r)).length;
  if(T.f!=='all'&&(!G.some(x=>x[0]===T.f)||!cnt(T.f)))T.f='all';if(T.q!==null&&!Q.some(q=>q.ix===T.q)){T.q=null;T.s=T.s0;T.dir=1}
  /* each column sorts worst first (the weakest, the longest since, not yet correct then rapid retries); a second click turns it round. A student the
     column has nothing on (no level yet, not started) stays last */
  const RK={nc:0,rr:1,cr:2,c1:3},x=Q.findIndex(q=>q.ix===T.q),lx=T.s[0]==='l'&&T.s!=='last'?+T.s.slice(2):-1;
  const key=r=>T.s==='last'?r.last:T.s==='q'?RK[r.o[x]]-((r.o[x]==='cr'||r.o[x]==='rr')&&r.a[x]?r.a[x][9]/1000:0):r.L[lx].sc,out=r=>lx>=0?r.L[lx].lv<0:T.s==='q'?r.o[x]==='ns':T.s==='last'?r.last<0:false;
  const rows=R.filter(r=>inG(T.f,r)).sort((p,q)=>out(p)-out(q)||(T.s==='name'?NM[p.i].localeCompare(NM[q.i]):key(p)-key(q))*T.dir||NM[p.i].localeCompare(NM[q.i])),n=rows.length;if(T.cell&&!rows.some(r=>r.i===T.cell.i))T.cell=null;
  const arr=T.dir>0?IC.up:IC.down,sh=(s,l,tip)=>{const on=T.s===s,label=s.startsWith('lv')?`<span class="tbl-sort-label">${l}<small>Score out of 100</small></span>`:l;return `<th scope="col" class="c-${s==='name'?'stu':s}"${on?` aria-sort="${T.dir>0?'ascending':'descending'}"`:''}><button class="sh${on?' on':''}" type="button" data-act="tbls" data-f="${s}"${tp(tip+(on?'<br><span>Click again to turn the order round</span>':''))}>${label}${on?arr:''}</button></th>`};
  const segs=[['all',`All · ${N}`]].concat(G.filter(x=>cnt(x[0])).map(([g,l])=>[g,`${l} · ${cnt(g)}`]));
  /* two days on one skill (asked 2026-10-26: "I don't know till which unit/content the student solved for the previous date"): in each row, a band behind
     the questions the student had started by the earlier day, the answers its level was read from. It runs as far as they had got */
  const d0=C.cols.length===2&&C.cols[0].k===C.cols[1].k&&C.cols[0].d<C.cols[1].d?C.cols[0].d:null;
  const short={c1:'Correct first time',cr:'Correct after retries',rr:'Rapid retries',nc:'Not yet correct',ns:'Not started'};
  const key2=`<div class="legend tkey">${['c1','cr','rr','nc','ns'].map(o=>`<span>${RIC[o]}${short[o]}</span>`).join('')}<span><span class="slip">${IC.down}</span>Slipped 20+ points</span>${d0===null?'':`<span><span class="thn"></span>Started by ${dayDate(d0)}</span>`}</div>`;
  const filterCards=`<div class="skill-filters" role="group" aria-label="Students shown" style="--il-filter-columns:${segs.length>6||segs.length===4?4:Math.min(3,segs.length)}">${segs.map(([g,text])=>{const split=text.lastIndexOf(' · '),label=g==='all'?'All students':text.slice(0,split),count=text.slice(split+3);return `<button class="skill-filter${T.f===g?' selected':''}" type="button" data-act="tblf" data-f="${g}" data-count="${count}" aria-pressed="${T.f===g}"><span>${label}</span><span class="sr"> · </span><b>${count}</b><span class="sr"> students</span></button>`}).join('')}</div>`;
  const bar=`<div class="dlg-bar">${filterCards}${nq>nc?`<label class="chk" for="tblall"${tp(`Adds the ${nq-nc} questions on it that only a few students started`)}><input type="checkbox" id="tblall"${T.all?' checked':''}> All ${nq} questions</label>`:''}</div>`;
  /* the results of the students shown on a question, in ALPS's words: not yet correct first, the others when there are any */
  const tally=p=>{const m=o=>rows.filter(r=>r.o[p]===o).length;return [`${m('nc')} not yet correct`].concat(['rr','cr','c1','ns'].filter(o=>m(o)).map(o=>`${m(o)} ${o==='rr'?'rapid retries':RS[o].toLowerCase()}`))};
  /* a question picked: its name, its lesson and the results on it, with the way to Stall points */
  const strip=x<0?'':(()=>{const ix=T.q,j=IT[ix].j,lk=j>=0&&!!SUBS[j]&&SUBS[j].on&&SUBS[j].its.includes(ix),t=tally(x);
    return `<div class="tbl-q">${qIcon(IT[ix].f,IT[ix].type)}<b>${x+1} · ${IT[ix].name}</b><span class="hint">${qLsn(ix).n}</span><span class="tq-n"><b class="gw">${t[0]}</b>${t.slice(1).map(v=>' · '+v).join('')}</span>${lk?`<button class="lnk" type="button" data-act="v7q" data-ix="${ix}" data-k="${Q[x].k}">See it on Stall points →</button>`:''}<button class="x" type="button" data-act="tblqx" data-id="${ix}" aria-label="Back to every question">${IC.x}</button></div>`})();
  /* the head: the skills over their questions when there are two, the lessons over theirs, then the columns */
  const runs=f=>{const b=[];Q.forEach(q=>{const v=f(q),l=b[b.length-1];if(l&&l.v===v)l.n++;else b.push({v,q,n:1})});return b},w0=C.cols.length+1;
  const skb=C.ks.length>1?`<tr class="bands"><th class="c-stu"></th><th colspan="${w0}"></th>${runs(q=>q.k).map(b=>`<th colspan="${b.n}" class="bd sk"${tp(ASK[b.v])}><span>${nIc(SKIC)}${ASKS[b.v]}</span></th>`).join('')}</tr>`:'';
  const lsb=`<tr class="bands${skb?' b2':''}"><th class="c-stu"></th><th colspan="${w0}"></th>${runs(q=>q.k+':'+D.items[q.ix].sub).map(b=>`<th colspan="${b.n}" class="bd"${tp(qLsn(b.q.ix).n)}><span>${qLsn(b.q.ix).c}</span></th>`).join('')}</tr>`;
  const qh=(q,p)=>{const ix=q.ix,on=T.q===ix;return `<th scope="col" class="q${on?' qon':''}"${on?' aria-sort="ascending"':''}><button class="qh" type="button" data-act="tblq" data-id="${ix}" aria-pressed="${on}" aria-label="Question ${p+1}: ${IT[ix].name} · ${itemLabel(IT[ix].f,IT[ix].type)}"${tp(`<b>${p+1} · ${IT[ix].name}</b><br>${itemLabel(IT[ix].f,IT[ix].type)} · ${qLsn(ix).n}<br>Counts ${relOf(ix,q.k)<1?'three quarters':'fully'} toward ${ASK[q.k]}<br><span>${on?'Click to show every question again':'Click to see who is not yet correct'}</span>`)}>${qIcon(IT[ix].f,IT[ix].type)}<span>Q${p+1}</span></button></th>`};
  const LVTIP='ALPS’s level, from the score on every question on the skill. A quick question counts when correct on the first attempt, half on the second; a code or Parsons task when correct within three attempts, half within six, a quarter after that. A question counts as much as it is about the skill: fully, or three quarters. Answers 21 days or more after the first count for 60% once there are two of them; until then each counts like any other. Beginning under 40, Attempted 40, Familiar 55, Proficient 65, Mastered 80. Fewer than two answers: unavailable';
  const head=`<thead>${skb}${lsb}<tr class="hd${skb?' b2':''}">${sh('name','Student','Sorted by name')}${C.cols.map((c,y)=>sh('lv'+y,c.lab,(C.ks.length>1?`<b>${ASK[c.k]}</b><br>`:c.d<LASTDAY?`<b>On ${dayDate(c.d)}</b><br>`:'')+LVTIP)).join('')}${sh('last','Last activity','The last day they answered a question on '+(C.ks.length>1?'either skill':'the skill')+(C.d<LASTDAY?', up to '+dayDate(C.d):''))}${Q.map(qh).join('')}</tr></thead>`;
  /* the first row: how many of the students shown are not yet correct on each question, held under the head while the rows scroll */
  const sum=`<tr class="sum${skb?' b2':''}"><th scope="row" class="c-stu">Not yet correct</th><td colspan="${w0}"></td>${Q.map((q,p)=>{const m=rows.filter(r=>r.o[p]==='nc').length;return `<td class="q${p===x?' qon':''}" data-act="tblq" data-id="${q.ix}"${tp(`<b>${p+1} · ${IT[q.ix].name}</b><br>Of the ${n} shown: ${tally(p).join(' · ')}`)}>${m?`<b class="gw">${m}</b>`:'<span class="t3">0</span>'}</td>`}).join('')}</tr>`;
  const lvCell=(r,y)=>{const L=r.L[y];return L.lv>=0?`<span class="tlv"><span class="tbl-level">${batt(LVC[L.lv])}<span>${LV[L.lv]}</span></span><span class="sc">${Math.round(L.sc*100)}</span>${L.slip?`<span class="slip"${tp(`<b>${NM[r.i]}</b> slipped 20+ points<br>${Math.round(L.mt*100)} when first met → ${Math.round(L.ml*100)} on later checks`)}>${IC.down}</span>`:''}</span>`:L.cat==='Q'?'<span class="t3">More checks needed</span>':'<span class="t3">Not started</span>'};
  const cell=(r,p)=>{const a=r.a[p],o=r.o[p],ix=Q[p].ix,th=d0!==null&&!!a&&a[6]<=d0,on=T.cell&&T.cell.i===r.i&&T.cell.ix===ix,cl=(p===x?' qon':'')+(th?' then':'')+(on?' cell-on':'');
    return `<td class="q${cl}"><button type="button" class="cell-inspect" data-act="tblcell" data-i="${r.i}" data-id="${ix}" aria-pressed="${!!on}" aria-label="${NM[r.i]} · ${IT[ix].name}: ${RS[o]}. Inspect attempts and credit${th?', started by '+dayDate(d0):''}"><span class="rs" aria-hidden="true">${RIC[o]}</span></button></td>`};
  const row=r=>`<tr${S.stu===r.i?' class="on"':''}><th scope="row" class="c-stu">${nmBtn(NM[r.i])}</th>${C.cols.map((_,y)=>`<td class="c-mastery">${lvCell(r,y)}</td>`).join('')}<td class="num c-activity">${r.last<0?'–':dayDate(r.last)}</td>${Q.map((_,p)=>cell(r,p)).join('')}</tr>`;
  const table=Q.length?`<div class="tbl-sc"><table class="sktbl" aria-label="${C.title}: ${n} students by ${Q.length} questions">${head}<tbody>${sum}${rows.map(row).join('')}</tbody></table></div>`:`<p class="none dlg-none">No question on it was started by a quarter of the class${C.d<LASTDAY?' by then':''}. Tick “All ${nq} questions” to see the ones a few started.</p>`;
  const tableMin=176+C.cols.length*184+112+Q.length*44,dialogWidth=Math.min(1180,Math.max(880,tableMin+48));
  return `<div class="dlg-scrim" data-act="tblclose"></div><div class="dlg skill-results" role="dialog" aria-modal="true" aria-labelledby="dlgt" tabindex="-1" style="--il-results-width:${dialogWidth}px;--il-results-table-min:${tableMin}px"><div class="dlg-h"><div class="skill-dialog-heading"><span class="skill-dialog-icon" aria-hidden="true">${nIc(SKIC)}</span><div><h2 id="dlgt">${C.ks.map(k=>ASK[k]).join(' and ')}</h2><p class="skill-dialog-meta">${n} of ${N} students · ${Q.length} ${pl(Q.length,'question')} · Evidence as of ${dayDateY(C.d)}</p></div></div><div class="skill-dialog-actions">${C.top}${C.act(T.f)}</div><button class="x shut" type="button" data-act="tblclose" aria-label="Close" title="Close">${IC.x}</button></div><div class="skill-results-body">${bar}<div class="skill-result-key">${key2}</div>${strip}${tblCellDetail(T,C,Q)}<div class="skill-table-surface"><p class="tbl-scroll-hint">Scroll horizontally to see question results →</p>${table}</div><p class="tbl-scale">Score bands: Beginning 0–39 · Attempted 40–54 · Familiar 55–64 · Proficient 65–79 · Mastered 80–100</p></div></div>`}
/* Both evidence and question results use one dialog layer; drilling into a skill returns to its student's evidence. */
let engOpener=null,engScroll=0,overlapScroll=0,dialogScrollLock=null;
function dialogState(open){const ht=UIROOT===document?$('html'):UIROOT;if(ht)ht.classList.toggle('dlg-on',open);
  ['.topbar','.shell'].forEach(selector=>{const part=$(selector);if(part)part.inert=open});
  if(!options.embedded&&document.documentElement){const style=document.documentElement.style;
    if(open&&!dialogScrollLock){dialogScrollLock={overflow:style.overflow,gutter:style.scrollbarGutter,left:window.scrollX,top:window.scrollY};style.scrollbarGutter='stable';style.overflow='hidden'}
    else if(!open&&dialogScrollLock){const saved=dialogScrollLock;style.overflow=saved.overflow;style.scrollbarGutter=saved.gutter;dialogScrollLock=null;if(window.scrollTo)window.scrollTo({left:saved.left,top:saved.top,behavior:'instant'})}}}
function renderTbl(){const el=$('#dlg');if(!el)return;const evidence=S.view===2&&(S.v2.detail!==null&&S.v2.detail!==undefined||S.v2.overlap),open=!!S.tbl||!!evidence;dialogState(open);
  if(!open){if(!el.hidden){el.hidden=true;el.innerHTML=''}return}
  const body=el.querySelector('.eng-evidence-body');if(body){if(body.dataset.overlap)overlapScroll=body.scrollTop;else engScroll=body.scrollTop}
  const sc=el.querySelector('.tbl-sc'),pos=sc?[sc.scrollLeft,sc.scrollTop]:null,content=el.querySelector('.skill-results-body'),contentTop=content?content.scrollTop:0;
  el.innerHTML=S.tbl?tblHTML():`<div class="dlg-scrim" data-act="v2close"></div>${S.v2.detail===null?overlapEvidence2(S.v2.overlap,S.v2.sel):studentEvidence2(S.v2.detail,S.v2.sel,cellN(S.v2.detail,0,S.v2.sel))}`;el.hidden=false;
  const sc2=el.querySelector('.tbl-sc');if(sc2&&pos){sc2.scrollLeft=pos[0];sc2.scrollTop=pos[1]}
  const content2=el.querySelector('.skill-results-body');if(content2&&content)content2.scrollTop=contentTop;
  const body2=el.querySelector('.eng-evidence-body');if(body2)body2.scrollTop=body2.dataset.overlap?overlapScroll:engScroll}
function focusEvidenceClose2(){const close=$('#dlg [data-act="v2close"]:not(.dlg-scrim)');if(close)close.focus({preventScroll:true})}
function openEvidence2(i,opener){if(!tbWho(0).includes(i))return;if(!opener||!opener.closest('.eng-overlap-list')){engOpener=opener;S.v2.overlap=null}engScroll=0;S.v2.detail=i;hideTip();renderTbl();focusEvidenceClose2()}
function openOverlap2(ids,opener){const allowed=new Set(tbWho(0)),members=[...new Set(ids)].filter(i=>allowed.has(i));if(members.length<2)return;engOpener=opener;overlapScroll=0;S.v2.overlap=members;S.v2.detail=null;hideTip();renderTbl();focusEvidenceClose2()}
function backOverlap2(){const i=S.v2.detail;S.v2.detail=null;hideTip();renderTbl();const button=UIROOT.querySelector(`#dlg [data-act="v2detail"][data-i="${i}"]`);if(button)button.focus({preventScroll:true})}
function closeEvidence2(){const i=S.v2.detail,group=S.v2.overlap,opener=engOpener;S.v2.detail=null;S.v2.overlap=null;engOpener=null;hideTip();renderTbl();if(opener&&opener.isConnected)opener.focus({preventScroll:true});else{const marker=group&&UIROOT.querySelector(`#view [data-act="v2overlap"][data-students="${group.join(',')}"]`);if(marker)marker.focus({preventScroll:true});else if(i!==null&&i!==undefined||group)refocus('v2detail',{i:i??group[0]})}}
/* it opens on the group asked for (a point's card), or on the first group its panel is about that has anybody in it, or on everyone */
function openTbl(k,from,g){const P=from==='pt'?ptSel():null;if(from==='pt'&&!P)return;const T={k,from,P,f:'all',s:'lv0',s0:'lv0',dir:1,q:null,all:false,ret:{k,f:from,g}},C=tblCfg(T);
  const R=ALL.map(i=>tblRow(i,C,[])),has=x=>{const G=C.groups.find(y=>y[0]===x);return !!G&&R.some(G[2])};
  T.f=g&&has(g)?g:C.def.find(has)||'all';T.s=T.s0=P&&P.kind==='time'?'lv1':'lv0';T.all=!tblQ(C,false).length;S.tbl=T;hideTip();renderTbl();const d=$('#dlg .dlg');if(d)d.focus({preventScroll:true})}
function closeTbl(){const o=S.tbl?S.tbl.ret:null;S.tbl=null;hideTip();renderTbl();if(!o)return;const selector=`[data-act="tblopen"][data-k="${o.k}"][data-f="${o.f}"]${o.g?`[data-g="${o.g}"]`:':not([data-g])'}`,b=UIROOT.querySelector('#dlg '+selector)||UIROOT.querySelector('#view '+selector);if(b)b.focus({preventScroll:true})}
/* a point's way in: the same button, with how many questions its table holds as of its day */
const tblGoPt=P=>{const C=tblCfg({P,from:'pt'}),nc=tblQ(C,false).length,nq=nc||tblQ(C,true).length,k=P.kind==='skills'?P.m1.k:P.m.k;if(!nq)return '';
  return `<div class="tblgo"><button class="btn" type="button" data-act="tblopen" data-k="${k}" data-f="pt"${tp('Results for the selected '+(P.kind==='one'?'date':P.kind==='time'?'dates':'skills'))}>${IC.grid}Students and questions</button><span class="hint">${nq} ${pl(nq,'question')} · ${P.kind==='one'?'selected date':P.kind==='time'?'date comparison':'skill comparison'}</span></div>`};
/* the way in, on each view's panel, as ALPS's "Show activities" opens its results by activity: how many students and questions it holds */
const tblGo=(k,from)=>{if(!KIT[k].some(ix=>IWHO[ix].length))return '';const nc=tblQs(k,false).length,nq=nc||tblQs(k,true).length;
  return `<div class="tblgo"><button class="btn" type="button" data-act="tblopen" data-k="${k}" data-f="${from}"${tp(`Every student, ALPS’s result a question: ${nc?`the ${nc} of the ${KIT[k].length} questions on it that a quarter of the class or more started`:`the ${nq} questions on it anybody started`}`)}>${IC.grid}Students and questions</button><span class="hint">${from==='weak'||from==='faded'?`${nq} of ${KIT[k].length} ${pl(KIT[k].length,'question')} shown`:`${N} students · ${nq} of its ${KIT[k].length} ${pl(KIT[k].length,'question')}`}</span></div>`};

/* ---------- view 11 (Q10): readiness tree, for any unit of any textbook ----------
   The unit sits at the top, the skills it builds on below it, and the skills those build on at the bottom.
   Rings are the share of the textbook's students at the level the teacher picks, or above. A skill no item checks has no evidence.
   The readiness line is that level: how well the class must know what the unit builds on, one of ALPS's levels from attempted up. A ring is
   the share of the students with a level on the skill who are at the level or above: under 60% of them, reteach to everyone; under 80%, small
   groups; 80% or more, ready. The shares are fixed; the level is the teacher's. */
const RDLV=['A','F','P','M'],RDCUT=60;
const ringCol=p=>p>=80?'good':p>=RDCUT?'watch':'bad';
/* the share inside a ring is in its status colour: what the class is good at, and what it is not */
const ringTxt=p=>p===null?'t3':'t'+ringCol(p);
/* the level in words: "at least proficient", or "mastered" for the top one */
const lvAt=L=>L==='M'?'mastered':'at least '+SL[L].toLowerCase(),lvAre=L=>L==='M'?'have mastered it':'are '+lvAt(L),lvIs=L=>L==='M'?'has mastered it':'is '+lvAt(L);
/* the data holds no plan, so the page asks which unit is next and picks the earliest one not started that comes after a unit the class has
   started: a unit the class skipped comes first (its tree rests on the most work), and with none skipped it is the first after the unit the
   class is in; the unit the class is in when every unit is started */
const rdDef=tb=>{const ok=(U,u)=>!U.on&&(!MULTI||PICK!==null||U.tb===MAIN),f=TB0.findIndex(U=>U.on);let nx=TB0.findIndex((U,u)=>u>f&&ok(U,u));if(nx<0)nx=TB0.findIndex(ok);return nx>=0?nx:CU};
const rdState=U=>!U.on?'later':U===TB0[CU]?'now':'past';
/* the tree shows the four prerequisites the unit needs most, in the file's order (how many of the unit's questions need each, three or more),
   whether or not the class has evidence on them: one it has too little on is a dashed ring. Evidence never puts a skill the unit hardly needs
   on the tree. Up to two of each one's own follow under it; the others are counted under the tree */
const rdTop=(list,n)=>list.slice(0,n);
/* level 2: up to two measured ones, and none drawn when none is measured: a dashed ring two steps back says nothing a teacher can act on */
const rdKids=(cs,seen)=>{const c=(cs||[]).filter(k=>!seen.has(k)),ok=c.filter(rdOK).slice(0,2);ok.forEach(k=>seen.add(k));return ok};
/* a skill shows once: a second-level one already under another prerequisite, or one of the top row, is not repeated */
const rdNeedTxt=q=>`Needed for ${q.f}${q.nq?`<br>${q.nq} of the unit’s ${q.qn} questions need it`:''}`;
const rdPick=list=>{const ks=rdTop(list.map(q=>q.k),4),seen=new Set(ks);return ks.map(k=>{const q=list.find(o=>o.k===k);return Object.assign({},q,{cs:rdKids(q.cs,seen)})})};
/* the rings run weakest first, left to right, so the first one is where to start; a ring with no share comes last. The second row likewise */
const rdOrder=(pre,ids)=>{const v=k=>{const p=rdP(k,ids);return p===null?1e3:p};return pre.map((q,i)=>({q,i})).sort((a,b)=>v(a.q.k)-v(b.q.k)||a.i-b.i).map(({q})=>Object.assign({},q,{cs:(q.cs||[]).map((k,i)=>({k,i})).sort((a,b)=>v(a.k)-v(b.k)||a.i-b.i).map(o=>o.k)}))};
function rdSel(){const tb=S.v11.tb;let u=S.v11.u[tb];if(u===undefined)u=S.v11.u[tb]=rdDef(tb);const U=TB[tb].units[u],key=tb+':'+u,all=READY[key]||[],ids=tbWho(tb);return {tb,u,U,key,all,pre:rdOrder(rdPick(all),ids),ids,st:rdState(U)}}
/* Diagram scope is display-only: every direct prerequisite, with the same assessed dependency preview. */
function rdDiagramPrereqs(R,ids){if(!S.v11.allSkills)return R.pre;const seen=new Set(R.all.map(q=>q.k));return rdOrder(R.all.map(q=>({...q,cs:rdKids(q.cs,seen)})),ids)}
const secOf=(i,k)=>rdLv(i,k)===4;
/* at the picked level or above, among the students with a level on the skill (secure is mastered: it stays for going further) */
const atLv=(i,k,L)=>{const v=rdLv(i,k);return v!==null&&v>=LVN[L||S.v11.lv]};
const rdF=(k,ids,L)=>ids.filter(i=>atLv(i,k,L)).map(i=>NM[i]);
/* a skill that isn't taught yet, or that no item checks, has no share */
const rdTaught=k=>KTA[k];
/* under each skill of the tree, a book: filled when a lesson the class worked on (a quarter of the class or more, as everywhere) has a
   teaching weight for it; the prerequisite file names those lessons, else the lessons that list it as taught. Whether the class answered
   its questions is no symbol: on the skills the tree draws it is nearly everyone, so the hover says instead how many questions check it
   and the last day it was asked; who has no level on it is in the ring's own hover */
const RDL=new Map();if(PRQ&&Array.isArray(PRQ.taught))PRQ.taught.forEach(([k,js])=>RDL.set(prk(k),js));
const rdLs=k=>RDL.has(k)?RDL.get(k):D.subs.flatMap((s,j)=>s.skills.some(q=>q[0]===k&&q[1])?[j]:[]);
const rdTa=k=>rdLs(k).some(j=>ONJ[j]);
const rdAns=(k,ids)=>{const w=new Set(ids),who=new Set();KIT[k].forEach(ix=>IWHO[ix].forEach(i=>{if(w.has(i))who.add(i)}));return who.size};
const rdEv=(k,ids)=>{let last=-1;ids.forEach(i=>(EVD[i][k]||[]).forEach(x=>{if(x.d<=LASTDAY&&x.d>last)last=x.d}));return {q:KIT[k].length,last}};
const lsn=js=>andList(js.slice(0,3).map(j=>esc(D.subs[j].code)))+(js.length>3?` and ${js.length-3} more`:'');
function taTxt(k,ids){const js=rdLs(k),on=js.filter(j=>ONJ[j]),off=js.filter(j=>!ONJ[j]),E=rdEv(k,ids),qs=`${E.q} ${pl(E.q,'question checks','questions check')} it`;
  const t=on.length?`Taught in ${lsn(on)}`:off.length?`Not taught: the class has not worked on ${lsn(off)}, which ${off.length>1?'teach':'teaches'} it`:`Not taught: no lesson ${MULTI?'in these textbooks':'in the textbook'} teaches it`;
  const a=!E.q?'':E.last<0?`${qs} · nobody has answered ${E.q>1?'them':'it'} yet`:`${qs} · last asked ${dayDate(E.last)}`;
  return t+(a?'<br>'+a:'')}
const taAria=k=>rdTa(k)?'taught':'not taught';
/* the symbol: a book, filled for taught and hollow for not */
const gBook=(x,y,on)=>`<path transform="translate(${f1(x)} ${f1(y)})" d="M0 1.6C2 .4 4 .4 6 2v9C4 9.6 2 9.6 0 10.8zM12 1.6C10 .4 8 .4 6 2v9c2-1.4 4-1.4 6-.2z" style="fill:${on?'var(--il-ink-2)':'var(--il-surface)'};stroke:var(--il-ink-2);stroke-width:1.2;stroke-linejoin:round"/>`;
const taSym=(x,y,k)=>`<g aria-hidden="true">${gBook(x-6,y-6,rdTa(k))}</g>`;
const TAKEY=`<span><svg width="14" height="13" aria-hidden="true">${gBook(1,1,true)}</svg>Taught</span><span><svg width="14" height="13" aria-hidden="true">${gBook(1,1,false)}</svg>Not taught yet</span>`;
/* why a ring has no share: about evidence only, since the symbols say whether it was taught */
const rdWhy=k=>!chk5(k)?'No question in this class checks it':rdN(k)<8?(rdN(k)?`Only ${rdN(k)} ${pl(rdN(k),'student has','students have')} a level on it`:rdAns(k,ALL)?'Nobody has a level on it yet':'No student has answered its questions yet'):'';
const rdC=(k,ids)=>ids.filter(i=>rdChk(i,k)).length;   // of these students, the ones with a level on it
const rdP=(k,ids,L)=>rdWhy(k)||!rdC(k,ids)?null:pc(rdF(k,ids,L).length,rdC(k,ids));
/* the plan at a level (the picked one unless another is asked for): reteach the skills under 60%, small groups on the ones under 80% for the
   students with a level below it; going further is for the students who have mastered every one */
function planNow(L){L=L||S.v11.lv;const R=rdSel(),rm=S.v11.rm[R.key]||{},names=R.ids.map(i=>NM[i]);
  const r=R.all.map(q=>({k:q.k,cs:q.cs||[],p:rdP(q.k,R.ids,L)})).filter(o=>o.p!==null),amb=r.filter(o=>o.p>=RDCUT&&o.p<80);
  const gaps=n=>amb.filter(o=>rdChk(ID[n],o.k)&&!atLv(ID[n],o.k,L)).length;
  return {R,L,n:r.length,red:r.filter(o=>o.p<RDCUT).sort((a,b)=>a.p-b.p),amb,gaps,grp:names.filter(n=>gaps(n)>0&&!(rm.grp||[]).includes(n)).sort((a,b)=>gaps(b)-gaps(a)||ID[a]-ID[b]),
    unk:names.filter(n=>R.all.some(o=>!rdChk(ID[n],o.k))),
    ext:r.length===R.all.length&&r.length?names.filter(n=>r.every(o=>secOf(ID[n],o.k))&&!(rm.ext||[]).includes(n)):[]}}
/* what the class is at a level, for the unit picked: what each stop on the readiness line says */
const rdCoverage=R=>{const total=R.ids.length*R.all.length,assessed=R.all.reduce((n,q)=>n+rdC(q.k,R.ids),0),unknown=total-assessed,missing=R.all.filter(q=>rdP(q.k,R.ids)===null).length;return {total,assessed,unknown,missing,incomplete:unknown>0||missing>0}};
const rdVerdict=L=>{const P=planNow(L),C=rdCoverage(P.R);return {t:!P.n?'More evidence needed':P.red.length?'Reteach first':P.amb.length?'Groups first':C.missing?'Evidence incomplete':C.unknown?'Ready among assessed':'Ready'}};
function h11(){const P=planNow(),R=P.R,nm=R.U.n,lv=SL[P.L].toLowerCase(),C=rdCoverage(R);
  if(!R.pre.length)return RDG(R.u)&&Array.isArray(PRQ.used)&&!PRQ.used[DUI[R.u]]?`${nm} has no graded question tagged with a skill at more than ${Math.round((PRQ.minRelevance||.5)*100)}% relevance, so there is nothing to trace back.`:`${nm} doesn’t build on skills from outside it, as far as ${RDG(R.u)?'the skill graph':'the textbook’s coverage'} shows.`;
  if(!P.n)return `More evidence needed for ${nm}: none of its ${R.all.length} prerequisites has enough assessed students to judge readiness.`;
  const finding=P.red.length?`For ${nm}, reteach ${ASK[P.red[0].k]} first: fewer than 60% of assessed students are ${lvAt(P.L)}.`:P.amb.length?`For ${nm}, run small groups first: some prerequisites have 60–79% of assessed students ${lvAt(P.L)}.`:`For ${nm}, at least 80% of assessed students are ${lvAt(P.L)} on each prerequisite that can be judged.`;
  return finding+(C.incomplete?` Readiness is provisional: ${C.missing?`${C.missing} of ${R.all.length} prerequisites need more evidence; `:''}${C.unknown} of ${C.total} student–prerequisite levels are unknown.`:'')}
/* the links: a trunk from the unit, a rail, and a drop to each ring, round where they turn */
const elbow=(x0,y0,x1,y1,ym)=>{ym=ym===undefined?(y0+y1)/2:ym;const d=x1-x0,rc=Math.min(10,Math.abs(d)/2,ym-y0,y1-ym),g=Math.sign(d);return Math.abs(d)<1?`M${f1(x0)} ${f1(y0)}V${f1(y1)}`:`M${f1(x0)} ${f1(y0)}V${f1(ym-rc)}Q${f1(x0)} ${f1(ym)} ${f1(x0+g*rc)} ${f1(ym)}H${f1(x1-g*rc)}Q${f1(x1)} ${f1(ym)} ${f1(x1)} ${f1(ym+rc)}V${f1(y1)}`};
/* a share inside a ring, the % sign smaller */
const pcTxt=p=>`${p}<tspan style="font-size:12px">%</tspan>`;
/* a skill nothing checks: a dashed gray ring with no share */
const noRing=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" style="fill:none;stroke:var(--il-neutral);stroke-width:2;stroke-dasharray:3 4"/>`;
const NOEV=`<span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" style="fill:none;stroke:var(--il-neutral);stroke-width:1.6;stroke-dasharray:2 2"/></svg>More evidence needed</span>`;
/* A categorical target selector; the rings, plan and page verdict follow the selected mastery level. */
const rdLine=R=>`<div class="ready-target"><span id="v11lvl">Student target level</span>${seg('v11lv',S.v11.lv,RDLV.map(L=>[L,`${batt(L)}${SL[L]}`]),'Student target level')}</div>`;
function v11(){const L=S.v11.lv,R=rdSel(),Tb=TB[R.tb];
  /* one select, every unit of every book in it, grouped by book under "All books" */
  const unitSeg=pickCtl('v11unit',R.u,unitOpts(Tb.units.map((U,u)=>u)),'Next unit');
  const out=S.stu!==null&&!R.ids.includes(S.stu),note=R.ids.length<NM.length||MULTI||out?`<p class="measure-note">${R.ids.length} ${pl(R.ids.length,'student')} using ${Tb.n}.${out?` ${NM[S.stu]} doesn’t use this textbook.`:''}</p>`:'';
  return `${note}${toHead(unitSeg)}<section class="mcard ready-review"><div class="profile-panel-head ready-panel-head"><div class="profile-panel-title"><span class="profile-panel-icon">${engIcon('book')}</span><div><h3>${CT.ready.replace('{u}',R.U.nb)}</h3><p>Explore prerequisite skills and the evidence behind readiness.</p></div></div>${R.pre.length?`<div class="eng-panel-display">${seg('rdlayout',S.v11.ver,RDV,'Readiness diagram')}</div>`:''}</div>${R.pre.length?`<div class="ready-controls">${rdLine(R)}${R.all.length>R.pre.length?`<label class="chk" for="v11all"><input type="checkbox" id="v11all" aria-controls="readiness-diagram"${S.v11.allSkills?' checked':''}> Show all prerequisite skills</label>`:''}</div>`:''}<div class="ready-body" id="v11c"></div></section>`}
/* Every prerequisite uses the same rows and 0–100% scale. A missing level stays unknown. */
function rdRows(qs,ids){return `<div class="table-scroll"><table class="metric-table rd-table"><caption>At target: ${lvAt(S.v11.lv)} · 0–100% of assessed students</caption><thead><tr><th scope="col">Prerequisite</th><th scope="col">At target / assessed</th><th scope="col">Evidence coverage</th><th scope="col">Group readiness</th></tr></thead><tbody>${qs.map(q=>{const k=q.k,assessed=rdC(k,ids),qualified=rdF(k,ids).length,unknown=ids.length-assessed,p=assessed?pc(qualified,assessed):null,judged=rdP(k,ids),C=rdSplit(k,ids),status=judged===null?'More evidence needed':judged<60?'Reteach first':judged<80?'Small groups':unknown?'Ready among assessed':'Ready',tone=judged===null?'':ringCol(judged),kids=q.cs||[];
  const detail=`<p>${rdNeedTxt(q)}.</p><p>${taTxt(k,ids)}</p><p>Assessed levels: ${C.l.map((n,b)=>`${LV[b]} ${n}`).join(' · ')}.${C.u?` ${C.u} with too few checks.`:''}${C.n?` ${C.n} not assessed.`:''}</p>${kids.length?`<p><b>This prerequisite builds on:</b></p><ul>${kids.map(k2=>{const a=rdC(k2,ids),f=rdF(k2,ids).length;return `<li><button class="lnk" type="button" data-act="rdinspect" data-k="${k2}" data-parent="${k}">${skNm(k2)}</button> · ${f} of ${a} assessed at target; ${ids.length-a} unknown</li>`}).join('')}</ul>`:''}`;
  return `<tr><th scope="row"><button class="lnk" type="button" data-act="rdnode" data-k="${k}" data-qualified="${qualified}" data-assessed="${assessed}" data-readiness="${judged===null?'':judged}" aria-pressed="${S.v11.node===k}" aria-label="${ASK[k]}: ${qualified} of ${assessed} assessed students at target; ${unknown} unknown; ${taAria(k)}; view evidence"${tp(`<b>${ASK[k]}</b><br>${taTxt(k,ids)}`)}>${skNm(k)}</button>${fold('rdskill:'+k,'Evidence and relationships',detail)}</th><td><b>${qualified} / ${assessed}</b> <span class="hint">${p===null?'—':p+'%'}</span><div class="rd-track" role="img" aria-label="${qualified} of ${assessed} assessed students ${lvAt(S.v11.lv)}${p===null?'':', '+p+' percent'}; scale 0 to 100 percent"><i style="width:${p||0}%;background:var(--il-${tone||'neutral'})"></i></div></td><td><b>${assessed} / ${ids.length}</b> assessed<br><span class="hint">${unknown} unknown</span></td><td><span class="pill ${tone}">${status}</span></td></tr>`}).join('')}</tbody></table></div>`}
function prerequisiteEvidence(R,ids){const chosen=R.all.find(q=>q.k===S.v11.node),focus=S.v11.skill!==undefined&&S.v11.skill!==null?S.v11.skill:chosen?chosen.k:null;
  if(focus===null)return '';
  const split=rdSplit(focus,ids),assessed=rdC(focus,ids),qualified=rdF(focus,ids).length,p=assessed?pc(qualified,assessed):null,judged=rdP(focus,ids),tone=judged===null?'neutral':judged<60?'bad':judged<80?'watch':'good';
  return `<section class="comparison-detail ready-evidence" id="prerequisite-evidence"><div class="dhead skills-detail-head"><div class="skills-detail-title"><span class="skills-detail-icon">${engIcon('skill')}</span><div><span class="skills-detail-label">Selected prerequisite</span><h3>${skNm(focus)}</h3></div></div><button class="x" type="button" data-act="rdclose" aria-label="Close prerequisite evidence">${IC.x}</button></div><dl class="ready-evidence-metrics"><div data-state="${tone}"><dt>At target · ${lvAt(S.v11.lv)}</dt><dd><b>${qualified} / ${assessed}</b><span>${p===null?'No assessed students':p+'% of assessed students'}</span></dd>${judged===null?'<p>More evidence needed to judge readiness.</p>':''}</div><div><dt>Evidence coverage</dt><dd><b>${assessed} / ${ids.length}</b><span>students assessed</span></dd><p>${ids.length-assessed} unknown · ${split.u} need more checks · ${split.n} not assessed</p></div></dl><p class="ready-distribution-label">Mastery levels across ${ids.length} students</p><div class="composition-lane ready-evidence-distribution" role="img" aria-label="${rdSplitTxt(focus,ids)}">${[4,3,2,1,0].map(b=>split.l[b]?`<i class="ready-level-segment outcome-segment" data-count="${split.l[b]}" data-digits="${String(split.l[b]).length}" style="width:${split.l[b]/ids.length*100}%;background:${LVCOL[b]};color:${b>=3?'var(--il-surface)':'var(--il-ink)'}"><span class="outcome-count" aria-hidden="true">${split.l[b]}</span></i>`:'').join('')}${split.u?`<i class="one-check ready-level-segment outcome-segment" data-count="${split.u}" data-digits="${String(split.u).length}" style="width:${split.u/ids.length*100}%"><span class="outcome-count" aria-hidden="true">${split.u}</span></i>`:''}${split.n?`<i class="not-attempted ready-level-segment outcome-segment" data-count="${split.n}" data-digits="${String(split.n).length}" style="width:${split.n/ids.length*100}%"><span class="outcome-count" aria-hidden="true">${split.n}</span></i>`:''}</div>${levelLegend([4,3,2,1,0])}<div class="ready-evidence-footer"><p>${taTxt(focus,ids)}</p>${tblGo(focus,'unit')}</div></section>`;
}
/* The two ring diagrams from c7d5e6b share the current ALPS theme and evidence. */
function readinessDiagram(R,ids,sel){R={...R,pre:rdDiagramPrereqs(R,ids)};const V=S.v11.ver,L=S.v11.lv,W=Math.max(680,VW(),S.v11.allSkills&&V!=='2'?R.pre.length*200+40:0);
  /* the rings stay close under the unit rather than spreading over the row; a long skill name takes two lines */
  const N=R.pre.length,deep=R.pre.some(q=>(q.cs||[]).length),H=deep?432:282,rx=W/2,ry=40,gap=clamp((W-100)/Math.max(1,N),150,240),xs=R.pre.map((_,ix)=>rx+(ix-(N-1)/2)*gap),cy=166,gy=338,nch=Math.floor((gap-14)/7);
  const wrap=(t,n)=>{if(t.length<=n)return [t];const at=t.lastIndexOf(' ',n);return at<1?[cut(t,n)]:[t.slice(0,at),cut(t.slice(at+1),n)]},two=t=>wrap(t,nch);
  /* where the rings of level 2 go: one under its parent, or two side by side */
  const dx=Math.min(gap/4,58),cxs=q=>{const n=(q.cs||[]).length;return n===2?[-dx,dx]:n===1?[0]:[]};
  /* each ring splits the students checked on the skill by mastery level */
  const ring1=(x,y,r,sw,p,k)=>p===null?noRing(x,y,r):splitRing(x,y,r,sw,k,ids);
  let s='';
  if(V==='2')s=rdTreeRadial({R,ids,sel,W});else{
  s=`<svg class="viz" viewBox="0 0 ${W} ${H}" data-readiness-layout="tree" role="group" aria-label="Readiness tree for ${R.U.n}: the skills it needs, each a ring splitting the students checked on the skill by level, the share ${lvAt(L)} inside">`;
  xs.forEach((x,ix)=>{s+=`<path d="${elbow(rx,ry+24,x,cy-48,ry+48)}" fill="none" style="stroke:var(--il-axis);stroke-width:1.5"/>`;cxs(R.pre[ix]).forEach(d=>{s+=`<path d="${elbow(x,cy+104,x+d,gy-30)}" fill="none" style="stroke:var(--il-axis);stroke-width:1.5"/>`})});
  s+=`<rect x="${rx-110}" y="${ry-22}" width="220" height="46" rx="8" style="fill:var(--il-blue-tint)"/>`+T(rx,ry+5,R.U.n,{a:'middle',c:'tunit',w:700,s:14});
  /* each row says what it is, on the left */
  const mark=(x,y,i,k)=>{const f=atLv(i,k);return `<circle cx="${x}" cy="${y}" r="7" style="fill:${f?'var(--il-accent)':'var(--il-surface)'};stroke:var(--il-accent);stroke-width:2"/>`};
  R.pre.forEach((q,ix)=>{const x=xs[ix],p=rdP(q.k,ids),on=S.v11.node===q.k,ln=two(D.skills[q.k]);
    s+=`<g class="readiness-node" data-prereq-kind="direct" role="button" data-act="rdnode" data-k="${q.k}" tabindex="0" aria-pressed="${S.v11.node===q.k}" aria-label="${ASK[q.k]}: ${p===null?rdNo(q.k,ids).toLowerCase():p+'% '+lvAt(L)}; ${taAria(q.k)}"${tp(`<b>${ASK[q.k]}</b><br>${p===null?rdNo(q.k,ids):rdSay(q.k,ids)}<br>${p===null?'':rdSplitTxt(q.k,ids)+'<br>'}${taTxt(q.k,ids)}<br><span>${rdNeedTxt(q)}</span>`)}><rect x="${x-88}" y="${cy-52}" width="176" height="160" fill="transparent"/>${ring1(x,cy,36,9,p,q.k)+T(x,cy+6,p===null?'?':pcTxt(p),{a:'middle',c:ringTxt(p),w:700,s:17})}${rdNm(x,cy+60,16,ln,{c:on?'tacc':p!==null&&p<80?'t1':'t2',w:700})}${taSym(x,cy+78+(ln.length-1)*16,q.k)}${sel!==null&&p!==null?mark(x+38,cy-38,sel,q.k):''}</g>`;
    const ds=cxs(q),nc2=Math.floor(((ds.length===2?2*dx:gap)-10)/6.6);
    (q.cs||[]).forEach((k2,ci)=>{const x2=x+ds[ci],p2=rdP(k2,ids),on2=S.v11.skill===k2,l2=wrap(D.skills[k2],nc2);
      s+=`<g class="readiness-node" data-prereq-kind="dependency" role="button" data-act="rdinspect" data-k="${k2}" data-parent="${q.k}" tabindex="0" aria-pressed="${S.v11.skill===k2}" aria-label="${ASK[k2]}: ${p2===null?rdNo(k2,ids).toLowerCase():p2+'% '+lvAt(L)}; ${taAria(k2)}"${tp(`<b>${ASK[k2]}</b><br>${p2===null?rdNo(k2,ids):rdSay(k2,ids)}<br>${p2===null?'':rdSplitTxt(k2,ids)+'<br>'}${taTxt(k2,ids)}<br><span>Needed for ${ASK[q.k]}</span>`)}><rect x="${f1(x2-(ds.length===2?dx:80))}" y="${gy-30}" width="${ds.length===2?2*dx:160}" height="114" fill="transparent"/>${ring1(x2,gy,22,6,p2,k2)+T(x2,gy+4,p2===null?'?':p2+'%',{a:'middle',c:ringTxt(p2),w:700})}${rdNm(x2,gy+44,15,l2,{c:on2?'tacc':p2===null?'t3':'t2',w:700})}${taSym(x2,gy+61+(l2.length-1)*15,k2)}${sel!==null&&p2!==null?mark(x2+26,gy-24,sel,k2):''}</g>`})});
  if(sel!==null)s+=`<circle cx="14" cy="16" r="6" style="fill:var(--il-accent)"/>`+T(26,20,`${NM[sel]} ${lvIs(L)}`,{c:'tacc',w:700})+`<circle cx="14" cy="34" r="6" style="fill:var(--il-surface);stroke:var(--il-accent);stroke-width:2"/>`+T(26,38,'not yet',{c:'tacc'});
  s+='</svg>'}

  const key=`${R.key}-${V}-${S.v11.allSkills?'all':'preview'}`;
  return `<div class="ready-graph-tools"><div><p class="scale-label">${lvAt(L).replace(/^./,c=>c.toUpperCase())} · 0–100% of assessed students</p><p class="hint ready-caption">${R.pre.length} of ${R.all.length} direct prerequisites · <span class="ready-graph-hint">select a skill for evidence</span></p></div><div class="ready-zoom" role="group" aria-label="Graph zoom"><span class="hint">Zoom</span><button class="btn small" type="button" data-act="rdzoom" data-f="out" aria-label="Zoom out" aria-controls="readiness-diagram">−</button><output id="readiness-zoom" aria-live="polite" aria-label="Graph zoom level"></output><button class="btn small" type="button" data-act="rdzoom" data-f="in" aria-label="Zoom in" aria-controls="readiness-diagram">+</button><button class="btn small" type="button" data-act="rdzoom" data-f="fit" aria-label="Fit full graph" aria-controls="readiness-diagram">Fit</button></div></div><div class="ready-diagram" id="readiness-diagram" data-scroll="ready-diagram-${key}" data-zoom-key="${key}" tabindex="0" role="region" aria-label="Prerequisite graph; use zoom controls to inspect, then scroll to move around"><div class="ready-canvas">${s}</div></div>`;
}
/* Fit the full graph, then zoom around the viewport centre without redrawing evidence or the plan. */
function rdZoom(action){const frame=$('#readiness-diagram'),svg=frame&&frame.querySelector('svg'),canvas=frame&&frame.querySelector('.ready-canvas');if(!svg||!canvas||!frame.clientWidth)return;
  const Z=S.v11.zoom;if(Z.key!==frame.dataset.zoomKey){Z.key=frame.dataset.zoomKey;Z.multiple=1}
  if(!svg.dataset.graphWidth){const b=svg.getBBox(),pad=18;svg.setAttribute('viewBox',`${b.x-pad} ${b.y-pad} ${b.width+pad*2} ${b.height+pad*2}`);svg.dataset.graphWidth=b.width+pad*2;svg.dataset.graphHeight=b.height+pad*2}
  const w=+svg.dataset.graphWidth,h=+svg.dataset.graphHeight,maxHeight=clamp((window.innerHeight||800)*.5,220,520);frame.style.height=Math.min(maxHeight,Math.max(220,h*Math.min(1,(frame.clientWidth-32)/w)+34))+'px';
  const fit=Math.min(1,(frame.clientWidth-32)/w,(frame.clientHeight-32)/h),before=svg.getBoundingClientRect(),area=frame.getBoundingClientRect();
  const cx=before.width?clamp((area.left+frame.clientWidth/2-before.left)/before.width,0,1):.5,cy=before.height?clamp((area.top+frame.clientHeight/2-before.top)/before.height,0,1):.5;
  Z.multiple=action==='fit'?1:clamp(Z.multiple*(action==='in'?1.25:action==='out'?.8:1),.25,3/fit);
  const scale=fit*Z.multiple,sw=w*scale,sh=h*scale;svg.style.width=sw+'px';svg.style.height=sh+'px';canvas.style.width=Math.max(frame.clientWidth,sw+32)+'px';canvas.style.height=Math.max(frame.clientHeight,sh+32)+'px';frame.dataset.zoom=scale;frame.dataset.fit=fit;
  if(action&&action!=='fit'){const after=svg.getBoundingClientRect();frame.scrollLeft+=after.left+cx*sw-area.left-frame.clientWidth/2;frame.scrollTop+=after.top+cy*sh-area.top-frame.clientHeight/2}else if(Z.multiple===1){frame.scrollLeft=0;frame.scrollTop=0}
  const output=$('#readiness-zoom');if(output)output.textContent=Math.round(scale*100)+'%';const hint=$('.ready-graph-hint');if(hint)hint.textContent=scale<.65?'zoom in to read skill labels':'select a skill for evidence';const out=$('[data-act="rdzoom"][data-f="out"]'),inside=$('[data-act="rdzoom"][data-f="in"]');if(out)out.disabled=Z.multiple<=.25;if(inside)inside.disabled=scale>=3-1e-6;
}
function v11draw(){const c=$('#v11c');if(!c)return;
  const P=planNow(),R=P.R;
  /* the tree is about the whole class, or about one of the plan's groups once the teacher picks it on its card; the plan stays the class's */
  const gn=S.v11.grp==='grp'?P.grp:S.v11.grp==='ext'?P.ext:[];if(!gn.length)S.v11.grp=null;
  const ids=S.v11.grp?gn.map(n=>ID[n]):R.ids,n=ids.length,sel=S.stu!==null&&ids.includes(S.stu)?S.stu:null;
  if(!R.pre.length){c.innerHTML='<p class="none">Pick another unit to see what it builds on.</p>';setAns(10);return}
  const rm=S.v11.rm[R.key]||{},acc=!!S.v11.acc[R.key];
  const card=(cls,title,body,g,cnt)=>{const on=!!g&&S.v11.grp===g;return `<div class="pcard ${cls}${on?' on':''}"><div class="ready-plan-card-head"><h4><span class="ready-plan-icon">${engIcon(cls==='bad'?'skill':cls==='good'?'check':'assignment')}</span>${title}${cnt?`<b class="ready-plan-count">${cnt}</b>`:''}</h4>${g&&cnt?`<button class="btn small gsel" type="button" data-act="v11grp" data-g="${on?'':g}" aria-pressed="${on}">Inspect group</button>`:''}</div>${body}</div>`};
  const chips=(key,list,cnt,none)=>list.length?roster(list.map(nm=>({n:nm,v:cnt&&cnt(nm)>1?`${cnt(nm)} skills`:''})),{rm:['v11rm',key]}):`<p class="none">${(rm[key]||[]).length?'Nobody left.':none||'Nobody.'}</p>`;
  /* a skill to reteach, and where to start when one of its own prerequisites is below the line too: the weakest of them */
  const rb=P.red.length?P.red.map(o=>{const w=(o.cs||[]).map(k=>({k,p:rdP(k,R.ids)})).filter(x=>x.p!==null&&x.p<RDCUT).sort((a,b)=>a.p-b.p)[0];return `<p><b>${skNm(o.k)}</b>${w?`<br><span class="hint">Start with ${ASK[w.k]}</span>`:''}</p>`}).join(''):'<p class="none">Nothing under 60%.</p>';
  const ab=P.amb.length?`<p>${P.amb.map(o=>`<b>${skNm(o.k)}</b>`).join('<br>')}</p>${chips('grp',P.grp,P.gaps)}${P.unk.length?fold('rdunknown','More checks needed · '+P.unk.length,roster(P.unk.map(n=>({n})))):''}`:'<p class="none">None: no skill is between 60% and 80%.</p>';
  const anyRm=Object.keys(rm).some(g=>rm[g].length);
  const cards=(P.red.length?card('bad','Reteach to everyone',rb):'')+(P.amb.length?card('watch','Small groups',ab,'grp',P.grp.length):'')+(P.ext.length?card('good','Ready to go further',chips('ext',P.ext,null),'ext',P.ext.length):'');
  const ok=P.red.length?0:R.ids.filter(i=>R.all.every(q=>atLv(i,q.k))&&!P.grp.includes(NM[i])&&!P.ext.includes(NM[i])).length;
  const empty=ok>0?`${ok} other assessed ${pl(ok,'student meets','students meet')} the target on every prerequisite.`:'';
  const logs=(P.amb.length&&P.grp.length)||P.ext.length;
  const plan=!P.n?`<div class="detail ready-plan"><div class="dhead"><h3>What to do first</h3></div><p class="none">More evidence is needed before planning.</p></div>`:`<div class="detail ready-plan"><div class="dhead"><h3>What to do first</h3>${acc?'<span class="pill good">Accepted</span>':''}</div><p class="measure-note">Based on all ${R.all.length} direct prerequisites · ${R.ids.length} students.</p>${cards?`<div class="plan">${cards}</div>`:''}${empty?`<p class="none plan-none">${empty}</p>`:''}
  <div class="planbar">${logs?acc?'<button class="btn small" type="button" data-act="v11undo">Undo</button>':`<button class="btn primary" type="button" data-act="v11accept">Accept plan</button><span class="hint">Logs ${[P.amb.length&&P.grp.length?`a small group for ${P.grp.length}`:'',P.ext.length?`a stretch set for ${P.ext.length}`:''].filter(Boolean).join(' and ')}</span>`:''}${anyRm?'<button class="lnk" type="button" data-act="v11restore">Put removed names back</button>':''}</div></div>`;
  /* where the tree comes from, and the prerequisites it leaves out */
  const priority=rdOrder(R.all,ids);
  const model=`<p class="evidence-note">Prerequisite links are ${RDG(R.u)?'inferred by the learner model’s skill graph':'derived from textbook coverage'}; they describe modeled dependencies. The graph previews assessed dependencies; these rows include every direct prerequisite and all underlying skills. Percentages exclude unknown levels. Open a row for teaching evidence and relationships.</p>`;
  /* a group on the tree says so above it, with the way back to the whole class */
  const gbar=S.v11.grp?`<p class="rdfor"><span class="pill acc">${S.v11.grp==='grp'?'Small group':'Ready to go further'} · ${n} ${pl(n,'student')}</span><button class="lnk" type="button" data-act="v11grp" data-g="">Whole class</button></p>`:'';
  const legend=`<div class="legend rdkey"><span class="lt">% at target</span><span class="kn bad">Under 60% · Reteach</span><span class="kn watch">60–79% · Small groups</span><span class="kn good">80–100% · Ready</span>${NOEV}</div><div class="legend"><span class="lt">Ring colors</span>${[4,3,2,1,0].map(b=>`<span>${lsw(b)}${LV[b]}</span>`).join('')}<i class="ksep" aria-hidden="true"></i>${TAKEY}</div>`;
  c.innerHTML=gbar+readinessDiagram(R,ids,sel)+`<div class="ready-legend-panel">${legend}</div>`+prerequisiteEvidence(R,ids)+plan+fold('ready-figures:'+R.key,'All prerequisite figures and relationships',model+rdRows(priority,ids));setAns(10);rdZoom();
}
const rdPfx=R=>`v11:${R.key}:`;
function acceptPlan(){const P=planNow(),R=P.R,pf=rdPfx(R),nm=R.U.n,to=`, to ${lvAt(P.L)}`;S.log=S.log.filter(e=>!e.key.startsWith(pf));
  if(P.amb.length&&P.grp.length)logAct(pf+'grp',10,`Small group on ${andList(P.amb.map(o=>ASK[o.k]))} for ${nm}${to}: ${andList(P.grp)}`,'plan',true);
  if(P.ext.length)logAct(pf+'ext',10,`Stretch set for ${andList(P.ext)}`,'plan',true);
  S.v11.acc[R.key]=true;toast(`Plan accepted. ${S.log.filter(e=>e.key.startsWith(pf)).length} actions logged.`)}

/* ---------- readiness layouts: shared rings, links, taught marks and plan ----------
   Tree is the default. The Diagram toggle and ?rv=2 also open the radial layout. */
const RDV=[['now','Tree'],['2','Radial']];
const RDHOW={
 '2':'Around the unit, the skills it builds on; further out, what each builds on. A ring splits the students with a level on the skill by level; inside, the share at your level or above: red under 60%, amber under 80%, green ready. A filled book means taught; hollow, not.'};
const rdWrap=(t,n)=>{if(t.length<=n)return [t];const at=t.lastIndexOf(' ',n);return at<1?[cut(t,n)]:[t.slice(0,at),cut(t.slice(at+1),n)]};
/* a ring: the students with a level on a skill, clockwise from the top by mastery level, mastered first, so the arcs agree with the share inside;
   the hover counts the others, in ALPS's words: not attempted, unavailable. rdSplit counts every student, F, H and E being the three groups */
const rdSplit=(k,ids)=>{const c={l:[0,0,0,0,0],F:0,H:0,E:0,o:0,n:0,u:0};ids.forEach(i=>{const v=rdLv(i,k);if(v===null){c.o++;c[rdUn(i,k)?'u':'n']++}else{c.l[v]++;c[v===4?'F':v>1?'H':'E']++}});return c};
const splitRing=(x,y,r,sw,k,ids)=>{const c=rdSplit(k,ids),n=c.l.reduce((a,b)=>a+b,0),C=2*Math.PI*r,segs=[4,3,2,1,0].filter(b=>c.l[b]>0),gp=segs.length>1?Math.min(2.5,C/50):0;if(!n)return noRing(x,y,r);
  let off=0,out='';
  segs.forEach(b=>{const L=C*c.l[b]/n,d=Math.max(.6,L-gp),arc=(rr,col,w)=>`<circle cx="${x}" cy="${y}" r="${f1(rr)}" transform="rotate(-90 ${x} ${y})" style="fill:none;stroke:${col};stroke-width:${w};stroke-dasharray:${f1(d*rr/r)} ${f1(2*Math.PI*rr)};stroke-dashoffset:${f1(-off*rr/r)}"/>`;
    out+=arc(r,LVCOL[b],sw)+(b===1?arc(r-sw/2+.5,'var(--il-lv-f)',1)+arc(r+sw/2-.5,'var(--il-lv-f)',1):'');off+=L});
  return out};
const rdSplitTxt=(k,ids)=>{const c=rdSplit(k,ids);return `${lvTxt(c.l)||'nobody has a level on it'}${c.n?` · ${c.n} not attempted`:''}${c.u?` · ${c.u} unavailable`:''}`};
/* a ring's hover: how many of the students it is about are at the level */
const rdNo=(k,ids)=>rdWhy(k)||(S.v11.grp?'Nobody in the group has a level on it':'Nobody here has a level on it');
const rdSay=(k,ids)=>`${rdF(k,ids).length} of the ${rdC(k,ids)} ${S.v11.grp?'in the group':'students'} with a level on it ${lvAre(S.v11.lv)}`;
/* a skill's tooltip, as on the current tree */
const rdTip=(k,ids,need)=>{const p=rdP(k,ids);return `<b>${ASK[k]}</b><br>${p===null?rdNo(k,ids):rdSay(k,ids)+'<br>'+rdSplitTxt(k,ids)}<br>${taTxt(k,ids)}<br><span>${need}</span>`};
/* one node of v2: the ring (or the dashed ring), the share inside, its label, a followed student's mark */
const rdNodeV=(x,y,r,sw,k,ids,sel,need,lab)=>{const p=rdP(k,ids),big=r>26;
  const rg=p===null?noRing(x,y,r)+T(x,y+(big?6:4),'?',{a:'middle',c:'t3',w:700,s:big?15:12}):splitRing(x,y,r,sw,k,ids)+T(x,y+(big?6:4),big?pcTxt(p):p+'%',{a:'middle',c:ringTxt(p),w:700,s:big?17:12});
  const mk=sel!==null&&p!==null?`<circle cx="${f1(x+r*.75+6)}" cy="${f1(y-r*.75-6)}" r="7" style="fill:${atLv(sel,k)?'var(--il-accent)':'var(--il-surface)'};stroke:var(--il-accent);stroke-width:2"/>`:'';
  return `<g class="readiness-node" data-prereq-kind="${big?'direct':'dependency'}" role="button" data-act="rdpick" data-k="${k}" tabindex="0" aria-pressed="${S.v11.skill===k||S.v11.node===k}" aria-label="${ASK[k]}: ${p===null?rdNo(k,ids).toLowerCase():p+'% '+lvAt(S.v11.lv)}; ${taAria(k)}"${tp(rdTip(k,ids,need))}>${rg}${lab}${mk}</g>`};
/* a name in two lines at most, then the book under it, starting at x (anchor start), or centred, or ending at x */
/* a skill's name centred under its ring, the skill icon before its first line. The line is set from the icon, so the gap is exact and only the centring
   rests on a width read from the letters (about 6 px each at 12 px) */
const rdNm=(x,y,lh,ln,o)=>{const x0=x-(ln[0].length*6+16)/2+16;return gIc(x0-16,y-10,SKD)+T(x0,y,esc(ln[0]),{...o,a:'start'})+ln.slice(1).map((t,li)=>T(x,y+(li+1)*lh,esc(t),{...o,a:'middle'})).join('')};
/* on the radial tree, a name beside its ring has the skill icon on the ring's side of it; one over or under its ring has it before the first line */
const rdLab=(x,y,k,n,top,anc)=>{const ln=rdWrap(D.skills[k],n),y0=y-(ln.length-1)*8+4,o={c:'t1',w:top?700:500},yb=y0+(ln.length-1)*16+6;
  if(anc==='middle')return rdNm(x,y0,16,ln,o)+`<g aria-hidden="true">${gBook(x-6,yb,rdTa(k))}</g>`;
  const e=anc==='end',tx=e?x-16:x+16;
  return gIc(e?x-12:x,y0-10,SKD)+ln.map((t,li)=>T(tx,y0+li*16,esc(t),{...o,a:e?'end':'start'})).join('')+`<g aria-hidden="true">${gBook(e?tx-12:tx,yb,rdTa(k))}</g>`};
const rdStuKey=(sel,x,y)=>sel===null?'':`<circle cx="${x}" cy="${y}" r="6" style="fill:var(--il-accent)"/>`+T(x+12,y+4,`${NM[sel]} ${lvIs(S.v11.lv)}`,{c:'tacc',w:700})+`<circle cx="${x}" cy="${y+18}" r="6" style="fill:var(--il-surface);stroke:var(--il-accent);stroke-width:2"/>`+T(x+12,y+22,'not yet',{c:'tacc'});

/* v2 · Radial: the unit in the middle, the skills it builds on around it, what each builds on further out on its own side */
function rdTreeRadial(o){const {R,ids,sel,W}=o,top=R.pre,N=Math.max(1,top.length),deep=top.some(q=>(q.cs||[]).length),wide=N>4,R1=wide?Math.max(210,N*180/(2*Math.PI)):deep?150:165,R2=wide?Math.max(R1+200,N*360/(2*Math.PI)):292,r0=64,r1=30,r2=19;
  const Wd=Math.max(W,2*((deep?R2+r2:R1+r1)+180)),H=2*(deep?R2+r2+44:R1+r1+60),cx=Wd/2,cy=H/2,ang=i=>(-90+(i+.5)*360/N)*Math.PI/180;
  let s=`<svg class="viz" viewBox="0 0 ${Wd} ${H}" data-readiness-layout="radial" role="group" aria-label="Readiness tree, radial, for ${R.U.n}: the skills it needs, each a ring splitting the students checked on the skill by level, the share ${lvAt(S.v11.lv)} inside">`;
  const P1=top.map((q,i)=>{const a=ang(i);return {q,a,x:cx+Math.cos(a)*R1,y:cy+Math.sin(a)*R1}});
  const kids=P1.flatMap(p=>(p.q.cs||[]).map((k2,ci,arr)=>{const offset=wide?2*Math.PI/N*.25:.36,a=p.a+(arr.length===2?(ci?offset:-offset):wide?0:.36);return {p,k2,a,x:cx+Math.cos(a)*R2,y:cy+Math.sin(a)*R2}}));
  P1.forEach(p=>{s+=`<line class="lk" x1="${f1(cx+Math.cos(p.a)*(r0+4))}" y1="${f1(cy+Math.sin(p.a)*(r0+4))}" x2="${f1(p.x-Math.cos(p.a)*(r1+8))}" y2="${f1(p.y-Math.sin(p.a)*(r1+8))}" style="stroke:var(--il-axis);stroke-width:1.5"/>`});
  kids.forEach(k=>{const dx=k.x-k.p.x,dy=k.y-k.p.y,d=Math.hypot(dx,dy)||1;s+=`<line class="lk" x1="${f1(k.p.x+dx/d*(r1+8))}" y1="${f1(k.p.y+dy/d*(r1+8))}" x2="${f1(k.x-dx/d*(r2+6))}" y2="${f1(k.y-dy/d*(r2+6))}" style="stroke:var(--il-axis);stroke-width:1.5"/>`});
  const un=rdWrap(R.U.nb||R.U.n,14);s+=`<circle cx="${cx}" cy="${cy}" r="${r0}" style="fill:var(--il-blue-tint)"/>`+un.map((t,li)=>T(cx,cy-(un.length-1)*8+5+li*16,esc(t),{a:'middle',c:'tunit',w:700,s:14})).join('');
  /* a label sits outside its ring, on the side the ring faces */
  const lab=(x,y,a,r,k,n,topLvl)=>{const c=Math.cos(a),sn=Math.sin(a),anc=c>.35?'start':c<-.35?'end':'middle',o=r+(topLvl?18:14),lx=anc==='middle'?x:x+c*o,ly=anc==='middle'?(sn>0?y+r+20:y-r-30):y+sn*o;return rdLab(lx,ly,k,n,topLvl,anc)};   // clear of its own ring on a diagonal
  P1.forEach(p=>{s+=rdNodeV(p.x,p.y,r1,9,p.q.k,ids,sel,rdNeedTxt(p.q),lab(p.x,p.y,p.a,r1,p.q.k,17,true))});
  kids.forEach(k=>{s+=rdNodeV(k.x,k.y,r2,6,k.k2,ids,sel,'Needed for '+ASK[k.p.q.k],lab(k.x,k.y,k.a,r2,k.k2,18,false))});
  return s+rdStuKey(sel,14,20)+'</svg>'}


/* ---------- view 12: my actions, and whether the sets worked ----------
   The log of everything the teacher did today comes first. Under it, each set the class was given that can be judged, and each targeted one,
   with its effect range; the sets that can't be judged yet are listed under it with why. Every row is the database's */
function h12(){const n=S.log.length,lg=n?`${n} ${pl(n,'action')} logged today. `:'';
  if(!IVS.length)return lg+'No practice set is recorded for this class yet.';
  const J=IVS.filter(d=>d.est!==null),w=J.filter(d=>d.lo>0),rest=IVS.length-J.length;
  if(!J.length)return lg+`All ${IVS.length} practice ${pl(IVS.length,'set')} await enough later work for a comparison.`;
  return lg+`${J.length} of ${IVS.length} sets have enough evidence to compare later score changes. ${w.length} show a clear positive difference; these observational comparisons do not establish cause.${rest?` ${rest} await more evidence.`:''}`}
/* A common axis covers every estimated interval, including negative ranges. */
function actionScale(rows){const values=rows.flatMap(o=>[o.d.lo,o.d.hi]).filter(Number.isFinite),low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||10,raw=span/4,pow=10**Math.floor(Math.log10(raw)),step=[1,2,5,10].find(n=>n*pow>=raw)*pow;
  let min=Math.floor(low/step)*step,max=Math.ceil(high/step)*step;if(min===max){min-=step;max+=step}const ticks=[];for(let v=min;v<=max+step/10;v+=step)ticks.push(Math.round(v*1000)/1000);return {min,max,ticks,x:v=>12+(v-min)/(max-min)*296}}
function effectPlot(d,scale,col){const pos=v=>(v-scale.min)/(scale.max-scale.min)*100;return `<span class="effect-plot graphic-lane" role="img" data-estimate="${d.est}" data-low="${d.lo}" data-high="${d.hi}" data-min="${scale.min}" data-max="${scale.max}" aria-label="${d.n}: ${sgn(d.est)} points; 90 percent range ${sgn(d.lo)} to ${sgn(d.hi)}">${chartGrid(scale.ticks.map(pos))}<i class="effect-zero" style="left:${pos(0)}%"></i><i class="effect-range" style="left:${pos(d.lo)}%;width:${pos(d.hi)-pos(d.lo)}%;background:${col}"></i><i class="paired-dot effect-estimate" style="left:${pos(d.est)}%;background:${col}"></i></span>`}

function v12(){const sel=S.stu,all=IVS.map((d,i)=>({d,i})),shown=all.filter(o=>o.d.est!==null),wait=all.filter(o=>o.d.est===null);
  if(!shown.some(o=>o.i===S.v12.r))S.v12.r=shown.length?shown[0].i:null;
  const lg=S.log.length?`<ul class="log">${S.log.slice().reverse().map(e=>`<li><time>${e.at}</time><span class="vp">${vFrom(e.v)}</span><span>${esc(e.t)}</span><span class="pill ${e.kind==='plan'?'watch':'good'}">${e.kind==='plan'?'In progress':'Done'}</span></li>`).join('')}</ul>`:'<p class="none">Nothing logged yet.</p>';
  const prog=`${chd(`My actions today<span class="pill">${S.log.length}</span>`)}${lg}`;
  const scale=actionScale(shown),x=scale.x,axis=`<svg class="action-axis" viewBox="0 0 320 27" aria-label="Score change difference scale: ${scale.min} to ${scale.max} points">${scale.ticks.map(t=>T(x(t),17,sgn(t),{a:'middle',c:'t2',s:12})).join('')}</svg>`;
  const chart=shown.length?`<p class="scale-label">Difference in score change · ${scale.min} to ${scale.max} points</p><div class="visual-list effect-chart" data-scroll="effects">${chartHead('Practice set',chartAxis(scale.ticks.map(t=>[t-scale.min,sgn(t)]),scale.max-scale.min),'Estimate')}${shown.map(o=>{const d=o.d,v=verdict(d);return `<button class="visual-row visual-choice${S.v12.r===o.i?' selected':''}" type="button" data-act="v12row" data-r="${o.i}" aria-expanded="${S.v12.r===o.i}" aria-controls="action-evidence"><span class="visual-name">${d.n}<small>${d.na} participants vs ${d.nb} classmates with enough checks</small></span>${effectPlot(d,scale,v.m)}<span class="visual-reading"><b>${sgn(d.est)} pts</b><small>${v.t}</small></span></button>`}).join('')}</div><div class="legend"><span><i class="ln"></i>90% resampling range</span><span><i class="sw dot"></i>Estimate</span><span>Zero = same score change</span></div>`:'';
  const o=shown.find(q=>q.i===S.v12.r),d=o&&o.d,v=d&&verdict(d),detail=d?`<div class="detail" id="action-evidence"><div class="dhead"><h3>${d.n}</h3><span class="pill ${v.c}">${v.t}</span></div><p class="measure-note">${d.when} · ${d.nq} ${pl(d.nq,'question')} · ${d.cmp}.</p><p>Estimated difference in later score change: ${sgn(d.est)} points (participants minus classmates who did not participate; 90% resampling range: ${sgn(d.lo)} to ${sgn(d.hi)} points).</p>${fold('v12method','How this comparison is calculated','<p>Compare change in question credit on the same skills, excluding the set’s own questions. Each student needs at least two checks before the set and two checks more than two days after it. An estimate requires at least four students in each group. The range is the middle 90% of 400 bootstrap resamples. Participation is not randomized, so the comparison can reflect other differences between the groups.</p>')}${d.kind==='assigned'?(d.who.length<N?whoCol('Didn’t finish it','var(--il-watch)',NM.filter(n=>!d.who.includes(n))):''):d.who.length<N?whoCol('Who participated','var(--il-accent)',d.who):''}</div>`:'';
  const sets=`${chd('Later score changes after practice sets')}<details class="fold"><summary>How these comparisons are read</summary><p><b>Observed comparison:</b> participants’ score change minus nonparticipants’ score change. Zero means the same change; positive values mean a larger gain for participants. Dots show estimates, lines show 90% ranges. These comparisons do not establish cause.</p></details>${shown.length?chart+detail:`<p class="none">${IVS.length?'No set has enough later work for an estimate yet.':'No practice set is recorded for this class.'}</p>`}`;
  const waiting=wait.length?`<details class="action-waiting" data-fold="actions-awaiting"${S.fold['actions-awaiting']?' open':''}><summary>Awaiting evidence · ${wait.length} ${pl(wait.length,'set')}</summary><p class="measure-note">No estimate is available for these sets. Each group needs at least four students with two checks before and two later checks.</p><ul class="waitl">${wait.map(o=>`<li><b>${o.d.n}</b><span class="hint">${o.d.when} · ${o.d.who.length} ${pl(o.d.who.length,'participant')} · ${o.d.cmp}.</span></li>`).join('')}</ul></details>`:'';
  return mcard(`<div class="actions-review">${sets}${waiting}</div>`)+`<section class="mcard" id="log">${prog}</section>`}

/* ---------- practice sets: built for one student, from their profile ---------- */
const cq=t=>esc(t).replace(/`([^`]+)`/g,'<code>$1</code>');
const TCAT={stuck:['Struggling','Doing the work, still beginning or attempted','bad','students'],off:['Low engagement','Little or no practice','bad','students'],item:['Flagged items','Reported, or can’t be marked','bad','items'],drop:['Class-wide drops','Fading for everyone','watch','skills'],ext:['Ready for extension','Mastered, finishing early','good','students']};
const SETN={stuck:'Practice set',off:'Catch-up set',drop:'Review warm-up',ext:'Stretch set'};
const ZWHY={broken:'broken',mis:'misleading',easy:'too easy',hard:'too hard',weak:'doesn’t separate'};
const okIt=it=>zone9(it)==='ok';
/* a short set from the item bank: healthy items only, easiest first, trimmed to the time budget. Nothing is drafted: every item is one from the item bank */
const whoOf=c=>c.cat==='drop'?c.who:c.who.filter(n=>!(S.td.ex[c.id]||[]).includes(n));
function genSet(c){const who=whoOf(c),bank=ITEMS.filter(it=>c.ks.includes(it.k)),use=bank.filter(okIt),rows=[];
  const B=it=>({key:'b'+it.id,f:it.f,type:it.type,nm:it.name,k:it.k,note:`${it.p}% get it right`,sec:it.t});
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
  if(c.cat==='stuck')b.push(`Targets ${c.s}, where ${one?w[0]+' is':'they are'} doing the work but still beginning or attempted.`);
  else if(c.cat==='off')b.push(`Short on purpose: ${one?w[0]+' hasn’t':'they haven’t'} been doing the work in ${c.t}${c.tb?' ('+TB[c.tb].n+')':''}.`);
  else if(c.cat==='drop')b.push('One item per faded skill, as a warm-up for the whole class.');
  else b.push('The hardest healthy questions on what the class is working on now.');
  if(c.cat!=='ext'&&g.items.length>1)b.push(`Easiest first${last&&FKIND[last.f]==='t'?`, ending with a ${last.f} task`:''}.`);
  const src=[...new Set(g.items.filter(r=>!r.draft).map(r=>ITEMS[+r.key.slice(1)].tb))];if(src.length>1)b.push(`Pulls items from ${andList(src.map(x=>BOOKS[x].n))}.`);
  if(g.skip.length)b.push(`Leaves out ${andList(g.skip.slice(0,3).map(it=>`${it.name} (${ZWHY[zone9(it)]})`))}${g.skip.length>3?` and ${g.skip.length-3} more`:''}.`);
  if(g.cut)b.push(`${g.cut} more ${pl(g.cut,'item')} didn’t fit in ${S.td.bud[c.id]||15} minutes.`);
  return b}
const gRow=(r,ix,c)=>`<li${r.draft?' class="new"':''}><span class="gi">${ix+1}</span><span class="fmt${r.draft?' new':''}"${r.draft?tp('Drafted for this group. Check it before you assign the set.'):''}>${r.draft?'New · ':''}${qIcon(r.f,r.type)}${r.f}</span><span class="gq"><b>${r.draft?cq(r.nm):r.nm}</b><span>${ASK[r.k]?skNm(r.k):skn(r.k)}</span></span><span class="gn2">${r.note}</span><button class="x" type="button" data-act="tdrm" data-id="${c.id}" data-k="${r.key}" aria-label="Remove ${r.draft?'the new question':r.nm}">${IC.x}</button></li>`;
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
  IVS.forEach(d=>{if(d.kind==='targeted'&&d.who.length<NM.length&&d.who.includes(n))m.push({w:d.day,k:'iv',t:`Did the practice set ${d.n}`})});   // a set the whole class was given is no moment of one student's
  if(drifting(i))m.push({w:DR[i],k:'bad',t:'Work fell below their normal'});
  slipped(i).slice(0,2).forEach(k=>m.push({w:Math.min(TODAY,KT[k]+RECHECK),k:'bad',t:`Slipped on ${SK[k]}`}));
  return m.sort((a,b)=>a.w-b.w)}
/* Linked histories share a date axis. Learning uses recorded mastered and taught counts;
   activity uses the same own-usual reference as Drifting. Exact period readings remain visible. */
function profileReading(i,j){const skills=TSK.filter(k=>KT[k]<=BE(j)),checked=skills.filter(k=>STW[i][k][j]>=0).length,mastered=skills.filter(k=>STW[i][k][j]===4).length;return {skills:skills.length,checked,mastered,work:WB[i][j],usual:NORM[i],active:ONB[j],start:BS(j),end:BE(j)}}
function profTL(i,W){const L=42,R=85,T0=32,h=85,T2=166,h2=64,H=286,x=j=>L+j*(W-L-R)/Math.max(1,NBC-1),y=v=>T0+h-v/Math.max(1,TSK.length)*h,j=clamp(S.profDay??NBC-1,0,NBC-1),reading=profileReading(i,j),nm=NORM[i],yt=v=>T2+h2-clamp(v,0,200)/200*h2;
  let s=`<svg class="viz profile-timelines" viewBox="0 0 ${W} ${H}" role="group" aria-label="${NM[i]}: linked learning and activity histories; skills are counts, activity is percent of own usual"><defs>${HATCH}</defs>`;
  s+=quietRects(x,T0-4,T2+h2-T0+8,L,W-R);
  s+=T(0,17,'Skills · mastered / taught so far',{c:'t1',w:700});
  [0,TSK.length].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`+T(L-7,y(v)+4,v,{a:'end',c:'t3'})});
  const counts=Array.from({length:NBC},(_,b)=>profileReading(i,b));
  s+=`<polyline class="introduced-line" points="${counts.map((r,b)=>x(b)+','+y(r.skills)).join(' ')}"/><polyline class="mastered-line" points="${counts.map((r,b)=>x(b)+','+y(r.mastered)).join(' ')}"/>`;
  s+=T(W-R+8,y(counts.at(-1).mastered)+4,counts.at(-1).mastered,{c:'tacc',w:700});
  s+=T(0,T2-16,'Activity · 0–200% of own usual',{c:'t1',w:700});
  [0,100,200].forEach(v=>{s+=`<line x1="${L}" x2="${W-R}" y1="${yt(v)}" y2="${yt(v)}" class="${v===100?'usual-reference':'grid'}"/>`+T(L-7,yt(v)+4,v+'%',{a:'end',c:'t3'})});
  if(nm>0){let run=[];const flush=()=>{if(run.length)s+=`<polyline class="activity-line" points="${run.map(b=>x(b)+','+yt(WB[i][b]/nm*100)).join(' ')}"/>`;run=[]};for(let b=0;b<NBC;b++){if(ONB[b])run.push(b);else flush();if(ONB[b]&&WB[i][b]/nm*100>200)s+=`<path d="M${x(b)-4} ${T2+7}L${x(b)} ${T2+1}L${x(b)+4} ${T2+7}" class="overflow-mark"/>`}flush()}else s+=T(L,T2+32,nm===0?'Usual count is zero':'More history needed',{c:'t3'});
  profMoments(i).filter(m=>m.w<=BE(NBC-1)).forEach(m=>{const px=x(clamp(blockOf(m.w),0,NBC-1));s+=`<line x1="${px}" x2="${px}" y1="${T0}" y2="${T2+h2}" class="event-line"/><g tabindex="0" role="button" data-act="profilepoint" data-j="${clamp(blockOf(m.w),0,NBC-1)}" aria-label="${dayDateY(m.w)}: ${esc(m.t)}"${tp(`<b>${dayDateY(m.w)}</b><br>${esc(m.t)}`)}><path d="M${px-5} 246L${px} 241L${px+5} 246L${px} 251Z" style="fill:var(--il-ink-3)"/></g>`});
  s+=`<line x1="${x(j)}" x2="${x(j)}" y1="${T0-6}" y2="${T2+h2}" class="history-selection"/>`;
  for(let b=0;b<NBC;b++){const w=(W-L-R)/Math.max(1,NBC-1);s+=`<g data-act="profilepoint" data-j="${b}" role="button" tabindex="${b===j?0:-1}" aria-pressed="${b===j}" aria-label="${dayDateY(BE(b))}: ${counts[b].mastered} of ${counts[b].skills} taught skills mastered; ${WB[i][b]} questions tried; left and right arrows change period"><rect x="${Math.max(L,x(b)-w/2)}" y="${T0-6}" width="${Math.min(w,W-R-Math.max(L,x(b)-w/2))}" height="${T2+h2-T0+6}" fill="transparent"/></g>`}
  s+=T(L,H-10,dayDateY(BS(0)),{c:'t3'})+T(W-R,H-10,dayDateY(BE(NBC-1)),{a:'end',c:'t3'});
  return s+'</svg>'}
function profileUnitMeasure(n,total,label,tone,icon,note=''){
  const pct=total?pc(n,total):null;
  return `<div class="profile-unit-measure" data-tone="${tone}" role="img" aria-label="${esc(label)}${pct===null?'':'; '+pct+'%'}${note?'; '+esc(note):''}"><div class="profile-unit-measure-head"><span class="profile-unit-measure-count">${engIcon(icon)}<b>${n}</b><span>/ ${total}</span></span><span class="profile-unit-measure-percent">${pct===null?'—':pct+'%'}</span></div>${total?`<span class="profile-unit-track" aria-hidden="true"><span style="width:${n/total*100}%"></span></span>`:''}${note?`<span class="profile-unit-measure-note">${note}</span>`:''}</div>`}
function profileUnitRow(i,U,u){const c=cellN(i,0,{t:'u',id:u}),its=nodeItems({t:'u',id:u}),tried=its.filter(ix=>AT[i].has(ix)).length,ev=U.lab?null:standU(i,u),sc=ev&&ev.e?Math.round(ev.f*100):null,total=KEYC[u].length,complete=!!ev&&total>0&&ev.e===total,met=its.length>0&&tried/its.length>=S.v2.line/100,tone=!its.length?'neutral':met?'good':c.g==='coast'?'watch':'bad';
  const mastery=U.lab?`<span class="profile-unit-unavailable">${engIcon('assignment')}Not assessed</span>`:sc===null?`<span class="profile-unit-unavailable">${engIcon('skill')}More checks needed</span>`:`<div class="profile-table-mastery"><span class="eng-level">${batt(ev.s)}<span>${SL[ev.s]}</span></span><b class="profile-table-score">${sc}</b></div>${ev.cap?`<span class="profile-unit-coverage-note">${engIcon('skill')}Level limited by evidence coverage</span>`:''}`;
  const coverage=U.lab?`<span class="profile-unit-unavailable">${engIcon('assignment')}Practice participation only</span>`:profileUnitMeasure(ev.e,total,`${ev.e} of ${total} key skills assessed`,complete?'good':total?'coverage':'neutral',complete?'check':'skill',!total?'No eligible key skills':complete?'':`${total-ev.e} ${total-ev.e===1?'needs':'need'} more checks`);
  const practice=profileUnitMeasure(tried,its.length,`${tried} of ${its.length} ${U.lab?'labs':'questions'} tried`,tone,met?'check':'assignment',its.length?(U.lab?'Labs':'Questions'):'No eligible practice');
  return `<tr><th scope="row" data-label="Unit"><button class="lnk profile-unit-link" type="button" data-act="profu" data-tb="0" data-u="${u}"><span class="profile-unit-link-icon" aria-hidden="true">${engIcon('book')}</span><span>${U.n}</span><span class="profile-unit-link-arrow" aria-hidden="true">→</span></button>${MULTI?`<small>${BOOKS[U.tb].s}</small>`:''}</th><td data-label="Mastery · score out of 100">${mastery}</td><td data-label="Key skills assessed">${coverage}</td><td data-label="Practice tried">${practice}</td></tr>`}
function vProf(){const i=S.prof,n=NM[i],pv=(i+N-1)%N,nx=(i+1)%N,pp=paceOf(i),st=standU(i,CU),skills=TSK.filter(k=>KT[k]<=TODAY),checked=skills.filter(k=>EV[i][k]>=2),mastered=skills.filter(k=>CAT[i][k]==='F'),gc=profCard(i),open=S.td.gen===gc.id,done=isLogged('td:'+gc.id),moments=profMoments(i),sw=sideWork(i);
  const current=TB0[CU],lab=!!current.lab,score=st.e?Math.round(st.f*100):null,level=lab?'Not assessed':score===null?'More checks needed':SL[st.s];
  const cards=[ic('Current level',lab||score===null?level:`<span class="profile-current-level">${batt(st.s)}<span>${level}</span></span>`,`${current.n}${score===null||lab?'':` · score ${score}/100${st.cap?' · level limited by coverage':''}`}`,''),ic('Evidence coverage',`${checked.length} of ${skills.length} skills`,`${mastered.length} mastered · ${skills.length-checked.length} need more checks`,''),ic('Recent activity',TOOFEW?'More history needed':CLASSIDLE?'No recorded class work':`${WB[i][RB]} questions`,`${MULTI?'Across textbooks · ':''}${RECENT}${NORM[i]===null?'':` · usual ${NORM[i]} per five days`}`,''),ic('Forecast',LABV?'Not assessed':pp.proj===null?'More checks needed':`${pp.now} → ~${paceNum(pp.proj)} of ${pp.goal}`,LABV?'Labs record practice only':`${TB0[S.v4.u].n} · by ${dayDateY(S.v4.day)}${pp.end!==null&&TODAY-pp.end>PACE_WINDOW?' · if work resumes':''}`,'')].map((card,index)=>Object.assign(card,{profile:true,icon:['skill','assignment','analytics','monitoring'][index]}));
  const units=TB0.flatMap((U,u)=>U.on?[profileUnitRow(i,U,u)]:[]);
  const side=[sw.back.length?`<p><b>On an earlier unit:</b> ${andList(sw.back.map(x=>TB0[x.u].n))}. ${sw.back.reduce((a,x)=>a+x.n,0)} questions; latest ${dayDateY(Math.max(...sw.back.map(x=>x.last)))}.</p>`:'',sw.ahead.length?`<p><b>Working ahead:</b> ${andList(sw.ahead.map(x=>TB0[x.u].n))}. ${sw.ahead.reduce((a,x)=>a+x.n,0)} questions; latest ${dayDateY(Math.max(...sw.ahead.map(x=>x.last)))}.</p>`:''].join('');
  const width=Math.max(200,Math.floor(($('#view')?.clientWidth||800)-(window.innerWidth<640?32:48)));
  const legend=`<div class="legend"><span><i class="ln" style="background:var(--il-lv-m)"></i>Mastered skills</span><span><i class="ln" style="background:var(--il-neutral)"></i>Skills taught so far</span><span><i class="ln"></i>Activity / own usual</span><span><i class="sw hatch"></i>No class work</span><span>◇ Recorded event</span></div>`;
  const events=moments.length?`<ol class="moms">${moments.map(o=>`<li><time class="mw">${dayDateY(o.w)}</time><span>${esc(o.t)}</span></li>`).join('')}</ol>`:'<p class="none">No notable events recorded.</p>';
  const j=clamp(S.profDay??NBC-1,0,NBC-1),r=profileReading(i,j),dayControl=pickCtl('profileday',j,Array.from({length:NBC},(_,b)=>[b,dayDateY(BE(b))]),'Inspect period ending');
  const readout=`<section class="history-readout" aria-live="polite" aria-atomic="true" aria-label="Selected period readings"><div class="profile-period-head"><span>Selected period</span><b>${dayDate(r.start)} – ${dayDateY(r.end)}</b>${r.active?'':'<span class="profile-quiet-label"><i class="sw hatch" aria-hidden="true"></i>No class work</span>'}</div><dl class="profile-period-metrics"><div><dt>Mastered skills</dt><dd><b>${r.mastered} / ${r.skills}</b><span>skills taught by this period</span></dd></div><div><dt>Skills assessed</dt><dd><b>${r.checked}</b><span>of ${r.skills} taught skills</span><small>${r.skills-r.checked} need more checks</small></dd></div><div><dt>Questions tried</dt><dd><b>${r.work}</b><span>${r.usual>0?paceNum(r.work/r.usual*100)+'% of own usual':r.usual===0?'Usual count is zero':'Usual not established'}</span></dd></div></dl></section>`;
  const strip=TB0.flatMap((U,u)=>{if(!U.on)return [];const its=nodeItems({t:'u',id:u}),tried=its.filter(ix=>AT[i].has(ix)).length,ev=U.lab?null:standU(i,u),sc=ev&&ev.e?Math.round(ev.f*100):null,unitLevel=U.lab?'Practice only':sc===null?'More checks needed':SL[ev.s];return [`<button class="profile-unit" type="button" data-act="profu" data-tb="0" data-u="${u}" style="--il-unit-level:${ev&&sc!==null?MRAMP[ev.s]:'var(--il-line)'}" aria-label="${U.n}: ${unitLevel}; open ${U.lab?'practice':'student and skill map'}"><span class="profile-unit-heading"><span class="profile-unit-icon">${engIcon('book')}</span><span><small>${U.s}${MULTI?' · '+BOOKS[U.tb].s:''}</small><b>${U.nb}</b></span><span class="profile-unit-arrow" aria-hidden="true">→</span></span><span class="profile-unit-mastery"><span>${U.lab?engIcon('assignment'):sc===null?engIcon('skill'):batt(ev.s)}${unitLevel}</span>${sc===null?'':`<span class="profile-unit-score"><b>${sc}</b> / 100</span>`}</span>${ev&&ev.cap?'<span class="profile-unit-cap">Level limited by evidence coverage</span>':''}<span class="profile-unit-facts"><span><small>${U.lab?'Evidence':'Key skills checked'}</small><b>${U.lab?'Practice only':ev.e+' / '+KEYC[u].length}</b></span><span><small>${U.lab?'Labs':'Questions'} tried</small><b>${tried} / ${its.length}</b></span></span></button>`]});
  return `<div class="prof"><div class="phead"><div class="profile-identity"><span class="profile-avatar" aria-hidden="true">${esc(n.replace(/&[^;]+;/g,' ').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase())}</span><div><p class="eyebrow">Student profile</p><h2 class="pname">${n}</h2></div></div><div class="profile-student-actions">${pinBtn(i)}<nav class="pnav" aria-label="Student navigation"><button class="btn small" type="button" data-act="prof" data-i="${pv}" aria-label="Previous student: ${NM[pv]}">← ${NM[pv]}</button><button class="btn small" type="button" data-act="prof" data-i="${nx}" aria-label="Next student: ${NM[nx]}">${NM[nx]} →</button></nav></div><div class="vctl profile-scope-controls">${bkCtl()}<button class="lnk profile-back" type="button" data-act="profileback">← Back to ${VM[S.profileFrom]&&VM[S.profileFrom].s||'Engagement'}</button></div></div>${evidenceContext()}${insightSummary(cards)}
  <section class="mcard profile-history"><div class="profile-panel-head"><div class="profile-panel-title"><span class="profile-panel-icon">${engIcon('history')}</span><div><h3>${n}: learning and activity</h3><p>Mastery and activity share the same date axis.</p></div></div><div class="profile-period-control">${dayControl}</div></div><div class="profile-panel-body">${readout}<div class="profile-history-legend">${legend}</div><div class="profile-chart">${fig(profTL(i,width))}</div><div class="profile-history-tools">${fold('profile-history-method','How to read the histories','<p>Mastered and taught skills use a count scale. The introduced-skill denominator remains visible, so new skills do not look like forgetting. Activity uses the same 0–200% scale as Drifting; 100% is this student’s usual for the selected As of date. Arrows mark values beyond 200%; select a period for its exact count. Events mark recorded activity and do not establish cause.</p>')}${fold('profile-events','Recorded events · '+moments.length,events)}</div></div><div class="tc-act profile-practice-footer"><div class="profile-practice-context"><span class="profile-panel-icon">${engIcon('assignment')}</span><div><b>Suggested practice</b><span class="hint">${gc.cat==='ext'?'Stretch set':`${SETN[gc.cat]} on ${SUBS[gc.js[0]].n}`}</span></div></div>${done?'<span class="pill good">Set assigned</span>':`<button class="btn primary" type="button" data-act="tdgen" data-id="${gc.id}" aria-expanded="${open}">Generate practice</button>`}</div>${open&&!done?`<div class="profile-generated">${genPanel(gc)}</div>`:''}</section>
  <section class="mcard profile-unit-section"><div class="profile-panel-head"><div class="profile-panel-title"><span class="profile-panel-icon">${engIcon('book')}</span><div><h3>Levels by unit</h3><p>Mastery, key-skill coverage and eligible practice.</p></div></div></div><div class="profile-panel-body"><div class="profile-unit-strip">${strip.join('')}</div>${fold('profile-unit-figures','Exact levels, coverage and practice',`<p class="profile-table-note">Practice threshold: ${S.v2.line}% of eligible questions or labs tried. Mastery levels may be limited by coverage; labs record practice only.</p><div class="table-scroll"><table class="metric-table profile-units"><caption class="sr">${n}: mastery, assessed key skills and eligible practice by unit. Coverage and practice bars use the same 0–100% scale.</caption><thead><tr><th scope="col">Unit</th><th scope="col">Mastery<small>Score out of 100</small></th><th scope="col">Key skills assessed<small>Out of eligible key skills</small></th><th scope="col">Practice tried<small>Out of eligible questions or labs</small></th></tr></thead><tbody>${units.join('')}</tbody></table></div>`)}${side?`<div class="profile-sidework">${side}</div>`:''}</div></section></div>`}
/* ---------- the key for the grid's cells (Engagement and performance) ---------- */
const bar6=(w,col)=>`<svg width="30" height="6" aria-hidden="true"><rect x="0" y="1.5" width="30" height="3" rx="1.5" style="fill:var(--il-surface-2)"/><rect x="0" y="1.5" width="${w}" height="3" rx="1.5" style="fill:${col}"/></svg>`;
const labKey=`<span><svg width="30" height="10" aria-hidden="true"><rect x="0" y="0" width="30" height="10" rx="2" style="fill:var(--il-surface-2)"/><rect x="0" y="0" width="19" height="10" rx="2" style="fill:var(--il-ink-3)"/></svg>Labs tried (no level)</span>`;
/* the scatter's key: what each dot's colour is, then the level bands up its left edge, in ALPS's colours */
const dot2=c=>`<svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" style="fill:${c}"/></svg>`;
const SCKEY=()=>`<div class="legend"><span class="lt">Students</span>${[['var(--il-good)','On track'],['var(--il-ink-3)','Nearly there'],['var(--il-watch)','Coasting'],['var(--il-bad)','Struggling or low engagement']].map(([c,t])=>`<span>${dot2(c)}${t}</span>`).join('')}</div><div class="legend"><span class="lt">Level, on the left edge</span>${[4,3,2,1,0].map(b=>`<span>${lsw(b)}${LV[b]}</span>`).join('')}</div>`;
const CELLKEY=()=>LABV?`<div class="legend key2">${labKey}<span>${bar6(9,'var(--il-bad)')}Under the line</span></div>`:`<div class="legend key2">${RAMPKEY()}<span>${batt('U')}Unavailable</span><span>${bar6(22,'var(--il-axis)')}Engagement</span><span>${bar6(9,'var(--il-bad)')}Under the line</span><span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.6" style="fill:var(--il-bad)"/></svg>Struggling</span>${TB0.some(U=>U.lab&&U.on)?labKey:''}</div>`;

/* ---------- render ---------- */
const HL=[null,null,h2,h3,h4,h6,hSk,h8,null,h10,h11,h12];
/* ---------- a page's answer, as cards (asked 2026-10-26, of Weak now's sentence: "for insights like these, use cards and show them in a
   clean format") ----------
   A card: what it is, the answer (a name or a count), and a line on what it means. A count takes red, amber or green when it is a status; a
   name stays in ink, its card's edge taking the colour. The sentence stays under the cards for screen readers, and the checks read it */
const ic=(l,v,s,tone)=>({l,v:String(v),s,tone});
/* Every page uses the same insight card: label and semantic icon, value, then supporting evidence. */
function insightLeadingIcon(value){
  if(!/^<svg\b[^>]*class="(?:ni|qi)"/.test(value))return {icon:'',text:value};
  const tags=/<\/?svg\b[^>]*>/g;let depth=0,tag;
  while((tag=tags.exec(value))){depth+=tag[0].startsWith('</')?-1:1;if(depth===0)return {icon:value.slice(0,tags.lastIndex),text:value.slice(tags.lastIndex)}}
  return {icon:'',text:value};
}
const insightIconKey=c=>{
  if(c.act==='v2hl')return (ENGSTYLE[c.group]||ENGSTYLE.na)[1]||'assignment';
  if(c.icon)return c.icon;
  if(/^(Teach first|Hardest skill|Reteach first|Weak skills|Small groups first)$/.test(c.l))return 'skill';
  if(/^(Unit|Next unit|Hardest unit)$/.test(c.l))return 'book';
  if(/fad/i.test(c.l))return 'history';
  if(c.l==='Known levels')return 'assignment';
  if(S.view===3)return c.tone==='good'?'check':/little to judge|no class work/i.test(c.v)?'history':'down';
  if(S.view===4)return /early|checks/i.test(c.l)?'history':c.tone==='good'?'check':'monitoring';
  if(S.view===7)return 'assignment';
  if(S.view===11)return c.tone==='good'?'check':c.l==='Practice sets'?'assignment':'history';
  return c.tone==='good'?'check':'skill';
};
function icV(value){
  const transition=value.match(/^(\d+(?:\.\d+)?%?)\s*(→)\s*(~?\d+(?:\.\d+)?%?)(.*)$/);
  if(transition)return `<p class="icv num"><b class="insight-number eng-insight-number">${transition[1]}</b> <span class="insight-arrow">${transition[2]}</span> <b class="insight-number eng-insight-number">${transition[3]}</b>${transition[4].trim()?` <span class="insight-unit eng-insight-denom">${transition[4].trim()}</span>`:''}</p>`;
  const numeric=value.match(/^(\d+(?:\.\d+)?%?)(.*)$/);
  if(numeric){const unit=numeric[2].trim().replace(/^\/\s*(?=\d)/,'of ');return `<p class="icv num"><b class="insight-number eng-insight-number">${numeric[1]}</b>${unit?` <span class="insight-unit eng-insight-denom">${unit}</span>`:''}</p>`}
  const leading=insightLeadingIcon(value);return `<p class="icv">${leading.icon}<span class="icn">${leading.text}</span></p>`;
}
const icS=c=>/^\d/.test(c.v)?c.s:c.s.replace(/^\d+(?: of \d+)?%?(?: → \d+%)?/,m=>`<b>${m}</b>`);
const icards=(cs,sr)=>`<div class="icards"${sr||cs.some(c=>c.act)?'':' aria-hidden="true"'}>${cs.map(c=>{
  const interactive=reviewPage()&&c.act,tag=interactive?'button':'div',key=insightIconKey(c),leading=insightLeadingIcon(c.v),value=key==='skill'&&leading.icon.startsWith('<svg class="ni"')?leading.text:c.v;
  return `<${tag} class="icard${c.tone?' '+c.tone:''}${interactive?' interactive':''}"${interactive?` type="button" data-act="${c.act}" data-g="${c.group||''}"${c.k!==undefined?` data-k="${c.k}"`:''}${c.act==='v2hl'?` aria-pressed="${S.v2.hl===c.group}"`:''}`:''}><div class="insight-card-head"><p class="icl">${c.l}</p><span class="insight-icon eng-insight-icon" aria-hidden="true">${engIcon(key)}</span></div>${icV(value)}${c.s?`<p class="ics">${icS(c)}</p>`:''}</${tag}>`;
}).join('')}</div>`;
function c2(){const f=f2(),card=(g,l,v,s,tone)=>Object.assign(ic(l,v,s,tone),{act:'v2hl',group:g});if(f.lab)return [card('labs','Meets practice threshold',`${f.labs} of ${f.N}`,`at least ${S.v2.line}% of eligible labs tried`,'good'),card('off','Below practice threshold',`${f.off} of ${f.N}`,`under ${S.v2.line}% of eligible labs tried`,f.off?'bad':'')];
  return [card('on','On track',`${f.on} of ${f.N}`,`proficient or mastered; practice threshold met${f.go?`; ${f.go} more nearly there`:''}`,'good'),card('stuck','Needs support',`${f.stuck} of ${f.N}`,'beginning or attempted; practice threshold met',f.stuck?'bad':''),card('off','Below practice threshold',`${f.off} of ${f.N}`,'level below proficient or more checks needed',f.off?'bad':''),card('coast','High performance, fewer attempts',`${f.coast} of ${f.N}`,'proficient or mastered; below practice threshold',f.coast?'watch':'')]}
function c3(){if(TOOFEW)return [ic('Drifting','Too little to judge',`${numWord(NLIVE)} five-day ${pl(NLIVE,'block')} of work; it needs four or more`,'')];
  if(CLASSIDLE)return [ic('Drifting','No class work',`from ${RECENT}; the latest was on ${dayDate(LASTWORK)}`,'')];
  if(CLASSLOW)return [ic('The whole class','Working less',`${NLOW} of ${NJUDGE} under half their normal in the five days to ${dayDate(TODAY)}`,'watch')];
  const fl=flagged3(),n=fl.length,w=JUDGE?watch3().length:0;
  return [ic('Drifting',n,n&&n<=3?`${andList(fl.map(i=>NM[i]))}, below their own normal`:`${pl(n,'student')} below their own normal`,n?'bad':'good')].concat(w?[ic('Under half their normal',w,'others, only in the last five days','watch')]:[])}
function c4(){if(!paceUnits().length)return [ic('On pace','Lab practice','pick a textbook with graded questions to set a goal','')];
  const P=ALL.map(i=>paceOf(i)),goal=paceScope(S.v4.u).ks.length;if(!goal)return [ic('On pace','No key skills','for this unit: pick another target unit','')];
  const early=P.filter(p=>p.proj===null).length,on=P.filter(p=>p.proj!==null&&p.proj>=goal).length;
  return [ic('On pace',`${on} of ${N}`,`estimated to master ${goal} skills by ${dayDateY(S.v4.day)} if recent pace continues`,on?'good':'bad')].concat(paceShort(P).map(([st,n,tone])=>ic(st,n,PSUB[st],tone)),early?[ic('Too early to tell',early,'too little work to project','')]:[])}
/* the chart's groups of students who won't reach the goal by the date, with what each means */
const paceShort=P=>PS.slice(0,3).map(p=>[p[0],P.filter(o=>o.st===p[0]).length,p[3]]).filter(q=>q[1]);
const PSUB={'Short, not catching up':'won’t reach the goal at their pace','Short, but catching up':'won’t reach it yet, but speeding up','Ahead now, but slowing':'ahead of the due line, but slowing'};
function c6(){const {hu,hk}=hard5(S.v6.tb),t=p=>p>=.45?'bad':p>=.3?'watch':'good';if(!hk||hk.p<.15)return [ic('Hardest','Nothing stands out','no unit or skill is hard yet','good')];
  return [ic('Hardest unit',hu.U.n,`${pc5(hu.p)} of assessed student–skill pairs not mastered`,t(hu.p)),ic('Hardest skill',skNm(hk.k),`${pc5(hk.p)} not mastered`,t(hk.p))]}
/* the skills the weak-skills chart lists, under its unit filter: the cards and the sentence count what it shows */
const weakIn=()=>{const uf=S.v7.u;return WEAK.filter(m=>uf==='all'||uOf(m.k)<=+uf)};
function c7(){const L=weakIn();if(!L.length)return [ic('Weak skills',0,'none is weak for a fifth of the class','good')];const p=L.filter(m=>SG[m.st]==='p'),o=L.length-p.length,first=p[0];
  if(!first)return [ic('Weak skills',0,`none now; ${o} ${pl(o,'is','are')} getting better`,'good')];
  return [ic('Teach first',skNm(first.k),`${first.now.length} of ${N} beginning or attempted`,'bad'),ic('Weak skills',`${p.length} ${pl(p.length,'skill')}`,`of the ${L.length} tracked${o?`; ${o} getting better`:''}`,'bad')]}
function c8(){const tb=S.v8.tb,K=k8(),{g,k}=worst7(tree7(tb,K)),n=tbWho(tb).length,what=LABV?BOOKS[PICK].s:TB[tb].n,JS=j=>TBJ(tb,j).s;
  if(!g)return [ic('Stall points','Not started yet',`nothing in ${what} has started`,'')];
  if(g.t[2]<2&&k.t[3]<3)return [ic('Stall points','None so far',K===null?`nobody is stalling in ${what}`:`nobody is stalling on ${ASK[K]}`,'good')];
  const tg=C=>`<span class="tg">${JS(C.j)}</span>`,gu=Object.assign(ic('Most not yet correct',qNm(g.f,g.nm,g.type)+tg(g),`${g.t[2]} of ${n} tried, not yet correct`,'bad'),{act:'stallpick',group:g.j+':'+g.s}),sk=Object.assign(ic('Most skipped',qNm(k.f,k.nm,k.type)+tg(k),`${k.t[3]} of ${n} skipped`,'watch'),{act:'stallpick',group:k.j+':'+k.s});
  return K===null?[gu,sk]:[g.t[2]>=2?gu:null,k.t[3]>=3?sk:null].filter(Boolean)}
function c10(){if(!FD.length)return [ic('Faded','Too early to tell','no skill practised again 21 days after it was taught','')];
  const f=FD.filter(o=>fadeKind(o.d)==='fade').sort((a,b)=>a.d-b.d);if(!f.length)return [ic('Faded','None',`of the ${FD.length} skills practised again later`,'good')];
  const top=f[0];return [ic('Faded most',skNm(top.k),`${Math.round(top.a)}% → ${Math.round(top.b)}% class average, initial to later checks`,'bad'),ic('Skills that faded',`${f.length} of ${FD.length}`,'of the skills practised again later','watch')]}
function c11(){const P=planNow(),R=P.R,nm=R.U.n,C=rdCoverage(R),nx=R.st==='next'||R.st==='later',lab=nx?'Next unit':'Unit';
  if(!R.pre.length)return [ic(lab,nm,'builds on no skill from outside it','')];
  if(!P.n)return [ic(lab,nm,'more evidence needed on every prerequisite',''),ic('Known levels',`${C.assessed} / ${C.total}`,'student–prerequisite records; unknown stays separate','')];
  const tone=P.red.length?'bad':P.amb.length||C.incomplete?'watch':'good',sub=`${rdVerdict(P.L).t} · target ${SL[P.L].toLowerCase()}`;
  return [ic(lab,nm,sub,tone),ic('Known levels',`${C.assessed} / ${C.total}`,`${C.unknown} unknown student–prerequisite records${C.missing?`; ${C.missing} prerequisites need more evidence`:''}`,C.incomplete?'watch':'')].concat(P.red.length?[ic('Reteach first',skNm(P.red[0].k),`under 60% of assessed students ${lvAt(P.L)}`,'bad')]:P.amb.length?[ic('Small groups first',`${P.amb.length} ${pl(P.amb.length,'skill')}`,`60–79% of assessed students ${lvAt(P.L)}`,'watch')]:[])}
function c12(){const n=S.log.length,out=n?[ic('Logged today',n,pl(n,'action'),'')]:[];
  if(!IVS.length)return out.concat([ic('Practice sets','None yet','no set is recorded for this class','')]);
  const J=IVS.filter(d=>d.est!==null),w=J.filter(d=>d.lo>0),rest=IVS.length-J.length;
  if(!J.length)return out.concat([ic('Awaiting evidence',`${rest} ${pl(rest,'set')}`,'too few before-and-after checks for a comparison','')]);
  out.push(ic('Clear positive difference',`${w.length} / ${J.length}`,w.length?andList(w.map(d=>d.sn)):'among sets with estimates; association, not proven cause',w.length?'good':''));
  if(rest)out.push(ic('Awaiting evidence',`${rest} / ${IVS.length}`,'practice sets without an estimate',''));
  return out}
const ICD=[null,null,c2,c3,c4,c6,cSk,c8,null,c10,c11,c12];
const insightSummary=cards=>`<div class="page-summary" style="--il-insight-columns:${cards.length>4?3:Math.max(1,cards.length)}">${icards(cards,true)}</div>`;
const pageSummary=k=>insightSummary(ICD[k]());
const setAns=k=>{const a=$('#ans'),c=$('#ansc');if(a)a.textContent=HL[k]();if(c)c.innerHTML=pageSummary(k)};
const VF=[null,null,v2,v3,v4,v6,vSk,v8,null,v10,v11,v12];
const VQ=k=>VM[k].q,HOWK=k=>k===6?HOWSK():k===7&&S.v8.ver!=='now'&&SVHOW[S.v8.ver]?SVHOW[S.v8.ver]:HOW[k];
const DRAW={2:v2draw,4:v4draw,10:v11draw};
const ord=n=>n+(n%10===1&&n%100!==11?'st':n%10===2&&n%100!==12?'nd':n%10===3&&n%100!==13?'rd':'th');
/* the top bar names the class and counts its books. The pages have no footer and no table of sources (asked 2026-10-26: "remove these parts from
   all the pages"); while the example is on (?books), its chip says what in it is invented and takes the page back to the class as recorded */
function renderHead(){
  $('#cname').textContent=`${D.meta.name} · ${D.meta.textbook}${BOOKS.length>1?` + ${BOOKS.length-1} ${pl(BOOKS.length-1,'textbook')}`:''} · ${N} students`;
  const inv=EX?BKON.filter(tb=>BOOKS[tb].inv).map(tb=>BOOKS[tb].sr):[],chip=$('#demochip');
  if(chip&&EX){chip.innerHTML=`Example · work in ${esc(andList(inv))} is invented${IC.x}`;chip.setAttribute('aria-label',`Example: the work in ${andList(inv)} is invented. Back to the class as recorded`);chip.hidden=false}
  try{if(!options.embedded)document.title=`Insight Lens · ${D.meta.name}`}catch(_){}}
/* the bar's versions, to choose from (asked 2026-10-26, of the bar for Drew: "Let's use different formatting for this following card. It is
   mixing up everything. Give 4-5 different versions of it to select from"). The current bar runs each flag's status, unit, figures and forecast
   into one pill; each version keeps the status apart from its details. A version is picked in the bar, and ?fv=1 to 5 opens one */
const FVV=[['now','Current'],['1','v1 · Status chips'],['2','v2 · A row a page'],['3','v3 · Columns'],['4','v4 · By group'],['5','v5 · Scorecard']];
const pgOf=v=>v===5||v===9?6:v;   // a flag from By unit or Faded belongs to the Skills page
const fAct=f=>`data-act="${f.v===7?'gosub':f.v===10?'gonext':'go'}" data-v="${f.v}"${f.v===7?` data-j="${CJ}"`:''}`;
const fTip=f=>tp(`<b>${esc(f.s)}</b>${f.dl?'<br>'+esc(f.dl):''}<br><span>Open ${VM[pgOf(f.v)].s}</span>`);
/* v1: the statuses alone, as the app's status chips; the details on hover */
const fv1=fl=>`<div class="fv1">${fl.map(f=>`<button class="fv1-c ${f.l}" type="button" ${fAct(f)}${fTip(f)}>${esc(f.s)}</button>`).join('')}</div>`;
/* v2: a row a page, its parts in columns: the page, the status, the details */
const fv2=fl=>`<div class="fv2">${fl.map(f=>`<button class="fv2-r" type="button" ${fAct(f)}${tp(`Open ${VM[pgOf(f.v)].s}`)}>${glyph(pgOf(f.v))}<span class="fv2-p">${VM[pgOf(f.v)].s}</span><span class="fv2-s ${f.l}">${esc(f.s)}</span><span class="fv2-d">${esc(f.dl)}</span><span class="fv2-go" aria-hidden="true">›</span></button>`).join('')}</div>`;
/* v3: a strip of figures, a column a flag with a line between: the page, the status, the detail */
const fv3=fl=>`<div class="fv3">${fl.map(f=>`<button class="fv3-c" type="button" ${fAct(f)}${fTip(f)}><span class="fv3-p">${VM[pgOf(f.v)].s}</span><span class="fv3-s ${f.l}">${esc(f.s)}</span><span class="fv3-d">${esc(f.d)}</span></button>`).join('')}</div>`;
/* v4: under the rail's groups, so a flag sits where its page sits in the rail */
const fv4=fl=>`<div class="fv4">${GROUPS.map(([g,ks])=>{const mine=fl.filter(f=>ks.includes(pgOf(f.v)));return `<div class="fv4-g"><p class="fv4-h">${g}</p>${mine.length?mine.map(f=>`<button class="fv4-r" type="button" ${fAct(f)}${fTip(f)}><span class="lvl ${f.l}"></span><span><b class="fv4-s ${f.l}">${esc(f.s)}</b> <span class="fv4-d">${esc(f.d)}</span></span></button>`).join(''):'<p class="fv4-n">Nothing to flag</p>'}</div>`}).join('')}</div>`;
/* v5: a slot for every page, in the rail's order and the same for every student; a slot shows its worst flag, a good one in green, or a dash */
const fv5=all=>`<div class="fv5">${GROUPS.flatMap(([g,ks])=>ks).map(k=>{const fs=all.filter(f=>pgOf(f.v)===k),w=fs.find(f=>f.l==='bad')||fs.find(f=>f.l==='watch')||fs.find(f=>f.l==='good')||fs[0];
  return `<button class="fv5-s ${w?w.l:'none'}" type="button" data-act="go" data-v="${k}"${tp(`<b>${VM[k].s}</b><br>${fs.length?fs.map(f=>esc(f.s+(f.dl?': '+f.dl:''))).join('<br>'):'Nothing to flag'}`)}>${glyph(k)}<span class="fv5-p">${VM[k].s}</span><span class="fv5-v">${w?esc(w.s):'—'}</span>${fs.length>1?`<span class="fv5-m">+${fs.length-1} more</span>`:''}</button>`}).join('')}</div>`;
function renderReviewThread(el){const i=S.stu,f=flags(i),u=TB0[CU],st=standU(i,CU),pp=paceOf(i),weak=WEAK.filter(m=>m.now.includes(NM[i])).length;
  const slots=[['Current level',u.lab?'Not assessed':!st.e?'More checks needed':SL[st.s],u.n,2],['Weak skills',`${weak} skills`, 'Beginning or attempted',6],['Recent activity',CLASSIDLE?'No recorded class work':`${WB[i][RB]} questions`,`${MULTI?'Across textbooks · ':''}${RECENT}`,'p'],['Forecast',LABV?'Not assessed':pp.proj===null?'More checks needed':`${pp.now} → ~${paceNum(pp.proj)} of ${pp.goal}`,LABV?'Labs record practice only':`${TB0[S.v4.u].n} · by ${dayDateY(S.v4.day)}${pp.end!==null&&TODAY-pp.end>PACE_WINDOW?' · if work resumes':''}`,LABV?'p':4]];
  el.hidden=false;el.className='thread review-thread';el.innerHTML=`<div class="th-who"><span class="eyebrow">Following</span><b>${NM[i]}</b></div><div class="follow-summary">${slots.map(([label,value,sub,v])=>`<button type="button" data-act="${v==='p'?'prof':'go'}" data-${v==='p'?'i':'v'}="${v==='p'?i:v}"><span>${label}</span><b>${value}</b><small>${sub}</small></button>`).join('')}</div><div class="th-act"><button class="btn small" type="button" data-act="prof" data-i="${i}">Open profile</button>${pinBtn(i)}</div><details class="follow-concerns"><summary>All findings · ${f.length}</summary>${f.length?f.map(x=>`<button class="lnk" type="button" ${fAct(x)}>${VM[pgOf(x.v)].s}: ${esc(x.t).replace(/Gave up/g,'Tried, not yet correct').replace(/gave up/g,'tried, not yet correct')}</button>`).join(''):'<p class="none">No concerns recorded.</p>'}</details>`}
function renderThread(){const el=$('#thread');if(S.stu===null){el.hidden=true;el.innerHTML='';return}if(reviewPage()){renderReviewThread(el);return}
  const i=S.stu,all=flags(i),fl=all.filter(f=>f.l==='bad'||f.l==='watch').sort((a,b)=>PN[a.v]-PN[b.v]),V=S.fv;el.hidden=false;el.className='thread'+(V==='now'?'':' fv fv-'+V);
  const none='<span class="hint">No concerns on any page.</span>';
  const body=V==='1'?(fl.length?fv1(fl):none):V==='2'?(fl.length?fv2(fl):none):V==='3'?(fl.length?fv3(fl):none):V==='4'?fv4(fl):V==='5'?fv5(all):`<div class="th-flags">${fl.length?fl.map(f=>`<button class="flag" type="button" data-act="${f.v===7?'gosub':f.v===10?'gonext':'go'}" data-v="${f.v}"${f.v===7?` data-j="${CJ}"`:''}${tp(`Open ${VM[f.v].s}`)}><span class="lvl ${f.l}"></span>${esc(f.t)}</button>`).join(''):none}</div>`;
  el.innerHTML=`<div class="th-who"><span class="eyebrow">Following</span><b>${NM[i]}</b></div>${body}<div class="th-act"><span class="th-ver">${pickCtl('fvver',S.fv,FVV,'Version')}</span>${S.view==='p'&&S.prof===i?'':`<button class="btn small" type="button" data-act="prof" data-i="${i}">Open profile</button>`}<button class="btn small" type="button" data-act="clear">Stop following</button></div>`}
function renderRail(){let h='';
  GROUPS.forEach(([g,ks])=>{h+=`<p class="rg"><span>${g}</span></p>`+ks.map(k=>`<button type="button" data-act="go" data-v="${k}"${S.view===k?' aria-current="page"':''} aria-label="${VM[k].s}" title="${PWHY[k][0].toUpperCase()+PWHY[k].slice(1)}">${glyph(k)}<span class="rq">${VM[k].s}</span></button>`).join('')});
  $('#rail').innerHTML=h}
/* the book filter: once two books have work, the first control under the answer on every page and under the name on a profile. "All books", or one book with work.
   The pick is part of the address (?book=<id>), so a link keeps it and Back returns to the book before; a change reloads the page, which works everything out again for that book */
/* the same bar also carries the day the pages are read as of: a date picker that reloads with ?today=, and the way back to today (the export date) */
const asOfCtl=()=>`<label class="sel" for="asof">As of <input type="date" id="asof" value="${isoOf(TODAY)}" min="${isoOf(0)}" max="${isoOf(EXPORTDAY)}"></label>${TODAY!==EXPORTDAY?`<button class="lnk" type="button" data-act="today">Back to ${dayDateY(EXPORTDAY)}</button>`:''}`;
/* a page's filters sit on the right of its title (asked 2026-10-26: "move all the filters to the right of each page and just after the
   title. The cards must come after it"): a view hands its filters over as it draws, and the frame puts them in the title's row, before the
   textbook and the day */
let PCTL='';const toHead=h=>{PCTL+=h;return ''};
/* each chart and what goes with it (its name, key, panel and folds) is one card on the gray page, in Material's raised paper (asked
   2026-10-26: "keep each graph in it's own card. Some sections have multiple graphs. Use one card for each the full section. Also, use
   material UI to make things look better"); the title row and the answer cards sit on the page above them */
const mcard=h=>h?`<section class="mcard">${h}</section>`:'';
const bkCtl=()=>`${MULTI?pickCtl('bksel',PICK===null?'all':esc(BOOKS[PICK].id),[['all','All textbooks']].concat(BKON.map(tb=>[esc(BOOKS[tb].id),`${BL[tb]} · ${BOOKS[tb].s}`])),'Textbook'):''}${asOfCtl()}`;
const withQ=(name,val)=>{const q=location.search.replace(/^\?/,'').split('&').filter(p=>p&&!(new RegExp('^'+name+'(=|$)')).test(p)&&!/^r=/.test(p));if(val!==null)q.push(name+'='+encodeURIComponent(val));return location.pathname+(q.length?'?'+q.join('&'):'')+location.hash};
const bkUrl=id=>withQ('book',id),asOfUrl=iso=>withQ('today',iso);
const evidenceContext=()=>`<p class="evidence-context">${TODAY!==EXPORTDAY?`<strong>Historical view · ${dayDateY(TODAY)}</strong><span> · </span>`:''}Latest recorded work: <strong>${dayDateY(LASTWORK)}</strong>${MULTI?`<span> · Showing ${PICK===null?'all textbooks':BOOKS[PICK].s}. Skill levels use available checks across textbooks.</span>`:''}</p>`;
function frame(k,body){const how=`<details class="how"><summary>How to read</summary>${(h=>/^<p>/.test(h)?h:`<p>${h}</p>`)(HOWK(k))}</details>`;
  const head=[2,6,7,10].includes(k)?`<div class="vhead"><div class="eng-page-heading"><span class="eng-page-icon" aria-hidden="true">${glyph(k)}</span><div><h2 class="q">${k===6?'Skills':k===7?'Stall points':k===10?'Ready for a unit':'Engagement and performance'}</h2><p>${k===6?'Find skills to reteach, explore mastery and spot scores that faded.':k===7?'Find questions to revisit and see which students need help.':k===10?'Explore prerequisite mastery and plan what to teach first.':'Mastery and eligible practice for the selected unit.'}</p></div></div>${how}<div class="vctl eng-scope-controls">${PCTL}${bkCtl()}</div></div>`:`<div class="vhead"><h2 class="q">${VQ(k)}</h2><div class="vctl">${PCTL}${bkCtl()}${how}</div></div>`;
  return `${head}${reviewPage()?evidenceContext():''}<p class="answer sr" id="ans">${HL[k]()}</p><div id="ansc">${pageSummary(k)}</div>${body}`}
/* a slider's track is filled up to its thumb: the stylesheet draws it from --il-p, which is kept here */
const rngFill=e=>e.style.setProperty('--il-p',((e.value-e.min)/Math.max(1,e.max-e.min)*100).toFixed(1)+'%');
const saveChartScroll=()=>UIROOT.querySelectorAll?[...UIROOT.querySelectorAll('[data-scroll]')].map(e=>({key:e.dataset.scroll,top:e.scrollTop,left:e.scrollLeft})):[];
const restoreChartScroll=saved=>{if(!UIROOT.querySelectorAll)return;const nodes=[...UIROOT.querySelectorAll('[data-scroll]')];saved.forEach(p=>{const e=nodes.find(n=>n.dataset.scroll===p.key);if(e){e.scrollTop=p.top;e.scrollLeft=p.left}})};
const revealEvidence=(id,block='nearest')=>{const el=UIROOT.querySelector?UIROOT.querySelector('#'+(id)):null;if(el&&el.scrollIntoView)el.scrollIntoView({block})};
function renderView(){const scroll=saveChartScroll();const k=S.view,el=$('#view');el.classList.toggle('review-view',reviewPage());el.classList.toggle('engagement-page',k===2);el.classList.toggle('skills-page',k===6);el.classList.toggle('profile-page',k==='p');el.classList.toggle('stall-page',k===7);el.classList.toggle('ready-page',k===10);if(S.pvGo)S.fold['pv-'+S.pvGo]=true;if(k==='p'){el.innerHTML=vProf();restoreChartScroll(scroll);return}PCTL='';el.innerHTML=frame(k,VF[k]());if(DRAW[k])DRAW[k]();el.querySelectorAll('input[type=range]').forEach(rngFill);pvScroll();restoreChartScroll(scroll)}
function render(){tips.clear();tipN=0;hideTip();renderThread();renderRail();renderView();renderLogChip();renderTbl()}
const reView=()=>{tips.clear();tipN=0;hideTip();renderView();renderTbl()};

/* ---------- tooltip ---------- */
const tipEl=$('#tip');let tipT=null;
function showTip(id,cx,cy){const h=tips.get(id);if(!h){hideTip();return}tipEl.innerHTML=h;tipEl.hidden=false;const r=tipEl.getBoundingClientRect();let x=cx+14,y=cy+14;if(x+r.width>innerWidth-8)x=cx-r.width-14;if(y+r.height>innerHeight-8)y=cy-r.height-14;tipEl.style.left=Math.max(8,x)+'px';tipEl.style.top=Math.max(8,y)+'px'}
function hideTip(){if(tipEl)tipEl.hidden=true}
listen(UIROOT,'pointermove',e=>{if(e.pointerType==='touch')return;const t=e.target.closest?e.target.closest('[data-tip]'):null;if(t)showTip(t.dataset.tip,e.clientX,e.clientY);else hideTip()});
listen(UIROOT,'pointerdown',e=>{if(e.pointerType!=='touch')return;const t=e.target.closest?e.target.closest('[data-tip]'):null;if(t){showTip(t.dataset.tip,e.clientX,e.clientY);clearTimeout(tipT);tipT=setTimeout(hideTip,2600)}else hideTip()});
listen(UIROOT,'focusin',e=>{const t=e.target.closest?e.target.closest('[data-tip]'):null;if(t){const b=t.getBoundingClientRect();showTip(t.dataset.tip,b.left+b.width/2,b.top+b.height/2)}});
listen(UIROOT,'focusout',hideTip);
listen(window,'scroll',hideTip,{passive:true});

/* ---------- events ---------- */
/* pages 5 and 9 are views of the Skills page */
const toPage=k=>{if(k===5){S.v7.view='unit';S.pvGo='sk-unit';return 6}if(k===9){S.v7.view='faded';S.pvGo='sk-faded';return 6}if(k===6)S.v7.view='weak';return k};
/* Navigation preserves the selected date and textbook. Historical activity is an explicit choice. */
function go(k){k=toPage(k);S.tbl=null;S.v2.detail=null;S.v2.overlap=null;engOpener=null;S.view=k;try{history.replaceState(null,'',k==='p'?'#s-'+encodeURIComponent(NM[S.prof]):'#'+SLUG[k==6&&S.v7.view==='unit'?5:k==6&&S.v7.view==='faded'?9:k])}catch(_){}const sec=S.pvGo;render();const v=$('#view');if(!sec&&v&&v.getBoundingClientRect().top<64)v.scrollIntoView({block:'start'})}
const ATTRS=['v','i','k','r','s','f','u','j','n','g','t','id'];
function refocus(a,ds){const sel=`[data-act="${a}"]`+ATTRS.filter(x=>ds[x]!==undefined).map(x=>`[data-${x}="${String(ds[x]).replace(/"/g,'')}"]`).join('');let el=null;try{el=(S.tbl&&UIROOT.querySelector('#dlg '+sel))||UIROOT.querySelector('#view '+sel)||UIROOT.querySelector(sel)}catch(_){}if(el&&el.focus)el.focus({preventScroll:true})}
const refocusId=id=>{const el=UIROOT.querySelector('#'+(id));if(el)el.focus({preventScroll:true})};
const maxGaveUp=j=>{const g=cCnt(0,j).map(c=>c[2]);return g.indexOf(Math.max(...g))};
listen(UIROOT,'click',e=>{const t=e.target.closest('[data-act]');if(!t)return;const a=t.dataset.act,d=Object.assign({},t.dataset);
  switch(a){
  case 'activeperiod':location.assign(asOfUrl(isoOf(DEMODAY)).split('#')[0]+'#'+SLUG[+d.v]);return;
  case 'v3detail':S.v3.detail=S.v3.detail===+d.i?null:+d.i;reView();{const panel=$('#activity-evidence');if(S.v3.detail!==null&&panel&&panel.scrollIntoView)panel.scrollIntoView({block:'nearest'})}break;
  case 'v4detail':S.v4.detail=S.v4.detail===+d.i?null:+d.i;reView();{const panel=$('#pace-evidence');if(S.v4.detail!==null&&panel&&panel.scrollIntoView)panel.scrollIntoView({block:'nearest'})}break;
  case 'profilepoint':S.profDay=clamp(+d.j,0,NBC-1);reView();break;
  case 'unitcell':S.v6.cell={i:+d.i,k:+d.k};reView();revealEvidence('unit-cell-evidence');break;
  case 'heatpage':S.v6.hmPage=Math.max(0,(S.v6.hmPage||0)+ +d.f);S.v6.cell=null;reView();break;
  case 'fadeinspect':S.v10.student=S.v10.student===+d.i?undefined:+d.i;reView();refocus('fadeinspect',d);revealEvidence('fade-result-'+d.i,S.v10.student===undefined?'nearest':'start');break;
  case 'fadestudentclose':{const i=S.v10.student;S.v10.student=undefined;reView();refocus('fadeinspect',{i,k:S.v10.k});revealEvidence('fade-result-'+i);break}
  case 'rdlayout':S.v11.ver=d.f==='2'?'2':'now';try{history.replaceState(null,'',withQ('rv',S.v11.ver==='2'?'2':null))}catch(_){}reView();break;
  case 'rdzoom':rdZoom(d.f);break;
  case 'rdpick':S.v11.skill=S.v11.skill===+d.k?null:+d.k;S.v11.node=null;reView();revealEvidence('prerequisite-evidence');break;
  case 'rdnode':S.v11.node=S.v11.node===+d.k?null:+d.k;S.v11.skill=null;reView();revealEvidence('prerequisite-evidence');break;
  case 'rdinspect':S.v11.node=+d.parent;S.v11.skill=+d.k;reView();revealEvidence('prerequisite-evidence');break;
  case 'rdclose':S.v11.node=null;S.v11.skill=null;reView();break;
  case 'pin':S.stu=S.stu===+d.i?null:+d.i;render();break;
  case 'skillsection':S.fold['pv-'+d.g]=true;S.pvGo=d.g;if(d.k!==undefined){if(d.g==='sk-faded')S.v10.k=+d.k;else if(d.g==='sk-unit'){const tb=S.v6.tb,H=hard5(tb),E=ex5(tb,H),U=H.T.find(U=>U.subs.some(J=>J.ks.some(K=>K.k===+d.k)));S.v6.sel[tb]=+d.k;if(U){if(!E.U.includes(U.u))E.U.push(U.u);const J=U.subs.find(J=>J.ks.some(K=>K.k===+d.k));if(J&&!E.J.includes(J.j))E.J.push(J.j)}}else{const r=WEAK.findIndex(m=>m.k===+d.k);if(r>=0)S.v7.r=r}}go(6);return;
  case 'profileback':go(S.profileFrom||2);return;
  case 'stu':{const i=+d.i;if(reviewPage()){S.profileFrom=S.view;S.prof=i;S.td.gen=null;go('p');return}const inT=!!t.closest('#dlg');S.stu=S.stu===i?null:i;if(S.stu!==null)S.v2.hl=null;render();   // the student just followed takes the chart's focus from a picked card
    if(inT){const b=UIROOT.querySelector(`#dlg [data-act="stu"][data-i="${i}"]`);if(b)b.focus({preventScroll:true})}break}   // followed from a skill's table, the focus stays on the name there
  /* a skill's table: open and close it, pick who is shown, sort by a column, pick a question (sorted by it, its details over the table) */
  case 'tblopen':openTbl(+d.k,d.f,d.g);return;
  case 'tblclose':closeTbl();return;
  case 'tblf':if(!S.tbl)break;S.tbl.f=d.f;renderTbl();break;
  case 'tbls':{const T=S.tbl;if(!T)break;if(T.s===d.f)T.dir=-T.dir;else{T.s=d.f;T.dir=1}T.q=null;renderTbl();break}
  case 'tblcell':{if(!S.tbl)break;S.tbl.cell={i:+d.i,ix:+d.id};renderTbl();const detail=$('#dlg .tbl-evidence');if(detail){if(detail.scrollIntoView)detail.scrollIntoView({block:'nearest'});const close=detail.querySelector('[data-act="tblcellclose"]');if(close)close.focus({preventScroll:true})}return}
  case 'tblcellclose':{if(!S.tbl)break;const c=S.tbl.cell;S.tbl.cell=null;renderTbl();if(c){refocus('tblcell',{i:c.i,id:c.ix});const cell=UIROOT.querySelector(`#dlg [data-act="tblcell"][data-i="${c.i}"][data-id="${c.ix}"]`);if(cell&&cell.scrollIntoView)cell.scrollIntoView({block:'nearest',inline:'nearest'})}return}
  case 'tblq':{const T=S.tbl,ix=+d.id;if(!T)break;if(T.q===ix){T.q=null;T.s=T.s0}else{T.q=ix;T.s='q'}T.dir=1;renderTbl();break}
  case 'tblqx':{const T=S.tbl,ix=+d.id;if(!T)break;T.q=null;T.s=T.s0;T.dir=1;renderTbl();const h=UIROOT.querySelector(`#dlg .qh[data-id="${ix}"]`);if(e.detail===0&&h)h.focus({preventScroll:true});return}
  case 'clear':S.stu=null;render();break;
  case 'go':if(+d.v===7)S.v8.k=null;go(+d.v);break;   // the rail opens Stall points on every question
  case 'gofor':S.stu=+d.i;if(+d.v===7)open7(0,CJ,maxGaveUp(CJ));if(+d.v===10){S.v11.tb=0;S.v11.u[0]=rdDef(0)}go(+d.v);break;
  case 'log':go(11);{const l=$('#log');if(l&&l.scrollIntoView)l.scrollIntoView({block:'start'})}break;
  case 'v2u':{const u=+d.u;at2(u,null);S.v2.sel={t:'u',id:u};reView();break}
  case 'v2j':{const j=+d.j;at2(uOfJ(j),j);S.v2.sel={t:'j',id:j};reView();break}
  case 'v2k':S.v2.sel={t:'k',id:+d.k,j:+d.j};reView();break;
  case 'v2sel':{const id=+d.id,E=S.v2;if(d.i!==undefined)E.detail=+d.i;if(d.t==='u'){at2(id,null);E.sel={t:'u',id}}else if(d.t==='j'){at2(uOfJ(id),id);E.sel={t:'j',id}}else E.sel={t:'k',id,j:+d.j};reView();break}
  case 'v2up':{const E=S.v2,u=E.at.u,j=E.at.j;E.sel={t:'u',id:u};if(d.f==='all')at2(null,null,TAUGHT.indexOf(u));else at2(u,null,uJs(0,u).filter(x=>SUBS[x].on).indexOf(j));reView();break}
  case 'v2pg':S.v2.pg+=+d.f;reView();break;
  case 'v2mode':S.v2.mode=d.f;v2draw();break;
  case 'v2detail':openEvidence2(+d.i,t);return;
  case 'v2overlap':openOverlap2((d.students||'').split(',').map(Number),t);return;
  case 'v2overlapback':backOverlap2();return;
  case 'v2close':closeEvidence2();return;
  case 'v2hl':{S.v2.hl=S.v2.hl===d.g?null:d.g;hideTip();v2draw();const f=$('#v2top .fig');if(S.v2.hl&&f){const r=f.getBoundingClientRect();if(r.top<0||r.top>window.innerHeight-80)$('#v2top').scrollIntoView({block:'start',behavior:'smooth'})}break}   // stacked on a narrow page, the chart is above the cards: bring it into view
  case 'v2log':{const E=S.v2,tb=E.tb,g=d.g,nm=nodeName(E.sel,tb)+(tb?` (${TB[tb].s})`:''),who=tbWho(tb).filter(i=>cellN(i,tb,E.sel).g===g).map(i=>NM[i]);
    const txt=g==='stuck'?`Group for ${nm}: ${andList(who)}`:g==='off'?`Assigned the ${LABV?'labs':'practice'} in ${nm} to ${andList(who)}`:`Stretch set in ${nm} for ${andList(who)}`;
    logAct(`v2:${tb}:${E.sel.t}${E.sel.id}:${g}`,2,txt,'plan');v2draw();break}
  case 'v6unit':{S.v6.heat=S.v6.heat===+d.u?null:+d.u;S.v6.hmPage=0;S.v6.cell=null;const E=S.v6.ex[S.v6.tb],u=+d.u;if(!E)break;const ix=E.U.indexOf(u);if(ix>=0)E.U.splice(ix,1);else E.U.push(u);reView();break}
  case 'v6sub':{const E=S.v6.ex[S.v6.tb],j=+d.j;if(!E)break;const ix=E.J.indexOf(j);if(ix>=0)E.J.splice(ix,1);else E.J.push(j);reView();break}
  case 'v6sk':S.v6.sel[S.v6.tb]=S.v6.sel[S.v6.tb]===+d.k?null:+d.k;reView();break;
  case 'v6lvl':{const tb=S.v6.tb,E=S.v6.ex[tb];if(!E)break;const {us,js}=lvAll5(tb);if(d.f==='u'){E.U=[];E.J=[]}else if(d.f==='j'){E.U=us.slice();E.J=[]}else{E.U=us.slice();E.J=js.slice()}reView();break}
  case 'gosub':{const j=+d.j;open7(0,j,maxGaveUp(j));go(7);return}
  /* where they stall on a skill: Stall points' worst questions narrowed to the skill, the worst of them picked */
  case 'gosk':{const k=+d.k,w=worstQs(tree7(0,k),k);if(!w.length)break;S.v8.k=k;S.v8.view='worst';S.v8.tb=0;S.v8.selw[0]={j:w[0].j,s:w[0].s};go(7);return}
  case 'stallpick':S.v8.focus=S.v8.focus===d.g?null:d.g||null;S.fold['pv-sp-worst']=true;reView();break;
  case 'v8k':S.v8.k=null;S.v8.focus=null;reView();break;
  /* every question on the skill: the outline, opened down to the questions */
  case 'v8allk':{const tb=S.v8.tb,E=ex7(tb),{us,js}=lvAll7(tree7(tb,k8()));E.U=us.slice();E.J=js.slice();S.v8.view='outline';S.pvGo='sp-unit';reView();break}
  case 'gointro':{const j=+d.j,k=+d.k;at2(uOfJ(j),j);S.v2.sel={t:'k',id:k,j};S.fold['pv-eng-grid']=true;go(2);return}
  case 'v7f':S.v7.f=d.f;S.v7.more=false;S.v7.pts=[];reView();break;
  case 'v7row':S.v7.r=+d.r;S.v7.pts=[];reView();refocus('v7row',d);revealEvidence('weak-skill-'+S.v7.r);break;
  /* A point inspects one date. Comparisons require the visible comparison controls. */
  case 'v7pt':{const r=+d.r,j=+d.j;S.v7.pts=[{r,j}];S.v7.r=r;S.v7.mode='day';reView();break}
  case 'v7mode':{S.v7.mode=d.f;S.v7.pts=[];S.fold['skill-history-'+WEAK[S.v7.r].k]=true;reView();break}
  case 'v7compare':{const r=S.v7.r,m=WEAK[r],a=$('#v7day-a'),b=$('#v7day-b'),other=$('#v7skill-b'),mode=S.v7.mode||'day';if(!m||!b)break;const j=+b.value;
    S.v7.pts=mode==='dates'&&a?[{r,j:+a.value},{r,j}]:mode==='skills'&&other&&other.value!==''?[{r,j},{r:+other.value,j}]:[{r,j}];reView();break}
  case 'v7now':S.v7.pts=[];S.v7.mode='day';reView();break;
  case 'v7q':{const ix=+d.ix,j=IT[ix]?IT[ix].j:-1,k=d.k===undefined?undefined:+d.k;if(j<0||!SUBS[j].on)break;const s=SUBS[j].its.indexOf(ix);if(s<0)break;open7(0,j,s,k);go(7);return}
  case 'v7cmp':{const P=ptSel(),Ln=NBC-1;if(!P)break;S.v7.pts=P.kind==='one'?[{r:P.r,j:P.j},{r:P.r,j:Ln}]:P.kind==='time'?[{r:P.r,j:P.a},{r:P.r,j:Ln}]:[{r:P.r1,j:Ln},{r:P.r2,j:Ln}];reView();break}
  /* the actions of the point views: a group, a review or practice set */
  case 'v7act':{const P=ptSel();if(!P)break;const G=ptGroups(P),g=d.g,sn=m=>D.skills[m.k];let txt='';
    if(P.kind==='one')txt=g==='ny'?`Group for ${sn(P.m)}: ${andList(G.ny)}`:`Practice set on ${sn(P.m)} for ${andList(G.dev)}`;
    else if(P.kind==='time')txt=g==='lost'?`Review set on ${sn(P.m)} for ${andList(G.lost)}, mastered on ${dayDate(BE(P.a))} and not now`:g==='re'?`Group for ${sn(P.m)}: ${andList(G.never.concat(G.fell))}`:`Practice set on ${sn(P.m)} for ${andList(G.dev)}`;
    else txt=`Group for ${sn(P.m1)} and ${sn(P.m2)}: ${andList(G.both)}`;
    logAct(ptKey(P,g),6,txt,'plan');reView();break}
  case 'v8tb':S.v8.tb=+d.f;reView();break;
  case 'v8unit':{const E=S.v8.ex[S.v8.tb],u=+d.u;if(!E)break;const ix=E.U.indexOf(u);if(ix>=0)E.U.splice(ix,1);else E.U.push(u);reView();break}
  case 'v8sub':{const E=S.v8.ex[S.v8.tb],j=+d.j;if(!E)break;const ix=E.J.indexOf(j);if(ix>=0)E.J.splice(ix,1);else E.J.push(j);reView();break}
  case 'pvfold':S.fold['pv-'+d.id]=t.getAttribute('aria-expanded')!=='true';reView();break;
  case 'v8c':{const w=!!t.closest('#pv-sp-worst'),P=w?S.v8.selw:S.v8.sel,o=P[S.v8.tb];P[S.v8.tb]=!w&&o&&o.j===+d.j&&o.s===+d.s?null:{j:+d.j,s:+d.s};reView();
    const row=$(`${w?'#pv-sp-worst':'#pv-sp-unit'} .stall-chart [data-act="v8c"][data-j="${d.j}"][data-s="${d.s}"]`),chart=row&&row.closest&&row.closest('.stall-layout.is-inline .stall-chart');
    if(P[S.v8.tb]&&chart&&row.getBoundingClientRect){const head=chart.querySelector('.visual-head');chart.scrollTop+=row.getBoundingClientRect().top-chart.getBoundingClientRect().top-(head?head.getBoundingClientRect().height:0)}break}
  case 'v8gj':S.v8.gj=d.j===''?null:+d.j;reView();break;
  case 'v8oj':S.v8.oj[S.v8.tb]=d.j===''?null:+d.j;reView();break;
  case 'v8lvl':{const tb=S.v8.tb,E=S.v8.ex[tb];if(!E)break;const {us,js}=lvAll7(tree7(tb,k8()));if(d.f==='u'){E.U=[];E.J=[]}else if(d.f==='j'){E.U=us.slice();E.J=[]}else{E.U=us.slice();E.J=js.slice()}reView();break}
  case 'v8plan':{const tb=S.v8.tb,sl=(d.w?S.v8.selw:S.v8.sel)[tb];if(!sl)break;const nm=ctOf(tb,sl.j)[sl.s][0],J=TBJ(tb,sl.j).n;logAct(sKey7(tb,sl.j,sl.s),7,`Assigned ${nm} in ${J} as coursework`,'plan');reView();break}
  case 'v10line':{const k=+d.k;S.v10.student=undefined;S.v10.k=S.v10.k===k?-1:k;reView();refocus('v10line',{k});revealEvidence('fade-skill-'+k,S.v10.k<0?'nearest':'start');break}
  case 'v10close':{const k=S.v10.k;S.v10.k=-1;S.v10.student=undefined;reView();refocus('v10line',{k});revealEvidence('fade-skill-'+k);break}
  case 'v10plan':logAct('v10:'+d.k,9,`Review set on ${SK[+d.k]}, as a warm-up`,'plan');reView();break;
  case 'v11rm':{const R=rdSel(),r=S.v11.rm[R.key]=S.v11.rm[R.key]||{};r[d.g]=(r[d.g]||[]).concat(d.n);S.v11.acc[R.key]=false;v11draw();renderLogChip();return}
  case 'v11restore':{const R=rdSel();S.v11.rm[R.key]={};S.v11.acc[R.key]=false;v11draw();break}
  case 'v11tb':S.v11.tb=+d.f;reView();break;
  case 'gonext':S.v11.tb=0;S.v11.u[0]=rdDef(0);go(10);return;
  case 'v11accept':acceptPlan();v11draw();break;
  case 'v11lv':S.v11.lv=d.f;S.v11.acc={};reView();break;
  case 'v11grp':S.v11.grp=d.g||null;v11draw();{const f=$('#v11c .rdfor');if(f){const r=f.getBoundingClientRect();if(r.top<0||r.top>window.innerHeight-80)f.scrollIntoView({block:'start',behavior:'smooth'})}}break;   // stacked on a phone, the tree is above the card: bring it into view
  case 'v11undo':{const R=rdSel(),pf=rdPfx(R);S.log=S.log.filter(x=>!x.key.startsWith(pf));S.v11.acc[R.key]=false;renderLogChip();v11draw();break}
  case 'v12f':S.v12.f=d.f;reView();break;
  case 'v12row':S.v12.r=+d.r;reView();revealEvidence('action-evidence');break;
  case 'tdgen':{S.td.gen=S.td.gen===d.id?null:d.id;reView();const g=$('#gen');if(!g)break;if(g.scrollIntoView)g.scrollIntoView({block:'nearest'});if(e.detail===0){const b=g.querySelector('[data-act="tdassign"]');if(b)b.focus({preventScroll:true})}return}
  case 'tdrm':{(S.td.rm[d.id]=S.td.rm[d.id]||[]).push(d.k);reView();const b=$('#gen [data-act="tdassign"]');if(e.detail===0&&b)b.focus({preventScroll:true});return}
  case 'tdreset':S.td.rm[d.id]=[];reView();{const b=$('#gen [data-act="tdassign"]');if(e.detail===0&&b)b.focus({preventScroll:true})}return;
  case 'tdclose':{S.td.gen=null;reView();const b=UIROOT.querySelector(`[data-act="tdgen"][data-id="${d.id}"]`);if(e.detail===0&&b)b.focus({preventScroll:true});return}
  case 'tdassign':{const c=cardById(d.id);if(!c)return;const g=genSet(c),pr=/^p\d+$/.test(c.id);
    logAct('td:'+c.id,pr?'p':2,`${SETN[c.cat]} on ${pr&&c.cat!=='ext'?c.s:c.t} (${g.items.length} ${pl(g.items.length,'item')}) for ${setFor(c)}`,'plan');S.td.gen=null;render();return}
  case 'tdex':{const L=S.td.ex[d.id]=S.td.ex[d.id]||[];if(L.includes(d.n))S.td.ex[d.id]=L.filter(x=>x!==d.n);else L.push(d.n);reView();break}
  case 'tdbud':S.td.bud[d.id]=+d.f;reView();break;
  case 'prof':{if(S.view!=='p')S.profileFrom=S.view;if(S.stu!==+d.i)S.v2.hl=null;S.prof=+d.i;if(!reviewPage())S.stu=+d.i;S.td.gen=null;go('p');return}
  case 'profu':{const u=+d.u;if(TB0[u].lab){at2(u,null);S.v2.sel={t:'u',id:u};go(2)}else{S.v6.heat=u;S.v6.hmPage=0;S.v6.cell=null;const H=hard5(S.v6.tb),E=ex5(S.v6.tb,H);if(!E.U.includes(u))E.U.push(u);go(5)}return}
  case 'today':location.assign(asOfUrl(isoOf(EXPORTDAY)));return;
  case 'exoff':location.assign(location.pathname+location.hash);return;
  case 'v6tb':S.v6.tb=d.f==='x'?'x':+d.f;reView();break;
  case 'v6xf':S.v6.xf=d.f;reView();break;
  default:return}
  if(e.detail===0&&!['go','gofor','log','stu','clear'].includes(a))refocus(a,d)});
/* a folded part of a page remembers whether it is open; the grid is drawn when its fold opens, at the width it then has */
listen(UIROOT,'toggle',e=>{const t=e.target;if(!t||t.tagName!=='DETAILS'||!t.dataset.fold)return;S.fold[t.dataset.fold]=t.open},true);
listen(UIROOT,'keydown',e=>{const modal=!!S.tbl||(S.view===2&&(S.v2.detail!==null||S.v2.overlap));if(modal&&e.key==='Escape'){e.preventDefault();e.stopPropagation();if(S.tbl)closeTbl();else if(S.v2.overlap&&S.v2.detail!==null)backOverlap2();else closeEvidence2();return}
  if(modal&&e.key==='Tab'){const f=[...UIROOT.querySelectorAll('#dlg button,#dlg input,#dlg select,#dlg textarea,#dlg a[href],#dlg summary,#dlg [tabindex]:not([tabindex="-1"])')].filter(b=>!b.disabled&&b.getClientRects().length),i=f.indexOf(document.activeElement);if(f.length&&(e.shiftKey?i<=0:i<0||i===f.length-1)){e.preventDefault();f[e.shiftKey?f.length-1:0].focus()}return}
  if(e.key==='Escape'){if(S.view===6&&S.v7.pts.length){S.v7.pts=[];reView();return}if(S.view===2&&S.v2.hl){const a=document.activeElement,g=a&&a.dataset&&a.dataset.act==='v2hl'?a.dataset.g:null;S.v2.hl=null;hideTip();v2draw();if(g)refocus('v2hl',{g});return}if(S.stu!==null){S.stu=null;render()}return}
  const t=e.target;
  if(t.dataset&&t.dataset.act==='unitcell'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const table=t.closest('.skill-heatmap');if(table){const r=+t.dataset.row+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0),c=+t.dataset.col+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0),next=table.querySelector(`[data-row="${r}"][data-col="${c}"]`);if(next){e.preventDefault();t.tabIndex=-1;next.tabIndex=0;next.focus()}}return}
  if(t.dataset&&t.dataset.act==='profilepoint'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();S.profDay=clamp(+t.dataset.j+(e.key==='ArrowRight'?1:-1),0,NBC-1);reView();refocus('profilepoint',{j:String(S.profDay)});return}
  /* on a weak-skill row, the left and right arrows pick a day on its line and move it */
  if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&t.getAttribute&&t.getAttribute('data-act')==='v7row'){const r=+t.getAttribute('data-r'),m=WEAK[r];if(!m)return;const ok=m.sv.map((v,j)=>v===null?-1:j).filter(j=>j>=0);if(!ok.length)return;
    const cur=S.v7.pts.length===1&&S.v7.pts[0].r===r?S.v7.pts[0].j:null,ix=cur===null?ok.length:ok.indexOf(cur);e.preventDefault();
    S.v7.pts=[{r,j:ok[clamp(ix+(e.key==='ArrowLeft'?-1:1),0,ok.length-1)]}];S.v7.r=r;reView();refocus('v7row',{r:String(r)});return}if((e.key==='Enter'||e.key===' ')&&t.getAttribute&&t.getAttribute('role')==='button'&&t.namespaceURI==='http://www.w3.org/2000/svg'){e.preventDefault();t.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
listen(UIROOT,'input',e=>{const t=e.target,id=t.id;if(t.type==='range')rngFill(t);
  if(id==='v2line'){S.v2.line=+t.value;const o=$('#v2lo');if(o)o.textContent=t.value+'% of eligible practice';v2draw();renderThread()}
});
listen(UIROOT,'change',e=>{const t=e.target,id=t.id;
  if(id==='v2sort'){S.v2.sort=t.value;reView();refocusId('v2sort')}
  else if(id==='v2filter'){S.v2.hl=t.value==='all'?null:t.value;v2draw();refocusId('v2filter')}
  else if(id==='v2all'){S.v2.all=t.checked;v2draw();refocusId('v2all')}
  else if(id==='v2unit'){S.v2.sel={t:'u',id:+t.value};reView();refocusId('v2unit')}
  else if(id==='v11all'){S.v11.allSkills=t.checked;reView();refocusId('v11all')}
  else if(id==='v11unit'){S.v11.u[S.v11.tb]=+t.value;S.v11.grp=null;S.v11.node=null;S.v11.skill=null;reView();refocusId('v11unit')}
  else if(id==='v11ver'){S.v11.ver=t.value;try{history.replaceState(null,'',withQ('rv',t.value==='now'?null:t.value))}catch(_){}reView();refocusId('v11ver')}
  else if(id==='v7day-b'){const m=WEAK[S.v7.r];if(S.v7.mode==='skills'){const other=$('#v7skill-b');if(other){const valid=WEAK.map((q,i)=>({q,i})).filter(o=>o.i!==S.v7.r&&o.q.sv[+t.value]!==null),old=+other.value;other.innerHTML=valid.map(o=>`<option value="${o.i}"${o.i===old?' selected':''}>${o.q.n}</option>`).join('');const button=$('[data-act="v7compare"]');if(button)button.disabled=!valid.length}}}
  else if(id==='v7unit'){S.v7.u=t.value;S.v7.more=false;S.v7.pts=[];reView();refocusId('v7unit')}
  else if(id==='v10unit'){S.v10.u=t.value;reView();refocusId('v10unit')}
  else if(id==='bksel')location.assign(bkUrl(t.value==='all'?null:t.value));
  else if(id==='asof'){if(/^\d{4}-\d{2}-\d{2}$/.test(t.value))location.assign(asOfUrl(t.value))}
  else if(id==='v4date'){const d=dayOf(t.value);if(!/^\d{4}-\d{2}-\d{2}$/.test(t.value)||!Number.isFinite(d)||d<TODAY||isoOf(d)!==t.value){t.value=isoOf(S.v4.day);toast('Choose a goal date on or after '+dayDateY(TODAY)+'.');return}S.v4.day=d;reView();renderThread();refocusId('v4date')}
  else if(id==='v4unit'){S.v4.u=+t.value;reView();renderThread();refocusId('v4unit')}
  else if(id==='profileday'){S.profDay=clamp(+t.value,0,NBC-1);reView();refocusId('profileday')}
  else if(id==='v4reference'){S.v4.reference=t.checked;v4draw();refocusId('v4reference')}
  else if(id==='v4sort'){S.v4.sort=t.value;reView();refocusId('v4sort')}
  else if(id==='v8sort'){S.v8.sort=t.value;reView();refocusId('v8sort')}
  else if(id==='v8rank'){S.v8.rank=t.value;reView();refocusId('v8rank')}
  else if(id==='v8showall'){S.v8.all=t.checked;S.v8.focus=null;reView();refocusId('v8showall')}
  else if(id==='fvver'){S.fv=t.value;try{history.replaceState(null,'',withQ('fv',t.value==='now'?null:t.value))}catch(_){}renderThread();refocusId('fvver')}
  else if(id==='v8ver'){S.v8.ver=t.value;try{history.replaceState(null,'',withQ('sv',t.value==='now'?null:t.value))}catch(_){}reView();refocusId('v8ver')}
  else if(id==='v10all'){S.v10.all=t.checked;reView();refocusId('v10all')}
  else if(id==='v10sall'){S.v10.sall=t.checked;reView();refocusId('v10sall')}
  else if(id==='v3all'){S.v3.all=t.checked;reView();refocusId('v3all')}
  else if(id==='v7more'){S.v7.more=t.checked;reView();refocusId('v7more')}
  else if(id==='v6sort'){S.v6.sort=t.value;reView();refocusId('v6sort')}
  else if(id==='tblall'){if(S.tbl){S.tbl.all=t.checked;renderTbl();refocusId('tblall')}}});
function fromHash(){const h=location.hash||'',ps=h.match(/^#s-(.+)$/);let pn=null;if(ps){try{pn=decodeURIComponent(ps[1])}catch(_){pn=ps[1]}}if(pn!==null&&ID[pn]!==undefined){S.view='p';S.prof=ID[pn];return}const nm=Object.keys(SLUG).find(k=>'#'+SLUG[k]===h),old=OLDSLUG[h.slice(1)],m=h.match(/^#q(\d{1,2})$/),k=nm!==undefined?+nm:old!==undefined?old:m?+m[1]:2;S.view=VM[k]?toPage(k):2}
if(!options.embedded)listen(window,'hashchange',()=>{S.tbl=null;S.v2.detail=null;S.v2.overlap=null;engOpener=null;fromHash();render()});
let rzT=null,rzW=window.innerWidth,rzH=window.innerHeight;
listen(window,'resize',()=>{if(window.innerWidth===rzW&&(S.view!==10||window.innerHeight===rzH))return;rzW=window.innerWidth;rzH=window.innerHeight;clearTimeout(rzT);rzT=setTimeout(reView,160)});
/* defaults that depend on the class: the engagement and performance grid starts on all units, with the one where the most students are struggling picked */
(function(){const b=TAUGHT.map(u=>({u,n:ALL.filter(i=>cell2(i,KS2.u(u)).g==='stuck').length})).sort((x,y)=>y.n-x.n)[0];S.v2.sel={t:'u',id:b&&b.n?b.u:CU};S.v2.sort='stuck';
  /* start at the current unit, with a date the teacher can replace; lab practice has no skill standing */
  const pus=paceUnits();S.v4.u=pus.includes(CU)?CU:pus[0]??CU})();
renderHead();fromHash();render();
return ()=>{dialogState(false);unlisten.forEach(off=>off());clearTimeout(toastT);clearTimeout(tipT);clearTimeout(rzT);if(UIROOT!==document){UIROOT.classList.remove('dlg-on');UIROOT.innerHTML=''}};
}
window.InsightLens={mount};
const autoRoot=document.querySelector('[data-insight-lens]');
if(autoRoot)mount(autoRoot);
})();

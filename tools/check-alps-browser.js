// Optional browser checks: node tools/check-alps-browser.js (requires local Playwright).
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),alps=path.resolve(process.env.ALPS_REPO||path.join(root,'../alps-react-app'));
const out=process.env.LENS_SCREENSHOTS||path.join(require('node:os').tmpdir(),'insight-lens-alps-review');fs.mkdirSync(out,{recursive:true});
const sheets=['alps-theme','atlas','skills-review','ready-actions-review','comparison','visuals'];
const scripts=['data/class.js','data/example.js','data/prereqs.js','js/alps-design-system.js','js/atlas.js'];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route(/^https?:/,r=>r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const formats=new Map();
 const circularFocus=async(target,selector)=>{
  const state=await target.evaluate((e,selector)=>{const circle=e.querySelector(selector),probe=document.createElement('i');e.parentElement.append(probe);probe.style.color='var(--il-accent)';const accent=getComputedStyle(probe).color;probe.remove();return {focused:e.matches(':focus'),outline:getComputedStyle(e).outlineStyle,shape:circle.tagName,opacity:getComputedStyle(circle).opacity,stroke:getComputedStyle(circle).stroke,accent}},selector);
  assert(state.focused);assert.equal(state.outline,'none','SVG focus must not fall back to a square browser outline');assert.equal(state.shape,'circle');assert(+state.opacity>0);assert.equal(state.stroke,state.accent,'the circular SVG ring is visible for mouse and keyboard focus');
 };
 const overlapModal=async width=>{
  const chart=page.locator('.eng-relationship'),markers=chart.locator('[data-act="v2overlap"]');assert(await markers.count()>0,'crowded points have visible group counts');
  const positions=()=>chart.locator('.score-dot').evaluateAll(es=>es.map(e=>[e.getAttribute('cx'),e.getAttribute('cy')])),before=await positions();
  const badges=await markers.evaluateAll(es=>es.map(e=>{const b=e.querySelector('.overlap-badge'),r=b.getBoundingClientRect(),s=e.ownerSVGElement.getBoundingClientRect(),text=e.querySelector('text'),members=e.dataset.students.split(',').map(Number);return {x:r.x+r.width/2,y:r.y+r.height/2,r:r.width/2,unitRadius:+b.getAttribute('r'),fill:getComputedStyle(b).fill,colors:members.map(i=>getComputedStyle(e.ownerSVGElement.querySelector(`[data-act="v2detail"][data-i="${i}"] .score-dot`)).stroke),font:parseFloat(getComputedStyle(text).fontSize)*e.getScreenCTM().a,inside:r.x>=s.x&&r.y>=s.y&&r.right<=s.right&&r.bottom<=s.bottom,count:+text.textContent,members}}));
  for(const b of badges){assert(b.inside,'count markers stay inside the chart, including at 100% practice');assert(b.r>=11&&b.font>=11,'counts remain legible at phone sizes');assert.equal(b.count,b.members.length);assert(b.colors.every(c=>c===b.fill),'a combined circle uses the same semantic color as every student it represents');assert(Math.abs(b.unitRadius**2/b.count-72)<.6,'circle area is proportional to student count')}
  for(let i=0;i<badges.length;i++)for(let j=i+1;j<badges.length;j++)assert(Math.hypot(badges[i].x-badges[j].x,badges[i].y-badges[j].y)>=badges[i].r+badges[j].r,'count badges do not overlap each other');
  await chart.evaluate(e=>{window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-90);const frame=e.querySelector('.fig');frame.scrollLeft=frame.scrollWidth-frame.clientWidth});await page.screenshot({path:path.join(out,'overlapping-points-'+width+'.png')});
  const marker=markers.first(),members=(await marker.getAttribute('data-students')).split(',').map(Number);await marker.focus();await page.keyboard.press('Enter');
  const dialog=page.locator('#eng-evidence-panel');assert(await dialog.isVisible());
  const rows=dialog.locator('.eng-overlap-list [data-student]');assert.equal(await rows.count(),members.length,'every overlapping student is available');
  const shown=await rows.evaluateAll(es=>es.map(e=>+e.dataset.student).sort((a,b)=>a-b));assert.deepEqual(shown,members.slice().sort((a,b)=>a-b));
  const clipped=await rows.locator('th,td').evaluateAll(es=>es.some(e=>e.scrollWidth>e.clientWidth+2));assert(!clipped,'group evidence uses the same readable table format');
  await page.screenshot({path:path.join(out,'overlap-students-'+width+'.png')});
  for(const i of members){const student=dialog.locator(`.eng-overlap-list [data-student="${i}"]`),name=await student.locator('.nm').textContent(),score=await student.locator('[data-label="Mastery"] b').textContent();
   await student.locator('[data-act="v2detail"]').focus();await page.keyboard.press('Enter');assert((await dialog.locator('h2').textContent()).includes(name));assert.equal(await dialog.locator('[data-metric="mastery"] b').textContent(),score);
   assert(await dialog.locator('[data-act="v2overlapback"]').isVisible());await page.keyboard.press('Escape');assert.equal(await rows.count(),members.length);assert(await student.locator('[data-act="v2detail"]').evaluate(e=>e===document.activeElement));
  }
  await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert(await marker.evaluate(e=>e===document.activeElement));assert.deepEqual(await positions(),before,'overlap selection never moves the measured dots');
  await circularFocus(marker,'.overlap-badge');
  await marker.click();await dialog.locator('[data-act="v2close"]').click();
  await circularFocus(marker,'.overlap-badge');await page.screenshot({path:path.join(out,'mouse-focused-group-'+width+'.png')});
 };
 const engagementModal=async width=>{
  await page.locator('[data-act="v2mode"][data-f="table"]').click();
  const row=page.locator('.eng-student-table tbody tr[data-student]').nth(1),name=await row.locator('.nm').textContent();
  await row.locator('[data-act="pin"]').click();
  assert.equal(await row.locator('.nm').textContent(),name,'following preserves the student name');
  const contrast=await row.locator('.nm').evaluate(e=>{
   const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number),luminance=rgb=>rgb.map(n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
   let p=e,bg='rgb(255,255,255)';while(p){const c=getComputedStyle(p).backgroundColor;if(c!=='transparent'&&c!=='rgba(0, 0, 0, 0)'){bg=c;break}p=p.parentElement}
   const a=luminance(rgb(getComputedStyle(e).color)),b=luminance(rgb(bg));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  assert(contrast>=4.5,'the followed name remains readable against its background');
  await page.screenshot({path:path.join(out,'following-'+width+'.png'),fullPage:true});
  const opener=row.locator('[data-act="v2detail"]');await opener.focus();
  const before={box:await row.boundingBox(),scroll:await page.evaluate(()=>window.scrollY)};
  await page.keyboard.press('Enter');
  const dialog=page.locator('#eng-evidence-panel');assert(await dialog.isVisible());assert.equal(await dialog.getAttribute('aria-modal'),'true');
  assert((await dialog.locator('h2').textContent()).includes(name));assert.equal(await dialog.locator('.eng-stat').count(),3);
  assert.equal(await page.locator('#view #eng-evidence-panel').count(),0,'evidence never enters the table layout');
  assert.equal(await page.locator('.shell').evaluate(e=>e.inert),true);
  assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'hidden');
  assert.deepEqual(await row.boundingBox(),before.box,'opening evidence keeps the row in place');
  assert.equal(await page.evaluate(()=>window.scrollY),before.scroll);
  const box=await dialog.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=(width===390?844:1000)+1);
  assert.equal(await dialog.locator('[data-act="v2close"]').evaluate(e=>e===document.activeElement),true);
  await page.screenshot({path:path.join(out,'student-evidence-modal-'+width+'.png')});
  const first=dialog.locator('button').first();await first.focus();await page.keyboard.press('Shift+Tab');
  assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true,'reverse Tab stays in the modal');
  await page.keyboard.press('Tab');assert.equal(await first.evaluate(e=>e===document.activeElement),true,'Tab wraps back to the first modal control');
  const skill=dialog.locator('.eng-skill-group[open] .eng-skill-card').last();
  await skill.scrollIntoViewIfNeeded();const k=await skill.getAttribute('data-k'),scroll=await dialog.locator('.eng-evidence-body').evaluate(e=>e.scrollTop);
  await skill.click();assert.equal(await dialog.count(),0);assert(await page.locator('#dlg .sktbl').count());
  await page.keyboard.press('Escape');assert(await dialog.isVisible());
  assert.equal(await dialog.locator(`.eng-skill-card[data-k="${k}"]`).evaluate(e=>e===document.activeElement),true,'closing skill results returns focus to the evidence card');
  assert.equal(await dialog.locator('.eng-evidence-body').evaluate(e=>e.scrollTop),scroll);
  await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
  assert.equal(await opener.evaluate(e=>e===document.activeElement),true,'closing evidence returns focus to its row');
  assert.equal(await row.locator('[data-act="pin"]').getAttribute('aria-pressed'),'true','Escape closes evidence without unfollowing the student');
  assert.equal(await page.locator('.shell').evaluate(e=>e.inert),false);assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
  assert.deepEqual(await row.boundingBox(),before.box);
  await opener.click();await page.mouse.click(3,3);assert.equal(await dialog.count(),0,'clicking outside closes evidence');
  await page.locator('[data-act="v2mode"][data-f="relationship"]').click();
  const point=page.locator('.eng-relationship [data-act="v2detail"]').first();await point.focus();await page.keyboard.press('Enter');assert(await dialog.isVisible());
  await page.keyboard.press('Escape');await circularFocus(point,'.point-focus-ring');
  await point.click();await dialog.locator('[data-act="v2close"]').click();await circularFocus(point,'.point-focus-ring');await page.screenshot({path:path.join(out,'mouse-focused-student-'+width+'.png')});
  await point.click();
  await dialog.locator('[data-act="prof"]').click();assert.equal(await dialog.count(),0);assert.equal(await page.locator('.shell').evaluate(e=>e.inert),false);
  await page.goto('about:blank');await page.goto('file://'+root+'/index.html#engagement',{waitUntil:'domcontentloaded'});
 };
 const visibleInsights=async width=>{
  const summary=page.locator('#view .page-summary');assert.equal(await summary.count(),1);
  assert.equal(await summary.locator('details,summary').count(),0,'page insights have no collapsed group');
  const cards=summary.locator('.icard');assert(await cards.count()>0);
  const styles=await cards.evaluateAll(nodes=>nodes.map(e=>{const s=getComputedStyle(e),value=getComputedStyle(e.querySelector('.icv')),label=getComputedStyle(e.querySelector('.icl')),description=e.querySelector('.ics');return {display:s.display,direction:s.flexDirection,padding:s.padding,border:s.borderWidth,gap:s.gap,valueFont:value.fontSize,valueWeight:value.fontWeight,labelFont:label.fontSize,descriptionFont:description?getComputedStyle(description).fontSize:'13px'}}));
  if(!formats.has(width))formats.set(width,styles[0]);for(const style of styles)assert.deepEqual(style,formats.get(width),'all insights use the same card format across pages');
  for(const card of await cards.all())assert(await card.isVisible(),'every insight is visible by default');
  const clipped=await summary.locator('.icn,.ics').evaluateAll(nodes=>nodes.filter(e=>e.scrollHeight>e.clientHeight+1).map(e=>e.textContent));assert.deepEqual(clipped,[],'insight titles and explanations are never truncated');
 };
 const pages=['engagement','drifting','pace','skills','stall-points','ready','actions'];
 let count=0;
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:1000});
  for(const slug of pages){
   await page.goto('about:blank');await page.goto('file://'+root+'/index.html#'+slug,{waitUntil:'domcontentloaded'});await page.locator('#view h2').first().waitFor();await page.waitForTimeout(90);
   const state=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,bad:/NaN|Infinity|undefined/.test(document.querySelector('#view').textContent),head:document.querySelector('#view h2').textContent,icons:document.querySelectorAll('[data-alps-icon]').length}));
   assert(state.scroll<=state.width+2,JSON.stringify({width,slug,...state}));assert(!state.bad,slug);assert(state.icons>6,slug);
   await visibleInsights(width);
   if(slug==='skills'){const labels=await page.locator('#ansc .icl').allTextContents();for(const label of ['Teach first','Weak skills','Hardest unit','Hardest skill','Faded most','Skills that faded'])assert(labels.includes(label),'Skills retains '+label)}
   const unresolved=await page.locator('[data-insight-lens] [style]').evaluateAll(elements=>elements.flatMap(e=>[...e.getAttribute('style').matchAll(/var\((--[\w-]+)\s*\)/g)].filter(m=>!getComputedStyle(e).getPropertyValue(m[1]).trim()).map(m=>m[1])));
   assert.deepEqual(unresolved,[],slug+': all inline semantic colors must resolve');
   if(slug==='ready'){
    const fills=await page.locator('.rd-table tr:has(button[data-act="rdnode"][data-readiness]:not([data-readiness=""])) .rd-track>i').evaluateAll(elements=>elements.map(e=>getComputedStyle(e).backgroundColor));
    assert(fills.length>0);assert(fills.every(c=>['rgb(64, 139, 77)','rgb(220, 53, 69)','rgb(225, 159, 1)'].includes(c)),'readiness bars use visible ALPS status colors');
   }
   await page.screenshot({path:path.join(out,slug+'-'+width+'.png'),fullPage:true});count++;
   if(slug==='engagement'){await engagementModal(width);await overlapModal(width)}
   if(slug==='ready'){
    const chart=page.locator('[data-readiness-layout]');
    const frame=page.locator('#readiness-diagram'),zoom=()=>frame.evaluate(e=>({scale:+e.dataset.zoom,fit:+e.dataset.fit,left:e.scrollLeft,top:e.scrollTop}));
    const fitted=async()=>{const state=await zoom(),svg=await chart.boundingBox(),area=await frame.boundingBox();assert(Math.abs(state.scale-state.fit)<1e-6,'graph starts fitted');assert(svg.x>=area.x&&svg.y>=area.y&&svg.x+svg.width<=area.x+area.width+1&&svg.y+svg.height<=area.y+area.height+1,'the entire graph fits inside the viewport');assert.equal(state.left,0);assert.equal(state.top,0);assert(area.height<1000,'graph viewport is bounded')};
    const exerciseZoom=async()=>{
     await fitted();const start=await zoom();
     for(let i=0;i<4;i++)await page.getByRole('button',{name:'Zoom in',exact:true}).click();
     const larger=await zoom();assert(larger.scale>start.scale,'zoom in enlarges the graph');
     await frame.evaluate(e=>{e.scrollLeft=(e.scrollWidth-e.clientWidth)/2;e.scrollTop=(e.scrollHeight-e.clientHeight)/2});
     await chart.locator('.readiness-node').first().focus();const before=await zoom();await page.keyboard.press('Enter');
     assert.equal(await page.locator('#prerequisite-evidence').count(),1);const after=await zoom();assert.equal(after.scale,before.scale,'evidence keeps the zoom');assert(Math.abs(after.left-before.left)<=1&&Math.abs(after.top-before.top)<=1,'evidence keeps the pan');
     await page.locator('#prerequisite-evidence [data-act="rdclose"]').click();assert.equal((await zoom()).scale,before.scale);
     await page.getByRole('button',{name:'Zoom out',exact:true}).click();assert((await zoom()).scale<larger.scale,'zoom out reduces the graph');
     await page.getByRole('button',{name:'Fit full graph',exact:true}).click();await fitted();
    };
    await exerciseZoom();
    assert.equal(await chart.getAttribute('data-readiness-layout'),'tree');
    const keys=await chart.locator('.readiness-node').evaluateAll(elements=>elements.map(e=>e.dataset.k).sort());
    const unit=await page.locator('#v11unit').inputValue();
    await page.getByRole('button',{name:'Radial',exact:true}).click();
    assert.equal(await chart.getAttribute('data-readiness-layout'),'radial');
    await exerciseZoom();
    assert.deepEqual(await chart.locator('.readiness-node').evaluateAll(elements=>elements.map(e=>e.dataset.k).sort()),keys,'both layouts show the same prerequisite rings');
    assert.equal(await page.locator('#v11unit').inputValue(),unit);
    assert(page.url().includes('rv=2'),'radial layout keeps its existing shareable URL');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));
    await page.screenshot({path:path.join(out,'ready-radial-'+width+'.png'),fullPage:true});
    await chart.locator('.readiness-node').first().focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#prerequisite-evidence').count(),1,'keyboard selection opens one shared evidence panel');
    await page.locator('#prerequisite-evidence [data-act="rdclose"]').click();
    await page.getByRole('button',{name:'Tree',exact:true}).click();
    assert.equal(await chart.getAttribute('data-readiness-layout'),'tree');
    await chart.locator('.readiness-node').first().focus();await page.keyboard.press('Space');
    assert.equal(await page.locator('#prerequisite-evidence').count(),1);
    await page.locator('#prerequisite-evidence [data-act="rdclose"]').click();
    const allSkills=page.getByRole('checkbox',{name:'Show all prerequisite skills',exact:true});
    assert.equal(await allSkills.isChecked(),false,'the compact prerequisite preview is the default');
    const plan=await page.locator('.ready-review #v11c>.detail').innerText();
    const countText=await page.locator('.ready-caption').innerText(),total=+countText.match(/of (\d+) direct prerequisites/)[1];
    await allSkills.focus();await page.keyboard.press('Space');
    assert(await allSkills.isChecked(),'the scope checkbox works from the keyboard');
    for(const [name,layout] of [['Tree','tree'],['Radial','radial']]){
      await page.getByRole('button',{name,exact:true}).click();
      assert(await allSkills.isChecked(),'all skills stays enabled when changing layout');
      assert.equal(await chart.getAttribute('data-readiness-layout'),layout);
      assert.equal(await chart.locator('[data-prereq-kind="direct"]').count(),total,'the selected diagram shows every direct prerequisite');
      assert.equal(await page.locator('#v11unit').inputValue(),unit);
      assert.equal(await page.locator('.ready-review #v11c>.detail').innerText(),plan,'the plan does not depend on diagram scope');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));
      await exerciseZoom();
      await page.screenshot({path:path.join(out,`ready-all-${layout}-${width}.png`),fullPage:true});
    }
    await allSkills.uncheck();
    assert.equal(await chart.locator('[data-prereq-kind="direct"]').count(),4,'turning the flag off restores the four-skill preview');
    assert.equal(await page.locator('.ready-review #v11c>.detail').innerText(),plan);
    await fitted();
    // Refit when the available height changes, including a height-only resize.
    await page.setViewportSize({width,height:600});
    await page.waitForFunction(()=>document.querySelector('#readiness-diagram').clientHeight<=300);
    await fitted();
    await page.setViewportSize({width,height:width===390?844:1000});await page.waitForTimeout(200);await fitted();
    // A new unit starts fitted even if the previous unit was zoomed in.
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();
    const choices=await page.locator('#v11unit option').evaluateAll(opts=>opts.map(o=>o.value));
    for(const value of choices.filter(v=>v!==unit)){await page.locator('#v11unit').selectOption(value);if(await chart.count()){await fitted();break}}
    await page.locator('#v11unit').selectOption(unit);await fitted();
    // All table rows replace the old duplicate map and still open shared evidence.
    assert.equal(await page.locator('.prereq-map').count(),0);
    await page.locator('[data-fold^="ready-figures:"]>summary').click();
    await page.locator('.rd-table [data-act="rdnode"]').first().click();
    assert.equal(await page.locator('#prerequisite-evidence').count(),1);
    await page.locator('#prerequisite-evidence [data-act="rdclose"]').click();
   }
   // Exercise the chart sections that start collapsed as well as the first view.
   while(await page.locator('#view [data-act="pvfold"][aria-expanded="false"]').count())await page.locator('#view [data-act="pvfold"][aria-expanded="false"]').first().click();
   const hiddenRefs=await page.locator('[data-insight-lens] [style]').evaluateAll(elements=>elements.flatMap(e=>[...e.getAttribute('style').matchAll(/var\((--[\w-]+)\s*\)/g)].filter(m=>!getComputedStyle(e).getPropertyValue(m[1]).trim()).map(m=>m[1])));
   assert.deepEqual(hiddenRefs,[],slug+': folded charts retain resolved semantic colors');
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('about:blank');await page.goto('file://'+root+'/index.html#skills',{waitUntil:'domcontentloaded'});
 const openers=await page.locator('#view [data-act="tblopen"]').count();
 console.log('Evidence dialog openers',openers);
 if(openers){await page.locator('#view [data-act="tblopen"]').first().click();await page.locator('[role="dialog"]').waitFor();assert(await page.locator('.skill-result-key .tkey').count());const dialog=await page.locator('[role="dialog"]').boundingBox();assert(dialog.x>=0&&dialog.y>=0&&dialog.y+dialog.height<=1001);await page.screenshot({path:path.join(out,'question-evidence.png')});await page.keyboard.press('Escape');assert.equal(await page.locator('[role="dialog"]').count(),0)}
 const student=await page.evaluate(()=>window.ATLAS_DATA.students[0]);
 for(const width of [1440,390]){await page.setViewportSize({width,height:width===390?844:1000});await page.goto('about:blank');await page.goto('file://'+root+'/index.html#s-'+encodeURIComponent(student),{waitUntil:'domcontentloaded'});await page.locator('#view h2').first().waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));await visibleInsights(width);await page.screenshot({path:path.join(out,'profile-'+width+'.png'),fullPage:true});count++}
 await page.setViewportSize({width:1440,height:1000});
 // Real ALPS stylesheet with deliberate collisions for IDs, common classes and data-act.
 await page.goto('about:blank');await page.setContent('<html><head><title>ALPS host</title></head><body><header id="hostbar" class="topbar">ALPS host</header><section id="host" class="page"><h2 id="hosttitle">Coursework</h2><button id="hostbutton" class="btn" data-act="go" data-v="7">Host action</button><div id="view">Host view</div><div id="dlg">Host dialog</div><svg class="ni" width="30" height="30"></svg></section><div id="lens-root"></div></body></html>');
 await page.addStyleTag({content:fs.readFileSync(path.join(alps,'src/App.css'),'utf8')});
 await page.addStyleTag({content:'html,body{font-family:"Noto Sans",Arial,sans-serif}.topbar{height:56px;background:var(--primary-blue);color:white}.page{padding:9px}.btn{border-radius:8px;padding:7px}.ni{color:purple}'});
 const hostStyle=()=>page.evaluate(()=>{const props=['color','backgroundColor','fontFamily','fontWeight','fontSize','margin','padding','width','height','border','borderRadius','display','boxSizing'];return Object.fromEntries(['html','body','#hostbar','#host','#hosttitle','#hostbutton','#host .ni'].map(sel=>{const e=document.querySelector(sel),s=getComputedStyle(e);return[sel,Object.fromEntries(props.map(p=>[p,s[p]]))]}))});
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);const before=await hostStyle();
 for(const name of sheets)await page.addStyleTag({path:path.join(root,'css',name+'.css')});
 for(const name of scripts)await page.addScriptTag({path:path.join(root,name)});
 await page.evaluate(()=>{window.originalData=JSON.stringify(window.ATLAS_DATA);window.routes=[];window.mounted=window.InsightLens.mount(document.querySelector('#lens-root'),{embedded:true,data:window.ATLAS_DATA,prereqs:window.ATLAS_PREREQS,hash:'#skills',onNavigate:r=>window.routes.push(r)});});
 assert.deepEqual(await hostStyle(),before,'Lens must not change the host styles');assert.equal(await page.title(),'ALPS host');
 assert.equal(await page.locator('#lens-root>.topbar').isVisible(),false);
 const startURL=page.url();await page.locator('#lens-root #rail [data-v="7"]').click();assert.equal(page.url(),startURL,'embedded navigation must not change host URL');
 const hostView=await page.locator('#view').first().textContent();assert.equal(hostView,'Host view');
 await page.locator('#hostbutton').click();assert.equal(await page.locator('#lens-root #view h2').first().textContent(),'Stall points');
 const palettes=await page.evaluate(()=>{const e=document.querySelector('#lens-root'),probe=document.createElement('i');e.append(probe);const get=name=>{probe.style.color='var('+name+')';return getComputedStyle(probe).color};const r={brand:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),selection:get('--il-accent'),levels:[0,1,2,3,4].map(i=>get('--il-alps-level-'+i)),engagement:[0,1,2,3,4].map(i=>get('--il-alps-engagement-'+i)),status:['good','bad','watch'].map(n=>get('--il-'+n))};probe.remove();return r});
 assert.equal(palettes.brand,'#FF9C39');assert.equal(palettes.selection,'rgb(24, 100, 242)');assert.deepEqual(palettes.status,['rgb(64, 139, 77)','rgb(220, 53, 69)','rgb(225, 159, 1)']);
 await page.evaluate(()=>document.documentElement.style.setProperty('--primary-blue','#1756d1'));
 assert.equal(await page.locator('#lens-root #rail [aria-current="page"] .glyph').evaluate(e=>getComputedStyle(e).color),'rgb(23, 86, 209)');
 await page.evaluate(()=>document.documentElement.style.removeProperty('--primary-blue'));
 await page.screenshot({path:path.join(out,'alps-host.png'),fullPage:true});
 await page.evaluate(()=>window.mounted.navigate('?books#engagement'));assert.equal(await page.evaluate(()=>JSON.stringify(window.ATLAS_DATA)===window.originalData),true,'host data remains unchanged');
 await page.locator('#lens-root [data-act="v2mode"][data-f="table"]').click();
 const hostOverflow=await page.evaluate(()=>document.documentElement.style.overflow);
 await page.locator('#lens-root .eng-student-table [data-act="v2detail"]').first().click();
 assert(await page.locator('#lens-root #eng-evidence-panel').isVisible());
 assert.equal(await page.locator('#lens-root .shell').evaluate(e=>e.inert),true);
 assert.equal(await page.locator('#host').evaluate(e=>e.inert),false,'the embedded modal never deactivates host content');
 assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),hostOverflow,'embedded dialogs leave host scrolling unchanged');
 assert.deepEqual(await hostStyle(),before,'embedded evidence preserves host styles');
 await page.evaluate(()=>window.mounted.navigate('?books&book=java-short-labs#engagement'));assert.equal(await page.evaluate(()=>JSON.stringify(window.ATLAS_DATA)===window.originalData),true);
 assert.equal(await page.locator('#lens-root #eng-evidence-panel').count(),0,'navigation cleans up the open evidence modal');
 assert.equal(await page.locator('#lens-root .shell').evaluate(e=>e.inert),false);
 await page.evaluate(()=>window.mounted.destroy());assert.equal(await page.locator('#lens-root').innerHTML(),'');assert.deepEqual(await hostStyle(),before);
 await page.evaluate(()=>{window.mounted=window.InsightLens.mount(document.querySelector('#lens-root'),{embedded:true,hash:'#ready'});});assert(await page.locator('#lens-root .ready-diagram').count());
 await page.evaluate(()=>window.mounted.destroy());assert.equal(await page.locator('#view').first().textContent(),'Host view');
 assert.deepEqual(errors,[],'no runtime errors');
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({pages:count,errors,palettes,hostStylesUnchanged:true,hostRoutingUnchanged:true,hostDataUnchanged:true},null,2));
 console.log(JSON.stringify({pages:count,errors,palettes,hostStylesUnchanged:true,hostRoutingUnchanged:true,hostDataUnchanged:true,snapshots:out},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

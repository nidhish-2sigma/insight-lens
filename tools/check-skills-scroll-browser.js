// Optional interaction checks: requires the same local Playwright setup as check-alps-browser.js.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
 try{
  let boundaries=0,innerScrolls=0,horizontalScrolls=0,restorations=0;
  const errors=[];
  const openPage=async width=>{const context=await browser.newContext({viewport:{width,height:width<700?844:900},...(width<700?{isMobile:true,hasTouch:true}:{})});await context.route(/^https?:/,r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+root+'/index.html#skills',{waitUntil:'domcontentloaded'});return{context,page}};
  for(const width of [1440,1024,390]){
   const {context,page}=await openPage(width);
   const position=el=>el.evaluate(e=>({page:window.scrollY,top:e.scrollTop,left:e.scrollLeft,range:e.scrollHeight-e.clientHeight,xrange:e.scrollWidth-e.clientWidth,pageRange:document.documentElement.scrollHeight-innerHeight}));
   const pointer=async pane=>{const box=await pane.boundingBox();await page.mouse.move(box.x+Math.min(box.width-10,Math.max(20,box.width/2)),Math.min(width<700?780:820,Math.max(100,box.y+box.height/2)))};
   const wheel=async(pane,dx,dy)=>{await pointer(pane);await page.mouse.wheel(dx,dy);await page.waitForTimeout(250);return position(pane)};
   const boundary=async(pane,direction)=>{
    await pane.evaluate((e,dir)=>{e.scrollIntoView({block:'center'});e.scrollTop=dir<0?0:e.scrollHeight},direction);
    const before=await position(pane);if(direction<0?before.page<100:before.pageRange-before.page<100)return;
    let after=await wheel(pane,0,direction*400);
    // Chromium can first clamp a programmatically set boundary by one pixel.
    // A second gesture must still chain to the page; containment would fail both.
    if(after.page===before.page&&Math.abs(after.top-before.top)<=1&&Math.abs(after.top-(direction<0?0:after.range))<=1)after=await wheel(pane,0,direction*400);
    assert(direction<0?after.page<before.page-20:after.page>before.page+20,JSON.stringify({width,before,after,direction}));boundaries++;
   };
   const exercise=async pane=>{
    await boundary(pane,-1);await boundary(pane,1);await pane.evaluate(e=>{e.scrollIntoView({block:'center'});e.scrollTop=0});const before=await position(pane);
    if(before.range>200){const after=await wheel(pane,0,100);assert(after.top>before.top+20,'content still scrolls inside the pane');assert(Math.abs(after.page-before.page)<3,'a pane scrolls before its page while it has room');innerScrolls++}
    if(before.xrange>100){await pane.evaluate(e=>e.scrollLeft=0);const after=await wheel(pane,150,0);assert(after.left>20,'horizontal scrolling remains independent');horizontalScrolls++}
   };
   await exercise(page.locator('.weak-chart'));
   // Native touch gestures must also pass through a chart that has no vertical scroll range.
   if(width<700){const pane=page.locator('.weak-chart');await pane.evaluate(e=>e.scrollIntoView({block:'center'}));const before=await position(pane),cdp=await context.newCDPSession(page);await cdp.send('Input.synthesizeScrollGesture',{x:200,y:400,yDistance:300,speed:800,gestureSourceType:'touch'});await page.waitForTimeout(250);const after=await position(pane);assert(after.page<before.page-20,'touch scroll escapes the expanded chart');boundaries++;await cdp.detach()}
   await page.locator('.page-summary .icard').filter({has:page.locator('.icl',{hasText:'Faded most'})}).click();await page.locator('#v10all').check();
   await exercise(page.locator('.student-fade-chart'));
   await page.locator('#fade-evidence [data-act="fadeinspect"]').first().click();await exercise(page.locator('.student-fade-chart'));
   await page.locator('[data-act="fadestudentclose"]').click();
   await page.getByText('Exact scores, dates and thresholds',{exact:true}).click();const exact=page.locator('.fade-exact-scroll');await exercise(exact);
   // A view refresh keeps the exact table's horizontal and vertical position.
   await exact.evaluate(e=>{e.scrollTop=200;e.scrollLeft=100});const saved=await position(exact);await page.locator('#v10unit').selectOption('all');const restored=await position(exact);assert.equal(restored.top,saved.top);assert.equal(restored.left,saved.left);restorations++;
   // The modal keeps its own scroll containment, and releases the page on close.
   const opener=page.locator('#fade-evidence [data-act="tblopen"]').first();await opener.scrollIntoViewIfNeeded();const pageBefore=await page.evaluate(()=>window.scrollY);await opener.click();
   const modal=page.locator('.skill-results'),body=modal.locator('.skill-results-body'),table=modal.locator('.tbl-sc');await table.waitFor();
   await table.evaluate(e=>e.scrollTop=e.scrollHeight);await body.evaluate(e=>e.scrollTop=0);await wheel(table,0,300);assert.equal(await page.evaluate(()=>window.scrollY),pageBefore,'modal scrolling never moves the background');
   await table.evaluate(e=>e.scrollLeft=0);const modalPos=await wheel(table,150,0);assert(modalPos.left>0,'wide question results still scroll horizontally');
   await page.keyboard.press('Escape');assert.equal(await modal.count(),0);assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');assert.equal(await page.evaluate(()=>window.scrollY),pageBefore);restorations++;
   await page.locator('.page-summary .icard').filter({has:page.locator('.icl',{hasText:'Hardest unit'})}).click();await page.locator('#pv-sk-unit [data-act="v6unit"]').first().click();const heatmap=page.locator('.heatmap-scroll');await heatmap.waitFor();await exercise(heatmap);
   await context.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({widths:[1440,1024,390],boundaries,innerScrolls,horizontalScrolls,restorations,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

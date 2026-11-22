const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const base=process.env.TEST_BASE_URL || 'http://localhost:3107';
const key='branvidia:chat-session-v2';
let checks=0;const check=(v,msg)=>{assert.ok(v,msg);checks++;};
const wait=async(page,text)=>page.getByText(text,{exact:false}).first().waitFor();
const progress=async(page,step)=>{await page.locator(`[aria-label^="Step ${step} of 10:"]`).waitFor();checks++;};
async function answer(page,text){await page.getByRole('textbox',{name:'Your message'}).fill(text);await page.getByRole('button',{name:'Send message'}).click();await page.getByRole('textbox',{name:'Your message'}).waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#chat-input').disabled);}
async function intake(page,refresh){
 await page.goto(base); await wait(page,'First, what’s your business called?');await progress(page,2);
 const answers=['Test Café','Café','Coffee, cakes','Families','Better reviews'];
 const questions=['What kind of business','What do you mainly','Who are your usual','Last one:'];
 if(refresh){await page.reload();await wait(page,'First, what’s your business called?');await progress(page,2);}
 for(let i=0;i<answers.length;i++){
  await answer(page,answers[i]);
  if(i<4) await wait(page,questions[i]); else await page.getByRole('button',{name:'Connect Google',exact:true}).first().waitFor();
  await progress(page,i<4?3:4);
  if(refresh){
   const before=await page.locator('[aria-label="Conversation with the Branvidia assistant"]').innerText();
   await page.reload();await progress(page,i<4?3:4);
   const after=await page.locator('[aria-label="Conversation with the Branvidia assistant"]').innerText();check(after===before,`transcript after answer ${i+1} refresh`);
  }
 }
 check(await page.evaluate(k=>!Object.keys(localStorage).some(x=>x.includes('chat-session'))).catch(()=>true),'conversation not localStorage');
 const stored=await page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)),key);check(stored.state.phase==='optin'&&!('step'in stored),'canonical optin snapshot, no stored step');
}
async function consent(page,refresh){
 await page.locator('[aria-label="Conversation with the Branvidia assistant"]').evaluate(el=>{el.scrollTop=el.scrollHeight});await page.getByRole('button',{name:'Connect Google',exact:true}).last().click();await wait(page,'Choose a Google account');
 if(refresh){await page.reload();await wait(page,'Choose a Google account');}
 await page.getByRole('button',{name:/Priya Ramesh/}).click();await wait(page,'Branvidia wants read-only access');
 if(refresh){await page.reload();await wait(page,'Choose a Google account');await page.getByRole('button',{name:/Priya Ramesh/}).click();await wait(page,'Branvidia wants read-only access');}
 await page.getByRole('button',{name:'Allow',exact:true}).click();await wait(page,'Which business');
 await page.getByRole('button',{name:/Indiranagar/}).click();await page.getByRole('button',{name:'Analyse this business'}).waitFor();
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
 try{
 for(const blocked of [false,true]){
  const ctx=await browser.newContext({viewport:{width:360,height:780}});
  if(blocked) await ctx.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError')}})});
  const page=await ctx.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await intake(page,true);console.log(`PASS ${blocked?'localStorage blocked':'normal'}: refresh opening, all five answers and opt-in`);
  // Confirmation must preserve the snapshot on cancel.
  const before=await page.evaluate(k=>sessionStorage.getItem(k),key);
  await page.getByRole('button',{name:'Start over',exact:true}).click();await page.getByRole('dialog',{name:'Start a new chat?'}).waitFor();await page.getByRole('button',{name:'Keep chatting'}).click();
  check(before===await page.evaluate(k=>sessionStorage.getItem(k),key),'cancel leaves session intact');
  await consent(page,true);console.log(`PASS ${blocked?'blocked':'normal'}: consent refresh returns safely to account picker, intake retained`);
  await page.getByRole('button',{name:'Analyse this business'}).click();await wait(page,'Google connected.');await progress(page,7);
  check(await page.evaluate(k=>sessionStorage.getItem(k)===null,key),'analysis transcript not persisted');
  await page.reload();await wait(page,'First, what’s your business called?');await progress(page,2);
  check(!(await page.locator('main').innerText()).includes('Google connected.'),'analysis refresh is clean fresh conversation');
  console.log(`PASS ${blocked?'blocked':'normal'}: analysis refresh starts clean at step 2 without rerun`);
  await intake(page,false);await consent(page,false);await page.getByRole('button',{name:'Analyse this business'}).click();await page.waitForURL('**/report/**');await wait(page,'Optimization report');
  const reportURL=page.url();await page.reload();await wait(page,'Optimization report');check(page.url()===reportURL,'report refresh stays on report');
  await page.goto(base);await wait(page,'Your last report is ready');await wait(page,'First, what’s your business called?');await progress(page,2);
  check(!(await page.locator('main').innerText()).includes('Google connected.'),'completed transcript not restored');
  await page.getByRole('link',{name:'View report',exact:true}).click();await page.waitForURL(reportURL);await wait(page,'Optimization report');
  await page.goto(base);await wait(page,'Your last report is ready');await page.getByRole('button',{name:'Start a new chat',exact:true}).click();await wait(page,'First, what’s your business called?');check(await page.getByText('Your last report is ready',{exact:true}).count()===0,'start new dismisses ready card');
  await answer(page,'Reset me');await wait(page,'What kind of business');await page.getByRole('button',{name:'Start over',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start over',exact:true}).click();await wait(page,'First, what’s your business called?');await progress(page,2);check(!(await page.locator('main').innerText()).includes('Reset me'),'start over clears old transcript');
  await page.screenshot({path:`/tmp/refresh-${blocked?'blocked':'normal'}.png`});
  check(errors.length===0,`no uncaught page errors: ${errors}`);
  console.log(`PASS ${blocked?'blocked':'normal'}: report refresh, completion card, view report, new chat and confirmed reset`);
  await ctx.close();
 }
 const ctx=await browser.newContext();const page=await ctx.newPage();await page.goto(base);await wait(page,'First, what’s your business called?');
 for(const corrupt of ['{bad',JSON.stringify({version:2,state:{phase:'asking',questionIndex:4,info:{}},messages:[]}),JSON.stringify({version:2,state:{phase:'done',questionIndex:4,info:{}},messages:[]})]){
  await page.evaluate(({key,corrupt})=>sessionStorage.setItem(key,corrupt),{key,corrupt});await page.reload();await wait(page,'First, what’s your business called?');await progress(page,2);check(await page.locator('main').getByRole('alert').count()===0,'invalid discarded silently');
 }
 await page.evaluate(()=>localStorage.setItem('branvidia:chat-session-v1',JSON.stringify({step:9,state:{phase:'done'},messages:[{text:'Google connected'}]})));
 await page.reload();await wait(page,'First, what’s your business called?');await progress(page,2);check(await page.evaluate(()=>localStorage.getItem('branvidia:chat-session-v1')===null),'legacy localStorage session removed');
 console.log('PASS corrupt JSON, inconsistent state and completed-session restoration discarded silently; old localStorage snapshot removed');
 await ctx.close();console.log(`ALL PASS: ${checks} browser assertions`);
 } catch(e) {for(const ctx of browser.contexts()) for(const p of ctx.pages()) {await p.screenshot({path:'/tmp/test-failure.png'});console.log(await p.locator('main').innerText())}throw e;} finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

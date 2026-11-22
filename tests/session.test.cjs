const {test}=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const original=Module._resolveFilename;
Module._resolveFilename=function(name,...rest){return original.call(this,name.startsWith('@/')?path.join(__dirname,'../src',name.slice(2)):name,...rest)};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
const {openingTurn,processChatTurn,skipOptInTurn}=require('../src/lib/chatFlow.ts');
const {validateSession,stepForSession}=require('../src/lib/chatSession.ts');
const {CHAT_QUESTIONS,fillTemplate,CANCELLED_MESSAGE}=require('../src/mock/chatScript.ts');
let counter=0;
const materialize=replies=>replies.map(m=>({...m,id:`test-${counter++}`,createdAt:new Date().toISOString()}));
const turn=openingTurn(); let snapshot={version:2,state:turn.state,messages:materialize(turn.replies)};
const states=[structuredClone(snapshot)];
for(const answer of ['Test Café','Café','Coffee, cakes','Families','Better reviews']){const t=processChatTurn(snapshot.state,answer);snapshot={version:2,state:t.state,messages:[...snapshot.messages,...materialize([{role:'user',kind:'text',text:answer},...t.replies])]};states.push(structuredClone(snapshot));}
for(const [i,s] of states.entries()) test(`step matches the last assistant message after ${i} answers`,()=>{
 assert.ok(validateSession(s)); const last=s.messages.at(-1);
 if(i<5){assert.equal(last.text,fillTemplate(CHAT_QUESTIONS[i].ask,s.state.info));assert.equal(stepForSession(s.state),i===0?1:2)}
 else{assert.equal(last.kind,'optin');assert.equal(stepForSession(s.state),3)}
 assert.equal('step' in s,false);
});
for(const [name,change] of Object.entries({
 'invalid rich payload':s=>s.messages[1].tips={bad:true}, 'unknown phase':s=>s.state.phase='bogus', 'completed phase':s=>s.state.phase='done',
 'analysis phase':s=>s.state.phase='analysis', 'wrong answer':s=>s.state.info.name='Other',
 'wrong question index':s=>s.state.questionIndex=0,'mixed assistant message':s=>s.messages.push({...s.messages[0],id:'mixed',text:'Google connected'}),
 'unanswered user turn':s=>s.messages.push({...s.messages[0],id:'pending',role:'user',text:'pending'}),
 'duplicate ids':s=>s.messages[1].id=s.messages[0].id,'invalid shape':s=>s.messages='invalid',
 'empty question':s=>s.messages[0].text=' ', 'unknown info field':s=>s.state.info.extra='bad'
})) test(`discard ${name}`,()=>{const s=structuredClone(states[3]);change(s);assert.equal(validateSession(s),null)});
test('tips and awaiting-choice replay consistently',()=>{const t=skipOptInTurn(snapshot.state);const s={version:2,state:t.state,messages:[...snapshot.messages,...materialize(t.replies)]};assert.ok(validateSession(s));assert.equal(stepForSession(s.state),3);const next=processChatTurn(s.state,'Later');s.messages.push(...materialize([{role:'user',kind:'text',text:'Later'},...next.replies]));s.state=next.state;assert.ok(validateSession(s));assert.equal(stepForSession(s.state),3)});
test('cancelled opt-in transcript is valid',()=>{const s=structuredClone(snapshot);s.messages.push(...materialize([{role:'assistant',kind:'optin',text:CANCELLED_MESSAGE}]));assert.ok(validateSession(s));assert.equal(stepForSession(s.state),3)});
test('never accept old stored step-based format',()=>assert.equal(validateSession({...snapshot,version:1,step:9}),null));

test('AI-reworded assistant text restores at every intake step',()=>{
 for(const original of states){const s=structuredClone(original);for(const m of s.messages)if(m.role==='assistant'&&m.kind==='text')m.text='Reworded: '+m.text;assert.ok(validateSession(s));}
});
test('extracted answers replay without changing the raw user transcript',()=>{
 let t=openingTurn();let s={version:2,state:t.state,messages:materialize(t.replies)};
 for(const value of ['Test Café','Café','Coffee','Families','Reviews']){
  t=processChatTurn(s.state,value);
  s={version:2,state:t.state,messages:[...s.messages,...materialize([{role:'user',kind:'text',text:'My answer is '+value,intakeValue:value},...t.replies.map(m=>m.kind==='text'?{...m,text:'AI: '+m.text}:m)])]};
  const restored=validateSession(s);assert.ok(restored);assert.equal(restored.messages.find(m=>m.intakeValue===value).text,'My answer is '+value);
 }
});
for(const [name,change] of Object.entries({
 'changed quick replies':s=>s.messages[0].quickReplies=['Unexpected'],
 'changed role':s=>s.messages[0].role='user',
 'changed card kind':s=>s.messages[0].kind='summary',
 'rich user payload':s=>s.messages[1].tips=['Unexpected'],
 'assistant extraction':s=>s.messages[0].intakeValue='Unexpected',
 'empty extraction':s=>s.messages[1].intakeValue=' ',
 'oversized extraction':s=>s.messages[1].intakeValue='x'.repeat(1001),
 'inconsistent extraction':s=>s.messages[1].intakeValue='Different'
}))test('reject '+name,()=>{const s=structuredClone(states[3]);change(s);assert.equal(validateSession(s),null)});
test('summary card content still must match replay',()=>{const s=structuredClone(snapshot);s.messages.find(m=>m.kind==='summary').summaryRows[0].value='Different';assert.equal(validateSession(s),null)});

test('unknown fields never survive restoration as rendering instructions',()=>{const s=structuredClone(states[3]);s.messages[0].html='<b>unused</b>';s.state.extra='unused';const restored=validateSession(s);assert.ok(restored);assert.equal(restored.messages[0].html,undefined);assert.equal(restored.state.extra,undefined)});

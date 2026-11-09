import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createApi} from '../server/api.mjs';
import {hashPassword,randomToken} from '../server/security.mjs';
let db,api;const base='https://study.example';
before(async()=>{db=new PGlite();await db.exec(await readFile('netlify/database/migrations/202611090001_survey.sql','utf8'));api=createApi({store:db,env:{SESSION_SECRET:'test-secret-at-least-thirty-two-characters',ADMIN_USERNAME:'testadmin',ADMIN_PASSWORD_HASH:await hashPassword('testing-password'),ENROLLMENT_OPEN:'true'}});});
after(()=>db.close());
async function call(path,body,cookie='',extra={}){const response=await api(new Request(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{origin:base,'content-type':'application/json',cookie,...extra},body:body===undefined?undefined:JSON.stringify(body)}),{ip:extra.ip||randomUUID()});const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};}
async function begin(identity='public'){const payload={id:randomUUID(),nonce:randomToken(),identity,consent:'adult'};const r=await call('begin',payload);assert.equal(r.status,200);return {...r,payload};}
const publicData={gender:'女',age:'31–40歲',education:'大學',job:'服務業'};
const pageAnswers=step=>{const phase=(step-2)%3;return phase===0?{}:Object.fromEntries(Array.from({length:phase===1?3:9},(_,i)=>[`${phase===1?'objective':'subjective'}_${i+1}`,phase===1?i%4:5]));};
test('assignment occurs only after valid demographics, is immutable and retry-safe',async()=>{
 const r=await begin();assert.equal(r.data.session.hue,null);assert.equal((await call('basic',{...publicData,hue:4},r.cookie)).status,400);
 const result=await call('basic',publicData,r.cookie);assert.equal(result.status,200);assert([1,2,3,4].includes(result.data.session.hue));
 const retry=await call('basic',publicData,r.cookie);assert.deepEqual(result.data,retry.data);
 assert.equal((await call('basic',{...publicData,gender:'男'},r.cookie)).status,409);
 assert.equal((await call('page',{step:3,answers:pageAnswers(3)},r.cookie)).status,409);
 assert.equal((await call('session',undefined,r.cookie)).data.session.step,2);
});
test('cannot steal a session using a public respondent ID',async()=>{const r=await begin();assert.equal((await call('begin',{...r.payload,nonce:randomToken()})).status,409);assert.equal((await call('session',undefined,`survey=${r.payload.id}.forged`)).data.session,null);assert.equal((await call('begin',r.payload)).cookie,r.cookie);});
test('student validation and duplicate student IDs',async()=>{const r=await begin('student');const d={studentId:'test12345',gender:'男',age:'21–30歲'};assert.equal((await call('basic',{...d,studentId:'=CMD()'},r.cookie)).status,400);assert.equal((await call('basic',d,r.cookie)).status,200);const second=await begin('student');assert.equal((await call('basic',{...d,studentId:'TEST12345'},second.cookie)).status,409);});
test('all pages require valid answers, lock once saved, retry and complete without timing fields',async()=>{
 const r=await begin();await call('basic',publicData,r.cookie);
 for(let step=2;step<=10;step++){
  if((step-2)%3!==0)assert.equal((await call('page',{step,answers:{}},r.cookie)).status,400);
  const body={step,answers:pageAnswers(step)};const saved=await call('page',body,r.cookie);assert.equal(saved.status,200);assert.equal(saved.data.session.step,step+1);
  assert.equal((await call('page',body,r.cookie)).status,200);
  if((step-2)%3===1)assert.equal((await call('page',{step,answers:{...body.answers,objective_1:3}},r.cookie)).status,409);
 }
 const row=(await db.query('SELECT * FROM respondents WHERE id=$1',[r.payload.id])).rows[0];assert(row.completed_at);assert.equal(Object.keys(row.pages).length,9);assert.equal('viewing_time' in row,false);
});
test('concurrent submissions do not advance twice',async()=>{const r=await begin();await call('basic',publicData,r.cookie);const a=await Promise.all([call('page',{step:2,answers:{}},r.cookie),call('page',{step:2,answers:{}},r.cookie)]);assert(a.every(x=>x.status===200));assert.equal((await call('session',undefined,r.cookie)).data.session.step,3);});
test('admin auth, identity-isolated CSV, empty answers, pause and logout',async()=>{
 assert.equal((await call('admin/export?identity=student')).status,401);
 assert.equal((await call('admin/login',{username:'testadmin',password:'bad'})).status,401);
 const login=await call('admin/login',{username:'testadmin',password:'testing-password'});assert.equal(login.status,200);assert(login.headers.get('set-cookie').includes('HttpOnly'));assert(login.headers.get('set-cookie').includes('Secure'));
 for(const identity of ['student','public']){const csv=await call('admin/export?identity='+identity,undefined,login.cookie);assert.equal(csv.status,200);assert(csv.data.includes('色相組別'));assert.equal(csv.data.includes('"學號"'),identity==='student');assert(!csv.data.includes(identity==='student'?'"社會人士"':'"淡江學生"'));assert(!csv.data.includes('觀看時間'));const lines=csv.data.trim().split('\r\n');assert(lines.every(line=>line.split(',').length===lines[0].split(',').length));}
 assert.equal((await call('admin/export',undefined,login.cookie)).status,400);
 const stats=await call('admin/summary',undefined,login.cookie);assert(stats.data.stats.some(r=>r.identity==='student'));assert(stats.data.stats.some(r=>r.identity==='public'));
 await call('admin/enrollment',{open:false},login.cookie);assert.equal((await call('begin',{id:randomUUID(),nonce:randomToken(),identity:'public',consent:'adult'})).status,403);
 await call('admin/enrollment',{open:true},login.cookie);await call('admin/logout',{},login.cookie);assert.equal((await call('admin/summary',undefined,login.cookie)).status,401);
});
test('cross-origin requests blocked and login rate limited',async()=>{assert.equal((await call('begin',{},'',{origin:'https://elsewhere.example'})).status,403);for(let n=0;n<10;n++)assert.equal((await call('admin/login',{username:'bad',password:'bad'},'',{ip:'same-attacker'})).status,401);assert.equal((await call('admin/login',{username:'bad',password:'bad'},'',{ip:'same-attacker'})).status,429);});

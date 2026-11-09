import {randomInt} from 'node:crypto';
import {SURVEY} from './survey.mjs';
import {CONSENT_VERSION,HttpError,requireValue,demographics,answers,exactKeys} from './config.mjs';
import {cookies,cookie,participantId,participantToken,sign,digest,randomToken,verifyPassword,equal} from './security.mjs';
import {makeCsv} from './csv.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
function view(r){return r?{id:r.id,step:r.step,identity:r.identity,hue:r.hue,version:r.version,completed:r.step===11}:null;}
export function createApi({store,env,secure=true,chooseHue=()=>randomInt(1,5)}){
 const secret=env.SESSION_SECRET;
 const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
 const session=async request=>{const id=participantId(cookies(request).survey,secret);if(!id)return null;return (await store.query('SELECT * FROM respondents WHERE id=$1',[id])).rows[0]||null;};
 async function isOpen(){const row=(await store.query("SELECT value FROM settings WHERE key='enrollment'")).rows[0];return row?row.value.open===true:env.ENROLLMENT_OPEN==='true';}
 async function admin(request){const token=cookies(request).admin;if(!token)return false;return (await store.query('SELECT 1 FROM admin_sessions WHERE token_hash=$1 AND expires_at>NOW()',[digest(token)])).rows.length>0;}
 async function limit(bucket,max,seconds){const result=await store.query(`INSERT INTO login_limits(bucket,attempts,expires_at) VALUES ($1,1,NOW()+$2*INTERVAL '1 second') ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN login_limits.expires_at<NOW() THEN 1 ELSE login_limits.attempts+1 END, expires_at=CASE WHEN login_limits.expires_at<NOW() THEN NOW()+$2*INTERVAL '1 second' ELSE login_limits.expires_at END RETURNING attempts`,[bucket,seconds]);requireValue(result.rows[0].attempts<=max,'操作次數過多，請稍後再試。',429);}
 return async function handle(request,{ip='unknown'}={}){
  try{
   requireValue(typeof secret==='string'&&secret.length>=32,'服務尚未完成設定。',503);
   const url=new URL(request.url), path=url.pathname.replace(/^\/\.netlify\/functions\/api/,'/api');
   if(!['GET','POST'].includes(request.method))throw new HttpError(405,'不支援的操作。');
   let body={};
   if(request.method==='POST'){
    requireValue(request.headers.get('origin')===url.origin,'請由本站頁面操作。',403);
    requireValue(request.headers.get('content-type')?.startsWith('application/json'),'不支援的資料格式。',415);
    const raw=await request.text();requireValue(raw.length<=20000,'資料過大。',413);try{body=JSON.parse(raw);}catch{throw new HttpError(400,'資料格式錯誤。');}
    requireValue(body&&typeof body==='object'&&!Array.isArray(body),'資料格式錯誤。');
   }
   if(path==='/api/session'&&request.method==='GET')return json({session:view(await session(request)),enrollmentOpen:await isOpen(),version:SURVEY.version});
   if(path==='/api/begin'&&request.method==='POST'){
    const existing=await session(request);if(existing)return json({session:view(existing)});
    requireValue(await isOpen(),'目前暫停接受新的填答。',403);
    requireValue(exactKeys(body,['id','nonce','identity','consent'])&&uuid(body.id)&&typeof body.nonce==='string'&&/^[A-Za-z0-9_-]{43}$/.test(body.nonce)&&['student','public'].includes(body.identity)&&['adult','minor-consent'].includes(body.consent),'請確認身分與同意選項。');
    await limit('begin:'+sign(ip,secret),200,3600);
    await store.query('INSERT INTO respondents(id,identity,consent,consent_version,version,begin_hash) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[body.id,body.identity,body.consent,CONSENT_VERSION,SURVEY.version,digest(body.nonce)]);
    const r=(await store.query('SELECT * FROM respondents WHERE id=$1',[body.id])).rows[0];
    requireValue(r.identity===body.identity&&r.consent===body.consent&&equal(r.begin_hash,digest(body.nonce)),'此填答已建立，請重新載入。',409);
    return json({session:view(r)},200,{'Set-Cookie':cookie('survey',participantToken(r.id,secret),90*86400,secure)});
   }
   if(path==='/api/basic'&&request.method==='POST'){
    const r=await session(request);requireValue(r,'請從首頁開始填答。',401);
    const d=demographics(r.identity,body);
    const updated=await store.transaction(async tx=>{
     const locked=(await tx.query('SELECT * FROM respondents WHERE id=$1 FOR UPDATE',[r.id])).rows[0];
     if(locked.step>1){requireValue(same(d,demographics(locked.identity,locked.demographics)),'基本資料已送出，不能修改。',409);return locked;}
     const hue=chooseHue();requireValue([1,2,3,4].includes(hue),'分派服務暫時無法使用。',503);
     return (await tx.query('UPDATE respondents SET demographics=$2,student_hash=$3,hue=$4,step=2,assigned_at=NOW() WHERE id=$1 RETURNING *',[r.id,JSON.stringify(d),r.identity==='student'?sign('student:'+d.studentId,secret):null,hue])).rows[0];
    });return json({session:view(updated)});
   }
   if(path==='/api/page'&&request.method==='POST'){
    const r=await session(request);requireValue(r,'填答識別已失效，請重新整理。',401);
    requireValue(exactKeys(body,['step','answers'])&&Number.isInteger(body.step)&&body.step>=2&&body.step<=10,'頁面資料無效。');
    const a=answers(body.step,body.answers);
    const updated=await store.transaction(async tx=>{
     const locked=(await tx.query('SELECT * FROM respondents WHERE id=$1 FOR UPDATE',[r.id])).rows[0];
     if(body.step<locked.step){requireValue(same(answers(body.step,locked.pages[body.step]),a),'此頁已送出，不能修改。',409);return locked;}
     requireValue(body.step===locked.step,'請依序完成目前頁面。',409);
     const pages={...locked.pages,[body.step]:a};
     return (await tx.query('UPDATE respondents SET pages=$2,step=step+1,completed_at=CASE WHEN step=10 THEN NOW() ELSE NULL END WHERE id=$1 RETURNING *',[r.id,JSON.stringify(pages)])).rows[0];
    });return json({session:view(updated)});
   }
   if(path==='/api/admin/login'&&request.method==='POST'){
    await limit('admin:'+sign(ip,secret),10,900);
    requireValue(typeof body.username==='string'&&typeof body.password==='string'&&body.password.length<=256,'帳號或密碼不正確。',401);
    const valid=await verifyPassword(body.password,env.ADMIN_PASSWORD_HASH);
    requireValue(valid&&equal(body.username,env.ADMIN_USERNAME||''),'帳號或密碼不正確。',401);
    const token=randomToken();await store.query("INSERT INTO admin_sessions(token_hash,expires_at) VALUES ($1,NOW()+INTERVAL '8 hours')",[digest(token)]);
    return json({ok:true},200,{'Set-Cookie':cookie('admin',token,8*3600,secure)});
   }
   if(path.startsWith('/api/admin/')){
    requireValue(await admin(request),'請先登入研究後台。',401);
    if(path==='/api/admin/logout'&&request.method==='POST'){
     await store.query('DELETE FROM admin_sessions WHERE token_hash=$1',[digest(cookies(request).admin)]);
     return json({ok:true},200,{'Set-Cookie':cookie('admin','',0,secure)});
    }
    if(path==='/api/admin/summary'&&request.method==='GET'){
     const stats=(await store.query('SELECT identity,hue,COUNT(*)::int AS entered,COUNT(hue)::int AS assigned,COUNT(*) FILTER(WHERE step>=3)::int AS started,COUNT(*) FILTER(WHERE step=11)::int AS completed FROM respondents GROUP BY identity,hue ORDER BY identity,hue')).rows;
     return json({stats,enrollmentOpen:await isOpen(),version:SURVEY.version});
    }
    if(path==='/api/admin/records'&&request.method==='GET'){
     const identity=url.searchParams.get('identity');requireValue(['student','public'].includes(identity),'請選擇身分別。');
     const page=Math.max(0,Math.min(100000,Number(url.searchParams.get('page'))||0));requireValue(Number.isInteger(page),'頁碼無效。');
     const rows=(await store.query('SELECT id,hue,step,assigned_at,completed_at,demographics->>\'age\' AS age FROM respondents WHERE identity=$1 ORDER BY assigned_at DESC NULLS LAST,id LIMIT 51 OFFSET $2',[identity,page*50])).rows;
     return json({rows:rows.slice(0,50),hasMore:rows.length>50,page});
    }
    if(path==='/api/admin/export'&&request.method==='GET'){
     const identity=url.searchParams.get('identity');requireValue(['student','public'].includes(identity),'請選擇學生或社會人士資料。');
     const rows=(await store.query('SELECT * FROM respondents WHERE identity=$1 ORDER BY assigned_at NULLS LAST,id',[identity])).rows;
     await store.query('INSERT INTO admin_events(action,detail) VALUES ($1,$2)',['export',identity+':'+rows.length]);
     return new Response(makeCsv(rows,identity),{headers:{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="survey-${identity}-${new Date().toISOString().slice(0,10)}.csv"`,'X-Content-Type-Options':'nosniff'}});
    }
    if(path==='/api/admin/enrollment'&&request.method==='POST'){
     requireValue(typeof body.open==='boolean','收案設定無效。');
     await store.transaction(async tx=>{await tx.query("INSERT INTO settings(key,value) VALUES ('enrollment',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",[JSON.stringify({open:body.open})]);await tx.query('INSERT INTO admin_events(action,detail) VALUES ($1,$2)',['enrollment',String(body.open)]);});
     return json({enrollmentOpen:body.open});
    }
   }
   throw new HttpError(404,'找不到此服務。');
  }catch(e){
   if(e.code==='23505')return json({error:'此資料已存在。若曾填答，請使用原瀏覽器繼續，或聯絡研究人員。'},409);
   if(e instanceof HttpError)return json({error:e.message},e.status);
   console.error('Survey service failure',e.code||e.name);return json({error:'資料尚未確認儲存，請留在本頁稍後重試。'},503);
  }
 };
}

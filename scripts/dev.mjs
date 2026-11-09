import {PGlite} from '@electric-sql/pglite';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {createApi} from '../server/api.mjs';
import {hashPassword} from '../server/security.mjs';
await mkdir('.local',{recursive:true});
const db=new PGlite('.local/test-database');
if(!(await db.query("SELECT to_regclass('public.respondents') AS table_name")).rows[0].table_name)await db.exec(await readFile('netlify/database/migrations/202611090001_survey.sql','utf8'));
const env={SESSION_SECRET:'local-testing-only-secret-not-for-production',ADMIN_USERNAME:'researcher',ADMIN_PASSWORD_HASH:await hashPassword('local-test-only'),ENROLLMENT_OPEN:'true'};
const api=createApi({store:db,env,secure:false});
const root=resolve('public'),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(url.pathname.startsWith('/api/')){
   const chunks=[];for await(const c of req)chunks.push(c);
   const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
   const result=await api(request,{ip:'local'});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
  }
  const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const bytes=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Local test server http://127.0.0.1:${port} (isolated test data only)`));

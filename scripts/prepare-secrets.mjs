import {mkdir,writeFile,access} from 'node:fs/promises';
import {randomToken,hashPassword} from '../server/security.mjs';
await mkdir('.local',{recursive:true});
try{await access('.local/production.env');console.log('Existing production credentials preserved.');process.exit(0);}catch{}
const password=randomToken();
const env={SESSION_SECRET:randomToken()+randomToken(),ADMIN_USERNAME:'abcd1234',ADMIN_PASSWORD_HASH:await hashPassword(password),ENROLLMENT_OPEN:'false'};
await writeFile('.local/production.env',Object.entries(env).map(([k,v])=>`${k}='${v}'`).join('\n')+'\n',{mode:0o600});
await writeFile('.local/管理後台登入資訊.txt',`正式管理後台\n帳號：${env.ADMIN_USERNAME}\n密碼：${password}\n\n請妥善保存。此檔只留在本機，不上傳 GitHub。\n網址於部署完成後提供。\n`,{mode:0o600});
console.log('Created local private deployment settings and admin credential file; no secrets printed.');

import {createHmac,randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const randomToken=()=>randomBytes(32).toString('base64url');
export function sign(value,secret){return createHmac('sha256',secret).update(value).digest('base64url');}
export function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function participantToken(id,secret){return `${id}.${sign('participant:'+id,secret)}`;}
export function participantId(token,secret){if(!token)return null;const [id,mac,...extra]=token.split('.');return !extra.length&&/^[0-9a-f-]{36}$/.test(id)&&mac&&equal(mac,sign('participant:'+id,secret))?id:null;}
export function cookies(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(s=>s.trim().split(/=(.*)/s)).filter(p=>p.length>=2).map(p=>[p[0],p[1]]));}
export function cookie(name,value,seconds,secure=true){return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure?'; Secure':''}`;}
export async function hashPassword(password,salt=randomBytes(16).toString('hex')){const key=await scrypt(password,salt,64);return `scrypt$${salt}$${key.toString('hex')}`;}
export async function verifyPassword(password,stored){const [format,salt,key]=String(stored||'').split('$');if(format!=='scrypt'||!salt||!key)return false;return equal(await hashPassword(password,salt),stored);}

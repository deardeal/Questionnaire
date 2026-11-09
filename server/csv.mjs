import {SURVEY} from './survey.mjs';
import {HUES} from './config.mjs';
const date=x=>x?new Date(x).toISOString():'';
function cell(v){let s=String(v??'');if(/^[\s]*[=+\-@\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function makeCsv(rows,identity){
 const fields=['填答編號','身分別',...(identity==='student'?['學號']:[]),'性別','年齡',...(identity==='public'?['學歷','職業']:[]),'色相組別','色相數量','問卷版本','圖片版本','同意版本','同意類型','圖表順序','分派方法','分派機率','分派時間_UTC','完成時間_UTC','完成狀態','目前步驟',...SURVEY.charts.flatMap(c=>[...c.questions.map((_,i)=>`${c.id}_客觀${i+1}`),...SURVEY.subjective.map((_,i)=>`${c.id}_主觀${i+1}`)])];
 const data=rows.map(r=>{const d=r.demographics;return [r.id,identity==='student'?'淡江學生':'社會人士',...(identity==='student'?[d.studentId]:[]),d.gender,d.age,...(identity==='public'?[d.education,d.job]:[]),r.hue?HUES[r.hue-1]:'尚未分派',r.hue,r.version,r.version,r.consent_version,r.consent,'france > poverty > prevention','independent-uniform-v1',r.hue?'0.25':'',date(r.assigned_at),date(r.completed_at),r.step===11?'完成':r.hue?'未完成':'基本資料未送出',r.step,...SURVEY.charts.flatMap((c,i)=>{const base=2+i*3;return [...c.questions.map((_,q)=>{const a=r.pages[base+1]?.[`objective_${q+1}`];return a===undefined?'':'ABCD'[a];}),...SURVEY.subjective.map((_,q)=>r.pages[base+2]?.[`subjective_${q+1}`]??'')];})];});
 return '\uFEFF'+[fields,...data].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}

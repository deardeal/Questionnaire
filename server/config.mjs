export const CONSENT_VERSION='2026-11-09';
export const HUES=['單色相','雙色相','三色相','四色相'];
export const DEMOGRAPHICS={
 gender:['男','女'],
 age:['15–20歲','21–30歲','31–40歲','41–50歲','51–60歲','61歲以上'],
 education:['國小或以下','國中','高中職','專科','大學','碩士','博士'],
 job:['學生','軍公教','金融業','營造業','電子業','服務業','資訊業','製造業','大眾傳播業','運輸業','通信業','農牧業','自由業','家管','醫療人員','商業','待業中','退休','其他']
};
export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export function requireValue(condition,message,status=400){if(!condition)throw new HttpError(status,message);}
export function exactKeys(value,keys){return value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).length===keys.length && keys.every(k=>Object.hasOwn(value,k));}
export function demographics(identity,value){
 const keys=identity==='student'?['studentId','gender','age']:['gender','age','education','job'];
 requireValue(exactKeys(value,keys),'請完成所有基本資料。');
 for(const k of keys){if(k==='studentId'){requireValue(typeof value[k]==='string'&&/^[A-Za-z0-9]{5,20}$/.test(value[k].trim()),'學號請輸入 5–20 位英文字母或數字。');}else requireValue(DEMOGRAPHICS[k].includes(value[k]),'基本資料選項無效，請重新選擇。');}
 return Object.fromEntries(keys.map(k=>[k,k==='studentId'?value[k].trim().toUpperCase():value[k]]));
}
export function answers(step,value){
 const phase=(step-2)%3;
 if(phase===0){requireValue(exactKeys(value,[]),'觀看頁資料無效。');return {};}
 const count=phase===1?3:9, prefix=phase===1?'objective':'subjective';
 const keys=Array.from({length:count},(_,i)=>`${prefix}_${i+1}`);
 requireValue(exactKeys(value,keys),'請完成本頁所有問題。');
 keys.forEach(k=>requireValue(Number.isInteger(value[k]) && value[k]>=(phase===1?0:1)&&value[k]<=(phase===1?3:7),'答案選項無效。'));
 return Object.fromEntries(keys.map(k=>[k,value[k]]));
}

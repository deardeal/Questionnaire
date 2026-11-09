(() => {
 'use strict';
 const app = document.querySelector('#app');
 let state = {step:0,identity:''}, admin=false, enrollmentOpen=false, busy=false;
 const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const radio = (name, options) => `<div class="options">${options.map((x,i)=>`<label class="option"><input type="radio" name="${name}" value="${i}" required><span>${esc(x)}</span></label>`).join('')}</div>`;
 const field = (name,title,opts) => `<fieldset><legend>${title} <span class="required">必填</span></legend>${radio(name,opts)}</fieldset>`;
 function progress(){return `<div class="progress-info"><span>填答進度</span><span>${Math.min(state.step+1,11)} / 11</span></div><div class="track"><span style="width:${Math.min((state.step+1)/11*100,100)}%"></span></div>`;}
 function actions(label='下一頁', hint='送出本頁後，無法返回修改。'){return `<div class="actions"><p>${hint}</p><button class="primary" type="submit">${label} <span aria-hidden="true">→</span></button></div>`;}
 function intro(){return `<section class="card intro-card teacher-intro">${progress()}
 <span class="eyebrow">TAMKANG UNIVERSITY · RESEARCH STUDY</span>
 <h1>資訊圖表色相數量對閱讀體驗與判讀表現之影響</h1>
 <p class="muted">單色相至四色相之比較</p>
 <div class="subtle-notice">本頁為研究說明暨免簽署知情同意說明。請於充分閱讀後，再開始填答。</div>
 <div class="research-copy">
 <p>您好：感謝您撥冗參與本研究。本問卷由淡江大學資訊傳播學系進行，旨在探討資訊圖表使用不同色相數量時，是否影響觀看者的閱讀感受與資訊判讀表現。</p>
 <p>研究將以「多段式數據敘事」、「組間比較」及「模組化指示」三種資訊組織情境，比較單色相、雙色相、三色相及四色相的觀看經驗。每位填答者在正式研究中僅會看到其中一種色相條件下的三幅資訊圖表。</p>
 <p>本問卷將展示「法國人的假期」、「日本丹麥兒童的貧窮率比較」及「為了預防感染可以做的事」三幅資訊圖表，完成時間約 10 至 15 分鐘。研究原則上不蒐集姓名或身分證字號；淡江大學學生則會另外蒐集學號供研究資料管理使用。</p>
 <p>參與完全出於自由意願，您可隨時停止填答，不會有任何不利益。研究結果僅以整體統計方式呈現，不會公開可辨識個人身分的資訊。</p>
 <p class="contact"><strong>研究主持／聯絡人：</strong>詹鎮邦 助理教授<br>淡江大學資訊傳播學系<br>電子郵件：167270@o365.tku.edu.tw　聯絡電話：0922-660-455</p>
 </div>
 <form id="consentForm">${field('consent','閱畢後確認同意相關內容',['本人已滿18歲，且同意施作本問卷。','本人已滿15歲但未滿18歲，法定代理人知情且同意受測，且本人同意施作本問卷。','本人未滿15歲。','本人不願意施作問卷。'])}<p class="entry-label">請選擇您的身分，同意並開始填答</p><div class="entry-buttons"><button class="primary" name="entry" value="student">淡江學生 <span aria-hidden="true">→</span></button><button class="secondary" name="entry" value="public">社會人士 <span aria-hidden="true">→</span></button></div><p class="error" id="consentError" role="alert"></p></form>
 </section>`;}
 function demographics(){const ages=DEMOGRAPHICS.age;return `<section class="card narrow">${progress()}<span class="eyebrow">ABOUT YOU</span><h1>先認識一下您</h1><p class="muted">${state.identity==='student'?'淡江學生':'社會人士'}入口 · 所有欄位必填</p><form id="surveyForm">${state.identity==='student'?'<label class="field">學號 <span class="required">必填</span><input name="studentId" required pattern="[A-Za-z0-9]{5,20}" maxlength="20" minlength="5" placeholder="請輸入學號" autocomplete="off"></label>':''}${field('gender','您的生理性別？',['男','女'])}${field('age','您的年齡？',ages)}${state.identity==='public'?field('education','您的最高學歷？',['國小或以下','國中','高中職','專科','大學','碩士','博士'])+field('job','您的職業？',['學生','軍公教','金融業','營造業','電子業','服務業','資訊業','製造業','大眾傳播業','運輸業','通信業','農牧業','自由業','家管','醫療人員','商業','待業中','退休','其他']):''}${actions()}</form></section>`;}
 function chartPanel(c){return `<div class="chart-panel"><img src="${c.image}" alt="${c.title}資訊圖表" loading="eager"><button type="button" class="zoom-button" data-zoom>放大閱讀 ↗</button></div>`;}
 function chartPage(){const index=Math.floor((state.step-2)/3), phase=(state.step-2)%3, c=SURVEY.charts[index];const names=['觀看圖表','客觀判讀','閱讀感受'];let body='';
 if(phase===0) body=`<p class="intro-text">請仔細觀看並記住圖表內容。按下「開始回答」後，圖片會隱藏，接著回答三題客觀題。</p>${chartPanel(c)}<form id="surveyForm">${actions('開始回答','確認已完成觀看後，再進入下一頁。')}</form>`;
 if(phase===1) body=`<div class="subtle-notice">圖片已隱藏。請依剛才所見的內容，選擇最合適的答案。</div><form id="surveyForm">${c.questions.map((q,i)=>field(`objective_${i+1}`,`${i+1}. ${q.text}`,q.options.map((a,j)=>`${'ABCD'[j]}. ${a}`))).join('')}${actions()}</form>`;
 if(phase===2) body=`<p class="muted">請參考圖片，依照您最直接的閱讀感受作答。每題選擇一個選項。</p><form id="surveyForm"><div class="subjective-layout"><aside>${chartPanel(c)}</aside><div>${SURVEY.subjective.map((q,i)=>`<fieldset class="likert"><legend><span class="q-number">${String(i+1).padStart(2,'0')}</span>${q} <span class="required">必填</span></legend><div class="scale">${SURVEY.scale.map((label,j)=>`<label><input type="radio" name="subjective_${i+1}" value="${j+1}" required><span class="scale-number">${j+1}</span><span>${label}</span></label>`).join('')}</div></fieldset>`).join('')}</div></div>${actions(index===2?'完成問卷':'下一幅圖表')}</form>`;
 return `<section class="card ${phase===2?'wide':''}">${progress()}<div class="stage-head"><span class="eyebrow">INFOGRAPHIC ${String(index+1).padStart(2,'0')} / 03</span><div class="phase-list">${names.map((n,i)=>`<span class="${phase===i?'active':''}">${n}</span>`).join('')}</div></div><h1>${c.title}</h1><p class="stage-subtitle">${names[phase]} <span>· ${phase===0?'請按自己的步調閱讀':phase===1?'3 題，全部必填':'9 題，全部必填'}</span></p>${body}</section>`;}
 function completed(){return `<section class="card end-card"><span class="complete-icon">✓</span><span class="eyebrow">THANK YOU FOR YOUR TIME</span><h1>感謝您的填答</h1><p>三幅圖表的全部答案已成功儲存。<br>您可以關閉此頁面，無須再次填答。</p><p class="muted">填答編號：${esc(state.id)}</p></section>`;}
 function render(){admin=false;setRoute();document.querySelector('#adminLogin').hidden=state.step!==0;app.innerHTML=state.step===0?intro():state.step===1?demographics():state.step===11?completed():chartPage();bind();if(state.step===0&&!enrollmentOpen){app.querySelectorAll('form button').forEach(b=>b.disabled=true);app.querySelector('#consentError').textContent='目前暫停接受新的填答。';}window.scrollTo(0,0);const h=app.querySelector('h1,h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
 async function api(path,body){
  let response;
  try{response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(25000)});}catch{throw new Error('連線中斷或逾時，請留在本頁重試；重送不會產生第二份答案。');}
  let data;try{data=await response.json();}catch{throw new Error('服務暫時無法連線，請留在本頁重試。');}
  if(!response.ok)throw new Error(data.error||'儲存失敗，請重試。');return data;
 }
 function setRoute(){
  if(state.hue){SURVEY.hue=state.hue;SURVEY.charts.forEach(c=>c.image=`assets/hue-${state.hue}/${c.id}.png`);}
  const target=state.hue?`/hue-${state.hue}.html`:'/';
  if(location.pathname!==target)history.replaceState(null,'',target);
 }
 async function sync(){const data=await api('session');state=data.session||{step:0,identity:''};enrollmentOpen=data.enrollmentOpen;render();}
 function error(form,message){let el=form.querySelector('.submit-error');if(!el){el=document.createElement('p');el.className='error submit-error';el.setAttribute('role','alert');form.append(el);}el.textContent=message;el.scrollIntoView({block:'nearest'});}
 async function submit(form,action){if(busy)return;busy=true;const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);form.setAttribute('aria-busy','true');try{await action();}catch(e){error(form,e.message||'網路中斷，資料尚未確認儲存，請重試。');}finally{busy=false;buttons.forEach(b=>b.disabled=false);form.removeAttribute('aria-busy');}}
 function bind(){
  app.querySelector('#consentForm')?.addEventListener('submit',e=>{
   e.preventDefault();if(['2','3'].includes(e.target.elements.consent.value)){app.innerHTML='<section class="card end-card"><h1>謝謝您閱讀研究說明</h1><p>本次未進入填答，感謝您的時間。</p></section>';return;}
   const identity=e.submitter.value,consent=e.target.elements.consent.value==='0'?'adult':'minor-consent';
   submit(e.target,async()=>{
    let pending;try{pending=JSON.parse(sessionStorage.getItem('pending-enrollment'));}catch{}
    if(!pending){const bytes=crypto.getRandomValues(new Uint8Array(32));const nonce=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');pending={id:crypto.randomUUID(),nonce,identity,consent};sessionStorage.setItem('pending-enrollment',JSON.stringify(pending));}
    const data=await api('begin',pending);state=data.session;sessionStorage.removeItem('pending-enrollment');render();
   });
  });
  const form=app.querySelector('#surveyForm');
  form?.addEventListener('submit',e=>{e.preventDefault();submit(form,async()=>{
   const values=Object.fromEntries(new FormData(form));let data;
   if(state.step===1){for(const k of ['gender','age','education','job'])if(k in values)values[k]=DEMOGRAPHICS[k][Number(values[k])];data=await api('basic',values);}
   else data=await api('page',{step:state.step,answers:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Number(v)]))});
   state=data.session;render();
  });});
  const image=app.querySelector('.chart-panel img');
  if(image && state.step>=2 && (state.step-2)%3===0){
   const next=form.querySelector('button[type=submit]');next.disabled=true;
   const ready=()=>{next.disabled=!(image.complete&&image.naturalWidth>0);};image.addEventListener('load',ready);ready();
   image.addEventListener('error',()=>error(form,'圖片未成功載入，請重新整理後再觀看。'));
  }
  app.querySelector('[data-zoom]')?.addEventListener('click',()=>{const c=SURVEY.charts[Math.floor((state.step-2)/3)];const img=document.querySelector('#largeImage');img.src=c.image;img.alt=c.title;document.querySelector('#imageDialog').showModal();});
 }
 document.querySelector('#adminLogin').onclick=()=>{document.querySelector('#loginForm').reset();document.querySelector('#loginError').textContent='';document.querySelector('#loginDialog').showModal();};
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
 document.querySelector('#loginForm').onsubmit=e=>{e.preventDefault();submit(e.target,async()=>{await api('admin/login',Object.fromEntries(new FormData(e.target)));e.target.reset();document.querySelector('#loginDialog').close();await showAdmin();});};
 const hueNames=['單色相','雙色相','三色相','四色相'];
 async function showAdmin(){
  const data=await api('admin/summary');admin=true;history.replaceState(null,'','/admin.html');document.querySelector('#adminLogin').hidden=true;
  app.innerHTML=`<section class="card wide"><div class="admin-heading"><div><span class="eyebrow">RESEARCH DASHBOARD</span><h1>問卷資料後台</h1></div><button class="secondary" id="logout">登出</button></div><div class="notice"><p><strong>目前${data.enrollmentOpen?'開放':'暫停'}新受測者填答</strong><br>已建立填答的受測者仍可續填。各組獨立隨機分派機率為 25%，不自動補齊人數。</p></div><div class="actions"><button class="secondary" id="refresh">更新統計</button><button class="secondary" id="toggleEnrollment">${data.enrollmentOpen?'暫停':'開放'}新填答</button></div><p class="error" id="adminError" role="alert"></p>${['student','public'].map(identity=>{
   const name=identity==='student'?'淡江學生':'社會人士',rows=data.stats.filter(r=>r.identity===identity);
   return `<section class="identity-section"><div class="admin-heading"><h2>${name}</h2><button class="primary" data-export="${identity}">下載${name} CSV ↓</button></div><p class="muted">基本資料尚未送出：${rows.find(r=>r.hue===null)?.entered||0} 人。開始題目指已完成第一幅圖觀看頁。</p><div class="table-scroll"><table><thead><tr><th>色相</th><th>已分派</th><th>已開始題目</th><th>已完成</th><th>完成率</th></tr></thead><tbody>${hueNames.map((label,i)=>{const r=rows.find(x=>x.hue===i+1)||{assigned:0,started:0,completed:0};return `<tr><td>${label}</td><td>${r.assigned}</td><td>${r.started}</td><td>${r.completed}</td><td>${r.assigned?(r.completed/r.assigned*100).toFixed(1):'0.0'}%</td></tr>`;}).join('')}</tbody></table></div><button class="quiet" data-records="${identity}">查看${name}填答列表</button><div id="records-${identity}"></div></section>`;
  }).join('')}<p class="muted">CSV 包含未完成資料，缺漏留空；不包含觀看時間或作答耗時。問卷版本 ${esc(data.version)}。</p></section>`;
  const handle=fn=>async()=>{try{await fn();}catch(e){document.querySelector('#adminError').textContent=e.message;}};
  document.querySelector('#logout').onclick=handle(async()=>{await api('admin/logout',{});await sync();});
  document.querySelector('#refresh').onclick=handle(showAdmin);
  document.querySelector('#toggleEnrollment').onclick=handle(async()=>{await api('admin/enrollment',{open:!data.enrollmentOpen});await showAdmin();});
  app.querySelectorAll('[data-export]').forEach(b=>b.onclick=handle(async()=>{b.disabled=true;try{const res=await fetch('/api/admin/export?identity='+b.dataset.export,{cache:'no-store'});if(!res.ok)throw new Error((await res.json()).error);const url=URL.createObjectURL(await res.blob());const a=document.createElement('a');a.href=url;a.download=`${b.dataset.export==='student'?'淡江學生':'社會人士'}_問卷資料_${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}finally{b.disabled=false;}}));
  async function records(identity,page=0){const r=await api(`admin/records?identity=${identity}&page=${page}`);const target=app.querySelector('#records-'+identity);target.innerHTML=`<div class="table-scroll"><table><thead><tr><th>填答編號</th><th>色相</th><th>年齡</th><th>狀態</th></tr></thead><tbody>${r.rows.map(row=>`<tr><td>${esc(row.id)}</td><td>${row.hue?hueNames[row.hue-1]:'尚未分派'}</td><td>${esc(row.age||'')}</td><td>${row.step===11?'完成':`未完成（步驟 ${row.step}）`}</td></tr>`).join('')}</tbody></table></div><div class="actions"><button class="secondary" data-prev ${page===0?'disabled':''}>上一頁</button><span>第 ${page+1} 頁</span><button class="secondary" data-next ${!r.hasMore?'disabled':''}>下一頁</button></div>`;target.querySelector('[data-prev]').onclick=handle(()=>records(identity,page-1));target.querySelector('[data-next]').onclick=handle(()=>records(identity,page+1));}
  app.querySelectorAll('[data-records]').forEach(b=>b.onclick=handle(()=>records(b.dataset.records)));window.scrollTo(0,0);
 }
 window.addEventListener('popstate',()=>{if(!admin)sync().catch(showFatal);});
 window.addEventListener('pageshow',e=>{if(e.persisted&&!admin)sync().catch(showFatal);});
 function showFatal(e){app.innerHTML=`<section class="card"><h1>暫時無法載入問卷</h1><p>${esc(e.message)}</p><button id="retry" class="primary">重新連線</button></section>`;document.querySelector('#retry').onclick=()=>init();}
 async function init(){try{if(/^\/admin(?:\.html)?\/?$/.test(location.pathname)){try{await showAdmin();}catch{await sync();document.querySelector('#adminLogin').click();}}else await sync();}catch(e){showFatal(e);}}
 init();
})();

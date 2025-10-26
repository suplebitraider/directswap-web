
const SERVICE_COMMISSION_PCT = 3;
const ADMIN_USERNAME = "O13luky"; // поменяй на свой ник без @
let usdRub = 87;
const TG = (typeof Telegram!=='undefined' && Telegram.WebApp) ? Telegram.WebApp : null;
const TG_USER = TG && TG.initDataUnsafe ? TG.initDataUnsafe.user : null;
let CLIENT_USERNAME = TG_USER && TG_USER.username ? '@' + TG_USER.username : null;
// Флаг: что мы хотим сделать после ввода username ('exchange' | 'support' | null)
window._pendingAction = null;
function isValidAtUsername(x){ if(!x) return false; if(x[0] !== '@') x='@'+x; return /^@[A-Za-z0-9_]{5,32}$/.test(x); }

let MANUAL_RATE_RUB = 78.3;
function getManualRate(){ const ls=localStorage.getItem('manual_rate_rub'); if(ls){ const v=parseFloat(ls); if(!isNaN(v)&&v>0) return v; } if(typeof MANUAL_RATE_RUB==='number'&&MANUAL_RATE_RUB>0) return MANUAL_RATE_RUB; return null; }
function setManualRate(v){ const n=parseFloat(v); if(!isNaN(n)&&n>0){ localStorage.setItem('manual_rate_rub', String(n)); usdRub=n; updateRateLabels(); recalc(); } }
function showAdminPanelIfNeeded(){ const p=new URLSearchParams(location.search); if(p.get('admin')!=='1') return; const panel=document.createElement('div'); panel.style.position='fixed'; panel.style.right='12px'; panel.style.bottom='12px'; panel.style.zIndex='1000'; panel.style.padding='10px'; panel.style.background='#0C1216'; panel.style.border='1px solid #1a2731'; panel.style.borderRadius='12px'; panel.style.boxShadow='0 8px 30px rgba(0,0,0,.4)'; panel.innerHTML='<div style="color:#EAF7FF;font-weight:800;margin-bottom:6px">Admin: Курс USDT→RUB</div><input id="adminRate" type="number" step="0.01" style="width:160px;padding:8px;border-radius:10px;border:1px solid #1a2731;background:#0c1115;color:#fff" /><button id="saveRate" style="padding:8px 10px;border-radius:10px;border:0;background:linear-gradient(90deg,#00FF7F,#00BFFF);color:#04121b;font-weight:800;margin-left:6px">Сохранить</button>'; document.body.appendChild(panel); const inp=panel.querySelector('#adminRate'); const saved=getManualRate(); if(saved) inp.value=saved.toFixed(2); panel.querySelector('#saveRate').addEventListener('click', ()=> setManualRate(inp.value)); }

function updateRateLabels(){ document.querySelectorAll('#usd-rate').forEach(el=> el.textContent=(typeof usdRub==='number'&&usdRub>0)?usdRub.toFixed(2):'—'); }
async function fetchUSDRate(){ const manual=getManualRate(); if(manual){ usdRub=manual; updateRateLabels(); return; } try{ const r=await fetch('https://api.exchangerate.host/latest?base=USD&symbols=RUB'); const d=await r.json(); usdRub=d?.rates?.RUB ?? null; }catch(e){ usdRub=null; } updateRateLabels(); }

function currencyToUsdMultiplier(sym){ if(sym==='USDT') return 1; return 1; }
function recalc(){ const amount=parseFloat((document.getElementById('amount')||{}).value || '0'); const currency=(document.getElementById('currency')||{}).value||'USDT'; const usdMul=currencyToUsdMultiplier(currency); const usdAmount=amount*usdMul; const grossRub=(typeof usdRub==='number'&&usdRub>0)?usdAmount*usdRub:0; const commissionRub=grossRub*(SERVICE_COMMISSION_PCT/100); const resultRub=Math.max(grossRub-commissionRub,0); setText('gross',grossRub.toFixed(2)); setText('fee',commissionRub.toFixed(2)); setText('rub-result',resultRub.toFixed(2)); }
function setText(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }
function getSelectedNetwork(){ const rb=document.querySelector('.net-radio:checked'); return rb?rb.value:'TRC20'; }
function setupNetworkCards(){ const c=document.getElementById('networkCards'); if(!c) return; c.querySelectorAll('.net-card').forEach(card=>{ card.addEventListener('click',()=>{ c.querySelectorAll('.net-card').forEach(x=>x.classList.remove('active')); card.classList.add('active'); const r=card.querySelector('.net-radio'); if(r) r.checked=true; }); }); }

function show(id){ const b=document.getElementById('mb'); const m=document.getElementById(id); if(b&&m){ b.style.display='block'; m.style.display='block'; } }
function hideAll(){ ['mb','warnModal','cardModal','successModal','usernameModal'].forEach(i=>{ const el=document.getElementById(i); if(el) el.style.display='none'; }); }

function setupModals(){
  // Exchange flow
  const submitBtn=document.getElementById('submit'); if(submitBtn){ submitBtn.onclick=(e)=>{ e.preventDefault(); show('warnModal'); }; }
  const cancelWarn=document.getElementById('cancelWarn'); const confirmWarn=document.getElementById('confirmWarn');
  if(cancelWarn) cancelWarn.onclick=hideAll;
  if(confirmWarn) confirmWarn.onclick=()=>{ const w=document.getElementById('warnModal'); if(w) w.style.display='none'; const cm=document.getElementById('cardModal'); if(cm) cm.style.display='block'; const b=document.getElementById('mb'); if(b) b.style.display='block'; const ci=document.getElementById('cardNumber'); if(ci) ci.focus(); };

  const cancelCard=document.getElementById('cancelCard'); if(cancelCard) cancelCard.onclick=hideAll;
  const cardInput=document.getElementById('cardNumber'); const sendApp=document.getElementById('sendApplication');
  if(cardInput && sendApp){
    const toggle=()=>{ sendApp.disabled=!/^[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}$/.test(cardInput.value); };
    cardInput.addEventListener('input',()=>{ const digits=cardInput.value.replace(/\D/g,'').slice(0,16); cardInput.value=(digits.match(/.{1,4}/g)||[]).join(' '); toggle(); }); toggle();
    sendApp.onclick=()=>{
      if(!CLIENT_USERNAME){ window._pendingAction = 'exchange'; hideAll(); show('usernameModal'); return; }
      const payload={ type:'exchange_request', currency:document.getElementById('currency').value, network:getSelectedNetwork(), amount:parseFloat(document.getElementById('amount').value||'0'), commission_pct:SERVICE_COMMISSION_PCT, usd_rub:usdRub, card_number:cardInput.value.replace(/\s/g,''), username:CLIENT_USERNAME, calc:{ gross_rub:parseFloat(document.getElementById('gross').textContent||'0'), commission_rub:parseFloat(document.getElementById('fee').textContent||'0'), result_rub:parseFloat(document.getElementById('rub-result').textContent||'0') } };
      try{ Telegram.WebApp.sendData(JSON.stringify(payload)); }catch(e){}
      hideAll(); show('successModal'); const goChat=document.getElementById('goChat'); if(goChat){ goChat.textContent='Перейти в чат'; goChat.href=ADMIN_USERNAME?('https://t.me/'+ADMIN_USERNAME):'#'; }
    };
  }

  // Username modal shared
  const uInput=document.getElementById('usernameInput'); const uSave=document.getElementById('saveUsername'); const uCancel=document.getElementById('cancelUsername');
  function uValid(){ return isValidAtUsername((uInput?.value||'').trim()); }
  if(uInput && uSave){ const check=()=>{ uSave.disabled=!uValid(); }; uInput.addEventListener('input',check); check(); }
  if(uCancel) uCancel.onclick=hideAll;
  if(uSave){ uSave.onclick=()=>{ const v=(uInput.value||'').trim(); if(isValidAtUsername(v)){
  CLIENT_USERNAME=(v[0]==='@')?v:('@'+v);
  const pending = window._pendingAction; window._pendingAction = null;
  if (pending === 'exchange') {
    const cm=document.getElementById('cardModal'); if(cm) cm.style.display='block';
    const b=document.getElementById('mb'); if(b) b.style.display='block';
  } else if (pending === 'support') {
    // Ждём повторного нажатия 'Отправить'
  } else {
    hideAll(); show('successModal'); const goChat=document.getElementById('goChat'); if(goChat){ goChat.href=ADMIN_USERNAME?('https://t.me/'+ADMIN_USERNAME):'#'; }
  }
} }; }

  const closeSuccess=document.getElementById('closeSuccess'); if(closeSuccess) closeSuccess.onclick=hideAll;

  // Support flow
  const supportBtn=document.getElementById('supportSend');
  if(supportBtn){
    supportBtn.onclick=()=>{
      const topic=(document.getElementById('supportTopic')||{}).value||'';
      const contact=(document.getElementById('supportContact')||{}).value||'';
      const message=(document.getElementById('supportMessage')||{}).value||'';
      if(!message.trim()){ const el=document.getElementById('supportMessage'); if(el){ el.style.boxShadow='0 0 0 3px rgba(255,80,80,.3)'; setTimeout(()=> el.style.boxShadow='',800);} return; }
      if(!CLIENT_USERNAME){ window._pendingAction = 'support'; show('usernameModal'); return; }
      const payload={ type:'support_request', topic, contact, message, username:CLIENT_USERNAME };
      try{ Telegram.WebApp.sendData(JSON.stringify(payload)); }catch(e){}
      show('successModal'); const goChat=document.getElementById('goChat'); if(goChat){ goChat.textContent='Перейти в чат'; goChat.href=ADMIN_USERNAME?('https://t.me/'+ADMIN_USERNAME):'#'; }
    };
  }
}

function setupInputs(){ ['amount','currency'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.addEventListener('input',recalc); el.addEventListener('change',recalc); } }); }

window.addEventListener('DOMContentLoaded', async ()=>{ showAdminPanelIfNeeded(); setupNetworkCards(); setupModals(); setupInputs(); await fetchUSDRate(); recalc(); });

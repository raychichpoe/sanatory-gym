(async()=>{
'use strict';
const LEGACY='sanatory-gym-v1',tg=window.Telegram?.WebApp,content=document.getElementById('content');
const launch=()=>{const script=document.createElement('script');script.src='./app.js?v=20261023-delete-workout';script.onerror=()=>{content.textContent='Could not load the app. Please reopen it.'};document.head.append(script)};
const valid=text=>{try{const v=JSON.parse(text);return v&&Array.isArray(v.programs)&&Array.isArray(v.sessions)}catch{return false}};
if(!tg?.initData){launch();return}
tg.ready();tg.expand();
const banner=document.createElement('div');banner.className='sync-status small';banner.setAttribute('role','status');document.querySelector('.header').after(banner);
const status=(text,bad=false)=>{banner.textContent=text;banner.classList.toggle('sync-error',bad)};
const choice=(title,description,options)=>new Promise(resolve=>{
 content.replaceChildren();const box=document.createElement('div');box.className='card';const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=description;p.className='muted small';box.append(h,p);
 for(const [label,value] of options){const b=document.createElement('button');b.className='btn full';b.style.marginTop='10px';b.textContent=label;b.onclick=()=>resolve(value);box.append(b)}content.append(box);
});
function backup(text){const link=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));link.href=url;link.download='sanatory-gym-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
try{
 if(!tg.isVersionAtLeast?.('6.9')||!tg.CloudStorage)throw Error('Update Telegram to use account storage.');
 status('Loading your Telegram data…');content.textContent='Loading…';
 const store=new TelegramGymStore(tg.CloudStorage),account=String(tg.initDataUnsafe?.user?.id||'unknown'),key=LEGACY+'-tg-'+account,pendingKey=key+'-pending';
 let text=await store.read();
 const pendingRaw=localStorage.getItem(pendingKey);
 if(pendingRaw){
  const pending=JSON.parse(pendingRaw);
  if(valid(pending.text)){
   let decision;
   do{decision=await choice('Unsynced changes on this device','Your previous changes have not been confirmed in Telegram. Download a backup before choosing the cloud copy.',[['Download local backup','backup'],...(pending.base===store.revision?[['Upload local changes','upload']]:[]),['Use cloud copy','cloud']]);if(decision==='backup')backup(pending.text)}while(decision==='backup');
   if(decision==='upload'){await store.write(pending.text);text=pending.text}
   else localStorage.setItem(key+'-recovery',pending.text);
   localStorage.removeItem(pendingKey);
  }
 }
 if(!text){
  const legacy=localStorage.getItem(LEGACY);
  if(valid(legacy)){
   const importOld=await choice('Existing data on this device','Do these programs and workout records belong to your current Telegram account? The original local copy will be kept.',[['Import my existing data',true],['Start with a new account',false]]);
   if(importOld){await store.write(legacy);text=legacy}
  }
 }
 let current=text,running=false,timer;
 const flush=async()=>{
  if(running)return;running=true;status('Saving to Telegram…');
  try{
   while(true){const snapshot=current;await store.write(snapshot);if(snapshot===current){localStorage.removeItem(pendingKey);break}localStorage.setItem(pendingKey,JSON.stringify({base:store.revision,text:current}))}
   status('Saved to your Telegram account');
  }catch(err){status('Not synced: '+err.message,true);const retry=document.createElement('button');retry.className='btn secondary';retry.textContent='Retry';retry.onclick=()=>flush();banner.append(' ',retry)}finally{running=false}
 };
 window.GymStorage={getItem:()=>current,setItem:(_key,value)=>{
  if(!valid(value))throw Error('Invalid workout data');current=value;
  localStorage.setItem(key,value);localStorage.setItem(pendingKey,JSON.stringify({base:store.revision,text:value}));
  status('Changes saved on this device · syncing…');clearTimeout(timer);timer=setTimeout(flush,500);
 }};
 if(text)localStorage.setItem(key,text);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&localStorage.getItem(pendingKey)){clearTimeout(timer);flush()}});
 window.addEventListener('beforeunload',event=>{if(localStorage.getItem(pendingKey)){event.preventDefault();event.returnValue=''}});
 status('Telegram account storage connected');content.textContent='';launch();
}catch(err){
 status('Account data could not be loaded',true);
 const answer=await choice('Unable to connect',err.message+' Your saved data has not been replaced.',[['Retry','retry']]);if(answer==='retry')location.reload();
}
})();

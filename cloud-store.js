/* Telegram owns account isolation; no bot token or client-side user ID authorizes cloud access. */
(function(root){
'use strict';
const HEAD='sg_head_v1',SIZE=3500,MAX=200;
const valid=text=>{const v=JSON.parse(text);if(!v||!Array.isArray(v.programs)||!Array.isArray(v.sessions))throw Error('Invalid saved data');return v};
class TelegramStore{
 constructor(api){this.api=api;this.revision=null;this.head=null}
 call(method,...args){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Telegram storage timed out')),15000);try{this.api[method](...args,(err,result)=>{clearTimeout(timeout);err?reject(Error(String(err))):resolve(result)})}catch(err){clearTimeout(timeout);reject(err)}})}
 async getHead(){const raw=await this.call('getItem',HEAD);if(!raw)return null;const h=JSON.parse(raw);if(!/^[a-zA-Z0-9_-]+$/.test(h.rev)||!Number.isInteger(h.count)||h.count<1||h.count>MAX)throw Error('Invalid cloud index');return h}
 keys(h){return h?Array.from({length:h.count},(_,i)=>'sg_'+h.rev+'_'+i):[]}
 async read(){
  const h=await this.getHead();let text=null;
  if(h){const keys=this.keys(h),parts=await this.call('getItems',keys);if(keys.some(k=>typeof parts[k]!=='string'||!parts[k]))throw Error('Incomplete cloud data');text=keys.map(k=>parts[k]).join('');valid(text)}
  this.head=h;this.revision=h?.rev||null;return text;
 }
 async write(text){
  valid(text);const count=Math.ceil(text.length/SIZE);if(count>MAX)throw Error('Cloud storage is full. Your data remains on this device.');
  const current=await this.getHead();if((current?.rev||null)!==this.revision)throw Error('Another device saved changes. Reopen the app to review both copies.');
  const rev=crypto.randomUUID().replace(/-/g,''),h={rev,count,previous:current?{rev:current.rev,count:current.count}:null},keys=this.keys(h);
  try{
   for(let i=0;i<count;i++)if(!await this.call('setItem',keys[i],text.slice(i*SIZE,(i+1)*SIZE)))throw Error('Telegram did not confirm saving');
   const latest=await this.getHead();if((latest?.rev||null)!==this.revision)throw Error('Another device saved changes. Reopen the app to review both copies.');
   if(!await this.call('setItem',HEAD,JSON.stringify(h)))throw Error('Telegram did not confirm saving');
  }catch(err){
   // A timed-out index write may have succeeded; never delete its data.
   const confirmed=await this.getHead().catch(()=>undefined);
   if(confirmed?.rev!==rev){if(confirmed!==undefined)await this.call('removeItems',keys).catch(()=>{});throw err}
  }
  this.revision=rev;this.head=h;
  // Keep the previous snapshot for readers already loading it and for recovery.
  if(current?.previous)await this.call('removeItems',this.keys(current.previous)).catch(()=>{});
  return rev;
 }
}
if(typeof module!=='undefined'&&module.exports){module.exports={TelegramStore,valid};return}
root.TelegramGymStore=TelegramStore;
})(globalThis);

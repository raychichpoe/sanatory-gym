const assert=require('node:assert/strict');
const {TelegramStore}=require('./cloud-store.js');
global.crypto=require('node:crypto').webcrypto;
function account(){const data={};return {data,failPart:false,failHead:false,
 getItem(k,cb){cb(null,data[k]||'')},getItems(keys,cb){cb(null,Object.fromEntries(keys.map(k=>[k,data[k]||''])))},
 setItem(k,v,cb){if(this.failPart&&k!=='sg_head_v1')return cb('offline');if(this.failHead&&k==='sg_head_v1')return cb('offline');data[k]=v;cb(null,true)},removeItems(keys,cb){keys.forEach(k=>delete data[k]);cb(null,true)}}}
const payload=n=>JSON.stringify({programs:[{id:'test',name:'a'.repeat(n),exercises:[]}],sessions:[],bodyWeights:[{day:'2026-10-23',weight:80}],split:['test'],active:null});
(async()=>{
 const a=account(),b=account(),phone=new TelegramStore(a),desktop=new TelegramStore(a),otherUser=new TelegramStore(b);
 assert.equal(await phone.read(),null);assert.equal(await otherUser.read(),null);
 const original=payload(12000);await phone.write(original);assert.equal(await desktop.read(),original);assert.equal(await otherUser.read(),null);
 assert(Object.values(a.data).every(v=>v.length<=4096));
 const next=payload(10);await phone.write(next);await assert.rejects(()=>desktop.write(original),/Another device/);assert.equal(await new TelegramStore(a).read(),next);
 a.failPart=true;await assert.rejects(()=>phone.write(original),/offline/);a.failPart=false;assert.equal(await new TelegramStore(a).read(),next);
 a.failHead=true;await assert.rejects(()=>phone.write(original),/offline/);a.failHead=false;assert.equal(await new TelegramStore(a).read(),next);
 await phone.write(original);assert.equal(await desktop.read(),original);
 await assert.rejects(()=>phone.write(payload(710000)),/full/);
 assert.equal(await new TelegramStore(a).read(),original);
 const h=JSON.parse(a.data.sg_head_v1);delete a.data['sg_'+h.rev+'_0'];await assert.rejects(()=>new TelegramStore(a).read(),/Incomplete/);
 console.log('PASS: account isolation, device restore, chunk limits, stale-device conflict, failed writes preserve snapshot, retry, quota rejection, incomplete data rejected');
})().catch(e=>{console.error(e);process.exitCode=1});

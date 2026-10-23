/* SANATORY Gym v0.1 — local-first prototype; cloud multi-user accounts are not implemented yet. */
(()=>{
'use strict';
const KEY='sanatory-gym-v1';
const templates=[
 {id:'push',name:'Push Day',exercises:[{id:'bench',name:'Жим штанги лёжа'},{id:'incline',name:'Жим гантелей под углом'},{id:'triceps',name:'Разгибание на блоке'}]},
 {id:'pull',name:'Pull Day',exercises:[{id:'pulldown',name:'Тяга верхнего блока'},{id:'row',name:'Горизонтальная тяга'},{id:'curl',name:'Подъём на бицепс'}]},
 {id:'legs',name:'Leg Day',exercises:[{id:'squat',name:'Приседания'},{id:'legpress',name:'Жим ногами'},{id:'calves',name:'Подъём на носки'}]}
];
const fresh=()=>({programs:JSON.parse(JSON.stringify(templates)),sessions:[],active:null});
function load(){try{const v=JSON.parse(localStorage.getItem(KEY));return v&&Array.isArray(v.programs)&&Array.isArray(v.sessions)?v:fresh()}catch{return fresh()}}
let db=load(),tab='home',timerUntil=0;
const $=id=>document.getElementById(id),uid=()=>crypto.randomUUID(),save=()=>localStorage.setItem(KEY,JSON.stringify(db));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'});
const num=v=>Number.isFinite(+v)?Math.max(0,+v):0;
const volume=s=>s.exercises.reduce((a,e)=>a+e.sets.filter(t=>t.done).reduce((b,t)=>b+num(t.weight)*num(t.reps),0),0);
const doneSets=s=>s.exercises.reduce((a,e)=>a+e.sets.filter(t=>t.done).length,0);
function toast(message){const el=$('toast');el.textContent=message;el.style.display='block';clearTimeout(toast.id);toast.id=setTimeout(()=>el.style.display='none',2200)}
function button(label,action,cls='secondary',attrs=''){return '<button type="button" class="btn '+cls+'" data-action="'+action+'" '+attrs+'>'+label+'</button>'}
function navigate(next){tab=next;render()}
function render(){const titles={home:'Тренировки',programs:'Мои программы',history:'История',progress:'Прогресс'};$('page-title').textContent=titles[tab];document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('content').innerHTML=tab==='home'?home():tab==='programs'?programs():tab==='history'?history():progress();tick()}
function home(){if(db.active)return activeView();const last=db.sessions.at(-1);
return '<section class="card hero"><span class="pill">YOUR WORKOUT SPACE</span><h2>Становись сильнее.<br>Каждую тренировку.</h2><p class="muted">Записывай подходы, отслеживай веса и побеждай свои рекорды.</p></section>'+
'<div class="row" style="margin-bottom:18px"><div class="metric"><strong>'+db.sessions.length+'</strong><small>Тренировок</small></div><div class="metric"><strong>'+db.sessions.reduce((a,s)=>a+doneSets(s),0)+'</strong><small>Подходов</small></div><div class="metric"><strong>'+Math.round(db.sessions.reduce((a,s)=>a+volume(s),0)).toLocaleString('ru-RU')+'</strong><small>Объём, кг</small></div></div>'+
'<h2 class="section-title">Начать тренировку</h2>'+db.programs.map(p=>'<div class="card row"><div><strong>'+esc(p.name)+'</strong><p class="muted small">'+p.exercises.length+' упражнений</p></div>'+button('Начать','start','', 'data-id="'+esc(p.id)+'"')+'</div>').join('')+
(last?'<div class="card"><span class="muted small">Последняя тренировка</span><h2>'+esc(last.name)+'</h2><p class="muted">'+date(last.finished)+' · '+doneSets(last)+' подходов · '+Math.round(volume(last))+' кг</p></div>':'')+
'<p class="notice">Прототип: данные пока сохраняются только на этом устройстве. Облачная синхронизация и персональные Telegram-аккаунты будут в следующей версии.</p>'}
function start(id){const p=db.programs.find(x=>x.id===id);if(!p)return;db.active={id:uid(),programId:p.id,name:p.name,started:new Date().toISOString(),exercises:p.exercises.map(e=>({id:e.id,name:e.name,sets:[{id:uid(),weight:0,reps:10,done:false}]}))};save();navigate('home')}
function activeView(){const s=db.active;return '<div class="timer"><div class="row"><div><span class="small muted">ОТДЫХ</span><br><strong id="timer-text">00:00</strong></div><div class="actions" style="margin:0">'+button('1:30','rest','ghost','data-seconds="90"')+button('2:00','rest','ghost','data-seconds="120"')+button('×','stop-rest','secondary')+'</div></div></div>'+
'<div class="card"><span class="pill">ТРЕНИРОВКА ИДЁТ</span><h2 style="margin-top:10px">'+esc(s.name)+'</h2><p class="muted small">'+doneSets(s)+' выполненных подходов · '+Math.round(volume(s))+' кг объёма</p>'+
s.exercises.map((e,i)=>'<div class="exercise"><h3>'+esc(e.name)+'</h3><div class="set-row small muted"><span>#</span><span>Вес, кг</span><span>Повторы</span><span>Готово</span></div>'+
e.sets.map((t,j)=>'<div class="set-row"><span class="muted">'+(j+1)+'</span><input aria-label="Вес" class="input" type="number" inputmode="decimal" min="0" step="0.5" value="'+t.weight+'" data-field="weight" data-ex="'+i+'" data-set="'+j+'"><input aria-label="Повторы" class="input" type="number" inputmode="numeric" min="0" step="1" value="'+t.reps+'" data-field="reps" data-ex="'+i+'" data-set="'+j+'"><button aria-label="Отметить подход" data-action="toggle-set" data-ex="'+i+'" data-set="'+j+'" class="set-done '+(t.done?'':'off')+'">✓</button></div>').join('')+
'<div class="actions">'+button('+ Подход','add-set','ghost','data-ex="'+i+'"')+button('Удалить','remove-ex','secondary','data-ex="'+i+'"')+'</div></div>').join('')+
'<div class="actions">'+button('+ Упражнение','add-ex','secondary')+button('Завершить тренировку','finish','')+button('Отменить','cancel','danger')+'</div></div>'}
function programs(){return '<p class="muted small">Создавай собственные планы. Изменения не затрагивают уже сохранённые тренировки.</p>'+db.programs.map(p=>'<div class="card"><div class="row"><h2>'+esc(p.name)+'</h2>'+button('Удалить','delete-program','danger','data-id="'+esc(p.id)+'"')+'</div>'+p.exercises.map(e=>'<div class="list-item row"><span>'+esc(e.name)+'</span>'+button('×','delete-exercise','secondary','data-id="'+esc(p.id)+'" data-exid="'+esc(e.id)+'"')+'</div>').join('')+'<div class="actions">'+button('+ Упражнение','program-ex','ghost','data-id="'+esc(p.id)+'"')+button('Начать','start','','data-id="'+esc(p.id)+'"')+'</div></div>').join('')+button('+ Новая программа','new-program','full')}
function history(){return db.sessions.length?db.sessions.slice().reverse().map(s=>'<div class="card"><div class="row"><h2>'+esc(s.name)+'</h2><span class="muted small">'+date(s.finished)+'</span></div><p class="muted small">'+doneSets(s)+' подходов · '+Math.round(volume(s))+' кг</p>'+s.exercises.map(e=>'<div class="list-item"><strong>'+esc(e.name)+'</strong><div class="muted small">'+e.sets.filter(t=>t.done).map(t=>esc(t.weight)+' кг × '+esc(t.reps)).join(' · ')+'</div></div>').join('')+'</div>').join(''):'<div class="empty"><strong>История пока пуста</strong>Заверши первую тренировку, и она появится здесь.</div>'}
function progress(){if(!db.sessions.length)return '<div class="empty"><strong>Прогресс начинается с первой тренировки</strong>Заверши тренировку, чтобы увидеть результаты.</div>';const names=[...new Set(db.sessions.flatMap(s=>s.exercises.map(e=>e.name)))];return '<div class="card"><h2>Общий прогресс</h2><div class="row"><div class="metric"><strong>'+db.sessions.length+'</strong><small>Тренировок</small></div><div class="metric"><strong>'+Math.round(db.sessions.reduce((a,s)=>a+volume(s),0))+'</strong><small>Всего кг</small></div></div></div><h2 class="section-title">Максимальные рабочие веса</h2>'+names.map(n=>{const points=db.sessions.flatMap(s=>s.exercises.filter(e=>e.name===n).flatMap(e=>e.sets.filter(t=>t.done).map(t=>num(t.weight))));const max=Math.max(...points,0);return '<div class="card"><div class="row"><strong>'+esc(n)+'</strong><strong>'+max+' кг</strong></div><div class="bar"><span style="width:'+(max?100:0)+'%"></span></div><p class="muted tiny">'+points.length+' записанных подходов</p></div>'}).join('')}
function finish(){if(!db.active)return;if(!doneSets(db.active)){toast('Отметь хотя бы один выполненный подход');return}db.active.finished=new Date().toISOString();db.sessions.push(db.active);db.active=null;save();timerUntil=0;navigate('history');toast('Тренировка сохранена')}
function ask(text){const value=prompt(text);return value&&value.trim()?value.trim().slice(0,80):null}
document.addEventListener('click',e=>{const navButton=e.target.closest('[data-tab]');if(navButton){navigate(navButton.dataset.tab);return}const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id,ex=Number(b.dataset.ex),set=Number(b.dataset.set);
if(a==='start'){if(db.active){toast('Сначала заверши текущую тренировку');navigate('home')}else start(id)}
if(a==='rest'){timerUntil=Date.now()+Number(b.dataset.seconds)*1000;tick()}
if(a==='stop-rest'){timerUntil=0;tick()}
if(a==='toggle-set'){let t=db.active.exercises[ex].sets[set];t.done=!t.done;save();render()}
if(a==='add-set'){const sets=db.active.exercises[ex].sets,prev=sets.at(-1);sets.push({id:uid(),weight:prev?.weight||0,reps:prev?.reps||10,done:false});save();render()}
if(a==='remove-ex'&&confirm('Удалить упражнение из текущей тренировки?')){db.active.exercises.splice(ex,1);save();render()}
if(a==='add-ex'){const n=ask('Название упражнения');if(n){db.active.exercises.push({id:uid(),name:n,sets:[{id:uid(),weight:0,reps:10,done:false}]});save();render()}}
if(a==='finish')finish();
if(a==='cancel'&&confirm('Отменить тренировку? Несохранённые подходы будут потеряны.')){db.active=null;save();timerUntil=0;render()}
if(a==='new-program'){const n=ask('Название новой программы');if(n){db.programs.push({id:uid(),name:n,exercises:[]});save();render()}}
if(a==='delete-program'&&confirm('Удалить программу? История тренировок сохранится.')){db.programs=db.programs.filter(p=>p.id!==id);save();render()}
if(a==='program-ex'){const n=ask('Название упражнения');if(n){db.programs.find(p=>p.id===id).exercises.push({id:uid(),name:n});save();render()}}
if(a==='delete-exercise'&&confirm('Удалить упражнение?')){const p=db.programs.find(p=>p.id===id);p.exercises=p.exercises.filter(e=>e.id!==b.dataset.exid);save();render()}
});
document.addEventListener('change',e=>{const input=e.target.closest('[data-field]');if(!input||!db.active)return;const t=db.active.exercises[Number(input.dataset.ex)]?.sets[Number(input.dataset.set)];if(!t)return;t[input.dataset.field]=num(input.value);save()});
function tick(){const el=$('timer-text');if(!el)return;const remaining=Math.max(0,Math.ceil((timerUntil-Date.now())/1000));el.textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');if(!remaining&&timerUntil){timerUntil=0;toast('Время отдыха закончилось');if(navigator.vibrate)navigator.vibrate(200)}}
setInterval(tick,1000);
try{window.Telegram?.WebApp?.ready();window.Telegram?.WebApp?.expand();const name=window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name;if(name)$('avatar').textContent=name.slice(0,2).toUpperCase()}catch{}
render();
})();

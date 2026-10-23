/* SANATORY Gym v0.1 — local-first prototype; cloud multi-user accounts are not implemented yet. */
(()=>{
'use strict';
const KEY='sanatory-gym-v1';
const exerciseCatalog=[
 ['incline','Incline Dumbbell Press','Chest',['Жим гантелей под углом']],
 ['pec-deck','Peck Deck','Chest',['Pec Deck']],
 ['lateral-raise','Cable Lateral Raises','Side delts',[]],
 ['triceps','Triceps Pushdown','Triceps',['Разгибание на блоке']],
 ['overhead-rope','Triceps Overhead Rope','Triceps',[]],
 ['hammer-press','Hammer Press','Chest',[]],
 ['bench','Bench Press','Chest',['Жим штанги лёжа']],
 ['standing-curl','Biceps Stand Curl','Biceps',[]],
 ['pulldown','Lat Pulldown','Lats',['Тяга верхнего блока']],
 ['legpress','Leg Press','Quads',['Жим ногами']],
 ['leg-curl','Leg Curls','Hamstrings',[]],
 ['row','Seated Cable Row','Back',['Горизонтальная тяга']],
 ['rear-delt','Rear Delt Cable','Rear delts',[]],
 ['incline-curl','Incline Biceps Curl','Biceps',[]],
 ['hammer-curl','Cable Biceps Hammer Curl','Brachialis',[]],
 ['curl','Biceps Curl','Biceps',['Подъём на бицепс']],
 ['squat','Squat','Quads',['Приседания']],
 ['calves','Calf Raise','Calves',['Подъём на носки']]
];
const normalizedName=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
const catalogEntry=e=>exerciseCatalog.find(c=>[c[1],...c[3]].some(n=>normalizedName(n)===normalizedName(e.name)));
const makeExercise=(id,name)=>{const c=exerciseCatalog.find(c=>c[0]===id);return {id:c[0],name:name||c[1],muscle:c[2]}};
const templates=[
 {id:'push-1',name:'Push Day 1',exercises:['incline','pec-deck','lateral-raise','triceps','overhead-rope'].map(id=>makeExercise(id))},
 {id:'push-2',name:'Push Day 2',exercises:['hammer-press','pec-deck','lateral-raise','triceps','overhead-rope'].map(id=>makeExercise(id))},
 {id:'fullbody',name:'FullBody',exercises:['bench','pec-deck','lateral-raise','triceps','standing-curl','pulldown','legpress','leg-curl'].map(id=>makeExercise(id,id==='pec-deck'?'Pec Deck':undefined))},
 {id:'pull',name:'Pull Day',exercises:['pulldown','row','rear-delt','incline-curl','hammer-curl'].map(id=>makeExercise(id))}
];
function applyProgramPack(data){
 if(data.programPackVersion===1)return false;
 // Only replace untouched starter plans. Keep every custom plan and historical ID.
 const starters={push:['Жим штанги лёжа','Жим гантелей под углом','Разгибание на блоке'],pull:['Тяга верхнего блока','Горизонтальная тяга','Подъём на бицепс'],legs:['Приседания','Жим ногами','Подъём на носки']};
 const starterNames={push:'Push Day',pull:'Pull Day',legs:'Leg Day'};
 data.programs=data.programs.filter(p=>!(starterNames[p.id]===p.name&&JSON.stringify(p.exercises.map(e=>e.name))===JSON.stringify(starters[p.id])));
 for(const template of templates){
  const existing=data.programs.find(p=>normalizedName(p.name)===normalizedName(template.name));
  if(existing){
   for(const exercise of template.exercises){
    const match=existing.exercises.find(e=>(catalogEntry(e)?.[0]||normalizedName(e.name))===(catalogEntry(exercise)?.[0]||normalizedName(exercise.name)));
    if(match){if(!match.muscle)match.muscle=exercise.muscle}
    else existing.exercises.push({...exercise});
   }
  }else{
   const id=data.programs.some(p=>p.id===template.id)?template.id+'-pack-v1':template.id;
   data.programs.push({...template,id,exercises:template.exercises.map(e=>({...e}))});
  }
 }
 data.programPackVersion=1;return true;
}
const muscleGroups=[
 ['Chest','chest','Грудь'],['Side delts','side-delts','Плечи · средняя дельта'],
 ['Triceps','triceps','Трицепс'],['Biceps','biceps','Бицепс'],['Lats','lats','Спина · широчайшие'],
 ['Quads','quads','Квадрицепсы'],['Hamstrings','hamstrings','Задняя поверхность бедра'],
 ['Back','back','Спина'],['Rear delts','rear-delts','Плечи · задняя дельта'],
 ['Brachialis','brachialis','Плечевая мышца'],['Calves','calves','Икры']
];
const exerciseName=e=>catalogEntry(e)?.[1]||e.name;
function muscleTag(e){
 const muscle=e.muscle||catalogEntry(e)?.[2],group=muscleGroups.find(g=>g[0]===muscle||g[2]===muscle);
 return muscle?'<span class="muscle-tag muscle-'+(group?.[1]||'other')+'">'+esc(group?.[0]||muscle)+'</span>':'';
}
const fresh=()=>({programs:JSON.parse(JSON.stringify(templates)),sessions:[],active:null});
function load(){try{const v=JSON.parse(localStorage.getItem(KEY));return v&&Array.isArray(v.programs)&&Array.isArray(v.sessions)?v:fresh()}catch{return fresh()}}
let db=load(),tab='home',timerUntil=0;
const $=id=>document.getElementById(id),uid=()=>crypto.randomUUID(),save=()=>localStorage.setItem(KEY,JSON.stringify(db));
if(applyProgramPack(db))save();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const num=v=>Number.isFinite(+v)?Math.max(0,+v):0;
const volume=s=>s.exercises.reduce((a,e)=>a+e.sets.filter(t=>t.done).reduce((b,t)=>b+num(t.weight)*num(t.reps),0),0);
const doneSets=s=>s.exercises.reduce((a,e)=>a+e.sets.filter(t=>t.done).length,0);
function toast(message){const el=$('toast');el.textContent=message;el.style.display='block';clearTimeout(toast.id);toast.id=setTimeout(()=>el.style.display='none',2200)}
function button(label,action,cls='secondary',attrs=''){return '<button type="button" class="btn '+cls+'" data-action="'+action+'" '+attrs+'>'+label+'</button>'}
const expandedPrograms=new Set();
function navigate(next){expandedPrograms.clear();calendarState=null;tab=next;render()}
function render(){const titles={home:'Workouts',programs:'My programs',history:'History',progress:'Progress',weight:'Weight'};$('page-title').textContent=titles[tab];document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('content').innerHTML=tab==='home'?home():tab==='programs'?programs():tab==='history'?history():tab==='weight'?weightView():progress();tick()}
function home(){if(db.active)return activeView();const last=db.sessions.slice().sort((a,b)=>new Date(b.finished)-new Date(a.finished))[0];
return '<section class="card hero mascot-hero"><h2 lang="ru">Не базарим,<br>а тренируемся</h2><img class="workout-mascot" src="./assets/workout-mascot-v2.png" alt="" width="1122" height="1402" fetchpriority="high"></section>'+
'<div class="row" style="margin-bottom:18px"><div class="metric"><strong>'+db.sessions.length+'</strong><small>Workouts</small></div><div class="metric"><strong>'+db.sessions.reduce((a,s)=>a+doneSets(s),0)+'</strong><small>Sets</small></div></div>'+
'<h2 class="section-title">Start a workout</h2>'+db.programs.map(p=>'<div class="card row"><div><strong>'+esc(p.name)+'</strong><p class="muted small">'+p.exercises.length+' exercises</p></div>'+button('Start','start','', 'data-id="'+esc(p.id)+'"')+'</div>').join('')+
(last?workoutCard(last,true):'')+
'<p class="notice">Your programs and workout history are saved in this browser. Cloud sync is not available yet.</p>'}
function start(id){const p=db.programs.find(x=>x.id===id);if(!p)return;db.active={id:uid(),programId:p.id,name:p.name,started:new Date().toISOString(),exercises:p.exercises.map(e=>({id:e.id,name:e.name,muscle:e.muscle||catalogEntry(e)?.[2],sets:[{id:uid(),weight:0,reps:10,done:false}]}))};save();navigate('home')}
function activeView(){const s=db.active;return '<div class="timer"><div class="row"><div><span class="small muted">REST</span><br><strong id="timer-text">00:00</strong></div><div class="actions" style="margin:0">'+button('1:30','rest','ghost','data-seconds="90"')+button('2:00','rest','ghost','data-seconds="120"')+button('3:00','rest','ghost','data-seconds="180"')+button('×','stop-rest','secondary')+'</div></div></div>'+
'<div class="card"><span class="pill">WORKOUT IN PROGRESS</span><h2 style="margin-top:10px">'+esc(s.name)+'</h2><p class="muted small">'+doneSets(s)+' completed sets · '+Math.round(volume(s))+' kg volume</p>'+
s.exercises.map((e,i)=>'<div class="exercise"><h3>'+esc(exerciseName(e))+'</h3>'+muscleTag(e)+'<div class="set-row small muted"><span>#</span><span>Weight, kg</span><span>Reps</span><span>Done</span></div>'+
e.sets.map((t,j)=>'<div class="set-row"><span class="muted">'+(j+1)+'</span><input aria-label="Weight" class="input" type="number" inputmode="decimal" min="0" step="0.5" value="'+t.weight+'" data-field="weight" data-ex="'+i+'" data-set="'+j+'"><input aria-label="Reps" class="input" type="number" inputmode="numeric" min="0" step="1" value="'+t.reps+'" data-field="reps" data-ex="'+i+'" data-set="'+j+'"><button aria-label="Mark set complete" data-action="toggle-set" data-ex="'+i+'" data-set="'+j+'" class="set-done '+(t.done?'':'off')+'">✓</button></div>').join('')+
'<div class="actions">'+button('+ Set','add-set','ghost','data-ex="'+i+'"')+button('Delete','remove-ex','secondary','data-ex="'+i+'"')+'</div></div>').join('')+
'<div class="actions">'+button('+ Exercise','add-ex','secondary')+button('Finish workout','finish','')+button('Cancel','cancel','danger')+'</div></div>'}
let calendarState=null;
const dayKey=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const amount=value=>num(value).toLocaleString('en-GB',{maximumFractionDigits:10});
function exerciseDays(exercise){
 const days=new Map();
 for(const session of db.sessions){
  const key=dayKey(session.finished);if(!key)continue;
  for(const recorded of session.exercises||[]){
   // Stable IDs survive renaming; name fallback supports older entries without IDs.
   const sameId=recorded.id&&exercise.id&&recorded.id===exercise.id;
   const recordedKey=catalogEntry(recorded)?.[0]||normalizedName(recorded.name),exerciseKey=catalogEntry(exercise)?.[0]||normalizedName(exercise.name);
   if(!sameId&&recordedKey!==exerciseKey)continue;
   const sets=(recorded.sets||[]).filter(set=>set.done);if(!sets.length)continue;
   if(!days.has(key))days.set(key,[]);days.get(key).push(...sets);
  }
 }
 return [...days].sort((a,b)=>b[0].localeCompare(a[0]));
}
function resultView(entry){
 if(!entry)return '<p class="muted small">No completed sets yet</p>';
 const [key,sets]=entry;
 return '<div class="exercise-result"><div class="small muted">'+date(key+'T12:00:00')+'</div><ol class="result-sets">'+sets.map(t=>'<li>'+amount(t.weight)+' kg × '+amount(t.reps)+'</li>').join('')+'</ol><strong class="small result-volume">Volume: '+amount(sets.reduce((sum,t)=>sum+num(t.weight)*num(t.reps),0))+' kg</strong></div>';
}
function calendarView(days,attrs){
 const state=calendarState,first=new Date(state.year,state.month,1),count=new Date(state.year,state.month+1,0).getDate(),offset=(first.getDay()+6)%7,recorded=new Set(days.map(d=>d[0]));
 let cells='<span aria-hidden="true"></span>'.repeat(offset);
 for(let n=1;n<=count;n++){
  const key=dayKey(new Date(state.year,state.month,n,12)),has=recorded.has(key);
  cells+='<button type="button" class="calendar-day '+(has?'has-record ':'')+(state.day===key?'selected':'')+'" data-action="calendar-day" data-day="'+key+'" '+attrs+' '+(has?'':'disabled')+' aria-label="'+date(key+'T12:00:00')+(has?', recorded sets':'')+'" aria-pressed="'+(state.day===key)+'">'+n+'</button>';
 }
 return '<div class="exercise-calendar" role="group" aria-label="Results calendar"><div class="row calendar-heading">'+button('‹','calendar-prev','secondary',attrs+' aria-label="Previous month"')+'<strong>'+esc(first.toLocaleDateString('en-GB',{month:'long',year:'numeric'}))+'</strong>'+button('›','calendar-next','secondary',attrs+' aria-label="Next month"')+'</div><div class="calendar-grid">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<span class="muted tiny">'+d+'</span>').join('')+cells+'</div><p class="muted tiny">Highlighted days have completed sets.</p>'+button('Close calendar','calendar-close','ghost',attrs)+'</div>';
}
function programs(){return '<p class="muted small">Tap a program to view its exercises and latest results.</p>'+db.programs.map((p,pi)=>'<details class="card program-details" data-program-id="'+esc(p.id)+'" '+(expandedPrograms.has(String(p.id))?'open':'')+'><summary class="program-summary"><span><strong>'+esc(p.name)+'</strong><span class="muted small program-count">'+p.exercises.length+' exercises</span></span><span class="program-chevron" aria-hidden="true">⌄</span></summary><div class="program-body"><div class="actions program-manage">'+button('Delete program','delete-program','danger','data-id="'+esc(p.id)+'"')+'</div>'+p.exercises.map((e,ei)=>{
 const days=exerciseDays(e),open=calendarState?.pi===pi&&calendarState?.ei===ei,attrs='data-pi="'+pi+'" data-ei="'+ei+'"';
 return '<div class="list-item"><div class="row"><div class="program-exercise-name"><strong>'+esc(exerciseName(e))+'</strong>'+muscleTag(e)+'</div><div class="exercise-tools">'+button('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>','calendar-toggle','ghost calendar-toggle',attrs+' aria-label="Calendar: '+esc(exerciseName(e))+'" aria-expanded="'+open+'"')+button('×','delete-exercise','secondary','data-id="'+esc(p.id)+'" data-exid="'+esc(e.id)+'" aria-label="Remove exercise"')+'</div></div><p class="tiny muted result-label">'+(open?'Selected date':'Latest result')+'</p>'+resultView(open?days.find(d=>d[0]===calendarState.day):days[0])+(open?calendarView(days,attrs):'')+'</div>';
 }).join('')+'<div class="actions">'+button('+ Exercise','program-ex','ghost','data-id="'+esc(p.id)+'"')+button('Start','start','','data-id="'+esc(p.id)+'"')+'</div></div></details>').join('')+button('+ New program','new-program','full')}
function calendarAction(action,b){
 const pi=Number(b.dataset.pi),ei=Number(b.dataset.ei);
 if(action==='calendar-toggle'){
  if(calendarState?.pi===pi&&calendarState?.ei===ei)calendarState=null;
  else{const latest=exerciseDays(db.programs[pi].exercises[ei])[0]?.[0],d=latest?new Date(latest+'T12:00:00'):new Date();calendarState={pi,ei,day:latest,year:d.getFullYear(),month:d.getMonth()}}
 }else if(action==='calendar-close')calendarState=null;
 else if(calendarState){
  if(action==='calendar-day')calendarState.day=b.dataset.day;
  else{const d=new Date(calendarState.year,calendarState.month+(action==='calendar-prev'?-1:1),1);calendarState.year=d.getFullYear();calendarState.month=d.getMonth()}
 }
 render();
 const target=action==='calendar-close'||(action==='calendar-toggle'&&!calendarState)?'calendar-toggle':action;
 document.querySelector('[data-action="'+target+'"][data-pi="'+pi+'"][data-ei="'+ei+'"]'+(action==='calendar-day'?'[data-day="'+b.dataset.day+'"]':''))?.focus({preventScroll:true});
}
function workoutCard(session,last=false){
 const exercises=(session.exercises||[]).filter(e=>(e.sets||[]).some(t=>t.done));
 return '<details class="card workout-details"><summary class="workout-summary">'+(last?'<span class="workout-kicker">LAST WORKOUT</span>':'')+'<span class="workout-name">'+esc(session.name)+'</span><span class="muted small">'+date(session.finished)+' · '+doneSets(session)+' sets</span><span class="workout-toggle" aria-hidden="true">⌄</span></summary><div class="workout-breakdown">'+exercises.map(e=>{
  const sets=e.sets.filter(t=>t.done),tonnage=sets.reduce((sum,t)=>sum+num(t.weight)*num(t.reps),0);
  return '<div class="list-item"><strong>'+esc(exerciseName(e))+'</strong>'+muscleTag(e)+'<ol class="result-sets">'+sets.map(t=>'<li>'+amount(t.weight)+' kg × '+amount(t.reps)+'</li>').join('')+'</ol><strong class="small result-volume">Volume: '+amount(tonnage)+' kg</strong></div>';
 }).join('')+'</div></details>';
}
function history(){return db.sessions.length?db.sessions.slice().sort((a,b)=>new Date(b.finished)-new Date(a.finished)).map(s=>workoutCard(s)).join(''):'<div class="empty"><strong>No workouts yet</strong>Finish your first workout to see it here.</div>'}
function progressSeries(sessions){
 const groups=new Map();
 for(const session of sessions){
  const day=dayKey(session.finished);if(!day)continue;
  for(const exercise of session.exercises||[]){
   const sets=(exercise.sets||[]).filter(t=>t.done);if(!sets.length)continue;
   const key=catalogEntry(exercise)?.[0]||exercise.id||normalizedName(exercise.name);
   if(!groups.has(key))groups.set(key,{exercise,days:new Map()});
   const group=groups.get(key),weight=Math.max(...sets.map(t=>num(t.weight)));
   group.days.set(day,Math.max(group.days.get(day)??0,weight));
  }
 }
 return [...groups.values()].map(group=>({exercise:group.exercise,points:[...group.days].sort((a,b)=>a[0].localeCompare(b[0])).map(([day,weight])=>({day,weight}))}));
}
function progressChart(series,bodyWeight=false){
 const {exercise,points}=series,width=Math.max(320,points.length*78+72),height=235,left=48,right=24,top=20,bottom=185;
 const minimum=bodyWeight?Math.max(0,Math.min(...points.map(p=>p.weight))-2):0;
 const ceiling=bodyWeight?Math.max(...points.map(p=>p.weight))+2:Math.max(1,...points.map(p=>p.weight))*1.15;
 const first=new Date(points[0].day+'T12:00:00').getTime(),last=new Date(points.at(-1).day+'T12:00:00').getTime();
 const x=p=>points.length===1?(left+width-right)/2:left+(new Date(p.day+'T12:00:00').getTime()-first)/(last-first)*(width-left-right);
 const y=weight=>bottom-(weight-minimum)/(ceiling-minimum)*(bottom-top);
 let grid='';
 for(let i=0;i<=4;i++){
  const weight=minimum+(ceiling-minimum)*i/4,py=y(weight);
  grid+='<line x1="'+left+'" y1="'+py+'" x2="'+(width-right)+'" y2="'+py+'" class="chart-gridline"/><text x="'+(left-8)+'" y="'+(py+4)+'" text-anchor="end" class="chart-axis">'+amount(Math.round(weight*10)/10)+'</text>';
 }
 const line=points.map(p=>x(p)+','+y(p.weight)).join(' ');
 const marks=points.map(p=>'<g><title>'+esc(date(p.day+'T12:00:00'))+': '+amount(p.weight)+' kg</title><circle cx="'+x(p)+'" cy="'+y(p.weight)+'" r="5" class="chart-dot"/><text x="'+x(p)+'" y="'+(y(p.weight)-11)+'" text-anchor="middle" class="chart-value">'+amount(p.weight)+'</text><text x="'+x(p)+'" y="'+(bottom+24)+'" text-anchor="middle" class="chart-axis">'+esc(new Date(p.day+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short'}))+'</text><text x="'+x(p)+'" y="'+(bottom+40)+'" text-anchor="middle" class="chart-axis">'+p.day.slice(0,4)+'</text></g>').join('');
 return '<div class="card progress-card"><h2>'+esc(exerciseName(exercise))+'</h2>'+(bodyWeight?'':muscleTag(exercise))+'<p class="muted small">'+(bodyWeight?'Body weight by date · kg':'Heaviest completed set per workout day · kg')+'</p><div class="chart-scroll" tabindex="0" role="region" aria-label="'+esc(exerciseName(exercise))+' weight chart, scroll horizontally"><svg class="progress-chart" style="min-width:'+width+'px" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Working weight by workout date"><text x="8" y="14" class="chart-axis">kg</text>'+grid+'<polyline points="'+line+'" class="chart-line"/>'+marks+'</svg></div>'+(points.length===1?'<p class="muted tiny">Your first point. Add another record to see your trend.</p>':'')+'<details class="chart-data"><summary>View all dates and weights</summary><table><thead><tr><th scope="col">Date</th><th scope="col">Weight, kg</th></tr></thead><tbody>'+points.map(p=>'<tr><td>'+esc(date(p.day+'T12:00:00'))+'</td><td>'+amount(p.weight)+'</td></tr>').join('')+'</tbody></table></details></div>';
}
function progress(){
 const series=progressSeries(db.sessions);
 return series.length?'<p class="muted small">Track your working weights over time. Each point is the heaviest completed set for that exercise on that day.</p>'+series.map(progressChart).join(''):'<div class="empty"><strong>Your progress starts with your first workout</strong>Finish a workout to see your results.</div>';
}
function weightEntries(){return (Array.isArray(db.bodyWeights)?db.bodyWeights:[]).slice().sort((a,b)=>a.day.localeCompare(b.day))}
function validWeightEntry(day,value){
 const weight=Number(value),parsed=new Date(day+'T12:00:00');
 return /^\d{4}-\d{2}-\d{2}$/.test(day)&&dayKey(parsed)===day&&day<=dayKey(new Date())&&Number.isFinite(weight)&&weight>0&&weight<=1000;
}
function recordBodyWeight(day,value){
 if(!validWeightEntry(day,value))return false;
 const entries=weightEntries(),existing=entries.find(e=>e.day===day);
 if(existing)existing.weight=Number(value);else entries.push({day,weight:Number(value)});
 db.bodyWeights=entries.sort((a,b)=>a.day.localeCompare(b.day));save();return true;
}
function weightView(){
 const entries=weightEntries(),today=dayKey(new Date()),first=entries[0],last=entries.at(-1),change=last?last.weight-first.weight:0;
 const difference=(change>0?'+':change<0?'−':'')+amount(Math.abs(change));
 return '<div class="card"><h2>Log your weight</h2><form id="weight-form"><div class="weight-fields"><label class="small">Date<input class="input" id="body-weight-date" name="date" type="date" value="'+today+'" max="'+today+'" required></label><label class="small">Weight, kg<input class="input" id="body-weight-value" name="weight" type="number" inputmode="decimal" min="0.1" max="1000" step="0.1" placeholder="75.0" required></label></div><p class="muted tiny">One record per date. Saving the same date updates its weight.</p><button type="submit" class="btn full">Save weight</button></form></div>'+(last?'<div class="row weight-metrics"><div class="metric"><strong>'+amount(last.weight)+' kg</strong><small>Latest · '+date(last.day+'T12:00:00')+'</small></div><div class="metric"><strong>'+difference+' kg</strong><small>Change since '+date(first.day+'T12:00:00')+'</small></div></div>'+progressChart({exercise:{name:'Body weight'},points:entries},true)+'<div class="card"><h2>Weight records</h2>'+entries.slice().reverse().map(e=>'<div class="list-item row"><div><strong>'+amount(e.weight)+' kg</strong><p class="muted small">'+date(e.day+'T12:00:00')+'</p></div><div class="exercise-tools">'+button('Edit','edit-weight','secondary','data-day="'+e.day+'"')+button('×','delete-weight','secondary','data-day="'+e.day+'" aria-label="Delete weight for '+date(e.day+'T12:00:00')+'"')+'</div></div>').join('')+'</div>':'<div class="empty"><strong>No weight records yet</strong>Add your first weight to start your chart.</div>');
}
document.addEventListener('submit',event=>{
 if(event.target.id!=='weight-form')return;event.preventDefault();
 if(!recordBodyWeight($('body-weight-date').value,$('body-weight-value').value)){toast('Enter a valid date and weight');return}
 render();toast('Weight saved');
});
function finish(){if(!db.active)return;if(!doneSets(db.active)){toast('Mark at least one set as completed');return}db.active.finished=new Date().toISOString();db.sessions.push(db.active);db.active=null;save();timerUntil=0;navigate('history');toast('Workout saved')}
function ask(text){return new Promise(resolve=>{
 const previous=document.activeElement,dialog=document.createElement('dialog');
 dialog.className='name-dialog';
 dialog.setAttribute('aria-labelledby','name-dialog-title');
 dialog.innerHTML='<form><h2 id="name-dialog-title">'+esc(text)+'</h2><label for="name-dialog-input" class="small muted">Name</label><input id="name-dialog-input" class="input" name="name" maxlength="80" required autocomplete="off" placeholder="Enter a name" autofocus><p class="name-error small" role="status"></p><div class="actions"><button type="button" class="btn secondary" data-dismiss>Cancel</button><button type="submit" class="btn">Add</button></div></form>';
 const finish=value=>{dialog.close();dialog.remove();previous?.focus();resolve(value)};
 dialog.querySelector('form').addEventListener('submit',event=>{
  event.preventDefault();const input=dialog.querySelector('input'),value=input.value.trim();
  if(!value){dialog.querySelector('.name-error').textContent='Enter a name';input.focus();return}
  finish(value.slice(0,80));
 });
 dialog.querySelector('[data-dismiss]').addEventListener('click',()=>finish(null));
 dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null)});
 document.body.append(dialog);dialog.showModal();
})}
document.addEventListener('click',async e=>{const navButton=e.target.closest('[data-tab]');if(navButton){navigate(navButton.dataset.tab);return}const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id,ex=Number(b.dataset.ex),set=Number(b.dataset.set);
if(a==='edit-weight'){const entry=weightEntries().find(e=>e.day===b.dataset.day);if(entry){$('body-weight-date').value=entry.day;$('body-weight-value').value=entry.weight;$('body-weight-value').focus();$('weight-form').scrollIntoView({behavior:'smooth',block:'center'})}return}
if(a==='delete-weight'){db.bodyWeights=weightEntries().filter(e=>e.day!==b.dataset.day);save();render();toast('Weight record deleted');return}
if(a.startsWith('calendar-')){calendarAction(a,b);return}
if(a==='start'){if(db.active){toast('Finish your current workout first');navigate('home')}else start(id)}
if(a==='rest'){timerUntil=Date.now()+Number(b.dataset.seconds)*1000;tick()}
if(a==='stop-rest'){timerUntil=0;tick()}
if(a==='toggle-set'){let t=db.active.exercises[ex].sets[set];t.done=!t.done;save();render()}
if(a==='add-set'){const sets=db.active.exercises[ex].sets,prev=sets.at(-1);sets.push({id:uid(),weight:prev?.weight||0,reps:prev?.reps||10,done:false});save();render()}
if(a==='remove-ex'&&confirm('Remove this exercise from the current workout?')){db.active.exercises.splice(ex,1);save();render()}
if(a==='add-ex'){const n=await ask('Add exercise');if(n&&db.active){db.active.exercises.push({id:uid(),name:n,sets:[{id:uid(),weight:0,reps:10,done:false}]});save();render()}}
if(a==='finish')finish();
if(a==='cancel'&&confirm('Cancel this workout? Unsaved sets will be lost.')){db.active=null;save();timerUntil=0;render()}
if(a==='new-program'){const n=await ask('New program');if(n){db.programs.push({id:uid(),name:n,exercises:[]});save();render()}}
if(a==='delete-program'&&confirm('Delete this program? Workout history will be kept.')){calendarState=null;db.programs=db.programs.filter(p=>p.id!==id);save();render()}
if(a==='program-ex'){const n=await ask('Add exercise'),p=db.programs.find(p=>p.id===id);if(n&&p){p.exercises.push({id:uid(),name:n});save();render()}}
if(a==='delete-exercise'&&confirm('Remove this exercise?')){calendarState=null;const p=db.programs.find(p=>p.id===id);p.exercises=p.exercises.filter(e=>e.id!==b.dataset.exid);save();render()}
});
document.addEventListener('toggle',event=>{const el=event.target;if(!el.matches?.('.program-details'))return;const id=el.dataset.programId;if(el.open)expandedPrograms.add(id);else expandedPrograms.delete(id)},true);
document.addEventListener('change',e=>{const input=e.target.closest('[data-field]');if(!input||!db.active)return;const t=db.active.exercises[Number(input.dataset.ex)]?.sets[Number(input.dataset.set)];if(!t)return;t[input.dataset.field]=num(input.value);save()});
function tick(){const el=$('timer-text');if(!el)return;const remaining=Math.max(0,Math.ceil((timerUntil-Date.now())/1000));el.textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');if(!remaining&&timerUntil){timerUntil=0;toast('Rest time is over');if(navigator.vibrate)navigator.vibrate(200)}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&calendarState){const {pi,ei}=calendarState;calendarAction('calendar-close',{dataset:{pi,ei}})}});
setInterval(tick,1000);
try{window.Telegram?.WebApp?.ready();window.Telegram?.WebApp?.expand();const name=window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name;if(name)$('avatar').textContent=name.slice(0,2).toUpperCase()}catch{}
render();
})();

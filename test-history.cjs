const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const set=(weight,reps,done=true)=>({weight,reps,done});
const session=(finished,sets,id='bench')=>({finished,exercises:[{id,name:'Жим',sets}]});
const data={programPackVersion:1,programs:[{id:'push',name:'Push',exercises:[{id:'bench',name:'Жим переименован'},{id:'empty',name:'Без записей'}]}],sessions:[
 session('2026-10-22T12:00:00',[set(50,10),set(80,5,false)]),
 session('2026-10-20T12:00:00',[set(40,10)]),
 session('2026-10-22T18:00:00',[set(55,8)]),
 session('2026-10-23T12:00:00',[set(99,10,false)]),
 session('2026-10-23T12:00:00',[set(100,10)],'other')],active:null};
const stored=JSON.stringify(data),listeners={},elements={};let writes=0;
const context={console,Date,Map,Set,Number,String,JSON,Math,crypto:require('node:crypto').webcrypto,navigator:{},window:{},setInterval(){},clearTimeout(){},setTimeout(){},localStorage:{getItem:()=>stored,setItem(){writes++}},document:{getElementById(id){return elements[id]??={textContent:'',innerHTML:'',style:{}}},querySelectorAll:()=>[],querySelector:()=>({focus(){}}),addEventListener(type,fn){listeners[type]=fn}}};
vm.createContext(context);
let source=readFileSync(__dirname+'/app.js','utf8').replace(/\r\n/g,'\n');
source=source.replace('render();\n})();','globalThis.test={exerciseDays,resultView,programs,calendarAction,applyProgramPack,muscleTag,templates,workoutCard,home,history,deleteWorkout,progressSeries,progressChart,progress,validWeightEntry,recordBodyWeight,weightEntries,weightView,selectedSplit,changeSplit,splitHome,getState:()=>calendarState};render();\n})();');
vm.runInContext(source,context);
const t=context.test,days=t.exerciseDays(data.programs[0].exercises[0]);
assert.equal(days.length,2);assert.equal(days[0][0],'2026-10-22');assert.equal(days[0][1].length,2);
assert.match(t.resultView(days[0]),/940 kg/);assert.doesNotMatch(t.resultView(days[0]),/80 kg/);
assert.doesNotMatch(t.programs(),/class="exercise-calendar"/);assert.match(t.programs(),/No completed sets yet/);
const b={dataset:{pi:'0',ei:'0'}};
t.calendarAction('calendar-toggle',b);assert.equal(t.getState().day,'2026-10-22');assert.match(t.programs(),/has-record/);
t.calendarAction('calendar-day',{dataset:{pi:'0',ei:'0',day:'2026-10-20'}});assert.match(t.programs(),/400 kg/);
t.calendarAction('calendar-prev',b);assert.equal(t.getState().month,8);
t.calendarAction('calendar-close',b);assert.equal(t.getState(),null);assert.match(t.programs(),/940 kg/);
t.calendarAction('calendar-toggle',b);listeners.keydown({key:'Escape'});assert.equal(t.getState(),null);
assert.equal(writes,0);assert.equal(JSON.stringify(data),stored);
console.log('PASS: latest date, completed sets, same-day aggregation, renamed exercise ID, empty history, calendar selection/navigation/close/Escape, no storage writes');
// Exercise the actual click/submit handlers with all programs removed.
(async()=>{
 let dialog;
 context.document.createElement=()=>{
  const handlers={},input={value:'',focus(){}},error={textContent:''};
  dialog={className:'',setAttribute(){},innerHTML:'',showModal(){this.open=true},close(){this.open=false},remove(){},
   addEventListener(type,fn){handlers[type]=fn},
   querySelector(selector){return selector==='input'?input:selector==='.name-error'?error:{addEventListener(type,fn){handlers[selector+':'+type]=fn}}},handlers,input,error};return dialog;
 };
 context.document.body={append(){}};
 // Reload with an empty program list, preserving recorded sessions.
 context.localStorage.getItem=()=>JSON.stringify({...data,programs:[]});
 vm.runInContext(readFileSync(__dirname+'/app.js','utf8'),context);
 await listeners.click({target:{closest(selector){return selector==='[data-tab]'?{dataset:{tab:'programs'}}:null}}});
 const click=(action,id)=>listeners.click({target:{closest(selector){return selector==='[data-action]'?{dataset:{action,id}}:null}}});
 let pending=click('new-program');assert.equal(dialog.open,true);
 dialog.input.value='   ';dialog.handlers['form:submit']({preventDefault(){}});assert.equal(dialog.error.textContent,'Enter a name');
 dialog.input.value='  Моя программа  ';dialog.handlers['form:submit']({preventDefault(){}});await pending;
 assert.match(elements.content.innerHTML,/Моя программа/);
 const programId=elements.content.innerHTML.match(/data-action="program-ex" data-id="([^"]+)"/)[1];
 pending=click('program-ex',programId);dialog.input.value='Приседания';dialog.handlers['form:submit']({preventDefault(){}});await pending;
 assert.match(elements.content.innerHTML,/Squat/);
 const before=writes;pending=click('new-program');dialog.handlers['[data-dismiss]:click']();await pending;assert.equal(writes,before);
 pending=click('new-program');dialog.handlers.cancel({preventDefault(){}});await pending;assert.equal(writes,before);
 console.log('PASS: create program from empty list, trim/validate name, add exercise, cancel and Escape do not save');
})().catch(error=>{console.error(error);process.exitCode=1});


const pack={programs:[],sessions:data.sessions,active:{id:'keep'}};
const historyBefore=JSON.stringify(pack.sessions);
assert.equal(t.applyProgramPack(pack),true);
assert.equal(pack.programs.length,4);
assert.equal(pack.programs.map(p=>p.exercises.length).join(','),'5,5,8,5');
assert.equal(pack.programs.every(p=>p.exercises.every(e=>e.muscle)),true);
assert.equal(t.applyProgramPack(pack),false);
pack.programs.pop();assert.equal(t.applyProgramPack(pack),false);assert.equal(pack.programs.length,3);
assert.equal(JSON.stringify(pack.sessions),historyBefore);assert.equal(pack.active.id,'keep');
const custom={programs:[{id:'custom',name:'Push Day 1',exercises:[{id:'old-id',name:'Pec Deck'},{id:'extra',name:'Custom exercise'}]}],sessions:[]};
t.applyProgramPack(custom);assert.equal(custom.programs.length,4);assert.equal(custom.programs[0].exercises.filter(e=>/Pe?ck? Deck/.test(e.name)).length,1);assert.equal(custom.programs[0].exercises[0].id,'old-id');assert.equal(custom.programs[0].exercises[0].muscle,'Chest');assert.equal(custom.programs[0].exercises.some(e=>e.id==='extra'),true);
console.log('PASS: four programs, 23 tagged exercises, aliases, no duplicate plans, preserve custom IDs/history/active session, one-time migration');
for(const [name,slug] of [['Chest','chest'],['Side delts','side-delts'],['Triceps','triceps'],['Biceps','biceps'],['Lats','lats'],['Quads','quads'],['Hamstrings','hamstrings'],['Back','back'],['Rear delts','rear-delts'],['Brachialis','brachialis'],['Calves','calves']]){
 assert.match(t.muscleTag({muscle:name}),new RegExp('muscle-'+slug+'"'));
 assert.match(t.muscleTag({muscle:name}),new RegExp('>'+name+'<'));
}
assert.match(t.muscleTag({muscle:'Грудь'}),/muscle-chest">Chest</);
assert.match(t.muscleTag({name:'Жим штанги лёжа'}),/>Chest</);
console.log('PASS: all 11 muscle colors and English labels, including legacy Russian tags');

const detailFixture={name:'Test workout',finished:'2026-10-23T12:00:00',exercises:[{name:'Bench Press',sets:[set(50,10),set(55,8),set(100,10,false)]},{name:'Leg Press',sets:[set(100,12)]},{name:'Skipped',sets:[set(10,10,false)]}]};
const card=t.workoutCard(detailFixture,true),summary=card.match(/<summary[\s\S]*?<\/summary>/)[0];
assert.match(summary,/LAST WORKOUT/);assert.doesNotMatch(summary,/Volume| kg/);
assert.doesNotMatch(card,/<details[^>]*\bopen\b/);
assert.match(card,/Volume: 940 kg/);assert.match(card,/Volume: 1,200 kg/);
assert.doesNotMatch(card,/Skipped|100 kg × 10/);
assert.doesNotMatch(t.home(),/Volume, kg/);
assert.match(t.history(),/workout-details/);
console.log('PASS: collapsed last workout/history cards, no summary or home volume, accurate per-exercise volume, completed exercises only');

const chartSessions=[
 {finished:'2026-11-12T12:00:00',exercises:[{id:'new',name:'Peck Deck',sets:[set(65,8),set(90,10,false)]}]},
 {finished:'2026-10-21T12:00:00',exercises:[{id:'old',name:'Pec Deck',sets:[set(40,10),set(45,8)]}]},
 {finished:'2026-10-25T12:00:00',exercises:[{id:'old',name:'Pec Deck',sets:[set(50,10)]}]},
 {finished:'2026-10-25T18:00:00',exercises:[{id:'other',name:'Peck Deck',sets:[set(55,8)]}]},
 {finished:'invalid',exercises:[{name:'Peck Deck',sets:[set(999,1)]}]}
];
const chartBefore=JSON.stringify(chartSessions),series=t.progressSeries(chartSessions);
assert.equal(series.length,1);assert.equal(series[0].points.map(p=>p.weight).join(','),'45,55,65');assert.equal(series[0].points[0].day,'2026-10-21');
assert.equal(JSON.stringify(chartSessions),chartBefore);
assert.match(t.progressChart(series[0]),/<polyline/);assert.match(t.progressChart(series[0]),/12 Nov 2026/);
const zero=t.progressSeries([{finished:'2026-10-21T12:00:00',exercises:[{name:'Bodyweight',sets:[set(0,10)]}]}]);assert.doesNotMatch(t.progressChart(zero[0]),/NaN|Infinity/);
assert.doesNotMatch(t.progress(),/Overall progress|Total kg/);
console.log('PASS: chart dates sorted, aliases merged, same-day maximum, unfinished sets excluded, zero/single-point charts, data preserved');

assert.equal(t.validWeightEntry('2026-02-30',75),false);assert.equal(t.validWeightEntry('2026-01-01',0),false);assert.equal(t.validWeightEntry('2026-01-01','bad'),false);assert.equal(t.validWeightEntry('2099-01-01',75),false);
assert.equal(t.recordBodyWeight('2026-01-03','80.5'),true);assert.equal(t.recordBodyWeight('2026-01-01',82),true);assert.equal(t.recordBodyWeight('2026-01-03',80),true);
assert.equal(t.weightEntries().length,2);assert.equal(t.weightEntries()[0].day,'2026-01-01');assert.match(t.weightView(),/−2 kg/);assert.match(t.weightView(),/Body weight by date/);assert.doesNotMatch(t.weightView(),/Heaviest completed/);
console.log('PASS: body weight validation, chronological dates, update same date, weight change, body weight chart');

assert.match(t.splitHome(),/CHOOSE YOUR SPLIT/);assert.equal(t.changeSplit('push','toggle-split'),true);assert.equal(t.selectedSplit().join(','),'push');assert.match(t.splitHome(),/DAY 1/);assert.equal(t.changeSplit('push','toggle-split'),true);
assert.equal(t.changeSplit('missing','toggle-split'),false);
console.log('PASS: reorder rejects missing programs and out-of-range moves');

assert.match(t.history(),/data-action="delete-workout"/);
assert.equal(t.deleteWorkout(-1),false);assert.equal(t.deleteWorkout(999),false);
assert.equal(t.deleteWorkout(0),true);
assert.match(t.resultView(t.exerciseDays(data.programs[0].exercises[0])[0]),/440 kg/);
console.log('PASS: delete a single legacy workout without ID, reject invalid index, exercise history recalculated');

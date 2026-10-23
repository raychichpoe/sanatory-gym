const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const set=(weight,reps,done=true)=>({weight,reps,done});
const session=(finished,sets,id='bench')=>({finished,exercises:[{id,name:'Жим',sets}]});
const data={programs:[{id:'push',name:'Push',exercises:[{id:'bench',name:'Жим переименован'},{id:'empty',name:'Без записей'}]}],sessions:[
 session('2026-10-22T12:00:00',[set(50,10),set(80,5,false)]),
 session('2026-10-20T12:00:00',[set(40,10)]),
 session('2026-10-22T18:00:00',[set(55,8)]),
 session('2026-10-23T12:00:00',[set(99,10,false)]),
 session('2026-10-23T12:00:00',[set(100,10)],'other')],active:null};
const stored=JSON.stringify(data),listeners={},elements={};let writes=0;
const context={console,Date,Map,Set,Number,String,JSON,Math,crypto:require('node:crypto').webcrypto,navigator:{},window:{},setInterval(){},clearTimeout(){},setTimeout(){},localStorage:{getItem:()=>stored,setItem(){writes++}},document:{getElementById(id){return elements[id]??={textContent:'',innerHTML:'',style:{}}},querySelectorAll:()=>[],querySelector:()=>({focus(){}}),addEventListener(type,fn){listeners[type]=fn}}};
vm.createContext(context);
let source=readFileSync(__dirname+'/app.js','utf8').replace(/\r\n/g,'\n');
source=source.replace('render();\n})();','globalThis.test={exerciseDays,resultView,programs,calendarAction,getState:()=>calendarState};render();\n})();');
vm.runInContext(source,context);
const t=context.test,days=t.exerciseDays(data.programs[0].exercises[0]);
assert.equal(days.length,2);assert.equal(days[0][0],'2026-10-22');assert.equal(days[0][1].length,2);
assert.match(t.resultView(days[0]),/940 кг/);assert.doesNotMatch(t.resultView(days[0]),/80 кг/);
assert.doesNotMatch(t.programs(),/class="exercise-calendar"/);assert.match(t.programs(),/Нет выполненных подходов/);
const b={dataset:{pi:'0',ei:'0'}};
t.calendarAction('calendar-toggle',b);assert.equal(t.getState().day,'2026-10-22');assert.match(t.programs(),/has-record/);
t.calendarAction('calendar-day',{dataset:{pi:'0',ei:'0',day:'2026-10-20'}});assert.match(t.programs(),/400 кг/);
t.calendarAction('calendar-prev',b);assert.equal(t.getState().month,8);
t.calendarAction('calendar-close',b);assert.equal(t.getState(),null);assert.match(t.programs(),/940 кг/);
t.calendarAction('calendar-toggle',b);listeners.keydown({key:'Escape'});assert.equal(t.getState(),null);
assert.equal(writes,0);assert.equal(JSON.stringify(data),stored);
console.log('PASS: latest date, completed sets, same-day aggregation, renamed exercise ID, empty history, calendar selection/navigation/close/Escape, no storage writes');


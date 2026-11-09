const {test}=require('node:test');
const assert=require('node:assert/strict');
const {suggest,sports}=require('./cardio-suggestions.js');
const now=Date.now();
const snapshot=(battery, stress, age=0)=>({connected:true,health:{bodyBattery:battery,stress,measuredAt:new Date(now-age).toISOString()},runs:[]});
test('all sports work without Garmin, with at most three honest general suggestions',()=>{
 for(const sport of Object.keys(sports)) {
  const result=suggest(sport,{},now);
  assert.equal(result.suggestions.length,3);
  for(const unit of result.suggestions){ assert.equal(unit.sport,sport); assert.equal(unit.source,'Allgemeiner Vorschlag'); assert.ok(unit.steps.length); assert.ok(unit.reason); }
 }
});
test('low recovery prioritizes rest and removes demanding HIIT for every suggestion',()=>{
 for(const data of [snapshot(15,10),snapshot(80,90)]){
  const result=suggest('hiit',data,now);
  assert.equal(result.suggestions[0].rest,true);
  assert.ok(!result.suggestions.some(u=>u.id==='intervals'));
  assert.ok(result.suggestions.every(u=>u.minutes<=10));
  assert.equal(result.suggestions[0].source,'Basierend auf deinen Garmin-Daten');
 }
});
test('stale, future and invalid measurements are never used as current recovery evidence',()=>{
 for(const data of [snapshot(10,90,7*3600000),snapshot(10,90,-3600000),snapshot(-1,101)]) {
  const result=suggest('running',data,now);
  assert.equal(result.suggestions[0].source,'Allgemeiner Vorschlag');
  assert.equal(result.evidence.length,0);
 }
});
test('running history adapts running duration without asserting cycling experience',()=>{
 const data={runs:[2,4,6,8].map(days=>({start:new Date(now-days*86400000).toISOString(),duration:3600}))};
 assert.equal(suggest('running',data,now).suggestions[0].minutes,45);
 assert.equal(suggest('cycling',data,now).suggestions[0].minutes,25);
 assert.equal(suggest('cycling',data,now).suggestions[0].source,'Allgemeiner Vorschlag');
});
test('a long recent run also reduces cross-sport load; failed sync is explained',()=>{
 const data={...snapshot(90,10),error:true,runs:[{start:new Date(now-3600000).toISOString(),duration:4000}]};
 assert.ok(suggest('cycling',data,now).suggestions[0].minutes<25);
 assert.match(suggest('cycling',data,now).note,/nicht aktualisiert/);
});

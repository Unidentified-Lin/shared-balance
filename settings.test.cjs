const assert=require('node:assert/strict');
const {parse}=require('./dist/settings.js');
const settings={names:['小明','小美'],incomes:[25000,75000],raises:[5000,0],minimums:[20000,20000],enabled:[true,false],ratio:12.345,simulate:true,mode:'retain',retention:[40,100],items:[{name:'房租',amount:50000}]};
const file={app:'shared-balance',schemaVersion:1,currency:'TWD',period:'monthly',settings};
assert.deepEqual(parse(JSON.stringify(file)),settings);
assert.deepEqual(parse('\uFEFF'+JSON.stringify(file)),settings);
for(const change of [d=>d.schemaVersion=2,d=>d.app='other',d=>d.currency='USD',d=>delete d.settings.names,d=>d.settings.incomes[0]=-1,d=>d.settings.raises[0]='5000',d=>d.settings.minimums[1]=1.5,d=>d.settings.retention[0]=101,d=>d.settings.ratio=101,d=>d.settings.enabled[0]=1,d=>d.settings.mode='other',d=>d.settings.items[0].amount=1e10,d=>d.settings.items[0].name=null]) {
  const copy=structuredClone(file);change(copy);assert.throws(()=>parse(JSON.stringify(copy)));
}
assert.throws(()=>parse('{bad json'));
const empty=structuredClone(file);empty.settings.items=[];empty.settings.ratio=null;assert.deepEqual(parse(JSON.stringify(empty)),empty.settings);
console.log('Settings round-trip, BOM, empty expenses and 14 invalid-file cases passed.');

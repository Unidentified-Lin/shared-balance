const assert = require('node:assert/strict');
const {calculate,simulate} = require('./dist/model.js');
let count = 0;
for (let i=0;i<10000;i++) {
  const income=[Math.floor(Math.random()*100000),Math.floor(Math.random()*100000)];
  const minimum=[Math.floor(Math.random()*40000),Math.floor(Math.random()*40000)];
  const total=Math.floor(Math.random()*120000);
  const result=calculate(income,minimum,total,Math.random()*160-30);
  if(result.feasible){assert.equal(result.expenses[0]+result.expenses[1],total);result.remaining.forEach((v,j)=>assert.ok(v>=minimum[j]));assert.ok(result.ratio>=0&&result.ratio<=100)}
  else assert.ok(income.some((v,j)=>v<minimum[j])||income[0]+income[1]-minimum[0]-minimum[1]<total);
  count++;
}
assert.equal(calculate([60000,45000],[20000,20000],35000,null).expenses[0],20000);
assert.equal(calculate([60000,45000],[20000,20000],35000,0).expenses[0],10000);
assert.equal(calculate([0,0],[0,0],0,null).feasible,true);
assert.equal(calculate([0,0],[0,0],1,null).feasible,false);
assert.equal(calculate([10,20],[10,20],0,null).feasible,true);
assert.equal(calculate([10,20],[11,0],0,null).feasible,false);
assert.deepEqual(calculate([100,100],[80,80],40,null).remaining,[80,80]);
assert.equal(calculate([100,100],[80,80],41,null).feasible,false);
// A is held at the living-cost floor even after a raise under income allocation.
const incomes=[25000,75000], mins=[20000,20000], total=50000;
const base=calculate(incomes,mins,total,null);
assert.deepEqual(base.remaining,[20000,30000]);
assert.deepEqual(simulate(incomes,mins,total,base,[5000,0],'income').remaining,[20000,35000]);
assert.deepEqual(simulate(incomes,mins,total,base,[5000,0],'retain',[40,40]).remaining,[22000,33000]);
assert.deepEqual(simulate(incomes,mins,total,base,[5000,0],'retain',[100,40]).remaining,[25000,30000]);
assert.deepEqual(simulate(incomes,mins,total,base,[5000,0],'retain',[0,40]).remaining,[20000,35000]);
assert.deepEqual(simulate(incomes,mins,total,base,[5000,0],'fixed').expenses,base.expenses);
assert.deepEqual(simulate([100,100],[0,0],0,calculate([100,100],[0,0],0,null),[1,0],'retain',[40,40]).remaining,[101,100]);
const invalid=calculate([10,20],[20,20],10,null);
assert.equal(simulate([10,20],[20,20],10,invalid,[100,100],'retain').reason,'no_baseline');
assert.equal(simulate([10,20],[20,20],10,invalid,[100,100],'retain').feasible,false);
for(let i=0;i<10000;i++) {
  const income=[Math.floor(Math.random()*100000),Math.floor(Math.random()*100000)];
  const minimum=income.map(v=>Math.floor(Math.random()*v));
  const expense=Math.floor(Math.random()*(income[0]+income[1]-minimum[0]-minimum[1]+1));
  const before=calculate(income,minimum,expense,Math.random()*100);
  const raises=income.map(()=>Math.floor(Math.random()*10000));
  const retention=income.map(()=>Math.floor(Math.random()*101));
  const after=simulate(income,minimum,expense,before,raises,'retain',retention);
  assert.ok(after.feasible);
  assert.equal(after.expenses[0]+after.expenses[1],expense);
  after.remaining.forEach((v,j)=>{assert.ok(v>=minimum[j]);assert.ok(v>=before.remaining[j]+Math.ceil(raises[j]*retention[j]/100));});
  assert.deepEqual(simulate(income,minimum,expense,before,raises,'retain',[100,100]).expenses,before.expenses);
}
console.log(`${count + 10000} randomized invariant cases and retention/edge regressions passed.`);

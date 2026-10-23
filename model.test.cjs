const assert = require('node:assert/strict');
const {calculate} = require('./dist/model.js');
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
console.log(`${count} randomized invariant cases and 8 edge cases passed.`);

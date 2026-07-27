const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync(
  require.resolve('../script.js'),
  'utf8'
);
const constantsSource=source.slice(
  0,
  source.indexOf('const RUNNERS=')
);
const context={};

vm.createContext(context);
vm.runInContext(
  `${constantsSource}
  globalThis.levels=LEVELS;
  globalThis.promotion=PROMOTION;`,
  context
);

assert.equal(context.levels.length,10);
assert.equal(Object.keys(context.promotion).length,9);
assert.equal(context.levels[9].name,'殿堂入り');
assert.equal(context.levels[9].xp,1250);

for(let level=1;level<=9;level+=1){
  assert.ok(context.promotion[level]);
  assert.equal(context.levels[level].active,true);
}

const stats={};
for(let level=1;level<=9;level+=1){
  const rule=context.promotion[level];
  stats[level]={
    attempts:rule.attempts,
    points:rule.attempts*3
  };
}

function calculateLevel(xp){
  let level=1;

  for(let current=1;current<context.levels.length;current+=1){
    const next=context.levels[current];
    const rule=context.promotion[current];
    const stat=stats[current];
    const rate=stat.points/(stat.attempts*3);

    if(
      xp>=next.xp &&
      stat.attempts>=rule.attempts &&
      rate>=rule.rate
    ){
      level=current+1;
    }else{
      break;
    }
  }

  return level;
}

assert.equal(calculateLevel(19),1);
assert.equal(calculateLevel(20),2);
assert.equal(calculateLevel(220),5);
assert.equal(calculateLevel(1250),10);

console.log('Level progression tests passed');

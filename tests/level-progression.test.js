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
assert.equal(context.promotion[9].attempts,115);
assert.equal(context.promotion[9].rate,1);

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

const masteryStart=source.indexOf('function mastery(level)');
const masteryEnd=source.indexOf('function calculateLevel()');
const masteryContext={
  PROMOTION:{9:{attempts:115}},
  state:{
    stats:{
      9:{
        attempts:115,
        points:345,
        perfectStreak:115
      }
    }
  }
};

vm.createContext(masteryContext);
vm.runInContext(
  source.slice(masteryStart,masteryEnd),
  masteryContext
);

assert.deepEqual(
  JSON.parse(JSON.stringify(masteryContext.mastery(9))),
  {attempts:115,rate:1}
);

masteryContext.state.stats[9].perfectStreak=0;
assert.deepEqual(
  JSON.parse(JSON.stringify(masteryContext.mastery(9))),
  {attempts:0,rate:0}
);

console.log('Level progression tests passed');

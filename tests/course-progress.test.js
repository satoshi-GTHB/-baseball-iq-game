const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync(
  require.resolve('../script.js'),
  'utf8'
);
const start=source.indexOf('function createEmptyCourseData()');
const end=source.indexOf('function loadProfileStore()');
const constantsSource=source.slice(
  0,
  source.indexOf('const RUNNERS=')
);
const progressSource=source.slice(start,end);

const context={};
vm.createContext(context);
vm.runInContext(
  `${constantsSource}
  ${progressSource}`,
  context
);

const legacy={
  xp:42,
  stats:{1:{attempts:3,points:8}},
  history:{
    version:1,
    answers:[{questionId:'defense-001'}]
  },
  caseFrequency:{caseA:2},
  fielderFrequency:{FIRST:1},
  results:[{score:8}]
};
const migrated=context.normalizeProfileData(legacy);

assert.equal(migrated.courses.defense.xp,42);
assert.equal(migrated.courses.defense.highestLevel,2);
assert.equal(migrated.courses.defense.history.answers.length,1);
assert.equal(migrated.courses.runner.xp,0);
assert.equal(migrated.courses.runner.highestLevel,1);
assert.equal(migrated.courses.runner.history.answers.length,0);

migrated.courses.runner.xp=15;
migrated.courses.runner.userLevel=3;
migrated.courses.runner.history.answers.push({
  questionId:'runner-001'
});

assert.equal(migrated.courses.defense.xp,42);
assert.equal(migrated.courses.defense.history.answers.length,1);
assert.notStrictEqual(
  migrated.courses.defense,
  migrated.courses.runner
);

const normalized=context.normalizeProfileData(migrated);

assert.equal(normalized.courses.defense.xp,42);
assert.equal(normalized.courses.runner.xp,15);
assert.equal(normalized.courses.runner.userLevel,3);
assert.equal(
  normalized.courses.runner.history.answers[0].questionId,
  'runner-001'
);

console.log('Course progress migration tests passed');

'use strict';

const assert = require('node:assert/strict');
const rules = require('../sprint45-rules.js');

const {
  BASES,
  CASES,
  DEFENSES,
  FIELDERS,
  SITUATIONS
} = rules;

function gameCase(overrides) {
  return {
    id: 'TEST',
    outs: 0,
    situation: SITUATIONS.NONE,
    defense: DEFENSES.NORMAL,
    fielder: FIELDERS.SECOND,
    ...overrides
  };
}

function action(base, touch = false) {
  return { base, touch };
}

assert.equal(CASES.length, 32);
assert.deepEqual(CASES.slice(0, 4).map((item) => item.id), [
  'C01', 'C02', 'C03', 'C04'
]);
assert.equal(CASES.at(-1).id, 'C32');
assert.equal(
  CASES.filter((item) => item.outs === 2).every(
    (item) => item.defense === DEFENSES.NORMAL
  ),
  true
);

const session = rules.createBalancedSession(() => 0.25);
assert.equal(session.length, 32);
assert.equal(new Set(session.map((item) => item.id)).size, 32);
Object.values(FIELDERS).forEach((fielder) => {
  assert.equal(session.filter((item) => item.fielder === fielder).length, 8);
});

const defenseSession = rules.createDefenseSession(() => 0.25);
assert.equal(defenseSession.length, 32);
assert.equal(defenseSession[0].answers.length, 0);
assert.equal(defenseSession.every((item) => item.caseId), true);

let result = rules.evaluateActions(
  gameCase({ situation: SITUATIONS.FIRST }),
  [action(BASES.SECOND), action(BASES.FIRST)]
);
assert.equal(result.outsAdded, 2);
assert.equal(result.tags.includes('DOUBLE_PLAY'), true);

const oneOutFirstThird = {
  caseId: 'TEST_ONE_OUT_FIRST_THIRD',
  outs: 1,
  situation: rules.SITUATIONS.FIRST_THIRD,
  defense: rules.DEFENSES.INFIELD_IN,
  fielder: rules.FIELDERS.THIRD
};

result = rules.evaluateActions(oneOutFirstThird, [
  { base: rules.BASES.HOME, touch: true },
  { base: rules.BASES.FIRST, touch: false }
]);
assert.equal(result.plays[0].result, 'OUT');
assert.equal(result.plays[1].result, 'SAFE');
assert.equal(result.plays[1].reason, 'LATE_EXTRA_THROW');
assert.equal(result.runsScored, 0);

result = rules.evaluateActions(oneOutFirstThird, [
  { base: rules.BASES.SECOND, touch: false },
  { base: rules.BASES.FIRST, touch: false }
]);
assert.equal(result.outsAdded, 2);
assert.equal(result.inningOver, true);
assert.equal(result.runsScored, 0);

const oneOutSecondThird = {
  caseId: 'TEST_ONE_OUT_SECOND_THIRD',
  outs: 1,
  situation: rules.SITUATIONS.SECOND_THIRD,
  defense: rules.DEFENSES.INFIELD_IN,
  fielder: rules.FIELDERS.THIRD
};

result = rules.evaluateActions(oneOutSecondThird, [
  { base: rules.BASES.HOME, touch: true },
  { base: rules.BASES.FIRST, touch: false }
]);
assert.equal(result.plays[0].result, 'OUT');
assert.equal(result.plays[1].result, 'SAFE');
assert.equal(result.outsAdded, 1);
assert.equal(result.inningOver, false);
assert.equal(result.runsScored, 0);

result = rules.evaluateActions(oneOutSecondThird, [
  { base: rules.BASES.SECOND, touch: false },
  { base: rules.BASES.FIRST, touch: false }
]);
assert.equal(result.plays[0].result, 'SAFE');
assert.equal(result.plays[0].reason, 'STATIONARY_RUNNER_THROW');
assert.equal(result.plays[1].result, 'SAFE');

result = rules.evaluateActions(oneOutSecondThird, [
  { base: rules.BASES.SECOND, touch: true }
]);
assert.equal(result.plays[0].result, 'SAFE');
assert.equal(result.plays[0].reason, 'STATIONARY_RUNNER_THROW');

result = rules.evaluateActions(
  gameCase({
    situation: SITUATIONS.FIRST,
    fielder: FIELDERS.SHORT
  }),
  [action(BASES.FIRST), action(BASES.SECOND, true)]
);
assert.equal(result.outsAdded, 1);
assert.equal(result.plays[1].result, 'SAFE');
assert.equal(result.plays[1].reason, 'LATE_EXTRA_THROW');

result = rules.evaluateActions(
  gameCase({
    situation: SITUATIONS.SECOND,
    fielder: FIELDERS.THIRD
  }),
  [action(BASES.THIRD, true), action(BASES.FIRST)]
);
assert.equal(result.outsAdded, 2);

result = rules.evaluateActions(
  gameCase({
    situation: SITUATIONS.SECOND,
    fielder: FIELDERS.SHORT
  }),
  [action(BASES.THIRD, true), action(BASES.FIRST)]
);
assert.equal(result.outsAdded, 1);
assert.equal(result.plays[1].result, 'SAFE');

result = rules.evaluateActions(
  gameCase({
    situation: SITUATIONS.THIRD,
    defense: DEFENSES.NORMAL
  }),
  [action(BASES.HOME, true)]
);
assert.equal(result.outsAdded, 0);
assert.equal(result.plays[0].reason, 'HOME_TOO_LATE');

result = rules.evaluateActions(
  gameCase({
    situation: SITUATIONS.THIRD,
    defense: DEFENSES.INFIELD_IN
  }),
  [action(BASES.HOME, false)]
);
assert.equal(result.outsAdded, 0);
assert.equal(result.runsScored, 1);
assert.equal(result.plays[0].result, 'SAFE');
assert.equal(result.plays[0].reason, 'MISSED_TOUCH');
assert.equal(result.plays[0].isForce, false);

result = rules.evaluateActions(
  gameCase({
    situation: SITUATIONS.LOADED,
    defense: DEFENSES.INFIELD_IN
  }),
  [action(BASES.HOME, false)]
);
assert.equal(result.plays[0].result, 'OUT');
assert.equal(result.plays[0].reason, 'FORCE_OUT');
assert.equal(result.plays[0].isForce, true);

result = rules.evaluateActions(
  gameCase({
    situation: SITUATIONS.THIRD,
    defense: DEFENSES.INFIELD_IN
  }),
  [action(BASES.HOME, true), action(BASES.FIRST)]
);
assert.equal(result.outsAdded, 1);
assert.equal(result.plays[1].result, 'SAFE');

result = rules.evaluateActions(
  gameCase({
    outs: 2,
    situation: SITUATIONS.LOADED,
    defense: DEFENSES.NORMAL,
    fielder: FIELDERS.THIRD
  }),
  [action(BASES.HOME), action(BASES.FIRST)]
);
assert.equal(result.outsAdded, 0);
assert.deepEqual(result.plays.map((play) => play.result), ['SAFE', 'SAFE']);
assert.equal(result.plays[0].reason, 'HOME_TOO_LATE');

result = rules.evaluateActions(
  gameCase({
    outs: 1,
    situation: SITUATIONS.SECOND_THIRD,
    defense: DEFENSES.INFIELD_IN
  }),
  [action(BASES.THIRD, true)]
);
assert.equal(result.outsAdded, 0);
assert.equal(result.plays[0].reason, 'EMPTY_BASE_THROW');

assert.equal(rules.scoreGrade('◎'), 3);
assert.equal(rules.scoreGrade('○'), 2);
assert.equal(rules.scoreGrade('△'), 1);
assert.equal(rules.scoreGrade('×'), 0);
assert.equal(rules.enforceOutFloor('×', 1), '△');
assert.equal(rules.enforceOutFloor('×', 2), '△');
assert.equal(rules.enforceOutFloor('×', 0), '×');
assert.equal(rules.enforceOutFloor('○', 1), '○');

console.log('Sprint4.5 rules tests passed');

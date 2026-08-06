'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rules = require('../runner-game/runner-movement-rules.js');

assert.equal(rules.runnerContactPlan(2, 'fly', 2), 'GO');
assert.equal(rules.runnerContactPlan(2, 'popup', 1), 'GO');
assert.equal(
  rules.shouldAutonomousRunnerTakeSecondaryLead('ground', false, false),
  true
);
assert.equal(
  rules.shouldAutonomousRunnerTakeSecondaryLead('fly', false, false),
  true
);
assert.equal(
  rules.shouldAutonomousRunnerTakeSecondaryLead('ground', true, false),
  false
);
assert.equal(
  rules.shouldAutonomousRunnerTakeSecondaryLead('ground', false, true),
  false
);
assert.equal(
  rules.shouldAutonomousRunnerTakeSecondaryLead('passed', false, false),
  false
);

const academySource = fs.readFileSync(
  path.join(__dirname, '../runner-game/academy-runner-game.js'),
  'utf8'
);
assert.match(
  academySource,
  /makeProblem\('BG-07'[\s\S]*?expected: \[point\('ROUND', 3\)\]/
);
assert.match(
  academySource,
  /makeProblem\('MI-09'[\s\S]*?expected: \[point\('ROUND', 3\), point\('BACK', 3\)\]/
);
const movementSource = fs.readFileSync(
  path.join(__dirname, '../runner-game/runner-movement-prototype.js'),
  'utf8'
);
assert.match(
  movementSource,
  /function startFirstBaseOverrun\(\)[\s\S]*?state\.roundFirst = true;[\s\S]*?runForward\(false\);/
);
assert.match(
  academySource,
  /makeProblem\('MI-01'[\s\S]*?secondaryLeadForbidden: true[\s\S]*?expected: \[point\('GO', 3, 'strategy'\)\]/
);
assert.match(
  academySource,
  /2アウトなので、フライを取るのを待たずに次の塁へ走れた/
);
const runnerPrototypeSource = fs.readFileSync(
  path.join(__dirname, '../runner-game/runner-game-prototype.js'),
  'utf8'
);
assert.match(
  runnerPrototypeSource,
  /AUTONOMOUS_SECONDARY_LEAD_PROGRESS = \.3/
);

assert.match(
  academySource,
  /makeProblem\('EX-01'[\s\S]*?point\('HALFWAY', 2\)[\s\S]*?point\('GO', 3, 'strategy'\)/
);
assert.match(
  academySource,
  /selfGroundForceOut = Boolean\([\s\S]*?selfOut &&[\s\S]*?selfForceOutResult &&[\s\S]*?groundForceScene/
);
assert.match(
  academySource,
  /otherRunnerFairBallForceOut = Boolean\([\s\S]*?!selfOut &&[\s\S]*?forceOutResult/
);
assert.match(
  academySource,
  /selfGroundForceOut \|\| otherRunnerFairBallForceOut/
);
assert.match(
  academySource,
  /selfGroundForceOut[\s\S]*?内野ゴロで次の塁へ進み、フォースアウトになった/
);
assert.match(
  academySource,
  /failedOutfieldGroundStart\(problem\)[\s\S]*?problem\.level === 'beginner'[\s\S]*?problem\.scene !== 'single'/
);
assert.match(
  academySource,
  /failedOutfieldGroundStart\(problem\)[\s\S]*?方向へ抜けるゴロで、\$\{destination\}へのスタートが遅かった/
);
assert.match(
  academySource,
  /selfWasOutOnSacrifice[\s\S]*?expected: \[\.\.\.lead, point\('GO', 3\)\]/
);
assert.match(
  academySource,
  /\$\{destination\}に着く前にアウトになった/
);
assert.match(
  academySource,
  /lastSelfDefenseResult\?\.out === true[\s\S]*?runnerLabelForId\(problem, 'self'\)/
);
assert.doesNotMatch(
  academySource,
  /usedForbiddenSecondaryLead[\s\S]{0,250}2アウト・3ボール2ストライクで、投球前に2次リード/
);
assert.match(
  academySource,
  /おとりの1塁走者が走り始めたらホームへゴーするところ、2次リードを選んだ/
);
assert.match(
  academySource,
  /スクイズなのに、投球と同時にゴーせず、2次リードを選んだ/
);
assert.match(
  academySource,
  /expectedPointFor\('GO', 3\)[\s\S]*?expectedPointFor\('BACK', 3\)/
);
assert.match(
  academySource,
  /problem\.resultGoal === 'keep-self-safe'[\s\S]*?problem\.autonomousDecoySteal[\s\S]*?firstRunnerStoleSecond[\s\S]*?selfSafe && firstRunnerStoleSecond/
);
assert.match(
  runnerPrototypeSource,
  /runner-decoy-throw-to-second[\s\S]*?autonomousDecoySteal !== 'true' &&[\s\S]*?decoySteal !== 'true'/
);
console.log('Runner game regression tests passed');

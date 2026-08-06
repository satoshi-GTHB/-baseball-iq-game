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
  /!selfOut &&\s*forceOutResult/
);
assert.match(
  academySource,
  /selfWasOutOnSacrifice[\s\S]*?expected: \[\.\.\.lead, point\('GO', 3\)\]/
);
assert.match(
  academySource,
  /\$\{destination\}に着く前にアウトになった/
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
console.log('Runner game regression tests passed');
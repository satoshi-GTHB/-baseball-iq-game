(function attachRunnerMovementRules(root, factory) {
  const rules = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = rules;
  }
  if (root) {
    root.RUNNER_MOVEMENT_RULES = rules;
  }
})(typeof window !== 'undefined' ? window : globalThis, function createRules() {
  'use strict';

  const BASE_POINTS = Object.freeze({
    HOME: Object.freeze([50, 89]),
    FIRST: Object.freeze([75, 60]),
    SECOND: Object.freeze([50, 31]),
    THIRD: Object.freeze([25, 60])
  });
  const BATTER_BOX_POINT = Object.freeze([42, 87]);

  const BASE_SEQUENCE = Object.freeze([
    'HOME',
    'FIRST',
    'SECOND',
    'THIRD',
    'HOME'
  ]);

  const SEGMENTS = Object.freeze([
    Object.freeze({
      from: 'HOME',
      to: 'FIRST',
      start: BASE_POINTS.HOME,
      end: BASE_POINTS.FIRST,
      duration: 3636
    }),
    Object.freeze({
      from: 'FIRST',
      to: 'SECOND',
      start: BASE_POINTS.FIRST,
      end: BASE_POINTS.SECOND,
      duration: 3636
    }),
    Object.freeze({
      from: 'SECOND',
      to: 'THIRD',
      start: BASE_POINTS.SECOND,
      end: BASE_POINTS.THIRD,
      duration: 3636
    }),
    Object.freeze({
      from: 'THIRD',
      to: 'HOME',
      start: BASE_POINTS.THIRD,
      end: BASE_POINTS.HOME,
      duration: 3636
    })
  ]);

  const RUNDOWN_FORMATIONS = Object.freeze({
    1: Object.freeze({
      trailBaseIndex: 1,
      leadBaseIndex: 2,
      trail: Object.freeze(['first', 'pitcher']),
      lead: Object.freeze(['short', 'second'])
    }),
    2: Object.freeze({
      trailBaseIndex: 2,
      leadBaseIndex: 3,
      trail: Object.freeze(['short', 'second']),
      lead: Object.freeze(['third', 'pitcher'])
    }),
    3: Object.freeze({
      trailBaseIndex: 3,
      leadBaseIndex: 4,
      trail: Object.freeze(['third', 'short']),
      lead: Object.freeze(['catcher', 'pitcher'])
    })
  });

  const STARTS = Object.freeze({
    BATTER: Object.freeze({
      label: 'バッターランナー',
      baseIndex: 0,
      otherBases: Object.freeze(['SECOND', 'THIRD'])
    }),
    FIRST: Object.freeze({
      label: '1塁ランナー',
      baseIndex: 1,
      otherBases: Object.freeze(['HOME', 'THIRD'])
    }),
    SECOND: Object.freeze({
      label: '2塁ランナー',
      baseIndex: 2,
      otherBases: Object.freeze(['HOME', 'FIRST'])
    }),
    THIRD: Object.freeze({
      label: '3塁ランナー',
      baseIndex: 3,
      otherBases: Object.freeze(['HOME', 'FIRST', 'SECOND'])
    })
  });

  const KAKENUK_END = Object.freeze([82, 52]);
  const ROUND_FIRST_POINT = Object.freeze([73, 56]);
  const ROUND_FIRST_EXIT = Object.freeze([69, 51]);

  function clampProgress(value) {
    return Math.min(1, Math.max(0, Number(value) || 0));
  }

  function pointAt(segmentIndex, progress) {
    const segment = SEGMENTS[segmentIndex];
    if (!segment) throw new Error(`Unknown segment: ${segmentIndex}`);
    const ratio = clampProgress(progress);

    return [
      segment.start[0] + (segment.end[0] - segment.start[0]) * ratio,
      segment.start[1] + (segment.end[1] - segment.start[1]) * ratio
    ];
  }

  function durationBetween(segmentIndex, fromProgress, toProgress) {
    const segment = SEGMENTS[segmentIndex];
    if (!segment) throw new Error(`Unknown segment: ${segmentIndex}`);
    return segment.duration * Math.abs(
      clampProgress(toProgress) - clampProgress(fromProgress)
    );
  }

  function durationToHome(baseIndex) {
    return SEGMENTS
      .slice(Math.max(0, baseIndex))
      .reduce((total, segment) => total + segment.duration, 0);
  }

  function isRunnerOut(ballArrivalMs, runnerArrivalMs) {
    return Number(ballArrivalMs) < Number(runnerArrivalMs);
  }

  function isTagOut(
    ballArrivalMs,
    runnerArrivalMs,
    tagApplicationMs = 200
  ) {
    return (
      Number(ballArrivalMs) + Number(tagApplicationMs) <
      Number(runnerArrivalMs)
    );
  }

  function resolveBasePlay({
    forceOut,
    ballArrivalMs,
    runnerArrivalMs,
    tagApplicationMs = 200
  } = {}) {
    return forceOut
      ? isRunnerOut(ballArrivalMs, runnerArrivalMs)
      : isTagOut(
          ballArrivalMs,
          runnerArrivalMs,
          tagApplicationMs
        );
  }

  function isRundownBaseOut(
    runnerBaseIndex,
    ballBaseIndex,
    ballLeadMs,
    tagApplicationMs = 200
  ) {
    return (
      Number(runnerBaseIndex) === Number(ballBaseIndex) &&
      Number(ballLeadMs) > Number(tagApplicationMs)
    );
  }

  function shouldAttemptClosePlay(
    ownArrivalMs,
    opposingArrivalMs,
    toleranceMs = 1000
  ) {
    const ownArrival = Number(ownArrivalMs);
    const opposingArrival = Number(opposingArrivalMs);
    if (!Number.isFinite(ownArrival)) return false;
    if (!Number.isFinite(opposingArrival)) return true;
    return (
      ownArrival <=
      opposingArrival + Number(toleranceMs)
    );
  }

  function runnerContactPlan(
    outs,
    scene,
    baseIndex
  ) {
    const battedBall =
      !['passed', 'swing', 'take'].includes(String(scene));
    if (battedBall && Number(outs) >= 2) {
      return 'GO';
    }
    if (
      battedBall &&
      Number(outs) < 2 &&
      scene === 'fly' &&
      Number(baseIndex) === 3
    ) {
      return 'TAG_UP';
    }
    return 'DEFAULT';
  }

  function shouldTriggerPickoff(
    millisecondsUntilPitch,
    action,
    baseIndex,
    windowMs = 500
  ) {
    const remaining = Number(millisecondsUntilPitch);
    return (
      Number.isFinite(remaining) &&
      remaining >= 0 &&
      remaining <= Number(windowMs) &&
      ['GO', 'HALFWAY'].includes(String(action)) &&
      [1, 2, 3].includes(Number(baseIndex))
    );
  }

  function isStealStartOnTime(
    actionAtMs,
    pitchStartAtMs,
    catcherArrivalAtMs,
    earlyWindowMs = 500
  ) {
    const actionAt = Number(actionAtMs);
    const windowStart =
      Number(pitchStartAtMs) - Number(earlyWindowMs);
    const windowEnd = Number(catcherArrivalAtMs);
    return (
      Number.isFinite(actionAt) &&
      Number.isFinite(windowStart) &&
      Number.isFinite(windowEnd) &&
      actionAt >= windowStart &&
      actionAt < windowEnd
    );
  }

  function forcedBaseIndex(startBaseIndex, occupiedBaseIndexes) {
    const start = Number(startBaseIndex);
    if (!Number.isInteger(start) || start < 0 || start > 3) {
      return null;
    }
    const occupied = new Set(
      (occupiedBaseIndexes || []).map(Number)
    );
    for (let index = 0; index <= start; index += 1) {
      if (!occupied.has(index)) return null;
    }
    return start + 1;
  }

  function autonomousRunnerMayAdvance(
    startBaseIndex,
    occupiedBaseIndexes
  ) {
    const start = Number(startBaseIndex);
    const occupied = (occupiedBaseIndexes || []).map(Number);
    if (forcedBaseIndex(start, occupied)) return true;
    return !occupied.some((baseIndex) => baseIndex > start);
  }

  function shouldIgnoreNormalInfieldLeadTarget({
    scene,
    direction,
    alignment,
    startBaseIndex,
    targetBaseIndex,
    forced
  } = {}) {
    if (
      scene !== 'ground' ||
      alignment !== 'normal'
    ) return false;

    if (
      Number(startBaseIndex) === 3 &&
      Number(targetBaseIndex) === 4
    ) {
      return true;
    }

    if (forced) return false;

    return (
      Number(startBaseIndex) === 2 &&
      Number(targetBaseIndex) === 3 &&
      ['second', 'first', 'first-line'].includes(
        String(direction)
      )
    );
  }

  function defenseCandidateOrder(first, second) {
    const advanceDifference =
      Number(second.advance) - Number(first.advance);
    if (advanceDifference) return advanceDifference;
    return (
      Number(first.runnerArrivalMs) -
      Number(second.runnerArrivalMs)
    ) || 0;
  }

  function selectDefenseTarget(
    leadCandidates = [],
    forceCandidates = []
  ) {
    const leads = [...leadCandidates].sort(
      defenseCandidateOrder
    );
    const forces = [...forceCandidates].sort(
      (first, second) => {
        const priorityDifference =
          Number(first.defensePriority ?? 99) -
          Number(second.defensePriority ?? 99);
        if (priorityDifference) return priorityDifference;
        const baseDifference =
          Number(second.targetBaseIndex) -
          Number(first.targetBaseIndex);
        return baseDifference ||
          defenseCandidateOrder(first, second);
      }
    );
    const leadRunner = leads[0] || null;
    if (
      leadRunner &&
      shouldAttemptClosePlay(
        leadRunner.defenseArrivalMs,
        leadRunner.runnerArrivalMs
      )
    ) {
      return {
        ...leadRunner,
        defenseReason: isTagOut(
          leadRunner.defenseArrivalMs,
          leadRunner.runnerArrivalMs
        )
          ? 'lead-out'
          : 'lead-close-play'
      };
    }

    const forceOut = forces.find(
      (runner) =>
        shouldAttemptClosePlay(
          runner.defenseArrivalMs,
          runner.runnerArrivalMs
        )
    );
    if (forceOut) {
      return {
        ...forceOut,
        defenseReason: 'force-out'
      };
    }

    const fallback = forces[0] || leadRunner;
    return fallback
      ? {
          ...fallback,
          defenseReason: forces[0]
            ? 'force-hold'
            : 'lead-hold'
        }
      : null;
  }

  function rotateRundownLines(
    lines,
    originSide,
    destinationSide
  ) {
    const origin = [...(lines?.[originSide] || [])];
    const destination = [
      ...(lines?.[destinationSide] || [])
    ];
    const thrower = origin.shift() || null;
    if (thrower) destination.push(thrower);
    return {
      lines: {
        trail:
          originSide === 'trail'
            ? origin
            : destination,
        lead:
          originSide === 'lead'
            ? origin
            : destination
      },
      nextHolder: destination[0] || null,
      thrower
    };
  }

  function planRundownSupport(
    runners,
    rundownSegment,
    safeBaseIndex = null,
    targetRunnerOut = false
  ) {
    const segmentLimit = Number(rundownSegment);
    const occupiedBases = new Set();
    if (
      !targetRunnerOut &&
      Number.isInteger(Number(safeBaseIndex))
    ) {
      occupiedBases.add(Number(safeBaseIndex));
    }
    return [...(runners || [])]
      .sort(
        (first, second) =>
          Number(second.advance) - Number(first.advance)
      )
      .map((runner) => {
        const hasActiveSegment =
          runner.segmentIndex !== null &&
          runner.segmentIndex !== undefined &&
          Number.isInteger(Number(runner.segmentIndex));
        const segmentIndex = hasActiveSegment
          ? Number(runner.segmentIndex)
          : Math.floor(Number(runner.advance));
        if (
          !Number.isInteger(segmentIndex) ||
          segmentIndex < 0 ||
          segmentIndex >= segmentLimit
        ) return null;
        const leadBaseIndex = segmentIndex + 1;
        const mustReachFirst = segmentIndex === 0;
        const canAdvance =
          mustReachFirst ||
          (
            leadBaseIndex <= segmentLimit &&
            !occupiedBases.has(leadBaseIndex)
          );
        const targetBaseIndex = canAdvance
          ? leadBaseIndex
          : segmentIndex;
        occupiedBases.add(targetBaseIndex);
        return {
          runnerId: runner.id,
          segmentIndex,
          targetBaseIndex,
          targetProgress: canAdvance ? 1 : 0
        };
      })
      .filter(Boolean);
  }

  function rundownCollision(
    holderStart,
    holderEnd,
    runnerStart,
    runnerEnd
  ) {
    const startGap =
      Number(holderStart) - Number(runnerStart);
    const endGap =
      Number(holderEnd) - Number(runnerEnd);
    const crossed =
      Math.abs(startGap) <= .004 ||
      startGap * endGap <= 0;
    if (!crossed) return null;
    const ratio =
      Math.abs(startGap) /
      Math.max(
        .0001,
        Math.abs(startGap) + Math.abs(endGap)
      );
    return {
      ratio,
      progress:
        Number(holderStart) +
        (
          Number(holderEnd) - Number(holderStart)
        ) * ratio
    };
  }

  function findPassedRunner(
    runners,
    tolerance = .001
  ) {
    const ordered = [...(runners || [])].sort(
      (first, second) =>
        Number(first.startBaseIndex) -
        Number(second.startBaseIndex)
    );
    for (
      let rearIndex = 0;
      rearIndex < ordered.length;
      rearIndex += 1
    ) {
      const rearRunner = ordered[rearIndex];
      const passedFrontRunner = ordered
        .slice(rearIndex + 1)
        .find(
          (frontRunner) =>
            Number(rearRunner.startBaseIndex) <
              Number(frontRunner.startBaseIndex) &&
            Number(rearRunner.advance) >
              Number(frontRunner.advance) +
              Number(tolerance)
        );
      if (passedFrontRunner) {
        return {
          runnerId: rearRunner.id,
          passedRunnerId: passedFrontRunner.id
        };
      }
    }
    return null;
  }

  function batterRunnerMustRunThrough(scene, direction = null) {
    return (
      scene === 'ground' ||
      scene === 'error' ||
      (
        scene === 'bunt' &&
        String(direction).endsWith('-ground')
      )
    );
  }

  return Object.freeze({
    BASE_POINTS,
    BATTER_BOX_POINT,
    BASE_SEQUENCE,
    KAKENUK_END,
    ROUND_FIRST_EXIT,
    ROUND_FIRST_POINT,
    RUNDOWN_FORMATIONS,
    SEGMENTS,
    STARTS,
    autonomousRunnerMayAdvance,
    batterRunnerMustRunThrough,
    clampProgress,
    durationBetween,
    durationToHome,
    findPassedRunner,
    forcedBaseIndex,
    isRundownBaseOut,
    isRunnerOut,
    isStealStartOnTime,
    isTagOut,
    planRundownSupport,
    pointAt,
    runnerContactPlan,
    rotateRundownLines,
    resolveBasePlay,
    rundownCollision,
    selectDefenseTarget,
    shouldIgnoreNormalInfieldLeadTarget,
    shouldTriggerPickoff,
    shouldAttemptClosePlay
  });
});

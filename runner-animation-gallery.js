const galleryField = document.querySelector('#gallery-field');
const galleryReplay = document.querySelector('#gallery-replay');
const galleryStatus = document.querySelector('#gallery-status');
const sceneButtons = [...document.querySelectorAll('[data-scene]')];
const directionPicker = document.querySelector('#direction-picker');
const directionHeading = document.querySelector('#direction-heading');
const directionButtons = [...document.querySelectorAll('[data-direction]')];
const selectedPlayerStatus = document.querySelector('#selected-player-status');

const fielders = Object.freeze({
  catcher: galleryField.querySelector('.catcher'),
  pitcher: galleryField.querySelector('.pitcher'),
  first: galleryField.querySelector('.first'),
  second: galleryField.querySelector('.second'),
  short: galleryField.querySelector('.short'),
  third: galleryField.querySelector('.third'),
  left: galleryField.querySelector('.left'),
  center: galleryField.querySelector('.center'),
  right: galleryField.querySelector('.right')
});

const ball = galleryField.querySelector('.gallery-ball');
const shadow = galleryField.querySelector('.gallery-shadow');
const catchFlash = galleryField.querySelector('.catch-flash');
const missFlash = galleryField.querySelector('.miss-flash');

const SCENES = Object.freeze({
  fly: { label: '外野フライ', duration: 3650, directions: 'outfield' },
  popup: { label: '内野フライ', duration: 2600, directions: 'infield' },
  liner: { label: 'ライナー', duration: 1900, directions: 'infield' },
  extra: { label: '長打', duration: 3150, directions: 'outfield' },
  single: { label: '外野前ヒット', duration: 3100, directions: 'gaps' },
  passed: { label: 'パスボール', duration: 2100, directions: null },
  ground: { label: '内野ゴロ', duration: 2700, directions: 'infield' },
  error: { label: 'エラー', duration: 2400, directions: 'infield' }
});

const DIRECTION_SETS = Object.freeze({
  outfield: [
    ['left-line', 'レフト線'],
    ['right-center', '右中間'],
    ['left-center', '左中間'],
    ['right-line', 'ライト線'],
    ['left', 'レフト'],
    ['center', 'センター'],
    ['right', 'ライト']
  ],
  infield: [
    ['third-line', '3塁線'],
    ['short', 'ショート'],
    ['second', 'セカンド'],
    ['first-line', '1塁線'],
    ['third', 'サード'],
    ['pitcher', 'ピッチャー'],
    ['first', 'ファースト']
  ],
  gaps: [
    ['third-short', 'レフト前'],
    ['middle', 'センター前'],
    ['first-second', 'ライト前']
  ]
});

const OUTFIELD_PLAYS = Object.freeze({
  'left-line': {
    target: [8, 29], primary: 'left', backup: 'center', far: 'right',
    backupPoint: [11, 20], farPoint: [66, 18], cut: 'short', base: 'second',
    cutPoint: [28, 29]
  },
  left: {
    target: [17, 24], primary: 'left', backup: 'center', far: 'right',
    backupPoint: [22, 15], farPoint: [66, 18], cut: 'short', base: 'second',
    cutPoint: [31, 27]
  },
  'left-center': {
    target: [34, 18], primary: 'center', backup: 'left', far: 'right',
    backupPoint: [27, 12], farPoint: [67, 16], cut: 'short', base: 'second',
    cutPoint: [38, 23]
  },
  center: {
    target: [50, 17], primary: 'center', backup: 'left', far: 'right',
    backupPoint: [40, 11], farPoint: [60, 11], cut: 'short', base: 'second',
    cutPoint: [47, 21]
  },
  'right-center': {
    target: [66, 18], primary: 'center', backup: 'right', far: 'left',
    backupPoint: [73, 12], farPoint: [33, 16], cut: 'second', base: 'short',
    cutPoint: [62, 23]
  },
  right: {
    target: [83, 24], primary: 'right', backup: 'center', far: 'left',
    backupPoint: [78, 15], farPoint: [34, 18], cut: 'second', base: 'short',
    cutPoint: [69, 27]
  },
  'right-line': {
    target: [92, 29], primary: 'right', backup: 'center', far: 'left',
    backupPoint: [89, 20], farPoint: [34, 18], cut: 'second', base: 'short',
    cutPoint: [72, 29]
  }
});

const INFIELD_PLAYS = Object.freeze({
  'third-line': {
    target: [20, 53], primary: 'third', cover: 'second',
    support: 'short', supportPoint: [31, 52]
  },
  third: {
    target: [30, 46], primary: 'third', cover: 'second',
    support: 'short', supportPoint: [38, 50]
  },
  short: { target: [40, 40], primary: 'short', cover: 'second' },
  pitcher: {
    target: [50, 57], primary: 'pitcher', cover: 'short',
    support: 'second', supportPoint: [58, 50]
  },
  second: { target: [60, 40], primary: 'second', cover: 'short' },
  first: {
    target: [70, 46], primary: 'first', cover: 'short',
    support: 'second', supportPoint: [62, 50]
  },
  'first-line': {
    target: [80, 53], primary: 'first', cover: 'short',
    support: 'second', supportPoint: [69, 52]
  }
});

const GROUND_OUTFIELD_PLAYS = Object.freeze({
  'third-line': {
    chaser: 'left', chasePoint: [15, 47],
    backup: 'center', backupPoint: [10, 38],
    shift: 'right', shiftPoint: [90, 50]
  },
  third: {
    chaser: 'left', chasePoint: [24, 33],
    backup: 'center', backupPoint: [18, 24],
    shift: 'right', shiftPoint: [90, 50]
  },
  short: {
    chaser: 'left', chasePoint: [38, 24],
    backup: 'center', backupPoint: [34, 16],
    shift: 'right', shiftPoint: [90, 50]
  },
  pitcher: {
    chaser: 'center', chasePoint: [50, 21],
    backup: 'left', backupPoint: [40, 17],
    shift: 'right', shiftPoint: [90, 50]
  },
  second: {
    chaser: 'right', chasePoint: [62, 24],
    backup: 'center', backupPoint: [66, 16],
    shift: 'left', shiftPoint: [34, 19]
  },
  first: {
    chaser: 'right', chasePoint: [76, 33],
    backup: 'center', backupPoint: [82, 24],
    shift: 'left', shiftPoint: [34, 19]
  },
  'first-line': {
    chaser: 'right', chasePoint: [85, 47],
    backup: 'center', backupPoint: [90, 38],
    shift: 'left', shiftPoint: [34, 19]
  }
});

const OUTFIELD_SINGLE_PLAYS = Object.freeze({
  'third-short': {
    through: [35, 45], target: [24, 27],
    primary: 'left', backup: 'center', far: 'right',
    backupPoint: [18, 17], farPoint: [66, 18],
    cut: 'short', base: 'second', cutPoint: [33, 30],
    infieldChasers: [
      ['third', [35, 51]],
      ['short', [34, 34]]
    ]
  },
  middle: {
    through: [50, 39], target: [50, 18],
    primary: 'center', backup: 'left', far: 'right',
    backupPoint: [40, 12], farPoint: [60, 12],
    cut: 'short', base: 'second', cutPoint: [43, 22],
    infieldChasers: [
      ['short', [47, 31]],
      ['second', [53, 31]]
    ]
  },
  'first-second': {
    through: [65, 45], target: [76, 27],
    primary: 'right', backup: 'center', far: 'left',
    backupPoint: [82, 17], farPoint: [34, 18],
    cut: 'second', base: 'short', cutPoint: [67, 30],
    infieldChasers: [
      ['second', [66, 34]],
      ['first', [65, 51]]
    ]
  }
});

let selectedScene = 'fly';
let selectedDirection = 'center';
let selectedPlayer = null;
let isPlaying = false;
let sceneTimer;
let activeAnimations = [];

function setFielderSelectionEnabled(enabled) {
  Object.values(fielders).forEach((fielder) => {
    fielder.disabled = !enabled;
  });
}

function selectPlayer(fielder) {
  if (isPlaying) return;

  Object.values(fielders).forEach((candidate) => {
    const selected = candidate === fielder;
    candidate.classList.toggle('is-selected-player', selected);
    candidate.setAttribute('aria-pressed', String(selected));
    candidate.textContent = selected ? '自' : candidate.dataset.playerNumber;
  });

  selectedPlayer = fielder;
  selectedPlayerStatus.textContent =
    `「${fielder.dataset.playerNumber}：${fielder.dataset.positionName}」選択中`;
}

function pct(value) {
  return `${value}%`;
}

function move(element, from, to, duration, delay = 0, easing = 'ease-out') {
  const animation = element.animate(
    [
      { left: pct(from[0]), top: pct(from[1]) },
      { left: pct(to[0]), top: pct(to[1]) }
    ],
    { duration, delay, easing, fill: 'forwards' }
  );
  activeAnimations.push(animation);
  return animation;
}

function animate(element, frames, options) {
  const animation = element.animate(frames, { ...options, fill: 'forwards' });
  activeAnimations.push(animation);
  return animation;
}

function resetAnimation() {
  clearTimeout(sceneTimer);
  activeAnimations.forEach((animation) => animation.cancel());
  activeAnimations = [];
  galleryField.classList.remove('scene-running');
  galleryReplay.disabled = false;
  isPlaying = false;
  setFielderSelectionEnabled(true);
}

function currentDirectionLabel() {
  if (!SCENES[selectedScene].directions) return '';
  const options = DIRECTION_SETS[SCENES[selectedScene].directions];
  return options.find(([value]) => value === selectedDirection)?.[1] || '';
}

function displayLabel() {
  const direction = currentDirectionLabel();
  return direction ? `${SCENES[selectedScene].label}（${direction}）` : SCENES[selectedScene].label;
}

function renderDirectionPicker() {
  const setName = SCENES[selectedScene].directions;
  directionPicker.hidden = !setName;
  directionHeading.hidden = !setName;
  if (!setName) return;

  const options = DIRECTION_SETS[setName];
  if (!options.some(([value]) => value === selectedDirection)) {
    selectedDirection =
      setName === 'outfield'
        ? 'center'
        : setName === 'infield'
          ? 'pitcher'
          : options[Math.floor(options.length / 2)][0];
  }
  directionPicker.classList.toggle('three-options', options.length === 3);

  directionButtons.forEach((button, index) => {
    const option = options[index];
    button.hidden = !option;
    if (!option) return;
    button.dataset.direction = option[0];
    button.textContent = option[1];
    button.setAttribute('aria-pressed', String(option[0] === selectedDirection));
  });
}

function updateLabels() {
  const label = displayLabel();
  galleryField.setAttribute(
    'aria-label',
    selectedScene === 'fly'
      ? `${currentDirectionLabel()}方向のフライ。捕球、外野カバー、カット、2塁カバー、返球の連係`
      : `${label}のアニメーション`
  );
  galleryReplay.textContent = `▶ ${label}を再生`;
  galleryStatus.textContent = `${label}を選択中です。`;
}

function selectScene(sceneName) {
  if (!SCENES[sceneName]) return;
  resetAnimation();
  galleryField.classList.remove(`scene-${selectedScene}`);
  selectedScene = sceneName;
  galleryField.classList.add(`scene-${selectedScene}`);

  sceneButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.scene === selectedScene));
  });
  renderDirectionPicker();
  updateLabels();
}

function selectDirection(directionName) {
  const setName = SCENES[selectedScene].directions;
  if (!setName || !DIRECTION_SETS[setName].some(([value]) => value === directionName)) return;

  resetAnimation();
  galleryField.classList.remove(`direction-${selectedDirection}`);
  selectedDirection = directionName;
  galleryField.classList.add(`direction-${selectedDirection}`);
  renderDirectionPicker();
  updateLabels();
}

function playCatchFlash(point, delay) {
  catchFlash.style.left = pct(point[0]);
  catchFlash.style.top = pct(point[1]);
  animate(
    catchFlash,
    [
      { opacity: 0, transform: 'translate(-50%, -50%) scale(.3)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1.2)', offset: .45 },
      { opacity: 0, transform: 'translate(-50%, -50%) scale(1.5)' }
    ],
    { duration: 500, delay, easing: 'ease-out' }
  );
}

function playBallFlight(target, duration, peakScale = 1.7) {
  animate(
    ball,
    [
      { left: '50%', top: '89%', opacity: 1, transform: 'scale(.72)' },
      { left: pct((50 + target[0]) / 2), top: pct((89 + target[1]) / 2), opacity: 1, transform: `scale(${peakScale})` },
      { left: pct(target[0]), top: pct(target[1]), opacity: 1, transform: 'scale(.78)' }
    ],
    { duration, easing: 'linear' }
  );
  animate(
    shadow,
    [
      { left: '50%', top: '89%', opacity: .4, transform: 'scale(.8)' },
      { left: pct((50 + target[0]) / 2), top: pct((89 + target[1]) / 2), opacity: .12, transform: 'scale(.3)' },
      { left: pct(target[0]), top: pct(target[1]), opacity: .42, transform: 'scale(.75)' }
    ],
    { duration, easing: 'linear' }
  );
}

function playOutfieldFly() {
  const play = OUTFIELD_PLAYS[selectedDirection];
  const catchTime = 2250;

  playBallFlight(play.target, catchTime);
  move(fielders[play.primary], positionOf(play.primary), play.target, 1350, 650);
  move(fielders[play.backup], positionOf(play.backup), play.backupPoint, 1450, 600);
  move(fielders[play.far], positionOf(play.far), play.farPoint, 1250, 650);

  move(fielders[play.cut], positionOf(play.cut), play.cutPoint, 1050, 1000);
  move(fielders[play.base], positionOf(play.base), [50, 30], 950, 1050);
  move(fielders.third, positionOf('third'), [25, 60], 850, 850);
  move(fielders.first, positionOf('first'), [75, 60], 850, 850);
  move(fielders.pitcher, positionOf('pitcher'), [50, 40], 900, 1200);

  playCatchFlash(play.target, catchTime - 120);

  animate(
    ball,
    [
      { left: pct(play.target[0]), top: pct(play.target[1]), opacity: 1, transform: 'scale(.78)' },
      { left: pct(play.cutPoint[0]), top: pct(play.cutPoint[1]), opacity: 1, transform: 'scale(.72)' }
    ],
    { duration: 650, delay: catchTime + 180, easing: 'linear' }
  );
}

function positionOf(name) {
  const positions = {
    catcher: [50, 90], pitcher: [50, 59], first: [72, 51],
    second: [61, 34], short: [39, 34], third: [28, 51],
    left: [17, 25], center: [50, 9], right: [83, 25]
  };
  return positions[name];
}

function playOutfieldLiner(isExtra = false) {
  const play = OUTFIELD_PLAYS[selectedDirection];
  const target = isExtra
    ? [play.target[0], Math.max(-1, play.target[1] - 14)]
    : play.target;
  const cutPoint = isExtra
    ? [
        target[0] + (50 - target[0]) * .62,
        target[1] + (30 - target[1]) * .62
      ]
    : play.cutPoint;
  const duration = isExtra ? 1450 : 1050;

  animate(
    ball,
    [
      { left: '50%', top: '89%', opacity: 1, transform: 'scale(.78)' },
      { left: pct(target[0]), top: pct(target[1]), opacity: 1, transform: 'scale(.76)' }
    ],
    { duration, easing: 'linear' }
  );

  const primaryTarget = isExtra
    ? target
    : play.target;
  move(fielders[play.primary], positionOf(play.primary), primaryTarget, duration + 250, 80, 'ease-in');
  move(fielders[play.backup], positionOf(play.backup), play.backupPoint, duration + 300, 120, 'ease-in');
  move(fielders[play.far], positionOf(play.far), play.farPoint, duration, 180);
  move(fielders[play.cut], positionOf(play.cut), cutPoint, 950, 550);
  move(fielders[play.base], positionOf(play.base), [50, 30], 850, 600);
  move(fielders.pitcher, positionOf('pitcher'), [50, 40], 800, 700);

  if (isExtra) {
    const pickupTime = duration + 330;
    playCatchFlash(target, pickupTime - 120);
    animate(
      ball,
      [
        {
          left: pct(target[0]), top: pct(target[1]),
          opacity: 1, transform: 'scale(.76)'
        },
        {
          left: pct(cutPoint[0]), top: pct(cutPoint[1]),
          opacity: 1, transform: 'scale(.72)', offset: .62
        },
        {
          left: '50%', top: '30%',
          opacity: 1, transform: 'scale(.72)'
        }
      ],
      { duration: 1050, delay: pickupTime + 100, easing: 'linear' }
    );
  } else {
    playCatchFlash(target, duration - 100);
  }
}

function playOutfieldSingle() {
  const play = OUTFIELD_SINGLE_PLAYS[selectedDirection];
  const fieldTime = 1250;

  animate(
    ball,
    [
      {
        left: '50%', top: '89%', opacity: 1,
        transform: 'translateY(0) scale(.86)'
      },
      {
        left: pct((50 + play.through[0]) / 2),
        top: pct((89 + play.through[1]) / 2),
        opacity: 1,
        transform: 'translateY(-6px) scale(.9)',
        offset: .18
      },
      {
        left: pct(play.through[0]), top: pct(play.through[1]),
        opacity: 1, transform: 'translateY(0) scale(.84)',
        offset: .36
      },
      {
        left: pct(play.target[0]), top: pct(play.target[1]),
        opacity: 1, transform: 'translateY(0) scale(.78)'
      }
    ],
    { duration: fieldTime, easing: 'linear' }
  );

  play.infieldChasers.forEach(([name, point]) => {
    move(fielders[name], positionOf(name), point, 800, 160);
  });
  const infieldChaserNames = play.infieldChasers.map(([name]) => name);
  move(fielders[play.primary], positionOf(play.primary), play.target, 1150, 500);
  move(fielders[play.backup], positionOf(play.backup), play.backupPoint, 1250, 450);
  move(fielders[play.far], positionOf(play.far), play.farPoint, 1050, 500);

  move(fielders[play.cut], play.infieldChasers.find(([name]) => name === play.cut)?.[1] || positionOf(play.cut), play.cutPoint, 800, 980);
  const baseChaser = play.infieldChasers.find(([name]) => name === play.base);
  move(
    fielders[play.base],
    baseChaser?.[1] || positionOf(play.base),
    [50, 30],
    850,
    baseChaser ? 980 : 650
  );
  if (!infieldChaserNames.includes('third')) {
    move(fielders.third, positionOf('third'), [25, 60], 750, 650);
  }
  if (!infieldChaserNames.includes('first')) {
    move(fielders.first, positionOf('first'), [75, 60], 750, 650);
  }
  move(fielders.pitcher, positionOf('pitcher'), [50, 40], 850, 850);

  playCatchFlash(play.target, fieldTime - 100);
  const cutReceiveDelay = fieldTime + 180;
  const cutReceiveDuration = 650;
  const cutReturnDelay = cutReceiveDelay + cutReceiveDuration;
  const cutHome = positionOf(play.cut);
  animate(
    ball,
    [
      {
        left: pct(play.target[0]), top: pct(play.target[1]),
        opacity: 1, transform: 'scale(.78)'
      },
      {
        left: pct(play.cutPoint[0]), top: pct(play.cutPoint[1]),
        opacity: 1, transform: 'scale(.72)'
      }
    ],
    { duration: cutReceiveDuration, delay: cutReceiveDelay, easing: 'linear' }
  );
  move(
    fielders[play.cut],
    play.cutPoint,
    cutHome,
    700,
    cutReturnDelay,
    'ease-in-out'
  );
  animate(
    ball,
    [
      {
        left: pct(play.cutPoint[0]), top: pct(play.cutPoint[1]),
        opacity: 1, transform: 'scale(.58)'
      },
      {
        left: pct(cutHome[0]), top: pct(cutHome[1]),
        opacity: 1, transform: 'scale(.58)'
      }
    ],
    { duration: 700, delay: cutReturnDelay, easing: 'ease-in-out' }
  );
}

function playGroundOutfieldCoverage(directionName) {
  const coverage = GROUND_OUTFIELD_PLAYS[directionName];

  // 外野手は、まず内野を抜ける可能性を考えて土と芝の境界まで追う。
  move(
    fielders[coverage.chaser],
    positionOf(coverage.chaser),
    coverage.chasePoint,
    950,
    180
  );

  move(
    fielders[coverage.backup],
    positionOf(coverage.backup),
    coverage.backupPoint,
    1000,
    220
  );
  move(
    fielders[coverage.shift],
    positionOf(coverage.shift),
    coverage.shiftPoint,
    1150,
    280
  );
}

function playPitcherGroundCoverage(play, needsHomeCover, needsFirstCover) {
  const homeCoverPoint = [50, 87];

  if (needsFirstCover) {
    // 一塁手が打球を処理するため、投手が一塁ベースの内野側へ入る。
    move(fielders.pitcher, positionOf('pitcher'), [68, 60], 950, 150);
    return;
  }

  if (play.primary === 'pitcher') {
    if (needsHomeCover) {
      move(fielders.pitcher, play.target, homeCoverPoint, 850, 1120);
    }
    return;
  }

  const chasePoint = [
    50 + ((play.target[0] - 50) * .35),
    59 + ((play.target[1] - 59) * .35)
  ];
  move(fielders.pitcher, positionOf('pitcher'), chasePoint, 650, 100);
  if (needsHomeCover) {
    // 捕手が一塁カバーへ出る場合だけ、打球を追った後にホームへ戻る。
    move(fielders.pitcher, chasePoint, homeCoverPoint, 900, 850);
  }
}

function playInfieldScene(kind) {
  const play = INFIELD_PLAYS[selectedDirection];
  const isPopup = kind === 'popup';
  const isLiner = kind === 'liner';
  const isError = kind === 'error';
  const flightDuration = isPopup ? 1900 : isLiner ? 720 : 1100;

  if (isPopup) {
    playBallFlight(play.target, flightDuration);
  } else if (isLiner) {
    animate(
      ball,
      [
        { left: '50%', top: '89%', opacity: 1, transform: 'scale(.82)' },
        { left: pct(play.target[0]), top: pct(play.target[1]), opacity: 1, transform: 'scale(.78)' }
      ],
      { duration: flightDuration, easing: 'linear' }
    );
  } else {
    animate(
      ball,
      [
        { left: '50%', top: '89%', opacity: 1, transform: 'translateY(0) scale(.85)' },
        { left: pct((50 + play.target[0]) / 2), top: pct((89 + play.target[1]) / 2), opacity: 1, transform: 'translateY(-6px) scale(.9)' },
        { left: pct(play.target[0]), top: pct(play.target[1]), opacity: 1, transform: 'translateY(0) scale(.82)' }
      ],
      { duration: flightDuration, easing: 'linear' }
    );
  }

  const isPitcherLiner = isLiner && play.primary === 'pitcher';
  const baseCover = isPitcherLiner ? 'second' : play.cover;

  move(fielders[play.primary], positionOf(play.primary), play.target, flightDuration - 200, 180);
  move(fielders[baseCover], positionOf(baseCover), [50, 30], 800, 500);
  if (isPitcherLiner) {
    // 投手の横を抜ける可能性を考え、センター前ヒットと同じ連係へ入る。
    move(fielders.short, positionOf('short'), [47, 25], 850, 420);
  } else if (play.support) {
    // 二遊間の一方が2塁へ入るとき、もう一方は打球側で捕球者をカバーする。
    const usesInfieldCoverage =
      kind === 'ground' ||
      kind === 'error' ||
      kind === 'popup' ||
      kind === 'liner';
    const supportPoint =
      usesInfieldCoverage && selectedDirection === 'third-line'
        ? [25, 43]
        : usesInfieldCoverage && selectedDirection === 'third'
          ? [32, 38]
          : play.supportPoint;
    move(
      fielders[play.support],
      positionOf(play.support),
      supportPoint,
      950,
      420
    );
  }
  if (play.primary !== 'first') {
    move(fielders.first, positionOf('first'), [75, 60], 750, 500);
  }
  if (play.primary !== 'third') {
    move(fielders.third, positionOf('third'), [25, 60], 750, 500);
  }
  if (
    kind === 'ground' ||
    kind === 'error' ||
    kind === 'popup' ||
    kind === 'liner'
  ) {
    const catcherCoversFirst =
      selectedDirection === 'second';
    const pitcherCoversFirst =
      kind !== 'liner' &&
      (
        selectedDirection === 'first' ||
        selectedDirection === 'first-line'
      );
    if (catcherCoversFirst) {
      // 二塁側だけ、捕手が一塁後方へ寄る。
      move(fielders.catcher, positionOf('catcher'), [69, 80], 900, 320);
    }
    playGroundOutfieldCoverage(selectedDirection);
    // ライナーでは一塁方向へ反応するが、投手はベースまで到達しない。
    playPitcherGroundCoverage(
      play,
      catcherCoversFirst,
      pitcherCoversFirst
    );
  }

  if (isError) {
    const looseBallPoint = [
      play.target[0] + (play.target[0] <= 50 ? -8 : 8),
      play.target[1] + 6
    ];
    missFlash.style.left = pct(play.target[0]);
    missFlash.style.top = pct(play.target[1]);
    animate(
      ball,
      [
        { left: pct(play.target[0]), top: pct(play.target[1]), opacity: 1 },
        { left: pct(looseBallPoint[0]), top: pct(looseBallPoint[1]), opacity: 1 }
      ],
      { duration: 650, delay: flightDuration, easing: 'ease-out' }
    );
    // 通常のゴロ処理位置へ入った後、エラーでこぼれたボールを追い直す。
    move(
      fielders[play.primary],
      play.target,
      looseBallPoint,
      650,
      flightDuration
    );
    animate(
      missFlash,
      [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.4)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.15)', offset: .45 },
        { opacity: 0, transform: 'translate(-50%, -70%) scale(1)' }
      ],
      { duration: 600, delay: flightDuration - 80, easing: 'ease-out' }
    );
  } else {
    playCatchFlash(play.target, flightDuration - 110);
  }
}

function playPassedBall() {
  animate(
    ball,
    [
      { left: '50%', top: '59%', opacity: 1, transform: 'scale(.78)' },
      { left: '51%', top: '88%', opacity: 1, transform: 'scale(1)' }
    ],
    { duration: 700, easing: 'ease-in' }
  );
  animate(
    ball,
    [
      { left: '51%', top: '88%', opacity: 1, transform: 'scale(1)' },
      { left: '55%', top: '92%', opacity: 1, transform: 'scale(.92)', offset: .28 },
      { left: '63%', top: '98%', opacity: 1, transform: 'scale(.8)' }
    ],
    { duration: 950, delay: 700, easing: 'ease-out' }
  );
  missFlash.style.left = '51%';
  missFlash.style.top = '88%';
  animate(
    missFlash,
    [
      { opacity: 0, transform: 'translate(-50%, -50%) scale(.4)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1.15)', offset: .45 },
      { opacity: 0, transform: 'translate(-50%, -70%) scale(1)' }
    ],
    { duration: 500, delay: 620, easing: 'ease-out' }
  );
  // 捕手がそらした後、後方へ転がるボールを追う。
  move(fielders.catcher, positionOf('catcher'), [61, 96], 850, 850);
  // 捕手が追い始めた後、投手がホームプレートの内野側へカバーに入る。
  move(fielders.pitcher, positionOf('pitcher'), [50, 82], 800, 1000);
}

function playSelectedScene() {
  const scene = SCENES[selectedScene];
  const label = displayLabel();
  resetAnimation();
  galleryField.classList.add('scene-running');
  galleryReplay.disabled = true;
  isPlaying = true;
  setFielderSelectionEnabled(false);
  galleryReplay.textContent = `${label}を再生中…`;
  galleryStatus.textContent = `${label}を再生しています。`;

  if (selectedScene === 'fly') playOutfieldFly();
  else if (selectedScene === 'popup') playInfieldScene('popup');
  else if (selectedScene === 'liner') playInfieldScene('liner');
  else if (selectedScene === 'extra') playOutfieldLiner(true);
  else if (selectedScene === 'single') playOutfieldSingle();
  else if (selectedScene === 'passed') playPassedBall();
  else if (selectedScene === 'ground') playInfieldScene('ground');
  else if (selectedScene === 'error') playInfieldScene('error');

  sceneTimer = setTimeout(() => {
    galleryReplay.disabled = false;
    isPlaying = false;
    setFielderSelectionEnabled(true);
    galleryReplay.textContent = `↻ ${label}をもう一度見る`;
    galleryStatus.textContent = `${label}の再生が終わりました。`;
  }, scene.duration);
}

sceneButtons.forEach((button) => {
  button.addEventListener('click', () => selectScene(button.dataset.scene));
});

directionButtons.forEach((button) => {
  button.addEventListener('click', () => selectDirection(button.dataset.direction));
});

Object.values(fielders).forEach((fielder) => {
  fielder.addEventListener('click', () => selectPlayer(fielder));
});

galleryReplay.addEventListener('click', playSelectedScene);
renderDirectionPicker();
updateLabels();

(() => {
  "use strict";

  const names = ["山田", "佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "中村", "小林"];
  const fielders = {1:[50,60],2:[50,96],3:[66,44],4:[60,30],5:[34,44],6:[40,30],7:[23,23],8:[50,7],9:[77,23]};
  const basePositions = {0:[50,83.5],1:[72,51],2:[50,21.5],3:[28.5,51]};
  const $ = q => document.querySelector(q);
  const $$ = q => [...document.querySelectorAll(q)];
  const clone = value => JSON.parse(JSON.stringify(value));

  const initial = () => ({
    gameDate: new Date().toLocaleDateString("sv-SE"),
    inning: 1, half: "top", balls: 0, strikes: 0, outs: 0,
    scores: [0, 0], batters: [0, 0],
    teams: [{id:"team-away",name:"自チーム"},{id:"team-home",name:"相手チーム"}],
    orderSetup: { topTeam: 0, confirmed: false, warned: false, registered: [false, false], rows: [[], []], phase: "pregame" },
    players: names.flatMap((name,index)=>[
      {id:`away-${index+1}`,teamId:"team-away",canonicalName:name,active:true},
      {id:`home-${index+1}`,teamId:"team-home",canonicalName:name,active:true}
    ]),
    lineupSlots: [0,1].map(team=>names.map((name,index)=>({teamId:team?"team-home":"team-away",battingOrder:index+1,currentPlayerId:`${team?"home":"away"}-${index+1}`,history:[]}))),
    appearances: [], pitcherAppearances: [], substitutionEvents: [],
    plateAppearances: [Array.from({length:9}, () => []), Array.from({length:9}, () => [])],
    bases: [null, null, null, null],
    currentPitcherIds: ["pitcherA", "pitcherB"],
    pitchers: {
      pitcherA: {id:"pitcherA", name:"投手A", pitchCount:0},
      pitcherB: {id:"pitcherB", name:"投手B", pitchCount:0}
    },
    contact: null, battedBallLocation: null, fielders: [], continuationFielders: [], continuationReason: null, plateResult: null, pitchSequence: [], platePitchCount: 0, runnerMode: false, playMode: "plate", eventReason: null,
    pitchEventAvailable: false, eventPitchNumber: null, awaitingEventPitch: false, eventLinkMark: null, eventLinkCount: 0, selected: null, pendingTarget: null, decisions: [], runEvents: [], log: []
  });

  const gameId = new URLSearchParams(location.search).get("game")?.replace(/[^A-Za-z0-9_-]/g,"") || "current";
  const GAME_STORAGE_KEY = gameId === "current" ? "baseball-iq-scorebook-current-game-v1" : `baseball-iq-scorebook-game-${gameId}-v1`;
  function loadGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY));
      return saved && saved.teams && saved.plateAppearances ? saved : initial();
    } catch (_) { return initial(); }
  }
  function persistGame() {
    try { localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  let state = loadGame();
  if(!Number.isInteger(state.platePitchCount))state.platePitchCount=state.pitchSequence?.length||0;
  const undoStack = [];
  function orderSetup() {
    if(state.teams?.[0]?.name==="チームA")state.teams[0].name="自チーム";
    if(state.teams?.[1]?.name==="チームB")state.teams[1].name="相手チーム";
    if (!state.orderSetup) {
      const logs=state.log||[];
      state.orderSetup = { topTeam: 0, confirmed: false, warned: false, registered: [logs.some(item=>/自チーム|チームA/.test(item)&&/オーダー/.test(item)),logs.some(item=>/相手チーム|チームB/.test(item)&&/オーダー/.test(item))], phase: "pregame" };
    }
    if (!Array.isArray(state.orderSetup.registered)) state.orderSetup.registered = [false, false];
    if (!Array.isArray(state.orderSetup.rows)) state.orderSetup.rows = [[], []];
    if (!state.orderSetup.phase) state.orderSetup.phase = state.orderSetup.confirmed ? "playing" : "pregame";
    return state.orderSetup;
  }
  const gamePhase = () => orderSetup().phase;
  const offense = () => state.half === "top" ? orderSetup().topTeam : 1-orderSetup().topTeam;
  const defense = () => 1-offense();
  function pitcherForTeam(team) {
    const teamId=state.teams[team]?.id;
    const appearance=[...(state.appearances||[])].reverse().find(item=>!item.exitedAt&&String(item.defensiveNumber||"")==="1"&&playerById(item.playerId)?.teamId===teamId);
    if(appearance){
      const id=appearance.playerId,player=playerById(id);
      if(!state.pitchers[id])state.pitchers[id]={id,name:player?.canonicalName||"投手",pitchCount:0};
      else if(player?.canonicalName)state.pitchers[id].name=player.canonicalName;
      state.currentPitcherIds[team]=id;
    }
    const id=state.currentPitcherIds[team];
    return state.pitchers[id]||(state.pitchers[id]={id,name:"投手",pitchCount:0});
  }
  const currentPitcher = () => pitcherForTeam(defense());
  const playerById = id => state.players.find(player=>player.id===id);
  const batterPlayer = () => playerById(state.lineupSlots[offense()][state.batters[offense()]].currentPlayerId);
  const batterName = () => batterPlayer()?.canonicalName || names[state.batters[offense()]];
  const makeBatterRunner = scoreId => ({
    playerId: batterPlayer()?.id || null,
    name: batterName(),
    responsiblePitcherId: currentPitcher().id,
    scoreId: scoreId || null
  });
  function scoreById(id) {
    if (!id) return null;
    for (const team of state.plateAppearances) for (const row of team) {
      const pa = row.find(item => item.score?.id === id);
      if (pa) return pa.score;
    }
    return null;
  }
  function recordRunnerProgress(runner, from, to, result, reason, outNumber, pitchNumber, markOverride) {
    const score = scoreById(runner?.scoreId);
    if (!score) return;
    const eventMark = ({盗塁:"S",盗塁死:"CS",牽制:"PK",牽制死:"PO",暴投:"WP",捕逸:"PB",ボーク:"BK",打撃妨害:"IF",走塁妨害:"OB",守備妨害:"IP"})[reason] || reason;
    const mark = markOverride || eventMark || `（${"１２３４５６７８９"[state.batters[offense()]]}）`;
    if (result === "SAFE") {
      const distance = (to - from + 4) % 4;
      score.advances.push({from,to,mark,pitchNumber:pitchNumber||null,multiBase:distance>=2});
      if (to === 0) score.final = "run";
    } else {
      score.final = "out";
      score.finalOutNumber = outNumber;
      score.advances.push({from,to,mark,result:"OUT",pitchNumber:pitchNumber||null});
    }
  }
  function markLeftOnBase() {
    state.bases.slice(1).forEach(runner => { const score=scoreById(runner?.scoreId); if(score&&!score.final) score.final="left"; });
  }
  function scoreRunner(runner, cause) {
    state.scores[offense()] += 1;
    state.runEvents.push({
      runnerName: runner?.name || "走者",
      responsiblePitcherId: runner?.responsiblePitcherId || null,
      pitcherOnMoundId: currentPitcher().id,
      inning: state.inning,
      half: state.half,
      cause: cause || null
    });
  }
  function recordPlateAppearance(explicitResult = null) {
    const team = offense();
    const batterIndex = state.batters[team];
    const location = state.battedBallLocation || ({1:"投",2:"捕",3:"一",4:"二",5:"三",6:"遊",7:"左",8:"中",9:"右"})[state.fielders[0]] || "";
    const result = explicitResult || state.plateResult;
    const batterDecision = state.decisions.find(d => d.runner === "batter");
    let text = result || "結果";
    let tone = "neutral";
    if (["単打","二塁打","三塁打","本塁打"].includes(result)) {
      const texasHit=state.contact === "フライ" && /^[789]$/.test(String(location));
      text = result === "単打" ? `${texasHit ? "T" : ""}${location}安` : result === "二塁打" ? `${location}2` : result === "三塁打" ? `${location}3` : `${location}本`;
      tone = "hit";
    } else if (result === "四球" || result === "死球") {
      text = result;
    } else if (result === "捕球エラー" || result === "送球エラー") {
      text = `${location}${result === "捕球エラー" ? "捕失" : "送失"}`;
    } else if (result === "野選") {
      text = `${location}野選`;
    } else if (result === "犠打") {
      text = `${location}犠打`; tone = "out";
    } else if (result === "犠飛") {
      text = `${location}犠飛`; tone = "out";
    } else if (result === "strikeout") {
      text = "三振"; tone = "out";
    } else if (result === "catch") {
      text = `${location}${state.contact === "ライナー" ? "直" : "飛"}`; tone = "out";
    } else if (result === "バントアウト") {
      text = `${location}バント`; tone = "out";
    } else if (batterDecision?.result === "OUT") {
      text = `${location}${state.contact === "ゴロ" ? "ゴロ" : state.contact === "ライナー" ? "直" : state.contact === "フライ" ? "飛" : "OUT"}`;
      tone = "out";
    }
    const id=`pa-${Date.now()}-${team}-${batterIndex}-${state.plateAppearances[team][batterIndex].length}`;
    state.plateAppearances[team][batterIndex].push({text, tone, score:{id,inning:state.inning,half:state.half,result,contact:state.contact,battedBallLocation:state.battedBallLocation,fielders:[...state.fielders],fielderPlayerIds:state.fielders.map(number=>{const item=[...(state.appearances||[])].reverse().find(a=>!a.exitedAt&&String(a.defensiveNumber||"")===String(number)&&playerById(a.playerId)?.teamId===state.teams[defense()].id);return item?.playerId||null;}),batterPlayerId:batterPlayer()?.id||null,pitcherId:currentPitcher()?.id||null,pitches:[...(state.pitchSequence||[])],pitchTotal:state.platePitchCount,decisions:clone(state.decisions),advances:[],final:batterDecision?.result==="OUT"?"out":result==="本塁打"?"run":null,outNumber:batterDecision?.result==="OUT"?Math.min(3,state.outs+1):null}});
    return id;
  }

  function save() { undoStack.push(clone(state)); }
  function act(message, change) {
    save();
    change();
    state.log.push(message);
    render();
  }
  function resetPlay() {
    state.balls = 0; state.strikes = 0; state.contact = null; state.battedBallLocation = null; state.fielders = []; state.continuationFielders=[];state.continuationReason=null;state.plateResult = null; state.pitchSequence = [];state.platePitchCount=0;
    state.runnerMode = false; state.playMode = "plate"; state.eventReason = null; state.pitchEventAvailable = false; state.eventPitchNumber = null; state.awaitingEventPitch = false; state.eventLinkMark = null; state.eventLinkCount = 0;
    state.selected = null; state.pendingTarget = null; state.decisions = [];
  }
  function nextBatter() {
    state.batters[offense()] = (state.batters[offense()] + 1) % 9;
    resetPlay();
  }
  function switchSides() {
    state.outs = 0; state.bases = [null, null, null, null];
    resetPlay();
    if (state.half === "top") state.half = "bottom";
    else { state.half = "top"; state.inning += 1; }
  }
  function queueBatterOut(label, outType = null, plateResult = outType, selectLeading = false) {
    startDecisionMode();
    state.pendingTarget = null;
    state.decisions = [{runner:"batter", to:null, result:"OUT", outType}];
    state.selected = selectLeading ? leadingRunnerKey() : null;
    state.plateResult = plateResult;
    state.log.push(label);
  }

  function forceFirst(resultLabel) {
    const scoreId = recordPlateAppearance(resultLabel);
    if (state.bases[1]) {
      if (state.bases[2]) {
        if (state.bases[3]) { recordRunnerProgress(state.bases[3],3,0,"SAFE",String(state.batters[offense()]+1)); scoreRunner(state.bases[3], "四球・死球の押し出し"); state.bases[3] = null; }
        recordRunnerProgress(state.bases[2],2,3,"SAFE",String(state.batters[offense()]+1));
        state.bases[3] = state.bases[2];
      }
      recordRunnerProgress(state.bases[1],1,2,"SAFE",String(state.batters[offense()]+1));
      state.bases[2] = state.bases[1];
    }
    state.bases[1] = makeBatterRunner(scoreId);
    nextBatter();
  }

  function pitchNotation(kind,buntAttempt=false) {
    if(buntAttempt&&kind==="空振り")return "◎";
    if(buntAttempt&&kind==="ファウル")return "△";
    return ({ボール:"－",見逃し:"○",空振り:"⊕",ファウル:"V",死球:"DB"})[kind]||"";
  }
  function pitch(kind) {
    if (state.runnerMode) {
      if(state.playMode!=="runnerEvent"||state.eventPitchNumber!==null)return;
      const finishAfterPitch=state.awaitingEventPitch;
      act(`${kind}＋${state.eventReason}`,()=>{
        currentPitcher().pitchCount+=1;state.platePitchCount+=1;state.pitchEventAvailable=true;state.eventPitchNumber=currentPitcher().pitchCount;
        state.awaitingEventPitch=false;
        state.decisions.forEach(decision=>{if(decision.pitchNumber==null)decision.pitchNumber=state.eventPitchNumber;});
        const pitchMark=pitchNotation(kind);
        const eventMark=state.eventLinkMark||(({盗塁:"S",牽制:"PK",暴投:"WP",捕逸:"PB",ボーク:"BK"})[state.eventReason]||state.eventReason),linkedPitchMark=["盗塁","暴投","捕逸"].includes(state.eventReason)?"'".repeat(state.eventLinkCount||1):`・${eventMark}`;
        const terminalPitch=kind==="死球"||kind==="ボール"&&state.balls===3||!["ボール","ファウル","死球"].includes(kind)&&state.strikes===2;
        if(!terminalPitch)state.pitchSequence.push(`${pitchMark}${linkedPitchMark}`);
        if(kind==="ボール")state.balls+=1;else if(kind==="ファウル"){if(state.strikes<2)state.strikes+=1;}else if(kind!=="死球")state.strikes+=1;
      });
      if(finishAfterPitch)finishPlay();
      return;
    }
    const buntAttempt=state.contact==="バント"&&state.fielders.length===0&&!state.plateResult;
    act(kind, () => {
      currentPitcher().pitchCount += 1;state.platePitchCount+=1;
      state.pitchEventAvailable = true;
      const terminalPitch=kind==="死球"||kind==="ボール"&&state.balls===3||!["ボール","ファウル","死球"].includes(kind)&&state.strikes===2;
      if(!terminalPitch)state.pitchSequence.push(pitchNotation(kind,buntAttempt));
      if(buntAttempt){state.contact=null;state.fielders=[];state.battedBallLocation=null;}
      if (kind === "死球") { forceFirst("死球"); return; }
      if (kind === "ボール") {
        state.balls += 1;
        if (state.balls === 4) { state.log.push("四球"); forceFirst("四球"); }
      } else if (kind === "ファウル") {
        if (state.strikes < 2) state.strikes += 1;
      } else state.strikes += 1;
      if (state.strikes === 3) queueBatterOut("三振アウト", "strikeout");
    });
  }

  function canDroppedThirdStrike() {
    return state.strikes === 2 && (state.outs === 2 || (state.outs < 2 && !state.bases[1]));
  }

  function droppedThirdStrike() {
    if (state.runnerMode || !canDroppedThirdStrike()) return;
    act("振り逃げ", () => {
      currentPitcher().pitchCount += 1;state.platePitchCount+=1;
      state.pitchEventAvailable = true;
      state.eventPitchNumber = currentPitcher().pitchCount;
      state.strikes = 3;
      state.plateResult = "振り逃げ";
      startDecisionMode(false);
      state.selected = "batter";
    });
  }

  function startDecisionMode(resetCount = true) {
    state.runnerMode = true;
    state.playMode = "plate";
    if (resetCount) { state.balls = 0; state.strikes = 0; }
  }
  function leadingRunnerKey() {
    for (let base = 3; base >= 1; base -= 1) {
      const key = runnerKeyForBase(base);
      if (state.bases[base] && !decisionFor(key)) return key;
    }
    return null;
  }
  function nextEventParticipantKey() {
    return leadingRunnerKey() || (!decisionFor("batter") ? "batter" : null);
  }
  function startRunnerEvent(reason) {
    const interference=["打撃妨害","走塁妨害","守備妨害"].includes(reason);
    if (state.runnerMode || (!interference && !state.bases.slice(1).some(Boolean))) return;
    act(`走者イベント：${reason}`, () => {
      const eventSymbol=({盗塁:"S",牽制:"PK",暴投:"WP",捕逸:"PB",ボーク:"BK",打撃妨害:"IF",走塁妨害:"OB",守備妨害:"IP"})[reason]||reason;
      const linkedToPitch=reason!=="牽制"&&state.pitchEventAvailable&&state.pitchSequence.length>0;
      state.runnerMode = true;
      state.playMode = "runnerEvent";
      state.eventReason = reason;
      state.pendingTarget = null;
      state.decisions = [];
      state.awaitingEventPitch = false;
      if(["盗塁","暴投","捕逸"].includes(reason)){state.eventLinkCount=(state.eventLinkCount||0)+1;state.eventLinkMark=`${eventSymbol}${"'".repeat(state.eventLinkCount)}`;}else state.eventLinkMark=null;
      state.selected = nextEventParticipantKey();
      if(linkedToPitch) state.pitchSequence[state.pitchSequence.length-1]+=["盗塁","暴投","捕逸"].includes(reason)?"'".repeat(state.eventLinkCount||1):`・${state.eventLinkMark||eventSymbol}`;
      state.eventPitchNumber = reason!=="牽制"&&state.pitchEventAvailable ? currentPitcher().pitchCount : null;
    });
  }
  function runnerKeyForBase(base) { return `base${base}`; }
  function decisionFor(key) { return state.decisions.find(d => d.runner === key); }
  function latestDecisionFor(key) { return [...state.decisions].reverse().find(d => d.runner === key); }
  function runnerFrom(key) { const latest=latestDecisionFor(key);return latest?.result==="SAFE"?latest.to:key==="batter"?0:Number(key.slice(4)); }

  function chooseRunner(key) {
    if (state.playMode === "plate" && state.plateResult === "strikeout" && key !== "batter") return;
    if (!state.runnerMode && !state.contact) {
      $("#status").textContent = "先に走者イベントを選択してください";
      return;
    }
    if (key !== "batter") {
      const base = Number(key.slice(4));
      if (!state.bases[base]) return;
    }
    if (decisionFor(key) && !state.continuationReason) return;
    if (state.continuationReason && runnerFrom(key) === 0) return;
    act(key === "batter" ? "バッターランナーを選択" : `${Number(key.slice(4))}塁走者を選択`, () => {
      if (!state.runnerMode) startDecisionMode();
      state.selected = key;
      state.pendingTarget = null;
    });
  }

  function chooseBase(to) {
    if (!state.runnerMode || !state.selected || state.pendingTarget !== null) return;
    const from = runnerFrom(state.selected);
    const pickoff=state.playMode==="runnerEvent"&&state.eventReason==="牽制";
    if (to !== 0 && (pickoff ? to < from : to <= from)) return;
    act(`${to === 0 ? "ホーム" : to + "塁"}を選択`, () => { state.pendingTarget = to; });
  }

  function judge(result) {
    if (!state.selected || state.pendingTarget === null) return;
    const key = state.selected;
    const to = state.pendingTarget;
    const label = key === "batter" ? "バッターランナー" : `${Number(key.slice(4))}塁走者`;
    act(`${label} → ${to === 0 ? "ホーム" : to + "塁"}（${result}）`, () => {
      const reason = state.continuationReason || (state.playMode === "runnerEvent" ? state.eventReason : null),from=runnerFrom(key),pickoff=state.playMode==="runnerEvent"&&state.eventReason==="牽制"&&!state.continuationReason,sameBase=pickoff&&to===from;
      const recordedResult=sameBase&&result==="SAFE"?"HOLD":result,outcomeReason=pickoff?(result==="OUT"?"牽制死":"盗塁"):reason === "盗塁" && result === "OUT" ? "盗塁死" : reason === "牽制" && result === "OUT" ? "牽制死" : reason;
      const linkedRunnerMark=state.eventLinkMark?`${({盗塁死:"CS",盗塁:"S",暴投:"WP",捕逸:"PB"})[outcomeReason]||outcomeReason}${"'".repeat(state.eventLinkCount||1)}`:null,errorMark=state.continuationReason?errorAdvanceMark(state.continuationReason):pickoff?(result==="OUT"?"PO":sameBase?"":"S"):linkedRunnerMark;
      state.decisions.push({runner:key, from, to, result:recordedResult, reason:outcomeReason, advanceMark:errorMark, pitchNumber:state.eventPitchNumber, outType:result === "OUT" ? null : undefined});
      if(state.playMode==="plate"&&key==="batter"&&result==="OUT"&&!state.plateResult)state.plateResult="catch";
      state.selected = state.continuationReason ? null : state.playMode === "runnerEvent" ? nextEventParticipantKey() : decisionFor("batter") ? leadingRunnerKey() : null;
      state.pendingTarget = null;
    });
  }
  function errorAdvanceMark(kind) {
    const numbers=[...state.fielders,...(state.continuationFielders||[])].map(String);if(!numbers.length)return kind;
    if(state.playMode==="runnerEvent"&&state.eventReason==="牽制")return kind==="送球エラー"?`${numbers[0]}E`:`${numbers.join("-")}E`;
    if(kind==="送球エラー"){
      const thrower=numbers.at(-2)||numbers.at(-1),receiver=numbers.length>1?numbers.at(-1):"";
      return `${thrower}E${receiver?`-${receiver}`:""}`;
    }
    return `E${numbers.at(-1)}`;
  }
  function errorResponsibleFielder(kind){const numbers=[...state.fielders,...(state.continuationFielders||[])].map(String);return kind==="送球エラー"?(numbers.at(-2)||numbers.at(-1)||""):(numbers.at(-1)||"");}
  function needsBattedBallDetails(){return state.playMode==="plate"&&["単打","二塁打","三塁打","本塁打","catch","野選","捕球エラー","送球エラー","犠打","犠飛","バントアウト"].includes(state.plateResult);}
  function battedBallDetailsComplete(){const batterOut=decisionFor("batter")?.result==="OUT";if(!needsBattedBallDetails()&&!batterOut)return true;if(!state.contact)return false;if(state.plateResult==="catch"||batterOut){if(state.contact==="ゴロ")return state.fielders.length>=2;return state.fielders.length>=1;}return !!(state.battedBallLocation||state.fielders.length);}
  function finishPlay() {
    if (!state.runnerMode) return;
    if (state.pendingTarget !== null || (state.selected && state.playMode !== "runnerEvent" && !decisionFor("batter"))) {
      $("#status").textContent = "先にOUT／SAFEを入力してください";
      return;
    }
    const runnerEvent = state.playMode === "runnerEvent";
    const batterDecision = decisionFor("batter");
    if (!runnerEvent && !batterDecision) {
      $("#status").textContent = "バッターランナーの結果を入力してください";
      return;
    }
    if(!battedBallDetailsComplete()){$("#status").textContent="打球種類と守備番号または打球地点を入力してください";return;}
    if(state.continuationReason&&!state.decisions.some(d=>d.reason===state.continuationReason)){
      $("#status").textContent="エラーで変化した走者を入力してください";return;
    }
    if(runnerEvent&&["暴投","捕逸","盗塁"].includes(state.eventReason)&&state.eventPitchNumber===null){state.awaitingEventPitch=true;state.selected=null;state.pendingTarget=null;render();return;}
    act(runnerEvent ? `${state.eventReason}を確定` : "プレーを確定", () => {
      const outsBefore = state.outs;
      const classifiedResult = classifyPlateResult(outsBefore);
      if (!runnerEvent && classifiedResult && classifiedResult !== state.plateResult) {
        state.plateResult = classifiedResult;
        state.log.push(`自動判定：${classifiedResult}`);
      }
      const batterEvent=runnerEvent&&batterDecision&&batterDecision.result!=="HOLD";
      const plateScoreId = !runnerEvent ? recordPlateAppearance(classifiedResult) : batterEvent ? recordPlateAppearance(state.eventReason) : null;
      const oldBases = clone(state.bases);
      state.decisions.forEach(d => {
        if (d.result!=="HOLD"&&d.runner.startsWith("base")) state.bases[Number(d.runner.slice(4))] = null;
      });
      let newOuts = 0;
      state.decisions.forEach(d => {
        const originalFrom=d.runner === "batter"?0:Number(d.runner.slice(4));const from=d.from??originalFrom;
        const runner = d.runner === "batter" ? makeBatterRunner(plateScoreId) : oldBases[originalFrom];
        if(d.result==="HOLD")return;if(from>0&&from!==originalFrom)state.bases[from]=null;
        if (d.result === "OUT") { newOuts += 1; if(d.runner!=="batter") recordRunnerProgress(runner,from,d.to,d.result,d.reason,Math.min(3,state.outs+newOuts),d.pitchNumber,d.advanceMark); }
        else if (d.to === 0) scoreRunner(runner, d.reason || state.plateResult || state.eventReason);
        else state.bases[d.to] = runner;
        if(d.result==="SAFE"&&d.runner!=="batter") recordRunnerProgress(runner,from,d.to,d.result,d.reason,null,d.pitchNumber,d.advanceMark);
      });
      state.outs += newOuts;
      if(state.outs>=3) markLeftOnBase();
      if (runnerEvent) {
        if(batterEvent)state.batters[offense()] = (state.batters[offense()] + 1) % 9;
        if (state.outs >= 3) switchSides();
        else {
          state.runnerMode = false;
          state.playMode = "plate";
          state.eventReason = null;
          state.pitchEventAvailable = false;
          state.eventPitchNumber = null;
          state.awaitingEventPitch = false;
          state.eventLinkMark = null;
          state.fielders=[];
          state.continuationFielders=[];
          state.continuationReason=null;
          state.selected = null;
          state.pendingTarget = null;
          state.decisions = [];
          if(state.strikes>=3) queueBatterOut("三振アウト","strikeout");
          else if(state.balls>=4) forceFirst("四球");
        }
      } else {
        state.batters[offense()] = (state.batters[offense()] + 1) % 9;
        if (state.outs >= 3) switchSides(); else resetPlay();
      }
    });
  }

  function presetBatterSafe(destination, label) {
    startDecisionMode();
    state.decisions.push({runner:"batter", to:destination, result:"SAFE"});
    state.selected = leadingRunnerKey();
    state.plateResult = label;
    state.log.push(label);
  }
  function applyHitResult(kind){if(kind==="本塁打"){startDecisionMode();state.plateResult="本塁打";for(let base=3;base>=1;base--)if(state.bases[base])state.decisions.push({runner:`base${base}`,from:base,to:0,result:"SAFE"});state.decisions.push({runner:"batter",from:0,to:0,result:"SAFE"});state.selected=null;state.log.push("本塁打：確定待ち");}else presetBatterSafe({単打:1,二塁打:2,三塁打:3}[kind],kind);}
  function commitDeferredResult(){const pending=state.plateResult;if(!state.contact||!pending||state.runnerMode)return;if(pending==="catch"){if(!state.fielders.length||state.contact==="ゴロ"&&state.fielders.length<2)return;if(state.contact==="フライ"||state.contact==="ライナー")state.fielders=state.fielders.slice(0,1);queueBatterOut("アウト","catch","catch",true);}else if(["単打","二塁打","三塁打","本塁打"].includes(pending))applyHitResult(pending);else if(pending==="野選")presetBatterSafe(1,"野選");else if(["捕球エラー","送球エラー"].includes(pending))presetBatterSafe(1,pending);}
  function hit(kind){act(kind,()=>{const batterSafe=decisionFor("batter")?.result==="SAFE";if(state.runnerMode&&batterSafe){state.plateResult=kind;state.log.push(kind);return;}if(!state.contact){state.plateResult=kind;return;}applyHitResult(kind);});}
  function result(kind) {
    if (state.runnerMode) {const pickoff=state.playMode==="runnerEvent"&&state.eventReason==="牽制",batterSafe=state.playMode==="plate"&&decisionFor("batter")?.result==="SAFE";if(batterSafe&&!state.plateResult&&kind==="安打"){$("#hitChoices").hidden=false;$("#errorChoices").hidden=true;return;}if(batterSafe&&!state.plateResult&&kind==="野選"){act("野選",()=>{state.plateResult="野選";state.log.push("野選");});return;}if(kind==="エラー"&&(pickoff||batterSafe||state.playMode==="plate"&&state.decisions.some(d=>d.result==="SAFE"))){$("#errorChoices").hidden=false;$("#hitChoices").hidden=true;}return;}
    if (kind === "安打") { $("#hitChoices").hidden = false; $("#errorChoices").hidden = true; return; }
    if (kind === "エラー") { $("#errorChoices").hidden = false; $("#hitChoices").hidden = true; return; }
    if (kind === "捕球") act("アウト", () => {state.plateResult="catch";commitDeferredResult();});
    else if (kind === "野選") act("野選", () => {state.plateResult="野選";commitDeferredResult();});
  }
  function error(kind) {if(state.runnerMode){const pickoff=state.playMode==="runnerEvent"&&state.eventReason==="牽制",batterSafe=state.playMode==="plate"&&decisionFor("batter")?.result==="SAFE",minimum=kind==="送球エラー"?1:2;if(pickoff){if(state.fielders.length<minimum){$("#status").textContent=minimum===1?"先に牽制した守備番号を選択してください":"牽制した守備番号と送球先を選択してください";return;}act(`牽制：${errorAdvanceMark(kind)}`,()=>{state.continuationReason=kind;});return;}if(batterSafe&&!state.plateResult){act(kind,()=>{state.plateResult=kind;state.log.push(kind);});return;}if(state.playMode!=="plate"||state.fielders.length+(state.continuationFielders?.length||0)<2){$("#status").textContent="先に送球先の守備番号を選択してください";return;}act(`追加進塁：${errorAdvanceMark(kind)}`,()=>{state.continuationReason=kind;state.selected=null;state.pendingTarget=null;});return;}act(kind,()=>{state.plateResult=kind;commitDeferredResult();});}

  function classifyPlateResult(outsBefore) {
    if (state.playMode !== "plate") return null;
    const batterDecision = decisionFor("batter");
    const runnerDecisions = state.decisions.filter(d => d.runner.startsWith("base"));
    const runnerAdvanced = runnerDecisions.some(d => d.result === "SAFE" && (d.to === 0 || d.to > Number(d.runner.slice(4))));
    const runnerOut = runnerDecisions.some(d => d.result === "OUT");
    if (state.plateResult === "野選" || state.plateResult === "捕球エラー" || state.plateResult === "送球エラー") return state.plateResult;
    if (state.contact === "バント") {
      if (runnerOut && batterDecision?.result === "SAFE") return "野選";
      if (outsBefore < 2 && batterDecision?.result === "OUT" && runnerAdvanced && !runnerOut) return "犠打";
      if (batterDecision?.result === "OUT") return "バントアウト";
    }
    if (state.contact === "フライ" && outsBefore < 2 && batterDecision?.result === "OUT" && runnerDecisions.some(d => d.result === "SAFE" && d.to === 0)) return "犠飛";
    if (batterDecision?.result === "OUT") return "catch";
    return state.plateResult;
  }

  function escapeHtml(text) {
    const span = document.createElement("span"); span.textContent = text; return span.innerHTML;
  }
  function plateAppearanceLabel(pa){const score=pa?.score||{},result=score.result||"",fielders=score.fielders||[],rawLocation=score.battedBallLocation||fielders[0]||"",position={1:"投",2:"捕",3:"一",4:"二",5:"三",6:"遊",7:"左",8:"中",9:"右"},direction=value=>{const text=String(value);if(text==="8・9")return "右";if(text==="7・8")return "左";return position[text]||text;},hitDirection=direction(rawLocation);if(result==="単打")return /^[1-6]$/.test(String(rawLocation))?"内安":`${hitDirection}安`;if(result==="二塁打")return `${hitDirection}二`;if(result==="三塁打")return `${hitDirection}三`;if(result==="本塁打")return `${hitDirection}本`;if(result==="捕球エラー"||result==="送球エラー"){const responsible=result==="送球エラー"?(fielders.at(-2)||fielders.at(-1)):(fielders.at(-1)||fielders[0]);return `${direction(responsible)}失`;}if(result==="strikeout"||result==="三振")return "三振";if(result==="振り逃げ")return "振逃";if(result==="四球")return "四球";if(result==="死球")return "死球";if(result==="野選")return "野選";if(result==="犠打")return "犠打";if(result==="犠飛")return `${hitDirection}犠飛`;if(result==="バントアウト")return `${hitDirection}犠打`;if(result==="catch"||pa?.tone==="out"){const suffix=score.contact==="ゴロ"?"ゴ":score.contact==="ライナー"?"直":score.contact==="フライ"?"飛":"凡";return `${hitDirection}${suffix}`;}return pa?.text||result||"";}

  function render() {
    const side = offense();
    $("#inning").textContent = `${state.inning}回${state.half === "top" ? "表" : "裏"}`;
    const topTeam=orderSetup().topTeam;
    $("#score").textContent = `${state.scores[topTeam]} - ${state.scores[1-topTeam]}`;
    $("#pitcher").textContent = `投手：${currentPitcher().name}　${currentPitcher().pitchCount}球`;
    $("#balls").textContent = state.balls; $("#strikes").textContent = state.strikes; $("#outs").textContent = state.outs;
    $$("#bsoBoard [data-count]").forEach(dot => {
      const value = dot.dataset.count === "b" ? state.balls : dot.dataset.count === "s" ? state.strikes : state.outs;
      dot.classList.toggle("on", +dot.dataset.index <= value);
    });
    $("#batter").textContent = `${state.batters[side] + 1}番 ${batterName()}`;
    const appearances = state.plateAppearances[side][state.batters[side]];
    $("#paHistory").innerHTML = appearances.map(pa => `<span class="pa-box pa-${pa.tone}">（${escapeHtml(plateAppearanceLabel(pa))}）</span>`).join("");
    const awaitingEventPitch=!!state.awaitingEventPitch;
    const directionChosen=!!(state.battedBallLocation||state.fielders.length),resultChosen=!!state.plateResult,battedEntryStarted=!state.runnerMode&&!!(directionChosen||state.contact);
    $$("[data-contact]").forEach(b => {b.classList.toggle("active", b.dataset.contact === state.contact);b.disabled=awaitingEventPitch||state.runnerMode||!directionChosen||!!state.contact;});
    $$(".fielder").forEach(b => {const pickoff=state.playMode==="runnerEvent"&&state.eventReason==="牽制";b.classList.toggle("selected", state.fielders.includes(+b.dataset.fielder)||state.continuationFielders?.includes(+b.dataset.fielder));b.disabled=awaitingEventPitch||state.runnerMode&&!pickoff||(!state.runnerMode&&resultChosen);});
    $$(".field-gap").forEach(b => {b.classList.toggle("selected", b.dataset.location === state.battedBallLocation);b.disabled=awaitingEventPitch||state.runnerMode||resultChosen||!!state.contact||state.fielders.length>0;});

    $$(".base").forEach(base => {
      const n = +base.dataset.base;
      base.disabled=awaitingEventPitch;
      const dot = base.querySelector("i");
      const decision = state.decisions.find(d => d.to === n);
      base.classList.toggle("target", state.pendingTarget === n);
      base.classList.toggle("out-result", decision?.result === "OUT");
      base.classList.toggle("safe-result", decision?.result === "SAFE");
      const selectedFrom=state.selected==="batter"?0:+state.selected?.slice(4);
      const pickoffTarget=state.playMode==="runnerEvent"&&state.eventReason==="牽制";
      base.classList.toggle("destination", !!state.selected && state.pendingTarget === null && (n === 0 || (pickoffTarget?n>=selectedFrom:n>selectedFrom)));
      const label = base.querySelector(":scope > span");
      if (label) label.textContent = decision ? decision.result : `${n}塁`;
      if (dot) {
        const key = runnerKeyForBase(n);
        dot.hidden = !state.bases[n];
        dot.textContent = "";
        dot.classList.toggle("chosen", state.selected === key);
        dot.classList.toggle("processed", !!decisionFor(key));
      }
    });
    $("#batterRunner").classList.toggle("chosen", state.selected === "batter");
    $("#batterRunner").classList.toggle("processed", !!decisionFor("batter"));
    $("#batterRunner").disabled = awaitingEventPitch;
    $("#batterRunner").style.opacity = awaitingEventPitch ? ".45" : "1";
    const runnerPitchAllowed=state.runnerMode&&state.playMode==="runnerEvent"&&state.eventPitchNumber===null;
    $$("[data-pitch]").forEach(button=>button.disabled=awaitingEventPitch?!(["空振り","見逃し","ボール"].includes(button.dataset.pitch)):(battedEntryStarted||(state.runnerMode&&!runnerPitchAllowed)));
    $$("[data-result]").forEach(button=>{const pickoff=state.playMode==="runnerEvent"&&state.eventReason==="牽制",awaitingSafeResult=state.runnerMode&&state.playMode==="plate"&&decisionFor("batter")?.result==="SAFE"&&!state.plateResult;button.disabled=awaitingEventPitch||(!awaitingSafeResult&&!(button.dataset.result==="エラー"&&pickoff));});
    $$("[data-hit],[data-error]").forEach(button=>button.disabled=awaitingEventPitch);
    $$("[data-judge]").forEach(button=>button.disabled=awaitingEventPitch);
    const droppedThirdStrikeAllowed=canDroppedThirdStrike();
    $("#droppedThirdStrike").disabled=awaitingEventPitch||battedEntryStarted||state.runnerMode||!droppedThirdStrikeAllowed;
    $("#droppedThirdStrike").title=droppedThirdStrikeAllowed?"":"2ストライクで、0・1アウト時は一塁走者なし、または2アウト時に使用できます";
    $$("[data-run-event]").forEach(button => {
      button.classList.toggle("active", state.playMode === "runnerEvent" && state.eventReason === button.dataset.runEvent);
      button.disabled = state.runnerMode||awaitingEventPitch||battedEntryStarted;
    });

    const throwRoute=[state.battedBallLocation,...state.fielders,...(state.continuationFielders||[])].filter(Boolean);
    const resultNames={catch:"アウト",捕球アウト:"アウト"};
    const resultParts=[];
    if(state.plateResult&&!String(state.plateResult).includes("エラー"))resultParts.push(resultNames[state.plateResult]||state.plateResult);
    const recordedError=state.continuationReason||(String(state.plateResult||"").includes("エラー")?state.plateResult:null);
    if(recordedError)resultParts.push(`${recordedError}：${errorResponsibleFielder(recordedError)}`);
    const ballResult=state.contact?`${state.contact}${resultParts.length?`（${resultParts.join("／")}）`:""}`:"未入力";
    $("#sequence").innerHTML=`打・送球：${escapeHtml(throwRoute.join(" → ")||"未入力")}<br>打球結果：${escapeHtml(ballResult)}`;
    const errorRoute=[...state.fielders,...(state.continuationFielders||[])].map(String),thrower=errorRoute.at(-2)||errorRoute.at(-1)||"",receiver=errorRoute.at(-1)||"";
    const throwingErrorButton=$('[data-error="送球エラー"]'),fieldingErrorButton=$('[data-error="捕球エラー"]');
    if(throwingErrorButton)throwingErrorButton.textContent=thrower?`投げた側 ${thrower}`:"投げた側";
    if(fieldingErrorButton)fieldingErrorButton.textContent=receiver?`取る側 ${receiver}`:"取る側";
    $("#runnerPanel").hidden = !state.runnerMode;
    const batterDecision=decisionFor("batter"),awaitingSafeResult=state.playMode==="plate"&&batterDecision?.result==="SAFE"&&!state.plateResult;
    $("#finish").disabled=awaitingEventPitch||!state.runnerMode||state.pendingTarget!==null||(state.playMode==="plate"&&(!batterDecision||awaitingSafeResult||!battedBallDetailsComplete()))||!!(state.continuationReason&&!state.decisions.some(d=>d.reason===state.continuationReason));
    $("#finish").hidden=state.playMode==="plate"&&(!batterDecision||awaitingSafeResult);
    $("#judgement").hidden = state.pendingTarget === null;
    if (state.pendingTarget !== null) $("#judgementText").textContent = `${state.pendingTarget === 0 ? "ホーム" : state.pendingTarget + "塁"}の判定`;
    $("#hitChoices").hidden = true; $("#errorChoices").hidden = true;
    const selectedLabel = state.selected === "batter" ? "バッターランナー" : state.selected ? `${Number(state.selected.slice(4))}塁走者` : "";
    const optionalRunner=state.playMode === "plate" && state.selected?.startsWith("base") && !!decisionFor("batter");
    $("#status").textContent = awaitingEventPitch ? "投球は？　空振り・見送り・ボールから選択してください" : awaitingSafeResult ? "バッターランナーの結果をヒット／FC／エラーから選択してください" : state.pendingTarget !== null ? `③ ${selectedLabel}：OUT／SAFEを選択` : state.selected ? state.playMode === "runnerEvent" || optionalRunner || state.continuationReason ? `① ${selectedLabel}：変化があれば到達塁、なければ後ろの走者または確定` : `② ${selectedLabel}：到達する塁を選択` : state.continuationReason ? `${errorAdvanceMark(state.continuationReason)}：さらに動いた走者を選択してください` : state.runnerMode && state.plateResult === "strikeout" ? "三振アウト：確定を押してください" : state.runnerMode ? `① ${state.eventReason ? state.eventReason + "：" : ""}次の走者を選択、または確定` : !directionChosen ? "① 打球方向の守備番号を選択してください" : !state.contact ? "② 必要なら送球先を選び、打球種類を選択してください" : "バッターランナーの到達塁を選択してください";
    $("#undo").disabled = undoStack.length === 0;
    const playing=gamePhase()==="playing",finished=gamePhase()==="finished",orderButton=$("#openOrderPanel"),gameSetButton=$("#gameSet"),exportButton=$("#exportStats"),undoButton=$("#undo");
    if(orderButton){orderButton.disabled=playing;orderButton.setAttribute("aria-disabled",String(playing));orderButton.title=playing?"ゲームセット後に操作できます":"";}
    if(gameSetButton)gameSetButton.hidden=!playing;
    if(exportButton)exportButton.hidden=!finished;
    if(undoButton)undoButton.hidden=finished;
    $("#history").innerHTML = state.log.length ? state.log.slice(-12).reverse().map(x => `<li>${escapeHtml(x)}</li>`).join("") : "<li>まだ操作はありません</li>";
    persistGame();
  }

  function setup() {
    $("#gameSet").onclick=()=>{if(gamePhase()!=="playing")return;save();const current=orderSetup();current.phase="finished";state.log.push("ゲームセット");render();};
    const paColorOverride = document.createElement("style");
    paColorOverride.textContent = ".pa-hit{color:#18211c!important;background:#74d9ee!important}.pa-out{color:#fff!important;background:#e44f4f!important}.game-top{align-items:start!important}.game-top #inning,.game-top #score,.batter-summary #batter{font-size:1.3rem!important;line-height:1.2!important}";
    document.head.appendChild(paColorOverride);
    const holder = $("#fielders");
    Object.entries(fielders).forEach(([number, p]) => {
      const button = document.createElement("button");
      button.className = "fielder"; button.dataset.fielder = number; button.textContent = number;
      button.style.left = `${p[0]}%`; button.style.top = `${p[1]}%`;
      button.onclick = () => { if(!state.runnerMode)act(state.fielders.length||state.battedBallLocation?`送球${number}`:`打球方向${number}`,()=>{state.fielders.push(+number);commitDeferredResult();});else if(state.playMode==="runnerEvent"&&state.eventReason==="牽制")act(state.fielders.length?`牽制送球${number}`:`牽制${number}`,()=>state.fielders.push(+number));else if(state.runnerMode&&state.playMode==="plate"&&!state.continuationReason&&state.decisions.some(d=>d.result==="SAFE"))act(`追加送球${number}`,()=>{state.continuationFielders??=[];state.continuationFielders.push(+number);}); };
      holder.appendChild(button);
    });
    [["7・8",36.5,15],["8・9",63.5,15]].forEach(([label,left,top])=>{
      const button=document.createElement("button");
      button.className="field-gap";button.dataset.location=label;button.textContent=label;
      button.style.left=`${left}%`;button.style.top=`${top}%`;
      button.onclick=()=>{if(!state.runnerMode&&!state.contact&&!state.fielders.length)act(`打球方向${label}`,()=>state.battedBallLocation=label);};
      holder.appendChild(button);
    });
    $$(".base").forEach(base => {
      const n = +base.dataset.base, p = basePositions[n];
      base.style.left = `${p[0]}%`; base.style.top = `${p[1]}%`; base.onclick = () => chooseBase(n);
      if (n > 0) {
        const text = base.firstChild, span = document.createElement("span");
        span.textContent = text.textContent; span.style.transform = "rotate(-45deg)"; span.style.display = "block";
        base.replaceChild(span, text); base.style.transform = "translate(-50%, -50%) rotate(45deg)";
      }
      const dot = base.querySelector("i");
      if (dot) { dot.classList.add("runner-mark"); dot.onclick = e => { e.stopPropagation(); chooseRunner(runnerKeyForBase(n)); }; }
    });
    const bso = document.createElement("div");
    bso.id = "bsoBoard";
    bso.className = "bso-board";
    bso.setAttribute("aria-label", "ボール、ストライク、アウトカウント");
    bso.innerHTML = '<div><b>B</b><i data-count="b" data-index="1"></i><i data-count="b" data-index="2"></i><i data-count="b" data-index="3"></i></div><div><b>S</b><i data-count="s" data-index="1"></i><i data-count="s" data-index="2"></i></div><div><b>O</b><i data-count="o" data-index="1"></i><i data-count="o" data-index="2"></i></div>';
    $(".field").appendChild(bso);

    const batter = document.createElement("button");
    batter.id = "batterRunner"; batter.className = "batter-runner"; batter.textContent = "";
    batter.style.position = "absolute"; batter.style.left = "61%"; batter.style.top = "84%"; batter.style.zIndex = "4";
    batter.style.transform = "translate(-50%,-50%)"; batter.onclick = () => chooseRunner("batter");
    $(".field").appendChild(batter);
    const confirmPanel = $("#runnerPanel");
    const judgement = $("#judgement");
    $(".field").appendChild(judgement);
    $(".field-wrap").insertBefore(confirmPanel, $("#status"));
    [$("#hitChoices"), $("#errorChoices")].forEach(popup => {
      popup.style.right = "2%";
      popup.style.bottom = "55%";
      popup.style.width = "27%";
    });

    $$("[data-pitch]").forEach(b => b.onclick = () => pitch(b.dataset.pitch));
    $("#droppedThirdStrike").onclick = droppedThirdStrike;
    $$("[data-run-event]").forEach(b => b.onclick = () => startRunnerEvent(b.dataset.runEvent));
    $$("[data-contact]").forEach(b => b.onclick = () => { if (!state.runnerMode&&(state.battedBallLocation||state.fielders.length)&&!state.contact) act(b.dataset.contact, () => { currentPitcher().pitchCount += 1;state.platePitchCount+=1;state.contact=b.dataset.contact;if(state.plateResult)commitDeferredResult();else{startDecisionMode();state.selected="batter";} }); });
    const hitButton = $('[data-result="安打"]');
    hitButton.textContent = "ヒット";
    const choiceButton = $('[data-result="セーフ"]');
    choiceButton.dataset.result = "野選"; choiceButton.textContent = "FC（野選）";
    $("#hitChoices > b").textContent = "ヒットの種類";
    const fieldingErrorButton = $('[data-error="捕球エラー"]');
    fieldingErrorButton.textContent = "取る側"; fieldingErrorButton.style.whiteSpace = "nowrap";
    const throwingErrorButton = $('[data-error="送球エラー"]');
    throwingErrorButton.textContent = "投げた側"; throwingErrorButton.style.whiteSpace = "nowrap";
    $$(".field-controls").forEach(box => { box.style.height = "38%"; });
    $$(".field-controls button").forEach(button => {
      button.style.width = "100%";
      button.style.flex = "1 1 0";
      button.style.minHeight = "0";
      button.style.fontSize = "11px";
      button.style.lineHeight = "1.15";
    });
    $$("[data-result]").forEach(b => b.onclick = () => result(b.dataset.result));
    $$("[data-hit]").forEach(b => b.onclick = () => hit(b.dataset.hit));
    $$("[data-error]").forEach(b => b.onclick = () => error(b.dataset.error));
    $$("[data-judge]").forEach(b => b.onclick = () => judge(b.dataset.judge));
    $("#finish").onclick = finishPlay;
    $("#undo").onclick = () => { if (undoStack.length) { state = undoStack.pop(); render(); } };
    render();
  }

  window.ScorebookGame = {
    snapshot: () => clone(state),
    setOrderSetup(topTeam) {
      const value=Number(topTeam);
      if(![0,1].includes(value))throw new Error("表のチームを選択してください");
      const setup=orderSetup();
      if(!setup.registered.every(Boolean))throw new Error("両チームのオーダーを登録してください");
      save();setup.topTeam=value;setup.confirmed=true;setup.warned=false;setup.phase="playing";state.log.push(`試合前設定を確定：${state.teams[value].name}が先攻`);render();
    },
    allowRecordingStart() {
      const setup=orderSetup();
      if(setup.phase==="playing")return true;
      document.querySelector('[data-open-panel="orderPanel"]')?.click();
      return false;
    },
    setLineup(side, rows, teamName) {
      save();
      const team = side === "own" ? 0 : 1;
      if(String(teamName||"").trim()) state.teams[team].name=String(teamName).trim();
      rows.forEach((row,index)=>{
        const id=row.matchedPlayerId||`${side}-${Date.now()}-${index}`;
        if(!playerById(id)) state.players.push({id,teamId:state.teams[team].id,canonicalName:row.playerNameRaw,uniformNumber:row.uniformNumberRaw,active:true});
        row.playerId=id;
        if(row.battingOrder>0){const slot=state.lineupSlots[team][row.battingOrder-1];slot.currentPlayerId=id;slot.history.push({playerId:id,enteredAt:new Date().toISOString(),position:row.positionRaw,defensiveNumber:row.defensiveNumberRaw});state.appearances.push({playerId:id,enteredAt:{inning:state.inning,half:state.half},exitedAt:null,battingOrder:row.battingOrder,defensiveNumber:row.defensiveNumberRaw,defensivePositions:[row.positionRaw]});}
      });
      const setup=orderSetup();setup.registered[team]=true;setup.rows[team]=clone(rows);setup.confirmed=false;setup.warned=false;setup.phase="pregame";
      state.log.push(`${side === "own" ? "自チーム" : "相手チーム"}のオーダーを登録`); render();
    },
    resetGame() {
      state=initial();undoStack.length=0;persistGame();render();
    },
    swapDefense(side, firstPlayerId, secondPlayerId) {
      const team=side==="own"?0:1,slots=state.lineupSlots[team];
      const firstSlot=slots.find(slot=>slot.currentPlayerId===firstPlayerId),secondSlot=slots.find(slot=>slot.currentPlayerId===secondPlayerId);
      if(!firstSlot||!secondSlot)throw new Error("現在の打順にいる選手を指定してください");
      const appearance=id=>[...(state.appearances||[])].reverse().find(a=>a.playerId===id&&!a.exitedAt);
      const history=(slot,id)=>[...(slot.history||[])].reverse().find(h=>h.playerId===id||h.incomingPlayerId===id);
      const firstAppearance=appearance(firstPlayerId),secondAppearance=appearance(secondPlayerId);
      const firstNumber=String(firstAppearance?.defensiveNumber||history(firstSlot,firstPlayerId)?.defensiveNumber||""),secondNumber=String(secondAppearance?.defensiveNumber||history(secondSlot,secondPlayerId)?.defensiveNumber||"");
      if(!firstNumber||!secondNumber)throw new Error("両選手の守備番号を確認してください");
      save();const now={inning:state.inning,half:state.half,timestamp:new Date().toISOString()};
      if(firstAppearance)firstAppearance.defensiveNumber=secondNumber;if(secondAppearance)secondAppearance.defensiveNumber=firstNumber;
      firstSlot.history.push({playerId:firstPlayerId,type:"positionChange",defensiveNumber:secondNumber,...now});secondSlot.history.push({playerId:secondPlayerId,type:"positionChange",defensiveNumber:firstNumber,...now});
      state.substitutionEvents.push({id:`sub-${Date.now()}`,teamId:state.teams[team].id,type:"defenseSwap",firstPlayerId,secondPlayerId,fromPosition:firstNumber,toPosition:secondNumber,...now});state.log.push(`守備位置入替：${firstNumber}⇄${secondNumber}`);render();
    },
    substitute(event) {
      const team=event.side==="own"?0:1; const order=Number(event.battingOrder); const now={inning:state.inning,half:state.half,timestamp:new Date().toISOString()};
      if(event.type==="pinchRunner") {
        const base=Number(event.base); if(!base||!state.bases[base]) throw new Error("代走対象の走者がいません");
        if(event.outgoingPlayerId&&state.bases[base].playerId!==event.outgoingPlayerId) throw new Error("交代前選手が塁上走者と一致しません");
        const slot=state.lineupSlots[team][order-1],outgoing=state.appearances.findLast?.(a=>a.playerId===event.outgoingPlayerId&&!a.exitedAt),inheritedDefensiveNumber=String(outgoing?.defensiveNumber||"");
        save(); state.bases[base].playerId=event.incomingPlayerId; state.bases[base].name=playerById(event.incomingPlayerId)?.canonicalName||state.bases[base].name;
        if(slot){slot.currentPlayerId=event.incomingPlayerId;slot.history.push({outgoingPlayerId:event.outgoingPlayerId,incomingPlayerId:event.incomingPlayerId,type:event.type,...now});}
        if(outgoing)outgoing.exitedAt=now;
        state.appearances.push({playerId:event.incomingPlayerId,enteredAt:now,exitedAt:null,battingOrder:order,defensiveNumber:inheritedDefensiveNumber,defensivePositions:[]});
      } else {
        if(!order||order<1||order>9) throw new Error("打順を1～9で指定してください");
        const slot=state.lineupSlots[team][order-1]; save();
        if(event.type!=="positionChange"&&event.type!=="exit") slot.currentPlayerId=event.incomingPlayerId;
        slot.history.push({outgoingPlayerId:event.outgoingPlayerId,incomingPlayerId:event.incomingPlayerId,type:event.type,...now});
        const outgoing=state.appearances.findLast?.(a=>a.playerId===event.outgoingPlayerId&&!a.exitedAt);const inheritedDefensiveNumber=String(outgoing?.defensiveNumber||"");if(outgoing&&event.type!=="positionChange") outgoing.exitedAt=now;
        if(event.incomingPlayerId) state.appearances.push({playerId:event.incomingPlayerId,enteredAt:now,exitedAt:null,battingOrder:order,defensiveNumber:inheritedDefensiveNumber,defensivePositions:event.toPosition?[event.toPosition]:[]});
        if(inheritedDefensiveNumber==="1"&&event.incomingPlayerId){
          if(!state.pitchers[event.incomingPlayerId])state.pitchers[event.incomingPlayerId]={id:event.incomingPlayerId,name:playerById(event.incomingPlayerId)?.canonicalName||"投手",pitchCount:0};
          state.currentPitcherIds[team]=event.incomingPlayerId;
        }
        if(event.type==="pitcher") {
          if(!state.pitchers[event.incomingPlayerId]) state.pitchers[event.incomingPlayerId]={id:event.incomingPlayerId,name:playerById(event.incomingPlayerId)?.canonicalName||event.incomingPlayerId,pitchCount:0};
          state.currentPitcherIds[team]=event.incomingPlayerId;
          state.pitcherAppearances.push({playerId:event.incomingPlayerId,enteredAt:now,exitedAt:null,pitchesAtEntry:state.pitchers[event.incomingPlayerId].pitchCount,pitchesAtExit:null});
        }
      }
      state.substitutionEvents.push({id:`sub-${Date.now()}`,teamId:state.teams[team].id,...event,...now}); state.log.push(`選手交代：${event.type}`); render();
    }
  };
  setup();
})();

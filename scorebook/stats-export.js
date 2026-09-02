(() => {
  "use strict";

  const hitBases={"単打":1,"二塁打":2,"三塁打":3,"本塁打":4};
  const walkResults=new Set(["四球","死球"]);
  const sacrificeResults=new Set(["犠打","犠飛"]);
  const errorResults=new Set(["捕球エラー","送球エラー"]);
  const n=value=>Number(value)||0;
  const rate=(top,bottom)=>bottom?Number((top/bottom).toFixed(3)):"";
  const playerName=(state,id)=>state.players?.find(p=>p.id===id)?.canonicalName||state.pitchers?.[id]?.name||"選手不明";
  const playerNumber=(state,id)=>state.players?.find(p=>p.id===id)?.uniformNumber||"";
  const teamSide=(state,teamId)=>state.teams?.findIndex(t=>t.id===teamId);

  function empty(id,side,state){return {id,side,name:playerName(state,id),number:playerNumber(state,id),pa:0,ab:0,h:0,bbhbp:0,tb:0,sf:0,sb:0,pOuts:0,k:0,pBbhbp:0,r:0,er:0,chances:0,errors:0};}
  function get(map,id,side,state){const key=`${side}:${id||"unknown"}`;if(!map.has(key))map.set(key,empty(id||"unknown",side,state));return map.get(key);}
  function fallbackBatter(state,side,row){return state.lineupSlots?.[side]?.[row]?.currentPlayerId||`unknown-batter-${side}-${row}`;}
  function fallbackFielder(state,side,number){
    const found=[...(state.appearances||[])].reverse().find(a=>!a.exitedAt&&String(a.defensiveNumber||"")===String(number)&&teamSide(state,state.players?.find(p=>p.id===a.playerId)?.teamId)===side);
    return found?.playerId||`unknown-fielder-${side}-${number}`;
  }
  function build(state){
    const stats=new Map();
    (state.players||[]).forEach(p=>{const side=teamSide(state,p.teamId);if(side>=0)get(stats,p.id,side,state);});
    [0,1].forEach(side=>(state.lineupSlots?.[side]||[]).forEach(slot=>get(stats,slot.currentPlayerId,side,state)));

    [0,1].forEach(side=>(state.plateAppearances?.[side]||[]).forEach((slot,row)=>slot.forEach(pa=>{
      const score=pa.score||{};const batter=get(stats,score.batterPlayerId||fallbackBatter(state,side,row),side,state);const result=score.result;
      batter.pa++;if(!walkResults.has(result)&&!sacrificeResults.has(result))batter.ab++;
      if(hitBases[result]){batter.h++;batter.tb+=hitBases[result];}if(walkResults.has(result))batter.bbhbp++;if(result==="犠飛")batter.sf++;
      const steals=new Set((score.advances||[]).filter(a=>a.mark==="S").map(a=>a.pitchNumber||`${a.from}-${a.to}`));batter.sb+=steals.size;

      const defenseSide=side?0:1;const pitcherId=score.pitcherId||state.currentPitcherIds?.[defenseSide]||`unknown-pitcher-${defenseSide}`;const pitcher=get(stats,pitcherId,defenseSide,state);
      const decisions=score.decisions||[];const outCount=decisions.length?decisions.filter(d=>d.result==="OUT").length:(score.final==="out"?1:0);pitcher.pOuts+=outCount;
      if(result==="strikeout")pitcher.k++;if(walkResults.has(result))pitcher.pBbhbp++;

      const fielderIds=score.fielderPlayerIds||[];const involved=[...new Set((score.fielders||[]).map((num,i)=>fielderIds[i]||fallbackFielder(state,defenseSide,num)))];
      if(outCount||errorResults.has(result))involved.forEach(id=>get(stats,id,defenseSide,state).chances++);
      if(errorResults.has(result)&&involved.length)get(stats,involved[involved.length-1],defenseSide,state).errors++;
    })));

    (state.runEvents||[]).forEach(run=>{const offenseSide=run.half==="top"?0:1;const defenseSide=offenseSide?0:1;const p=get(stats,run.responsiblePitcherId||state.currentPitcherIds?.[defenseSide]||`unknown-pitcher-${defenseSide}`,defenseSide,state);p.r++;if(!/エラー|失策/.test(run.cause||""))p.er++;});
    return [...stats.values()].filter(s=>s.pa||s.pOuts||s.k||s.pBbhbp||s.r||s.chances||s.errors);
  }
  function totals(rows,side){return rows.filter(r=>r.side===side).reduce((a,r)=>{Object.keys(a).forEach(k=>a[k]+=n(r[k]));return a;},{pa:0,ab:0,h:0,bbhbp:0,tb:0,sf:0,sb:0,pOuts:0,k:0,pBbhbp:0,r:0,er:0,chances:0,errors:0});}
  const innings=outs=>`${Math.floor(outs/3)}.${outs%3}`;
  const dataValues=s=>[s.pa,s.h,s.bbhbp,s.ab,rate(s.h,s.ab),rate(s.tb,s.ab),rate(s.h+s.bbhbp,s.ab+s.bbhbp+s.sf),s.sb,innings(s.pOuts),s.k,s.pBbhbp,s.r,s.er,rate(s.er*27,s.pOuts),s.chances,s.errors,rate(s.errors,s.chances)];
  const metrics=["打席数","ヒット数","四死球数","打数","打率","長打率","出塁率","盗塁数","投球回数","奪三振数","投手四死球数","失点","自責点（暫定）","防御率（暫定）","守備機会数","エラー数","エラー率"];
  const cell=value=>{const text=String(value??"");return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;};
  function csv(state){
    const rows=build(state);const lines=[];lines.push("チーム集計");lines.push(["日付","チーム","対戦相手","得点","失点",...metrics].map(cell).join(","));
    [0,1].forEach(side=>{const t=totals(rows,side);lines.push([state.gameDate||"",state.teams?.[side]?.name||(side?"後攻":"先攻"),state.teams?.[side?0:1]?.name||"",state.scores?.[side]||0,state.scores?.[side?0:1]||0,...dataValues(t)].map(cell).join(","));});
    lines.push("");lines.push("選手別集計");lines.push(["日付","チーム","背番号","選手名",...metrics,"注記"].map(cell).join(","));
    rows.sort((a,b)=>a.side-b.side||String(a.number).localeCompare(String(b.number),"ja",{numeric:true})).forEach(s=>lines.push([state.gameDate||"",state.teams?.[s.side]?.name||"",s.number,s.name,...dataValues(s),"自責点はエラー原因の得点を除く暫定値"].map(cell).join(",")));
    return "\uFEFF"+lines.join("\r\n");
  }
  async function exportStats(){
    const state=window.ScorebookGame?.snapshot();if(!state)return;const content=csv(state);const safe=x=>String(x||"").replace(/[\\/:*?"<>|]/g,"-");const name=`試合データ-${safe(state.gameDate)}-${safe(state.teams?.[0]?.name)}-対-${safe(state.teams?.[1]?.name)}.csv`;const blob=new Blob([content],{type:"text/csv;charset=utf-8"});const file=new File([blob],name,{type:"text/csv"});
    try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:"試合データ出力"});return;}}catch(error){if(error.name==="AbortError")return;}
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);const status=document.querySelector("#status");if(status)status.textContent="チーム集計と選手別集計のCSVを出力しました";
  }
  document.querySelector("#exportStats")?.addEventListener("click",exportStats);
  window.ScorebookStatsExport={build,csv};
})();
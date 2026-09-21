(() => {
  "use strict";
  const $ = q => document.querySelector(q);
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
  const positions = ["投手","捕手","一塁手","二塁手","三塁手","遊撃手","左翼手","中堅手","右翼手","指名打者"];
  let teams = [], players = [], extraction = null, rosterExtraction = null, photoUrl = null, toastTimer = null;

  const normalize = value => (value || "").normalize("NFKC").toLowerCase().replace(/[\s・･.．]/g, "").replace(/[﨑]/g,"崎").replace(/[髙]/g,"高").replace(/[邊邉]/g,"辺").replace(/[ヵ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0)-0x60));
  function distance(a, b) {
    a = normalize(a); b = normalize(b);
    const row = Array.from({length:b.length+1}, (_,i)=>i);
    for (let i=1;i<=a.length;i++) { let prev=row[0]; row[0]=i; for(let j=1;j<=b.length;j++){ const old=row[j]; row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1)); prev=old; } }
    return row[b.length];
  }
  function candidates(row) {
    return players.filter(p=>p.active!==false).map(player => {
      const names = [player.canonicalName, player.nameKana, ...(player.aliases||[])];
      const best = Math.min(...names.map(name=>distance(row.playerNameRaw,name)));
      const exact = names.some(name=>normalize(name)===normalize(row.playerNameRaw));
      const numberMatch = row.uniformNumberRaw && String(player.uniformNumber)===String(row.uniformNumberRaw);
      let score = exact ? .92 : Math.max(.2, 1-best/Math.max(2,normalize(row.playerNameRaw).length));
      if (numberMatch) score = Math.min(1, score+.18);
      return {player, score, numberMatch};
    }).sort((a,b)=>b.score-a.score).slice(0,3);
  }
  function validExtraction(value) {
    return value && ["own","opponent"].includes(value.side) && Array.isArray(value.rows) && value.rows.length<=20 && value.rows.every(row => Number.isInteger(+row.battingOrder) && +row.battingOrder>=0 && +row.battingOrder<=9 && typeof row.playerNameRaw==="string" && Array.isArray(row.warnings));
  }
  function showPanel(id) { document.querySelectorAll(".management-panel").forEach(p=>p.hidden=p.id!==id); if(id) document.body.classList.add("panel-open"); else document.body.classList.remove("panel-open"); }
  function toast(text) { const status=$("#manageStatus");status.textContent=text;const order=$("#orderStatus");if(order&&!$("#orderPanel").hidden)order.textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if(status.textContent===text)status.textContent="";},3500); }
  function updateConfirmOrderState(){
    const button=$("#confirmOrder");if(!button)return;
    const starters=[...document.querySelectorAll('.extraction-row[data-order]:not([data-order="0"])')];
    const teamName=$("#orderTeamName")?.value.trim()||"";
    const valid=!!extraction&&!!teamName&&starters.length===9&&starters.every(el=>el.querySelector('[data-field="playerNameRaw"]').value.trim()&&el.querySelector('[data-field="uniformNumberRaw"]').value.trim()&&/^[1-9]$/.test(el.querySelector('[data-field="defensiveNumberRaw"]').value.trim()));
    button.disabled=!valid;
    const status=$("#orderStatus");if(status&&!valid)status.textContent="チーム名と先発9名の選手名・背番号・守備番号を入力してください";
  }

  async function load() {
    teams = await ScorebookStore.list("teams"); players = await ScorebookStore.list("players"); renderRoster();
  }
  function renderRoster() {
    const team = teams[0]; $("#teamName").value = team?.name || "";
    $("#rosterRows").innerHTML = players.map(p=>`<div class="roster-row" data-id="${p.id}"><b>${escapeHtml(p.uniformNumber||"-")}</b><span>${escapeHtml(p.canonicalName)}</span><small>${escapeHtml((p.preferredPositions||[]).join("・"))}</small><button data-edit-player="${p.id}">編集</button></div>`).join("") || "<p>選手はまだ登録されていません。</p>";
  }
  function escapeHtml(value){ const e=document.createElement("span"); e.textContent=value??""; return e.innerHTML; }
  async function saveTeam() {
    const name=$("#teamName").value.trim(); if(!name){toast("チーム名を入力してください");return;}
    const team=teams[0]||{id:uid("team")}; team.name=name; await ScorebookStore.put("teams",team); await load(); toast("チームを保存しました");
  }
  async function savePlayer(event) {
    event.preventDefault(); const f=new FormData(event.currentTarget); const id=f.get("id")||uid("player");
    const player={id,teamId:teams[0]?.id||"team-own",canonicalName:String(f.get("canonicalName")||"").trim(),nameKana:String(f.get("nameKana")||"").trim(),aliases:String(f.get("aliases")||"").split(/[,、\n]/).map(x=>x.trim()).filter(Boolean),uniformNumber:String(f.get("uniformNumber")||"").trim(),preferredPositions:f.getAll("positions"),active:true};
    if(!player.canonicalName){toast("正式氏名を入力してください");return;}
    await ScorebookStore.put("players",player); event.currentTarget.reset(); event.currentTarget.elements.id.value=""; await load(); toast("選手を保存しました");
  }
  function editPlayer(id) {
    const p=players.find(x=>x.id===id); if(!p)return; const f=$("#playerForm");
    f.elements.id.value=p.id; f.elements.canonicalName.value=p.canonicalName; f.elements.nameKana.value=p.nameKana||""; f.elements.aliases.value=(p.aliases||[]).join("、"); f.elements.uniformNumber.value=p.uniformNumber||"";
    [...f.elements.positions].forEach(x=>x.checked=(p.preferredPositions||[]).includes(x.value));
  }
  function downloadRoster() { ScorebookStore.exportAll().then(data=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="scorebook-roster.json";a.click();URL.revokeObjectURL(a.href);}); }
  async function importRoster(file) { try{await ScorebookStore.importAll(JSON.parse(await file.text()));await load();toast("名簿を読み込みました");}catch(e){toast(e.message);} }

  function rosterPrompt(){return `添付した野球チームの名簿PDFから選手情報を読み取ってください。推測で補わず、不明な値は空文字にしてください。説明やMarkdownのコード枠を付けず、次の形のJSONだけを返してください。\n{"teamName":"","players":[{"canonicalName":"","nameKana":"","aliases":[],"uniformNumber":"","preferredPositions":[],"active":true,"warnings":[]}]}\nplayersはPDFに記載された全選手です。preferredPositionsは投手、捕手、一塁手、二塁手、三塁手、遊撃手、左翼手、中堅手、右翼手、指名打者のいずれかを使ってください。氏名・背番号・守備位置を行ごとに対応させ、読めない箇所はwarningsへ理由を書いてください。`;}
  async function copyRosterPrompt(){try{await navigator.clipboard.writeText(rosterPrompt());toast("名簿読取の指示文をコピーしました");}catch{$("#rosterChatgptJson").value=rosterPrompt();toast("指示文を貼付け欄へ表示しました");}}
  function validRosterExtraction(value){return value&&typeof value.teamName==="string"&&Array.isArray(value.players)&&value.players.length<=100&&value.players.every(p=>typeof p.canonicalName==="string"&&typeof p.uniformNumber==="string"&&Array.isArray(p.preferredPositions||[])&&Array.isArray(p.aliases||[]));}
  function importRosterChatgptJson(){try{const raw=$("#rosterChatgptJson").value.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");rosterExtraction=JSON.parse(raw);if(!validRosterExtraction(rosterExtraction))throw new Error("JSON形式が正しくありません");renderRosterExtraction();toast("読取結果を読み込みました。全員を確認してください");}catch(error){toast(`読み込めません：${error.message}`);}}
  function updateJsonImportButtons(){const rosterButton=$("#importRosterChatgptJson");rosterButton.classList.add("json-import-action");rosterButton.disabled=!$("#rosterChatgptJson").value.trim();const orderButton=$("#importChatgptJson");orderButton.classList.add("json-import-action","clipboard-import-action");orderButton.disabled=orderButton.dataset.ready!=="true";}
  function renderRosterExtraction(){
    $("#rosterExtractionRows").innerHTML=`<label>読取チーム名<input id="rosterExtractedTeam" value="${escapeHtml(rosterExtraction.teamName)}"></label><div class="roster-extraction-heading"><b>背番号</b><b>選手名</b><b>かな</b><b>主な守備</b></div>`+rosterExtraction.players.map((p,i)=>`<div class="roster-extraction-row" data-roster-row="${i}"><input aria-label="背番号" inputmode="numeric" data-roster-field="uniformNumber" value="${escapeHtml(p.uniformNumber)}"><input aria-label="選手名" data-roster-field="canonicalName" value="${escapeHtml(p.canonicalName)}"><input aria-label="氏名かな" data-roster-field="nameKana" value="${escapeHtml(p.nameKana||"")}"><input aria-label="主な守備位置" data-roster-field="preferredPositions" value="${escapeHtml((p.preferredPositions||[]).join("、"))}"><small class="warning">${escapeHtml((p.warnings||[]).join("／"))}</small></div>`).join("");
    $("#confirmRosterExtraction").hidden=false;
  }
  async function confirmRosterExtraction(){
    const rows=[...document.querySelectorAll("[data-roster-row]")].map(el=>({canonicalName:el.querySelector('[data-roster-field="canonicalName"]').value.trim(),nameKana:el.querySelector('[data-roster-field="nameKana"]').value.trim(),uniformNumber:el.querySelector('[data-roster-field="uniformNumber"]').value.trim(),preferredPositions:el.querySelector('[data-roster-field="preferredPositions"]').value.split(/[,、]/).map(x=>x.trim()).filter(Boolean)}));
    if(!rows.length||rows.some(p=>!p.canonicalName)){toast("選手名が空欄の行を確認してください");return;}
    const teamName=$("#rosterExtractedTeam").value.trim();let team=teams[0]||{id:uid("team")};if(teamName)team.name=teamName;await ScorebookStore.put("teams",team);
    for(const row of rows){const existing=players.find(p=>(row.uniformNumber&&String(p.uniformNumber)===row.uniformNumber)||normalize(p.canonicalName)===normalize(row.canonicalName));await ScorebookStore.put("players",{id:existing?.id||uid("player"),teamId:team.id,canonicalName:row.canonicalName,nameKana:row.nameKana,aliases:existing?.aliases||[],uniformNumber:row.uniformNumber,preferredPositions:row.preferredPositions,active:true});}
    await load();toast(`${rows.length}名を名簿へ登録しました`);
  }

  async function handlePhoto(file) {
    if(!file)return; if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>10*1024*1024){toast("JPEG・PNG・WebP（10MB以下）を選択してください");return;}
    if(photoUrl)URL.revokeObjectURL(photoUrl); photoUrl=URL.createObjectURL(file); $("#orderPreview").src=photoUrl; $("#orderPreview").hidden=false;
    const copyButton=$("#copyPrompt"),shareButton=$("#shareOrderImage"),importButton=$("#importChatgptJson");
    orderImage.closest(".file-button").classList.remove("next-action");
    importButton.dataset.ready="false";updateJsonImportButtons();shareButton.disabled=true;copyButton.hidden=true;
    try{await navigator.clipboard.writeText(chatgptPrompt());shareButton.disabled=false;shareButton.classList.add("next-action");toast("撮影できました。次は②「生成AIへ共有」を押してください");}
    catch{copyButton.hidden=false;copyButton.disabled=false;copyButton.textContent="指示文をコピーして次へ";copyButton.classList.add("next-action");toast("指示文を自動コピーできませんでした。このボタンを押してください");}
  }
  function blankExtraction() { const side=$("input[name=orderSide]:checked").value; return {teamNameRaw:side==="own"?(teams[0]?.name||""):"",side,rows:Array.from({length:20},(_,i)=>({battingOrder:i<9?i+1:0,playerNameRaw:"",uniformNumberRaw:"",defensiveNumberRaw:"",positionRaw:"",confidence:1,warnings:[]})),overallConfidence:1,imageWarnings:[]}; }
  function startManualOrder(){extraction=blankExtraction();renderExtraction();$("#imageWarnings").textContent="手入力モード：先発9名＋ベンチ11名（合計20名）を入力できます";toast("20名分の手入力表を作成しました");}
  function chatgptPrompt(){const side=$("input[name=orderSide]:checked").value;return `野球のオーダー票を読み取り、元のスコアブックアプリへ戻るまで、利用者を短い日本語で順番に案内してください。操作案内と読取結果を同じ回答へ混ぜないでください。\n\nまだ写真が添付されていない場合は、次の文章だけを表示し、写真が送られるまで待ってください。\n「入力欄の＋を押し、カメラを選んでオーダー票を撮影してください。撮影後、そのまま写真のみを送信していただければ、アプリに貼り付けるための表を返します。表が表示されたら、その回答をそのままコピーし、元のスコアブックアプリへ戻って『② 回答を取り込む』を押してください。」\n\n写真が届いたら追加の指示を求めず、直ちに読み取ってください。先発9名に加え、記載があればベンチ入りメンバーも含め最大20名を読み取ってください。推測で空欄を埋めず、読めない値は空欄にして警告列へ理由を書いてください。\n\n写真を受け取った回答はJSONにせず、必ず次のタブ区切りマトリックス（TSV）だけを返してください。説明、挨拶、注釈、Markdown表、コード枠は付けないでください。各項目の間には空白ではなくタブ文字を1個入れてください。\nTEAM\t読み取ったチーム名\nSIDE\t${side}\n打順\t選手名\t背番号\t守備番号\t確信度\t警告\n1\t山田 太郎\t7\t6\t0.90\t\n0\t佐藤 次郎\t12\t\t0.70\t氏名の一部が不鮮明\n\n先発選手の打順は1～9、控え選手は0にしてください。守備番号は先発だけ1～9、控え選手は空欄にしてください。確信度は0～1の小数にしてください。選手1名につき必ず1行とし、列を増減・並べ替えないでください。セル内にタブや改行を入れないでください。写真全体の注意事項は、該当する選手の警告列へ簡潔に記載してください。回答の1行目をTEAM、2行目をSIDE、3行目を見出しにし、それ以外の文字を前後へ追加しないでください。`;}
  async function copyPrompt(){try{await navigator.clipboard.writeText(chatgptPrompt());$("#copyPrompt").hidden=true;$("#shareOrderImage").disabled=false;$("#shareOrderImage").classList.add("next-action");toast("コピーしました。次は②「生成AIへ共有」を押してください");}catch{toast("コピーできませんでした。ブラウザのクリップボード許可を確認してください");}}
  async function launchChatgptOrderReader(){const sessionId=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`,url=`https://chatgpt.com/?temporary-chat=true&scorebook-session=${encodeURIComponent(sessionId)}`,opened=window.open(url,"_blank","noopener,noreferrer"),button=$("#importChatgptJson");button.dataset.ready="true";button.classList.add("next-action");updateJsonImportButtons();try{await navigator.clipboard.writeText(chatgptPrompt());toast("新しいChatGPTを開きました。指示文を貼り付け、ChatGPT内のカメラで撮影してください");}catch{toast(opened?"新しいChatGPTを開きました。指示文のコピーを許可してください":"ChatGPTを開けませんでした");}}
  async function importOrderFromClipboard(){const field=$("#chatgptJson"),label=field.closest("label");if(field.value.trim()){importChatgptJson();return;}try{const text=(await navigator.clipboard.readText()).trim();if(!text)throw new Error();field.value=text;importChatgptJson();}catch{label.hidden=false;field.focus();toast("自動取得が許可されませんでした。ここへ回答を貼り付けると、自動で読み込みます");}}
  async function shareOrderImage(){const file=$("#orderImage").files[0];if(!file)return;try{if(!navigator.share||!navigator.canShare?.({files:[file]}))throw new Error("この端末では写真共有を利用できません");try{await navigator.clipboard.writeText(chatgptPrompt());}catch{}await navigator.share({files:[file],title:"野球オーダー票",text:chatgptPrompt()});$("#shareOrderImage").classList.remove("next-action");const button=$("#importChatgptJson");button.dataset.ready="true";button.classList.add("next-action");updateJsonImportButtons();toast("画像を読める生成AIで指示文を貼り付けて送信し、回答をコピーして戻ってきてください");}catch(error){if(error.name!=="AbortError")toast(`${error.message}。画像を読める生成AIで写真を添付してください`);}}
  function parseOrderMatrix(raw){const lines=raw.replace(/^```[^\n]*\n?/i,"").replace(/```\s*$/i,"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);const teamLine=lines.find(line=>/^TEAM\t/i.test(line)),sideLine=lines.find(line=>/^SIDE\t/i.test(line)),headerIndex=lines.findIndex(line=>/^打順\t選手名\t背番号\t守備番号\t確信度\t警告$/.test(line));if(!teamLine||!sideLine||headerIndex<0)return null;const rows=[];for(const line of lines.slice(headerIndex+1)){const columns=line.split("\t");if(columns.length<5)continue;const battingOrder=Number(columns[0]);if(!Number.isInteger(battingOrder)||battingOrder<0||battingOrder>9)continue;rows.push({battingOrder,playerNameRaw:(columns[1]||"").trim(),uniformNumberRaw:(columns[2]||"").trim(),defensiveNumberRaw:(columns[3]||"").trim(),confidence:Number(columns[4])||0,warnings:(columns.slice(5).join(" ").trim()?[columns.slice(5).join(" ").trim()]:[])});if(rows.length===20)break;}if(!rows.length)return null;return {teamNameRaw:teamLine.split("\t").slice(1).join(" ").trim(),side:sideLine.split("\t")[1]?.trim(),rows,overallConfidence:rows.reduce((sum,row)=>sum+row.confidence,0)/rows.length,imageWarnings:[]};}
  function importChatgptJson(){try{const source=$("#chatgptJson").value.trim();extraction=parseOrderMatrix(source);if(!extraction){let raw=source.replace(/[“”]/g,'"').replace(/[‘’]/g,"'"),start=raw.indexOf("{"),end=raw.lastIndexOf("}");if(start<0||end<start)throw new Error();raw=raw.slice(start,end+1);try{extraction=JSON.parse(raw);}catch{const repaired=raw.replace(/\\"/g,'"').replace(/\\([\[\]])/g,"$1");extraction=JSON.parse(repaired);}if(Array.isArray(extraction?.rows))extraction.rows=extraction.rows.map(row=>({...row,warnings:Array.isArray(row.warnings)?row.warnings:row.warnings?[String(row.warnings)]:[]}));if(extraction&&!Array.isArray(extraction.imageWarnings))extraction.imageWarnings=extraction.imageWarnings?[String(extraction.imageWarnings)]:[];}if(!validExtraction(extraction)||extraction.side!==$("input[name=orderSide]:checked").value)throw new Error();renderExtraction();$("#chatgptJson").closest("label").hidden=true;toast("表を読み込みました。内容を確認してください");}catch{toast("回答の表を読み取れませんでした。ChatGPTの回答全体をもう一度コピーしてください");}}
  function renderExtraction() {
    $("#imageWarnings").textContent=(extraction.imageWarnings||[]).join("／");
    $("#extractionRows").innerHTML=`<label class="order-team-name">チーム名<input id="orderTeamName" value="${escapeHtml(extraction.teamNameRaw||"")}"></label><div class="extraction-heading"><b>区分</b><b>選手名</b><b>背番号</b><b>守備番号</b></div>`+extraction.rows.map((row,i)=>{const starter=+row.battingOrder>0;const label=starter?`${row.battingOrder}番`:`控${i-8}`;const choices=extraction.side==="own"&&row.playerNameRaw?candidates(row):[];const ambiguous=choices.length>1&&choices[0].score-choices[1].score<.12;const conflict=choices[0]&&row.uniformNumberRaw&&!choices[0].numberMatch;const warning=[...(row.warnings||[]),...(ambiguous?["候補が接近しています"]:[]),...(conflict?["背番号と氏名候補が矛盾"]:[])];const defensive=row.defensiveNumberRaw||({投手:"1",捕手:"2",一塁手:"3",二塁手:"4",三塁手:"5",遊撃手:"6",左翼手:"7",中堅手:"8",右翼手:"9"}[row.positionRaw]||"");return `<div class="extraction-row" data-row="${i}" data-order="${row.battingOrder}"><b>${label}</b><input aria-label="${label} 選手名" placeholder="選手名" data-field="playerNameRaw" value="${escapeHtml(row.playerNameRaw)}"><input aria-label="${label} 背番号" placeholder="背番号" inputmode="numeric" data-field="uniformNumberRaw" value="${escapeHtml(row.uniformNumberRaw)}"><input aria-label="${label} 守備番号" placeholder="${starter?"1～9":"－"}" inputmode="numeric" pattern="[1-9]" maxlength="1" data-field="defensiveNumberRaw" value="${escapeHtml(defensive)}" ${starter?"":"disabled"}>${choices.length?`<select data-field="matchedPlayerId"><option value="">候補を確認</option>${choices.map(c=>`<option value="${c.player.id}" ${c.score>=.88&&!ambiguous&&!conflict?"selected":""}>${escapeHtml(c.player.canonicalName)} (${Math.round(c.score*100)}%)</option>`).join("")}</select>`:""}<small class="warning">${escapeHtml(warning.join("／"))}</small></div>`;}).join("");updateConfirmOrderState();
  }
  function confirmOrder() {
    if($("#confirmOrder").disabled)return;
    extraction.teamNameRaw=$("#orderTeamName").value.trim();
    const positionNames={1:"投手",2:"捕手",3:"一塁手",4:"二塁手",5:"三塁手",6:"遊撃手",7:"左翼手",8:"中堅手",9:"右翼手"};
    const rows=[...document.querySelectorAll(".extraction-row")].map(el=>{const defensiveNumberRaw=el.querySelector('[data-field="defensiveNumberRaw"]').value.trim();return {battingOrder:+el.dataset.order,playerNameRaw:el.querySelector('[data-field="playerNameRaw"]').value.trim(),uniformNumberRaw:el.querySelector('[data-field="uniformNumberRaw"]').value.trim(),defensiveNumberRaw,positionRaw:positionNames[defensiveNumberRaw]||"",matchedPlayerId:el.querySelector('[data-field="matchedPlayerId"]')?.value||null};}).filter(r=>r.battingOrder>0||r.playerNameRaw);
    const incomplete=rows.filter(r=>r.battingOrder>0&&(!r.playerNameRaw||!/^[1-9]$/.test(r.defensiveNumberRaw))); if(incomplete.length){toast(`${incomplete.map(r=>r.battingOrder+"番").join("、")}の選手名・守備番号を確認してください`);return;}
    window.ScorebookGame?.setLineup(extraction.side,rows,extraction.teamNameRaw||""); toast("確認済みオーダーを試合へ登録しました"); showPanel(null);
  }
  function resolvePlayerReference(side,type,value){
    const state=window.ScorebookGame?.snapshot();if(!state)throw new Error("試合情報を取得できません");
    const team=side==="own"?0:1,teamId=state.teams[team].id,number=String(value||"").trim();if(!number)throw new Error("選手を特定する番号を入力してください");
    if(type==="base"){
      const base=Number(number);if(base<1||base>3)throw new Error("塁は1～3で入力してください");const runner=state.bases[base];if(!runner?.playerId)throw new Error(`${base}塁に走者がいません`);const battingOrder=state.lineupSlots[team].findIndex(slot=>slot.currentPlayerId===runner.playerId)+1;return {id:runner.playerId,battingOrder:battingOrder||null,base};
    }
    if(type==="battingOrder"){
      const order=Number(number);if(order<1||order>9)throw new Error("打順は1～9で入力してください");
      const id=state.lineupSlots[team][order-1]?.currentPlayerId;if(!id)throw new Error(`${order}番の選手が登録されていません`);return {id,battingOrder:order};
    }
    let matches=[];
    if(type==="uniformNumber")matches=state.players.filter(p=>p.teamId===teamId&&String(p.uniformNumber||"")===number);
    else matches=state.lineupSlots[team].filter(slot=>{const id=slot.currentPlayerId;const appearance=[...(state.appearances||[])].reverse().find(a=>a.playerId===id&&!a.exitedAt);const history=[...(slot.history||[])].reverse().find(h=>h.playerId===id||h.incomingPlayerId===id);return String(appearance?.defensiveNumber||history?.defensiveNumber||"")===number;}).map(slot=>state.players.find(p=>p.id===slot.currentPlayerId)).filter(Boolean);
    if(matches.length!==1)throw new Error(matches.length?"同じ番号の選手が複数います。別の指定方法を選んでください":"該当する選手が見つかりません");
    const battingOrder=state.lineupSlots[team].findIndex(slot=>slot.currentPlayerId===matches[0].id)+1;return {id:matches[0].id,battingOrder:battingOrder||null};
  }
  function submitSubstitution(event) {
    event.preventDefault();const f=new FormData(event.currentTarget),data=Object.fromEntries(f);try{
      const outgoing=resolvePlayerReference(data.side,data.outgoingLookupType,data.outgoingLookupValue);
      const incoming=resolvePlayerReference(data.side,data.incomingLookupType,data.incomingLookupValue);
      if(incoming&&incoming.id===outgoing.id)throw new Error("交代前と交代後に同じ選手は指定できません");
      if(data.outgoingLookupType==="defensiveNumber"&&data.incomingLookupType==="defensiveNumber")window.ScorebookGame?.swapDefense(data.side,outgoing.id,incoming.id);
      else{data.type=data.outgoingLookupType==="base"?"pinchRunner":"defense";data.base=outgoing.base||"";data.outgoingPlayerId=outgoing.id;data.incomingPlayerId=incoming.id;data.battingOrder=outgoing.battingOrder||data.battingOrder;window.ScorebookGame?.substitute(data);}
      toast("交代を記録しました");showPanel(null);
    }catch(e){toast(e.message);}
  }
  function setup(){
    const orderWorkflow=$("#chatgptWorkflow"),orderSteps=orderWorkflow.querySelector(".order-steps"),orderImage=$("#orderImage"),copyOrderPrompt=$("#copyPrompt"),openChatgpt=orderWorkflow.querySelector('.chatgpt-actions a[href*="chatgpt.com"]');
    $("#showChatgptSteps").textContent="ChatGPTで読取";
    const methods=$("#orderPanel .order-methods"),manualButton=$("#startManualOrder"),aiButton=$("#showChatgptSteps");
    methods.innerHTML="";
    [[manualButton,"アカウント・通信・画像送信不要","manual-method"],[aiButton,"自動で氏名・守備を取り込む","ai-method"]].forEach(([button,caption,className])=>{const option=document.createElement("div");option.className=`order-method-option ${className}`;option.append(button);const note=document.createElement("small");note.textContent=caption;option.append(note);methods.append(option);});
    const selectOrderMethod=button=>{methods.querySelectorAll(".order-method-option").forEach(option=>{const selected=option.contains(button);option.classList.toggle("selected",selected);option.querySelector("button").setAttribute("aria-pressed",String(selected));});};
    if(methods.nextElementSibling)methods.nextElementSibling.hidden=true;
    const workflowClose=document.createElement("button");workflowClose.type="button";workflowClose.id="closeChatgptWorkflow";workflowClose.className="workflow-close";workflowClose.textContent="× 閉じる";orderWorkflow.prepend(workflowClose);
    const workflowTitle=document.createElement("h3");workflowTitle.textContent="ChatGPTで読み取る手順";workflowClose.after(workflowTitle);
    orderWorkflow.querySelector(".privacy-note").textContent="写真は利用者自身がChatGPTへ送信します。運営者のサーバーへは送信しません。撮影・送信前に必要な同意を確認してください。";
    orderSteps.innerHTML="<li><b>①を押すと、指示文がコピーされ、新しい一時チャットが開きます。</b></li><li>開いたChatGPTの入力欄を長押しし、<b>「ペースト」→「送信」</b>を押します。</li><li>ChatGPTの案内どおりに撮影し、<b>写真だけを送信</b>します。</li><li>自動で返された<b>表形式の回答</b>をコピーしてこの画面へ戻り、<b>② 回答を取り込む</b>を押します。</li>";
    orderImage.closest(".file-button").hidden=true;$("#orderPreview").hidden=true;
    copyOrderPrompt.hidden=false;copyOrderPrompt.disabled=false;copyOrderPrompt.textContent="① 指示文をコピーして新しいChatGPTを開く";copyOrderPrompt.classList.add("next-action");openChatgpt.hidden=true;
    const pasteGuide=document.createElement("p");pasteGuide.className="paste-guide";pasteGuide.innerHTML="<b>次の画面ですること</b><br>ChatGPTの入力欄を長押し →「ペースト」→「送信」";copyOrderPrompt.closest(".chatgpt-actions").before(pasteGuide);
    const shareButton=$("#shareOrderImage");shareButton.hidden=true;
    const jsonLabel=$("#chatgptJson").closest("label");jsonLabel.firstChild.textContent="ChatGPTの回答を貼り付け";jsonLabel.hidden=true;const importButton=$("#importChatgptJson");importButton.textContent="② 回答を取り込む";importButton.dataset.ready="false";
    const sideLabels=[...document.querySelectorAll("#orderPanel .side-choice label")];if(sideLabels[0])sideLabels[0].lastChild.textContent="先攻";if(sideLabels[1])sideLabels[1].lastChild.textContent="後攻";
    const orderStatus=document.createElement("p");orderStatus.id="orderStatus";orderStatus.setAttribute("role","status");$("#confirmOrder").after(orderStatus);$("#confirmOrder").disabled=true;$("#extractionRows").addEventListener("input",updateConfirmOrderState);
    $("#substitutionForm").innerHTML=`<label>チーム<select name="side"><option value="own">先攻</option><option value="opponent">後攻</option></select></label><fieldset><legend>交代前選手</legend><label>指定方法<select name="outgoingLookupType"><option value="defensiveNumber">守備番号</option><option value="battingOrder">打順</option><option value="base">塁（代走のみ）</option><option value="uniformNumber">背番号</option></select></label><label>番号<input name="outgoingLookupValue" inputmode="numeric" required></label></fieldset><fieldset><legend>交代後選手</legend><label>指定方法<select name="incomingLookupType"><option value="defensiveNumber">守備番号</option><option value="battingOrder">打順</option><option value="uniformNumber">背番号</option></select></label><label>番号<input name="incomingLookupValue" inputmode="numeric" required></label></fieldset><button type="submit">交代を記録</button>`;
    $("#positionChoices").innerHTML=positions.map(p=>`<label><input type="checkbox" name="positions" value="${p}">${p}</label>`).join("");
    document.querySelectorAll("[data-open-panel]").forEach(b=>b.onclick=()=>showPanel(b.dataset.openPanel)); document.querySelectorAll("[data-close-panel]").forEach(b=>b.onclick=()=>showPanel(null));
    $("#saveTeam").onclick=saveTeam; $("#playerForm").onsubmit=savePlayer; $("#rosterRows").onclick=e=>{if(e.target.dataset.editPlayer)editPlayer(e.target.dataset.editPlayer);};
    $("#rosterChatgptJson").addEventListener("input",updateJsonImportButtons); $("#chatgptJson").addEventListener("input",updateJsonImportButtons);$("#chatgptJson").addEventListener("paste",()=>setTimeout(()=>{if($("#chatgptJson").value.trim())importChatgptJson();},0)); updateJsonImportButtons();
    $("#exportRoster").onclick=downloadRoster; $("#importRoster").onchange=e=>importRoster(e.target.files[0]); $("#showRosterPdfSteps").onclick=()=>{$("#rosterPdfWorkflow").hidden=false;toast("PDFを選択し、番号順に操作してください");}; $("#rosterPdf").onchange=e=>{const file=e.target.files[0];if(!file)return;if(file.type!=="application/pdf"||file.size>20*1024*1024){toast("20MB以下のPDFを選択してください");e.target.value="";return;}$("#rosterPdfName").textContent=`選択済み：${file.name}`;$("#copyRosterPrompt").disabled=false;toast("PDFを確認しました。次に指示文をコピーします");}; $("#copyRosterPrompt").onclick=copyRosterPrompt; $("#importRosterChatgptJson").onclick=importRosterChatgptJson; $("#confirmRosterExtraction").onclick=confirmRosterExtraction; $("#startManualOrder").onclick=startManualOrder; $("#showChatgptSteps").onclick=()=>{$("#chatgptWorkflow").hidden=false;toast("番号順に操作してください");}; $("#orderImage").onchange=e=>handlePhoto(e.target.files[0]); $("#copyPrompt").onclick=copyPrompt; $("#shareOrderImage").onclick=shareOrderImage; $("#importChatgptJson").onclick=importChatgptJson; $("#confirmOrder").onclick=confirmOrder; $("#substitutionForm").onsubmit=submitSubstitution;
    $("#startManualOrder").onclick=()=>{selectOrderMethod(manualButton);startManualOrder();};
    $("#showChatgptSteps").onclick=()=>{selectOrderMethod(aiButton);$("#chatgptWorkflow").hidden=false;toast("表示された順番で操作してください");};
    $("#closeChatgptWorkflow").onclick=()=>{$("#chatgptWorkflow").hidden=true;};
    $("#copyPrompt").onclick=launchChatgptOrderReader;$("#importChatgptJson").onclick=importOrderFromClipboard;
    load().catch(e=>toast(`保存領域を開けません：${e.message}`));
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",setup):setup();
})();

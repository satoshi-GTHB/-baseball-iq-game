(()=>{
const field=document.querySelector("#lesson-field"),fieldCard=document.querySelector(".field-card"),title=document.querySelector("#demo-title"),kicker=document.querySelector("#demo-kicker"),caption=document.querySelector("#demo-caption"),leadAction=document.querySelector("#lead-action"),leadPlayStart=document.querySelector("#lead-play-start"),leadHelp=document.querySelector("#lead-help"),boardBat=field.querySelector(".board-bat");
const demos={
"batter-infield":{k:"バッター",t:"内野への打球＝かけぬけ",c:"ゴロでもフライでも内野への打球では、1塁の先まで走り続ける。",result:"ギリギリ セーフ！",delay:4300,receive:"first"},
"batter-outfield":{k:"バッター",t:"外野への打球＝オーバーラン",c:"1塁までの途中でふくらみ、1塁ベースを踏みながら2塁へ向かう。間に合わなければ急ブレーキして1塁へ戻る。",result:"1塁へ戻る",delay:9000},
"check-runners":{k:"ランナー｜最初に確認",t:"後ろのランナーが詰まっている",c:"青いバッターランナーが後ろから来るため、赤い1塁ランナーは2塁へ進みます。",result:"前へ進む",delay:4800},
"check-outs":{k:"ランナー｜最初に確認",t:"2アウトは打球と同時にゴー",c:"2アウト。投球から打球が飛んだ瞬間に、1塁ランナーが2塁へ走ります。",result:"打球と同時にゴー！",delay:4500},
"check-sign":{k:"ランナー｜最初に確認",t:"監督から盗塁の指示",c:"監督の盗塁指示を確認。ピッチャーの投球と同時に1塁からスタートします。",result:"スタート成功！",delay:4200},
"secondary-lead":{k:"",t:"２次リード",c:"投球と同時に「２次リード/ハーフウェイ」を押し、最初のリードからさらに2〜3歩進みます。"},
"judge-first-short":{k:"ランナー｜状況判断",t:"1塁ランナー・ショートゴロ",c:"1塁ランナーは、２次リードのあと、ゴロなら必ず進まなければいけません。",result:"2塁アウト！",delay:7200,receive:"second"},
"judge-second-short":{k:"ランナー｜状況判断",t:"2塁ランナー・ショートゴロ",c:"１塁ランナーがいません。２次リード後、目の前のショートへのゴロ。無理にゴーせず、2塁へ戻ります。",result:"2塁セーフ／1塁アウト！",delay:7200,receive:"first"},
"judge-second-left-fly":{k:"ランナー｜状況判断",t:"2塁ランナー・レフトフライ",c:"２次リードの後、フライが上がったのを見て2塁へ戻ります。キャッチするレフトは３塁にちかいので、ゴーはしません。",result:"2塁セーフ！",delay:7600,receive:"second"},
"judge-third-left-tag":{k:"ランナー｜状況判断",t:"3塁ランナー・レフトフライ",c:"２次リードの後に３塁へ戻り、レフトのキャッチ後にタッチアップ。返球より先にホームへ入ります。",result:"ホームイン！ セーフ！",delay:8200,receive:"catcher"},
"judge-second-passed":{k:"ランナー｜状況判断",t:"2塁ランナー・パスボール",c:"２次リードの後、キャッチャーが投球を後ろへそらしたのを見て、３塁をねらって一気に進みます。",result:"3塁セーフ！",delay:6000}
};
let current="batter-infield",timers=[],pitchReleased=false,leadPlayActive=false,leadFailed=false;const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
function clearField(){timers.forEach(clearTimeout);timers=[];pitchReleased=false;leadPlayActive=false;leadFailed=false;boardBat.getAnimations().forEach(animation=>animation.cancel());boardBat.style.transform="rotate(15deg)";field.className="field gallery-field runner-motion-field motion-v2";fieldCard.classList.remove("lead-mode");field.querySelectorAll(".runner-dot,.gallery-ball,.fielder").forEach(n=>n.removeAttribute("style"));field.querySelectorAll(".fielder").forEach(n=>n.classList.remove("is-receiving","is-moving"));field.querySelectorAll(".other-runner").forEach(n=>n.style.display="none");field.querySelectorAll(".runner-bso-dot").forEach(n=>n.classList.remove("is-on"));field.querySelector(".play-result-call").textContent="";field.querySelector(".manager-sign").style.display="none";leadAction.disabled=true;leadPlayStart.disabled=false;if(leadHelp)leadHelp.textContent="「プレー開始」を押してください。"}
function playBatterSwing(id){const infield=id==="batter-infield",duration=infield?4300:9000,contact=infield?.25:.13,windup=infield?.18:.08,reset=infield?.32:.18;boardBat.animate([{transform:"rotate(15deg)",offset:0},{transform:"rotate(15deg)",offset:windup},{transform:"rotate(-45deg)",offset:contact},{transform:"rotate(15deg)",offset:reset},{transform:"rotate(15deg)",offset:1}],{duration,easing:"linear",fill:"forwards"})}
function configure(id){const self=field.querySelector(".self-runner"),other=field.querySelector(".other-a");if(["check-runners","check-outs","check-sign","judge-first-short"].includes(id)){self.style.left="75%";self.style.top="60%"}if(id==="secondary-lead"){self.style.left="70%";self.style.top="54.2%"}if(["judge-second-short","judge-second-left-fly","judge-second-passed"].includes(id)){self.style.left="50%";self.style.top="31%"}if(id==="judge-third-left-tag"){self.style.left="25%";self.style.top="60%"}if(["batter-infield","batter-outfield"].includes(id)){self.style.left="50%";self.style.top="89%"}if(["check-runners","judge-first-short","judge-second-short","judge-second-left-fly","judge-third-left-tag"].includes(id)){other.style.display="grid";other.style.left="50%";other.style.top="89%"}if(id==="check-outs"){field.querySelector(".o1dot").classList.add("is-on");field.querySelector(".o2dot").classList.add("is-on")}if(id==="check-sign"){field.querySelector(".manager-sign").style.display="flex"}}
function play(id,scrollDemo=true){
  current=id;const d=demos[id];clearField();configure(id);
  kicker.textContent=d.k;title.textContent=d.t;caption.textContent=d.c;
  if(id==="secondary-lead"){
    fieldCard.classList.add("lead-mode");const self=field.querySelector(".self-runner");self.style.left="75%";self.style.top="60%";leadAction.disabled=true;leadPlayStart.disabled=false;leadHelp.textContent="「プレー開始」を押してください。";if(scrollDemo)field.scrollIntoView({behavior:"smooth",block:"center"});return;
  }else{
    requestAnimationFrame(()=>requestAnimationFrame(()=>field.classList.add("playing","demo-"+id)));
    if(id==="batter-infield"||id==="batter-outfield")playBatterSwing(id);
    later(()=>field.querySelector(".pitcher").classList.add("is-moving"),300);
    if(id==="batter-outfield"){
      later(()=>field.querySelector(".left").classList.add("is-receiving"),3600);
      later(()=>field.querySelector(".short").classList.add("is-receiving"),5700);
      later(()=>field.querySelector(".left").classList.remove("is-receiving"),5900);
      later(()=>field.querySelector(".short").classList.remove("is-receiving"),8500);
    }else{
      if(id.includes("short"))later(()=>field.querySelector(".short").classList.add("is-receiving"),3500);
      if(id.includes("left"))later(()=>field.querySelector(".left").classList.add("is-receiving"),4300);
    }
    if(d.receive)later(()=>field.querySelector("."+d.receive).classList.add("is-receiving"),d.delay-1100);
    if(d.result)later(()=>{field.querySelector(".play-result-call").textContent=d.result},d.delay);
  }
  if(scrollDemo)field.scrollIntoView({behavior:"smooth",block:"center"});
}
leadPlayStart.addEventListener("click",()=>{clearField();configure("secondary-lead");current="secondary-lead";fieldCard.classList.add("lead-mode");const self=field.querySelector(".self-runner");self.style.left="75%";self.style.top="60%";leadPlayActive=true;leadPlayStart.disabled=true;leadAction.disabled=false;leadHelp.textContent="まずリード。ピッチャーが投げるまでよく見よう。";requestAnimationFrame(()=>requestAnimationFrame(()=>field.classList.add("initial-lead")));later(()=>{if(leadFailed||!leadPlayActive)return;pitchReleased=true;self.style.left="70%";self.style.top="54.2%";field.classList.remove("initial-lead");field.classList.add("playing","demo-secondary-lead");leadHelp.textContent="投球開始！ 今、二次リード。"},2000)});
leadAction.addEventListener("click",()=>{if(leadAction.disabled||!leadPlayActive)return;if(!pitchReleased){leadFailed=true;leadPlayActive=false;timers.forEach(clearTimeout);timers=[];const self=field.querySelector(".self-runner");self.style.left="70%";self.style.top="54.2%";field.classList.remove("initial-lead","playing","demo-secondary-lead");field.classList.add("pickoff-out");leadAction.disabled=true;leadHelp.textContent="早すぎる！ 二次リードしたランナーへ、ピッチャーが1塁けん制。";later(()=>field.querySelector(".first").classList.add("is-receiving"),750);later(()=>{field.querySelector(".play-result-call").textContent="アウト！";leadPlayStart.disabled=false;leadHelp.textContent="投球より早い二次リードは、けん制でアウト。もう一度やってみよう。"},1100);return}leadPlayActive=false;field.classList.add("lead-pressed");leadAction.disabled=true;leadHelp.textContent="投球と同時に、二次リード！";later(()=>{leadPlayStart.disabled=false;leadHelp.textContent="正しいタイミングです。もう一度見るときは「プレー開始」。"},2200)});
document.querySelectorAll(".watch").forEach(b=>b.addEventListener("click",()=>play(b.dataset.demo)));document.querySelector("#replay").addEventListener("click",()=>play(current));
const batterControls=[...document.querySelectorAll(".batter-demo-controls button")];batterControls.forEach(b=>b.addEventListener("click",()=>{batterControls.forEach(x=>x.setAttribute("aria-pressed",String(x===b)));play(b.dataset.demo)}));
const judgeControls=[...document.querySelectorAll(".judge-case-controls button")];judgeControls.forEach(b=>b.addEventListener("click",()=>{judgeControls.forEach(x=>x.setAttribute("aria-pressed",String(x===b)));play(b.dataset.demo)}));
const mainTabs=[...document.querySelectorAll("[data-main]")];mainTabs.forEach(b=>b.addEventListener("click",()=>{mainTabs.forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.main===b.dataset.main)));document.querySelector("#batter").hidden=b.dataset.main!=="batter";document.querySelector("#runner").hidden=b.dataset.main!=="runner";document.querySelector("#batter-demo-slot").append(fieldCard);if(b.dataset.main==="batter"){play("batter-infield",false);window.scrollTo({top:0,behavior:"instant"});return}const selected=document.querySelector("[data-sub][aria-pressed='true']").dataset.sub;if(selected==="lead"){document.querySelector("#lead-demo-slot").append(fieldCard);play("secondary-lead")}else if(selected==="judge"){document.querySelector("#judge-demo-slot").append(fieldCard);play("judge-first-short")}}));
const subTabs=[...document.querySelectorAll("[data-sub]")];subTabs.forEach(b=>b.addEventListener("click",()=>{subTabs.forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.sub===b.dataset.sub)));["check","lead","judge"].forEach(id=>document.querySelector("#"+id).hidden=id!==b.dataset.sub);if(b.dataset.sub==="check"){document.querySelector("#batter-demo-slot").append(fieldCard);return}if(b.dataset.sub==="lead"){document.querySelector("#lead-demo-slot").append(fieldCard);play("secondary-lead");return}document.querySelector("#judge-demo-slot").append(fieldCard);play("judge-first-short")}));
document.querySelector("#batter-demo-slot").append(fieldCard);
if("scrollRestoration" in history)history.scrollRestoration="manual";
play(current,false);
const showPageTop=()=>requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"instant"}));
window.addEventListener("pageshow",showPageTop);
showPageTop();
})();

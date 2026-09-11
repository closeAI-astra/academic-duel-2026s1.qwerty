import { GF, CARD, CARDS, makeGFQuestion, attackQuestionStars, globalQuestionStars, probabilityQuestionStars } from './godfield-data.js?v=2.00-final-004';
import {
  PHASE, makePlayer, makeState, player, alive, drawToHand, consumeFromHand, pray,
  buildSingleAttack, isAttackModifier, defenseCompatible, resolveDefense as calcDefense, damagePlayer,
  healPlayer, addAilment, removeAilments, learnMiracle, advanceTurn, payForSale, validateExchange, clampHp
} from './godfield-engine.js?v=2.00-final-004';
import { randomInviteCode,normalizeInviteCode,randomPeerId,byteLength,P2P_MESSAGE_LIMIT_BYTES,safeStorageGet,safeStorageSet } from './security.js';
import { getPublicProfile,rememberFriend,recordAnswerResult,recordMatchResult } from './profile.js';

const $=id=>document.getElementById(id);
const BUILD='2.00';
const ROOM_PREFIX='academia-gf2-room-';
const BATTLE_PREFIX='academia-gf2-battle-';
const TRANSITION_KEY='academia-gf2-transition';
const REVIEW_KEY='academia-vocab-review-v1';

let peer=null, role=null, hostConn=null, guests=new Map();
let localPid=null, roomCode='', state=null, publicState=null;
let hand=[], learned=[], activeQuestion=null, questionView=null, pendingDefense=null, pendingTrade=null;
let groupQueue=[], singleStrikeQueue=[], selectedDefenseSlots=[], selectedTarget='', logs=[], timerId=null, deadline=0;

const now=()=>Date.now();
const rnd=()=>crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]/4294967296:Math.random();
const seed=()=>Math.floor(rnd()*4294967296);
const safeText=v=>String(v??'').slice(0,120);

function packet(type,data={}){return {v:2,type,data}}
function send(conn,type,data={}){
  if(!conn?.open)return false;
  const msg=packet(type,data);
  try{
    if(byteLength(JSON.stringify(msg))>P2P_MESSAGE_LIMIT_BYTES)return false;
    conn.send(msg);
    return true;
  }catch{
    return false;
  }
}
function broadcast(type,data={}){for(const c of guests.values())send(c,type,data)}
function status(text){if($('gf-status'))$('gf-status').textContent=safeText(text)}
function log(text){logs.unshift(safeText(text));logs=logs.slice(0,50);renderLog()}
function nameOf(pid){return (publicState?.players||[]).find(p=>p.pid===pid)?.profile?.name||'PLAYER'}
function hostPlayer(pid){return state?player(state,pid):null}

function profileSafe(p){
  if(!p||typeof p!=='object'||typeof p.id!=='string'||typeof p.name!=='string')return null;
  return {id:p.id.slice(0,32),name:p.name.slice(0,16),icon:typeof p.icon==='string'?p.icon:null,stats:p.stats&&typeof p.stats==='object'?p.stats:{}};
}

function publicView(){
  if(!state)return {phase:PHASE.LOBBY,turn:null,winner:null,draw:false,players:[]};
  return {
    phase:state.phase,turn:state.turn,winner:state.winner,draw:state.draw,turnCount:state.turnCount,
    players:state.players.map(p=>({pid:p.pid,profile:p.profile,hp:p.hp,mp:p.mp,money:p.money,alive:p.alive,slump:p.slump,ailments:[...p.ailments],learnedCount:p.learned.length}))
  };
}
function sync(){
  if(role!=='host'||!state)return;
  publicState=publicView();
  broadcast('STATE',publicState);
  for(const p of state.players){
    const payload={hand:[...p.hand],learned:[...p.learned]};
    if(p.pid===localPid){hand=payload.hand;learned=payload.learned}
    else send(guests.get(p.pid),'PRIVATE',payload);
  }
  render();
}

function saveTransition(x){sessionStorage.setItem(TRANSITION_KEY,JSON.stringify(x))}
function loadTransition(){try{return JSON.parse(sessionStorage.getItem(TRANSITION_KEY)||'null')}catch{return null}}
function clearTransition(){sessionStorage.removeItem(TRANSITION_KEY)}
function goBattle(code){location.href=`./godfield-battle.html?room=${encodeURIComponent(code)}&t=${Date.now()}&build=200`}

function clearTimer(){if(timerId)clearInterval(timerId);timerId=null;deadline=0;renderTimer()}
function startTimer(ms,onEnd){
  clearTimer();deadline=now()+ms;
  timerId=setInterval(()=>{renderTimer();if(now()>=deadline){clearTimer();onEnd()}},120);
}
function renderTimer(){if($('gf-timer'))$('gf-timer').textContent=deadline?`${Math.max(0,Math.ceil((deadline-now())/1000))}`:''}

function hideQuestion(){
  questionView=null;deadline=0;
  const q=$('gf-question');if(q){q.hidden=true;q.classList.remove('spectator')}
  const choices=$('gf-choices');if(choices){choices.replaceChildren();choices.dataset.locked='0'}
  if($('gf-q-word'))$('gf-q-word').textContent='';
  if($('gf-q-stars'))$('gf-q-stars').textContent='';
  if($('gf-q-role'))$('gf-q-role').textContent='8択 / 10秒';
  if($('gf-q-spectator')){$('gf-q-spectator').hidden=true;$('gf-q-spectator').textContent=''}
  document.querySelector('.gf2-question-slot')?.classList.remove('active','spectating');
}
function hideDefense(){
  pendingDefense=null;
  const d=$('gf-defense');if(d)d.hidden=true;
  selectedDefenseSlots=[];
  document.querySelectorAll('.gf2-card.defense-selected').forEach(x=>x.classList.remove('defense-selected'));
  document.querySelector('.gf2-defense-slot')?.classList.remove('active');
  if($('gf-defense-count'))$('gf-defense-count').textContent='0枚 / 守0';
}
function clearTransient(){
  clearTimer();hideQuestion();hideDefense();
  if(role==='host')activeQuestion=null;
  broadcast('CLEAR',{});
}
function presentation({actor,target=null,targets=null,cards=[],result='',correct=null}){
  const data={actor,target,targets,cards,result,correct};
  broadcast('PRESENT',data);showPresentation(data);
}
function showPresentation(d){
  if($('gf-turn-name'))$('gf-turn-name').textContent=d.actor?nameOf(d.actor):'WAIT';
  if($('gf-target-display'))$('gf-target-display').textContent=d.target?nameOf(d.target):(d.targets?'全員':'SELECT');
  if($('gf-focus-cards'))$('gf-focus-cards').textContent=(d.cards||[]).map(id=>CARD[id]?.name||id).join(' + ');
  if($('gf-focus-result'))$('gf-focus-result').textContent=d.result||'';
}

function recordReview(word,meaning){
  if(!word||!meaning)return;
  const list=safeStorageGet(REVIEW_KEY,[]);
  const arr=Array.isArray(list)?list:[];
  if(!arr.some(x=>x?.word===word))arr.unshift({word,meaning,misses:1,lastMiss:Date.now()});
  safeStorageSet(REVIEW_KEY,arr.slice(0,500));
}

function elementLabel(e){return ({none:'無',fire:'火',water:'水',wood:'木',earth:'土',light:'光',dark:'闇'})[e||'none']||'無'}
function cardDesc(c){
  if(!c)return '';
  const fx=c.effectText?` · ${c.effectText}`:'';
  if(c.kind==='weapon')return `攻${c.atk}${c.def?` / 守${c.def}`:''} · ${elementLabel(c.element)} · ¥${c.price}${fx}`;
  if(c.kind==='add')return `+攻${c.atk}${c.def?` / 守${c.def}`:''} · ${elementLabel(c.element)} · ¥${c.price}${fx}`;
  if(c.kind==='global')return `全体${Math.round(c.hit*100)}%攻${c.atk}${c.def?` / 守${c.def}`:''} · ${elementLabel(c.element)} · ¥${c.price}${fx}`;
  if(c.kind==='defense')return `守${c.def} · ${elementLabel(c.element)} · ¥${c.price}${fx}`;
  if(c.kind==='miracle')return `MP${c.cost} · ${c.effectText||c.effect}`;
  if(c.kind==='special')return c.effectText||'';
  return `${c.effectText||c.effect||''} · ¥${c.price}`;
}
function selectedUses(){
  return [...document.querySelectorAll('#gf-hand .gf2-card.selected')].map(x=>({
    id:x.dataset.id,
    source:x.dataset.source==='learned'?'learned':'hand',
    slot:Number(x.dataset.slot)||0
  }));
}
function selectedHandIds(){return selectedUses().filter(x=>x.source==='hand').map(x=>x.id)}
function selectedShieldIds(){
  return selectedDefenseSlots.map(slot=>hand[slot]).filter(Boolean);
}
function targetPid(){
  if(selectedTarget)return selectedTarget;
  const sel=$('gf-target')?.value;
  return sel||'';
}
function hasIds(h,ids){
  const x=[...h];
  for(const id of ids){const i=x.indexOf(id);if(i<0)return false;x.splice(i,1)}
  return true;
}
function hasUses(p,uses){
  if(!Array.isArray(uses)||!uses.length)return false;
  const handIds=uses.filter(u=>u?.source!=='learned').map(u=>u.id);
  const learnedIds=uses.filter(u=>u?.source==='learned').map(u=>u.id);
  return hasIds(p.hand,handIds)&&hasIds(p.learned,learnedIds)&&learnedIds.every(id=>CARD[id]?.kind==='miracle');
}
function useMiracleFromSource(p,use){
  const c=CARD[use.id];if(!c||c.kind!=='miracle')return false;
  if(p.mp<c.cost)return false;
  p.mp-=c.cost;
  if(use.source==='learned')return true;
  const i=p.hand.indexOf(c.id);if(i<0)return false;
  p.hand.splice(i,1);drawToHand(p,1,rnd);learnMiracle(p,c.id);
  return true;
}
function consumeActionUses(p,uses){
  const miracleUses=uses.filter(u=>CARD[u.id]?.kind==='miracle');
  const mpCost=miracleUses.reduce((n,u)=>n+(CARD[u.id]?.cost||0),0);
  if(p.mp<mpCost)return {ok:false,reason:'MPが足りません'};
  const normalHand=uses.filter(u=>u.source!=='learned'&&CARD[u.id]?.kind!=='miracle').map(u=>u.id);
  const miracleHand=uses.filter(u=>u.source!=='learned'&&CARD[u.id]?.kind==='miracle');
  if(!hasIds(p.hand,[...normalHand,...miracleHand.map(u=>u.id)]))return {ok:false,reason:'手札が一致しません'};
  const learnedUses=uses.filter(u=>u.source==='learned');
  if(!hasIds(p.learned,learnedUses.map(u=>u.id)))return {ok:false,reason:'習得奇跡が一致しません'};

  p.mp-=mpCost;
  for(const id of normalHand){const i=p.hand.indexOf(id);p.hand.splice(i,1)}
  for(const u of miracleHand){const i=p.hand.indexOf(u.id);p.hand.splice(i,1);learnMiracle(p,u.id)}
  drawToHand(p,normalHand.length+miracleHand.length,rnd);
  return {ok:true};
}
function triggerSunCharm(p){
  if(p.alive||p.hp>0)return false;
  const i=p.hand.indexOf('sun-charm');
  if(i<0)return false;
  p.hand.splice(i,1);drawToHand(p,1,rnd);
  p.hp=Math.min(GF.MAX_HP,10);p.alive=true;
  log(`${p.profile.name}：太陽のお守りでHP10に復活`);
  presentation({actor:p.pid,target:p.pid,cards:['sun-charm'],result:'太陽のお守り · HP10で復活'});
  return true;
}
function hurt(p,amount,{dark=false}={}){
  const dealt=damagePlayer(p,amount,{dark});
  triggerSunCharm(p);
  return dealt;
}
function ailmentLabel(a){return ({cold:'風邪',fever:'熱病',hell:'地獄病',heaven:'天国病',fog:'霧',flash:'閃光','dark-cloud':'暗雲'})[a]||a}
function inflictDisease(p,incoming='cold'){
  const order=['cold','fever','hell','heaven'];
  const current=order.find(x=>p.ailments.includes(x));
  if(!current){addAilment(p,incoming);return incoming}
  const i=order.indexOf(current);
  const next=order[Math.min(order.length-1,i+1)];
  removeAilments(p,order);addAilment(p,next);
  return next;
}
function applyStatusFromAttack(p,attack){
  if(!p?.alive)return;
  if(attack.effect==='fog-on-hit')addAilment(p,'fog');
}
function resolveFogTarget(p,target){
  if(!p?.ailments?.includes('fog')||target===p.pid)return target;
  const choices=alive(state).filter(x=>x.pid!==p.pid);
  return choices.length?choices[Math.floor(rnd()*choices.length)].pid:target;
}
function applyTurnEndAilments(p){
  if(!p?.alive)return;
  let next=null;
  if(p.ailments.includes('cold')){hurt(p,1);if(rnd()<.05)next='fever'}
  else if(p.ailments.includes('fever')){hurt(p,2);if(rnd()<.05)next='hell'}
  else if(p.ailments.includes('hell')){hurt(p,5);if(rnd()<.05)next='heaven'}
  else if(p.ailments.includes('heaven')){healPlayer(p,5);if(rnd()<.05){p.hp=0;p.alive=false;triggerSunCharm(p)}}
  if(next&&p.alive){removeAilments(p,['cold','fever','hell','heaven']);addAilment(p,next);log(`${p.profile.name}：${ailmentLabel(next)}へ悪化`)}
}


function nextTurn(){
  if(role!=='host'||!state)return;
  clearTransient();
  groupQueue=[];singleStrikeQueue=[];
  const current=hostPlayer(state.turn);
  if(current?.alive)applyTurnEndAilments(current);
  const livingAfter=alive(state);
  if(livingAfter.length<=1)return finishGame();
  const next=advanceTurn(state);
  if(state.phase===PHASE.FINISHED)return finishGame();
  presentation({actor:next,result:'TURN'});
  sync();
}

function finishGame(){
  clearTransient();
  const living=alive(state);
  if(living.length===1){state.winner=living[0].pid;state.draw=false}
  else if(living.length===0){state.winner=null;state.draw=true}
  state.phase=PHASE.FINISHED;sync();
  const payload={winner:state.winner,draw:state.draw,name:state.winner?hostPlayer(state.winner)?.profile?.name:'DRAW'};
  broadcast('FINISH',payload);showResult(payload);
  setTimeout(()=>{clearTransition();location.href='./index.html?tab=godfield'},5000);
}

function checkEndOrContinue(callback=nextTurn){
  const living=alive(state);
  if(living.length<=1)return finishGame();
  callback();
}

function askSingle(actorPid,target,attack,stars,forced=null){
  const q=makeGFQuestion(stars,seed(),forced);
  activeQuestion={kind:'single',qid:`q-${seed()}`,actor:actorPid,target,attack,q};
  state.phase=PHASE.QUESTION;
  const qid=activeQuestion.qid;
  const payload={kind:'single',qid,actor:actorPid,target,word:q.word,choices:q.choices,stars:q.stars,deadline:now()+GF.ANSWER_MS,cards:attack.cards};
  broadcast('QUESTION',payload);receiveQuestion(payload);sync();
  startTimer(GF.ANSWER_MS,()=>hostAnswer(actorPid,qid,-1));
}
function askGlobal(actorPid,targets,attack){
  const stars=globalQuestionStars(attack.hit);
  const q=makeGFQuestion(stars,seed());
  const forced=targets.filter(pid=>hostPlayer(pid)?.ailments?.includes('dark-cloud'));
  const answering=targets.filter(pid=>!forced.includes(pid));
  const answers=Object.fromEntries(forced.map(pid=>[pid,{choice:-2,correct:false,forced:true}]));
  activeQuestion={kind:'global',qid:`g-${seed()}`,actor:actorPid,targets:[...answering],allTargets:[...targets],attack,q,answers};
  state.phase=PHASE.GROUP;
  if(!answering.length){sync();return setTimeout(resolveGlobalAnswers,250)}
  const qid=activeQuestion.qid;
  const payload={kind:'global',qid,actor:actorPid,targets:[...answering],word:q.word,choices:q.choices,stars:q.stars,deadline:now()+GF.ANSWER_MS,cards:attack.cards};
  broadcast('QUESTION',payload);receiveQuestion(payload);sync();
  startTimer(GF.ANSWER_MS,()=>resolveGlobalTimeouts());
}
function hostAnswer(pid,qid,choice){
  if(role!=='host'||!activeQuestion||activeQuestion.qid!==qid)return;
  const aq=activeQuestion;
  const q=aq.q;
  if(!q)return;
  const correct=Number(choice)===q.correct;

  if(aq.kind==='single'){
    if(pid!==aq.actor)return;
    clearTimer();
    const actor=hostPlayer(pid);if(actor)actor.lastQuestion={word:q.word,meaning:q.meaning,stars:q.stars};
    broadcast('ANSWER_RESULT',{pid,choice,correct,word:q.word,meaning:q.meaning});
    showAnswerResult({pid,choice,correct,word:q.word,meaning:q.meaning});
    const meta=aq;
    activeQuestion=null;
    hideQuestion();broadcast('QUESTION_END',{});

    if(!correct){
      presentation({actor:meta.actor,target:meta.target,cards:meta.attack.cards,result:'攻撃失敗',correct:false});
      return setTimeout(nextTurn,800);
    }

    presentation({actor:meta.actor,target:meta.target,cards:meta.attack.cards,result:'攻撃成功',correct:true});
    const hits=Math.max(1,meta.attack.hits||1);

    if(meta.target===meta.actor){
      const p=hostPlayer(meta.target);
      for(let n=0;n<hits&&p.alive;n++){
        if(meta.attack.effect==='drain'){
          p.hp=Math.max(0,p.hp-meta.attack.atk);
          healPlayer(p,meta.attack.atk);p.alive=p.hp>0;
        }else hurt(p,meta.attack.atk,{dark:meta.attack.element==='dark'});
      }
      sync();return setTimeout(()=>checkEndOrContinue(),850);
    }

    singleStrikeQueue=Array.from({length:hits},()=>({target:meta.target,attack:meta.attack}));
    return setTimeout(processSingleStrikes,450);
  }

  if(aq.kind==='global'){
    if(!aq.targets.includes(pid)||pid in aq.answers)return;
    aq.answers[pid]={choice,correct};
    if(aq.targets.every(targetPid=>targetPid in aq.answers))resolveGlobalAnswers();
    return;
  }

  if(aq.kind==='review'){
    if(pid!==aq.target)return;
    clearTimer();
    broadcast('ANSWER_RESULT',{pid,choice,correct,word:q.word,meaning:q.meaning});
    showAnswerResult({pid,choice,correct,word:q.word,meaning:q.meaning});
    const meta=aq;
    activeQuestion=null;
    hideQuestion();broadcast('QUESTION_END',{});

    if(!correct){
      const p=hostPlayer(pid);hurt(p,25);
      presentation({actor:meta.actor,target:pid,cards:meta.cards,result:'復習失敗 · 25ダメージ',correct:false});
    }else{
      presentation({actor:meta.actor,target:pid,cards:meta.cards,result:'復習成功 · 0ダメージ',correct:true});
    }
    sync();setTimeout(()=>checkEndOrContinue(),850);
  }
}
function resolveGlobalTimeouts(){
  if(!activeQuestion||activeQuestion.kind!=='global')return;
  for(const pid of activeQuestion.targets){
    if(!(pid in activeQuestion.answers))activeQuestion.answers[pid]={choice:-1,correct:false};
  }
  resolveGlobalAnswers();
}
function resolveGlobalAnswers(){
  clearTimer();
  const meta=activeQuestion;if(!meta||meta.kind!=='global')return;
  for(const pid of (meta.allTargets||meta.targets)){
    const a=meta.answers[pid]||{choice:-1,correct:false};
    const p=hostPlayer(pid);
    if(p&&!a.forced)p.lastQuestion={word:meta.q.word,meaning:meta.q.meaning,stars:meta.q.stars};
  }
  activeQuestion=null;
  hideQuestion();broadcast('QUESTION_END',{});
  groupQueue=(meta.allTargets||meta.targets).map(pid=>({
    pid,
    answer:meta.answers[pid]||{choice:-1,correct:false},
    attack:meta.attack,
    actor:meta.actor,
    word:meta.q.word,
    meaning:meta.q.meaning
  }));
  processGlobalQueue();
}
function processGlobalQueue(){
  if(!groupQueue.length)return checkEndOrContinue();
  const item=groupQueue.shift();
  if(item.answer.forced){
    log(`${nameOf(item.pid)}：暗雲により全体攻撃が不可避`);
  }else{
    broadcast('ANSWER_RESULT',{pid:item.pid,choice:item.answer.choice,correct:item.answer.correct,word:item.word,meaning:item.meaning});
    showAnswerResult({pid:item.pid,choice:item.answer.choice,correct:item.answer.correct,word:item.word,meaning:item.meaning});
  }
  if(item.answer.correct){
    presentation({actor:item.actor,target:item.pid,cards:item.attack.cards,result:'回避 · 0ダメージ',correct:true});
    return setTimeout(processGlobalQueue,850);
  }
  presentation({actor:item.actor,target:item.pid,cards:item.attack.cards,result:'命中 · 防御へ',correct:false});
  setTimeout(()=>beginDefense(item.pid,item.attack,'global'),450);
}

function processSingleStrikes(){
  if(!singleStrikeQueue.length)return checkEndOrContinue(nextTurn);
  const item=singleStrikeQueue.shift();
  const t=hostPlayer(item.target);
  if(!t?.alive)return processSingleStrikes();
  const n=(item.attack.hits||1)-singleStrikeQueue.length;
  presentation({actor:item.attack.actor,target:item.target,cards:item.attack.cards,result:(item.attack.hits||1)>1?`第${n}撃 · 防御へ`:'防御へ'});
  setTimeout(()=>beginDefense(item.target,item.attack,'single-repeat'),300);
}

function beginDefense(target,attack,origin){
  const p=hostPlayer(target);
  if(!p?.alive)return origin==='global'?processGlobalQueue():nextTurn();
  pendingDefense={target,attack,origin};
  state.phase=PHASE.DEFENSE;
  const payload={target,attack,origin,deadline:now()+GF.ANSWER_MS};
  broadcast('DEFENSE_PROMPT',payload);
  if(target===localPid){receiveDefense(payload)}
  sync();
  startTimer(GF.ANSWER_MS,()=>hostDefend(target,[]));
}

function hostDefend(pid,shieldIds){
  if(role!=='host'||!pendingDefense||pendingDefense.target!==pid)return;
  const p=hostPlayer(pid);if(!p)return;
  let ids=Array.isArray(shieldIds)?shieldIds.slice(0,GF.MAX_HAND):[];
  if(p.ailments.includes('flash')&&ids.length>1)ids=ids.slice(0,1);
  if(!hasIds(p.hand,ids))return;
  const cards=ids.map(id=>CARD[id]).filter(Boolean);
  if(!cards.every(c=>defenseCompatible(c,pendingDefense.attack,ids)))return;
  clearTimer();
  for(const id of ids){const i=p.hand.indexOf(id);if(i>=0)p.hand.splice(i,1)}
  drawToHand(p,ids.length,rnd);

  const meta=pendingDefense;pendingDefense=null;
  broadcast('DEFENSE_END',{});hideDefense();
  const outcome=calcDefense(meta.attack,cards);
  const labels=cards.map(c=>c.name).join(' + ')||'許す';

  if(outcome.kind==='reflect'){
    const src=hostPlayer(meta.attack.actor);
    if(src){
      const dmg=hurt(src,meta.attack.atk,{dark:outcome.attack.element==='dark'});
      applyStatusFromAttack(src,outcome.attack);
      if(meta.attack.effect==='drain'&&dmg>0)healPlayer(p,dmg);
    }
    presentation({actor:meta.attack.actor,target:pid,cards:meta.attack.cards,result:`${labels} · はね返す`});
  }else if(outcome.kind==='bounce'){
    const candidates=alive(state);
    const dst=candidates[Math.floor(rnd()*candidates.length)];
    if(dst){
      const dmg=hurt(dst,meta.attack.atk,{dark:outcome.attack.element==='dark'});
      applyStatusFromAttack(dst,outcome.attack);
      if(meta.attack.effect==='drain'&&dmg>0)healPlayer(p,dmg);
    }
    presentation({actor:meta.attack.actor,target:pid,cards:meta.attack.cards,result:`${labels} · 弾く → ${dst?.profile?.name||'PLAYER'}`});
  }else if(outcome.kind==='stop'){
    presentation({actor:meta.attack.actor,target:pid,cards:meta.attack.cards,result:`${labels} · 奇跡を止めた`});
  }else{
    const dmg=hurt(p,outcome.damage,{dark:outcome.attack.element==='dark'});
    applyStatusFromAttack(p,outcome.attack);
    if(meta.attack.effect==='drain'&&dmg>0)healPlayer(hostPlayer(meta.attack.actor),dmg);
    presentation({actor:meta.attack.actor,target:pid,cards:meta.attack.cards,result:`攻${meta.attack.atk} - 守${outcome.def} = ${dmg}ダメージ`});
  }
  sync();
  const cb=meta.origin==='global'?processGlobalQueue:meta.origin==='single-repeat'?processSingleStrikes:nextTurn;
  setTimeout(()=>checkEndOrContinue(cb),950);
}
function hostUse(pid,uses,target){
  if(role!=='host'||!state||state.phase!==PHASE.TURN||state.turn!==pid)return;
  const p=hostPlayer(pid);
  if(!p?.alive||!Array.isArray(uses)||uses.length<1||uses.length>GF.MAX_HAND||!hasUses(p,uses))return;
  target=resolveFogTarget(p,target);
  const cards=uses.map(u=>CARD[u.id]).filter(Boolean);
  if(cards.length!==uses.length)return;

  const special=cards.find(c=>c.kind==='special');
  if(special){
    if(uses.length!==1||uses[0].source==='learned')return;
    if(special.effect==='review')return useReview(p,special,target);
    if(special.effect==='frank')return useFrank(p,special);
  }

  const utilityCards=cards.filter(c=>c.kind==='utility');
  if(utilityCards.length){
    if(uses.length!==1||uses[0].source==='learned')return;
    return useUtility(p,utilityCards[0],target);
  }

  const globalCards=cards.filter(c=>c.kind==='global');
  if(globalCards.length){
    if(uses.length!==1||uses[0].source==='learned')return;
    const c=globalCards[0];
    consumeFromHand(p,[c.id],rnd);
    const targets=alive(state).filter(x=>x.pid!==pid).map(x=>x.pid);
    const attack={source:'global',actor:pid,atk:c.atk,hit:c.hit,element:c.element,effect:c.effect,cards:[c.id]};
    presentation({actor:pid,targets:true,cards:[c.id],result:'全体攻撃'});
    sync();return setTimeout(()=>askGlobal(pid,targets,attack),600);
  }

  const miracleCards=cards.filter(c=>c.kind==='miracle');
  const directMiracles=miracleCards.filter(c=>c.miracleMode!=='add');
  if(directMiracles.length){
    if(uses.length!==1)return log('この奇跡は単独で使用してください');
    return useMiracle(p,uses[0],target);
  }

  // 通常武器 + 追加武器 + 「+攻」奇跡
  const built=buildSingleAttack(cards);
  if(!built.ok){log(built.reason);return}
  const t=hostPlayer(target);
  if(!t?.alive)return log('対象を選択してください');
  const consumed=consumeActionUses(p,uses);
  if(!consumed.ok)return log(consumed.reason);
  const attack={...built.attack,actor:pid};
  const stars=attackQuestionStars({base:attack.baseStars,slump:p.slump,bonusCards:attack.bonusCards});
  presentation({actor:pid,target,cards:cards.map(c=>c.id),result:'攻撃準備'});
  sync();setTimeout(()=>askSingle(pid,target,attack,stars),600);
}
function useMiracle(p,use,target){
  const c=CARD[use.id];if(!c||c.kind!=='miracle')return;
  let t=hostPlayer(target);
  const needsTarget=['miracle-attack','cold','fog','slump','dark-cloud'].includes(c.effect)||c.miracleMode==='attack'||c.miracleMode==='status';
  if(needsTarget&&(!t?.alive||t.pid===p.pid))return log('有効な相手を選択してください');
  if(p.mp<c.cost)return log('MPが足りません');
  if(!useMiracleFromSource(p,use))return log('奇跡を使用できません');

  if(c.miracleMode==='attack'){
    const attack={source:'miracle',actor:p.pid,atk:c.atk,hit:c.hit,element:c.element,effect:c.attackEffect||null,cards:[c.id]};
    const stars=probabilityQuestionStars(c.hit);
    presentation({actor:p.pid,target:t.pid,cards:[c.id],result:'奇跡攻撃'});
    sync();return setTimeout(()=>askSingle(p.pid,t.pid,attack,stars),600);
  }

  if(c.effect==='cold'){const next=inflictDisease(t,'cold');log(`${t.profile.name}：${ailmentLabel(next)}`)}
  else if(c.effect==='fog')addAilment(t,'fog');
  else if(c.effect==='slump')t.slump=true;
  else if(c.effect==='dark-cloud')addAilment(t,'dark-cloud');
  else if(c.effect==='cure-minor')removeAilments(p,['cold','fever','fog','flash']);
  else if(c.effect==='cure-all'){p.ailments=[];p.slump=false}
  else if(c.effect==='heal10')healPlayer(p,10);
  else if(c.effect==='money10')p.money+=10;

  presentation({actor:p.pid,target:t?.pid||p.pid,cards:[c.id],result:`${c.name} · ${c.effectText}`});
  sync();setTimeout(nextTurn,700);
}
function useUtility(p,c,target){
  const t=hostPlayer(target);
  if(c.auto)return log(`${c.name} はHP0時に自動発動します`);
  if(['buy','sell','discard3','forget2'].includes(c.effect)&&(!t?.alive||t.pid===p.pid))return log('有効な相手を選択してください');
  if(c.effect==='buy')return beginBuy(p,c,t);
  if(c.effect==='sell')return beginSell(p,c,t);
  if(c.effect==='exchange')return beginExchange(p,c);

  consumeFromHand(p,[c.id],rnd);
  if(c.effect==='heal5')healPlayer(p,5);
  if(c.effect==='heal10')healPlayer(p,10);
  if(c.effect==='heal15')healPlayer(p,15);
  if(c.effect==='heal20')healPlayer(p,20);
  if(c.effect==='mp5')p.mp+=5;
  if(c.effect==='mp10')p.mp+=10;
  if(c.effect==='mp15')p.mp+=15;
  if(c.effect==='cure-minor')removeAilments(p,['cold','fever','fog','flash']);
  if(c.effect==='cure-all'){p.ailments=[];p.slump=false}
  if(c.effect==='discard3'){
    const n=Math.min(3,t.hand.length);
    for(let k=0;k<n;k++)t.hand.splice(Math.floor(rnd()*t.hand.length),1);
  }
  if(c.effect==='forget2'){
    for(let k=0;k<2&&t.learned.length;k++)t.learned.splice(Math.floor(rnd()*t.learned.length),1);
  }
  presentation({actor:p.pid,target:t?.pid||p.pid,cards:[c.id],result:`${c.name} · ${c.effectText}`});
  sync();setTimeout(nextTurn,650);
}
function useReview(p,c,target){
  const t=hostPlayer(target);
  if(!t?.alive||t.pid===p.pid)return log('有効な相手を選択してください');
  if(!t.lastQuestion)return log('その相手には直前問題がありません');
  consumeFromHand(p,[c.id],rnd);
  const q=makeGFQuestion(t.lastQuestion.stars||1,seed(),[t.lastQuestion.word,t.lastQuestion.meaning]);
  activeQuestion={kind:'review',qid:`r-${seed()}`,actor:p.pid,target:t.pid,cards:[c.id],q};
  state.phase=PHASE.QUESTION;
  const payload={kind:'review',qid:activeQuestion.qid,actor:p.pid,target:t.pid,word:q.word,choices:q.choices,stars:q.stars,deadline:now()+GF.ANSWER_MS,cards:[c.id]};
  broadcast('QUESTION',payload);receiveQuestion(payload);sync();
  startTimer(GF.ANSWER_MS,()=>hostAnswer(t.pid,activeQuestion?.qid,-1));
}

function useFrank(p,c){
  consumeFromHand(p,[c.id],rnd);
  broadcast('CUTIN',{line:'お前Ｆランやないか'});showCutin('お前Ｆランやないか');
  const targets=alive(state).filter(x=>x.pid!==p.pid).map(x=>x.pid);
  const q=makeGFQuestion(0,seed());
  activeQuestion={kind:'global',qid:`f-${seed()}`,actor:p.pid,targets,attack:{source:'frank',actor:p.pid,atk:999,hit:1,element:'none',effect:'frank',cards:[c.id]},q,answers:{}};
  state.phase=PHASE.GROUP;
  setTimeout(()=>{
    const payload={kind:'global',qid:activeQuestion.qid,actor:p.pid,targets,word:q.word,choices:q.choices,stars:0,deadline:now()+GF.ANSWER_MS,cards:[c.id],frank:true};
    broadcast('QUESTION',payload);receiveQuestion(payload);sync();
    startTimer(GF.ANSWER_MS,()=>resolveGlobalTimeouts());
  },1000);
}

function beginBuy(p,c,t){
  if(!t.hand.length)return log('相手に神器がありません');
  const candidates=[...t.hand];
  if(!candidates.length)return log('買える神器がありません');
  const itemId=candidates[Math.floor(rnd()*candidates.length)], item=CARD[itemId], price=item?.kind==='miracle'?0:(item?.price||0);
  pendingTrade={kind:'buy',id:`tb-${seed()}`,actor:p.pid,target:t.pid,action:c.id,itemId,price};
  state.phase=PHASE.TRADE;sync();
  const payload={kind:'buy',id:pendingTrade.id,targetName:t.profile.name,item:{id:itemId,name:item.name,desc:cardDesc(item),price},money:p.money};
  if(p.pid===localPid)openTrade(payload);else send(guests.get(p.pid),'TRADE_PROMPT',payload);
}

function beginSell(p,c,t){
  const items=[...p.hand];{const actionIndex=items.indexOf(c.id);if(actionIndex>=0)items.splice(actionIndex,1)}
  if(!items.length)return log('売れる神器がありません');
  pendingTrade={kind:'sell',id:`ts-${seed()}`,actor:p.pid,target:t.pid,action:c.id};
  state.phase=PHASE.TRADE;sync();
  const payload={kind:'sell',id:pendingTrade.id,targetName:t.profile.name,items:items.map(id=>({id,name:CARD[id]?.name,desc:cardDesc(CARD[id]),price:CARD[id]?.price||0}))};
  if(p.pid===localPid)openTrade(payload);else send(guests.get(p.pid),'TRADE_PROMPT',payload);
}

function beginExchange(p,c){
  pendingTrade={kind:'exchange',id:`te-${seed()}`,actor:p.pid,action:c.id,total:p.hp+p.mp+p.money};
  state.phase=PHASE.TRADE;sync();
  const payload={kind:'exchange',id:pendingTrade.id,total:pendingTrade.total,hp:p.hp,mp:p.mp,money:p.money};
  if(p.pid===localPid)openTrade(payload);else send(guests.get(p.pid),'TRADE_PROMPT',payload);
}

function hostTradeChoice(pid,d){
  const tr=pendingTrade;if(!tr||tr.actor!==pid||tr.id!==d.id)return;
  const p=hostPlayer(pid),t=hostPlayer(tr.target);
  if(!d.confirm){pendingTrade=null;closeTrade();return nextTurn()}

  if(tr.kind==='buy'){
    const item=CARD[tr.itemId];
    if(!t?.hand.includes(tr.itemId)||p.money<tr.price)return;
    consumeFromHand(p,[tr.action],rnd);
    p.money-=tr.price;t.money+=tr.price;
    t.hand.splice(t.hand.indexOf(tr.itemId),1);
    if(p.hand.length>=GF.MAX_HAND)p.hand.splice(Math.floor(rnd()*p.hand.length),1);
    p.hand.push(tr.itemId);
  }
  if(tr.kind==='sell'){
    const itemId=String(d.itemId||'');
    if(!p.hand.includes(itemId)||itemId===tr.action)return;
    const item=CARD[itemId],price=item?.price||0;
    consumeFromHand(p,[tr.action],rnd);
    const idx=p.hand.indexOf(itemId);if(idx>=0)p.hand.splice(idx,1);
    payForSale(t,price);triggerSunCharm(t);
    p.money+=price;
    if(t.hand.length>=GF.MAX_HAND)t.hand.splice(Math.floor(rnd()*t.hand.length),1);
    t.hand.push(itemId);
  }
  if(tr.kind==='exchange'){
    const v=validateExchange(tr.total,d.hp,d.mp,d.money);
    if(!v.ok)return send(pid===localPid?null:guests.get(pid),'TRADE_ERROR',{reason:v.reason});
    consumeFromHand(p,[tr.action],rnd);
    p.hp=v.hp;p.mp=v.mp;p.money=v.money;
  }
  pendingTrade=null;closeTrade();broadcast('TRADE_END',{});sync();setTimeout(nextTurn,600);
}

function openTrade(d){
  pendingTrade={...pendingTrade,...d};
  const box=$('gf-trade');if(!box)return;
  for(const id of ['gf-buy-pane','gf-sell-pane','gf-exchange-pane'])$(id).hidden=true;
  if(d.kind==='buy'){
    $('gf-buy-pane').hidden=false;$('gf-trade-title').textContent='買う';
    $('gf-trade-target').textContent=`${d.targetName} の神器からランダムに選出`;
    $('gf-trade-item-name').textContent=d.item.name;$('gf-trade-item-desc').textContent=d.item.desc;$('gf-trade-price').textContent=`¥${d.item.price}`;$('gf-trade-money').textContent=`所持金 ¥${d.money}`;
    $('gf-buy-confirm').disabled=d.money<d.item.price;
  }
  if(d.kind==='sell'){
    $('gf-sell-pane').hidden=false;$('gf-trade-title').textContent='売る';$('gf-trade-target').textContent=`売却先：${d.targetName}`;
    const sel=$('gf-sell-item');sel.replaceChildren();
    for(const it of d.items){const o=document.createElement('option');o.value=it.id;o.textContent=`${it.name} · ¥${it.price}`;sel.append(o)}
    updateSellPreview();
  }
  if(d.kind==='exchange'){
    $('gf-exchange-pane').hidden=false;$('gf-trade-title').textContent='両替';$('gf-trade-target').textContent='HP / MP / ¥ を1:1で再配分';
    $('gf-exchange-total').textContent=`合計 ${d.total}`;$('gf-exchange-hp').value=d.hp;$('gf-exchange-mp').value=d.mp;$('gf-exchange-money').value=d.money;validateExchangeUi();
  }
  box.hidden=false;
}
function closeTrade(){if($('gf-trade'))$('gf-trade').hidden=true}
function updateSellPreview(){const id=$('gf-sell-item')?.value,c=CARD[id];if($('gf-sell-preview'))$('gf-sell-preview').textContent=c?`${c.name} · ${cardDesc(c)}`:''}
function validateExchangeUi(){
  if(!pendingTrade||pendingTrade.kind!=='exchange')return false;
  const hp=+$('gf-exchange-hp').value,mp=+$('gf-exchange-mp').value,money=+$('gf-exchange-money').value;
  const v=validateExchange(pendingTrade.total,hp,mp,money);
  $('gf-exchange-error').textContent=v.ok?'':v.reason;
  $('gf-exchange-remaining').textContent=v.ok?`未配分 ${v.unused}`:'';
  $('gf-exchange-confirm').disabled=!v.ok;
  return v.ok;
}
function sendTrade(confirm){
  if(!pendingTrade)return;
  const d={id:pendingTrade.id,confirm};
  if(pendingTrade.kind==='sell')d.itemId=$('gf-sell-item')?.value||'';
  if(pendingTrade.kind==='exchange'){d.hp=+$('gf-exchange-hp').value;d.mp=+$('gf-exchange-mp').value;d.money=+$('gf-exchange-money').value}
  if(role==='host')hostTradeChoice(localPid,d);else send(hostConn,'TRADE_CHOICE',d);
}

function receiveQuestion(d){questionView=d;renderQuestion(d)}
function receiveDefense(d){hideQuestion();pendingDefense=d;renderDefense();renderHand()}

function showAnswerResult(d){
  log(`${nameOf(d.pid)}：${d.choice<0?'時間切れ':`${d.choice+1}番`} → ${d.correct?'正解':'不正解'}（正解 ${d.meaning}）`);
  if(d.pid===localPid){recordAnswerResult(Boolean(d.correct));const word=d.word||questionView?.word;if(!d.correct&&word)recordReview(word,d.meaning)}
}
function showCutin(line){
  const x=$('gf-cutin');if(!x)return;$('gf-cutin-line').textContent=line;x.hidden=false;
  setTimeout(()=>x.hidden=true,1500);
}
function showResult(d){
  const x=$('gf-result');if(!x)return;x.hidden=false;$('gf-result-name').textContent=d.draw?'DRAW':`${d.name} の勝利`;
  if(!d.draw)recordMatchResult(d.winner===localPid);
}

function receive(msg,conn=null){
  if(!msg||msg.v!==2||typeof msg.type!=='string'||!msg.data||typeof msg.data!=='object')return;
  const d=msg.data;

  if(role==='host'){
    const pid=conn?.__pid;
    if(msg.type==='HELLO'){
      const pr=profileSafe(d.profile);if(!pr||state?.players?.length>=GF.MAX_PLAYERS)return;
      if(state?.players?.some(p=>p.pid===pr.id))return;
      conn.__pid=pr.id;guests.set(pr.id,conn);rememberFriend(pr);
      if(state)state.players.push(makePlayer(pr));
      else lobbyProfiles.push(pr);
      broadcast('LOBBY',{players:lobbyProfiles});renderLobbyPlayers();
      maybeBeginBattle();
      return;
    }
    if(msg.type==='USE')return hostUse(pid,d.uses,d.target);
    if(msg.type==='ANSWER'){
      send(conn,'ANSWER_ACK',{qid:d.qid});
      return hostAnswer(pid,d.qid,d.choice);
    }
    if(msg.type==='DEFEND')return hostDefend(pid,d.shields);
    if(msg.type==='PRAY')return hostPray(pid);
    if(msg.type==='TRADE_CHOICE')return hostTradeChoice(pid,d);
    if(msg.type==='LEAVE')return disconnectPlayer(pid);
    return;
  }

  if(msg.type==='LOBBY'){lobbyProfiles=d.players||[];renderLobbyPlayers();return}
  if(msg.type==='NAVIGATE'){saveTransition({role:'guest',code:d.code,players:d.players,created:now()});goBattle(d.code);return}
  if(msg.type==='START'){localPid=d.you;publicState=d.state;hand=d.hand||[];learned=d.learned||[];render();return}
  if(msg.type==='STATE'){publicState=d;render();return}
  if(msg.type==='PRIVATE'){hand=d.hand||[];learned=d.learned||[];renderHand();return}
  if(msg.type==='PRESENT'){showPresentation(d);return}
  if(msg.type==='QUESTION'){receiveQuestion(d);return}
  if(msg.type==='QUESTION_END'){hideQuestion();return}
  if(msg.type==='ANSWER_ACK'){
    if(questionView?.qid===d.qid&&$('gf-q-role'))$('gf-q-role').textContent='ホスト受付済み · 判定中…';
    return
  }
  if(msg.type==='ANSWER_RESULT'){showAnswerResult(d);return}
  if(msg.type==='DEFENSE_PROMPT'){receiveDefense(d);return}
  if(msg.type==='DEFENSE_END'){hideDefense();renderHand();return}
  if(msg.type==='CLEAR'){hideQuestion();hideDefense();clearTimer();return}
  if(msg.type==='TRADE_PROMPT'){openTrade(d);return}
  if(msg.type==='TRADE_END'){closeTrade();pendingTrade=null;return}
  if(msg.type==='TRADE_ERROR'){if($('gf-exchange-error'))$('gf-exchange-error').textContent=d.reason||'エラー';return}
  if(msg.type==='CUTIN'){showCutin(d.line);return}
  if(msg.type==='FINISH'){showResult(d);return}
  if(msg.type==='HOST_LEFT'){status('ホストが退出しました');setTimeout(()=>location.href='./index.html?tab=godfield',1000);return}
}

function hostPray(pid){
  if(role!=='host'||state.phase!==PHASE.TURN||state.turn!==pid)return;
  const p=hostPlayer(pid),r=pray(p,rnd);if(!r.ok)return log(r.reason);
  presentation({actor:pid,result:r.discarded?`祈る · ${CARD[r.discarded]?.name||'神器'}を捨てた`:'祈る'});
  sync();setTimeout(nextTurn,500);
}

function disconnectPlayer(pid){
  if(role!=='host'||!pid)return;
  guests.delete(pid);
  if(state){
    const p=hostPlayer(pid);if(p){p.hp=0;p.alive=false}
    broadcast('STATE',publicView());checkEndOrContinue(()=>{if(state.turn===pid)nextTurn();else sync()});
  }else{
    lobbyProfiles=lobbyProfiles.filter(p=>p.id!==pid);broadcast('LOBBY',{players:lobbyProfiles});renderLobbyPlayers();
  }
}

let lobbyProfiles=[];
let expectedIds=null;

function resetConnections(){
  clearTimer();try{hostConn?.close()}catch{};hostConn=null;
  for(const c of guests.values())try{c.close()}catch{};guests.clear();
  try{peer?.destroy()}catch{};peer=null;
}

function createRoom(){
  resetConnections();role='host';localPid=getPublicProfile().id;roomCode=randomInviteCode();lobbyProfiles=[profileSafe(getPublicProfile())];
  status('部屋を作成中…');if($('gf-room-code'))$('gf-room-code').textContent=roomCode;
  peer=new Peer(ROOM_PREFIX+roomCode);
  peer.on('open',()=>{status('参加待ち');renderLobbyPlayers()});
  peer.on('connection',c=>{c.on('data',m=>receive(m,c));c.on('close',()=>disconnectPlayer(c.__pid));c.on('error',()=>disconnectPlayer(c.__pid))});
  peer.on('error',()=>status('部屋を作成できませんでした'));
}
function joinRoom(){
  resetConnections();role='guest';localPid=getPublicProfile().id;roomCode=normalizeInviteCode($('gf-join-code')?.value||'');
  if(roomCode.length!==6)return status('6文字コードを入力してください');
  peer=new Peer(randomPeerId());
  peer.on('open',()=>{
    hostConn=peer.connect(ROOM_PREFIX+roomCode,{reliable:true,serialization:'json'});
    hostConn.on('open',()=>{send(hostConn,'HELLO',{profile:getPublicProfile()});status('参加しました')});
    hostConn.on('data',m=>receive(m,hostConn));hostConn.on('close',()=>status('接続が切れました'));
  });
}
function startGame(){
  if(role!=='host'||lobbyProfiles.length<2)return;
  const players=lobbyProfiles.map(profileSafe).filter(Boolean);
  saveTransition({role:'host',code:roomCode,players,created:now()});
  for(const p of players)if(p.id!==localPid)send(guests.get(p.id),'NAVIGATE',{code:roomCode,players});
  setTimeout(()=>goBattle(roomCode),180);
}
function renderLobbyPlayers(){
  const box=$('gf-players');if(box){box.replaceChildren(...lobbyProfiles.map(p=>{const x=document.createElement('div');x.className='gf2-player';x.textContent=p.name;return x}))}
  if($('gf-lobby-note'))$('gf-lobby-note').textContent=`${lobbyProfiles.length} / ${GF.MAX_PLAYERS} 人`;
  if($('gf-start')){$('gf-start').hidden=role!=='host';$('gf-start').disabled=lobbyProfiles.length<2}
}

function maybeBeginBattle(){
  if(role!=='host'||!expectedIds)return;
  const ids=new Set([localPid,...guests.keys()]);
  if([...expectedIds].every(id=>ids.has(id)))startBattleState();
}
function startBattleState(){
  const profiles=(loadTransition()?.players||[]).map(profileSafe).filter(Boolean);
  state=makeState(profiles,rnd);
  publicState=publicView();
  for(const p of state.players){
    if(p.pid===localPid){hand=[...p.hand];learned=[...p.learned]}
    else send(guests.get(p.pid),'START',{you:p.pid,state:publicState,hand:[...p.hand],learned:[...p.learned]});
  }
  presentation({actor:state.turn,result:'BATTLE START'});
  sync();
}

function startBattleHost(tr){
  role='host';localPid=getPublicProfile().id;roomCode=normalizeInviteCode(tr.code);expectedIds=new Set((tr.players||[]).map(p=>p.id));
  state={version:2,phase:PHASE.LOBBY,turn:null,winner:null,draw:false,turnCount:0,players:[makePlayer(profileSafe(getPublicProfile()))]};
  publicState=publicView();status('参加者を再接続中…');
  peer=new Peer(BATTLE_PREFIX+roomCode);
  peer.on('open',()=>{status('対戦接続済み');maybeBeginBattle()});
  peer.on('connection',c=>{c.on('data',m=>receive(m,c));c.on('close',()=>disconnectPlayer(c.__pid));c.on('error',()=>disconnectPlayer(c.__pid))});
}
function startBattleGuest(tr){
  role='guest';localPid=getPublicProfile().id;roomCode=normalizeInviteCode(tr.code);publicState={phase:PHASE.LOBBY,turn:null,winner:null,draw:false,players:(tr.players||[]).map(p=>({pid:p.id,profile:p,hp:GF.INITIAL_HP,mp:GF.INITIAL_MP,money:GF.INITIAL_MONEY,alive:true,slump:false,ailments:[]}))};
  peer=new Peer(randomPeerId());
  peer.on('open',()=>{
    hostConn=peer.connect(BATTLE_PREFIX+roomCode,{reliable:true,serialization:'json'});
    hostConn.on('open',()=>{send(hostConn,'HELLO',{profile:getPublicProfile()});status('ホストへ再接続済み')});
    hostConn.on('data',m=>receive(m,hostConn));hostConn.on('close',()=>receive(packet('HOST_LEFT',{}),hostConn));
  });
}

function renderPlayers(){
  const box=$('gf-players');if(!box)return;box.replaceChildren();
  const me=(publicState?.players||[]).find(x=>x.pid===localPid);
  const fogged=Boolean(me?.ailments?.includes('fog'));
  for(const p of publicState?.players||[]){
    const x=document.createElement('div');x.className='gf2-player'+(!p.alive?' dead':'');
    if(p.pid===selectedTarget)x.classList.add('target');
    const s=document.createElement('strong');s.textContent=p.profile.name;
    const m=document.createElement('small');
    const states=[...(p.ailments||[]).map(ailmentLabel),...(p.slump?['スランプ']:[])];
    m.textContent=(fogged&&p.pid!==localPid)
      ?`HP ? · MP ? · ¥?${states.length?' · 状態不明':''}`
      :`HP ${p.hp} · MP ${p.mp} · ¥${p.money}${states.length?' · '+states.join(' / '):''}`;
    x.append(s,m);
    if(publicState?.phase===PHASE.TURN&&publicState.turn===localPid&&p.alive){
      x.classList.add('clickable');x.onclick=()=>{selectedTarget=p.pid;renderPlayers();renderHeader()};
    }
    box.append(x);
  }
}
function renderHeader(){
  const ps=publicState?.players||[],turn=ps.find(p=>p.pid===publicState?.turn),target=ps.find(p=>p.pid===selectedTarget);
  if($('gf-turn-name'))$('gf-turn-name').textContent=turn?.profile?.name||'WAIT';
  if($('gf-attacker-stats'))$('gf-attacker-stats').textContent=turn?`HP ${turn.hp} / MP ${turn.mp} / ¥${turn.money}`:'HP -- / MP -- / ¥--';
  if($('gf-target-display'))$('gf-target-display').textContent=target?.profile?.name||'SELECT';
  if($('gf-target-stats'))$('gf-target-stats').textContent=target?`HP ${target.hp} / MP ${target.mp} / ¥${target.money}`:'HP -- / MP -- / ¥--';
  if($('gf-lobby-note'))$('gf-lobby-note').textContent=`TURN ${publicState?.turnCount||0}`;
}
function handSortGroup(c){
  if(!c)return 99;
  if(c.kind==='utility'&&c.effect==='sell')return 0;
  if(c.kind==='utility'&&c.effect==='buy')return 1;
  if(c.kind==='utility'&&c.effect==='exchange')return 2;
  if(c.kind==='weapon'||c.kind==='add'||c.kind==='global')return 3;
  if(c.kind==='miracle'&&(c.miracleMode==='attack'||c.miracleMode==='add'))return 3;
  if(c.kind==='defense')return 4;
  return 5;
}
function sortedArtifactEntries(){
  const entries=[
    ...hand.map((id,slot)=>({id,slot,source:'hand',c:CARD[id]})),
    ...learned.map((id,slot)=>({id,slot,source:'learned',c:CARD[id]})),
  ].filter(x=>x.c);
  return entries.sort((a,b)=>{
    const groupDiff=handSortGroup(a.c)-handSortGroup(b.c);
    if(groupDiff)return groupDiff;
    // Within a category, physical hand cards precede learned miracles,
    // and each source preserves the original acquisition/slot order.
    if(a.source!==b.source)return a.source==='hand'?-1:1;
    return a.slot-b.slot;
  });
}

function renderHand(){
  const box=$('gf-hand');if(!box)return;box.replaceChildren();
  const myTurn=publicState?.phase===PHASE.TURN&&publicState.turn===localPid;
  const defending=pendingDefense?.target===localPid;
  const selectedDefense=selectedShieldIds();

  const setAttackSelection=(b,c)=>{
    if(!myTurn)return;
    if(c.auto){log(`${c.name} は自動発動神器です`);return}
    const modifier=isAttackModifier(c);
    if(modifier){b.classList.toggle('selected');return}
    if(c.kind==='weapon'){
      document.querySelectorAll('#gf-hand .gf2-card.selected').forEach(x=>{
        const cc=CARD[x.dataset.id];
        if(cc?.kind==='weapon'||!isAttackModifier(cc))x.classList.remove('selected');
      });
      b.classList.toggle('selected');return;
    }
    document.querySelectorAll('#gf-hand .gf2-card.selected').forEach(x=>x.classList.remove('selected'));
    b.classList.toggle('selected');
  };

  for(const entry of sortedArtifactEntries()){
    const {id,slot,source,c}=entry;
    const b=document.createElement('button');
    b.type='button';
    b.className='gf2-card';
    b.dataset.id=id;
    b.dataset.kind=c.kind;
    b.dataset.source=source;
    b.dataset.slot=String(slot);
    b.dataset.sortGroup=String(handSortGroup(c));

    const a=document.createElement('strong');
    a.textContent=source==='learned'?`☀ ${c.name}`:c.name;
    const sm=document.createElement('small');
    sm.textContent=source==='learned'?`習得済み · ${cardDesc(c)}`:cardDesc(c);
    b.append(a,sm);

    if(defending){
      // Learned miracles are not hand artifacts and cannot be selected as shields.
      if(source==='learned'){
        b.disabled=true;
        b.classList.add('defense-dim');
      }else{
        const localState=(publicState?.players||[]).find(x=>x.pid===localPid);
        const already=selectedDefenseSlots.includes(slot);
        const flashLimited=Boolean(localState?.ailments?.includes('flash')&&selectedDefenseSlots.length>=1&&!already);
        const usable=!flashLimited&&defenseCompatible(c,pendingDefense.attack,selectedDefense);
        b.disabled=!usable;
        b.classList.add(usable?'defense-usable':'defense-dim');
        if(already)b.classList.add('defense-selected');
        b.onclick=()=>{
          const i=selectedDefenseSlots.indexOf(slot);
          if(i>=0)selectedDefenseSlots.splice(i,1);else selectedDefenseSlots.push(slot);
          renderHand();renderDefense();
        };
      }
    }else{
      b.disabled=!myTurn;
      b.onclick=()=>setAttackSelection(b,c);
    }
    box.append(b);
  }

  if($('gf-use'))$('gf-use').disabled=!myTurn||defending;
  if($('gf-pray'))$('gf-pray').disabled=!myTurn||defending;
}
function canLocalAnswerQuestion(d){
  if(!d)return false;
  return (d.kind==='single'&&d.actor===localPid)
    ||(d.kind==='review'&&d.target===localPid)
    ||(d.kind==='global'&&Array.isArray(d.targets)&&d.targets.includes(localPid));
}
function submitQuestionChoice(choice){
  const d=questionView;
  if(!d||!canLocalAnswerQuestion(d))return;

  const choices=$('gf-choices');
  if(!choices||choices.dataset.locked==='1')return;

  const n=Number(choice);
  if(!Number.isInteger(n)||n<0||n>=8)return;

  choices.dataset.locked='1';
  choices.querySelectorAll('button[data-choice]').forEach(b=>{
    b.disabled=true;
    b.classList.toggle('answer-picked',Number(b.dataset.choice)===n);
  });

  if($('gf-q-role'))$('gf-q-role').textContent='回答送信中…';

  if(role==='host'){
    hostAnswer(localPid,d.qid,n);
    return;
  }

  const ok=send(hostConn,'ANSWER',{qid:d.qid,choice:n});
  if(!ok){
    choices.dataset.locked='0';
    choices.querySelectorAll('button[data-choice]').forEach(b=>b.disabled=false);
    if($('gf-q-role'))$('gf-q-role').textContent='送信失敗 · 接続を確認してもう一度押してください';
    log('回答を送信できませんでした');
  }
}
function renderQuestion(d){
  const box=$('gf-question');if(!box)return;
  questionView=d;
  const can=canLocalAnswerQuestion(d);
  const slot=document.querySelector('.gf2-question-slot');
  slot?.classList.add('active');
  slot?.classList.toggle('spectating',!can);
  box.hidden=false;
  box.classList.toggle('spectator',!can);

  $('gf-q-word').textContent=d.word;
  $('gf-q-stars').textContent=(d.stars===0?'★0':'★'.repeat(d.stars));

  const choices=$('gf-choices');
  choices.replaceChildren();
  choices.dataset.locked='0';

  const spectator=$('gf-q-spectator');
  if(can){
    $('gf-q-role').textContent='あなたが回答 · 8択 / 10秒';
    spectator.hidden=true;
    d.choices.forEach((x,i)=>{
      const b=document.createElement('button');
      b.type='button';
      b.dataset.choice=String(i);
      b.textContent=`${i+1}. ${x}`;
      b.disabled=false;
      b.setAttribute('aria-label',`${i+1}. ${x}`);
      b.addEventListener('click',()=>submitQuestionChoice(i));
      choices.append(b);
    });
  }else{
    $('gf-q-role').textContent='観戦中';
    spectator.hidden=false;
    const who=d.kind==='single'?nameOf(d.actor):d.kind==='review'?nameOf(d.target):'対象プレイヤー';
    spectator.textContent=`${who} が回答中。選択肢は回答者にだけ表示されます。`;
  }
  deadline=d.deadline||now()+GF.ANSWER_MS;
  renderTimer();
}
function renderDefense(){
  if(!pendingDefense)return hideDefense();
  const box=$('gf-defense');if(!box)return;
  const mine=pendingDefense.target===localPid;
  document.querySelector('.gf2-defense-slot')?.classList.toggle('active',mine);
  box.hidden=!mine;if(!mine)return;
  const ids=selectedShieldIds(),total=ids.reduce((n,id)=>n+(CARD[id]?.def||0),0);
  $('gf-defense-count').textContent=`${ids.length}枚 / 守${total}`;
  const localState=(publicState?.players||[]).find(x=>x.pid===localPid);
  if(localState?.ailments?.includes('flash'))$('gf-defense-count').textContent+=' · 閃光中は1枚まで';
  $('gf-defense-text').textContent=`攻撃 ${pendingDefense.attack.atk}。選択した防具の守備値合計ぶんだけダメージを軽減します。`;
  $('gf-defend').disabled=!ids.length;
}
function renderLog(){const b=$('gf-log');if(!b)return;b.replaceChildren(...logs.map(t=>{const p=document.createElement('p');p.textContent=t;return p}))}
function render(){renderPlayers();renderHand();renderHeader();renderLog()}

function bindBattle(){
  $('gf-choices')?.addEventListener('click',e=>{
    const button=e.target.closest('button[data-choice]');
    if(!button||button.disabled)return;
    submitQuestionChoice(button.dataset.choice);
  });
  $('gf-use')?.addEventListener('click',()=>{const uses=selectedUses();const target=targetPid();if(role==='host')hostUse(localPid,uses,target);else send(hostConn,'USE',{uses,target})});
  $('gf-pray')?.addEventListener('click',()=>role==='host'?hostPray(localPid):send(hostConn,'PRAY',{}));
  $('gf-defend')?.addEventListener('click',()=>{const shields=selectedShieldIds();role==='host'?hostDefend(localPid,shields):send(hostConn,'DEFEND',{shields})});
  $('gf-take')?.addEventListener('click',()=>role==='host'?hostDefend(localPid,[]):send(hostConn,'DEFEND',{shields:[]}));
  $('gf-leave')?.addEventListener('click',()=>{if(role==='guest')send(hostConn,'LEAVE',{});else broadcast('HOST_LEFT',{});resetConnections();clearTransition();location.href='./index.html?tab=godfield'});
  $('gf-buy-confirm')?.addEventListener('click',()=>sendTrade(true));$('gf-buy-cancel')?.addEventListener('click',()=>sendTrade(false));
  $('gf-sell-confirm')?.addEventListener('click',()=>sendTrade(true));$('gf-sell-cancel')?.addEventListener('click',()=>sendTrade(false));$('gf-sell-item')?.addEventListener('change',updateSellPreview);
  $('gf-exchange-confirm')?.addEventListener('click',()=>sendTrade(true));$('gf-exchange-cancel')?.addEventListener('click',()=>sendTrade(false));
  for(const id of ['gf-exchange-hp','gf-exchange-mp','gf-exchange-money'])$(id)?.addEventListener('input',validateExchangeUi);
}

export function initGodField(){
  if(!$('gf-panel')||document.body?.dataset?.gfBattle==='1')return;
  $('gf-create')?.addEventListener('click',createRoom);
  $('gf-join')?.addEventListener('click',joinRoom);
  $('gf-start')?.addEventListener('click',startGame);
  $('gf-leave')?.addEventListener('click',()=>{resetConnections();role=null;lobbyProfiles=[];renderLobbyPlayers();status('未接続')});
  $('gf-join-code')?.addEventListener('input',e=>e.target.value=normalizeInviteCode(e.target.value));
  renderLobbyPlayers();
}

export function initGodFieldBattle(){
  if(!$('gf-panel'))return;
  const htmlBuild=document.body?.dataset?.gfBuild||'';
  if(htmlBuild!==BUILD){
    const q=new URLSearchParams(location.search);
    location.replace(`./godfield-battle.html?room=${encodeURIComponent(q.get('room')||'')}&t=${Date.now()}&build=200`);
    return;
  }
  bindBattle();
  const tr=loadTransition();
  if(!tr||!tr.code||!['host','guest'].includes(tr.role)){status('対戦情報がありません');return}
  if(now()-(tr.created||0)>180000){clearTransition();status('対戦情報の期限切れ');return}
  if(tr.role==='host')startBattleHost(tr);else startBattleGuest(tr);
  render();
}

import { DUEL_CARDS, DUEL_CARD_IDS, duelCard, validateDeck, initialBattle, activeCard, buildQuestion, resolveChoice, cardArtStyle, other, ACTIVE_SEASON, ACTIVE_SEASON_INFO, ACTIVE_SEASON_WORD_COUNT, DECK_SIZE, MAX_S, MAX_A, DEFAULT_KO_TO_WIN, MIN_KO_TO_WIN, MAX_KO_TO_WIN } from './duel-data.js';
import { PACK_CARD_BY_ID } from './crystal-data.js';
import { CARD_BY_ID } from './data.js';
import { safeStorageGet, safeStorageSet, byteLength, P2P_MESSAGE_LIMIT_BYTES, INVITE_CODE_LENGTH, randomInviteCode, normalizeInviteCode, randomPeerId, randomUint32, exactKeys, safeInt } from './security.js';
import { getPublicProfile, validPublicProfile, rememberFriend, recordAnswerResult, recordMatchResult, appendProfileBadge, renderProfile } from './profile.js';
import { getReviewState, recordReviewMiss, clearReviewHistory } from './review-storage.js?v=2.00-final-008';

const $=id=>document.getElementById(id), DUEL_KEY='academia-duel-v5', PROTOCOL=5, ROOM_PREFIX='academia-duel-room-';
let saved={deck:[],koTarget:DEFAULT_KO_TO_WIN},peer=null,conn=null,role=null,remoteDeck=null,remoteProfile=null,battle=null,pending=null,qCounter=0,logs=[],messageTimes=[];
let localReady=false,remoteReady=false,startSent=false,startAck=false,readyTimer=null,startTimer=null;
let lastQuestionWord='', cutinTimer=null,matchStatsRecorded=false,duelFxLock=false,creditChainTimer=null,guestConnectTimer=null,guestConnectAttempt=0;
const answeredMistakeKeys=new Set(), answeredStatKeys=new Set();
function speakWord(word){
  if(typeof word!=='string'||!word||!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance)return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(word);
    u.lang='en-US';u.rate=.82;u.pitch=1;u.volume=1;
    const voices=speechSynthesis.getVoices();
    const en=voices.find(v=>/^en-(US|GB)/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));
    if(en)u.voice=en;
    speechSynthesis.speak(u);
  }catch{}
}
const allowedTypes=new Set(['READY','START','START_ACK','ACTION','QUESTION','ANSWER','RESOLVE','ABORT']);

function ownedIds(){
  const set=new Set(), a=safeStorageGet('academia-gacha-v1'), c=safeStorageGet('academia-crystal-v1');
  for(const [id,n] of Object.entries(a?.owned??{}))if(CARD_BY_ID[id]&&Number.isSafeInteger(n)&&n>0)set.add(id);
  for(const [id,n] of Object.entries(c?.owned??{}))if(PACK_CARD_BY_ID[id]&&Number.isSafeInteger(n)&&n>0)set.add(id);
  return set;
}
function restore(){
  const x=safeStorageGet(DUEL_KEY) ?? safeStorageGet('academia-duel-v4') ?? safeStorageGet('academia-duel-v3') ?? safeStorageGet('academia-duel-v2');
  if(Array.isArray(x?.deck)){
    const own=ownedIds(),clean=x.deck.filter(id=>typeof id==='string'&&DUEL_CARD_IDS.has(id)&&own.has(id)).slice(0,DECK_SIZE);
    if(new Set(clean).size===clean.length)saved.deck=clean;
  }
  if(Number.isSafeInteger(x?.koTarget)) saved.koTarget=Math.max(MIN_KO_TO_WIN,Math.min(MAX_KO_TO_WIN,x.koTarget));
  persist();
}
function persist(){if(!safeStorageSet(DUEL_KEY,{deck:saved.deck,koTarget:currentKoTarget()}))announce('対戦用保存データが16KiB上限を超えたため保存を拒否しました。'); updateKoUi();}
const setText=(id,text)=>{const node=$(id);if(node)node.textContent=text;};
function announce(text){setText('duel-live',text);}
function currentKoTarget(){return Number.isSafeInteger(saved.koTarget)?Math.max(MIN_KO_TO_WIN,Math.min(MAX_KO_TO_WIN,saved.koTarget)):DEFAULT_KO_TO_WIN;}
function updateKoUi(){
  const target=battle?.koTarget ?? currentKoTarget();
  const sel=$('duel-ko-target'); if(sel) sel.value=String(currentKoTarget());
  setText('duel-season-ko',String(target));
  setText('duel-ko-info', role==='guest'&&remoteReady ? `ホスト設定：${target}体KOで勝利` : `ホストが設定したKO数で勝敗が決まります。現在: ${target}体KO`);
}
function reviewState(){
  return getReviewState();
}
function updateReviewCount(n=reviewState().items.length){
  setText('review-count',String(n));
}
function recordMiss(word,meaning){
  if(typeof word!=='string'||typeof meaning!=='string')return;
  const state=recordReviewMiss(word,meaning);
  updateReviewCount(state.items.length);
  renderReview();
}
function rememberMistakeFromChoice(p,choice){
  if(!battle||!p)return;
  const q=buildQuestion(battle,p); if(!q) return;
  const key=`${p.q}:${q.word}`;
  if(choice!==q.correct && !answeredMistakeKeys.has(key)){ answeredMistakeKeys.add(key); recordMiss(q.word,q.move.meaning); }
}
function showAnswerFeedback(p,choice){if(!battle||!p)return;const q=buildQuestion(battle,p);if(!q)return;const correct=choice===q.correct,box=$('duel-feedback');if(!box)return;box.hidden=false;box.className=`duel-feedback ${correct?'is-correct':'is-wrong'}`;box.textContent=correct?`正解！ ${q.word} ＝ ${q.move.meaning}`:`不正解。正解：${q.word} ＝ ${q.move.meaning}`;rememberMistakeFromChoice(p,choice);}
export function renderReview(){const state=reviewState(),list=$('review-list'),empty=$('review-empty');if(!list)return;setText('review-season-title',ACTIVE_SEASON_INFO.title||ACTIVE_SEASON);updateReviewCount(state.items.length);list.replaceChildren();empty.hidden=state.items.length>0;for(const item of state.items){const row=document.createElement('div');row.className='review-row';const word=document.createElement('strong');word.textContent=item.w;const meaning=document.createElement('span');meaning.textContent=item.m;const meta=document.createElement('small');meta.textContent=`間違い ${item.c}回 · 最終 ${item.d}`;row.append(word,meaning,meta);list.append(row);}}
function log(text){logs.unshift(text);logs=logs.slice(0,24);renderLog();}
function renderLog(){const box=$('duel-log');if(!box)return;box.replaceChildren(...logs.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));}
function status(text){setText('duel-status',text);}
function renderNetState(){
  setText('duel-link-state',conn?.open?'接続済み':'未接続');
  setText('duel-local-ready',localReady?'READY':'未準備');
  setText('duel-remote-ready',remoteReady?'READY':'未準備');
  setText('duel-start-state',battle?'対戦中':startAck?'同期完了':startSent?'START送信':'待機');
  const btn=$('duel-start');
  if(btn){
    btn.textContent=localReady?'準備済み':'準備完了';
    btn.disabled=Boolean(localReady)||!(conn?.open&&saved.deck.length===DECK_SIZE&&!deckError());
  }
  const sel=$('duel-ko-target');
  if(sel) sel.disabled=Boolean(battle)||role==='guest'||localReady;
}

function deckError(deck=saved.deck,owned=ownedIds()){
  if(deck.length>DECK_SIZE)return'10枚まで';
  if(new Set(deck).size!==deck.length)return'同じカードは1枚まで';
  if(!deck.every(id=>DUEL_CARD_IDS.has(id)&&owned.has(id)))return'カード図鑑で未獲得のカードは使用できません';
  const cards=deck.map(duelCard);
  if(cards.filter(c=>c.rank==='S').length>MAX_S)return`Sは最大${MAX_S}枚`;
  if(cards.filter(c=>c.rank==='A').length>MAX_A)return`Aは最大${MAX_A}枚`;
  return'';
}
function cardThumb(card){const wrap=document.createElement('span');wrap.className='duel-thumb';wrap.setAttribute('aria-hidden','true');wrap.style.cssText=cardArtStyle(card);return wrap;}
function resetReadiness(reason=''){
  localReady=false;remoteReady=false;remoteDeck=null;startSent=false;startAck=false;
  clearInterval(readyTimer);clearInterval(startTimer);clearTimeout(guestConnectTimer);guestConnectTimer=null;guestConnectAttempt=0;readyTimer=null;startTimer=null;
  if(reason)announce(reason);
  renderNetState();
  updateKoUi();
}

function addDeckCard(id){
  const own=ownedIds(),c=duelCard(id);
  if(!c||!own.has(id))return;
  const candidate=[...saved.deck,id],err=deckError(candidate,own);
  if(err){announce(err);return}
  saved.deck=candidate;
  resetReadiness();
  persist();
  renderDeck();
  announce(`${c.name} をデッキに追加しました。`);
}
function removeDeckCard(id){
  if(!saved.deck.includes(id))return;
  const c=duelCard(id);
  saved.deck=saved.deck.filter(x=>x!==id);
  resetReadiness();
  persist();
  renderDeck();
  announce(`${c?.name||'カード'} をデッキから外しました。`);
}

function renderDeck(){
  const own=ownedIds(),before=saved.deck.length;
  saved.deck=saved.deck.filter(id=>own.has(id)&&DUEL_CARD_IDS.has(id));
  if(saved.deck.length!==before&&localReady)resetReadiness('所持状況が変わったためREADYを解除しました。');
  persist();
  setText('duel-deck-count',`${saved.deck.length} / ${DECK_SIZE}`);
  setText('duel-deck-note',saved.deck.length===DECK_SIZE?`デッキ完成。カード図鑑で獲得済みのカードだけで構成されています。現在の勝利条件は${currentKoTarget()}体KO。`:`あと${DECK_SIZE-saved.deck.length}枚。S最大${MAX_S}・A最大${MAX_A}。`);

  const list=$('duel-deck-list');list.replaceChildren();
  saved.deck.forEach((id,i)=>{
    const c=duelCard(id),row=document.createElement('div');
    row.className='duel-deck-row';
    row.append(cardThumb(c));
    const text=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
    strong.textContent=`${i+1}. ${c.name}`;small.textContent=`${c.rank} · HP ${c.hp} · ${c.trait.name}`;
    text.append(strong,small);
    const b=document.createElement('button');
    b.className='outline-button';b.type='button';b.textContent='外す';
    b.dataset.duelRemove=id;
    row.append(text,b);list.append(row);
  });

  const pool=$('duel-card-pool');pool.replaceChildren();
  DUEL_CARDS.filter(c=>own.has(c.id)&&!saved.deck.includes(c.id)).forEach(raw=>{
    const c=duelCard(raw.id),b=document.createElement('button');
    b.type='button';b.className='duel-pool-card';b.dataset.duelAdd=c.id;
    b.setAttribute('aria-label',`${c.name}をデッキに追加`);
    b.append(cardThumb(c));
    const copy=document.createElement('span'),st=document.createElement('strong'),sm=document.createElement('small');
    st.textContent=c.name;sm.textContent=`${c.rank} · ${c.trait.name}`;
    copy.append(st,sm);b.append(copy);pool.append(b);
  });
  renderNetState();
}
function autoDeck(){const own=ownedIds(),sorted=DUEL_CARDS.filter(c=>own.has(c.id)).sort((a,b)=>'SABCDEF'.indexOf(a.rank)-'SABCDEF'.indexOf(b.rank));let deck=[];for(const c of sorted){const next=[...deck,c.id];if(next.length<=DECK_SIZE&&!deckError(next,own))deck=next;if(deck.length===DECK_SIZE)break;}saved.deck=deck;resetReadiness();persist();renderDeck();}

function rateLimitOkay(){const now=Date.now();messageTimes=messageTimes.filter(t=>now-t<10000);if(messageTimes.length>=40)return false;messageTimes.push(now);return true;}
function validDeckPayload(deck){return validateDeck(deck,null);}
function validMsg(m){
  if(!exactKeys(m,['v','t','d'])||m.v!==PROTOCOL||!allowedTypes.has(m.t))return false;
  const d=m.d;
  if(m.t==='READY')return exactKeys(d,['season','deck','koTarget','profile'])&&d.season===ACTIVE_SEASON&&validDeckPayload(d.deck)&&safeInt(d.koTarget,MIN_KO_TO_WIN,MAX_KO_TO_WIN)&&validPublicProfile(d.profile);
  if(m.t==='START')return exactKeys(d,['season','hostDeck','guestDeck','seed','koTarget','hostProfile','guestProfile'])&&d.season===ACTIVE_SEASON&&validDeckPayload(d.hostDeck)&&validDeckPayload(d.guestDeck)&&safeInt(d.seed,0,4294967295)&&safeInt(d.koTarget,MIN_KO_TO_WIN,MAX_KO_TO_WIN)&&validPublicProfile(d.hostProfile)&&validPublicProfile(d.guestProfile);
  if(m.t==='START_ACK')return exactKeys(d,['season'])&&d.season===ACTIVE_SEASON;
  if(m.t==='ACTION')return exactKeys(d,['round','move'])&&safeInt(d.round,1,1000)&&safeInt(d.move,0,4);
  if(m.t==='QUESTION')return exactKeys(d,['q','round','from','move','seed'])&&safeInt(d.q,1,100000)&&safeInt(d.round,1,1000)&&['host','guest'].includes(d.from)&&safeInt(d.move,0,4)&&safeInt(d.seed,0,4294967295);
  if(m.t==='ANSWER'||m.t==='RESOLVE')return exactKeys(d,['q','choice'])&&safeInt(d.q,1,100000)&&safeInt(d.choice,0,9);
  if(m.t==='ABORT')return exactKeys(d,[]);
  return false;
}
function send(t,d){if(!conn?.open)return false;const m={v:PROTOCOL,t,d},raw=JSON.stringify(m);if(byteLength(raw)>P2P_MESSAGE_LIMIT_BYTES)return false;conn.send(m);return true;}
function sendReady(){if(!localReady||!conn?.open)return;send('READY',{season:ACTIVE_SEASON,deck:[...saved.deck],koTarget:currentKoTarget(),profile:getPublicProfile()});}
function maybeStartHost(){if(role==='host'&&localReady&&remoteReady&&remoteDeck&&!battle&&!startSent)startAsHost();}
function receive(data){
  if(!rateLimitOkay()){disconnect('通信頻度が上限を超えたため切断しました。');return;}
  let raw;try{raw=JSON.stringify(data);}catch{return;}
  if(byteLength(raw)>P2P_MESSAGE_LIMIT_BYTES){disconnect('8KiBを超える通信を拒否しました。');return;}
  if(!validMsg(data)){log('不正な形式または異なるシーズンのP2Pメッセージを拒否しました。');return;}
  const {t,d}=data;
  if(t==='ABORT'){endBattleSession('相手が対戦を中断しました。');return;}
  if(t==='READY'){
    remoteDeck=[...d.deck];const firstProfile=!remoteProfile||remoteProfile.id!==d.profile.id;remoteProfile={...d.profile,stats:{...d.profile.stats}};remoteReady=true;if(firstProfile)rememberFriend(remoteProfile);
    if(role==='guest') saved.koTarget=d.koTarget;
    log(`${remoteProfile.name} のREADYを確認しました。`);renderNetState();updateKoUi();maybeStartHost();return;
  }
  if(t==='START'&&role==='guest'){
    if(!localReady||JSON.stringify(d.guestDeck)!==JSON.stringify(saved.deck)){disconnect('デッキ確認に失敗しました。');return;}
    if(battle){send('START_ACK',{season:ACTIVE_SEASON});return;}
    battle=initialBattle(d.hostDeck,d.guestDeck,d.seed,d.koTarget);remoteDeck=[...d.hostDeck];remoteProfile={...d.hostProfile,stats:{...d.hostProfile.stats}};saved.koTarget=d.koTarget;pending=null;matchStatsRecorded=false;answeredStatKeys.clear();logs=[battle.first===role?'対戦開始。あなたが先攻です。':'対戦開始。相手が先攻です。'];send('START_ACK',{season:ACTIVE_SEASON});startAck=true;clearInterval(readyTimer);renderNetState();updateKoUi();renderBattle();return;
  }
  if(t==='START_ACK'&&role==='host'){
    startAck=true;clearInterval(startTimer);startTimer=null;log('START同期を確認しました。');renderNetState();return;
  }
  if(!battle)return;
  if(t==='ACTION'&&role==='host'){if(battle.turn!=='guest'||d.round!==battle.round||pending)return;beginQuestion('guest',d.move);return;}
  if(t==='QUESTION'&&role==='guest'){if(d.round!==battle.round||d.from!==battle.turn||pending)return;pending={...d};renderQuestionIfDefending();return;}
  if(t==='ANSWER'&&role==='host'){if(!pending||pending.q!==d.q||other(pending.from)!=='guest')return;resolveAndBroadcast(d.choice);return;}
  if(t==='RESOLVE'&&role==='guest'){if(!pending||pending.q!==d.q)return;if(other(pending.from)===role)showAnswerFeedback(pending,d.choice);maybeShowSpecialCutin(pending,d.choice);playAttackFx(pending);const result=resolveChoice(battle,pending,d.choice);if(!result){disconnect('対戦状態の検証に失敗しました。');return;}battle=result.state;log(result.summary);pending=null;renderBattle();playCreditChainEvents(result.events);return;}
}
function cleanupPeer(){
  clearInterval(readyTimer);clearInterval(startTimer);readyTimer=null;startTimer=null;
  try{conn?.close();}catch{}try{peer?.destroy();}catch{}
  conn=null;peer=null;role=null;remoteDeck=null;remoteProfile=null;battle=null;pending=null;messageTimes=[];localReady=false;remoteReady=false;startSent=false;startAck=false;answeredMistakeKeys.clear();answeredStatKeys.clear();matchStatsRecorded=false;duelFxLock=false;clearTimeout(creditChainTimer);const cc=$('duel-credit-chain');if(cc){cc.hidden=true;cc.classList.remove('active');}setBattleMode(false);renderDeck();renderNetState();updateKoUi();
}
function disconnect(reason){cleanupPeer();status('未接続');announce(reason);log(reason);}
function endBattleSession(reason){
  clearInterval(startTimer);startTimer=null;pending=null;battle=null;qCounter=0;startSent=false;startAck=false;localReady=false;remoteReady=false;answeredMistakeKeys.clear();answeredStatKeys.clear();matchStatsRecorded=false;duelFxLock=false;clearTimeout(creditChainTimer);const cc=$('duel-credit-chain');if(cc){cc.hidden=true;cc.classList.remove('active');}
  const feedback=$('duel-feedback');if(feedback)feedback.hidden=true;
  setBattleMode(false);status(conn?.open?'接続済み · READY待ち':'未接続');announce(reason);logs=[reason];renderDeck();renderNetState();renderLog();updateKoUi();
}
function abortBattle(){
  if(!battle)return;
  if(!globalThis.confirm('対戦を中断しますか？ 両方の画面が対戦ロビーに戻ります。'))return;
  send('ABORT',{});endBattleSession('対戦を中断しました。');
}
function cutinSpecForAttack(p){
  const c=battle&&p?activeCard(battle,p.from):null; if(!c) return null;
  if(c.type==='mori') return {kicker:'MORI CUT-IN', line:'お前Fラン過ぎ', image:c.image, alt:c.name};
  if(c.id==='uni-s-3') return {kicker:'RE:TAKE OSAKA CUT-IN', line:'お前の単位ねえから', image:c.image, alt:c.name};
  if(c.id==='uni-kindai-photo') return {kicker:'KINDAI PHOTO CUT-IN', line:'もう一浪したほうがいいんちゃうん', image:c.image, alt:c.name};
  return null;
}
function showSpecialCutin(spec){
  const cut=$('duel-special-cutin'), art=$('duel-cutin-art'); if(!cut||!art||!spec) return;
  setText('duel-cutin-kicker', spec.kicker);
  setText('duel-cutin-line', spec.line);
  art.src=spec.image; art.alt=spec.alt || 'カットイン';
  clearTimeout(cutinTimer); cut.hidden=false; cut.classList.remove('active'); void cut.offsetWidth; cut.classList.add('active');
  cutinTimer=setTimeout(()=>{cut.classList.remove('active');cut.hidden=true;},1600);
}
function maybeShowSpecialCutin(p,choice){
  if(!battle||!p)return;
  const q=buildQuestion(battle,p), spec=cutinSpecForAttack(p);
  if(spec && q && choice!==q.correct) showSpecialCutin(spec);
}
function playCreditChainEvents(events){
  const event=Array.isArray(events)?events.find(e=>e&&e.type==='credit-chain'):null;
  if(!event)return;
  const box=$('duel-credit-chain'),attacker=$('credit-chain-attacker'),target=$('credit-chain-target');
  const a=duelCard(event.attackerId),t=duelCard(event.targetId);
  if(!box||!attacker||!target||!a||!t)return;
  attacker.src=a.image;attacker.alt=a.name;target.src=t.image;target.alt=t.name;
  clearTimeout(creditChainTimer);duelFxLock=true;box.hidden=false;box.classList.remove('active');void box.offsetWidth;box.classList.add('active');renderBattle();
  creditChainTimer=setTimeout(()=>{box.classList.remove('active');box.hidden=true;duelFxLock=false;renderBattle();},1650);
}
function duelPeerOptions(){
  return {
    debug:0,
    config:{
      iceServers:[
        {urls:'stun:stun.l.google.com:19302'},
        {urls:'stun:stun1.l.google.com:19302'}
      ]
    }
  };
}
function makeDuelPeer(id){return new Peer(id,duelPeerOptions())}

function connectDuelGuest(code){
  if(role!=='guest'||!peer||peer.destroyed||conn?.open)return;
  const attempt=++guestConnectAttempt;
  status(`接続中… ${attempt}/10`);

  const c=peer.connect(ROOM_PREFIX+code,{reliable:true,serialization:'json'});
  let opened=false,done=false;

  const retry=()=>{
    if(done||opened||conn?.open||role!=='guest')return;
    done=true;
    if(conn===c)conn=null;
    try{c.close()}catch{}
    if(attempt<10){
      guestConnectTimer=setTimeout(()=>connectDuelGuest(code),550+attempt*120);
    }else{
      status('接続できませんでした');
      announce('招待コードは正しい場合でも、通信環境によってP2P接続できないことがあります。Wi-Fi/モバイル回線を切り替えて再試行してください。');
    }
  };

  c.on('open',()=>{
    if(done)return;
    opened=true;done=true;
    clearTimeout(guestConnectTimer);
    wire(c);
  });
  c.on('error',()=>retry());
  c.on('close',()=>{if(!opened)retry()});
  guestConnectTimer=setTimeout(retry,2800);
}

function wire(c){
  if(conn&&conn.open){try{c.close();}catch{}return;}
  conn=c;
  const onOpen=()=>{status('接続済み · READY待ち');announce('P2P接続に成功しました。両者が「準備完了」を押してください。');log('DataChannel接続済み。');renderDeck();renderNetState();};
  if(c.open)onOpen();else c.on('open',onOpen);
  c.on('data',receive);c.on('close',()=>disconnect('相手との接続が切れました。'));c.on('error',()=>disconnect('通信エラーが発生しました。'));
}
function createVisibleRoomCode(){
  const code=randomInviteCode();
  setText('duel-room-code',code);
  status(`コード作成済み · ${code} · 通信準備中…`);
  announce(`招待コード ${code} を作成しました。通信の準備をしています。`);
  return code;
}
function makeRoom(){
  const code=createVisibleRoomCode();
  // Ver.1.10で実際に動作していた同期ロード済みPeerJSを使う。
  requestAnimationFrame(()=>{
    cleanupPeer(); role='host'; setText('duel-room-code',code);
    if(typeof globalThis.Peer!=='function'){
      status(`コード ${code} · 通信ライブラリ未読込`);
      announce('6文字コードは作成できましたが、PeerJSを読み込めませんでした。ページを再読み込みしてからもう一度お試しください。');
      return;
    }
    try{
      status('部屋を作成中…');
      peer=makeDuelPeer(ROOM_PREFIX+code);
      peer.on('open',()=>status(`待機中 · ${code}`));
      peer.on('connection',wire);
      peer.on('error',e=>{
        if(e?.type==='unavailable-id'){
          announce('同じコードが使用中だったため、新しいコードを作ります。');
          makeRoom();
        }else{
          cleanupPeer(); setText('duel-room-code',code);
          status(`コード ${code} · 通信エラー`);
          announce('部屋の通信接続に失敗しました。ネット接続を確認してください。');
        }
      });
    }catch{
      status(`コード ${code} · 通信初期化失敗`);
      announce('通信初期化に失敗しました。ページを再読み込みしてもう一度お試しください。');
    }
  });
}
function joinRoom(){
  const input=$('duel-join-code'),code=normalizeInviteCode(input.value); input.value=code;
  if(code.length!==INVITE_CODE_LENGTH){announce('6文字の招待コードを入力してください。');return;}
  cleanupPeer(); role='guest';
  if(typeof globalThis.Peer!=='function'){
    status('通信ライブラリ未読込');
    announce('PeerJSを読み込めませんでした。ページを再読み込みしてからもう一度お試しください。');
    return;
  }
  status('接続中…');
  try{
    peer=makeDuelPeer(randomPeerId());
    peer.on('open',()=>connectDuelGuest(code));
    peer.on('error',e=>{
      if(e?.type==='peer-unavailable'&&guestConnectAttempt<10){
        clearTimeout(guestConnectTimer);
        guestConnectTimer=setTimeout(()=>connectDuelGuest(code),650);
        return;
      }
      if(!conn?.open)status('通信エラー · 再接続中…');
    });
  }catch{disconnect('通信初期化に失敗しました。');}
}
function ready(){
  if(!conn?.open||saved.deck.length!==DECK_SIZE||deckError()){announce('カード図鑑で獲得済みのカードから、10枚の有効なデッキを完成させてください。');return;}
  localReady=true;sendReady();clearInterval(readyTimer);readyTimer=setInterval(()=>{if(!battle&&!startAck)sendReady();else clearInterval(readyTimer);},1200);
  status(remoteReady?'両者READY · 開始同期中…':'自分READY · 相手待ち…');log('自分のREADYを送信しました。');renderNetState();maybeStartHost();
}
function startAsHost(){
  if(role!=='host'||!localReady||!remoteReady||!remoteDeck||!validDeckPayload(remoteDeck)||!validateDeck(saved.deck,ownedIds()))return;
  const seed=randomUint32(), koTarget=currentKoTarget();
  battle=initialBattle(saved.deck,remoteDeck,seed,koTarget);pending=null;qCounter=0;matchStatsRecorded=false;answeredStatKeys.clear();logs=[battle.first===role?'対戦開始。あなたが先攻です。':'対戦開始。相手が先攻です。'];startSent=true;
  const payload={season:ACTIVE_SEASON,hostDeck:[...saved.deck],guestDeck:[...remoteDeck],seed,koTarget,hostProfile:getPublicProfile(),guestProfile:remoteProfile};send('START',payload);
  clearInterval(startTimer);let tries=0;startTimer=setInterval(()=>{if(startAck||!conn?.open||tries++>=5){clearInterval(startTimer);startTimer=null;return;}send('START',payload);},1000);
  status('START送信済み · 相手同期確認中…');renderNetState();renderBattle();
}
function useMove(move){if(!battle||pending||duelFxLock||battle.winner||battle.turn!==role||!safeInt(move,0,4))return;if(role==='host')beginQuestion('host',move);else send('ACTION',{round:battle.round,move});}
function beginQuestion(from,move){if(role!=='host'||!battle||pending||battle.turn!==from)return;const feedback=$('duel-feedback');if(feedback)feedback.hidden=true;const p={q:++qCounter,round:battle.round,from,move,seed:randomUint32()};if(!buildQuestion(battle,p))return;pending=p;send('QUESTION',p);renderQuestionIfDefending();renderBattle();}
function answer(choice){if(!pending||other(pending.from)!==role||!safeInt(choice,0,9))return;const q=buildQuestion(battle,pending),statKey=`${pending.q}:${role}`;if(q&&!answeredStatKeys.has(statKey)){answeredStatKeys.add(statKey);recordAnswerResult(choice===q.correct);}rememberMistakeFromChoice(pending,choice);if(role==='host')resolveAndBroadcast(choice);else{send('ANSWER',{q:pending.q,choice});disableAnswers();}}
function playAttackFx(p){if(!battle)return;const c=activeCard(battle,p.from),fx=$('duel-fx');if(!c||!fx)return;fx.className='duel-fx';void fx.offsetWidth;const type=c.id==='fukushima-kim-collab'?'rocket':c.moves[p.move].effect?.type||'hit';fx.classList.add(`fx-${type}`,'active');setTimeout(()=>{fx.className='duel-fx';},650);}
function resolveAndBroadcast(choice){if(role!=='host'||!pending)return;if(other(pending.from)===role)showAnswerFeedback(pending,choice);maybeShowSpecialCutin(pending,choice);playAttackFx(pending);const result=resolveChoice(battle,pending,choice);if(!result){disconnect('対戦状態の検証に失敗しました。');return;}send('RESOLVE',{q:pending.q,choice});battle=result.state;log(result.summary);pending=null;renderBattle();playCreditChainEvents(result.events);}
function disableAnswers(){$('duel-answers').querySelectorAll('button').forEach(b=>b.disabled=true);setText('duel-question-note','回答を送信しました。判定待ち…');}
function renderQuestionIfDefending(){const box=$('duel-question');box.hidden=true;if(!battle||!pending||other(pending.from)!==role)return;const q=buildQuestion(battle,pending);if(!q)return;setText('duel-word',q.word);lastQuestionWord=q.word;speakWord(q.word);setText('duel-question-note','発音を聞いて、最も近い意味を1つ選択。文字入力はありません。');const answers=$('duel-answers');answers.replaceChildren();q.choices.forEach((text,i)=>{const b=document.createElement('button');b.type='button';b.className='duel-answer';b.textContent=`${i+1}. ${text}`;b.addEventListener('click',()=>answer(i));answers.append(b);});box.hidden=false;}
function effectText(effect){
  if(!effect)return '追加効果なし';
  if(effect.type==='heal')return `攻撃成功時：自分を${effect.v}回復`;
  if(effect.type==='weaken')return `攻撃成功時：相手の次の攻撃ダメージを${effect.v}減少`;
  if(effect.type==='field')return `攻撃成功時：語彙フィールド展開。以後、双方の攻撃ダメージ+${effect.v}`;
  if(effect.type==='recoil')return `防御成功時：基本反動に加えて自分に${effect.v}追加反動`;
  return '特殊効果';
}
function setBattleMode(active){
  const panel=document.querySelector('#duel-panel .duel-panel');
  if(panel)panel.classList.toggle('battle-active',Boolean(active));
  document.body.classList.toggle('duel-battle-mode',Boolean(active));
  if(active){
    const arena=$('duel-arena');
    requestAnimationFrame(()=>arena?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
  }
}
function fighter(side,label){const host=$(`duel-${label}`);host.replaceChildren();if(!battle)return;const prof=side===role?getPublicProfile():remoteProfile;appendProfileBadge(host,prof,label==='me'?'YOU':'OPPONENT');const c=activeCard(battle,side);if(!c){const p=document.createElement('p');p.textContent='戦闘不能';host.append(p);return;}const art=cardThumb(c),copy=document.createElement('div'),ey=document.createElement('p');ey.className='eyebrow';ey.textContent=`${c.rank} RANK`;const h=document.createElement('h3');h.textContent=c.name;const tr=document.createElement('p');tr.textContent=`${c.trait.name} — ${c.trait.text}`;const bar=document.createElement('div');bar.className='duel-hp';const fill=document.createElement('i');const hp=battle.hp[side][battle.idx[side]];fill.style.width=`${Math.max(0,Math.min(100,hp/c.hp*100))}%`;bar.append(fill);const stat=document.createElement('small');stat.textContent=`HP ${hp} / ${c.hp} · KO ${battle.ko[side]} / ${battle.koTarget ?? DEFAULT_KO_TO_WIN}`;copy.append(ey,h,tr,bar,stat);host.append(art,copy);}
function renderBattle(){
  const arena=$('duel-arena');arena.hidden=!battle;setBattleMode(Boolean(battle));if(!battle){$('duel-question').hidden=true;return;}fighter(role,'me');fighter(other(role),'opp');
  setText('duel-battle-round',`ROUND ${battle.round}`);
  setText('duel-battle-first',battle.first===role?'あなたが先攻':'相手が先攻');
  if(battle.winner){if(!matchStatsRecorded){matchStatsRecorded=true;recordMatchResult(battle.winner===role);renderProfile();}setText('duel-turn',battle.winner===role?'VICTORY':'DEFEAT');$('duel-moves').replaceChildren();$('duel-question').hidden=true;return;}
  setText('duel-turn',battle.turn===role?'あなたのターン':'相手のターン');const moves=$('duel-moves');moves.replaceChildren();const c=activeCard(battle,role);if(c)c.moves.forEach((m,i)=>{const b=document.createElement('button');b.type='button';b.className='duel-move';b.disabled=battle.turn!==role||Boolean(pending)||duelFxLock;const strong=document.createElement('strong');strong.textContent=`${m.name} · ${m.damage}`;const small=document.createElement('small');small.textContent=`${m.word}＝${m.meaning} ｜ 威力 ${m.damage} ｜ 防御成功時：基本反動${c.missRecoil} ｜ ${effectText(m.effect)}`;b.append(strong,small);b.addEventListener('click',()=>useMove(i));moves.append(b);});renderQuestionIfDefending();renderLog();
}

export function initDuel(){
  if(typeof $('duel-card-pool')?.replaceChildren!=='function')return;
  restore();setText('duel-season',ACTIVE_SEASON_INFO.title||ACTIVE_SEASON);setText('duel-season-number',ACTIVE_SEASON_INFO.number||'--');setText('duel-season-copy',`${ACTIVE_SEASON_INFO.subtitle||'現在の単語シーズン'}。今シーズンの単語セットで全対戦を行います。`);setText('duel-season-words',String(ACTIVE_SEASON_WORD_COUNT)); updateKoUi();
  setText('duel-room-code','------');$('duel-join-code').maxLength=INVITE_CODE_LENGTH;$('duel-create-room').addEventListener('click',makeRoom);$('duel-join').addEventListener('click',joinRoom);
  $('duel-card-pool')?.addEventListener('click',event=>{
    const button=event.target.closest('button[data-duel-add]');
    if(button)addDeckCard(button.dataset.duelAdd);
  });
  $('duel-deck-list')?.addEventListener('click',event=>{
    const button=event.target.closest('button[data-duel-remove]');
    if(button)removeDeckCard(button.dataset.duelRemove);
  });$('duel-join-code').addEventListener('input',e=>{e.target.value=normalizeInviteCode(e.target.value);});$('duel-ko-target')?.addEventListener('change',e=>{const v=Number(e.target.value); if(Number.isSafeInteger(v)){saved.koTarget=Math.max(MIN_KO_TO_WIN,Math.min(MAX_KO_TO_WIN,v)); resetReadiness('勝利条件を変更したためREADYを解除しました。'); persist(); renderDeck(); updateKoUi();}});$('duel-start').addEventListener('click',ready);$('duel-auto').addEventListener('click',autoDeck);$('duel-clear').addEventListener('click',()=>{saved.deck=[];resetReadiness();persist();renderDeck();});
  $('duel-go-summon').addEventListener('click',()=>$('summon-tab').click());$('duel-go-collection').addEventListener('click',()=>$('collection-tab').click());$('duel-tab').addEventListener('click',()=>setTimeout(renderDeck,0));
  $('duel-speak-word')?.addEventListener('click',()=>speakWord(lastQuestionWord));$('duel-abort')?.addEventListener('click',abortBattle);$('review-clear')?.addEventListener('click',()=>{clearReviewHistory();renderReview();announce('復習履歴を消去しました。');});window.addEventListener('storage',()=>{renderDeck();renderReview(); updateKoUi();});document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderDeck();renderReview(); updateKoUi();}});renderDeck();renderLog();renderNetState();renderReview(); updateKoUi();
}

import {RANK_BY_ID} from './data.js';
import {PACK_CARDS,PACK_CARD_BY_ID,PACK_ITEM_BY_ID,EXCHANGE_CARDS,PACK_POOL,PACK_RATE,PACK_SIZE,PACK_CHARGE_CAP,recoverPackCharges,restorePackState,emptyPackState,commitPack,advancePack,finishPack,redeemCrystal} from './crystal-data.js';
import {safeStorageGet,safeStorageSet} from './security.js';
import {duelCard} from './duel-data.js';

const $=id=>document.getElementById(id),key='academia-crystal-v1';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=emptyPackState();
try{state=restorePackState(safeStorageGet(key));}catch{}
export const getPackState=()=>state;
let phase='closed',sessionItems=[],timer=null,exchangeTimer=null,changing=false,pointer=null,tearWidth=1;
let rechargeTimer=null,lastNotifiedOwned=state.owned,shopKey='';
let notify=()=>{},tone=()=>{},unlockSound=()=>{},motion=()=>false,openAlbum=()=>{};

export function packCardMarkup(card,{interactive=true,eager=false}={}){
 const count=state.owned[card.id]||0,stage=Math.min(5,count),high=card.edition==='hall';
 const tag=interactive?'button':'div';
 const sp=card.sprite,x=sp.columns>1?sp.column/(sp.columns-1)*100:0,y=sp.rows>1?sp.row/(sp.rows-1)*100:0;
 return `<${tag} class="game-card crystal-card evolution-${stage} ${card.type==='university'?'campus-english':'uc-character'} ${high?'hall-card':''} ${card.motion?'duo-motion':''}" style="--rank-color:${RANK_BY_ID[card.rank].color};--sprite-image:url('${card.image}');--sprite-size:${sp.columns*100}% ${sp.rows*100}%;--sprite-position:${x}% ${y}%" ${interactive?`data-pack-card="${card.id}" aria-label="${escape(card.name)}、${high?'殿堂レア':card.edition?'通常写真レア':card.rank+'ランク'}、所持${count}枚の詳細"`:''}>
  <span class="sprite-window"><span class="sprite-art"><img class="sprite-sheet" src="${card.image}" alt="${escape(card.name)}の${card.type==='university'?'キャンパス風':'人物'}イラスト" loading="${eager?'eager':'lazy'}" decoding="async" style="width:${sp.columns*100}%;height:${sp.rows*100}%;left:${-sp.column*100}%;top:${-sp.row*100}%"></span></span><span class="card-shade"></span>
  <span class="card-rank">${card.rank}<small>${high?'HALL OF FAME':card.edition?'PHOTO RARE':'CAMPUS'}</small></span>
  ${high?'<span class="hall-seal">殿堂</span>':''}${card.motion?'<span class="motion-badge">✦ LIVE ART</span><span class="duo-light" aria-hidden="true"></span>':''}
  ${stage===5?'<span class="frame-crown">✦ MAX</span>':''}<span class="frame-corners" aria-hidden="true"></span>
  <div class="card-info"><p class="card-subtitle">${escape(card.type==='university'?'CAMPUS COLLECTION':card.university)}</p><h3 class="card-name">${escape(card.name)}</h3><p class="crystal-card-caption">${escape(card.type==='university'?card.japaneseName:'カルフォルニア大学')}</p><div class="card-meta"><span>${high?'CRYSTAL EXCHANGE':card.edition?'PHOTO EDITION':'ENGLISH EDITION'}</span><span>${high?'✦ ✦ ✦':card.edition?'✦':'◇'}</span></div></div>
 </${tag}>`;
}
function itemMarkup(item,interactive=false){
 if(item.type!=='currency')return packCardMarkup(item,{interactive,eager:true});
 return `<div class="crystal-reward"><img src="${item.image}" alt="輝く水晶" width="1024" height="1536"><div><span>CRYSTAL FOUND</span><h3>水晶 × 1</h3><p>殿堂レアとの交換に使えます</p></div></div>`;
}
function save(){
 if(!safeStorageSet(key,state))$('pack-storage-note').textContent='保存データが上限を超えたか、この環境では保存できません。ページを閉じるまで遊べます。';
 refresh();
 if(lastNotifiedOwned!==state.owned){lastNotifiedOwned=state.owned;notify();}
}
function chargeDisplay(now=Date.now()){
 $('pack-charge-count').textContent=`${state.charges} / ${PACK_CHARGE_CAP}`;
 const seconds=Math.max(0,Math.ceil((state.rechargeAt-now)/1000));
 $('pack-recharge-time').textContent=state.charges===PACK_CHARGE_CAP?'開封回数は満タンです':`次の回復まで ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 $('open-pack').disabled=phase!=='closed'||(!state.pending&&state.charges===0);
 $('pack-again').disabled=state.charges===0;
 $('tear-button').disabled=state.charges===0;
}
function scheduleRecharge(){
 clearTimeout(rechargeTimer);rechargeTimer=null;
 if(document.hidden||state.charges===PACK_CHARGE_CAP)return;
 rechargeTimer=setTimeout(()=>{rechargeTimer=null;syncCharges();},1000);
 rechargeTimer.unref?.();
}
function syncCharges(){
 const now=Date.now(),next=recoverPackCharges(state,now);
 if(next!==state){state=next;save();return;}
 chargeDisplay(now);scheduleRecharge();
}
function refresh(){
 chargeDisplay();scheduleRecharge();
 $('crystal-balance').textContent=state.crystals;
 $('pack-record').textContent=`開封 ${state.packs}パック · 図鑑 ${Object.keys(state.owned).length} / ${PACK_CARDS.length}`;
 $('open-pack').textContent=state.pending?'開封の続きを見る':'パックを開ける';
 const nextShopKey=[state.crystals,Boolean(state.pending),phase==='closed',...EXCHANGE_CARDS.map(card=>state.owned[card.id]||0)].join(':');
 if(nextShopKey!==shopKey){
 shopKey=nextShopKey;
 $('exchange-list').innerHTML=EXCHANGE_CARDS.map(card=>`<article class="exchange-option ${card.motion?'exchange-duo':''}">${packCardMarkup(card)}<div class="exchange-info"><p>${card.motion?'2人の動く殿堂レア':'ソロの殿堂レア'}</p><h3>${escape(card.name)}</h3><span>所持 ${state.owned[card.id]||0}枚</span><button class="crystal-button" data-redeem="${card.id}" ${state.crystals<card.cost||state.pending||phase!=='closed'?'disabled':''}>◇ 水晶${card.cost}個で交換</button></div></article>`).join('');
 const featured=$('exchange-featured');if(featured){const picks=['uc-keigo-hall','uc-duo-hall','ucla-hall'].map(id=>PACK_CARD_BY_ID[id]).filter(Boolean);featured.innerHTML=`<div class="exchange-featured-label"><strong>CRYSTAL EXCHANGE PICKS</strong><span>交換可能な目玉カード</span></div>${picks.map((card,i)=>`<div class="exchange-featured-card exchange-featured-${i+1}">${packCardMarkup(card,{interactive:false,eager:true})}</div>`).join('')}`;}
 }
 $('exchange-hint').textContent=state.pending?'開封中のパックを最後まで見ると交換できます。':'水晶2個でソロ、4個で2人の殿堂レア。交換カードはパックから直接出ません。';
}
function duelEffectText(effect){
 if(!effect)return '追加効果なし';
 if(effect.type==='heal')return `攻撃成功時：自分を${effect.v}回復`;
 if(effect.type==='weaken')return `攻撃成功時：相手の次の攻撃ダメージを${effect.v}減少`;
 if(effect.type==='field')return `攻撃成功時：語彙フィールド展開。以後、双方の攻撃ダメージ+${effect.v}`;
 if(effect.type==='recoil')return `防御成功時：基本反動に加えて自分に${effect.v}追加反動`;
 return '特殊効果';
}
function duelPerformanceMarkup(card){
 const d=duelCard(card.id);if(!d)return '';
 return `<section class="performance duel-detail-performance" aria-label="英単語対戦でのカード性能"><div class="performance-head"><span>英単語対戦 · ${d.rank} RANK</span><strong>HP ${d.hp}</strong></div><div class="duel-trait-box"><small>特性</small><h3>${escape(d.trait.name)}</h3><p>${escape(d.trait.text)}</p></div><div class="duel-detail-moves"><h3>5つの技 · 今シーズンの出題単語</h3>${d.moves.map((m,i)=>`<div class="duel-detail-move"><div class="duel-detail-move-head"><span>${i+1}</span><strong>${escape(m.name)}</strong><b>威力 ${m.damage}</b></div><p><em>${escape(m.word)}</em> ＝ ${escape(m.meaning)}</p><small>防御成功時：基本反動 ${d.missRecoil} ｜ ${escape(duelEffectText(m.effect))}</small></div>`).join('')}</div><p class="detail-note">出題単語はシーズンごとに更新されます。ここに表示される性能がP2P英単語対戦で実際に使用されます。</p></section>`;
}

export function openPackDetails(id){
 const card=PACK_CARD_BY_ID[id];if(!card)return;
 const high=card.edition==='hall',count=state.owned[id]||0;
 $('pack-detail-content').innerHTML=`<div class="pack-detail-layout">${packCardMarkup(card,{interactive:false,eager:true})}<div><p class="eyebrow">${high?'HALL OF FAME':card.edition?'PHOTO RARE':'ENGLISH CAMPUS'}</p><h2 id="pack-detail-name">${escape(card.name)}</h2><p>${escape(card.type==='university'?card.japaneseName:'カルフォルニア大学 · University of California')}</p><h3>${escape(card.title)}</h3><p>${escape(card.flavor)}</p>${duelPerformanceMarkup(card)}${high?`<button class="cinema-replay-button" type="button" data-replay-exchange="${card.id}">✦ 水晶交換の獲得演出を再生</button>`:''}<dl class="detail-facts"><div><dt>入手方法</dt><dd>${high?`水晶${card.cost}個で交換`:`パック1枠あたり${PACK_RATE}%`}</dd></div><div><dt>所持</dt><dd>${count}枚</dd></div><div><dt>図鑑番号</dt><dd>No. ${card.number}</dd></div><div><dt>枠の進化</dt><dd>${count>=5?'限界突破 MAX':`${Math.min(5,count)} / 5枚`}</dd></div></dl><p class="detail-note">${card.motion?'光・ホログラム・絵柄の動きが続くライブアートカード。動きを減らす設定では静止表示します。':'同じカードを5枚集めると、最高レアの限界突破枠になります。'}通常写真レアと殿堂レアの所持数は別々です。</p></div></div>`;
 $('pack-detail').showModal();
}
function resetTear(){pointer=null;$('pack-foil').style.setProperty('--tear-progress','0');}
function start(){
 if(phase!=='closed')return;
 syncCharges();if(!state.pending&&state.charges===0)return;
 unlockSound();phase=state.pending?'cards':'sealed';sessionItems=state.pending?[...state.pending.items]:[];
 resetTear();changing=false;
 $('pack-dialog').dataset.phase=phase;$('pack-foil').classList.remove('torn');
 $('pack-dialog').showModal();$('open-pack').disabled=true;refresh();
 if(state.pending)showCard();else{$('pack-title').textContent='パックを、横に裂こう。';$('tear-button').focus();}
}
function tear(){
 if(phase!=='sealed')return;
 syncCharges();if(state.charges===0)return;
 phase='opening';resetTear();state=commitPack(state);sessionItems=[...state.pending.items];save();
 $('pack-foil').classList.add('torn');tone(700,0,.15,.025);tone(1046,.08,.3,.02);
 const reveal=()=>{timer=null;phase='cards';$('pack-dialog').dataset.phase=phase;showCard();};
 if(motion())reveal();else timer=setTimeout(reveal,650);
}
function showCard(){
 if(!state.pending){summary();return;}
 const index=state.pending.index,item=PACK_ITEM_BY_ID[state.pending.items[index]];
 $('pack-title').textContent=`${index+1} / ${PACK_SIZE} — ${item.type==='currency'?'水晶を発見':item.edition?'PHOTO RARE':'CAMPUS CARD'}`;
 $('pack-progress').textContent=`${index+1} / ${PACK_SIZE}`;
 $('pack-reveal').innerHTML=itemMarkup(item);
 $('pack-reveal-name').textContent=item.type==='currency'?'水晶を1個獲得':item.name;
 $('pack-next').textContent=index===PACK_SIZE-1?'獲得結果を見る':'次の1枚 →';
 $('pack-reveal').classList.remove('flipping');
 $('pack-next').disabled=false;$('pack-next').focus({preventScroll:true});
 tone(item.type==='currency'?1175:660,0,.28,.025);
}
function next(){
 if(phase!=='cards'||changing)return;
 changing=true;$('pack-next').disabled=true;$('pack-reveal').classList.add('flipping');
 const reveal=()=>{timer=null;state=advancePack(state);save();changing=false;if(!state.pending)summary();else showCard();};
 if(motion())reveal();else timer=setTimeout(reveal,230);
}
function summary(){
 if(!sessionItems.length)return;
 clearTimeout(timer);timer=null;changing=false;state=finishPack(state);phase='summary';save();
 $('pack-dialog').dataset.phase='summary';$('pack-title').textContent='5つの出会いを、図鑑へ。';
 $('pack-summary-grid').innerHTML=sessionItems.map(id=>itemMarkup(PACK_ITEM_BY_ID[id],true)).join('');
 const crystals=sessionItems.filter(id=>id==='crystal').length;
 $('pack-summary-text').textContent=`カード ${PACK_SIZE-crystals}枚${crystals?` · 水晶 ${crystals}個`:''}を獲得。所持水晶 ${state.crystals}個`;
 $('pack-finish').focus({preventScroll:true});
}
function close(){
 clearTimeout(timer);timer=null;changing=false;resetTear();phase='closed';
 if($('pack-dialog').open)$('pack-dialog').close();
 $('open-pack').disabled=false;refresh();$('open-pack').focus({preventScroll:true});
}
function showExchangeCinema(card,{replay=false}={}){
 if(!card)return;phase=replay?'exchange-replay':'exchange';unlockSound();
 const dialog=$('exchange-cinema');dialog.dataset.phase='gather';dialog.classList.toggle('duo-arrival',Boolean(card.motion));
 $('exchange-result-art').innerHTML=packCardMarkup(card,{interactive:false,eager:true});$('exchange-result-name').textContent=card.name;
 $('exchange-result-line').textContent=card.motion?'二つの輝きが、ひとつの伝説に。':'水晶が導く、特別な出会い。';
 $('exchange-result-cost').textContent=replay?'図鑑から演出再生 · 所持数や水晶は変化しません':`水晶${card.cost}個を使用 · 残り${state.crystals}個 · 所持${state.owned[card.id]}枚`;
 try{if($('pack-detail').open)$('pack-detail').close();}catch{}
 dialog.showModal();$('exchange-skip').focus({preventScroll:true});tone(220,0,.8,.04);tone(440,.2,.8,.02);
 const reveal=()=>{exchangeTimer=null;dialog.dataset.phase='reveal';tone(784,0,.8,.025);tone(1046,.16,.8,.02);$('exchange-done').focus({preventScroll:true});};
 if(motion())reveal();else exchangeTimer=setTimeout(reveal,2200);
}
function exchange(id){
 if(phase!=='closed')return;const nextState=redeemCrystal(state,id);if(!nextState)return;state=nextState;save();showExchangeCinema(PACK_CARD_BY_ID[id]);
}
function replayExchange(id){if(phase!=='closed')return;const card=PACK_CARD_BY_ID[id];if(!card||card.edition!=='hall')return;showExchangeCinema(card,{replay:true});}
function finishExchange(){
  clearTimeout(exchangeTimer);exchangeTimer=null;
  phase='closed';
  if($('exchange-cinema').open)$('exchange-cinema').close();
  refresh();$('exchange-heading').focus({preventScroll:true});
}
export function initCrystalPack(options={}){
 notify=options.onChange||notify;tone=options.tone||tone;unlockSound=options.unlockSound||unlockSound;motion=options.reducedMotion||motion;openAlbum=options.openAlbum||openAlbum;
 $('open-pack').addEventListener('click',start);
 $('tear-button').addEventListener('click',tear);
 $('pack-next').addEventListener('click',next);
 $('pack-all').addEventListener('click',()=>{if(phase==='cards')summary();});
 $('pack-close').addEventListener('click',close);$('pack-finish').addEventListener('click',close);
 $('pack-again').addEventListener('click',()=>{close();start();});
 $('pack-dialog').addEventListener('cancel',e=>{e.preventDefault();close();});
 $('pack-dialog').addEventListener('close',()=>{if(phase!=='closed')close();});
 $('pack-album').addEventListener('click',()=>{close();openAlbum();});
 $('crystal-album-link').addEventListener('click',()=>openAlbum());
 $('exchange-skip').addEventListener('click',()=>{$('exchange-cinema').dataset.phase==='reveal'?finishExchange():(clearTimeout(exchangeTimer),exchangeTimer=null,$('exchange-cinema').dataset.phase='reveal',$('exchange-done').focus());});
 $('exchange-done').addEventListener('click',finishExchange);
 $('exchange-cinema').addEventListener('cancel',e=>{e.preventDefault();finishExchange();});
 $('exchange-cinema').addEventListener('close',()=>{if(phase==='exchange'||phase==='exchange-replay')finishExchange();});
 $('pack-detail-close').addEventListener('click',()=>$('pack-detail').close());
 document.addEventListener('click',event=>{
  const c=event.target.closest('[data-pack-card]');if(c)openPackDetails(c.dataset.packCard);
  const replay=event.target.closest('[data-replay-exchange]');if(replay){replayExchange(replay.dataset.replayExchange);return;}
  const r=event.target.closest('[data-redeem]');if(r&&!r.disabled)exchange(r.dataset.redeem);
 });
 const zone=$('pack-tear-zone');
 zone.addEventListener('pointerdown',event=>{if(phase!=='sealed'||!event.isPrimary)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY};tearWidth=zone.getBoundingClientRect().width;zone.setPointerCapture(event.pointerId);});
 zone.addEventListener('pointermove',event=>{
  if(phase!=='sealed'||pointer?.id!==event.pointerId)return;
  const progress=Math.min(1,Math.abs(event.clientX-pointer.x)/Math.max(80,tearWidth*.6));
  $('pack-foil').style.setProperty('--tear-progress',String(progress));
  if(progress>=1){zone.releasePointerCapture(event.pointerId);tear();}
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(name,resetTear);
 let swipe=null;
 $('pack-reveal').addEventListener('pointerdown',e=>{if(phase==='cards'&&e.isPrimary)swipe={x:e.clientX,y:e.clientY};});
 $('pack-reveal').addEventListener('pointerup',e=>{if(swipe&&Math.abs(e.clientX-swipe.x)>45&&Math.abs(e.clientY-swipe.y)<90)next();swipe=null;});
 $('pack-reveal').addEventListener('pointercancel',()=>swipe=null);
 document.addEventListener('visibilitychange',()=>{syncCharges();if(!document.hidden)return;if(phase==='opening'||phase==='cards'){clearTimeout(timer);timer=null;changing=false;phase='cards';$('pack-dialog').dataset.phase='cards';showCard();}if(phase==='exchange'||phase==='exchange-replay'){clearTimeout(exchangeTimer);exchangeTimer=null;$('exchange-cinema').dataset.phase='reveal';}});
 $('pack-pool-list').innerHTML=PACK_POOL.map(c=>`<li><span>${escape(c.name)}</span><strong>${PACK_RATE}%</strong></li>`).join('');
 save();
}

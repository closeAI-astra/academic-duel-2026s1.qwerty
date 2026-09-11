import { RANKS, RANK_BY_ID, CARDS, CARD_BY_ID, drawTenWithEvents, universityCount, cardRate, MORI_LINE, KINDAI_LINE, moriInDraw, isKindai, OSAKA_ID, HIGHSCHOOL_ID, GRADUATE_ID, FUKUSHIMA_COLLAB_ID, FULLCREDIT_S_ID, FULLCREDIT_A_ID } from './data.js';
import { abilityFor, statsFor, limitLevel, newBattle, battleTurn, COLLECTIONS } from './abilities.js';
import { duelCard } from './duel-data.js';
import { CHAPTERS, FRAME_NAMES, frameStage, chapterCards, albumSlot } from './album.js';
import { PACK_CARDS } from './crystal-data.js';
import { initCrystalPack, getPackState, packCardMarkup } from './crystal-pack.js';
import { speakMori, stopVoice } from './voice.js';
import { playOsakaCinema, playGraduateCinema, stopOsakaCinema } from './cinema.js';
import { playCollabCinema, stopCollabCinema } from './collab-cinema.js';
import { playFullCreditCinema, stopFullCreditCinema } from './fullcredit-cinema.js';
import { initCardMotion } from './card-motion.js';
import { initDuel, renderReview } from './duel.js?v=2.00-final-009';
import { initGodField } from './godfield.js?v=2.00-final-009';
import { initProfile, renderProfile } from './profile.js';
import { safeStorageGet, safeStorageSet } from './security.js';

const $ = id => document.getElementById(id);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const storageKey = 'academia-gacha-v1';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let state = { owned: {}, total: 0, sound: false };
try {
  const saved = safeStorageGet(storageKey);
  if(saved && typeof saved === 'object') {
    state.sound = saved.sound === true;
    for(const [id, count] of Object.entries(saved.owned ?? {})) {
      if(CARD_BY_ID[id] && Number.isSafeInteger(count) && count > 0) state.owned[id] = count;
    }
    state.total = Object.values(state.owned).reduce((sum, count) => sum + count, 0);
  }
} catch { /* A new session remains playable when browser storage is unavailable. */ }
let albumChapter = 0;
let albumMode = 'book';
let albumVolume = 'mori';
let timers = [];
let activeDraw = null;
let busy = false;
let audioContext;
let battle = null;
let lastAchievementTotal=-1;


function save() {
  if(!safeStorageSet(storageKey, state)) $('live-status').textContent = '保存データが上限を超えたか、この環境では保存できません。ページを閉じるまで遊べます。';
}

function cardMarkup(card, { interactive = true, acquired = false, eager = false } = {}) {
  const rank = RANK_BY_ID[card.rank];
  const level = limitLevel(state.owned[card.id]);
  const stage = frameStage(state.owned[card.id]);
  const stars = '★'.repeat(7 - RANKS.indexOf(rank));
  const tag = interactive ? 'button' : 'div';
  return `<${tag} class="game-card evolution-${stage} ${card.edition==='collab'?'collab-card':''} ${card.id===GRADUATE_ID?'graduate-card':''} ${card.edition==='photo'?'photo-card':''} ${card.edition==='limited'?'limited-card':''} ${card.edition==='fullcredit'?'fullcredit-card':''}" style="--rank-color:${rank.color}" ${interactive ? `data-card="${card.id}" aria-label="${escape(card.name)}、${card.rank}ランク、${card.edition?'限定カード、':''}${escape(card.title)}の詳細"` : ''}>
    <img class="card-art" src="${card.image}" alt="${card.edition==='collab' ? '赤いシャツ姿の金正恩、福島大学の校舎を参考にした背景、カードの隅に青い服のトランプを配したイラスト' : card.type === 'mori' ? escape(card.title) + 'の姿をした森' : card.edition ? escape(card.name)+'の提供写真をもとにした特別イラスト' : escape(card.rank) + 'ランクの幻想的な大学イラスト'}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" width="1024" height="1536">
    <span class="card-shade"></span><span class="card-rank">${card.rank}<small>${rank.name}</small></span>
    ${card.type === 'mori' ? '<span class="card-special">SPECIAL CHARACTER</span>' : ''}
    ${card.edition==='collab'?'<span class="collab-vfx" aria-hidden="true"><span class="collab-missile"></span><span class="collab-blast"></span><span class="collab-shockwave"></span></span><span class="photo-badge">COLLAB · LIVE</span>':''}
    ${card.edition==='photo'?'<span class="photo-badge">PHOTO RARE</span>':''}
    ${card.edition==='limited'?'<span class="photo-badge limited-badge">限定 · LIMITED</span>':''}
    ${card.edition==='fullcredit'?'<span class="photo-badge fullcredit-badge">FULL CREDIT · SPECIAL</span><span class="fullcredit-live" aria-hidden="true"></span>':''}
    ${stage===5?'<span class="frame-crown">✦ MAX · 限界突破</span>':''}
    <span class="frame-corners" aria-hidden="true"></span>
    ${acquired ? '<span class="owned-mark">獲得済み</span>' : ''}
    <div class="card-info"><p class="card-subtitle">${escape(card.title)}${level ? ` · 限界突破 +${level}` : ''}</p><h3 class="card-name">${escape(card.name)}</h3><p class="card-skill-name">${(()=>{const d=duelCard(card.id);return d?`HP ${d.hp} · 特性 ${escape(d.trait.name)}`:'英単語対戦カード';})()}</p><div class="card-meta"><span>${card.type === 'mori' ? 'CHARACTER' : escape(card.region)}</span><span class="stars" aria-label="${stars.length}つ星">${stars}</span></div></div>
  </${tag}>`;
}

function updateStats() {
  const count = Object.keys(state.owned).length;
  const packCount=Object.keys(getPackState().owned).length;
  $('nav-owned').textContent = `${count+packCount}/${CARDS.length+PACK_CARDS.length}`;
  $('owned-count').textContent = count;
  $('collection-count').textContent = albumVolume==='crystal'?packCount:count;
  $('album-total').textContent=albumVolume==='crystal'?PACK_CARDS.length:CARDS.length;
  $('total-pulls').textContent = state.total.toLocaleString('ja-JP');
  document.querySelectorAll('[data-card-total]').forEach(node => node.textContent = CARDS.length+PACK_CARDS.length);
  if(lastAchievementTotal===state.total)return;
  lastAchievementTotal=state.total;
  const badges = COLLECTIONS.map(group => ({name:group.name, count:new Set(CARDS.filter(c=>group.names.includes(c.name)&&state.owned[c.id]).map(c=>c.name)).size,total:group.names.length}));
  badges.push({name:'森・七変化',count:CARDS.filter(c=>c.type==='mori'&&!c.edition&&state.owned[c.id]).length,total:7});
  badges.push({name:'百連の召喚士',count:Math.min(100,state.total),total:100});
  $('achievement-list').innerHTML = badges.map(b=>`<div class="achievement ${b.count===b.total?'unlocked':''}"><span>${b.count===b.total?'✦':'◇'}</span><div><strong>${b.name}</strong><small>${b.count===b.total?'称号獲得':`${b.count} / ${b.total}`}</small></div></div>`).join('');
}

function renderArchive() {
  const owned=albumVolume==='crystal'?getPackState().owned:state.owned;
  const chapters=chapter=>chapterCards(chapter,albumVolume);
  const slot=card=>albumSlot(card,owned[card.id],c=>albumVolume==='crystal'?packCardMarkup(c):cardMarkup(c));
  updateStats();
  document.querySelectorAll('[data-album-volume]').forEach(button=>{const active=button.dataset.albumVolume===albumVolume;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
  const heading=chapter=>chapter==='RARE'?'特別な出会い · RARE':`${chapter} RANK`;
  const progress=cards=>`${cards.filter(c=>owned[c.id]).length} / ${cards.length} 種`;
  if(albumMode==='book') {
    const chapter=CHAPTERS[albumChapter],cards=chapters(chapter);
    const halfway=Math.ceil(cards.length/2);
    $('card-archive').innerHTML=`<div class="album-book" key="${chapter}">${[cards.slice(0,halfway),cards.slice(halfway)].map((page,i)=>`<section class="album-leaf"><header><span>${i?'COLLECTOR’S ARCHIVE':heading(chapter)}</span><small>${i?progress(cards):'ACADEMIA COLLECTION'}</small></header><div class="album-page-grid">${page.map(slot).join('')}</div><footer class="album-folio">${String(albumChapter*2+i+1).padStart(2,'0')}</footer></section>`).join('')}</div>`;
    $('album-page-label').textContent=`${heading(chapter)} · ${albumChapter+1} / ${CHAPTERS.length}`;
  } else {
    $('card-archive').innerHTML=CHAPTERS.map(chapter=>{const cards=chapters(chapter);return `<section class="album-grid-chapter"><h2>${heading(chapter)}<small>${progress(cards)}</small></h2><div class="album-all-grid">${cards.map(slot).join('')}</div></section>`;}).join('');
  }
  $('album-paging').hidden=albumMode!=='book';
  $('album-prev').disabled=albumChapter===0;
  $('album-next').disabled=albumChapter===CHAPTERS.length-1;
  document.querySelectorAll('[data-chapter]').forEach(button=>{const active=albumMode==='book'&&Number(button.dataset.chapter)===albumChapter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
  document.querySelectorAll('[data-album-mode]').forEach(button=>{const active=button.dataset.albumMode===albumMode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
}

function showTab(name, focus = false) {
  for(const tab of ['summon','collection','duel','godfield','review','profile']) {
    const selected = tab === name;
    const button = $(`${tab}-tab`);
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', selected);
    button.tabIndex = selected ? 0 : -1;
    $(`${tab}-panel`).hidden = !selected;
    if(selected && focus) button.focus();
  }
  if(name === 'collection') renderArchive();
  if(name === 'review') renderReview();
  if(name === 'profile') renderProfile();
}

function duelEffectText(effect) {
  if(!effect) return '追加効果なし';
  if(effect.type==='heal') return `攻撃成功時：自分を${effect.v}回復`;
  if(effect.type==='weaken') return `攻撃成功時：相手の次の攻撃ダメージを${effect.v}減少`;
  if(effect.type==='field') return `攻撃成功時：語彙フィールド展開。以後、双方の攻撃ダメージ+${effect.v}`;
  if(effect.type==='recoil') return `防御成功時：基本反動に加えて自分に${effect.v}追加反動`;
  return '特殊効果';
}
function duelPerformanceMarkup(card) {
  const d=duelCard(card.id); if(!d) return '';
  const moves=d.moves.map((m,i)=>`<div class="duel-detail-move"><div class="duel-detail-move-head"><span>${i+1}</span><strong>${escape(m.name)}</strong><b>威力 ${m.damage}</b></div><p><em>${escape(m.word)}</em> ＝ ${escape(m.meaning)}</p><small>防御成功時：基本反動 ${d.missRecoil} ｜ ${escape(duelEffectText(m.effect))}</small></div>`).join('');
  return `<section class="performance duel-detail-performance" aria-label="英単語対戦でのカード性能"><div class="performance-head"><span>英単語対戦 · ${d.rank} RANK</span><strong>HP ${d.hp}</strong></div><div class="duel-trait-box"><small>特性</small><h3>${escape(d.trait.name)}</h3><p>${escape(d.trait.text)}</p></div><div class="duel-detail-moves"><h3>5つの技 · 今シーズンの出題単語</h3>${moves}</div><p class="detail-note">出題単語はシーズンごとに更新されます。現在のカード詳細は、実際のP2P英単語対戦で使用される性能です。</p></section>`;
}

function cardCinemaType(card){
  if(!card)return null;
  if([FULLCREDIT_S_ID,FULLCREDIT_A_ID].includes(card.id))return 'fullcredit';
  if(card.id===OSAKA_ID)return 'osaka-retake';
  if(card.id===HIGHSCHOOL_ID)return 'osaka-lost';
  if(card.id===GRADUATE_ID)return 'graduate';
  if(card.id===FUKUSHIMA_COLLAB_ID)return 'collab';
  return null;
}
function replayCardCinema(id){
  const card=CARD_BY_ID[id],kind=cardCinemaType(card);if(!card||!kind)return;
  try{if($('detail-dialog').open)$('detail-dialog').close();}catch{}
  ensureAudio();
  const done=()=>{};
  if(kind==='fullcredit'){playFullCreditCinema({card,markup:cardMarkup(card,{interactive:false,eager:true}),reduced:reduceMotion.matches,tone:playTone,onSkip:done,onEnd:done});return;}
  if(kind==='graduate'){playGraduateCinema({card,markup:cardMarkup(card,{interactive:false,eager:true}),reduced:reduceMotion.matches,tone:playTone,onSkip:done,onEnd:done});return;}
  if(kind==='osaka-retake'||kind==='osaka-lost'){playOsakaCinema({outcome:kind==='osaka-lost'?'lost':'retake',card,markup:cardMarkup(card,{interactive:false,eager:true}),reduced:reduceMotion.matches,tone:playTone,onSkip:done,onEnd:done});return;}
  if(kind==='collab'){
    const fillers=CARDS.filter(c=>c.id!==card.id).slice(0,9),cards=[...fillers,card];
    playCollabCinema({cards,index:cards.length-1,renderCard:c=>cardMarkup(c,{interactive:false,eager:true}),reduced:reduceMotion.matches,tone:playTone,onSkip:done,onEnd:done});
  }
}
function cinemaReplayMarkup(card){return cardCinemaType(card)?`<button class="cinema-replay-button" type="button" data-replay-cinema="${card.id}">✦ このカードの演出を再生</button>`:'';}

function openDetails(id) {
  const card = CARD_BY_ID[id];
  if(!card) return;
  const rank = RANK_BY_ID[card.rank];
  const rate = cardRate(card);
  const guaranteeRate = ['S','A','B'].includes(card.rank) ? `${(rate / 26 * 100).toFixed(3)}%` : '対象外';
  $('detail-content').innerHTML = `<div class="detail-layout" style="--rank-color:${rank.color}">${cardMarkup(card, { interactive: false, eager: true })}<div class="detail-copy"><p class="eyebrow">${card.rank} RANK · ${card.type === 'mori' ? 'SPECIAL CHARACTER' : card.edition==='collab'?'COLLAB CHARACTER':card.type==='limited'?'LIMITED CHARACTER':'UNIVERSITY'}</p><h2 id="detail-name">${escape(card.name)}</h2><p class="detail-title">${card.type === 'mori' ? escape(card.title) : escape(card.region)}</p><p class="detail-flavor">${escape(card.flavor)}</p><dl class="detail-facts"><div><dt>通常枠の排出率</dt><dd>${rate.toFixed(3)}%</dd></div><div><dt>10枚目の排出率</dt><dd>${guaranteeRate}</dd></div><div><dt>所持枚数</dt><dd>${state.owned[id] || 0} 枚</dd></div><div><dt>カード番号</dt><dd>No. ${String(card.number).padStart(3,'0')}</dd></div></dl><p class="detail-note">${card.type === 'mori' ? '提供写真をもとにしたファンタジーキャラクター。S〜Fにそれぞれ異なる姿があります。' : card.edition==='photo' ? '提供写真をもとにした特別イラスト。通常時20%、後期チャンス時100%で写真版になります。排出率は全通常枠を通した最終確率です。' : 'ランクはゲーム独自の設定です。画像はランクごとに共通の幻想イラストで、実際の校舎ではありません。'}</p>${cinemaReplayMarkup(card)}</div></div>`;
  const duel=duelCard(card.id);
  if(card.edition==='collab') {
    $('detail-content').querySelector('.detail-title').textContent=`コラボレア · ${card.title}`;
    $('detail-content').querySelector('.detail-copy>.detail-note').textContent='特別なコラボカード。英単語対戦では現在シーズンのSランク単語と専用の特性・5技を使用します。';
  }
  if(card.edition==='photo') $('detail-content').querySelector('.detail-title').textContent=`写真レア · ${card.title}`;
  if(card.edition==='limited') {
    $('detail-content').querySelector('.detail-title').textContent=`限定 · ${card.title}`;
    $('detail-content').querySelector('.detail-flavor').textContent=card.flavor;
  }
  const facts=$('detail-content').querySelector('.detail-facts');
  if(facts && duel) facts.insertAdjacentHTML('beforebegin',duelPerformanceMarkup(card));
  if(!$('detail-dialog').open) $('detail-dialog').showModal();
  $('detail-dialog').scrollTop = 0;
}

function renderBattle() {
  if(!battle) return;
  const b=battle;
  $('battle-fighter').textContent=`${b.card.name} · ${b.card.rank} / 限界突破 +${b.stats.level}`;
  $('battle-art').src=b.card.image;
  $('battle-art').alt=`${b.card.name}のカードイラスト`;
  $('battle-turn').textContent=b.finished?(b.enemyHp===0?'単位獲得！':'追試決定…'):`TURN ${b.turn+1}`;
  $('player-hp').max=b.stats.hp;$('player-hp').value=b.hp;
  $('enemy-hp').max=b.enemyMax;$('enemy-hp').value=b.enemyHp;
  $('player-hp-label').textContent=`HP ${b.hp} / ${b.stats.hp} · 盾 ${b.shield}`;
  $('enemy-hp-label').textContent=`HP ${b.enemyHp} / ${b.enemyMax}`;
  $('battle-log').textContent=b.log.join('\n');
  $('battle-attack').disabled=b.finished;
  $('battle-skill').disabled=b.finished||b.cooldown>0;
  $('battle-skill').textContent=b.cooldown>0?`固有技：あと${b.cooldown}行動`:b.ability.name;
  $('battle-skill-info').textContent=`常時：${b.ability.passive} 固有技：${b.ability.effect}`;
}
function startBattle(id) {
  const card=CARD_BY_ID[id];if(!card)return;
  battle=newBattle(card,state.owned[id]);
  renderBattle();
  if(!$('battle-dialog').open)$('battle-dialog').showModal();
}
function performBattle(action) {
  const next=battleTurn(battle,action);
  if(next===battle)return;
  battle=next;renderBattle();
  ensureAudio();playTone(action==='skill'?740:440,0,.2);
  if(!reduceMotion.matches&&$('battle-arena').animate) $('battle-arena').animate([{transform:'translateY(0)'},{transform:'translateY(-5px)'},{transform:'translateY(0)'}],{duration:260});
  if(battle.finished)$('battle-reset').focus({preventScroll:true});
  else if(document.activeElement===$('battle-skill')&&$('battle-skill').disabled)$('battle-attack').focus({preventScroll:true});
}

function syncSoundButton() {
  $('sound-toggle').innerHTML = icon(state.sound ? 'volume' : 'muted');
  $('sound-toggle').setAttribute('aria-pressed', state.sound);
  $('sound-toggle').setAttribute('aria-label', `ボイス・効果音を${state.sound ? 'オフ' : 'オン'}にする`);
}
function ensureAudio() {
  if(!state.sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if(!Audio) return;
    audioContext ??= new Audio();
    if(audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch { /* Audio is optional. */ }
}
function playTone(frequency, delay = 0, duration = .28, level = .035) {
  if(!state.sound || !audioContext || audioContext.state !== 'running') return;
  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + .015);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(start); oscillator.stop(start + duration + .03);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  } catch { /* Continue visual play if the device cannot play sound. */ }
}
function clearTimers() { timers.forEach(clearTimeout); timers = []; stopOsakaCinema(); stopCollabCinema(); stopFullCreditCinema(); stopVoice(); }
function later(callback, delay) { timers.push(setTimeout(callback, delay)); }

function beginDraw() {
  if(busy) return;
  busy = true;
  clearTimers();
  ensureAudio();
  const slots = drawTenWithEvents();
  const cards = slots.map(slot=>slot.card);
  const newIds = new Set();
  const fresh = cards.map(card => {
    const isNew = !state.owned[card.id] && !newIds.has(card.id);
    newIds.add(card.id);
    return isNew;
  });
  for(const card of cards) state.owned[card.id] = (state.owned[card.id] || 0) + 1;
  state.total += cards.length;
  activeDraw = { cards, slots, fresh, revealed: 0, mori: moriInDraw(cards) };
  save(); updateStats();
  $('pull-ten').disabled = true;
  $('draw-again').disabled = true;
  $('draw-complete').hidden = true;
  $('close-draw').hidden = true;
  $('skip-animation').hidden = false;
  $('summon-intro').hidden = false;
  $('results-grid').hidden = true;
  $('mori-cutin').hidden = true;
  $('mori-confirmation').hidden = true;
  $('late-chance').hidden = true;
  $('kindai-cutin').hidden = true;
  $('chance-summary').hidden = true;
  if(activeDraw.mori) {
    $('mori-cutin-art').src = activeDraw.mori.image;
    $('mori-cutin-line').textContent = MORI_LINE;
    $('mori-confirmation').textContent = `${MORI_LINE} — 学歴の亡者森 降臨！`;
  }
  $('draw-title').textContent = '十の運命が、いま開く。';
  $('result-summary').textContent = '';
  $('results-grid').innerHTML = cards.map((card, index) => `<div class="result-slot" data-rank="${card.rank}" style="--rank-color:${RANK_BY_ID[card.rank].color}" aria-label="${index + 1}枚目、未開封"><div class="flip-card"><div class="card-back">${icon('book')}<small>${index === 9 ? 'B RANK OR HIGHER' : 'ACADEMIA'}</small></div><div class="card-front" inert>${cardMarkup(card, { eager: true })}</div></div>${fresh[index] ? '<span class="new-mark">NEW</span>' : ''}</div>`).join('');
  if(!$('draw-dialog').open) $('draw-dialog').showModal();
  $('draw-dialog').scrollTop = 0;
  $('skip-animation').focus({ preventScroll: true });
  playTone(220, 0, .8, .045); playTone(330, .15, .8, .025); playTone(440, .3, .65, .02);
  if(reduceMotion.matches) { finishAnimation(); return; }
  later(() => {
    $('summon-intro').hidden = true;
    if(activeDraw.mori) {
      $('mori-cutin').hidden = false;
      speakMori(state.sound,()=>{$('voice-status').textContent='この端末では日本語ボイスを再生できません。効果音と文字演出で続けます。';});
      $('live-status').textContent = `${MORI_LINE}。学歴の亡者森の排出が確定！`;
      playTone(110,0,.8,.05);playTone(880,.3,.6,.035);playTone(1320,.45,.7,.025);
      later(showDrawCards, 2400);
    } else showDrawCards();
  }, 1100);
}

function showDrawCards() {
  $('mori-cutin').hidden = true;
  $('mori-confirmation').hidden = !activeDraw.mori;
  $('results-grid').hidden = false;
  later(()=>advanceReveal(0),180);
}

function advanceReveal(index) {
  if(!busy||!activeDraw)return;
  if(index>=10) {
    if(activeDraw.cards.some(isKindai)) {
      $('results-grid').hidden=true;
      $('kindai-cutin').hidden=false;
      $('kindai-line').textContent=KINDAI_LINE;
      $('draw-dialog').scrollTop=0;
      playTone(196,0,.65,.04);playTone(294,.2,.6,.025);
      later(()=>{$('kindai-cutin').hidden=true;$('results-grid').hidden=false;completeDraw();},2300);
    } else completeDraw();
    return;
  }
  if([FULLCREDIT_S_ID,FULLCREDIT_A_ID].includes(activeDraw.cards[index].id)) {
    const card=activeDraw.cards[index];
    playFullCreditCinema({card,markup:cardMarkup(card,{interactive:false,eager:true}),reduced:reduceMotion.matches,tone:playTone,onSkip:finishAnimation,onEnd:()=>{if(!busy)return;revealCard(index,true);later(()=>advanceReveal(index+1),520);}});
  } else if(activeDraw.cards[index].id===FUKUSHIMA_COLLAB_ID) {
    playCollabCinema({cards:activeDraw.cards,index,renderCard:card=>cardMarkup(card,{interactive:false,eager:true}),reduced:reduceMotion.matches,tone:playTone,onSkip:finishAnimation,onEnd:()=>{if(!busy)return;revealCard(index,true);later(()=>advanceReveal(index+1),500);}});
  } else if(activeDraw.slots[index].graduate) {
    playGraduateCinema({card:activeDraw.slots[index].card,markup:cardMarkup(activeDraw.slots[index].card,{interactive:false,eager:true}),reduced:reduceMotion.matches,tone:playTone,onSkip:finishAnimation,onEnd:()=>{if(!busy)return;revealCard(index,true);later(()=>advanceReveal(index+1),500);}});
  } else if(activeDraw.slots[index].osaka) {
    revealCard(index,false,true);
    later(()=>playOsakaSlot(index),650);
  } else if(activeDraw.slots[index].chance) {
    revealCard(index,false,true);
    later(()=>playLateChance(index),700);
  } else {
    revealCard(index);
    later(()=>advanceReveal(index+1),250);
  }
}

function playOsakaSlot(index) {
  const slot=activeDraw.slots[index];
  playOsakaCinema({outcome:slot.osaka.outcome,card:slot.card,markup:cardMarkup(slot.card,{interactive:false,eager:true}),reduced:reduceMotion.matches,tone:playTone,onSkip:finishAnimation,onEnd:()=>{
    if(!busy)return;
    revealCard(index,true);later(()=>advanceReveal(index+1),500);
  }});
}

function playLateChance(index) {
  const slot=activeDraw.slots[index];
  $('results-grid').hidden=true;
  $('late-chance').hidden=false;
  $('chance-stage').className='chance-stage';
  $('chance-step').textContent='近畿大学に、片足を突っ込んだ…';
  $('chance-outcome').hidden=true;
  $('chance-position').textContent=`${index+1}枚目 · 写真カード確定`;
  $('chance-result-card').innerHTML='';
  $('draw-dialog').scrollTop=0;
  playTone(220,0,.8,.04);
  later(()=>{
    $('chance-stage').classList.add('pulling');
    $('chance-step').textContent='後期チャンス！ 抜け出せるか!?';
    playTone(440,0,.6,.03);playTone(660,.2,.6,.02);
  },950);
  later(()=>{
    $('chance-stage').className=`chance-stage ${slot.chance.success?'escaped':'stuck'}`;
    $('chance-step').textContent=slot.chance.success?'抜けた！ 静岡大学に昇格！':'抜けない… 近畿大学で確定！';
    $('chance-outcome').hidden=false;
    $('chance-outcome').textContent=slot.chance.success?'PROMOTION · 静大':'STAY · 近大';
    $('chance-result-card').innerHTML=cardMarkup(slot.card,{interactive:false,eager:true});
    playTone(slot.chance.success?1046:196,0,.75,.035);
  },2250);
  later(()=>{
    $('late-chance').hidden=true;
    $('results-grid').hidden=false;
    revealCard(index,true);
    later(()=>advanceReveal(index+1),450);
  },4000);
}

function revealCard(index, silent = false, initial = false) {
  const slot = $('results-grid').children[index];
  if(!slot || slot.dataset.finalized || !activeDraw) return;
  const card = initial ? activeDraw.slots[index].initial : activeDraw.cards[index];
  slot.querySelector('.card-front').innerHTML=cardMarkup(card,{eager:true});
  slot.classList.add('revealed');
  slot.setAttribute('aria-label', `${index + 1}枚目、${card.name}、${initial?'特殊演出の判定前':card.rank+'ランク'}${!initial&&activeDraw.fresh[index] ? '、初獲得' : ''}`);
  const newMark=slot.querySelector('.new-mark');if(newMark)newMark.hidden=initial;
  if(!initial) {
    slot.dataset.finalized='true';
    slot.querySelector('.card-front').removeAttribute('inert');
    activeDraw.revealed += 1;
  }
  if(!silent) {
    const frequency = [880,740,660,587,523,440,392][RANKS.findIndex(rank => rank.id === card.rank)];
    playTone(frequency, 0, .3, .03);
    if(card.rank === 'S') { playTone(1108, .08, .65, .024); playTone(1318, .16, .7, .02); }
  }
}

function completeDraw() {
  if(!activeDraw) return;
  clearTimers();
  busy = false;
  $('pull-ten').disabled = false;
  $('draw-again').disabled = false;
  $('skip-animation').hidden = true;
  $('close-draw').hidden = false;
  $('draw-complete').hidden = false;
  const best = [...activeDraw.cards].sort((a,b) => RANKS.findIndex(rank => rank.id === a.rank) - RANKS.findIndex(rank => rank.id === b.rank))[0];
  const newCount = activeDraw.fresh.filter(Boolean).length;
  const moriCount = activeDraw.cards.filter(card => card.type === 'mori').length;
  $('draw-title').textContent = best.rank === 'S' ? '伝説が、あなたの手に。' : '召喚完了';
  const summary = `10枚獲得 · NEW ${newCount}種${moriCount ? ` · 森 ${moriCount}枚` : ''}`;
  $('result-summary').textContent = summary;
  const attempts=activeDraw.slots.filter(slot=>slot.chance);
  const promoted=attempts.filter(slot=>slot.chance.success).length;
  const photos=activeDraw.cards.filter(card=>card.edition==='photo').length;
  const osakaNotes=activeDraw.slots.filter(slot=>slot.osaka).map(slot=>slot.osaka.outcome==='retake'?'限定阪大「再履修」':'「お前の単位ねえから」→限定高卒');
  const eventNotes=[activeDraw.cards.some(card=>card.id===FUKUSHIMA_COLLAB_ID)?'九枚突破 · 福島大学 × 金正恩':'',activeDraw.slots.some(slot=>slot.graduate)?'神域降臨 · 森貴樹・阪大院':'',...osakaNotes,attempts.length?`後期チャンス ${attempts.length}回 · 静大へ昇格 ${promoted}枚`:'',photos?`写真レア ${photos}枚`:'',activeDraw.cards.some(isKindai)?`森「${KINDAI_LINE}」 ※近大カードへのコメント演出`:''].filter(Boolean);
  $('chance-summary').textContent=eventNotes.join(' ／ ');
  $('chance-summary').hidden=!eventNotes.length;
  $('live-status').textContent = `召喚完了。${summary}。最高ランクは${best.rank}です。`;
  if(document.activeElement === $('skip-animation') || document.activeElement === document.body) $('close-draw').focus({ preventScroll: true });
  if(!$('collection-panel').hidden) renderArchive();
}

function finishAnimation() {
  if(!activeDraw || !busy) return;
  clearTimers();
  $('summon-intro').hidden = true;
  $('late-chance').hidden = true;
  $('kindai-cutin').hidden = true;
  $('mori-cutin').hidden = true;
  $('mori-confirmation').hidden = !activeDraw.mori;
  $('results-grid').hidden = false;
  for(let i = 0; i < 10; i++) revealCard(i, true);
  completeDraw();
}
function closeDraw() {
  if(busy) finishAnimation();
  $('draw-dialog').close();
  $('pull-ten').focus({ preventScroll: true });
}

$('feature-university').innerHTML = cardMarkup(CARD_BY_ID[OSAKA_ID], { eager: true });
$('feature-mori-a').innerHTML = cardMarkup(CARD_BY_ID['uni-shizuoka-photo'], { eager: true });
$('feature-mori-s').innerHTML = cardMarkup(CARD_BY_ID['mori-s'], { eager: true });
$('rank-lineup').innerHTML = RANKS.map(rank => `<button class="rank-tile" data-view-rank="${rank.id}" style="--rank-color:${rank.color}" aria-label="${rank.id}ランクのカード${CARDS.filter(c=>c.rank===rank.id).length}種を見る"><div class="rank-tile-top"><strong>${rank.id}</strong><span class="rank-chance">${rank.chance}%</span></div><small>${rank.name}</small><p>大学${universityCount(rank.id)}種 + 森${rank.id==='E'?' + 写真2種':rank.id==='S'?' + 高卒・阪大院・コラボ':''}</p></button>`).join('');
$('album-chapters').innerHTML=CHAPTERS.map((chapter,index)=>`<button class="rank-filter" data-chapter="${index}" aria-pressed="${index===0}">${chapter==='RARE'?'レア':chapter}</button>`).join('');
$('rates-table').innerHTML = RANKS.map((rank,index) => `<tr><td style="--rank-color:${rank.color}"><span class="rate-rank">${rank.id}</span><span class="rate-name">${rank.name}</span></td><td>${rank.chance.toFixed(1)}%</td><td>${index < 3 ? `${(rank.chance/26*100).toFixed(3)}%` : '—'}</td></tr>`).join('');

document.addEventListener('click', event => {
  const replay=event.target.closest('[data-replay-cinema]');
  if(replay){replayCardCinema(replay.dataset.replayCinema);return;}
  const card = event.target.closest('[data-card]');
  if(card) openDetails(card.dataset.card);
  const practice = event.target.closest('[data-battle]');
  if(practice) startBattle(practice.dataset.battle);
  const close = event.target.closest('[data-close]');
  if(close) $(close.dataset.close).close();
  if(event.target.closest('.rates-trigger')) $('rates-dialog').showModal();
  const volume=event.target.closest('[data-album-volume]');
  if(volume){albumVolume=volume.dataset.albumVolume;albumChapter=0;renderArchive();}
  const jump=event.target.closest('[data-crystal-jump]');
  if(jump){showTab('summon');$('crystal-section').scrollIntoView({block:'start',behavior:reduceMotion.matches?'instant':'smooth'});}
  const chapter=event.target.closest('[data-chapter]');
  if(chapter){albumChapter=Number(chapter.dataset.chapter);albumMode='book';renderArchive();}
  const mode=event.target.closest('[data-album-mode]');
  if(mode){albumMode=mode.dataset.albumMode;renderArchive();}
  const view = event.target.closest('[data-view-rank]');
  if(view) { albumVolume='mori';albumChapter=CHAPTERS.indexOf(view.dataset.viewRank);albumMode='book'; showTab('collection', true); $('collection-panel').scrollIntoView({ block:'start',behavior:reduceMotion.matches?'instant':'smooth' }); }

});
for(const name of ['summon','collection','duel','godfield','profile']) $(`${name}-tab`).addEventListener('click', () => { showTab(name); if(name==='profile')renderProfile(); });
document.querySelector('.tabs').addEventListener('keydown', event => {
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const names=['summon','collection','duel','godfield','review','profile'];
  const current=names.findIndex(name=>$(`${name}-tab`).getAttribute('aria-selected')==='true');
  const next=event.key==='Home'?names[0]:event.key==='End'?names[names.length-1]:names[(current+(event.key==='ArrowLeft'?-1:1)+names.length)%names.length];
  showTab(next, true);
});
$('view-all').addEventListener('click', () => { albumVolume='mori';albumMode='grid'; showTab('collection', true); $('collection-panel').scrollIntoView({ block:'start', behavior:reduceMotion.matches ? 'instant' : 'smooth' }); });
$('sound-toggle').addEventListener('click', () => { state.sound = !state.sound; syncSoundButton(); save(); ensureAudio(); if(state.sound) playTone(660, .1); else stopVoice(); });
$('pull-ten').addEventListener('click', beginDraw);
$('draw-again').addEventListener('click', beginDraw);
$('skip-animation').addEventListener('click', finishAnimation);
$('close-draw').addEventListener('click', closeDraw);
$('finish-draw').addEventListener('click', closeDraw);
$('draw-dialog').addEventListener('cancel', event => { event.preventDefault(); closeDraw(); });
$('draw-dialog').addEventListener('close', () => { if(busy) finishAnimation(); clearTimers(); });
for(const id of ['detail-dialog','rates-dialog','battle-dialog']) {
  $(id).addEventListener('click', event => { if(event.target !== $(id)) return; const box = $(id).getBoundingClientRect(); if(event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) $(id).close(); });
}
document.addEventListener('visibilitychange', () => { if(document.hidden && busy) finishAnimation(); });
$('battle-attack').addEventListener('click',()=>performBattle('attack'));
$('battle-skill').addEventListener('click',()=>performBattle('skill'));
$('battle-reset').addEventListener('click',()=>{if(battle)startBattle(battle.card.id);});
updateStats(); syncSoundButton();

$('album-prev').addEventListener('click',()=>{albumChapter=Math.max(0,albumChapter-1);renderArchive();});
$('album-next').addEventListener('click',()=>{albumChapter=Math.min(CHAPTERS.length-1,albumChapter+1);renderArchive();});

function safeSubsystem(name,fn){try{return fn();}catch(error){console.error(`[ACADEMIA] ${name} init failed`,error);const live=$('live-status');if(live)live.textContent=`${name}の初期化でエラーが発生しました。他の機能は継続します。`;return null;}}
safeSubsystem('水晶パック',()=>initCrystalPack({onChange:()=>{if(!$('collection-panel').hidden)renderArchive();else updateStats();},tone:playTone,unlockSound:ensureAudio,reducedMotion:()=>reduceMotion.matches,openAlbum:()=>{albumVolume='crystal';albumChapter=0;showTab('collection',true);$('collection-panel').scrollIntoView({block:'start',behavior:reduceMotion.matches?'instant':'smooth'});} }));
safeSubsystem('カード演出',()=>initCardMotion());
$('review-tab').addEventListener('click',()=>showTab('review'));
safeSubsystem('プロフィール',()=>initProfile());
safeSubsystem('P2P対戦',()=>initDuel());
safeSubsystem('ゴッドフィールド対戦',()=>initGodField());
try{if(new URLSearchParams(location.search).get('tab')==='godfield')showTab('godfield');}catch{}

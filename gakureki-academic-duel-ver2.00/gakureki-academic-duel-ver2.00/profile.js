import { DUEL_CARDS, DUEL_CARD_IDS, duelCard, cardArtStyle } from './duel-data.js';
import { PACK_CARD_BY_ID } from './crystal-data.js';
import { CARD_BY_ID } from './data.js';
import { safeStorageGet, safeStorageSet } from './security.js';

const PROFILE_KEY='academia-profile-v1';
const FRIENDS_KEY='academia-friends-v1';
const MAX_NAME=16;
const MAX_FRIENDS=24;
const $=id=>document.getElementById(id);

function ownedIds(){
  const out=new Set(),g=safeStorageGet('academia-gacha-v1'),c=safeStorageGet('academia-crystal-v1');
  for(const [id,n] of Object.entries(g?.owned??{})) if(CARD_BY_ID[id]&&Number.isSafeInteger(n)&&n>0) out.add(id);
  for(const [id,n] of Object.entries(c?.owned??{})) if(PACK_CARD_BY_ID[id]&&Number.isSafeInteger(n)&&n>0) out.add(id);
  return out;
}
function makeProfileId(){
  const a=new Uint32Array(3);crypto.getRandomValues(a);
  return `p-${Array.from(a,n=>n.toString(36)).join('')}`.slice(0,30);
}
function cleanName(v){return String(v??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,MAX_NAME);}
function cleanStats(v={}){
  const int=(x,max=999999)=>Number.isSafeInteger(x)&&x>=0?Math.min(max,x):0;
  return {battles:int(v.battles),wins:int(v.wins),losses:int(v.losses),answers:int(v.answers),correct:int(v.correct)};
}
function loadProfile(){
  const raw=safeStorageGet(PROFILE_KEY)??{};
  const icon=typeof raw.icon==='string'&&DUEL_CARD_IDS.has(raw.icon)&&ownedIds().has(raw.icon)?raw.icon:null;
  return {id:typeof raw.id==='string'&&/^p-[a-z0-9]{6,30}$/i.test(raw.id)?raw.id:makeProfileId(),name:cleanName(raw.name)||'PLAYER',icon,stats:cleanStats(raw.stats)};
}
let profile=loadProfile();
function save(){safeStorageSet(PROFILE_KEY,profile);}
function friendState(){
  const raw=safeStorageGet(FRIENDS_KEY),items=Array.isArray(raw?.items)?raw.items:[];
  return items.filter(x=>validPublicProfile({id:x?.id,name:x?.name,icon:x?.icon,stats:x?.stats})).slice(0,MAX_FRIENDS).map(x=>({...x,lastSeen:typeof x.lastSeen==='string'?x.lastSeen:'',encounters:Number.isSafeInteger(x.encounters)?Math.max(1,Math.min(999,x.encounters)):1}));
}
function saveFriends(items){safeStorageSet(FRIENDS_KEY,{items:items.slice(0,MAX_FRIENDS)});}
export function getProfile(){return structuredClone(profile);}
export function getPublicProfile(){return {id:profile.id,name:profile.name,icon:profile.icon,stats:{...profile.stats}};}
export function validPublicProfile(v){
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='icon,id,name,stats')return false;
  if(typeof v.id!=='string'||!/^p-[a-z0-9]{6,30}$/i.test(v.id))return false;
  if(typeof v.name!=='string'||cleanName(v.name)!==v.name||v.name.length<1||v.name.length>MAX_NAME)return false;
  if(v.icon!==null&&(typeof v.icon!=='string'||!DUEL_CARD_IDS.has(v.icon)))return false;
  const s=v.stats;if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join(',')!=='answers,battles,correct,losses,wins')return false;
  for(const k of ['battles','wins','losses','answers','correct'])if(!Number.isSafeInteger(s[k])||s[k]<0||s[k]>999999)return false;
  return true;
}
export function rememberFriend(remote){
  if(!validPublicProfile(remote)||remote.id===profile.id)return;
  const items=friendState(),existing=items.find(x=>x.id===remote.id),today=new Date().toISOString().slice(0,10);
  const snap={...remote,stats:{...remote.stats},lastSeen:today,encounters:existing?Math.min(999,(existing.encounters||1)+1):1};
  saveFriends([snap,...items.filter(x=>x.id!==remote.id)]);
  renderProfile();
}
export function recordAnswerResult(correct){
  profile.stats.answers=Math.min(999999,profile.stats.answers+1);
  if(correct)profile.stats.correct=Math.min(999999,profile.stats.correct+1);
  save();renderProfileStats();
}
export function recordMatchResult(won){
  profile.stats.battles=Math.min(999999,profile.stats.battles+1);
  if(won)profile.stats.wins=Math.min(999999,profile.stats.wins+1);else profile.stats.losses=Math.min(999999,profile.stats.losses+1);
  save();renderProfileStats();
}
function avatarNode(publicProfile,size='normal'){
  const d=publicProfile?.icon?duelCard(publicProfile.icon):null,el=document.createElement('span');
  el.className=`profile-avatar profile-avatar-${size}`;
  if(d)el.style.cssText=cardArtStyle(d);else el.textContent='◇';
  return el;
}
export function appendProfileBadge(host,publicProfile,label='PLAYER'){
  if(!host)return;
  const box=document.createElement('div');box.className='duel-profile-badge';box.append(avatarNode(publicProfile,'small'));
  const text=document.createElement('span'),small=document.createElement('small'),strong=document.createElement('strong');
  small.textContent=label;strong.textContent=publicProfile?.name||'PLAYER';text.append(small,strong);box.append(text);host.append(box);
}
function renderProfileStats(){
  const s=profile.stats,rate=s.answers?Math.round(s.correct/s.answers*1000)/10:0;
  const map={
    'profile-battles':s.battles,'profile-wins':s.wins,'profile-losses':s.losses,
    'profile-answers':s.answers,'profile-correct':s.correct,'profile-rate':`${rate}%`
  };
  for(const [id,v] of Object.entries(map))if($(id))$(id).textContent=String(v);
}
export function renderProfile(){
  const panel=$('profile-panel');if(!panel)return;
  renderProfileStats();
  if(panel.hidden)return;
  if($('profile-name'))$('profile-name').value=profile.name;
  const hero=$('profile-hero-avatar');if(hero&&typeof hero.replaceChildren==='function'&&typeof hero.append==='function'){hero.replaceChildren();hero.append(avatarNode(profile,'large'));}
  if($('profile-hero-name'))$('profile-hero-name').textContent=profile.name;
  const pool=$('profile-icon-pool');
  if(pool&&typeof pool.replaceChildren==='function'&&typeof document.createDocumentFragment==='function'){
    const own=ownedIds();pool.replaceChildren();
    const frag=document.createDocumentFragment();
    for(const raw of DUEL_CARDS){if(!own.has(raw.id))continue;const d=duelCard(raw.id),b=document.createElement('button');b.type='button';b.className='profile-icon-choice';if(profile.icon===raw.id)b.classList.add('selected');b.title=d.name;b.setAttribute('aria-label',`${d.name}をプロフィールアイコンに設定`);const art=avatarNode({icon:raw.id},'choice');b.append(art);b.addEventListener('click',()=>{profile.icon=raw.id;save();renderProfile();});frag.append(b);}pool.append(frag);
  }
  const friends=$('friend-list');if(friends&&typeof friends.replaceChildren==='function'&&typeof document.createDocumentFragment==='function'){friends.replaceChildren();const items=friendState();if($('friend-empty'))$('friend-empty').hidden=items.length>0;const frag=document.createDocumentFragment();for(const f of items){const row=document.createElement('article');row.className='friend-row';row.append(avatarNode(f,'normal'));const copy=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('p'),stat=document.createElement('small');name.textContent=f.name;meta.textContent=`最終対戦 ${f.lastSeen||'—'} · 対戦回数 ${f.encounters}`;const rate=f.stats.answers?Math.round(f.stats.correct/f.stats.answers*1000)/10:0;stat.textContent=`戦績 ${f.stats.wins}勝 ${f.stats.losses}敗 · 正解率 ${rate}%`;copy.append(name,meta,stat);row.append(copy);frag.append(row);}friends.append(frag);}
}
export function initProfile(){
  if(!$('profile-panel'))return;
  $('profile-save')?.addEventListener('click',()=>{const name=cleanName($('profile-name')?.value);if(!name){$('profile-message').textContent='表示名を1〜16文字で入力してください。';return;}profile.name=name;save();$('profile-message').textContent='プロフィールを保存しました。';renderProfile();});
  $('friends-clear')?.addEventListener('click',()=>{if(confirm('フレンド履歴をすべて消去しますか？')){saveFriends([]);renderProfile();}});
  window.addEventListener('storage',()=>{profile=loadProfile();renderProfile();});
  renderProfile();
}

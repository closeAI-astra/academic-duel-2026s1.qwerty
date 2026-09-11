import { CARDS as MORI_CARDS, RANK_BY_ID } from './data.js';
import { PACK_CARDS } from './crystal-data.js';
import { ACTIVE_SEASON, WORD_BANK, SEASON_INFO } from './word-seasons.js';

export { ACTIVE_SEASON, SEASON_INFO };
export const ACTIVE_SEASON_INFO = SEASON_INFO[ACTIVE_SEASON] ?? {number:'--',title:ACTIVE_SEASON,subtitle:'現在の単語シーズン'};
export const ACTIVE_SEASON_WORD_COUNT = Object.values(WORD_BANK).reduce((sum,rows)=>sum+rows.length,0);
export const DUEL_CARDS=[...MORI_CARDS,...PACK_CARDS];
export const DUEL_CARD_BY_ID=Object.fromEntries(DUEL_CARDS.map(c=>[c.id,c]));
export const DUEL_CARD_IDS=new Set(DUEL_CARDS.map(c=>c.id));
export const DECK_SIZE=10, MAX_S=2, MAX_A=3, DEFAULT_KO_TO_WIN=5, MIN_KO_TO_WIN=1, MAX_KO_TO_WIN=7;
export const TRAITS=[
  {id:'reflect',name:'反射',text:'相手の攻撃を正解で防ぐと、攻撃側に8ダメージ。'},
  {id:'drain',name:'吸収',text:'攻撃成功時、自分を8回復。'},
  {id:'guard',name:'堅牢',text:'受けるダメージを4軽減。'},
  {id:'follow',name:'追撃',text:'攻撃成功時、追加で6ダメージ。'},
  {id:'focus',name:'集中',text:'HP半分以下なら技ダメージ+8。'},
];
export const FULLCREDIT_TRAIT={id:'credit-chain',name:'履修連鎖',text:'このカードの攻撃で相手をKOすると、次に出た相手へ50ダメージ。連鎖は1回まで。'};
const FULLCREDIT_IDS=new Set(['fullcredit-prodigy-s','fullcredit-prodigy-a']);
const BASE={S:{hp:180,dmg:24,recoil:16},A:{hp:176,dmg:25,recoil:14},B:{hp:172,dmg:27,recoil:12},C:{hp:168,dmg:29,recoil:10},D:{hp:164,dmg:31,recoil:8},E:{hp:160,dmg:33,recoil:6},F:{hp:156,dmg:35,recoil:4}};
const MOVE_NAMES=['基礎射撃','精密読解','論点制圧','語彙フィールド','最終論証'];
const DMG_ADD=[0,5,10,15,22];
const EFFECTS=[null,{type:'heal',v:6},{type:'weaken',v:6},{type:'field',v:6},{type:'recoil',v:14}];
function hash(s){let h=2166136261>>>0;for(const ch of s){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
export function duelCard(id){
  const c=DUEL_CARD_BY_ID[id]; if(!c)return null;
  const base=BASE[c.rank], bank=WORD_BANK[c.rank], h=hash(c.id), offset=h%bank.length;
  const trait=FULLCREDIT_IDS.has(c.id)?FULLCREDIT_TRAIT:TRAITS[h%TRAITS.length];
  return {...c,hp:base.hp+(h%3)*2,missRecoil:base.recoil,trait,moves:Array.from({length:5},(_,i)=>{
    const w=bank[(offset+i)%bank.length]; return {name:MOVE_NAMES[i],word:w[0],meaning:w[1],damage:base.dmg+DMG_ADD[i],effect:EFFECTS[i]};
  })};
}
export function validateDeck(deck,ownedSet=null){
  if(!Array.isArray(deck)||deck.length!==DECK_SIZE||new Set(deck).size!==deck.length)return false;
  if(!deck.every(id=>DUEL_CARD_IDS.has(id)&&(!ownedSet||ownedSet.has(id))))return false;
  const cards=deck.map(duelCard);return cards.filter(c=>c.rank==='S').length<=MAX_S&&cards.filter(c=>c.rank==='A').length<=MAX_A;
}
export function initialBattle(hostDeck,guestDeck,seed,koTarget=DEFAULT_KO_TO_WIN){
  const matchSeed=Number.isSafeInteger(seed)?seed>>>0:0;
  const target=Number.isSafeInteger(koTarget)?Math.max(MIN_KO_TO_WIN,Math.min(MAX_KO_TO_WIN,koTarget)):DEFAULT_KO_TO_WIN;
  const hostOrder=shuffleSeeded(hostDeck,matchSeed^0x6d2b79f5);
  const guestOrder=shuffleSeeded(guestDeck,matchSeed^0x1b873593);
  const first=rng(matchSeed^0x85ebca6b)()<0.5?'host':'guest';
  return {seed:matchSeed,koTarget:target,first,turn:first,round:1,decks:{host:hostOrder,guest:guestOrder},hp:{host:hostOrder.map(id=>duelCard(id).hp),guest:guestOrder.map(id=>duelCard(id).hp)},idx:{host:0,guest:0},ko:{host:0,guest:0},field:0,weaken:{host:0,guest:0},winner:null};
}
export const other=s=>s==='host'?'guest':'host';
export function activeCard(state,side){const i=state.idx[side];return i>=0&&i<state.decks[side].length?duelCard(state.decks[side][i]):null;}
function rng(seed){let x=seed>>>0||0x9e3779b9;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffleSeeded(xs,seed){const out=[...xs],r=rng(seed);for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function buildQuestion(state,{from,move,seed}){
  const card=activeCard(state,from); if(!card||!Number.isInteger(move)||move<0||move>4)return null;
  const mv=card.moves[move], pool=[...new Set(WORD_BANK[card.rank].map(x=>x[1]).filter(x=>x!==mv.meaning))];
  if(pool.length<9)return null;
  const choices=shuffleSeeded([mv.meaning,...shuffleSeeded(pool,seed^0xa5a5a5a5).slice(0,9)],seed^0x5a5a5a5a);
  return {word:mv.word,choices,correct:choices.indexOf(mv.meaning),move:mv,card};
}
export function resolveChoice(state,pending,choiceIndex){
  const next=structuredClone(state), from=pending.from,to=other(from), q=buildQuestion(next,pending); if(!q)return null;
  const a=activeCard(next,from),d=activeCard(next,to); if(!a||!d)return null;
  const ai=next.idx[from],di=next.idx[to],correct=choiceIndex===q.correct;
  const winTarget=Number.isSafeInteger(next.koTarget)?next.koTarget:DEFAULT_KO_TO_WIN;
  const events=[]; let summary='';
  if(correct){
    const baseRecoil=a.missRecoil||0;
    summary=`${d.name} が正解。攻撃失敗。`;
    if(baseRecoil){next.hp[from][ai]=Math.max(0,next.hp[from][ai]-baseRecoil);summary+=` 基本反動${baseRecoil}。`;}
    if(d.trait.id==='reflect'){next.hp[from][ai]=Math.max(0,next.hp[from][ai]-8);summary+=' 反射8。';}
    if(q.move.effect?.type==='recoil'){next.hp[from][ai]=Math.max(0,next.hp[from][ai]-q.move.effect.v);summary+=` 追加反動${q.move.effect.v}。`;}
  }else{
    let dmg=q.move.damage+(next.field||0);
    if(a.trait.id==='focus'&&next.hp[from][ai]<=a.hp/2)dmg+=8;
    if(next.weaken[from]){dmg=Math.max(0,dmg-next.weaken[from]);next.weaken[from]=0;}
    if(d.trait.id==='guard')dmg=Math.max(0,dmg-4); if(a.trait.id==='follow')dmg+=6;
    next.hp[to][di]=Math.max(0,next.hp[to][di]-dmg); summary=`不正解。${d.name} に ${dmg} ダメージ。`;
    if(a.trait.id==='drain')next.hp[from][ai]=Math.min(a.hp,next.hp[from][ai]+8);
    if(q.move.effect?.type==='heal')next.hp[from][ai]=Math.min(a.hp,next.hp[from][ai]+q.move.effect.v);
    if(q.move.effect?.type==='weaken')next.weaken[to]=q.move.effect.v;
    if(q.move.effect?.type==='field')next.field=q.move.effect.v;
    let primaryKo=false;
    if(next.hp[to][di]<=0){next.ko[from]++;next.idx[to]++;primaryKo=true;summary+=` KO！ ${next.ko[from]}体目。`;}
    if(primaryKo&&a.trait.id==='credit-chain'&&next.ko[from]<winTarget&&next.idx[to]<next.decks[to].length){
      const ni=next.idx[to],nxt=activeCard(next,to);
      if(nxt){
        const before=next.hp[to][ni],chainDamage=Math.min(50,before);
        next.hp[to][ni]=Math.max(0,before-50);
        let chainKo=false;
        summary+=` 履修連鎖！ 次の${nxt.name}に50ダメージ。`;
        if(next.hp[to][ni]<=0){next.ko[from]++;next.idx[to]++;chainKo=true;summary+=` 追撃KO！ ${next.ko[from]}体目。`;}
        events.push({type:'credit-chain',from,to,attackerId:a.id,targetId:nxt.id,damage:chainDamage,ko:chainKo});
      }
    }
  }
  if(next.hp[from][ai]<=0){next.ko[to]++;next.idx[from]++;summary+=` ${a.name} もKO。`;}
  if(next.ko[from]>=winTarget||next.ko[to]>=winTarget)next.winner=next.ko[from]>=winTarget?from:to;
  else {next.turn=to;next.round++;}
  return {state:next,correct,summary,events};
}

export function cardArtStyle(card){
  if(card.sprite){const x=card.sprite.columns>1?card.sprite.column/(card.sprite.columns-1)*100:0,y=card.sprite.rows>1?card.sprite.row/(card.sprite.rows-1)*100:0;return `background-image:url('${card.image}');background-size:${card.sprite.columns*100}% ${card.sprite.rows*100}%;background-position:${x}% ${y}%`;}
  return `background-image:url('${card.image}')`;
}

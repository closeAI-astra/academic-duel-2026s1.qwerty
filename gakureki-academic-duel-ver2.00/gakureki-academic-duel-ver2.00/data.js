export const RANKS = [
  { id:'S', name:'LEGEND', color:'#f2cc7b', chance:3, title:'天上の探究者', flavor:'幾千の知を束ね、学問の頂に立つ。黄金の書が開かれるとき、新たな伝説が始まる。' },
  { id:'A', name:'MYTHIC', color:'#c89afa', chance:8, title:'紫紺の魔導書', flavor:'未知の答えを求め、古の魔導書をひもとく。その瞳には、まだ見ぬ世界が映る。' },
  { id:'B', name:'EPIC', color:'#72baf9', chance:15, title:'蒼穹の観測者', flavor:'星の軌跡を読み解き、果てなき宇宙に問いを投げかける。すべての疑問が、次の扉となる。' },
  { id:'C', name:'RARE', color:'#7dd5ab', chance:22, title:'翠緑の書庫守', flavor:'静かな書庫には、時を超えた知が眠る。一冊の本との出会いが、その運命を変える。' },
  { id:'D', name:'UNCOMMON', color:'#dda67b', chance:24, title:'黄昏の旅学者', flavor:'古い地図と巻物を携え、知らない街へ。教室の外にも、学びは無限に広がっている。' },
  { id:'E', name:'COMMON', color:'#b0c5de', chance:18, title:'月下の見習い', flavor:'夜更けのページに、小さな光がともる。昨日わからなかったことが、今日の力になる。' },
  { id:'F', name:'ORIGIN', color:'#d1cbbd', chance:10, title:'はじまりの一頁', flavor:'一冊のノートと、尽きない好奇心。偉大な物語も、最初の一頁から始まる。' },
];
const universities = {
  S: [['東京大学','東京都'],['京都大学','京都府'],['大阪大学','大阪府'],['東北大学','宮城県'],['名古屋大学','愛知県'],['九州大学','福岡県']],
  A: [['北海道大学','北海道'],['一橋大学','東京都'],['筑波大学','茨城県'],['神戸大学','兵庫県'],['早稲田大学','東京都'],['慶應義塾大学','東京都']],
  B: [['横浜国立大学','神奈川県'],['千葉大学','千葉県'],['広島大学','広島県'],['東京理科大学','東京都'],['上智大学','東京都'],['東京外国語大学','東京都']],
  C: [['岡山大学','岡山県'],['金沢大学','石川県'],['同志社大学','京都府'],['明治大学','東京都'],['立教大学','東京都'],['青山学院大学','東京都'],['立命館大学','京都府']],
  D: [['熊本大学','熊本県'],['新潟大学','新潟県'],['法政大学','東京都'],['中央大学','東京都'],['関西大学','大阪府'],['関西学院大学','兵庫県']],
  E: [['信州大学','長野県'],['静岡大学','静岡県'],['近畿大学','大阪府'],['東洋大学','東京都'],['日本大学','東京都'],['駒澤大学','東京都'],['京都産業大学','京都府'],['甲南大学','兵庫県'],['龍谷大学','京都府']],
  F: [['愛媛大学','愛媛県'],['高知大学','高知県'],['専修大学','東京都'],['東海大学','東京都'],['神奈川大学','神奈川県'],['福岡大学','福岡県']],
};
let nextNumber = 50; // Keep all original 49 IDs and collection numbers stable.
const BASE_CARDS = RANKS.flatMap((rank, rankIndex) => [
  ...universities[rank.id].map(([name, region], index) => ({id:`uni-${rank.id.toLowerCase()}-${index+1}`,name,region,rank:rank.id,type:'university',number:index<6?rankIndex*7+index+1:nextNumber++,image:`./assets/campus-${rank.id.toLowerCase()}.webp`,title:rank.name,flavor:'知への探究心が集う学びの地。あなたの召喚によって、新しい物語の一頁が開かれた。'})),
  {id:`mori-${rank.id.toLowerCase()}`,name:'学歴の亡者森',region:'SPECIAL CHARACTER',rank:rank.id,type:'mori',number:rankIndex*7+7,image:`./assets/mori-${rank.id.toLowerCase()}.webp`,title:rank.title,flavor:rank.flavor},
]);
export const SPECIAL_CHANCE = .25;
export const PHOTO_CHANCE = .20;
export const ESCAPE_CHANCE = .5;
export const KINDAI_ID = 'uni-e-3';
export const SHIZUOKA_ID = 'uni-e-2';
export const OSAKA_ID = 'uni-s-3';
export const HIGHSCHOOL_ID = 'limited-highschool';
export const GRADUATE_ID = 'mori-osaka-grad';
export const FUKUSHIMA_COLLAB_ID = 'fukushima-kim-collab';
export const FULLCREDIT_S_ID = 'fullcredit-prodigy-s';
export const FULLCREDIT_A_ID = 'fullcredit-prodigy-a';
export const RARE_RATE = .225;
export const OSAKA_RETAKE_CHANCE = .5;
export const CREDIT_LOSS_LINE = 'お前の単位ねえから';
const photoCard = (baseId,id,number,title,image) => ({...BASE_CARDS.find(c=>c.id===baseId),baseId,id,number,title,image,edition:'photo'});
export const CARDS = [...BASE_CARDS.map(card=>card.id===OSAKA_ID?{...card,edition:'limited',title:'再履修の継承者',image:'./assets/osaka-retake.webp',flavor:'巻き戻る時計、再び開く教科書。何度でも知を求める者に、終わりの鐘は鳴らない。'}:card),
  photoCard(KINDAI_ID,'uni-kindai-photo',54,'海の挑戦者','./assets/kindai-photo.webp'),
  photoCard(SHIZUOKA_ID,'uni-shizuoka-photo',55,'後期の突破者','./assets/shizuoka-photo.webp'),
  {id:GRADUATE_ID,number:57,name:'森貴樹・阪大院',region:'DIVINE CHARACTER',rank:'S',type:'mori',edition:'limited',title:'叡智の神域',image:'./assets/mori-graduate.webp',flavor:'七つの姿を超え、探究は神域へ。幾千の論文が星となり、叡智の扉がいま開かれる。'},
  {id:HIGHSCHOOL_ID,baseId:OSAKA_ID,number:56,name:'高卒',region:'LIMITED CHARACTER',rank:'S',type:'limited',edition:'limited',title:'ゼロからの再起',image:'./assets/highschool-limited.webp',flavor:'単位は消えた。それでも物語は終わらない。空白のページを携えて、新たな道へ踏み出す。'},
];
CARDS.push({id:FUKUSHIMA_COLLAB_ID,number:110,name:'福島大学 × 金正恩',region:'福島大学 · COLLAB',rank:'S',type:'collab',edition:'collab',title:'赤シャツの特別講義',image:'./assets/fukushima-kim-collab-v2.webp',flavor:'赤いシャツが翻り、白いキャンパスに発射カウントが響く。ノートを開け、衝撃の特別講義が始まる。'});
CARDS.push(
  {id:FULLCREDIT_S_ID,number:111,name:'フル単の申し子・完全履修',region:'ACADEMIA · SPECIAL CHARACTER',rank:'S',type:'character',edition:'fullcredit',title:'全履修の祝福',image:'./assets/fullcredit-s.webp',flavor:'落単の影を振り切り、すべての科目を履修へ導く。金色の証明が舞うとき、フル単の伝説が完成する。'},
  {id:FULLCREDIT_A_ID,number:112,name:'フル単の申し子',region:'ACADEMIA · SPECIAL CHARACTER',rank:'A',type:'character',edition:'fullcredit',title:'履修完遂者',image:'./assets/fullcredit-a.webp',flavor:'積み重ねたノートと答案が光の軌跡になる。確実な学びで単位を拾い続ける、履修の実力者。'}
);
export const CARD_BY_ID = Object.fromEntries(CARDS.map(card => [card.id,card]));
export const RANK_BY_ID = Object.fromEntries(RANKS.map(rank => [rank.id,rank]));
export const universityCount = rank => BASE_CARDS.filter(card => card.type === 'university' && card.rank === rank).length;
export const isKindai = card => (card.baseId || card.id) === KINDAI_ID;
export const isChanceUniversity = card => [KINDAI_ID,SHIZUOKA_ID].includes(card.baseId || card.id);
export const isRare = card => card.type==='mori' || Boolean(card.edition);
export const isOriginalMori = card => card.type==='mori' && !card.edition;
// Mori's seven forms together weigh twice one ordinary university's mean rate.
// M = 2 * (100 - otherRareTotal - M) / ordinaryCount.
const ordinaryCount=CARDS.filter(card=>!isRare(card)).length;
const otherRareTotal=CARDS.filter(card=>isRare(card)&&!isOriginalMori(card)).length*RARE_RATE;
export const MORI_TOTAL_RATE=2*(100-otherRareTotal)/(ordinaryCount+2);
export const MORI_FORM_RATE=MORI_TOTAL_RATE/CARDS.filter(isOriginalMori).length;
// Unconditional percentage weights. Kindai/Shizuoka retain 25% chance and 20%/100% photo rules.
const photoFraction=SPECIAL_CHANCE+(1-SPECIAL_CHANCE)*PHOTO_CHANCE;
export function initialWeight(card) {
  if([FUKUSHIMA_COLLAB_ID,FULLCREDIT_S_ID,FULLCREDIT_A_ID].includes(card.id))return RARE_RATE;
  if(card.type==='mori')return isOriginalMori(card)?MORI_FORM_RATE:RARE_RATE;
  if(card.id===OSAKA_ID)return RARE_RATE/OSAKA_RETAKE_CHANCE;
  if(isChanceUniversity(card))return RARE_RATE/photoFraction;
  const rank=RANK_BY_ID[card.rank];
  const reserved=MORI_FORM_RATE+(rank.id==='S'?3*RARE_RATE+RARE_RATE/OSAKA_RETAKE_CHANCE:rank.id==='A'?RARE_RATE:rank.id==='E'?2*RARE_RATE/photoFraction:0);
  return (rank.chance-reserved)/(universityCount(rank.id)-(rank.id==='S'?1:rank.id==='E'?2:0));
}
export const cardRate = card => isOriginalMori(card)?MORI_FORM_RATE:isRare(card)?RARE_RATE:isChanceUniversity(card)?initialWeight(card)*(1-photoFraction):initialWeight(card);
export const MORI_LINE = 'お前Fランスギィ';
export const KINDAI_LINE = 'お前やりませんねスギィ';
export function moriInDraw(cards) {
  return cards.filter(card => card.type === 'mori' && !card.edition && ['S','A','B'].includes(card.rank)).sort((a,b) => RANKS.findIndex(r=>r.id===a.rank)-RANKS.findIndex(r=>r.id===b.rank))[0] ?? null;
}
export function randomFloat() {
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  return Math.random();
}
export function drawSlot(guaranteed=false, random=randomFloat) {
  const pool=guaranteed?RANKS.slice(0,3):RANKS;
  const total=pool.reduce((sum,rank)=>sum+rank.chance,0);
  let roll=random()*total;
  let chosen=pool[pool.length-1];
  for(const rank of pool){if(roll<rank.chance){chosen=rank;break;}roll-=rank.chance;}
  const candidates=[...BASE_CARDS,CARD_BY_ID[FUKUSHIMA_COLLAB_ID],CARD_BY_ID[GRADUATE_ID],CARD_BY_ID[FULLCREDIT_S_ID],CARD_BY_ID[FULLCREDIT_A_ID]].filter(card=>card.rank===chosen.id);
  let ticket=random()*chosen.chance;
  let card=candidates[candidates.length-1];
  for(const candidate of candidates){if(ticket<initialWeight(candidate)){card=candidate;break;}ticket-=initialWeight(candidate);}
  if(card.id===GRADUATE_ID)return {card,chance:null,graduate:true,initial:card};
  if(card.id===OSAKA_ID) {
    const outcome=random()<OSAKA_RETAKE_CHANCE?'retake':'lost';
    return {card:CARD_BY_ID[outcome==='retake'?OSAKA_ID:HIGHSCHOOL_ID],chance:null,osaka:{outcome},initial:{...card,image:'./assets/osaka-retake.webp'}};
  }
  let chance=null;
  if(isChanceUniversity(card)) {
    if(random()<SPECIAL_CHANCE) {
      const success=random()<ESCAPE_CHANCE;
      card=CARD_BY_ID[success?SHIZUOKA_ID:KINDAI_ID];
      chance={success};
    }
    if(chance || random()<PHOTO_CHANCE)card=CARD_BY_ID[isKindai(card)?'uni-kindai-photo':'uni-shizuoka-photo'];
  }
  return {card,chance,initial:chance?CARD_BY_ID[KINDAI_ID]:card};
}
export function drawCard(guaranteed=false,random=randomFloat){return drawSlot(guaranteed,random).card;}
export function drawTenWithEvents(random=randomFloat){return Array.from({length:10},(_,i)=>drawSlot(i===9,random));}
export function drawTen(random=randomFloat){return drawTenWithEvents(random).map(slot=>slot.card);}

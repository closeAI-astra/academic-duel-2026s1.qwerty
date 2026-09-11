import { CARDS, isRare } from './data.js';
import { PACK_CARDS } from './crystal-data.js';

export const CHAPTERS = ['F','E','D','C','B','A','S','RARE'];
export const frameStage = count => Math.max(0, Math.min(5, Math.floor(count || 0)));
export const FRAME_NAMES = ['未獲得','ブロンズ','シルバー','ゴールド','オーロラ','限界突破・最高レア'];
export function chapterCards(chapter,volume='mori') {
  return (volume==='crystal'?PACK_CARDS:CARDS).filter(card => chapter==='RARE' ? isRare(card) : !isRare(card)&&card.rank===chapter)
    .sort((a,b)=>CHAPTERS.indexOf(a.rank)-CHAPTERS.indexOf(b.rank)||a.number-b.number);
}
export function albumSlot(card,count,renderCard) {
  const number=String(card.number).padStart(3,'0'),stage=frameStage(count);
  if(!stage)return `<div class="album-slot empty-slot"><div class="empty-card" aria-label="No. ${number}、未獲得の空き枠"><span class="empty-number">No. ${number}</span><span class="empty-emblem" aria-hidden="true">◇</span><span>未獲得</span></div><p class="album-caption">まだ見ぬ一枚</p></div>`;
  return `<div class="album-slot filled-slot">${renderCard(card)}<p class="album-caption"><strong>${count}枚</strong> · ${stage===5?'MAX':`${stage} / 5`}<small>${FRAME_NAMES[stage]}</small></p></div>`;
}

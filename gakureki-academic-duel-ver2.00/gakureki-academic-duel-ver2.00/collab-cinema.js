// Present the already awarded ten-pull. This module never draws or changes inventory.
export const COLLAB_TIMELINE=[{at:0,phase:'gather',line:'九枚の運命が、重なる。'},{at:1600,phase:'charge',line:'束の奥から、異常反応。'},{at:2800,phase:'launch',line:'突破、開始。'},{at:3500,phase:'burst',line:'その一枚は、常識を突き破る。'},{at:4700,phase:'reveal',line:'福島大学 × 金正恩'}];
export const COLLAB_DURATION=8200;
export function collabOtherCards(cards,index){
 if(cards.length!==10||!Number.isInteger(index)||index<0||index>=10)throw new Error('A collaboration cinematic requires one selected slot in a ten-pull');
 return cards.filter((_,i)=>i!==index);
}
let stopCurrent=()=>{};
export const stopCollabCinema=()=>stopCurrent();
export function playCollabCinema({cards,index,renderCard,reduced=false,tone=()=>{},onEnd=()=>{},onSkip=onEnd}){
 stopCurrent();
 const others=collabOtherCards(cards,index),$=id=>document.getElementById(id),dialog=$('collab-cinema');
 const timers=[];let stopped=false;
 const cleanup=()=>{
  if(stopped)return;stopped=true;timers.forEach(clearTimeout);
  $('collab-skip').removeEventListener('click',skip);$('collab-continue').removeEventListener('click',finish);
  dialog.removeEventListener('cancel',skip);dialog.removeEventListener('close',skip);
  if(dialog.open)dialog.close();
  $('collab-stack').innerHTML='';$('collab-prize').innerHTML='';stopCurrent=()=>{};
 };
 const finish=()=>{if(stopped)return;cleanup();onEnd();};
 const skip=event=>{event?.preventDefault();if(stopped)return;cleanup();onSkip();};
 stopCurrent=cleanup;
 $('collab-stack').innerHTML=others.map((card,i)=>{
  const markup=renderCard(card),side=i%2?1:-1;
  return `<div class="collab-layer" data-stack-card="${card.id}" style="--sx:${(i-4)*3}px;--sy:${(i-4)*-4}px;--angle:${(i-4)*2}deg;--order:${i};--gx:${side*(50+i*7)}vw;--gy:${i%3===0?-65:65}vh;--flyx:${side*(40+i*5)}vw;--flyy:${(i%3-1)*70}vh;--spin:${side*(90+i*19)}deg;--stack-art:url('${card.image}')"><div class="collab-stack-copy">${markup}</div><div class="collab-half collab-left"></div><div class="collab-half collab-right"></div></div>`;
 }).join('');
 $('collab-prize').innerHTML=renderCard(cards[index]);
 dialog.dataset.reduced=String(reduced);dialog.dataset.phase='gather';
 $('collab-continue').hidden=!reduced;
 const setPhase=step=>{
  if(stopped)return;dialog.dataset.phase=step.phase;$('collab-cinema-title').textContent=step.line;
  if(step.phase==='charge'){tone(82,0,.9,.03);tone(123,.3,.8,.025);}
  if(step.phase==='launch'){tone(180,0,.3,.04);tone(360,.15,.3,.035);tone(720,.3,.35,.03);}
  if(step.phase==='burst'){tone(55,0,.65,.055);tone(110,.1,.5,.03);}
  if(step.phase==='reveal'){tone(523,0,.7,.025);tone(659,.12,.7,.02);tone(784,.24,.9,.02);}
 };
 $('collab-skip').addEventListener('click',skip);$('collab-continue').addEventListener('click',finish);
 dialog.addEventListener('cancel',skip);dialog.addEventListener('close',skip);
 setPhase(reduced?COLLAB_TIMELINE.at(-1):COLLAB_TIMELINE[0]);
 dialog.showModal();$('collab-skip').focus({preventScroll:true});
 if(reduced)return;
 for(const step of COLLAB_TIMELINE.slice(1))timers.push(setTimeout(()=>setPhase(step),step.at));
 timers.push(setTimeout(finish,COLLAB_DURATION));
}

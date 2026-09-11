const $=id=>document.getElementById(id);
let timerIds=[];
let pointerHandler=null,pointerFrame=0,pointerX=0,pointerY=0;
let active=false;
const later=(fn,ms)=>{const id=setTimeout(fn,ms);timerIds.push(id);return id;};
function clearTimers(){timerIds.forEach(clearTimeout);timerIds=[];}
function setParallax(dialog,x=0,y=0){dialog?.style.setProperty('--fc-px',String(x));dialog?.style.setProperty('--fc-py',String(y));}
function qualityTier(){
  const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4,w=innerWidth;
  if(w<560||cores<=2||mem<=2)return 0;
  if(w<900||cores<=4||mem<=4)return 1;
  return 2;
}
function installParallax(dialog,reduced,tier){
  if(reduced||!dialog||tier===0)return;
  pointerHandler=e=>{
    pointerX=Math.max(-1,Math.min(1,((e.clientX/Math.max(1,innerWidth))-.5)*2));
    pointerY=Math.max(-1,Math.min(1,((e.clientY/Math.max(1,innerHeight))-.5)*2));
    if(pointerFrame)return;
    pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;setParallax(dialog,pointerX,pointerY);});
  };
  window.addEventListener('pointermove',pointerHandler,{passive:true});
}
function removeParallax(){if(pointerHandler){window.removeEventListener('pointermove',pointerHandler);pointerHandler=null;}if(pointerFrame){cancelAnimationFrame(pointerFrame);pointerFrame=0;}pointerX=pointerY=0;}
function buildParticles(host,count){
  if(!host)return;host.replaceChildren();
  const frag=document.createDocumentFragment();
  for(let i=0;i<count;i++){
    const p=document.createElement('i');
    p.style.setProperty('--i',String(i));p.style.setProperty('--x',`${(i*37)%101}%`);p.style.setProperty('--y',`${(i*61)%101}%`);
    p.style.setProperty('--d',`${2.1+(i%8)*.22}s`);p.style.setProperty('--delay',`${-(i%13)*.17}s`);frag.append(p);
  }
  host.append(frag);
}
export function stopFullCreditCinema(){
  active=false;clearTimers();removeParallax();
  const d=$('fullcredit-cinema');
  if(d){d.className='fullcredit-cinema';d.dataset.rank='';d.dataset.quality='';setParallax(d,0,0);if(d.open)try{d.close();}catch{}}
}
export function playFullCreditCinema({card,markup,reduced=false,tone=()=>{},onSkip=()=>{},onEnd=()=>{}}={}){
  const d=$('fullcredit-cinema'); if(!d||!card){onEnd();return;}
  stopFullCreditCinema(); active=true;
  const isS=card.rank==='S',tier=qualityTier();
  d.dataset.rank=card.rank;d.dataset.quality=String(tier);d.className='fullcredit-cinema';
  const bg=$('fc-bg'),mid=$('fc-mid'),person=$('fc-person'),foreground=$('fc-foreground');
  for(const img of [bg,mid,person,foreground]){if(img){img.src=card.image;img.alt='';img.decoding='async';}}
  const art=$('fc-card'); if(art)art.innerHTML=markup||'';
  const mini=$('fc-mini-card'); if(mini)mini.innerHTML=markup||'';
  if($('fc-title'))$('fc-title').textContent=card.name;
  if($('fc-subtitle'))$('fc-subtitle').textContent=isS?'全履修の祝福 — すべての単位が、ここに集う。':'履修完遂者 — 積み上げた学びが、力になる。';
  if($('fc-rank-label'))$('fc-rank-label').textContent=`${card.rank} RANK · FULL CREDIT SPECIAL`;
  buildParticles($('fc-particles'),reduced?0:[8,18,32][tier]);
  const skip=$('fc-skip');if(skip)skip.onclick=()=>{if(!active)return;stopFullCreditCinema();onSkip();};
  installParallax(d,reduced,tier);
  try{if(!d.open)d.showModal();}catch{active=false;onEnd();return;}
  requestAnimationFrame(()=>{if(active)d.classList.add('fc-phase-enter');});
  tone(isS?196:247,0,.55,.025);tone(isS?392:370,.10,.5,.018);
  if(reduced){d.classList.add('fc-phase-depth','fc-phase-reveal','fc-phase-card','fc-phase-settle');later(()=>{if(!active)return;stopFullCreditCinema();onEnd();},1100);return;}
  later(()=>{if(!active)return;d.classList.add('fc-phase-depth');tone(isS?659:523,0,.7,.022);},360);
  later(()=>{if(!active)return;d.classList.add('fc-phase-orbit');tone(isS?784:659,0,.45,.018);},900);
  later(()=>{if(!active)return;d.classList.add('fc-phase-burst');tone(isS?988:784,0,.62,.028);tone(isS?1318:1046,.08,.52,.022);},1420);
  later(()=>{if(!active)return;d.classList.add('fc-phase-reveal');},2180);
  later(()=>{if(!active)return;d.classList.add('fc-phase-overdrive');tone(82,0,.5,.04);tone(isS?1760:1396,.05,.78,.024);},2920);
  later(()=>{if(!active)return;d.classList.add('fc-phase-impact');},3220);
  later(()=>{if(!active)return;d.classList.add('fc-phase-card');tone(isS?2093:1568,0,.55,.018);},3420);
  if(isS)later(()=>{if(!active)return;d.classList.add('fc-phase-second-impact');tone(73,0,.35,.035);},4180);
  later(()=>{if(!active)return;d.classList.add('fc-phase-settle');},isS?4900:4450);
  later(()=>{if(!active)return;stopFullCreditCinema();onEnd();},isS?6100:5400);
}

// The cinematic only renders an already-resolved result; it never changes draw odds or inventory.
export const CINEMA_STEPS = [
  {at:0,phase:'summon',title:'大阪大学',line:'その一枚が、運命を変える。'},
  {at:1600,phase:'audit',title:'単位審査',line:'学籍照合中 — 運命分岐 50 : 50'},
  {at:3500,phase:'fracture'},
  {at:5700,phase:'verdict'},
  {at:7400,phase:'reveal'},
];
export const CINEMA_DURATION=10800;
export const GRADUATE_STEPS = [
  {at:0,phase:'summon',title:'森貴樹',line:'その探究に、終わりはない。'},
  {at:1600,phase:'audit',title:'叡智、共鳴。',line:'七つの姿を超え、神域の扉が開く。'},
  {at:3500,phase:'fracture'},
  {at:5700,phase:'verdict'},
  {at:7400,phase:'reveal'},
];
export function playGraduateCinema(options){return playOsakaCinema({...options,outcome:'graduate'});}
let stopCurrent=()=>{};
export function stopOsakaCinema(){stopCurrent();}

export function playOsakaCinema({outcome,card,markup,reduced=false,tone=()=>{},onEnd=()=>{},onSkip=onEnd}) {
  stopCurrent();
  const $=id=>document.getElementById(id), dialog=$('osaka-cinema');
  const timers=[];let frame=0,stopped=false,start=performance.now(),phase='summon';
  const lost=outcome==='lost',graduate=outcome==='graduate';
  const later=(fn,ms)=>timers.push(setTimeout(()=>{if(!stopped)fn();},ms));
  const cleanup=()=>{
    if(stopped)return;stopped=true;
    timers.forEach(clearTimeout);cancelAnimationFrame(frame);
    window.removeEventListener('resize',resize);
    dialog.removeEventListener('cancel',skip);
    dialog.removeEventListener('close',externalClose);
    $('cinema-skip').removeEventListener('click',skip);
    if(dialog.open)dialog.close();
    stopCurrent=()=>{};
  };
  const finish=()=>{cleanup();onEnd();};
  const skip=event=>{event?.preventDefault();cleanup();onSkip();};
  const externalClose=()=>{cleanup();onSkip();};
  stopCurrent=cleanup;
  dialog.className=`osaka-cinema ${graduate?'ending-graduate':lost?'ending-lost':'ending-retake'}`;
  dialog.dataset.phase='summon';
  $('cinema-mode').textContent=graduate?'DIVINE SUMMON · 神域降臨':'LIMITED SUMMON · 運命分岐';
  $('cinema-skip').textContent='演出をスキップ';
  $('cinema-reveal-card').innerHTML=markup;
  $('cinema-result-name').textContent=graduate?'森貴樹・阪大院':lost?'高卒':'大阪大学 — 再履修';
  $('cinema-result-sub').textContent=graduate?'叡智の神域 · S DIVINE LIMITED':lost?'ゼロからの再起 · S LIMITED':'再履修の継承者 · S LIMITED';
  $('cinema-next').textContent='確定した限定カードを獲得します';
  $('cinema-backdrop').src=graduate?card.image:'./assets/osaka-verdict-wide.webp';
  $('cinema-meter-label').textContent=graduate?'WISDOM RESONANCE':'ACADEMIC CREDITS';
  $('cinema-meter-note').textContent=graduate?'叡智の共鳴 · ゲーム演出':'単位ゲージ · ゲーム演出';
  $('cinema-origin-name').textContent=graduate?'森貴樹':'大阪大学';
  $('cinema-fragments').innerHTML=Array.from({length:15},(_,i)=>{
    const col=i%3,row=Math.floor(i/3),dx=(col-1)*230+(i%2?65:-65),dy=(row-2)*115;
    return `<span class="cinema-fragment" style="background-image:url('${graduate?card.image:'./assets/osaka-retake.webp'}');clip-path:inset(${row*20}% ${100-(col+1)*100/3}% ${100-(row+1)*20}% ${col*100/3}%);--dx:${dx}px;--dy:${dy}px;--spin:${(i%2?1:-1)*(35+i*7)}deg;--delay:${i*17}ms"></span>`;
  }).join('');
  $('cinema-title').textContent=graduate?'森貴樹':'大阪大学';
  $('cinema-line').textContent=graduate?'その探究に、終わりはない。':'その一枚が、運命を変える。';
  $('cinema-credits').textContent=graduate?'000':'120';
  const canvas=$('cinema-particles'),ctx=canvas.getContext('2d');
  let width=1,height=1,particles=[];
  function resize(){
    width=window.innerWidth;height=window.innerHeight;
    const ratio=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
    ctx?.setTransform(ratio,0,0,ratio,0,0);
  }
  resize();
  const count=window.innerWidth<600?64:130;
  particles=Array.from({length:count},(_,i)=>({angle:i*2.39996,radius:40+(i*37)%460,size:1+i%3,speed:.14+(i%7)*.035}));
  function draw(now){
    if(stopped)return;
    const elapsed=(now-start)/1000;
    if(ctx){
      ctx.clearRect(0,0,width,height);
      const burst=phase==='fracture'||phase==='verdict';
      for(const p of particles){
        const angle=p.angle+elapsed*p.speed*(lost?1:-1);
        const radius=burst?p.radius+(elapsed-3.5)*95:p.radius*(.65+.2*Math.sin(elapsed*.7));
        const x=width/2+Math.cos(angle)*radius,y=height*.47+Math.sin(angle)*radius*.75;
        ctx.fillStyle=lost&&burst?'#f06b6588':'#e8c98699';
        ctx.beginPath();ctx.arc(x,y,p.size,0,Math.PI*2);ctx.fill();
        if(burst){ctx.strokeStyle=lost?'#ef5b5940':'#66e5e740';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(angle)*23,y-Math.sin(angle)*23);ctx.stroke();}
      }
    }
    if(phase==='fracture') {
      const p=Math.min(1,Math.max(0,(elapsed-3.5)/2.2));
      $('cinema-credits').textContent=String(graduate?Math.round(999*p):lost?Math.round(120*(1-p)):Math.round(120*Math.abs(1-2*p))).padStart(3,'0');
    }
    frame=requestAnimationFrame(draw);
  }
  const setPhase=step=>{
    phase=step.phase;dialog.dataset.phase=phase;
    if(step.title)$('cinema-title').textContent=step.title;
    if(step.line)$('cinema-line').textContent=step.line;
    if(phase==='audit'){tone(110,0,.8,.04);tone(165,.15,.8,.025);}
    if(phase==='fracture'){
      $('cinema-title').textContent=graduate?'叡智解放':lost?'単位、消失。':'時間逆行';
      $('cinema-line').textContent=graduate?'すべての問いが、光になる。':lost?'履修記録が、崩れていく。':'もう一度、あの教室へ。';
      tone(lost?73:220,0,1,.045);tone(lost?98:440,.15,.65,.025);
    }
    if(phase==='verdict'){
      $('cinema-title').textContent=graduate?'阪大院、降臨。':lost?'お前の単位ねえから':'再履修';
      $('cinema-line').textContent=graduate?'DIVINE AWAKENING — 学歴の亡者、その先へ':lost?'CREDIT ZERO — 新たな物語が始まる':'RE:TAKE — 終わらない探究';
      $('cinema-credits').textContent=graduate?'∞':lost?'000':'120';
      tone(lost?146:660,0,.7,.04);tone(lost?196:880,.18,.7,.025);
    }
    if(phase==='reveal'){
      $('cinema-title').textContent=graduate?'神域、到達。':lost?'高卒':'再履修、確定。';
      $('cinema-line').textContent='S RANK · LIMITED EDITION';
      tone(523,0,.9,.025);tone(659,.12,.8,.02);tone(784,.24,.8,.02);
    }
  };
  $('cinema-skip').addEventListener('click',skip);
  dialog.addEventListener('cancel',skip);
  dialog.addEventListener('close',externalClose);
  window.addEventListener('resize',resize);
  dialog.showModal();$('cinema-skip').focus({preventScroll:true});
  if(reduced){setPhase({phase:'verdict'});setPhase({phase:'reveal'});$('cinema-next').textContent=(graduate?'森貴樹・阪大院、降臨。':lost?'お前の単位ねえから。':'再履修。')+' 閉じるボタンで戻れます。';return;}
  frame=requestAnimationFrame(draw);
  for(const step of (graduate?GRADUATE_STEPS:CINEMA_STEPS))later(()=>setPhase(step),step.at);
  later(finish,CINEMA_DURATION);
}

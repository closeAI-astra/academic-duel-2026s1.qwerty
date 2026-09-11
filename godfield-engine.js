import { GF, CARD, drawArtifact } from './godfield-data.js?v=2.00-complete-004';

export const PHASE = Object.freeze({
  LOBBY:'lobby', TURN:'turn', QUESTION:'question', GROUP:'group-question',
  DEFENSE:'defense', TRADE:'trade', FINISHED:'finished'
});

export function clampHp(v){return Math.max(0,Math.min(GF.MAX_HP,Math.trunc(Number(v)||0)))}
export function makePlayer(profile){
  return {
    pid:profile.id,profile,
    hp:GF.INITIAL_HP,mp:GF.INITIAL_MP,money:GF.INITIAL_MONEY,
    alive:true,slump:false,ailments:[],
    hand:[],learned:[],lastQuestion:null,
  };
}
export function shuffle(a,rng=Math.random){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
export function makeState(profiles,rng=Math.random){
  const players=profiles.map(makePlayer);shuffle(players,rng);
  for(const p of players)drawToHand(p,GF.INITIAL_HAND,rng);
  return {version:2,phase:PHASE.TURN,turn:players[0]?.pid||null,players,winner:null,draw:false,turnCount:1};
}
export function player(state,pid){return state.players.find(p=>p.pid===pid)||null}
export function alive(state){return state.players.filter(p=>p.alive)}
export function drawToHand(p,count,rng=Math.random){
  let n=0;while(n<count&&p.hand.length<GF.MAX_HAND){const id=drawArtifact(rng);if(!id)break;p.hand.push(id);n++}return n;
}
export function hasIds(list,ids){
  const x=[...list];for(const id of ids){const i=x.indexOf(id);if(i<0)return false;x.splice(i,1)}return true;
}
export function removeIds(list,ids){
  if(!hasIds(list,ids))return false;
  for(const id of ids){const i=list.indexOf(id);list.splice(i,1)}
  return true;
}
export function learnMiracle(p,id){
  p.learned.push(id);
  while(p.learned.length>GF.MAX_LEARNED_MIRACLES)p.learned.shift();
}
export function consumeFromHand(p,ids,rng=Math.random){
  if(!removeIds(p.hand,ids))return false;drawToHand(p,ids.length,rng);return true;
}
export function hasAnyWeapon(p){return p.hand.some(id=>['weapon','add','global'].includes(CARD[id]?.kind))}
export function pray(p,rng=Math.random){
  if(hasAnyWeapon(p))return {ok:false,reason:'武器を持っているため祈れません'};
  let discarded=null;
  if(p.hand.length>=GF.MAX_HAND)discarded=p.hand.splice(Math.floor(rng()*p.hand.length),1)[0];
  drawToHand(p,1,rng);return {ok:true,discarded};
}
export function combineElements(cards){
  const forced=cards.find(c=>c?.effect==='paint-fire'||c?.effect==='paint-water');
  if(forced?.effect==='paint-fire')return 'fire';
  if(forced?.effect==='paint-water')return 'water';
  const els=[...new Set(cards.map(c=>c?.element).filter(e=>e&&e!=='none'))];
  if(!els.length)return 'none';
  const nonLight=els.filter(e=>e!=='light');
  if(nonLight.length===0)return 'light';
  if(nonLight.length===1)return nonLight[0];
  return 'none';
}
export function isAttackModifier(c){return c?.kind==='add'||(c?.kind==='miracle'&&c.miracleMode==='add')}
export function buildSingleAttack(cards){
  const invalid=cards.filter(c=>!(c.kind==='weapon'||c.kind==='add'||(c.kind==='miracle'&&c.miracleMode==='add')));
  if(invalid.length)return {ok:false,reason:'この組み合わせでは単体攻撃できません'};
  const weapons=cards.filter(c=>c.kind==='weapon');
  if(weapons.length>1)return {ok:false,reason:'通常武器は1ターンに1枚までです'};
  if(!cards.length)return {ok:false,reason:'武器を選択してください'};
  const main=weapons[0]||null;
  const bonus=cards.filter(c=>isAttackModifier(c));
  const atk=(main?.atk||0)+bonus.reduce((n,c)=>n+(c.atk||0),0);
  return {ok:true,attack:{
    source:'single',atk,element:combineElements(cards),
    effect:main?.effect||null,hits:main?.hits||1,
    cards:cards.map(c=>c.id),main:main?.id||null,
    bonusCards:bonus.map(c=>c.id),baseStars:main?.stars??1,
  }};
}
const defensiveEffects=new Set(['reflect-none','bounce-miracle','stop-miracle','reflect-miracle','reflect-all','remove-element']);
export function canArtifactDefend(card){
  return Boolean(card&&(card.kind==='defense'||card.def>0||defensiveEffects.has(card.effect)));
}
export function defenseCompatible(card,attack,selected=[]){
  if(!canArtifactDefend(card))return false;
  const rainbow=selected.some(id=>CARD[id]?.effect==='remove-element');
  const e=rainbow?'none':(attack.element||'none');

  if(card.effect==='reflect-all')return true;
  if(card.effect==='remove-element')return (attack.element||'none')!=='none';
  if(card.effect==='reflect-none')return attack.source!=='miracle'&&e==='none';
  if(card.effect==='reflect-miracle'||card.effect==='bounce-miracle'||card.effect==='stop-miracle')return attack.source==='miracle';

  if(e==='light')return false;
  if(e==='none'||e==='dark')return true;
  if(card.element==='light')return true;
  if(e==='fire')return card.element==='water';
  if(e==='water')return card.element==='fire';
  if(e==='wood')return card.element==='earth';
  if(e==='earth')return card.element==='wood';
  return false;
}
export function resolveDefense(attack,shieldCards){
  const effective={...attack};
  if(shieldCards.some(c=>c.effect==='remove-element'))effective.element='none';

  // 原作定義:
  // はね返す = 攻撃者へ返す
  // 弾く = 自分を含む全預言者の誰かへ返す
  // 止める = 完全防御
  // 返された攻撃は再防御できない（再防御禁止はcontroller側で直接ダメージ処理）。
  for(const c of shieldCards){
    if(c.effect==='reflect-all'){
      return {kind:'reflect',damage:0,def:0,attack:effective,card:c,noRedefense:true};
    }
    // 虹のカーテンで奇跡を無属性化しても、反射剣では反射できない。
    if(c.effect==='reflect-none'&&attack.source!=='miracle'&&effective.element==='none'){
      return {kind:'reflect',damage:0,def:0,attack:effective,card:c,noRedefense:true};
    }
    if(attack.source==='miracle'){
      if(c.effect==='reflect-miracle'){
        return {kind:'reflect',damage:0,def:0,attack:effective,card:c,noRedefense:true};
      }
      if(c.effect==='stop-miracle'){
        return {kind:'stop',damage:0,def:0,attack:effective,card:c,noRedefense:true};
      }
      if(c.effect==='bounce-miracle'){
        return {kind:'bounce',damage:0,def:0,attack:effective,card:c,noRedefense:true};
      }
    }
  }

  const def=shieldCards.reduce((n,c)=>n+(c.def||0),0);
  return {kind:'reduce',damage:Math.max(0,(attack.atk||0)-def),def,attack:effective,noRedefense:false};
}
export function damagePlayer(p,amount,{dark=false}={}){
  const dmg=Math.max(0,Math.trunc(Number(amount)||0));
  const before=clampHp(p.hp);
  p.hp=clampHp(before-dmg);
  if(dark&&dmg>0)p.hp=0;
  if(p.hp<=0){p.hp=0;p.alive=false}
  // Return the HP actually lost, not the requested damage amount.
  // This keeps drain/reflect logs and the large DAMAGE readout truthful.
  return Math.max(0,before-p.hp);
}
export function healPlayer(p,amount){
  const before=p.hp;p.hp=clampHp(p.hp+Math.max(0,Math.trunc(Number(amount)||0)));
  if(p.hp>0)p.alive=true;
  return p.hp-before;
}
export function addAilment(p,a){
  if(!a)return;
  if(['cold','fever','hell','heaven'].includes(a)){
    for(const x of ['cold','fever','hell','heaven']){const i=p.ailments.indexOf(x);if(i>=0)p.ailments.splice(i,1)}
  }
  if(!p.ailments.includes(a))p.ailments.push(a);
}
export function removeAilments(p,names){
  p.ailments=p.ailments.filter(x=>!names.includes(x));
}
export function advanceTurn(state){
  const living=alive(state);
  if(living.length===0){state.phase=PHASE.FINISHED;state.draw=true;state.winner=null;return null}
  if(living.length===1){state.phase=PHASE.FINISHED;state.winner=living[0].pid;return living[0].pid}
  const i=state.players.findIndex(p=>p.pid===state.turn);
  for(let step=1;step<=state.players.length;step++){
    const p=state.players[(i+step)%state.players.length];
    if(p.alive){state.turn=p.pid;state.turnCount++;state.phase=PHASE.TURN;return p.pid}
  }
  return null;
}
export function payForSale(p,price){
  let rest=Math.max(0,Math.trunc(price||0));const paid={money:0,mp:0,hp:0};
  paid.money=Math.min(p.money,rest);p.money-=paid.money;rest-=paid.money;
  paid.mp=Math.min(p.mp,rest);p.mp-=paid.mp;rest-=paid.mp;
  if(rest>0){paid.hp=Math.min(Math.max(0,p.hp),rest);damagePlayer(p,paid.hp);rest-=paid.hp}
  return {...paid,unpaid:rest};
}
export function validateExchange(total,hp,mp,money){
  hp=Math.trunc(Number(hp));mp=Math.trunc(Number(mp));money=Math.trunc(Number(money));
  if(!Number.isFinite(hp)||!Number.isFinite(mp)||!Number.isFinite(money))return {ok:false,reason:'整数で入力してください'};
  if(hp<1||hp>GF.MAX_HP)return {ok:false,reason:`HPは1〜${GF.MAX_HP}`};
  if(mp<0||money<0)return {ok:false,reason:'MPと¥は0以上'};
  if(hp+mp+money>total)return {ok:false,reason:'合計値を超えています'};
  return {ok:true,hp,mp,money,unused:total-hp-mp-money};
}

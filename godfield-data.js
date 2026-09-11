import { makeGodFieldQuestion } from './godfield-questions.js?v=2.00-complete-004';

export const GF = Object.freeze({
  MAX_PLAYERS: 5,
  INITIAL_HP: 40,
  MAX_HP: 100,              // 学歴召喚版の明示的な独自仕様
  INITIAL_MP: 10,
  INITIAL_MONEY: 20,
  INITIAL_HAND: 9,
  MAX_HAND: 18,
  MAX_LEARNED_MIRACLES: 6,
  ANSWER_MS: 10_000,
  DECK_TOTAL: 500,
  DISTRIBUTION: Object.freeze({
    trade: 60,
    single: 152,
    global: 18,
    defense: 148,
    miracle: 30,
    misc: 92,
  }),
});

export const ELEMENT = Object.freeze({
  NONE:'none', FIRE:'fire', WATER:'water', WOOD:'wood',
  EARTH:'earth', LIGHT:'light', DARK:'dark'
});

const weightFromRate = rate => Math.max(1, Math.round((Number(rate)||0.2) * 5));
const base = (id,name,kind,o={}) => ({
  id,name,kind,
  atk:o.atk||0, def:o.def||0,
  element:o.element||'none',
  price:o.price??1,
  effect:o.effect||null,
  effectText:o.effectText||'',
  hit:o.hit??1,
  stars:o.stars??1,
  hits:o.hits??1,
  miracleMode:o.miracleMode||null,
  attackEffect:o.attackEffect||null,
  rate:o.rate??0.2,
  weight:weightFromRate(o.rate??0.2),
  auto:Boolean(o.auto),
});
const weapon=(id,name,atk,o={})=>base(id,name,'weapon',{...o,atk});
const add=(id,name,atk,o={})=>base(id,name,'add',{...o,atk});
const global=(id,name,atk,hit,o={})=>base(id,name,'global',{...o,atk,hit});
const defense=(id,name,def,o={})=>base(id,name,'defense',{...o,def});
const miracle=(id,name,cost,effect,o={})=>({...base(id,name,'miracle',{...o,effect,price:0}),cost});
const utility=(id,name,effect,o={})=>base(id,name,'utility',{...o,effect});

export const CARDS = Object.freeze([
  // ── 単体・通常武器 ──────────────────────────────────────
  weapon('club-copper','銅のこん棒',1,{price:1,rate:.6}),
  weapon('whip','ムチ',2,{price:1,rate:.8}),
  weapon('punch','パンチ',3,{price:1,rate:1.0}),
  weapon('saw','のこぶんぶん',3,{price:10,rate:.2,effect:'double',hits:2,effectText:'2回攻撃'}),
  weapon('hatchet','ハチェット',4,{price:2,rate:1.2}),
  weapon('chain-sickle','鎖ガマ',5,{price:2,rate:1.4}),
  weapon('hard-hammer','硬いつち',6,{price:2,rate:1.6}),
  weapon('naginata','なぎなたクラシック',7,{price:3,rate:1.6}),
  weapon('ghost-sword','ゴーストソード',7,{price:10,rate:.2,effect:'drain',effectText:'HP吸収'}),
  weapon('final-fang','ファイナル牙',8,{price:3,rate:1.6}),
  weapon('power-halberd','パワーハルベルト',9,{price:3,rate:1.4}),
  weapon('wonder-sword','ワンダーソード',10,{price:4,rate:1.4}),
  weapon('reflect-sword','反射剣',10,{price:5,rate:.6,effect:'reflect-none',effectText:'無属性の攻撃をはね返す'}),
  weapon('gravity-mace','グラビティメイス',11,{price:4,rate:.8}),
  weapon('morobukkomi','もろぶっこみアクス',12,{price:4,rate:.8}),
  weapon('torch','たいまつ',1,{price:1,rate:.2,element:'fire'}),
  weapon('hot-knife','あちちナイフ',2,{price:2,rate:.2,element:'fire'}),
  weapon('icicle','つらら',1,{price:1,rate:.2,element:'water'}),
  weapon('wood-sword','木刀',1,{price:1,rate:.2,element:'wood'}),
  weapon('stone-bake','つるぎ焼き',2,{price:2,rate:.2,element:'earth'}),
  weapon('star-staff','スタースタッフ',3,{price:3,rate:.2,element:'light'}),
  weapon('killer-fork','キラーフォーク',5,{price:10,rate:.2,element:'dark'}),

  // ── 追加武器 ────────────────────────────────────────────
  add('blowgun','吹き矢',1,{price:1,rate:.2,stars:1}),
  add('crossbow','クロスボウ',2,{price:2,rate:.2,stars:1}),
  add('boomerang','ブーメラン',3,{price:3,rate:.2,stars:1}),
  add('battle-ball','バトルボール',4,{price:4,rate:.2,stars:1}),
  add('warrior-bow','戦士の弓',5,{price:5,rate:.2,stars:1}),
  add('jet-yoyo','ジェットヨーヨー',6,{price:6,rate:.2,stars:1}),
  add('unknown-feather','未知の羽根',7,{price:7,rate:.2,stars:1}),
  add('psychic-card','サイキックカード',8,{price:8,rate:.2,stars:1}),
  add('sky-harpoon','スカイハープーン',9,{price:5,rate:.2,stars:1,effect:'bounce-miracle',effectText:'奇跡を弾く'}),
  add('fear-wheel','恐怖の車輪',11,{price:10,rate:.2,stars:1}),
  add('combat-top','独楽コンバット',13,{price:10,rate:.2,stars:1}),
  add('angel-bow','エンゼルの弓',15,{price:15,rate:.2,stars:1,effect:'stop-miracle',effectText:'奇跡を止める'}),
  add('fire-wand','発火のワンド',2,{price:15,rate:.2,stars:1,element:'fire',effect:'paint-fire',effectText:'攻撃が火属性になる'}),
  add('fire-crossbow','ファイヤークロスボウ',4,{price:8,rate:.2,stars:1,element:'fire'}),
  add('water-wand','魔水のワンド',5,{price:15,rate:.2,stars:1,element:'water',effect:'paint-water',effectText:'攻撃が水属性になる'}),
  add('leaf-shuriken','葉っぱ手裏剣',2,{price:3,rate:.2,stars:1,element:'wood'}),
  add('rubber-bow','熟成ゴムの弓',3,{price:6,rate:.2,stars:1,element:'wood'}),
  add('old-javelin','旧石器ジャベリン',5,{price:4,rate:.2,stars:1,element:'earth'}),
  add('new-tomahawk','新石器トマホーク',7,{price:10,rate:.2,stars:1,element:'earth'}),
  add('light-fragment','輝きのカケラ',1,{price:10,rate:.2,stars:1,element:'light'}),
  add('dark-arrow','冥矢',5,{price:15,rate:.2,stars:1,element:'dark'}),

  // ── 全体武器 ────────────────────────────────────────────
  global('spark-bag','火の粉袋',1,.75,{price:2,rate:.2,element:'fire'}),
  global('flame-cup','火炎杯',4,.75,{price:6,rate:.2,element:'fire'}),
  global('fire-shower','烈火シャワー',7,.75,{price:10,rate:.2,element:'fire'}),
  global('flare-axe','フレアアクス',10,.5,{price:10,rate:.2,element:'fire'}),
  global('mist-fan','霧の扇',3,.5,{price:8,rate:.2,element:'water',effect:'fog-on-hit',effectText:'霧'}),
  global('cold-cup','冷気杯',4,.75,{price:6,rate:.2,element:'water'}),
  global('snowball','特大雪玉',5,.5,{price:5,rate:.2,element:'water'}),
  global('rain-blade','雨神刀',9,.5,{price:9,rate:.2,element:'water'}),
  global('vine-shoot','つるシュート',3,.75,{price:10,rate:.2,element:'wood',effect:'drain',effectText:'HP吸収'}),
  global('plant-cup','植物杯',4,.75,{price:6,rate:.2,element:'wood'}),
  global('wood-horse','魔神の木馬',8,.75,{price:15,rate:.2,element:'wood',def:6}),
  global('rock-cup','岩石杯',4,.75,{price:6,rate:.2,element:'earth'}),
  global('gaketsuchi','ガケッツチ',6,.25,{price:4,rate:.2,element:'earth'}),
  global('petit-saturn','プチサターン',20,.25,{price:15,rate:.2,element:'earth'}),
  global('thunder-kids','イナヅマキッズ',3,.25,{price:2,rate:.2,element:'light'}),
  global('light-orb','光のオーブ',6,.75,{price:10,rate:.2,element:'light'}),
  global('shadow-hand','シャドウハンド',2,.5,{price:8,rate:.2,element:'dark',effect:'dark-instant',effectText:'1ダメージ以上で即死'}),

  // ── 防具 / 防御用雑貨 ─────────────────────────────────
  defense('leather-hat','革の帽子',1,{price:1,rate:2.0}),
  defense('leather-clothes','革の服',2,{price:2,rate:2.0}),
  defense('iron-gauntlet','アイアンガントレット',3,{price:3,rate:1.6}),
  defense('iron-shield','アイアンシールド',4,{price:4,rate:1.6}),
  defense('iron-armor','アイアンアーマー',5,{price:5,rate:1.6}),
  defense('sky-boots','スカイブーツ',1,{price:5,rate:.2,effect:'bounce-miracle',effectText:'奇跡を弾く'}),
  defense('sky-gauntlet','スカイガントレット',3,{price:5,rate:.2,effect:'bounce-miracle',effectText:'奇跡を弾く'}),
  defense('moon-armor','月光のよろい',12,{price:10,rate:.2,effect:'reflect-miracle',effectText:'奇跡をはね返す'}),
  defense('god-shield','神の盾',30,{price:30,rate:.2}),
  defense('rainbow-curtain','虹のカーテン',0,{price:15,rate:.6,effect:'remove-element',effectText:'攻撃の属性を取り除く'}),
  defense('super-mirror','スーパーミラー',0,{price:10,rate:.2,effect:'reflect-all',effectText:'何でもはね返す'}),

  // ── 奇跡 ────────────────────────────────────────────────
  // 「+攻」は通常/追加武器と一緒にも、単独でも使える攻撃加算奇跡。
  miracle('m-fireball','＜火の玉＞',2,'miracle-add',{atk:2,rate:.2,element:'fire',miracleMode:'add',stars:1,effectText:'+攻2'}),
  miracle('m-smoke','＜煙＞',4,'miracle-attack',{atk:5,hit:.75,rate:.2,element:'fire',miracleMode:'attack',effectText:'75%攻5'}),
  miracle('m-flame','＜炎＞',5,'miracle-attack',{atk:10,hit:1,rate:.2,element:'fire',miracleMode:'attack',effectText:'攻10'}),
  miracle('m-magma','＜マグマ＞',10,'miracle-attack',{atk:15,hit:.75,rate:.2,element:'fire',miracleMode:'attack',effectText:'75%攻15'}),
  miracle('m-ice','＜氷＞',2,'miracle-attack',{atk:4,hit:1,rate:.2,element:'water',miracleMode:'attack',effectText:'攻4'}),
  miracle('m-avalanche','＜雪崩＞',6,'miracle-attack',{atk:8,hit:.75,rate:.2,element:'water',miracleMode:'attack',effectText:'75%攻8'}),
  miracle('m-waterfall','＜滝＞',12,'miracle-attack',{atk:25,hit:1,rate:.2,element:'water',miracleMode:'attack',effectText:'攻25'}),
  miracle('m-tree','＜大木＞',3,'miracle-attack',{atk:6,hit:1,rate:.2,element:'wood',miracleMode:'attack',effectText:'攻6'}),
  miracle('m-rock','＜岩＞',4,'miracle-attack',{atk:8,hit:1,rate:.2,element:'earth',miracleMode:'attack',effectText:'攻8'}),
  miracle('m-mudslide','＜土石流＞',6,'miracle-attack',{atk:12,hit:.5,rate:.2,element:'earth',miracleMode:'attack',effectText:'50%攻12'}),
  // Wikiの「天」は通常6属性表には無いので、防御属性上は無属性として扱う。
  miracle('m-absorb','＜吸収＞',10,'miracle-attack',{atk:10,hit:1,rate:.2,element:'none',miracleMode:'attack',attackEffect:'drain',effectText:'攻10・HP吸収'}),
  miracle('m-dark','＜闇＞',5,'miracle-attack',{atk:5,hit:1,rate:.2,element:'dark',miracleMode:'attack',effectText:'攻5'}),
  miracle('m-wind','＜風＞',6,'cold',{rate:.2,miracleMode:'status',effectText:'風邪'}),
  miracle('m-fog','＜霧＞',3,'fog',{rate:.2,element:'water',miracleMode:'status',effectText:'霧'}),
  miracle('m-dream','＜夢＞',6,'slump',{rate:.2,element:'wood',miracleMode:'status',effectText:'スランプ（夢の置換仕様）'}),
  miracle('m-cloud','＜暗雲＞',5,'dark-cloud',{rate:.2,element:'dark',miracleMode:'status',effectText:'暗雲'}),
  miracle('m-tone','＜音色＞',2,'cure-minor',{rate:.2,miracleMode:'self',effectText:'風邪・熱病・霧・閃光を消す'}),
  miracle('m-song','＜歌声＞',5,'cure-all',{rate:.2,miracleMode:'self',effectText:'全ての災いを消す'}),
  miracle('m-spring','＜泉＞',7,'heal10',{rate:.2,miracleMode:'self',effectText:'+HP10'}),
  miracle('m-treasure','＜財宝＞',5,'money10',{rate:.2,miracleMode:'self',effectText:'+¥10'}),

  // ── 雑貨 / 取引 ────────────────────────────────────────
  utility('smile-drop','スマイルのしずく','heal5',{price:1,rate:2.4,effectText:'+HP5'}),
  utility('heart-drop','ハートのしずく','heal10',{price:3,rate:1.6,effectText:'+HP10'}),
  utility('romance-water','ロマンスウォーター','heal15',{price:5,rate:.8,effectText:'+HP15'}),
  utility('milky-water','天の川のおいしい水','heal20',{price:20,rate:.2,effectText:'+HP20'}),
  utility('smile-flower','スマイルの花','mp5',{price:1,rate:2.4,effectText:'+MP5'}),
  utility('heart-flower','ハートの花','mp10',{price:3,rate:1.6,effectText:'+MP10'}),
  utility('romance-wood','ロマンスの香木','mp15',{price:5,rate:.8,effectText:'+MP15'}),
  utility('smile-shell','スマイルの貝がら','cure-minor',{price:5,rate:2.4,effectText:'風邪・熱病・霧・閃光を払う'}),
  utility('heart-shell','ハートの貝がら','cure-all',{price:15,rate:1.2,effectText:'全ての災いを払う'}),
  utility('broom','夜空のホウキ','discard3',{price:10,rate:.2,effectText:'無作為に神器3つを掃き飛ばす'}),
  utility('soap','女神の石けん','forget2',{price:10,rate:.2,effectText:'無作為に習得奇跡2つを忘れさせる'}),
  utility('sun-charm','太陽のお守り','revive10',{price:10,rate:.2,auto:true,effectText:'HP0になったとき+HP10'}),
  utility('exchange','両替','exchange',{price:5,rate:4.0,effectText:'HP・MP・¥を1:1で再配分'}),
  utility('sell','売る','sell',{price:5,rate:4.0,effectText:'所持神器1つを相手に売る'}),
  utility('buy','買う','buy',{price:5,rate:4.0,effectText:'相手の神器を無作為に1つ選び購入'}),

  // ── 学歴召喚独自 ──────────────────────────────────────
  {id:'f-rank-doom',name:'お前Ｆランやないか',kind:'special',atk:0,def:0,element:'none',price:15,effect:'frank',effectText:'全員★0・誤答即死',hit:1,stars:0,hits:1,rate:.2,weight:1},
  {id:'review-card',name:'復習カード',kind:'special',atk:0,def:0,element:'none',price:10,effect:'review',effectText:'直前問題・誤答25',hit:1,stars:0,hits:1,rate:.2,weight:1},
]);

export const CARD = Object.freeze(Object.fromEntries(CARDS.map(c=>[c.id,c])));

const TRADE_EFFECTS = new Set(['exchange','sell','buy']);

export function cardQuestionStars(card){
  if(!card)return null;
  if(card.kind==='weapon')return Math.max(1,Math.min(5,card.stars??1));
  if(card.kind==='add')return Math.max(0,Math.min(5,card.stars??1));
  if(card.kind==='global')return globalQuestionStars(card.hit);
  if(card.kind==='miracle'&&card.miracleMode==='add')return Math.max(0,Math.min(5,card.stars??1));
  if(card.kind==='miracle'&&card.miracleMode==='attack')return probabilityQuestionStars(card.hit);
  if(card.kind==='special'&&card.effect==='frank')return 0;
  return null;
}

export function cardQuestionLabel(card){
  const stars=cardQuestionStars(card);
  if(stars===null)return '';
  if(card?.kind==='add'||(card?.kind==='miracle'&&card.miracleMode==='add')){
    return `問題+★${stars}`;
  }
  return `問題★${stars}`;
}

const CARD_POOLS = Object.freeze({
  trade:Object.freeze(CARDS.filter(c=>c.kind==='utility'&&TRADE_EFFECTS.has(c.effect))),
  single:Object.freeze(CARDS.filter(c=>c.kind==='weapon'||c.kind==='add')),
  global:Object.freeze(CARDS.filter(c=>c.kind==='global')),
  defense:Object.freeze(CARDS.filter(c=>c.kind==='defense')),
  miracle:Object.freeze(CARDS.filter(c=>c.kind==='miracle')),
  misc:Object.freeze(CARDS.filter(c=>(c.kind==='utility'&&!TRADE_EFFECTS.has(c.effect))||c.kind==='special')),
});
const weightedPick=(pool,rng)=>{
  if(!pool.length)return undefined;
  const total=pool.reduce((n,c)=>n+(c.weight||1),0);
  let r=rng()*total;
  for(const c of pool){r-=c.weight||1;if(r<0)return c.id}
  return pool[pool.length-1].id;
};

export function drawArtifact(rng=Math.random){
  const pools=CARD_POOLS;
  const r=rng()*GF.DECK_TOTAL;
  let n=GF.DISTRIBUTION.trade;
  if(r<n)return weightedPick(pools.trade,rng);
  n+=GF.DISTRIBUTION.single;if(r<n)return weightedPick(pools.single,rng);
  n+=GF.DISTRIBUTION.global;if(r<n)return weightedPick(pools.global,rng);
  n+=GF.DISTRIBUTION.defense;if(r<n)return weightedPick(pools.defense,rng);
  n+=GF.DISTRIBUTION.miracle;if(r<n)return weightedPick(pools.miracle,rng);
  return weightedPick(pools.misc,rng);
}

// 学歴召喚独自: 本家の確率攻撃を問題難易度へ変換。
export function probabilityQuestionStars(hit){
  if(hit>=1)return 1;       // 本家100%攻は通常の攻撃問題（最易）
  if(hit>=.75)return 4;
  if(hit>=.5)return 3;
  return 2;
}
export function globalQuestionStars(hit){
  // 既存の全体攻撃ルール: 25→★2, 50→★3, 75→★4
  return hit>=1?5:hit>=.75?4:hit>=.5?3:2;
}
export function attackQuestionStars({base=1,slump=false,bonusCards=[]}={}){
  return Math.max(1,Math.min(5,base+(slump?1:0)+bonusCards.reduce((n,id)=>n+(CARD[id]?.stars||0),0)));
}
export function makeGFQuestion(stars,seed,forced=null){
  return makeGodFieldQuestion(stars,seed,forced);
}

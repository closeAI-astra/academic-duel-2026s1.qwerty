import { CARDS as MORI_CARDS, randomFloat } from './data.js';

// Stable order matches the illustration atlases, independent of the Japanese card numbers.
const schools=[
 ['東京大学','The University of Tokyo'],['京都大学','Kyoto University'],['大阪大学','The University of Osaka'],['東北大学','Tohoku University'],['名古屋大学','Nagoya University'],['九州大学','Kyushu University'],['北海道大学','Hokkaido University'],['一橋大学','Hitotsubashi University'],
 ['筑波大学','University of Tsukuba'],['神戸大学','Kobe University'],['早稲田大学','Waseda University'],['慶應義塾大学','Keio University'],['横浜国立大学','Yokohama National University'],['千葉大学','Chiba University'],['広島大学','Hiroshima University'],['東京理科大学','Tokyo University of Science'],
 ['上智大学','Sophia University'],['東京外国語大学','Tokyo University of Foreign Studies'],['岡山大学','Okayama University'],['金沢大学','Kanazawa University'],['同志社大学','Doshisha University'],['明治大学','Meiji University'],['立教大学','Rikkyo University'],['青山学院大学','Aoyama Gakuin University'],
 ['立命館大学','Ritsumeikan University'],['熊本大学','Kumamoto University'],['新潟大学','Niigata University'],['法政大学','Hosei University'],['中央大学','Chuo University'],['関西大学','Kansai University'],['関西学院大学','Kwansei Gakuin University'],['信州大学','Shinshu University'],
 ['静岡大学','Shizuoka University'],['近畿大学','Kindai University'],['東洋大学','Toyo University'],['日本大学','Nihon University'],['駒澤大学','Komazawa University'],['京都産業大学','Kyoto Sangyo University'],['甲南大学','Konan University'],['龍谷大学','Ryukoku University'],
 ['愛媛大学','Ehime University'],['高知大学','Kochi University'],['専修大学','Senshu University'],['東海大学','Tokai University'],['神奈川大学','Kanagawa University'],['福岡大学','Fukuoka University'],
];
export const ENGLISH_CARDS=schools.map(([japaneseName,name],i)=>{
 const source=MORI_CARDS.find(c=>c.name===japaneseName&&c.type==='university'&&c.edition!=='photo');
 return {id:`en-${source.id}`,pool:'crystal',type:'university',name,japaneseName,rank:source.rank,number:58+i,title:'CAMPUS COLLECTION',image:`./assets/crystal-campus-${Math.floor(i/8)+1}.webp`,sprite:{columns:4,rows:2,column:i%4,row:Math.floor((i%8)/4)},flavor:'大学のキャンパスや街の雰囲気から着想した創作イラスト。実際の校舎の正確な再現ではありません。'};
});
const people=[
 {key:'boley',name:'ボーリー',title:'Golden Coast',cost:2},
 {key:'duo',name:'ボーリー ＆ keigo',title:'Two Stars, One Horizon',cost:4},
 {key:'keigo',name:'東北大学の神童keigo',title:'Pacific Prodigy',cost:2},
];
const character=(person,high,index)=>({id:`uc-${person.key}-${high?'hall':'rare'}`,pool:'crystal',type:'character',edition:high?'hall':'photo',rank:high?'S':'B',number:104+index+(high?3:0),name:person.name,japaneseName:'カルフォルニア大学',university:'University of California',title:person.title,image:`./assets/crystal-${person.key}-tiers.webp`,sprite:{columns:2,rows:1,column:high?1:0,row:0},cost:high?person.cost:undefined,motion:high&&person.key==='duo',flavor:high?'水晶で交換する殿堂レア。人物の所属・学歴は架空のゲーム設定です。':'パックから出現する通常写真レア。人物の所属・学歴は架空のゲーム設定です。'});
export const PHOTO_CARDS=people.map((p,i)=>character(p,false,i));
export const UCLA_EXCHANGE_CARD={id:'ucla-hall',pool:'crystal',type:'university',edition:'hall',rank:'S',number:110,name:'UCLA',japaneseName:'カリフォルニア大学ロサンゼルス校',university:'University of California, Los Angeles',title:'WESTWOOD SCHOLAR',image:'./assets/crystal-campus-1.webp',sprite:{columns:4,rows:2,column:0,row:0},cost:2,motion:false,flavor:'水晶2個で交換できるUCLAの殿堂レア。既存のキャンパス系カードデザインを再利用したゲーム内創作カードです。'};
export const EXCHANGE_CARDS=[...people.map((p,i)=>character(p,true,i)),UCLA_EXCHANGE_CARD];
export const PACK_CARDS=[...ENGLISH_CARDS,...PHOTO_CARDS,...EXCHANGE_CARDS];
export const PACK_CARD_BY_ID=Object.fromEntries(PACK_CARDS.map(c=>[c.id,c]));
export const CRYSTAL={id:'crystal',type:'currency',name:'水晶',image:'./assets/crystal.webp'};
export const PACK_POOL=[...ENGLISH_CARDS,...PHOTO_CARDS,CRYSTAL];
export const PACK_ITEM_BY_ID=Object.fromEntries(PACK_POOL.map(c=>[c.id,c]));
export const PACK_SIZE=5;
export const PACK_RATE=100/PACK_POOL.length;
export const PACK_CHARGE_CAP=20;
export const PACK_RECHARGE_MS=5*60*1000;
export const emptyPackState=()=>({owned:{},crystals:0,packs:0,exchanges:0,pending:null,charges:PACK_CHARGE_CAP,rechargeAt:null});

export function recoverPackCharges(state,now=Date.now()) {
 if(state.charges>=PACK_CHARGE_CAP||now<state.rechargeAt)return state;
 const gained=1+Math.floor((now-state.rechargeAt)/PACK_RECHARGE_MS);
 const charges=Math.min(PACK_CHARGE_CAP,state.charges+gained);
 return {...state,charges,rechargeAt:charges===PACK_CHARGE_CAP?null:state.rechargeAt+gained*PACK_RECHARGE_MS};
}

export function restorePackState(saved,now=Date.now()) {
 const state=emptyPackState();
 if(!saved||typeof saved!=='object')return state;
 for(const [id,count]of Object.entries(saved.owned??{}))if(PACK_CARD_BY_ID[id]&&Number.isSafeInteger(count)&&count>0)state.owned[id]=count;
 for(const key of ['crystals','packs','exchanges'])if(Number.isSafeInteger(saved[key])&&saved[key]>=0)state[key]=saved[key];
 const p=saved.pending;
 if(p&&Array.isArray(p.items)&&p.items.length===PACK_SIZE&&p.items.every(id=>PACK_ITEM_BY_ID[id])&&Number.isInteger(p.index)&&p.index>=0&&p.index<PACK_SIZE)state.pending={items:[...p.items],index:p.index};
 if(Number.isInteger(saved.charges)&&saved.charges>=0&&saved.charges<=PACK_CHARGE_CAP)state.charges=saved.charges;
 if(state.charges<PACK_CHARGE_CAP)state.rechargeAt=Number.isSafeInteger(saved.rechargeAt)&&saved.rechargeAt>0?saved.rechargeAt:now+PACK_RECHARGE_MS;
 return recoverPackCharges(state,now);
}

// A tear commits the whole pack once. Reopening a pending pack never draws again.
export function commitPack(state,random=randomFloat,now=Date.now()) {
 if(state.pending)return state;
 state=recoverPackCharges(state,now);
 if(state.charges===0)return state;
 const next={...state,owned:{...state.owned},packs:state.packs+1,charges:state.charges-1,rechargeAt:state.charges===PACK_CHARGE_CAP?now+PACK_RECHARGE_MS:state.rechargeAt};
 const items=Array.from({length:PACK_SIZE},()=>PACK_POOL[Math.min(PACK_POOL.length-1,Math.floor(random()*PACK_POOL.length))].id);
 for(const id of items){if(id===CRYSTAL.id)next.crystals++;else next.owned[id]=(next.owned[id]||0)+1;}
 next.pending={items,index:0};
 return next;
}
export function advancePack(state){
 if(!state.pending)return state;
 return {...state,pending:state.pending.index===PACK_SIZE-1?null:{...state.pending,index:state.pending.index+1}};
}
export function finishPack(state){return state.pending?{...state,pending:null}:state;}
export function redeemCrystal(state,id){
 const card=EXCHANGE_CARDS.find(c=>c.id===id);
 if(!card||state.pending||state.crystals<card.cost)return null;
 return {...state,owned:{...state.owned,[id]:(state.owned[id]||0)+1},crystals:state.crystals-card.cost,exchanges:state.exchanges+1};
}

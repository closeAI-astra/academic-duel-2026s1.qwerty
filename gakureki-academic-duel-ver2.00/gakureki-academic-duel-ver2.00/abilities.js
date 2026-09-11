// University themes inspire fictional game effects, not educational ratings.
const profiles = {
  '東京大学':['総合知と赤門','赤門・知の集束','burst','知の蓄積'],
  '京都大学':['自由な学風','自由探究・常識突破','pierce','独創のひらめき'],
  '大阪大学':['適塾につながる学び','適塾・生命の連環','drain','実学の系譜','https://www.osaka-u.ac.jp/ja/guide/about/tekijuku'],
  '東北大学':['研究第一','研究第一・超臨界','burst','研究の積み重ね'],
  '名古屋大学':['青色LED研究','蒼光・LEDバースト','combo','発光する知性','https://www.nagoya-u.ac.jp/info/press/ledieee_milestone.html'],
  '九州大学':['水素エネルギー研究','水素炉・未来点火','burst','次世代エネルギー','https://sustainable.hydrogenius.kyushu-u.ac.jp/'],
  '北海道大学':['農学と北の大地','大地の収穫祭','heal','開拓の芽吹き'],
  '一橋大学':['社会科学','市場解析・最適解','pierce','戦略の構築'],
  '筑波大学':['体育・スポーツ科学','躍動・アスリートラッシュ','combo','身体と知の連携'],
  '神戸大学':['海事科学','海路開拓・大航海','guard','航路の守り'],
  '早稲田大学':['学問の独立','独立の雄弁','burst','探究の熱量'],
  '慶應義塾大学':['独立自尊','自尊の双翼','pierce','自ら考える力'],
  '横浜国立大学':['実践的な学び','実践・都市構築','guard','現場の知恵','https://www.ynu.ac.jp/about/ynu/idea/'],
  '千葉大学':['園芸の学び','翠庭・百花再生','heal','園芸の息吹'],
  '広島大学':['平和を希求する学び','平和のプロテクション','guard','対話の礎'],
  '東京理科大学':['理学と実力主義','理論実証・方程式斬','pierce','検証の積み重ね'],
  '上智大学':['国際的な学び','世界をつなぐ祈り','heal','異文化の共鳴'],
  '東京外国語大学':['多言語・地域研究','多言語詠唱・世界連撃','combo','ことばの架け橋'],
  '岡山大学':['持続可能な社会への学び','持続のグリーンリング','heal','循環の知','https://sdgs.okayama-u.ac.jp/'],
  '金沢大学':['歴史ある文化都市の学び','加賀・知の工房','guard','文化の継承'],
  '同志社大学':['良心教育','良心の結界','guard','良心の灯','https://www.doshisha.ac.jp/information/educational_ideal/index.html'],
  '明治大学':['権利自由・独立自治','自由の紫紺砲','burst','自治の意志'],
  '立教大学':['リベラルアーツ','リベラル・アンサンブル','combo','視野の交差'],
  '青山学院大学':['駅伝のチームワーク','青山・襷の連撃','combo','つながる襷'],
  '立命館大学':['平和と民主主義','平和のガーディアン','guard','清新の守り','https://www.ritsumei.ac.jp/acd/re/k-rsc/rcs/japanese/message.html'],
  '熊本大学':['薬学の学び','薬学錬成・再生の雫','heal','薬草の知識'],
  '新潟大学':['日本酒学の文理融合','発酵・知の醸成','drain','熟成する知','https://sake.niigata-u.ac.jp/'],
  '法政大学':['自由と進歩','進歩のフロンティア','burst','自由な発想'],
  '中央大学':['法学の学び','六法・論理貫通','pierce','論理の積み重ね'],
  '関西大学':['学の実化','学の実化・実践解放','burst','学理と実際','https://www.kansai-u.ac.jp/ja/about/philosophy/'],
  '関西学院大学':['Mastery for Service','奉仕のセイクリッド','heal','世界への奉仕','https://www.kwansei.ac.jp/en/about/mission.html'],
  '信州大学':['繊維の学び','繊維装甲・絹の盾','guard','しなやかな繊維'],
  '静岡大学':['工学とものづくり','創造工学・機巧砲','burst','試作のひらめき'],
  '近畿大学':['クロマグロの完全養殖','完全養殖・マグロ召喚','heal','養殖サイクル','https://www.kindai.ac.jp/rd/research-center/aqua-research/aquaculture/tuna/'],
  '東洋大学':['哲学の学び','哲学問答・本質看破','pierce','深く考える力'],
  '日本大学':['多分野を有する総合大学','総合知・多彩な連携','combo','学びの多様性'],
  '駒澤大学':['禅の精神','禅定・静寂の一撃','drain','静かな集中'],
  '京都産業大学':['一拠点総合大学','一拠点・クロスコンボ','combo','学部をつなぐ力','https://www.kyoto-su.ac.jp/'],
  '甲南大学':['人物教育と個性の尊重','人物教育・才能開花','drain','個性の輝き','https://www.konan-u.ac.jp/english/center/center/'],
  '龍谷大学':['共生の理念','共生・いのちの環','heal','ともいきの力','https://www.ryukoku.ac.jp/2020/ryukoku_cs/policy/'],
  '愛媛大学':['柑橘の研究','柑橘・サンシャイン','heal','実りの循環','https://www.agr.ehime-u.ac.jp/ciic/'],
  '高知大学':['海洋の学び','黒潮・オーシャンドライブ','combo','潮流のリズム'],
  '専修大学':['経済の学び','経済解析・機会の一撃','pierce','取引の洞察'],
  '東海大学':['海洋学の学び','深海・ブルーシールド','guard','海の探究'],
  '神奈川大学':['港町に根ざす学び','港の風・未来航路','combo','交流の追い風'],
  '福岡大学':['多分野を有する総合大学','七隈・知の融合','burst','学びの交差点'],
};
export const STYLES = {
  burst:{role:'アタッカー',hp:1,atk:1.12,def:1,passive:'戦闘中、攻撃力が12%上昇。',effect:'攻撃力の220%で攻撃。',},
  pierce:{role:'ブレイカー',hp:1,atk:1.05,def:.95,passive:'戦闘中、防御力が20%上昇。',effect:'敵の防御を無視し、攻撃力の180%のダメージ。'},
  combo:{role:'連撃アタッカー',hp:.95,atk:1.05,def:1,passive:'3ターンごとの攻撃ダメージが35%上昇。',effect:'攻撃力の90%の攻撃を3回繰り出す。'},
  guard:{role:'ガーディアン',hp:1.15,atk:.9,def:1.3,passive:'開始時、最大HPの20%のシールドを獲得。',effect:'攻撃力の120%で攻撃し、最大HPの30%のシールドを追加。'},
  heal:{role:'ヒーラー',hp:1.05,atk:.95,def:1.05,passive:'自分の行動後、最大HPの5%を回復。',effect:'最大HPの30%を回復し、攻撃力の130%で攻撃。'},
  drain:{role:'バランサー',hp:1.1,atk:1,def:1.1,passive:'戦闘中、防御力が20%上昇。',effect:'攻撃力の180%で攻撃し、与ダメージの50%を回復。'},
};
const moriMoves = ['天上・学歴大崩壊','魔導書・無限引用','蒼穹・ランク看破','書庫・知識吸収','旅学・巻物連打','見習い・追試突破','一頁目の大逆転'];
const moriStyles = ['burst','guard','pierce','drain','combo','heal','pierce'];
export function abilityFor(card) {
  const i = 'SABCDEF'.indexOf(card.rank);
  const p = card.id==='fukushima-kim-collab' ? ['赤いシャツと架空のキャンパス特別講義','赤シャツ・単位消滅弾','burst','衝撃の出席確認'] : card.id==='mori-osaka-grad' ? ['果てしない探究が開く叡智の神域','叡智解放・無限証明','burst','神域の探究者'] : card.id==='limited-highschool' ? ['空白から始まる新たな物語','ゼロ単位・リスタート','burst','逆境の闘志'] : card.id==='uni-s-3'&&card.edition==='limited' ? ['適塾につながる学びと終わらない探究','再履修・無限輪講','drain','巻き戻る探究心','https://www.osaka-u.ac.jp/ja/guide/about/tekijuku'] : card.type === 'mori' ? ['七つの姿を持つ学問の探究者',moriMoves[i],moriStyles[i],'亡者の執念'] : profiles[card.name];
  if(!p) throw new Error(`Missing university profile: ${card.name}`);
  return {motif:p[0],name:card.edition==='photo'?`極・${p[1]}`:p[1],style:p[2],passiveName:p[3],source:p[4],...STYLES[p[2]]};
}
export function limitLevel(count=0) {
  return [2,3,4,5].filter(threshold=>count>=threshold).length;
}
export function statsFor(card,count=0) {
  const a=abilityFor(card), level=limitLevel(count);
  const scale=(1+(6-'SABCDEF'.indexOf(card.rank))*.06)*(1+level*.08)*(card.edition?1.12:1);
  return {hp:Math.round(680*a.hp*scale),atk:Math.round(105*a.atk*scale),def:Math.round(34*a.def*scale),level};
}
export function newBattle(card,count=0) {
  const stats=statsFor(card,count), ability=abilityFor(card);
  return {card,stats,ability,hp:stats.hp,shield:ability.style==='guard'?Math.round(stats.hp*.2):0,enemyHp:950,enemyMax:950,turn:0,cooldown:0,finished:false,log:['単位の番人が現れた！ 通常攻撃と固有技で挑もう。']};
}
// Deterministic, local practice battles. No card is consumed; all displayed effects execute here.
export function battleTurn(battle,action) {
  if(battle.finished || !['attack','skill'].includes(action) || (action==='skill'&&battle.cooldown>0)) return battle;
  const b={...battle,log:[]}, {stats,ability}=b, style=ability.style;
  b.turn++;
  const skill=action==='skill';
  const attack=stats.atk*(style==='burst'?1.12:1);
  const critical=style==='combo'&&b.turn%3===0?1.35:1;
  const power=skill?({burst:2.2,pierce:1.8,combo:.9,guard:1.2,heal:1.3,drain:1.8}[style]):1;
  const hits=skill&&style==='combo'?3:1;
  const damage=Math.round(Math.max(1,attack*power-(skill&&style==='pierce'?0:28))*critical)*hits;
  const dealt=Math.min(b.enemyHp,damage);
  b.enemyHp=Math.max(0,b.enemyHp-damage);
  b.log.push(`${skill?ability.name:'通常攻撃'}！ ${hits>1?'3連撃・':''}${damage}ダメージ${critical>1?'（共鳴ボーナス）':''}。`);
  const heal=amount=>{const actual=Math.min(stats.hp-b.hp,Math.round(amount));b.hp+=actual;if(actual)b.log.push(`HPを${actual}回復。`);};
  if(skill&&style==='heal') heal(stats.hp*.3);
  if(skill&&style==='drain') heal(dealt*.5);
  if(skill&&style==='guard') {const shield=Math.round(stats.hp*.3);b.shield+=shield;b.log.push(`シールドを${shield}追加。`);}
  if(style==='heal') heal(stats.hp*.05);
  b.cooldown=skill?2:Math.max(0,b.cooldown-1);
  if(b.enemyHp===0){b.finished=true;b.log.push(`単位獲得！ ${b.turn}ターンで勝利。`);return b;}
  const defense=stats.def*(['pierce','drain'].includes(style)?1.2:1);
  const incoming=Math.max(1,Math.round((b.turn%3===0?175:110)-defense));
  const blocked=Math.min(b.shield,incoming);b.shield-=blocked;
  b.hp=Math.max(0,b.hp-(incoming-blocked));
  b.log.push(`${b.turn%3===0?'番人の抜き打ちテスト':'番人の反撃'}！ ${incoming-blocked}ダメージ${blocked?`・盾で${blocked}軽減`:''}。`);
  if(b.hp===0){b.finished=true;b.log.push('今回は追試！ 限界突破や技のタイミングを変えて再挑戦しよう。');}
  return b;
}
export const COLLECTIONS = [
  {name:'関関同立コレクター',names:['関西大学','関西学院大学','同志社大学','立命館大学']},
  {name:'産近甲龍コレクター',names:['京都産業大学','近畿大学','甲南大学','龍谷大学']},
];

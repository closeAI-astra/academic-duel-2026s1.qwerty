// GodField-mode-only English question bank.
// ★0 is intentionally kept easy for 「お前Fランやないか」.
// ★1–★5 assume a player already has the vocabulary base needed for
// highly selective Japanese university entrance exams.
// ★5 is capped around practical TOEIC L&R ~860 vocabulary rather than
// drifting into rare literary / specialist C1-C2 vocabulary.

export const GF_QUESTION_SET_ID = 'GF-TOEIC860-2026-S1';

export const GF_DIFFICULTY_LABELS = Object.freeze({
  0: '中学基礎（Fラン特殊用）',
  1: '旧帝大合格レベル・標準',
  2: '旧帝大上位〜TOEIC 700前後',
  3: 'TOEIC 730〜780前後',
  4: 'TOEIC 780〜830前後',
  5: 'TOEIC 830〜860前後',
});

export const GF_QUESTION_BANK = Object.freeze({
  0: Object.freeze([
    ['apple','りんご'],['book','本'],['school','学校'],['friend','友達'],['water','水'],['morning','朝'],
    ['happy','うれしい'],['study','勉強する'],['teacher','先生'],['music','音楽'],['family','家族'],['important','重要な'],
    ['window','窓'],['garden','庭'],['station','駅'],['picture','絵・写真'],['question','質問'],['answer','答え'],
    ['different','異なる'],['beautiful','美しい'],['remember','覚えている'],['practice','練習する'],['finish','終える'],['together','一緒に']
  ]),

  // 旧帝大入試に合格できる語彙力を「最低ライン」として想定。
  1: Object.freeze([
    ['acknowledge','認める'],['adequate','十分な'],['anticipate','予期する'],['attribute','～に原因を帰する'],
    ['compelling','説得力のある'],['constitute','構成する'],['conventional','従来の'],['derive','導き出す'],
    ['diminish','減少させる'],['diverse','多様な'],['emerge','現れる'],['equivalent','同等の'],
    ['explicit','明示的な'],['fundamental','根本的な'],['impose','課す'],['inevitable','避けられない'],
    ['infer','推論する'],['interpret','解釈する'],['notion','概念'],['perspective','観点'],
    ['plausible','もっともらしい'],['preliminary','予備的な'],['prominent','著名な・目立つ'],['reluctant','気が進まない'],
    ['retain','保持する'],['rigorous','厳密な'],['substantial','かなりの'],['sustain','維持する'],
    ['undergo','経験する'],['valid','妥当な'],['virtually','事実上'],['undermine','損なう'],
    ['subsequent','その後の'],['relevant','関連のある'],['advocate','提唱する'],['coherent','一貫した']
  ]),

  2: Object.freeze([
    ['accommodate','対応する・収容する'],['allocate','配分する'],['authorize','許可する'],['compensate','補償する'],
    ['consecutive','連続した'],['constraint','制約'],['eligible','資格がある'],['facilitate','促進する'],
    ['implement','実施する'],['incentive','奨励策'],['mandatory','義務的な'],['negotiate','交渉する'],
    ['prospective','見込みの'],['renovation','改装'],['revenue','収益'],['subsidiary','子会社'],
    ['tentative','暫定的な'],['warranty','保証'],['inventory','在庫'],['itinerary','旅程'],
    ['premises','施設・敷地'],['promptly','速やかに'],['quotation','見積もり'],['reimburse','払い戻す'],
    ['shipment','出荷'],['vendor','業者・販売業者'],['overdue','期限を過ぎた'],['designated','指定された'],
    ['appraisal','査定・評価'],['audit','監査'],['notify','通知する'],['occupancy','入居率・占有率'],
    ['attain','達成する'],['compile','まとめる'],['deduct','差し引く'],['lease','賃貸借する']
  ]),

  3: Object.freeze([
    ['amend','修正する'],['consolidate','統合する'],['contingency','不測の事態'],['disclose','開示する'],
    ['endorsement','承認・推薦'],['exempt','免除された'],['fluctuate','変動する'],['infringe','侵害する'],
    ['interim','暫定の'],['liaison','連絡・連携'],['merger','合併'],['outsource','外注する'],
    ['procurement','調達'],['proprietary','独自所有の'],['rectify','是正する'],['redeem','引き換える'],
    ['rescind','取り消す'],['solicit','求める'],['streamline','効率化する'],['surplus','余剰'],
    ['unanimous','全会一致の'],['viable','実行可能な'],['incur','負う'],['designate','指名する'],
    ['replenish','補充する'],['comparable','比較できる'],['confidential','機密の'],['foreseeable','予見可能な'],
    ['obligation','義務'],['respective','それぞれの'],['suspension','停止・一時中止'],['turnover','売上高・回転率'],
    ['diversify','多角化する'],['affiliation','提携関係'],['benchmark','基準'],['comprehensive','包括的な']
  ]),

  4: Object.freeze([
    ['adverse','不利な'],['arbitration','仲裁'],['concession','譲歩'],['depreciation','減価償却'],
    ['deteriorate','悪化する'],['discretion','裁量'],['feasible','実行可能な'],['inadvertently','うっかり・意図せず'],
    ['liability','責任・負債'],['lucrative','収益性の高い'],['municipal','地方自治体の'],['precedent','前例'],
    ['prerequisite','前提条件'],['recur','再発する'],['remittance','送金'],['scrutinize','精査する'],
    ['stipulate','規定する'],['subsidize','補助金を出す'],['surcharge','追加料金'],['tenure','在職期間'],
    ['unprecedented','前例のない'],['withhold','差し控える'],['deliberation','審議'],['diligent','勤勉な'],
    ['defer','延期する'],['entail','伴う'],['expenditure','支出'],['forthcoming','近日中の'],
    ['incidental','付随的な'],['pertinent','関連性のある'],['provisional','暫定的な'],['retention','維持・定着'],
    ['resilient','回復力のある'],['statutory','法定の'],['waiver','権利放棄・免除'],['withdrawal','撤回・引き出し']
  ]),

  // 最難関でもTOEIC 860前後を上限にし、極端な文学語・専門語は避ける。
  5: Object.freeze([
    ['accrue','蓄積する'],['alleviate','緩和する'],['applicable','適用可能な'],['arbitrary','恣意的な'],
    ['concurrent','同時進行の'],['counterpart','対応する相手・同等物'],['detrimental','有害な'],['disbursement','支出・支払い'],
    ['expedite','迅速化する'],['indispensable','不可欠な'],['insolvent','支払不能の'],['leverage','活用する'],
    ['mitigate','軽減する'],['noncompliance','不遵守'],['obsolescence','陳腐化'],['preclude','妨げる'],
    ['reimbursement','払い戻し'],['remuneration','報酬'],['solvency','支払能力'],['stringent','厳格な'],
    ['substantiate','裏付ける'],['discrepancy','食い違い'],['incumbent','現職の・現任の'],['reconcile','調整して一致させる'],
    ['compliance','遵守'],['procure','調達する'],['conformity','適合・一致'],['delegation','委任'],
    ['exemption','免除'],['restructure','再編する'],['revocation','取り消し'],['subsidiary','子会社の・子会社'],
    ['consecutive','連続した'],['mandatory','義務的な'],['prospective','見込みの'],['contingent','条件付きの']
  ])
});

function seededShuffle(items, seed) {
  const out = [...items];
  let x = (seed >>> 0) || 0x9e3779b9;
  const random = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normalizeStars(stars) {
  return Math.max(0, Math.min(5, Number.isFinite(stars) ? Math.trunc(stars) : 1));
}

export function makeGodFieldQuestion(stars, seed, forced = null) {
  const level = normalizeStars(stars);
  const bank = GF_QUESTION_BANK[level];
  const pair = forced || bank[(seed >>> 0) % bank.length];
  if (!pair) throw new Error(`GodField question bank is empty for level ${level}`);

  const nearbyLevels = [...new Set([Math.max(0, level - 1), level, Math.min(5, level + 1)])];
  const distractorPool = [...new Set(
    nearbyLevels.flatMap(key => GF_QUESTION_BANK[key].map(entry => entry[1]))
      .filter(meaning => meaning !== pair[1])
  )];
  const distractors = seededShuffle(distractorPool, seed ^ 0xa55a).slice(0, 7);
  if (distractors.length < 7) throw new Error(`Not enough distractors for level ${level}`);

  const choices = seededShuffle([pair[1], ...distractors], seed ^ 0x5aa5);
  return {
    id: `${GF_QUESTION_SET_ID}:${level}:${pair[0]}`,
    word: pair[0],
    meaning: pair[1],
    choices,
    correct: choices.indexOf(pair[1]),
    stars: level,
  };
}

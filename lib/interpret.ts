// lib/interpret.ts
type Analysis = { categories: string[]; sentiment: number; intensity: number };

const dict: Record<string, string> = {
  "落ちる,転落,落下,滑り落ち": "falling",
  "歯,歯が抜ける,歯抜け,虫歯": "teeth",
  "追いかけられる,追跡,逃げる": "chase",
  "飛ぶ,空,飛行": "flying",
  "水,海,川,溺れる,波": "water",
  "試験,テスト,試験勉強,受験": "exam",
  "遅刻,遅れる": "late",
  "動物,猫,犬,蛇,鳥": "animals",
  "赤ちゃん,子ども,出産": "baby",
  "死,葬式,亡くなる": "death",
  "裸,服がない": "naked",
  "家,鍵,ドア,部屋": "home"
};

const negWords = ["怖","不安","落ち","怒","悲","泣","迷","溺","逃","死","失敗","遅刻","壊"];
const posWords = ["嬉","自由","飛","きれい","安心","助","成功","笑","穏やか"];

const templates = {
  opening: [
    "この夢は{catJP}の象徴が強く表れています。",
    "今回の夢の核には{catJP}のテーマが見えます。",
    "夢全体を貫くモチーフは{catJP}です。"
  ],
  symbol: [
    "{catJP}は、現実での{symbolHint}を暗示しやすい題材です。",
    "しばしば{catJP}は{symbolHint}と結びつきます。",
    "{catJP}はあなたの無意識が{symbolHint}を整理しようとする表れです。"
  ],
  psyche: [
    "感情面では{affect}傾向。{tone}ため、心の安全地帯を再確認すると整います。",
    "{tone}空気感があり、内面では{affect}状態。少し立ち止まって呼吸を整えると◎。",
    "無意識は{affect}サインを出しています。{tone}ので、自己批判を弱めるのが鍵です。"
  ],
  action: [
    "小さな行動としては{action1}→{action2}を今週どこかで試すと噛み合います。",
    "現実対処として{action1}、加えて{action2}。1つでOK、両方でもOKです。",
    "まず{action1}、余裕があれば{action2}も。5〜10分で充分です。"
  ],
  shortInput: [
    "もうすこし場面や気持ちを足すと、より的確に読めますが、現時点では{fallback}。",
    "描写が短めなので概略になりますが、{fallback}。"
  ]
};

const catHints: Record<string, { jp: string; hint: string[] }> = {
  falling: { jp: "落下",   hint: ["コントロール感の低下","足場の不安","変化への戸惑い"] },
  teeth:   { jp: "歯",     hint: ["自己表現や自信の揺らぎ","外見・印象の気がかり"] },
  chase:   { jp: "追跡",   hint: ["プレッシャー","締切や責任からの逃避衝動"] },
  flying:  { jp: "飛行",   hint: ["解放感","成長欲求","視点の拡張"] },
  water:   { jp: "水",     hint: ["感情のうねり","浄化・リセット欲求"] },
  exam:    { jp: "試験",   hint: ["評価不安","準備不足への懸念"] },
  late:    { jp: "遅刻",   hint: ["機会損失への恐れ","段取りの見直しサイン"] },
  animals: { jp: "動物",   hint: ["本能・直感","守りたいもの"] },
  baby:    { jp: "赤ちゃん", hint: ["新しい可能性","繊細な計画の育成"] },
  death:   { jp: "死",     hint: ["終わりと始まりの転換","手放しの時期"] },
  naked:   { jp: "裸",     hint: ["脆さの露呈","正直でいたい欲求"] },
  home:    { jp: "家/鍵",  hint: ["安心基地の調整","境界線（バウンダリー）の設計"] }
};

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let x = seed || 123456789;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1_000_000) / 1_000_000; };
}
function pick<T>(arr: T[], r: () => number): T { return arr[Math.floor(r() * arr.length)]; }

function analyze(text: string): Analysis {
  const t = text.trim();
  let cats: { key: string; score: number }[] = [];
  for (const keysCSV in dict) {
    const key = dict[keysCSV];
    const keys = keysCSV.split(",");
    let score = 0; for (const k of keys) if (t.includes(k)) score += Math.max(1, Math.floor(k.length / 2));
    if (score > 0) cats.push({ key, score });
  }
  cats.sort((a,b)=>b.score-a.score);
  const categories = cats.slice(0, 2).map(x => x.key);
  let s = 0; for (const w of negWords) if (t.includes(w)) s--; for (const w of posWords) if (t.includes(w)) s++;
  s = Math.max(-2, Math.min(2, s));
  const ex = (t.match(/[!?！？]/g) || []).length;
  const len = Math.min(1, t.length / 120);
  const intensity = Math.min(1, 0.2 + ex * 0.15 + len * 0.7);
  return { categories, sentiment: s, intensity };
}
function sentimentText(s: number){ if (s<=-2) return "不安・緊張が強まりやすい"; if (s===-1) return "やや慎重モード"; if (s===0) return "フラット"; if (s===1) return "前向きで柔らかい"; return "高揚感が芽生えている"; }
function toneText(s:number,i:number){ if (s<=-1 && i>0.6) return "刺激が強めになりがちな"; if (s<=-1) return "少し負荷がかかる"; if (s>=1 && i>0.6) return "勢いがつきやすい"; return "静かなゆらぎを含む"; }
function actionsFor(cat: string, r:()=>number):[string,string]{
  const bank: Record<string,string[]> = {
    generic:["3分の深呼吸＋肩回し","睡眠前のメモ書き（気になる事を3つ）","朝の白湯／常温水を一杯","5分のストレッチ","ToDoを3つだけ箇条書き"],
    falling:["足裏ほぐし","スケジュールを“午前1件だけ”に圧縮する日を作る"],
    teeth:["口元のストレッチ","翌日の会話で“結論→理由”の順に話す練習"],
    chase:["締切を“最小一歩”に分解","タイマー15分の集中→5分休憩"],
    flying:["散歩で空を見上げる","週内に新しい道を一本だけ歩く"],
    water:["コップ一杯の水から始める","湯舟/シャワーで肩に当てて5呼吸"],
    exam:["30分だけ準備の“型づくり”","失点パターンを書き出す"],
    late:["アラームを“準備着手時刻”に設定","余白ブロックをカレンダーに入れる"],
    animals:["直感で選ぶ買い物を一つ","自然の写真を壁紙に"],
    baby:["小さいアイデアを1行メモ","“保護したいもの”を1つ丁寧に扱う"],
    death:["古いメモを3つ捨てる","“終わらせること”を1つ決める"],
    naked:["安心できる服を1着キメ打ち","“言いにくい一言”を丁寧に書く"],
    home:["鍵・財布の定位置を1か所決める","寝床の整え（枕・シーツ確認）"]
  };
  const list = bank[cat as keyof typeof bank] || bank.generic;
  const a1 = pick(list, r); let a2 = pick(list, r); if (a2===a1) a2 = pick(bank.generic, r);
  return [a1,a2];
}

export function interpretDream(text: string): string {
  const t = (text || "").trim();
  if (!t) return "短い入力だと読みが粗くなります。1〜2行でも場面や気持ちを足すと、ぐっと精度が上がります。";
  const r = rng(hashSeed(t));
  const a = analyze(t);
  const cat = a.categories[0] || "generic";
  const catInfo = (catHints as any)[cat]; const catJP = catInfo ? catInfo.jp : "基礎的なテーマ";
  const symbolHint = catInfo ? (catInfo.hint[(Math.floor(r()*catInfo.hint.length))]) : "最近の出来事の整理";
  const affect = sentimentText(a.sentiment); const tone = toneText(a.sentiment, a.intensity);
  const [action1, action2] = actionsFor(cat, r);
  const pickT = (arr:string[]) => arr[Math.floor(r()*arr.length)];
  const open = pickT(templates.opening).replace("{catJP}", catJP);
  const sym  = pickT(templates.symbol).replace("{catJP}", catJP).replace("{symbolHint}", symbolHint);
  const psy  = pickT(templates.psyche).replace("{affect}", affect).replace("{tone}", tone);
  const act  = pickT(templates.action).replace("{action1}", action1).replace("{action2}", action2);
  const fallback = pickT(templates.shortInput).replace("{fallback}", `${catJP}の象徴と${affect}流れがメインです`);
  const tooShort = t.length < 12;
  return [open, sym, psy, act, tooShort ? fallback : ""].filter(Boolean).join("\n");
}

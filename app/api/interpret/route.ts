// app/api/interpret/route.ts
export const runtime = "edge"; // 無くてもOK。ある場合は高速応答

type Analysis = {
  mood: string[];      // 感情推定
  topics: string[];    // トピック推定
  people: string[];    // 人物推定
  tension: "低" | "中" | "高";
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return json({ error: "text is required" }, 400);

    const a = analyze(text);
    const result = renderInterpretation(text, a);

    return json({ result });
  } catch (e: any) {
    return json({ error: String(e?.message || e || "unexpected") }, 500);
  }
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---- ここからルールベース実装（外部APIなし）----
function analyze(t: string): Analysis {
  const s = normalize(t);

  const moodDict: Record<string, string> = {
    "不安|こわ|怖|心配|緊張|焦り|焦っ": "不安",
    "悲し|泣|寂し|喪失|つら": "悲しみ",
    "怒|腹立|苛立|いらだ": "怒り",
    "罪悪|申し訳|後悔|反省": "罪悪感",
    "喜|嬉し|楽しかっ|安心": "喜び",
    "疲れ|しんど|だる": "疲労",
  };

  const topicDict: Record<string, string> = {
    "遅刻|締切|試験|テスト|面接|課題": "プレッシャー/評価",
    "追いか|追わ|逃げ": "逃避/プレッシャー",
    "落ち|転落|崖|高所": "コントロール喪失",
    "迷子|迷い|道に迷": "進路の迷い",
    "海|波|川|水|溺": "感情の波",
    "電車|駅|新幹線|バス|飛行機": "移行/変化",
    "家|実家|部屋": "安心/原点",
    "仕事|上司|会議|メール|納期": "仕事ストレス",
    "学校|先生|授業|成績": "学習/成長不安",
  };

  const peopleDict: Record<string, string> = {
    "母|お母|母親": "母",
    "父|お父|父親": "父",
    "友|友人|同級|先輩|後輩": "友人",
    "上司|同僚|部長|マネ": "職場の人",
    "恋人|彼氏|彼女|妻|夫|嫁|旦那": "パートナー",
    "子|娘|息子|赤ちゃん": "子ども",
  };

  const found = (dict: Record<string, string>) =>
    Object.entries(dict)
      .filter(([re]) => new RegExp(re).test(s))
      .map(([, label]) => label);

  const mood = unique(found(moodDict));
  const topics = unique(found(topicDict));
  const people = unique(found(peopleDict));

  // 緊張度を簡易スコアリング
  const hi = count(s, /(追いか|落ち|遅刻|溺|怒|泣|不安|怖)/g);
  const mid = count(s, /(迷|締切|会議|上司|駅|波)/g);
  const score = hi * 2 + mid;
  const tension: Analysis["tension"] = score >= 3 ? "高" : score >= 1 ? "中" : "低";

  return { mood, topics, people, tension };
}

function renderInterpretation(text: string, a: Analysis): string {
  const moodTxt = a.mood.length ? `【感情】${a.mood.join("・")}` : "【感情】手がかり少";
  const topicTxt = a.topics.length ? `【テーマ】${a.topics.join("・")}` : "【テーマ】未特定";
  const peopleTxt = a.people.length ? `【登場人物】${a.people.join("・")}` : "【登場人物】記載なし";

  const guess = (() => {
    if (a.topics.includes("仕事ストレス")) {
      return "仕事上の責任や評価への不安が、眠っている間に形を変えて表れた可能性があります。";
    }
    if (a.topics.includes("プレッシャー/評価")) {
      return "評価や締切に対するプレッシャーが背景にあるかもしれません。";
    }
    if (a.topics.includes("逃避/プレッシャー")) {
      return "抱えている課題から距離を取りたい気持ちが示唆されます。";
    }
    if (a.topics.includes("感情の波")) {
      return "感情の揺れが大きく、コントロール感を取り戻したいサインかも。";
    }
    if (a.people.includes("母")) {
      return "『安心したい／見守られたい』というニーズが強まっている可能性があります。";
    }
    return "最近の出来事や不安・期待が混ざって、心の整理をしているサインかもしれません。";
  })();

  const step = (() => {
    const steps: string[] = [];
    steps.push("深呼吸×3で体感を落ち着け、気になる場面を30秒だけ書き出す。");
    if (a.people.includes("母")) steps.push("安心できる相手に近況を1件だけメッセージする。");
    if (a.topics.includes("仕事ストレス")) steps.push("今日やるタスクを『いま/今日/今週』の3段で1項目ずつだけ決める。");
    if (a.topics.includes("プレッシャー/評価")) steps.push("締切が近い作業を5分タイマーで着手し“開始だけ”達成する。");
    if (steps.length < 2) steps.push("就寝前にスマホを10分置いて、湯飲み1杯の水を飲む。");
    return "・" + steps.slice(0, 2).join("\n・");
  })();

  const tone =
    a.tension === "高"
      ? "緊張度はやや高め。まずは“体を落ち着ける”→“小さく動く”の順で。"
      : a.tension === "中"
      ? "適度な緊張。小さな一歩で手触りを作ると流れが戻ります。"
      : "落ち着いた状態。思考の整理に向いています。";

  return [
    `【要約】最近の夢：${summ(text)}`,
    moodTxt,
    topicTxt,
    peopleTxt,
    "",
    "【解釈】" + guess,
    `【今の状態】${tone}`,
    "【明日できる一歩】\n" + step,
  ].join("\n");
}

// ---- 小道具 ----
function normalize(t: string) {
  return t.replace(/\s+/g, "").toLowerCase();
}
function count(t: string, re: RegExp) {
  const m = t.match(re);
  return m ? m.length : 0;
}
function unique<T>(arr: T[]) {
  return [...new Set(arr)];
}
function summ(t: string) {
  const s = t.trim().replace(/\s+/g, " ");
  return s.length > 30 ? s.slice(0, 30) + "…" : s;
}

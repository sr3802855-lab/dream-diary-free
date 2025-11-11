// app/api/interpret/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 念のためキャッシュ無効

// ---- フォールバックの簡易解釈（libが無くても動く） ----
function simpleInterpret(text: string): string {
  const t = (text || "").trim();
  if (!t) return "短い入力だと読みが粗くなります。1〜2行でも場面や気持ちを足すと精度が上がります。";
  const has = (w: string) => t.includes(w);
  const cats: string[] = [];
  if (has("落") || has("転落")) cats.push("落下");
  if (has("歯")) cats.push("歯");
  if (has("追") || has("逃")) cats.push("追跡");
  if (has("飛")) cats.push("飛行");
  if (has("水") || has("海") || has("溺")) cats.push("水");
  if (has("試験") || has("テスト")) cats.push("試験");
  if (has("遅刻")) cats.push("遅刻");
  if (has("家") || has("鍵") || has("部屋")) cats.push("家/鍵");
  const cat = cats[0] || "基礎的なテーマ";
  const neg = /(怖|不安|怒|悲|泣|失敗)/.test(t);
  const pos = /(嬉|安心|成功|笑)/.test(t);
  const affect = neg ? "やや慎重モード" : pos ? "前向き" : "フラット";
  const actions: Record<string, string[]> = {
    "落下": ["足裏ほぐし", "予定を1件だけに絞る日を作る"],
    "歯": ["口元ストレッチ", "“結論→理由”で話す練習"],
    "追跡": ["タスクを最小一歩に分解", "15分集中→5分休憩"],
    "飛行": ["空を見上げて散歩", "新しい道を一本歩く"],
    "水": ["白湯/常温水を一杯", "シャワーで肩に当てて5呼吸"],
    "試験": ["30分だけ型づくり", "失点パターンを書き出す"],
    "遅刻": ["準備着手のアラーム設定", "カレンダーに余白ブロック"],
    "家/鍵": ["鍵・財布の定位置を決める", "寝具の整え"],
    "基礎的なテーマ": ["深呼吸3分", "ToDoを3つだけ箇条書き"]
  };
  const a = actions[cat] || actions["基礎的なテーマ"];
  return [
    `この夢は「${cat}」のモチーフがにじんでいます。`,
    `感情面は${affect}。自己批判を弱めて心の安全地帯を確認すると整います。`,
    `現実では ${a[0]}／余裕があれば ${a[1]} を。5〜10分でOKです。`
  ].join("\n");
}

// ---- lib/interpret.ts があれば優先使用 ----
async function getInterpreter(): Promise<(t: string) => string> {
  try {
    const mod = await import("../../../lib/interpret"); // 相対パス
    if (typeof (mod as any).interpretDream === "function") {
      return (mod as any).interpretDream as (t: string) => string;
    }
    console.error("interpretDream not found, fallback to simple.");
    return simpleInterpret;
  } catch (e) {
    console.error("import ../../../lib/interpret failed:", e);
    return simpleInterpret;
  }
}

// ---- ハンドラ ----
export async function POST(req: Request) {
  try {
    let body: any = null;
    try { body = await req.json(); } catch { body = null; }
    const text = typeof body?.text === "string" ? body.text : String(body?.text ?? "");
    const interpret = await getInterpreter();
    const reply = interpret(text);

    // ★ フロント互換のために両方返す（result と reply）
    return NextResponse.json({ ok: true, result: reply, reply });
  } catch (e: any) {
    const msg = e?.message ? String(e.message).slice(0, 120) : "unknown error";
    // 失敗時でも result と reply を返す（フロントがどちらを見ても表示できる）
    const fallback = `うまく解析できませんでした。（internal: ${msg}）`;
    return NextResponse.json({ ok: false, result: fallback, reply: fallback }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

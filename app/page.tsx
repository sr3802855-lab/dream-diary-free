// app/page.tsx
"use client";
import { useEffect, useState } from "react";

const DAILY_LIMIT = 1000000; // 表示用の見かけ上の上限（実際の制限はしない）

const todayKey = () => "ddfree:count:" + new Date().toISOString().slice(0, 10);

export default function Page() {
  const [dream, setDream] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [used, setUsed] = useState(0);
  const [remaining, setRemaining] = useState(DAILY_LIMIT);

  // 今日の使用回数を表示用に読み込む（入力はブロックしない）
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(todayKey()) || "0");
      setUsed(v);
      setRemaining(Math.max(0, DAILY_LIMIT - v));
    } catch {}
  }, []);

  async function analyze() {
    if (!dream.trim()) return;
    setLoading(true);
    setReply("");
    try {
      const r = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: dream }),
      });
      const data = await r.json();
      // API が reply/result のどちらを返しても表示できるように
      setReply(data.reply || data.result || "解析に失敗しました。");

      // 表示用カウンター（実際の制限はしない）
      const next = used + 1;
      try { localStorage.setItem(todayKey(), String(next)); } catch {}
      setUsed(next);
      setRemaining(Math.max(0, DAILY_LIMIT - next));
    } catch {
      setReply("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "radial-gradient(60% 80% at 50% 20%, #0b1324 0%, #0a0f1c 50%, #070b14 100%)",
      color: "#e6eefb",
      padding: "24px"
    }}>
      <section style={{
        width: "min(720px, 92vw)",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 8px 28px rgba(0,0,0,0.35)"
      }}>
        <h1 style={{ fontSize: "20px", margin: "0 0 8px" }}>夢占い（無料お試し）</h1>
        <p style={{ margin: "0 0 16px", opacity: 0.85 }}>
          本日はあと <b>{remaining}</b> 回解釈できます。
        </p>

        <textarea
          value={dream}
          onChange={(e) => setDream(e.target.value)}
          disabled={loading} // ← 残回数では無効化しない
          maxLength={1200}
          placeholder="夢の内容をできるだけ具体的に書いてください（例：友達の◯◯さんが優しそうな表情で… など）"
          style={{
            width: "100%",
            minHeight: "180px",
            padding: "14px 16px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(10,14,22,0.6)",
            color: "#e6eefb",
            outline: "none",
            resize: "vertical",
            marginBottom: "12px"
          }}
        />

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={analyze}
            disabled={loading || !dream.trim()} // ← 実際の制限はしない
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: loading ? "rgba(255,255,255,0.16)" : "rgba(86,140,255,0.22)",
              color: "#e6eefb",
              cursor: loading || !dream.trim() ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "解析中..." : "無料で解析する"}
          </button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>0/1200</span>
        </div>

        {reply && (
          <div style={{
            marginTop: "16px",
            padding: "14px 16px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "12px",
            whiteSpace: "pre-wrap",
            lineHeight: 1.7
          }}>
            {reply}
          </div>
        )}

        <p style={{ marginTop: 16, fontSize: 12, opacity: 0.65 }}>
          ※本サービスは娯楽・セルフリフレクション目的です。医療的診断ではありません。個人情報や特定個人を識別できる内容は書かないでください。
        </p>
      </section>
    </main>
  );
}

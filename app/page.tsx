"use client";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

const DAILY_LIMIT = 2;
const todayKey = () => `used-${new Date().toISOString().slice(0, 10)}`;

export default function Home() {useEffect(() => { localStorage.clear(); }, []);
  const [dream, setDream] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(DAILY_LIMIT);

  useEffect(() => {
    const used = Number(localStorage.getItem(todayKey()) || "0");
    setLeft(Math.max(DAILY_LIMIT - used, 0));
  }, []);

  async function analyze() {
    if (!dream.trim() || loading || left <= 0) return;
    setLoading(true);
    setReply("");

    try {
      const r = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: dream }),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }

      const ct = r.headers.get("content-type") || "";
      let j: any = null;
      if (ct.includes("application/json")) {
        try {
          j = await r.json();
        } catch {}
      }
      if (!j) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `Invalid response`);
      }

      setReply(j.result || "うまく解析できませんでした。");
      const key = todayKey();
      const used = Number(localStorage.getItem(key) || "0") + 1;
      localStorage.setItem(key, String(used));
      setLeft(Math.max(DAILY_LIMIT - used, 0));
    } catch (err: any) {
      setReply("エラーが発生しました: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>夢占い（無料お試し）</h1>
          <p className={styles.subtitle}>
            本日はあと <span className={styles.badge}>{left}</span> 回解釈できます。
          </p>
        </header>

        <textarea
          className={styles.textarea}
          placeholder="夢の内容をできるだけ具体的に書いてください（例：友達のお母さんが悲しそうな顔をしていた など）"
          maxLength={1200}
          value={dream}
          onChange={(e) => setDream(e.target.value)}
        />

        <div className={styles.actions}>
          <button
            className={styles.button}
            onClick={analyze}
            disabled={loading || left <= 0 || !dream.trim()}
            aria-busy={loading}
          >
            {loading ? "解析中…" : "無料で解析する"}
          </button>
          <span className={styles.counter}>{dream.length}/1200</span>
        </div>

        {reply && (
          <div className={styles.result}>
            {reply.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        <p className={styles.disclaimer}>
          ※本サービスは娯楽・セルフリフレクション目的です。医療的診断ではありません。<br />
          ※個人情報や特定個人を識別できる内容は書かないでください。
        </p>
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import { GoogleGenAI } from "@google/genai";

const CATEGORIES = [
  { key: "summary", label: "サマリー", icon: "📝", desc: "エグゼクティブサマリー" },
  { key: "competitor", label: "競合・理美容", icon: "✂️", desc: "理美容室・バーバー・低価格サロン" },
  { key: "traffic", label: "集客施設", icon: "🏬", desc: "商業施設・スーパー・百貨店・駅" },
  { key: "newdev", label: "新規開業・再開発", icon: "🏗️", desc: "新施設・再開発計画・開業予定" },
  { key: "office", label: "オフィス・企業", icon: "🏢", desc: "オフィスビル・企業集積" },
  { key: "residential", label: "住宅・人口", icon: "🏠", desc: "マンション・住宅開発・人口動態" },
  { key: "transport", label: "交通・動線", icon: "🚃", desc: "駅乗降客数・バス路線・人流" },
];

function parseMarkdown(text: string) {
  if (!text) return "";
  const lines = text.split("\n");
  let html = "";
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h4 style="margin:14px 0 6px;font-size:14px;font-weight:700;color:var(--accent)">${trimmed.slice(4)}</h4>`;
    } else if (trimmed.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3 style="margin:18px 0 8px;font-size:16px;font-weight:700;color:var(--fg)">${trimmed.slice(3)}</h3>`;
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { html += '<ul style="margin:4px 0;padding-left:20px">'; inList = true; }
      let content = trimmed.slice(2);
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html += `<li style="margin:3px 0;line-height:1.6">${content}</li>`;
    } else if (trimmed === "") {
      if (inList) { html += "</ul>"; inList = false; }
      html += "<br/>";
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      let content = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html += `<p style="margin:4px 0;line-height:1.7">${content}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

export default function App() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [copying, setCopying] = useState(false);

  const loadingMessages = [
    "周辺施設を調査中...",
    "競合店舗を分析中...",
    "新規開発情報を収集中...",
    "交通・人流データを確認中...",
    "マーケティング情報を整理中...",
    "レポートを作成中...",
  ];

  async function handleSearch() {
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);

    let msgIndex = 0;
    setLoadingMsg(loadingMessages[0]);
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[msgIndex]);
    }, 3500);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `あなたはQB HOUSE（QBハウス）の店舗開発・営業企画リサーチャーです。
以下の住所周辺について、Web検索で得られた事実情報のみに基づいてレポートを作成してください。

ターゲット物件として、商業施設だけでなく、スーパーマーケットや百貨店（デパート）など、QBハウスがテナントとして入居可能な施設も積極的に調査・報告してください。

【調査対象住所】${address.trim()}

━━━━━━━━━━━━━━━━━━━━━━━━━
【最重要ルール：ハルシネーション厳禁】
━━━━━━━━━━━━━━━━━━━━━━━━━
1. Web検索結果に記載されている情報だけを書くこと。検索結果に無い情報は絶対に書かない。
2. 施設名・店舗名は検索結果で確認できたものだけ記載。「〜があると思われる」「〜が存在する可能性」等の推測表現で架空の施設を書かない。
3. 数値（乗降客数、人口等）は出典元が検索結果にある場合のみ記載し、末尾に【出典：○○】と明記する。
4. 検索で情報が得られなかったカテゴリや項目は「⚠️ 該当する検索結果なし」と正直に書く。空欄を埋めるために情報を作らない。
5. 一般論や常識的推測を書く場合は、必ず行頭に「💡一般的傾向：」をつけて、検索事実と明確に区別する。
6. 完全性より正確性を優先する。全てのカテゴリを埋める必要はない。

以下の7カテゴリについて「## カテゴリ名」で区切ってまとめてください。

## エグゼクティブサマリー
このエリアの全体的な評価、QBハウスの出店ポテンシャル、特に注目すべき点（スーパー・百貨店等の出店候補施設や競合状況）の要約。

## 競合・理美容
周辺の理美容室、特にQBハウスの直接的な競合となるヘアカット専門店、格安カット店（HAIR SALON IWASAKI、サンキューカット、イレブンカット等）、個人の低価格カットサロンなどを重点的に調査してください。（検索で確認できた店舗のみ。店名・住所・特徴）

## 集客施設
周辺の商業施設・スーパーマーケット・百貨店（デパート）・大型店舗など、テナント出店候補となり得る施設（検索で確認できた施設のみ）

## 新規開業・再開発
再開発計画、新規オープン情報（商業施設・スーパー等含む）（検索ニュースで確認できたもののみ）

## オフィス・企業
周辺のオフィスビル・企業（検索で確認できたもののみ）

## 住宅・人口
人口データ・住宅開発（公的統計や検索記事で確認できたもののみ）

## 交通・動線
駅の乗降客数・交通情報（鉄道会社公表データなど検索で確認できたもののみ）

【繰り返し】検索結果に無い情報は書かないでください。正確性 > 完全性。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.2,
        }
      });

      const textParts = response.text || "";

      if (!textParts.trim()) {
        throw new Error("結果を取得できませんでした");
      }

      const parsed: any = {};
      const sections = textParts.split(/\n## /);

      const categoryMap: Record<string, string> = {
        "サマリー": "summary",
        "エグゼクティブ": "summary",
        "競合": "competitor",
        "理美容": "competitor",
        "集客": "traffic",
        "商業": "traffic",
        "新規": "newdev",
        "再開発": "newdev",
        "開業": "newdev",
        "オフィス": "office",
        "企業": "office",
        "住宅": "residential",
        "人口": "residential",
        "交通": "transport",
        "動線": "transport",
      };

      for (const section of sections) {
        if (!section.trim()) continue;
        let matched = false;
        for (const [keyword, catKey] of Object.entries(categoryMap)) {
          if (section.includes(keyword) && !parsed[catKey]) {
            const firstNewline = section.indexOf("\n");
            const content = firstNewline > -1 ? section.slice(firstNewline + 1).trim() : section.trim();
            parsed[catKey] = content;
            matched = true;
            break;
          }
        }
        if (!matched && !parsed._intro) {
          parsed._intro = section.trim();
        }
      }

      if (Object.keys(parsed).length <= 1 && !parsed.summary && !parsed.competitor) {
        parsed.summary = textParts;
      }

      setResults(parsed);
      setActiveTab(Object.keys(parsed).find(k => k === "summary") || Object.keys(parsed).find(k => k !== "_intro") || "summary");
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  const styles = {
    root: {
      "--bg": "#0a0f1a",
      "--surface": "#111827",
      "--surface2": "#1a2236",
      "--border": "#1e2d4a",
      "--fg": "#e2e8f0",
      "--fg2": "#94a3b8",
      "--accent": "#38bdf8",
      "--accent2": "#818cf8",
      "--accent-glow": "rgba(56, 189, 248, 0.15)",
      "--danger": "#f87171",
      "--success": "#34d399",
      fontFamily: "'Noto Sans JP', 'SF Pro Display', -apple-system, sans-serif",
      background: "var(--bg)",
      color: "var(--fg)",
      minHeight: "100vh",
      padding: "0",
    } as React.CSSProperties,
    container: {
      maxWidth: 860,
      margin: "0 auto",
      padding: "24px 16px",
    },
    header: {
      textAlign: "center" as const,
      marginBottom: 32,
    },
    title: {
      fontSize: 26,
      fontWeight: 800,
      background: "linear-gradient(135deg, #38bdf8, #818cf8)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      letterSpacing: "-0.5px",
      margin: 0,
    },
    subtitle: {
      color: "var(--fg2)",
      fontSize: 13,
      marginTop: 6,
      letterSpacing: "0.5px",
    },
    searchBox: {
      display: "flex",
      gap: 10,
      marginBottom: 28,
      background: "var(--surface)",
      borderRadius: 14,
      padding: "6px 6px 6px 18px",
      border: "1px solid var(--border)",
      alignItems: "center",
      transition: "border-color 0.2s",
    },
    input: {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      color: "var(--fg)",
      fontSize: 15,
      fontFamily: "inherit",
      padding: "12px 0",
    },
    btn: {
      background: "linear-gradient(135deg, #38bdf8, #818cf8)",
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "12px 24px",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "inherit",
      whiteSpace: "nowrap" as const,
      transition: "opacity 0.2s, transform 0.1s",
    },
    tabs: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap" as const,
      marginBottom: 20,
    },
    tab: (active: boolean) => ({
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 14px",
      borderRadius: 10,
      border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
      background: active ? "var(--accent-glow)" : "var(--surface)",
      color: active ? "var(--accent)" : "var(--fg2)",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: active ? 700 : 500,
      transition: "all 0.2s",
      fontFamily: "inherit",
    }),
    card: {
      background: "var(--surface)",
      borderRadius: 14,
      border: "1px solid var(--border)",
      padding: "24px",
      minHeight: 200,
      lineHeight: 1.7,
      fontSize: 14,
    },
    loadingBox: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
      gap: 20,
    },
    spinner: {
      width: 40,
      height: 40,
      border: "3px solid var(--border)",
      borderTop: "3px solid var(--accent)",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
    errorBox: {
      background: "rgba(248,113,113,0.1)",
      border: "1px solid rgba(248,113,113,0.3)",
      borderRadius: 12,
      padding: "16px 20px",
      color: "var(--danger)",
      fontSize: 14,
    },
    emptyState: {
      textAlign: "center" as const,
      padding: "60px 20px",
      color: "var(--fg2)",
    },
    badge: {
      display: "inline-block",
      background: "var(--accent-glow)",
      color: "var(--accent)",
      fontSize: 11,
      fontWeight: 700,
      padding: "3px 8px",
      borderRadius: 6,
      marginLeft: 8,
    },
    catHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: "1px solid var(--border)",
    },
    catHeaderLeft: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    copyBtn: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "var(--surface2)",
      color: "var(--fg)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "6px 12px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.2s",
      fontFamily: "inherit",
    },
    catIcon: {
      fontSize: 24,
    },
    catTitle: {
      fontSize: 18,
      fontWeight: 700,
      margin: 0,
    },
    catDesc: {
      fontSize: 12,
      color: "var(--fg2)",
      margin: 0,
    },
    historyItem: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      background: "var(--surface2)",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 13,
      color: "var(--fg2)",
      border: "1px solid transparent",
      transition: "all 0.15s",
      fontFamily: "inherit",
      width: "100%",
      textAlign: "left" as const,
    },
  };

  const activeCat = CATEGORIES.find(c => c.key === activeTab);

  const handleCopy = async () => {
    if (!results || !results[activeTab]) return;
    try {
      await navigator.clipboard.writeText(results[activeTab]);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: #475569; }
        button:hover { opacity: 0.9; }
        button:active { transform: scale(0.97); }
        h4 { color: #38bdf8 !important; }
        strong { color: #e2e8f0; }
        ul { list-style-type: "▸ "; }
        li::marker { color: #38bdf8; }
      `}</style>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📍 エリアリサーチ</h1>
          <p style={styles.subtitle}>営業・マーケティング視点の周辺環境分析</p>
        </div>

        <div style={styles.searchBox}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
          <input
            style={styles.input}
            placeholder="住所を入力（例：横浜市戸塚区戸塚町16-1）"
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && handleSearch()}
          />
          <button
            style={{ ...styles.btn, opacity: loading ? 0.5 : 1 }}
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "調査中..." : "調査開始"}
          </button>
        </div>

        {loading && (
          <div style={styles.card}>
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <p style={{ color: "var(--accent)", fontWeight: 600, fontSize: 15 }}>{loadingMsg}</p>
              <p style={{ color: "var(--fg2)", fontSize: 12 }}>Web検索を使用して最新情報を収集しています</p>
            </div>
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>⚠️ {error}</div>
        )}

        {results && !loading && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={styles.tabs}>
              {CATEGORIES.map(cat => {
                const hasData = results[cat.key];
                return (
                  <button
                    key={cat.key}
                    style={styles.tab(activeTab === cat.key)}
                    onClick={() => setActiveTab(cat.key)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {hasData && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />}
                  </button>
                );
              })}
            </div>

            <div style={styles.card}>
              {activeCat && (
                <div style={styles.catHeader}>
                  <div style={styles.catHeaderLeft}>
                    <span style={styles.catIcon}>{activeCat.icon}</span>
                    <div>
                      <h3 style={styles.catTitle}>{activeCat.label}</h3>
                      <p style={styles.catDesc}>{activeCat.desc}</p>
                    </div>
                  </div>
                  {results[activeTab] && (
                    <button 
                      style={{ ...styles.copyBtn, ...(copying ? { background: "var(--success)", color: "#000", border: "1px solid var(--success)" } : {}) }}
                      onClick={handleCopy}
                      title="このカテゴリの内容をコピー"
                    >
                      {copying ? "✓ コピーしました" : "📋 コピー"}
                    </button>
                  )}
                </div>
              )}

              {results[activeTab] ? (
                <div
                  style={{ fontSize: 14, lineHeight: 1.8 }}
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(results[activeTab]) }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--fg2)" }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
                  <p>このカテゴリの情報は取得できませんでした</p>
                </div>
              )}
            </div>

            {results._intro && (
              <div style={{ ...styles.card, marginTop: 16, fontSize: 13, color: "var(--fg2)" }}>
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(results._intro) }} />
              </div>
            )}
          </div>
        )}

        {!results && !loading && !error && (
          <div style={styles.card}>
            <div style={styles.emptyState}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>🗺️</p>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>住所を入力して調査開始</h3>
              <p style={{ fontSize: 13, maxWidth: 400, margin: "0 auto", lineHeight: 1.8 }}>
                対象エリアの競合状況、集客ポテンシャル、再開発動向など<br />
                営業判断に必要な周辺情報をAIがWeb検索で収集・整理します
              </p>

              <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {["横浜市戸塚区戸塚町16-1", "藤沢市藤沢555", "鎌倉市大船1丁目"].map(addr => (
                  <button
                    key={addr}
                    style={styles.historyItem}
                    onClick={() => { setAddress(addr); }}
                  >
                    <span style={{ opacity: 0.5 }}>📌</span> {addr}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

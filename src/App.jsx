import React, { useRef, useState } from "react";
import { useRealtime } from "./hooks/useRealtime";
import { useSessionStore } from "./store/session";
import "./styles.css";

export default function App() {
  const audioRef = useRef(null);
  const [instructions, setInstructions] = useState(
    "You are a friendly, curious AI interviewer. Keep turns short (<=10s) and stop speaking if interrupted."
  );
  const { connect, disconnect, isConnecting, isConnected, error } =
    useRealtime(audioRef);

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="topbar">
        <div className="brand">
          <span className="dot" />
          <h1>Magical Voice Interviewer</h1>
        </div>

        <div className="actions">
          <StatusChip
            status={
              isConnecting ? "connecting" : isConnected ? "online" : "offline"
            }
          />
          {!isConnected ? (
            <button
              className="btn primary"
              onClick={() => connect({ instructions })}
              disabled={isConnecting}
              aria-busy={isConnecting}
            >
              {isConnecting ? "Connecting…" : "Connect & Talk"}
            </button>
          ) : (
            <button className="btn danger" onClick={disconnect}>
              Hang up
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid">
        {/* Left: Settings */}
        <section className="card">
          <h3 className="section-title">Interviewer Settings</h3>
          <label className="label">System Prompt</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={8}
            className="textarea"
            placeholder="Set the tone, rules, and goals for the interviewer…"
          />
          <ul className="tips">
            <li>Keep it warm and curious.</li>
            <li>Ask one question at a time.</li>
            <li>Summarize briefly every few turns.</li>
          </ul>

          {error && <div className="alert">{error}</div>}

          <div className="hint">
            Press <kbd>Space</kbd> to interrupt while the model is speaking.
          </div>
        </section>

        {/* Center: Avatar + Audio */}
        <section className="center-stage">
          <AvatarWave active={isConnected} busy={isConnecting} />
          <audio ref={audioRef} autoPlay playsInline />
          <LiveCaption />
          <LiveUserCaption />
        </section>

        {/* Right: Transcript */}
        <section className="card transcript-card">
          <h3 className="section-title">Transcript</h3>
          <TranscriptPane />
        </section>
      </main>

      <footer className="footer">
        <small>
          Built with <b>React + Vite</b> · Realtime over <b>WebRTC</b> ·
          Delightfully interruptible ✨
        </small>
      </footer>
    </div>
  );
}

/* ————— Components ————— */

function StatusChip({ status = "offline" }) {
  const map = {
    offline: { text: "Offline", cls: "chip gray" },
    connecting: { text: "Connecting", cls: "chip amber" },
    online: { text: "Live", cls: "chip green" },
  };
  const s = map[status];
  return <span className={s.cls}>{s.text}</span>;
}

function NowPlaying({ isConnected, isConnecting }) {
  if (isConnecting) {
    return <div className="nowplaying">Setting up a secure voice channel…</div>;
  }
  if (isConnected) {
    return (
      <div className="nowplaying">
        You’re connected — say something! <span className="blink">●</span>
      </div>
    );
  }
  return <div className="nowplaying muted">Not connected</div>;
}

function AvatarWave({ active, busy }) {
  return (
    <div className={"avatar " + (active ? "live" : "")}>
      <div className="ring r1" />
      <div className="ring r2" />
      <div className="ring r3" />
      {busy && <div className="loader" aria-label="connecting" />}
    </div>
  );
}

function LiveCaption() {
  const captions = useSessionStore((s) => s.captions);
  if (!captions) return null;
  return (
    <div
      style={{
        marginTop: 12,
        padding: "6px 10px",
        borderRadius: 8,
        background: "rgba(0,0,0,.4)",
        display: "inline-block",
      }}
    >
      {captions}
      <span style={{ opacity: 0.6 }}>▌</span>
    </div>
  );
}

function LiveUserCaption() {
  const userCaptions = useSessionStore((s) => s.userCaptions);
  if (!userCaptions) return null;
  return (
    <div
      className="live-caption"
      style={{ background: "rgba(255,255,255,.08)" }}
    >
      {userCaptions}
      <span className="blink">|</span>
    </div>
  );
}

function TranscriptPane() {
  const transcript = useSessionStore((s) => s.transcript);
  if (!transcript.length) {
    return <p className="empty">No conversation yet.</p>;
  }
  return (
    <ul className="list">
      {transcript.map((t, i) => (
        <li key={i} className={"turn " + t.role}>
          <div className="bubble">
            <span className="role">
              {t.role === "assistant" ? "Interviewer" : "You"}
            </span>
            <p>{t.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

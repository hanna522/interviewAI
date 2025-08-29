// src/hooks/useRealtime.js
import { useCallback, useState, useRef } from "react";
import { useSessionStore } from "../store/session";

export function useRealtime(audioRef) {
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const acRef = useRef(null);
  const rafRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const [localLevel, setLocalLevel] = useState(0);
  const [remoteLevel, setRemoteLevel] = useState(0);

  const addTurn = useSessionStore((s) => s.addTurn);
  const addCaptionDelta = useSessionStore((s) => s.addCaptionDelta);
  const commitCaption = useSessionStore((s) => s.commitCaption);
  const resetCaption = useSessionStore((s) => s.resetCaption);

  const addUserCaptionDelta = useSessionStore((s) => s.addUserCaptionDelta);
  const commitUserCaption = useSessionStore((s) => s.commitUserCaption);
  const resetUserCaption = useSessionStore((s) => s.resetUserCaption);

  const setEmotion = useSessionStore((s) => s.setEmotion);

  // ───────────────────────────────────────────
  const MIN_INTERVAL_MS = 2500;
  const MIN_LEN = 12;
  const lastAnalysisRef = useRef({
    user: { t: 0, text: "" },
    assistant: { t: 0, text: "" },
  });

  async function analyzeAndSet(text, speaker) {
    const now = Date.now();
    const slot = lastAnalysisRef.current[speaker];
    if (!text || text.trim().length < MIN_LEN) return;
    if (slot.text === text && now - slot.t < MIN_INTERVAL_MS) return;
    slot.text = text;
    slot.t = now;

    try {
      const r = await fetch("/api/emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const res = await r.json().catch(() => null);
      const label = res?.emotion || "neutral";
      const val = typeof res?.valence === "number" ? res.valence : 0;
      let aro = typeof res?.arousal === "number" ? res.arousal : 0.1;

      const level = speaker === "user" ? localLevel : remoteLevel;
      const blendedArousal = Math.max(0, Math.min(1, 0.6 * aro + 0.4 * level));

      setEmotion({ speaker, label, valence: val, arousal: blendedArousal });
    } catch {
      setEmotion({ speaker, label: "neutral", valence: 0, arousal: 0.15 });
    }
  }
  // ───────────────────────────────────────────

  const waitIce = (pc) =>
    pc.iceGatheringState === "complete"
      ? Promise.resolve()
      : new Promise((resolve) => {
          const onchg = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", onchg);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", onchg);
        });

  function setupMeterFromStream(stream, onLevel) {
    try {
      if (!acRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        acRef.current = new AC();
      }
      const ac = acRef.current;
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      src.connect(analyser);

      const buf = new Float32Array(analyser.fftSize);
      let ema = 0;

      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const lvl = Math.min(1, Math.pow(rms * 3.6, 0.85));
        ema = ema === 0 ? lvl : ema + 0.25 * (lvl - ema);
        onLevel(ema);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn("meter error", e);
    }
  }

  function attachDataChannel(dc) {
    dcRef.current = dc;
    dc.onopen = () => {
      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: { type: "server_vad", silence_duration_ms: 400 },
          },
        })
      );
    };

    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const t = msg?.type;

        if (t === "conversation.item.input_audio_transcription.delta") {
          addUserCaptionDelta(msg.delta);
        }
        if (t === "conversation.item.input_audio_transcription.completed") {
          commitUserCaption(msg.text);
          analyzeAndSet(msg.text, "user"); 
        }

        if (t === "response.audio_transcript.delta") {
          addCaptionDelta(msg.delta);
        }

        if (t === "response.text.delta") {
          addCaptionDelta(msg.delta);
        }

        if (t === "response.text.done") {
          commitCaption(msg.text);
          analyzeAndSet(msg.text, "assistant");
        } else if (t === "response.audio_transcript.done") {
          commitCaption(msg.text);
          // analyzeAndSet(msg.text, "assistant");
        }

        // if (t === "response.done") { ... }
      } catch (err) {
        console.warn("DC parse error", err);
      }
    };
  }

  const safeDisconnect = () => {
    try {
      resetCaption();
      resetUserCaption();

      pcRef.current?.getSenders()?.forEach((s) => s.track && s.track.stop());
      pcRef.current?.close();

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      if (acRef.current) {
        acRef.current.close().catch(() => {});
        acRef.current = null;
      }

      setLocalLevel(0);
      setRemoteLevel(0);
    } catch {}
    pcRef.current = null;
    setIsConnected(false);
  };

  const connect = useCallback(
    async (opts = {}) => {
      setIsConnecting(true);
      setError(null);
      try {
        // 1) 에페머럴 토큰/모델
        const r = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instructions: opts.instructions }),
        });
        if (!r.ok) throw new Error(`Session create failed (${r.status})`);
        const { client_secret, model } = await r.json();
        const token = client_secret?.value;
        if (!token) throw new Error("Missing ephemeral token");
        const url = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(
          model || "gpt-4o-realtime-preview"
        )}`;

        // 2) RTCPeerConnection
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.ondatachannel = (ev) => attachDataChannel(ev.channel);

        const dc = pc.createDataChannel("oai-events");
        attachDataChannel(dc);

        pc.ontrack = (e) => {
          const stream = e.streams[0];
          if (audioRef.current) audioRef.current.srcObject = stream;
          setupMeterFromStream(stream, setRemoteLevel);
        };

        const mic = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mic.getTracks().forEach((t) => pc.addTrack(t, mic));
        setupMeterFromStream(mic, setLocalLevel);

        // 3) SDP 교환
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        await waitIce(pc);

        const sdpResp = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/sdp",
          },
          body: pc.localDescription?.sdp || offer.sdp,
        });
        const text = await sdpResp.text();
        if (!sdpResp.ok || !text.startsWith("v=")) {
          console.error(
            "SDP exchange failed",
            sdpResp.status,
            text.slice(0, 400)
          );
          throw new Error("SDP exchange failed");
        }
        await pc.setRemoteDescription({ type: "answer", sdp: text });

        addTurn({ role: "assistant", text: "Hi! I am your AI interviewer." });
        setIsConnected(true);
      } catch (e) {
        console.error(e);
        setError(e.message || String(e));
        safeDisconnect();
      } finally {
        setIsConnecting(false);
      }
    },
    [audioRef, addTurn]
  );

  const disconnect = useCallback(() => {
    safeDisconnect();
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error,
    localLevel,
    remoteLevel,
  };
}

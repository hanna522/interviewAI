// src/hooks/useRealtime.js
import { useCallback, useState, useRef } from "react";
import { useSessionStore } from "../store/session";

export function useRealtime(audioRef) {
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const addTurn = useSessionStore((s) => s.addTurn);
  const addCaptionDelta = useSessionStore((s) => s.addCaptionDelta);
  const commitCaption = useSessionStore((s) => s.commitCaption);
  const resetCaption = useSessionStore((s) => s.resetCaption);

  const addUserCaptionDelta = useSessionStore((s) => s.addUserCaptionDelta);
  const commitUserCaption = useSessionStore((s) => s.commitUserCaption);
  const resetUserCaption = useSessionStore((s) => s.resetUserCaption);

  // ICE 완료 대기(안정화)
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

  // 데이터채널 핸들러
  function attachDataChannel(dc) {
    dcRef.current = dc;
    dc.onopen = () => {
      dc.send(JSON.stringify({
        type: "session.update",
        session: {
          // whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe 등 사용 가능
          input_audio_transcription: { model: "whisper-1" },
          // (선택) 서버 VAD로 턴 감지 정확도 향상
          turn_detection: { type: "server_vad", silence_duration_ms: 400 }
        }
      }));
    };

    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const t = msg?.type;

        // 내 음성 자막
        if (t === "conversation.item.input_audio_transcription.delta") {
          addUserCaptionDelta(msg.delta);
        }
        if (t === "conversation.item.input_audio_transcription.completed") {
          commitUserCaption(msg.text);
        }
        
        // 1) 모델 음성의 라이브 자막(델타)
        if (t === "response.audio_transcript.delta") {         // 라이브 캡션(한 글자~여러 글자)
          addCaptionDelta(msg.delta);
        }
        if (t === "response.audio_transcript.done") {          // 한 턴의 자막 완료
          commitCaption(msg.text);
        }

        // 2) 텍스트 응답(보이스가 아닌 경우 대비)
        if (t === "response.text.delta") {
          addCaptionDelta(msg.delta);
        }
        if (t === "response.text.done") {
          commitCaption(msg.text);
        }

        // (선택) 응답 끝 알림
        if (t === "response.done") {
          // 필요하면 여기서 상태 전환
        }
      } catch (err) {
        console.warn("DC parse error", err);
      }
    };
  }

  const safeDisconnect = () => {
    try {
      resetCaption();
      pcRef.current?.getSenders()?.forEach((s) => s.track && s.track.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    setIsConnected(false);
  };

  const connect = useCallback(async (opts = {}) => {
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

      // (A) 서버가 datachannel을 "스스로" 열어주는 경우 받기
      pc.ondatachannel = (ev) => {
        // 보통 label은 "oai-events"
        attachDataChannel(ev.channel);
      };

      // (B) 우리가 먼저 채널을 열어도 이벤트 수신 가능
      const dc = pc.createDataChannel("oai-events");
      attachDataChannel(dc);

      // 오디오 수신
      pc.ontrack = (e) => {
        if (audioRef.current) audioRef.current.srcObject = e.streams[0];
      };

      // 마이크 송신
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

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
        console.error("SDP exchange failed", sdpResp.status, text.slice(0, 400));
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
  }, [audioRef, addTurn, addCaptionDelta, commitCaption, resetCaption]);

  const disconnect = useCallback(() => {
    safeDisconnect();
  }, []);

  return { connect, disconnect, isConnected, isConnecting, error };
}

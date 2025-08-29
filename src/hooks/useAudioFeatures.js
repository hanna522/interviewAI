// src/hooks/useAudioFeatures.js
import { useEffect, useRef, useState } from "react";

function ema(prev, next, alpha = 0.2) {
  return prev == null ? next : prev + alpha * (next - prev);
}

function detectPitchACF(buf, sampleRate) {
  // Hanning window + normalize
  const N = buf.length;
  let rms = 0;
  for (let i = 0; i < N; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / N);
  if (rms < 0.01) return { pitch: 0, confidence: 0 }; 

  const MAX_LAG = Math.floor(sampleRate / 80); 
  const MIN_LAG = Math.floor(sampleRate / 400);
  let bestLag = -1,
    bestCorr = 0;

  for (let lag = MIN_LAG; lag <= MAX_LAG; lag++) {
    let corr = 0;
    for (let i = 0; i < N - lag; i++) corr += buf[i] * buf[i + lag];
    corr /= N - lag;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorr < 0.2) return { pitch: 0, confidence: bestCorr };
  const pitch = sampleRate / bestLag;
  return { pitch, confidence: Math.min(1, bestCorr) };
}

/** 스펙트럴 센트로이드(밝기) 추정 */
function spectralCentroid(analyser, sampleRate) {
  const N = analyser.frequencyBinCount;
  const mag = new Float32Array(N);
  analyser.getFloatFrequencyData(mag); // dB
  let num = 0,
    den = 0;
  for (let i = 0; i < N; i++) {
    const f = (i * sampleRate) / (2 * N);
    const amp = Math.pow(10, mag[i] / 20); 
    num += f * amp;
    den += amp;
  }
  if (den === 0) return 0;
  return Math.min(1, num / den / 5000);
}

export function useAudioFeatures({ micStream, remoteStream, receiver }) {
  const [local, setLocal] = useState({ level: 0, pitch: 0, bright: 0 });
  const [remote, setRemote] = useState({ level: 0, pitch: 0, bright: 0 });
  const acRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    acRef.current = ac;

    const createAnalyser = (srcStream) => {
      const src = ac.createMediaStreamSource(srcStream);
      const analyserT = ac.createAnalyser(); // time
      const analyserF = ac.createAnalyser(); // freq
      analyserT.fftSize = 2048;
      analyserF.fftSize = 2048;
      analyserT.smoothingTimeConstant = 0.8;
      analyserF.smoothingTimeConstant = 0.7;
      src.connect(analyserT);
      src.connect(analyserF);
      const timeBuf = new Float32Array(analyserT.fftSize);
      return { analyserT, analyserF, timeBuf };
    };

    const mic = micStream ? createAnalyser(micStream) : null;
    const rem = remoteStream ? createAnalyser(remoteStream) : null;

    let emaLocalLvl = 0,
      emaRemoteLvl = 0;
    let emaLocalPitch = 0,
      emaRemotePitch = 0;
    let emaLocalBright = 0,
      emaRemoteBright = 0;

    const getRtcRemoteLevel = () => {
      if (!receiver?.getSynchronizationSources) return null;
      const arr = receiver.getSynchronizationSources();
      if (!arr || !arr.length) return null;
      const lvl = arr[0].audioLevel; 
      return Math.min(1, Math.max(0, lvl ?? 0));
    };

    const tick = () => {
      if (!mounted) return;

      if (mic) {
        mic.analyserT.getFloatTimeDomainData(mic.timeBuf);
        // RMS
        let sum = 0;
        for (let i = 0; i < mic.timeBuf.length; i++)
          sum += mic.timeBuf[i] * mic.timeBuf[i];
        const rms = Math.sqrt(sum / mic.timeBuf.length);
        const lvl = Math.min(1, Math.pow(rms * 3.8, 0.8));
        // pitch
        const { pitch: p, confidence: conf } = detectPitchACF(
          mic.timeBuf,
          ac.sampleRate
        );
        // bright
        const bright = spectralCentroid(mic.analyserF, ac.sampleRate);

        emaLocalLvl = ema(emaLocalLvl, lvl, 0.25);
        emaLocalPitch = ema(emaLocalPitch, conf > 0.25 ? p : 0, 0.3);
        emaLocalBright = ema(emaLocalBright, bright, 0.2);

        setLocal({
          level: emaLocalLvl,
          pitch: emaLocalPitch,
          bright: emaLocalBright,
        });
      }

      if (rem) {
        const rtcLvl = getRtcRemoteLevel();
        if (rtcLvl != null) {
          emaRemoteLvl = ema(emaRemoteLvl, rtcLvl, 0.25);
        } else {
          rem.analyserT.getFloatTimeDomainData(rem.timeBuf);
          let sum = 0;
          for (let i = 0; i < rem.timeBuf.length; i++)
            sum += rem.timeBuf[i] * rem.timeBuf[i];
          const rms = Math.sqrt(sum / rem.timeBuf.length);
          emaRemoteLvl = ema(
            emaRemoteLvl,
            Math.min(1, Math.pow(rms * 3.2, 0.8)),
            0.25
          );
        }

        const { pitch: p2, confidence: c2 } = detectPitchACF(
          rem.timeBuf,
          ac.sampleRate
        );
        const bright2 = spectralCentroid(rem.analyserF, ac.sampleRate);
        emaRemotePitch = ema(emaRemotePitch, c2 > 0.25 ? p2 : 0, 0.3);
        emaRemoteBright = ema(emaRemoteBright, bright2, 0.2);

        setRemote({
          level: emaRemoteLvl,
          pitch: emaRemotePitch,
          bright: emaRemoteBright,
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      acRef.current?.close?.().catch(() => {});
      acRef.current = null;
    };
  }, [micStream, remoteStream, receiver]);

  return { local, remote };
}

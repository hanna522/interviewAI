// components/AvatarWave.jsx
import React, { useMemo, forwardRef } from "react";
import Box from "@mui/material/Box";

const EMOTION_PALETTE = {
  joy: { h: 150, s: 80, l: 60 },
  neutral: { h: 220, s: 50, l: 55 },
  sad: { h: 215, s: 70, l: 50 },
  angry: { h: 10, s: 85, l: 55 },
  fear: { h: 275, s: 70, l: 60 },
  surprise: { h: 50, s: 85, l: 60 },
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function computeStyle({ emotion = {}, localLevel = 0, remoteLevel = 0 }) {
  const { speaker = null, label = "neutral", arousal = 0.1 } = emotion;
  const base = EMOTION_PALETTE[label] || EMOTION_PALETTE.neutral;

  const pulse = clamp(arousal, 0.05, 0.6);
  const isUser = speaker === "user";
  const localBoost = isUser ? 1 : 0.4;
  const remoteBoost = isUser ? 0.4 : 1;

  return {
    "--emo-h": base.h,
    "--emo-s": `${base.s}%`,
    "--emo-l": `${base.l}%`,
    "--emo-pulse": pulse,
    "--boost-local": localBoost,
    "--boost-remote": remoteBoost,
    "--lvl-local": clamp(localLevel, 0, 1),
    "--lvl-remote": clamp(remoteLevel, 0, 1),
  };
}

const AvatarWave = forwardRef(function AvatarWave(
  {
    active = false,
    busy = false,
    emotion,
    localLevel = 0,
    remoteLevel = 0,
    size = 180, 
    showRings = true,
    className = "",
    sx,
    ...rest 
  },
  ref
) {
  const styleVars = useMemo(
    () => computeStyle({ emotion, localLevel, remoteLevel }),
    [
      emotion?.label,
      emotion?.arousal,
      emotion?.speaker,
      localLevel,
      remoteLevel,
    ]
  );

  return (
    <Box
      ref={ref}
      className={`avatar ${active ? "live" : ""} ${busy ? "connecting" : ""}`}
      sx={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        ...sx,
      }}
      style={styleVars}
      aria-label="Reactive avatar"
      role="img"
      {...rest}
    >
      {showRings && (
        <>
          <div className="ring r1" />
          <div className="ring r2" />
          <div className="ring r3" />
        </>
      )}
      {busy && <div className="loader" aria-label="connecting" />}
    </Box>
  );
});

export default React.memo(AvatarWave);

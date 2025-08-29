// components/CaptionLive.jsx
import React, { useMemo } from "react";
import Box from "@mui/material/Box";

function CaptionLive({
  text,
  role = "assistant", // 'assistant' | 'user'
  caret = "bar", // 'bar' | 'block' | 'none'
  blink = true,
  className = "",
  sx,
  ...rest
}) {
  const caretNode = useMemo(() => {
    if (!text || caret === "none") return null;
    const style = { opacity: caret === "block" ? 0.8 : 0.6 };
    const classNames = blink ? "blink" : undefined;

    if (caret === "block") {
      return (
        <span
          className={classNames}
          style={{
            ...style,
            display: "inline-block",
            marginLeft: 4,
            width: "0.6ch",
            height: "1.1em",
            verticalAlign: "-0.1em",
            background: "currentColor",
            borderRadius: 2,
          }}
        />
      );
    }
    return (
      <span className={classNames} style={{ ...style, marginLeft: 2 }}>
        |
      </span>
    );
  }, [text, caret, blink]);

  if (!text) return null;

  const isUser = role === "user";
  const baseSx = isUser
    ? { bgcolor: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.10)" }
    : { bgcolor: "rgba(0,0,0,.35)", borderColor: "rgba(255,255,255,.07)" };

  return (
    <Box
      className={`live-caption ${className}`}
      sx={{
        mt: 1,
        fontSize: 15,
        maxWidth: { xs: "100%", sm: 720 },
        textAlign: "center",
        px: 1.5,
        py: 1,
        borderRadius: 1.25,
        color: "#fff",
        border: "1px solid",
        boxShadow: "0 6px 18px rgba(0,0,0,.25)",
        ...baseSx,
        ...sx,
      }}
      aria-live="polite"
      {...rest}
    >
      {text}
      {caretNode}
    </Box>
  );
}

export default React.memo(CaptionLive);

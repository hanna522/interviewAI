import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Collapse,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useSessionStore } from "../store/session";

// ---------- Transcript ----------
export function TranscriptCard() {
  const [open, setOpen] = useState(false);
  const transcript = useSessionStore((s) => s.transcript);
  const scrollRef = useRef(null);

  // latest interviewer (assistant) line for preview
  const latestAssistant = useMemo(() => {
    for (let i = transcript.length - 1; i >= 0; i--) {
      const t = transcript[i];
      if (t?.role === "assistant" && t?.text) return { ...t, index: i };
    }
    return null;
  }, [transcript]);

  // auto-scroll to bottom when new item arrives or opened
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: nearBottom ? "smooth" : "auto",
    });
  }, [transcript.length, open]);

  // stable key: prefer t.id; fallback to index
  const items = useMemo(
    () =>
      transcript.map((t, i) => ({
        key: t?.id ?? i,
        role: t?.role === "assistant" ? "assistant" : "user",
        label: t?.role === "assistant" ? "Interviewer" : "You",
        text: String(t?.text ?? ""),
      })),
    [transcript]
  );

  return (
    <Card
      variant="outlined"
      sx={{
        width: "25vw",
        minWidth: 280,
        // --- color tweaks for bubbles ---
        "& .turn.assistant .bubble": {
          backgroundColor: "#16244cb8", // brighter navy
          borderColor: "#223974ff",
          color: "#f7f9ff", // near-white text
        },
        "& .turn.user .bubble": {
          backgroundColor: "#0c1433",
          borderColor: "#243466",
        },
        // latest assistant (when expanded) a bit highlighted
        "& .turn.assistant.latest .bubble": {
          boxShadow: "0 0 0 2px rgba(122,162,255,.25) inset",
        },
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        onClick={() => setOpen((v) => !v)}
        sx={{ cursor: "pointer", px: 2, pt: 1.5, pb: 1 }}
      >
        <Typography
          variant="subtitle2"
          color="text.secondary"
          gutterBottom
          sx={{ mb: 0 }}
        >
          Transcript
        </Typography>
        <IconButton
          size="small"
          aria-label={open ? "Collapse transcript" : "Expand transcript"}
        >
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* Collapsed preview: latest assistant line (1-line, ellipsis) */}
      {!open && latestAssistant && (
        <Box
          sx={{
            px: 2,
            pb: 1.25,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: "#cfd8ff",
              opacity: 0.95,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={latestAssistant.text}
          >
            <strong style={{ marginRight: 6, color: "#e7ecff" }}>
              Interviewer:
            </strong>
            {latestAssistant.text}
          </Typography>
        </Box>
      )}

      {/* Body */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 0 }}>
          <Box
            ref={scrollRef}
            className="transcript-card"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            sx={{
              maxHeight: "60vh",
              overflowY: "auto",
              pr: 0.5, // room for scrollbar
            }}
          >
            {items.length ? (
              <ul className="list">
                {items.map((t, idx) => {
                  const isLatestAssistant =
                    latestAssistant &&
                    t.role === "assistant" &&
                    idx === latestAssistant.index;
                  return (
                    <li
                      key={t.key}
                      className={`turn ${t.role} ${
                        isLatestAssistant ? "latest" : ""
                      }`}
                    >
                      <div className="bubble">
                        <span className="role">{t.label}</span>
                        <p>{t.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                className="empty"
              >
                No conversation yet.
              </Typography>
            )}
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
}

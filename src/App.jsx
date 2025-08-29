// App.jsx
import React, { useRef, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

import { useRealtime } from "./hooks/useRealtime";
import { useSessionStore } from "./store/session";
import "./styles/styles.css";
import SettingsDialog from "./component/SettingsCard";
import { TranscriptCard } from "./component/TranscriptCard";
import AvatarWave from "./component/AvatarWave";
import { theme } from "./styles/MUItheme";
import StatusAppBar from "./component/Navbar";
import CaptionLive from "./component/CaptionLive";
import AppFooter from "./component/Footer";
import TopicCard from "./component/TopicCard";
import TopicDialog from "./component/TopicDialog";

const COMPACT_TEMPLATE = `
You are Interviewer. Speak {{LANG}} only. Focus on {{TOPIC}}.
Rules: one question per turn; ≤10s spoken; stop instantly if interrupted and invite them to continue; ask for concrete examples, metrics, and trade-offs; keep a neutral-positive, concise tone; no solutions/lectures; wait at least 1200ms of silence after the candidate finishes before responding. If the silence is shorter, do not start speaking.
Flow: broad question → specific probes (scope, constraints, options, reasoning, metrics, failures/learned) → one-line summary → next area.
Safety: no sensitive personal data; redirect off-topic to {{TOPIC}}.
Opening: “Could you walk me through a recent project on {{TOPIC}}—problem, your role, key result?”
`

const fill = (tpl, map) =>
  (tpl || "").replace(/\{\{\s*(LANG|TOPIC)\s*\}\}/g, (_, k) => map[k] ?? "");

export default function App() {
  const audioRef = useRef(null);

  const [topic, setTopic] = useState("Recent Project");
  const [language, setLanguage] = useState("English");
  
  const [instructions, setInstructions] = useState(
    fill(COMPACT_TEMPLATE, { LANG: language, TOPIC: topic })
  );

  const [openSetting, setOpenSetting] = useState(false);
  const [openTopicDialog, setOpenTopicDialog] = useState(false);
  
  const {
    connect,
    disconnect,
    isConnecting,
    isConnected,
    error,
    localLevel,
    remoteLevel,
  } = useRealtime(audioRef);

  const emotion = useSessionStore((s) => s.emotion);

  const openSettings = React.useCallback(() => {
    if (typeof document !== "undefined") document.activeElement?.blur();
    setOpenSetting(true);
  }, []);

  const status = isConnecting
    ? "connecting"
    : isConnected
    ? "online"
    : "offline";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <StatusAppBar setOpenSetting={openSettings} />

      <Container maxWidth="xl" sx={{ height: "85vh", py: 3, px: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            width: "100%",
            height: "100%",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Center: Avatar + Audio */}
          <Card
            variant="outlined"
            sx={{
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              maxWidth: "100%",
              minHeight: "50%",
              minWidth: "50%",
              flex: 1,
              maxHeight: "100%",
              background:
                "linear-gradient(180deg, rgba(124,165,255,0.06), transparent 60%)",
            }}
          >
            <CardContent
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <AvatarWave
                active={isConnected}
                busy={isConnecting}
                emotion={emotion}
                localLevel={localLevel}
                remoteLevel={remoteLevel}
              />
              <audio ref={audioRef} autoPlay playsInline />
              {!isConnected ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => connect({ instructions })}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Connecting…" : "Connect & Talk"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={disconnect}
                >
                  Pause
                </Button>
              )}
              <Box sx={{ display: "flex", flexDirection: "column", mt: 1, }}>
                <LiveCaption />
                <LiveUserCaption />
              </Box>
            </CardContent>
          </Card>

          {/* Right: Transcript + Settings (stack) */}
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TopicCard
              topic={topic}
              onChange={() => setOpenTopicDialog(true)}
            />
            <TranscriptCard />
          </Box>
          <SettingsDialog
            open={openSetting}
            onClose={() => setOpenSetting(false)}
            setInstructions={setInstructions}
            error={error}
            defaultTopic={topic}
            defaultLanguage={language}
            onSave={({ topic: t, language: l, instructions: inst }) => {
              setTopic(t);
              setLanguage(l);
              setInstructions(inst);
            }}
          />
          <TopicDialog
            open={openTopicDialog}
            value={topic}
            onClose={() => setOpenTopicDialog(false)}
            onSave={(next) => setTopic(next)}
          />
        </Box>
      </Container>
      <AppFooter />
    </ThemeProvider>
  );
}

function LiveCaption() {
  const captions = useSessionStore((s) => s.captions);
  return <CaptionLive text={captions} role="assistant" caret="bar" blink />;
}

function LiveUserCaption() {
  const userCaptions = useSessionStore((s) => s.userCaptions);
  return <CaptionLive text={userCaptions} role="user" caret="bar" blink />;
}
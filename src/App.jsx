// App.jsx
import React, { useRef, useState, useMemo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
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

export default function App() {
  const audioRef = useRef(null);
  const [instructions, setInstructions] = useState(
    "You are a friendly, curious AI interviewer. Keep turns short (<=10s) and stop speaking if interrupted."
  );
  const {
    connect,
    disconnect,
    isConnecting,
    isConnected,
    error,
    localLevel,
    remoteLevel,
  } = useRealtime(audioRef);

  const [openSetting, setOpenSetting] = useState(false);
const [topic, setTopic] = useState("Recent Project");
  const [openTopicDialog, setOpenTopicDialog] = useState(false);

  const emotion = useSessionStore((s) => s.emotion);

  const status = isConnecting
    ? "connecting"
    : isConnected
    ? "online"
    : "offline";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <StatusAppBar setOpenSetting={setOpenSetting} />

      <Container maxWidth="xl" sx={{ height: "85vh", py: 3, px: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            width: "100%",
            height: "100%",
            flexWrap: "wrap",
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
              width: "100%",
              flex: 1,
              height: "100%",
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
              {/* <Box sx={{ mt: 1, display: "grid", gap: 1 }}>
                <LiveCaption />
                <LiveUserCaption />
              </Box> */}
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
            instructions={instructions}
            setInstructions={setInstructions}
            error={error}
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
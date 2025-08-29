// components/SettingsDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  IconButton,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Compact template (token-saving)
const COMPACT_TEMPLATE = `
You are Interviewer. Speak {{LANG}} only. Focus on {{TOPIC}}.
Rules: one question per turn; ≤10s spoken; stop instantly if interrupted and invite them to continue; ask for concrete examples, metrics, and trade-offs; keep a neutral-positive, concise tone; no solutions/lectures; wait at least 1200ms of silence after the candidate finishes before responding. If the silence is shorter, do not start speaking.
Flow: broad question → specific probes (scope, constraints, options, reasoning, metrics, failures/learned) → one-line summary → next area.
Safety: no sensitive personal data; redirect off-topic to {{TOPIC}}.
Opening: “Could you walk me through a recent project on {{TOPIC}}—problem, your role, key result?”
`.trim();

// simple {{KEY}} replacer
function fillTemplate(tpl, map) {
  return (tpl || "").replace(
    /\{\{\s*(LANG|TOPIC)\s*\}\}/g,
    (_, k) => map[k] ?? ""
  );
}

export default function SettingsDialog({
  open,
  onClose,
  setInstructions,
  onSave, 
  error,
  defaultGeneral = COMPACT_TEMPLATE, 
  defaultTopic = "Recent Project",
  defaultLanguage = "English",
}) {
  const [general, setGeneral] = useState(defaultGeneral);
  const [topic, setTopic] = useState(defaultTopic);
  const [language, setLanguage] = useState(defaultLanguage);

  const combinedPrompt = useMemo(() => {
    return fillTemplate(general, { LANG: language, TOPIC: topic }).trim();
  }, [general, topic, language]);

  useEffect(() => {
    if (open) {
      setGeneral(defaultGeneral);
      setTopic(defaultTopic);
      setLanguage(defaultLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    onSave?.({ general, topic, language, instructions: combinedPrompt });
    setInstructions?.(combinedPrompt);
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        Interviewer Settings
        <IconButton
          onClick={onClose}
          aria-label="Close"
          size="small"
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <TextField
          autoFocus
          label="System Prompt"
          value={general}
          onChange={(e) => setGeneral(e.target.value)}
          multiline
          minRows={6}
          fullWidth
          variant="outlined"
          sx={{ mt: 1 }}
        />

        <TextField
          label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          fullWidth
          variant="outlined"
          sx={{ mt: 2 }}
        />

        <TextField
          label="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          fullWidth
          variant="outlined"
          sx={{ mt: 2 }}
        />

        {error && (
          <Box
            role="alert"
            sx={{
              mt: 1.5,
              p: 1.2,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "error.dark",
              bgcolor: "rgba(255,137,153,0.12)",
              color: "error.light",
              fontSize: 14,
            }}
          >
            {error}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="text">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

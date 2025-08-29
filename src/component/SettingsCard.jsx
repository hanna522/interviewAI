// components/SettingsDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  IconButton,
  Button,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function SettingsDialog({
  open, // boolean: control from parent (openSetting)
  onClose, // function: close handler
  setInstructions, // function: callback to update merged prompt
  error, // optional string
  defaultGeneral = "You are a professional yet approachable AI interviewer. Keep your responses concise (≤10 seconds when spoken). Ask only one focused question at a time. Pause and allow the candidate time to answer before moving on. Be adaptive: if interrupted, stop speaking immediately.",
  defaultTopic = "the candidate’s recent projects and problem-solving approaches",
  defaultLanguage = "English",
}) {
  // Local states mirror the old card fields
  const [general, setGeneral] = useState(defaultGeneral);
  const [topic, setTopic] = useState(defaultTopic);
  const [language, setLanguage] = useState(defaultLanguage);

  // Merge prompt exactly as before
  const combinedPrompt = useMemo(() => {
    const g = (general || "").trim();
    const t = (topic || "").trim();
    const l = (language || "").trim();
    return [g ? `${g}.` : "", t ? `${t}.` : "", l ? `${l}.` : ""]
      .filter(Boolean)
      .join(" ");
  }, [general, topic, language]);

  // Debounce push-updates to parent
  useEffect(() => {
    if (!open) return; // Only update while dialog is open
    const id = setTimeout(() => setInstructions?.(combinedPrompt), 150);
    return () => clearTimeout(id);
  }, [combinedPrompt, setInstructions, open]);

  // Reset fields when the dialog opens (optional, keeps defaults fresh)
  useEffect(() => {
    if (open) {
      setGeneral(defaultGeneral);
      setTopic(defaultTopic);
      setLanguage(defaultLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
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
          label="General"
          value={general}
          onChange={(e) => setGeneral(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          variant="outlined"
          sx={{ mt: 1 }}
        />

        <TextField
          label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          multiline
          minRows={2}
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

        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" color="text.secondary">
          Press <kbd>Space</kbd> to interrupt while the model is speaking.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

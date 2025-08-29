// component/TopicDialog.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

export default function TopicDialog({
  open,
  value = "Recent Project",
  onClose,
  onSave,
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    if (open) setLocal(value);
  }, [open, value]);

  const handleSave = () => {
    onSave?.(local.trim() || "Recent Project");
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Change Topic</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Topic"
          fullWidth
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />
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

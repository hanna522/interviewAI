// components/AppFooter.jsx
import React from "react";
import { Box, Typography } from "@mui/material";

export default function AppFooter() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        textAlign: "center",
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        bgcolor: "background.paper",
        py: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        React + Vite · WebRTC Realtime · Interactive AI
      </Typography>
    </Box>
  );
}

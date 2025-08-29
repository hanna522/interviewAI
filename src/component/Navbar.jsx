import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SettingsIcon from '@mui/icons-material/Settings';
import { Button } from "@mui/material";

export default function StatusAppBar({ setOpenSetting }) {
  return (
    <AppBar position="sticky" elevation={0} color="transparent">
      <Toolbar sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        {/* Brand */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexGrow: 1,
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "primary.main",
              boxShadow: (t) => `0 0 18px ${t.palette.primary.main}`,
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Voice Interviewer
          </Typography>
        </Box>

        <Button
          onClick={setOpenSetting}
          variant="text"
          sx={{ color: "text.secondary" }}
          startIcon={<SettingsIcon size="small" />}
        >
          Setting
        </Button>
      </Toolbar>
    </AppBar>
  );
}

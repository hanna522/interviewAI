import { createTheme } from "@mui/material";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#3b78c2ff" },
    secondary: { main: "#3b78c223" },
    success: { main: "#50e3a4" },
    warning: { main: "#ffcd6b" },
    error: { main: "#ff8999" },
    background: { default: "#0a0f1e", paper: "#101733" },
  },
  shape: { borderRadius: 16 },
});
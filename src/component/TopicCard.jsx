// component/TopicCard.jsx
import React from "react";
import { Card, Box, Typography, Button } from "@mui/material";

export default function TopicCard({ topic = "Recent Project", onChange }) {
  return (
    <Card
      variant="outlined"
      sx={{
        width: "25vw",
        minWidth: 280,
        px: 2,
        py: 1.25,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Topic
        </Typography>
        <span
          className="chip"
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            fontSize: 12,
            border: "1px solid var(--line)",
            color: "var(--fg)",
            opacity: 0.95,
          }}
          title={topic}
        >
          {topic}
        </span>
      </Box>
      <Button
        size="small"
        variant="text"
        onClick={onChange}
        sx={{ color: "text.secondary", }}
      >
        Change
      </Button>
    </Card>
  );
}

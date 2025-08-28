// api/config.js
export const config = { runtime: "edge" };
export default async function handler() {
  return new Response(
    JSON.stringify({
      defaultModel: process.env.REALTIME_MODEL || "gpt-4o-realtime-preview",
      defaultVoice: process.env.DEFAULT_VOICE || "alloy",
      styles: ["casual", "behavioral", "technical"],
      backchannel: true,
      maxTurnSec: 10,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

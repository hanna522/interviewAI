// api/session.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { instructions, voice, modalities } = body || {};

    const model = process.env.REALTIME_MODEL || "gpt-4o-realtime-preview";

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice: voice || process.env.DEFAULT_VOICE || "alloy",
        modalities: modalities || ["audio", "text"],
        instructions:
          instructions ||
          "You are a friendly, curious AI interviewer. Keep turns short (<=10s), ask one question at a time, and stop speaking if interrupted.",
      }),
    });

    const json = await r.json();
    if (!r.ok) {
      return new Response(
        JSON.stringify({ code: "OPENAI_ERROR", message: json }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        client_secret: json?.client_secret, // { value, expires_at }
        model,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ code: "SESSION_CREATE_FAIL", message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

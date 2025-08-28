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

    // 중요: 여기서는 json.url을 그대로 쓰지 말고,
    // 프론트가 고정 패턴의 Realtime 엔드포인트를 만들 수 있게 model만 내려준다.
    // (에페머럴 토큰은 client_secret.value 사용)
    return new Response(
      JSON.stringify({
        client_secret: json?.client_secret, // { value, expires_at }
        model, // ← 프론트가 이 값으로 URL 구성
        // 참고로 json.url을 굳이 내려보내지 않음
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

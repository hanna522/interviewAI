// api/telemetry.js
export const config = { runtime: "edge" };
export default async function handler(req) {
  const body = await req.json().catch(() => ({}));
  // 필요하면 로깅/전송
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

// api/telemetry.js
export const config = { runtime: "edge" };
export default async function handler(req) {
  const body = await req.json().catch(() => ({}));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

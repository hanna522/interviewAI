// api/emotion.js
export const config = { runtime: "edge" };

const ok = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// 1) Simple English-only rule set
const RULES = [
  {
    re: /(love|great|awesome|amazing|happy|glad|excited)/i,
    emo: "joy",
    v: +0.6,
    a: 0.45,
  },
  {
    re: /(sad|depress|down|blue)/i,
    emo: "sad",
    v: -0.6,
    a: 0.35,
  },
  {
    re: /(angry|annoy|furious|mad|rage|irritat)/i,
    emo: "angry",
    v: -0.7,
    a: 0.55,
  },
  {
    re: /(anxious|scared|fear|terrified|afraid)/i,
    emo: "fear",
    v: -0.6,
    a: 0.55,
  },
  {
    re: /(surpris|omg|wtf|wow)/i,
    emo: "surprise",
    v: 0.2,
    a: 0.6,
  },
];

const EMOS = new Set(["joy", "neutral", "sad", "angry", "fear", "surprise"]);

function ruleClassify(text) {
  const t = (text || "").toLowerCase();
  for (const r of RULES) {
    if (r.re.test(t)) {
      // Slightly boost arousal based on exclamation marks / emojis
      const excite =
        (t.match(/[!]{1,}/g)?.length || 0) * 0.05 +
        (/[😀😁😂😅😍😡😠😭😱😨😮]/.test(t) ? 0.1 : 0);
      const arousal = Math.min(1, r.a + excite);
      return { emotion: r.emo, valence: r.v, arousal };
    }
  }
  return null;
}

const SYS = `You are an emotion rater.
Return JSON with keys:
- emotion: one of ["joy","neutral","sad","angry","fear","surprise"]
- valence: float in [-1,1]
- arousal: float in [0,1]
Prefer a non-neutral label when there is any cue of sentiment or tone.
If mixed, choose the dominant one.
Only return valid JSON.
Input text is English only.`;

export default async function handler(req) {
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });
  if (!process.env.OPENAI_API_KEY) return ok({ code: "MISSING_ENV" }, 500);

  try {
    const { text } = await req.json();
    const trimmed = (text || "").trim();
    if (!trimmed) return ok({ emotion: "neutral", valence: 0, arousal: 0.1 });

    // 2) Try rule-based first
    const rule = ruleClassify(trimmed);
    if (rule) return ok(rule);

    // 3) Very short inputs → neutral (noise handling)
    if (trimmed.length < 12)
      return ok({ emotion: "neutral", valence: 0, arousal: 0.12 });

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.EMO_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 60,
        messages: [
          { role: "system", content: SYS },
          {
            role: "user",
            content: `Utterance (English only): ${trimmed}`,
          },
        ],
      }),
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => r.statusText);
      return ok({ code: "OPENAI_ERROR", status: r.status, message: msg }, 500);
    }

    const json = await r.json();
    let parsed = {};
    try {
      parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? "{}");
    } catch {}

    let emotion = EMOS.has(parsed.emotion) ? parsed.emotion : "neutral";
    let valence = Math.max(-1, Math.min(1, Number(parsed.valence) || 0));
    let arousal = Math.max(0, Math.min(1, Number(parsed.arousal) || 0.15));

    // If model returns neutral but rules hint sentiment, adopt rule's label/arousal
    if (emotion === "neutral") {
      const weak = ruleClassify(trimmed);
      if (weak) {
        emotion = weak.emotion;
        valence = weak.valence;
        arousal = Math.max(arousal, weak.arousal);
      }
    }

    return ok({ emotion, valence, arousal });
  } catch (e) {
    return ok({ code: "EMO_FAIL", message: String(e) }, 500);
  }
}

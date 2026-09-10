const QWEN_TTS_URL = "https://qwen.daytether.ai/v1/audio/speech";

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

async function digest(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const siteOrigin = new URL(request.url).origin;

  if (origin && origin !== siteOrigin) {
    return json(403, { error: "Cross-site requests are not allowed." });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Expected JSON." });
  }

  const input = typeof body.input === "string"
    ? body.input.trim().replace(/\s+/g, " ")
    : "";
  const mode = body.mode === "sentence" ? "sentence" : "word";

  if (!input || input.length > 1000) {
    return json(400, { error: "Input must be 1–1,000 characters." });
  }

  // 相同文本与朗读方式复用边缘缓存，避免重复朗读时反复调用 Qwen。
  const cacheKey = new Request(
    new URL(`/__tts-cache/${await digest(`${mode}:${input}`)}`, request.url)
  );
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(QWEN_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.QWEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "breeze-tts-2",
      voice: "breeze",
      input,
      instructions:
        mode === "sentence"
          ? "Read only the English sentence clearly and naturally, at a calm pace suitable for a child practicing typing. Do not add extra words."
          : "Say only the English word clearly and naturally, at a calm pace suitable for a child taking an English dictation test. Do not add extra words.",
      response_format: "wav",
    }),
  });

  if (!upstream.ok) {
    return json(upstream.status === 429 ? 429 : 502, {
      error: "Speech generation is temporarily unavailable.",
    });
  }

  const response = new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "audio/wav",
      "Cache-Control": "public, max-age=2592000",
    },
  });

  context.waitUntil(caches.default.put(cacheKey, response.clone()));
  return response;
}

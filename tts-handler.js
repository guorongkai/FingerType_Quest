const QWEN_TTS_URL = "https://qwen.daytether.ai/v1/audio/speech";
const TTS_PROFILE_VERSION = "formal-female-v2";
const TTS_SEED = 20260910;

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

export async function handleTts(request, env, waitUntil) {
  if (request.method !== "POST") {
    return json(405, { error: "Use POST for /api/tts." });
  }

  const origin = request.headers.get("Origin");
  const siteOrigin = new URL(request.url).origin;
  if (origin && origin !== siteOrigin) {
    return json(403, { error: "Cross-site requests are not allowed." });
  }

  if (!env.QWEN_API_KEY) {
    return json(500, {
      error: "Server setup error: the QWEN_API_KEY secret is missing."
    });
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
  const format = body.format === "pcm" ? "pcm" : "wav";

  if (!input || input.length > 1000) {
    return json(400, { error: "Input must be 1–1,000 characters." });
  }

  const cacheKey = new Request(
    new URL(
      `/__tts-cache/${await digest(`${TTS_PROFILE_VERSION}:${format}:${mode}:${input}`)}`,
      request.url
    )
  );
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("X-TTS-Cache", "HIT");
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });
  }

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
          ? "Use one consistent, professional adult female voice with neutral American English. This is an exact-reading task: speak the supplied English sentence verbatim, once, then stop immediately. Do not add, omit, repeat, continue, explain, label, or improvise any words. Do not use an introduction or closing."
          : "Use one consistent, professional adult female voice with neutral American English. This is an exact-reading task: speak the supplied English word verbatim, once, then stop immediately. Do not add, omit, repeat, continue, explain, label, or improvise any words. Do not use an introduction or closing.",
      response_format: format,
      seed: TTS_SEED,
      cfg_scale: 4,
    }),
  });

  if (!upstream.ok) {
    return json(upstream.status, {
      error: `Qwen TTS request failed with HTTP ${upstream.status}.`,
    });
  }

  const response = new Response(upstream.body, {
    headers: {
      "Content-Type": format === "pcm"
        ? "audio/pcm; rate=24000; channels=1"
        : upstream.headers.get("Content-Type") || "audio/wav",
      "Cache-Control": "public, max-age=2592000, s-maxage=2592000",
      "X-TTS-Cache": "MISS",
    },
  });

  waitUntil?.(
    caches.default.put(cacheKey, response.clone()).catch((error) => {
      console.error("Unable to cache TTS audio.", error);
    })
  );
  return response;
}

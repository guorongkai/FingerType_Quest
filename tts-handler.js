const QWEN_TTS_URL = "https://qwen.daytether.ai/v1/audio/speech";
const TTS_PROFILE_VERSION = "clear-dictionary-v15";
const TTS_SEED = 1;
const TTS_RECOVERY_SEED = 0;
const PCM_BYTES_PER_SECOND = 24000 * 2;
const WORD_RESPONSE_TIMEOUT_MS = 8000;
const WORD_INSTRUCTIONS = "A clear, formal adult female American English dictionary voice. Read the supplied word once, carefully and naturally. Pronounce every sound, especially initial consonants. Do not add or repeat words.";
const WORD_RECOVERY_INSTRUCTIONS = "A clear formal adult female American English dictionary voice. Read the supplied word once only, with every sound audible. Do not add, repeat, or continue words.";
const SENTENCE_INSTRUCTIONS = "A clear, formal adult female American English narrator with a steady natural pace and consistent voice. Read the supplied sentence once exactly as written. Do not add or repeat words.";

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

function standaloneWordAudioLimit(word) {
  const letterCount = (word.match(/[a-z]/gi) || []).length;
  const seconds = Math.min(1.65, Math.max(1.1, 0.9 + letterCount * 0.1));
  return Math.floor(seconds * PCM_BYTES_PER_SECOND);
}

function joinAudioChunks(chunks, byteLength) {
  const audio = new Uint8Array(byteLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    audio.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return audio;
}

async function collectValidatedWordPcm(stream, maxBytes) {
  const reader = stream?.getReader();
  if (!reader) {
    return { ok: false, reason: "Qwen returned no audio stream." };
  }

  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      byteLength += chunk.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel("Generated word audio exceeded its safe length.");
        return {
          ok: false,
          reason: "Qwen generated more audio than is safe for one isolated word."
        };
      }
      chunks.push(chunk);
    }
  } catch (error) {
    return {
      ok: false,
      reason: error?.name === "AbortError"
        ? "Qwen word generation timed out."
        : "Qwen word audio could not be read."
    };
  } finally {
    reader.releaseLock();
  }

  if (!byteLength) {
    return { ok: false, reason: "Qwen returned empty word audio." };
  }
  return { ok: true, audio: joinAudioChunks(chunks, byteLength) };
}

async function fetchValidatedWordPcm(env, input, requestBody) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    WORD_RESPONSE_TIMEOUT_MS
  );
  try {
    const upstream = await fetch(QWEN_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.QWEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: abortController.signal,
    });
    if (!upstream.ok) {
      return {
        ok: false,
        status: upstream.status,
        reason: `Qwen TTS request failed with HTTP ${upstream.status}.`
      };
    }

    const wordAudio = await collectValidatedWordPcm(
      upstream.body,
      standaloneWordAudioLimit(input)
    );
    if (!wordAudio.ok) {
      return { ok: false, status: 422, reason: wordAudio.reason };
    }
    return wordAudio;
  } catch (error) {
    return {
      ok: false,
      status: error?.name === "AbortError" ? 504 : 502,
      reason: error?.name === "AbortError"
        ? "Qwen word generation timed out."
        : "Qwen word audio could not be fetched."
    };
  } finally {
    clearTimeout(timeoutId);
  }
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
  const speechInput = input;

  if (!input || input.length > 1000) {
    return json(400, { error: "Input must be 1–1,000 characters." });
  }
  if (mode === "word" && !/^[a-z]+(?:['’-][a-z]+)*$/i.test(input)) {
    return json(400, { error: "Word mode accepts one English word only." });
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

  const requestBody = {
    model: "breeze-tts-2",
    voice: "breeze",
    input: speechInput,
    instructions:
      mode === "sentence"
        ? SENTENCE_INSTRUCTIONS
        : WORD_INSTRUCTIONS,
    response_format: format,
    seed: TTS_SEED,
    cfg_scale: 4,
  };

  if (mode === "word" && format === "pcm") {
    let wordAudio = await fetchValidatedWordPcm(env, input, requestBody);
    let recoveryAttempt = 0;
    if (!wordAudio.ok && wordAudio.status === 422) {
      recoveryAttempt = 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      wordAudio = await fetchValidatedWordPcm(env, input, {
        ...requestBody,
        seed: TTS_RECOVERY_SEED,
        instructions: WORD_RECOVERY_INSTRUCTIONS,
      });
    }
    if (!wordAudio.ok) {
      return json(wordAudio.status, { error: wordAudio.reason });
    }

    const response = new Response(wordAudio.audio, {
      headers: {
        "Content-Type": "audio/pcm; rate=24000; channels=1",
        "Cache-Control": "public, max-age=2592000, s-maxage=2592000",
        "X-TTS-Cache": "MISS",
        "X-TTS-Recovery": String(recoveryAttempt),
      },
    });
    waitUntil?.(
      caches.default.put(cacheKey, response.clone()).catch((error) => {
        console.error("Unable to cache TTS audio.", error);
      })
    );
    return response;
  }

  let upstream;
  try {
    upstream = await fetch(QWEN_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.QWEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    return json(504, { error: "Qwen TTS did not start in time." });
  }

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

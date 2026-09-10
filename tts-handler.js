const QWEN_TTS_URL = "https://qwen.daytether.ai/v1/audio/speech";
const TTS_PROFILE_VERSION = "isolated-word-guard-v8";
const TTS_SEED = 1;
const TTS_RECOVERY_SEED = 0;
const PCM_BYTES_PER_SECOND = 24000 * 2;
const WORD_RESPONSE_TIMEOUT_MS = 8000;

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
  const seconds = Math.min(1.1, Math.max(0.72, 0.42 + letterCount * 0.08));
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
        ? "Use one unchanging formal adult woman narrator identity for every request: neutral General American English, dry studio sound, steady volume, calm pace, and stable pitch. Do not alter the speaker's age, gender, accent, emotion, or delivery between sentences. Read the supplied English sentence verbatim once, with no introduction or closing, then stop. Do not add, omit, repeat, continue, explain, label, or improvise words."
        : "Read the isolated English headword in the input once. Use one unchanging formal adult woman narrator: neutral General American English, dry studio sound, steady volume, calm pace, and stable pitch. Use careful dictionary citation pronunciation, never connected-speech reduction. Articulate every phoneme and all initial/final consonants. End with low neutral pitch, never question, greeting, or continuation intonation. Do not add, omit, repeat, continue, explain, label, or improvise.",
    response_format: format,
    seed: TTS_SEED,
    cfg_scale: 4,
  };

  if (mode === "word" && format === "pcm") {
    let wordAudio = await fetchValidatedWordPcm(env, input, requestBody);
    let usedRecoverySeed = false;
    if (!wordAudio.ok && wordAudio.status === 422) {
      usedRecoverySeed = true;
      await new Promise((resolve) => setTimeout(resolve, 250));
      wordAudio = await fetchValidatedWordPcm(env, input, {
        ...requestBody,
        seed: TTS_RECOVERY_SEED,
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
        "X-TTS-Recovery": usedRecoverySeed ? "1" : "0",
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

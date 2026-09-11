import { handleTts } from "./tts-handler.js";
import { handleBankRecognition } from "./qwen-bank-handler.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/tts") {
      return handleTts(request, env, ctx.waitUntil.bind(ctx));
    }

    if (url.pathname === "/api/recognize-bank") {
      return handleBankRecognition(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

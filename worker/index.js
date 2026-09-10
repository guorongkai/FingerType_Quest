import { handleTts } from "../tts-handler.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/tts") {
      return handleTts(request, env, ctx.waitUntil.bind(ctx));
    }

    return env.ASSETS.fetch(request);
  },
};

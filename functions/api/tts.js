import { handleTts } from "../../tts-handler.js";

export async function onRequestPost(context) {
  return handleTts(context.request, context.env, context.waitUntil.bind(context));
}

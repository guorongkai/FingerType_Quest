import { handleBankRecognition } from "../../qwen-bank-handler.js";

export async function onRequestPost(context) {
  return handleBankRecognition(context.request, context.env);
}

import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const env = getServerEnv();
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

export const DEFAULT_MODEL = "gpt-4o-mini";

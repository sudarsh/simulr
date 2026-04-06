import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider";

export const PROVIDER_MODELS: Record<string, { label: string; models: { id: string; label: string }[] }> = {
  anthropic: {
    label: "Anthropic",
    models: [
      { id: "claude-opus-4-5", label: "Claude Opus 4.5" },
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  openai: {
    label: "OpenAI",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
  },
  google: {
    label: "Google Gemini",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
  ollama: {
    label: "Ollama (Local)",
    models: [
      { id: "llama3.2-vision", label: "Llama 3.2 Vision" },
      { id: "llava", label: "LLaVA" },
      { id: "mistral", label: "Mistral" },
    ],
  },
};

export function getModel(
  provider: string,
  modelId: string,
  apiKey: string,
  baseUrl?: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    }
    case "ollama": {
      const ollama = createOllama({ baseURL: baseUrl ?? "http://localhost:11434/api" });
      return ollama(modelId);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

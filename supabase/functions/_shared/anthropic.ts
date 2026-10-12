// Minimal Anthropic Messages API client with JSON-schema structured output.
// Docs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
import { HttpError } from './http.ts';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeJsonResult {
  text: string;
  model: string;
  stopReason: string;
  usage: { input_tokens: number; output_tokens: number };
}

export const DEFAULT_MODEL = 'claude-sonnet-5-5';

export async function claudeJson(opts: {
  system: string;
  messages: ClaudeMessage[];
  schema: Record<string, unknown>;
  maxTokens?: number;
  model?: string;
}): Promise<ClaudeJsonResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new HttpError(503, 'ANTHROPIC_API_KEY is not set. Run set-api-key.command and restart the database.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? Deno.env.get('ANTHROPIC_MODEL') ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      messages: opts.messages,
      output_config: { format: { type: 'json_schema', schema: opts.schema } },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    const status = res.status === 401 ? 503 : 502;
    throw new HttpError(status, `Claude API error ${res.status}: ${detail.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
  if (data.stop_reason === 'max_tokens') throw new HttpError(502, 'Claude ran out of tokens before finishing the lesson.');
  if (data.stop_reason === 'refusal') throw new HttpError(502, 'Claude declined to write this lesson.');
  return { text, model: data.model, stopReason: data.stop_reason, usage: data.usage };
}

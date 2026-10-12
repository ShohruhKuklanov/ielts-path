'use client';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY ?? '';

export const isConfigured = url.length > 0 && key.length > 0;
export const supabase = createClient(url || 'http://127.0.0.1:54321', key || 'not-configured');

/** Calls an Edge Function as the signed-in user and returns its JSON (throws with its error text). */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // supabase-js wraps non-2xx responses; read the function's own message.
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

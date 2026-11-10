import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine((value) => {
    const url = URL.parse(value);
    return url?.protocol === "https:" || (url?.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
});

export function createSupabaseServerClient() {
  const env = envSchema.safeParse(process.env);
  if (!env.success) {
    const fields = env.error.issues.map(({ path }) => path.join(".")).join(", ");
    throw new Error(`Configure the Supabase server environment in .env.local (${fields}).`);
  }

  return createClient(env.data.NEXT_PUBLIC_SUPABASE_URL, env.data.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

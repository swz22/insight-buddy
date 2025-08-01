import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

let publicClientInstance: ReturnType<typeof createClient<Database>> | null = null;

export function createPublicClient() {
  if (publicClientInstance) {
    return publicClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  publicClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "insight-buddy-public",
      },
    },
  });

  return publicClientInstance;
}

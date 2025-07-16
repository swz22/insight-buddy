import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";

export async function createClient() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerComponentClient<Database>({
      cookies,
    });
    return supabase;
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    throw error;
  }
}

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function createClient() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ 
      cookies: () => cookieStore 
    });
    return supabase;
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    throw error;
  }
}
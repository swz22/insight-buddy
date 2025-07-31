import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/supabase";

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClientWithFallback() {
  // Return existing instance if available
  if (clientInstance) {
    return clientInstance;
  }

  try {
    clientInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: {
            getItem: (key: string) => {
              try {
                if (typeof window !== "undefined") {
                  return window.localStorage.getItem(key);
                }
              } catch (e) {
                // Handle browsers with strict storage policies
                console.warn("localStorage not available:", e);
              }
              return null;
            },
            setItem: (key: string, value: string) => {
              try {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(key, value);
                }
              } catch (e) {
                // Handle browsers with strict storage policies
                console.warn("localStorage not available:", e);
              }
            },
            removeItem: (key: string) => {
              try {
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(key);
                }
              } catch (e) {
                // Handle browsers with strict storage policies
                console.warn("localStorage not available:", e);
              }
            },
          },
        },
        cookies: {
          get(name: string) {
            try {
              if (typeof document !== "undefined") {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) {
                  return parts.pop()?.split(";").shift();
                }
              }
            } catch (e) {
              console.warn("Cookie access failed:", e);
            }
            return undefined;
          },
          set(name: string, value: string, options?: any) {
            try {
              if (typeof document !== "undefined") {
                let cookieString = `${name}=${value}`;
                if (options?.maxAge) {
                  cookieString += `; max-age=${options.maxAge}`;
                }
                if (options?.path) {
                  cookieString += `; path=${options.path}`;
                }
                cookieString += "; samesite=lax";
                document.cookie = cookieString;
              }
            } catch (e) {
              console.warn("Cookie set failed:", e);
            }
          },
          remove(name: string, options?: any) {
            try {
              if (typeof document !== "undefined") {
                document.cookie = `${name}=; max-age=0; path=${options?.path || "/"}`;
              }
            } catch (e) {
              console.warn("Cookie remove failed:", e);
            }
          },
        },
      }
    );

    return clientInstance;
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    throw error;
  }
}

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/supabase";

class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

let memoryStorage: MemoryStorage | null = null;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const testKey = "__localStorage_test__";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (e) {
    if (!memoryStorage) {
      memoryStorage = new MemoryStorage();
    }
    return memoryStorage;
  }
}

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClientSafe() {
  if (clientInstance) {
    return clientInstance;
  }

  const storage = getStorage();

  try {
    clientInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: storage
            ? {
                getItem: (key: string) => storage.getItem(key),
                setItem: (key: string, value: string) => storage.setItem(key, value),
                removeItem: (key: string) => storage.removeItem(key),
              }
            : undefined,
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

export function getBrowserInfo() {
  if (typeof window === "undefined") {
    return { name: "unknown", version: "unknown", isPrivate: false };
  }

  const userAgent = window.navigator.userAgent;
  let browserName = "unknown";
  let browserVersion = "unknown";

  if (userAgent.includes("Edg/")) {
    browserName = "edge";
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes("Chrome/")) {
    browserName = "chrome";
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes("Firefox/")) {
    browserName = "firefox";
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
    browserName = "safari";
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) browserVersion = match[1];
  }

  return {
    name: browserName,
    version: browserVersion,
    userAgent,
  };
}

export async function isPrivateBrowsing(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const db = window.indexedDB.open("test");

    return new Promise((resolve) => {
      db.onsuccess = () => {
        resolve(false);
      };
      db.onerror = () => {
        resolve(true);
      };
      setTimeout(() => {
        resolve(false);
      }, 100);
    });
  } catch {
    return true;
  }
}

export function getStorageAdapter() {
  const browserInfo = getBrowserInfo();

  if (browserInfo.name === "edge") {
    return {
      getItem: (key: string): string | null => {
        try {
          return sessionStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string): void => {
        try {
          sessionStorage.setItem(key, value);
        } catch {}
      },
      removeItem: (key: string): void => {
        try {
          sessionStorage.removeItem(key);
        } catch {}
      },
    };
  }

  if (browserInfo.name === "safari") {
    return {
      getItem: (key: string): string | null => {
        try {
          const value = localStorage.getItem(key);
          if (value === null) {
            const match = document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`));
            return match ? decodeURIComponent(match[2]) : null;
          }
          return value;
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string): void => {
        try {
          localStorage.setItem(key, value);
        } catch {
          document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=86400; SameSite=Lax`;
        }
      },
      removeItem: (key: string): void => {
        try {
          localStorage.removeItem(key);
        } catch {
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        }
      },
    };
  }

  // Default handling for Chrome/Firefox
  return {
    getItem: (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch {
        return sessionStorage.getItem(key);
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        localStorage.setItem(key, value);
      } catch {
        sessionStorage.setItem(key, value);
      }
    },
    removeItem: (key: string): void => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {}
    },
  };
}

export function supportsWebSockets(): boolean {
  return typeof window !== "undefined" && "WebSocket" in window;
}

export function getConnectionInfo() {
  if (typeof window === "undefined" || !("navigator" in window)) {
    return { type: "unknown", effectiveType: "unknown", saveData: false };
  }

  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (connection) {
    return {
      type: connection.type || "unknown",
      effectiveType: connection.effectiveType || "unknown",
      saveData: connection.saveData || false,
      downlink: connection.downlink || null,
      rtt: connection.rtt || null,
    };
  }

  return { type: "unknown", effectiveType: "unknown", saveData: false };
}

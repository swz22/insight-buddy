export function isEdgeBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes("edg/") || userAgent.includes("edge");
}

export function getBrowserInfo() {
  if (typeof window === "undefined") return { name: "unknown", version: "unknown" };

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
  } else if (userAgent.includes("Safari/")) {
    browserName = "safari";
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) browserVersion = match[1];
  }

  return { name: browserName, version: browserVersion };
}

export function isPrivateBrowsing(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const db = window.indexedDB.open("test");
      db.onsuccess = () => resolve(false);
      db.onerror = () => resolve(true);
    } catch {
      resolve(true);
    }
  });
}

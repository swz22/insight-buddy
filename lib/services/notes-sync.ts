interface NotesState {
  content: string;
  lastEditedBy: { name: string; color: string } | null;
  version: number;
  lastUpdated: string;
}

const notesStateMap = new Map<string, NotesState>();

export class NotesSync {
  private static instance: NotesSync;

  static getInstance(): NotesSync {
    if (!NotesSync.instance) {
      NotesSync.instance = new NotesSync();
    }
    return NotesSync.instance;
  }

  getNotesState(shareToken: string): NotesState {
    return (
      notesStateMap.get(shareToken) || {
        content: "",
        lastEditedBy: null,
        version: 0,
        lastUpdated: new Date().toISOString(),
      }
    );
  }

  updateNotesState(shareToken: string, content: string, userInfo: { name: string; color: string }): NotesState {
    const currentState = this.getNotesState(shareToken);
    const newState: NotesState = {
      content,
      lastEditedBy: userInfo,
      version: currentState.version + 1,
      lastUpdated: new Date().toISOString(),
    };

    notesStateMap.set(shareToken, newState);
    return newState;
  }

  syncViaLocalStorage(shareToken: string, content: string, userInfo: { name: string; color: string }) {
    try {
      const syncData = {
        shareToken,
        content,
        userInfo,
        timestamp: Date.now(),
      };

      localStorage.setItem(`notes-sync-${shareToken}`, JSON.stringify(syncData));

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `notes-sync-${shareToken}`,
          newValue: JSON.stringify(syncData),
          url: window.location.href,
        })
      );
    } catch (e) {
      console.warn("LocalStorage sync failed:", e);
    }
  }
}

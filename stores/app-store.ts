import { create } from "zustand";

interface Meeting {
  id: string;
  title: string;
  description?: string;
  [key: string]: any;
}

interface AppStore {
  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Upload state
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;

  // Current meeting being viewed
  currentMeeting: Meeting | null;
  setCurrentMeeting: (meeting: Meeting | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Upload state
  uploadProgress: 0,
  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  // Current meeting being viewed
  currentMeeting: null,
  setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),
}));

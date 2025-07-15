import { create } from "zustand";

export const useAppStore = create((set) => ({
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

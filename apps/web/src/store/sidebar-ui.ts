import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarUiState {
  openGroups: string[];
  isGroupOpen(group: string): boolean;
  toggleGroup(group: string): void;
}

// Tracks which sidebar nav groups the user has manually opened. The
// currently active route's group is force-open at render time in
// sidebar.tsx regardless of what's persisted here — this store only
// remembers explicit manual toggles, so navigating through a group
// without opening it doesn't pollute persisted state.
export const useSidebarUiStore = create<SidebarUiState>()(
  persist(
    (set, get) => ({
      openGroups: [],
      isGroupOpen: (group) => get().openGroups.includes(group),
      toggleGroup: (group) =>
        set((state) => ({
          openGroups: state.openGroups.includes(group)
            ? state.openGroups.filter((g) => g !== group)
            : [...state.openGroups, group],
        })),
    }),
    { name: 'sdhp-sidebar-ui' },
  ),
);

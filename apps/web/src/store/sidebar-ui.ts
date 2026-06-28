import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarUiState {
  openGroup: string | null;
  isGroupOpen(group: string): boolean;
  toggleGroup(group: string): void;
}

// Tracks which single sidebar nav group the user has manually opened
// (single-open accordion — opening one closes whatever was previously
// manually open). The currently active route's group is force-open at
// render time in sidebar.tsx regardless of what's persisted here, so at
// most two groups can ever be open at once: the active one + this one.
export const useSidebarUiStore = create<SidebarUiState>()(
  persist(
    (set, get) => ({
      openGroup: null,
      isGroupOpen: (group) => get().openGroup === group,
      toggleGroup: (group) =>
        set((state) => ({
          openGroup: state.openGroup === group ? null : group,
        })),
    }),
    { name: 'sdhp-sidebar-ui' },
  ),
);

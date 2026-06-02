import { create } from 'zustand';

interface UnsavedGuardStore {
  enabled: boolean;
  showConfirm: boolean;
  pendingAction: (() => void) | null;
  setEnabled: (enabled: boolean) => void;
  requestNavigate: (action: () => void) => void;
  confirmLeave: () => void;
  stayHere: () => void;
}

export const useUnsavedGuardStore = create<UnsavedGuardStore>((set, get) => ({
  enabled: false,
  showConfirm: false,
  pendingAction: null,

  setEnabled: (enabled) => set({ enabled }),

  requestNavigate: (action) => {
    if (get().enabled) {
      set({ showConfirm: true, pendingAction: action });
    } else {
      action();
    }
  },

  confirmLeave: () => {
    const { pendingAction } = get();
    set({ showConfirm: false, pendingAction: null });
    pendingAction?.();
  },

  stayHere: () => {
    set({ showConfirm: false, pendingAction: null });
  },
}));

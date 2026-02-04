/**
 * UI Store - Zustand store for UI state management
 *
 * Manages:
 * - Sidebar collapsed state
 * - Modal state
 * - Theme preferences
 * - Active navigation item
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

interface ModalState {
  id: string;
  props?: Record<string, unknown>;
}

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;

  // Navigation
  activeNavItem: string | null;

  // Modals
  openModals: ModalState[];

  // Theme
  theme: 'light' | 'dark' | 'system';

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setActiveNavItem: (id: string | null) => void;
  openModal: (id: string, props?: Record<string, unknown>) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  activeNavItem: null,
  openModals: [],
  theme: 'light' as const,
};

// =============================================================================
// Store
// =============================================================================

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        /**
         * Toggle sidebar collapsed state
         */
        toggleSidebar: () => set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

        /**
         * Set sidebar collapsed state directly
         */
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

        /**
         * Toggle mobile sidebar open state
         */
        toggleMobileSidebar: () => set((state) => ({
          sidebarMobileOpen: !state.sidebarMobileOpen,
        })),

        /**
         * Set mobile sidebar open state directly
         */
        setMobileSidebarOpen: (open) => set({ sidebarMobileOpen: open }),

        /**
         * Set the active navigation item
         */
        setActiveNavItem: (id) => set({ activeNavItem: id }),

        /**
         * Open a modal by ID with optional props
         */
        openModal: (id, props) => set((state) => {
          // Don't open if already open
          if (state.openModals.some((m) => m.id === id)) {
            return state;
          }
          return {
            openModals: [...state.openModals, { id, props }],
          };
        }),

        /**
         * Close a modal by ID
         */
        closeModal: (id) => set((state) => ({
          openModals: state.openModals.filter((m) => m.id !== id),
        })),

        /**
         * Close all open modals
         */
        closeAllModals: () => set({ openModals: [] }),

        /**
         * Set theme preference
         */
        setTheme: (theme) => set({ theme }),

        /**
         * Reset UI state to defaults
         */
        reset: () => set(initialState),
      }),
      {
        name: 'gimbal-ui-store',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectSidebarCollapsed = (state: UIState) => state.sidebarCollapsed;
export const selectSidebarMobileOpen = (state: UIState) => state.sidebarMobileOpen;
export const selectActiveNavItem = (state: UIState) => state.activeNavItem;
export const selectOpenModals = (state: UIState) => state.openModals;
export const selectTheme = (state: UIState) => state.theme;
export const selectIsModalOpen = (id: string) => (state: UIState) =>
  state.openModals.some((m) => m.id === id);
export const selectModalProps = (id: string) => (state: UIState) =>
  state.openModals.find((m) => m.id === id)?.props;

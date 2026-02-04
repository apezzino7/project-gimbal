/**
 * CRM Store - Zustand store for CRM state management
 *
 * Manages:
 * - Sites selection and hierarchy
 * - Member filtering and selection
 * - Dashboard metrics cache
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Site, MembershipLevel } from '../types/member';

// =============================================================================
// Types
// =============================================================================

interface DashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  totalRevenue: number;
  avgLtv: number;
  totalVisits: number;
  lastUpdated: string | null;
}

interface CRMState {
  // Sites
  selectedSiteId: string | null;
  sites: Site[];
  sitesLoading: boolean;

  // Members
  selectedMemberId: string | null;
  memberSearchQuery: string;
  memberFilters: {
    status?: string;
    membershipLevelId?: string;
    tags?: string[];
  };

  // Membership Levels
  membershipLevels: MembershipLevel[];

  // Dashboard
  dashboardMetrics: DashboardMetrics | null;
  dashboardLoading: boolean;

  // Actions - Sites
  setSelectedSiteId: (id: string | null) => void;
  setSites: (sites: Site[]) => void;
  setSitesLoading: (loading: boolean) => void;

  // Actions - Members
  setSelectedMemberId: (id: string | null) => void;
  setMemberSearchQuery: (query: string) => void;
  setMemberFilters: (filters: CRMState['memberFilters']) => void;
  clearMemberFilters: () => void;

  // Actions - Membership Levels
  setMembershipLevels: (levels: MembershipLevel[]) => void;

  // Actions - Dashboard
  setDashboardMetrics: (metrics: DashboardMetrics | null) => void;
  setDashboardLoading: (loading: boolean) => void;

  // Reset
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  selectedSiteId: null,
  sites: [],
  sitesLoading: false,
  selectedMemberId: null,
  memberSearchQuery: '',
  memberFilters: {},
  membershipLevels: [],
  dashboardMetrics: null,
  dashboardLoading: false,
};

// =============================================================================
// Store
// =============================================================================

export const useCRMStore = create<CRMState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Sites
        setSelectedSiteId: (id) => set({ selectedSiteId: id }),
        setSites: (sites) => set({ sites }),
        setSitesLoading: (loading) => set({ sitesLoading: loading }),

        // Members
        setSelectedMemberId: (id) => set({ selectedMemberId: id }),
        setMemberSearchQuery: (query) => set({ memberSearchQuery: query }),
        setMemberFilters: (filters) => set((state) => ({
          memberFilters: { ...state.memberFilters, ...filters },
        })),
        clearMemberFilters: () => set({ memberFilters: {}, memberSearchQuery: '' }),

        // Membership Levels
        setMembershipLevels: (levels) => set({ membershipLevels: levels }),

        // Dashboard
        setDashboardMetrics: (metrics) => set({ dashboardMetrics: metrics }),
        setDashboardLoading: (loading) => set({ dashboardLoading: loading }),

        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'gimbal-crm-store',
        partialize: (state) => ({
          selectedSiteId: state.selectedSiteId,
        }),
      }
    ),
    { name: 'CRMStore' }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectSelectedSiteId = (state: CRMState) => state.selectedSiteId;
export const selectSites = (state: CRMState) => state.sites;
export const selectSitesLoading = (state: CRMState) => state.sitesLoading;

export const selectSelectedMemberId = (state: CRMState) => state.selectedMemberId;
export const selectMemberSearchQuery = (state: CRMState) => state.memberSearchQuery;
export const selectMemberFilters = (state: CRMState) => state.memberFilters;

export const selectMembershipLevels = (state: CRMState) => state.membershipLevels;

export const selectDashboardMetrics = (state: CRMState) => state.dashboardMetrics;
export const selectDashboardLoading = (state: CRMState) => state.dashboardLoading;

// Computed selectors
export const selectSelectedSite = (state: CRMState) =>
  state.sites.find((s) => s.id === state.selectedSiteId) ?? null;

export const selectSiteOptions = (state: CRMState) =>
  state.sites.map((s) => ({ value: s.id, label: s.name }));

export const selectMembershipLevelOptions = (state: CRMState) =>
  state.membershipLevels.map((l) => ({ value: l.id, label: l.name }));

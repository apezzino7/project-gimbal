/**
 * Zustand Stores - Centralized state management
 *
 * @module stores
 */

// Auth Store
export {
  useAuthStore,
  useAuth,
  selectUser,
  selectSession,
  selectIsAuthenticated,
  selectIsLoading,
} from './authStore';

// UI Store
export {
  useUIStore,
  selectSidebarCollapsed,
  selectSidebarMobileOpen,
  selectActiveNavItem,
  selectOpenModals,
  selectTheme,
  selectIsModalOpen,
  selectModalProps,
} from './uiStore';

// CRM Store
export {
  useCRMStore,
  selectSelectedSiteId,
  selectSites,
  selectSitesLoading,
  selectSelectedMemberId,
  selectMemberSearchQuery,
  selectMemberFilters,
  selectMembershipLevels,
  selectDashboardMetrics,
  selectDashboardLoading,
  selectSelectedSite,
  selectSiteOptions,
  selectMembershipLevelOptions,
} from './crmStore';

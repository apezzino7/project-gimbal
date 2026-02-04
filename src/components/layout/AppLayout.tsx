import { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import type { NavItem } from './Sidebar';
import { Header } from './Header';
import type { HeaderUser } from './Header';

// =============================================================================
// Types
// =============================================================================

export interface AppLayoutProps {
  /** Main content */
  children: ReactNode;
  /** Navigation items for sidebar */
  navItems: NavItem[];
  /** Current page title */
  pageTitle?: string;
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Current user info */
  user?: HeaderUser | null;
  /** Called when user menu action is triggered */
  onUserAction?: (action: 'profile' | 'settings' | 'logout') => void;
  /** Custom actions for header */
  headerActions?: ReactNode;
  /** Sidebar logo */
  logo?: ReactNode;
  /** Collapsed sidebar logo */
  logoCollapsed?: ReactNode;
  /** Sidebar footer content */
  sidebarFooter?: ReactNode;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SIDEBAR_COLLAPSED_KEY = 'gimbal-sidebar-collapsed';

// =============================================================================
// Component
// =============================================================================

/**
 * Main application layout with sidebar, header, and content area.
 *
 * @example
 * const navItems: NavItem[] = [
 *   { id: 'dashboard', label: 'Dashboard', href: '/', icon: <DashboardIcon /> },
 *   { id: 'campaigns', label: 'Campaigns', href: '/campaigns', icon: <CampaignIcon /> },
 * ];
 *
 * <AppLayout
 *   navItems={navItems}
 *   pageTitle="Dashboard"
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 * >
 *   <DashboardContent />
 * </AppLayout>
 */
export function AppLayout({
  children,
  navItems,
  pageTitle,
  breadcrumbs,
  user,
  onUserAction,
  headerActions,
  logo,
  logoCollapsed,
  sidebarFooter,
  defaultCollapsed = false,
}: AppLayoutProps) {
  // Sidebar collapsed state - persisted to localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return defaultCollapsed;
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored !== null ? stored === 'true' : defaultCollapsed;
  });

  // Mobile sidebar open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Close mobile menu on route change or escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSidebarCollapsedChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  const handleMobileMenuClick = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={handleMobileMenuClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 lg:hidden',
          'transform transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar
          items={navItems}
          collapsed={false}
          logo={logo}
          footer={sidebarFooter}
        />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
        <Sidebar
          items={navItems}
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleSidebarCollapsedChange}
          logo={logo}
          logoCollapsed={logoCollapsed}
          footer={sidebarFooter}
        />
      </div>

      {/* Main content area */}
      <div
        className={[
          'flex flex-col min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64',
        ].join(' ')}
      >
        {/* Header */}
        <Header
          title={pageTitle}
          breadcrumbs={breadcrumbs}
          user={user}
          onUserAction={onUserAction}
          onMobileMenuClick={handleMobileMenuClick}
          showMobileMenu={true}
          actions={headerActions}
        />

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { UserRole } from '@/types/admin';

// =============================================================================
// Types
// =============================================================================

export interface NavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Icon component */
  icon: ReactNode;
  /** Sub-navigation items */
  children?: NavItem[];
  /** Badge count (e.g., for notifications) */
  badge?: number;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Minimum role required to see this nav item */
  requiredRole?: UserRole;
}

export interface SidebarProps {
  /** Navigation items */
  items: NavItem[];
  /** Whether sidebar is collapsed */
  collapsed?: boolean;
  /** Called when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Logo component for expanded state */
  logo?: ReactNode;
  /** Logo component for collapsed state */
  logoCollapsed?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Styles
// =============================================================================

const navItemBaseStyles = [
  'flex items-center gap-3 px-3 py-2.5 rounded-lg',
  'text-sm font-medium transition-colors duration-200',
  'focus:outline-none focus:ring-2 focus:ring-[#0353a4] focus:ring-offset-2',
].join(' ');

const navItemActiveStyles = 'bg-[#0353a4] text-white';
const navItemInactiveStyles = 'text-[#003559] hover:bg-[#b9d6f2]/30';
const navItemDisabledStyles = 'opacity-50 cursor-not-allowed pointer-events-none';

// =============================================================================
// Sub-components
// =============================================================================

interface NavItemComponentProps {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
}

function NavItemComponent({ item, collapsed, depth = 0 }: NavItemComponentProps) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = location.pathname === item.href ||
    (hasChildren && item.children?.some(child => location.pathname === child.href));

  const handleToggle = useCallback(() => {
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
  }, [hasChildren]);

  if (item.disabled) {
    return (
      <div
        className={[navItemBaseStyles, navItemDisabledStyles, collapsed ? 'justify-center' : ''].join(' ')}
        aria-disabled="true"
      >
        <span className="shrink-0 w-5 h-5">{item.icon}</span>
        {!collapsed && <span className="truncate">{item.label}</span>}
      </div>
    );
  }

  // Item with children (expandable)
  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={handleToggle}
          className={[
            navItemBaseStyles,
            'w-full',
            isActive ? navItemActiveStyles : navItemInactiveStyles,
            collapsed ? 'justify-center' : '',
          ].join(' ')}
          aria-expanded={isExpanded}
        >
          <span className="shrink-0 w-5 h-5">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              <ChevronIcon expanded={isExpanded} />
            </>
          )}
        </button>

        {/* Sub-items */}
        {!collapsed && isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children?.map(child => (
              <NavItemComponent key={child.id} item={child} collapsed={false} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Regular nav item (link)
  return (
    <NavLink
      to={item.href}
      className={({ isActive: linkActive }) =>
        [
          navItemBaseStyles,
          linkActive ? navItemActiveStyles : navItemInactiveStyles,
          collapsed ? 'justify-center' : '',
          depth > 0 ? 'py-2' : '',
        ].join(' ')
      }
    >
      <span className="shrink-0 w-5 h-5">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="shrink-0 px-2 py-0.5 text-xs font-semibold bg-[#d32f2f] text-white rounded-full">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={['w-4 h-4 transition-transform duration-200', expanded ? 'rotate-180' : ''].join(' ')}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'p-2 rounded-lg text-gray-500',
        'hover:bg-[#b9d6f2]/30 hover:text-[#003559]',
        'focus:outline-none focus:ring-2 focus:ring-[#0353a4]',
        'transition-colors',
      ].join(' ')}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <svg
        className={['w-5 h-5 transition-transform duration-200', collapsed ? 'rotate-180' : ''].join(' ')}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Sidebar navigation component with collapsible state.
 *
 * @example
 * const navItems: NavItem[] = [
 *   { id: 'dashboard', label: 'Dashboard', href: '/', icon: <DashboardIcon /> },
 *   { id: 'campaigns', label: 'Campaigns', href: '/campaigns', icon: <CampaignIcon /> },
 * ];
 *
 * <Sidebar
 *   items={navItems}
 *   collapsed={isCollapsed}
 *   onCollapsedChange={setIsCollapsed}
 *   logo={<Logo />}
 * />
 */
export function Sidebar({
  items,
  collapsed = false,
  onCollapsedChange,
  logo,
  logoCollapsed,
  footer,
  className = '',
}: SidebarProps) {
  const handleToggleCollapse = useCallback(() => {
    onCollapsedChange?.(!collapsed);
  }, [collapsed, onCollapsedChange]);

  return (
    <aside
      className={[
        'flex flex-col h-full bg-white border-r border-[#e0e0e0]',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Logo area */}
      <div className={[
        'flex items-center h-16 px-4 border-b border-[#e0e0e0]',
        collapsed ? 'justify-center' : 'justify-between',
      ].join(' ')}>
        {collapsed ? (
          logoCollapsed || <div className="w-8 h-8 bg-[#0353a4] rounded-lg" />
        ) : (
          logo || (
            <span className="text-lg font-bold text-[#003559]">Gimbal</span>
          )
        )}
        {!collapsed && onCollapsedChange && (
          <CollapseButton collapsed={collapsed} onClick={handleToggleCollapse} />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map(item => (
          <NavItemComponent key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className={[
          'p-3 border-t border-[#e0e0e0]',
          collapsed ? 'flex justify-center' : '',
        ].join(' ')}>
          {footer}
        </div>
      )}

      {/* Collapsed expand button */}
      {collapsed && onCollapsedChange && (
        <div className="p-3 border-t border-[#e0e0e0] flex justify-center">
          <CollapseButton collapsed={collapsed} onClick={handleToggleCollapse} />
        </div>
      )}
    </aside>
  );
}

export default Sidebar;

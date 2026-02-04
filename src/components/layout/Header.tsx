import type { ReactNode } from 'react';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';

// =============================================================================
// Types
// =============================================================================

export interface HeaderUser {
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

export interface HeaderProps {
  /** Current page title */
  title?: string;
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Current user info */
  user?: HeaderUser | null;
  /** Called when user menu item is clicked */
  onUserAction?: (action: 'profile' | 'settings' | 'logout') => void;
  /** Called when mobile menu button is clicked */
  onMobileMenuClick?: () => void;
  /** Whether to show mobile menu button */
  showMobileMenu?: boolean;
  /** Custom actions to show in header */
  actions?: ReactNode;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

interface BreadcrumbsProps {
  items: NonNullable<HeaderProps['breadcrumbs']>;
}

function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {index > 0 && (
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {item.href ? (
            <a
              href={item.href}
              className="text-gray-500 hover:text-[#0353a4] transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-[#003559] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

interface UserMenuProps {
  user: HeaderUser;
  onAction?: HeaderProps['onUserAction'];
}

function UserMenu({ user, onAction }: UserMenuProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        className={[
          'flex items-center gap-3 p-1.5 rounded-lg',
          'hover:bg-[#b9d6f2]/30 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[#0353a4]',
        ].join(' ')}
        aria-haspopup="true"
      >
        <Avatar
          src={user.avatarUrl}
          name={user.name}
          size="sm"
        />
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-[#003559] truncate max-w-[120px]">
            {user.name}
          </p>
          {user.role && (
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          )}
        </div>
        <svg
          className="hidden md:block w-4 h-4 text-gray-500"
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
      </button>

      {/* Dropdown menu */}
      <div
        className={[
          'absolute right-0 top-full mt-1 w-56 py-1',
          'bg-white rounded-lg border border-[#e0e0e0] shadow-lg',
          'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
          'transition-all duration-200',
          'z-50',
        ].join(' ')}
        role="menu"
      >
        {/* User info */}
        <div className="px-4 py-3 border-b border-[#e0e0e0]">
          <p className="text-sm font-medium text-[#003559] truncate">{user.name}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>

        {/* Menu items */}
        <div className="py-1">
          <button
            type="button"
            onClick={() => onAction?.('profile')}
            className="w-full px-4 py-2 text-sm text-left text-[#003559] hover:bg-[#b9d6f2]/30 transition-colors"
            role="menuitem"
          >
            Your Profile
          </button>
          <button
            type="button"
            onClick={() => onAction?.('settings')}
            className="w-full px-4 py-2 text-sm text-left text-[#003559] hover:bg-[#b9d6f2]/30 transition-colors"
            role="menuitem"
          >
            Settings
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-[#e0e0e0] py-1">
          <button
            type="button"
            onClick={() => onAction?.('logout')}
            className="w-full px-4 py-2 text-sm text-left text-[#d32f2f] hover:bg-[#d32f2f]/10 transition-colors"
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileMenuButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'lg:hidden p-2 rounded-lg text-gray-500',
        'hover:bg-[#b9d6f2]/30 hover:text-[#003559]',
        'focus:outline-none focus:ring-2 focus:ring-[#0353a4]',
        'transition-colors',
      ].join(' ')}
      aria-label="Open menu"
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Header component for the application layout.
 *
 * @example
 * <Header
 *   title="Dashboard"
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 *   onUserAction={handleUserAction}
 * />
 *
 * @example
 * // With breadcrumbs and actions
 * <Header
 *   breadcrumbs={[
 *     { label: 'Campaigns', href: '/campaigns' },
 *     { label: 'New Campaign' },
 *   ]}
 *   actions={<Button>Create Campaign</Button>}
 * />
 */
export function Header({
  title,
  breadcrumbs,
  user,
  onUserAction,
  onMobileMenuClick,
  showMobileMenu = true,
  actions,
  className = '',
}: HeaderProps) {
  return (
    <header
      className={[
        'flex items-center justify-between h-16 px-4 lg:px-6',
        'bg-white border-b border-[#e0e0e0]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {showMobileMenu && <MobileMenuButton onClick={onMobileMenuClick} />}

        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} />
        ) : title ? (
          <h1 className="text-lg font-semibold text-[#003559]">{title}</h1>
        ) : null}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Custom actions */}
        {actions}

        {/* Notifications button (placeholder) */}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Notifications"
          className="relative"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"
              clipRule="evenodd"
            />
          </svg>
        </Button>

        {/* User menu */}
        {user && <UserMenu user={user} onAction={onUserAction} />}
      </div>
    </header>
  );
}

export default Header;

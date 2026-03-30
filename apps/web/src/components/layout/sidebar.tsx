'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Gavel,
  ClipboardCheck,
  Award,
  FileSignature,
  Users,
  BarChart3,
  BookTemplate,
  Calendar,
  Building2,
  Layers,
  UserCog,
  Database,
  Code2,
  Bot,
  BookOpen,
} from 'lucide-react';
import { useSidebar } from './sidebar-context';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from '@/hooks/useTranslations';

interface NavItemConfig {
  nameKey: string;
  fallback: string;
  href: string;
  icon: React.ElementType;
}

// No hardcoded role arrays — visibility is driven by canAccess()
// which checks the user's permissions from the role_permissions DB table.
const navigation: NavItemConfig[] = [
  { nameKey: 'nav.dashboard', fallback: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { nameKey: 'nav.events', fallback: 'Events', href: '/events', icon: FileText },
  { nameKey: 'nav.evaluations', fallback: 'Evaluations', href: '/evaluations', icon: ClipboardCheck },
  { nameKey: 'nav.awards', fallback: 'Awards', href: '/awards', icon: Award },
  { nameKey: 'nav.contracts', fallback: 'Contracts', href: '/contracts', icon: FileSignature },
  { nameKey: 'nav.templates', fallback: 'Templates', href: '/templates', icon: BookTemplate },
  { nameKey: 'nav.deadlines', fallback: 'Deadlines', href: '/deadlines', icon: Calendar },
  { nameKey: 'nav.suppliers', fallback: 'Suppliers', href: '/suppliers', icon: Users },
  { nameKey: 'nav.analytics', fallback: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const adminNav: NavItemConfig[] = [
  { nameKey: 'nav.organisations', fallback: 'Organisations', href: '/admin/organisations', icon: Building2 },
  { nameKey: 'nav.businessUnits', fallback: 'Business Units', href: '/admin/business-units', icon: Layers },
  { nameKey: 'nav.usersRoles', fallback: 'Users & Roles', href: '/admin/users', icon: UserCog },
  { nameKey: 'nav.masterData', fallback: 'Master Data', href: '/admin/master-data', icon: Database },
  { nameKey: 'nav.devProgress', fallback: 'Dev Progress', href: '/admin/dev-progress', icon: Code2 },
  { nameKey: 'nav.testReports', fallback: 'Test Reports', href: '/admin/test-reports', icon: Bot },
  { nameKey: 'nav.userGuide', fallback: 'User Guide', href: '/admin/user-guide', icon: BookOpen },
];

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium tracking-[0.01em] transition-all duration-150 ${
        isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] flex-shrink-0 ${
          isActive ? 'text-blue-600' : 'text-gray-400'
        }`}
        strokeWidth={isActive ? 2 : 1.8}
      />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const { canAccess, loading } = useAuth();
  const t = useTranslations('nav');

  // Filter nav items by user's DB-driven permissions (via canAccess)
  const visibleNav = navigation.filter((item) => canAccess(item.href));
  const visibleAdminNav = adminNav.filter((item) => canAccess(item.href));

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={close}
        />
      )}

      <aside
        className={`
          fixed top-[60px] h-[calc(100vh-60px)] w-[260px] bg-white border-e border-gray-200 flex flex-col z-40
          transition-transform duration-200 ease-in-out
          lg:start-0 lg:w-[240px] lg:translate-x-0
          ${isOpen ? 'start-0 translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-3 px-2.5 scrollbar-none">
          {/* Main navigation — filtered by role */}
          <div className="space-y-px">
            {visibleNav.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.nameKey.replace('nav.', ''), item.fallback)}
                  isActive={isActive}
                  onClick={close}
                />
              );
            })}
          </div>

          {/* Administration section — only if user has admin items */}
          {visibleAdminNav.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 px-3 mb-1.5">
                {t('administration', 'Administration')}
              </p>
              <div className="space-y-px">
                {visibleAdminNav.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={t(item.nameKey.replace('nav.', ''), item.fallback)}
                      isActive={isActive}
                      onClick={close}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-[11px] font-medium text-gray-400 tracking-wide">v1.0.0 — Launch</p>
        </div>
      </aside>
    </>
  );
}

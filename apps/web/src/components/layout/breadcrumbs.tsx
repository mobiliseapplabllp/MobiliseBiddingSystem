'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  events: 'Events',
  auctions: 'Auctions',
  evaluations: 'Evaluations',
  awards: 'Awards',
  contracts: 'Contracts',
  suppliers: 'Suppliers',
  analytics: 'Analytics',
  admin: 'Admin',
  organisations: 'Organisations',
  'business-units': 'Business Units',
  users: 'Users & Roles',
  'dev-progress': 'Dev Progress',
  'test-reports': 'Test Reports',
  invitations: 'Invitations',
  bids: 'Bids',
  templates: 'Templates',
  'master-data': 'Master Data',
  deadlines: 'Deadlines',
  settings: 'Settings',
  notifications: 'Notifications',
  profile: 'Profile',
  create: 'Create',
  edit: 'Edit',
  new: 'New',
};

function toLabel(segment: string): string {
  return labelMap[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const t = useTranslations('breadcrumbs');
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: toLabel(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href="/dashboard"
        className="text-text-secondary hover:text-accent transition-colors"
        aria-label={t('home')}
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-text-disabled" />
          {crumb.isLast ? (
            <span className="text-text-primary font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-text-secondary hover:text-accent transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

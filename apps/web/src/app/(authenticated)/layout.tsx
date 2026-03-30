'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { useTranslations } from '@/hooks/useTranslations';
import { AuthProvider } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { AICopilot } from '@/components/ai/ai-copilot';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  return (
    <AuthProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-gray-50">
          <Topbar />
          <Sidebar />
          <div className="lg:ms-[240px] pt-[60px] min-h-screen flex flex-col">
            <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-2.5">
              <Breadcrumbs />
            </div>
            <main className="flex-1 p-4 lg:p-6">
              {children}
            </main>
          </div>
          <AICopilot />
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}

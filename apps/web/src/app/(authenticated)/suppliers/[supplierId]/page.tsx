'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  ArrowLeft, Building2, AlertCircle, Globe, Mail, Phone,
  MapPin, Calendar, Shield, FileText, Star,
} from 'lucide-react';

interface SupplierProfile {
  id: string;
  name: string;
  tradeName: string | null;
  registrationNumber: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  description: string | null;
  status: string;
  categories: string[];
  certifications: string[];
  yearEstablished: number | null;
  employeeCount: number | null;
  annualRevenue: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-error/10 text-error',
  SUSPENDED: 'bg-error/10 text-error',
  ACTIVE: 'bg-success/10 text-success',
};

export default function SupplierDetailPage() {
  const t = useTranslations('suppliers');
  const params = useParams();
  const supplierId = params.supplierId as string;
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<SupplierProfile>(`/supplier-portal/profiles/${supplierId}`)
      .then(setSupplier)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [supplierId]);

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse space-y-6">
        <div className="h-8 w-48 bg-bg-subtle rounded" />
        <div className="h-[300px] bg-bg-subtle rounded-xl" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="max-w-4xl">
        <div className="bg-error/5 border border-error/20 rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-error mx-auto mb-3" />
          <p className="text-text-primary font-semibold">{error || 'Supplier not found'}</p>
          <Link href="/suppliers" className="btn-secondary mt-4 inline-flex">{t('title', 'Suppliers')}</Link>
        </div>
      </div>
    );
  }

  const initials = supplier.name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/suppliers" className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-accent transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('title', 'Suppliers')}
        </Link>
      </div>

      {/* Profile Card */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden mb-6">
        <div className="h-20 relative" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
          <div className="absolute -bottom-8 start-6">
            <div className="h-16 w-16 rounded-xl flex items-center justify-center text-[18px] font-bold text-white border-4 border-bg-surface shadow-lg bg-success-dark"
              style={{ background: 'linear-gradient(135deg, #047857 0%, #059669 100%)' }}
            >
              {initials}
            </div>
          </div>
        </div>
        <div className="pt-12 px-6 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[20px] font-bold text-text-primary">{supplier.name}</h1>
              {supplier.tradeName && <p className="text-[13px] text-text-muted mt-0.5">{supplier.tradeName}</p>}
              {supplier.description && <p className="text-[13px] text-text-secondary mt-2 max-w-xl">{supplier.description}</p>}
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[supplier.status] ?? 'bg-bg-subtle text-text-muted'}`}>
              {supplier.status}
            </span>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Contact Info */}
        <div className="bg-bg-surface border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-bold text-text-primary">Contact Information</h2>
          </div>
          <div className="divide-y divide-border">
            {supplier.contactEmail && (
              <div className="px-5 py-3 flex items-center gap-3">
                <Mail className="h-4 w-4 text-text-muted shrink-0" />
                <div><p className="text-[11px] text-text-muted uppercase">Email</p><p className="text-[13px] text-text-primary">{supplier.contactEmail}</p></div>
              </div>
            )}
            {supplier.contactPhone && (
              <div className="px-5 py-3 flex items-center gap-3">
                <Phone className="h-4 w-4 text-text-muted shrink-0" />
                <div><p className="text-[11px] text-text-muted uppercase">Phone</p><p className="text-[13px] text-text-primary">{supplier.contactPhone}</p></div>
              </div>
            )}
            {supplier.website && (
              <div className="px-5 py-3 flex items-center gap-3">
                <Globe className="h-4 w-4 text-text-muted shrink-0" />
                <div><p className="text-[11px] text-text-muted uppercase">Website</p><p className="text-[13px] text-accent">{supplier.website}</p></div>
              </div>
            )}
            {(supplier.city || supplier.country) && (
              <div className="px-5 py-3 flex items-center gap-3">
                <MapPin className="h-4 w-4 text-text-muted shrink-0" />
                <div><p className="text-[11px] text-text-muted uppercase">Location</p><p className="text-[13px] text-text-primary">{[supplier.city, supplier.country].filter(Boolean).join(', ')}</p></div>
              </div>
            )}
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-bg-surface border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-bold text-text-primary">Company Information</h2>
          </div>
          <div className="divide-y divide-border">
            {supplier.registrationNumber && (
              <div className="px-5 py-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-text-muted shrink-0" />
                <div><p className="text-[11px] text-text-muted uppercase">Registration No.</p><p className="text-[13px] text-text-primary">{supplier.registrationNumber}</p></div>
              </div>
            )}
            {supplier.yearEstablished && (
              <div className="px-5 py-3 flex items-center gap-3">
                <Calendar className="h-4 w-4 text-text-muted shrink-0" />
                <div><p className="text-[11px] text-text-muted uppercase">Established</p><p className="text-[13px] text-text-primary">{supplier.yearEstablished}</p></div>
              </div>
            )}
            {supplier.employeeCount && (
              <div className="px-5 py-3 flex items-center gap-3">
                <Building2 className="h-4 w-4 text-text-muted shrink-0" />
                <div><p className="text-[11px] text-text-muted uppercase">Employees</p><p className="text-[13px] text-text-primary">{supplier.employeeCount.toLocaleString()}</p></div>
              </div>
            )}
            <div className="px-5 py-3 flex items-center gap-3">
              <Calendar className="h-4 w-4 text-text-muted shrink-0" />
              <div><p className="text-[11px] text-text-muted uppercase">Registered Since</p><p className="text-[13px] text-text-primary">{formatDate(supplier.createdAt)}</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories & Certifications */}
      {(supplier.categories?.length > 0 || supplier.certifications?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {supplier.categories?.length > 0 && (
            <div className="bg-bg-surface border border-border rounded-xl shadow-card">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-[14px] font-bold text-text-primary">Categories</h2>
              </div>
              <div className="p-5 flex flex-wrap gap-2">
                {supplier.categories.map((cat, i) => (
                  <span key={i} className="text-[12px] font-medium text-accent bg-accent/5 px-2.5 py-1 rounded-full border border-accent/20">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
          {supplier.certifications?.length > 0 && (
            <div className="bg-bg-surface border border-border rounded-xl shadow-card">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
                  <Shield className="h-4 w-4 text-text-muted" /> Certifications
                </h2>
              </div>
              <div className="p-5 flex flex-wrap gap-2">
                {supplier.certifications.map((cert, i) => (
                  <span key={i} className="text-[12px] font-medium text-success bg-success/5 px-2.5 py-1 rounded-full border border-success/20">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

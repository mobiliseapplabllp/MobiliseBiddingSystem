'use client';

import { useState } from 'react';
import {
  X, Gavel, FileText, Users, BarChart3, ChevronRight, CheckCircle2, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const STORAGE_KEY = 'esourcing_onboarding_complete';

export function useOnboarding() {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(STORAGE_KEY);
  });

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }

  return { show, dismiss };
}

interface OnboardingWizardProps {
  onDismiss: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to eSourcing',
    subtitle: 'Your enterprise procurement platform',
    content: (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Gavel className="w-8 h-8 text-primary" />
        </div>
        <p className="text-body text-text-muted max-w-sm mx-auto">
          eSourcing helps you run RFx events, reverse auctions, evaluate bids, and manage awards —
          all in one platform built for enterprise procurement.
        </p>
      </div>
    ),
  },
  {
    id: 'events',
    title: 'Create RFx Events',
    subtitle: 'Manage RFI, RFP, RFQ, and ITT events',
    content: (
      <div className="space-y-3">
        {[
          { icon: FileText, label: 'RFI', desc: 'Gather market information from suppliers' },
          { icon: FileText, label: 'RFP', desc: 'Request proposals for complex requirements' },
          { icon: FileText, label: 'RFQ', desc: 'Get competitive price quotes quickly' },
          { icon: FileText, label: 'ITT', desc: 'Formal tender for high-value contracts' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-subtle">
            <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-semibold text-text-primary">{label}</span>
              <span className="text-xs text-text-muted ms-2">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'suppliers',
    title: 'Invite Suppliers',
    subtitle: 'Token-based secure supplier portal',
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">Invite by email</p>
            <p className="text-xs text-text-muted">Suppliers receive a secure one-time portal link — no account required</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">Suppliers submit bids</p>
            <p className="text-xs text-text-muted">Structured bid forms with line items, pricing, and attachments</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">Compare bids side-by-side</p>
            <p className="text-xs text-text-muted">Ranked bid view makes it easy to evaluate and shortlist</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">Multi-user evaluation</p>
            <p className="text-xs text-text-muted">Invite evaluators to score bids blind and reach consensus</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'getstarted',
    title: "You're all set!",
    subtitle: 'Start your first procurement event',
    content: (
      <div className="text-center py-2 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-body text-text-muted">
          You can always find this guide again in the Help section. Here are some quick links to get started:
        </p>
        <div className="grid grid-cols-2 gap-3 text-start">
          <Link href="/events/create" className="p-3 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors group">
            <FileText className="w-5 h-5 text-primary mb-1.5" />
            <p className="text-sm font-medium text-text-primary group-hover:text-primary">Create Event</p>
            <p className="text-xs text-text-muted">Start a new RFx</p>
          </Link>
          <Link href="/templates" className="p-3 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors group">
            <BarChart3 className="w-5 h-5 text-primary mb-1.5" />
            <p className="text-sm font-medium text-text-primary group-hover:text-primary">Use a Template</p>
            <p className="text-xs text-text-muted">Speed up event creation</p>
          </Link>
        </div>
      </div>
    ),
  },
];

export function OnboardingWizard({ onDismiss }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface rounded-xl border border-border shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-sub-section text-text-primary">{current.title}</h2>
            <p className="text-xs text-text-muted">{current.subtitle}</p>
          </div>
          <button onClick={onDismiss} className="p-1 text-text-muted hover:text-text-primary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{current.content}</div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-5">
          {/* Step dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-3 py-1.5 text-sm border border-border text-text-secondary rounded-md hover:bg-bg-subtle"
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={onDismiss}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm rounded-md font-medium hover:bg-primary/90"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm rounded-md font-medium hover:bg-primary/90"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

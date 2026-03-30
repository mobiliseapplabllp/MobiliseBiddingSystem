'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  BookOpen, Play, Download, ChevronDown, ChevronUp,
  Loader2, Bot, FileText, Gavel, ClipboardCheck, Award,
  FileSignature, Building2, Settings, BarChart3, Bell, Users, Layers,
  ListChecks,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DemoVideo {
  filename: string;
  slug: string;
  title: string;
  description: string;
  duration: string;
  section: string;
}

// ─── Section Config ─────────────────────────────────────────────────────────

const SECTIONS: { key: string; label: string; icon: typeof FileText; steps: string[] }[] = [
  {
    key: 'getting-started', label: 'Getting Started', icon: BookOpen,
    steps: [
      'Navigate to the login page at /login',
      'Enter your email and password (e.g., admin@esourcing.com / admin123)',
      'Click "Sign In" to access the dashboard',
      'The dashboard shows KPIs, recent activity, pending actions, and upcoming deadlines',
      'Use the sidebar to navigate between modules',
    ],
  },
  {
    key: 'events', label: 'Events & RFx', icon: FileText,
    steps: [
      'Go to Events from the sidebar to see all sourcing events',
      'Click "New Event" to open the 5-tab creation wizard',
      'Select event type: RFI, RFP, RFQ, ITT, or Auction',
      'Fill in title, description, currency, estimated value, and deadlines',
      'Add lots and line items in the Items tab',
      'Save as Draft or Publish directly',
      'Use "Create with AI" for AI-assisted event generation',
    ],
  },
  {
    key: 'templates', label: 'Templates', icon: Layers,
    steps: [
      'Go to Templates from the sidebar',
      '7 pre-built templates are available (one per event type)',
      'Click "Use Template" to create a new event from a template',
      'Click "New Template" to create your own reusable template',
    ],
  },
  {
    key: 'evaluations', label: 'Evaluations', icon: ClipboardCheck,
    steps: [
      'Go to Evaluations from the sidebar',
      'Click "New Evaluation" to create an evaluation for a closed event',
      'Select the RFx event, define envelope type (Single/Double/Three)',
      'Set technical and commercial weight percentages',
      'Add evaluation criteria with name, description, weight, and max score',
      'Use "AI Suggest" to auto-generate criteria based on event type',
    ],
  },
  {
    key: 'awards-contracts', label: 'Awards & Contracts', icon: Award,
    steps: [
      'Go to Awards to view and manage award recommendations',
      'Awards go through an approval workflow: Draft → Pending → Approved/Rejected',
      'Go to Contracts to track contract lifecycle',
      'View contract details: value, dates, payment terms, amendments',
    ],
  },
  {
    key: 'suppliers', label: 'Suppliers', icon: Building2,
    steps: [
      'Go to Suppliers from the sidebar to view the supplier directory',
      'Search suppliers by name, category, or location',
      'Click a supplier to view their full profile: contact info, company details, certifications',
    ],
  },
  {
    key: 'admin', label: 'Administration', icon: Users,
    steps: [
      'Organisations: Manage tenant organisations and business units',
      'Users & Roles: View all users, assign roles, manage permissions',
      'Master Data: Configure currencies, countries, UOMs, payment terms, and more',
      'Dev Progress: Track sprint progress and run robot tests',
      'Test Reports: View test execution history with screenshots',
    ],
  },
  {
    key: 'settings', label: 'Settings & Preferences', icon: Settings,
    steps: [
      'Click the gear icon in the topbar or go to Settings',
      'General tab: Choose Light/Dark theme, set timezone and date format',
      'Notifications tab: Toggle email and in-app notifications for 16 event types',
      'Security tab: Change password, view MFA status',
      'Profile: View your account info at /profile',
    ],
  },
  {
    key: 'analytics', label: 'Analytics & Deadlines', icon: BarChart3,
    steps: [
      'Analytics: View spend overview, event statistics, and procurement metrics',
      'Deadlines: Track upcoming submission deadlines with KPI cards',
      'Filter deadlines by search, view overdue and due-this-week counts',
    ],
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function UserGuidePage() {
  const t = useTranslations('userGuide');

  const [videos, setVideos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get<DemoVideo[]>('/system/demo-videos')
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  // Poll during recording
  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(async () => {
      try {
        const vids = await api.get<DemoVideo[]>('/system/demo-videos');
        setVideos(vids);
      } catch { /* ignore */ }
    }, 5000);
    // Auto-stop after 10 min
    const timeout = setTimeout(() => setRecording(false), 600000);
    return () => { clearInterval(iv); clearTimeout(timeout); };
  }, [recording]);

  const startRecording = async () => {
    try {
      await api.post('/system/record-demos');
      setRecording(true);
    } catch { /* ignore */ }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sectionVideos = (sectionKey: string) => videos.filter((v) => v.section === sectionKey);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-page-title text-text-primary">{t('title')}</h1>
          <p className="text-text-muted text-body mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={startRecording}
          disabled={recording}
          className="btn-primary flex items-center gap-2"
        >
          {recording ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {recording ? t('recording') : t('recordDemos')}
        </button>
      </div>

      {/* Recording banner */}
      {recording && (
        <div className="mb-6 bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-accent animate-spin" />
          <div>
            <p className="text-[13px] font-semibold text-text-primary">{t('recording')}</p>
            <p className="text-[12px] text-text-muted">{t('recordingDesc')}</p>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const expanded = expandedSections.has(section.key);
          const sectionVids = sectionVideos(section.key);

          return (
            <div key={section.key} className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-bg-subtle/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="text-start">
                    <h2 className="text-[14px] font-bold text-text-primary">{section.label}</h2>
                    <p className="text-[11px] text-text-muted">
                      {sectionVids.length > 0 ? `${sectionVids.length} video${sectionVids.length > 1 ? 's' : ''}` : 'Written guide'}
                      {' · '}{section.steps.length} steps
                    </p>
                  </div>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
              </button>

              {/* Expanded content */}
              {expanded && (
                <div className="border-t border-border">
                  {/* Videos */}
                  {sectionVids.length > 0 && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sectionVids.map((video) => (
                        <div key={video.slug} className="border border-border rounded-lg overflow-hidden">
                          {/* Video player or placeholder */}
                          {playingVideo === video.slug ? (
                            <video
                              src={`${API_BASE}/system/demo-videos/${video.filename}`}
                              controls
                              autoPlay
                              className="w-full aspect-video bg-black"
                            />
                          ) : (
                            <button
                              onClick={() => setPlayingVideo(video.slug)}
                              className="w-full aspect-video bg-gradient-to-br from-accent/10 to-accent/5 flex flex-col items-center justify-center gap-2 hover:from-accent/15 hover:to-accent/10 transition-colors"
                            >
                              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                                <Play className="h-5 w-5 text-accent ms-0.5" />
                              </div>
                              <span className="text-[11px] text-accent font-medium">{t('playVideo')}</span>
                            </button>
                          )}
                          {/* Info */}
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-[13px] font-semibold text-text-primary">{video.title}</h3>
                              <span className="text-[10px] text-text-muted font-mono">{video.duration}</span>
                            </div>
                            <p className="text-[11px] text-text-muted line-clamp-2">{video.description}</p>
                            <a
                              href={`${API_BASE}/system/demo-videos/${video.filename}`}
                              download
                              className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-dark font-medium transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              {t('downloadVideo')}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Written steps */}
                  <div className="px-5 py-3 border-t border-border">
                    <button
                      onClick={() => setShowSteps((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
                      className="text-[12px] text-accent hover:text-accent-dark font-medium flex items-center gap-1 transition-colors"
                    >
                      <ListChecks className="h-3.5 w-3.5" />
                      {showSteps[section.key] ? t('hideSteps') : t('viewSteps')}
                    </button>
                    {showSteps[section.key] && (
                      <ol className="mt-3 space-y-2">
                        {section.steps.map((stepText, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-[13px] text-text-secondary leading-relaxed">{stepText}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state when no videos */}
      {!loading && videos.length === 0 && (
        <div className="mt-6 bg-bg-surface border border-border rounded-xl p-8 text-center">
          <Bot className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-[15px] font-semibold text-text-primary mb-1">{t('noVideos')}</p>
          <p className="text-[13px] text-text-muted">{t('noVideosHint')}</p>
        </div>
      )}
    </div>
  );
}

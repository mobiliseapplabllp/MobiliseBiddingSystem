'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { useTranslations } from '@/hooks/useTranslations';
import { Gavel, Check, Shield, Zap, ChevronRight, Loader2 } from 'lucide-react';

const FEATURES = [
  'Run RFx events, reverse auctions & sealed bids',
  'Multi-criteria evaluation with weighted scoring',
  'Contract lifecycle & supplier performance tracking',
  'Enterprise-grade multi-tenancy with RLS security',
];

const STATS = [
  { value: '500+', label: 'Organisations' },
  { value: '26', label: 'Modules' },
  { value: '99.9%', label: 'Uptime SLA' },
];

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ── */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #071F35 0%, #0F3557 45%, #1a4f82 100%)' }}
      >
        <div
          className="absolute -top-32 -start-32 h-[500px] w-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 end-0 h-[400px] w-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #818CF8 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 60%)' }}
        />

        <div className="relative flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center shadow-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #818CF8 100%)' }}
          >
            <Gavel className="h-[22px] w-[22px] text-white" />
          </div>
          <div>
            <p className="font-bold text-[18px] text-white leading-tight tracking-tight">eSourcing</p>
            <p className="text-[11px] text-white/40 leading-none tracking-widest uppercase">Enterprise Platform</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-white text-[34px] font-bold leading-[1.2] tracking-tight max-w-md">
            Smarter Procurement.{' '}
            <span style={{ color: '#818CF8' }}>Faster Decisions.</span>
          </h2>
          <p className="text-white/60 mt-4 text-[14px] leading-relaxed max-w-sm">
            One platform for RFx events, reverse auctions, bid evaluation, award management,
            and contract lifecycle — built for enterprise procurement teams.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.25)' }}>
                  <Check className="h-3 w-3 text-blue-400" />
                </span>
                <span className="text-white/75 text-[13.5px] leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="flex items-center gap-8 mb-6">
            {STATS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-8">
                <div>
                  <p className="text-white text-[26px] font-bold font-mono leading-none">{s.value}</p>
                  <p className="text-white/45 text-[11px] mt-1 uppercase tracking-wider">{s.label}</p>
                </div>
                {i < STATS.length - 1 && <div className="h-8 w-px bg-white/10" />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-white/30" />
            <p className="text-white/30 text-[11px]">SOC 2 Type II · ISO 27001 · GDPR Compliant</p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center bg-gray-50 p-6 sm:p-8">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #818CF8 100%)' }}>
              <Gavel className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="font-bold text-[17px] text-gray-900 tracking-tight">eSourcing</span>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-[0_4px_24px_0_rgba(0,0,0,0.07)]">
            <div className="mb-7">
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Welcome back</h1>
              <p className="text-[13.5px] text-gray-500 mt-1">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div id="login-error" role="alert" aria-live="polite" className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-[13px] font-semibold text-gray-700 mb-1.5">Email address</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full h-[42px] px-3.5 rounded-lg border border-gray-200 bg-gray-50 text-[13.5px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-[13px] font-semibold text-gray-700">Password</label>
                  <button type="button" className="text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors">Forgot password?</button>
                </div>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full h-[42px] px-3.5 rounded-lg border border-gray-200 bg-gray-50 text-[13.5px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full h-[42px] rounded-lg text-[13.5px] font-semibold text-white flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                style={{ background: loading ? '#93C5FD' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  <>Sign in <ChevronRight className="h-4 w-4" /></>
                )}
              </button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-gray-400 font-medium">or</span>
                </div>
              </div>

              <button type="button" className="w-full h-[42px] rounded-lg border border-gray-200 bg-white text-[13.5px] font-medium text-gray-700 flex items-center justify-center gap-2.5 hover:bg-gray-50 hover:border-gray-300 transition-all">
                <svg className="h-4 w-4" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                  <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2c-7.7 0-14.3 4.9-17.7 12.7z"/>
                  <path fill="#FBBC05" d="M24 46c5.9 0 10.9-2 14.5-5.4l-6.7-5.5C29.9 36.8 27.1 38 24 38c-6.1 0-11.3-4.1-13.2-9.8l-6.9 5.3C7.8 41.2 15.3 46 24 46z"/>
                  <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1 3-3.3 5.4-6.3 6.8l6.7 5.5c3.9-3.6 6.3-9 6.3-15.8 0-1.3-.2-2.7-.5-4z"/>
                </svg>
                Continue with Single Sign-On (SSO)
              </button>
            </form>

            <div className="mt-5 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 flex items-start gap-2.5">
              <Zap className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11.5px] font-semibold text-blue-700">Demo credentials</p>
                <p className="text-[11.5px] text-blue-600 mt-0.5 font-mono">admin@esourcing.com&nbsp;&nbsp;/&nbsp;&nbsp;admin123</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <p className="text-[11px] text-gray-400">&copy; {new Date().getFullYear()} eSourcing Platform</p>
            <span className="text-gray-300">·</span>
            <button className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">Privacy</button>
            <span className="text-gray-300">·</span>
            <button className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">Terms</button>
            <span className="text-gray-300">·</span>
            <button className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">Support</button>
          </div>
        </div>
      </div>
    </div>
  );
}

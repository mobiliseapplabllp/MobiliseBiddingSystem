/**
 * eSourcing Platform — Demo Video Recorder
 *
 * Records 12 silent MP4/WebM screen capture videos — one per module.
 * Each video has text overlay captions explaining what's happening.
 * Videos are saved to e2e/demo-videos/ for the User Guide page.
 *
 * Run: npx playwright test e2e/demo-recorder.spec.ts --headed
 */

import { test, type BrowserContext, type Page } from '@playwright/test';
import { renameSync, existsSync, mkdirSync } from 'fs';

const WEB = 'http://localhost:3000';
const OUTPUT_DIR = 'e2e/demo-videos';

const ADMIN = { email: 'admin@esourcing.com', password: 'admin123' };

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Shared context (no video — each test creates its own page with video) ──

let context: BrowserContext;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
});
test.afterAll(async () => { await context?.close(); });

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createRecordingPage(filename: string): Promise<Page> {
  const ctx = await context.browser()!.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1440, height: 900 } },
  });
  const page = await ctx.newPage();
  // Store filename for renaming after close
  (page as any)._demoFilename = filename;
  (page as any)._demoContext = ctx;
  return page;
}

async function closePage(page: Page) {
  const filename = (page as any)._demoFilename;
  const ctx = (page as any)._demoContext;
  const videoPath = await page.video()?.path();
  await page.close();
  await ctx.close();
  // Rename generated video file to clean slug
  if (videoPath && existsSync(videoPath)) {
    const ext = videoPath.endsWith('.webm') ? '.webm' : '.mp4';
    const target = `${OUTPUT_DIR}/${filename}${ext}`;
    try { renameSync(videoPath, target); } catch { /* may already be renamed */ }
  }
}

async function login(page: Page) {
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('esourcing_onboarding_complete', '1'));
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

async function go(page: Page, path: string) {
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function caption(page: Page, text: string) {
  await page.evaluate((t) => {
    let el = document.getElementById('demo-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-caption';
      el.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);z-index:99999;background:rgba(0,0,0,0.88);color:#fff;font-size:16px;font-weight:600;padding:12px 32px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.4);transition:opacity 0.3s;font-family:Inter,system-ui,sans-serif;max-width:80%;text-align:center;';
      document.body.appendChild(el);
    }
    el.textContent = t;
    el.style.opacity = '1';
  }, text);
  await page.waitForTimeout(2500);
}

async function hideCaption(page: Page) {
  await page.evaluate(() => {
    const el = document.getElementById('demo-caption');
    if (el) el.style.opacity = '0';
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
test.describe.configure({ mode: 'serial' });
// ═══════════════════════════════════════════════════════════════════════════════

test('01 — Login & Dashboard', async () => {
  const page = await createRecordingPage('01-login-dashboard');
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('esourcing_onboarding_complete', '1'));
  await caption(page, '📋 eSourcing Platform — Sign In');
  await page.fill('input[type="email"]', ADMIN.email);
  await page.waitForTimeout(800);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.waitForTimeout(800);
  await caption(page, 'Enter credentials and sign in');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await caption(page, '📊 Dashboard — KPIs, Activity & Deadlines');
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 400));
  await caption(page, 'Recent Activity & Pending Actions');
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 400));
  await caption(page, 'Upcoming Deadlines & Live Auctions');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('02 — Create RFQ Event', async () => {
  const page = await createRecordingPage('02-create-rfq');
  await login(page);
  await go(page, '/events/create');
  await caption(page, '📝 Create a New RFQ Event');
  await page.waitForTimeout(1500);
  const rfq = page.locator('button:has-text("RFQ")').first();
  if (await rfq.isVisible()) await rfq.click();
  await caption(page, 'Step 1: Select RFQ Event Type');
  await page.waitForTimeout(1500);
  const title = page.locator('input').first();
  await title.fill('Office Equipment Procurement — Q2 2026');
  await caption(page, 'Step 2: Enter Event Title');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollBy(0, 300));
  await caption(page, 'Step 3: Set Currency, Value & Deadlines');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('03 — Create Reverse Auction', async () => {
  const page = await createRecordingPage('03-create-auction');
  await login(page);
  await go(page, '/events/create');
  await caption(page, '🔨 Create a Reverse Auction');
  const btn = page.locator('button:has-text("Reverse Auction")').first();
  if (await btn.isVisible()) await btn.click();
  await caption(page, 'Select Reverse Auction Type');
  await page.waitForTimeout(1500);
  const title = page.locator('input').first();
  await title.fill('IT Hardware — Competitive Bidding');
  await caption(page, 'Configure Auction Title & Rules');
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 400));
  await caption(page, 'Set Bidding Period & Extension Rules');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('04 — Templates', async () => {
  const page = await createRecordingPage('04-templates');
  await login(page);
  await go(page, '/templates');
  await caption(page, '📂 RFx Templates Library');
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 300));
  await caption(page, '7 Pre-Built Templates — One per Event Type');
  await page.waitForTimeout(2000);
  await caption(page, 'Click "Use Template" to Create an Event Instantly');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('05 — Evaluations', async () => {
  const page = await createRecordingPage('05-evaluations');
  await login(page);
  await go(page, '/evaluations');
  await caption(page, '📋 Bid Evaluations');
  await page.waitForTimeout(2000);
  await go(page, '/evaluations/create');
  await caption(page, 'Create Evaluation — Select Event & Criteria');
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 400));
  await caption(page, 'Define Envelope Type, Weights & Scoring Criteria');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('06 — Awards & Contracts', async () => {
  const page = await createRecordingPage('06-awards-contracts');
  await login(page);
  await go(page, '/awards');
  await caption(page, '🏆 Awards Management');
  await page.waitForTimeout(2000);
  await go(page, '/contracts');
  await caption(page, '📄 Contract Lifecycle Management');
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 300));
  await caption(page, 'Track Contract Status, Value & Expiry');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('07 — Suppliers', async () => {
  const page = await createRecordingPage('07-suppliers');
  await login(page);
  await go(page, '/suppliers');
  await caption(page, '🏢 Supplier Directory');
  await page.waitForTimeout(2000);
  await caption(page, 'Search, Filter & View Supplier Profiles');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('08 — Admin: Organisations & Users', async () => {
  const page = await createRecordingPage('08-admin-orgs-users');
  await login(page);
  await go(page, '/admin/organisations');
  await caption(page, '🏛 Organisation Management');
  await page.waitForTimeout(2000);
  await go(page, '/admin/users');
  await caption(page, '👥 Users & Role Management');
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 300));
  await caption(page, 'Assign Roles & Manage Permissions');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('09 — Admin: Master Data', async () => {
  const page = await createRecordingPage('09-master-data');
  await login(page);
  await go(page, '/admin/master-data');
  await caption(page, '📚 Master Data Management');
  await page.waitForTimeout(2000);
  await go(page, '/admin/master-data/CURRENCY');
  await caption(page, 'Currencies — 40+ Global Currencies');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('10 — Settings & Profile', async () => {
  const page = await createRecordingPage('10-settings');
  await login(page);
  await go(page, '/settings');
  await caption(page, '⚙️ Settings — General, Notifications & Security');
  await page.waitForTimeout(2000);
  const notifTab = page.locator('button:has-text("Notifications")').first();
  if (await notifTab.isVisible()) await notifTab.click();
  await page.waitForTimeout(800);
  await caption(page, '🔔 16 Notification Types with Email/In-App Toggles');
  await page.waitForTimeout(2000);
  await go(page, '/profile');
  await caption(page, '👤 User Profile & Preferences');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('11 — Notifications', async () => {
  const page = await createRecordingPage('11-notifications');
  await login(page);
  await go(page, '/notifications');
  await caption(page, '🔔 Notification Center');
  await page.waitForTimeout(2000);
  await caption(page, 'Filter by Type, Mark as Read, View All');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

test('12 — Analytics & Deadlines', async () => {
  const page = await createRecordingPage('12-analytics-deadlines');
  await login(page);
  await go(page, '/analytics');
  await caption(page, '📈 Analytics Dashboard');
  await page.waitForTimeout(2000);
  await go(page, '/deadlines');
  await caption(page, '📅 Upcoming Deadlines with KPI Cards');
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 300));
  await caption(page, 'Track Overdue, Due This Week & Total');
  await page.waitForTimeout(2000);
  await hideCaption(page);
  await closePage(page);
});

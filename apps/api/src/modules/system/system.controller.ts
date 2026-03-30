import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Logger,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma.service';
import { exec } from 'child_process';
import { join } from 'path';
import { readdirSync, existsSync, readFileSync, rmSync } from 'fs';
import type { Response } from 'express';

@ApiTags('System')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system')
export class SystemController {
  private readonly logger = new Logger(SystemController.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  // ── System Info ─────────────────────────────────────────────────────────────

  @Get('info')
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get system information' })
  async getSystemInfo() {
    const modules = [
      'AuthModule', 'OrganisationsModule', 'RfxModule', 'InvitationsModule',
      'BidsModule', 'NotificationsModule', 'TemplatesModule', 'MasterDataModule',
      'AuctionsModule', 'EvaluationsModule', 'AwardsModule', 'ContractsModule',
      'SupplierPortalModule', 'AIModule', 'AnalyticsDashboardModule', 'ReportsModule',
      'NotificationCenterModule', 'CurrencyModule', 'WorkflowsModule', 'AuditModule',
      'IntegrationsModule', 'PerformanceModule', 'HealthMonitoringModule', 'SystemModule',
    ];

    let prismaModels: string[] = [];
    try {
      const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma_%' ORDER BY tablename
      `;
      prismaModels = tables.map((t) => t.tablename);
    } catch (error) {
      this.logger.error('Failed to list tables', (error as Error).stack);
    }

    return {
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      uptime: Math.round(process.uptime()),
      uptimeHuman: this.formatUptime(process.uptime()),
      modules,
      moduleCount: modules.length,
      nodeVersion: process.version,
      prismaModels,
      prismaModelCount: prismaModels.length,
      memoryUsage: {
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      startedAt: new Date(this.startTime).toISOString(),
    };
  }

  @Get('migrations')
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List all applied database migrations' })
  async getMigrations() {
    try {
      const migrations = await this.prisma.$queryRaw<Array<{ id: string; migration_name: string; started_at: Date; finished_at: Date }>>`
        SELECT id, migration_name, started_at, finished_at FROM _prisma_migrations WHERE rolled_back_at IS NULL ORDER BY started_at DESC
      `;
      return { total: migrations.length, migrations: migrations.map((m) => ({ id: m.id, name: m.migration_name, startedAt: m.started_at, finishedAt: m.finished_at })) };
    } catch {
      return { total: 0, migrations: [] };
    }
  }

  // ── Robot Test Runner (DB-persisted) ────────────────────────────────────────

  private testRunning = false;
  private liveOutput = '';
  private currentRunId: string | null = null;

  @Post('run-tests')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Trigger Playwright robot tests (non-blocking, persisted to DB)' })
  async runTests(@CurrentUser() user: JwtPayload) {
    if (this.testRunning) {
      return { status: 'already_running', runId: this.currentRunId };
    }

    // Create TestRun record
    const run = await this.prisma.testRun.create({
      data: { status: 'running', triggeredBy: user.sub, environment: process.env.NODE_ENV ?? 'development' },
    });
    this.currentRunId = run.id;
    this.testRunning = true;
    this.liveOutput = '';

    const startTime = Date.now();
    const cwd = join(process.cwd(), '..', '..');
    this.logger.log(`Starting robot tests (run ${run.id}) in ${cwd}...`);

    // Shared handler for process exit — handles close, error, and crash
    const finishRun = async (code: number | null) => {
      if (!this.testRunning) return;
      this.testRunning = false;
      const duration = Date.now() - startTime;
      const output = this.liveOutput;

      const passedCount = parseInt(output.match(/(\d+) passed/)?.[1] ?? '0', 10);
      const failedCount = parseInt(output.match(/(\d+) failed/)?.[1] ?? '0', 10);
      const skippedCount = parseInt(output.match(/(\d+) skipped/)?.[1] ?? '0', 10);

      // Parse per-suite from list output
      const suiteMap = new Map<string, { passed: number; failed: number; skipped: number }>();
      for (const match of output.matchAll(/^\s*(ok|x|[-!])\s+\d+\s+.*?› (.*?) › /gm)) {
        const s = match[1], suiteName = match[2];
        if (!suiteMap.has(suiteName)) suiteMap.set(suiteName, { passed: 0, failed: 0, skipped: 0 });
        const suite = suiteMap.get(suiteName)!;
        if (s === 'ok') suite.passed++;
        else if (s === 'x') suite.failed++;
        else suite.skipped++;
      }
      let suites: Array<{ name: string; passed: number; failed: number; skipped: number; errors?: string[] }> =
        Array.from(suiteMap.entries()).map(([name, counts]) => ({ name, ...counts }));

      // Enrich with error details from JSON report file
      try {
        const reportPath = join(cwd, 'e2e', 'test-results', 'report.json');
        if (existsSync(reportPath)) {
          const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
          const enriched = new Map<string, { passed: number; failed: number; skipped: number; errors: string[] }>();
          for (const fileSuite of report.suites ?? []) {
            for (const descSuite of fileSuite.suites ?? []) {
              for (const spec of descSuite.specs ?? []) {
                for (const t of spec.tests ?? []) {
                  const r = t.results?.[0];
                  const sName = descSuite.title;
                  if (!enriched.has(sName)) enriched.set(sName, { passed: 0, failed: 0, skipped: 0, errors: [] });
                  const e = enriched.get(sName)!;
                  if (r?.status === 'passed' || r?.status === 'expected') e.passed++;
                  else if (r?.status === 'failed' || r?.status === 'timedOut') {
                    e.failed++;
                    const msg = (r?.error?.message ?? '').split('\n')[0].substring(0, 500);
                    if (msg) e.errors.push(`${spec.title}: ${msg}`);
                  } else e.skipped++;
                }
              }
            }
          }
          if (enriched.size > 0) {
            suites = Array.from(enriched.entries()).map(([name, c]) => ({
              name, passed: c.passed, failed: c.failed, skipped: c.skipped,
              ...(c.errors.length > 0 ? { errors: c.errors } : {}),
            }));
          }
        }
      } catch { /* keep list-based suites */ }

      const status = code === 0 ? 'passed' : failedCount > 0 ? 'failed' : 'error';

      try {
        await this.prisma.testRun.update({
          where: { id: run.id },
          data: {
            status,
            finishedAt: new Date(),
            durationMs: duration,
            totalTests: passedCount + failedCount + skippedCount,
            passed: passedCount,
            failed: failedCount,
            skipped: skippedCount,
            suites: suites as any,
            output: output.substring(0, 50000),
          },
        });
      } catch (dbErr) {
        this.logger.error('Failed to persist test run', (dbErr as Error).stack);
      }
      this.logger.log(`Tests done: ${status} — ${passedCount}✓ ${failedCount}✗ (${duration}ms)`);
    };

    try {
      const child = exec(
        'npx playwright test e2e/full-system-robot.spec.ts --headed --reporter=list --reporter=json:e2e/test-results/report.json',
        { cwd, timeout: 600000, maxBuffer: 20 * 1024 * 1024 },
      );
      child.stdout?.on('data', (chunk: string) => { this.liveOutput += chunk; });
      child.stderr?.on('data', (chunk: string) => { this.liveOutput += chunk; });
      child.on('close', (code) => finishRun(code));
      child.on('error', () => finishRun(1));
    } catch (err) {
      this.testRunning = false;
      await this.prisma.testRun.update({
        where: { id: run.id },
        data: { status: 'error', finishedAt: new Date(), output: (err as Error).message },
      }).catch(() => {});
    }

    return { status: 'started', runId: run.id };
  }

  @Get('test-results')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Get latest test run status (for polling)' })
  async getTestResults() {
    // If running, return live data
    if (this.testRunning && this.currentRunId) {
      return {
        id: this.currentRunId,
        status: 'running',
        liveLog: this.liveOutput.substring(Math.max(0, this.liveOutput.length - 4000)),
      };
    }

    // Auto-recover stale "running" records (process died without finishing)
    const staleRuns = await this.prisma.testRun.findMany({
      where: { status: 'running' },
    });
    for (const stale of staleRuns) {
      const age = Date.now() - new Date(stale.startedAt).getTime();
      if (age > 10 * 60 * 1000) { // 10 minutes
        await this.prisma.testRun.update({
          where: { id: stale.id },
          data: { status: 'error', finishedAt: new Date(), durationMs: age, output: (stale.output ?? '') + '\n[Auto-recovered: process exited without completing]' },
        }).catch(() => {});
        this.logger.warn(`Auto-recovered stale test run ${stale.id} (${Math.round(age / 1000)}s old)`);
      }
    }

    // Return latest from DB
    const latest = await this.prisma.testRun.findFirst({ orderBy: { startedAt: 'desc' } });
    if (!latest) return { status: 'idle' };
    return {
      id: latest.id,
      status: latest.status,
      startedAt: latest.startedAt,
      finishedAt: latest.finishedAt,
      durationMs: latest.durationMs,
      totalTests: latest.totalTests,
      passed: latest.passed,
      failed: latest.failed,
      skipped: latest.skipped,
      suites: latest.suites,
      summary: `${latest.passed} passed, ${latest.failed} failed, ${latest.skipped} skipped`,
    };
  }

  @Get('test-runs')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'List all test runs (paginated)' })
  async listTestRuns(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const [data, total] = await Promise.all([
      this.prisma.testRun.findMany({
        orderBy: { startedAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
        select: { id: true, status: true, triggeredBy: true, startedAt: true, finishedAt: true, durationMs: true, totalTests: true, passed: true, failed: true, skipped: true, suites: true, environment: true },
      }),
      this.prisma.testRun.count(),
    ]);
    return { data, meta: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) } };
  }

  @Get('test-runs/:id')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Get test run detail with full output and screenshots' })
  async getTestRun(@Param('id') id: string) {
    const run = await this.prisma.testRun.findFirst({ where: { id } });
    if (!run) throw new NotFoundException('Test run not found');

    // Collect available screenshots
    const cwd = join(process.cwd(), '..', '..');
    const ssDir = join(cwd, 'e2e', 'test-results', 'screenshots');
    let screenshots: string[] = [];
    try {
      if (existsSync(ssDir)) {
        screenshots = readdirSync(ssDir).filter((f) => f.endsWith('.png')).sort();
      }
    } catch { /* ignore */ }

    return { ...run, screenshots };
  }

  @Delete('test-runs/:id')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Delete a test run' })
  async deleteTestRun(@Param('id') id: string) {
    const run = await this.prisma.testRun.findFirst({ where: { id } });
    if (!run) throw new NotFoundException('Test run not found');
    await this.prisma.testRun.delete({ where: { id } });
    return { deleted: true };
  }

  @Delete('test-runs')
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Delete all test runs' })
  async deleteAllTestRuns() {
    const { count } = await this.prisma.testRun.deleteMany({});
    // Clean up screenshots folder
    try {
      const cwd = join(process.cwd(), '..', '..');
      const ssDir = join(cwd, 'e2e', 'test-results', 'screenshots');
      if (existsSync(ssDir)) rmSync(ssDir, { recursive: true, force: true });
    } catch { /* ignore */ }
    return { deleted: count };
  }

  // Screenshot endpoint — public (no auth) since <img src> can't send Bearer headers.
  // Safe because it only serves .png files from a known directory.
  @Get('test-screenshots/:filename')
  @UseGuards()  // Override class-level guards — no auth required for screenshots
  @ApiOperation({ summary: 'Serve a test screenshot image (public)' })
  async getScreenshot(@Param('filename') filename: string, @Res() res: Response) {
    // Sanitise filename — only allow alphanumeric, dots, hyphens, underscores
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safe.endsWith('.png')) { res.status(404).send('Not found'); return; }

    const cwd = join(process.cwd(), '..', '..');
    const filePath = join(cwd, 'e2e', 'test-results', 'screenshots', safe);
    if (!existsSync(filePath)) { res.status(404).send('Not found'); return; }

    const buf = readFileSync(filePath);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  }

  // ── Demo Video Recording & Serving ──────────────────────────────────────────

  private demoRecording = false;

  private readonly demoMeta: Record<string, { title: string; description: string; duration: string; section: string }> = {
    '01-login-dashboard': { title: 'Login & Dashboard Overview', description: 'Sign in and explore the main dashboard with KPIs, activity feed, and deadlines.', duration: '0:30', section: 'getting-started' },
    '02-create-rfq': { title: 'Create an RFQ Event', description: 'Create a Request for Quotation with lots, deadlines, and supplier invitations.', duration: '0:45', section: 'events' },
    '03-create-auction': { title: 'Create a Reverse Auction', description: 'Set up a competitive bidding auction with rules, timing, and extensions.', duration: '0:45', section: 'events' },
    '04-templates': { title: 'Templates Library', description: 'Browse 7 pre-built templates and create events instantly.', duration: '0:30', section: 'templates' },
    '05-evaluations': { title: 'Evaluations', description: 'Create evaluations with envelope types, criteria, and scoring.', duration: '0:40', section: 'evaluations' },
    '06-awards-contracts': { title: 'Awards & Contracts', description: 'Manage award recommendations and contract lifecycle.', duration: '0:30', section: 'awards-contracts' },
    '07-suppliers': { title: 'Supplier Directory', description: 'Browse, search, and view supplier profiles and qualifications.', duration: '0:30', section: 'suppliers' },
    '08-admin-orgs-users': { title: 'Organisations & Users', description: 'Manage organisations, business units, users, and role assignments.', duration: '0:40', section: 'admin' },
    '09-master-data': { title: 'Master Data Management', description: 'Configure currencies, countries, UOMs, payment terms, and more.', duration: '0:30', section: 'admin' },
    '10-settings': { title: 'Settings & Profile', description: 'Configure theme, notification preferences, security, and view profile.', duration: '0:30', section: 'settings' },
    '11-notifications': { title: 'Notification Center', description: 'View, filter, and manage notifications across all modules.', duration: '0:20', section: 'settings' },
    '12-analytics-deadlines': { title: 'Analytics & Deadlines', description: 'Monitor analytics dashboards and track upcoming submission deadlines.', duration: '0:30', section: 'analytics' },
  };

  @Post('record-demos')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Trigger demo video recording (non-blocking)' })
  async recordDemos() {
    if (this.demoRecording) return { status: 'already_recording' };
    this.demoRecording = true;
    const cwd = join(process.cwd(), '..', '..');
    this.logger.log('Starting demo video recording...');
    exec(
      'npx playwright test e2e/demo-recorder.spec.ts --headed --reporter=list',
      { cwd, timeout: 600000, maxBuffer: 10 * 1024 * 1024 },
      () => { this.demoRecording = false; this.logger.log('Demo recording finished'); },
    );
    return { status: 'started' };
  }

  @Get('demo-videos')
  @UseGuards()
  @ApiOperation({ summary: 'List available demo videos with metadata' })
  async listDemoVideos() {
    const cwd = join(process.cwd(), '..', '..');
    const dir = join(cwd, 'e2e', 'demo-videos');
    let files: string[] = [];
    try {
      if (existsSync(dir)) files = readdirSync(dir).filter((f) => f.endsWith('.webm') || f.endsWith('.mp4')).sort();
    } catch { /* ignore */ }
    return files.map((f) => {
      const slug = f.replace(/\.(webm|mp4)$/, '');
      const meta = this.demoMeta[slug] ?? { title: slug, description: '', duration: '0:30', section: 'other' };
      return { filename: f, slug, ...meta };
    });
  }

  @Get('demo-videos/:filename')
  @UseGuards()
  @ApiOperation({ summary: 'Serve a demo video file (public)' })
  async serveDemoVideo(@Param('filename') filename: string, @Res() res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safe.endsWith('.webm') && !safe.endsWith('.mp4')) { res.status(404).send('Not found'); return; }
    const cwd = join(process.cwd(), '..', '..');
    const filePath = join(cwd, 'e2e', 'demo-videos', safe);
    if (!existsSync(filePath)) { res.status(404).send('Not found'); return; }
    const buf = readFileSync(filePath);
    res.setHeader('Content-Type', safe.endsWith('.webm') ? 'video/webm' : 'video/mp4');
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  }
}

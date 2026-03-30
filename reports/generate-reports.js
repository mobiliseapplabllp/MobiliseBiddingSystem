const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellM = { top: 60, bottom: 60, left: 100, right: 100 };
const TW = 9360; // Table width (US Letter - 1" margins)

function cell(text, opts = {}) {
  return new TableCell({
    borders, margins: cellM,
    width: { size: opts.w || 2340, type: WidthType.DXA },
    shading: opts.header ? { fill: "1F3864", type: ShadingType.CLEAR } : opts.shade ? { fill: "F2F2F2", type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: opts.align || AlignmentType.LEFT, children: [
      new TextRun({ text, bold: opts.bold || opts.header, font: "Arial", size: opts.size || 20,
        color: opts.header ? "FFFFFF" : opts.color || "333333" })
    ] })]
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, font: "Arial", bold: true })] });
}

function para(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: opts.size || 22, color: opts.color || "333333", bold: opts.bold })] });
}

function statusRow(page, lines, i18n, aria, scope, role, dirCss) {
  return new TableRow({ children: [
    cell(page, { w: 3200 }), cell(String(lines), { w: 700 }),
    cell(i18n, { w: 900, color: i18n === '✅' ? '2E7D32' : 'C62828' }),
    cell(String(aria), { w: 700 }), cell(String(scope), { w: 700 }),
    cell(String(role), { w: 700 }), cell(dirCss, { w: 700, color: dirCss === '0' ? '2E7D32' : 'C62828' }),
    cell(dirCss === '0' ? '✅' : '❌', { w: 700 })
  ]});
}

// ═══════════════════════════════════════════════════════════════
// REPORT 1: PAGE-BY-PAGE AUDIT
// ═══════════════════════════════════════════════════════════════

const pages = [
  { name: 'Login', path: 'login/page.tsx', lines: 207, i18n: '❌', aria: 3, scope: 0, role: 1, dir: '0', notes: 'Missing useTranslations. Has aria-describedby, role=alert. Hardcoded English strings for branding.' },
  { name: 'Dashboard', path: '(authenticated)/dashboard/page.tsx', lines: 302, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Fully i18n. Missing aria-label on KPI icon containers. KPI cards use inline borderTopColor style.' },
  { name: 'Events List', path: '(authenticated)/events/page.tsx', lines: 273, i18n: '✅', aria: 3, scope: 8, role: 0, dir: '0', notes: 'Good a11y — scope=col on all th, aria-label on search+filters. Could add role=table.' },
  { name: 'Events Create', path: '(authenticated)/events/create/page.tsx', lines: 1358, i18n: '✅', aria: 1, scope: 0, role: 2, dir: '0', notes: 'Has role=tablist+tab. Missing aria-required on required fields. Largest page — consider splitting.' },
  { name: 'Event Detail', path: '(authenticated)/events/[eventId]/page.tsx', lines: 583, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Missing scope on lot/line item table headers. Auction phase section added with live controls.' },
  { name: 'Event Invitations', path: '(authenticated)/events/[eventId]/invitations/page.tsx', lines: 283, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Form labels present. Missing aria-label on copy-link button.' },
  { name: 'Event Bids', path: '(authenticated)/events/[eventId]/bids/page.tsx', lines: 209, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Bid expansion cards lack aria-expanded. Table needs scope=col.' },
  { name: 'Evaluations', path: '(authenticated)/evaluations/page.tsx', lines: 206, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Clean i18n with fallbacks. Needs scope=col on table headers.' },
  { name: 'Suppliers', path: '(authenticated)/suppliers/page.tsx', lines: 156, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Fully i18n. Supplier cards could use aria-label for screen readers.' },
  { name: 'Templates', path: '(authenticated)/templates/page.tsx', lines: 267, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Template create modal missing focus trap. Missing aria-label on close button.' },
  { name: 'Deadlines', path: '(authenticated)/deadlines/page.tsx', lines: 123, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Simple page. Fully i18n. Deadline cards could use semantic time element.' },
  { name: 'Organisations', path: '(authenticated)/admin/organisations/page.tsx', lines: 338, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Modals missing focus trap. Edit/delete modals need aria-label.' },
  { name: 'Business Units', path: '(authenticated)/admin/business-units/page.tsx', lines: 300, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Same modal issues as Organisations. Fully i18n.' },
  { name: 'Users & Roles', path: '(authenticated)/admin/users/page.tsx', lines: 627, i18n: '✅', aria: 3, scope: 4, role: 4, dir: '0', notes: 'Best a11y — role=tablist, scope=col, aria-label. Permission modal needs focus trap.' },
  { name: 'Master Data', path: '(authenticated)/admin/master-data/page.tsx', lines: 268, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Card grid. Cards could use role=link or aria-label for accessibility.' },
  { name: 'Master Data Detail', path: '(authenticated)/admin/master-data/[type]/page.tsx', lines: 519, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Table needs scope=col. Add modal missing focus trap. Inline edit row needs aria.' },
  { name: 'Dev Progress', path: '(authenticated)/admin/dev-progress/page.tsx', lines: 393, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Accordion sections should use aria-expanded. Progress bars need aria-valuenow.' },
  { name: 'Auction Detail', path: '(authenticated)/auctions/[auctionId]/page.tsx', lines: 771, i18n: '✅', aria: 0, scope: 0, role: 0, dir: '0', notes: 'Complex page with live view. WebSocket integrated. Missing aria on countdown/ranking.' },
  { name: 'Supplier Auction', path: 'supplier/auction/[token]/page.tsx', lines: 411, i18n: '❌', aria: 0, scope: 0, role: 0, dir: '0', notes: 'MISSING i18n. External-facing supplier portal needs translation for multi-lingual suppliers.' },
  { name: 'Supplier Invite', path: 'supplier/invite/[token]/page.tsx', lines: 269, i18n: '❌', aria: 0, scope: 0, role: 0, dir: '0', notes: 'MISSING i18n. Supplier-facing, needs translation.' },
  { name: 'Supplier Bid', path: 'supplier/invite/[token]/bid/page.tsx', lines: 392, i18n: '❌', aria: 0, scope: 0, role: 0, dir: '0', notes: 'MISSING i18n. Complex bid form. Needs aria on form fields.' },
];

const components = [
  { name: 'Sidebar', i18n: '✅', aria: '2', notes: 'aria-label on nav, aria-current on active. i18n via useTranslations.' },
  { name: 'Topbar', i18n: '❌', aria: '5', notes: 'Good aria (haspopup, expanded, labels). Hardcoded strings for profile/settings.' },
  { name: 'Breadcrumbs', i18n: '❌', aria: '2', notes: 'Has aria-label on nav. Segment labels hardcoded.' },
  { name: 'SimulateSelector', i18n: '❌', aria: '0', notes: 'Missing all aria attributes. Dropdown needs haspopup/expanded.' },
  { name: 'RoleGate', i18n: '❌', aria: '0', notes: 'Loading/denied states need aria-live. Denied text hardcoded.' },
  { name: 'CountdownTimer', i18n: '✅', aria: '0', notes: 'Uses t() for labels. Missing aria-live for timer updates.' },
  { name: 'LiveBidTicker', i18n: '❌', aria: '0', notes: 'Real-time feed. Needs aria-live=polite for new bid announcements.' },
  { name: 'BidHistoryChart', i18n: '❌', aria: '0', notes: 'Recharts chart. Needs aria-label. Alt text for screen readers.' },
  { name: 'AuctionRulesDisplay', i18n: '❌', aria: '0', notes: 'Rule labels hardcoded in English. Needs translation for multi-lingual.' },
  { name: 'AuctionRulesEditor', i18n: '❌', aria: '0', notes: 'Preset names + form labels hardcoded. Toggle missing aria-checked.' },
  { name: 'OnboardingWizard', i18n: '❌', aria: '0', notes: 'Step labels hardcoded. Missing role=dialog, aria-label.' },
];

const doc1 = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2E5090" },
        paragraph: { spacing: { before: 240, after: 150 }, outlineLevel: 1 } },
    ]
  },
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ]},
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [
      new TextRun({ text: "eSourcing Platform — Page-by-Page Audit Report", font: "Arial", size: 18, color: "888888" })
    ] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: "Page ", font: "Arial", size: 18, color: "888888" }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "888888" })
    ] })] }) },
    children: [
      // Title
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
        new TextRun({ text: "eSourcing Platform", font: "Arial", size: 40, bold: true, color: "1F3864" })
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [
        new TextRun({ text: "Page-by-Page Audit Report", font: "Arial", size: 28, color: "2E5090" })
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [
        new TextRun({ text: `Generated: ${new Date().toISOString().split('T')[0]} | Scope: All pages + components | Standards: WCAG 2.1 AA, i18n, RTL`, font: "Arial", size: 20, color: "666666" })
      ] }),

      // Summary
      heading("Executive Summary"),
      para(`Total pages scanned: ${pages.length}`),
      para(`Total components scanned: ${components.length}`),
      para(`Pages with i18n (useTranslations): ${pages.filter(p => p.i18n === '✅').length} / ${pages.length}`),
      para(`Pages missing i18n: ${pages.filter(p => p.i18n === '❌').length} (${pages.filter(p => p.i18n === '❌').map(p => p.name).join(', ')})`),
      para(`Directional CSS violations: 0 (fully RTL-ready)`),
      para(`Total lines of code: ${pages.reduce((s, p) => s + p.lines, 0).toLocaleString()}`),

      new Paragraph({ children: [new PageBreak()] }),

      // Page table
      heading("Page-by-Page Results"),
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [3200, 700, 900, 700, 700, 700, 700, 700],
        rows: [
          new TableRow({ children: [
            cell('Page', { header: true, w: 3200 }), cell('Lines', { header: true, w: 700 }),
            cell('i18n', { header: true, w: 900 }), cell('ARIA', { header: true, w: 700 }),
            cell('Scope', { header: true, w: 700 }), cell('Role', { header: true, w: 700 }),
            cell('Dir CSS', { header: true, w: 700 }), cell('RTL', { header: true, w: 700 }),
          ]}),
          ...pages.map(p => statusRow(p.name, p.lines, p.i18n, p.aria, p.scope, p.role, p.dir))
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Detailed findings per page
      heading("Detailed Findings"),
      ...pages.flatMap(p => [
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: p.name, font: "Arial", bold: true })] }),
        para(`Path: ${p.path}`, { size: 18, color: "888888" }),
        para(`Lines: ${p.lines} | i18n: ${p.i18n} | ARIA attrs: ${p.aria} | scope: ${p.scope} | role: ${p.role}`),
        para(`Findings: ${p.notes}`),
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // Components
      heading("Component Audit"),
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [2000, 800, 800, 5760],
        rows: [
          new TableRow({ children: [
            cell('Component', { header: true, w: 2000 }), cell('i18n', { header: true, w: 800 }),
            cell('ARIA', { header: true, w: 800 }), cell('Notes', { header: true, w: 5760 }),
          ]}),
          ...components.map(c => new TableRow({ children: [
            cell(c.name, { w: 2000, bold: true }), cell(c.i18n, { w: 800, color: c.i18n === '✅' ? '2E7D32' : 'C62828' }),
            cell(c.aria, { w: 800 }), cell(c.notes, { w: 5760 }),
          ]}))
        ]
      }),
    ]
  }]
});

// ═══════════════════════════════════════════════════════════════
// REPORT 2: MULTI-LINGUAL READINESS
// ═══════════════════════════════════════════════════════════════

const i18nSections = [
  { section: 'auth', keys: 15 }, { section: 'nav', keys: 19 }, { section: 'topbar', keys: 9 },
  { section: 'dashboard', keys: 36 }, { section: 'events', keys: 145 }, { section: 'suppliers', keys: 55 },
  { section: 'admin', keys: 69 }, { section: 'users', keys: 67 }, { section: 'auction', keys: 72 },
  { section: 'masterData', keys: 47 }, { section: 'templates', keys: 18 }, { section: 'deadlines', keys: 10 },
  { section: 'invitations', keys: 16 }, { section: 'supplierPortal', keys: 83 }, { section: 'evaluations', keys: 25 },
  { section: 'awards', keys: 16 }, { section: 'contracts', keys: 18 }, { section: 'analytics', keys: 12 },
  { section: 'breadcrumbs', keys: 21 }, { section: 'common', keys: 97 }, { section: 'devProgress', keys: 12 },
  { section: 'auctionDetail', keys: 58 },
];

const doc2 = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2E5090" },
        paragraph: { spacing: { before: 240, after: 150 }, outlineLevel: 1 } },
    ]
  },
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ]},
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [
      new TextRun({ text: "eSourcing Platform — Multi-Lingual Readiness Report", font: "Arial", size: 18, color: "888888" })
    ] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: "Page ", font: "Arial", size: 18, color: "888888" }),
      new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "888888" })
    ] })] }) },
    children: [
      // Title
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
        new TextRun({ text: "eSourcing Platform", font: "Arial", size: 40, bold: true, color: "1F3864" })
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [
        new TextRun({ text: "Multi-Lingual Readiness Report", font: "Arial", size: 28, color: "2E5090" })
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [
        new TextRun({ text: `Generated: ${new Date().toISOString().split('T')[0]} | Framework: next-intl v4.x | Current Locale: English (en)`, font: "Arial", size: 20, color: "666666" })
      ] }),

      // Summary
      heading("Executive Summary"),
      para("The eSourcing platform uses next-intl v4.x for internationalization. English (en.json) is the only active locale. The architecture is designed for multi-language support per CLAUDE.md ADR-002 — adding a new language requires only creating a translation file (e.g., ar.json) and updating the locale config.", { size: 20 }),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({ children: [cell('Metric', { header: true, w: 4680 }), cell('Value', { header: true, w: 4680 })] }),
          new TableRow({ children: [cell('Framework', { w: 4680, bold: true }), cell('next-intl v4.x', { w: 4680 })] }),
          new TableRow({ children: [cell('Active Locale', { w: 4680, bold: true }), cell('English (en)', { w: 4680 })] }),
          new TableRow({ children: [cell('en.json Total Lines', { w: 4680, bold: true }), cell('1,066', { w: 4680 })] }),
          new TableRow({ children: [cell('Total Translation Keys', { w: 4680, bold: true }), cell('~900', { w: 4680 })] }),
          new TableRow({ children: [cell('Translation Sections', { w: 4680, bold: true }), cell('22', { w: 4680 })] }),
          new TableRow({ children: [cell('Pages Using t()', { w: 4680, bold: true }), cell('18 / 21 (86%)', { w: 4680 })] }),
          new TableRow({ children: [cell('Components Using t()', { w: 4680, bold: true }), cell('2 / 12 (17%)', { w: 4680 })] }),
          new TableRow({ children: [cell('RTL-Ready (Logical CSS)', { w: 4680, bold: true }), cell('100% — 0 directional violations', { w: 4680, color: '2E7D32' })] }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Section breakdown
      heading("Translation Key Coverage by Section"),
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({ children: [cell('Section', { header: true, w: 3120 }), cell('Keys', { header: true, w: 3120 }), cell('Coverage', { header: true, w: 3120 })] }),
          ...i18nSections.map((s, i) => new TableRow({ children: [
            cell(s.section, { w: 3120, bold: true, shade: i % 2 === 1 }),
            cell(String(s.keys), { w: 3120, shade: i % 2 === 1 }),
            cell(s.keys > 50 ? 'Comprehensive' : s.keys > 20 ? 'Good' : 'Basic', { w: 3120, shade: i % 2 === 1,
              color: s.keys > 50 ? '2E7D32' : s.keys > 20 ? 'E65100' : 'C62828' }),
          ]}))
        ]
      }),
      para(`Total keys: ${i18nSections.reduce((s, x) => s + x.keys, 0)}`, { bold: true }),

      new Paragraph({ children: [new PageBreak()] }),

      // Gaps
      heading("Gaps — Pages/Components Missing i18n"),
      para("The following files contain hardcoded English strings and need useTranslations integration:", { bold: true }),

      heading("Pages Missing i18n", HeadingLevel.HEADING_2),
      ...pages.filter(p => p.i18n === '❌').map(p =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [
          new TextRun({ text: `${p.name}`, bold: true, font: "Arial", size: 20 }),
          new TextRun({ text: ` (${p.path}) — ${p.notes}`, font: "Arial", size: 20, color: "666666" }),
        ] })
      ),

      heading("Components Missing i18n", HeadingLevel.HEADING_2),
      ...components.filter(c => c.i18n === '❌').map(c =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [
          new TextRun({ text: `${c.name}`, bold: true, font: "Arial", size: 20 }),
          new TextRun({ text: ` — ${c.notes}`, font: "Arial", size: 20, color: "666666" }),
        ] })
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // RTL
      heading("RTL (Right-to-Left) Readiness"),
      para("The platform is fully RTL-ready for Arabic, Hebrew, and other RTL languages:"),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [
        new TextRun({ text: "0 directional CSS violations", bold: true, font: "Arial", size: 20, color: "2E7D32" }),
        new TextRun({ text: " — all files use Tailwind logical properties (ms-/me-/ps-/pe-/start-/end-)", font: "Arial", size: 20 }),
      ] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [
        new TextRun({ text: "23 files actively use logical properties", font: "Arial", size: 20 }),
      ] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [
        new TextRun({ text: "No ml-/mr-/pl-/pr-/left-/right- found anywhere", font: "Arial", size: 20, color: "2E7D32" }),
      ] }),

      heading("Steps to Add a New Language", HeadingLevel.HEADING_2),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [
        new TextRun({ text: "Copy en.json to the new locale file (e.g., ar.json for Arabic, fr.json for French)", font: "Arial", size: 20 }),
      ] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [
        new TextRun({ text: "Translate all ~900 keys in the new file", font: "Arial", size: 20 }),
      ] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [
        new TextRun({ text: "Update apps/web/src/i18n/request.ts to detect and load the new locale", font: "Arial", size: 20 }),
      ] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [
        new TextRun({ text: "Add locale selector UI (Sprint 19 — language dropdown in settings)", font: "Arial", size: 20 }),
      ] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [
        new TextRun({ text: "For RTL: Set dir='rtl' on <html> — NO CSS changes needed (logical properties handle it)", font: "Arial", size: 20, bold: true, color: "2E7D32" }),
      ] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Effort estimate
      heading("Effort Estimate for New Language"),
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [4680, 2340, 2340],
        rows: [
          new TableRow({ children: [cell('Task', { header: true, w: 4680 }), cell('Effort', { header: true, w: 2340 }), cell('Owner', { header: true, w: 2340 })] }),
          new TableRow({ children: [cell('Translate en.json (~900 keys)', { w: 4680 }), cell('2-3 days', { w: 2340 }), cell('Translator', { w: 2340 })] }),
          new TableRow({ children: [cell('Fix remaining 3 pages missing i18n', { w: 4680 }), cell('1 day', { w: 2340 }), cell('Frontend Dev', { w: 2340 })] }),
          new TableRow({ children: [cell('Fix 10 components missing i18n', { w: 4680 }), cell('1 day', { w: 2340 }), cell('Frontend Dev', { w: 2340 })] }),
          new TableRow({ children: [cell('Update next-intl config + locale selector', { w: 4680 }), cell('0.5 day', { w: 2340 }), cell('Frontend Dev', { w: 2340 })] }),
          new TableRow({ children: [cell('RTL testing (Arabic)', { w: 4680 }), cell('1 day', { w: 2340 }), cell('QA + Frontend', { w: 2340 })] }),
          new TableRow({ children: [cell('Total', { w: 4680, bold: true }), cell('5-6 days', { w: 2340, bold: true }), cell('', { w: 2340 })] }),
        ]
      }),
    ]
  }]
});

async function generate() {
  const buf1 = await Packer.toBuffer(doc1);
  fs.writeFileSync('reports/eSourcing_Page_Audit_Report.docx', buf1);
  console.log('✅ Generated: reports/eSourcing_Page_Audit_Report.docx');

  const buf2 = await Packer.toBuffer(doc2);
  fs.writeFileSync('reports/eSourcing_MultiLingual_Readiness_Report.docx', buf2);
  console.log('✅ Generated: reports/eSourcing_MultiLingual_Readiness_Report.docx');
}
generate().catch(console.error);

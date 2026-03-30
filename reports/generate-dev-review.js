const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellM = { top: 60, bottom: 60, left: 100, right: 100 };
const TW = 9360;

function cell(text, opts = {}) {
  return new TableCell({
    borders, margins: cellM,
    width: { size: opts.w || 2340, type: WidthType.DXA },
    shading: opts.header ? { fill: "1F3864", type: ShadingType.CLEAR } : opts.shade ? { fill: "F8F9FA", type: ShadingType.CLEAR } : opts.red ? { fill: "FEE2E2", type: ShadingType.CLEAR } : opts.green ? { fill: "DCFCE7", type: ShadingType.CLEAR } : opts.amber ? { fill: "FEF3C7", type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: opts.align || AlignmentType.LEFT, children: [
      new TextRun({ text: String(text), bold: opts.bold || opts.header, font: "Arial", size: opts.size || 18,
        color: opts.header ? "FFFFFF" : opts.color || "333333" })
    ] })]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Arial", color: "1F3864" }, paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "2E5090" }, paragraph: { spacing: { before: 240, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: "Arial", color: "4472C4" }, paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ]},
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: "eSourcing Platform v1.0.0 \u2014 Development Review Report", font: "Arial", size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Confidential \u2014 Page ", font: "Arial", size: 16, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "888888" })] })] }) },
    children: [
      // ═══ TITLE PAGE ═══
      new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "eSourcing Platform", font: "Arial", size: 52, bold: true, color: "1F3864" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "Development Review Report", font: "Arial", size: 32, color: "2E5090" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Version 1.0.0 \u2014 All 28 Sprints Complete", font: "Arial", size: 24, color: "4472C4" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: `Generated: ${new Date().toISOString().split('T')[0]}`, font: "Arial", size: 20, color: "888888" })] }),

      new Table({ width: { size: 6000, type: WidthType.DXA }, columnWidths: [3000, 3000], rows: [
        new TableRow({ children: [cell("Scope", { header: true, w: 3000 }), cell("Full Platform Assessment", { header: true, w: 3000 })] }),
        new TableRow({ children: [cell("SAST", { bold: true, w: 3000 }), cell("6 findings (2 HIGH, 1 MEDIUM, 3 LOW)", { w: 3000 })] }),
        new TableRow({ children: [cell("DAST", { bold: true, w: 3000 }), cell("10 findings (5 CRITICAL, 4 MAJOR, 1 MINOR)", { w: 3000 })] }),
        new TableRow({ children: [cell("Accessibility", { bold: true, w: 3000 }), cell("38 findings (6 CRITICAL, 18 MAJOR, 14 MINOR)", { w: 3000 })] }),
        new TableRow({ children: [cell("Code Review", { bold: true, w: 3000 }), cell("Security: B+ | Code Quality: A-", { w: 3000 })] }),
        new TableRow({ children: [cell("Multi-lingual", { bold: true, w: 3000 }), cell("65% ready (12 date format fixes needed)", { w: 3000 })] }),
        new TableRow({ children: [cell("Design System", { bold: true, w: 3000 }), cell("78% health (button/input consistency gaps)", { w: 3000 })] }),
        new TableRow({ children: [cell("System Test", { bold: true, w: 3000 }), cell("59/62 passed (95.2%)", { w: 3000, green: true })] }),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ EXECUTIVE SUMMARY ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Executive Summary")] }),
      new Paragraph({ spacing: { after: 150 }, children: [new TextRun({ text: "The eSourcing Platform v1.0.0 has completed all 28 planned sprints plus an AI Foundation sprint. The platform includes 50 database models, 197 REST endpoints, 25 frontend pages, and 1,380 i18n translation keys. This report consolidates findings from six assessment categories.", font: "Arial", size: 20 })] }),

      new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [2340, 1560, 1560, 1560, 1170, 1170], rows: [
        new TableRow({ children: [cell("Category", { header: true, w: 2340 }), cell("CRITICAL", { header: true, w: 1560 }), cell("HIGH/MAJOR", { header: true, w: 1560 }), cell("MEDIUM", { header: true, w: 1560 }), cell("LOW/MINOR", { header: true, w: 1170 }), cell("Grade", { header: true, w: 1170 })] }),
        new TableRow({ children: [cell("SAST (Security)", { bold: true, w: 2340 }), cell("0", { w: 1560, green: true }), cell("2", { w: 1560, amber: true }), cell("1", { w: 1560 }), cell("3", { w: 1170 }), cell("B+", { w: 1170, bold: true })] }),
        new TableRow({ children: [cell("DAST (Dynamic)", { bold: true, w: 2340 }), cell("5", { w: 1560, red: true }), cell("4", { w: 1560, amber: true }), cell("0", { w: 1560 }), cell("1", { w: 1170 }), cell("C+", { w: 1170, bold: true })] }),
        new TableRow({ children: [cell("Accessibility", { bold: true, w: 2340 }), cell("6", { w: 1560, red: true }), cell("18", { w: 1560, amber: true }), cell("0", { w: 1560 }), cell("14", { w: 1170 }), cell("C", { w: 1170, bold: true })] }),
        new TableRow({ children: [cell("Code Quality", { bold: true, w: 2340 }), cell("0", { w: 1560, green: true }), cell("0", { w: 1560, green: true }), cell("0", { w: 1560, green: true }), cell("1", { w: 1170 }), cell("A-", { w: 1170, bold: true })] }),
        new TableRow({ children: [cell("Multi-lingual", { bold: true, w: 2340 }), cell("1", { w: 1560, red: true }), cell("2", { w: 1560, amber: true }), cell("0", { w: 1560 }), cell("3", { w: 1170 }), cell("B-", { w: 1170, bold: true })] }),
        new TableRow({ children: [cell("Design System", { bold: true, w: 2340 }), cell("0", { w: 1560, green: true }), cell("3", { w: 1560, amber: true }), cell("0", { w: 1560 }), cell("4", { w: 1170 }), cell("B", { w: 1170, bold: true })] }),
        new TableRow({ children: [cell("TOTAL", { bold: true, w: 2340 }), cell("12", { w: 1560, bold: true, red: true }), cell("29", { w: 1560, bold: true, amber: true }), cell("1", { w: 1560, bold: true }), cell("26", { w: 1170, bold: true }), cell("B", { w: 1170, bold: true })] }),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ SAST ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. SAST \u2014 Static Application Security Testing")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Static analysis of all 128 TypeScript source files for security vulnerabilities.", font: "Arial", size: 20 })] }),
      new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [3120, 1560, 1560, 3120], rows: [
        new TableRow({ children: [cell("Check", { header: true, w: 3120 }), cell("Status", { header: true, w: 1560 }), cell("Severity", { header: true, w: 1560 }), cell("Finding", { header: true, w: 3120 })] }),
        new TableRow({ children: [cell("SQL Injection", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("No $executeRawUnsafe found", { w: 3120 })] }),
        new TableRow({ children: [cell("Hardcoded Secrets", { w: 3120 }), cell("WARNING", { w: 1560, amber: true }), cell("HIGH", { w: 1560 }), cell("JWT_SECRET has dev fallback value", { w: 3120 })] }),
        new TableRow({ children: [cell("XSS", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("No dangerouslySetInnerHTML found", { w: 3120 })] }),
        new TableRow({ children: [cell("SSRF (Webhooks)", { w: 3120 }), cell("WARNING", { w: 1560, amber: true }), cell("MEDIUM", { w: 1560 }), cell("Webhook URLs not validated for private IPs", { w: 3120 })] }),
        new TableRow({ children: [cell("Eval/Function", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("No eval() or new Function() found", { w: 3120 })] }),
        new TableRow({ children: [cell("TypeScript any", { w: 3120 }), cell("GOOD", { w: 1560, green: true }), cell("LOW", { w: 1560 }), cell("1 instance in production code", { w: 3120 })] }),
        new TableRow({ children: [cell("Input Validation", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("308 class-validator decorators across 23 DTOs", { w: 3120 })] }),
        new TableRow({ children: [cell("Auth Guards", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("23/24 controllers guarded (1 intentional token-based)", { w: 3120 })] }),
        new TableRow({ children: [cell("Sensitive Logs", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("No passwords/tokens in logs", { w: 3120 })] }),
        new TableRow({ children: [cell("CORS", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("Origin whitelist enforced, credentials enabled", { w: 3120 })] }),
        new TableRow({ children: [cell("Tech Debt", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("0 TODO/FIXME/HACK comments", { w: 3120 })] }),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ DAST ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. DAST \u2014 Dynamic Application Security Testing")] }),
      new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [3120, 1560, 1560, 3120], rows: [
        new TableRow({ children: [cell("Test", { header: true, w: 3120 }), cell("Result", { header: true, w: 1560 }), cell("Severity", { header: true, w: 1560 }), cell("Details", { header: true, w: 3120 })] }),
        new TableRow({ children: [cell("Auth Bypass (8 endpoints)", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("All return 401 without JWT", { w: 3120 })] }),
        new TableRow({ children: [cell("Forged JWT", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("Rejected by passport-jwt", { w: 3120 })] }),
        new TableRow({ children: [cell("Rate Limiting", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("429 after 5 login attempts", { w: 3120 })] }),
        new TableRow({ children: [cell("SQL Injection (query)", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("Parameterized via Prisma", { w: 3120 })] }),
        new TableRow({ children: [cell("CORS Evil Origin", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("Only allows configured origins", { w: 3120 })] }),
        new TableRow({ children: [cell("Missing Helmet Headers", { w: 3120 }), cell("FAIL", { w: 1560, red: true }), cell("CRITICAL", { w: 1560 }), cell("No CSP, HSTS, X-Frame-Options", { w: 3120 })] }),
        new TableRow({ children: [cell("JWT Signature (Edge)", { w: 3120 }), cell("FAIL", { w: 1560, red: true }), cell("CRITICAL", { w: 1560 }), cell("Middleware decodes without verifying", { w: 3120 })] }),
        new TableRow({ children: [cell("Token Storage", { w: 3120 }), cell("FAIL", { w: 1560, red: true }), cell("CRITICAL", { w: 1560 }), cell("Refresh token in localStorage (XSS risk)", { w: 3120 })] }),
        new TableRow({ children: [cell("Permission Cache", { w: 3120 }), cell("WARNING", { w: 1560, amber: true }), cell("MAJOR", { w: 1560 }), cell("In-memory cache not invalidated on update", { w: 3120 })] }),
        new TableRow({ children: [cell("Invalid Bid Token", { w: 3120 }), cell("PASS", { w: 1560, green: true }), cell("-", { w: 1560 }), cell("404 rejected correctly", { w: 3120 })] }),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ ACCESSIBILITY ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Accessibility Review \u2014 WCAG 2.1 AA")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Scanned 25 pages + 16 components. Current status: FAILS WCAG 2.1 AA (6 critical issues).", font: "Arial", size: 20, color: "C62828" })] }),
      new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [4680, 1560, 3120], rows: [
        new TableRow({ children: [cell("Issue", { header: true, w: 4680 }), cell("Severity", { header: true, w: 1560 }), cell("Instances", { header: true, w: 3120 })] }),
        new TableRow({ children: [cell("Countdown timer missing aria-live", { w: 4680 }), cell("CRITICAL", { w: 1560, red: true }), cell("2 components", { w: 3120 })] }),
        new TableRow({ children: [cell("Icon-only interactive elements (no text)", { w: 4680 }), cell("CRITICAL", { w: 1560, red: true }), cell("8 instances across pages", { w: 3120 })] }),
        new TableRow({ children: [cell("Color-only status conveyance", { w: 4680 }), cell("MAJOR", { w: 1560, amber: true }), cell("12 instances", { w: 3120 })] }),
        new TableRow({ children: [cell("Modals not keyboard closeable", { w: 4680 }), cell("MAJOR", { w: 1560, amber: true }), cell("6 modals", { w: 3120 })] }),
        new TableRow({ children: [cell("Missing page titles", { w: 4680 }), cell("MAJOR", { w: 1560, amber: true }), cell("Most pages", { w: 3120 })] }),
        new TableRow({ children: [cell("Form labels not linked (htmlFor)", { w: 4680 }), cell("MINOR", { w: 1560 }), cell("4 instances", { w: 3120 })] }),
        new TableRow({ children: [cell("Focus indicators not visible", { w: 4680 }), cell("MINOR", { w: 1560 }), cell("Multiple components", { w: 3120 })] }),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ MULTI-LINGUAL ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Multi-Lingual Assessment")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Overall readiness: 65%. Strong infrastructure but blocking issues remain.", font: "Arial", size: 20 })] }),
      new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [4680, 4680], rows: [
        new TableRow({ children: [cell("Metric", { header: true, w: 4680 }), cell("Value", { header: true, w: 4680 })] }),
        new TableRow({ children: [cell("Translation keys (en.json)", { w: 4680 }), cell("1,380 lines / ~1,250 keys", { w: 4680, green: true })] }),
        new TableRow({ children: [cell("Pages with useTranslations", { w: 4680 }), cell("24/25 (96%)", { w: 4680, green: true })] }),
        new TableRow({ children: [cell("Hardcoded date/number formats", { w: 4680 }), cell("12 instances (BLOCKING)", { w: 4680, red: true })] }),
        new TableRow({ children: [cell("Supported locales", { w: 4680 }), cell("1 (English only)", { w: 4680, amber: true })] }),
        new TableRow({ children: [cell("RTL CSS violations", { w: 4680 }), cell("0 (fully ready)", { w: 4680, green: true })] }),
        new TableRow({ children: [cell("t() calls without fallback", { w: 4680 }), cell("~150 (risk of raw key display)", { w: 4680, amber: true })] }),
        new TableRow({ children: [cell("Language selector", { w: 4680 }), cell("8 languages configured (1 active)", { w: 4680, green: true })] }),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ DESIGN SYSTEM ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. Design System Review")] }),
      new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [2340, 2340, 2340, 2340], rows: [
        new TableRow({ children: [cell("Component", { header: true, w: 2340 }), cell("Defined", { header: true, w: 2340 }), cell("Adoption", { header: true, w: 2340 }), cell("Health", { header: true, w: 2340 })] }),
        new TableRow({ children: [cell("Buttons (4 variants)", { w: 2340 }), cell("Yes", { w: 2340, green: true }), cell("60%", { w: 2340, amber: true }), cell("Needs improvement", { w: 2340 })] }),
        new TableRow({ children: [cell("Inputs (1 variant)", { w: 2340 }), cell("Yes", { w: 2340, green: true }), cell("40%", { w: 2340, red: true }), cell("Needs improvement", { w: 2340 })] }),
        new TableRow({ children: [cell("Cards (2 variants)", { w: 2340 }), cell("Yes", { w: 2340, green: true }), cell("95%", { w: 2340, green: true }), cell("Excellent", { w: 2340 })] }),
        new TableRow({ children: [cell("Badges (6 variants)", { w: 2340 }), cell("Yes", { w: 2340, green: true }), cell("90%", { w: 2340, green: true }), cell("Good", { w: 2340 })] }),
        new TableRow({ children: [cell("Tables (3 classes)", { w: 2340 }), cell("Yes", { w: 2340, green: true }), cell("85%", { w: 2340, green: true }), cell("Good", { w: 2340 })] }),
        new TableRow({ children: [cell("Page Headers", { w: 2340 }), cell("Pattern", { w: 2340, green: true }), cell("98%", { w: 2340, green: true }), cell("Excellent", { w: 2340 })] }),
        new TableRow({ children: [cell("KPI Cards", { w: 2340 }), cell("Pattern", { w: 2340, green: true }), cell("95%", { w: 2340, green: true }), cell("Excellent", { w: 2340 })] }),
        new TableRow({ children: [cell("Color Tokens", { w: 2340 }), cell("24 tokens", { w: 2340, green: true }), cell("76%", { w: 2340, amber: true }), cell("Good (24% hardcoded)", { w: 2340 })] }),
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ SYSTEM TEST ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Full System Test Results")] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "62 automated tests across 22 module categories. 59 passed (95.2%).", font: "Arial", size: 20 })] }),
      new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [3120, 1560, 1560, 3120], rows: [
        new TableRow({ children: [cell("Module", { header: true, w: 3120 }), cell("Tests", { header: true, w: 1560 }), cell("Result", { header: true, w: 1560 }), cell("Notes", { header: true, w: 3120 })] }),
        ...[
          ["Authentication", "4", "PASS", "Login, profile, refresh, locale"],
          ["RBAC & Security", "8", "PASS", "All endpoints block unauthorized"],
          ["Organisations + BUs", "4", "PASS", "CRUD + cross-tenant blocked"],
          ["Master Data", "2", "PASS", "13 types, 40+ currencies"],
          ["Events (RFx)", "4", "PASS", "Create RFQ + Reverse Auction"],
          ["Auctions", "1", "PASS", "List + live state"],
          ["Evaluations", "4", "PASS", "CRUD + summary + matrix"],
          ["Awards", "2", "PASS", "Create + list"],
          ["Contracts", "4", "PASS", "CRUD + stats + expiring"],
          ["Supplier Portal", "2", "PASS", "Approved list + search"],
          ["Analytics", "4", "PASS", "Dashboard + spend + savings"],
          ["Reports", "2", "FAIL", "POST fails (RLS edge case)"],
          ["Notifications", "3", "PASS", "List + unread + preferences"],
          ["Multi-Currency", "2", "PARTIAL", "List OK, convert fails (no rates)"],
          ["Workflows", "2", "PASS", "Templates + instances"],
          ["Audit", "3", "PASS", "Logs + compliance + retention"],
          ["Integrations", "2", "PASS", "API keys + webhooks"],
          ["Performance", "2", "PASS", "Cache + latency"],
          ["Health & System", "3", "PASS", "Health + detailed + system info"],
          ["AI Features", "2", "PASS", "Status + enabled check"],
          ["Preferences", "1", "PASS", "Locale + theme update"],
          ["Simulate", "1", "PASS", "Org/user switching"],
        ].map(([mod, tests, result, notes]) => new TableRow({ children: [
          cell(mod, { w: 3120 }), cell(tests, { w: 1560 }),
          cell(result, { w: 1560, green: result === "PASS", red: result === "FAIL", amber: result === "PARTIAL" }),
          cell(notes, { w: 3120 })
        ]}))
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ RECOMMENDATIONS ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. Priority Recommendations")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Tier 1: Fix Before Production (1-2 weeks)")] }),
      ...["Install Helmet.js for security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)", "Move tokens from localStorage to httpOnly cookies", "Add aria-live to countdown timers and real-time data feeds", "Add text labels to all color-only status indicators", "Validate webhook URLs against private IP ranges (SSRF prevention)", "Create locale-aware date/number formatter (replace 12 hardcoded instances)", "Add Escape key handler to all modals and dropdowns"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: t, font: "Arial", size: 20 })] })
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Tier 2: Fix Within 1 Month")] }),
      ...["Standardize all buttons to use .btn-* component classes (40% non-compliant)", "Standardize all inputs to use .input-field class (60% non-compliant)", "Replace hardcoded Tailwind colors with design tokens (24% non-compliant)", "Add page titles via Next.js metadata API", "Create French, Arabic, and Spanish translation files", "Add JWT token blacklist for real-time revocation"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: t, font: "Arial", size: 20 })] })
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Tier 3: Continuous Improvement")] }),
      ...["Add axe-core accessibility testing to CI/CD pipeline", "Implement distributed tracing for async job failures", "Multi-instance permission cache synchronization (Redis pub/sub)", "Complete removal of SHA256 seed hash support", "Full WCAG 2.1 AA certification audit with screen readers"].map(t =>
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: t, font: "Arial", size: 20 })] })
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══ SIGN-OFF ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. Sign-Off")] }),
      new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: "This development review covers all aspects of the eSourcing Platform v1.0.0. The platform is functional and suitable for staging deployment with the Tier 1 fixes applied. Production deployment requires all Tier 1 and Tier 2 recommendations.", font: "Arial", size: 20 })] }),

      new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [3120, 3120, 3120], rows: [
        new TableRow({ children: [cell("Role", { header: true, w: 3120 }), cell("Name", { header: true, w: 3120 }), cell("Date", { header: true, w: 3120 })] }),
        new TableRow({ children: [cell("Solution Architect", { w: 3120 }), cell("________________", { w: 3120 }), cell("________________", { w: 3120 })] }),
        new TableRow({ children: [cell("Security Specialist", { w: 3120 }), cell("________________", { w: 3120 }), cell("________________", { w: 3120 })] }),
        new TableRow({ children: [cell("QA Lead", { w: 3120 }), cell("________________", { w: 3120 }), cell("________________", { w: 3120 })] }),
        new TableRow({ children: [cell("Product Manager", { w: 3120 }), cell("________________", { w: 3120 }), cell("________________", { w: 3120 })] }),
      ]}),
    ]
  }]
});

async function generate() {
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync('reports/eSourcing_Development_Review_v1.0.0.docx', buf);
  console.log('Generated: reports/eSourcing_Development_Review_v1.0.0.docx');
}
generate().catch(console.error);

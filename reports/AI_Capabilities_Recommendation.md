# eSourcing Platform — AI Capabilities Recommendation

## Current AI Infrastructure (Sprint 15.5 — Built)

| Component | Status | Details |
|-----------|--------|---------|
| Claude API SDK | ✅ Installed | @anthropic-ai/sdk |
| Core AIService | ✅ Built | generateText, generateJSON, analyzeDocument |
| AI Module | ✅ Built | 9 endpoints, rate-limited, RBAC-protected |
| AI Interaction Logging | ✅ Built | Token tracking, usage analytics |
| AI Copilot (Chat) | ✅ Built | Floating widget on every page |
| AI Assist Button | ✅ Built | Reusable component for any context |
| AI Insight Card | ✅ Built | Display component for AI results |

---

## Phase 1: Immediate AI Enhancements (Ready to Activate)

These features are **already built** in the API — just need the Anthropic API key with credits:

### 1. RFx Description Generator
- **Endpoint:** `POST /ai/rfx/generate-description`
- **Where:** Events create wizard → "✨ Generate" button next to description field
- **Value:** Saves 15-20 minutes per event creation. Produces professional procurement language.

### 2. Evaluation Criteria Suggestions
- **Endpoint:** `POST /ai/rfx/suggest-criteria`
- **Where:** Evaluation setup → "✨ Suggest Criteria" button
- **Value:** Ensures comprehensive evaluation criteria based on event type and industry best practices.

### 3. Line Item Auto-Generation
- **Endpoint:** `POST /ai/rfx/generate-line-items`
- **Where:** Events create wizard (Items tab) → "✨ Generate from description" button
- **Value:** Type "office furniture for 200 employees" → get 10-15 structured line items with quantities and UOMs.

### 4. Bid Analysis & Summary
- **Endpoint:** `POST /ai/bids/analyze`
- **Where:** Evaluation scoring page → "✨ AI Analysis" button per bid
- **Value:** Instant bid summary with strengths, weaknesses, compliance flags, and scoring recommendation.

### 5. Supplier Risk Assessment
- **Endpoint:** `POST /ai/suppliers/risk-assessment`
- **Where:** Supplier profile page → "Risk Score" badge
- **Value:** AI-generated risk score (0-100) with factors, based on profile + scorecards + qualifications.

### 6. Contract Clause Analysis
- **Endpoint:** `POST /ai/contracts/analyze`
- **Where:** Contract detail page → "✨ Analyze Terms" button
- **Value:** Identifies risky clauses, missing standard terms, and improvement recommendations.

### 7. Award Recommendation
- **Endpoint:** `POST /ai/awards/recommend`
- **Where:** Award creation page → "✨ AI Recommendation" button
- **Value:** Recommends supplier(s) to award based on scores + price + risk with formal justification text.

### 8. Procurement Copilot
- **Endpoint:** `POST /ai/chat`
- **Where:** Floating chat widget (bottom-right corner, every page)
- **Value:** Context-aware assistant. Ask "What auction type for commodity buying?" or "How to set up evaluation criteria?"

---

## Phase 2: Advanced AI Features (Build Next)

### 9. Bid Compliance Auto-Checker
- **What:** AI reads bid documents against RFx requirements and flags non-compliance
- **Where:** Evaluation workflow → automatic compliance column
- **How:** Parse bid attachments (PDF/DOCX) via document extraction + Claude analysis
- **Effort:** 3-5 days
- **Value:** Eliminates manual compliance checking (hours → minutes)

### 10. Auction Price Predictor
- **What:** ML model trained on historical auction data to predict optimal starting/reserve prices
- **Where:** Event creation → "Suggested Pricing" card
- **How:** Aggregate past auction results by category, supplier pool size, market conditions
- **Effort:** 5-7 days
- **Value:** Better pricing = better auction outcomes = higher savings

### 11. Bid Collusion Detection
- **What:** AI analyzes bidding patterns across auctions to detect suspicious behavior
- **Where:** Audit compliance dashboard → "Anomaly Detection" tab
- **How:** Look for: identical pricing patterns, bid rotation, market allocation, complementary bidding
- **Effort:** 5-7 days
- **Value:** Compliance requirement for government procurement. Prevents fraud.

### 12. Smart Supplier Matching
- **What:** AI recommends best suppliers for a procurement need based on category + past performance
- **Where:** Event invitation step → "✨ Suggest Suppliers" button
- **How:** Match event requirements against supplier profiles, certifications, categories, scorecards
- **Effort:** 3-5 days
- **Value:** Ensures optimal supplier pool. Discovers qualified suppliers the buyer didn't know about.

### 13. Contract Renewal Intelligence
- **What:** AI analyzes contract performance data and recommends renew/renegotiate/terminate
- **Where:** Contract detail page → "Renewal Analysis" card (appears 90 days before expiry)
- **How:** Combine: supplier performance, market rates, contract terms, compliance history
- **Effort:** 3-5 days
- **Value:** Prevents auto-renewals of underperforming contracts

### 14. Evaluation Consensus Mediator
- **What:** When evaluators disagree, AI identifies specific points of divergence and suggests resolution
- **Where:** Consensus scoring page → "✨ Analyze Disagreements" button
- **How:** Compare scores per criterion, identify outliers, summarize each evaluator's justification
- **Effort:** 2-3 days
- **Value:** Faster consensus. Reduces bias. Documents reasoning.

### 15. Automated Email Drafting
- **What:** AI drafts notification emails with context-appropriate language
- **Where:** Notification system → templates use AI for personalization
- **How:** Generate: invitation emails, award notifications, rejection messages, deadline reminders
- **Effort:** 2-3 days
- **Value:** Professional communication without manual writing

---

## Phase 3: Transformative AI (Future Vision)

### 16. Document Intelligence (OCR + Analysis)
- **What:** Upload any procurement document → AI extracts structured data
- **How:** OCR for scanned documents + Claude for extraction
- **Use cases:**
  - Upload a supplier's ISO certificate → auto-populate certification record
  - Upload a contract PDF → extract key terms, dates, values
  - Upload competitor's RFx → analyze structure and requirements
- **Effort:** 2-3 weeks
- **Dependencies:** MinIO/S3 file storage (Sprint 8+)

### 17. Predictive Analytics Dashboard
- **What:** AI-powered forecasting on procurement outcomes
- **Predictions:**
  - "Based on current bids, this auction will save 15-20% vs estimated value"
  - "3 contracts expiring in Q2 with high-risk suppliers — recommend early renewal"
  - "Event response rate declining — suggest broader supplier base"
- **Effort:** 1-2 weeks

### 18. Natural Language Querying
- **What:** Ask questions in plain English → get data from the platform
- **Examples:**
  - "What's our total spend on IT services this quarter?"
  - "Show me all events that saved more than 15%"
  - "Which suppliers have declining performance scores?"
- **How:** Claude converts natural language → API queries → formatted results
- **Effort:** 1-2 weeks

### 19. Autonomous Procurement Agent
- **What:** AI agent that can create events, invite suppliers, and manage workflows with human oversight
- **Flow:** "Create an RFQ for 500 laptops, invite our top 5 IT suppliers, set deadline 2 weeks"
  → AI creates event, configures lots, invites suppliers, sets timeline
  → Human reviews and approves before publishing
- **How:** Claude Agent SDK for multi-step orchestration
- **Effort:** 3-4 weeks
- **Dependencies:** All core modules complete

### 20. Multi-Modal Analysis
- **What:** Analyze images, floor plans, technical drawings alongside text bids
- **Use cases:** Construction bids with site photos, manufacturing specs with diagrams
- **How:** Claude's vision capabilities for image analysis
- **Effort:** 1-2 weeks

---

## Priority Matrix

| Feature | Business Value | Implementation Effort | Priority |
|---------|---------------|----------------------|----------|
| Phase 1 (8 features) | HIGH | DONE (need API credits only) | **P0** |
| Bid Compliance Checker | VERY HIGH | Medium (5 days) | **P1** |
| Smart Supplier Matching | HIGH | Medium (5 days) | **P1** |
| Auction Price Predictor | HIGH | Medium (7 days) | **P1** |
| Automated Email Drafting | MEDIUM | Low (3 days) | **P2** |
| Evaluation Consensus Mediator | MEDIUM | Low (3 days) | **P2** |
| Contract Renewal Intelligence | HIGH | Medium (5 days) | **P2** |
| Bid Collusion Detection | VERY HIGH (compliance) | Medium (7 days) | **P2** |
| Document Intelligence | VERY HIGH | High (3 weeks) | **P3** |
| Natural Language Querying | HIGH | High (2 weeks) | **P3** |
| Predictive Analytics | HIGH | High (2 weeks) | **P3** |
| Autonomous Agent | TRANSFORMATIVE | Very High (4 weeks) | **P4** |
| Multi-Modal Analysis | MEDIUM | Medium (2 weeks) | **P4** |

---

## Cost Estimate (Claude API)

| Usage Tier | Monthly Volume | Estimated Cost |
|-----------|---------------|----------------|
| Light (10 users) | ~5,000 requests | $50-100/month |
| Medium (50 users) | ~25,000 requests | $250-500/month |
| Heavy (200 users) | ~100,000 requests | $1,000-2,000/month |

*Based on Claude Sonnet pricing. Costs decrease with caching and prompt optimization.*

---

## Competitive Advantage

| Competitor | AI Capability | Our Advantage |
|-----------|--------------|---------------|
| SAP Ariba | Basic AI suggestions, no copilot | Full copilot + 8 AI features + extensible |
| Jaggaer | ML-based spend analytics only | AI across ALL modules + real-time assistance |
| Coupa | AI-powered supplier risk (limited) | Deeper integration: risk + compliance + scoring + contract |
| GEP SMART | Generative AI for descriptions | Same + bid analysis + award recommendation + chat |

**Our differentiator:** AI is woven into every module, not bolted on as a separate feature. Every user interaction has an AI assist option.

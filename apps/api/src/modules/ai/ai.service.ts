import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AIService } from '../../common/services/ai.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RFX_DESCRIPTION_PROMPT, EVAL_CRITERIA_PROMPT, LINE_ITEMS_PROMPT } from './prompts/rfx-prompts';
import { BID_ANALYSIS_PROMPT, SCORING_RECOMMENDATION_PROMPT } from './prompts/bid-prompts';
import { SUPPLIER_RISK_PROMPT } from './prompts/supplier-prompts';
import { CONTRACT_ANALYSIS_PROMPT } from './prompts/contract-prompts';
import { AWARD_RECOMMENDATION_PROMPT, JUSTIFICATION_PROMPT } from './prompts/award-prompts';
import { COPILOT_SYSTEM_PROMPT } from './prompts/copilot-prompts';
import {
  BID_COMPLIANCE_CHECK_PROMPT, AUCTION_PRICE_PREDICTION_PROMPT, SUPPLIER_MATCHING_PROMPT,
  EMAIL_DRAFTING_PROMPT, CONSENSUS_MEDIATION_PROMPT, CONTRACT_RENEWAL_PROMPT, COLLUSION_DETECTION_PROMPT,
} from './prompts/phase2-prompts';
import {
  NATURAL_LANGUAGE_QUERY_PROMPT, DOCUMENT_SUMMARY_PROMPT, PROCUREMENT_AGENT_PROMPT,
} from './prompts/phase3-prompts';

const DISABLED_RESPONSE = { aiEnabled: false, message: 'AI features are not configured. Set ANTHROPIC_API_KEY to enable.' };

@Injectable()
export class AIFeatureService {
  private readonly logger = new Logger(AIFeatureService.name);

  constructor(
    private readonly ai: AIService,
    private readonly prisma: PrismaService,
  ) {}

  // ── RFx Description Generator ─────────────────────────────────────────────

  async generateRfxDescription(dto: { title: string; eventType: string; category?: string; estimatedValue?: number; requirements?: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const prompt = `Generate a procurement event description for:
Title: ${dto.title}
Type: ${dto.eventType}
${dto.category ? `Category: ${dto.category}` : ''}
${dto.estimatedValue ? `Estimated Value: $${dto.estimatedValue.toLocaleString()}` : ''}
${dto.requirements ? `Key Requirements: ${dto.requirements}` : ''}`;

    const result = await this.ai.generateText({
      system: RFX_DESCRIPTION_PROMPT,
      prompt,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'RFX_DESCRIPTION',
    });

    return result ? { aiEnabled: true, description: result.text, tokens: { input: result.inputTokens, output: result.outputTokens } } : DISABLED_RESPONSE;
  }

  // ── Evaluation Criteria Suggestions ────────────────────────────────────────

  async suggestEvalCriteria(dto: { eventType: string; category?: string; description?: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const prompt = `Suggest evaluation criteria for:
Event Type: ${dto.eventType}
${dto.category ? `Category: ${dto.category}` : ''}
${dto.description ? `Description: ${dto.description}` : ''}`;

    const result = await this.ai.generateJSON<Array<{ name: string; description: string; weight: number; maxScore: number; envelope: string }>>({
      system: EVAL_CRITERIA_PROMPT,
      prompt,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'EVAL_CRITERIA_SUGGESTION',
    });

    return result ? { aiEnabled: true, criteria: result } : DISABLED_RESPONSE;
  }

  // ── Line Item Generator ───────────────────────────────────────────────────

  async generateLineItems(dto: { description: string; currency?: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const prompt = `Generate line items for: ${dto.description}\nCurrency: ${dto.currency ?? 'USD'}`;

    const result = await this.ai.generateJSON<Array<{ description: string; quantity: number; uom: string; targetPrice: number | null }>>({
      system: LINE_ITEMS_PROMPT,
      prompt,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'LINE_ITEM_GENERATION',
    });

    return result ? { aiEnabled: true, lineItems: result } : DISABLED_RESPONSE;
  }

  // ── Bid Analysis ──────────────────────────────────────────────────────────

  async analyzeBid(dto: { bidData: string; requirements: string; criteria?: string[] }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const prompt = `BID SUBMISSION:\n${dto.bidData}\n\nREQUIREMENTS:\n${dto.requirements}${dto.criteria?.length ? `\n\nEVALUATION CRITERIA:\n${dto.criteria.join('\n')}` : ''}`;

    const result = await this.ai.generateJSON<{ summary: string; strengths: string[]; weaknesses: string[]; complianceFlags: string[]; assessment: string }>({
      system: BID_ANALYSIS_PROMPT,
      prompt,
      maxTokens: 3000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'BID_ANALYSIS',
    });

    return result ? { aiEnabled: true, analysis: result } : DISABLED_RESPONSE;
  }

  // ── Supplier Risk Assessment ──────────────────────────────────────────────

  async assessSupplierRisk(dto: { supplierId: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    // Gather supplier data
    const profile = await this.prisma.supplierProfile.findFirst({ where: { orgId: dto.supplierId } });
    const scorecards = await this.prisma.supplierScorecard.findMany({
      where: { supplierId: dto.supplierId },
      orderBy: { periodStart: 'desc' },
      take: 4,
    });
    const qualifications = await this.prisma.supplierQualification.findMany({
      where: { supplierId: dto.supplierId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const prompt = `Assess risk for this supplier:
PROFILE: ${JSON.stringify(profile ?? { status: 'NO_PROFILE' })}
RECENT SCORECARDS (last 4 periods): ${JSON.stringify(scorecards)}
QUALIFICATIONS: ${JSON.stringify(qualifications)}`;

    const result = await this.ai.generateJSON<{ riskLevel: string; riskScore: number; factors: Array<{ factor: string; severity: string; description: string }>; recommendation: string; mitigations: string[] }>({
      system: SUPPLIER_RISK_PROMPT,
      prompt,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'SUPPLIER_RISK',
    });

    return result ? { aiEnabled: true, risk: result } : DISABLED_RESPONSE;
  }

  // ── Contract Analysis ─────────────────────────────────────────────────────

  async analyzeContract(dto: { contractTerms: string; contractType: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const prompt = `Contract Type: ${dto.contractType}\n\nTERMS:\n${dto.contractTerms}`;

    const result = await this.ai.generateJSON<{ summary: string; keyTerms: Array<{ term: string; value: string; assessment: string }>; riskyClauses: Array<{ clause: string; risk: string; severity: string; recommendation: string }>; missingClauses: string[]; recommendations: string[] }>({
      system: CONTRACT_ANALYSIS_PROMPT,
      prompt,
      maxTokens: 3000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'CONTRACT_ANALYSIS',
    });

    return result ? { aiEnabled: true, analysis: result } : DISABLED_RESPONSE;
  }

  // ── Award Recommendation ──────────────────────────────────────────────────

  async recommendAward(dto: { evaluationId: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: dto.evaluationId, orgId: user.orgId! },
      include: { criteria: true, scores: true },
    });

    if (!evaluation) return { aiEnabled: true, error: 'Evaluation not found' };

    const prompt = `Recommend an award based on this evaluation:
EVALUATION: ${evaluation.title} (${evaluation.envelopeType})
CRITERIA: ${JSON.stringify(evaluation.criteria)}
SCORES: ${JSON.stringify(evaluation.scores)}`;

    const result = await this.ai.generateJSON<{ recommendation: { supplierId: string; supplierName: string; reason: string }; alternatives: Array<{ supplierId: string; pros: string; cons: string }>; justification: string; awardMode: string }>({
      system: AWARD_RECOMMENDATION_PROMPT,
      prompt,
      maxTokens: 3000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'AWARD_RECOMMENDATION',
    });

    return result ? { aiEnabled: true, recommendation: result } : DISABLED_RESPONSE;
  }

  // ── Procurement Copilot ───────────────────────────────────────────────────

  async copilotChat(dto: { message: string; context?: { page?: string; entityId?: string; entityType?: string } }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const contextStr = dto.context ? `\nUser is on page: ${dto.context.page ?? 'unknown'}${dto.context.entityType ? `, viewing ${dto.context.entityType} ${dto.context.entityId}` : ''}` : '';
    const prompt = `${dto.message}${contextStr}`;

    const result = await this.ai.generateText({
      system: COPILOT_SYSTEM_PROMPT,
      prompt,
      maxTokens: 1500,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'COPILOT',
    });

    return result ? { aiEnabled: true, response: result.text, tokens: { input: result.inputTokens, output: result.outputTokens } } : DISABLED_RESPONSE;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Phase 2 Features ───────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // ── Bid Compliance Checker ────────────────────────────────────────────────

  async checkBidCompliance(dto: { bidId: string; rfxEventId: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    // Fetch bid submission
    const bid = await this.prisma.bidSubmission.findFirst({
      where: { id: dto.bidId, orgId: user.orgId! },
      include: { lineItems: true },
    });
    if (!bid) return { aiEnabled: true, error: 'Bid submission not found' };

    // Fetch RFx event with lots and their line items
    const rfxEvent = await this.prisma.rfxEvent.findFirst({
      where: { id: dto.rfxEventId, orgId: user.orgId! },
      include: { lots: { include: { lineItems: true } } },
    });
    if (!rfxEvent) return { aiEnabled: true, error: 'RFx event not found' };

    const rfxLineItems = rfxEvent.lots.flatMap((lot) => lot.lineItems);

    const prompt = `Check this bid for compliance against the RFx requirements:

RFX EVENT: ${rfxEvent.title} (${rfxEvent.type})
DESCRIPTION: ${rfxEvent.description ?? 'N/A'}
RFX LINE ITEMS: ${JSON.stringify(rfxLineItems)}

BID SUBMISSION:
STATUS: ${bid.status}
BID LINE ITEMS: ${JSON.stringify(bid.lineItems)}
NOTES: ${bid.notes ?? 'N/A'}`;

    const result = await this.ai.generateJSON<{
      overallStatus: string;
      complianceScore: number;
      requirements: Array<{ requirement: string; status: string; evidence: string; gap: string }>;
      summary: string;
      criticalGaps: string[];
    }>({
      system: BID_COMPLIANCE_CHECK_PROMPT,
      prompt,
      maxTokens: 3000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'BID_COMPLIANCE_CHECK',
    });

    return result ? { aiEnabled: true, compliance: result } : DISABLED_RESPONSE;
  }

  // ── Auction Price Predictor ───────────────────────────────────────────────

  async predictAuctionPrice(dto: { category: string; estimatedValue?: number; supplierCount?: number }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const prompt = `Predict auction pricing for:
Category: ${dto.category}
${dto.estimatedValue ? `Estimated Value: $${dto.estimatedValue.toLocaleString()}` : 'Estimated Value: Not provided'}
${dto.supplierCount ? `Number of Suppliers: ${dto.supplierCount}` : 'Supplier Count: Unknown'}`;

    const result = await this.ai.generateJSON<{
      suggestedStartingPrice: number;
      suggestedReservePrice: number;
      expectedSavingsPercent: number;
      priceRange: { low: number; high: number };
      confidence: string;
      reasoning: string;
      marketFactors: string[];
    }>({
      system: AUCTION_PRICE_PREDICTION_PROMPT,
      prompt,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'AUCTION_PRICE_PREDICTION',
    });

    return result ? { aiEnabled: true, prediction: result } : DISABLED_RESPONSE;
  }

  // ── Smart Supplier Matching ───────────────────────────────────────────────

  async matchSuppliers(dto: { requirements: string; category?: string; budgetRange?: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    // Fetch available supplier profiles and scorecards
    const suppliers = await this.prisma.supplierProfile.findMany({
      where: { isActive: true },
      take: 50,
    });

    const supplierIds = suppliers.map((s) => s.orgId);
    const scorecards = await this.prisma.supplierScorecard.findMany({
      where: { supplierId: { in: supplierIds } },
      orderBy: { periodStart: 'desc' },
    });

    const qualifications = await this.prisma.supplierQualification.findMany({
      where: { supplierId: { in: supplierIds }, status: 'APPROVED' },
    });

    const prompt = `Match suppliers for these requirements:
REQUIREMENTS: ${dto.requirements}
${dto.category ? `CATEGORY: ${dto.category}` : ''}
${dto.budgetRange ? `BUDGET RANGE: ${dto.budgetRange}` : ''}

AVAILABLE SUPPLIERS: ${JSON.stringify(suppliers)}
RECENT SCORECARDS: ${JSON.stringify(scorecards)}
QUALIFICATIONS: ${JSON.stringify(qualifications)}`;

    const result = await this.ai.generateJSON<{
      matches: Array<{
        supplierId: string;
        supplierName: string;
        matchScore: number;
        matchReasons: string[];
        concerns: string[];
        rank: number;
      }>;
      unmatchedRequirements: string[];
      recommendation: string;
    }>({
      system: SUPPLIER_MATCHING_PROMPT,
      prompt,
      maxTokens: 3000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'SUPPLIER_MATCHING',
    });

    return result ? { aiEnabled: true, matching: result } : DISABLED_RESPONSE;
  }

  // ── Automated Email Drafting ──────────────────────────────────────────────

  async draftEmail(dto: { type: string; context: Record<string, string> }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const contextLines = Object.entries(dto.context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const prompt = `Draft a ${dto.type} email with this context:
${contextLines}`;

    const result = await this.ai.generateJSON<{
      subject: string;
      body: string;
      tone: string;
    }>({
      system: EMAIL_DRAFTING_PROMPT,
      prompt,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'EMAIL_DRAFTING',
    });

    return result ? { aiEnabled: true, email: result } : DISABLED_RESPONSE;
  }

  // ── Evaluation Consensus Mediator ─────────────────────────────────────────

  async mediateConsensus(dto: { evaluationId: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: dto.evaluationId, orgId: user.orgId! },
      include: { criteria: true, scores: true },
    });

    if (!evaluation) return { aiEnabled: true, error: 'Evaluation not found' };

    const prompt = `Mediate consensus for this evaluation:
EVALUATION: ${evaluation.title} (${evaluation.envelopeType})
CRITERIA: ${JSON.stringify(evaluation.criteria)}
ALL EVALUATOR SCORES: ${JSON.stringify(evaluation.scores)}`;

    const result = await this.ai.generateJSON<{
      overallAlignment: string;
      alignmentScore: number;
      agreements: Array<{ criterion: string; averageScore: number; spread: number; evaluatorScores: Record<string, number> }>;
      disagreements: Array<{ criterion: string; spread: number; evaluatorScores: Record<string, number>; possibleReasons: string; suggestedResolution: string }>;
      outliers: Array<{ evaluatorId: string; criterion: string; score: number; deviation: number; note: string }>;
      recommendations: string[];
      suggestedFinalScores: Array<{ criterion: string; suggestedScore: number; method: string }>;
    }>({
      system: CONSENSUS_MEDIATION_PROMPT,
      prompt,
      maxTokens: 3000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'CONSENSUS_MEDIATION',
    });

    return result ? { aiEnabled: true, mediation: result } : DISABLED_RESPONSE;
  }

  // ── Contract Renewal Intelligence ─────────────────────────────────────────

  async analyzeRenewal(dto: { contractId: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId, orgId: user.orgId! },
      include: { amendments: true },
    });

    if (!contract) return { aiEnabled: true, error: 'Contract not found' };

    // Fetch supplier performance for this contract's supplier
    const scorecards = await this.prisma.supplierScorecard.findMany({
      where: { supplierId: contract.supplierId },
      orderBy: { periodStart: 'desc' },
      take: 4,
    });

    const prompt = `Analyse this contract for renewal:
CONTRACT: ${contract.title} (${contract.contractType})
STATUS: ${contract.status}
VALUE: ${contract.totalValue}
START: ${contract.startDate}
END: ${contract.endDate}
AMENDMENTS: ${JSON.stringify(contract.amendments)}
SUPPLIER SCORECARDS (last 4 periods): ${JSON.stringify(scorecards)}`;

    const result = await this.ai.generateJSON<{
      recommendation: string;
      confidence: string;
      reasoning: string;
      performanceSummary: string;
      riskFactors: Array<{ factor: string; severity: string; description: string }>;
      negotiationPoints: string[];
      marketConditions: string;
      financialImpact: { currentAnnualValue: number; suggestedNewValue: number; savingsOpportunity: string };
      timeline: string;
    }>({
      system: CONTRACT_RENEWAL_PROMPT,
      prompt,
      maxTokens: 3000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'CONTRACT_RENEWAL_ANALYSIS',
    });

    return result ? { aiEnabled: true, renewal: result } : DISABLED_RESPONSE;
  }

  // ── Bid Collusion Detection ───────────────────────────────────────────────

  async detectCollusion(dto: { auctionId: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const auction = await this.prisma.auction.findFirst({
      where: { id: dto.auctionId, orgId: user.orgId! },
    });

    if (!auction) return { aiEnabled: true, error: 'Auction not found' };

    const bids = await this.prisma.auctionBid.findMany({
      where: { auctionId: dto.auctionId },
      orderBy: { createdAt: 'asc' },
    });

    if (bids.length < 2) return { aiEnabled: true, error: 'Insufficient bids for collusion analysis (minimum 2 required)' };

    const prompt = `Analyse these auction bids for potential collusion:
AUCTION: ${auction.title} (${auction.auctionType})
TOTAL BIDS: ${bids.length}
BID DATA:
${JSON.stringify(bids.map((b) => ({
  supplierId: b.supplierId,
  bidPrice: b.bidPrice,
  bidNumber: b.bidNumber,
  timestamp: b.placedAt,
  rank: b.rank,
})))}`;

    const result = await this.ai.generateJSON<{
      riskLevel: string;
      riskScore: number;
      patterns: Array<{ patternType: string; description: string; evidence: string; severity: string; involvedSuppliers: string[] }>;
      statisticalIndicators: Array<{ indicator: string; value: number; threshold: number; flagged: boolean }>;
      recommendation: string;
      disclaimer: string;
    }>({
      system: COLLUSION_DETECTION_PROMPT,
      prompt,
      maxTokens: 3000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'COLLUSION_DETECTION',
    });

    return result ? { aiEnabled: true, collusionAnalysis: result } : DISABLED_RESPONSE;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Phase 3 Features ───────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // ── Natural Language Querying ─────────────────────────────────────────────

  async naturalLanguageQuery(dto: { query: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    // First pass: AI interprets the query and produces a query plan
    const planResult = await this.ai.generateJSON<{
      intent: string;
      entities: string[];
      filters: Record<string, string>;
      queryPlan: string;
      suggestedVisualization: string;
      followUpQuestions: string[];
    }>({
      system: NATURAL_LANGUAGE_QUERY_PROMPT,
      prompt: `User question: "${dto.query}"

Available data entities: EVENTS (rfx_events), BIDS (bid_submissions), SUPPLIERS (supplier_profiles), CONTRACTS (contracts), AUCTIONS (auctions), EVALUATIONS (evaluations).
User's organisation ID: ${user.orgId ?? 'N/A'}`,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'NL_QUERY_PLAN',
    });

    if (!planResult) return DISABLED_RESPONSE;

    // Second pass: Execute basic aggregate queries based on the plan
    let queryData: Record<string, unknown> = {};
    try {
      if (planResult.entities.includes('EVENTS')) {
        queryData.eventCount = await this.prisma.rfxEvent.count({ where: { orgId: user.orgId! } });
      }
      if (planResult.entities.includes('BIDS')) {
        queryData.bidCount = await this.prisma.bidSubmission.count({ where: { orgId: user.orgId! } });
      }
      if (planResult.entities.includes('CONTRACTS')) {
        queryData.contractCount = await this.prisma.contract.count({ where: { orgId: user.orgId! } });
      }
      if (planResult.entities.includes('AUCTIONS')) {
        queryData.auctionCount = await this.prisma.auction.count({ where: { orgId: user.orgId! } });
      }
      if (planResult.entities.includes('SUPPLIERS')) {
        queryData.supplierCount = await this.prisma.supplierProfile.count({ where: { isActive: true } });
      }
    } catch (error) {
      this.logger.warn(`NL query data fetch failed: ${error}`);
    }

    // Third pass: AI formats the answer using the data
    const answerResult = await this.ai.generateText({
      system: 'You are a procurement data assistant. Given a user question and the data retrieved, provide a clear, helpful answer. If the data is insufficient to fully answer, explain what additional data would be needed.',
      prompt: `Question: "${dto.query}"
Query plan: ${planResult.queryPlan}
Retrieved data: ${JSON.stringify(queryData)}`,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'NL_QUERY_ANSWER',
    });

    return {
      aiEnabled: true,
      plan: planResult,
      data: queryData,
      answer: answerResult?.text ?? 'Unable to generate answer.',
      followUpQuestions: planResult.followUpQuestions,
      suggestedVisualization: planResult.suggestedVisualization,
    };
  }

  // ── Document Summary ──────────────────────────────────────────────────────

  async summarizeDocument(dto: { content: string; documentType: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const prompt = `Document Type: ${dto.documentType}

DOCUMENT CONTENT:
${dto.content}`;

    const result = await this.ai.generateJSON<{
      title: string;
      documentType: string;
      summary: string;
      keyPoints: string[];
      entities: { parties: string[]; dates: string[]; values: string[]; locations: string[] };
      actionItems: string[];
      riskFlags: string[];
      metadata: { estimatedPages: number; complexity: string; confidentialityLevel: string };
    }>({
      system: DOCUMENT_SUMMARY_PROMPT,
      prompt,
      maxTokens: 3000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'DOCUMENT_SUMMARY',
    });

    return result ? { aiEnabled: true, summary: result } : DISABLED_RESPONSE;
  }

  // ── Procurement Agent (Multi-step) ────────────────────────────────────────

  async executeAgentTask(dto: { instruction: string }, user: JwtPayload) {
    if (!this.ai.isEnabled()) return DISABLED_RESPONSE;

    const prompt = `User instruction: "${dto.instruction}"

Available event types: RFI, RFP, RFQ, ITT, REVERSE_AUCTION, DUTCH_AUCTION, JAPANESE_AUCTION
Available currencies: USD, EUR, GBP, AED, SAR
User's organisation: ${user.orgId ?? 'N/A'}

Plan and structure this procurement task.`;

    const result = await this.ai.generateJSON<{
      taskType: string;
      steps: Array<{
        stepNumber: number;
        action: string;
        entity: string;
        description: string;
        parameters: Record<string, unknown>;
        dependsOn: number[];
      }>;
      outputs: Array<{ name: string; type: string; description: string }>;
      eventDraft?: {
        title: string;
        eventType: string;
        description: string;
        category: string;
        estimatedValue: number;
        currency: string;
        deadline: string;
        lineItems: Array<{ description: string; quantity: number; uom: string }>;
        evaluationCriteria: Array<{ name: string; weight: number; maxScore: number }>;
        suggestedTimeline: {
          publishDate: string;
          questionDeadline: string;
          submissionDeadline: string;
          evaluationEnd: string;
        };
      };
      warnings: string[];
      confidence: string;
    }>({
      system: PROCUREMENT_AGENT_PROMPT,
      prompt,
      maxTokens: 4000,
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      feature: 'PROCUREMENT_AGENT',
    });

    return result ? { aiEnabled: true, agentResult: result } : DISABLED_RESPONSE;
  }

  // ── AI Usage Stats ────────────────────────────────────────────────────────

  async getUsageStats(orgId?: string) {
    const where = orgId ? { orgId } : {};

    const total = await this.prisma.aIInteraction.count({ where });
    const totalTokens = await this.prisma.aIInteraction.aggregate({
      where,
      _sum: { inputTokens: true, outputTokens: true },
    });

    const byFeature = await this.prisma.aIInteraction.groupBy({
      by: ['feature'],
      where,
      _count: true,
      _sum: { inputTokens: true, outputTokens: true },
    });

    const successRate = total > 0
      ? (await this.prisma.aIInteraction.count({ where: { ...where, success: true } })) / total * 100
      : 0;

    return {
      enabled: this.ai.isEnabled(),
      totalInteractions: total,
      totalInputTokens: totalTokens._sum.inputTokens ?? 0,
      totalOutputTokens: totalTokens._sum.outputTokens ?? 0,
      successRate: Math.round(successRate),
      byFeature: byFeature.map((f) => ({
        feature: f.feature,
        count: f._count,
        inputTokens: f._sum.inputTokens ?? 0,
        outputTokens: f._sum.outputTokens ?? 0,
      })),
    };
  }
}

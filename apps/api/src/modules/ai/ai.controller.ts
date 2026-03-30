import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AIFeatureService } from './ai.service';
import {
  GenerateRfxDescriptionDto, SuggestEvalCriteriaDto, GenerateLineItemsDto,
  AnalyzeBidDto, SupplierRiskDto, AnalyzeContractDto, AwardRecommendationDto, CopilotChatDto,
  // Phase 2
  CheckBidComplianceDto, PredictAuctionPriceDto, MatchSuppliersDto,
  DraftEmailDto, MediateConsensusDto, AnalyzeRenewalDto, DetectCollusionDto,
  // Phase 3
  NaturalLanguageQueryDto, SummarizeDocumentDto, AgentTaskDto,
} from './dto/ai.dto';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ short: { limit: 10, ttl: 60000 } }) // 10 AI requests per minute
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIFeatureService) {}

  // ── RFx Features ──────────────────────────────────────────────────────────

  @Post('rfx/generate-description')
  @Roles('EVENT_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Generate professional RFx event description' })
  async generateDescription(@Body() dto: GenerateRfxDescriptionDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.generateRfxDescription(dto, user);
  }

  @Post('rfx/suggest-criteria')
  @Roles('EVENT_CREATE', 'EVAL_MANAGE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Suggest evaluation criteria for event type' })
  async suggestCriteria(@Body() dto: SuggestEvalCriteriaDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.suggestEvalCriteria(dto, user);
  }

  @Post('rfx/generate-line-items')
  @Roles('EVENT_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Generate line items from text description' })
  async generateLineItems(@Body() dto: GenerateLineItemsDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.generateLineItems(dto, user);
  }

  // ── Evaluation Features ───────────────────────────────────────────────────

  @Post('bids/analyze')
  @Roles('EVAL_VIEW', 'EVAL_MANAGE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Analyze bid submission (strengths, weaknesses, compliance)' })
  async analyzeBid(@Body() dto: AnalyzeBidDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.analyzeBid(dto, user);
  }

  // ── Supplier Features ─────────────────────────────────────────────────────

  @Post('suppliers/risk-assessment')
  @Roles('SUPPLIER_VIEW', 'SUPPLIER_MANAGE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Assess supplier risk from profile + history' })
  async assessSupplierRisk(@Body() dto: SupplierRiskDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.assessSupplierRisk(dto, user);
  }

  // ── Contract Features ─────────────────────────────────────────────────────

  @Post('contracts/analyze')
  @Roles('CONTRACT_VIEW', 'CONTRACT_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Analyze contract terms and flag risks' })
  async analyzeContract(@Body() dto: AnalyzeContractDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.analyzeContract(dto, user);
  }

  // ── Award Features ────────────────────────────────────────────────────────

  @Post('awards/recommend')
  @Roles('AWARD_RECOMMEND', 'AWARD_APPROVE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Recommend award based on evaluation scores' })
  async recommendAward(@Body() dto: AwardRecommendationDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.recommendAward(dto, user);
  }

  // ── Copilot ───────────────────────────────────────────────────────────────

  @Post('chat')
  @ApiOperation({ summary: 'AI: Procurement copilot chat (context-aware assistant)' })
  async copilotChat(@Body() dto: CopilotChatDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.copilotChat(dto, user);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Phase 2 Endpoints ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // ── Bid Compliance ────────────────────────────────────────────────────────

  @Post('bids/compliance-check')
  @Roles('EVAL_VIEW', 'EVAL_MANAGE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Check bid compliance against RFx requirements' })
  async checkBidCompliance(@Body() dto: CheckBidComplianceDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.checkBidCompliance(dto, user);
  }

  // ── Auction Price Prediction ──────────────────────────────────────────────

  @Post('auctions/predict-price')
  @Roles('EVENT_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Predict auction pricing strategy (starting, reserve, savings)' })
  async predictAuctionPrice(@Body() dto: PredictAuctionPriceDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.predictAuctionPrice(dto, user);
  }

  // ── Smart Supplier Matching ───────────────────────────────────────────────

  @Post('suppliers/match')
  @Roles('SUPPLIER_VIEW', 'SUPPLIER_MANAGE', 'EVENT_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Match and rank suppliers against procurement requirements' })
  async matchSuppliers(@Body() dto: MatchSuppliersDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.matchSuppliers(dto, user);
  }

  // ── Automated Email Drafting ──────────────────────────────────────────────

  @Post('emails/draft')
  @Roles('EVENT_CREATE', 'AWARD_RECOMMEND', 'CONTRACT_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Draft procurement-related emails (invitation, award, rejection, etc.)' })
  async draftEmail(@Body() dto: DraftEmailDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.draftEmail(dto, user);
  }

  // ── Evaluation Consensus Mediator ─────────────────────────────────────────

  @Post('evaluations/mediate')
  @Roles('EVAL_MANAGE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Mediate evaluator score disagreements and suggest consensus' })
  async mediateConsensus(@Body() dto: MediateConsensusDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.mediateConsensus(dto, user);
  }

  // ── Contract Renewal Intelligence ─────────────────────────────────────────

  @Post('contracts/renewal-analysis')
  @Roles('CONTRACT_VIEW', 'CONTRACT_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Analyse contract for renewal recommendation (renew/renegotiate/terminate)' })
  async analyzeRenewal(@Body() dto: AnalyzeRenewalDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.analyzeRenewal(dto, user);
  }

  // ── Bid Collusion Detection ───────────────────────────────────────────────

  @Post('auctions/detect-collusion')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // Stricter: 5 per minute (sensitive operation)
  @ApiOperation({ summary: 'AI: Detect potential bid collusion patterns in auction (admin only)' })
  async detectCollusion(@Body() dto: DetectCollusionDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.detectCollusion(dto, user);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Phase 3 Endpoints ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // ── Natural Language Querying ─────────────────────────────────────────────

  @Post('query')
  @ApiOperation({ summary: 'AI: Ask procurement questions in natural language' })
  async naturalLanguageQuery(@Body() dto: NaturalLanguageQueryDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.naturalLanguageQuery(dto, user);
  }

  // ── Document Summary ──────────────────────────────────────────────────────

  @Post('documents/summarize')
  @Roles('EVENT_VIEW', 'CONTRACT_VIEW', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'AI: Summarise and extract key info from procurement documents' })
  async summarizeDocument(@Body() dto: SummarizeDocumentDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.summarizeDocument(dto, user);
  }

  // ── Procurement Agent ─────────────────────────────────────────────────────

  @Post('agent/execute')
  @Roles('EVENT_CREATE', 'PLATFORM_ADMIN')
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // Stricter: agent tasks are resource-intensive
  @ApiOperation({ summary: 'AI: Multi-step procurement agent — plans and structures tasks from instructions' })
  async executeAgentTask(@Body() dto: AgentTaskDto, @CurrentUser() user: JwtPayload) {
    return this.aiService.executeAgentTask(dto, user);
  }

  // ── Status & Usage ────────────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'AI: Check if AI features are enabled + usage stats' })
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.aiService.getUsageStats(user.orgId ?? undefined);
  }
}

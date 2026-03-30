import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import {
  CreateEvaluationDto,
  UpdateEvaluationDto,
  EvaluationFilterDto,
  AddCriterionDto,
  AssignEvaluatorDto,
  SubmitScoreDto,
  SubmitConsensusScoreDto,
  ShortlistDto,
} from './dto/evaluation.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  EvaluationCreatedEvent,
  EvaluationStartedEvent,
  EvaluationCompletedEvent,
  ScoreSubmittedEvent,
  ConsensusScoreSubmittedEvent,
  BidsShortlistedEvent,
} from '../../common/events/domain-events';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateEvaluationDto, user: JwtPayload) {
    const orgId = user.orgId!;
    this.logger.log(`Creating evaluation: orgId=${orgId} userId=${user.sub}`);

    // Validate weights sum to 100 if both are provided
    if (dto.technicalWeight != null && dto.commercialWeight != null) {
      const sum = Number(dto.technicalWeight) + Number(dto.commercialWeight);
      if (Math.abs(sum - 100) > 0.01) {
        throw new BadRequestException('Technical and commercial weights must sum to 100');
      }
    }

    const evaluation = await this.prisma.evaluation.create({
      data: {
        orgId,
        buId: dto.buId,
        rfxEventId: dto.rfxEventId,
        title: dto.title,
        description: dto.description,
        envelopeType: dto.envelopeType ?? 'SINGLE',
        technicalWeight: dto.technicalWeight,
        commercialWeight: dto.commercialWeight,
        createdById: user.sub,
        criteria: dto.criteria?.length
          ? {
              create: dto.criteria.map((c, idx) => ({
                orgId,
                name: c.name,
                description: c.description,
                envelope: c.envelope ?? 'TECHNICAL',
                weight: c.weight,
                maxScore: c.maxScore ?? 10,
                sortOrder: c.sortOrder ?? idx,
              })),
            }
          : undefined,
      },
      include: {
        criteria: { orderBy: { sortOrder: 'asc' } },
      },
    });

    this.eventEmitter.emit(
      'evaluation.created',
      new EvaluationCreatedEvent(evaluation.id, orgId, user.sub, dto.title),
    );

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'EVALUATION',
      entityId: evaluation.id,
      newValue: { title: dto.title, envelopeType: dto.envelopeType, rfxEventId: dto.rfxEventId },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'EVALUATION_CREATED',
      entityType: 'EVALUATION',
      entityId: evaluation.id,
      properties: { envelopeType: dto.envelopeType, criteriaCount: dto.criteria?.length ?? 0 },
    });

    return evaluation;
  }

  // ── List ────────────────────────────────────────────────────────────────────

  async findAll(orgId: string, filter: EvaluationFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const where: Record<string, unknown> = { orgId, isActive: true };
    if (filter.status) where.status = filter.status;
    if (filter.envelopeType) where.envelopeType = filter.envelopeType;
    if (filter.rfxEventId) where.rfxEventId = filter.rfxEventId;
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.evaluation.findMany({
        where: where as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { criteria: true, assignments: true, scores: true } },
        },
      }),
      this.prisma.evaluation.count({ where: where as any }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Detail ──────────────────────────────────────────────────────────────────

  async findOne(orgId: string, evaluationId: string) {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, orgId, isActive: true },
      include: {
        criteria: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        assignments: { where: { isActive: true }, orderBy: { assignedAt: 'desc' } },
        scores: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
        _count: { select: { criteria: true, assignments: true, scores: true } },
      },
    });
    if (!evaluation) throw new NotFoundException(`Evaluation ${evaluationId} not found`);
    return evaluation;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async update(orgId: string, evaluationId: string, dto: UpdateEvaluationDto, user: JwtPayload) {
    const evaluation = await this.findOne(orgId, evaluationId);
    if (evaluation.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT evaluations can be updated');
    }

    // Validate weights if both provided (merge with existing)
    const techWeight = dto.technicalWeight ?? (evaluation.technicalWeight ? Number(evaluation.technicalWeight) : null);
    const commWeight = dto.commercialWeight ?? (evaluation.commercialWeight ? Number(evaluation.commercialWeight) : null);
    if (techWeight != null && commWeight != null) {
      const sum = techWeight + commWeight;
      if (Math.abs(sum - 100) > 0.01) {
        throw new BadRequestException('Technical and commercial weights must sum to 100');
      }
    }

    const oldValue = {
      title: evaluation.title,
      envelopeType: evaluation.envelopeType,
      technicalWeight: evaluation.technicalWeight,
      commercialWeight: evaluation.commercialWeight,
    };

    const updated = await this.prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        title: dto.title,
        description: dto.description,
        envelopeType: dto.envelopeType,
        technicalWeight: dto.technicalWeight,
        commercialWeight: dto.commercialWeight,
      },
      include: {
        criteria: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'EVALUATION',
      entityId: evaluationId,
      oldValue,
      newValue: {
        title: updated.title,
        envelopeType: updated.envelopeType,
        technicalWeight: updated.technicalWeight,
        commercialWeight: updated.commercialWeight,
      },
    });

    return updated;
  }

  // ── State Machine ───────────────────────────────────────────────────────────

  async changeStatus(orgId: string, evaluationId: string, newStatus: string, user: JwtPayload) {
    const evaluation = await this.findOne(orgId, evaluationId);
    const allowed = VALID_TRANSITIONS[evaluation.status] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${evaluation.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    // Validate before starting: must have criteria and at least one evaluator
    if (newStatus === 'IN_PROGRESS') {
      if (evaluation.criteria.length === 0) {
        throw new BadRequestException('Cannot start evaluation without criteria');
      }
      if (evaluation.assignments.length === 0) {
        throw new BadRequestException('Cannot start evaluation without evaluator assignments');
      }
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'IN_PROGRESS') updateData.publishedAt = new Date();
    if (newStatus === 'COMPLETED') updateData.completedAt = new Date();

    const updated = await this.prisma.evaluation.update({
      where: { id: evaluationId },
      data: updateData,
    });

    // Emit domain events
    if (newStatus === 'IN_PROGRESS') {
      this.eventEmitter.emit(
        'evaluation.started',
        new EvaluationStartedEvent(evaluationId, orgId, user.sub),
      );
    } else if (newStatus === 'COMPLETED') {
      this.eventEmitter.emit(
        'evaluation.completed',
        new EvaluationCompletedEvent(evaluationId, orgId, user.sub),
      );
    }

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'STATUS_CHANGE',
      entityType: 'EVALUATION',
      entityId: evaluationId,
      oldValue: { status: evaluation.status },
      newValue: { status: newStatus },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: `EVALUATION_${newStatus}`,
      entityType: 'EVALUATION',
      entityId: evaluationId,
    });

    return updated;
  }

  // ── Add Criterion ───────────────────────────────────────────────────────────

  async addCriterion(orgId: string, evaluationId: string, dto: AddCriterionDto, user: JwtPayload) {
    const evaluation = await this.findOne(orgId, evaluationId);
    if (evaluation.status !== 'DRAFT') {
      throw new BadRequestException('Criteria can only be added to DRAFT evaluations');
    }

    const criterion = await this.prisma.evaluationCriterion.create({
      data: {
        evaluationId,
        orgId,
        name: dto.name,
        description: dto.description,
        envelope: dto.envelope ?? 'TECHNICAL',
        weight: dto.weight,
        maxScore: dto.maxScore ?? 10,
        sortOrder: dto.sortOrder ?? evaluation.criteria.length,
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'EVALUATION_CRITERION',
      entityId: criterion.id,
      newValue: { evaluationId, name: dto.name, envelope: dto.envelope, weight: dto.weight },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'EVALUATION_CRITERION_ADDED',
      entityType: 'EVALUATION_CRITERION',
      entityId: criterion.id,
      properties: { evaluationId, envelope: dto.envelope },
    });

    return criterion;
  }

  // ── Assign Evaluator ────────────────────────────────────────────────────────

  async assignEvaluator(orgId: string, evaluationId: string, dto: AssignEvaluatorDto, user: JwtPayload) {
    const evaluation = await this.findOne(orgId, evaluationId);
    if (evaluation.status === 'COMPLETED' || evaluation.status === 'CANCELLED') {
      throw new BadRequestException('Cannot assign evaluators to a completed or cancelled evaluation');
    }

    const envelope = dto.envelope ?? 'TECHNICAL';

    // Check for duplicate assignment
    const existing = await this.prisma.evaluatorAssignment.findFirst({
      where: { evaluationId, evaluatorId: dto.evaluatorId, envelope, isActive: true },
    });
    if (existing) {
      throw new BadRequestException(
        `Evaluator ${dto.evaluatorId} is already assigned to ${envelope} envelope for this evaluation`,
      );
    }

    const assignment = await this.prisma.evaluatorAssignment.create({
      data: {
        evaluationId,
        orgId,
        evaluatorId: dto.evaluatorId,
        envelope,
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'EVALUATOR_ASSIGNMENT',
      entityId: assignment.id,
      newValue: { evaluationId, evaluatorId: dto.evaluatorId, envelope },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'EVALUATOR_ASSIGNED',
      entityType: 'EVALUATOR_ASSIGNMENT',
      entityId: assignment.id,
      properties: { evaluationId, evaluatorId: dto.evaluatorId, envelope },
    });

    return assignment;
  }

  // ── Submit Score ────────────────────────────────────────────────────────────

  async submitScore(orgId: string, evaluationId: string, dto: SubmitScoreDto, user: JwtPayload) {
    const evaluation = await this.findOne(orgId, evaluationId);
    if (evaluation.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Scores can only be submitted for IN_PROGRESS evaluations');
    }

    // Verify evaluator is assigned
    const assignment = await this.prisma.evaluatorAssignment.findFirst({
      where: { evaluationId, evaluatorId: user.sub, isActive: true },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned as an evaluator for this evaluation');
    }

    // Verify criterion exists and belongs to this evaluation
    const criterion = await this.prisma.evaluationCriterion.findFirst({
      where: { id: dto.criterionId, evaluationId, isActive: true },
    });
    if (!criterion) {
      throw new NotFoundException(`Criterion ${dto.criterionId} not found in this evaluation`);
    }

    // Verify the criterion envelope matches the evaluator assignment envelope
    if (criterion.envelope !== assignment.envelope) {
      throw new ForbiddenException(
        `You are assigned to the ${assignment.envelope} envelope but this criterion belongs to the ${criterion.envelope} envelope`,
      );
    }

    // Validate score does not exceed maxScore
    if (dto.score > criterion.maxScore) {
      throw new BadRequestException(`Score ${dto.score} exceeds maximum score of ${criterion.maxScore}`);
    }

    // Upsert: update if already scored, otherwise create
    const score = await this.prisma.evaluationScore.upsert({
      where: {
        evaluationId_criterionId_evaluatorId_bidId: {
          evaluationId,
          criterionId: dto.criterionId,
          evaluatorId: user.sub,
          bidId: dto.bidId,
        },
      },
      update: {
        score: dto.score,
        maxScore: criterion.maxScore,
        comments: dto.comments,
      },
      create: {
        evaluationId,
        criterionId: dto.criterionId,
        orgId,
        evaluatorId: user.sub,
        bidId: dto.bidId,
        score: dto.score,
        maxScore: criterion.maxScore,
        comments: dto.comments,
      },
    });

    this.eventEmitter.emit(
      'evaluation.score.submitted',
      new ScoreSubmittedEvent(score.id, evaluationId, orgId, user.sub, dto.bidId, dto.criterionId),
    );

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'EVALUATION_SCORE',
      entityId: score.id,
      newValue: {
        evaluationId,
        criterionId: dto.criterionId,
        bidId: dto.bidId,
        score: dto.score,
        maxScore: criterion.maxScore,
      },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'SCORE_SUBMITTED',
      entityType: 'EVALUATION_SCORE',
      entityId: score.id,
      properties: { evaluationId, criterionId: dto.criterionId, bidId: dto.bidId },
    });

    return score;
  }

  // ── Score Summary (Weighted) ────────────────────────────────────────────────

  async getScoreSummary(orgId: string, evaluationId: string) {
    const evaluation = await this.findOne(orgId, evaluationId);

    const scores = await this.prisma.evaluationScore.findMany({
      where: { evaluationId, isActive: true },
      include: { criterion: true },
    });

    const criteria = await this.prisma.evaluationCriterion.findMany({
      where: { evaluationId, isActive: true },
    });

    // Group scores by bidId
    const bidScoresMap = new Map<string, typeof scores>();
    for (const score of scores) {
      const existing = bidScoresMap.get(score.bidId) || [];
      existing.push(score);
      bidScoresMap.set(score.bidId, existing);
    }

    const technicalWeight = evaluation.technicalWeight ? Number(evaluation.technicalWeight) / 100 : 1;
    const commercialWeight = evaluation.commercialWeight ? Number(evaluation.commercialWeight) / 100 : 0;

    // Calculate weighted score per bid
    const bidSummaries = Array.from(bidScoresMap.entries()).map(([bidId, bidScores]) => {
      // Group by envelope
      const technicalScores = bidScores.filter((s) => s.criterion.envelope === 'TECHNICAL');
      const commercialScores = bidScores.filter((s) => s.criterion.envelope === 'COMMERCIAL');
      const generalScores = bidScores.filter((s) => s.criterion.envelope === 'GENERAL');

      const calcEnvelopeScore = (envelopeScores: typeof scores) => {
        if (envelopeScores.length === 0) return 0;

        // Weighted average by criterion weight within envelope
        let totalWeight = 0;
        let weightedSum = 0;

        for (const s of envelopeScores) {
          const criterionWeight = Number(s.criterion.weight);
          const normalised = Number(s.score) / s.maxScore; // Normalise to 0-1
          weightedSum += normalised * criterionWeight;
          totalWeight += criterionWeight;
        }

        return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
      };

      const technicalScore = calcEnvelopeScore(technicalScores);
      const commercialScore = calcEnvelopeScore(commercialScores);
      const generalScore = calcEnvelopeScore(generalScores);

      // Apply envelope-level weights
      let totalWeightedScore: number;
      if (evaluation.envelopeType === 'SINGLE') {
        // Single envelope: just average all scores
        totalWeightedScore = calcEnvelopeScore(bidScores);
      } else {
        totalWeightedScore =
          technicalScore * technicalWeight +
          commercialScore * commercialWeight;
      }

      // Count evaluators who have scored this bid
      const evaluatorIds = new Set(bidScores.map((s) => s.evaluatorId));

      return {
        bidId,
        technicalScore: Math.round(technicalScore * 100) / 100,
        commercialScore: Math.round(commercialScore * 100) / 100,
        generalScore: Math.round(generalScore * 100) / 100,
        totalWeightedScore: Math.round(totalWeightedScore * 100) / 100,
        evaluatorCount: evaluatorIds.size,
        scoreCount: bidScores.length,
        totalCriteria: criteria.length,
      };
    });

    // Sort by total weighted score descending
    bidSummaries.sort((a, b) => b.totalWeightedScore - a.totalWeightedScore);

    // Assign ranks
    const ranked = bidSummaries.map((summary, idx) => ({
      rank: idx + 1,
      ...summary,
    }));

    return {
      evaluationId: evaluation.id,
      title: evaluation.title,
      status: evaluation.status,
      envelopeType: evaluation.envelopeType,
      technicalWeight: evaluation.technicalWeight,
      commercialWeight: evaluation.commercialWeight,
      totalCriteria: criteria.length,
      totalScores: scores.length,
      ranking: ranked,
    };
  }

  // ── Score Comparison Matrix ─────────────────────────────────────────────────

  async getScoreMatrix(orgId: string, evaluationId: string) {
    const evaluation = await this.findOne(orgId, evaluationId);

    const scores = await this.prisma.evaluationScore.findMany({
      where: { evaluationId, isActive: true, isConsensus: false },
      include: { criterion: true },
    });

    const consensusScores = await this.prisma.evaluationScore.findMany({
      where: { evaluationId, isActive: true, isConsensus: true },
      include: { criterion: true },
    });

    const criteria = await this.prisma.evaluationCriterion.findMany({
      where: { evaluationId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Collect unique evaluator IDs and bid IDs
    const evaluatorIds = [...new Set(scores.map((s) => s.evaluatorId))];
    const bidIds = [...new Set(scores.map((s) => s.bidId))];

    // Build a matrix per bid
    const bidMatrices = bidIds.map((bidId) => {
      const bidScores = scores.filter((s) => s.bidId === bidId);
      const bidConsensus = consensusScores.filter((s) => s.bidId === bidId);

      // Rows = criteria, columns = evaluators
      const rows = criteria.map((criterion) => {
        const criterionScores = bidScores.filter((s) => s.criterionId === criterion.id);
        const consensusScore = bidConsensus.find((s) => s.criterionId === criterion.id);

        const evaluatorScores: Record<string, number | null> = {};
        for (const evalId of evaluatorIds) {
          const found = criterionScores.find((s) => s.evaluatorId === evalId);
          evaluatorScores[evalId] = found ? Number(found.score) : null;
        }

        // Calculate stats
        const validScores = criterionScores.map((s) => Number(s.score));
        const avg = validScores.length > 0
          ? validScores.reduce((sum, v) => sum + v, 0) / validScores.length
          : null;

        let variance: number | null = null;
        let stdDeviation: number | null = null;
        if (validScores.length > 1 && avg !== null) {
          variance = validScores.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / validScores.length;
          stdDeviation = Math.sqrt(variance);
        }

        return {
          criterionId: criterion.id,
          criterionName: criterion.name,
          envelope: criterion.envelope,
          weight: Number(criterion.weight),
          maxScore: criterion.maxScore,
          evaluatorScores,
          average: avg !== null ? Math.round(avg * 100) / 100 : null,
          variance: variance !== null ? Math.round(variance * 100) / 100 : null,
          stdDeviation: stdDeviation !== null ? Math.round(stdDeviation * 100) / 100 : null,
          consensusScore: consensusScore ? Number(consensusScore.score) : null,
        };
      });

      // Per-evaluator averages
      const evaluatorAverages: Record<string, number | null> = {};
      for (const evalId of evaluatorIds) {
        const evalScores = bidScores
          .filter((s) => s.evaluatorId === evalId)
          .map((s) => Number(s.score));
        evaluatorAverages[evalId] = evalScores.length > 0
          ? Math.round((evalScores.reduce((sum, v) => sum + v, 0) / evalScores.length) * 100) / 100
          : null;
      }

      return {
        bidId,
        criteria: rows,
        evaluatorAverages,
      };
    });

    return {
      evaluationId: evaluation.id,
      title: evaluation.title,
      evaluatorIds,
      criteriaCount: criteria.length,
      bidMatrices,
    };
  }

  // ── Consensus Scoring ─────────────────────────────────────────────────────

  async submitConsensusScore(
    orgId: string,
    evaluationId: string,
    dto: SubmitConsensusScoreDto,
    user: JwtPayload,
  ) {
    const evaluation = await this.findOne(orgId, evaluationId);
    if (evaluation.status !== 'IN_PROGRESS' && evaluation.status !== 'COMPLETED') {
      throw new BadRequestException('Consensus scores can only be submitted for IN_PROGRESS or COMPLETED evaluations');
    }

    // Only the evaluation owner can submit consensus scores
    if (evaluation.createdById !== user.sub) {
      throw new ForbiddenException('Only the evaluation owner can submit consensus scores');
    }

    // Verify criterion exists and belongs to this evaluation
    const criterion = await this.prisma.evaluationCriterion.findFirst({
      where: { id: dto.criterionId, evaluationId, isActive: true },
    });
    if (!criterion) {
      throw new NotFoundException(`Criterion ${dto.criterionId} not found in this evaluation`);
    }

    // Validate score does not exceed maxScore
    if (dto.score > criterion.maxScore) {
      throw new BadRequestException(`Score ${dto.score} exceeds maximum score of ${criterion.maxScore}`);
    }

    this.logger.log(
      `Submitting consensus score: orgId=${orgId} evaluationId=${evaluationId} criterionId=${dto.criterionId} bidId=${dto.bidId} userId=${user.sub}`,
    );

    // Use a special evaluator ID marker for consensus: the owner's ID
    // Upsert consensus score — unique on (evaluationId, criterionId, evaluatorId, bidId)
    const score = await this.prisma.evaluationScore.upsert({
      where: {
        evaluationId_criterionId_evaluatorId_bidId: {
          evaluationId,
          criterionId: dto.criterionId,
          evaluatorId: user.sub,
          bidId: dto.bidId,
        },
      },
      update: {
        score: dto.score,
        maxScore: criterion.maxScore,
        comments: dto.comments,
        isConsensus: true,
      },
      create: {
        evaluationId,
        criterionId: dto.criterionId,
        orgId,
        evaluatorId: user.sub,
        bidId: dto.bidId,
        score: dto.score,
        maxScore: criterion.maxScore,
        comments: dto.comments,
        isConsensus: true,
      },
    });

    this.eventEmitter.emit(
      'evaluation.consensus.submitted',
      new ConsensusScoreSubmittedEvent(score.id, evaluationId, orgId, user.sub, dto.bidId, dto.criterionId),
    );

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'EVALUATION_CONSENSUS_SCORE',
      entityId: score.id,
      newValue: {
        evaluationId,
        criterionId: dto.criterionId,
        bidId: dto.bidId,
        score: dto.score,
        maxScore: criterion.maxScore,
        isConsensus: true,
      },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'CONSENSUS_SCORE_SUBMITTED',
      entityType: 'EVALUATION_SCORE',
      entityId: score.id,
      properties: { evaluationId, criterionId: dto.criterionId, bidId: dto.bidId },
    });

    return score;
  }

  // ── Shortlisting ──────────────────────────────────────────────────────────

  async shortlistBids(
    orgId: string,
    evaluationId: string,
    dto: ShortlistDto,
    user: JwtPayload,
  ) {
    const evaluation = await this.findOne(orgId, evaluationId);
    if (evaluation.status !== 'IN_PROGRESS' && evaluation.status !== 'COMPLETED') {
      throw new BadRequestException('Bids can only be shortlisted for IN_PROGRESS or COMPLETED evaluations');
    }

    if (!dto.topN && (!dto.bidIds || dto.bidIds.length === 0)) {
      throw new BadRequestException('Either topN or bidIds must be provided');
    }

    this.logger.log(
      `Shortlisting bids: orgId=${orgId} evaluationId=${evaluationId} userId=${user.sub} topN=${dto.topN ?? 'N/A'} bidIds=${dto.bidIds?.length ?? 0}`,
    );

    let shortlistedBidIds: string[];

    if (dto.bidIds && dto.bidIds.length > 0) {
      // Manual selection: verify all bids exist in the RFx event
      const bids = await this.prisma.bidSubmission.findMany({
        where: {
          id: { in: dto.bidIds },
          eventId: evaluation.rfxEventId,
          orgId,
          isActive: true,
        },
      });
      if (bids.length !== dto.bidIds.length) {
        throw new BadRequestException(
          `Some bid IDs not found. Found ${bids.length} of ${dto.bidIds.length} requested bids.`,
        );
      }
      shortlistedBidIds = dto.bidIds;
    } else {
      // Top N by score ranking
      const summary = await this.getScoreSummary(orgId, evaluationId);
      if (dto.topN! > summary.ranking.length) {
        throw new BadRequestException(
          `Cannot shortlist top ${dto.topN} bids — only ${summary.ranking.length} bids have been scored`,
        );
      }
      shortlistedBidIds = summary.ranking.slice(0, dto.topN!).map((r) => r.bidId);
    }

    // Get all bids for this event
    const allBids = await this.prisma.bidSubmission.findMany({
      where: {
        eventId: evaluation.rfxEventId,
        orgId,
        status: 'SUBMITTED',
        isActive: true,
      },
      select: { id: true },
    });

    const allBidIds = allBids.map((b) => b.id);
    const rejectedBidIds = allBidIds.filter((id) => !shortlistedBidIds.includes(id));

    // Mark shortlisted
    await this.prisma.bidSubmission.updateMany({
      where: { id: { in: shortlistedBidIds } },
      data: { shortlisted: true },
    });

    // Mark rejected (un-shortlist)
    if (rejectedBidIds.length > 0) {
      await this.prisma.bidSubmission.updateMany({
        where: { id: { in: rejectedBidIds } },
        data: { shortlisted: false },
      });
    }

    this.eventEmitter.emit(
      'evaluation.bids.shortlisted',
      new BidsShortlistedEvent(evaluationId, orgId, user.sub, shortlistedBidIds, rejectedBidIds),
    );

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'EVALUATION_SHORTLIST',
      entityId: evaluationId,
      newValue: {
        shortlistedBidIds,
        rejectedBidIds,
        method: dto.bidIds ? 'MANUAL' : `TOP_${dto.topN}`,
      },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'BIDS_SHORTLISTED',
      entityType: 'EVALUATION',
      entityId: evaluationId,
      properties: {
        shortlistedCount: shortlistedBidIds.length,
        rejectedCount: rejectedBidIds.length,
        method: dto.bidIds ? 'MANUAL' : `TOP_${dto.topN}`,
      },
    });

    return {
      evaluationId,
      shortlisted: shortlistedBidIds,
      rejected: rejectedBidIds,
      shortlistedCount: shortlistedBidIds.length,
      rejectedCount: rejectedBidIds.length,
    };
  }

  // ── Evaluation Report Export ───────────────────────────────────────────────

  async getEvaluationReport(orgId: string, evaluationId: string) {
    const evaluation = await this.findOne(orgId, evaluationId);

    const criteria = await this.prisma.evaluationCriterion.findMany({
      where: { evaluationId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const scores = await this.prisma.evaluationScore.findMany({
      where: { evaluationId, isActive: true },
      include: { criterion: true },
    });

    const assignments = await this.prisma.evaluatorAssignment.findMany({
      where: { evaluationId, isActive: true },
    });

    // Get shortlisted bids for this RFx event
    const shortlistedBids = await this.prisma.bidSubmission.findMany({
      where: {
        eventId: evaluation.rfxEventId,
        orgId,
        shortlisted: true,
        isActive: true,
      },
      select: { id: true, supplierId: true, totalPrice: true, currency: true },
    });

    // Build score summary for ranking
    const summary = await this.getScoreSummary(orgId, evaluationId);

    return {
      evaluation: {
        id: evaluation.id,
        title: evaluation.title,
        rfxEventId: evaluation.rfxEventId,
        status: evaluation.status,
        envelopeType: evaluation.envelopeType,
        technicalWeight: evaluation.technicalWeight ? Number(evaluation.technicalWeight) : null,
        commercialWeight: evaluation.commercialWeight ? Number(evaluation.commercialWeight) : null,
        createdById: evaluation.createdById,
        publishedAt: evaluation.publishedAt?.toISOString() ?? null,
        completedAt: evaluation.completedAt?.toISOString() ?? null,
      },
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        envelope: c.envelope,
        weight: Number(c.weight),
        maxScore: c.maxScore,
      })),
      evaluators: assignments.map((a) => ({
        evaluatorId: a.evaluatorId,
        envelope: a.envelope,
        status: a.status,
      })),
      scores: scores.map((s) => ({
        criterionId: s.criterionId,
        criterionName: s.criterion.name,
        evaluatorId: s.evaluatorId,
        bidId: s.bidId,
        score: Number(s.score),
        maxScore: s.maxScore,
        isConsensus: s.isConsensus,
        comments: s.comments,
      })),
      ranking: summary.ranking,
      shortlist: {
        shortlistedBidIds: shortlistedBids.map((b) => b.id),
        shortlistedCount: shortlistedBids.length,
      },
      exportedAt: new Date().toISOString(),
    };
  }

  generateEvaluationCsv(report: Awaited<ReturnType<typeof this.getEvaluationReport>>): string {
    const lines: string[] = [];

    // Header
    lines.push(`Evaluation Report: ${report.evaluation.title}`);
    lines.push(`Status: ${report.evaluation.status} | Envelope Type: ${report.evaluation.envelopeType}`);
    if (report.evaluation.technicalWeight != null) {
      lines.push(`Technical Weight: ${report.evaluation.technicalWeight}% | Commercial Weight: ${report.evaluation.commercialWeight}%`);
    }
    lines.push(`Criteria: ${report.criteria.length} | Evaluators: ${report.evaluators.length} | Total Scores: ${report.scores.length}`);
    lines.push('');

    // Criteria
    lines.push('EVALUATION CRITERIA');
    lines.push('Name,Envelope,Weight (%),Max Score');
    for (const c of report.criteria) {
      lines.push(`"${c.name}",${c.envelope},${c.weight},${c.maxScore}`);
    }
    lines.push('');

    // Ranking
    lines.push('BID RANKING');
    lines.push('Rank,Bid ID,Technical Score,Commercial Score,Total Weighted Score,Evaluator Count,Shortlisted');
    for (const r of report.ranking) {
      const isShortlisted = report.shortlist.shortlistedBidIds.includes(r.bidId);
      lines.push(
        `${r.rank},"${r.bidId}",${r.technicalScore},${r.commercialScore},${r.totalWeightedScore},${r.evaluatorCount},${isShortlisted ? 'YES' : 'NO'}`,
      );
    }
    lines.push('');

    // All Scores Detail
    lines.push('SCORE DETAIL');
    lines.push('Criterion,Evaluator ID,Bid ID,Score,Max Score,Is Consensus,Comments');
    for (const s of report.scores) {
      lines.push(
        `"${s.criterionName}","${s.evaluatorId}","${s.bidId}",${s.score},${s.maxScore},${s.isConsensus ? 'YES' : 'NO'},"${(s.comments ?? '').replace(/"/g, '""')}"`,
      );
    }

    return lines.join('\n');
  }

  // ── Soft Delete ─────────────────────────────────────────────────────────────

  async remove(orgId: string, evaluationId: string, user: JwtPayload) {
    const evaluation = await this.findOne(orgId, evaluationId);
    if (evaluation.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT evaluations can be deleted');
    }

    await this.prisma.evaluation.update({
      where: { id: evaluationId },
      data: { isActive: false },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'EVALUATION',
      entityId: evaluationId,
      oldValue: { title: evaluation.title, rfxEventId: evaluation.rfxEventId },
    });
  }
}

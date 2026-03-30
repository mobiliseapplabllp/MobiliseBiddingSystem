export class UserLoggedInEvent {
  constructor(
    public readonly userId: string,
    public readonly orgId: string | null,
    public readonly ipAddress?: string,
  ) {}
}

export class UserLoggedOutEvent {
  constructor(
    public readonly userId: string,
    public readonly orgId: string | null,
  ) {}
}

export class InvitationSentEvent {
  constructor(
    public readonly invitationId: string,
    public readonly eventId: string,
    public readonly orgId: string,
    public readonly supplierEmail: string,
    public readonly supplierName: string,
    public readonly eventTitle: string,
    public readonly eventRefNumber: string,
    public readonly token: string,
    public readonly message?: string,
  ) {}
}

export class InvitationRespondedEvent {
  constructor(
    public readonly invitationId: string,
    public readonly response: string,
    public readonly supplierEmail: string,
    public readonly eventId: string,
  ) {}
}

export class BidSubmittedEvent {
  constructor(
    public readonly bidId: string,
    public readonly eventId: string,
    public readonly orgId: string,
    public readonly supplierId: string,
  ) {}
}

export class RfxPublishedEvent {
  constructor(
    public readonly eventId: string,
    public readonly orgId: string,
    public readonly refNumber: string,
    public readonly title: string,
  ) {}
}

// ── Sprint 6: Auction Domain Events ────────────────────────────────────────────

export class AuctionCreatedEvent {
  constructor(
    public readonly auctionId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly refNumber: string,
    public readonly title: string,
  ) {}
}

export class AuctionPublishedEvent {
  constructor(
    public readonly auctionId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly startAt: Date | null,
  ) {}
}

export class AuctionOpenedEvent {
  constructor(
    public readonly auctionId: string,
    public readonly orgId: string,
    public readonly endAt: Date | null,
  ) {}
}

export class AuctionBidPlacedEvent {
  constructor(
    public readonly bidId: string,
    public readonly auctionId: string,
    public readonly orgId: string,
    public readonly supplierId: string,
    public readonly bidPrice: number,
    public readonly rank: number | null,
  ) {}
}

export class AuctionExtendedEvent {
  constructor(
    public readonly auctionId: string,
    public readonly orgId: string,
    public readonly extensionNumber: number,
    public readonly previousEndAt: Date,
    public readonly newEndAt: Date,
    public readonly triggeredByBidId: string | null,
  ) {}
}

export class AuctionClosedEvent {
  constructor(
    public readonly auctionId: string,
    public readonly orgId: string,
    public readonly totalBids: number,
  ) {}
}

export class AuctionInvitationSentEvent {
  constructor(
    public readonly invitationId: string,
    public readonly auctionId: string,
    public readonly orgId: string,
    public readonly supplierEmail: string,
    public readonly supplierName: string,
    public readonly token: string,
  ) {}
}

// ── Evaluation Domain Events ────────────────────────────────────────────────

export class EvaluationCreatedEvent {
  constructor(
    public readonly evaluationId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly title: string,
  ) {}
}

export class EvaluationStartedEvent {
  constructor(
    public readonly evaluationId: string,
    public readonly orgId: string,
    public readonly userId: string,
  ) {}
}

export class EvaluationCompletedEvent {
  constructor(
    public readonly evaluationId: string,
    public readonly orgId: string,
    public readonly userId: string,
  ) {}
}

export class ScoreSubmittedEvent {
  constructor(
    public readonly scoreId: string,
    public readonly evaluationId: string,
    public readonly orgId: string,
    public readonly evaluatorId: string,
    public readonly bidId: string,
    public readonly criterionId: string,
  ) {}
}

// ── Sprint 10: Consensus & Shortlisting Events ─────────────────────────────

export class ConsensusScoreSubmittedEvent {
  constructor(
    public readonly scoreId: string,
    public readonly evaluationId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly bidId: string,
    public readonly criterionId: string,
  ) {}
}

export class BidsShortlistedEvent {
  constructor(
    public readonly evaluationId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly shortlistedBidIds: string[],
    public readonly rejectedBidIds: string[],
  ) {}
}

// ── Sprint 11: Award Domain Events ──────────────────────────────────────────

export class AwardCreatedEvent {
  constructor(
    public readonly awardId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly title: string,
  ) {}
}

export class AwardSubmittedForApprovalEvent {
  constructor(
    public readonly awardId: string,
    public readonly orgId: string,
    public readonly userId: string,
  ) {}
}

export class AwardApprovedEvent {
  constructor(
    public readonly awardId: string,
    public readonly orgId: string,
    public readonly userId: string,
  ) {}
}

export class AwardRejectedEvent {
  constructor(
    public readonly awardId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly reason?: string,
  ) {}
}

export class AwardSuppliersNotifiedEvent {
  constructor(
    public readonly awardId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly supplierIds: string[],
  ) {}
}

// ── Sprint 12: Contract Domain Events ────────────────────────────────────────

export class ContractCreatedEvent {
  constructor(
    public readonly contractId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly contractNumber: string,
    public readonly title: string,
  ) {}
}

export class ContractActivatedEvent {
  constructor(
    public readonly contractId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly contractNumber: string,
  ) {}
}

export class ContractExpiredEvent {
  constructor(
    public readonly contractId: string,
    public readonly orgId: string,
    public readonly contractNumber: string,
  ) {}
}

export class ContractAmendedEvent {
  constructor(
    public readonly amendmentId: string,
    public readonly contractId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly amendmentNumber: number,
    public readonly changeType: string,
  ) {}
}

// ── Sprint 13-15: Supplier Portal Domain Events ─────────────────────────────

export class SupplierRegisteredEvent {
  constructor(
    public readonly profileId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly orgName: string,
  ) {}
}

export class SupplierApprovedEvent {
  constructor(
    public readonly profileId: string,
    public readonly orgId: string,
    public readonly reviewedById: string,
  ) {}
}

export class SupplierSuspendedEvent {
  constructor(
    public readonly profileId: string,
    public readonly orgId: string,
    public readonly reviewedById: string,
    public readonly status: string,
    public readonly reason?: string,
  ) {}
}

export class SupplierQualifiedEvent {
  constructor(
    public readonly qualificationId: string,
    public readonly buyerOrgId: string,
    public readonly supplierId: string,
    public readonly userId: string,
    public readonly score: number,
  ) {}
}

export class ScorecardCreatedEvent {
  constructor(
    public readonly scorecardId: string,
    public readonly orgId: string,
    public readonly supplierId: string,
    public readonly userId: string,
    public readonly period: string,
    public readonly overallScore: number,
  ) {}
}

// ── Sprint 16: Analytics Domain Events ────────────────────────────────────────

export class DashboardCreatedEvent {
  constructor(
    public readonly dashboardId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly type: string,
  ) {}
}

// ── Sprint 17: Report Domain Events ───────────────────────────────────────────

export class ReportCreatedEvent {
  constructor(
    public readonly reportId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly reportType: string,
  ) {}
}

export class ReportGeneratedEvent {
  constructor(
    public readonly reportId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly reportType: string,
  ) {}
}

// ── Sprint 18-19: Notification Domain Events ──────────────────────────────────

export class NotificationCreatedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly orgId?: string,
  ) {}
}

export class ReminderScheduledEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly reminderAt: Date,
    public readonly orgId?: string,
  ) {}
}

// ── Sprint 20: Multi-Currency Domain Events ──────────────────────────────────

export class ExchangeRateCreatedEvent {
  constructor(
    public readonly rateId: string,
    public readonly orgId: string | null,
    public readonly userId: string,
    public readonly fromCurrency: string,
    public readonly toCurrency: string,
  ) {}
}

export class CurrencyConvertedEvent {
  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly fromCurrency: string,
    public readonly toCurrency: string,
    public readonly amount: number,
    public readonly convertedAmount: number,
  ) {}
}

// ── Sprint 21: Workflow Domain Events ────────────────────────────────────────

export class WorkflowTemplateCreatedEvent {
  constructor(
    public readonly templateId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly triggerType: string,
  ) {}
}

export class WorkflowStartedEvent {
  constructor(
    public readonly instanceId: string,
    public readonly orgId: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly templateId: string | null,
  ) {}
}

export class WorkflowStepApprovedEvent {
  constructor(
    public readonly instanceId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly stepOrder: number,
  ) {}
}

export class WorkflowStepRejectedEvent {
  constructor(
    public readonly instanceId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly stepOrder: number,
    public readonly reason?: string,
  ) {}
}

export class WorkflowCompletedEvent {
  constructor(
    public readonly instanceId: string,
    public readonly orgId: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly status: string,
  ) {}
}

export class WorkflowTimedOutEvent {
  constructor(
    public readonly instanceId: string,
    public readonly orgId: string,
    public readonly stepOrder: number,
  ) {}
}

// ── Sprint 22: Audit & Compliance Domain Events ─────────────────────────────

export class AuditExportRequestedEvent {
  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly filters: Record<string, unknown>,
  ) {}
}

export class DataPurgeExecutedEvent {
  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly recordsPurged: number,
  ) {}
}

// ── Sprint 23: API & Integrations Domain Events ─────────────────────────────

export class ApiKeyCreatedEvent {
  constructor(
    public readonly apiKeyId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly prefix: string,
  ) {}
}

export class ApiKeyRevokedEvent {
  constructor(
    public readonly apiKeyId: string,
    public readonly orgId: string,
    public readonly userId: string,
  ) {}
}

export class WebhookCreatedEvent {
  constructor(
    public readonly webhookId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly url: string,
    public readonly events: string[],
  ) {}
}

export class WebhookTriggeredEvent {
  constructor(
    public readonly webhookId: string,
    public readonly orgId: string,
    public readonly eventType: string,
    public readonly success: boolean,
  ) {}
}

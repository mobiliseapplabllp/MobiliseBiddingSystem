import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  SupplierRegisteredEvent,
  SupplierApprovedEvent,
  SupplierSuspendedEvent,
  SupplierQualifiedEvent,
  ScorecardCreatedEvent,
} from '../../common/events/domain-events';
import {
  CreateSupplierProfileDto,
  UpdateSupplierProfileDto,
  ReviewProfileDto,
  CreateSupplierDocumentDto,
  VerifyDocumentDto,
  CreateQualificationDto,
  ScoreQualificationDto,
  CreateScorecardDto,
  SupplierFilterDto,
  QualificationFilterDto,
  ScorecardFilterDto,
} from './dto/supplier-portal.dto';

@Injectable()
export class SupplierPortalService {
  private readonly logger = new Logger(SupplierPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ═══════════════════════════════════════════════════════
  // Sprint 13: Supplier Profile
  // ═══════════════════════════════════════════════════════

  async createProfile(dto: CreateSupplierProfileDto, user: JwtPayload) {
    const orgId = user.orgId;
    if (!orgId) throw new BadRequestException('User must belong to an organisation');

    // Check that the org is a supplier-type org
    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation not found');
    if (!org.supplierType) throw new BadRequestException('Organisation is not a supplier-type organisation');

    // Check for existing profile
    const existing = await this.prisma.supplierProfile.findUnique({ where: { orgId } });
    if (existing) throw new ConflictException('Supplier profile already exists for this organisation');

    const profile = await this.prisma.supplierProfile.create({
      data: {
        orgId,
        companySize: dto.companySize ?? 'SMALL',
        yearEstablished: dto.yearEstablished,
        annualRevenue: dto.annualRevenue,
        registrationNumber: dto.registrationNumber,
        taxId: dto.taxId,
        website: dto.website,
        primaryContact: dto.primaryContact as Prisma.InputJsonValue | undefined,
        addresses: dto.addresses as Prisma.InputJsonValue | undefined,
        bankDetails: dto.bankDetails as Prisma.InputJsonValue | undefined,
        spendCategories: dto.spendCategories ?? [],
        certifications: dto.certifications as Prisma.InputJsonValue | undefined,
        diversityFlags: dto.diversityFlags as Prisma.InputJsonValue | undefined,
        status: 'PENDING_REVIEW',
      },
    });

    this.eventEmitter.emit('supplier.registered', new SupplierRegisteredEvent(
      profile.id, orgId, user.sub, org.name,
    ));

    await this.audit.log({
      orgId, userId: user.sub, action: 'CREATE',
      entityType: 'SUPPLIER_PROFILE', entityId: profile.id,
      newValue: profile as unknown as Record<string, unknown>,
    });

    await this.analytics.track({
      orgId, userId: user.sub, eventType: 'SUPPLIER_REGISTERED',
      entityType: 'SUPPLIER_PROFILE', entityId: profile.id,
    });

    this.logger.log(`Supplier profile created: orgId=${orgId} profileId=${profile.id}`);
    return profile;
  }

  async getProfile(orgId: string) {
    const profile = await this.prisma.supplierProfile.findUnique({
      where: { orgId },
      include: { documents: { where: { isActive: true } } },
    });
    if (!profile) throw new NotFoundException('Supplier profile not found');
    return profile;
  }

  async getProfileById(id: string) {
    const profile = await this.prisma.supplierProfile.findUnique({
      where: { id },
      include: { documents: { where: { isActive: true } } },
    });
    if (!profile) throw new NotFoundException(`Supplier profile ${id} not found`);
    return profile;
  }

  async updateProfile(dto: UpdateSupplierProfileDto, user: JwtPayload) {
    const orgId = user.orgId;
    if (!orgId) throw new BadRequestException('User must belong to an organisation');

    const profile = await this.prisma.supplierProfile.findUnique({ where: { orgId } });
    if (!profile) throw new NotFoundException('Supplier profile not found');

    const oldValue = { ...profile } as unknown as Record<string, unknown>;

    const updated = await this.prisma.supplierProfile.update({
      where: { orgId },
      data: {
        companySize: dto.companySize,
        yearEstablished: dto.yearEstablished,
        annualRevenue: dto.annualRevenue,
        registrationNumber: dto.registrationNumber,
        taxId: dto.taxId,
        website: dto.website,
        primaryContact: dto.primaryContact as Prisma.InputJsonValue | undefined,
        addresses: dto.addresses as Prisma.InputJsonValue | undefined,
        bankDetails: dto.bankDetails as Prisma.InputJsonValue | undefined,
        spendCategories: dto.spendCategories,
        certifications: dto.certifications as Prisma.InputJsonValue | undefined,
        diversityFlags: dto.diversityFlags as Prisma.InputJsonValue | undefined,
      },
    });

    await this.audit.log({
      orgId, userId: user.sub, action: 'UPDATE',
      entityType: 'SUPPLIER_PROFILE', entityId: updated.id,
      oldValue, newValue: updated as unknown as Record<string, unknown>,
    });

    this.logger.log(`Supplier profile updated: orgId=${orgId} profileId=${updated.id}`);
    return updated;
  }

  async submitForReview(user: JwtPayload) {
    const orgId = user.orgId;
    if (!orgId) throw new BadRequestException('User must belong to an organisation');

    const profile = await this.prisma.supplierProfile.findUnique({ where: { orgId } });
    if (!profile) throw new NotFoundException('Supplier profile not found');

    if (profile.status !== 'PENDING_REVIEW' && profile.status !== 'SUSPENDED') {
      throw new BadRequestException('Profile can only be submitted for review when in PENDING_REVIEW or SUSPENDED status');
    }

    const updated = await this.prisma.supplierProfile.update({
      where: { orgId },
      data: { status: 'PENDING_REVIEW' },
    });

    await this.audit.log({
      orgId, userId: user.sub, action: 'UPDATE',
      entityType: 'SUPPLIER_PROFILE', entityId: updated.id,
      newValue: { status: 'PENDING_REVIEW' },
    });

    this.logger.log(`Supplier profile submitted for review: orgId=${orgId}`);
    return updated;
  }

  async reviewProfile(profileId: string, dto: ReviewProfileDto, user: JwtPayload) {
    const profile = await this.prisma.supplierProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException(`Supplier profile ${profileId} not found`);

    if (!['APPROVED', 'SUSPENDED', 'BLACKLISTED'].includes(dto.status)) {
      throw new BadRequestException('Invalid review status');
    }

    const oldValue = { status: profile.status };
    const updated = await this.prisma.supplierProfile.update({
      where: { id: profileId },
      data: {
        status: dto.status,
        reviewedById: user.sub,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
    });

    if (dto.status === 'APPROVED') {
      this.eventEmitter.emit('supplier.approved', new SupplierApprovedEvent(
        profileId, profile.orgId, user.sub,
      ));
    } else if (dto.status === 'SUSPENDED' || dto.status === 'BLACKLISTED') {
      this.eventEmitter.emit('supplier.suspended', new SupplierSuspendedEvent(
        profileId, profile.orgId, user.sub, dto.status, dto.reviewNotes,
      ));
    }

    await this.audit.log({
      orgId: user.orgId ?? undefined, userId: user.sub, action: 'UPDATE',
      entityType: 'SUPPLIER_PROFILE', entityId: profileId,
      oldValue: oldValue as Record<string, unknown>,
      newValue: { status: dto.status, reviewNotes: dto.reviewNotes },
    });

    await this.analytics.track({
      orgId: user.orgId ?? undefined, userId: user.sub,
      eventType: `SUPPLIER_${dto.status}`,
      entityType: 'SUPPLIER_PROFILE', entityId: profileId,
    });

    this.logger.log(`Supplier profile reviewed: profileId=${profileId} status=${dto.status}`);
    return updated;
  }

  // ═══════════════════════════════════════════════════════
  // Sprint 13: Supplier Documents
  // ═══════════════════════════════════════════════════════

  async uploadDocument(dto: CreateSupplierDocumentDto, user: JwtPayload) {
    const orgId = user.orgId;
    if (!orgId) throw new BadRequestException('User must belong to an organisation');

    const profile = await this.prisma.supplierProfile.findUnique({ where: { orgId } });
    if (!profile) throw new NotFoundException('Supplier profile not found — create a profile first');

    const doc = await this.prisma.supplierDocument.create({
      data: {
        orgId,
        supplierProfileId: profile.id,
        documentType: dto.documentType,
        name: dto.name,
        description: dto.description,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        status: 'PENDING',
      },
    });

    await this.audit.log({
      orgId, userId: user.sub, action: 'CREATE',
      entityType: 'SUPPLIER_DOCUMENT', entityId: doc.id,
      newValue: doc as unknown as Record<string, unknown>,
    });

    this.logger.log(`Supplier document uploaded: orgId=${orgId} docId=${doc.id}`);
    return doc;
  }

  async listDocuments(profileId: string) {
    return this.prisma.supplierDocument.findMany({
      where: { supplierProfileId: profileId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyDocument(docId: string, dto: VerifyDocumentDto, user: JwtPayload) {
    const doc = await this.prisma.supplierDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException(`Document ${docId} not found`);

    const updated = await this.prisma.supplierDocument.update({
      where: { id: docId },
      data: {
        status: dto.status,
        verifiedById: user.sub,
        verifiedAt: new Date(),
      },
    });

    await this.audit.log({
      orgId: user.orgId ?? undefined, userId: user.sub, action: 'UPDATE',
      entityType: 'SUPPLIER_DOCUMENT', entityId: docId,
      oldValue: { status: doc.status },
      newValue: { status: dto.status },
    });

    this.logger.log(`Document ${dto.status}: docId=${docId} by userId=${user.sub}`);
    return updated;
  }

  // ═══════════════════════════════════════════════════════
  // Sprint 14: Qualification
  // ═══════════════════════════════════════════════════════

  async createQualification(dto: CreateQualificationDto, user: JwtPayload) {
    const orgId = user.orgId;
    if (!orgId) throw new BadRequestException('User must belong to an organisation');

    const qualification = await this.prisma.supplierQualification.create({
      data: {
        orgId,
        supplierId: dto.supplierId,
        qualificationType: dto.qualificationType,
        status: 'PENDING',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        responses: dto.responses as Prisma.InputJsonValue | undefined,
      },
    });

    await this.audit.log({
      orgId, userId: user.sub, action: 'CREATE',
      entityType: 'SUPPLIER_QUALIFICATION', entityId: qualification.id,
      newValue: qualification as unknown as Record<string, unknown>,
    });

    await this.analytics.track({
      orgId, userId: user.sub, eventType: 'QUALIFICATION_CREATED',
      entityType: 'SUPPLIER_QUALIFICATION', entityId: qualification.id,
    });

    this.logger.log(`Qualification created: orgId=${orgId} qualId=${qualification.id} supplierId=${dto.supplierId}`);
    return qualification;
  }

  async scoreQualification(qualificationId: string, dto: ScoreQualificationDto, user: JwtPayload) {
    const qualification = await this.prisma.supplierQualification.findUnique({
      where: { id: qualificationId },
    });
    if (!qualification) throw new NotFoundException(`Qualification ${qualificationId} not found`);

    if (qualification.status !== 'PENDING' && qualification.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Qualification can only be scored when PENDING or IN_PROGRESS');
    }

    if (!['QUALIFIED', 'DISQUALIFIED'].includes(dto.status)) {
      throw new BadRequestException('Status must be QUALIFIED or DISQUALIFIED');
    }

    const oldValue = { status: qualification.status, score: qualification.score };
    const updated = await this.prisma.supplierQualification.update({
      where: { id: qualificationId },
      data: {
        score: dto.score,
        status: dto.status,
        qualifiedAt: dto.status === 'QUALIFIED' ? new Date() : undefined,
        disqualifiedReason: dto.disqualifiedReason,
        responses: dto.responses as Prisma.InputJsonValue | undefined,
      },
    });

    if (dto.status === 'QUALIFIED') {
      this.eventEmitter.emit('supplier.qualified', new SupplierQualifiedEvent(
        qualificationId, qualification.orgId, qualification.supplierId, user.sub, dto.score,
      ));
    }

    await this.audit.log({
      orgId: user.orgId ?? undefined, userId: user.sub, action: 'UPDATE',
      entityType: 'SUPPLIER_QUALIFICATION', entityId: qualificationId,
      oldValue: oldValue as Record<string, unknown>,
      newValue: { status: dto.status, score: dto.score },
    });

    await this.analytics.track({
      orgId: user.orgId ?? undefined, userId: user.sub,
      eventType: `SUPPLIER_${dto.status}`,
      entityType: 'SUPPLIER_QUALIFICATION', entityId: qualificationId,
    });

    this.logger.log(`Qualification scored: qualId=${qualificationId} status=${dto.status} score=${dto.score}`);
    return updated;
  }

  async getQualifications(orgId: string, filter: QualificationFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupplierQualificationWhereInput = {
      orgId,
      isActive: true,
    };
    if (filter.supplierId) where.supplierId = filter.supplierId;
    if (filter.status) where.status = filter.status;
    if (filter.qualificationType) where.qualificationType = filter.qualificationType;

    const [data, total] = await Promise.all([
      this.prisma.supplierQualification.findMany({
        where, skip, take: pageSize, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierQualification.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ═══════════════════════════════════════════════════════
  // Sprint 15: Scorecards
  // ═══════════════════════════════════════════════════════

  async createScorecard(dto: CreateScorecardDto, user: JwtPayload) {
    const orgId = user.orgId;
    if (!orgId) throw new BadRequestException('User must belong to an organisation');

    const scorecard = await this.prisma.supplierScorecard.create({
      data: {
        orgId,
        supplierId: dto.supplierId,
        period: dto.period,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        overallScore: dto.overallScore,
        qualityScore: dto.qualityScore,
        deliveryScore: dto.deliveryScore,
        priceScore: dto.priceScore,
        complianceScore: dto.complianceScore,
        comments: dto.comments,
        riskLevel: dto.riskLevel ?? 'LOW',
        createdById: user.sub,
      },
    });

    this.eventEmitter.emit('scorecard.created', new ScorecardCreatedEvent(
      scorecard.id, orgId, dto.supplierId, user.sub, dto.period, dto.overallScore,
    ));

    await this.audit.log({
      orgId, userId: user.sub, action: 'CREATE',
      entityType: 'SUPPLIER_SCORECARD', entityId: scorecard.id,
      newValue: scorecard as unknown as Record<string, unknown>,
    });

    await this.analytics.track({
      orgId, userId: user.sub, eventType: 'SCORECARD_CREATED',
      entityType: 'SUPPLIER_SCORECARD', entityId: scorecard.id,
      properties: { supplierId: dto.supplierId, period: dto.period, overallScore: dto.overallScore },
    });

    this.logger.log(`Scorecard created: orgId=${orgId} supplierId=${dto.supplierId} period=${dto.period}`);
    return scorecard;
  }

  async getScorecards(orgId: string, filter: ScorecardFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupplierScorecardWhereInput = {
      orgId,
      isActive: true,
    };
    if (filter.supplierId) where.supplierId = filter.supplierId;
    if (filter.period) where.period = filter.period;

    const [data, total] = await Promise.all([
      this.prisma.supplierScorecard.findMany({
        where, skip, take: pageSize, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierScorecard.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getPerformanceTrend(orgId: string, supplierId: string) {
    const scorecards = await this.prisma.supplierScorecard.findMany({
      where: { orgId, supplierId, isActive: true },
      orderBy: { periodStart: 'asc' },
      select: {
        period: true, periodStart: true, periodEnd: true,
        overallScore: true, qualityScore: true, deliveryScore: true,
        priceScore: true, complianceScore: true, riskLevel: true,
      },
    });
    return scorecards;
  }

  // ═══════════════════════════════════════════════════════
  // Supplier Lists & Search
  // ═══════════════════════════════════════════════════════

  async getApprovedSuppliers(orgId: string, filter: SupplierFilterDto) {
    // Approved suppliers are those with APPROVED profiles
    // Buyer org sees all approved suppliers (cross-org query via platform context)
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupplierProfileWhereInput = {
      status: 'APPROVED',
      isActive: true,
    };

    const [data, total] = await Promise.all([
      this.prisma.supplierProfile.findMany({
        where, skip, take: pageSize,
        include: { org: { select: { id: true, name: true, country: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierProfile.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async searchSuppliers(orgId: string, filter: SupplierFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupplierProfileWhereInput = {
      isActive: true,
    };
    if (filter.status) where.status = filter.status;
    if (filter.category) where.spendCategories = { has: filter.category };
    if (filter.search) {
      where.org = {
        name: { contains: filter.search, mode: 'insensitive' },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.supplierProfile.findMany({
        where, skip, take: pageSize,
        include: { org: { select: { id: true, name: true, country: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierProfile.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }
}

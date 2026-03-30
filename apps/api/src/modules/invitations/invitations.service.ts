import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateInvitationDto, RespondInvitationDto } from './dto/invitation.dto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  async invite(orgId: string, eventId: string, dto: CreateInvitationDto, user: JwtPayload) {
    // Verify event belongs to org and is in a valid state
    const event = await this.prisma.rfxEvent.findFirst({
      where: { id: eventId, orgId, isActive: true },
    });
    if (!event) throw new NotFoundException(`RFx event ${eventId} not found`);
    if (!['DRAFT', 'PUBLISHED'].includes(event.status)) {
      throw new ForbiddenException('Cannot invite suppliers to a closed or cancelled event');
    }

    // Prevent duplicate invitation to same email for this event
    const existing = await this.prisma.supplierInvitation.findFirst({
      where: { eventId, orgId, supplierEmail: dto.supplierEmail, isActive: true },
    });
    if (existing) {
      throw new ConflictException(`${dto.supplierEmail} is already invited to this event`);
    }

    const token = uuidv4();
    const invitation = await this.prisma.supplierInvitation.create({
      data: {
        eventId,
        orgId,
        supplierId: dto.supplierId || '',
        supplierEmail: dto.supplierEmail,
        supplierName: dto.supplierName,
        message: dto.message,
        token,
        sentAt: new Date(),
      },
    });

    this.logger.log(`Supplier invited: eventId=${eventId} email=${dto.supplierEmail} orgId=${orgId}`);

    // Domain event triggers email send (Sprint 3 email listener)
    this.eventEmitter.emit('invitation.sent', {
      invitationId: invitation.id,
      eventId,
      orgId,
      supplierEmail: dto.supplierEmail,
      supplierName: dto.supplierName,
      eventTitle: event.title,
      eventRefNumber: event.refNumber,
      token,
      message: dto.message,
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'SUPPLIER_INVITATION',
      entityId: invitation.id,
      newValue: { supplierEmail: dto.supplierEmail, eventId },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'SUPPLIER_INVITED',
      entityType: 'SUPPLIER_INVITATION',
      entityId: invitation.id,
      properties: { eventId, supplierEmail: dto.supplierEmail },
    });

    return invitation;
  }

  async listInvitations(orgId: string, eventId: string) {
    const event = await this.prisma.rfxEvent.findFirst({ where: { id: eventId, orgId } });
    if (!event) throw new NotFoundException(`RFx event ${eventId} not found`);

    return this.prisma.supplierInvitation.findMany({
      where: { eventId, orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByToken(token: string) {
    const invitation = await this.prisma.supplierInvitation.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            refNumber: true,
            title: true,
            description: true,
            type: true,
            status: true,
            currency: true,
            submissionDeadline: true,
            lots: {
              where: { isActive: true },
              include: { lineItems: { where: { isActive: true } } },
              orderBy: { lotNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!invitation || !invitation.isActive) {
      throw new NotFoundException('Invitation not found or no longer valid');
    }

    return invitation;
  }

  async respond(token: string, dto: RespondInvitationDto) {
    const invitation = await this.prisma.supplierInvitation.findUnique({ where: { token } });
    if (!invitation || !invitation.isActive) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'PENDING') {
      throw new ConflictException(`Invitation already ${invitation.status.toLowerCase()}`);
    }

    const updated = await this.prisma.supplierInvitation.update({
      where: { token },
      data: { status: dto.response, respondedAt: new Date() },
    });

    this.eventEmitter.emit('invitation.responded', {
      invitationId: invitation.id,
      response: dto.response,
      supplierEmail: invitation.supplierEmail,
      eventId: invitation.eventId,
    });

    return updated;
  }

  async revoke(orgId: string, invitationId: string, user: JwtPayload) {
    const invitation = await this.prisma.supplierInvitation.findFirst({
      where: { id: invitationId, orgId, isActive: true },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    await this.prisma.supplierInvitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED', isActive: false },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'SUPPLIER_INVITATION',
      entityId: invitationId,
      oldValue: { status: invitation.status },
      newValue: { status: 'REVOKED' },
    });
  }
}

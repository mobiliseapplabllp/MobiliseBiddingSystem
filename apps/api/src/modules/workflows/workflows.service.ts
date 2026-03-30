import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  StartWorkflowDto,
  WorkflowDecisionDto,
  WorkflowFilterDto,
} from './dto/workflow.dto';
import {
  WorkflowTemplateCreatedEvent,
  WorkflowStartedEvent,
  WorkflowStepApprovedEvent,
  WorkflowStepRejectedEvent,
  WorkflowCompletedEvent,
  WorkflowTimedOutEvent,
} from '../../common/events/domain-events';

interface StepSnapshot {
  order: number;
  approverRole: string;
  approverUserId?: string;
  condition?: string;
  timeoutHours?: number;
  status: string; // PENDING | APPROVED | REJECTED | TIMED_OUT
  decidedBy?: string;
  decidedAt?: string;
  comments?: string;
}

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ── Template CRUD ────────────────────────────────────────────────────────

  async createTemplate(dto: CreateWorkflowTemplateDto, user: JwtPayload) {
    if (!dto.steps || dto.steps.length === 0) {
      throw new BadRequestException('Workflow must have at least one step');
    }

    // If setting as default, unset existing default for same trigger type
    if (dto.isDefault) {
      await this.prisma.workflowTemplate.updateMany({
        where: { orgId: user.orgId!, triggerType: dto.triggerType, isDefault: true },
        data: { isDefault: false },
      });
    }

    const result = await this.prisma.workflowTemplate.create({
      data: {
        orgId: user.orgId!,
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        steps: dto.steps as unknown as Prisma.InputJsonValue,
        isDefault: dto.isDefault ?? false,
      },
    });

    this.eventEmitter.emit(
      'workflow-template.created',
      new WorkflowTemplateCreatedEvent(result.id, user.orgId!, user.sub, dto.name, dto.triggerType),
    );

    await this.audit.log({
      orgId: user.orgId!,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'WORKFLOW_TEMPLATE',
      entityId: result.id,
      newValue: result as unknown as Record<string, unknown>,
    });

    await this.analytics.track({
      orgId: user.orgId!,
      userId: user.sub,
      eventType: 'WORKFLOW_TEMPLATE_CREATED',
      entityType: 'WORKFLOW_TEMPLATE',
      entityId: result.id,
    });

    this.logger.log(`Workflow template created: ${result.id} orgId=${user.orgId} userId=${user.sub}`);
    return result;
  }

  async updateTemplate(orgId: string, templateId: string, dto: UpdateWorkflowTemplateDto, user: JwtPayload) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, orgId, isActive: true },
    });
    if (!template) {
      throw new NotFoundException(`Workflow template ${templateId} not found`);
    }

    if (dto.isDefault) {
      await this.prisma.workflowTemplate.updateMany({
        where: { orgId, triggerType: template.triggerType, isDefault: true, id: { not: templateId } },
        data: { isDefault: false },
      });
    }

    const oldValue = template as unknown as Record<string, unknown>;
    const result = await this.prisma.workflowTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.steps !== undefined ? { steps: dto.steps as unknown as Prisma.InputJsonValue } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'WORKFLOW_TEMPLATE',
      entityId: templateId,
      oldValue,
      newValue: result as unknown as Record<string, unknown>,
    });

    return result;
  }

  async listTemplates(orgId: string, filter: WorkflowFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.WorkflowTemplateWhereInput = {
      orgId,
      isActive: true,
      ...(filter.triggerType ? { triggerType: filter.triggerType } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.workflowTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { _count: { select: { workflowInstances: true } } },
      }),
      this.prisma.workflowTemplate.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getTemplate(orgId: string, templateId: string) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, orgId, isActive: true },
      include: { workflowInstances: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!template) {
      throw new NotFoundException(`Workflow template ${templateId} not found`);
    }
    return template;
  }

  async deleteTemplate(orgId: string, templateId: string, user: JwtPayload) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, orgId, isActive: true },
    });
    if (!template) {
      throw new NotFoundException(`Workflow template ${templateId} not found`);
    }

    await this.prisma.workflowTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'DELETE',
      entityType: 'WORKFLOW_TEMPLATE',
      entityId: templateId,
      oldValue: template as unknown as Record<string, unknown>,
    });

    return { message: 'Template deleted' };
  }

  // ── Workflow Instance Management ─────────────────────────────────────────

  async startWorkflow(dto: StartWorkflowDto, user: JwtPayload) {
    let template;

    if (dto.templateId) {
      template = await this.prisma.workflowTemplate.findFirst({
        where: { id: dto.templateId, orgId: user.orgId!, isActive: true },
      });
    } else {
      // Find default template by entity type mapping
      const triggerMap: Record<string, string> = {
        RFX_EVENT: 'EVENT_PUBLISH',
        AWARD: 'AWARD_APPROVAL',
        CONTRACT: 'CONTRACT_APPROVAL',
        SUPPLIER: 'SUPPLIER_APPROVAL',
      };
      const triggerType = triggerMap[dto.entityType] ?? 'CUSTOM';
      template = await this.prisma.workflowTemplate.findFirst({
        where: { orgId: user.orgId!, triggerType, isDefault: true, isActive: true },
      });
    }

    if (!template) {
      throw new NotFoundException('No workflow template found. Create a template first or specify a templateId.');
    }

    const templateSteps = template.steps as unknown as StepSnapshot[];
    const stepsSnapshot: StepSnapshot[] = templateSteps.map((s) => ({
      ...s,
      status: 'PENDING',
    }));

    // Set first step to PENDING (it is the current step)
    const instance = await this.prisma.workflowInstance.create({
      data: {
        orgId: user.orgId!,
        templateId: template.id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        status: 'IN_PROGRESS',
        currentStepOrder: 1,
        steps: stepsSnapshot as unknown as Prisma.InputJsonValue,
      },
    });

    this.eventEmitter.emit(
      'workflow.started',
      new WorkflowStartedEvent(instance.id, user.orgId!, dto.entityType, dto.entityId, template.id),
    );

    await this.audit.log({
      orgId: user.orgId!,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'WORKFLOW_INSTANCE',
      entityId: instance.id,
      newValue: instance as unknown as Record<string, unknown>,
    });

    await this.analytics.track({
      orgId: user.orgId!,
      userId: user.sub,
      eventType: 'WORKFLOW_STARTED',
      entityType: 'WORKFLOW_INSTANCE',
      entityId: instance.id,
      properties: { entityType: dto.entityType, entityId: dto.entityId },
    });

    this.logger.log(`Workflow started: ${instance.id} for ${dto.entityType}/${dto.entityId} orgId=${user.orgId}`);
    return instance;
  }

  async approveStep(orgId: string, instanceId: string, dto: WorkflowDecisionDto, user: JwtPayload) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, orgId, isActive: true, status: 'IN_PROGRESS' },
    });
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found or not in progress`);
    }

    const steps = instance.steps as unknown as StepSnapshot[];
    const currentStep = steps.find((s) => s.order === instance.currentStepOrder);
    if (!currentStep) {
      throw new BadRequestException('Current workflow step not found');
    }

    // Update step
    currentStep.status = 'APPROVED';
    currentStep.decidedBy = user.sub;
    currentStep.decidedAt = new Date().toISOString();
    currentStep.comments = dto.comments;

    const isLastStep = instance.currentStepOrder >= steps.length;

    const updatedInstance = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        steps: steps as unknown as Prisma.InputJsonValue,
        currentStepOrder: isLastStep ? instance.currentStepOrder : instance.currentStepOrder + 1,
        status: isLastStep ? 'APPROVED' : 'IN_PROGRESS',
        completedAt: isLastStep ? new Date() : null,
      },
    });

    this.eventEmitter.emit(
      'workflow.step-approved',
      new WorkflowStepApprovedEvent(instanceId, orgId, user.sub, instance.currentStepOrder),
    );

    if (isLastStep) {
      this.eventEmitter.emit(
        'workflow.completed',
        new WorkflowCompletedEvent(instanceId, orgId, instance.entityType, instance.entityId, 'APPROVED'),
      );
    }

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'WORKFLOW_INSTANCE',
      entityId: instanceId,
      newValue: { step: instance.currentStepOrder, decision: 'APPROVED', comments: dto.comments },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: isLastStep ? 'WORKFLOW_APPROVED' : 'WORKFLOW_STEP_APPROVED',
      entityType: 'WORKFLOW_INSTANCE',
      entityId: instanceId,
    });

    this.logger.log(`Workflow step approved: instance=${instanceId} step=${instance.currentStepOrder} orgId=${orgId} userId=${user.sub}`);
    return updatedInstance;
  }

  async rejectStep(orgId: string, instanceId: string, dto: WorkflowDecisionDto, user: JwtPayload) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, orgId, isActive: true, status: 'IN_PROGRESS' },
    });
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found or not in progress`);
    }

    const steps = instance.steps as unknown as StepSnapshot[];
    const currentStep = steps.find((s) => s.order === instance.currentStepOrder);
    if (!currentStep) {
      throw new BadRequestException('Current workflow step not found');
    }

    currentStep.status = 'REJECTED';
    currentStep.decidedBy = user.sub;
    currentStep.decidedAt = new Date().toISOString();
    currentStep.comments = dto.comments;

    const updatedInstance = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        steps: steps as unknown as Prisma.InputJsonValue,
        status: 'REJECTED',
        completedAt: new Date(),
      },
    });

    this.eventEmitter.emit(
      'workflow.step-rejected',
      new WorkflowStepRejectedEvent(instanceId, orgId, user.sub, instance.currentStepOrder, dto.comments),
    );

    this.eventEmitter.emit(
      'workflow.completed',
      new WorkflowCompletedEvent(instanceId, orgId, instance.entityType, instance.entityId, 'REJECTED'),
    );

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'WORKFLOW_INSTANCE',
      entityId: instanceId,
      newValue: { step: instance.currentStepOrder, decision: 'REJECTED', comments: dto.comments },
    });

    await this.analytics.track({
      orgId,
      userId: user.sub,
      eventType: 'WORKFLOW_REJECTED',
      entityType: 'WORKFLOW_INSTANCE',
      entityId: instanceId,
    });

    this.logger.log(`Workflow step rejected: instance=${instanceId} step=${instance.currentStepOrder} orgId=${orgId} userId=${user.sub}`);
    return updatedInstance;
  }

  async getWorkflowStatus(orgId: string, instanceId: string) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, orgId, isActive: true },
      include: { template: { select: { name: true, triggerType: true } } },
    });
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    }
    return instance;
  }

  async getWorkflowsByEntity(orgId: string, entityType: string, entityId: string) {
    return this.prisma.workflowInstance.findMany({
      where: { orgId, entityType, entityId, isActive: true },
      include: { template: { select: { name: true, triggerType: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelWorkflow(orgId: string, instanceId: string, user: JwtPayload) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, orgId, isActive: true, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    });
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found or already completed`);
    }

    const updatedInstance = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    await this.audit.log({
      orgId,
      userId: user.sub,
      action: 'UPDATE',
      entityType: 'WORKFLOW_INSTANCE',
      entityId: instanceId,
      newValue: { status: 'CANCELLED' },
    });

    this.logger.log(`Workflow cancelled: instance=${instanceId} orgId=${orgId} userId=${user.sub}`);
    return updatedInstance;
  }

  async listInstances(orgId: string, filter: WorkflowFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.WorkflowInstanceWhereInput = {
      orgId,
      isActive: true,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.workflowInstance.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { template: { select: { name: true, triggerType: true } } },
      }),
      this.prisma.workflowInstance.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Scheduled: Check for Timed-Out Steps ─────────────────────────────────

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkTimedOutSteps() {
    const inProgressInstances = await this.prisma.workflowInstance.findMany({
      where: { status: 'IN_PROGRESS', isActive: true },
    });

    const now = new Date();

    for (const instance of inProgressInstances) {
      const steps = instance.steps as unknown as StepSnapshot[];
      const currentStep = steps.find((s) => s.order === instance.currentStepOrder);
      if (!currentStep || !currentStep.timeoutHours) continue;

      const stepStartTime = instance.updatedAt;
      const timeoutMs = currentStep.timeoutHours * 60 * 60 * 1000;
      const deadline = new Date(stepStartTime.getTime() + timeoutMs);

      if (now > deadline) {
        currentStep.status = 'TIMED_OUT';

        await this.prisma.workflowInstance.update({
          where: { id: instance.id },
          data: {
            steps: steps as unknown as Prisma.InputJsonValue,
            status: 'TIMED_OUT',
            completedAt: now,
          },
        });

        this.eventEmitter.emit(
          'workflow.timed-out',
          new WorkflowTimedOutEvent(instance.id, instance.orgId, instance.currentStepOrder),
        );

        this.logger.warn(
          `Workflow timed out: instance=${instance.id} step=${instance.currentStepOrder} orgId=${instance.orgId}`,
        );
      }
    }
  }
}

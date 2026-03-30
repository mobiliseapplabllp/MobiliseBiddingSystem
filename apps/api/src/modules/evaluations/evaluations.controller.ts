import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { EvaluationsService } from './evaluations.service';
import {
  CreateEvaluationDto,
  UpdateEvaluationDto,
  ChangeEvaluationStatusDto,
  EvaluationFilterDto,
  AddCriterionDto,
  AssignEvaluatorDto,
  SubmitScoreDto,
  SubmitConsensusScoreDto,
  ShortlistDto,
} from './dto/evaluation.dto';

@ApiTags('Evaluations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly service: EvaluationsService) {}

  @Post()
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new evaluation' })
  async create(@Body() dto: CreateEvaluationDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles('BUYER', 'EVENT_MANAGER', 'EVALUATOR', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List evaluations with filters' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() filter: EvaluationFilterDto) {
    return this.service.findAll(user.orgId!, filter);
  }

  @Get(':evaluationId')
  @Roles('BUYER', 'EVENT_MANAGER', 'EVALUATOR', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get evaluation detail with criteria, assignments, and scores' })
  async findOne(@Param('evaluationId') evaluationId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(user.orgId!, evaluationId);
  }

  @Put(':evaluationId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update evaluation (DRAFT only)' })
  async update(
    @Param('evaluationId') evaluationId: string,
    @Body() dto: UpdateEvaluationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(user.orgId!, evaluationId, dto, user);
  }

  @Patch(':evaluationId/status')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Change evaluation status (DRAFT → IN_PROGRESS → COMPLETED)' })
  async changeStatus(
    @Param('evaluationId') evaluationId: string,
    @Body() dto: ChangeEvaluationStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.changeStatus(user.orgId!, evaluationId, dto.status, user);
  }

  @Post(':evaluationId/criteria')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Add criterion to evaluation (DRAFT only)' })
  async addCriterion(
    @Param('evaluationId') evaluationId: string,
    @Body() dto: AddCriterionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.addCriterion(user.orgId!, evaluationId, dto, user);
  }

  @Post(':evaluationId/evaluators')
  @Roles('EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Assign evaluator to an envelope' })
  async assignEvaluator(
    @Param('evaluationId') evaluationId: string,
    @Body() dto: AssignEvaluatorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.assignEvaluator(user.orgId!, evaluationId, dto, user);
  }

  @Post(':evaluationId/scores')
  @Roles('EVALUATOR', 'EVENT_MANAGER')
  @ApiOperation({ summary: 'Submit score for a criterion + bid' })
  async submitScore(
    @Param('evaluationId') evaluationId: string,
    @Body() dto: SubmitScoreDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.submitScore(user.orgId!, evaluationId, dto, user);
  }

  @Get(':evaluationId/summary')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get weighted score summary with bid ranking' })
  async getScoreSummary(
    @Param('evaluationId') evaluationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getScoreSummary(user.orgId!, evaluationId);
  }

  @Get(':evaluationId/matrix')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get score comparison matrix (rows=criteria, cols=evaluators)' })
  async getScoreMatrix(
    @Param('evaluationId') evaluationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getScoreMatrix(user.orgId!, evaluationId);
  }

  @Post(':evaluationId/consensus')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Submit consensus score (evaluation owner only)' })
  async submitConsensusScore(
    @Param('evaluationId') evaluationId: string,
    @Body() dto: SubmitConsensusScoreDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.submitConsensusScore(user.orgId!, evaluationId, dto, user);
  }

  @Post(':evaluationId/shortlist')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Shortlist bids by top N or explicit bid IDs' })
  async shortlistBids(
    @Param('evaluationId') evaluationId: string,
    @Body() dto: ShortlistDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.shortlistBids(user.orgId!, evaluationId, dto, user);
  }

  @Get(':evaluationId/report')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get full evaluation report (structured JSON)' })
  async getEvaluationReport(
    @Param('evaluationId') evaluationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getEvaluationReport(user.orgId!, evaluationId);
  }

  @Get(':evaluationId/report/csv')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Export evaluation report as CSV' })
  @Header('Content-Type', 'text/csv')
  async getEvaluationReportCsv(
    @Param('evaluationId') evaluationId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const report = await this.service.getEvaluationReport(user.orgId!, evaluationId);
    const csv = this.service.generateEvaluationCsv(report);
    res.setHeader('Content-Disposition', `attachment; filename="evaluation-report-${evaluationId}.csv"`);
    res.send(csv);
  }

  @Delete(':evaluationId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Soft-delete evaluation (DRAFT only)' })
  async remove(@Param('evaluationId') evaluationId: string, @CurrentUser() user: JwtPayload) {
    await this.service.remove(user.orgId!, evaluationId, user);
    return { message: 'Evaluation deleted' };
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { SupplierPortalService } from './supplier-portal.service';
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

@ApiTags('Supplier Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('supplier-portal')
export class SupplierPortalController {
  constructor(private readonly service: SupplierPortalService) {}

  // ═══════════════════════════════════════════════════════
  // Sprint 13: Supplier Profiles
  // ═══════════════════════════════════════════════════════

  @Post('profiles')
  @Roles('SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create supplier profile (self-registration)' })
  async createProfile(@Body() dto: CreateSupplierProfileDto, @CurrentUser() user: JwtPayload) {
    return this.service.createProfile(dto, user);
  }

  @Get('profiles/me')
  @Roles('SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get own supplier profile' })
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.service.getProfile(user.orgId!);
  }

  @Get('profiles/:id')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get supplier profile by ID (buyer view)' })
  async getProfileById(@Param('id') id: string) {
    return this.service.getProfileById(id);
  }

  @Put('profiles')
  @Roles('SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update own supplier profile' })
  async updateProfile(@Body() dto: UpdateSupplierProfileDto, @CurrentUser() user: JwtPayload) {
    return this.service.updateProfile(dto, user);
  }

  @Patch('profiles/submit-review')
  @Roles('SUPPLIER', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Submit profile for review' })
  async submitForReview(@CurrentUser() user: JwtPayload) {
    return this.service.submitForReview(user);
  }

  @Patch('profiles/:id/review')
  @Roles('BUYER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Approve, suspend, or blacklist a supplier profile' })
  async reviewProfile(
    @Param('id') id: string,
    @Body() dto: ReviewProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reviewProfile(id, dto, user);
  }

  // ═══════════════════════════════════════════════════════
  // Sprint 13: Supplier Documents
  // ═══════════════════════════════════════════════════════

  @Post('profiles/documents')
  @Roles('SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Upload document metadata for supplier profile' })
  async uploadDocument(@Body() dto: CreateSupplierDocumentDto, @CurrentUser() user: JwtPayload) {
    return this.service.uploadDocument(dto, user);
  }

  @Get('profiles/:id/documents')
  @Roles('SUPPLIER', 'BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List documents for a supplier profile' })
  async listDocuments(@Param('id') id: string) {
    return this.service.listDocuments(id);
  }

  @Patch('documents/:id/verify')
  @Roles('BUYER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Verify or reject a supplier document' })
  async verifyDocument(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.verifyDocument(id, dto, user);
  }

  // ═══════════════════════════════════════════════════════
  // Sprint 14: Qualifications
  // ═══════════════════════════════════════════════════════

  @Post('qualifications')
  @Roles('BUYER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a supplier qualification' })
  async createQualification(@Body() dto: CreateQualificationDto, @CurrentUser() user: JwtPayload) {
    return this.service.createQualification(dto, user);
  }

  @Get('qualifications')
  @Roles('BUYER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List qualifications with filters' })
  async getQualifications(@CurrentUser() user: JwtPayload, @Query() filter: QualificationFilterDto) {
    return this.service.getQualifications(user.orgId!, filter);
  }

  @Patch('qualifications/:id/score')
  @Roles('BUYER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Score and qualify/disqualify a supplier' })
  async scoreQualification(
    @Param('id') id: string,
    @Body() dto: ScoreQualificationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.scoreQualification(id, dto, user);
  }

  // ═══════════════════════════════════════════════════════
  // Sprint 15: Scorecards
  // ═══════════════════════════════════════════════════════

  @Post('scorecards')
  @Roles('BUYER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a supplier performance scorecard' })
  async createScorecard(@Body() dto: CreateScorecardDto, @CurrentUser() user: JwtPayload) {
    return this.service.createScorecard(dto, user);
  }

  @Get('scorecards')
  @Roles('BUYER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List scorecards with filters' })
  async getScorecards(@CurrentUser() user: JwtPayload, @Query() filter: ScorecardFilterDto) {
    return this.service.getScorecards(user.orgId!, filter);
  }

  @Get('scorecards/trend/:supplierId')
  @Roles('BUYER', 'SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get performance trend for a supplier' })
  async getPerformanceTrend(
    @CurrentUser() user: JwtPayload,
    @Param('supplierId') supplierId: string,
  ) {
    return this.service.getPerformanceTrend(user.orgId!, supplierId);
  }

  // ═══════════════════════════════════════════════════════
  // Supplier Lists & Search
  // ═══════════════════════════════════════════════════════

  @Get('suppliers/approved')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get approved supplier list' })
  async getApprovedSuppliers(@CurrentUser() user: JwtPayload, @Query() filter: SupplierFilterDto) {
    return this.service.getApprovedSuppliers(user.orgId!, filter);
  }

  @Get('suppliers/search')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Search suppliers with filters' })
  async searchSuppliers(@CurrentUser() user: JwtPayload, @Query() filter: SupplierFilterDto) {
    return this.service.searchSuppliers(user.orgId!, filter);
  }
}

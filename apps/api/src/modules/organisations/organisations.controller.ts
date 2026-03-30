import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganisationsService } from './organisations.service';
import { CreateOrgRequestDto, CreateBuRequestDto, AssignRoleRequestDto, UpdateOrgRequestDto, UpdateBuRequestDto, SetRolePermissionsDto } from './dto/org.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orgs')
export class OrganisationsController {
  constructor(private readonly orgsService: OrganisationsService) {}

  @Post()
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create organisation' })
  @ApiResponse({ status: 201, description: 'Organisation created' })
  async create(@Body() dto: CreateOrgRequestDto) {
    return this.orgsService.createOrg(dto);
  }

  @Get()
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'List organisations' })
  async list(@CurrentUser() user: JwtPayload) {
    const isPlatformAdmin = user.roles?.some((r) => r.role === 'PLATFORM_ADMIN') ?? false;
    return this.orgsService.listOrgs(user.orgId, isPlatformAdmin);
  }

  @Get(':orgId')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Get organisation details' })
  async get(@Param('orgId') orgId: string, @CurrentUser() user: JwtPayload) {
    const isPlatformAdmin = user.roles?.some((r) => r.role === 'PLATFORM_ADMIN') ?? false;
    if (!isPlatformAdmin && user.orgId !== orgId) {
      throw new ForbiddenException('Cannot access another organisation');
    }
    return this.orgsService.getOrg(orgId);
  }

  @Patch(':orgId')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Update organisation' })
  async updateOrg(@Param('orgId') orgId: string, @Body() dto: UpdateOrgRequestDto, @CurrentUser() user: JwtPayload) {
    const isPlatformAdmin = user.roles?.some((r) => r.role === 'PLATFORM_ADMIN') ?? false;
    if (!isPlatformAdmin && user.orgId !== orgId) {
      throw new ForbiddenException('Cannot modify another organisation');
    }
    return this.orgsService.updateOrg(orgId, dto);
  }

  @Delete(':orgId')
  @HttpCode(HttpStatus.OK)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Deactivate organisation (soft delete)' })
  async deleteOrg(@Param('orgId') orgId: string) {
    return this.orgsService.deleteOrg(orgId);
  }

  // ── Helper: enforce org ownership for non-platform-admins ───────────────
  private assertOrgAccess(user: JwtPayload, orgId: string) {
    const isPlatformAdmin = user.roles?.some((r) => r.role === 'PLATFORM_ADMIN') ?? false;
    if (!isPlatformAdmin && user.orgId !== orgId) {
      throw new ForbiddenException('Cannot access another organisation\'s resources');
    }
  }

  @Post(':orgId/bus')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Create business unit' })
  @ApiResponse({ status: 201, description: 'Business unit created' })
  async createBu(@Param('orgId') orgId: string, @Body() dto: CreateBuRequestDto, @CurrentUser() user: JwtPayload) {
    this.assertOrgAccess(user, orgId);
    return this.orgsService.createBu(orgId, dto);
  }

  @Get(':orgId/bus')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN', 'BU_HEAD')
  @ApiOperation({ summary: 'List business units' })
  async listBus(@Param('orgId') orgId: string, @CurrentUser() user: JwtPayload) {
    this.assertOrgAccess(user, orgId);
    return this.orgsService.listBus(orgId);
  }

  @Patch(':orgId/bus/:buId')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Update business unit' })
  async updateBu(
    @Param('orgId') orgId: string,
    @Param('buId') buId: string,
    @Body() dto: UpdateBuRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.assertOrgAccess(user, orgId);
    return this.orgsService.updateBu(orgId, buId, dto);
  }

  @Delete(':orgId/bus/:buId')
  @HttpCode(HttpStatus.OK)
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Deactivate business unit (soft delete)' })
  async deleteBu(@Param('orgId') orgId: string, @Param('buId') buId: string, @CurrentUser() user: JwtPayload) {
    this.assertOrgAccess(user, orgId);
    return this.orgsService.deleteBu(orgId, buId);
  }

  @Put(':orgId/roles')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(@Param('orgId') orgId: string, @Body() dto: AssignRoleRequestDto, @CurrentUser() user: JwtPayload) {
    this.assertOrgAccess(user, orgId);
    return this.orgsService.assignRole(orgId, dto);
  }

  @Get(':orgId/users')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'List users in organisation' })
  async listUsers(@Param('orgId') orgId: string, @CurrentUser() user: JwtPayload) {
    this.assertOrgAccess(user, orgId);
    return this.orgsService.listUsers(orgId);
  }

  // ── Role Permission Management ──────────────────────────────────────────────

  @Get('roles/all')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'List all roles with their permissions' })
  async listRolePermissions() {
    return this.orgsService.listRolePermissions();
  }

  @Get('roles/:role')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  async getRolePermissions(@Param('role') role: string) {
    return this.orgsService.getRolePermissions(role);
  }

  @Put('roles/:role')
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Set permissions for a role (replaces all)' })
  async setRolePermissions(@Param('role') role: string, @Body() dto: SetRolePermissionsDto) {
    return this.orgsService.setRolePermissions(role, dto.permissions);
  }

  @Delete('roles/:role')
  @HttpCode(HttpStatus.OK)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Delete a custom role (not built-in)' })
  async deleteRole(@Param('role') role: string) {
    return this.orgsService.deleteRole(role);
  }
}

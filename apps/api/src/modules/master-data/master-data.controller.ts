import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { CreateReferenceDataDto, UpdateReferenceDataDto } from './dto/master-data.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('master-data')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  /**
   * GET /master-data/types
   * Returns all MDM types with row counts. PLATFORM_ADMIN admin overview.
   */
  @Get('types')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN', 'BU_ADMIN', 'BUYER', 'EVENT_MANAGER', 'EVALUATOR')
  async listTypes() {
    return this.masterDataService.listTypes();
  }

  /**
   * GET /master-data?type=CURRENCY&orgId=xxx
   * Main consumer endpoint — used by all forms to populate dropdowns.
   */
  @Get()
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN', 'BU_ADMIN', 'BUYER', 'EVENT_MANAGER', 'EVALUATOR', 'SUPPLIER')
  async list(@Query('type') type: string, @CurrentUser() user: JwtPayload) {
    // Always scope to user's own org — never allow querying another org's master data
    return this.masterDataService.list(type, user.orgId ?? undefined);
  }

  /**
   * POST /master-data
   * Create a new reference data entry. PLATFORM_ADMIN for platform defaults; ORG_ADMIN for org overrides.
   */
  @Post()
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  async create(@Body() dto: CreateReferenceDataDto, @CurrentUser() user: JwtPayload) {
    return this.masterDataService.create(dto, user);
  }

  /**
   * PATCH /master-data/:id
   * Update label, metadata, sortOrder, or isActive.
   */
  @Patch(':id')
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReferenceDataDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.masterDataService.update(id, dto, user);
  }

  /**
   * DELETE /master-data/:id
   * Soft-delete (sets isActive=false). PLATFORM_ADMIN only for platform entries.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('PLATFORM_ADMIN', 'ORG_ADMIN')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.masterDataService.remove(id, user);
  }
}

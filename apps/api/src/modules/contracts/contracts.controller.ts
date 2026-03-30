import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
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
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  UpdateContractDto,
  ChangeContractStatusDto,
  CreateAmendmentDto,
  ContractFilterDto,
} from './dto/contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Post()
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new contract' })
  async create(@Body() dto: CreateContractDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPPLIER')
  @ApiOperation({ summary: 'List contracts with filters and pagination' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() filter: ContractFilterDto) {
    return this.service.findAll(user.orgId!, filter);
  }

  @Get('stats')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get contract statistics for dashboard' })
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.service.getContractStats(user.orgId!);
  }

  @Get('expiring')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get contracts expiring within N days' })
  async getExpiring(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: string,
  ) {
    const withinDays = days ? parseInt(days, 10) : 30;
    return this.service.getExpiringContracts(user.orgId!, withinDays);
  }

  @Get(':contractId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPPLIER')
  @ApiOperation({ summary: 'Get contract detail with amendments' })
  async findOne(@Param('contractId') contractId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(user.orgId!, contractId);
  }

  @Put(':contractId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update contract (DRAFT or UNDER_REVIEW only)' })
  async update(
    @Param('contractId') contractId: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(user.orgId!, contractId, dto, user);
  }

  @Patch(':contractId/status')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Change contract status (lifecycle transition)' })
  async changeStatus(
    @Param('contractId') contractId: string,
    @Body() dto: ChangeContractStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.changeStatus(user.orgId!, contractId, dto, user);
  }

  @Post(':contractId/amendments')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Add an amendment to a contract' })
  async addAmendment(
    @Param('contractId') contractId: string,
    @Body() dto: CreateAmendmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.addAmendment(user.orgId!, contractId, dto, user);
  }

  @Get(':contractId/amendments')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPPLIER')
  @ApiOperation({ summary: 'List amendments for a contract' })
  async getAmendments(
    @Param('contractId') contractId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getAmendments(user.orgId!, contractId);
  }

  @Delete(':contractId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Soft-delete contract (DRAFT only)' })
  async remove(
    @Param('contractId') contractId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.service.remove(user.orgId!, contractId, user);
    return { message: 'Contract deleted' };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CurrencyService } from './currency.service';
import {
  CreateExchangeRateDto,
  ExchangeRateFilterDto,
} from './dto/currency.dto';

@ApiTags('Currency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('currency')
export class CurrencyController {
  constructor(private readonly service: CurrencyService) {}

  @Post('rates')
  @Roles('ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new exchange rate' })
  async createRate(
    @Body() dto: CreateExchangeRateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createRate(dto, user);
  }

  @Get('rates')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List exchange rates with filters and pagination' })
  async listRates(
    @CurrentUser() user: JwtPayload,
    @Query() filter: ExchangeRateFilterDto,
  ) {
    return this.service.listRates(user.orgId, filter);
  }

  @Get('convert')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPPLIER')
  @ApiOperation({ summary: 'Convert an amount between currencies' })
  async convert(
    @CurrentUser() user: JwtPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('amount') amount: string,
  ) {
    return this.service.convertAmount(
      user.orgId,
      from,
      to,
      parseFloat(amount),
      user.sub,
    );
  }
}

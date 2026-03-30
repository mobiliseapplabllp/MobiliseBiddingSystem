import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AnalyticsService } from '../../common/services/analytics.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  CreateExchangeRateDto,
  ExchangeRateFilterDto,
} from './dto/currency.dto';
import {
  ExchangeRateCreatedEvent,
  CurrencyConvertedEvent,
} from '../../common/events/domain-events';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
  ) {}

  // ── Create Exchange Rate ─────────────────────────────────────────────────

  async createRate(dto: CreateExchangeRateDto, user: JwtPayload) {
    if (dto.fromCurrency === dto.toCurrency) {
      throw new BadRequestException('From and to currencies must be different');
    }

    const result = await this.prisma.exchangeRate.create({
      data: {
        orgId: user.orgId,
        fromCurrency: dto.fromCurrency.toUpperCase(),
        toCurrency: dto.toCurrency.toUpperCase(),
        rate: new Prisma.Decimal(dto.rate),
        source: dto.source ?? 'MANUAL',
        effectiveDate: new Date(dto.effectiveDate),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    this.eventEmitter.emit(
      'exchange-rate.created',
      new ExchangeRateCreatedEvent(
        result.id,
        user.orgId,
        user.sub,
        dto.fromCurrency,
        dto.toCurrency,
      ),
    );

    await this.audit.log({
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      action: 'CREATE',
      entityType: 'EXCHANGE_RATE',
      entityId: result.id,
      newValue: result as unknown as Record<string, unknown>,
    });

    await this.analytics.track({
      orgId: user.orgId ?? undefined,
      userId: user.sub,
      eventType: 'EXCHANGE_RATE_CREATED',
      entityType: 'EXCHANGE_RATE',
      entityId: result.id,
    });

    this.logger.log(
      `Exchange rate created: ${dto.fromCurrency}→${dto.toCurrency} orgId=${user.orgId} userId=${user.sub}`,
    );

    return result;
  }

  // ── Get Current Rate ─────────────────────────────────────────────────────

  async getRate(
    orgId: string | null,
    fromCurrency: string,
    toCurrency: string,
  ) {
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        rate: 1,
        source: 'IDENTITY',
        effectiveDate: new Date(),
      };
    }

    const now = new Date();

    // Try org-specific rate first, then platform default
    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        effectiveDate: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(orgId
          ? { orgId: { in: [orgId, null as unknown as string] } }
          : { orgId: null }),
      },
      orderBy: [
        { orgId: 'desc' }, // prefer org-specific over platform default
        { effectiveDate: 'desc' },
      ],
    });

    if (!rate) {
      throw new NotFoundException(
        `No exchange rate found for ${fromCurrency}→${toCurrency}`,
      );
    }

    return rate;
  }

  // ── Convert Amount ───────────────────────────────────────────────────────

  async convertAmount(
    orgId: string | null,
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    userId?: string,
  ) {
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        originalAmount: amount,
        convertedAmount: amount,
        rate: 1,
      };
    }

    const rateRecord = await this.getRate(orgId, fromCurrency, toCurrency);
    const rate = Number(rateRecord.rate);
    const convertedAmount = amount * rate;

    if (userId) {
      this.eventEmitter.emit(
        'currency.converted',
        new CurrencyConvertedEvent(
          orgId ?? '',
          userId,
          fromCurrency,
          toCurrency,
          amount,
          convertedAmount,
        ),
      );
    }

    return {
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      originalAmount: amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      rate,
      effectiveDate: rateRecord.effectiveDate,
      source: rateRecord.source,
    };
  }

  // ── List Rates ───────────────────────────────────────────────────────────

  async listRates(orgId: string | null, filter: ExchangeRateFilterDto) {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ExchangeRateWhereInput = {
      OR: [{ orgId }, { orgId: null }],
      ...(filter.fromCurrency
        ? { fromCurrency: filter.fromCurrency.toUpperCase() }
        : {}),
      ...(filter.toCurrency
        ? { toCurrency: filter.toCurrency.toUpperCase() }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.exchangeRate.findMany({
        where,
        orderBy: { effectiveDate: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.exchangeRate.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ── Get Bid Normalized Price ─────────────────────────────────────────────

  async getBidNormalizedPrice(
    orgId: string,
    bidPrice: number,
    bidCurrency: string,
    baseCurrency: string,
  ) {
    const result = await this.convertAmount(
      orgId,
      bidCurrency,
      baseCurrency,
      bidPrice,
    );
    return {
      originalPrice: bidPrice,
      originalCurrency: bidCurrency,
      normalizedPrice: result.convertedAmount,
      normalizedCurrency: baseCurrency,
      rateUsed: result.rate,
      effectiveDate: result.effectiveDate,
    };
  }
}

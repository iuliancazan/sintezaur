import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CurrentUser,
  JwtAuthGuard,
  RolesAllowed,
  RolesGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import type {
  AuditLogAction,
  CurrencyRate,
  DisplayCurrency,
} from '@sintezaur/db';
import type { Request } from 'express';
import { AuditLogService } from '../common/audit-log.service';
import { CurrencyRatesService } from './currency-rates.service';

class UpdateCurrencyRateDto {
  @IsIn(['eur'])
  currencyCode!: 'eur';

  /** Decimal string with 2–4 fraction digits, e.g. "5.0700". */
  @IsNumberString({ no_symbols: false })
  rateToRon!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

/**
 * `/admin/*` surface for foundation closure (M6-E3):
 *
 *   GET  /admin/audit-log               — paginated, filterable viewer
 *   GET  /admin/currency-rates          — history (newest first)
 *   GET  /admin/currency-rates/active   — active rate per currency
 *   POST /admin/currency-rates          — push a new manual rate
 *
 * Spec §7.12 (currency convention) + §11 (admin dashboard scope).
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('admin', 'superadmin')
export class AdminClosureController {
  constructor(
    private readonly audit: AuditLogService,
    private readonly currency: CurrencyRatesService,
  ) {}

  @Get('audit-log')
  listAudit(
    @Query('action') action?: AuditLogAction,
    @Query('targetType') targetType?: string,
    @Query('actorId') actorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.audit.list({
      action,
      targetType,
      actorId,
      from: from ? parseDate(from) : undefined,
      to: to ? parseDate(to) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('currency-rates')
  listRates(): Promise<CurrencyRate[]> {
    return this.currency.history();
  }

  @Get('currency-rates/active')
  activeRates() {
    return this.currency.active();
  }

  @Post('currency-rates')
  @HttpCode(HttpStatus.CREATED)
  async createRate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCurrencyRateDto,
    @Req() req: Request,
  ): Promise<CurrencyRate> {
    return this.currency.create(
      user.sub,
      {
        currencyCode: dto.currencyCode as DisplayCurrency,
        rateToRon: dto.rateToRon,
        note: dto.note ?? null,
      },
      req,
    );
  }
}

function parseDate(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Data invalidă: ${s}`);
  }
  return d;
}

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  DATABASE,
  currencyRates,
  type CurrencyRate,
  type DisplayCurrency,
  type SintezaurDb,
} from '@sintezaur/db';
import { desc, eq } from 'drizzle-orm';
import type { Request } from 'express';
import { AuditLogService } from '../common/audit-log.service';

/**
 * Manual EUR↔RON rate management per spec §7.12. Each new rate is a
 * fresh row in `currency_rates` — the active row per currency is the
 * one with the latest `valid_from <= now()`.
 *
 * RON itself has no row (rate to itself is always 1). MVP only models
 * EUR; USD lands post-MVP if needed.
 */
@Injectable()
export class CurrencyRatesService {
  constructor(
    @Inject(DATABASE) private readonly db: SintezaurDb,
    private readonly audit: AuditLogService,
  ) {}

  async history(): Promise<CurrencyRate[]> {
    return await this.db
      .select()
      .from(currencyRates)
      .orderBy(desc(currencyRates.validFrom));
  }

  async active(): Promise<{
    eur: { rateToRon: string; validFrom: Date } | null;
  }> {
    const [eur] = await this.db
      .select({
        rateToRon: currencyRates.rateToRon,
        validFrom: currencyRates.validFrom,
      })
      .from(currencyRates)
      .where(eq(currencyRates.currencyCode, 'eur'))
      .orderBy(desc(currencyRates.validFrom))
      .limit(1);
    return { eur: eur ?? null };
  }

  async create(
    actorId: string,
    input: {
      currencyCode: DisplayCurrency;
      rateToRon: string;
      note: string | null;
    },
    req?: Request,
  ): Promise<CurrencyRate> {
    const numeric = Number(input.rateToRon);
    if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 1000) {
      throw new BadRequestException(
        'Rata trebuie să fie un număr pozitiv rezonabil (>0, <1000).',
      );
    }
    const [row] = await this.db
      .insert(currencyRates)
      .values({
        currencyCode: input.currencyCode,
        rateToRon: input.rateToRon,
        updatedBy: actorId,
        note: input.note,
      })
      .returning();

    await this.audit.record({
      actorId,
      action: 'update_currency_rate',
      targetType: 'currency_rate',
      targetId: row.id,
      details: {
        currencyCode: input.currencyCode,
        rateToRon: input.rateToRon,
        note: input.note,
      },
      req,
    });

    return row;
  }
}

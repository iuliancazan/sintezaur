import { Module } from '@nestjs/common';
import { AdminClosureController } from './admin-closure.controller';
import { CurrencyRatesService } from './currency-rates.service';

@Module({
  controllers: [AdminClosureController],
  providers: [CurrencyRatesService],
  exports: [CurrencyRatesService],
})
export class AdminClosureModule {}

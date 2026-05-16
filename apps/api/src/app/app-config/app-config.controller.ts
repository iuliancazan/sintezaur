import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '@sintezaur/auth';

/**
 * Runtime config exposed to the FE so it can resolve storage URLs without
 * hardcoding the active driver's public base. Fetched once at FE bootstrap
 * (APP_INITIALIZER) — adding a sub-100ms HTTP roundtrip beats baking the
 * URL into the build (rebuild on every storage cutover) and beats sending
 * full URLs in every photo row (touches dozens of DTOs).
 */
@Public()
@Controller('config')
export class AppConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  get() {
    const raw =
      this.config.get<string>('STORAGE_PUBLIC_BASE_URL') ??
      'http://localhost:3000/uploads';
    return {
      imageBaseUrl: raw.replace(/\/+$/, ''),
    };
  }
}

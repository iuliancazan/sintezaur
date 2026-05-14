import { Controller, Get } from '@nestjs/common';
import { Public } from '@sintezaur/auth';
import { AppService } from './app.service';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }
}

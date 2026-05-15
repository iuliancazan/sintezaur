import { Module } from '@nestjs/common';
import { AuthModule as SintezaurAuthModule } from '@sintezaur/auth';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';

@Module({
  imports: [SintezaurAuthModule],
  controllers: [AuthController],
  providers: [AuthService, EmailService],
  exports: [AuthService, EmailService],
})
export class AuthModule {}

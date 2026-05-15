import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

/**
 * In-product feedback (M6-D). Imports AuthModule for the shared
 * EmailService that mirrors a submission to the operator's inbox.
 */
@Module({
  imports: [AuthModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}

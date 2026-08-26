import { Module } from '@nestjs/common';
import { JobClassifierModule } from '../job-classifier/job-classifier.module';
import { JobDecisionController } from './job-decision.controller';
import { JobDecisionService } from './job-decision.service';

@Module({
  imports: [JobClassifierModule],
  controllers: [JobDecisionController],
  providers: [JobDecisionService],
  exports: [JobDecisionService],
})
export class JobDecisionModule {}

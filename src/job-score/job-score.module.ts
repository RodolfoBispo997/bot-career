import { Module } from '@nestjs/common';
import { JobClassifierModule } from '../job-classifier/job-classifier.module';
import { JobDecisionModule } from '../job-decision/job-decision.module';
import { JobScoreController } from './job-score.controller';
import { JobScoreService } from './job-score.service';

@Module({
  imports: [JobClassifierModule, JobDecisionModule],
  controllers: [JobScoreController],
  providers: [JobScoreService],
  exports: [JobScoreService],
})
export class JobScoreModule {}

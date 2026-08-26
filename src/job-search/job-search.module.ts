import { Module } from '@nestjs/common';
import { JobClassifierModule } from '../job-classifier/job-classifier.module';
import { JobDecisionModule } from '../job-decision/job-decision.module';
import { JobScoreModule } from '../job-score/job-score.module';
import { RemotiveProvider } from '../sources/remotive.provider';
import { JobSearchController } from './job-search.controller';
import { JobSearchService } from './job-search.service';

@Module({
  imports: [JobClassifierModule, JobDecisionModule, JobScoreModule],
  controllers: [JobSearchController],
  providers: [RemotiveProvider, JobSearchService],
})
export class JobSearchModule {}

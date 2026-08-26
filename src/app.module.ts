import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { JobClassifierModule } from './job-classifier/job-classifier.module';
import { JobDecisionModule } from './job-decision/job-decision.module';
import { JobScoreModule } from './job-score/job-score.module';
import { JobSearchModule } from './job-search/job-search.module';
import { JobsModule } from './jobs/jobs.module';
import { PrismaModule } from './prisma/prisma.module';
import { SearchProfileModule } from './search-profile/search-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    JobsModule,
    JobClassifierModule,
    JobDecisionModule,
    JobScoreModule,
    JobSearchModule,
    SearchProfileModule,
  ],
})
export class AppModule {}

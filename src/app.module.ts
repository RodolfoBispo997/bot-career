import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { PrismaModule } from './prisma/prisma.module';
import { SearchProfileModule } from './search-profile/search-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    JobsModule,
    SearchProfileModule,
  ],
})
export class AppModule {}

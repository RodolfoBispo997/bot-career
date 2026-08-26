import { Module } from '@nestjs/common';
import { JobClassifierController } from './job-classifier.controller';
import { JobClassifierService } from './job-classifier.service';

@Module({
  controllers: [JobClassifierController],
  providers: [JobClassifierService],
  exports: [JobClassifierService],
})
export class JobClassifierModule {}

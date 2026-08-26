import { Body, Controller, Post } from '@nestjs/common';
import { JobClassifierService } from '../job-classifier/job-classifier.service';
import { SEARCH_PROFILE } from '../search-profile/search-profile.config';
import { EvaluateJobDto } from './dto/evaluate-job.dto';
import { JobDecisionService } from './job-decision.service';

@Controller('job-decision')
export class JobDecisionController {
  constructor(
    private readonly classifier: JobClassifierService,
    private readonly decisionService: JobDecisionService,
  ) {}

  @Post('evaluate')
  evaluate(@Body() input: EvaluateJobDto) {
    const classification = this.classifier.classify(input);
    const decision = this.decisionService.evaluate({
      job: input,
      classification,
      profile: SEARCH_PROFILE,
    });

    return { classification, decision };
  }
}

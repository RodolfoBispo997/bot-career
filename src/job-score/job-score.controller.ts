import { Body, Controller, Post } from '@nestjs/common';
import { JobClassifierService } from '../job-classifier/job-classifier.service';
import { JobDecisionService } from '../job-decision/job-decision.service';
import { SEARCH_PROFILE } from '../search-profile/search-profile.config';
import { EvaluateJobDto } from './dto/evaluate-job.dto';
import { JobScoreService } from './job-score.service';

@Controller('job-score')
export class JobScoreController {
  constructor(
    private readonly classifier: JobClassifierService,
    private readonly decisionService: JobDecisionService,
    private readonly scoreService: JobScoreService,
  ) {}

  @Post('evaluate')
  evaluate(@Body() input: EvaluateJobDto) {
    const classification = this.classifier.classify(input);
    const decision = this.decisionService.evaluate({
      job: input,
      classification,
      profile: SEARCH_PROFILE,
    });
    const score = this.scoreService.evaluate({
      job: input,
      classification,
      decision,
      profile: SEARCH_PROFILE,
    });

    return { classification, decision, score };
  }
}

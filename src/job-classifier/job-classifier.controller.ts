import { Body, Controller, Post } from '@nestjs/common';
import { ClassifyJobDto } from './dto/classify-job.dto';
import { JobClassifierService } from './job-classifier.service';

@Controller('job-classifier')
export class JobClassifierController {
  constructor(private readonly classifier: JobClassifierService) {}

  @Post('classify')
  classify(@Body() input: ClassifyJobDto) {
    return this.classifier.classify(input);
  }
}

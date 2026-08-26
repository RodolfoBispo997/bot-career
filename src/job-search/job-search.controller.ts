import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { JobSearchService } from './job-search.service';

@Controller('job-search')
export class JobSearchController {
  constructor(private readonly jobSearchService: JobSearchService) {}

  @Get()
  search(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.jobSearchService.search(limit);
  }
}

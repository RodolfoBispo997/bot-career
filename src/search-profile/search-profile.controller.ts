import { Controller, Get } from '@nestjs/common';
import { SearchProfileService } from './search-profile.service';

@Controller('search-profile')
export class SearchProfileController {
  constructor(private readonly searchProfileService: SearchProfileService) {}

  @Get()
  getProfile() {
    return this.searchProfileService.getProfile();
  }
}

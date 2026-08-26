import { Injectable } from '@nestjs/common';
import { SEARCH_PROFILE } from './search-profile.config';
import { SearchProfile } from './types';

@Injectable()
export class SearchProfileService {
  getProfile(): SearchProfile {
    return SEARCH_PROFILE;
  }
}

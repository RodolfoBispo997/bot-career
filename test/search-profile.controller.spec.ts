import { describe, expect, it } from '@jest/globals';
import { SearchProfileController } from '../src/search-profile/search-profile.controller';
import { SearchProfileService } from '../src/search-profile/search-profile.service';

describe('SearchProfileController', () => {
  it('returns the current profile', () => {
    const service = new SearchProfileService();
    const controller = new SearchProfileController(service);

    expect(controller.getProfile()).toBe(service.getProfile());
  });
});

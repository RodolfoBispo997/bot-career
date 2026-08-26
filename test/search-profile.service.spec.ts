import { describe, expect, it } from '@jest/globals';
import { SEARCH_PROFILE } from '../src/search-profile/search-profile.config';
import { SearchProfileService } from '../src/search-profile/search-profile.service';
import { JobTrack, Seniority, RoleType } from '../src/search-profile/types';

describe('SearchProfileService', () => {
  const service = new SearchProfileService();

  it('returns the configured Node.js seniorities', () => {
    expect(service.getProfile().node.targetSeniorities).toEqual([
      Seniority.INTERNSHIP,
      Seniority.TRAINEE,
      Seniority.JUNIOR,
      Seniority.JUNIOR_MID,
      Seniority.UNSPECIFIED,
    ]);
  });

  it('returns the configured PHP seniorities', () => {
    expect(service.getProfile().php.targetSeniorities).toEqual([
      Seniority.JUNIOR,
      Seniority.JUNIOR_MID,
      Seniority.MID,
      Seniority.UNSPECIFIED,
    ]);
  });

  it('requires Node.js for internships', () => {
    const profile = service.getProfile();

    expect(profile.internship.track).toBe(JobTrack.NODE_INTERNSHIP);
    expect(profile.internship.requiresNodeJs).toBe(true);
    expect(profile.internship.acceptedRoleTypes).toEqual([
      RoleType.BACKEND,
      RoleType.FULLSTACK,
      RoleType.SOFTWARE_ENGINEERING,
      RoleType.SOFTWARE_DEVELOPMENT,
    ]);
  });

  it('configures the accepted and non-target employment types', () => {
    const profile = service.getProfile();

    expect(profile.acceptedEmploymentTypes).toEqual([
      'CLT',
      'PJ',
      'INTERNSHIP',
    ]);
    expect(profile.nonTargetEmploymentTypes).toEqual([
      'COOPERATIVE',
      'TEMPORARY',
    ]);
    expect(profile.unknownEmploymentTypeIsAutomaticallyInvalid).toBe(false);
  });

  it('does not require salary information', () => {
    expect(service.getProfile().salaryRequired).toBe(false);
  });

  it('requires manual location review for hybrid and onsite work', () => {
    const profile = service.getProfile();

    expect(profile.modalities.hybrid.locationRequiresManualReview).toBe(true);
    expect(profile.modalities.onsite.locationRequiresManualReview).toBe(true);
    expect(profile.modalities.baseLocation).toBe('São Paulo - SP');
  });

  it('identifies legacy and excluded PHP stacks without classification logic', () => {
    const technologies = service.getProfile().php.technologies;

    expect(technologies.legacy).toEqual([
      'PHP 5',
      'CodeIgniter',
      'Zend legado',
      'jQuery',
    ]);
    expect(technologies.excludedWhenCentral).toEqual([
      'WordPress',
      'Magento',
      'WooCommerce',
    ]);
  });

  it('exposes the same central configuration through the service', () => {
    expect(service.getProfile()).toBe(SEARCH_PROFILE);
  });
});

import { describe, expect, it } from 'vitest';
import { getProfile } from '../index';
import { PROFILE_FIXTURES } from './fixtures';

describe('getProfile（PROFILE_FIXTURES との照合）', () => {
  for (const fixture of PROFILE_FIXTURES) {
    it(`${fixture.birth}: ${fixture.note}`, () => {
      const profile = getProfile(new Date(fixture.birth));
      expect(profile.honmei, '本命星').toBe(fixture.honmei);
      expect(profile.getsumei, '月命星').toBe(fixture.getsumei);
    });
  }
});

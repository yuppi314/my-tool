import { describe, expect, it } from 'vitest';
import { getKeisha } from '../keisha';
import { KEISHA_LABEL as PRODUCTION_KEISHA_LABEL } from '../keishaLabel';
import { KEISHA_FIXTURES, KEISHA_LABEL as FIXTURE_KEISHA_LABEL } from './keishaFixtures';

describe('getKeisha（KEISHA_FIXTURES との照合）', () => {
  for (const fixture of KEISHA_FIXTURES) {
    it(`${fixture.birth}: 本命${fixture.honmei}/月命${fixture.getsumei} → ${fixture.keisha}`, () => {
      expect(getKeisha(fixture.honmei, fixture.getsumei)).toBe(fixture.keisha);
    });
  }

  it('本命星と月命星が同じときは中宮(chuo)になり、例外を投げない', () => {
    expect(() => getKeisha(3, 3)).not.toThrow();
    expect(getKeisha(3, 3)).toBe('chuo');
  });
});

describe('KeishaPalace の型整合性', () => {
  it('types.ts の KeishaPalace と keishaFixtures.ts の KeishaPalace が過不足なく一致する', () => {
    const productionValues = Object.keys(PRODUCTION_KEISHA_LABEL).sort();
    const fixtureValues = Object.keys(FIXTURE_KEISHA_LABEL).sort();
    expect(productionValues).toHaveLength(9);
    expect(productionValues).toEqual(fixtureValues);
  });
});

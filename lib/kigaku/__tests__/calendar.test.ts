import { describe, expect, it } from 'vitest';
import { getSetsuiriDate, getSolarDate } from '../calendar';
import { SOLAR_TERM_FIXTURES } from './fixtures';

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

describe('getSetsuiriDate（SOLAR_TERM_FIXTURES との照合）', () => {
  for (const fixture of SOLAR_TERM_FIXTURES) {
    it(`${fixture.term} ${fixture.date}`, () => {
      const [y] = fixture.date.split('-').map(Number);
      const result = getSetsuiriDate(fixture.term, y as number);
      expect(ymd(result.year, result.month, result.day)).toBe(fixture.date);
    });
  }
});

describe('getSolarDate の対応範囲', () => {
  it('1899年は範囲外としてthrowする', () => {
    expect(() => getSolarDate(new Date('1899-06-01'))).toThrow();
  });

  it('2101年は範囲外としてthrowする', () => {
    expect(() => getSolarDate(new Date('2101-06-01'))).toThrow();
  });

  it('1900年・2100年は範囲内として通る', () => {
    expect(() => getSolarDate(new Date('1900-06-01'))).not.toThrow();
    expect(() => getSolarDate(new Date('2100-06-01'))).not.toThrow();
  });
});

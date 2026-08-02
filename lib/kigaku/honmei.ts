import type { Star } from './types';

/** 各桁を1桁になるまで足し込む */
export function digitalRoot(n: number): number {
  let value = Math.abs(Math.trunc(n));
  while (value > 9) {
    value = String(value)
      .split('')
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return value;
}

/**
 * 本命星
 *
 * honmei = 11 - digitalRoot(節年)
 * honmei が 10 の場合は 1（一白水星）
 */
export function getHonmei(solarYear: number): Star {
  const root = digitalRoot(solarYear);
  const honmei = 11 - root;
  return (honmei === 10 ? 1 : honmei) as Star;
}

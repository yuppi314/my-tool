import type { Star } from './types';

/**
 * 月命星の対応表
 *
 * 本命星を3グループに分け、節月（節入り基準の月）で引く。
 * 各グループとも、2月から順に1つずつ下がっていく（1の次は9に戻る）。
 *
 * 検証：fixtures.ts の20件すべてと一致することを確認済み。
 */

export type GetsumeiGroup = 'A' | 'B' | 'C';

/** 節月：立春〜啓蟄を 2、小寒〜立春を 1 とする */
export type SolarMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** 本命星 → グループ */
export const GROUP_OF: Record<Star, GetsumeiGroup> = {
  1: 'A', // 一白水星
  4: 'A', // 四緑木星
  7: 'A', // 七赤金星
  2: 'B', // 二黒土星
  5: 'B', // 五黄土星
  8: 'B', // 八白土星
  3: 'C', // 三碧木星
  6: 'C', // 六白金星
  9: 'C', // 九紫火星
};

export const GETSUMEI_TABLE: Record<GetsumeiGroup, Record<SolarMonth, Star>> = {
  // 一白・四緑・七赤
  A: { 2: 8, 3: 7, 4: 6, 5: 5, 6: 4, 7: 3, 8: 2, 9: 1, 10: 9, 11: 8, 12: 7, 1: 6 },
  // 二黒・五黄・八白
  B: { 2: 2, 3: 1, 4: 9, 5: 8, 6: 7, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1, 1: 9 },
  // 三碧・六白・九紫
  C: { 2: 5, 3: 4, 4: 3, 5: 2, 6: 1, 7: 9, 8: 8, 9: 7, 10: 6, 11: 5, 12: 4, 1: 3 },
};

export function getGetsumei(honmei: Star, solarMonth: SolarMonth): Star {
  return GETSUMEI_TABLE[GROUP_OF[honmei]][solarMonth];
}

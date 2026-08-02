/** 1=一白水星 … 9=九紫火星 */
export type Star = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 方位盤の宮。中宮＋八方位 */
export type Palace = 'center' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface SolarDate {
  /** 節年（立春基準の年） */
  year: number;
  /** 節月 1-12（立春から始まる月＝2月扱い） */
  month: number;
  day: number;
}

export interface KigakuProfile {
  honmei: Star;
  getsumei: Star;
  keisha: Palace;
  solarDate: SolarDate;
}

/** 中宮の星から生成した九星の配置 */
export type Board = Record<Palace, Star>;

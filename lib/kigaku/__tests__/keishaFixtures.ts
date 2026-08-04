/**
 * 傾斜宮 検証データ ＋ 仕様訂正
 *
 * ⚠️ 重要：Phase 1 の仕様書に記載した傾斜宮の定義は誤りでした。
 *
 *   誤：本命星を中宮に置いた盤における、月命星の位置
 *   正：月命星を中宮に置いた盤における、本命星の位置
 *
 * 実測データ10件から逆算し、10件すべてで一致することを確認済み。
 * keisha.ts は正しい定義で実装し直すこと。
 *
 * ⚠️ このファイルの値は書き換えないこと。
 */

import type { Star } from '../types';

/** 傾斜宮（八卦の宮名） */
export type KeishaPalace =
  | 'kan'    // 坎宮（北）
  | 'kon'    // 坤宮（南西）
  | 'shin'   // 震宮（東）
  | 'son'    // 巽宮（南東）
  | 'chuo'   // 中宮（中央）
  | 'ken'    // 乾宮（北西）
  | 'da'     // 兌宮（西）
  | 'gon'    // 艮宮（北東）
  | 'ri';    // 離宮（南）

/** 後天定位盤：星 → 宮 */
export const PALACE_OF_STAR: Record<Star, KeishaPalace> = {
  1: 'kan',
  2: 'kon',
  3: 'shin',
  4: 'son',
  5: 'chuo',
  6: 'ken',
  7: 'da',
  8: 'gon',
  9: 'ri',
};

/** 表示用の日本語名 */
export const KEISHA_LABEL: Record<KeishaPalace, string> = {
  kan: '坎宮傾斜',
  kon: '坤宮傾斜',
  shin: '震宮傾斜',
  son: '巽宮傾斜',
  chuo: '中宮傾斜',
  ken: '乾宮傾斜',
  da: '兌宮傾斜',
  gon: '艮宮傾斜',
  ri: '離宮傾斜',
};

export interface KeishaFixture {
  birth: string;
  honmei: Star;
  getsumei: Star;
  keisha: KeishaPalace;
}

export const KEISHA_FIXTURES: KeishaFixture[] = [
  { birth: '1984-02-05', honmei: 7, getsumei: 8, keisha: 'son' },  // 巽宮傾斜
  { birth: '2021-02-03', honmei: 6, getsumei: 5, keisha: 'ken' },  // 乾宮傾斜
  { birth: '1995-01-15', honmei: 6, getsumei: 3, keisha: 'gon' },  // 艮宮傾斜
  { birth: '1990-03-06', honmei: 1, getsumei: 7, keisha: 'gon' },  // 艮宮傾斜
  { birth: '1975-08-08', honmei: 7, getsumei: 2, keisha: 'kan' },  // 坎宮傾斜
  { birth: '1962-04-05', honmei: 2, getsumei: 9, keisha: 'da' },   // 兌宮傾斜
  { birth: '2010-10-08', honmei: 8, getsumei: 3, keisha: 'kan' },  // 坎宮傾斜
  { birth: '1985-07-12', honmei: 6, getsumei: 9, keisha: 'kon' },  // 坤宮傾斜
  { birth: '1993-09-20', honmei: 7, getsumei: 1, keisha: 'kon' },  // 坤宮傾斜
  { birth: '2003-06-15', honmei: 6, getsumei: 1, keisha: 'kan' },  // 坎宮傾斜
];

/**
 * 参考：上記10件すべてを満たす計算式
 *
 *   傾斜宮 = buildBoard(月命星) の中で本命星が入っている宮
 *
 * 式を直接書くのではなく、既存の board.ts を再利用すること。
 *
 * 本命星 === 月命星 のとき結果は中宮になる（例：1990年9月生まれ＝一白／一白）。
 * この場合は 'chuo'（中宮傾斜）を返すこと。例外を投げたり他の宮に寄せたりしない。
 */

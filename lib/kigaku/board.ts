import type { Board, Palace, Star } from './types';

/** 後天定位盤（基準の並び） */
export const FIXED_BOARD: Board = {
  center: 5,
  n: 1,
  ne: 8,
  e: 3,
  se: 4,
  s: 9,
  sw: 2,
  w: 7,
  nw: 6,
};

/**
 * 遁行（逆順）で各宮を巡る順序。
 * 後天定位盤で中宮(5)から数字が1つずつ増える向きに巡ると
 * center→se→e→sw→n→s→ne→w→nw の順で 5,4,3,2,1,9,8,7,6 という
 * 「1つずつ減る」並びになる（= 逆順）。centerStar=5 のときに
 * この順序と後天定位盤が一致することで検証済み。
 */
const PALACE_ORDER: Palace[] = ['center', 'se', 'e', 'sw', 'n', 's', 'ne', 'w', 'nw'];

function prevStar(star: Star): Star {
  return (star === 1 ? 9 : star - 1) as Star;
}

export function buildBoard(centerStar: Star): Board {
  const board = {} as Board;
  let star = centerStar;
  for (const palace of PALACE_ORDER) {
    board[palace] = star;
    star = prevStar(star);
  }
  return board;
}

export function findPalace(board: Board, star: Star): Palace {
  for (const palace of PALACE_ORDER) {
    if (board[palace] === star) {
      return palace;
    }
  }
  // board は buildBoard() で生成される限り9つの星がすべて含まれるため到達しない
  throw new Error(`kigaku: 盤の中に星 ${star} が見つかりませんでした。`);
}

/**
 * 年盤の中宮星は honmei.ts の getHonmei() と同じ規則（11 - digitalRoot(節年)）で
 * 求まるため、専用の関数は用意せず getHonmei(solarYear) をそのまま利用する。
 */

/** 月盤の中宮星。Phase 1 の対象外 */
export function getMonthCenterStar(): never {
  throw new Error('kigaku: 月盤の中宮星の算出は Phase 1 の対象外です。');
}

/** 日盤の中宮星。Phase 1 の対象外 */
export function getDayCenterStar(): never {
  throw new Error('kigaku: 日盤の中宮星の算出は Phase 1 の対象外です。');
}

import type { KeishaPalace, Palace, Star } from './types';
import { buildBoard, findPalace } from './board';

/** 後天定位盤における方位（Palace）と傾斜宮（KeishaPalace）の対応 */
const KEISHA_PALACE_OF_COMPASS: Record<Palace, KeishaPalace> = {
  center: 'chuo',
  n: 'kan',
  ne: 'gon',
  e: 'shin',
  se: 'son',
  s: 'ri',
  sw: 'kon',
  w: 'da',
  nw: 'ken',
};

/**
 * 傾斜宮
 *
 * 月命星を中宮に置いた盤における、本命星の位置。
 * 本命星と月命星が同じときは、本命星が中宮に入るため中宮傾斜('chuo')になる。
 */
export function getKeisha(honmei: Star, getsumei: Star): KeishaPalace {
  const board = buildBoard(getsumei);
  const compassPalace = findPalace(board, honmei);
  return KEISHA_PALACE_OF_COMPASS[compassPalace];
}

import type { Palace, Star } from './types';
import { buildBoard, findPalace } from './board';

/**
 * 傾斜宮
 *
 * 本命星を中宮に置いた盤において、月命星が位置する宮。
 */
export function getKeisha(honmei: Star, getsumei: Star): Palace {
  const board = buildBoard(honmei);
  return findPalace(board, getsumei);
}

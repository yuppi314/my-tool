import type { Board, Palace, Star } from './types';
import { findPalace } from './board';

const OPPOSITE: Record<Exclude<Palace, 'center'>, Exclude<Palace, 'center'>> = {
  n: 's',
  s: 'n',
  ne: 'sw',
  sw: 'ne',
  e: 'w',
  w: 'e',
  se: 'nw',
  nw: 'se',
};

function opposite(palace: Palace): Palace | null {
  return palace === 'center' ? null : OPPOSITE[palace];
}

/** 五黄殺：五黄土星が位置する方位（中宮のときは無し） */
export function getGohouSatsu(board: Board): Palace | null {
  const palace = findPalace(board, 5);
  return palace === 'center' ? null : palace;
}

/** 暗剣殺：五黄殺の反対方位 */
export function getAnkenSatsu(board: Board): Palace | null {
  const gohouSatsu = getGohouSatsu(board);
  return gohouSatsu === null ? null : opposite(gohouSatsu);
}

/** 本命殺：本命星が位置する方位（中宮のときは無し） */
export function getHonmeiSatsu(board: Board, honmei: Star): Palace | null {
  const palace = findPalace(board, honmei);
  return palace === 'center' ? null : palace;
}

/** 本命的殺：本命殺の反対方位 */
export function getHonmeiTekiSatsu(board: Board, honmei: Star): Palace | null {
  const honmeiSatsu = getHonmeiSatsu(board, honmei);
  return honmeiSatsu === null ? null : opposite(honmeiSatsu);
}

/**
 * 十二支のインデックス（0=子〜11=亥）から見た方位。
 * 子=北、卯=東、午=南、酉=西を軸とし、間の支は隣接する八方位に割り当てる。
 */
const JUNISHI_PALACE: Exclude<Palace, 'center'>[] = [
  'n', // 子
  'ne', // 丑
  'ne', // 寅
  'e', // 卯
  'se', // 辰
  'se', // 巳
  's', // 午
  'sw', // 未
  'sw', // 申
  'w', // 酉
  'nw', // 戌
  'nw', // 亥
];

function getJunishiIndex(year: number): number {
  // 4年（甲子）を子(0)の基準年とする
  return ((year - 4) % 12 + 12) % 12;
}

/** 歳破：その年の十二支の反対方位 */
export function getSaiha(year: number): Palace {
  const junishiPalace = JUNISHI_PALACE[getJunishiIndex(year)] as Exclude<Palace, 'center'>;
  return OPPOSITE[junishiPalace];
}

/** 月破：月盤（Phase 1 未実装）の十二支が必要なため、Phase 1 の対象外 */
export function getGeppa(): never {
  throw new Error('kigaku: 月破の算出は月盤が未実装のため Phase 1 の対象外です。');
}

/**
 * 凶方位（五黄殺・暗剣殺・本命殺・本命的殺）
 *
 * 公開APIの signature（board, honmei のみ）には年の情報が無いため、
 * 年の十二支が必要な歳破・月破はここには含まれない。
 * 歳破が必要な場合は getSaiha(year) を別途利用すること。
 */
export function getKyoHoi(board: Board, honmei: Star): Palace[] {
  const candidates = [
    getGohouSatsu(board),
    getAnkenSatsu(board),
    getHonmeiSatsu(board, honmei),
    getHonmeiTekiSatsu(board, honmei),
  ];

  const result: Palace[] = [];
  for (const palace of candidates) {
    if (palace !== null && !result.includes(palace)) {
      result.push(palace);
    }
  }
  return result;
}

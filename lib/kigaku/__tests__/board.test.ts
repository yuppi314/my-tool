import { describe, expect, it } from 'vitest';
import { buildBoard, findPalace, FIXED_BOARD, getMonthCenterStar, getDayCenterStar } from '../board';

describe('buildBoard', () => {
  it('中宮が5のとき、後天定位盤と一致する', () => {
    expect(buildBoard(5)).toEqual(FIXED_BOARD);
  });

  it('中宮が1のとき、既知の一白中宮盤と一致する', () => {
    expect(buildBoard(1)).toEqual({
      center: 1,
      n: 6,
      ne: 4,
      e: 8,
      se: 9,
      s: 5,
      sw: 7,
      w: 3,
      nw: 2,
    });
  });

  it('どの中宮星でも9つの星がすべて1回ずつ現れる', () => {
    for (let center = 1; center <= 9; center++) {
      const board = buildBoard(center as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9);
      const stars = Object.values(board).sort((a, b) => a - b);
      expect(stars).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });
});

describe('findPalace', () => {
  it('後天定位盤で3(三碧)は東にある', () => {
    expect(findPalace(FIXED_BOARD, 3)).toBe('e');
  });
});

describe('月盤・日盤の中宮星（Phase 1 未実装）', () => {
  it('getMonthCenterStar は throw する', () => {
    expect(() => getMonthCenterStar()).toThrow();
  });

  it('getDayCenterStar は throw する', () => {
    expect(() => getDayCenterStar()).toThrow();
  });
});

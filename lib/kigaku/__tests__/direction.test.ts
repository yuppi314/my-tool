import { describe, expect, it } from 'vitest';
import { buildBoard, FIXED_BOARD } from '../board';
import {
  getAnkenSatsu,
  getGohouSatsu,
  getHonmeiSatsu,
  getHonmeiTekiSatsu,
  getKyoHoi,
  getSaiha,
} from '../direction';

describe('五黄殺・暗剣殺', () => {
  it('五黄が中宮のときは無し', () => {
    expect(getGohouSatsu(FIXED_BOARD)).toBeNull();
    expect(getAnkenSatsu(FIXED_BOARD)).toBeNull();
  });

  it('一白中宮盤では五黄は南、暗剣殺は北', () => {
    const board = buildBoard(1);
    expect(getGohouSatsu(board)).toBe('s');
    expect(getAnkenSatsu(board)).toBe('n');
  });
});

describe('本命殺・本命的殺', () => {
  it('後天定位盤で一白の本命殺は北、本命的殺は南', () => {
    expect(getHonmeiSatsu(FIXED_BOARD, 1)).toBe('n');
    expect(getHonmeiTekiSatsu(FIXED_BOARD, 1)).toBe('s');
  });

  it('自分の星が中宮にあるときは無し', () => {
    const board = buildBoard(1);
    expect(getHonmeiSatsu(board, 1)).toBeNull();
    expect(getHonmeiTekiSatsu(board, 1)).toBeNull();
  });
});

describe('getKyoHoi', () => {
  it('後天定位盤・本命1のとき本命殺(北)と本命的殺(南)を含む', () => {
    expect(getKyoHoi(FIXED_BOARD, 1).sort()).toEqual(['n', 's'].sort());
  });

  it('一白中宮盤・本命1のとき五黄殺(南)と暗剣殺(北)を含む', () => {
    expect(getKyoHoi(buildBoard(1), 1).sort()).toEqual(['n', 's'].sort());
  });
});

describe('getSaiha', () => {
  it('1900年（庚子＝子年）の歳破は南', () => {
    expect(getSaiha(1900)).toBe('s');
  });

  it('2024年（甲辰＝辰年）の歳破は北西', () => {
    expect(getSaiha(2024)).toBe('nw');
  });
});

import type { Board, KigakuProfile, Palace, Star } from './types';
import type { SolarMonth } from './getsumeiTable';
import { getSolarDate } from './calendar';
import { getHonmei } from './honmei';
import { getGetsumei } from './getsumei';
import { getKeisha } from './keisha';
import { buildBoard as buildBoardImpl } from './board';
import { getKyoHoi as getKyoHoiImpl } from './direction';

export function getProfile(birthDate: Date): KigakuProfile {
  const solarDate = getSolarDate(birthDate);
  const honmei = getHonmei(solarDate.year);
  const getsumei = getGetsumei(honmei, solarDate.month as SolarMonth);
  const keisha = getKeisha(honmei, getsumei);

  return { honmei, getsumei, keisha, solarDate };
}

export function buildBoard(centerStar: Star): Board {
  return buildBoardImpl(centerStar);
}

export function getKyoHoi(board: Board, honmei: Star): Palace[] {
  return getKyoHoiImpl(board, honmei);
}

export type { Star, Palace, KeishaPalace, SolarDate, KigakuProfile, Board } from './types';

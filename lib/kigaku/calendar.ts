import { Solar } from 'lunar-javascript';
import type { SolarDate } from './types';
import type { SolarMonth } from './getsumeiTable';

/**
 * 節年・節月の判定
 *
 * lunar-javascript は中国標準時(UTC+8)基準で節気の瞬間を計算する。
 * 日本の九星気学は日本標準時(UTC+9)の暦日で節入り日を数えるため、
 * ライブラリが返す瞬間を JST に変換してから日付を取り出す。
 * （検証：SOLAR_TERM_FIXTURES 6件中 1984-02-05 の立春が、この変換をしないと
 *   1984-02-04 になってしまうことを確認済み。他5件は変換の有無で結果が変わらない。）
 */
const CST_OFFSET = 8;
const JST_OFFSET = 9;
const CST_TO_JST_HOURS = JST_OFFSET - CST_OFFSET;

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

/** JST深夜0時からこの分数以内に節気の瞬間が来る場合、日付逆転の可能性を警告する */
const MIDNIGHT_WARNING_WINDOW_MINUTES = 15;

/** 節月の境界となる12節気（正節）。ライブラリ内の名称（簡体字）をキーとする */
const PRINCIPAL_TERMS: { jaName: string; libName: string; solarMonth: SolarMonth }[] = [
  { jaName: '立春', libName: '立春', solarMonth: 2 },
  { jaName: '啓蟄', libName: '惊蛰', solarMonth: 3 },
  { jaName: '清明', libName: '清明', solarMonth: 4 },
  { jaName: '立夏', libName: '立夏', solarMonth: 5 },
  { jaName: '芒種', libName: '芒种', solarMonth: 6 },
  { jaName: '小暑', libName: '小暑', solarMonth: 7 },
  { jaName: '立秋', libName: '立秋', solarMonth: 8 },
  { jaName: '白露', libName: '白露', solarMonth: 9 },
  { jaName: '寒露', libName: '寒露', solarMonth: 10 },
  { jaName: '立冬', libName: '立冬', solarMonth: 11 },
  { jaName: '大雪', libName: '大雪', solarMonth: 12 },
  { jaName: '小寒', libName: '小寒', solarMonth: 1 },
];

interface Ymd {
  year: number;
  month: number;
  day: number;
}

function assertYearInRange(year: number): void {
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error(
      `kigaku: 対応範囲外の年です（${MIN_YEAR}〜${MAX_YEAR}年のみサポート）。指定された年: ${year}`,
    );
  }
}

function compareYmd(a: Ymd, b: Ymd): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** CST(UTC+8)基準のSolar瞬間をJST(UTC+9)基準の瞬間に変換する */
function toJstInstant(solarCst: Solar): { year: number; month: number; day: number; hour: number; minute: number } {
  const jstJulianDay = solarCst.getJulianDay() + CST_TO_JST_HOURS / 24;
  const solarJst = Solar.fromJulianDay(jstJulianDay);
  return {
    year: solarJst.getYear(),
    month: solarJst.getMonth(),
    day: solarJst.getDay(),
    hour: solarJst.getHour(),
    minute: solarJst.getMinute(),
  };
}

function warnIfNearMidnight(jaName: string, jst: { year: number; month: number; day: number; hour: number; minute: number }): void {
  const minutesFromMidnight =
    jst.hour === 23 ? 60 - jst.minute : jst.hour === 0 ? jst.minute : Infinity;
  if (minutesFromMidnight <= MIDNIGHT_WARNING_WINDOW_MINUTES) {
    const hh = String(jst.hour).padStart(2, '0');
    const mm = String(jst.minute).padStart(2, '0');
    console.warn(
      `kigaku: ${jst.year}年の${jaName}がJST深夜0時付近（${jst.year}-${String(jst.month).padStart(2, '0')}-${String(jst.day).padStart(2, '0')} ${hh}:${mm}）です。ライブラリの計算誤差により日付が逆転する可能性があります。`,
    );
  }
}

/** year年内の12節気（JST基準の暦日）を取得する */
function getPrincipalTermsOfYear(year: number): { jaName: string; solarMonth: SolarMonth; jst: Ymd }[] {
  // year年内のどの月日を基準にしても、ライブラリは同じ「year年内の12節気」を返す（検証済み）
  const table = Solar.fromYmd(year, 6, 15).getLunar().getJieQiTable();
  return PRINCIPAL_TERMS.map(({ jaName, libName, solarMonth }) => {
    const solarCst = table[libName];
    if (!solarCst) {
      throw new Error(`kigaku: ライブラリから節気「${libName}」（${jaName}）が取得できませんでした（${year}年）。`);
    }
    const jst = toJstInstant(solarCst);
    warnIfNearMidnight(jaName, jst);
    return { jaName, solarMonth, jst: { year: jst.year, month: jst.month, day: jst.day } };
  });
}

/**
 * 節入り日（JST基準）を取得する。単体テスト・検証用に公開。
 * term は日本語の節気名（例：'立春'）。
 */
export function getSetsuiriDate(term: string, year: number): Ymd {
  assertYearInRange(year);
  const found = PRINCIPAL_TERMS.find((t) => t.jaName === term);
  if (!found) {
    throw new Error(`kigaku: 未知の節気名です: ${term}`);
  }
  const terms = getPrincipalTermsOfYear(year);
  const match = terms.find((t) => t.jaName === term);
  if (!match) {
    throw new Error(`kigaku: 節気「${term}」が${year}年の節気表に見つかりませんでした。`);
  }
  return match.jst;
}

/**
 * 生年月日（グレゴリオ暦、時刻は考慮しない）から節年・節月を判定する。
 */
export function getSolarDate(birthDate: Date): SolarDate {
  const year = birthDate.getUTCFullYear();
  const month = birthDate.getUTCMonth() + 1;
  const day = birthDate.getUTCDate();

  assertYearInRange(year);

  const birthYmd: Ymd = { year, month, day };
  const termsThisYear = getPrincipalTermsOfYear(year);
  // 小寒(1月)は年内の他の節気より暦月では先に来るため、時系列順に並べ替えてから走査する
  const termsChronological = [...termsThisYear].sort((a, b) => compareYmd(a.jst, b.jst));

  // 節月：誕生日以前で最も遅い節気を採用。年内のどの節気よりも前（1月上旬、小寒前）なら
  // 前年の大雪から続く節月(12)扱いとする。
  let solarMonth: SolarMonth | undefined;
  for (const t of termsChronological) {
    if (compareYmd(birthYmd, t.jst) >= 0) {
      solarMonth = t.solarMonth;
    }
  }
  if (solarMonth === undefined) {
    solarMonth = 12;
  }

  // 節年：立春を年の境目とする。立春より前の生まれは前年扱い。
  let solarYear = year;
  if (month === 1) {
    solarYear = year - 1;
  } else if (month === 2) {
    const lichun = termsThisYear.find((t) => t.jaName === '立春');
    if (lichun && compareYmd(birthYmd, lichun.jst) < 0) {
      solarYear = year - 1;
    }
  }

  return { year: solarYear, month: solarMonth, day };
}

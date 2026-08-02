/**
 * 九星気学 鑑定エンジン 検証データ
 *
 * 出典：九星気学の無料鑑定サイト2件（みのり／九星気学八雲院）の照合結果。
 * 食い違った3件は節入り日（立春・啓蟄等）の実日付で判定し、正しい方を採用した。
 *
 * ⚠️ このファイルの値は書き換えないこと。
 *    テストが落ちた場合は実装側を直す。
 */

/** 1=一白水星 … 9=九紫火星 */
export type Star = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface ProfileFixture {
  /** 生年月日（グレゴリオ暦） */
  birth: string;
  honmei: Star;
  getsumei: Star;
  /** 何を検証するケースか */
  note: string;
}

export const PROFILE_FIXTURES: ProfileFixture[] = [
  // ── 立春またぎ（1984年の立春は 2/5）──────────────────
  { birth: '1984-02-03', honmei: 8, getsumei: 9, note: '立春前日の前日。前年扱い' },
  { birth: '1984-02-04', honmei: 8, getsumei: 9, note: '立春前日。2/4を固定で立春にすると落ちる' },
  { birth: '1984-02-05', honmei: 7, getsumei: 8, note: '立春当日。当年扱い＋2月(寅月)開始' },

  // ── 立春またぎ（2021年の立春は 2/3）──────────────────
  { birth: '2021-02-02', honmei: 7, getsumei: 6, note: '立春前日。前年扱い' },
  { birth: '2021-02-03', honmei: 6, getsumei: 5, note: '立春当日。2/4固定だと落ちる' },
  { birth: '2021-02-04', honmei: 6, getsumei: 5, note: '立春の翌日' },

  // ── 年またぎ ────────────────────────────────
  { birth: '1995-01-15', honmei: 6, getsumei: 3, note: '1月生まれ。前年扱い＋1月(丑月)' },
  { birth: '2000-12-31', honmei: 9, getsumei: 4, note: '大晦日。当年のまま' },
  { birth: '1988-02-29', honmei: 3, getsumei: 5, note: 'うるう日' },

  // ── 啓蟄またぎ（1990年の啓蟄は 3/6）─────────────────
  { birth: '1990-03-05', honmei: 1, getsumei: 8, note: '節入り前日。まだ2月扱い。本命星の10→1変換も検証' },
  { birth: '1990-03-06', honmei: 1, getsumei: 7, note: '節入り当日。3月(卯月)開始' },

  // ── 立秋またぎ（1975年の立秋は 8/8）─────────────────
  { birth: '1975-08-07', honmei: 7, getsumei: 3, note: '節入り前日。まだ7月扱い' },
  { birth: '1975-08-08', honmei: 7, getsumei: 2, note: '節入り当日。8月(申月)開始' },

  // ── 清明またぎ（1962年の清明は 4/5）─────────────────
  { birth: '1962-04-04', honmei: 2, getsumei: 1, note: '節入り前日。まだ3月扱い' },
  { birth: '1962-04-05', honmei: 2, getsumei: 9, note: '節入り当日。4月(辰月)開始' },

  // ── 節入り当日（寒露 2010/10/8）────────────────────
  { birth: '2010-10-08', honmei: 8, getsumei: 3, note: '節入り当日。10月(戌月)開始' },

  // ── 通常ケース（月の中日）─────────────────────────
  { birth: '1985-07-12', honmei: 6, getsumei: 9, note: '通常。7月' },
  { birth: '1968-11-23', honmei: 5, getsumei: 2, note: '通常。11月' },
  { birth: '1993-09-20', honmei: 7, getsumei: 1, note: '通常。9月' },
  { birth: '2003-06-15', honmei: 6, getsumei: 1, note: '通常。6月' },
];

/**
 * 参考：上記の判定根拠となる節入り日（実日付）
 * ライブラリの節気計算がこれと一致するかを先に確認すること。
 */
export const SOLAR_TERM_FIXTURES = [
  { term: '立春', date: '1984-02-05' },
  { term: '立春', date: '2021-02-03' },
  { term: '啓蟄', date: '1990-03-06' },
  { term: '清明', date: '1962-04-05' },
  { term: '立秋', date: '1975-08-08' },
  { term: '寒露', date: '2010-10-08' },
];

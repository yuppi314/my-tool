/**
 * 月命星
 *
 * 対応表の実体は getsumeiTable.ts（検証済み・値変更禁止）にあるため、
 * このモジュールはディレクトリ構成に合わせた再エクスポートのみを行う。
 */
export { getGetsumei, GETSUMEI_TABLE, GROUP_OF } from './getsumeiTable';
export type { GetsumeiGroup, SolarMonth } from './getsumeiTable';

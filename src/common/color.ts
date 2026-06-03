import { colord } from 'colord';

/** 玩家序號對應的 Tailwind 色票
 *
 * index 0 對應 P1，依此類推；超出範圍以 fallback 表示。
 * class 欄位以完整字串列出，方便 Tailwind 掃描產生對應樣式。
 */
const playerColorList = [
  { class: 'bg-red-500', hex: '#fb2c36' },
  { class: 'bg-violet-500', hex: '#8e51ff' },
  { class: 'bg-sky-500', hex: '#00a6f4' },
  { class: 'bg-green-500', hex: '#00c950' },
  { class: 'bg-amber-400', hex: '#ffb900' },
  { class: 'bg-orange-600', hex: '#f54900' },
  { class: 'bg-slate-500', hex: '#62748e' },
  { class: 'bg-stone-600', hex: '#57534d' },
];

const fallbackColor = { class: 'bg-neutral-400', hex: '#a1a1a1' };

function getPlayerColor(codeName: string) {
  if (!codeName.includes('P')) {
    return fallbackColor;
  }

  const index = parseInt(codeName.replaceAll('P', ''), 10) - 1;
  return playerColorList[index] ?? fallbackColor;
}

/** 取得玩家底色的 Tailwind class */
export function getPlayerColorClass(codeName: string): string {
  return getPlayerColor(codeName).class;
}

/** 取得玩家顏色的 RGB 物件，供 3D 場景等需要實際色值處使用 */
export function getPlayerColorRgb(codeName: string) {
  return colord(getPlayerColor(codeName).hex).toRgb();
}

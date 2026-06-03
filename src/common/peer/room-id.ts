import { customAlphabet } from 'nanoid';

/** 房號註冊到公用 peer broker 時的固定前綴
 *
 * 顯示給使用者的是 6 碼純數字，加上前綴後才是實際 peer id，
 * 用來與其他應用區隔、降低撞號機率。
 */
const ROOM_ID_PREFIX = 'animals-party-';

/** 產生 6 碼純數字房號（顯示給使用者） */
const generateNumericId = customAlphabet('0123456789', 6);

/** 產生使用者可見的 6 碼數字房號 */
export function generateRoomCode(): string {
  return generateNumericId();
}

/** 將使用者可見房號轉為實際 peer id */
export function toPeerId(code: string): string {
  return `${ROOM_ID_PREFIX}${code}`;
}

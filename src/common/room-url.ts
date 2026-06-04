/** 加入房間網址使用的 query 參數名稱 */
const ROOM_ID_QUERY_KEY = 'roomId';

/** 產生可掃描加入房間的完整網址，例如 https://host/home?roomId=xxx
 *
 * 玩家用手機相機掃描後可直接開啟並自動加入遊戲。
 */
export function buildRoomJoinUrl(roomId: string): string {
  const url = new URL(`${import.meta.env.BASE_URL}home`, window.location.origin);
  url.searchParams.set(ROOM_ID_QUERY_KEY, roomId);
  return url.href;
}

/** 從掃描結果解析房號，支援純房號或完整加入網址
 *
 * 相容舊版僅含房號的 QR Code，以及新版完整網址。
 */
export function parseRoomId(scanned: string): string {
  const text = scanned.trim();

  try {
    const url = new URL(text);
    return url.searchParams.get(ROOM_ID_QUERY_KEY) ?? text;
  } catch {
    /** 非網址格式，視為純房號 */
    return text;
  }
}

export { ROOM_ID_QUERY_KEY };

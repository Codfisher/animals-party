/** 遠端 log 開關（localStorage 鍵）。
 *  手機端沒有 console，改將 log 透過 peer 資料通道轉送至主機，於主機 DevTools 檢視。 */
export const REMOTE_LOG_STORAGE_KEY = 'animals-party:remote-log';

/** 是否啟用遠端 log。
 *  - dev 模式固定開啟，免設定即可除錯。
 *  - 正式環境保留手動開關：console 執行 `localStorage.setItem('animals-party:remote-log', '1')` 開啟，
 *    清除該鍵即關閉。 */
export function remoteLogEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  if (import.meta.env.DEV) return true;

  return window.localStorage.getItem(REMOTE_LOG_STORAGE_KEY) === '1';
}

/** 將任意值轉為可安全傳輸且可讀的字串，避免無法結構化複製的物件導致 send 失敗 */
export function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

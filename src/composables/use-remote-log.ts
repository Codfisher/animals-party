import { useMainStore } from '../stores/main.store';
import { remoteLogEnabled, safeStringify } from '../common/remote-log';
import { RemoteLogLevel } from '../types';

/** 遠端 log：本機照常輸出，啟用時額外將 log 透過 peer 通道轉送至主機。
 *
 *  手機端（player）沒有 console 可看，開啟遠端 log 後，主機 DevTools 即可看到
 *  各玩家的 log，與主機自身 log 對齊同一時間軸，方便排查兩端同步問題。
 *
 * @param scope 共用前綴，例如 '[ lobby ]'，方便主機端搜尋過濾
 */
export function useRemoteLog(scope = '') {
  const mainStore = useMainStore();

  function emit(level: RemoteLogLevel, parts: unknown[]) {
    const prefixed = scope ? [scope, ...parts] : parts;

    // 本機仍照常輸出，有 console 的環境（桌機）可直接看
    console[level](...prefixed);

    // 啟用且為 player 端（有 client 連線）才轉送至主機
    if (!remoteLogEnabled() || !mainStore.client?.connected) return;

    mainStore.client.send('player:log', {
      clientId: mainStore.clientId,
      level,
      parts: prefixed.map(safeStringify),
    });
  }

  return {
    log: (...parts: unknown[]) => emit('log', parts),
    warn: (...parts: unknown[]) => emit('warn', parts),
    error: (...parts: unknown[]) => emit('error', parts),
  };
}

import { GameConsoleData, GameConsoleState, GamepadData, Player } from '.';
import { UpdateStateParams } from '../stores/game-console.store';

export interface Room {
  /** 房間 ID，等同 host 的 peer id */
  id: string;
  founderId: string;
  playerIds: string[];
}

/** 連線時透過 peer metadata 帶上的識別資料 */
export interface PeerConnectionMetadata {
  clientId: string;
}

/** 遠端 log 等級 */
export type RemoteLogLevel = 'log' | 'warn' | 'error';

/** 玩家端轉送至主機的 log 內容 */
export interface RemoteLogPayload {
  clientId: string;
  level: RemoteLogLevel;
  /** 已序列化的 log 參數，避免無法結構化複製的物件導致傳輸失敗 */
  parts: string[];
}

/** 玩家透過 PeerClient 送往 host 的事件 */
export type ClientEmitEventMap = {
  'player:gamepad-data': GamepadData;
  'player:profile': Player;
  'player:request-game-console-state': void;
  /** 手機端無 console，將 log 轉送至主機檢視（由 remoteLogEnabled 控制是否啟用） */
  'player:log': RemoteLogPayload;
};

/** 玩家透過 PeerClient 監聽、由 host 廣播的事件 */
export type ClientListenEventMap = {
  'game-console:state-update': GameConsoleState;
  'game-console:player-update': Player[];
  'game-console:console-data': GameConsoleData;
};

/** host 透過 PeerHost 廣播給玩家的事件 */
export type HostEmitEventMap = {
  'game-console:state-update': UpdateStateParams;
  'game-console:console-data': GameConsoleData;
};

/** host 透過 PeerHost 監聽的事件（來自玩家訊息或自身狀態變更） */
export type HostListenEventMap = {
  'player:gamepad-data': GamepadData;
  'game-console:player-update': Player[];
  'game-console:profile-update': Player;
};

/** DataChannel 上傳輸的訊息信封 */
export interface PeerMessage {
  event: string;
  data: unknown;
}

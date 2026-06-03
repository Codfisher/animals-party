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

/** 玩家透過 PeerClient 送往 host 的事件 */
export interface ClientEmitEventMap {
  'player:gamepad-data': GamepadData;
  'player:profile': Player;
  'player:request-game-console-state': void;
}

/** 玩家透過 PeerClient 監聽、由 host 廣播的事件 */
export interface ClientListenEventMap {
  'game-console:state-update': GameConsoleState;
  'game-console:player-update': Player[];
  'game-console:console-data': GameConsoleData;
}

/** host 透過 PeerHost 廣播給玩家的事件 */
export interface HostEmitEventMap {
  'game-console:state-update': UpdateStateParams;
  'game-console:console-data': GameConsoleData;
}

/** host 透過 PeerHost 監聽的事件（來自玩家訊息或自身狀態變更） */
export interface HostListenEventMap {
  'player:gamepad-data': GamepadData;
  'game-console:player-update': Player[];
  'game-console:profile-update': Player;
}

/** DataChannel 上傳輸的訊息信封 */
export interface PeerMessage {
  event: string;
  data: unknown;
}

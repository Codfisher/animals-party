import { Socket } from 'socket.io-client';
import { UpdateStateParams } from '../stores/game-console.store';
import { GameConsoleData, GameConsoleState, GamepadData, Player } from '.';

export interface Room {
  /** 房間 ID，6 位數字組成 */
  id: string;
  founderId: string;
  playerIds: string[];
}

interface OnEvents {
  'player:gamepad-data': (data: GamepadData) => void;

  'game-console:room-created': (data: Room) => void;
  'game-console:state-update': (data: GameConsoleState) => void;
  'game-console:player-update': (data: Player[]) => void;
  'game-console:profile-update': (data: Player) => void;
  'game-console:console-data': (data: GameConsoleData) => void;
}

interface EmitEvents {
  'player:join-room': (roomId: string, callback?: (err: any, res: SocketResponse<Room>) => void) => void;
  'player:request-game-console-state': () => void;
  'player:gamepad-data': (data: GamepadData) => void;
  'player:profile': (data: Player) => void;

  'game-console:state-update': (data: UpdateStateParams) => void;
  'game-console:console-data': (data: GameConsoleData) => void;
}
export type SocketResponse<T = undefined> = ErrResponse | SucResponse<T>;
type ErrResponse = {
  status: 'err';
  message: string;
  error?: any;
};
type SucResponse<T> = {
  status: 'suc';
  message: string;
  data: T;
};

export type ClientSocket = Socket<OnEvents, EmitEvents>;
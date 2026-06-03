/** 震動資料 */
export interface ConsoleVibrateData {
  name: `vibrate`;
  value: number;
}

type Data = ConsoleVibrateData;

/** 遊戲機資料 */
export interface GameConsoleData {
  /** 目標玩家 ID，undefined 表示給所有玩家 */
  targets?: string[];
  data: Data;
}
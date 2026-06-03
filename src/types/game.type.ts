import { RouteName } from "../router/router";

/** 遊戲名稱 */
export enum GameName {
  THE_FIRST_PENGUIN = 'the-first-penguin',
  CHICKEN_FLY = 'chicken-fly',
  FOX_AND_MOUSE = 'fox-and-mouse',
}

export interface GameInfo {
  name: `${GameName}`;
  title: string;
  description: string;
  routeName: `${RouteName}`;
}

/** 遊戲狀態 */
export enum GameConsoleStatus {
  /** 首頁 */
  HOME = 'home',
  /** 大廳 */
  LOBBY = 'lobby',
  /** 遊戲中 */
  PLAYING = 'playing',
}

/** PermissionState 是 Web 內建定義 */
export type PlayerPermissionState = PermissionState | 'not-support';

export interface PlayerPermission {
  gyroscope: PlayerPermissionState;
  vibrate: PlayerPermissionState;
}

export const permissionInfoMap: Record<keyof PlayerPermission, {
  label: string;
}> = {
  'gyroscope': {
    label: '陀螺儀',
  },
  'vibrate': {
    label: '震動回饋',
  },
}

/** 玩家 */
export interface Player {
  /** 唯一 ID */
  readonly clientId: string;
  /** 表示玩家手機端允許的 API 清單 */
  permission?: PlayerPermission;
}

export interface GameConsoleState {
  status: `${GameConsoleStatus}`;
  gameName: `${GameName}`;
  players: Player[];
}

/** 遊戲模式 */
export enum GameSceneMode {
  /** 依照預設規則遊玩 */
  NORMAL = 'normal',
  /** 用來作為背景展示使用 */
  SHOWCASE = 'showcase',
  /** 方便用來讓玩家練習，會有人物不會死亡等等效果 */
  TRAINING = 'training',
}

import { TransformNode } from "@babylonjs/core";
import { GameName } from "./game.type";

export enum ClientType {
  /** 遊戲主機 */
  GAME_CONSOLE = 'game-console',
  /** 玩家 */
  PLAYER = 'player',
}

export interface ModelIsland {
  name: `${GameName}`;
  /** 模型原點 */
  rootNode: TransformNode;
  setActive(value: boolean): void;
}
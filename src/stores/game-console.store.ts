import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  GameConsoleState, GameConsoleStatus,
  GameName, Player
} from '../types';

export type UpdateStateParams = Partial<GameConsoleState>;

export const useGameConsoleStore = defineStore('game-console', () => {
  const roomId = ref<string>();

  function setRoomId(id: string) {
    roomId.value = id;
  }

  const status = ref<`${GameConsoleStatus}`>('home');
  const gameName = ref<`${GameName}`>('the-first-penguin');
  const players = ref<Player[]>([]);

  function updateState(state: UpdateStateParams) {
    status.value = state.status ?? status.value;
    gameName.value = state.gameName ?? gameName.value;

    if (state.players) {
      /** 以既有玩家資料為底，再覆蓋 host 廣播的權威資料
       *  （incoming 帶 permission 時直接生效，未帶則保留既有，例如 updateProfile 設定的權限） */
      players.value = state.players.map((incoming) => {
        const target = players.value.find(
          (player) => player.clientId === incoming.clientId
        );

        return {
          ...target,
          ...incoming,
        }
      });
    }
  }

  function updateProfile(data: Player) {
    /** 檢查是否已存在 */
    const index = players.value.findIndex(({ clientId }) =>
      data.clientId === clientId
    );

    /** 不存在，新增 */
    if (index < 0) {
      players.value.push(data);
      return;
    }

    /** 更新資料 */
    players.value[index] = data;
  }

  return {
    status,
    gameName,
    roomId,
    players,

    setRoomId,
    updateState,
    updateProfile,
  }
})
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
      /** 將原本玩家清單的資料儲存至新的清單中 */
      players.value = state.players.map(({ clientId }) => {
        const target = players.value.find(
          (player) => player.clientId === clientId
        );

        return {
          clientId,
          ...target,
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
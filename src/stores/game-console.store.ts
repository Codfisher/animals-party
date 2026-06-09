import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useSessionStorage } from '@vueuse/core';
import { GameConsoleState, GameConsoleStatus, GameName, Player } from '../types';

export type UpdateStateParams = Partial<GameConsoleState>;

export const useGameConsoleStore = defineStore('game-console', () => {
  /** 房號持久化於 sessionStorage：玩家不慎重新整理後仍可據此自動重連，
   *  關閉分頁即自動清除，避免下次又連上早已結束的房間。 */
  const roomId = useSessionStorage('animals-party:roomId', '');

  function setRoomId(id: string) {
    roomId.value = id;
  }

  function clearRoomId() {
    roomId.value = '';
  }

  const status = ref<`${GameConsoleStatus}`>('home');
  const gameName = ref<`${GameName}`>('the-first-penguin');
  const players = ref<Player[]>([]);

  /** 大廳入場動畫（鏡頭運鏡 + 選單出現）是否已播放過。
   *  同一場派對只在第一次進大廳播放，之後回大廳直接定位、略過動畫。 */
  const isLobbyIntroPlayed = ref(false);

  function markLobbyIntroPlayed() {
    isLobbyIntroPlayed.value = true;
  }

  /** 結束派對時重置，讓下一場新派對的第一次進大廳仍會播放入場動畫 */
  function resetLobbyIntro() {
    isLobbyIntroPlayed.value = false;
  }

  function updateState(state: UpdateStateParams) {
    status.value = state.status ?? status.value;
    gameName.value = state.gameName ?? gameName.value;

    if (state.players) {
      /** 以既有玩家資料為底，再覆蓋 host 廣播的權威資料
       *  （incoming 帶 permission 時直接生效，未帶則保留既有，例如 updateProfile 設定的權限） */
      players.value = state.players.map((incoming) => {
        const target = players.value.find((player) => player.clientId === incoming.clientId);

        return {
          ...target,
          ...incoming,
        };
      });
    }
  }

  function updateProfile(data: Player) {
    /** 檢查是否已存在 */
    const index = players.value.findIndex(({ clientId }) => data.clientId === clientId);

    /** 不存在，新增 */
    if (index < 0) {
      players.value = [...players.value, data];
      return;
    }

    /** 更新資料：重建陣列而非原地寫入，確保 computed(() => players) 等依賴可靠更新 */
    players.value = players.value.map((player, i) => (i === index ? data : player));
  }

  function addCpuPlayerList(cpuList: Player[]) {
    players.value = [...players.value, ...cpuList];
  }

  function removeCpuPlayers() {
    players.value = players.value.filter(({ isCpu }) => !isCpu);
  }

  return {
    status,
    gameName,
    roomId,
    players,
    isLobbyIntroPlayed,

    markLobbyIntroPlayed,
    resetLobbyIntro,
    setRoomId,
    clearRoomId,
    updateState,
    updateProfile,
    addCpuPlayerList,
    removeCpuPlayers,
  };
});

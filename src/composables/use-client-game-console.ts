import { GameConsoleData, GameConsoleStatus, GameName, GamepadData, Player, Room } from "../types";
import { computed, onBeforeUnmount } from "vue";

import { createEventHook } from "@vueuse/core";
import { useGameConsoleStore } from "../stores/game-console.store";
import { useMainStore } from "../stores/main.store";

export function useClientGameConsole() {
  const mainStore = useMainStore();
  const gameConsoleStore = useGameConsoleStore();

  async function startParty(): Promise<Room> {
    const room = await mainStore.createHost();
    gameConsoleStore.setRoomId(room.id);
    return room;
  }
  function endParty() {
    mainStore.disconnect();
  }

  function setStatus(status: `${GameConsoleStatus}`) {
    gameConsoleStore.updateState({
      status
    });

    if (!mainStore.host?.connected) {
      return Promise.reject('host 尚未連線');
    }

    mainStore.host.emit('game-console:state-update', {
      status
    });
  }
  function setGameName(gameName: `${GameName}`) {
    gameConsoleStore.updateState({
      gameName
    });

    if (!mainStore.host?.connected) {
      return Promise.reject('host 尚未連線');
    }

    mainStore.host.emit('game-console:state-update', {
      gameName
    });
  }

  function getPlayerCodeName(id: string) {
    const index = gameConsoleStore.players.findIndex(({ clientId }) =>
      clientId === id
    );

    if (index < 0) {
      return 'unknown ';
    }

    return `${index + 1}P`;
  }

  const gamepadDataHook = createEventHook<GamepadData>();
  const playerUpdateHook = createEventHook<Player[]>();
  const profileUpdateHook = createEventHook<Player>();

  onBeforeUnmount(() => {
    mainStore.host?.off('player:gamepad-data', gamepadDataHook.trigger);
    mainStore.host?.off('game-console:player-update', playerUpdateHook.trigger);
    mainStore.host?.off('game-console:profile-update', profileUpdateHook.trigger);
  });

  async function emitConsoleData(data: GameConsoleData) {
    if (!mainStore.host?.connected) {
      return Promise.reject('host 尚未連線');
    }

    mainStore.host.emit('game-console:console-data', data);
  }

  return {
    /** 開始派對
     *
     * 建立連線，並回傳房間資料
     */
    startParty,
    endParty,

    /** 設定遊戲狀態，會自動同步至房間內所有玩家 */
    setStatus,
    /** 設定遊戲名稱，會自動同步至房間內所有玩家 */
    setGameName,
    getPlayerCodeName,

    /** 搖桿控制訊號事件 */
    onGamepadData: (fn: Parameters<typeof gamepadDataHook['on']>[0]) => {
      mainStore.host?.on('player:gamepad-data', gamepadDataHook.trigger);
      return gamepadDataHook.on(fn);
    },

    /** 玩家變更事件，例如玩家加入或斷線等等 */
    onPlayerUpdate: (fn: Parameters<typeof playerUpdateHook['on']>[0]) => {
      mainStore.host?.on('game-console:player-update', playerUpdateHook.trigger);
      return playerUpdateHook.on(fn);
    },

    /** 玩家資料事件，例如 Web API 權限更新等等 */
    onProfileUpdate: (fn: Parameters<typeof profileUpdateHook['on']>[0]) => {
      mainStore.host?.on('game-console:profile-update', profileUpdateHook.trigger);
      return profileUpdateHook.on(fn);
    },

    players: computed(() => gameConsoleStore.players),
    currentGame: computed(() => gameConsoleStore.gameName),

    emitConsoleData,
  }
}

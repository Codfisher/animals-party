import { computed, onBeforeUnmount } from "vue";
import { GameConsoleData, GameConsoleState, Player, Room, SignalData } from "../types";

import { useGameConsoleStore } from "../stores/game-console.store";
import { useMainStore } from "../stores/main.store";
import { createEventHook } from "@vueuse/core";
import { getPlayerColor } from "../common/utils";

export function useClientPlayer() {
  const mainStore = useMainStore();
  const gameConsoleStore = useGameConsoleStore();

  /** 連到指定 host 並加入房間 */
  async function joinRoom(hostId: string): Promise<Room> {
    const room = await mainStore.joinHost(hostId);

    /** 儲存 room id */
    gameConsoleStore.setRoomId(room.id);
    return room;
  }

  const stateUpdateHook = createEventHook<GameConsoleState>();
  const playerUpdateHook = createEventHook<Player[]>();
  const consoleDataHook = createEventHook<GameConsoleData>();

  /** 元件解除安裝前，移除 Listener 以免記憶體洩漏 */
  onBeforeUnmount(() => {
    mainStore.client?.off('game-console:state-update', stateUpdateHook.trigger);
    mainStore.client?.off('game-console:player-update', playerUpdateHook.trigger);
    mainStore.client?.off('game-console:console-data', consoleDataHook.trigger);
  });

  async function requestGameConsoleState() {
    if (!mainStore.client?.connected) {
      return Promise.reject('client 尚未連線');
    }
    mainStore.client.send('player:request-game-console-state', undefined);
  }

  const codeName = computed(() => {
    const index = gameConsoleStore.players.findIndex((player) =>
      player.clientId === mainStore.clientId
    );

    if (index < 0) {
      return 'unknown';
    }

    return `${index + 1}P`;
  });
  const colorName = computed(() => getPlayerColor({ codeName: codeName.value }));

  async function emitGamepadData(data: SignalData[]) {
    if (!mainStore.client?.connected) {
      return Promise.reject('client 尚未連線');
    }

    mainStore.client.send('player:gamepad-data', {
      playerId: mainStore.clientId,
      keys: data,
    })
  }

  async function emitProfile(data: Omit<Player, 'clientId'>) {
    if (!mainStore.client?.connected) {
      return Promise.reject('client 尚未連線');
    }

    mainStore.client.send('player:profile', {
      clientId: mainStore.clientId,
      ...data,
    });
  }

  return {
    joinRoom,

    onGameConsoleStateUpdate: (fn: Parameters<typeof stateUpdateHook['on']>[0]) => {
      /** 監聽 game-console:state-update 事件 */
      mainStore.client?.on('game-console:state-update', stateUpdateHook.trigger);
      return stateUpdateHook.on(fn);
    },
    /** 玩家變更事件，例如玩家加入或斷線等等 */
    onPlayerUpdate: (fn: Parameters<typeof playerUpdateHook['on']>[0]) => {
      mainStore.client?.on('game-console:player-update', playerUpdateHook.trigger);
      return playerUpdateHook.on(fn);
    },
    /** 接收遊戲機發送資料 */
    onConsoleData: (fn: Parameters<typeof consoleDataHook['on']>[0]) => {
      mainStore.client?.on('game-console:console-data', consoleDataHook.trigger);
      return consoleDataHook.on(fn);
    },

    requestGameConsoleState,

    codeName,
    colorName,

    emitGamepadData,
    /** 發送玩家自身資料 */
    emitProfile,
  }
}

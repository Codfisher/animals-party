<template>
  <div class="w-full h-full bg-black">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { RouteName } from '../router/router';

import { useRouter } from 'vue-router';
import { useGameConsoleStore } from '../stores/game-console.store';
import { useClientPlayer } from '../composables/use-client-player';
import { GameName } from '../types';

const gameConsoleStore = useGameConsoleStore();
const router = useRouter();
const player = useClientPlayer();

/** 遊戲與搖桿頁面對應資料 */
const gamepadMap: Record<GameName, {
  routeName: RouteName,
}> = {
  'the-first-penguin': {
    routeName: RouteName.PLAYER_GAMEPAD_THE_FIRST_PENGUIN,
  },
  'chicken-fly': {
    routeName: RouteName.PLAYER_GAMEPAD_CHICKEN_FLY,
  },
  'fox-and-mouse': {
    routeName: RouteName.PLAYER_GAMEPAD_FOX_AND_MOUSE,
  },
}
function init() {
  if (!gameConsoleStore.roomId) {
    router.push({
      name: RouteName.HOME
    });
    return;
  }

  player.onGameConsoleStateUpdate((state) => {
    gameConsoleStore.updateState(state);

    // 從合併後的 store 取值，避免 partial 更新（如僅含 status）導致欄位缺漏
    const { status, gameName } = gameConsoleStore;

    if (status === 'home') {
      router.push({
        name: RouteName.HOME
      });
    }
    if (status === 'lobby') {
      router.push({
        name: RouteName.PLAYER_GAMEPAD_LOBBY
      });
    }

    if (status !== 'playing') return;

    const target = gamepadMap[gameName];
    if (!target) return;

    router.push({ name: target.routeName });
  });

  player.onPlayerUpdate((players) => {
    console.log(`[ onPlayerUpdate ] players : `, players);

    gameConsoleStore.updateState({ players });
  });

  player.requestGameConsoleState();
}
init();
</script>

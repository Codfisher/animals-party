<template>
  <div class="w-full h-full bg-black">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import type { RouteNamedMap } from 'vue-router/auto-routes';

import { useRouter } from 'vue-router';
import { useGameConsoleStore } from '../stores/game-console.store';
import { useMainStore } from '../stores/main.store';
import { useClientPlayer } from '../composables/use-client-player';
import { GameName } from '../types';

const gameConsoleStore = useGameConsoleStore();
const mainStore = useMainStore();
const router = useRouter();
const player = useClientPlayer();

/** 與主機連線中斷時（曾連上後斷線），跳回首頁 */
watch(
  () => mainStore.clientConnected,
  (connected, previous) => {
    if (previous && !connected) {
      router.push({ name: '/home' });
    }
  },
);

/** 遊戲與搖桿頁面對應資料 */
const gamepadMap: Record<
  GameName,
  {
    routeName: keyof RouteNamedMap;
  }
> = {
  'the-first-penguin': {
    routeName: '/player-gamepad/the-first-penguin',
  },
  'chicken-fly': {
    routeName: '/player-gamepad/chicken-fly',
  },
  'fox-and-mouse': {
    routeName: '/player-gamepad/fox-and-mouse',
  },
};
function init() {
  if (!gameConsoleStore.roomId) {
    router.push({
      name: '/home',
    });
    return;
  }

  player.onGameConsoleStateUpdate((state) => {
    gameConsoleStore.updateState(state);

    // 從合併後的 store 取值，避免 partial 更新（如僅含 status）導致欄位缺漏
    const { status, gameName } = gameConsoleStore;

    if (status === 'home') {
      router.push({
        name: '/home',
      });
    }
    if (status === 'lobby') {
      router.push({
        name: '/player-gamepad/lobby',
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

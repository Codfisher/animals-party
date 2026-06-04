<template>
  <div class="w-full h-full bg-black">
    <router-view />

    <!-- 重連蓋板：搖桿頁自管，獨立於全域 loading；維持到玩家被辨識（codeName 非 unknown）為止 -->
    <transition name="reconnect-fade">
      <div
        v-if="reconnecting"
        class="reconnect-overlay fixed inset-0 z-50 flex flex-col flex-center gap-6 text-white"
      >
        <UIcon
          name="material-symbols:progress-activity"
          class="animate-spin text-primary text-[6rem]"
        />
        <div class="text-2xl">重新連線中 ◝( •ω• )◟ </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import to from 'await-to-js';
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
const toast = useToast();

/** 重連蓋板是否顯示 */
const reconnecting = ref(false);
/** 重連後等待玩家被辨識的安全逾時（毫秒），逾時仍未辨識則直接揭開畫面 */
const RECONNECT_REVEAL_TIMEOUT = 6000;
let revealTimer: ReturnType<typeof setTimeout> | undefined;

/** 收起重連蓋板並清除安全逾時 */
function finishReconnect() {
  reconnecting.value = false;
  if (revealTimer) {
    clearTimeout(revealTimer);
    revealTimer = undefined;
  }
}

/** 重連完成後，玩家清單抵達前 codeName 會是 unknown，待其被辨識才收起蓋板 */
watch(
  () => player.codeName.value,
  (codeName) => {
    if (reconnecting.value && codeName !== 'unknown') {
      finishReconnect();
    }
  },
);

onBeforeUnmount(finishReconnect);

/** 與主機連線中斷時（曾連上後斷線），清除房號、提示並跳回首頁 */
watch(
  () => mainStore.clientConnected,
  (connected, previous) => {
    if (previous && !connected) {
      gameConsoleStore.clearRoomId();
      router.push({ name: '/home' });
      toast.add({
        color: 'error',
        title: '歪歪，主機失去連線惹 (´；ω；`) ',
      });
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
async function init() {
  const { roomId } = gameConsoleStore;
  if (!roomId) {
    router.push({
      name: '/home',
    });
    return;
  }

  /** 重新整理後記憶體連線已消失，但 sessionStorage 仍保有房號，
   *  此時主動重連。host 以 clientId 辨識玩家，會自動補回原本的位置。 */
  if (!mainStore.clientConnected) {
    reconnecting.value = true;

    const [err] = await to(player.joinRoom(roomId));
    if (err) {
      console.error(`[ player-gamepad init ] 自動重連失敗 : `, err);
      gameConsoleStore.clearRoomId();
      finishReconnect();
      router.push({ name: '/home' });
      return;
    }

    // 連線已建立，但玩家清單尚未抵達，蓋板續留至 codeName 被辨識（或安全逾時）
    revealTimer = setTimeout(finishReconnect, RECONNECT_REVEAL_TIMEOUT);
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

<style scoped lang="sass">
.reconnect-overlay
  background: rgba(#000, 0.85)
  backdrop-filter: blur(4px)

.reconnect-fade-enter-active,
.reconnect-fade-leave-active
  transition: opacity 0.3s ease

.reconnect-fade-enter-from,
.reconnect-fade-leave-to
  opacity: 0
</style>

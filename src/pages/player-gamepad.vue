<template>
  <div class="fixed inset-0 flex flex-col bg-black overflow-hidden">
    <!-- 頂部廣告帶：與操作區實體分離，遠離拇指熱區，全程常駐且不妨礙操作。
         用 min-h 而非 h：AdSense 腳本會對廣告容器與祖先注入 height:auto !important，
         min-height 不受其覆蓋，廣告被擋或未填充時仍維持帶高 -->
    <div
      class="ad-band relative shrink-0 min-h-14 flex flex-center overflow-hidden bg-black/30 border-b border-white/10"
    >
      <!-- adblock fallback：廣告被攔截移除時，露出裝飾與文字（呼應首頁支持區）。
           細帶空間有限，多邊形自上下緣與四角探入、低透明度點綴，避免置中被裁成橫條 -->
      <base-polygon
        class="absolute ad-poly-1 z-0"
        size="5rem"
        shape="round"
        fill="spot"
        color="white"
        :opacity="0.16"
      />
      <base-polygon
        class="absolute ad-poly-2 z-0"
        size="5.5rem"
        rotate="28deg"
        shape="pentagon"
        fill="fence"
        color="white"
        :opacity="0.14"
      />
      <base-polygon
        class="absolute ad-poly-3 z-0"
        size="3.5rem"
        rotate="16deg"
        shape="triangle"
        fill="fence"
        color="white"
        :opacity="0.16"
      />
      <base-polygon
        class="absolute ad-poly-4 z-0"
        size="4rem"
        rotate="-12deg"
        shape="square"
        fill="spot"
        color="white"
        :opacity="0.15"
      />
      <p
        class="absolute inset-0 z-10 flex flex-center text-center px-4 text-white/90 text-sm font-medium drop-shadow pointer-events-none"
      >
        順手開廣告，支持好內容 (*´∀`)~♥
      </p>

      <google-adsense
        client="ca-pub-6608581811170481"
        slot="9242930193"
        format="horizontal"
        :full-width-responsive="false"
        :min-height="50"
        class="relative z-20 w-full max-w-2xl"
      />
    </div>

    <!-- 操作區：子頁容器填滿此區，搖桿／按鈕定位皆相對於此，必落於廣告帶之下。
         flex-1 靠 grow 填滿、min-h-0 允許收縮，皆與 height 屬性無關，免疫 AdSense 注入的 height:auto -->
    <div class="relative flex-1 min-h-0 overflow-hidden">
      <router-view />
    </div>

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
import { useRemoteLog } from '../composables/use-remote-log';
import { GameName } from '../types';

import GoogleAdsense from '../components/google-adsense.vue';
import BasePolygon from '../components/base-polygon.vue';

const gameConsoleStore = useGameConsoleStore();
const mainStore = useMainStore();
const router = useRouter();
const player = useClientPlayer();
const remoteLog = useRemoteLog('[ player-gamepad ]');
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
    const me = players.find((item) => item.clientId === mainStore.clientId);
    remoteLog.log('onPlayerUpdate：我方權限', me?.permission);

    gameConsoleStore.updateState({ players });
  });

  player.requestGameConsoleState();
}
init();
</script>

<style scoped lang="sass">
// 廣告帶裝飾：自邊緣與四角探入，多數露出於帶外（被 overflow 裁切），僅一角點綴
.ad-poly-1
  left: 6%
  top: 0
  transform: translate(-20%, -58%)
.ad-poly-2
  right: 8%
  bottom: 0
  transform: translate(20%, 58%)
.ad-poly-3
  left: 0
  bottom: 0
  transform: translate(-28%, 45%)
.ad-poly-4
  right: 0
  top: 0
  transform: translate(32%, -52%)

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

<template>
  <div class="flex">
    <game-menu-background
      :selected-game="selectedGame.name"
      class="outline-none absolute w-full h-full z-0"
      @camera-movement-end="showMenu()"
      @completed="handleCompleted()"
    />

    <div class="menu-item absolute top-8 right-8 z-10">
      <game-menu-control-hint />
    </div>

    <div class="menu-item absolute bottom-8 right-8 z-10">
      <game-menu-game-intro :name="selectedGame.name" />
    </div>

    <div class="w-1/2 h-full flex flex-col items-center justify-center gap-12 pr-24 pb-10 z-0">
      <div class="relative menu-item">
        <room-qr-code />

        <transition name="join-hint">
          <div
            v-if="noPlayerJoined"
            class="join-hint absolute bottom-full left-1/2 z-10 mb-4"
          >
            <div
              class="join-hint-body relative overflow-hidden rounded-full bg-[#FF744F] px-6 py-3 text-lg font-bold whitespace-nowrap text-white shadow-lg"
            >
              <base-polygon
                class="absolute -top-7 -left-5"
                size="5rem"
                shape="round"
                fill="spot"
                color="white"
                opacity="0.25"
                rotate="20deg"
              />
              <base-polygon
                class="absolute -right-4 -bottom-8"
                size="5rem"
                shape="pentagon"
                fill="fence"
                color="white"
                opacity="0.2"
                rotate="-15deg"
              />
              <span class="relative z-0">還沒有人加入，手機掃描加入派對！੭ ˙ᗜ˙ )੭ </span>
            </div>
          </div>
        </transition>
      </div>

      <base-btn
        :ref="mountButton"
        v-slot="{ hover }"
        label="開始遊戲"
        class="w-[28rem] menu-item"
        label-hover-color="#3676a3"
        stroke-color="#456b87"
        stroke-hover-color="white"
        @click="startGame()"
      >
        <transition name="opacity">
          <div
            v-if="hover"
            class="btn-content absolute inset-0"
          >
            <div class="polygon-lt">
              <base-polygon
                size="13rem"
                shape="round"
                fill="spot"
                opacity="0.3"
                class="polygon-beat"
              />
            </div>

            <div class="polygon-rb">
              <base-polygon
                size="13rem"
                shape="round"
                fill="fence"
                opacity="0.2"
                class="polygon-beat"
              />
            </div>
          </div>
        </transition>
      </base-btn>

      <base-btn
        :ref="mountButton"
        v-slot="{ hover }"
        label="結束派對"
        class="w-[28rem] menu-item"
        label-hover-color="#3676a3"
        stroke-color="#456b87"
        stroke-hover-color="white"
        @click="endParty()"
      >
        <transition name="opacity">
          <div
            v-if="hover"
            class="btn-content absolute inset-0"
          >
            <div class="polygon-lt">
              <base-polygon
                size="13.4rem"
                shape="square"
                fill="spot"
                opacity="0.3"
                class="polygon-swing"
              />
            </div>
            <div class="polygon-rb">
              <base-polygon
                size="13.3rem"
                shape="square"
                fill="fence"
                opacity="0.2"
                class="polygon-swing"
              />
            </div>
          </div>
        </transition>
      </base-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import gsap from 'gsap';
import {
  GameName,
  permissionInfoMap,
  Player,
  PlayerPermission,
  PlayerPermissionState,
} from '../types';
import type { RouteNamedMap } from 'vue-router/auto-routes';
import { debounce, throttle } from 'lodash-es';

import BaseBtn from './base-btn.vue';
import BasePolygon from './base-polygon.vue';
import RoomQrCode from './room-qr-code.vue';
import GameMenuBackground from './game-menu-background.vue';
import GameMenuControlHint from './game-menu-control-hint.vue';
import GameMenuGameIntro from './game-menu-game-intro.vue';

import { useGamepadNavigator } from '../composables/use-gamepad-navigator';
import { useClientGameConsole } from '../composables/use-client-game-console';
import { useCpuPlayer } from '../composables/use-cpu-player';
import { useGameConsoleStore } from '../stores/game-console.store';
import { useRouter } from 'vue-router';
import { useLoading } from '../composables/use-loading';
import { useAudio } from '../composables/use-audio';

interface GameInfo {
  name: `${GameName}`;
  routeName: keyof RouteNamedMap;
  /** 遊戲開始條件，如果任一項不符合會發出錯誤 */
  condition: {
    minPlayers: number;
    maxPlayers?: number;
    requiredPermissions: (keyof PlayerPermission)[];
  };
}

const emit = defineEmits<{
  (e: 'completed'): void;
  (e: 'error', message: string): void;
}>();

const games: GameInfo[] = [
  {
    name: 'the-first-penguin',
    routeName: '/game-console/the-first-penguin',
    condition: {
      minPlayers: 2,
      /** 企鵝太多浮冰會塞不下 XD */
      maxPlayers: 6,
      requiredPermissions: [],
    },
  },
  {
    name: 'chicken-fly',
    routeName: '/game-console/chicken-fly',
    condition: {
      minPlayers: 2,
      maxPlayers: 30,
      requiredPermissions: ['gyroscope'],
    },
  },
  {
    name: 'fox-and-mouse',
    routeName: '/game-console/fox-and-mouse',
    condition: {
      minPlayers: 2,
      maxPlayers: 8,
      // 震動非必要：iOS 不支援震動，改以視覺脈衝回饋判斷老鼠大小
      requiredPermissions: [],
    },
  },
];

const gameConsole = useClientGameConsole();
const gameConsoleStore = useGameConsoleStore();
const cpuPlayer = useCpuPlayer();
const router = useRouter();
const loading = useLoading();
const audio = useAudio();

const currentIndex = ref(
  games.findIndex(({ name }) => name === gameConsole.currentGame.value) ?? 0,
);
const selectedGame = computed(() => games[currentIndex.value]);

/** 大廳尚無真實玩家加入時，於 QR 下方淡入引導氣泡（CPU 不算數） */
const noPlayerJoined = computed(
  () => gameConsole.players.value.filter(({ isCpu }) => !isCpu).length === 0,
);
const prevGame = throttle(
  () => {
    audio.play('click');
    currentIndex.value--;
    if (currentIndex.value < 0) {
      currentIndex.value += games.length;
    }
  },
  2000,
  {
    leading: true,
    trailing: false,
  },
);
const nextGame = throttle(
  () => {
    audio.play('click');
    currentIndex.value++;
    currentIndex.value %= games.length;
  },
  2000,
  {
    leading: true,
    trailing: false,
  },
);

let menuTween: ReturnType<typeof gsap.fromTo> | undefined;
onMounted(() => {
  // 已播放過入場動畫（回大廳）就讓選單直接顯示，不建立入場 tween
  if (gameConsoleStore.isLobbyIntroPlayed) {
    return;
  }

  menuTween = gsap.fromTo(
    '.menu-item',
    {
      opacity: 0,
      translateY: '50%',
    },
    {
      opacity: 1,
      translateY: '0%',
      duration: 0.6,
      ease: 'back.out(1.7)',
      /** 多個元素間隔時間 */
      stagger: 0.2,
      /** 動畫完成後刪除 inline-style，以免影響其他 CSS */
      clearProps: 'transform',
    },
  );
  menuTween.pause();
});

function showMenu() {
  menuTween?.play();
}
function handleCompleted() {
  emit('completed');
}

const { mountElement, click, next, prev } = useGamepadNavigator();

/** 將按鈕綁定 */
function mountButton(el: unknown) {
  const controlElement = el as InstanceType<typeof BaseBtn>;
  mountElement(controlElement);
}

function checkGameCondition(condition: GameInfo['condition'], players: Player[]) {
  const { minPlayers, maxPlayers, requiredPermissions } = condition;
  if (players.length < minPlayers) {
    return `人數太少惹，不能小於 ${minPlayers} 個小夥伴。`;
  }

  if (maxPlayers && players.length > maxPlayers) {
    return `太多人啦，不能超過 ${maxPlayers} 個人，請狠下心減少人數。`;
  }

  /** 檢查是否有玩家不符合資格（CPU 無裝置權限，略過不檢查） */
  for (const player of players) {
    if (player.isCpu) continue;

    for (const name of requiredPermissions) {
      const state = player.permission?.[name];
      if (state === 'granted') continue;

      const codeName = gameConsole.getPlayerCodeName(player.clientId);
      const permissionLabel = permissionInfoMap[name].label;
      return getPermissionErrorMessage(codeName, permissionLabel, state);
    }
  }

  return undefined;
}

/** 依玩家權限狀態給出對應提示。
 *  not-support 點按鈕也無濟於事，需與 prompt／denied 區分，避免誤導玩家。 */
function getPermissionErrorMessage(
  codeName: string,
  permissionLabel: string,
  state: PlayerPermissionState | undefined,
) {
  if (state === 'denied') {
    return `${codeName} 玩家的「${permissionLabel}」權限被拒絕，請至手機瀏覽器設定開啟後重試。`;
  }

  if (state === 'not-support') {
    return `${codeName} 玩家的裝置或瀏覽器不支援「${permissionLabel}」，請改用 Chrome／Safari 直接開啟（勿從 LINE、FB 等 App 內開啟），或換一台支援體感的手機。`;
  }

  // prompt 或尚未取得權限資料：玩家可自行授權
  return `${codeName} 玩家尚未開啟「${permissionLabel}」權限，請點擊搖桿畫面右上角按鈕完成授權。`;
}

const startGame = debounce(
  async () => {
    const game = selectedGame.value;

    // 至少要有一名真實玩家才能開始，避免全是 CPU 的空房開局
    const realPlayerList = gameConsole.players.value.filter(({ isCpu }) => !isCpu);
    if (realPlayerList.length === 0) {
      emit('error', '還沒有玩家加入，快掃描 QR Code 一起玩吧！');
      return;
    }

    // 真實玩家不足 minPlayers 時自動補 CPU（三款遊戲皆適用）
    const cpuPlayerList = cpuPlayer.createCpuPlayerList(
      realPlayerList.length,
      game.condition.minPlayers,
    );
    if (cpuPlayerList.length > 0) {
      gameConsoleStore.addCpuPlayerList(cpuPlayerList);
    }

    const players = gameConsole.players.value;
    const error = checkGameCondition(game.condition, players);
    if (error) {
      gameConsoleStore.removeCpuPlayers();
      emit('error', error);
      return;
    }

    gameConsole.setGameState({ gameName: game.name, status: 'playing' });

    await loading.show();

    router.push({
      name: game.routeName,
    });
  },
  3000,
  {
    leading: true,
    trailing: false,
  },
);

const endParty = debounce(
  async () => {
    gameConsole.setStatus('home');
    // 派對結束，重置入場動畫旗標，下一場新派對第一次進大廳會重新播放
    gameConsoleStore.resetLobbyIntro();
    await loading.show();
    gameConsole.endParty();

    router.push({
      name: '/home',
    });
  },
  3000,
  {
    leading: true,
    trailing: false,
  },
);

/** 讓其他元件可以控制選單 */
defineExpose({
  click,
  next,
  prev,
  prevGame,
  nextGame,
});
</script>

<style scoped lang="sass">

.btn-content
  background: #307da1

.polygon-lt
  position: absolute
  left: -6rem
  top: -6rem
  animation: polygon-rotate 50s infinite linear
.polygon-rb
  position: absolute
  right: -6rem
  bottom: -6rem
  animation: polygon-rotate 40s infinite linear

@keyframes polygon-rotate
  0%
    transform: rotate(0deg)
  100%
    transform: rotate(360deg)

.polygon-beat
  animation: polygon-beat 1.4s infinite

.polygon-swing
  animation: polygon-swing 1.8s infinite

@keyframes polygon-beat
  0%
    transform: scale(1)
    animation-timing-function: cubic-bezier(0.000, 0.000, 1.000, 0.000)
  50%
    transform: scale(0.9)
    animation-timing-function: cubic-bezier(0.000, 1.000, 1.000, 1.000)
  100%
    transform: scale(1)

@keyframes polygon-swing
  0%
    transform: scale(1)
    animation-timing-function: cubic-bezier(0.870, 0.000, 0.180, 0.995)
  50%
    transform: scale(0.9)
    animation-timing-function: cubic-bezier(0.870, 0.000, 0.260, 1.375)
  100%
    transform: scale(1)

// 空房引導氣泡：向下指向 QR 的小箭頭＋緩慢上下浮動
.join-hint
  animation: join-hint-bob 1.6s ease-in-out infinite

// 箭頭掛在外層（內層 pill 為 overflow-hidden，會裁掉 ::before）
.join-hint::before
  content: ''
  position: absolute
  left: 50%
  bottom: -0.5rem
  margin-left: -0.6rem
  border-left: 0.6rem solid transparent
  border-right: 0.6rem solid transparent
  border-top: 0.6rem solid #FF744F

@keyframes join-hint-bob
  0%, 100%
    transform: translate(-50%, 0)
  50%
    transform: translate(-50%, -0.4rem)

// 僅淡入淡出，transform 交給 bob 動畫避免衝突
.join-hint-enter-active, .join-hint-leave-active
  transition: opacity 0.4s ease
.join-hint-enter-from, .join-hint-leave-to
  opacity: 0
</style>

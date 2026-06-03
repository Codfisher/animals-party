<template>
  <div class="w-full h-full bg-white">
    <transition
      name="opacity"
      mode="out-in"
    >
      <!-- 練習 -->
      <div
        v-if="sceneMode === 'training'"
        class="w-full h-full flex bg-sky-100"
      >
        <div class=" relative flex flex-col flex-nowrap w-[70%]">
          <div class=" bg-black w-full h-[90%] rounded-br-3xl">
            <transition
              name="opacity"
              mode="out-in"
            >
              <game-scene
                :key="gameId"
                mode="training"
                class=" w-full h-full"
                @init="handleInit"
                @game-over="handleGameOver"
              />
            </transition>
          </div>

          <!-- 玩家頭像 -->
          <transition-group
            tag="div"
            class=" absolute bottom-0 w-full overflow-hidden px-10 pointer-events-none"
            name="avatar"
          >
            <player-list-avatar
              v-for="player in players"
              :key="player.clientId"
              :player="player"
              :code-name="player.codeName"
              class="player"
              :class="{ 'ready': player.ok }"
            />
          </transition-group>
        </div>

        <!-- 遊戲說明 -->
        <div class="p-4 flex-1 ">
          <tutorial-card class="w-full h-full" />
        </div>
      </div>

      <!-- 正式 -->
      <div
        v-else
        class=" w-full h-full"
      >
        <game-scene
          :mode="sceneMode"
          class=" absolute w-full h-full"
          @back-to-lobby="handleBackToLobby"
        />

        <countdown-overlay @done="handleTimeout" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { GameSceneMode } from '../../types';
import { nanoid } from 'nanoid';

import GameScene from '../../games/fox-and-mouse/game-scene.vue';
import TutorialCard from '../../games/fox-and-mouse/tutorial-card.vue';
import PlayerListAvatar from '../../components/player-list-avatar.vue';
import CountdownOverlay from '../../components/countdown-overlay.vue';

import { useLoading } from '../../composables/use-loading';
import { useRouter } from 'vue-router';
import { useClientGameConsole } from '../../composables/use-client-game-console';
import { promiseTimeout, whenever } from '@vueuse/core';

const gameConsole = useClientGameConsole();
const loading = useLoading();
const router = useRouter();

const sceneMode = ref<`${GameSceneMode}`>('training');

function handleInit() {
  loading.hide();
}

async function handleBackToLobby() {
  await loading.show();
  router.push({
    name: '/game-console/lobby'
  });
}

function handleTimeout() {
  sceneMode.value = 'normal';
}

/** 用來更新教學遊戲場景 */
const gameId = ref('');
async function handleGameOver() {
  gameId.value = nanoid();
}

/** 紀錄準備完成玩家 */
const readiedPlayerIdList = ref<string[]>([]);

const players = computed(() => {
  return gameConsole.players.value.map((player) => {
    const codeName = gameConsole.getPlayerCodeName(player.clientId);
    const ok = readiedPlayerIdList.value.includes(player.clientId);

    return {
      ...player,
      codeName,
      ok,
    }
  });
});

whenever(
  () => players.value.every(({ ok }) => ok),
  () => {
    sceneMode.value = 'showcase';
  }
);

gameConsole.onGamepadData((data) => {
  const lastDatum = data.keys.at(-1);
  if (lastDatum?.value || lastDatum?.name !== 'confirm') return;

  readiedPlayerIdList.value.push(data.playerId);
});
</script>

<style scoped lang="sass">
.player
  transform: translateY(0%)
  transition-duration: 0.4s
  &.ready
    opacity: 0.5
    transform: translateY(10%)
    &::after
      position: absolute
      content: 'OK'
      color: white
      text-shadow: 0 0 6px rgba(#000, 0.4)
      left: 50%
      bottom: 15%
      font-size: 2rem
      transform: translateX(-50%)
</style>


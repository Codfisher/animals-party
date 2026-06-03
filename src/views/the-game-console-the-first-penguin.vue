<template>
  <game-console-scene-container
    :scene-mode="sceneMode"
    @all-ready="handleAllReady"
  >
    <template #training-scene>
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
    </template>

    <template #normal-scene>
      <game-scene
        :mode="sceneMode"
        class="absolute w-full h-full"
        @back-to-lobby="handleBackToLobby"
      />

      <countdown-overlay @done="handleTimeout" />
    </template>

    <template #tutorial-card>
      <tutorial-card class="w-full h-full" />
    </template>
  </game-console-scene-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GameSceneMode } from '../types';
import { nanoid } from 'nanoid';
import { RouteName } from '../router/router';

import GameConsoleSceneContainer from '../components/game-console-scene-container.vue';
import GameScene from '../games/the-first-penguin/game-scene.vue';
import TutorialCard from '../games/the-first-penguin/tutorial-card.vue';
import CountdownOverlay from '../components/countdown-overlay.vue';

import { useLoading } from '../composables/use-loading';
import { useRouter } from 'vue-router';

const loading = useLoading();
const router = useRouter();

const sceneMode = ref<`${GameSceneMode}`>('training');

function handleInit() {
  loading.hide();
}

async function handleBackToLobby() {
  await loading.show();
  router.push({
    name: RouteName.GAME_CONSOLE_LOBBY
  });
}

function handleTimeout() {
  sceneMode.value = 'normal';
}
function handleAllReady() {
  sceneMode.value = 'showcase';
}

/** 用來更新教學遊戲場景 */
const gameId = ref('');
async function handleGameOver() {
  gameId.value = nanoid();
}
</script>

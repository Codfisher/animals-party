<template>
  <div class="w-screen h-screen bg-white">
    <transition
      name="opacity"
      mode="out-in"
    >
      <!-- 練習 -->
      <div
        v-if="props.sceneMode === 'training'"
        class="w-full h-full flex bg-sky-100"
      >
        <div class="relative flex flex-col flex-nowrap w-[70%]">
          <div class="bg-black w-full h-[90%] rounded-br-3xl overflow-hidden">
            <slot name="training-scene" />
          </div>
          <!-- 玩家頭像 -->
          <transition-group
            tag="div"
            class="absolute bottom-0 w-full overflow-hidden px-10 pointer-events-none"
            name="avatar"
          >
            <player-list-avatar
              v-for="player in players"
              :key="player.clientId"
              :player="player"
              :code-name="player.codeName"
              class="player"
              :class="{ ready: player.ok }"
            />
          </transition-group>
        </div>

        <!-- 遊戲說明 -->
        <div class="p-4 flex-1">
          <slot name="tutorial-card" />
        </div>
      </div>

      <!-- 正式 -->
      <div
        v-else
        class="w-full h-full"
      >
        <slot name="normal-scene" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { GameSceneMode } from '../types';

import PlayerListAvatar from '../components/player-list-avatar.vue';

import { useClientGameConsole } from '../composables/use-client-game-console';
import { whenever } from '@vueuse/core';

interface Props {
  sceneMode?: `${GameSceneMode}`;
}
const props = withDefaults(defineProps<Props>(), {
  sceneMode: 'training',
});

const emit = defineEmits<{
  (e: 'all-ready'): void;
}>();

const gameConsole = useClientGameConsole();

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
    };
  });
});

whenever(
  () => {
    // 排除 NPC：NPC 不會按確認，只要真人玩家全部 OK 就開始
    const realPlayerList = players.value.filter((player) => !player.isNpc);
    return realPlayerList.length > 0 && realPlayerList.every(({ ok }) => ok);
  },
  () => emit('all-ready'),
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

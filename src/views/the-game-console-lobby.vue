<template>
  <game-menu
    ref="menu"
    class=" w-full h-full absolute"
    @completed="handleCompleted()"
    @error="handleError"
  />

  <player-list class=" absolute w-full left-0 bottom-0 z-0" />
</template>

<script setup lang="ts">
import { ref } from 'vue';

import GameMenu from '../components/game-menu.vue';
import PlayerList from '../components/player-list.vue';

import { useLoading } from '../composables/use-loading';
import { useClientGameConsole } from '../composables/use-client-game-console';
import { useQuasar } from 'quasar';
import { KeyName } from '../types';

const loading = useLoading();
const $q = useQuasar();
const gameConsole = useClientGameConsole();

function handleCompleted() {
  init();
}
function handleError(message: string) {
  $q.notify({
    type: 'negative',
    message
  });
}

const menu = ref<InstanceType<typeof GameMenu>>();

/** 按鍵事件表，僅用到部分 KeyName */
type GamepadEventMap = {
  [K in KeyName]?: () => void;
};
const gamepadEventMap: GamepadEventMap = {
  'up': () => menu.value?.prev(),
  'down': () => menu.value?.next(),
  'left': () => menu.value?.prevGame(),
  'right': () => menu.value?.nextGame(),
  'confirm': () => menu.value?.click(),
}

function init() {
  gameConsole.setStatus('lobby');
  loading.hide();

  gameConsole.onGamepadData((data) => {
    const datum = data.keys.at(-1);
    if (!datum) return;

    const { name, value } = datum;
    if (value) return;

    gamepadEventMap[name]?.();
  });
}

</script>

<style scoped lang="sass">
</style>
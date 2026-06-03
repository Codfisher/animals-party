<template>
  <player-gamepad-container>
    <gamepad-analog-stick
      class="absolute bottom-5 left-8"
      @trigger="handleAnalogStickTrigger"
    />

    <gamepad-btn
      class="absolute bottom-10 right-10"
      size="6rem"
      @trigger="(status) => handleBtnTrigger('a', status)"
    >
      <div class="text-9xl mb-8">
        A
      </div>
    </gamepad-btn>

    <gamepad-btn
      class="absolute top-10 right-10 opacity-90"
      size="3rem"
      icon="done"
      @trigger="(status) => handleBtnTrigger('confirm', status)"
    />
  </player-gamepad-container>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { KeyName } from '../types';

import GamepadBtn from '../components/gamepad-btn.vue';
import GamepadAnalogStick from '../components/gamepad-analog-stick.vue';
import PlayerGamepadContainer from '../components/player-gamepad-container.vue';

import { useLoading } from '../composables/use-loading';
import { useClientPlayer } from '../composables/use-client-player';
import { useMainStore } from '../stores/main.store';
import { useVibrate } from '@vueuse/core';

const loading = useLoading();
const { emitGamepadData, onConsoleData, } = useClientPlayer();
const mainStore = useMainStore();
const { vibrate, stop } = useVibrate();

function init() {
  loading.hide();
}
init();

function handleBtnTrigger(keyName: `${KeyName}`, status: boolean) {
  emitGamepadData([{
    name: keyName,
    value: status,
  }]);
}

function handleAnalogStickTrigger(data: { x: number, y: number }) {
  emitGamepadData([
    {
      name: 'x-axis',
      value: data.x,
    },
    {
      name: 'y-axis',
      value: data.y,
    }
  ]);
}

const mouseSize = ref(0);
function startVibrate() {
  const size = mouseSize.value;
  if (mouseSize.value === 0) {
    stop();
    return;
  }

  vibrate([size, 500]);

  const nextTime = size + 500;
  setTimeout(() => {
    startVibrate();
  }, nextTime);
}
watch(mouseSize, () => {
  stop();
  startVibrate();
});

onConsoleData(({ targets, data }) => {
  if (
    !targets?.includes(mainStore.clientId) ||
    data.name !== 'vibrate'
  ) return;

  mouseSize.value = data.value;
});
</script>
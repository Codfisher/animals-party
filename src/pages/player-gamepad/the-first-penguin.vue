<template>
  <player-gamepad-container>
    <gamepad-analog-stick class="absolute bottom-5 left-8" @trigger="handleAnalogStickTrigger" />

    <gamepad-btn
      class="absolute bottom-10 right-10"
      size="2.6rem"
      @trigger="(status) => handleBtnTrigger('a', status)"
    >
      <div class="flex items-center justify-center size-[1.5em] leading-none">
        <span class="text-4xl">A</span>
      </div>
    </gamepad-btn>

    <gamepad-btn
      class="absolute top-10 right-10 opacity-90"
      size="1.6rem"
      icon="material-symbols:done"
      @trigger="(status) => handleBtnTrigger('confirm', status)"
    />
  </player-gamepad-container>
</template>

<script setup lang="ts">
import { KeyName } from '../../types';

import GamepadBtn from '../../components/gamepad-btn.vue';
import GamepadAnalogStick from '../../components/gamepad-analog-stick.vue';
import PlayerGamepadContainer from '../../components/player-gamepad-container.vue';

import { useLoading } from '../../composables/use-loading';
import { useClientPlayer } from '../../composables/use-client-player';

const loading = useLoading();
const { emitGamepadData } = useClientPlayer();

function init() {
  loading.hide();
}
init();

function handleBtnTrigger(keyName: `${KeyName}`, status: boolean) {
  console.log(`[ handleBtnTrigger ] : `, { keyName, status });

  emitGamepadData([
    {
      name: keyName,
      value: status,
    },
  ]);
}

function handleAnalogStickTrigger(data: { x: number; y: number }) {
  console.log(`[ handleAnalogStickTrigger ] : `, data);

  emitGamepadData([
    {
      name: 'x-axis',
      value: data.x,
    },
    {
      name: 'y-axis',
      value: data.y,
    },
  ]);
}
</script>

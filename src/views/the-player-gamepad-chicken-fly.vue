<template>
  <player-gamepad-container>
    <gamepad-btn
      class="absolute top-1/2 right-1/2 translate-x-1/2 opacity-90"
      size="3rem"
      icon="done"
      @trigger="(status) => handleBtnTrigger('confirm', status)"
    />

    <gamepad-device-motion
      class="absolute bottom-16 left-1/2 -translate-x-1/2 opacity-90"
      @angle="handleDeviceMotion"
    />
  </player-gamepad-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { KeyName } from '../types';

import GamepadBtn from '../components/gamepad-btn.vue';
import PlayerGamepadContainer from '../components/player-gamepad-container.vue';
import GamepadDeviceMotion, { Angle } from '../components/gamepad-device-motion.vue';

import { useLoading } from '../composables/use-loading';
import { useClientPlayer } from '../composables/use-client-player';

const loading = useLoading();
const { emitGamepadData } = useClientPlayer();

function handleBtnTrigger(keyName: `${KeyName}`, status: boolean) {
  emitGamepadData([{
    name: keyName,
    value: status,
  }]);
}

function handleDeviceMotion(angle: Angle) {
  emitGamepadData([
    {
      name: 'x-axis',
      value: angle.x,
    },
    {
      name: 'y-axis',
      value: angle.y,
    },
    {
      name: 'z-axis',
      value: angle.z,
    },
  ]);
}

onMounted(() => {
  loading.hide();
});
</script>

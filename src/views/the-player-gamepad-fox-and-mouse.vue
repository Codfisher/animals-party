<template>
  <player-gamepad-container>
    <gamepad-analog-stick
      class="absolute bottom-5 left-8"
      @trigger="handleAnalogStickTrigger"
    />

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

    <!-- 偵測老鼠時的回饋：與震動同步的脈衝，閃越久代表老鼠越大
         （iOS 不支援震動，靠此視覺回饋判斷） -->
    <div
      v-if="mouseSize > 0"
      class="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none text-white"
    >
      <div
        class="size-32 rounded-full bg-white shadow-2xl transition-opacity duration-75"
        :class="pulseOn ? 'opacity-95' : 'opacity-10'"
      />
    </div>
  </player-gamepad-container>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
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
/** 視覺脈衝開關，與震動同步：亮 size ms、暗 500 ms */
const pulseOn = ref(false);
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

function stopFeedback() {
  stop();
  pulseOn.value = false;
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = undefined;
  }
}

function startFeedback() {
  const size = mouseSize.value;
  if (size === 0) {
    stopFeedback();
    return;
  }

  // 震動（iOS 不支援時自動無作用），同時驅動視覺脈衝
  vibrate([size, 500]);

  pulseOn.value = true;
  feedbackTimer = setTimeout(() => {
    pulseOn.value = false;
    feedbackTimer = setTimeout(() => startFeedback(), 500);
  }, size);
}

watch(mouseSize, () => {
  stopFeedback();
  startFeedback();
});

onBeforeUnmount(stopFeedback);

onConsoleData(({ targets, data }) => {
  if (
    !targets?.includes(mainStore.clientId) ||
    data.name !== 'vibrate'
  ) return;

  mouseSize.value = data.value;
});
</script>
<template>
  <div class="container w-auto">
    <div
      ref="pad"
      v-ripple
      class="pad rounded-full flex justify-center items-center"
      :style="padStyle"
      @click="resetAngle"
    >
      <div class="pad-ring top-0 left-0 absolute border w-full h-full rounded-full" />

      <div
        class="thumb"
        :style="thumbStyle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { clamp, throttle } from 'lodash-es';
import { mapRange } from '../common/utils';

import { useDeviceMotion, useElementSize } from '@vueuse/core';

export interface Angle {
  x: number;
  y: number;
  z: number
}

interface Props {
  /** 尺寸，直徑 */
  size?: string;
  maxAngle?: number;
}
const props = withDefaults(defineProps<Props>(), {
  size: '30rem',
  maxAngle: 45,
});

const emit = defineEmits<{
  (e: 'angle', angle: Angle): void;
}>();

const padStyle = computed(() => {
  const { x, z } = angle.value;

  const transform = `rotateX(${-z}deg) rotateY(${x}deg)`;

  return {
    width: props.size,
    height: props.size,
    transform,
  }
});

const deviceMotion = useDeviceMotion();

function toFixed(number: number, fractionDigits = 3) {
  return Number(number.toFixed(fractionDigits));
}

const rotationRate = computed(() => {
  if (!deviceMotion.rotationRate.value) {
    return {
      alpha: 0,
      beta: 0,
      gamma: 0,
    }
  }

  const {
    alpha, beta, gamma
  } = deviceMotion.rotationRate.value;

  return {
    alpha: toFixed(alpha ?? 0),
    beta: toFixed(beta ?? 0),
    gamma: toFixed(gamma ?? 0),
  }
});

const angle = ref<Angle>({
  x: 0,
  y: 0,
  z: 0,
});

/** 紀錄上次時間，才有辦法計算時間變化量 */
let previousTimestamp = 0;
const integrateRotationRate: Parameters<typeof requestAnimationFrame>[0] = (timestamp) => {
  if (previousTimestamp) {
    const deltaTime = timestamp - previousTimestamp;

    const {
      alpha, beta, gamma,
    } = rotationRate.value;

    /** 積分就是目前值加上速度乘以時間變化量
     * 
     * 除以 1000 是因為角速度單位是 degree/s，而 requestAnimationFrame 提供的時間是毫秒（ms），
     * 所以要除以 1000
     */
    angle.value.z += alpha * deltaTime / 1000;
    angle.value.x += beta * deltaTime / 1000;
    angle.value.y += gamma * deltaTime / 1000;

    angle.value.x = toFixed(angle.value.x);
    angle.value.y = toFixed(angle.value.y);
    angle.value.z = toFixed(angle.value.z);
  }

  previousTimestamp = timestamp;
  requestAnimationFrame(integrateRotationRate);
}
requestAnimationFrame(integrateRotationRate);

function resetAngle() {
  angle.value = {
    x: 0,
    y: 0,
    z: 0
  }
}

const pad = ref<HTMLElement>();
const { width, height } = useElementSize(pad);

const thumbStyle = ref({
  transform: `translate3d(0px, 0px, 10px)`,
});

watch(angle, (newAngle) => {
  const maxAngle = props.maxAngle;
  const maxX = width.value / 2;
  const maxY = height.value / 2;

  /** 螢幕的 x 方向對應 x 軸旋轉量 */
  const x = mapRange(
    clamp(newAngle.x, -maxAngle, maxAngle),
    -maxAngle, maxAngle, -maxX, maxX,
  );
  /** 螢幕的 y 方向對應 z 軸旋轉量 */
  const y = mapRange(
    clamp(newAngle.z, -maxAngle, maxAngle),
    -maxAngle, maxAngle, -maxY, maxY
  );

  thumbStyle.value = {
    transform: `translate3d(${x}px, ${y}px, 10px)`,
  }

  emitAngle(newAngle);
}, {
  deep: true
});


const emitAngle = throttle((angle: Angle) => {
  emit('angle', angle);
}, 50);
</script>

<style scoped lang="sass">
.container
  perspective: 1000px

.pad
  transform-style: preserve-3d
  background: rgba(#111, 0.8)
.pad-ring
  transform: translateZ(-20px)

.thumb
  width: 40%
  height: 40%
  background: white
  border-radius: 9999px
  opacity: 0.8
</style>
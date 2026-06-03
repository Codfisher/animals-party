<template>
  <div
    ref="pad"
    v-touch-pan.prevent.mouse="handleTouch"
    class="pad rounded-full bg-grey-10"
    @contextmenu="(e) => e.preventDefault()"
  >
    <div
      class="thumb"
      :class="{ 'active': thumb.active }"
      :style="thumbStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { Vector2 } from '@babylonjs/core';
import { useElementSize, useIntervalFn } from '@vueuse/core';
import { clamp } from 'lodash-es';
import { computed, ref } from 'vue';

interface TouchPenDetails {
  touch: boolean;
  mouse: boolean;
  position: {
    top: number;
    left: number;
  };
  direction: 'up' | 'right' | 'down' | 'left';
  isFirst: boolean;
  isFinal: boolean;
  duration: number;
  distance: {
    x: number;
    y: number;
  };
  offset: {
    x: number;
    y: number;
  };
  delta: {
    x: number;
    y: number;
  };
}

interface Props {
  /** 尺寸，直徑 */
  size?: string
}
const props = withDefaults(defineProps<Props>(), {
  size: '34rem'
});

const emit = defineEmits<{
  (e: 'trigger', data: { x: number, y: number }): void;
}>();


const pad = ref<HTMLElement>();
const { width, height } = useElementSize(pad);

const padCenterPosition = computed(() => {
  const top = pad.value?.offsetTop ?? 0;
  const left = pad.value?.offsetLeft ?? 0;

  return {
    top: top + height.value / 2,
    left: left + width.value / 2,
  }
});

const thumb = ref({
  offset: {
    x: 0,
    y: 0
  },
  active: false,
});
const thumbStyle = computed(() => ({
  transform: `translate(${thumb.value.offset.x}px, ${thumb.value.offset.y}px)`,
  opacity: thumb.value.active ? 0.8 : undefined,
}));

function handleTouch(details: TouchPenDetails) {
  const { position, isFirst, isFinal } = details;

  const x = position.left - padCenterPosition.value.left;
  const y = position.top - padCenterPosition.value.top;

  /** 計算位移的長度 */
  const vectorLength = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));

  /** 計算目前偏移最大值 */
  const xMax = (Math.abs(x) / vectorLength) * (width.value / 2);
  const yMax = (Math.abs(y) / vectorLength) * (height.value / 2);

  /** 利用 clamp 限制偏移數值在 -max 與 max 之間 */
  thumb.value.offset = {
    x: clamp(x, -xMax, xMax),
    y: clamp(y, -yMax, yMax),
  };

  if (isFirst) {
    thumb.value.active = true;
  }

  if (isFinal) {
    thumb.value = {
      offset: { x: 0, y: 0 },
      active: false
    }

    emit('trigger', { x: 0, y: 0 });
  }
}

useIntervalFn(() => {
  const { x, y } = thumb.value.offset;
  if (x === 0 && y === 0) return;

  /** 轉為單位向量，讓 x、y 的範圍介於 -1 至 1 之間 */
  const vector = new Vector2(x, y).normalize();
  emit('trigger', { x: vector.x, y: vector.y });
}, 50);
</script>

<style scoped lang="sass">
.pad
  width: v-bind('props.size')
  height: v-bind('props.size')
  display: flex
  justify-content: center
  align-items: center
.thumb
  width: 40%
  height: 40%
  background: white
  border-radius: 9999px
  opacity: 0.4
  transition-duration: 0.3s
  transition-timing-function: cubic-bezier(0.000, 1.650, 0.190, 1.005)
  &.active
    transition-duration: 0s
</style>
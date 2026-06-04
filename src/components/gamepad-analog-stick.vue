<template>
  <div
    ref="pad"
    class="pad rounded-full bg-neutral-900 touch-none"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @contextmenu="(e) => e.preventDefault()"
  >
    <div class="thumb" :class="{ active: thumb.active }" :style="thumbStyle" />
  </div>
</template>

<script setup lang="ts">
import { Vector2 } from '@babylonjs/core';
import { useIntervalFn } from '@vueuse/core';
import { clamp } from 'lodash-es';
import { computed, ref } from 'vue';

interface Props {
  /** 尺寸，直徑 */
  size?: string;
}
const props = withDefaults(defineProps<Props>(), {
  /** 上限 42vw，與右側按鈕並排時不重疊 */
  size: 'min(13rem, 42vw)',
});

const emit = defineEmits<{
  (e: 'trigger', data: { x: number; y: number }): void;
}>();

const pad = ref<HTMLElement>();
const dragging = ref(false);

const thumb = ref({
  offset: {
    x: 0,
    y: 0,
  },
  active: false,
});
const thumbStyle = computed(() => ({
  transform: `translate(${thumb.value.offset.x}px, ${thumb.value.offset.y}px)`,
  opacity: thumb.value.active ? 0.8 : undefined,
}));

/** 依指標位置更新搖桿偏移，限制在圓形範圍內 */
function updateOffset(clientX: number, clientY: number) {
  const element = pad.value;
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const x = clientX - (rect.left + rect.width / 2);
  const y = clientY - (rect.top + rect.height / 2);

  /** 計算位移的長度 */
  const vectorLength = Math.sqrt(x ** 2 + y ** 2) || 1;

  /** 計算目前偏移最大值 */
  const xMax = (Math.abs(x) / vectorLength) * (rect.width / 2);
  const yMax = (Math.abs(y) / vectorLength) * (rect.height / 2);

  /** 利用 clamp 限制偏移數值在 -max 與 max 之間 */
  thumb.value.offset = {
    x: clamp(x, -xMax, xMax),
    y: clamp(y, -yMax, yMax),
  };
}

function onPointerDown(event: PointerEvent) {
  event.preventDefault();
  pad.value?.setPointerCapture(event.pointerId);
  dragging.value = true;
  thumb.value.active = true;
  updateOffset(event.clientX, event.clientY);
}
function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return;
  updateOffset(event.clientX, event.clientY);
}
function onPointerUp() {
  if (!dragging.value) return;
  dragging.value = false;
  thumb.value = {
    offset: { x: 0, y: 0 },
    active: false,
  };
  emit('trigger', { x: 0, y: 0 });
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

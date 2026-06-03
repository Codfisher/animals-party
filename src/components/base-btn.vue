<template>
  <div
    class="btn flex flex-center text-2xl md:text-3xl p-8 md:p-12 rounded-full"
    :class="btnClass"
    @click="handleClick()"
    @mouseenter="handleMouseenter"
    @mouseleave="handleMouseleave"
    @mousedown="handleMousedown"
    @mouseup="handleMouseup"
  >
    <slot v-bind="state" />

    <!-- label -->
    <div
      class="label relative font-black tracking-widest"
      :style="labelStyle"
    >
      {{ props.label }}
    </div>
  </div>
</template>

<script lang="ts">
export interface State {
  active: boolean,
  hover: boolean,
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ControllableElement } from '../composables/use-gamepad-navigator';
import { promiseTimeout, useWindowSize } from '@vueuse/core';

interface Props {
  label?: string;
  labelColor?: string;
  labelHoverColor?: string;
  strokeColor?: string;
  strokeHoverColor?: string;
  strokeSize?: string;
}
const props = withDefaults(defineProps<Props>(), {
  label: '',
  labelColor: 'white',
  labelHoverColor: undefined,
  strokeColor: '#888',
  strokeHoverColor: undefined,
  strokeSize: '3'
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const state = ref<State>({
  active: false,
  hover: false,
});

const { width: windowWidth } = useWindowSize();
/** 手機版（sm 斷點以下）描邊加粗 2 倍 */
const strokeWidth = computed(() =>
  windowWidth.value <= 600 ? Number(props.strokeSize) * 2 : Number(props.strokeSize)
);

const btnClass = computed(() => ({
  active: state.value.active,
}));

const labelStyle = computed(() => {
  const color = (props.labelHoverColor && state.value.hover)
    ? props.labelHoverColor
    : props.labelColor;

  const strokeColor = (props.strokeHoverColor && state.value.hover)
    ? props.strokeHoverColor
    : props.strokeColor;

  return {
    color,
    // 描邊畫在填色之後，呈現外框效果
    paintOrder: 'stroke fill',
    WebkitTextStroke: `${strokeWidth.value}px ${strokeColor}`,
  }
});

function handleClick(showEffect = false) {
  emit('click');

  if (showEffect) {
    processClick();
  }
}
async function processClick() {
  state.value.hover = true;
  state.value.active = true;

  await promiseTimeout(200);

  state.value.active = false;
}
function handleMouseenter() {
  state.value.hover = true;
}
function handleMouseleave() {
  state.value.hover = false;
}
function handleMousedown() {
  state.value.active = true;
}
function handleMouseup() {
  state.value.active = false;
}

defineExpose<ControllableElement>({
  click(effect = true) {
    handleClick(effect)
  },
  isHover: () => state.value.hover,
  hover: handleMouseenter,
  leave: handleMouseleave,
});
</script>

<style scoped lang="sass">
.btn
  backdrop-filter: blur(6px)
  background: rgba(white, 0.4)
  box-shadow: 2.8px 2.8px 2.2px rgba(0, 0, 0, 0.006), 6.7px 6.7px 5.3px rgba(0, 0, 0, 0.008), 12.5px 12.5px 10px rgba(0, 0, 0, 0.01), 22.3px 22.3px 17.9px rgba(0, 0, 0, 0.012), 41.8px 41.8px 33.4px rgba(0, 0, 0, 0.014), 100px 100px 80px rgba(0, 0, 0, 0.02)
  user-select: none
  overflow: hidden
  cursor: pointer
  transition-timing-function: cubic-bezier(0.000, 1.650, 1.000, 1.650)
  transition-duration: 0.2s
  &.active
    transform: scale(0.98) rotate(-1deg)
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)

.label
  transition-duration: 0.4s
</style>
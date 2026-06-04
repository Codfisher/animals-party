<template>
  <transition name="opacity">
    <!-- 小於 0 後元件自動消失 -->
    <div v-if="counter >= 0" class="absolute w-full h-full flex justify-center items-center">
      <transition name="countdown" mode="out-in" appear>
        <div :key="text">
          <!-- 文字 -->
          <div class="text" :class="getClass()" :style="textStyle">
            {{ text }}
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { sample } from 'lodash-es';
import { computed, ref, watch } from 'vue';

import { useIntervalFn } from '@vueuse/core';

interface Props {
  /** 預設從 3 開始倒數 */
  startValue?: number;
  startText?: string;
  fontSize?: string;
  immediate?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  startValue: 3,
  startText: 'Start',
  fontSize: '16rem',
  immediate: true,
});

const emit = defineEmits<{
  (e: 'count', value: number): void;
  (e: 'done'): void;
}>();

const counter = ref(props.startValue);
watch(counter, (value) => {
  if (value <= -1) {
    pause();
    emit('done');
    return;
  }

  emit('count', value);
});

/** 0 之前顯示數字，0 的時候顯示 startText */
const text = computed(() => {
  if (counter.value === 0) {
    return props.startText;
  }

  return counter.value;
});

const { resume, pause } = useIntervalFn(
  () => {
    counter.value -= 1;
  },
  1500,
  {
    immediate: props.immediate,
  },
);

const textStyle = {
  // 描邊畫在填色之後，呈現外框效果
  paintOrder: 'stroke fill',
  WebkitTextStroke: '6px white',
};

const colors = [
  'text-red-400',
  'text-lime-400',
  'text-sky-400',
  'text-purple-400',
  'text-amber-400',
  'text-teal-400',
  'text-pink-400',
  'text-fuchsia-400',
];
function getClass() {
  return sample(colors);
}

defineExpose({
  start: resume,
});
</script>

<style scoped lang="sass">
.text
  font-family: 'Luckiest Guy'
  font-size: v-bind('props.fontSize')

.countdown
  &-enter-active, &-leave-active
    transition-duration: 0.6s
    transition-timing-function: cubic-bezier(0.295, 1.650, 0.410, 0.995)
  &-enter-from, &-leave-to
    transform: scale(0) rotate(0deg) !important
    opacity: 0 !important
</style>

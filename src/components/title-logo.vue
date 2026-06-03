<template>
  <div class=" relative leading-none">
    <div
      class=" flex flex-col flex-center text-white pb-6"
      :style="titleStyle"
    >
      <div
        class="flex flex-col flex-center jelly-bounce"
        :style="enTitleStyle"
      >
        <div class="text-7xl sm:text-8xl lg:text-9xl font-game">
          ANIMALS
        </div>
        <div class="text-8xl sm:text-9xl lg:text-[12rem] font-game">
          PARTY
        </div>
      </div>

      <div class=" text-3xl sm:text-4xl lg:text-6xl font-black mt-3 flex gap-2 joy-bounce">
        <span class="text-red-400">動</span>
        <span class="text-lime-400">物</span>
        <span class="text-sky-400">派</span>
        <span class="text-purple-400">對</span>
        <span class="text-amber-400">嗨</span>
        <span class="text-teal-400">起</span>
        <span class="text-pink-400">來</span>
        <span class="text-fuchsia-400">！</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import { computed } from 'vue';

const { width: windowWidth } = useWindowSize();

/** 小螢幕用較細的描邊 */
const strokeWidth = computed(() => windowWidth.value <= 600 ? 6 : 10);


const enTitleStyle = computed(() => ({
  // 描邊畫在填色之後，呈現外框效果
  paintOrder: 'stroke fill',
  WebkitTextStroke: `${strokeWidth.value * 1.5}px #2e1c00`,
}));

const titleStyle = computed(() => ({
  paintOrder: 'stroke fill',
  WebkitTextStroke: `${strokeWidth.value}px #2e1c00`,
}));
</script>

<style scoped lang="sass">
.font-game
  font-family: 'Luckiest Guy'

.jelly-bounce
  animation: jelly-bounce 3.2s infinite
  transform-origin: 50% 100%

@keyframes jelly-bounce
  0%, 70%, 100%
    transform: scale( 1 )
  75%
    transform: scale( 1.2, 0.8 )
  80%
    transform: scale( 0.85, 1.15 )
  85%
    transform: scale( 1.05, 0.95 )
  90%
    transform: scale( 0.98, 1.02 )
  95%
    transform: scale( 1.01, 0.99 )

.joy-bounce
  animation: joy-bounce 1s infinite
  transform-origin: 50% 100%

@keyframes joy-bounce
  0%, 100%
    transform: scale( 1 )
    animation-timing-function: cubic-bezier(0.895, 0.030, 0.685, 0.220)
  50%
    transform: scale( 1.05, 0.9 )
    animation-timing-function: cubic-bezier(0.165, 0.840, 0.440, 1.000)

</style>

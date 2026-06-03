<template>
  <div class=" relative leading-none">
    <div
      ref="titleDiv"
      class=" flex flex-col flex-center text-white pb-6"
    >
      <div class="flex flex-col flex-center jelly-bounce">
        <div class="text-[8rem] font-game">
          ANIMALS
        </div>
        <div class="text-[12.5rem] font-game">
          PARTY
        </div>
      </div>
      <div class=" text-[4rem] font-black mt-3 flex gap-2 joy-bounce">
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

    <!-- stroke -->
    <div
      class=" absolute top-0 flex flex-col flex-center stroke-color"
      :style="strokeStyle"
      v-html="titleDiv?.innerHTML"
    />

    <svg
      version="1.1"
      style="display: none;"
    >
      <defs>
        <filter :id="svgFilterId">
          <feMorphology
            operator="dilate"
            :radius="radius"
          />
          <feComposite
            operator="xor"
            in="SourceGraphic"
          />
        </filter>
      </defs>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid';
import { useQuasar } from 'quasar';
import { ref, computed } from 'vue';

const $q = useQuasar();

const titleDiv = ref<HTMLDivElement>();

const svgFilterId = `svg-filter-${nanoid()}`;
const strokeStyle = computed(() => {
  return {
    filter: `url(#${svgFilterId})`
  }
});

const radius = computed(() => {
  if ($q.screen.width <= 600) {
    return 6;
  }

  return 10;
});
</script>

<style scoped lang="sass">  
.font-game
  font-family: 'Luckiest Guy'

// 避免顏色顏色覆蓋外框艷色
.stroke-color
  color: #2e1c00
  span
    color: #2e1c00

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

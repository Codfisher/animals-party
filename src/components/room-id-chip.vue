<template>
  <div class=" relative overflow-hidden">
    <div class="chip rounded-full flex items-center gap-6">
      <base-polygon
        size="1rem"
        shape="pentagon"
        fill="solid"
        opacity="0.9"
        class="polygon"
      />
      {{ id }}
      <base-polygon
        size="1rem"
        shape="pentagon"
        fill="solid"
        opacity="0.9"
        class="polygon"
      />
    </div>

    <div class="absolute w-full h-full top-0 left-0 rounded-full overflow-hidden">
      <base-polygon
        class=" absolute -left-[4.5rem]"
        size="6.8rem"
        shape="round"
        fill="fence"
        opacity="0.1"
        rotate="45deg"
      />

      <base-polygon
        class=" absolute -right-[4.5rem]"
        size="6.8rem"
        shape="round"
        fill="fence"
        opacity="0.1"
        rotate="45deg"        
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameConsoleStore } from '../stores/game-console.store';

import BasePolygon from './base-polygon.vue';


const gameConsoleStore = useGameConsoleStore();

const id = computed(() => gameConsoleStore.roomId ?? '123456');
</script>

<style scoped lang="sass">
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@100;300;400;500;700;900&display=swap')
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch&family=Noto+Sans+TC:wght@100;300;400;500;700;900&display=swap')

.chip
  color: white
  font-size: 1.8rem
  padding: 2rem 3rem
  font-weight: 700
  font-family: 'Chakra Petch', sans-serif
  background: rgba(#3676a3, 0.8)
  letter-spacing: 3px
  text-shadow: 0px 0px 10px rgba(#1d3e57, 0.7)

.polygon
  animation: polygon 3s infinite linear

  margin-top: -4px

@keyframes polygon
  0%
    transform: rotate(0deg)
    transform-origin: 50% 60%
  100%
    transform: rotate(360deg)
</style>
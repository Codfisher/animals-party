<template>
  <div
    class="game-intro relative overflow-hidden rounded-2xl bg-black/35 px-5 py-4 text-white backdrop-blur-sm select-none"
  >
    <div class="polygon-lt absolute">
      <base-polygon
        size="11rem"
        shape="pentagon"
        fill="spot"
        color="white"
        opacity="0.12"
      />
    </div>
    <div class="polygon-rb absolute">
      <base-polygon
        size="9rem"
        shape="triangle"
        fill="fence"
        color="white"
        opacity="0.1"
      />
    </div>
    <div class="polygon-rt absolute">
      <base-polygon
        size="3.5rem"
        shape="square"
        fill="solid"
        color="white"
        opacity="0.08"
      />
    </div>
    <div class="polygon-lb absolute">
      <base-polygon
        size="5rem"
        shape="round"
        fill="spot"
        color="white"
        opacity="0.1"
      />
    </div>

    <div
      v-auto-animate
      class="relative z-0 flex flex-col gap-2"
    >
      <p class="text-center text-base font-bold tracking-widest opacity-80">遊戲簡介</p>

      <p
        v-auto-animate
        :key="name"
        class="text-2xl leading-relaxed opacity-90"
        v-html="intro.description"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { vAutoAnimate } from '@formkit/auto-animate/vue';
import BasePolygon from './base-polygon.vue';
import { GameName } from '../types';

interface GameIntro {
  description: string;
}

const props = defineProps<{
  name: `${GameName}`;
}>();

/** 各遊戲簡介，文案取自 README 遊戲介紹 */
const introMap: Record<`${GameName}`, GameIntro> = {
  [GameName.THE_FIRST_PENGUIN]: {
    description: '阿德利企鵝會把最前頭的同伴踢下水，努力別被擠下去，撐到最後吧！<span>◝( •ω• )◟</span>',
  },
  [GameName.CHICKEN_FLY]: {
    description: '一群農場的雞用大砲逃出農場了！先別管大砲哪來的，利用手機<b>陀螺儀</b>控制小雞的飛行姿態，閃過空中障礙物，帶小雞逃出農場魔掌吧！<p>─=≡Σ(( つ•̀ω•́)つ</p>',
  },
  [GameName.FOX_AND_MOUSE]: {
    description: '赤狐會在雪上聆聽積雪下小老鼠竄動的聲音，抓準時機跳起、插入雪中抓老鼠。仔細感受手機<b>震動時長</b>，抓到最大隻的老鼠吧！ԅ(´∀` ԅ)',
  },
};

const intro = computed(() => introMap[props.name]);
</script>

<style scoped lang="sass">
.game-intro
  width: 30vw

.polygon-lt
  left: -4rem
  top: -4rem
  animation: polygon-rotate 45s infinite linear, polygon-beat 4s infinite ease-in-out
.polygon-rb
  right: -2.5rem
  bottom: -3rem
  // 反向旋轉，與搖桿控制說明的同向裝飾做出區隔
  animation: polygon-rotate-reverse 38s infinite linear
.polygon-rt
  right: 2rem
  top: -1.25rem
  animation: polygon-float 6s infinite ease-in-out
.polygon-lb
  left: 1.5rem
  bottom: -2rem
  // 與右上小方塊錯開節奏，避免裝飾同步擺動
  animation: polygon-float 7.5s infinite ease-in-out 1.5s

@keyframes polygon-rotate
  0%
    transform: rotate(0deg)
  100%
    transform: rotate(360deg)

@keyframes polygon-rotate-reverse
  0%
    transform: rotate(0deg)
  100%
    transform: rotate(-360deg)

@keyframes polygon-beat
  0%, 100%
    scale: 1
  50%
    scale: 1.12

@keyframes polygon-float
  0%, 100%
    transform: translateY(0) rotate(0deg)
  50%
    transform: translateY(0.6rem) rotate(25deg)
</style>

<template>
  <div class="overflow-hidden" :style="backgroundStyle">
    <base-polygon
      v-for="[key, polygon] in polygonsMap"
      :key="key"
      class="absolute polygon-floating"
      :style="`left: ${polygon.left}; top: ${polygon.top}; animation-duration: ${polygon.animationDuration}`"
      :color="polygon.color"
      :rotate="polygon.rotate"
      :shape="polygon.shape"
      :fill="polygon.fill"
      :size="polygon.size"
      :opacity="polygon.opacity"
      @animationend="removePolygon(key)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { colord } from 'colord';
import { nanoid } from 'nanoid';
import { random, sample } from 'lodash-es';
import { promiseTimeout, useIntervalFn, useWindowSize } from '@vueuse/core';

import BasePolygon, { FillType, ShapeType } from '../components/base-polygon.vue';

interface PolygonParams {
  left: string;
  top: string;
  size: string;
  rotate: string;
  opacity: string | number;
  shape: `${ShapeType}`;
  fill: `${FillType}`;
  color: string;
  animationDuration: string;
}

interface Props {
  /** 背景顏色 */
  backgroundColor?: string;
  /** 方塊顏色 */
  polygonColors?: string[];
  /** 初始數量，畫面出現時，內部初始方塊數量 */
  initialQuantity?: number;
  /** 色塊最大數量，超過此數量時，會暫停產生方塊 */
  maxQuantity?: number;
  /** 產生間距，越短生成速度越快，單位 ms */
  generationInterval?: number;
}
const props = withDefaults(defineProps<Props>(), {
  backgroundColor: '#FF9954',
  polygonColors: () => ['#FFCF4F', '#E8AC48', '#E88148', '#FF744F'],
  initialQuantity: 10,
  maxQuantity: 50,
  generationInterval: 500,
});

const backgroundStyle = computed(() => {
  // 變亮並偏移色相
  const result = colord(props.backgroundColor).lighten(0.1).rotate(10).toHex();

  return {
    background: `linear-gradient(-10deg, ${props.backgroundColor}, ${result})`,
  };
});

const { width: windowWidth } = useWindowSize();
/** 手機版（sm 斷點以下）多邊形尺寸縮小 50% */
const sizeScale = computed(() => (windowWidth.value <= 600 ? 0.5 : 1));

const polygonsMap = ref<Map<string, PolygonParams>>(new Map());

function createPolygonParams() {
  const params: PolygonParams = {
    left: `${random(0, 100)}%`,
    top: `${random(0, 100)}%`,
    size: `${random(2, 15) * sizeScale.value}rem`,
    rotate: `${random(0, 180)}deg`,
    opacity: random(0.4, 0.6, true),
    color: sample(props.polygonColors) ?? 'white',
    shape: sample(Object.values(ShapeType)) ?? 'round',
    fill: sample(Object.values(FillType)) ?? 'solid',
    animationDuration: `${random(5, 20)}s`,
  };
  return params;
}

function addPolygon(params: PolygonParams) {
  polygonsMap.value.set(nanoid(), params);
}
function removePolygon(id: string) {
  polygonsMap.value.delete(id);
}

useIntervalFn(async () => {
  // 到達最大數量後，停止生成
  if (polygonsMap.value.size >= props.maxQuantity) return;
  addPolygon(createPolygonParams());
}, props.generationInterval);

function init() {
  // 預先建立多邊型
  for (let i = 0; i < props.initialQuantity; i++) {
    addPolygon(createPolygonParams());
  }
}
init();
</script>

<style scoped lang="sass">
.polygon-floating
  animation: polygon-floating 10s forwards linear
@keyframes polygon-floating
  0%
    transform: translate(0px, 0px) rotate(0deg)
    opacity: 0
  10%
    opacity: 1
  90%
    opacity: 1
  100%
    transform: translate(-10rem, 10rem) rotate(6deg)
    opacity: 0
</style>

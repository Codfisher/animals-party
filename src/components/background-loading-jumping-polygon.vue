<template>
  <div
    class="flex flex-center overflow-hidden"
    :style="backgroundStyle"
  >
    <div class="flex gap-20">
      <div
        v-for="(poly, i) in polygons"
        :key="i"
        class="box"
        :style="`animation-delay: ${i * 0.1}s`"
      >
        <base-polygon
          size="9rem"
          :shape="poly.shape"
          fill="solid"
          :color="poly.color"
          class="jelly-bounce"
          :style="`animation-delay: ${i * 0.1}s`"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { colors } from 'quasar';
import BasePolygon, { ShapeType } from './base-polygon.vue';
const { lighten, textToRgb, rgbToHsv, hsvToRgb, rgbToHex } = colors;

interface Props {
  /** 背景顏色 */
  backgroundColor?: string;
  /** 方塊顏色 */
  polygonColors?: string[];
}
const props = withDefaults(defineProps<Props>(), {
  backgroundColor: '#c8e6b1',
  polygonColors: () => ['#7c8f6d60', '#B1CC9D60', '#90A68060'],
});


const backgroundStyle = computed(() => {
  // 變亮
  const lightenColor = lighten(props.backgroundColor, 20);

  // 變暗並偏移色相
  const darkColor = lighten(props.backgroundColor, -14);

  const hsvColor = rgbToHsv(textToRgb(darkColor));
  hsvColor.h -= 15;

  const offsetColor = rgbToHex(hsvToRgb(hsvColor));

  return {
    background: `linear-gradient(-30deg, ${offsetColor}, ${props.backgroundColor}, ${lightenColor}, ${props.backgroundColor}, ${offsetColor})`
  }
});

const polygons = computed(() => [
  {
    shape: ShapeType.SQUARE,
    color: props.polygonColors[0],
  },
  {
    shape: ShapeType.ROUND,
    color: props.polygonColors[1],
  },
  {
    shape: ShapeType.TRIANGLE,
    color: props.polygonColors[2],
  },
]);

</script>

<style scoped lang="sass">
.box
  animation: jump 1.4s infinite ease-in-out

.jelly-bounce 
  animation: jelly-bounce 1.4s infinite ease-in-out
  transform-origin: 50% 100%

@keyframes jump
  0%
    transform: translateY(-30%)
  45%
    transform: translateY(0%)
  100%
    transform: translateY(-30%)

@keyframes jelly-bounce
  0%
    transform: scale( 1 )
  30%
    transform: scale( 1 )
  50%
    transform: scale( 1.2, 0.8 )
  70%
    transform: scale( 0.85, 1.15 )
  80%
    transform: scale( 1.05, 0.95 )
  90%
    transform: scale( 0.98, 1.02 )
  100%
    transform: scale( 1 )
</style>

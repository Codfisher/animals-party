<template>
  <q-card class="flex flex-col rounded-[2rem] shadow-sm overflow-hidden text-sky-900">
    <q-card-section class=" relative text-white text-4xl text-center bg-sky-600 p-7 !rounded-none">
      遊戲說明

      <base-polygon
        class=" absolute top-0 left-0 -translate-x-1/4 -translate-y-1/2"
        opacity="0.2"
        rotate="30deg"
      />
      <base-polygon
        class=" absolute bottom-0 right-0 translate-x-1/4 translate-y-1/2"
        opacity="0.2"
        fill="spot"
        shape="pentagon"
        rotate="30deg"
      />
    </q-card-section>

    <q-card-section class=" text-xl p-10 text-center">
      躲避黑色壞壞雞，碰撞 3 次會墜雞喔！
    </q-card-section>

    <q-card-section class="section">
      <div class="pad ">
        <div class="thumb thumb-action" />
      </div>
      <p class=" text-center flex-1">
        旋轉手機即可控制小雞姿態<br>（建議關閉手機自動旋轉）
      </p>
    </q-card-section>

    <q-card-section class="section">
      <div class="pad click-pad">
        <div class="thumb" />
      </div>
      <p class=" text-center flex-1">
        按下圓圈即可將姿態歸零
      </p>
    </q-card-section>

    <q-card-section class="section justify-center flex-1">
      <p>
        練習完成後，按下
        <q-icon
          name="done"
          color="white"
          class="p-2 bg-[#000]/60 rounded-full"
        />
        準備完成
      </p>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import BasePolygon from '../../components/base-polygon.vue';
</script>

<style scoped lang="sass">
.section
  @apply text-xl p-6 px-10 flex items-center flex-nowrap gap-6

.pad
  @apply rounded-full flex justify-center items-center
  width: 10rem
  height: 10rem
  background: rgba(#111, 0.6)
.thumb
  width: 40%
  height: 40%
  background: white
  border-radius: 9999px
  opacity: 0.8

.thumb-action
  animation: thumb-action 3s ease-in-out infinite

@keyframes thumb-action
  0%, 100%
    transform: translate(0%, 0%)
  25%
    transform: translate(0%, 50%)
  50%
    transform: translate(-50%, 0%)
  75%
    transform: translate(0%, -50%)

.click-pad
  animation: click-pad 1s ease-in-out infinite

@keyframes click-pad
  0%, 20%, 100%
    transform: scale(1)
  40%
    transform: scale(0.98)
    opacity: 0.8

</style>

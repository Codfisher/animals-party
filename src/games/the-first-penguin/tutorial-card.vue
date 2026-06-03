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
      誰都不想第一個下水，努力把別人撞下海中吧！
    </q-card-section>

    <q-card-section class="section">
      <div class=" w-1/3 flex flex-center">
        <div class="pad ">
          <div class="thumb thumb-action" />
        </div>
      </div>

      <p class=" text-center flex-1">
        移動類比搖桿控制企鵝移動
      </p>
    </q-card-section>

    <q-card-section class="section">
      <div class=" w-1/3 flex flex-center">
        <div class="button click">
          <div class=" text-white text-5xl">
            A
          </div>
        </div>
      </div>


      <p class=" text-center flex-1">
        按下 A 發動旋轉攻擊，可以全方位擊退其他企鵝
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

.pad, .button
  @apply rounded-full flex justify-center items-center
  background: rgba(#111, 0.6)

.pad
  width: 7rem
  height: 7rem
.button
  width: 6rem
  height: 6rem

.thumb
  width: 40%
  height: 40%
  background: white
  border-radius: 9999px
  opacity: 0.8

.mouse
  width: 4rem
  height: 4rem
  border: 3px solid rgba(#222, 0.4)
  transform: rotate(45deg)
  animation: mouse 2s infinite

@keyframes mouse
  0%, 100%
    opacity: 1
  50%
    opacity: 0.4


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

.click
  animation: click 1s ease-in-out infinite

@keyframes click
  0%, 20%, 100%
    transform: scale(1)
  40%
    transform: scale(0.98)
    opacity: 0.8

</style>

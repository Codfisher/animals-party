<template>
  <div class="flex flex-col rounded-[2rem] shadow-sm overflow-hidden text-sky-900 bg-white">
    <div class=" relative text-white text-4xl text-center bg-sky-600 p-7">
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
    </div>

    <div class=" text-xl p-10 text-center">
      躲避黑色壞壞雞，碰撞 3 次會墜雞喔！
    </div>

    <div class="section">
      <div class="pad ">
        <div class="thumb thumb-action" />
      </div>
      <p class=" text-center flex-1">
        旋轉手機即可控制小雞姿態<br>（建議關閉手機自動旋轉）
      </p>
    </div>

    <div class="section">
      <div class="pad click-pad">
        <div class="thumb" />
      </div>
      <p class=" text-center flex-1">
        按下圓圈即可將姿態歸零
      </p>
    </div>

    <div class="section justify-center flex-1">
      <p class=" flex items-center gap-1.5 flex-nowrap">
        練習完成後，按下
        <UIcon
          name="material-symbols:done"
          class="text-white bg-black/60 rounded-full"
          size="2.25rem"
        />
        準備完成
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import BasePolygon from '../../components/base-polygon.vue';
</script>

<style scoped lang="sass">
.section
  font-size: 1.25rem
  line-height: 1.75rem
  padding: 1.5rem 2.5rem
  display: flex
  align-items: center
  flex-wrap: nowrap
  gap: 1.5rem

.pad
  display: flex
  justify-content: center
  align-items: center
  border-radius: 9999px
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

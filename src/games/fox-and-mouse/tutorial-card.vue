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
      仔細感受雪下的動靜，抓到最大隻的老鼠吧！
    </div>

    <div class="section">
      <div class=" w-1/3 flex flex-center">
        <div class="pad ">
          <div class="thumb thumb-action" />
        </div>
      </div>

      <p class=" text-center flex-1">
        移動類比搖桿控制狐狸移動
      </p>
    </div>

    <div class="section">
      <div class=" w-1/3 flex flex-center">
        <div class="mouse" />
      </div>


      <p class=" text-center flex-1">
        踩在方框上，搖桿震動時間越長，表示老鼠越大隻
      </p>
    </div>

    <div class="section">
      <div class=" w-1/3 flex flex-center">
        <div class="button click">
          <div class=" text-white text-5xl">
            A
          </div>
        </div>
      </div>


      <p class=" text-center flex-1">
        按下 A 抓老鼠
      </p>
    </div>

    <div class="section justify-center flex-1">
      <p>
        練習完成後，按下
        <UIcon
          name="material-symbols:done"
          class="text-white p-2 bg-[#000]/60 rounded-full"
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

.pad, .button
  display: flex
  justify-content: center
  align-items: center
  border-radius: 9999px
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

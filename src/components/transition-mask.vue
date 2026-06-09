<template>
  <transition
    :name="currentType"
    @before-enter="handleBeforeEnter"
    @after-enter="handleAfterEnter"
    @before-leave="handleBeforeLeave"
    @after-leave="handleAfterLeave"
  >
    <div
      v-if="props.modelValue"
      class="mask"
    >
      <slot />
    </div>
  </transition>
</template>

<script lang="ts">
export enum AnimationType {
  /** 圓形由中央擴張 */
  ROUND = 'round',
  /** 圓形由左上角擴張 */
  CORNER = 'corner',
  /** 菱形旋轉擴張 */
  DIAMOND = 'diamond',
  /** 由左至右斜向橫掃 */
  WIPE = 'wipe',
  /** 橢圓由窄變寬形變擴張 */
  ELLIPSE = 'ellipse',
  /** 方框由中央縮放展開 */
  BOX = 'box',
}

export interface State {
  isEntering: boolean;
  isLeaving: boolean;
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  modelValue: boolean;
  /** 指定裁切效果，未指定時每次開啟依序輪流切換 */
  type?: `${AnimationType}`;
}
const props = defineProps<Props>();

const animationTypeList = Object.values(AnimationType);

/** 輪流切換用的索引 */
let typeIndex = -1;

/** 實際套用的裁切效果，輪流模式下於開啟前決定 */
const currentType = ref<`${AnimationType}`>(props.type ?? AnimationType.ROUND);

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) {
      return;
    }
    // 指定 type 時固定使用，否則依序輪流
    if (props.type) {
      currentType.value = props.type;
      return;
    }
    typeIndex = (typeIndex + 1) % animationTypeList.length;
    currentType.value = animationTypeList[typeIndex];
  },
  {
    immediate: true,
  },
);

const emit = defineEmits<{
  (e: 'update', state: State): void;
}>();

const state = ref<State>({
  isEntering: false,
  isLeaving: false,
});

watch(state, () => emit('update', state.value), {
  deep: true,
});

function handleBeforeEnter() {
  state.value.isEntering = true;
  state.value.isLeaving = false;
}
function handleAfterEnter() {
  state.value.isEntering = false;
}

function handleBeforeLeave() {
  state.value.isEntering = false;
  state.value.isLeaving = true;
}
function handleAfterLeave() {
  state.value.isLeaving = false;
}

/** 定義元件可對外提供之資料 */
defineExpose({
  state,
});
</script>

<style scoped lang="sass">
// 圓形由中央擴張
.round-enter-active
  animation-duration: 1.4s
.round-leave-active
  transition-duration: 0.4s
  transition-timing-function: ease-in-out
.round-enter-from, .round-enter-to
  animation-name: round-in
  animation-fill-mode: forwards
@keyframes round-in
  0%
    clip-path: circle(3% at 46% -50%)
    animation-timing-function: cubic-bezier(0.005, 0.920, 0.060, 0.99)
  40%
    clip-path: circle(3% at 50% 50%)
    animation-timing-function: cubic-bezier(0.630, -0.170, 0.140, 0.980)
  100%
    clip-path: circle(70.7% at 50% 50%)
.round-leave-from
  clip-path: circle(70.7% at 50% 50%)
.round-leave-to
  clip-path: circle(40% at 140% 140%)

// 聚光：小圓自左上角彈出、遊走畫面後爆開罩滿
.corner-enter-active
  animation-duration: 1.2s
.corner-leave-active
  transition-duration: 0.5s
  transition-timing-function: cubic-bezier(0.6, 0, 0.8, 0.2)
.corner-enter-from, .corner-enter-to
  animation-name: corner-in
  animation-fill-mode: forwards
@keyframes corner-in
  0%
    clip-path: circle(0% at 12% 12%)
    animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)
  18%
    clip-path: circle(19% at 12% 12%)
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1)
  42%
    clip-path: circle(17% at 84% 30%)
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1)
  64%
    clip-path: circle(20% at 40% 82%)
    animation-timing-function: cubic-bezier(0.7, 0, 0.84, 0)
  100%
    clip-path: circle(160% at 50% 50%)
.corner-leave-from
  clip-path: circle(160% at 50% 50%)
.corner-leave-to
  clip-path: circle(0% at 86% 86%)

// 菱形連續旋轉、菱⇄方交替放大
.diamond-enter-active
  animation-duration: 1.1s
.diamond-leave-active
  transition-duration: 0.45s
  transition-timing-function: cubic-bezier(0.5, 0, 0.75, 0)
.diamond-enter-from, .diamond-enter-to
  animation-name: diamond-in
  animation-fill-mode: forwards
@keyframes diamond-in
  0%
    clip-path: polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)
    animation-timing-function: cubic-bezier(0.5, 0, 0.1, 1)
  22%
    clip-path: polygon(50% 40%, 60% 50%, 50% 60%, 40% 50%)
    animation-timing-function: ease-in-out
  45%
    clip-path: polygon(32% 32%, 68% 32%, 68% 68%, 32% 68%)
    animation-timing-function: ease-in-out
  68%
    clip-path: polygon(50% 16%, 84% 50%, 50% 84%, 16% 50%)
    animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)
  100%
    clip-path: polygon(50% -70%, 170% 50%, 50% 170%, -70% 50%)
.diamond-leave-from
  clip-path: polygon(50% -70%, 170% 50%, 50% 170%, -70% 50%)
.diamond-leave-to
  clip-path: polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)

// 斜向橫掃，前緣角度來回擺動
.wipe-enter-active
  animation-duration: 0.9s
.wipe-leave-active
  transition-duration: 0.5s
  transition-timing-function: cubic-bezier(0.77, 0, 0.175, 1)
.wipe-enter-from, .wipe-enter-to
  animation-name: wipe-in
  animation-fill-mode: forwards
@keyframes wipe-in
  0%
    clip-path: polygon(-30% 0%, 0% 0%, -30% 100%, -60% 100%)
    animation-timing-function: cubic-bezier(0.5, 0, 0.1, 1)
  30%
    clip-path: polygon(-30% 0%, 52% 0%, 14% 100%, -60% 100%)
    animation-timing-function: ease-in-out
  55%
    clip-path: polygon(-30% 0%, 70% 0%, 96% 100%, -60% 100%)
    animation-timing-function: cubic-bezier(0.34, 1.4, 0.64, 1)
  80%
    clip-path: polygon(-30% 0%, 132% 0%, 108% 100%, -60% 100%)
    animation-timing-function: ease-out
  100%
    clip-path: polygon(-30% 0%, 165% 0%, 165% 100%, -60% 100%)
.wipe-leave-from
  clip-path: polygon(-30% 0%, 165% 0%, 165% 100%, -60% 100%)
.wipe-leave-to
  clip-path: polygon(165% 0%, 195% 0%, 165% 100%, 135% 100%)

// 橢圓窄高↔寬扁來回拉伸再罩滿
.ellipse-enter-active
  animation-duration: 1.05s
.ellipse-leave-active
  transition-duration: 0.45s
  transition-timing-function: cubic-bezier(0.5, 0, 0.75, 0)
.ellipse-enter-from, .ellipse-enter-to
  animation-name: ellipse-in
  animation-fill-mode: forwards
@keyframes ellipse-in
  0%
    clip-path: ellipse(0% 0% at 50% 50%)
    animation-timing-function: cubic-bezier(0.5, 0, 0.1, 1)
  28%
    clip-path: ellipse(6% 42% at 50% 50%)
    animation-timing-function: ease-in-out
  50%
    clip-path: ellipse(52% 16% at 50% 50%)
    animation-timing-function: ease-in-out
  72%
    clip-path: ellipse(30% 62% at 50% 50%)
    animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)
  100%
    clip-path: ellipse(140% 140% at 50% 50%)
.ellipse-leave-from
  clip-path: ellipse(140% 140% at 50% 50%)
.ellipse-leave-to
  clip-path: ellipse(0% 0% at 50% 50%)

// 旋轉方框：矩形自中央邊旋轉邊脹大（約轉 200°），最後轉正罩滿
.box-enter-active
  animation-duration: 1.05s
.box-leave-active
  transition-duration: 0.5s
  transition-timing-function: cubic-bezier(0.5, 0, 0.75, 0)
.box-enter-from, .box-enter-to
  animation-name: box-in
  animation-fill-mode: forwards
@keyframes box-in
  0%
    clip-path: polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)
    animation-timing-function: cubic-bezier(0.5, 0, 0.1, 1)
  25%
    clip-path: polygon(29.3% 54.2%, 36.9% 33.5%, 70.7% 45.8%, 63.2% 66.5%)
    animation-timing-function: ease-in-out
  50%
    clip-path: polygon(45% 90.2%, 11.3% 61.9%, 55% 9.8%, 88.7% 38.1%)
    animation-timing-function: ease-in-out
  75%
    clip-path: polygon(116% 74.6%, 50.5% 120.5%, -16% 25.4%, 49.5% -20.5%)
    animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)
  100%
    clip-path: polygon(130% -30%, 130% 130%, -30% 130%, -30% -30%)
.box-leave-from
  clip-path: polygon(130% -30%, 130% 130%, -30% 130%, -30% -30%)
.box-leave-to
  clip-path: polygon(62% 52%, 52% 62%, 38% 48%, 48% 38%)
</style>

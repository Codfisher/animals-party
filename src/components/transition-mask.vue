<template>
  <transition
    :name="props.type"
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
  ROUND = 'round',
}

export interface State {
  isEntering: boolean,
  isLeaving: boolean,
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  modelValue: boolean;
  type?: `${AnimationType}`;
}
const props = withDefaults(defineProps<Props>(), {
  type: AnimationType.ROUND,
});

const emit = defineEmits<{
  (e: 'update', state: State): void;
}>();

const state = ref<State>({
  isEntering: false,
  isLeaving: false,
});

watch(state, () => emit('update', state.value), {
  deep: true
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
  state
});
</script>

<style scoped lang="sass">
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
</style>
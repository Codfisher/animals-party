<template>
  <div class="d-pad rounded-full bg-neutral-900">
    <gamepad-btn
      class="btn up"
      color="bg-neutral-800!"
      icon="i-material-symbols-arrow-drop-up"
      size="3rem"
      @trigger="(status) => handleBtnTrigger('up', status)"
    />
    <gamepad-btn
      class="btn left"
      color="bg-neutral-800!"
      icon="i-material-symbols-arrow-left"
      size="3rem"
      @trigger="(status) => handleBtnTrigger('left', status)"
    />
    <gamepad-btn
      class="btn right"
      color="bg-neutral-800!"
      icon="i-material-symbols-arrow-right"
      size="3rem"
      @trigger="(status) => handleBtnTrigger('right', status)"
    />
    <gamepad-btn
      class="btn down"
      color="bg-neutral-800!"
      icon="i-material-symbols-arrow-drop-down"
      size="3rem"
      @trigger="(status) => handleBtnTrigger('down', status)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import GamepadBtn from './gamepad-btn.vue';

type KeyName = 'up' | 'left' | 'right' | 'down';

interface Props {
  /** 尺寸，直徑 */
  size?: string;
  btnSize?: string;
}
const props = withDefaults(defineProps<Props>(), {
  size: '34rem',
  btnSize: '3rem'
});

const emit = defineEmits<{
  (e: 'click', keyName: KeyName): void;
  (e: 'trigger', data: { keyName: KeyName, status: boolean }): void;
}>();


function handleBtnTrigger(keyName: KeyName, status: boolean) {
  if (!status) {
    emit('click', keyName);
  }

  emit('trigger', {
    keyName, status
  });
}
</script>

<style scoped lang="sass">
.d-pad
  width: v-bind('props.size')
  height: v-bind('props.size')

.btn
  position: absolute
  &.up
    left: 50%
    top: 0%
    transform: translate(-50%, 20%)
  &.left
    left: 0%
    top: 50%
    transform: translate(20%, -50%)
  &.right
    right: 0%
    top: 50%
    transform: translate(-20%, -50%)
  &.down
    left: 50%
    bottom: 0%
    transform: translate(-50%, -20%)
</style>

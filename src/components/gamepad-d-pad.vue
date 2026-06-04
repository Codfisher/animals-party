<template>
  <div class="d-pad rounded-full bg-neutral-900">
    <gamepad-btn
      class="btn up"
      color="bg-neutral-800!"
      icon="material-symbols:arrow-drop-up"
      :size="props.btnSize"
      @trigger="(status) => handleBtnTrigger('up', status)"
    />
    <gamepad-btn
      class="btn left"
      color="bg-neutral-800!"
      icon="material-symbols:arrow-left"
      :size="props.btnSize"
      @trigger="(status) => handleBtnTrigger('left', status)"
    />
    <gamepad-btn
      class="btn right"
      color="bg-neutral-800!"
      icon="material-symbols:arrow-right"
      :size="props.btnSize"
      @trigger="(status) => handleBtnTrigger('right', status)"
    />
    <gamepad-btn
      class="btn down"
      color="bg-neutral-800!"
      icon="material-symbols:arrow-drop-down"
      :size="props.btnSize"
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
  /** 上限 42vw，與右側按鈕並排時不重疊 */
  size: 'min(13rem, 42vw)',
  /** 方向鍵縮小，避免在縮小的 d-pad 上互相擠壓 */
  btnSize: '1.1rem',
});

const emit = defineEmits<{
  (e: 'click', keyName: KeyName): void;
  (e: 'trigger', data: { keyName: KeyName; status: boolean }): void;
}>();

function handleBtnTrigger(keyName: KeyName, status: boolean) {
  if (!status) {
    emit('click', keyName);
  }

  emit('trigger', {
    keyName,
    status,
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

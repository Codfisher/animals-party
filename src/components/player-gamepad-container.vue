<template>
  <div
    class="absolute inset-0 flex text-white select-none overflow-hidden"
    :style="{ backgroundColor: bgColor }"
    @touchmove="(e) => e.preventDefault()"
  >
    <slot />

    <div class="code-name">
      {{ codeName }}
    </div>

    <UModal
      :open="isWrongOrientation"
      :dismissible="false"
    >
      <template #content>
        <div class="p-8 flex flex-col items-center gap-6">
          <UIcon
            name="material-symbols:progress-activity"
            class="animate-spin text-primary text-[10rem]"
          />
          <div class="text-4xl">請將手機轉為{{ targetOrientation }}</div>
          <div class="text-base">轉為{{ targetOrientation }}後，此視窗會自動關閉</div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useClientPlayer } from '../composables/use-client-player';
import { getPlayerColorHex } from '../common/color';
import { useScreenOrientation } from '@vueuse/core';

interface Props {
  /** 指定螢幕方向，為空表示不限制 */
  orientation?: 'landscape' | 'portrait';
}
const props = withDefaults(defineProps<Props>(), {
  orientation: undefined,
});

const { orientation } = useScreenOrientation();
const { codeName } = useClientPlayer();

const isWrongOrientation = computed(() => {
  if (!props.orientation) {
    return false;
  }

  return orientation.value?.includes(props.orientation) ?? false;
});
const bgColor = computed(() => getPlayerColorHex(codeName.value));

const targetOrientation = computed(() => (props.orientation === 'landscape' ? '直向' : '橫向'));
</script>

<style scoped lang="sass">
.code-name
  position: absolute
  top: 0
  left: 50%
  transform: translateX(-50%)
  display: flex
  justify-content: center
  padding: 0.1rem
  font-size: 5rem
  text-shadow: 0px 0px 1rem rgba(#000, 0.5)
</style>

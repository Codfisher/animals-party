<template>
  <div
    class="w-full h-full flex text-white select-none overflow-hidden"
    :class="bgClass"
    @touchmove="(e) => e.preventDefault()"
  >
    <slot />

    <div class="code-name">
      {{ codeName }}
    </div>

    <q-dialog
      v-model="isWrongOrientation"
      persistent
    >
      <q-card class="p-8">
        <q-card-section class="flex flex-col items-center gap-6">
          <q-spinner-box
            color="primary"
            size="10rem"
          />
          <div class="text-4xl">
            請將手機轉為{{ targetOrientation }}
          </div>
          <div class="text-base">
            轉為{{ targetOrientation }}後，此視窗會自動關閉
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useClientPlayer } from '../composables/use-client-player';
import { useScreenOrientation } from '@vueuse/core';

interface Props {
  /** 指定螢幕方向，為空表示不限制 */
  orientation?: 'landscape' | 'portrait';
}
const props = withDefaults(defineProps<Props>(), {
  orientation: undefined,
});

const { orientation } = useScreenOrientation();
const { codeName, colorName } = useClientPlayer();

const isWrongOrientation = computed(() => {
  if (!props.orientation) {
    return false;
  }

  return orientation.value?.includes(props.orientation) ?? false;
});
const bgClass = computed(() => `bg-${colorName.value}`);

const targetOrientation = computed(() =>
  props.orientation === 'landscape' ? '直向' : '橫向'
);
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
  font-size: 10rem
  text-shadow: 0px 0px 2rem rgba(#000, 0.5)
</style>

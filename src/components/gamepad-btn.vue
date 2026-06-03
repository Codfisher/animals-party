<template>
  <UButton
    square
    color="neutral"
    variant="solid"
    class="gamepad-btn rounded-full inline-flex items-center justify-center p-[0.6em] text-white select-none transition-colors duration-200"
    :class="backgroundClass"
    :style="{ fontSize: props.size }"
    @mouseup="handleUp"
    @mousedown="handleDown"
    @touchend="handleUp"
    @touchstart="handleDown"
    @contextmenu="(e: any) => e?.preventDefault()"
  >
    <UIcon
      v-if="props.icon"
      :name="props.icon"
      class="size-[1.5em]"
    />
    <slot />
  </UButton>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface Props {
  /** 尺寸 */
  size?: string;
  /** 按鈕內 icon 名稱（完整 Iconify 名稱，例如 i-material-symbols-done） */
  icon?: string;
  /** 按鈕底色（Tailwind class） */
  color?: string;
  /** 按鈕觸發底色（Tailwind class） */
  activeColor?: string,
}
const props = withDefaults(defineProps<Props>(), {
  size: '2rem',
  icon: undefined,
  color: 'bg-neutral-900!',
  activeColor: 'bg-neutral-200!',
});

const emit = defineEmits<{
  (e: 'up'): void;
  (e: 'down'): void;
  (e: 'trigger', status: boolean): void;
  (e: 'click'): void;
}>();

const status = ref(false);
watch(status, (value) => emit('trigger', value));

const backgroundClass = computed(() =>
  status.value ? props.activeColor : props.color
);

function handleUp(e: TouchEvent | MouseEvent) {
  e.preventDefault();

  status.value = false;
  emit('up');
  emit('click');
}
function handleDown(e: TouchEvent | MouseEvent) {
  e.preventDefault();

  status.value = true;
  emit('down');
}
</script>

<style scoped lang="sass">
</style>

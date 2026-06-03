<template>
  <q-btn
    round
    unelevated
    :size="props.size"
    :icon="props.icon"
    :color="color"
    @mouseup="handleUp"
    @mousedown="handleDown"
    @touchend="handleUp"
    @touchstart="handleDown"
    @contextmenu="(e: any) => e?.preventDefault()"
  >
    <slot />
  </q-btn>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface Props {
  /** 尺寸 */
  size?: string;
  /** 按鈕內 icon 名稱 */
  icon?: string;
  /** 按鈕底色 */
  color?: string;
  /** 按鈕觸發底色 */
  activeColor?: string,
}
const props = withDefaults(defineProps<Props>(), {
  size: '2rem',
  icon: undefined,
  color: 'grey-10',
  activeColor: 'grey-3',
});

const emit = defineEmits<{
  (e: 'up'): void;
  (e: 'down'): void;
  (e: 'trigger', status: boolean): void;
  (e: 'click'): void;
}>();

const status = ref(false);
watch(status, (value) => emit('trigger', value));

const color = computed(() =>
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

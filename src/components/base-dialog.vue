<template>
  <UModal>
    <template #content>
      <div class="flex flex-col justify-between p-5 min-w-[400px] min-h-[150px]">
        <div class="flex items-center">
          <UAvatar
            :icon="props.icon.name"
            class="bg-white!"
            :style="{ color: props.icon.color }"
          />
          <span class=" ml-6 text-xl text-[#5E5E5E]">
            {{ props.message }}
          </span>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            v-for="btn in props.actions"
            :key="btn.action"
            :color="btn.type === 'negative' ? 'error' : 'primary'"
            variant="soft"
            size="lg"
            @click="emit('close', btn.action)"
          >
            {{ btn.label }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
export type BtnType = 'negative';

export interface Props {
  icon: {
    /** 名稱（完整 Iconify 名稱） */
    name: string;
    /** 顏色 */
    color?: string;
  };
  /** 訊息 */
  message: string;
  actions: {
    /** 動作 */
    action: string;
    /** 類型 */
    type?: BtnType;
    /** 內容 */
    label: string;
  }[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [action: string];
}>();
</script>

<style scoped lang="sass">
</style>

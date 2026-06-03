<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card class="flex flex-col justify-between p-5 min-w-[400px] min-h-[150px]">
      <q-card-section class=" flex items-center">
        <q-avatar
          :icon="props.icon.name"
          color="white"
          :text-color="props.icon.color"
          font-size="50px"
        />
        <span class=" ml-6 text-xl text-[#5E5E5E]">
          {{ props.message }}
        </span>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-for="btn in props.actions"
          :key="btn.action"
          :color="btn.color"
          :text-color="getTextColor(btn.textColor, btn.type)"
          :style="getTypeStyle(btn.type)"
          unelevated
          size="16px"
          :padding="btn.padding"
          @click="handleOKClick(btn.action)"
        >
          {{ btn.label }}
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar';

export type BtnType = 'negative';

export interface Props {
  icon: {
    /** 名稱 */
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
    /** 背景顏色 */
    color?: string;
    padding?: string;
    /** 文字顏色 */
    textColor?: string;
  }[];
}

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent<string>()


const props = defineProps<Props>();

const emit = defineEmits({
  ...useDialogPluginComponent.emitsObject
});

const styleMap: Record<BtnType, string> = {
  negative: 'background: #FEE2E2; color: #C10015;',
}

function handleOKClick(action: string) {
  onDialogOK(action);
}

function getTypeStyle(type: Props['actions'][0]['type']) {
  if (!type) {
    return undefined;
  }

  return styleMap[type];
}

function getTextColor(color?: string, type?: Props['actions'][0]['type']) {
  if (type) {
    return undefined;
  }

  return color ?? 'primary'
}
</script>

<style scoped lang="sass">
</style>

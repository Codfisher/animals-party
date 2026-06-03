<template>
  <div class="bg-white rounded-2xl overflow-hidden">
    <div class="relative bg-teal-500 text-white overflow-hidden p-4">
      <div class=" text-xl font-bold">
        Web API 授權清單
      </div>
      <div class="text-xs flex flex-col gap-1 mt-2">
        <div>
          當狀態為
          <UIcon
            name="material-symbols:info"
            class="inline-block align-text-bottom"
          /> 時，點擊對應項目進行授權
        </div>
        <div>
          若狀態為
          <UIcon
            name="material-symbols:cancel"
            class="inline-block align-text-bottom"
          /> 時，請在瀏覽器設定中允許對應 API 權限
        </div>
      </div>

      <base-polygon
        opacity="0.1"
        size="10rem"
        class=" absolute -top-24 -right-8"
        rotate="60deg"
        shape="pentagon"
      />
    </div>

    <div class="relative overflow-hidden p-3 flex flex-col gap-1">
      <UButton
        v-for="permission in permissions"
        :key="permission.key"
        block
        color="neutral"
        variant="ghost"
        class="justify-start items-center gap-2 p-1.5 text-left"
        @click="permission.onClick"
      >
        <UAvatar
          size="3xl"
          :icon="permission.icon"
        />

        <div class="flex-1">
          <div class=" text-sm font-medium">
            {{ permission.label }}
          </div>
          <div class=" text-xs opacity-80 leading-tight">
            {{ permission.caption }}
          </div>
        </div>

        <UIcon
          :name="permission.stateInfo.icon"
          :class="permission.stateInfo.color"
          size="md"
        />
      </UButton>

      <base-polygon
        opacity="0.1"
        size="11rem"
        class=" absolute -bottom-24 -left-8"
        rotate="60deg"
        color="#AAA"
        shape="round"
        fill="spot"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVibrate } from '@vueuse/core';
import { computed, watch } from 'vue';
import { PlayerPermission, PlayerPermissionState } from '../types';
import { useMotionPermission } from '../composables/use-motion-permission';

import BasePolygon from './base-polygon.vue';

const emit = defineEmits<{
  (e: 'update', data: PlayerPermission): void;
}>();

const motionPermission = useMotionPermission();

const { vibrate, isSupported } = useVibrate();
const vibrateState = computed<`${PlayerPermissionState}`>(
  () => isSupported.value ? 'granted' : 'not-support',
);


/** 狀態詳細資訊 */
const stateInfoMap: Record<PlayerPermissionState, {
  icon: string;
  color: string;
  description: string;
}> = {
  'granted': {
    icon: 'material-symbols:check-circle',
    color: 'text-green-500',
    description: '已同意',
  },
  'denied': {
    icon: 'material-symbols:cancel',
    color: 'text-orange-600',
    description: '授權被拒絕',
  },
  'prompt': {
    icon: 'material-symbols:info',
    color: 'text-cyan-500',
    description: '等待授權',
  },
  'not-support': {
    icon: 'material-symbols:help',
    color: 'text-neutral-400',
    description: '不支援此 API',
  },
}
function getStateInfo(value: PlayerPermissionState) {
  return stateInfoMap?.[value] ?? stateInfoMap['not-support'];
}

const permissions = computed<{
  key: keyof PlayerPermission,
  icon: string;
  label: string;
  caption: string;
  state: PlayerPermissionState;
  stateInfo: ReturnType<typeof getStateInfo>;
  onClick?: () => void;
}[]>(() => ([
  {
    key: 'gyroscope',
    icon: 'material-symbols:screen-rotation-alt',
    label: '陀螺儀',
    caption: '可以偵測手機旋轉角度，通常用於體感遊戲',
    state: motionPermission.state.value,
    stateInfo: getStateInfo(motionPermission.state.value),
    onClick: motionPermission.request,
  },
  {
    key: 'vibrate',
    icon: 'material-symbols:vibration',
    label: '震動回饋',
    caption: '控制震動馬達，提供震動回饋',
    state: vibrateState.value,
    stateInfo: getStateInfo(vibrateState.value),
    /** 點一下震動 */
    onClick: () => vibrate([100, 10, 50])
  },
]));

watch(permissions, (data) => {
  const result = data.reduce((acc, item) => {
    acc[item.key] = item.state;
    return acc;
  }, {} as PlayerPermission);

  emit('update', result);
}, {
  deep: true,
  /** 掛載時即回報當前權限：非 iOS 裝置體感預設為 granted 且永不變動，
   *  若不立即送出，host 將永遠收不到權限而誤判玩家未授權 */
  immediate: true,
});
</script>

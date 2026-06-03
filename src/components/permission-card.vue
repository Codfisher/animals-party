<template>
  <div class="bg-white rounded-2xl overflow-hidden">
    <div class="relative bg-teal-500 text-white overflow-hidden p-4">
      <div class=" text-4xl  font-bold">
        Web API 授權清單
      </div>
      <div class="text-2xl flex flex-col gap-2 mt-4">
        <div>
          當狀態為 <UIcon name="i-material-symbols-info" /> 時，點擊對應項目進行授權
        </div>
        <div>
          若狀態為 <UIcon name="i-material-symbols-cancel" /> 時，請在瀏覽器設定中允許對應 API 權限
        </div>
      </div>

      <base-polygon
        opacity="0.1"
        size="20rem"
        class=" absolute -top-[13rem] -right-[3rem]"
        rotate="60deg"
        shape="pentagon"
      />
    </div>

    <div class="relative overflow-hidden p-4 flex flex-col gap-2">
      <UButton
        v-for="permission in permissions"
        :key="permission.key"
        block
        color="neutral"
        variant="ghost"
        class="justify-start items-center gap-4 p-3 text-left"
        @click="permission.onClick"
      >
        <UAvatar
          size="lg"
          class="bg-neutral-400! text-white"
          :icon="permission.icon"
        />

        <div class="flex-1">
          <div class=" text-3xl">
            {{ permission.label }}
          </div>
          <div class=" text-2xl">
            {{ permission.caption }}
          </div>
        </div>

        <UIcon
          :name="permission.stateInfo.icon"
          :class="permission.stateInfo.color"
        />
      </UButton>

      <base-polygon
        opacity="0.1"
        size="22rem"
        class=" absolute -bottom-[13rem] -left-[3rem]"
        rotate="60deg"
        color="#AAA"
        shape="round"
        fill="spot"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePermission, refDefault, UsePermissionReturnWithControls, useVibrate } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { PlayerPermission, PlayerPermissionState } from '../types';

import BasePolygon from './base-polygon.vue';

const emit = defineEmits<{
  (e: 'update', data: PlayerPermission): void;
}>();

const gyroscopePermission = usePermission('gyroscope', { controls: true });
/** 如果 state 為 undefined 就為 not-support */
const gyroscopeState = refDefault(gyroscopePermission.state, 'not-support');

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
    icon: 'i-material-symbols-check-circle',
    color: 'text-green-500',
    description: '已同意',
  },
  'denied': {
    icon: 'i-material-symbols-cancel',
    color: 'text-orange-600',
    description: '授權被拒絕',
  },
  'prompt': {
    icon: 'i-material-symbols-info',
    color: 'text-cyan-500',
    description: '等待授權',
  },
  'not-support': {
    icon: 'i-material-symbols-help',
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
    icon: 'i-material-symbols-screen-rotation-alt',
    label: '陀螺儀',
    caption: '可以偵測手機旋轉角度，通常用於體感遊戲',
    state: gyroscopeState.value,
    stateInfo: getStateInfo(gyroscopeState.value),
    onClick: gyroscopePermission.query,
  },
  {
    key: 'vibrate',
    icon: 'i-material-symbols-vibration',
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
});
</script>

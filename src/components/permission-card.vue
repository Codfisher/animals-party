<template>
  <q-card>
    <q-card-section class=" relative bg-teal-5 text-white overflow-hidden">
      <div class=" text-4xl  font-bold">
        Web API 授權清單
      </div>
      <div class="text-2xl flex flex-col gap-2 mt-4">
        <div>
          當狀態為 <q-icon name="info" /> 時，點擊對應項目進行授權
        </div>
        <div>
          若狀態為 <q-icon name="cancel" /> 時，請在瀏覽器設定中允許對應 API 權限
        </div>
      </div>

      <base-polygon
        opacity="0.1"
        size="20rem"
        class=" absolute -top-[13rem] -right-[3rem]"
        rotate="60deg"
        shape="pentagon"
      />
    </q-card-section>

    <q-card-section class=" relative overflow-hidden">
      <q-list>
        <q-item
          v-for="permission in permissions"
          :key="permission.key"
          v-ripple
          clickable
          @click="permission.onClick"
        >
          <q-item-section
            avatar
            top
          >
            <q-avatar
              :icon="permission.icon"
              color="grey"
              text-color="white"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label class=" text-3xl">
              {{ permission.label }}
            </q-item-label>
            <q-item-label class=" text-2xl">
              {{ permission.caption }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-icon
              :name="permission.stateInfo.icon"
              :color="permission.stateInfo.color"
            />
          </q-item-section>
        </q-item>
      </q-list>

      <base-polygon
        opacity="0.1"
        size="22rem"
        class=" absolute -bottom-[13rem] -left-[3rem]"
        rotate="60deg"
        color="#AAA"
        shape="round"
        fill="spot"
      />
    </q-card-section>
  </q-card>
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
    icon: 'check_circle',
    color: 'green',
    description: '已同意',
  },
  'denied': {
    icon: 'cancel',
    color: 'deep-orange',
    description: '授權被拒絕',
  },
  'prompt': {
    icon: 'info',
    color: 'cyan',
    description: '等待授權',
  },
  'not-support': {
    icon: 'help',
    color: 'grey',
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
    icon: 'screen_rotation_alt',
    label: '陀螺儀',
    caption: '可以偵測手機旋轉角度，通常用於體感遊戲',
    state: gyroscopeState.value,
    stateInfo: getStateInfo(gyroscopeState.value),
    onClick: gyroscopePermission.query,
  },
  {
    key: 'vibrate',
    icon: 'vibration',
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

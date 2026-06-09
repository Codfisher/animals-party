<template>
  <player-gamepad-container>
    <gamepad-d-pad
      class="absolute bottom-5 left-8 opacity-90"
      @trigger="({ keyName, status }) => handleBtnTrigger(keyName, status)"
    />
    <gamepad-btn
      class="absolute bottom-10 right-10 opacity-90"
      size="2rem"
      icon="material-symbols:done"
      @trigger="(status) => handleBtnTrigger('confirm', status)"
    />

    <gamepad-btn
      class="absolute top-10 right-10 opacity-90"
      size="2rem"
      icon="material-symbols:api"
      @click="openPermissionCard()"
    />

    <UModal v-model:open="permissionCardVisible" class="bg-transparent shadow-none ring-0">
      <template #content>
        <permission-card />
      </template>
    </UModal>
  </player-gamepad-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { isEqual } from 'lodash-es';
import { useVibrate } from '@vueuse/core';
import { KeyName, PlayerPermission } from '../../types';

import PlayerGamepadContainer from '../../components/player-gamepad-container.vue';
import GamepadBtn from '../../components/gamepad-btn.vue';
import GamepadDPad from '../../components/gamepad-d-pad.vue';
import PermissionCard from '../../components/permission-card.vue';

import { useLoading } from '../../composables/use-loading';
import { useClientPlayer } from '../../composables/use-client-player';
import { useMotionPermission } from '../../composables/use-motion-permission';
import { useMainStore } from '../../stores/main.store';
import { useGameConsoleStore } from '../../stores/game-console.store';

const loading = useLoading();
const mainStore = useMainStore();
const gameConsoleStore = useGameConsoleStore();
const { emitGamepadData, emitProfile } = useClientPlayer();

function handleBtnTrigger(keyName: `${KeyName}`, status: boolean) {
  emitGamepadData([
    {
      name: keyName,
      value: status,
    },
  ]);
}

const permissionCardVisible = ref(false);
function openPermissionCard() {
  permissionCardVisible.value = true;
}

const motionPermission = useMotionPermission();
const { isSupported: vibrateSupported } = useVibrate();

/** 本機完整權限狀態（體感 + 震動）。
 *  直接由權限來源計算，不依賴權限卡是否掛載，
 *  確保非 iOS（體感預設 granted、權限卡不會自動開啟）也能可靠回報 host。 */
const playerPermission = computed<PlayerPermission>(() => ({
  gyroscope: motionPermission.state.value,
  vibrate: vibrateSupported.value ? 'granted' : 'not-support',
}));

/** 是否缺少權限：體感支援但尚未授權（prompt）或被拒（denied）。
 *  granted／not-support 不算缺少；震動權限無需顯式授權，故不納入判斷。 */
const permissionMissing = computed(() =>
  ['prompt', 'denied'].includes(motionPermission.state.value),
);

/** profile 重送間隔與最長重試時間（毫秒） */
const PROFILE_RETRY_INTERVAL = 600;
const PROFILE_RETRY_DURATION = 8000;

let profileRetryTimer: ReturnType<typeof setTimeout> | undefined;
let profileRetryUntil = 0;

/** host 廣播的玩家清單已含我目前權限，視為已送達 */
function profileDelivered() {
  const me = gameConsoleStore.players.find((player) => player.clientId === mainStore.clientId);
  return !!me?.permission && isEqual(me.permission, playerPermission.value);
}

function stopProfileRetry() {
  if (!profileRetryTimer) return;
  clearTimeout(profileRetryTimer);
  profileRetryTimer = undefined;
}

/** 持續送出 profile 直到 host 回傳的玩家清單確認收到。
 *  data channel 剛 open 時單次送出可能遺失（過去靠除錯 log 的同步延遲意外閃避），
 *  改以「重送至確認」確保權限可靠送達，host 收到後會回流玩家清單而自動停止。 */
function pumpProfile() {
  stopProfileRetry();

  if (!mainStore.clientConnected) return; // 等連線 open，clientConnected 變動會再觸發
  if (profileDelivered()) return; // host 已確認收到
  if (Date.now() > profileRetryUntil) return; // 超過時限放棄，避免極端情況無限重送

  emitProfile({ permission: playerPermission.value }).catch(() => undefined);
  profileRetryTimer = setTimeout(pumpProfile, PROFILE_RETRY_INTERVAL);
}

/** 連線狀態、權限或玩家清單變動時重置重試時限並嘗試送達 */
watch(
  () => [mainStore.clientConnected, playerPermission.value, gameConsoleStore.players] as const,
  () => {
    profileRetryUntil = Date.now() + PROFILE_RETRY_DURATION;
    pumpProfile();
  },
  { immediate: true },
);

onBeforeUnmount(stopProfileRetry);

onMounted(() => {
  loading.hide();

  /** 僅在缺少權限時自動開啟授權清單，避免每次進頁面都跳出 */
  if (permissionMissing.value) {
    openPermissionCard();
  }
});
</script>

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
        <permission-card @update="handlePermission" />
      </template>
    </UModal>
  </player-gamepad-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { isEqual } from 'lodash-es';
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

/** 是否缺少權限：體感支援但尚未授權（prompt）或被拒（denied）。
 *  granted／not-support 不算缺少；震動權限無需顯式授權，故不納入判斷。 */
const motionPermission = useMotionPermission();
const permissionMissing = computed(() =>
  ['prompt', 'denied'].includes(motionPermission.state.value),
);

/** 最新權限狀態。權限卡掛載時即回報，但此時連線可能尚未 open。 */
const latestPermission = ref<PlayerPermission>();

function handlePermission(permission: PlayerPermission) {
  latestPermission.value = permission;
}

/** 嘗試送出 profile：權限已知，且 host 端尚未有相同權限時才送。
 *  以 host 廣播的玩家清單作為「是否已送達」依據，避免廣播回流造成無限重送。 */
function trySendProfile() {
  const permission = latestPermission.value;
  if (!permission) return;

  /** host 已記錄我目前的權限，視為已送達，不再重送 */
  const me = gameConsoleStore.players.find((player) => player.clientId === mainStore.clientId);
  if (me?.permission && isEqual(me.permission, permission)) return;

  emitProfile({ permission }).catch(() => undefined);
}

/** 多重來源驅動送出，確保 profile 可靠送達 host：
 *  - clientConnected：連線真正 open 時
 *  - latestPermission：取得或變更權限時
 *  - players：收到 host 廣播的玩家清單（代表連線確實可用）時
 *  收到玩家清單即可證明連線通暢，是最可靠的補送時機；
 *  搭配 trySendProfile 內的去重判斷，host 一旦收到就會停止重送。 */
watch(
  () => [mainStore.clientConnected, latestPermission.value, gameConsoleStore.players] as const,
  () => trySendProfile(),
  { immediate: true },
);

onMounted(() => {
  loading.hide();

  /** 僅在缺少權限時自動開啟授權清單，避免每次進頁面都跳出 */
  if (permissionMissing.value) {
    openPermissionCard();
  }
});
</script>

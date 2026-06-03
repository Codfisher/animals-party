<template>
  <player-gamepad-container>
    <gamepad-d-pad
      class="absolute bottom-5 left-8 opacity-90"
      @trigger="({ keyName, status }) => handleBtnTrigger(keyName, status)"
    />
    <gamepad-btn
      class="absolute bottom-10 right-10 opacity-90"
      size="6rem"
      icon="done"
      @trigger="(status) => handleBtnTrigger('confirm', status)"
    />

    <gamepad-btn
      class="absolute top-10 right-10 opacity-90"
      size="4rem"
      icon="api"
      @click="openPermissionCard()"
    />

    <q-dialog v-model="permissionCardVisible">
      <permission-card @update="handlePermission" />
    </q-dialog>
  </player-gamepad-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { KeyName, PlayerPermission } from '../types';

import PlayerGamepadContainer from '../components/player-gamepad-container.vue';
import GamepadBtn from '../components/gamepad-btn.vue';
import GamepadDPad from '../components/gamepad-d-pad.vue';
import PermissionCard from '../components/permission-card.vue';

import { useLoading } from '../composables/use-loading';
import { useClientPlayer } from '../composables/use-client-player';

const loading = useLoading();
const {
  emitGamepadData, emitProfile
} = useClientPlayer();

function handleBtnTrigger(keyName: `${KeyName}`, status: boolean) {
  emitGamepadData([{
    name: keyName,
    value: status,
  }]);
}

const permissionCardVisible = ref(true);
function openPermissionCard() {
  permissionCardVisible.value = true;
}

function handlePermission(permission: PlayerPermission) {
  emitProfile({ permission });
}

onMounted(() => {
  loading.hide();
});
</script>

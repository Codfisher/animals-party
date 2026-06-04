<template>
  <router-view />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useLoading } from '../composables/use-loading';
import { useGameConsoleStore } from '../stores/game-console.store';
import { useMainStore } from '../stores/main.store';
import { useClientGameConsole } from '../composables/use-client-game-console';

const loading = useLoading();
const router = useRouter();
const gameConsoleStore = useGameConsoleStore();
const mainStore = useMainStore();
const gameConsole = useClientGameConsole();

function init() {
  // 房號不存在，或主機連線已失效（例如重新整理，host peer 無法復原），清除房號並回首頁
  if (!gameConsoleStore.roomId || !mainStore.host?.connected) {
    gameConsoleStore.clearRoomId();
    router.push({
      name: '/home',
    });
    loading.hide();
    return;
  }

  gameConsole.onPlayerUpdate((players) => {
    gameConsoleStore.updateState({ players });
  });
  gameConsole.onProfileUpdate((player) => {
    gameConsoleStore.updateProfile(player);
  });

  // 跳轉至遊戲大廳
  router.push({
    name: '/game-console/lobby',
  });
}
init();
</script>

<style scoped lang="sass"></style>

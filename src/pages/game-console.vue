<template>
  <router-view />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useLoading } from '../composables/use-loading';
import { useGameConsoleStore } from '../stores/game-console.store';
import { useClientGameConsole } from '../composables/use-client-game-console';

const loading = useLoading();
const router = useRouter();
const gameConsoleStore = useGameConsoleStore();
const gameConsole = useClientGameConsole();

function init() {
  // 房間 ID 不存在，跳回首頁
  if (!gameConsoleStore.roomId) {
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

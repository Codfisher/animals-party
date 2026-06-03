<template>
  <transition-group
    tag="div"
    class=" overflow-hidden px-10 pointer-events-none"
    name="avatar"
  >
    <player-list-avatar
      v-for="player, i in players"
      ref="playerRefs"
      :key="player.clientId"
      :player="player"
      :code-name="`${i + 1}P`"
    />
  </transition-group>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';

import PlayerListAvatar from './player-list-avatar.vue';

import { useGameConsoleStore } from '../stores/game-console.store';
import { useClientGameConsole } from '../composables/use-client-game-console';

const gameConsole = useClientGameConsole();
const gameConsoleStore = useGameConsoleStore();
const { players } = storeToRefs(gameConsoleStore);

const playerRefs = ref<InstanceType<typeof PlayerListAvatar>[]>([]);

gameConsole.onGamepadData((data) => {
  const lastDatum = data.keys.at(-1);
  if (!lastDatum || lastDatum.value) return;

  const targetPlayer = playerRefs.value.find(({ playerId }) => playerId === data.playerId);
  if (!targetPlayer) return;

  targetPlayer.showBalloon(lastDatum.name);
});
</script>

<style scoped lang="sass">
</style>

<template>
  <div
    v-if="dataUrl"
    class="qr-card"
  >
    <img
      :src="dataUrl"
      class="qr-image"
      alt="房間 QR Code"
    >
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode';
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameConsoleStore } from '../stores/game-console.store';

const gameConsoleStore = useGameConsoleStore();
const { roomId } = storeToRefs(gameConsoleStore);

const dataUrl = ref('');

watch(roomId, async (id) => {
  if (!id) {
    dataUrl.value = '';
    return;
  }

  dataUrl.value = await QRCode.toDataURL(id, {
    margin: 2,
    width: 320,
    color: {
      dark: '#2a3832',
      light: '#ffffff',
    },
  });
}, { immediate: true });
</script>

<style scoped lang="sass">
.qr-card
  padding: 1.4rem
  border-radius: 2rem
  background: white
  box-shadow: 0 8px 24px rgba(#1d3e57, 0.25)

.qr-image
  display: block
  width: 16rem
  height: 16rem
</style>

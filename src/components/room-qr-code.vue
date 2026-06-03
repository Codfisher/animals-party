<template>
  <div class="qr-card flex flex-col items-center gap-5">
    <div class="qr-frame">
      <img
        v-if="dataUrl"
        :src="dataUrl"
        class="qr-image"
        alt="房間 QR Code"
      >
      <div
        v-else
        class="qr-image qr-placeholder"
      />
    </div>

    <div
      v-if="roomId"
      class="room-id relative flex items-center gap-5"
    >
      <base-polygon
        size="1rem"
        shape="pentagon"
        fill="solid"
        color="#3676a3"
        opacity="0.9"
        class="polygon"
      />
      {{ roomId }}
      <base-polygon
        size="1rem"
        shape="pentagon"
        fill="solid"
        color="#3676a3"
        opacity="0.9"
        class="polygon"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode';
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameConsoleStore } from '../stores/game-console.store';

import BasePolygon from './base-polygon.vue';

const gameConsoleStore = useGameConsoleStore();
const { roomId } = storeToRefs(gameConsoleStore);

const dataUrl = ref('');

watch(roomId, async (id) => {
  if (!id) {
    dataUrl.value = '';
    return;
  }

  dataUrl.value = await QRCode.toDataURL(id, {
    // 房號僅 6 碼，用最低錯誤更正等級即可，模組更少、圖樣更簡潔
    errorCorrectionLevel: 'L',
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
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch&display=swap')

.qr-card
  padding: 1.4rem
  border-radius: 2rem
  background: white
  box-shadow: 0 8px 24px rgba(#1d3e57, 0.25)

.qr-image
  display: block
  width: 16rem
  height: 16rem

.qr-placeholder
  border-radius: 1rem
  background: rgba(#2a3832, 0.06)

.room-id
  color: #2a3832
  font-size: 1.8rem
  font-weight: 700
  font-family: 'Chakra Petch', sans-serif
  letter-spacing: 3px

.polygon
  animation: polygon 3s infinite linear
  margin-top: -4px

@keyframes polygon
  0%
    transform: rotate(0deg)
    transform-origin: 50% 60%
  100%
    transform: rotate(360deg)
</style>

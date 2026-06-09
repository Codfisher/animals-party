<template>
  <div class="qr-card flex flex-col items-center">
    <div class="qr-frame relative">
      <img
        v-if="dataUrl"
        :src="dataUrl"
        class="qr-image"
        alt="房間 QR Code"
      />
      <div
        v-else
        class="qr-image qr-placeholder"
      />

      <div
        v-if="roomId"
        class="room-id absolute inset-0 flex items-center justify-center"
      >
        <div class="room-id-badge">
          <span class="room-id-text">{{ roomId }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode';
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameConsoleStore } from '../stores/game-console.store';
import { buildRoomJoinUrl } from '../common/room-url';

const gameConsoleStore = useGameConsoleStore();
const { roomId } = storeToRefs(gameConsoleStore);

const dataUrl = ref('');

watch(
  roomId,
  async (id) => {
    if (!id) {
      dataUrl.value = '';
      return;
    }

    // 編碼完整加入網址，玩家用手機相機掃描後即可直接開啟並自動加入
    dataUrl.value = await QRCode.toDataURL(buildRoomJoinUrl(id), {
      // 房號疊在 QR 中央會遮住模組，需最高容錯等級維持可掃描
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#2a3832',
        light: '#ffffff',
      },
    });
  },
  { immediate: true },
);
</script>

<style scoped lang="sass">
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch&display=swap')

.qr-card
  padding: 0.75rem
  border-radius: 2rem
  background: white
  box-shadow: 0 8px 24px rgba(#1d3e57, 0.25)

.qr-frame
  border-radius: 1rem

.qr-image
  display: block
  width: 16rem
  height: 16rem

.qr-placeholder
  border-radius: 1rem
  background: rgba(#2a3832, 0.06)

.room-id-badge
  padding: 0.25rem 0.5rem
  border-radius: 1rem
  background: #2a3832

.room-id-text
  color: white
  font-size: 1.7rem
  font-weight: 700
  font-family: 'Chakra Petch', sans-serif
  letter-spacing: 3px
  line-height: 1
</style>

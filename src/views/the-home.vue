<template>
  <background-polygons-floating class="absolute inset-0" />

  <div class="absolute inset-0 flex flex-col md:flex-row justify-center items-center content-center gap-16 md:gap-32">
    <title-logo />

    <div class="flex flex-col flex-center gap-10 md:gap-20">
      <base-btn
        v-slot="{ hover }"
        label="建立派對"
        label-hover-color="#ff9a1f"
        stroke-color="#856639"
        stroke-hover-color="white"
        class="w-72 sm:w-80 md:w-[28rem]"
        @click="startParty"
      >
        <div
          class="btn-content absolute inset-0"
          :class="{ 'hover': hover }"
        >
          <base-polygon
            class="absolute btn-polygon-lt"
            size="13rem"
            shape="round"
            fill="spot"
            opacity="0.6"
          />

          <UIcon
            name="i-material-symbols-sports-esports"
            class="absolute game-icon text-white text-[5rem] md:text-[8rem]"
          />
        </div>
      </base-btn>

      <base-btn
        v-slot="{ hover }"
        label="加入遊戲"
        label-hover-color="#ff9a1f"
        stroke-color="#856639"
        stroke-hover-color="white"
        class="w-72 sm:w-80 md:w-[28rem]"
        @click="joinGame"
      >
        <div
          class="btn-content absolute inset-0"
          :class="{ 'hover': hover }"
        >
          <base-polygon
            class="absolute btn-polygon-lt"
            size="13rem"
            rotate="144deg"
            shape="pentagon"
            opacity="0.6"
          />
          <UIcon
            name="i-material-symbols-person-add"
            class="absolute join-icon text-white text-[5rem] md:text-[7.8rem]"
          />
        </div>
      </base-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouteName } from '../router/router';
import to from 'await-to-js';
import { onMounted } from 'vue';

import BackgroundPolygonsFloating from '../components/background-polygons-floating.vue';
import BaseBtn from '../components/base-btn.vue';
import BasePolygon from '../components/base-polygon.vue';
import TitleLogo from '../components/title-logo.vue';
import DialogJoinGame from '../components/dialog-join-game.vue';

import { useLoading } from '../composables/use-loading';
import { useRouter } from 'vue-router';
import { useClientGameConsole } from '../composables/use-client-game-console';

const gameConsole = useClientGameConsole();
const loading = useLoading();
const router = useRouter();
const toast = useToast();
const overlay = useOverlay();
const joinGameModal = overlay.create(DialogJoinGame);

async function startParty() {
  await loading.show();

  const [err, room] = await to(gameConsole.startParty());
  if (err) {
    console.error(`[ startParty ] err : `, err);
    toast.add({
      color: 'error',
      title: '建立派對失敗，請吸嗨後再度嘗試'
    });
    loading.hide();
    return;
  }

  console.log(`roomId : `, room.id);

  router.push({
    name: RouteName.GAME_CONSOLE
  });
}
async function joinGame() {
  const joined = await joinGameModal.open();
  if (!joined) {
    return;
  }

  await loading.show();

  router.push({
    name: RouteName.PLAYER_GAMEPAD
  });
}

onMounted(() => {
  loading.hide();
});
loading.hide();
</script>

<style scoped lang="sass">
.btn-polygon-lt
  left: 0
  top: 0
  transform: translate(-50%, -60%)

.game-icon
  right: 0
  bottom: 0
  transform: translate(12%, 24%) rotate(-10deg)
  opacity: 0.6
.join-icon
  right: 0
  bottom: 0
  transform: translate(6%, 20%) rotate(-10deg)
  opacity: 0.6

.btn-content
  transform: scale(1)
  transition-duration: 0.4s
  transition-timing-function: cubic-bezier(0.545, 1.650, 0.520, 1.305)
  &.hover
    transform: scale(0.96) rotate(-2deg)
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)
</style>

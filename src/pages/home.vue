<template>
  <div class="home-page relative h-dvh w-full overflow-y-auto">
    <background-polygons-floating class="fixed inset-0 -z-10" />

    <UButton
      to="https://codlin.me"
      target="_blank"
      icon="ph:fish-simple-bold"
      label="關於我"
      size="lg"
      class="fixed top-4 right-8 z-20 rounded-full bg-white/80 text-[#856639] shadow-md backdrop-blur transition-colors hover:bg-white"
    />

    <section
      class="hero relative min-h-[95dvh] flex flex-col md:flex-row justify-center items-center content-center gap-16 md:gap-32"
    >
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
              name="material-symbols:sports-esports"
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
              name="material-symbols:person-add"
              class="absolute join-icon text-white text-[5rem] md:text-[7.8rem]"
            />
          </div>
        </base-btn>
      </div>
    </section>

    <section class="support-section relative w-full flex justify-center px-4 py-8 min-h-48 overflow-hidden bg-white/10">
      <base-polygon
        class="absolute support-polygon-lt z-0"
        size="10rem"
        shape="round"
        fill="spot"
        color="white"
        :opacity="0.25"
      />
      <base-polygon
        class="absolute support-polygon-rb z-0"
        size="14rem"
        rotate="30deg"
        shape="pentagon"
        fill="fence"
        color="white"
        :opacity="0.22"
      />
      <base-polygon
        class="absolute support-polygon-lb z-0"
        size="7rem"
        rotate="18deg"
        shape="triangle"
        fill="fence"
        color="white"
        :opacity="0.22"
      />
      <base-polygon
        class="absolute support-polygon-rt z-0"
        size="8rem"
        rotate="-12deg"
        shape="square"
        fill="spot"
        color="white"
        :opacity="0.23"
      />
      <base-polygon
        class="absolute support-polygon-ml z-0"
        size="5rem"
        shape="round"
        fill="fence"
        color="white"
        :opacity="0.2"
      />
      <base-polygon
        class="absolute support-polygon-mr z-0"
        size="6rem"
        rotate="40deg"
        shape="pentagon"
        fill="spot"
        color="white"
        :opacity="0.2"
      />

      <p
        class="support-message absolute inset-0 z-10 flex flex-center text-center px-4 text-white font-medium drop-shadow text-xl pointer-events-none">
        順手開廣告，支持好內容 (*´∀`)~♥
      </p>

      <google-adsense
        client="ca-pub-6608581811170481"
        slot="9242930193"
        class="relative z-20 w-full max-w-3xl"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import to from 'await-to-js';
import { onMounted } from 'vue';
import { useWindowSize } from '@vueuse/core';

import BackgroundPolygonsFloating from '../components/background-polygons-floating.vue';
import BaseBtn from '../components/base-btn.vue';
import BasePolygon from '../components/base-polygon.vue';
import TitleLogo from '../components/title-logo.vue';
import GoogleAdsense from '../components/google-adsense.vue';
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

const { width: windowWidth } = useWindowSize();
/** 主機畫面需要足夠寬度，低於此值禁止建立派對（md 斷點） */
const MIN_PARTY_WIDTH = 768;

async function startParty() {
  if (windowWidth.value < MIN_PARTY_WIDTH) {
    toast.add({
      color: 'warning',
      title: '畫面太窄囉 ԅ( ˘ω˘ԅ)',
      description: '建立派對需要更寬的畫面，請改用電腦或平板'
    });
    return;
  }

  await loading.show();

  const [err, room] = await to(gameConsole.startParty());
  if (err) {
    console.error(`[ startParty ] err : `, err);
    toast.add({
      color: 'error',
      title: '建立派對失敗，請吸嗨後再度嘗試 (;´༎ຶД༎ຶ`)'
    });
    loading.hide();
    return;
  }

  console.log(`roomId : `, room.id);

  router.push({
    name: '/game-console'
  });
}
async function joinGame() {
  const joined = await joinGameModal.open();
  if (!joined) {
    return;
  }

  await loading.show();

  router.push({
    name: '/player-gamepad'
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

.support-polygon-lt
  left: 0
  top: 0
  transform: translate(-30%, -45%)
.support-polygon-rb
  right: 0
  bottom: 0
  transform: translate(30%, 45%)
.support-polygon-lb
  left: 12%
  bottom: 0
  transform: translate(0, 50%)
.support-polygon-rt
  right: 14%
  top: 0
  transform: translate(0, -50%)
.support-polygon-ml
  left: 28%
  top: 50%
  transform: translate(-50%, -50%)
.support-polygon-mr
  right: 26%
  top: 45%
  transform: translate(50%, -50%)

.btn-content
  transform: scale(1)
  transition-duration: 0.4s
  transition-timing-function: cubic-bezier(0.545, 1.650, 0.520, 1.305)
  &.hover
    transform: scale(0.96) rotate(-2deg)
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)
</style>

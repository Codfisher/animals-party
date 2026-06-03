<template>
  <router-view />
  <loading-overlay />
</template>

<script setup lang="ts">
import LoadingOverlay from './components/loading-overlay.vue';
import GameMenu from './components/game-menu.vue';
import { useMeta } from 'quasar';

useMeta({
  title: 'Animals Party',
  titleTemplate(title) {
    return `${title} v${import.meta.env.PACKAGE_VERSION}`;
  },
});
</script>

<style lang="sass">
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@100;300;400;500;700;900&display=swap')
@import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap')

html, body, #app
  width: 100%
  height: 100%
  padding: 0
  margin: 0
  font-family: 'Noto Sans TC', sans-serif

#app
  display: flex
  flex-direction: column

html
  font-size: 1.71vmin

  @media screen and (orientation: portrait) and (max-width: 360px)
    font-size: 6px
  @media screen and (orientation: portrait) and (min-width: 1200px)
    font-size: 30px
</style>

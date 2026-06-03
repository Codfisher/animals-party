<template>
  <UApp>
    <router-view />
    <loading-overlay />
    <effects-overlay />

    <div class="absolute bottom-2 right-2 text-xs text-white opacity-20">
      v{{ version }}
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue';
import LoadingOverlay from './components/loading-overlay.vue';
import EffectsOverlay from './components/effects-overlay.vue';
import { version } from './../package.json';

useHead({
  title: `Animals Party`,
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
</style>

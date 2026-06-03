<template>
  <UApp>
    <router-view />
    <loading-overlay />
  </UApp>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue';
import LoadingOverlay from './components/loading-overlay.vue';

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

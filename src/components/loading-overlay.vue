<template>
  <transition-mask
    v-model="isLoading"
    class="absolute inset-0"
    @update="handleUpdate"
  >
    <background-loading-jumping-polygon class="absolute inset-0" />
  </transition-mask>
</template>

<script setup lang="ts">
import { } from 'vue';
import { useLoading } from '../composables/use-loading';

import BackgroundLoadingJumpingPolygon from './background-loading-jumping-polygon.vue';
import TransitionMask from './transition-mask.vue';

const { isLoading, handleUpdate } = useLoading();
</script>
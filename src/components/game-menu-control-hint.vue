<template>
  <div
    class="control-hint relative overflow-hidden rounded-2xl bg-black/35 px-5 py-4 text-white backdrop-blur-sm select-none"
  >
    <div class="polygon-lt absolute">
      <base-polygon
        size="9rem"
        shape="round"
        fill="spot"
        color="white"
        opacity="0.12"
      />
    </div>
    <div class="polygon-rb absolute">
      <base-polygon
        size="8rem"
        shape="square"
        fill="fence"
        color="white"
        opacity="0.1"
      />
    </div>

    <div class="relative z-0 flex flex-col gap-3">
      <p class="text-center text-base font-bold tracking-widest opacity-80">手機搖桿操作</p>

      <div
        v-for="hint in hintList"
        :key="hint.label"
        class="flex items-center gap-3"
      >
        <div class="flex gap-1.5">
          <span
            v-for="icon in hint.iconList"
            :key="icon"
            class="key-cap rounded-full inline-flex items-center justify-center bg-neutral-900"
          >
            <UIcon
              :name="icon"
              class="size-6"
            />
          </span>
        </div>

        <span class="text-lg font-medium whitespace-nowrap">{{ hint.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BasePolygon from './base-polygon.vue';

interface ControlHint {
  /** 對應實際搖桿按鍵的圖示 */
  iconList: string[];
  label: string;
}

const hintList: ControlHint[] = [
  {
    iconList: ['material-symbols:arrow-drop-up', 'material-symbols:arrow-drop-down'],
    label: '切換選單按鈕',
  },
  {
    iconList: ['material-symbols:arrow-left', 'material-symbols:arrow-right'],
    label: '切換遊戲',
  },
  {
    iconList: ['material-symbols:done'],
    label: '確認',
  },
];
</script>

<style scoped lang="sass">
.key-cap
  width: 2.4rem
  height: 2.4rem

.polygon-lt
  left: -3rem
  top: -3rem
  animation: polygon-rotate 50s infinite linear
.polygon-rb
  right: -3rem
  bottom: -3rem
  animation: polygon-rotate 40s infinite linear

@keyframes polygon-rotate
  0%
    transform: rotate(0deg)
  100%
    transform: rotate(360deg)
</style>

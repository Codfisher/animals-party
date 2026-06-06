<template>
  <div
    class="control-hint flex flex-col gap-3 rounded-2xl bg-black/35 px-5 py-4 text-white backdrop-blur-sm select-none"
  >
    <p class="text-center text-base font-bold tracking-widest opacity-80">搖桿操作</p>

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
</template>

<script setup lang="ts">
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
</style>

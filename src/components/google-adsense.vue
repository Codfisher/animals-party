<template>
  <ins
    ref="insRef"
    class="adsbygoogle block w-full"
    :style="insStyle"
    :data-ad-client="client"
    :data-ad-slot="slot"
    :data-ad-format="height ? undefined : format"
    :data-full-width-responsive="height ? undefined : fullWidthResponsive"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface Props {
  /** 發布商 ID，格式 ca-pub-XXXXXXXXXXXXXXXX */
  client: string;
  /** 廣告版位 ID */
  slot: string;
  /** 廣告格式 */
  format?: string;
  /** 是否啟用全寬度響應式 */
  fullWidthResponsive?: boolean;
  /** 最小高度（px），避免未填充時版面塌陷 */
  minHeight?: number;
  /** 固定高度（px）。設定後採固定高度模式：滿寬、固定高，
   *  且不帶 data-ad-format／data-full-width-responsive，
   *  AdSense 不會沿祖先鏈清除高度限制，可控制版位高度不超框 */
  height?: number;
}
const props = withDefaults(defineProps<Props>(), {
  format: 'auto',
  fullWidthResponsive: true,
  minHeight: 100,
  height: undefined,
});

/** 固定高度模式給定高、滿寬；否則用 minHeight 佔位避免塌陷 */
const insStyle = computed(() =>
  props.height
    ? { display: 'block', width: '100%', height: `${props.height}px` }
    : { minHeight: `${props.minHeight}px` },
);

const insRef = useTemplateRef<HTMLElement>('insRef');

onMounted(() => {
  // 等 DOM 掛載後再請求廣告，避免 loader 尚未就緒
  if (!insRef.value) {
    return;
  }

  try {
    (window.adsbygoogle ??= []).push({});
  } catch (err) {
    console.error('[ google-adsense ] err : ', err);
  }
});
</script>

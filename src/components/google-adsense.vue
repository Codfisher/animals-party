<template>
  <ins
    ref="insRef"
    class="adsbygoogle block w-full"
    :data-ad-client="client"
    :data-ad-slot="slot"
    :data-ad-format="format"
    :data-full-width-responsive="fullWidthResponsive"
  />
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

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
}
withDefaults(defineProps<Props>(), {
  format: 'auto',
  fullWidthResponsive: true,
});

const insRef = useTemplateRef<HTMLElement>('insRef');

onMounted(() => {
  // 等 DOM 掛載後再請求廣告，避免 loader 尚未就緒
  if (!insRef.value) {
    return;
  }

  try {
    (window.adsbygoogle ??= []).push({});
  }
  catch (err) {
    console.error('[ google-adsense ] err : ', err);
  }
});
</script>

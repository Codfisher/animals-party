<template>
  <UModal
    class="bg-transparent shadow-none ring-0"
    @update:open="(value: boolean) => !value && emit('close', false)"
  >
    <template #content>
      <div class="card flex flex-col p-8 gap-8 md:p-20 md:gap-16 overflow-hidden">
        <base-polygon
          class=" absolute -left-32 -top-40 -z-10"
          size="20rem"
          rotate="30deg"
          opacity="0.6"
        />
        <base-polygon
          class=" absolute -right-[14rem] -bottom-[20rem] -z-10"
          size="30rem"
          shape="pentagon"
          fill="solid"
          rotate="-30deg"
          opacity="0.5"
        />

        <!-- 相機掃描區 -->
        <div class="scanner relative rounded-3xl overflow-hidden bg-black/80">
          <video
            ref="video"
            class="w-full h-full object-cover"
            muted
            playsinline
          />

          <!-- 相機無法使用時的提示 -->
          <div
            v-if="!cameraAvailable"
            class="absolute inset-0 flex flex-col flex-center gap-4 text-center text-white p-8"
          >
            <UIcon
              name="material-symbols:no-photography"
              class="text-[4rem]"
            />
            <div class="text-xl">
              無法使用相機，請改用下方輸入房號
            </div>
          </div>
        </div>

        <!-- 手動輸入房號退路 -->
        <div class="flex flex-col gap-6">
          <UInput
            v-model="targetRoomId"
            color="secondary"
            size="xl"
            placeholder="直接掃描或手動輸入房號"
            :ui="{ base: 'rounded-full text-center' }"
            @keyup.enter="handleSubmit"
          />
          <UButton
            block
            color="secondary"
            size="xl"
            class="relative p-4 md:p-7 rounded-full overflow-hidden justify-center"
            @click="handleSubmit"
          >
            加入
            <base-polygon
              class=" absolute -left-10 -top-16"
              size="8rem"
              opacity="0.7"
              rotate="45deg"
            />
            <UIcon
              class=" absolute -right-[0.5rem] -bottom-[1.5rem] -rotate-90 opacity-80 text-[4rem] md:text-[7.5rem]"
              name="material-symbols:celebration"
            />
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import to from 'await-to-js';
import QrScanner from 'qr-scanner';

import BasePolygon from './base-polygon.vue';

import { useClientPlayer } from '../composables/use-client-player';

const emit = defineEmits<{
  close: [joined: boolean];
}>();

const toast = useToast();
const player = useClientPlayer();

const targetRoomId = ref('');
const video = useTemplateRef<HTMLVideoElement>('video');
const cameraAvailable = ref(true);

let scanner: QrScanner | undefined;
/** 避免掃到後重複加入 */
let joining = false;

/**
 * video 在 UModal 內透過 Teleport 延遲掛載，onMounted 時可能尚未存在，
 * 因此改 watch ref，待元素就緒再啟動 scanner。
 */
watch(video, async (element) => {
  if (!element || scanner) return;

  const instance = new QrScanner(
    element,
    (result) => handleScan(result.data),
    { preferredCamera: 'environment', highlightScanRegion: true }
  );
  scanner = instance;

  const [err] = await to(instance.start());
  if (err) {
    cameraAvailable.value = false;
    console.error(`[ dialog-join-game ] 相機啟動失敗 : `, err);
  }
}, { immediate: true });

onBeforeUnmount(() => {
  scanner?.stop();
  scanner?.destroy();
  scanner = undefined;
});

function handleScan(hostId: string) {
  joinRoom(hostId);
}

function handleSubmit() {
  const hostId = targetRoomId.value.trim();
  if (!hostId) {
    toast.add({
      color: 'error',
      title: '請輸入房號 ლ(╹ε╹ლ)'
    });
    return;
  }

  joinRoom(hostId);
}

async function joinRoom(hostId: string) {
  if (joining) return;
  joining = true;

  // 停止掃描，避免持續觸發
  scanner?.stop();

  /** 產生 loading toast，duration 0 表示不自動關閉 */
  const loadingToast = toast.add({
    color: 'info',
    title: '加入房間中 =͟͟͞͞( •̀д•́)',
    duration: 0,
  });

  const [err, room] = await to(player.joinRoom(hostId));

  /** 關閉 loading toast */
  toast.remove(loadingToast.id);

  if (err) {
    joining = false;
    toast.add({
      color: 'error',
      title: `加入房間失敗 (╥ω╥\`): ${err?.message ?? err}`
    });
    console.error(`加入房間失敗 : `, err);

    // 失敗後若相機仍可用，重新開始掃描
    if (cameraAvailable.value) {
      scanner?.start();
    }
    return;
  }

  toast.add({
    color: 'success',
    title: `成功加入 ${room.id} 房間！✧⁑｡٩(ˊᗜˋ*)و✧⁕｡`
  });
  emit('close', true);
}
</script>

<style scoped lang="sass">
.card
  border-radius: 2.5rem !important
  background: rgba(white, 0.8)
  backdrop-filter: blur(8px)

.scanner
  width: 100%
  aspect-ratio: 1 / 1
</style>

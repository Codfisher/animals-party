<template>
  <q-dialog
    ref="dialogRef"
    class="rounded-5xl"
    @hide="onDialogHide"
  >
    <div class="card flex flex-col p-20 gap-16 overflow-hidden">
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

      <div class="text-5xl font-bold text-center text-[#2a3832]">
        掃描派對 QR Code
      </div>

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
          <q-icon
            name="no_photography"
            size="4rem"
          />
          <div class="text-xl">
            無法使用相機，請改用下方貼上房號
          </div>
        </div>
      </div>

      <!-- 手動貼上房號退路 -->
      <div class="flex flex-col gap-6">
        <div class="text-center text-2xl text-[#2a3832]/70">
          或貼上房號
        </div>
        <q-input
          v-model="targetRoomId"
          color="secondary"
          outlined
          rounded
          placeholder="貼上房號"
          input-class="text-center"
          @keyup.enter="handleSubmit"
        />
        <q-btn
          unelevated
          rounded
          color="secondary"
          class="p-7 overflow-hidden"
          label="加入"
          @click="handleSubmit"
        >
          <base-polygon
            class=" absolute -left-10 -top-16"
            size="8rem"
            opacity="0.7"
            rotate="45deg"
          />
          <q-icon
            class=" absolute -right-[1.4rem] -bottom-[2.6rem] -rotate-[90deg] opacity-80"
            size="7.5rem"
            name="celebration"
          />
        </q-btn>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import to from 'await-to-js';
import QrScanner from 'qr-scanner';

import BasePolygon from './base-polygon.vue';

import { useClientPlayer } from '../composables/use-client-player';

const {
  dialogRef, onDialogHide, onDialogOK, onDialogCancel
} = useDialogPluginComponent<string>()

const emit = defineEmits({
  ...useDialogPluginComponent.emitsObject
});

const $q = useQuasar();
const player = useClientPlayer();

const targetRoomId = ref('');
const video = ref<HTMLVideoElement>();
const cameraAvailable = ref(true);

let scanner: QrScanner | undefined;
/** 避免掃到後重複加入 */
let joining = false;

onMounted(async () => {
  if (!video.value) return;

  const instance = new QrScanner(
    video.value,
    (result) => handleScan(result.data),
    { preferredCamera: 'environment', highlightScanRegion: true }
  );
  scanner = instance;

  const [err] = await to(instance.start());
  if (err) {
    cameraAvailable.value = false;
    console.error(`[ dialog-join-game ] 相機啟動失敗 : `, err);
  }
});

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
    $q.notify({
      type: 'negative',
      message: '請貼上房號'
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

  /** 產生 loading notify */
  const notifyRef = $q.notify({
    type: 'ongoing',
    message: '加入房間中'
  });

  const [err, room] = await to(player.joinRoom(hostId));

  /** 關閉 notify */
  notifyRef();

  if (err) {
    joining = false;
    $q.notify({
      type: 'negative',
      message: `加入房間失敗 : ${err?.message ?? err}`
    });
    console.error(`加入房間失敗 : `, err);

    // 失敗後若相機仍可用，重新開始掃描
    if (cameraAvailable.value) {
      scanner?.start();
    }
    return;
  }

  $q.notify({
    type: 'positive',
    message: `加入 ${room.id} 房間成功`
  });
  onDialogOK();
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

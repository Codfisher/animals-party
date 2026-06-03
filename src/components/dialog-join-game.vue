<template>
  <q-dialog
    ref="dialogRef"
    class="rounded-5xl"
    @hide="onDialogHide"
  >
    <div class="card flex flex-col p-20 gap-20 overflow-hidden">
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
        輸入派對房間 ID
      </div>

      <q-input
        v-model="targetRoomId"
        type="number"
        color="secondary"
        outlined
        rounded
        placeholder="請輸入 6 位數字"
        input-class="text-center"
        @keyup.enter="submit"
      />

      <q-btn
        unelevated
        rounded
        color="secondary"
        class="p-7 overflow-hidden"
        label="加入"
        @click="submit"
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
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar } from 'quasar';
import { ref } from 'vue';
import to from 'await-to-js';

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

async function submit() {
  if (!/^[0-9]{6}$/.test(targetRoomId.value)) {
    $q.notify({
      type: 'negative',
      message: '請輸入 6 位數字'
    });
    return;
  }

  /** 產生 loading notify */
  const notifyRef = $q.notify({
    type: 'ongoing',
    message: '加入房間中'
  });

  const [err, room] = await to(player.joinRoom(targetRoomId.value));

  /** 關閉 notify */
  notifyRef();

  if (err) {
    $q.notify({
      type: 'negative',
      message: `加入房間失敗 : ${err?.message}`
    });
    console.error(`加入房間失敗 : `, err);
    return;
  }

  console.log(`[ joinRoom ] room : `, room);
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
</style>

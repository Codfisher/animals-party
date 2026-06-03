import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ClientSocket, ClientType } from '../types';
import { nanoid } from 'nanoid';
import { io } from 'socket.io-client';

export const useMainStore = defineStore('main', () => {
  /** 檢查 localStorage 是否有儲存 client id，沒有則產生 id */
  const savedId = localStorage.getItem(`animals-party:clientId`);
  const clientId = savedId ?? nanoid();
  localStorage.setItem(`animals-party:clientId`, clientId);

  const client = ref<ClientSocket>();
  const type = ref<`${ClientType}`>();

  function connect(clientType: `${ClientType}`) {
    // 已經存在
    if (client.value) {
      client.value.connect();
      return client.value;
    }

    // 建立連線，傳送 query data
    client.value = io({
      query: {
        clientId,
        type: clientType,
      },
    });
    type.value = clientType;

    return client.value;
  }

  function disconnect() {
    client.value?.disconnect();
  }

  return {
    clientId,
    client,
    type,

    connect,
    disconnect,
  }
})
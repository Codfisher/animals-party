import { defineStore } from 'pinia';
import { markRaw, ref, shallowRef } from 'vue';
import { nanoid } from 'nanoid';
import { ClientType, Room } from '../types';
import { PeerHost } from '../common/peer/peer-host';
import { PeerClient } from '../common/peer/peer-client';

export const useMainStore = defineStore('main', () => {
  /** 檢查 localStorage 是否有儲存 client id，沒有則產生 id */
  const savedId = localStorage.getItem(`animals-party:clientId`);
  const clientId = savedId ?? nanoid();
  localStorage.setItem(`animals-party:clientId`, clientId);

  const type = shallowRef<`${ClientType}`>();
  /** 主機端連線（game-console 角色） */
  const host = shallowRef<PeerHost>();
  /** 玩家端連線（player 角色） */
  const client = shallowRef<PeerClient>();
  /** 玩家端連線是否已 open（reactive，供等待連線就緒後再送資料） */
  const clientConnected = ref(false);

  /** 建立房間，成為 host */
  function createHost(): Promise<Room> {
    disconnect();

    const peerHost = markRaw(new PeerHost(clientId));
    host.value = peerHost;
    type.value = 'game-console';

    return peerHost.create();
  }

  /** 以玩家身分加入指定 host */
  function joinHost(hostId: string): Promise<Room> {
    client.value?.disconnect();
    clientConnected.value = false;

    const peerClient = markRaw(
      new PeerClient(clientId, {
        onConnectionChange: (connected) => {
          clientConnected.value = connected;
        },
      }),
    );
    client.value = peerClient;
    type.value = 'player';

    return peerClient.join(hostId);
  }

  function disconnect() {
    host.value?.disconnect();
    client.value?.disconnect();
    host.value = undefined;
    client.value = undefined;
    clientConnected.value = false;
  }

  return {
    clientId,
    type,
    host,
    client,
    clientConnected,

    createHost,
    joinHost,
    disconnect,
  };
});

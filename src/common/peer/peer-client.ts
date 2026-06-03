import Peer, { DataConnection } from 'peerjs';
import {
  ClientEmitEventMap,
  ClientListenEventMap,
  PeerConnectionMetadata,
  PeerMessage,
  Room,
} from '../../types';
import { TypedEmitter } from './typed-emitter';

/** 加入房間的等待超時（毫秒） */
const JOIN_TIMEOUT = 3000;

/** 玩家端：連到 host peer，收發訊息
 *
 * 取代原本 socket.io-client 的 player 連線。
 */
export class PeerClient {
  private peer = new Peer();
  private connection?: DataConnection;
  private bus = new TypedEmitter<ClientListenEventMap>();

  constructor(private clientId: string) {}

  get connected() {
    return this.connection?.open ?? false;
  }

  /** 連到指定 host，等收到 room:joined ack 才視為加入成功 */
  join(hostId: string): Promise<Room> {
    return new Promise<Room>((resolve, reject) => {
      let settled = false;
      const metadata: PeerConnectionMetadata = { clientId: this.clientId };

      const start = () => {
        const connection = this.peer.connect(hostId, { reliable: true, metadata });
        this.connection = connection;

        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          connection.close();
          reject(new Error('加入房間 timeout'));
        }, JOIN_TIMEOUT);

        connection.on('data', (raw) => {
          const message = raw as PeerMessage;

          // room:joined 為加入成功的 ack
          if (message.event === 'room:joined') {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(message.data as Room);
            }
            return;
          }

          this.bus.emitRaw(message.event, message.data);
        });

        connection.on('error', (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error);
        });
      };

      if (this.peer.open) {
        start();
        return;
      }

      this.peer.once('open', start);
      this.peer.once('error', (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      });
    });
  }

  on<Event extends keyof ClientListenEventMap>(
    event: Event,
    handler: (data: ClientListenEventMap[Event]) => void
  ) {
    this.bus.on(event, handler);
  }

  off<Event extends keyof ClientListenEventMap>(
    event: Event,
    handler: (data: ClientListenEventMap[Event]) => void
  ) {
    this.bus.off(event, handler);
  }

  /** 送訊息給 host */
  send<Event extends keyof ClientEmitEventMap>(event: Event, data: ClientEmitEventMap[Event]) {
    const message: PeerMessage = { event, data };
    this.connection?.send(message);
  }

  disconnect() {
    this.connection?.close();
    this.peer.destroy();
    this.bus.clear();
  }
}

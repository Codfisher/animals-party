import Peer, { DataConnection } from 'peerjs';
import { customAlphabet } from 'nanoid';
import mitt from 'mitt';
import {
  GameConsoleState,
  GamepadData,
  HostEmitEventMap,
  HostListenEventMap,
  PeerConnectionMetadata,
  PeerMessage,
  Player,
  Room,
} from '../../types';
import { UpdateStateParams } from '../../stores/game-console.store';

/** host peer id 用的無歧義英數字母（避開 0/o、1/l/i） */
const generateRoomId = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 6);

/** id 撞號時重新產生的最大次數 */
const MAX_CREATE_RETRY = 5;
/** 建立房間（取得 peer id）的等待超時（毫秒） */
const CREATE_TIMEOUT = 10000;

interface PlayerEntry {
  connection: DataConnection;
  profile: Player;
}

/** 主機端：接受玩家連線、維護玩家清單、廣播狀態
 *
 * 接手原 socket.io 伺服器的權威角色。
 */
export class PeerHost {
  private peer?: Peer;
  private playerMap = new Map<string, PlayerEntry>();
  private bus = mitt<HostListenEventMap>();
  private consoleState: Pick<GameConsoleState, 'status' | 'gameName'> = {
    status: 'home',
    gameName: 'the-first-penguin',
  };
  private id = '';

  constructor(private clientId: string) {}

  get roomId() {
    return this.id;
  }

  get connected() {
    return this.peer?.open ?? false;
  }

  /** 建立房間：以自訂 id 註冊 peer，撞號則換 id 重試 */
  create(): Promise<Room> {
    return new Promise<Room>((resolve, reject) => {
      let settled = false;
      let retry = 0;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('建立房間 timeout'));
      }, CREATE_TIMEOUT);

      const tryCreate = () => {
        const peer = new Peer(generateRoomId());
        this.peer = peer;

        peer.once('open', (openId) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.id = openId;
          this.bindConnectionEvents(peer);
          resolve({ id: openId, founderId: this.clientId, playerIds: [] });
        });

        peer.once('error', (error) => {
          if (settled) return;

          const errorType = (error as { type?: string }).type;
          // id 撞號，換 id 重試
          if (errorType === 'unavailable-id' && retry < MAX_CREATE_RETRY) {
            retry += 1;
            peer.destroy();
            tryCreate();
            return;
          }

          settled = true;
          clearTimeout(timer);
          reject(error);
        });
      };

      tryCreate();
    });
  }

  private bindConnectionEvents(peer: Peer) {
    peer.on('connection', (connection) => this.handleConnection(connection));
  }

  private handleConnection(connection: DataConnection) {
    const metadata = connection.metadata as PeerConnectionMetadata | undefined;
    const clientId = metadata?.clientId;

    // 缺少身分識別，拒絕連線
    if (!clientId) {
      connection.close();
      return;
    }

    connection.on('open', () => {
      this.playerMap.set(clientId, { connection, profile: { clientId } });

      // 回覆加入成功 ack 給該玩家
      this.sendTo(clientId, 'room:joined', this.buildRoom());
      this.broadcastPlayerUpdate();
    });

    connection.on('data', (raw) => this.handleData(clientId, raw as PeerMessage));

    const removePlayer = () => {
      // 僅在仍是同一條連線時移除，避免重連覆蓋後誤刪
      if (this.playerMap.get(clientId)?.connection !== connection) return;
      this.playerMap.delete(clientId);
      this.broadcastPlayerUpdate();
    };
    connection.on('close', removePlayer);
    connection.on('error', removePlayer);
  }

  private handleData(clientId: string, message: PeerMessage) {
    switch (message.event) {
      case 'player:gamepad-data':
        this.bus.emit('player:gamepad-data', message.data as GamepadData);
        break;

      case 'player:profile': {
        const profile: Player = { ...(message.data as Player), clientId };
        const entry = this.playerMap.get(clientId);
        if (entry) {
          entry.profile = profile;
        }
        this.bus.emit('game-console:profile-update', profile);
        this.broadcastPlayerUpdate();
        break;
      }

      case 'player:request-game-console-state':
        this.sendTo(clientId, 'game-console:state-update', this.buildState());
        break;

      default:
        break;
    }
  }

  /** 廣播給玩家的事件（state-update / console-data） */
  emit<Event extends keyof HostEmitEventMap>(event: Event, data: HostEmitEventMap[Event]) {
    // 快取目前狀態，供新玩家 request-state 時回覆
    if (event === 'game-console:state-update') {
      const partial = data as UpdateStateParams;
      if (partial.status) this.consoleState.status = partial.status;
      if (partial.gameName) this.consoleState.gameName = partial.gameName;
    }

    this.broadcast(event, data);
  }

  on<Event extends keyof HostListenEventMap>(
    event: Event,
    handler: (data: HostListenEventMap[Event]) => void
  ) {
    this.bus.on(event, handler);
  }

  off<Event extends keyof HostListenEventMap>(
    event: Event,
    handler: (data: HostListenEventMap[Event]) => void
  ) {
    this.bus.off(event, handler);
  }

  disconnect() {
    this.playerMap.clear();
    this.peer?.destroy();
    this.bus.all.clear();
  }

  /** 玩家清單變更：同時廣播給玩家並觸發 host 自身監聽 */
  private broadcastPlayerUpdate() {
    const playerList = this.buildPlayerList();
    this.broadcast('game-console:player-update', playerList);
    this.bus.emit('game-console:player-update', playerList);
  }

  private broadcast(event: string, data: unknown) {
    const message: PeerMessage = { event, data };
    this.playerMap.forEach(({ connection }) => connection.send(message));
  }

  private sendTo(clientId: string, event: string, data: unknown) {
    const message: PeerMessage = { event, data };
    this.playerMap.get(clientId)?.connection.send(message);
  }

  private buildPlayerList(): Player[] {
    return [...this.playerMap.values()].map(({ profile }) => profile);
  }

  private buildRoom(): Room {
    return {
      id: this.id,
      founderId: this.clientId,
      playerIds: [...this.playerMap.keys()],
    };
  }

  private buildState(): GameConsoleState {
    return {
      ...this.consoleState,
      players: this.buildPlayerList(),
    };
  }
}

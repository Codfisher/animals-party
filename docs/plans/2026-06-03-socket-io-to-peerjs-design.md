# socket.io → peer.js 遷移設計

日期：2026-06-03
狀態：設計核可，待轉入實作計畫

## 目標

全面移除 socket.io，改用 peer.js（WebRTC P2P）。原本是 socket.io 中繼伺服器架構：
game-console 當主機建房、player 用 6 位數房號加入，伺服器持有房間/玩家權威狀態並轉發所有訊息。
改用 peer.js 後，game-console 接手伺服器角色成為 host 權威節點，玩家直連 host。

## 已確認決策

- **Signaling**：用 PeerJS 公用雲端 broker（0.peerjs.com），零後端維運。
- **房號 / host id**：用自訂長度 nanoid（6 碼、無歧義英數字母，避開 `0/O`、`1/l/I`）當 host peer id。
  QR 只編這串字串，密度最低最好掃。註冊撞 id（broker `unavailable-id`）時換 id 重試。
- **加入流程**：player 改成開相機掃 QR 加入；保留手動貼上 id 的退路。
- **拓樸**：星狀，host 為中心權威節點，player 直連 host，player 之間不互連。
- **遷移策略**：方案 A —— 保留事件協定、抽換傳輸層；兩個 composable 對外 API 不變。

## 架構與連線拓樸

```
        ┌────────── PeerJS 公用 broker (0.peerjs.com) ──────────┐
        │            只負責 WebRTC 握手（signaling）              │
        └──────────────────────────────────────────────────────┘
              ▲                                      ▲
       signaling                              signaling
              │          WebRTC DataChannel (P2P)    │
   ┌──────────┴───────────┐                ┌─────────┴──────────┐
   │ game-console (HOST)   │◄──────────────►│  player A (CLIENT) │
   │ - peer id = nanoid(6) │◄────────┐      └────────────────────┘
   │ - 權威：玩家清單        │          │      ┌────────────────────┐
   │ - 廣播 state/console  │◄─────────┴─────►│  player B (CLIENT) │
   │ - 接收 gamepad/profile│                 └────────────────────┘
   └──────────────────────┘
```

- 房號 = host 的 peer id。host 顯示成 QR；player 掃 QR 後 `peer.connect(hostId)` 直連。
- player 身分沿用 localStorage 的 `clientId`，連線時透過 `connect(hostId, { metadata: { clientId } })`
  帶給 host，host 以此建立 `clientId → connection` 對照表。
- 零後端：移除 `vite.config.ts` 的 `/socket.io` proxy。

## 通訊層封裝與訊息協定

訊息信封（沿用現有事件名稱當 type）:

```ts
type PeerMessage =
  // player → host
  | { event: 'player:gamepad-data';               data: GamepadData }
  | { event: 'player:profile';                    data: Player }
  | { event: 'player:request-game-console-state'; data?: undefined }
  // host → player
  | { event: 'game-console:state-update';   data: GameConsoleState }
  | { event: 'game-console:player-update';  data: Player[] }
  | { event: 'game-console:profile-update'; data: Player }
  | { event: 'game-console:console-data';   data: GameConsoleData }
  | { event: 'room:joined';                 data: Room }   // host 對新連線玩家回的 ack
```

兩個封裝類別放 `src/common/peer/`：

### PeerHost（game-console，接手原伺服器邏輯）

- `create(): Promise<Room>` — `new Peer(nanoid(6))`，等 `open` 拿到 id；撞 id 換 id 重試。
- 監聽 `connection`：讀 `conn.metadata.clientId` 存入 `connectionMap`；`conn.open` 後回送 `room:joined`，
  廣播 `game-console:player-update`。
- 監聽 `conn.close/error`：移除玩家、廣播 `player-update`。
- 收到玩家訊息 → 觸發對應 hook（gamepad-data、profile、request-state）。
- `broadcast(message)`：送所有玩家；`sendTo(clientId, message)`：送單一玩家。
- `on(event, handler)` / `off(...)`：訂閱收到的訊息。

### PeerClient（player）

- `join(hostId): Promise<Room>` — `peer.connect(hostId, { metadata: { clientId }, reliable: true })`；
  `open` + 收到 `room:joined` 即 resolve；3 秒 timeout 或 `error` 則 reject（取代原 `client.timeout(3000).emit`）。
- `send(message)`：送 host。
- `on(event, handler)` / `off(...)`：訂閱收到的訊息。
- `connected` 屬性、`disconnect()`。

兩者內部各用一個輕量 typed event emitter 依 `event` 欄位分派（非 socket.io shim）。

`main.store` 改持有 `peer` 實例與目前角色封裝物件（host 或 client），對外提供
`createHost()` / `joinHost(id)` / `disconnect()`，並保留 `clientId`、`type`。
兩個 composable 對外 API 不變，只有內部 `connect/once/timeout` 等 socket 專屬呼叫換成上述封裝。

## host 權威邏輯與事件對應

| 觸發 | 原 socket 伺服器行為 | 改後 PeerHost 行為 |
|---|---|---|
| host 開派對 | server 建房、回 `room-created` | `peer.open` 拿到 id → `startParty` resolve `Room { id, founderId: clientId, playerIds: [] }` |
| player 連入 | server 加入 room、廣播 `player-update` | 讀 `metadata.clientId` 存 map → 回該玩家 `room:joined` → 廣播 `player-update` → 觸發 host `onPlayerUpdate` |
| player 斷線 | server 移除、廣播 `player-update` | `conn.close` → 移除 → 廣播 `player-update` → 觸發 host `onPlayerUpdate` |
| player 送 gamepad-data | server 轉發給 console | 觸發 host `onGamepadData` hook |
| player 送 profile | server 存 + 廣播 `profile-update` | 更新 game-console store → 廣播 `profile-update` → 觸發 host `onProfileUpdate` |
| player 送 request-state | server 回該 player 當前 state | `sendTo(clientId, { event:'game-console:state-update', data: 當前 state })` |
| host setStatus/setGameState | console emit → server 廣播 | `broadcast('game-console:state-update', ...)` |
| host emitConsoleData | console emit → server 廣播 | `broadcast('game-console:console-data', ...)` |

- 玩家清單真實來源：host 的 `connectionMap`，每次增減重算 `Player[]` 廣播並同步進 `game-console.store.players`。
  player 端清單靠收 `game-console:player-update` 更新（同現狀）。
- 身分與重連：`clientId` 存 localStorage。player 重連（同 clientId）host 以 clientId 為 key，新 conn 取代舊 conn。
  - player 端房號存 sessionStorage（`game-console.store` 的 `roomId`）；不慎重新整理後，`player-gamepad` 進頁時若偵測到有房號但 `clientConnected` 為 false，便自動 `joinRoom` 重連，host 依 clientId 補回原位；重連失敗（房間已關）則清除房號退回首頁。
  - 重連期間由 `player-gamepad` 自管獨立蓋板（不沿用全域 loading）；因玩家清單抵達前 `codeName` 為 unknown，蓋板維持到 `codeName` 被辨識才收起，並設安全逾時避免卡死。
  - host 端 peer id 無法復原，故 `game-console` 進頁時若 `host` 未連線（如重新整理），直接清房號退回首頁。
- `Room` 型別保留 `{ id, founderId, playerIds }`：`id` = host peer id、`founderId` = host clientId、
  `playerIds` = 連線中玩家 clientId 清單。移除沒人用的 `SocketResponse`。
- 清理：composable `onBeforeUnmount` 的 `removeListener` 改呼叫封裝的 `off(...)`；
  `endParty/disconnect` 呼叫 `peer.destroy()`（host）或 `conn.close()`（player）。

## QR 產生／掃描與加入流程 UI

### host 端（產生 QR）

- 新增 `src/components/room-qr-code.vue`：用 `qrcode` 套件把 `gameConsoleStore.roomId`（= host peer id）畫成 QR。
- 放在 `game-menu.vue` 現有 `room-id-chip` 旁：QR 為主視覺，chip 仍顯示 id 文字供手動貼上參考與 debug。
- roomId 未就緒時不顯示（清掉 room-id-chip 的 `'123456'` 假值）。

### player 端（掃描加入）— 改寫 dialog-join-game.vue

- 主：開相機，用 `qr-scanner`（輕量、走 web worker、自動選後鏡頭）即時掃描；掃到 → 取 id → `player.joinRoom(id)`。
- 退路：對話框保留輸入框（「或輸入房號」）+ 加入鈕，沿用現有 `joinRoom` 邏輯。
- 容錯：相機權限被拒 / 無相機 → 隱藏相機畫面、提示改用貼上，不卡死流程。
- 元件卸載 `scanner.stop()` + `destroy()` 釋放相機。
- 加入成功 → `onDialogOK()`（Quasar `useDialogPluginComponent` 內建方法，沿用其名）。

### 命名備註

- `onDialogOK` / `onDialogHide` / `onDialogCancel` 是 Quasar `useDialogPluginComponent()` 內建方法，沿用原名。
- 新增的事件 handler 遵守專案慣例 `handleXxx`（如 QR 掃到結果的 `handleScan`、貼上送出的 `handleSubmit`）。

## 套件異動

- 移除：`socket.io-client`
- 新增：`peerjs`、`qrcode`、`qr-scanner`；dev：`@types/qrcode`
- `vite.config.ts`：移除 `/socket.io` proxy

## 影響檔案清單

- `package.json`、`vite.config.ts`
- `src/types/socket.type.ts` → 改為 peer 協定型別（`PeerMessage`、`Room`、移除 `SocketResponse`），更新 `src/types/index.ts`
- `src/stores/main.store.ts`：socket → peer
- 新增 `src/common/peer/`：`peer-host.ts`、`peer-client.ts`、訊息型別、輕量 emitter
- `src/composables/use-client-game-console.ts`、`use-client-player.ts`：內部改用 peer 封裝
- `src/components/dialog-join-game.vue`：改寫為 QR 掃描 + 手動貼上
- 新增 `src/components/room-qr-code.vue`；`src/components/game-menu.vue`、`src/components/room-id-chip.vue` 整合 QR

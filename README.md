# 動物嗨起來 Animals Party 🐾

> 把手機變成 joy-con，瀏覽器就是遊戲機，一起來玩 3D 派對遊戲吧！(/≧▽≦)/

本專案延續《甚麼？網頁也可以做派對遊戲？使用 Vue 和 babylon.js 打造 3D 派對遊戲吧！》一書內容，並將原本基於 **socket.io、需要伺服器中繼**的版本，改寫為以 **WebRTC** 讓遊戲端與控制端網頁直連，徹底拿掉後端。ヽ(●`∀´●)ﾉ

[線上遊玩](https://animalsparty.codlin.me/)

## ✨ 前言

隨著瀏覽器蓬勃發展，網頁已能存取 GPS、加速度計、照度計、麥克風、攝影機等硬體訊號，還能搭配 WebGPU、WebGL 運行複雜的 3D 內容。

基於上述理由，網頁已夠格成為 3D 遊戲機，手機瀏覽器甚至能像 joy-con 一般作為搖桿使用，於是本專案就這麼誕生了。( •̀ ω •́ )✧

## 📖 故事背景

運送肥宅快樂粉的超大型航空母雞在高空中爆炸啦！

快樂粉隨風飄至全世界，遠至南極、近至水溝，忽然間所有動物都嗨了起來！

最後故事編不下去了，讓我們開始吧！o(≧∀≦)o

## 🕹️ 遊戲介紹

### 1. 第一隻企鵝

阿德利企鵝會把最前頭的企鵝踢下水，確認水中沒有天敵後才肯下水，努力別被踢下去吧！

以**類比搖桿**控制移動，**A 鍵**發動旋轉攻擊。注意攻擊時無法移動，小心別自己滑下去哦 ᕕ( ﾟ ∀。)ᕗ。

### 2. 小雞快飛

一群農場的雞用大砲逃出農場了！先別管大砲哪來的，利用手機**陀螺儀**控制小雞的飛行姿態，閃過空中障礙物，帶小雞逃出農場魔掌吧！─=≡Σ(( つ•̀ω•́)つ

### 3. 狐狸與老鼠

赤狐會在雪上聆聽積雪下小老鼠竄動的聲音，抓準時機跳起、插入雪中抓老鼠。仔細感受**手機震動**時長，抓到最大隻的老鼠吧！ԅ(´∀` ԅ)

## 🏗️ 運作架構

遊戲分為兩種角色，皆為同一份網頁的不同路由：

| 角色 | 路由 | 職責 |
| --- | --- | --- |
| 遊戲端 GameConsole（HOST） | `/game-console` | 跑 3D 遊戲、建立房間、顯示房號 QR Code，並握有玩家清單與遊戲狀態的權威 |
| 控制端 PlayerGamepad（CLIENT） | `/player-gamepad` | 掃描 QR Code 或輸入房號加入，將手機化為搖桿，回傳搖桿訊號 |

連線採 **WebRTC 星狀拓樸**，遊戲端為中心的權威節點，所有控制端直連遊戲端，控制端之間不互連：

```text
        ┌────────── PeerJS 公用 broker (0.peerjs.com) ──────────┐
        │            只負責 WebRTC 握手（signaling）              │
        └──────────────────────────────────────────────────────┘
              ▲                                      ▲
       signaling                              signaling
              │          WebRTC DataChannel (P2P)    │
   ┌──────────┴───────────┐                ┌─────────┴──────────┐
   │ 遊戲端 (HOST)         │◄──────────────►│  控制端 A (CLIENT)  │
   │ - 權威：玩家清單       │◄────────┐      └────────────────────┘
   │ - 廣播 state/console  │          │      ┌────────────────────┐
   │ - 接收 gamepad/profile│◄─────────┴─────►│  控制端 B (CLIENT)  │
   └──────────────────────┘                 └────────────────────┘
```

- **零後端**：PeerJS 公用 broker 只負責 WebRTC 握手，握手完成後遊戲資料全走 P2P DataChannel，不經任何伺服器。
- **房號**：遊戲端建房時產生 6 碼純數字房號，加上固定前綴後即為 host 的 peer id；房號撞號時自動換號重試。
- **加入流程**：QR Code 內含完整加入網址，手機相機掃描後即自動開啟並加入；另保留控制端開相機掃描與手動輸入房號的退路。
- **身分識別**：控制端的 `clientId` 存於 localStorage，連線時透過 peer metadata 帶給遊戲端，支援同一玩家重連。

## 🛠️ 技術堆疊

- **Vue 3** — Composition API、`<script setup>`
- **Babylon.js** — 3D 場景與渲染，搭配 `cannon-es` 物理引擎
- **WebRTC（PeerJS）** — 遊戲端與控制端 P2P 直連
- **Pinia** — 狀態管理
- **XState** — 遊戲流程狀態機
- **Vue Router**（內建檔案路由）— 以 [src/pages/](src/pages/) 為來源的檔案路由
- **Nuxt UI** + **Tailwind CSS** — UI 元件與樣式
- **qrcode** / **qr-scanner** — 房號 QR Code 產生與掃描
- **Vite** — 建置工具
- **Vitest** — 單元測試

## 📂 專案結構

```text
src/
├── common/           # 共用邏輯
│   └── peer/         # WebRTC 通訊封裝（PeerHost / PeerClient / 房號）
├── components/       # 共用元件（搖桿、QR Code、遊戲選單等）
├── composables/      # 組合式函式（Babylon 場景、連線、權限等）
├── games/            # 各遊戲的 3D 場景與角色
│   ├── the-first-penguin/
│   ├── chicken-fly/
│   └── fox-and-mouse/
├── pages/            # 檔案路由
│   ├── game-console/     # 遊戲端各遊戲頁面
│   └── player-gamepad/   # 控制端各遊戲頁面
├── stores/           # Pinia store
└── types/            # TypeScript 型別
```

## 🚀 開始使用

> 需要 Node.js 20.19+ 或 22.12+（Vite 8 要求），套件管理器使用 [pnpm](https://pnpm.io/)。

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器（--host 對外開放，方便手機連入測試）
pnpm dev

# 建置正式版（含型別檢查）
pnpm build

# 預覽建置結果
pnpm preview
```

### 測試

```bash
# 執行單元測試
pnpm test

# 監看模式
pnpm test:watch

# 圖形化介面
pnpm test:ui
```

### 本機遊玩流程

1. 於電腦瀏覽器開啟遊戲端，按下「建立派對」取得房號 QR Code。
2. 手機相機直接掃描 QR Code 開啟網址即自動加入；或開啟網頁按下「加入派對」，掃描 QR Code（或手動輸入房號）加入。
3. 手機即化為搖桿，開玩！(\*´ω\`)人(´ω\`\*)

> WebRTC 需透過 HTTPS 或 localhost 才能存取相機與感測器。`pnpm dev` 已帶 `--host`，手機可直接連入區網位址測試。

## 🔗 相關連結

- [鱈魚的魚缸](https://codlin.me/)
- [線上遊玩](https://animalsparty.codlin.me/)
- [GitHub 原始碼](https://github.com/Codfisher/animals-party)

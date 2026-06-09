# 手機搖桿頁廣告橫幅設計

## 目標

在手機搖桿頁全程露出廣告，且不妨礙玩家操作、不造成誤觸。

## 決策摘要

- **時機**：全程常駐（lobby 與三款遊戲頁皆顯示）。
- **形式**：頂部固定細橫幅。
- **位置**：頂部（遠離拇指操作熱區，誤觸最少）。底部因正位於拇指熱區，排除。
- **架構**：保留式廣告帶（flex-col），廣告與操作區實體分離，保證零重疊、零誤觸。

## 現況盤點

搖桿頁容器 [player-gamepad-container.vue](../../src/components/player-gamepad-container.vue) 為 `w-screen h-screen overflow-hidden`，直向全螢幕。各頁操作元件分布：

| 頁面 | 上方 | 下方 | 中央 |
|---|---|---|---|
| lobby | 右上 確認鈕、權限鈕 | 左下 D-pad、右下 確認 | — |
| chicken-fly | 上中 玩家代號 | 下中 體感盤 | 正中 確認鈕 |
| fox-and-mouse | 右上 確認 | 左下 搖桿、右下 A | 中央 脈衝回饋（pointer-events-none） |
| the-first-penguin | 右上 確認 | 左下 搖桿、右下 A | — |

操作集中於四角與下半部。

各子頁各自以 `<player-gamepad-container>` 包裹自身，容器是「每頁實例化」而非常駐；父層 [player-gamepad.vue](../../src/pages/player-gamepad.vue) 才是跨 lobby↔遊戲導覽時保持掛載的常駐層（內含 `<router-view />`）。

## 架構設計

### 插入層級：常駐父層

廣告帶掛在 [player-gamepad.vue](../../src/pages/player-gamepad.vue)（`router-view` 上方），而非各子頁容器。理由：

- lobby ↔ 遊戲切換時廣告**不重新載入**，曝光穩定。
- 避免頻繁 reload 被 AdSense 視為無效流量。
- 單一插入點即涵蓋全部搖桿頁。

### 關鍵限制：AdSense 會注入 `height: auto !important`

AdSense 腳本處理 `<ins class="adsbygoogle">` 時，會對廣告容器與其祖先（含 `#app`）注入 inline `height: auto !important`，覆蓋 `h-dvh`／`h-screen`。若搖桿版面以祖先 `height` 撐開，flex-1 操作區會因無可填高度而塌成 0、控制元件消失。

**對策——版面不依賴祖先 `height` 屬性**：

- 外層 `fixed inset-0`：貼齊視窗四邊，即使被注入 `height:auto`，仍在 top/bottom=0 間自動撐滿。
- 廣告帶 `min-h-14`（非 `h-14`）：`min-height` 不受 `height:auto` 覆蓋，廣告被擋或未填充仍維持帶高。
- 操作區 `flex-1 min-h-0`：靠 flex-grow 填滿，與 `height` 屬性無關。
- 子頁容器 `absolute inset-0`（非 `w-full h-full`）：相對操作區填滿，免疫 `height:auto`。

### 版面：flex-col 保留帶

```
player-gamepad.vue
└── div.flex.flex-col (h-dvh, w-full, bg-black)
    ├── 廣告帶 (固定高度 ~56px, 深色襯底, 底部細分隔線)
    │   └── google-adsense (format="horizontal")
    └── div.flex-1 (relative, overflow-hidden)  ← 操作區
        └── router-view  ← 子頁容器改為填滿此區
```

子頁容器 [player-gamepad-container.vue](../../src/components/player-gamepad-container.vue) 由 `h-screen` 改為 `h-full`（`w-full h-full`），填滿操作區剩餘空間。四角搖桿／按鈕的 `absolute` 定位改以操作區為定位基準，因此一律落在廣告帶之下，**物理上不可能與廣告重疊或誤觸**。

置中玩家代號（容器內 `top: 0` 置中）順移到操作區頂端，仍清楚可見。

### 廣告元件

沿用既有 [google-adsense.vue](../../src/components/google-adsense.vue)：

- 新增一個 AdSense 後台**手機橫幅 ad unit**，取得新的 `slot` ID（與首頁 9242930193 區隔，數據獨立）。
  - 過渡期可先沿用首頁 slot，待新版位建立後替換。
- `client="ca-pub-6608581811170481"`、`format="horizontal"`、固定高度配合廣告帶（約 50–56px，對應 320x50 行動橫幅）。

### 廣告帶高度：固定 px，非 vh

AdSense 橫幅素材為固定像素尺寸（320x50、320x100），不隨容器縮放。若廣告帶用 `vh`，在小／中尺寸手機上 `5vh`（約 32–45px）會小於 50px 素材，`overflow-hidden` 將裁切廣告、違反「完整顯示」規範。故廣告帶高度以固定 px 貼合素材：`h-14`（56px）= 50px 素材 + 6px 分隔呼吸空間。

### 視覺

- 廣告帶底色 `bg-black/30`（或深色），底部一條細分隔線與遊戲畫面區隔。
- 可選：一行極小提示文案，呼應首頁「順手開廣告，支持好內容」調性。

## 影響範圍

| 檔案 | 變更 |
|---|---|
| [player-gamepad.vue](../../src/pages/player-gamepad.vue) | 外層改 flex-col，新增頂部廣告帶＋ `google-adsense`，`router-view` 包進 `flex-1` 操作區 |
| [player-gamepad-container.vue](../../src/components/player-gamepad-container.vue) | `h-screen` → `h-full` |

子頁四頁（lobby、chicken-fly、fox-and-mouse、the-first-penguin）無需改動，定位自動相對操作區。

## 風險與緩解

- **垂直空間損失** ~7–9%：頂部帶約 56px；操作區仍足夠容納下半部搖桿／按鈕。
- **AdSense 誤觸／無效流量**：頂部遠離拇指區、與操作區實體分離 → 符合「避免意外點擊」規範。
- **`h-dvh` 行動瀏覽器位址列**：外層用 `h-dvh` 而非 `h-screen`，避免位址列收合造成跳動。

## 待辦前置

- [ ] AdSense 後台建立手機橫幅版位，取得新 `slot` ID（未取得前先沿用首頁 slot）。

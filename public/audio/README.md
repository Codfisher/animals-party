# 音效素材

格式統一為 **mp3**（通用相容、體積小）。依用途分資料夾：`common/` 為跨遊戲共用，其餘對應各遊戲（與 `public/<遊戲>/` 模型資料夾命名一致）。

## 短音效（程式合成）

以下由 [`scripts/generate-audio.mjs`](../../scripts/generate-audio.mjs) 合成（先產生 WAV 再經 ffmpeg 轉 mp3），無第三方授權問題。
要調整音色，改腳本內對應 builder 參數後重新執行 `node scripts/generate-audio.mjs`（需安裝 ffmpeg）。

| 檔案 | 用途 |
| --- | --- |
| `common/click.mp3` | UI 點擊 |
| `common/confirm.mp3` | 確認 |
| `common/win.mp3` | 勝利 |
| `common/lose.mp3` | 失敗 |
| `common/countdown.mp3` | 倒數提示 |
| `common/start.mp3` | 開始 |
| `chicken-fly/collide.mp3` | 小雞被壞雞撞擊 |
| `chicken-fly/dead.mp3` | 小雞淘汰墜落 |
| `fox-and-mouse/catch.mp3` | 狐狸抓到老鼠 |
| `fox-and-mouse/pounce.mp3` | 狐狸撲擊 |
| `the-first-penguin/collide.mp3` | 企鵝攻擊撞擊 |
| `the-first-penguin/splash.mp3` | 企鵝落水 |
| `the-first-penguin/attack.mp3` | 企鵝揮擊 |

## 背景音樂

各遊戲與大廳的 BGM 統一命名為該資料夾下的 `bgm.mp3`：

| 檔案 | 用途 |
| --- | --- |
| `lobby/bgm.mp3` | 大廳 |
| `chicken-fly/bgm.mp3` | 小雞遊戲 |
| `fox-and-mouse/bgm.mp3` | 狐狸遊戲 |
| `the-first-penguin/bgm.mp3` | 企鵝遊戲 |

> 合成腳本不會覆蓋已存在的 `bgm.mp3`，方便保留正式素材。若尚未放入正式音樂，腳本會補上靜音 placeholder。

## 新增遊戲專屬音效

1. 在 [`scripts/generate-audio.mjs`](../../scripts/generate-audio.mjs) 的 `gameSounds` 對應遊戲下新增 builder（或直接放外部音檔到該資料夾）。
2. 在 [`src/composables/use-audio.ts`](../../src/composables/use-audio.ts) 的 `SoundName` 與 `soundFileMap` 新增對應項（命名格式 `<遊戲>/<音效>`）。
3. 於遊戲場景呼叫 `audio.play('<遊戲>/<音效>')`。

## 替換素材

1. 將正式素材轉成 mp3 後，覆蓋同名檔即可。
2. 若改用其他格式（`.webm`、`.m4a` 等），請同步修改 [`use-audio.ts`](../../src/composables/use-audio.ts) 對應的副檔名。
3. 大型來源 WAV 可用 ffmpeg 轉檔：`ffmpeg -i input.wav -q:a 4 output.mp3`。
4. 取得素材建議來源見 [`docs/audio.md`](../../docs/audio.md)。

## 授權注意

替換為外部素材時，優先選 CC0／Public Domain；CC-BY 須標示作者；本專案含廣告屬商用，**勿用 CC-BY-NC**。請將來源與授權登記於本檔案。

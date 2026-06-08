# 音效系統

## 架構

音效集中在 game-console（大螢幕）端播放，手機搖桿端僅負責觸覺回饋（`vibrate`）。

- **短音效**：以 Web Audio API 預先解碼成 `AudioBuffer`，播放時建立 `BufferSource`，可低延遲、可重疊。
- **背景音樂**：以雙 `HTMLAudioElement` 循環播放，切換曲目時交叉淡入淡出（crossfade），停止時漸出，避免突兀切換。淡變時間為 `BGM_FADE_DURATION`（預設 800ms）。
- 兩者皆封裝於 [`src/composables/use-audio.ts`](../src/composables/use-audio.ts) 的模組單例，任何元件取得的都是同一份狀態。

## 自動播放解鎖

瀏覽器需使用者手勢才允許播放。[`App.vue`](../src/App.vue) 監聽首次 `pointerdown`／`keydown`／`touchstart`，呼叫 `audio.unlock()` 恢復 `AudioContext` 並預載所有短音效。解鎖前呼叫 `play()` 會靜默略過。

## 使用方式

```ts
import { useAudio } from '@/composables/use-audio';

const audio = useAudio();
audio.play('win');           // 短音效
audio.play('click', { volume: 0.5 });
audio.playBgm('lobby');      // 背景音樂
audio.stopBgm();
audio.toggleMute();          // 靜音切換
```

偏好（`muted`、`masterVolume`、`bgmVolume`）以 `useStorage` 持久化於 localStorage，皆為可雙向綁定的 ref，可直接接到設定 UI。

## 觸發點

| 音效 | 觸發位置 |
| --- | --- |
| `click` | [`base-btn.vue`](../src/components/base-btn.vue) 點擊 |
| `confirm` | 大廳有新玩家加入 |
| `countdown` / `start` | [`countdown-overlay.vue`](../src/components/countdown-overlay.vue) 倒數 |
| `win` | 各遊戲 `isGameOver`（與彩帶同步） |
| `the-first-penguin/attack` | 企鵝揮擊（依玩家節流對齊冷卻） |
| `the-first-penguin/collide` | 企鵝攻擊命中（節流） |
| `the-first-penguin/splash` | 企鵝落水出界 |
| `chicken-fly/collide` | 小雞被壞雞撞擊（節流） |
| `chicken-fly/dead` | 小雞淘汰墜落 |
| `fox-and-mouse/pounce` | 狐狸撲擊 |
| `fox-and-mouse/catch` | 狐狸抓到老鼠 |
| BGM | 大廳與三個遊戲 console 頁進入時，各播放各自曲目（`lobby` / `chicken-fly` / `fox-and-mouse` / `the-first-penguin`）；返回首頁（[`home.vue`](../src/pages/home.vue)）時 `stopBgm()` 漸出停止 |

## 素材

所有素材統一為 mp3（短音效程式合成、BGM 為正式音樂或靜音 placeholder）。產生與替換方式見 [`public/audio/README.md`](../public/audio/README.md)。

### 合成音色調整

音效依用途分資料夾：`common/` 為跨遊戲共用，各遊戲互動音效放各自資料夾（與 `public/<遊戲>/` 模型資料夾命名一致）。腳本內以 `commonSounds` 與 `gameSounds` 兩組對應。改參數後重跑 `node scripts/generate-audio.mjs`。常用參數：

- `decayRate`：尾音長短（越大越乾脆）
- `vibratoRate` / `vibratoDepth`：抖動的可愛感
- `freq` → `freqEnd`：彎音起訖
- `createBell`：鐘琴／木琴式圓潤音色

### 外部素材來源建議

- CC0 免授權：[Pixabay](https://pixabay.com/sound-effects/)、[Kenney](https://kenney.nl/assets?q=audio)、[Freesound](https://freesound.org)（篩選 CC0）
- BGM：[Pixabay Music](https://pixabay.com/music/)、[FreePD](https://freepd.com)
- AI 生成：[ElevenLabs](https://elevenlabs.io/sound-effects)

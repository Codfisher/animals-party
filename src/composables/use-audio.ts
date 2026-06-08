import { useStorage } from '@vueuse/core';
import { watch } from 'vue';

/** 短音效名稱（皆為程式合成，見 scripts/generate-audio.mjs）。
 * 共用音效直接命名，各遊戲專屬音效以 `<遊戲>/<音效>` 命名。 */
export type SoundName =
  // 跨遊戲共用（common/）
  | 'click'
  | 'confirm'
  | 'win'
  | 'lose'
  | 'countdown'
  | 'start'
  // 各遊戲專屬互動音效（<遊戲>/）
  | 'chicken-fly/collide'
  | 'chicken-fly/dead'
  | 'fox-and-mouse/catch'
  | 'fox-and-mouse/pounce'
  | 'the-first-penguin/collide'
  | 'the-first-penguin/splash'
  | 'the-first-penguin/attack';

/** 背景音樂名稱，對應 public/audio/<名稱>/bgm.mp3（目前為 placeholder，可逐步替換） */
export type BgmName = 'lobby' | 'chicken-fly' | 'fox-and-mouse' | 'the-first-penguin';

interface PlayOption {
  /** 相對音量 0~1，會再乘上主音量 */
  volume?: number;
}

/** 部分瀏覽器（舊版 Safari）僅提供前綴版 AudioContext */
type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const soundFileMap: Record<SoundName, string> = {
  click: 'common/click.mp3',
  confirm: 'common/confirm.mp3',
  win: 'common/win.mp3',
  lose: 'common/lose.mp3',
  countdown: 'common/countdown.mp3',
  start: 'common/start.mp3',
  'chicken-fly/collide': 'chicken-fly/collide.mp3',
  'chicken-fly/dead': 'chicken-fly/dead.mp3',
  'fox-and-mouse/catch': 'fox-and-mouse/catch.mp3',
  'fox-and-mouse/pounce': 'fox-and-mouse/pounce.mp3',
  'the-first-penguin/collide': 'the-first-penguin/collide.mp3',
  'the-first-penguin/splash': 'the-first-penguin/splash.mp3',
  'the-first-penguin/attack': 'the-first-penguin/attack.mp3',
};

const bgmFileMap: Record<BgmName, string> = {
  lobby: 'lobby/bgm.mp3',
  'chicken-fly': 'chicken-fly/bgm.mp3',
  'fox-and-mouse': 'fox-and-mouse/bgm.mp3',
  'the-first-penguin': 'the-first-penguin/bgm.mp3',
};

/** 部署於子路徑時 BASE_URL 才能正確指向 public 資產 */
function audioUrl(file: string) {
  return `${import.meta.env.BASE_URL}audio/${file}`;
}

// ── 模組層級單例狀態 ────────────────────────────────────────

let audioContext: AudioContext | undefined;
const bufferMap = new Map<SoundName, AudioBuffer>();
let preloadPromise: Promise<void> | undefined;
let unlocked = false;

/** BGM 以雙元素交叉淡入淡出，達成切換／停止的平滑過度 */
let bgmA: HTMLAudioElement | undefined;
let bgmB: HTMLAudioElement | undefined;
/** 目前主導（淡入中或已播放）的元素 */
let activeBgm: HTMLAudioElement | undefined;
let currentBgm: BgmName | undefined;
/** 進行中的淡變動畫 handle */
let fadeHandle: number | undefined;

/** 淡變時間（毫秒） */
const BGM_FADE_DURATION = 800;

/** 使用者偏好，持久化於 localStorage */
const muted = useStorage('animals-party-audio-muted', false);
/** 主音量 0~1 */
const masterVolume = useStorage('animals-party-audio-volume', 0.7);
/** BGM 相對音量 0~1（再乘上主音量） */
const bgmVolume = useStorage('animals-party-bgm-volume', 0.5);

/** 偏好變動時即時套用至 BGM */
watch([muted, masterVolume, bgmVolume], applyBgmVolume);

function ensureContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return undefined;
    audioContext = new Ctor();
  }
  return audioContext;
}

/** 預載並解碼所有短音效，失敗者個別略過不影響其餘 */
function preload() {
  if (preloadPromise) return preloadPromise;

  const context = ensureContext();
  if (!context) return Promise.resolve();

  const names = Object.keys(soundFileMap) as SoundName[];
  preloadPromise = Promise.all(
    names.map(async (name) => {
      try {
        const response = await fetch(audioUrl(soundFileMap[name]));
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(arrayBuffer);
        bufferMap.set(name, buffer);
      } catch (error) {
        console.warn(`[useAudio] 音效載入失敗：${name}`, error);
      }
    }),
  ).then(() => undefined);

  return preloadPromise;
}

/** 解鎖音訊：需於使用者手勢（點擊、按鍵）中呼叫，否則瀏覽器擋自動播放 */
async function unlock() {
  if (unlocked) return;
  unlocked = true;

  const context = ensureContext();
  if (context?.state === 'suspended') {
    await context.resume().catch(() => undefined);
  }

  /** 解鎖前呼叫 playBgm 會被自動播放限制擋下，於此補播 */
  if (activeBgm?.paused) {
    activeBgm.volume = targetBgmVolume();
    activeBgm.play().catch(() => undefined);
  }

  await preload();
}

/** 播放短音效，未解鎖、靜音或載入失敗時靜默略過 */
function play(name: SoundName, option?: PlayOption) {
  if (muted.value) return;

  const context = audioContext;
  const buffer = bufferMap.get(name);
  if (!context || !buffer) return;

  if (context.state === 'suspended') void context.resume();

  const source = context.createBufferSource();
  source.buffer = buffer;

  const gainNode = context.createGain();
  gainNode.gain.value = masterVolume.value * (option?.volume ?? 1);

  source.connect(gainNode).connect(context.destination);
  source.start();
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** 目標 BGM 音量（靜音為 0） */
function targetBgmVolume() {
  return muted.value ? 0 : masterVolume.value * bgmVolume.value;
}

function createBgmElement() {
  const element = new Audio();
  element.loop = true;
  element.preload = 'auto';
  element.volume = 0;
  return element;
}

function ensureBgmPool() {
  if (!bgmA) bgmA = createBgmElement();
  if (!bgmB) bgmB = createBgmElement();
}

/** 偏好變動（音量／靜音）時即時套用至主導元素 */
function applyBgmVolume() {
  /** 淡變進行中由動畫負責；其每幀讀取最新目標值，故此處只需處理靜態情況 */
  if (fadeHandle !== undefined) return;
  if (activeBgm) activeBgm.volume = targetBgmVolume();
}

/** 同時驅動「淡入元素」與「淡出元素」的音量動畫，淡出者結束後暫停 */
function startFade(fadeIn: HTMLAudioElement | undefined, fadeOut: HTMLAudioElement | undefined) {
  if (fadeHandle !== undefined) cancelAnimationFrame(fadeHandle);

  const fromIn = fadeIn?.volume ?? 0;
  const fromOut = fadeOut?.volume ?? 0;
  const start = performance.now();

  const step = (now: number) => {
    const progress = clamp01((now - start) / BGM_FADE_DURATION);
    /** 每幀讀取最新目標值，淡變途中調整音量／靜音也能即時反映 */
    const target = targetBgmVolume();

    if (fadeIn) fadeIn.volume = clamp01(fromIn + (target - fromIn) * progress);
    if (fadeOut) fadeOut.volume = clamp01(fromOut * (1 - progress));

    if (progress < 1) {
      fadeHandle = requestAnimationFrame(step);
      return;
    }

    fadeHandle = undefined;
    /** 淡出元素若已非主導，停止並歸零以釋放 */
    if (fadeOut && fadeOut !== activeBgm) {
      fadeOut.pause();
      fadeOut.currentTime = 0;
    }
  };

  fadeHandle = requestAnimationFrame(step);
}

/** 播放背景音樂，與目前曲目交叉淡入淡出；自動播放被擋時於下次手勢解鎖後生效 */
function playBgm(name: BgmName) {
  ensureBgmPool();

  /** 同一首且仍在播放，不重複切換 */
  if (currentBgm === name && activeBgm && !activeBgm.paused) return;
  currentBgm = name;

  /** 以另一個元素載入新曲目，與舊曲目交叉淡變 */
  const incoming = activeBgm === bgmA ? bgmB! : bgmA!;
  const outgoing = activeBgm;

  incoming.src = audioUrl(bgmFileMap[name]);
  incoming.currentTime = 0;
  incoming.volume = 0;
  incoming.play().catch(() => undefined);

  activeBgm = incoming;
  startFade(incoming, outgoing);
}

/** 停止背景音樂，漸出後暫停，不會忽然中止 */
function stopBgm() {
  const outgoing = activeBgm;
  activeBgm = undefined;
  currentBgm = undefined;
  if (!outgoing) return;

  startFade(undefined, outgoing);
}

/** 全域音效控制器（模組單例，任何元件取得的都是同一份狀態） */
export function useAudio() {
  return {
    /** 於首次使用者手勢呼叫以解鎖瀏覽器自動播放限制 */
    unlock,
    /** 播放短音效 */
    play,
    /** 播放背景音樂 */
    playBgm,
    /** 停止背景音樂 */
    stopBgm,
    /** 切換靜音 */
    toggleMute() {
      muted.value = !muted.value;
    },
    /** 靜音狀態（可雙向綁定） */
    muted,
    /** 主音量 0~1（可雙向綁定） */
    masterVolume,
    /** BGM 相對音量 0~1（可雙向綁定） */
    bgmVolume,
  };
}

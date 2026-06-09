// 零相依音效合成腳本：用原始 PCM 波形產生派對遊戲音效（WAV）。
// 風格：圓潤、可愛、歡賀。執行：node scripts/generate-audio.mjs
// 產物：public/audio/*.wav（皆為程式合成，無第三方授權問題）

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SAMPLE_RATE = 44100;
const OUTPUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/audio');

/** 依波形回傳 [-1,1] 的瞬時振幅（以 sine、triangle 為主，較圓潤） */
function oscillator(type, phase) {
  switch (type) {
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
    case 'sine':
    default:
      return Math.sin(phase);
  }
}

/** 產生單音，支援音高滑移、vibrato 抖動與彈撥式衰減（圓潤可愛的關鍵） */
function createTone({
  freq,
  freqEnd = freq,
  duration,
  type = 'sine',
  volume = 0.5,
  attack = 0.012,
  release = 0.08,
  vibratoRate = 0,
  vibratoDepth = 0,
  decayRate = 0,
}) {
  const length = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(length);
  let phase = 0;

  for (let i = 0; i < length; i++) {
    const time = i / SAMPLE_RATE;
    const progress = i / length;

    /** 音高滑移採等比，聽感更自然 */
    const base = freq * Math.pow(freqEnd / freq, progress);
    const vibrato = vibratoDepth ? Math.sin(2 * Math.PI * vibratoRate * time) * vibratoDepth : 0;
    phase += (2 * Math.PI * (base + vibrato)) / SAMPLE_RATE;

    const timeLeft = duration - time;
    let envelope = 1;
    if (time < attack) envelope = time / attack;
    else if (timeLeft < release) envelope = Math.max(0, timeLeft / release);
    /** 彈撥式指數衰減，模擬鐘琴／木琴的圓潤尾音 */
    if (decayRate) envelope *= Math.exp(-decayRate * time);

    samples[i] = oscillator(type, phase) * volume * envelope;
  }
  return samples;
}

/** 鐘琴／木琴式圓潤音：基頻 + 衰減較快的高諧波，溫暖又可愛 */
function createBell({ freq, duration, volume = 0.5, decayRate = 6 }) {
  const partials = [
    { mult: 1, amp: 1, decay: decayRate },
    { mult: 2, amp: 0.45, decay: decayRate * 1.5 },
    { mult: 3, amp: 0.2, decay: decayRate * 2 },
  ];
  return mix(
    ...partials.map((partial) =>
      createTone({
        freq: freq * partial.mult,
        duration,
        type: 'sine',
        volume: volume * partial.amp,
        decayRate: partial.decay,
        attack: 0.004,
        release: 0.05,
      }),
    ),
  );
}

/** 柔和噪音：強低通讓水花更圓潤、不刺耳 */
function createNoise({ duration, volume = 0.5, decay = 12, lowpass = 0.12 }) {
  const length = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float32Array(length);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const time = i / SAMPLE_RATE;
    const white = Math.random() * 2 - 1;
    last += lowpass * (white - last);
    samples[i] = last * volume * Math.exp(-decay * time);
  }
  return samples;
}

/** 多軌相加（取最長長度） */
function mix(...tracks) {
  const length = Math.max(...tracks.map((t) => t.length));
  const out = new Float32Array(length);
  for (const track of tracks) {
    for (let i = 0; i < track.length; i++) out[i] += track[i];
  }
  return out;
}

/** 依序串接 */
function concat(...tracks) {
  const length = tracks.reduce((sum, t) => sum + t.length, 0);
  const out = new Float32Array(length);
  let offset = 0;
  for (const track of tracks) {
    out.set(track, offset);
    offset += track.length;
  }
  return out;
}

/** 靜音軌（用於 placeholder） */
function silence(duration) {
  return new Float32Array(Math.floor(duration * SAMPLE_RATE));
}

/** 在指定起點疊入一軌（用於 sparkle 錯位堆疊） */
function overlayAt(base, track, startTime) {
  const start = Math.floor(startTime * SAMPLE_RATE);
  const length = Math.max(base.length, start + track.length);
  const out = new Float32Array(length);
  out.set(base, 0);
  for (let i = 0; i < track.length; i++) out[start + i] += track[i];
  return out;
}

/** 全域削峰 + 頭尾 4ms 淡入淡出，避免爆音 */
function finalize(samples) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0.9 ? 0.9 / peak : 1;

  const fade = Math.floor(0.004 * SAMPLE_RATE);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    let env = 1;
    if (i < fade) env = i / fade;
    else if (i > samples.length - fade) env = (samples.length - i) / fade;
    out[i] = samples[i] * gain * env;
  }
  return out;
}

/** Float32 [-1,1] → 16-bit PCM WAV Buffer（單聲道） */
function encodeWav(samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buffer;
}

/** 短促下彎「啵／噗」blip，落地、收尾的喜感點綴 */
function createPop({ freq = 160, freqEnd = 70, duration = 0.1, volume = 0.5 }) {
  return createTone({ freq, freqEnd, duration, type: 'sine', volume, attack: 0.002, decayRate: 28 });
}

// ── 音效設計（圓潤、可愛、喜感）──────────────────────────────

// C 大調，明亮歡快
const NOTE = { C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, C6: 1046, E6: 1318, G6: 1568, C7: 2093 };

// 跨遊戲共用（UI／流程），輸出至 common/
const commonSounds = {
  /** UI 點擊：俏皮上彈「啵」 */
  click: () =>
    createTone({
      freq: 520, freqEnd: 1050, duration: 0.09, type: 'triangle', volume: 0.5,
      attack: 0.003, decayRate: 7,
    }),

  /** 確認：彈跳上行三鈴「叮叮鈴！」 */
  confirm: () =>
    concat(
      createBell({ freq: NOTE.E5, duration: 0.08, volume: 0.45, decayRate: 13 }),
      createBell({ freq: NOTE.G5, duration: 0.08, volume: 0.45, decayRate: 13 }),
      createBell({ freq: NOTE.C6, duration: 0.24, volume: 0.5, decayRate: 7 }),
    ),

  /** 勝利：滑稽滑哨導入 → 大調琶音 → 抖動和弦 → 上行 sparkle，浮誇歡賀 */
  win: () => {
    /** 開頭來一記上行滑哨「咻～」 */
    const whoop = createTone({
      freq: 350, freqEnd: 920, duration: 0.18, type: 'triangle', volume: 0.32,
      attack: 0.005, release: 0.04,
    });
    const arpeggio = concat(
      createBell({ freq: NOTE.C5, duration: 0.1, volume: 0.5, decayRate: 11 }),
      createBell({ freq: NOTE.E5, duration: 0.1, volume: 0.5, decayRate: 11 }),
      createBell({ freq: NOTE.G5, duration: 0.1, volume: 0.5, decayRate: 11 }),
      mix(
        /** 主音用 vibrato 抖動，帶點滑稽的「噹～嗯嗯」 */
        createTone({
          freq: NOTE.C6, duration: 0.7, type: 'triangle', volume: 0.4,
          release: 0.3, vibratoRate: 7, vibratoDepth: 11,
        }),
        createBell({ freq: NOTE.E6, duration: 0.7, volume: 0.32, decayRate: 4 }),
        createBell({ freq: NOTE.G6, duration: 0.7, volume: 0.26, decayRate: 4 }),
      ),
    );
    /** 收尾灑上一串快速上行亮點 */
    const sparkleNotes = [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7];
    let result = concat(whoop, arpeggio);
    sparkleNotes.forEach((freq, index) => {
      const star = createBell({ freq, duration: 0.5, volume: 0.2, decayRate: 8 });
      result = overlayAt(result, star, 0.54 + index * 0.05);
    });
    return result;
  },

  /** 失敗：經典喜劇「嗚－嗚－嗚～」失意小號（下行三音 + 各自下彎、尾音抖動） */
  lose: () => {
    const womp = (freq, duration, expressive = false) =>
      createTone({
        freq, freqEnd: freq * 0.9, duration, type: 'sawtooth', volume: 0.34,
        attack: 0.015, release: expressive ? 0.25 : 0.05,
        vibratoRate: expressive ? 6 : 0, vibratoDepth: expressive ? 16 : 0,
      });
    return concat(womp(440, 0.2), womp(415, 0.2), womp(392, 0.5, true));
  },

  /** 倒數提示音：俏皮上彈短 beep */
  countdown: () =>
    createTone({
      freq: 680, freqEnd: 820, duration: 0.14, type: 'triangle', volume: 0.4,
      attack: 0.003, decayRate: 9,
    }),

  /** 開始：滑哨「咻」 → 亮鈴「叮！」 */
  start: () =>
    concat(
      createTone({
        freq: 480, freqEnd: 1080, duration: 0.2, type: 'sine', volume: 0.4,
        attack: 0.005, release: 0.04,
      }),
      createBell({ freq: NOTE.C6, duration: 0.3, volume: 0.5, decayRate: 6 }),
    ),
};

/** 撞擊：彈簧 boing bonk（下彎 sine + 強抖動 + 一點柔噪） */
const collide = () =>
  mix(
    createTone({
      freq: 480, freqEnd: 140, duration: 0.18, type: 'sine', volume: 0.6,
      attack: 0.003, decayRate: 7, vibratoRate: 26, vibratoDepth: 28,
    }),
    createNoise({ duration: 0.04, volume: 0.12, decay: 45, lowpass: 0.1 }),
  );

/** 落水出界：滑稽下彎「噗咚」+ 收尾啵 + 柔和水花 */
const splash = () =>
  mix(
    concat(
      createTone({
        freq: 760, freqEnd: 220, duration: 0.2, type: 'sine', volume: 0.4,
        attack: 0.003, decayRate: 4, vibratoRate: 16, vibratoDepth: 16,
      }),
      createPop({ freq: 200, freqEnd: 80, duration: 0.1, volume: 0.5 }),
    ),
    createNoise({ duration: 0.3, volume: 0.18, decay: 11, lowpass: 0.1 }),
  );

/** 抓到老鼠：彈跳上行三鈴 + 一記啵，得意的「逮到啦！」 */
const catchPrey = () =>
  overlayAt(
    concat(
      createBell({ freq: NOTE.G5, duration: 0.08, volume: 0.5, decayRate: 13 }),
      createBell({ freq: NOTE.C6, duration: 0.09, volume: 0.5, decayRate: 12 }),
      createBell({ freq: NOTE.E6, duration: 0.26, volume: 0.5, decayRate: 7 }),
    ),
    createPop({ freq: 220, freqEnd: 90, duration: 0.1, volume: 0.35 }),
    0,
  );

/** 企鵝攻擊：上揚抖動揮擊「咻呀」+ 一點柔噪 */
const attack = () =>
  mix(
    createTone({
      freq: 180, freqEnd: 520, duration: 0.13, type: 'triangle', volume: 0.45,
      attack: 0.003, decayRate: 9, vibratoRate: 22, vibratoDepth: 14,
    }),
    createNoise({ duration: 0.09, volume: 0.16, decay: 26, lowpass: 0.22 }),
  );

/** 小雞淘汰：滑哨墜落「咻～」+ 落地一記啵，喜劇收場 */
const dead = () =>
  concat(
    createTone({
      freq: 760, freqEnd: 150, duration: 0.55, type: 'sine', volume: 0.42,
      attack: 0.01, release: 0.12, vibratoRate: 16, vibratoDepth: 16,
    }),
    createPop({ freq: 140, freqEnd: 60, duration: 0.12, volume: 0.55 }),
  );

/** 狐狸撲擊：誇張上彈彈簧「啵嚶！」 */
const pounce = () =>
  createTone({
    freq: 240, freqEnd: 760, duration: 0.24, type: 'sine', volume: 0.5,
    attack: 0.004, release: 0.06, vibratoRate: 24, vibratoDepth: 26,
  });

// 各遊戲專屬的人物／互動音效，輸出至各自資料夾。
// 日後新增角色音效，在此對應遊戲下增加項目即可。
const gameSounds = {
  'chicken-fly': { collide, dead },
  'fox-and-mouse': { catch: catchPrey, pounce },
  'the-first-penguin': { collide, splash, attack },
};

// 需要 BGM placeholder 的資料夾（lobby 與各遊戲）
const bgmFolders = ['lobby', 'chicken-fly', 'fox-and-mouse', 'the-first-penguin'];

/** 以 ffmpeg 將 WAV buffer 轉成 mp3 buffer（VBR 品質 4，體積遠小於 WAV） */
function encodeMp3(wavBuffer) {
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'wav', '-i', 'pipe:0', '-q:a', '4', '-f', 'mp3', 'pipe:1'],
    { input: wavBuffer, maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg 轉檔失敗：${result.stderr?.toString() ?? result.error}`);
  }
  return result.stdout;
}

/** 寫入指定資料夾下的 mp3 音效檔 */
function writeSound(folder, name, samples) {
  const dir = resolve(OUTPUT_DIR, folder);
  mkdirSync(dir, { recursive: true });
  const mp3 = encodeMp3(encodeWav(finalize(samples)));
  writeFileSync(resolve(dir, `${name}.mp3`), mp3);
  console.log(`✓ ${folder}/${name}.mp3 (${(mp3.length / 1024).toFixed(1)} KB)`);
}

let soundCount = 0;

// 共用音效 → common/
for (const [name, build] of Object.entries(commonSounds)) {
  writeSound('common', name, build());
  soundCount++;
}

// 各遊戲互動音效 → <game>/
for (const [folder, group] of Object.entries(gameSounds)) {
  for (const [name, build] of Object.entries(group)) {
    writeSound(folder, name, build());
    soundCount++;
  }
}

// BGM placeholder（靜音但有效），已存在則保留，方便手動替換
for (const folder of bgmFolders) {
  const dir = resolve(OUTPUT_DIR, folder);
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, 'bgm.mp3');
  if (existsSync(path)) {
    console.log(`· ${folder}/bgm.mp3 已存在，略過（保留你替換的素材）`);
    continue;
  }
  writeFileSync(path, encodeMp3(encodeWav(silence(2))));
  console.log(`✓ ${folder}/bgm.mp3（placeholder 靜音，待替換）`);
}

console.log(`\n完成，${soundCount} 個音效 + ${bgmFolders.length} 個 BGM placeholder → ${OUTPUT_DIR}`);

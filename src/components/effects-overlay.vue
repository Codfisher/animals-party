<template>
  <teleport to="body">
    <canvas
      ref="canvas"
      class="effects-overlay"
    />
  </teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { useEventListener } from '@vueuse/core';
import {
  Engine, WebGPUEngine, Scene, FreeCamera, Vector3, Color4,
} from '@babylonjs/core';
import { createConfettiCannons } from './effects/confetti-cannon';
import { useEffects } from '../composables/use-effects';

/** 優先建立 WebGPU engine，不支援或初始化失敗時退回 WebGL */
async function createEngine(canvas: HTMLCanvasElement) {
  if (await WebGPUEngine.IsSupportedAsync) {
    let webgpuEngine: WebGPUEngine | undefined;
    try {
      webgpuEngine = new WebGPUEngine(canvas, { antialias: true });
      await webgpuEngine.initAsync();
      return webgpuEngine;
    } catch (error) {
      console.warn('[effects-overlay] WebGPU 初始化失敗，改用 WebGL', error);
      /** 釋放半初始化的 WebGPU engine，避免殘留錯誤 */
      webgpuEngine?.dispose();
    }
  }
  return new Engine(canvas, true);
}

/** 覆蓋於最上層的全螢幕特效層（獨立 Babylon canvas），目前用於慶祝彩帶。
 *
 * 平時不渲染，觸發特效後才啟動 render loop，並於粒子生命週期結束後停止以省效能。 */

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const effects = useEffects();

let engine: Engine | WebGPUEngine | undefined;
let confettiHandler: (() => void) | undefined;
let stopTimer: ReturnType<typeof setTimeout> | undefined;
/** 標記元件是否已卸載，避免 WebGPU 非同步初始化完成時元件已不存在 */
let disposed = false;

/** 噴發後持續渲染的時間（毫秒），需大於粒子最長生命週期 */
const RENDER_DURATION = 7000;

/** 視窗縮放時同步 engine 尺寸（VueUse 會於卸載時自動移除監聽） */
useEventListener(window, 'resize', () => engine?.resize());

onMounted(async () => {
  if (!canvas.value) return;

  engine = await createEngine(canvas.value);
  if (disposed) {
    engine.dispose();
    return;
  }

  const scene = new Scene(engine);
  /** 透明背景，讓特效疊在頁面之上 */
  scene.clearColor = new Color4(0, 0, 0, 0);

  const camera = new FreeCamera('effects-camera', new Vector3(0, 0, -30), scene);
  camera.setTarget(Vector3.Zero());

  const confetti = createConfettiCannons(scene);

  // 平時不渲染，觸發時才噴發並啟動 render loop，數秒後自動停止以省效能
  confettiHandler = () => {
    confetti.start();
    engine?.runRenderLoop(() => scene.render());

    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = setTimeout(() => engine?.stopRenderLoop(), RENDER_DURATION);
  };
  effects.onConfetti(confettiHandler);
});

onBeforeUnmount(() => {
  disposed = true;
  if (confettiHandler) effects.offConfetti(confettiHandler);
  if (stopTimer) clearTimeout(stopTimer);
  engine?.dispose();
});
</script>

<style scoped lang="sass">
.effects-overlay
  position: fixed
  inset: 0
  width: 100%
  height: 100%
  pointer-events: none
  z-index: 99999
</style>

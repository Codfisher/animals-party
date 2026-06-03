<template>
  <canvas ref="canvas" />
</template>


<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ArcRotateCamera, BackEase, BackgroundMaterial, BezierCurveEase, Color3,
  EasingFunction,
  Engine, HemisphericLight, MeshBuilder, Scene, Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';

import { defaults } from 'lodash-es';

import { GameName, ModelIsland } from '../types';
import { createAnimation } from '../common/utils';
import { createPenguinIsland } from './game-menu/the-first-penguin';
import { createChickenFlyIsland } from './game-menu/chicken-fly';
import { createFoxAndMouseIsland } from './game-menu/fox-and-mouse';

import { useBabylonScene } from '../composables/use-babylon-scene';

interface Shot {
  name: `${GameName}`;
  camera: {
    target: Vector3;
    alpha: number;
    beta: number;
    radius: number;
  }
}

interface Props {
  selectedGame: `${GameName}`;
}
const props = withDefaults(defineProps<Props>(), {});

const emit = defineEmits<{
  (e: 'completed'): void;
  (e: 'camera-movement-start'): void;
  (e: 'camera-movement-end'): void;
}>();

const { canvas, camera } = useBabylonScene({
  createScene(engine: Engine) {
    const scene = new Scene(engine);
    /** 使用預設光源 */
    scene.createDefaultLight();
    const defaultLight = scene.lights.at(-1);
    if (defaultLight instanceof HemisphericLight) {
      defaultLight.direction = new Vector3(0.5, 1, 0);
    }

    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogStart = 50;
    scene.fogEnd = 400;

    const color = Color3.FromHexString('#f0faff');
    scene.clearColor = color.toColor4(1);
    scene.fogColor = color;

    return scene;
  },
  createCamera(scene) {
    const camera = new ArcRotateCamera(
      'camera',
      1.5, 0, 360,
      new Vector3(-28, 1.3, -0.5),
      scene
    );

    camera.attachControl(canvas.value, true);
    /** 調整滾輪縮放程度 */
    camera.wheelDeltaPercentage = 0.01;

    return camera;
  },
  async init({ scene, camera }) {
    createSea(scene);
    await createIslands(scene);

    window.addEventListener('keydown', (ev) => {
      // 按下 Shift+I 可以切換視窗
      if (ev.shiftKey && ev.keyCode === 73) {
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide();
        } else {
          scene.debugLayer.show();
        }
      }
    });

    /** 發出完成事件，表示畫面初始化完成 */
    emit('completed');

    moveCamera(camera);
  }
});

const shots: Shot[] = [
  {
    name: 'the-first-penguin',
    camera: {
      target: new Vector3(-4, 0.67, 1.31),
      alpha: 4.339,
      beta: 1.034,
      radius: 13.046,
    }
  },
  {
    name: 'chicken-fly',
    camera: {
      target: new Vector3(0.9, 14, 29.6),
      alpha: 0.5,
      beta: 1.2,
      radius: 31,
    }
  },
  {
    name: 'fox-and-mouse',
    camera: {
      target: new Vector3(8.4, -4.2, 42),
      alpha: 2.5,
      beta: 1.1,
      radius: 24.2,
    }
  },
];

const defaultEase = new BackEase();
defaultEase.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
/** 鏡頭移動預設值 */
const moveCameraDefaultParams: {
  speed: number;
  easingFunction: EasingFunction;
} = {
  speed: 0.15,
  easingFunction: defaultEase,
}
async function moveCamera(
  camera: ArcRotateCamera, params?: Partial<typeof moveCameraDefaultParams>
) {
  const shot = shots.find(({ name }) => name === props.selectedGame);
  if (!shot) return;

  const { speed, easingFunction } = defaults(params, moveCameraDefaultParams);

  const results = [
    createAnimation(camera, 'target', shot.camera.target, { easingFunction }),
    createAnimation(camera, 'alpha', shot.camera.alpha, { easingFunction }),
    createAnimation(camera, 'beta', shot.camera.beta, { easingFunction }),
    createAnimation(camera, 'radius', shot.camera.radius),
  ]

  /** 直接覆蓋鏡頭動畫，以免再次呼叫 moveCamera 的新舊動畫互相影響 */
  camera.animations = results.map(({ animation }) => animation);

  emit('camera-movement-start');
  const ref = camera._scene.beginAnimation(camera, 0, results[0].frameRate, false, speed);
  await ref.waitAsync();
  emit('camera-movement-end');

  const target = islands.find(({ name }) => name === props.selectedGame);
  target?.setActive(true);
}


watch(() => props.selectedGame, () => {
  const easingFunction = new BezierCurveEase(0.800, -0.155, 0.000, 1.000);

  if (camera.value) {
    moveCamera(camera.value, {
      speed: 0.3,
      easingFunction,
    });
  }
});

function createSea(scene: Scene) {
  const sea = MeshBuilder.CreateGround('sea', { height: 1000, width: 1000 });

  const material = new BackgroundMaterial('sea-material', scene);
  material.useRGBColor = false;
  material.primaryColor = new Color3(71 / 256, 174 / 256, 250 / 256);

  sea.material = material;

  return sea;
}

/** 將所有島嶼儲存至此 */
let islands: ModelIsland[] = [];
async function createIslands(scene: Scene) {
  const results = await Promise.allSettled([
    createPenguinIsland(scene),
    createChickenFlyIsland(scene, {
      position: new Vector3(-2, 16, 37),
    }),
    createFoxAndMouseIsland(scene, {
      position: new Vector3(-1, 0, 44),
    }),
  ]);

  results.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    islands.push(result.value);
  });
}
</script>

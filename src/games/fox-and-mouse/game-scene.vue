<template>
  <div class="overflow-hidden">
    <canvas
      ref="canvas"
      class="outline-none w-full h-full"
    />

    <UModal
      :open="isGameOver && props.mode === 'normal'"
      :dismissible="false"
    >
      <template #content>
        <player-leaderboard :id-list="getRankedIdList(players)">
          <div class="text-xl text-gray-400 p-5 text-center">
            按下 <UIcon name="i-material-symbols-done" /> 回到大廳
          </div>
        </player-leaderboard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import * as CANNON from 'cannon-es';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  MeshBuilder,
  Scene, BackgroundMaterial,
  Color3,
  StandardMaterial,
  SolidParticleSystem,
  Scalar,
  Vector3,
  CannonJSPlugin,
  PhysicsImpostor,
  Engine,
} from '@babylonjs/core';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
import { Fox } from './fox';
import { Mouse } from './mouse';
import { cloneDeep, compact, curry, range, throttle } from 'lodash-es';
import { getRandomPositions, getSquareMatrixPositions } from '../../common/utils';
import { GamepadData, GameSceneMode, KeyName, SignalData } from '../../types';
import { getPlayerColorRgb } from '../../common/color';

import PlayerLeaderboard from '../../components/player-leaderboard.vue';

import { useBabylonScene } from '../../composables/use-babylon-scene';
import { promiseTimeout } from '@vueuse/core';
import { useClientGameConsole } from '../../composables/use-client-game-console';

interface Props {
  mode?: `${GameSceneMode}`;
}
const props = withDefaults(defineProps<Props>(), {
  mode: 'normal',
});

const emit = defineEmits<{
  (e: 'init'): void;
  (e: 'back-to-lobby'): void;
  (e: 'game-over'): void;
}>();

const gameConsole = useClientGameConsole();

const isGameOver = ref(false);
/** 遊戲場景邊界 */
const sceneBoundary = {
  x: 16,
  z: 10,
}

const players: Fox[] = [];
function getRankedIdList(foxes: Fox[]) {
  const result = cloneDeep(foxes)
    /** 從大到小 */
    .sort((a, b) => b.mouseSize - a.mouseSize)
    .map(({ param }) => param.ownerId);

  return result;
}

const { canvas } = useBabylonScene({
  async init({ engine, scene, camera }) {
    const physicsPlugin = new CannonJSPlugin(true, 8, CANNON);
    scene.enablePhysics(new Vector3(0, -9, 0), physicsPlugin);

    camera.attachControl(canvas.value, true);
    camera.wheelDeltaPercentage = 0.1;
    camera.beta = 0.5;

    createSnowfield(scene);
    createStones(scene);
    const mice = await createMice(scene);
    const foxes = await createFoxes(scene);
    players.push(...foxes);
    initGamepadEvent(foxes);

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

    scene.registerBeforeRender(() => {
      if (isGameOver.value) return;

      detectCollideEvent(foxes, mice);
      detectGameOver(foxes, engine);
    });

    emit('init');
  }
});


function createSnowfield(scene: Scene) {
  const snowfield = MeshBuilder.CreateGround('snowfield ', { height: 150, width: 150 });

  const material = new BackgroundMaterial("snowfield-material", scene);
  material.useRGBColor = false;
  material.primaryColor = new Color3(0.93, 0.95, 0.95);

  snowfield.material = material;
  snowfield.physicsImpostor = new PhysicsImpostor(
    snowfield,
    PhysicsImpostor.PlaneImpostor,
    { mass: 0, friction: 0, restitution: 0 },
    scene
  );

  return snowfield;
}

function createStones(scene: Scene) {
  const stones = new SolidParticleSystem('stones', scene, {
    useModelMaterial: true
  });

  const material = new StandardMaterial('stone-material', scene);
  material.diffuseColor = new Color3(0.5, 0.5, 0.5);
  material.emissiveColor = new Color3(0.5, 0.5, 0.5);

  const stone = MeshBuilder.CreateBox('stone', {
    width: 0.5,
    depth: 0.5,
    height: 0.2,
  });
  stone.material = material;

  stones.addShape(stone, 20);
  /** 新增至 SolidParticleSystem 後原本的 cloud 就可以停用了 */
  stone.dispose();

  /** 實際建立 mesh */
  const mesh = stones.buildMesh();

  /** 建立初始化 function */
  stones.initParticles = () => {
    stones.particles.forEach((particle) => {
      /** 隨機分布 */
      particle.position.x = Scalar.RandomRange(-sceneBoundary.x * 2, sceneBoundary.x * 2);
      particle.position.z = Scalar.RandomRange(-sceneBoundary.z * 2, sceneBoundary.z * 2);

      const scaling = Scalar.RandomRange(0.5, 1);
      /** 隨機尺寸 */
      particle.scaling = new Vector3(scaling, Scalar.RandomRange(0.5, 1), scaling);
    });
  };

  /** 初始化 */
  stones.initParticles();
  stones.setParticles();

  return stones;
}

async function createMice(scene: Scene) {
  /** 老鼠數量，比玩家數量多 3 個 */
  const quantity = gameConsole.players.value.length + 3;
  const { x, z } = sceneBoundary;

  const positions = getRandomPositions({
    offset: {
      x,
      y: 0,
      z,
    },
    minDistance: 5,
    length: quantity,
  });

  const task = positions.map((position, i) =>
    new Mouse(`mouse-${i}`, scene, {
      position,
      size: (i + 1) * 100,
    }).init()
  );

  const results = await Promise.allSettled(task);

  return compact(results.map(
    (result) => result.status === 'fulfilled' ? result.value : undefined,
  ));
}
async function createFox(id: string, position: Vector3, scene: Scene) {
  /** 依照玩家 ID 取得對應顏色名稱並轉換成 rgb */
  const codeName = gameConsole.getPlayerCodeName(id);
  const rgb = getPlayerColorRgb(codeName);

  const fox = await new Fox(`fox-${id}`, scene, {
    ownerId: id,
    position,
    color: new Color3(rgb.r / 255, rgb.g / 255, rgb.b / 255),
  }).init();

  return fox;
}
async function createFoxes(scene: Scene) {
  const players = gameConsole.players.value;
  const positions = getSquareMatrixPositions(5, players.length, new Vector3(0, 1, 0));

  const tasks = players.map((player, i) =>
    createFox(player.clientId, positions[i], scene),
  );

  const results = await Promise.allSettled(tasks);

  /** 去除建立失敗的狐狸 */
  const foxes = compact(results.map(
    (result) => result.status === 'fulfilled' ? result.value : undefined,
  ));

  return foxes;
}

/** 為每個玩家建立 throttled emit */
type ThrottledEmitMouseSizeMap = Record<string, (size: number) => void>
const throttledEmitMouseSizeMap: ThrottledEmitMouseSizeMap = gameConsole.players.value.reduce(
  (result, player) => {
    result[player.clientId] = throttle((size: number) => {
      gameConsole.emitConsoleData({
        targets: [player.clientId],
        data: {
          name: 'vibrate',
          value: size,
        }
      });
    }, 500);

    return result;
  },
  {} as ThrottledEmitMouseSizeMap
);

/** 偵測碰撞事件 */
function detectCollideEvent(foxes: Fox[], mice: Mouse[]) {
  foxes.forEach((fox) => {
    const foxState = fox.getState();

    /** dive 狀態不需要檢查 */
    if (['dive'].includes(foxState)) return;

    const foxMesh = fox.mesh;
    if (!foxMesh) return;

    /** 抓到的老鼠尺寸 */
    let caughtSize = 0;
    mice.forEach((mouse) => {
      const mouseMesh = mouse.mesh;
      /** 已經被抓到的老鼠不用檢查 */
      if (mouse.isCaught || !mouseMesh) return;

      const isIntersects = foxMesh.intersectsMesh(mouseMesh);

      /** 抓到了 */
      if (foxState === 'pounce' && isIntersects) {
        mouse.caught();
        fox.setMouseSize(mouse.params.size);
      }

      if (isIntersects) {
        caughtSize = mouse.params.size;
      }
    })

    /** 發送尺寸 */
    throttledEmitMouseSizeMap[fox.param.ownerId]?.(caughtSize);
  });
}

/** 偵測遊戲是否結束 */
async function detectGameOver(foxes: Fox[], engine: Engine) {
  const anyEmptyHanded = foxes.some(({ mouseSize }) => mouseSize === 0);

  /** 有人還沒抓到老鼠，遊戲尚未結束 */
  if (anyEmptyHanded) return;

  /** 等待一下再結束 */
  await promiseTimeout(2000);

  if (!isGameOver.value) {
    emit('game-over');
  }

  isGameOver.value = true;
}

function initGamepadEvent(foxes: Fox[]) {
  gameConsole.onGamepadData((data) => {
    const { playerId } = data;

    /** 找到對應的狐狸 */
    const target = foxes.find(
      ({ param }) => param.ownerId === playerId
    );
    if (!target) return;

    ctrlFox(target, data);
  });
}

/** 根據 key 取得資料 */
const findSingleData = curry((keys: SignalData[], name: `${KeyName}`): SignalData | undefined =>
  keys.find((key) => key.name === name)
);

/** 控制指定狐狸 */
function ctrlFox(fox: Fox, data: GamepadData) {
  const { keys } = data;
  const findData = findSingleData(keys);

  // 確認按鍵
  const confirmData = findData('confirm');
  if (confirmData && isGameOver.value) {
    emit('back-to-lobby');
    isGameOver.value = false;
    return;
  }

  // 抓老鼠
  const aData = findData('a');
  if (aData) {
    if (props.mode === 'showcase') {
      return;
    }
    fox.pounce();
    return;
  }

  // 移動按鍵
  const xData = findData('x-axis');
  const yData = findData('y-axis');

  const x = xData?.value ?? 0;
  const y = yData?.value ?? 0;

  if (typeof x === 'number' && typeof y === 'number') {
    /** 搖桿向左時 x 為負值，而往左是螢幕的 +x 方向，所以要反轉 */
    fox.walk(new Vector3(-x, 0, y));
  }
}
</script>

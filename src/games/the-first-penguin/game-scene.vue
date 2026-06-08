<template>
  <div class="overflow-hidden">
    <canvas ref="canvas" class="outline-none w-full h-full" />

    <UModal
      :open="isGameOver && props.mode === 'normal'"
      :dismissible="false"
      class="bg-transparent shadow-none ring-0"
    >
      <template #content>
        <player-leaderboard :id-list="getRankedIdList(penguins)">
          <div class="text-xl text-gray-400 p-5 flex items-center justify-center gap-1.5">
            按下
            <UIcon name="material-symbols:done" /> 回到大廳
          </div>
        </player-leaderboard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import * as CANNON from 'cannon-es';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ArcRotateCamera,
  BackgroundMaterial,
  CannonJSPlugin,
  Color3,
  KeyboardEventTypes,
  MeshBuilder,
  PhysicsImpostor,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { Penguin } from './penguin';
import { curry } from 'lodash-es';
import { GamepadData, GameSceneMode, KeyName, SignalData } from '../../types';
import { createAnimation, getSquareMatrixPositions } from '../../common/utils';
import { getPlayerColorRgb } from '../../common/color';

import PlayerLeaderboard from '../../components/player-leaderboard.vue';

import { useClientGameConsole } from '../../composables/use-client-game-console';
import { useCpuPlayer } from '../../composables/use-cpu-player';
import { useRouter } from 'vue-router';
import { useLoading } from '../../composables/use-loading';
import { useBabylonScene, type BabylonEngine } from '../../composables/use-babylon-scene';
import { useEffects } from '../../composables/use-effects';

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
const cpuPlayer = useCpuPlayer();

const { canvas } = useBabylonScene({
  createCamera(scene: Scene) {
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 4,
      34,
      new Vector3(0, 0, 2),
      scene,
    );

    return camera;
  },

  async init({ scene, engine }) {
    const physicsPlugin = new CannonJSPlugin(true, 8, CANNON);
    scene.enablePhysics(new Vector3(0, -9.81, 0), physicsPlugin);

    createSea(scene);
    createIce(scene);

    const players = gameConsole.players.value;
    const positions = getSquareMatrixPositions(5, players.length, new Vector3(0.1, 10, 0));
    const tasks = players.map(({ clientId }, index) =>
      createPenguin(clientId, index, scene, {
        position: positions[index],
      }),
    );
    const result = await Promise.allSettled(tasks);
    result.forEach((data) => {
      if (data.status !== 'fulfilled') return;
      penguins.push(data.value);
    });

    initGamepadEvent();

    const cpuPenguinList = penguins.filter((p) => {
      const player = gameConsole.players.value.find(({ clientId }) => clientId === p.params.ownerId);
      return player && cpuPlayer.isCpuPlayer(player);
    });

    let cpuFrameCount = 0;

    /** 持續運行指定事件 */
    scene.registerAfterRender(() => {
      detectCollideEvents(penguins);
      detectOutOfBounds(penguins);
      detectWinner(penguins, engine);

      if (cpuPenguinList.length > 0 && props.mode === 'normal') {
        cpuFrameCount++;
        // 約每 10 幀更新一次，降低 CPU 反應速度讓玩家有機可乘
        if (cpuFrameCount % 10 === 0) {
          cpuPenguinList.forEach((cpuPenguin) => {
            if (!cpuPenguin.mesh || cpuPenguin.mesh.isDisposed()) return;
            runCpuAiStep(cpuPenguin);
          });
        }
      }
    });

    emit('init');
  },
});

function createSea(scene: Scene) {
  const sea = MeshBuilder.CreateGround('sea', { height: 1000, width: 1000 });

  const material = new BackgroundMaterial('seaMaterial', scene);
  material.useRGBColor = false;
  material.primaryColor = new Color3(0.57, 0.7, 0.83);

  sea.material = material;

  return sea;
}

function createIce(scene: Scene) {
  const ice = MeshBuilder.CreateBox('ice', {
    width: 30,
    depth: 30,
    height: 4,
  });
  ice.material = new StandardMaterial('iceMaterial', scene);
  // mass 設為 0，就可以固定在原地不動
  ice.physicsImpostor = new PhysicsImpostor(
    ice,
    PhysicsImpostor.BoxImpostor,
    { mass: 0, friction: 0, restitution: 0 },
    scene,
  );

  /** 建立動畫 */
  const { animation, frameRate } = createAnimation(ice, 'scaling', new Vector3(0.1, 1, 0.1), {
    speedRatio: 0.05,
  });

  ice.animations.push(animation);
  scene.beginAnimation(ice, 0, frameRate);

  /** 物理碰撞也要隨著尺寸更新 */
  scene.registerBeforeRender(() => {
    ice.physicsImpostor?.setScalingUpdated();
  });

  return ice;
}

const penguins: Penguin[] = [];

interface CreatePenguinParams {
  position: Vector3;
}
async function createPenguin(id: string, index: number, scene: Scene, params: CreatePenguinParams) {
  /** 依照玩家 ID 取得對應顏色名稱並轉換成 rgb */
  const codeName = gameConsole.getPlayerCodeName(id);
  const rgb = getPlayerColorRgb(codeName);

  const penguin = await new Penguin(`penguin-${index}`, scene, {
    position: params.position,
    color: new Color3(rgb.r / 255, rgb.g / 255, rgb.b / 255),
    ownerId: id,
  }).init();

  return penguin;
}

// 偵測企鵝碰撞事件
function detectCollideEvents(penguins: Penguin[]) {
  const length = penguins.length;
  for (let i = 0; i < length; i++) {
    for (let j = i; j < length; j++) {
      if (i === j) continue;

      const aMesh = penguins[i].mesh;
      const bMesh = penguins[j].mesh;
      if (!aMesh || !bMesh) continue;

      if (aMesh.intersectsMesh(bMesh)) {
        handleCollideEvent(penguins[i], penguins[j]);
      }
    }
  }
}

function handleCollideEvent(aPenguin: Penguin, bPenguin: Penguin) {
  if (!aPenguin.mesh || !bPenguin.mesh) return;

  const aState = aPenguin.state;
  const bState = bPenguin.state;
  // 沒有企鵝在 attack 狀態，不須動作
  if (![aState, bState].includes('attack')) return;

  const direction = bPenguin.mesh.position.subtract(aPenguin.mesh.position);
  if (aState === 'attack') {
    bPenguin.assaulted(direction);
  } else {
    aPenguin.assaulted(direction.multiply(new Vector3(-1, -1, -1)));
  }
}

/** 處理出界的企鵝
 * y 軸低於 -3 判定為出界
 */
function detectOutOfBounds(penguins: Penguin[]) {
  penguins.forEach((penguin) => {
    if (!penguin.mesh || penguin.diedAt > 0) return;

    if (penguin.mesh.position.y < -3) {
      /** 紀錄落水時間以供結算排名 */
      penguin.diedAt = new Date().getTime();
      penguin.mesh.dispose();
    }
  });
}

const isGameOver = ref(false);

const effects = useEffects();
/** 遊戲結束時兩側噴發慶祝彩帶 */
watch(isGameOver, (value) => {
  if (value) effects.fireConfetti();
});

/** 依落水時間排名，存活者（diedAt 為 0）為第一名，其餘越晚落水排名越前 */
function getRankedIdList(penguins: Penguin[]) {
  return [...penguins]
    .sort((a, b) => {
      if (a.diedAt === 0) return -1;
      if (b.diedAt === 0) return 1;

      return b.diedAt - a.diedAt;
    })
    .map(({ params }) => params.ownerId);
}

/** 偵測是否有贏家 */
function detectWinner(penguins: Penguin[], engine: BabylonEngine) {
  const alivePenguins = penguins.filter(({ mesh }) => !mesh?.isDisposed());

  if (alivePenguins.length > 1) return;

  engine.stopRenderLoop();

  if (!isGameOver.value) {
    emit('game-over');
  }

  isGameOver.value = true;
}

function initGamepadEvent() {
  gameConsole.onGamepadData((data) => {
    if (props.mode === 'showcase') return;

    const { playerId } = data;

    const penguin = penguins.find((penguin) => penguin.params.ownerId === playerId);
    if (!penguin) return;

    ctrlPenguin(penguin, data);
  });
}

/** 根據 key 取得資料 */
const findSingleData = curry((keys: SignalData[], name: `${KeyName}`): SignalData | undefined =>
  keys.find((key) => key.name === name),
);

/** 控制指定企鵝 */
function ctrlPenguin(penguin: Penguin, data: GamepadData) {
  const { keys } = data;
  const findData = findSingleData(keys);

  // 攻擊按鍵
  const attackData = findData('a');
  if (attackData) {
    penguin.attack();
    return;
  }

  // 確認按鍵
  const confirmData = findData('confirm');
  if (confirmData && isGameOver.value) {
    backToLobby();
    return;
  }

  // 移動按鍵
  const xData = findData('x-axis');
  const yData = findData('y-axis');

  const x = xData?.value ?? 0;
  const y = yData?.value ?? 0;

  if (x === 0 && y === 0) return;
  if (typeof x === 'number' && typeof y === 'number') {
    /** 搖桿向左時 x 為負值，而企鵝往左是螢幕的 +x 方向，所以要反轉 */
    penguin.walk(new Vector3(-x * 50, 0, y * 50));
  }
}

/** CPU AI：朝最近的存活企鵝移動，距離夠近時發動攻擊 */
function runCpuAiStep(cpuPenguin: Penguin) {
  const otherPenguins = penguins.filter(
    (p) => p !== cpuPenguin && p.mesh && !p.mesh.isDisposed(),
  );
  if (otherPenguins.length === 0) return;

  const target = otherPenguins.reduce((nearest, p) => {
    const dist = Vector3.Distance(cpuPenguin.mesh!.position, p.mesh!.position);
    const nearestDist = Vector3.Distance(cpuPenguin.mesh!.position, nearest.mesh!.position);
    return dist < nearestDist ? p : nearest;
  });

  if (!target.mesh) return;

  const direction = target.mesh.position.subtract(cpuPenguin.mesh!.position);
  const distance = direction.length();

  if (distance < 2.5) {
    cpuPenguin.attack();
  } else {
    // 加入輕微擾動避免 CPU 移動過於死板
    const normalized = direction.normalize();
    const jitter = (Math.random() - 0.5) * 0.4;
    const angle = Math.atan2(normalized.x, normalized.z) + jitter;
    cpuPenguin.walk(new Vector3(Math.sin(angle) * 35, 0, Math.cos(angle) * 35));
  }
}

async function backToLobby() {
  isGameOver.value = false;
  // CPU 不在此移除，避免結算排行榜瞬間查無 CPU 而顯示 unknown；改由大廳進場時清除
  emit('back-to-lobby');
}
</script>

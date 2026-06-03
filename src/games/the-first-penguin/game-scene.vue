<template>
  <div class="overflow-hidden">
    <canvas
      ref="canvas"
      class="outline-none w-full h-full"
    />

    <q-dialog
      :model-value="isGameOver && props.mode === 'normal'"
      persistent
    >
      <div class="card gap-14">
        <div class="flex items-center text-3xl text-gray-600">
          <q-icon name="emoji_events" />
          遊戲結束
        </div>
        <div class="text-3xl text-sky-700">
          玩家 {{ winnerCodeName }} 獲勝！
        </div>

        <div class="text-xl text-gray-400">
          按下 <q-icon name="done" /> 回到大廳
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import * as CANNON from 'cannon-es';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  ArcRotateCamera, BackgroundMaterial, CannonJSPlugin, Color3,
  Engine, KeyboardEventTypes, MeshBuilder, PhysicsImpostor, Scene, StandardMaterial, Vector3
} from '@babylonjs/core';
import { Penguin } from './penguin';
import { curry } from 'lodash-es';
import { GamepadData, GameSceneMode, KeyName, SignalData } from '../../types';
import { createAnimation, getPlayerColor, getSquareMatrixPositions } from '../../common/utils';
import { colors } from 'quasar';
import { RouteName } from '../../router/router';

import { useClientGameConsole } from '../../composables/use-client-game-console';
import { useRouter } from 'vue-router';
import { useLoading } from '../../composables/use-loading';
import { useBabylonScene } from '../../composables/use-babylon-scene';

const { getPaletteColor, textToRgb } = colors;

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

const { canvas } = useBabylonScene({
  createCamera(scene: Scene) {
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 4,
      34,
      new Vector3(0, 0, 2),
      scene
    );

    return camera;
  },

  async init({ scene, engine }) {
    const physicsPlugin = new CannonJSPlugin(true, 8, CANNON);
    scene.enablePhysics(new Vector3(0, -9.81, 0), physicsPlugin);

    createSea(scene);
    createIce(scene);

    const players = gameConsole.players.value;
    const positions = getSquareMatrixPositions(
      5, players.length, new Vector3(0.1, 10, 0)
    );
    const tasks = players.map(({ clientId }, index) =>
      createPenguin(clientId, index, scene, {
        position: positions[index],
      })
    );
    const result = await Promise.allSettled(tasks)
    result.forEach((data) => {
      if (data.status !== 'fulfilled') return;
      penguins.push(data.value);
    });

    initGamepadEvent();

    /** 持續運行指定事件 */
    scene.registerAfterRender(() => {
      detectCollideEvents(penguins);
      detectOutOfBounds(penguins);
      detectWinner(penguins, engine);
    });

    emit('init');
  },
});

function createSea(scene: Scene) {
  const sea = MeshBuilder.CreateGround('sea', { height: 1000, width: 1000 });

  const material = new BackgroundMaterial("seaMaterial", scene);
  material.useRGBColor = false;
  material.primaryColor = new Color3(0.57, 0.70, 0.83);

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
  ice.physicsImpostor = new PhysicsImpostor(ice, PhysicsImpostor.BoxImpostor,
    { mass: 0, friction: 0, restitution: 0 }, scene
  );

  /** 建立動畫 */
  const { animation, frameRate } = createAnimation(
    ice, 'scaling', new Vector3(0.1, 1, 0.1), {
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
  const color = getPlayerColor({ codeName });
  const hex = getPaletteColor(color);
  const rgb = textToRgb(hex);

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
    if (!penguin.mesh) return;

    if (penguin.mesh.position.y < -3) {
      penguin.mesh.dispose();
    }
  });
}

const isGameOver = ref(false);
const winnerCodeName = ref('');

/** 偵測是否有贏家 */
function detectWinner(penguins: Penguin[], engine: Engine) {
  const alivePenguins = penguins.filter(({ mesh }) => !mesh?.isDisposed());

  if (alivePenguins.length > 1) return;

  engine.stopRenderLoop();
  const winnerId = alivePenguins[0].params.ownerId;

  if (!isGameOver.value) {
    emit('game-over');
  }

  winnerCodeName.value = gameConsole.getPlayerCodeName(winnerId);
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
  keys.find((key) => key.name === name)
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

async function backToLobby() {
  isGameOver.value = false;

  emit('back-to-lobby');
}
</script>

<style scoped lang="sass">
.card
  width: 30rem
  height: 24rem
  background: white
  border-radius: 2rem
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
</style>
<template>
  <div class="overflow-hidden">
    <canvas
      ref="canvas"
      class="outline-none w-full h-full"
    />

    <q-dialog
      v-model="isGameOver"
      persistent
    >
      <player-leaderboard :id-list="getRankedIdList(playerChickens)">
        <div class="text-xl text-gray-400 p-5 text-center">
          按下 <q-icon name="done" /> 回到大廳
        </div>
      </player-leaderboard>
    </q-dialog>
  </div>
</template>

<script setup lang='ts'>
import * as CANNON from 'cannon-es';
import {
  ArcRotateCamera,
  CannonJSPlugin,
  Color3,
  Color4,
  Engine,
  GlowLayer,
  MeshBuilder, PhysicsImpostor,
  Scalar,
  Scene, SolidParticleSystem,
  StandardMaterial, Tools, Vector3,
} from '@babylonjs/core';
import { SkyMaterial } from '@babylonjs/materials';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
import { cloneDeep, curry, flow, range } from 'lodash-es';
import { ref, watch } from 'vue';
import { colors } from 'quasar';
import { getPlayerColor, getSquareMatrixPositions } from '../../common/utils';
import { GamepadData, GameSceneMode, KeyName, Player, SignalData } from '../../types';

import { BadChicken } from './bad-chicken';
import { Chicken } from './chicken';

import PlayerLeaderboard from '../../components/player-leaderboard.vue';

import { useClientGameConsole } from '../../composables/use-client-game-console';
import { useBabylonScene } from '../../composables/use-babylon-scene';
import { useInterval, whenever } from '@vueuse/core';

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
}>();

/** 每秒 +1 */
const {
  counter, pause, resume
} = useInterval(1000, { controls: true });
whenever(
  () => counter.value >= 150,
  () => pause(),
)
watch(() => props.mode, (mode) => {
  /** 練習、展示模式不加速 */
  if (['training', 'showcase'].includes(mode)) {
    pause();
  }

  /** 一般模式開始計時 */
  if (mode === 'normal') {
    resume();
  }
}, { immediate: true });


const gameConsole = useClientGameConsole();

const isGameOver = ref(false);
/** 遊戲場景邊界 */
const sceneBoundary = {
  x: 5,
  y: 2.5,
}
const playerChickens: Chicken[] = [];

function getRankedIdList(chickens: Chicken[]) {
  const result = cloneDeep(chickens)
    .sort((a, b) => {
      /** diedAt 為 0 表示第一名，其他則從最大排到最小
       * 
       * -1 表示將目前的 a 排在 b 前面
       * 1 表示將目前的 a 排在 b 後面
       */
      if (a.diedAt === 0) return -1;
      if (b.diedAt === 0) return 1;

      return b.diedAt - a.diedAt;
    })
    .map(({ params }) => params.ownerId);

  return result;
}

const { canvas } = useBabylonScene({
  createCamera(scene) {
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 2,
      6,
      new Vector3(0, 0, 0),
      scene,
    );

    camera.attachControl(canvas.value, true);
    camera.wheelDeltaPercentage = 0.1;

    return camera;
  },

  async init({ scene, engine }) {
    const physicsPlugin = new CannonJSPlugin(true, 8, CANNON);
    scene.enablePhysics(new Vector3(0, 0, 0), physicsPlugin);

    const glowLayer = new GlowLayer('glow', scene, {
      blurKernelSize: 16
    });

    createSky(scene);
    createBoundary(scene);
    createClouds(scene);
    createSpeedLines(scene);

    const chickens = await createChickens(gameConsole.players.value, scene);
    initGamepadEvent(chickens);
    playerChickens.push(...chickens);

    const badChickens = await createBadChickens(scene);

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
      detectCollideEvents(chickens, badChickens);
      detectGameOver(chickens, engine);
      detectOutOfBounds(chickens);
    });

    emit('init');
  }
});

function createSky(scene: Scene) {
  const skyMaterial = new SkyMaterial('skyMaterial', scene);
  skyMaterial.backFaceCulling = false;
  skyMaterial.turbidity = 0.2;
  skyMaterial.luminance = 0.1;
  skyMaterial.rayleigh = 0.2;

  /** 太陽位置 */
  skyMaterial.useSunPosition = true;
  skyMaterial.sunPosition = new Vector3(1, 0.9, -2);

  const skybox = MeshBuilder.CreateBox('skyBox', { size: 100 }, scene);
  skybox.material = skyMaterial;

  return skybox;
}

function createBoundary(scene: Scene) {
  const list = [
    {
      name: 'boundary-top',
      option: { height: 0.5, width: 10, depth: 0.5 },
      position: new Vector3(0, sceneBoundary.y, 0),
    },
    {
      name: 'boundary-bottom',
      option: { height: 0.5, width: 10, depth: 0.5 },
      position: new Vector3(0, -sceneBoundary.y, 0),

    },
    {
      name: 'boundary-left',
      option: { height: 10, width: 0.5, depth: 0.5 },
      position: new Vector3(-sceneBoundary.x, 0, 0),

    },
    {
      name: 'boundary-right',
      option: { height: 10, width: 0.5, depth: 0.5 },
      position: new Vector3(sceneBoundary.x, 0, 0),
    },
  ]

  list.forEach(({ name, option, position }) => {
    const wall = MeshBuilder.CreateBox(name, option, scene);
    wall.position = position;
    wall.physicsImpostor = new PhysicsImpostor(wall, PhysicsImpostor.BoxImpostor,
      { mass: 0, friction: 0, restitution: 0 }, scene
    );
    wall.isVisible = false;
  });
}

function createClouds(scene: Scene) {
  const clouds = new SolidParticleSystem('clouds', scene);

  const cloudDepth = 2;
  /** 建立雲朵 */
  const cloud = MeshBuilder.CreateBox('cloud', {
    width: 1.5, height: 0.5, depth: cloudDepth,
  }, scene);

  /** 建立 50 個一樣的 mesh */
  clouds.addShape(cloud, 50);
  /** 新增至 SolidParticleSystem 後原本的 cloud 就可以停用了 */
  cloud.dispose();

  /** 實際建立 mesh */
  const mesh = clouds.buildMesh();
  /** 開啟透明效果 */
  mesh.hasVertexAlpha = true;

  /** 建立初始化 function */
  clouds.initParticles = () => {
    clouds.particles.forEach((particle) => {
      /** 隨機分布 */
      particle.position.x = Scalar.RandomRange(-sceneBoundary.x * 2, sceneBoundary.x * 2);
      particle.position.y = Scalar.RandomRange(-sceneBoundary.y, -sceneBoundary.y * 0.9);
      particle.position.z = Scalar.RandomRange(0, -150);

      /** 隨機尺寸 */
      particle.scaling = new Vector3(
        Scalar.RandomRange(1, 3),
        Scalar.RandomRange(1, 2),
        Scalar.RandomRange(1, 3)
      );
      /** 半透明白色 */
      particle.color = new Color4(1, 1, 1, 0.5);
    });
  };

  /** 初始化 */
  clouds.initParticles();
  clouds.setParticles();

  /** 更新邏輯 */
  clouds.updateParticle = (particle) => {
    /** 雲的尺寸是 cloudDepth，最大倍數是 3 倍，
     * 所以位置小於 -cloudDepth * 3 一定超出畫面了。
     */
    if (particle.position.z > cloudDepth * 3) {
      particle.position.z = -150;
    }

    /** 雲朵移動速度 */
    particle.velocity.z = 0.1 + counter.value * 0.005;
    particle.position.addInPlace(particle.velocity);

    return particle;
  }

  /** 持續呼叫，粒子才會渲染 updateParticle 後的結果 */
  scene.onAfterRenderObservable.add(() => {
    clouds.setParticles();
  })

  return clouds;
}

function createSpeedLines(scene: Scene) {
  const lines = new SolidParticleSystem('speed-lines', scene);
  const depth = 1;

  const line = MeshBuilder.CreateBox('line', {
    width: 0.01, height: 0.01, depth,
  }, scene);

  /** 建立材質，並加入光暈 */
  const material = new StandardMaterial('speed-line', scene);
  material.emissiveColor = Color3.White();
  line.material = material;

  lines.addShape(line, 100);
  line.dispose();

  const mesh = lines.buildMesh();
  mesh.hasVertexAlpha = true;

  /** 將材質加入粒子系統中 */
  lines.setMultiMaterial([material]);

  lines.initParticles = () => {
    lines.particles.forEach((particle) => {
      particle.position.x = Scalar.RandomRange(-sceneBoundary.x, sceneBoundary.x);
      particle.position.y = Scalar.RandomRange(-sceneBoundary.y, sceneBoundary.y);
      particle.position.z = Scalar.RandomRange(0, -50);

      particle.color = new Color4(1, 1, 1, 0.05);
    });
  };

  lines.initParticles();
  lines.setParticles();

  lines.updateParticle = (particle) => {
    if (particle.position.z > depth * 2) {
      particle.position.z = -50;
    }

    particle.velocity.z = 0.5 + counter.value * 0.005;
    particle.position.addInPlace(particle.velocity);

    return particle;
  }

  scene.onAfterRenderObservable.add(() => {
    lines.setParticles();
  })

  return lines;
}

async function createBadChickens(scene: Scene) {
  /** 小雞間距 */
  const gap = 50;
  const tasks = range(3).map(
    (value) => new BadChicken(`bad-chicken-${value}`, scene, {
      position: new Vector3(0, 0, (value + 1) * -gap),
      recyclePosition: gap,
      recycleStartPosition: gap * -2,
    }).init()
  );
  const chickens = await Promise.all(tasks);

  watch(counter, (value) => {
    /** 展示模式壞雞不移動 */
    if (props.mode === 'showcase') return;

    const speed = 0.1 + value * 0.01;

    chickens.forEach((chicken) => {
      chicken.setSpeed(speed);
    });
  }, { immediate: true });

  return chickens;
}

// 偵測碰撞事件
function detectCollideEvents(chickens: Chicken[], badChickens: BadChicken[]) {
  /** 依據檢查壞雞 */
  badChickens.forEach(({ mesh: badChickenMesh }) => {
    if (!badChickenMesh) return;

    /** 不可能碰到小雞，跳過 */
    if (badChickenMesh.position.z < -1 ||
      badChickenMesh.position.z > 1) return;

    /** 依序檢查小雞 */
    chickens.forEach((chicken) => {
      if (!chicken.mesh) return;

      /** 已停用，跳過 */
      if (chicken.mesh.isDisposed()) return;

      if (badChickenMesh.intersectsMesh(chicken.mesh)) {
        chicken.attacked();
      }
    });
  });
}
/** 偵測遊戲是否結束 */
function detectGameOver(chickens: Chicken[], engine: Engine) {
  const theLivingList = chickens.filter(({ mesh }) => !mesh?.isDisposed());

  /** 2 人以上表示遊戲還沒結束 */
  if (theLivingList.length >= 2) return;

  engine.stopRenderLoop();
  isGameOver.value = true;
}
/** 救回出界的小雞 */
function detectOutOfBounds(chickens: Chicken[]) {
  chickens.forEach((chicken) => {
    if (!chicken.mesh || chicken.diedAt > 0) return;

    const { x, y } = chicken.mesh.position;

    if (Math.abs(x) > sceneBoundary.x ||
      Math.abs(y) > sceneBoundary.y) {
      chicken.mesh.position = new Vector3(0, 0, 0);

      chicken.mesh.physicsImpostor?.setLinearVelocity(
        new Vector3(0, 0, 0),
      )
    }
  });
}

async function createChicken(id: string, position: Vector3, scene: Scene) {
  /** 依照玩家 ID 取得對應顏色名稱並轉換成 rgb */
  const codeName = gameConsole.getPlayerCodeName(id);
  const color = getPlayerColor({ codeName });
  const hex = getPaletteColor(color);
  const rgb = textToRgb(hex);

  const chicken = await new Chicken(`chicken-${id}`, scene, {
    ownerId: id,
    position,
    color: new Color3(rgb.r / 255, rgb.g / 255, rgb.b / 255),
  }).init();

  if (props.mode === 'training') {
    chicken.healthLock = true;
  }

  return chicken;
}
async function createChickens(players: Player[], scene: Scene) {
  const positions = getSquareMatrixPositions(
    1, players.length, undefined, 'xy'
  );

  const tasks = players.map(
    (player, i) => createChicken(
      player.clientId, positions[i], scene,
    )
  );

  const chickens = await Promise.all(tasks);

  return chickens;
}

function initGamepadEvent(chickens: Chicken[]) {
  gameConsole.onGamepadData((data) => {
    const { playerId } = data;

    /** 找到對應的小雞 */
    const target = chickens.find(
      ({ params }) => params.ownerId === playerId
    );
    if (!target) return;

    ctrlChicken(target, data);
  });
}

/** 根據 key 取得資料 */
const findSingleData = curry((keys: SignalData[], name: `${KeyName}`): SignalData | undefined =>
  keys.find((key) => key.name === name)
);

/** 控制指定小雞 */
function ctrlChicken(chicken: Chicken, data: GamepadData) {
  const { keys } = data;
  const findData = findSingleData(keys);

  // 確認按鍵
  const confirmData = findData('confirm');
  if (confirmData && isGameOver.value) {
    emit('back-to-lobby');
    isGameOver.value = false;
    return;
  }

  // 移動按鍵
  const xData = findData('x-axis');
  const zData = findData('z-axis');

  const x = xData?.value ?? 0;
  const z = zData?.value ?? 0;

  if (typeof x === 'number' && typeof z === 'number') {
    /** 搖桿傳送過來的角度單位是 Degrees，需要轉換成小雞姿態角度單位（Radians），
     * 
     * 手機的 +z 軸是遊戲座標的 -x、+x 軸是遊戲座標的 -z
     */
    chicken.setAttitude(
      Tools.ToRadians(-z),
      Tools.ToRadians(-x)
    );
  }
}

</script>

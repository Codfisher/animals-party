<template>
  <div class="overflow-hidden">
    <canvas ref="canvas" class="outline-none w-full h-full" />

    <UModal
      v-model:open="isGameOver"
      :dismissible="false"
      class="bg-transparent shadow-none ring-0"
    >
      <template #content>
        <player-leaderboard :id-list="getRankedIdList(playerChickens)">
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
import {
  ArcRotateCamera,
  CannonJSPlugin,
  Color3,
  Color4,
  GlowLayer,
  MeshBuilder,
  Scalar,
  Scene,
  SolidParticleSystem,
  StandardMaterial,
  Tools,
  Vector3,
} from '@babylonjs/core';
import { SkyMaterial } from '@babylonjs/materials';
import { cloneDeep, curry, flow, range, throttle } from 'lodash-es';
import { ref, watch } from 'vue';
import { getPlayerColorRgb } from '../../common/color';
import { getSquareMatrixPositions } from '../../common/utils';
import { GamepadData, GameSceneMode, KeyName, Player, SignalData } from '../../types';

import { BadChicken } from './bad-chicken';
import { Chicken } from './chicken';

import PlayerLeaderboard from '../../components/player-leaderboard.vue';

import { useClientGameConsole } from '../../composables/use-client-game-console';
import { useCpuPlayer } from '../../composables/use-cpu-player';
import { useBabylonScene, type BabylonEngine } from '../../composables/use-babylon-scene';
import { useEffects } from '../../composables/use-effects';
import { useAudio } from '../../composables/use-audio';
import { useInterval, whenever } from '@vueuse/core';

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
const { counter, pause, resume } = useInterval(1000, { controls: true });
whenever(
  () => counter.value >= 150,
  () => pause(),
);
watch(
  () => props.mode,
  (mode) => {
    /** 練習、展示模式不加速 */
    if (['training', 'showcase'].includes(mode)) {
      pause();
    }

    /** 一般模式開始計時 */
    if (mode === 'normal') {
      resume();
    }
  },
  { immediate: true },
);

const gameConsole = useClientGameConsole();
const cpuPlayer = useCpuPlayer();

const isGameOver = ref(false);

const effects = useEffects();
const audio = useAudio();
/** 遊戲結束時兩側噴發慶祝彩帶並播放勝利音效 */
watch(isGameOver, (value) => {
  if (value) {
    effects.fireConfetti();
    audio.play('win');
  }
});

/** 撞擊每幀都可能觸發，節流避免音效疊放 */
const playCollide = throttle(() => audio.play('chicken-fly/collide'), 300, { trailing: false });

/** 遊戲場景邊界 */
const sceneBoundary = {
  x: 5,
  y: 2.5,
};
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
      blurKernelSize: 16,
    });

    createSky(scene);
    createClouds(scene);
    createSpeedLines(scene);

    const chickens = await createChickens(gameConsole.players.value, scene);
    initGamepadEvent(chickens);
    playerChickens.push(...chickens);

    const badChickens = await createBadChickens(scene, chickens);

    /** 找出 CPU 小雞 */
    const cpuChickenList = chickens.filter((chicken) => {
      const player = gameConsole.players.value.find(
        ({ clientId }) => clientId === chicken.params.ownerId,
      );
      return player && cpuPlayer.isCpuPlayer(player);
    });
    let cpuFrameCount = 0;

    scene.registerBeforeRender(() => {
      detectCollideEvents(chickens, badChickens);
      detectGameOver(chickens, engine);
      keepChickensInBounds(chickens);
      detectDeaths(chickens);

      if (cpuChickenList.length > 0 && props.mode === 'normal') {
        cpuFrameCount++;
        // 約每 6 幀更新一次，保留反應延遲讓玩家有機可乘
        if (cpuFrameCount % 6 === 0) {
          cpuChickenList.forEach((cpuChicken) => runChickenCpuStep(cpuChicken, badChickens));
        }
      }
    });

    emit('init');
  },
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

function createClouds(scene: Scene) {
  const clouds = new SolidParticleSystem('clouds', scene);

  const cloudDepth = 2;
  /** 建立雲朵 */
  const cloud = MeshBuilder.CreateBox(
    'cloud',
    {
      width: 1.5,
      height: 0.5,
      depth: cloudDepth,
    },
    scene,
  );

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
        Scalar.RandomRange(1, 3),
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
  };

  /** 持續呼叫，粒子才會渲染 updateParticle 後的結果 */
  scene.onAfterRenderObservable.add(() => {
    clouds.setParticles();
  });

  return clouds;
}

function createSpeedLines(scene: Scene) {
  const lines = new SolidParticleSystem('speed-lines', scene);
  const depth = 1;

  const line = MeshBuilder.CreateBox(
    'line',
    {
      width: 0.01,
      height: 0.01,
      depth,
    },
    scene,
  );

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
  };

  scene.onAfterRenderObservable.add(() => {
    lines.setParticles();
  });

  return lines;
}

async function createBadChickens(scene: Scene, playerChickenList: Chicken[]) {
  /** 小雞間距 */
  const gap = 50;

  /** 取得存活玩家位置，供壞雞鎖定追擊 */
  const getTargetList = () =>
    playerChickenList
      .filter((chicken) => chicken.mesh && !chicken.mesh.isDisposed() && chicken.diedAt === 0)
      .map((chicken) => chicken.mesh!.position);

  const tasks = range(3).map((value) =>
    new BadChicken(`bad-chicken-${value}`, scene, {
      position: new Vector3(0, 0, (value + 1) * -gap),
      recyclePosition: gap,
      recycleStartPosition: gap * -2,
      sceneBoundary,
      getTargetList,
    }).init(),
  );
  const chickens = await Promise.all(tasks);

  watch(
    counter,
    (value) => {
      /** 展示模式壞雞不移動 */
      if (props.mode === 'showcase') return;

      const speed = 0.1 + value * 0.01;
      /** 追擊強度隨時間提升，後期咬得更緊，上限避免瞬間貼臉 */
      const steerFactor = Math.min(0.02 + value * 0.001, 0.15);
      /** 晃動幅度隨時間收斂，後期瞄得更準、留點隨機避免完全鎖死 */
      const wanderAmplitude = {
        x: Math.max(1.5 - value * 0.006, 0.6),
        y: Math.max(1 - value * 0.004, 0.4),
      };

      chickens.forEach((chicken) => {
        chicken.setSpeed(speed);
        chicken.setSteerFactor(steerFactor);
        chicken.setWanderAmplitude(wanderAmplitude);
      });
    },
    { immediate: true },
  );

  return chickens;
}

// 偵測碰撞事件
function detectCollideEvents(chickens: Chicken[], badChickens: BadChicken[]) {
  /** 依據檢查壞雞 */
  badChickens.forEach(({ mesh: badChickenMesh }) => {
    if (!badChickenMesh) return;

    /** 不可能碰到小雞，跳過 */
    if (badChickenMesh.position.z < -1 || badChickenMesh.position.z > 1) return;

    /** 依序檢查小雞 */
    chickens.forEach((chicken) => {
      if (!chicken.mesh) return;

      /** 已停用，跳過 */
      if (chicken.mesh.isDisposed()) return;

      if (badChickenMesh.intersectsMesh(chicken.mesh)) {
        chicken.attacked();
        playCollide();
      }
    });
  });
}
/** 偵測遊戲是否結束 */
function detectGameOver(chickens: Chicken[], engine: BabylonEngine) {
  const theLivingList = chickens.filter(({ mesh }) => !mesh?.isDisposed());

  /** 2 人以上表示遊戲還沒結束 */
  if (theLivingList.length >= 2) return;

  engine.stopRenderLoop();
  isGameOver.value = true;
}
/** 偵測小雞淘汰，於剛被淘汰時播放墜落音效（每隻僅一次） */
const deadChickenSet = new Set<string>();
function detectDeaths(chickens: Chicken[]) {
  chickens.forEach((chicken) => {
    if (chicken.diedAt > 0 && !deadChickenSet.has(chicken.name)) {
      deadChickenSet.add(chicken.name);
      audio.play('chicken-fly/dead');
    }
  });
}
/** 將小雞約束在場景邊界內：
 *
 * 接近邊界時施加柔性回推力讓小雞自然減速、被推回，
 * 再以硬夾限鎖死位置兜底，確保永遠不會飄出去。
 */
function keepChickensInBounds(chickens: Chicken[]) {
  /** 緩衝帶寬度，進入後開始回推 */
  const softZone = 0.8;
  /** 回推力強度，越深入緩衝帶力道越大 */
  const pushStrength = 25;
  /** 阻尼，抑制向外速度避免撞邊回彈 */
  const damping = 6;
  /** 預留小雞半身，避免模型一半穿出邊界 */
  const margin = 0.3;
  const maxX = sceneBoundary.x - margin;
  const maxY = sceneBoundary.y - margin;

  chickens.forEach((chicken) => {
    if (!chicken.mesh || chicken.diedAt > 0) return;

    const { physicsImpostor } = chicken.mesh;
    if (!physicsImpostor) return;

    const { position } = chicken.mesh;
    const velocity = physicsImpostor.getLinearVelocity() ?? new Vector3(0, 0, 0);

    /** 柔性回推：力道隨深度遞增，並抵銷向外速度 */
    const push = new Vector3(0, 0, 0);
    if (position.x > maxX - softZone) {
      push.x -= (position.x - (maxX - softZone)) * pushStrength;
      if (velocity.x > 0) push.x -= velocity.x * damping;
    } else if (position.x < -maxX + softZone) {
      push.x -= (position.x - (-maxX + softZone)) * pushStrength;
      if (velocity.x < 0) push.x -= velocity.x * damping;
    }
    if (position.y > maxY - softZone) {
      push.y -= (position.y - (maxY - softZone)) * pushStrength;
      if (velocity.y > 0) push.y -= velocity.y * damping;
    } else if (position.y < -maxY + softZone) {
      push.y -= (position.y - (-maxY + softZone)) * pushStrength;
      if (velocity.y < 0) push.y -= velocity.y * damping;
    }
    if (push.x !== 0 || push.y !== 0) {
      physicsImpostor.applyForce(push, chicken.mesh.getAbsolutePosition());
    }

    /** 硬夾限兜底：鎖住位置並歸零向外速度 */
    let isClamped = false;
    if (position.x > maxX) {
      position.x = maxX;
      if (velocity.x > 0) {
        velocity.x = 0;
        isClamped = true;
      }
    } else if (position.x < -maxX) {
      position.x = -maxX;
      if (velocity.x < 0) {
        velocity.x = 0;
        isClamped = true;
      }
    }
    if (position.y > maxY) {
      position.y = maxY;
      if (velocity.y > 0) {
        velocity.y = 0;
        isClamped = true;
      }
    } else if (position.y < -maxY) {
      position.y = -maxY;
      if (velocity.y < 0) {
        velocity.y = 0;
        isClamped = true;
      }
    }
    if (isClamped) physicsImpostor.setLinearVelocity(velocity);
  });
}

async function createChicken(id: string, position: Vector3, scene: Scene) {
  /** 依照玩家 ID 取得對應顏色名稱並轉換成 rgb */
  const codeName = gameConsole.getPlayerCodeName(id);
  const rgb = getPlayerColorRgb(codeName);

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
  const positions = getSquareMatrixPositions(1, players.length, undefined, 'xy');

  const tasks = players.map((player, i) => createChicken(player.clientId, positions[i], scene));

  const chickens = await Promise.all(tasks);

  return chickens;
}

function initGamepadEvent(chickens: Chicken[]) {
  gameConsole.onGamepadData((data) => {
    const { playerId } = data;

    /** 找到對應的小雞 */
    const target = chickens.find(({ params }) => params.ownerId === playerId);
    if (!target) return;

    ctrlChicken(target, data);
  });
}

/** 根據 key 取得資料 */
const findSingleData = curry((keys: SignalData[], name: `${KeyName}`): SignalData | undefined =>
  keys.find((key) => key.name === name),
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
    chicken.setAttitude(Tools.ToRadians(-z), Tools.ToRadians(-x));
  }
}

/** 將數值限制在 [-1, 1] */
function clampUnit(value: number) {
  return Math.max(-1, Math.min(1, value));
}

/** CPU 小雞 AI：閃避逼近的壞雞，無威脅時回到畫面中央 */
function runChickenCpuStep(cpuChicken: Chicken, badChickens: BadChicken[]) {
  const mesh = cpuChicken.mesh;
  if (!mesh || mesh.isDisposed()) return;

  const { x, y } = mesh.position;

  /** 找出 z 軸正逼近碰撞平面、且 xy 最接近的壞雞 */
  let nearestThreat: BadChicken | undefined;
  let nearestDistance = Infinity;
  badChickens.forEach((badChicken) => {
    const badMesh = badChicken.mesh;
    if (!badMesh) return;
    // 只在意正逼近碰撞平面（z 約 0）的壞雞
    if (badMesh.position.z < -18 || badMesh.position.z > 1.5) return;

    const distance = Math.hypot(badMesh.position.x - x, badMesh.position.y - y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestThreat = badChicken;
    }
  });

  let moveX = 0;
  let moveY = 0;
  if (nearestThreat?.mesh && nearestDistance < 2) {
    // 往遠離威脅的方向閃避
    moveX = x - nearestThreat.mesh.position.x;
    moveY = y - nearestThreat.mesh.position.y;
  } else {
    // 無立即威脅，略為置中並回到中央高度，避免貼邊卡死
    moveX = -x * 0.3;
    moveY = -y;
  }

  const maxAngle = Tools.ToRadians(45);
  // 依 chicken.ts processLift：force.x 與 roll 同向、force.y 與 -pitch 同向
  const roll = clampUnit(moveX) * maxAngle;
  const pitch = -clampUnit(moveY) * maxAngle;
  cpuChicken.setAttitude(pitch, roll);
}
</script>

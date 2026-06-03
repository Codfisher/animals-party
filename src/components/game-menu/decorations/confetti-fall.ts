import {
  Scene, SolidParticleSystem, SolidParticle, MeshBuilder,
  StandardMaterial, Material, Color3, Color4, Vector3,
} from '@babylonjs/core';
import { random, sample } from 'lodash-es';

/** 彩帶配色 */
const PALETTE = ['#ff5b5b', '#ffd83d', '#5bc8ef', '#8be06a', '#c792ea', '#ff9f43']
  .map((hex) => Color3.FromHexString(hex).toColor4(1));

/** 彩帶數量（稀疏，僅一點點點綴） */
const COUNT = 100;

/** 灑落範圍 */
const SPAWN = {
  xHalf: 50,
  zMin: -30,
  zMax: 60,
  yTop: 46,
  yBottom: 40,
};
/** 落到此高度即回收至高空 */
const FLOOR_Y = -2;
/** 自此高度開始淡出，避免回收瞬間突兀 */
const FADE_START_Y = 6;

interface ConfettiData {
  /** 三軸角速度（弧度／秒） */
  angularVelocity: Vector3;
  /** 落下速度 */
  fallSpeed: number;
  /** 左右擺動相位、頻率、幅度 */
  swayPhase: number;
  swayFrequency: number;
  swayAmplitude: number;
}

/** 在大廳高空稀疏飄落、具立體翻滾與雜訊飄移的彩帶 */
export function createConfettiFall(scene: Scene) {
  const sps = new SolidParticleSystem('lobby-confetti', scene);

  const plane = MeshBuilder.CreatePlane('lobby-confetti-shape', { size: 1 }, scene);
  sps.addShape(plane, COUNT);
  plane.dispose();

  const mesh = sps.buildMesh();
  mesh.isPickable = false;
  /** 啟用頂點透明度以支援淡出 */
  mesh.hasVertexAlpha = true;

  const material = new StandardMaterial('lobby-confetti-material', scene);
  material.backFaceCulling = false;
  material.specularColor = Color3.Black();
  /** 關閉光照並以全白自發光打底，讓每片彩帶的顏色（頂點色）均勻呈現，
   *  不受光源角度影響而出現陰影暗部 */
  material.disableLighting = true;
  material.emissiveColor = Color3.White();
  material.transparencyMode = Material.MATERIAL_ALPHABLEND;
  mesh.material = material;

  /** 各粒子的額外運動資料 */
  const dataList: ConfettiData[] = [];

  /** 重設粒子至灑落起點，spreadColumn 為真時 y 散布於整段高度（初始化用） */
  function resetParticle(particle: SolidParticle, spreadColumn = false) {
    particle.position.x = random(-SPAWN.xHalf, SPAWN.xHalf, true);
    particle.position.z = random(SPAWN.zMin, SPAWN.zMax, true);
    particle.position.y = spreadColumn
      ? random(FLOOR_Y, SPAWN.yTop, true)
      : random(SPAWN.yBottom, SPAWN.yTop, true);

    particle.rotation.set(
      random(0, Math.PI * 2, true),
      random(0, Math.PI * 2, true),
      random(0, Math.PI * 2, true),
    );
    /** 長條紙片 */
    particle.scaling.set(random(0.45, 0.7, true), random(0.25, 0.45, true), 1);

    particle.color = (sample(PALETTE) ?? PALETTE[0]).clone();

    dataList[particle.idx] = {
      angularVelocity: new Vector3(
        random(-2.5, 2.5, true),
        random(-2.5, 2.5, true),
        random(-2.5, 2.5, true),
      ),
      fallSpeed: random(1.4, 2.6, true),
      swayPhase: random(0, Math.PI * 2, true),
      swayFrequency: random(0.6, 1.4, true),
      swayAmplitude: random(1.2, 2.6, true),
    };
  }

  sps.initParticles = () => {
    sps.particles.forEach((particle) => resetParticle(particle, true));
  };

  /** 由 render loop 每幀更新 */
  let deltaSecond = 0;
  let elapsed = 0;

  sps.updateParticle = (particle) => {
    const data = dataList[particle.idx];
    if (!data) return particle;

    /** 落下 */
    particle.position.y -= data.fallSpeed * deltaSecond;

    /** 雜訊飄移：正弦擺動 + 隨機 jitter，呈現布朗運動般的左右飄動 */
    const sway = Math.sin(data.swayPhase + elapsed * data.swayFrequency);
    particle.position.x += (sway * data.swayAmplitude + random(-0.6, 0.6, true)) * deltaSecond;
    particle.position.z += (Math.cos(data.swayPhase + elapsed * data.swayFrequency * 0.8) * data.swayAmplitude * 0.6) * deltaSecond;

    /** 立體翻滾：三軸獨立旋轉 */
    particle.rotation.x += data.angularVelocity.x * deltaSecond;
    particle.rotation.y += data.angularVelocity.y * deltaSecond;
    particle.rotation.z += data.angularVelocity.z * deltaSecond;

    /** 接近水面淡出 */
    particle.color!.a = particle.position.y > FADE_START_Y
      ? 1
      : Math.max(0, (particle.position.y - FLOOR_Y) / (FADE_START_Y - FLOOR_Y));

    /** 落地回收至高空 */
    if (particle.position.y < FLOOR_Y) {
      resetParticle(particle);
    }

    return particle;
  };

  sps.initParticles();
  sps.setParticles();

  scene.onBeforeRenderObservable.add(() => {
    deltaSecond = scene.getEngine().getDeltaTime() / 1000;
    elapsed += deltaSecond;
    sps.setParticles();
  });

  return sps;
}

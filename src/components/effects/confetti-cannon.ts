import {
  Scene, ParticleSystem, DynamicTexture, NoiseProceduralTexture, Vector3, Color3, Color4,
} from '@babylonjs/core';

/** 彩帶配色 */
const PALETTE = ['#ff5b5b', '#ffd83d', '#5bc8ef', '#8be06a', '#c792ea', '#ff9f43'];

/** 噴發點距中心的水平距離（置於可視邊緣之外，讓彩帶從螢幕外往內噴） */
const EDGE_X = 30;
/** 噴發點沿垂直邊緣分布的半高 */
const EDGE_HALF_HEIGHT = 16;

/** 噴射力道（初速）範圍，數值越大噴得越遠越急 */
const MIN_EMIT_POWER = 1;
const MAX_EMIT_POWER = 15;

/** 單次爆發的噴發持續時間（秒），時間到自動停止發射 */
const BURST_DURATION = 0.2;

/** 風與重力（gravity 為常數加速度，x 為固定風向、y 為重力） */
const WIND_GRAVITY = new Vector3(0, -6, 0);
/** 風的亂流擾動強度（搭配雜訊，營造飄忽不定的風吹感） */
const NOISE_STRENGTH = new Vector3(4, 2, 4);

/** 單一方塊像素邊長 */
const CELL = 8;

/** 繪製多色方塊圖集，供 spriteRandomStartCell 隨機取色，
 *  以單一粒子系統呈現多色彩帶（省下逐色建立系統的開銷） */
function createConfettiAtlas(scene: Scene) {
  const texture = new DynamicTexture(
    'confetti-atlas',
    { width: CELL * PALETTE.length, height: CELL },
    scene,
    false,
  );
  const context = texture.getContext();
  PALETTE.forEach((hex, i) => {
    context.fillStyle = hex;
    context.fillRect(i * CELL, 0, CELL, CELL);
  });
  texture.update();
  return texture;
}

/** 製造自然飄動的亂流雜訊 */
function createNoise(scene: Scene) {
  const noise = new NoiseProceduralTexture('confetti-noise', 128, scene);
  noise.animationSpeedFactor = 8;
  noise.persistence = 4;
  noise.brightness = 0.8;
  noise.octaves = 10;
  return noise;
}

/** 建立單側加農砲：沿側邊垂直線噴發，方向水平朝中央
 *
 * @param side -1 為左側、1 為右側
 */
function createCannon(
  scene: Scene,
  atlas: DynamicTexture,
  noise: NoiseProceduralTexture,
  side: -1 | 1,
) {
  const system = new ParticleSystem(`confetti-${side}`, 500, scene);
  system.particleTexture = atlas;

  /** 以圖集隨機取色 */
  system.isAnimationSheetEnabled = true;
  system.spriteCellWidth = CELL;
  system.spriteCellHeight = CELL;
  system.startSpriteCellID = 0;
  system.endSpriteCellID = PALETTE.length - 1;
  system.spriteRandomStartCell = true;
  /** 凍結在隨機選到的色格，避免生命週期內動畫播放導致顏色跳變 */
  system.spriteCellChangeSpeed = 0;

  const white = Color3.White().toColor4(1);
  system.color1 = white;
  system.color2 = white;
  system.colorDead = new Color4(1, 1, 1, 0);

  system.minSize = 0.35;
  system.maxSize = 0.7;
  /** Y 軸壓扁成長條，呈現紙片感 */
  system.minScaleY = 0.4;
  system.maxScaleY = 0.7;

  system.minLifeTime = 4;
  system.maxLifeTime = 6;
  system.emitRate = 90;
  /** 一次性爆發：噴發短暫時間後自動停止 */
  system.targetStopDuration = BURST_DURATION;

  /** 沿側邊垂直線噴發 */
  system.emitter = new Vector3(side * EDGE_X, 0, 0);
  system.minEmitBox = new Vector3(0, -EDGE_HALF_HEIGHT, 0);
  system.maxEmitBox = new Vector3(0, EDGE_HALF_HEIGHT, 0);

  system.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  /** 固定風向 + 重力 */
  system.gravity = WIND_GRAVITY.clone();

  /** 水平朝中央噴發（左砲往右、右砲往左），帶些微上下散布 */
  system.direction1 = new Vector3(-side * 1, -0.15, -0.2);
  system.direction2 = new Vector3(-side * 1, 0.35, 0.2);
  system.minEmitPower = MIN_EMIT_POWER;
  system.maxEmitPower = MAX_EMIT_POWER;

  /** 紙片翻滾：隨機初始角度 + 角速度，避免旋轉同步 */
  system.minInitialRotation = 0;
  system.maxInitialRotation = Math.PI * 2;
  system.minAngularSpeed = -Math.PI * 3;
  system.maxAngularSpeed = Math.PI * 3;

  /** 以雜訊製造自然的風吹飄動 */
  system.noiseTexture = noise;
  system.noiseStrength = NOISE_STRENGTH.clone();

  system.updateSpeed = 0.016;
  return system;
}

/** 建立兩側邊緣向中央噴發的慶祝彩帶加農砲 */
export function createConfettiCannons(scene: Scene) {
  const atlas = createConfettiAtlas(scene);
  const noise = createNoise(scene);
  const systemList = [
    createCannon(scene, atlas, noise, -1),
    createCannon(scene, atlas, noise, 1),
  ];

  return {
    /** 開始持續噴射 */
    start() {
      systemList.forEach((system) => system.start());
    },
    /** 停止噴射（既有粒子仍會播完生命週期） */
    stop() {
      systemList.forEach((system) => system.stop());
    },
  };
}

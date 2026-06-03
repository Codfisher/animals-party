import {
  Scene, ParticleSystem, DynamicTexture, Vector3, Color4,
} from '@babylonjs/core';

/** 繪製柔和光暈的程式材質（中心亮、邊緣透明） */
function createGlowTexture(scene: Scene) {
  const size = 64;
  const texture = new DynamicTexture('sparkle-texture', size, scene, false);
  const context = texture.getContext();

  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.55)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.update();

  return texture;
}

/** 建立在空中緩慢漂浮的柔和光點，點綴整體氛圍 */
export function createSparkles(scene: Scene) {
  const particleSystem = new ParticleSystem('sparkles', 220, scene);
  particleSystem.particleTexture = createGlowTexture(scene);

  /** 以場景中心為原點，於大範圍空間中散布 */
  particleSystem.emitter = Vector3.Zero();
  particleSystem.minEmitBox = new Vector3(-60, 2, -40);
  particleSystem.maxEmitBox = new Vector3(60, 40, 65);

  /** 暖白與淡藍交錯的柔光 */
  particleSystem.color1 = new Color4(1, 1, 0.85, 1);
  particleSystem.color2 = new Color4(0.8, 0.9, 1, 1);
  particleSystem.colorDead = new Color4(1, 1, 1, 0);

  particleSystem.minSize = 0.1;
  particleSystem.maxSize = 0.45;
  particleSystem.minLifeTime = 4;
  particleSystem.maxLifeTime = 9;
  particleSystem.emitRate = 45;

  /** 加色混合呈現發光感 */
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
  particleSystem.gravity = Vector3.Zero();

  /** 緩慢向上、四散的微弱飄移 */
  particleSystem.direction1 = new Vector3(-0.2, 0.25, -0.2);
  particleSystem.direction2 = new Vector3(0.2, 0.6, 0.2);
  particleSystem.minEmitPower = 0.2;
  particleSystem.maxEmitPower = 0.6;

  /** 輕微閃爍 */
  particleSystem.minAngularSpeed = -0.4;
  particleSystem.maxAngularSpeed = 0.4;

  particleSystem.updateSpeed = 0.01;
  particleSystem.start();

  return particleSystem;
}

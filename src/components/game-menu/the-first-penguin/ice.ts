import {
  StandardMaterial, MeshBuilder, Scene, Vector3, Color3,
  Animation, AnimationGroup, IAnimationKey, AnimationKeyInterpolation, CircleEase, EasingFunction,
} from "@babylonjs/core";

interface Params {
  width: number;
  depth: number;
  height: number;
  position: Vector3;
  material?: StandardMaterial;
}

export function createIce(name: string, scene: Scene, params: Params) {
  const material = params.material ?? new StandardMaterial(`${name}-material`, scene);

  // 建立浮冰
  const mesh = MeshBuilder.CreateBox(name, params);
  mesh.material = material;
  mesh.position = params.position;

  // 建立水波紋
  function createRipple() {
    const ripple = MeshBuilder.CreateGround('ripple', {
      height: params.depth + 0.3,
      width: params.width + 0.3,
    });
    ripple.setParent(mesh);
    // 往上移一點，要比海面高一點才看的到
    ripple.position = new Vector3(0, 0.01, 0);

    // 設為半透明白色
    const material = new StandardMaterial('ripple-material', scene);
    material.diffuseColor = Color3.White();
    material.emissiveColor = Color3.FromHexString('060A0EFF');
    material.alpha = 0.5;

    ripple.material = material;

    // 建立動畫
    /** 總幀數 */
    const frameRate = 20;
    const breatheAnimation = new Animation(
      /** 動畫名稱 */
      'breathe',
      /** 目標屬性 */
      'scaling',
      /** 每秒播放幀數 */
      frameRate / 2,
      /** 目標屬性類型 */
      Animation.ANIMATIONTYPE_VECTOR3,
      /** 循環方式 */
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keyFrames: IAnimationKey[] = [
      {
        frame: 0,
        value: new Vector3(1, 1, 1),
      },
      {
        frame: frameRate / 2,
        value: new Vector3(1.05, 1, 1.05),
      },
      {
        frame: frameRate,
        value: new Vector3(1, 1, 1)
      },
    ];
    breatheAnimation.setKeys(keyFrames);

    // 建立 easing function
    const easingFunction = new CircleEase();
    easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    breatheAnimation.setEasingFunction(easingFunction);
    ripple.animations.push(breatheAnimation);

    /** 開始播放動畫 */
    scene.beginAnimation(ripple, 0, frameRate, true);
  }
  createRipple();

  return {
    mesh
  }
}
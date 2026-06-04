import {
  Animation,
  IAnimationKey,
  EasingFunction,
  SineEase,
  Vector3,
  Node,
  Scene,
} from '@babylonjs/core';

interface CycleAnimationParam {
  /** 目標屬性，例如 position、rotation */
  property: string;
  /** 關鍵影格，frame 與 value */
  keyList: IAnimationKey[];
  /** 總幀數
   * @default 30
   */
  frameRate?: number;
  /** 播放倍數
   * @default 1
   */
  speedRatio?: number;
}

/** 建立並播放循環往復動畫（如上下浮動、拍翅）
 *
 * 與 common/utils 的 createAnimation 不同，此函數產生持續循環的動畫，
 * 適合裝飾物的呼吸、漂浮等氛圍效果。
 */
export function playCycleAnimation(target: Node, scene: Scene, param: CycleAnimationParam) {
  const { property, keyList, frameRate = 30, speedRatio = 1 } = param;

  const sample = keyList[0]?.value;
  const animationType =
    sample instanceof Vector3 ? Animation.ANIMATIONTYPE_VECTOR3 : Animation.ANIMATIONTYPE_FLOAT;

  const animation = new Animation(
    `${property}-cycle`,
    property,
    frameRate,
    animationType,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  animation.setKeys(keyList);

  const easingFunction = new SineEase();
  easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  animation.setEasingFunction(easingFunction);

  /** 以 beginDirectAnimation 只播放此動畫，避免同一節點多個循環動畫互相干擾 */
  const lastFrame = keyList.at(-1)?.frame ?? frameRate;
  return scene.beginDirectAnimation(target, [animation], 0, lastFrame, true, speedRatio);
}

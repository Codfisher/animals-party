import { Scene, TransformNode, Vector3, StandardMaterial, Color3, Angle } from '@babylonjs/core';
import { random } from 'lodash-es';
import { createIce } from '../the-first-penguin/ice';
import { playCycleAnimation } from './utils';

interface Param {
  position: Vector3;
  /** 浮冰邊長
   * @default 1.5
   */
  size?: number;
  /** 共用材質 */
  material?: StandardMaterial;
}

/** 取得漂浮物專用的冰藍色材質 */
export function createFloatingPropMaterial(scene: Scene) {
  const material = new StandardMaterial('floating-prop-material', scene);
  material.diffuseColor = Color3.FromHexString('#d6f0ff');
  material.specularColor = new Color3(0.2, 0.2, 0.2);
  return material;
}

/** 建立散落海面的小浮冰，重用企鵝島的浮冰外觀，並附加隨波起伏與緩慢旋轉 */
export function createFloatingProp(name: string, scene: Scene, param: Param) {
  const { position, size = 1.5, material } = param;

  const rootNode = new TransformNode(name);
  rootNode.position = position;

  /** 旋轉樞紐：固定於水面（不上下浮動），冰塊與水波紋同掛其下，
   *  使水波紋能跟著冰塊一起左右搖擺，但不隨冰塊上下起伏 */
  const yawNode = new TransformNode(`${name}-yaw`);
  yawNode.parent = rootNode;
  const baseRotationY = random(0, Math.PI * 2, true);
  yawNode.rotation = new Vector3(0, baseRotationY, 0);

  const ice = createIce(name, scene, {
    width: size,
    depth: size,
    height: random(0.6, 1.2, true),
    position: Vector3.Zero(),
    material: material ?? createFloatingPropMaterial(scene),
  });
  /** 以 parent 指派保留 local 座標（setParent 會保留世界座標，導致物件被推回原點） */
  ice.mesh.parent = yawNode;
  ice.mesh.position = Vector3.Zero();

  /** 水波紋脫離冰塊、改掛在 yawNode，緊貼水面但隨樞紐一起旋轉 */
  ice.ripple.parent = yawNode;
  ice.ripple.position = new Vector3(0, 0.01, 0);

  /** 僅冰塊隨波上下起伏，水波紋留在水面 */
  playCycleAnimation(ice.mesh, scene, {
    property: 'position.y',
    keyList: [
      { frame: 0, value: 0 },
      { frame: 30, value: random(0.15, 0.35, true) },
      { frame: 60, value: 0 },
    ],
    frameRate: 30,
    speedRatio: random(0.5, 0.9, true),
  });

  /** 緩慢左右搖擺（冰塊與水波紋一起轉） */
  const swing = Angle.FromDegrees(8).radians();
  playCycleAnimation(yawNode, scene, {
    property: 'rotation.y',
    keyList: [
      { frame: 0, value: baseRotationY - swing },
      { frame: 40, value: baseRotationY + swing },
      { frame: 80, value: baseRotationY - swing },
    ],
    frameRate: 30,
    speedRatio: random(0.4, 0.7, true),
  });

  return rootNode;
}

import {
  Vector3, Scene, SceneLoader,
  AnimationGroup, Color3,
  TransformNode, BezierCurveEase,
  Animation, Quaternion, Axis, Tools,
} from "@babylonjs/core";
import { defaults } from "lodash-es";
import { createAnimation } from "../../../common/utils";

interface Param {
  scaling?: number;
  position?: Vector3;
  rotation?: Vector3;
  radius?: number;
  delay?: number;
}

const defaultParam: Required<Param> = {
  scaling: 1,
  position: Vector3.Zero(),
  rotation: Vector3.Zero(),
  radius: 10,
  delay: 0,
}

export async function createChicken(name: string, scene: Scene, param?: Param) {
  const {
    scaling, position, rotation, radius, delay
  } = defaults(param, defaultParam);

  const rootNode = new TransformNode('chicken', scene);

  const result = await SceneLoader.ImportMeshAsync('', '/chicken-fly/', 'flying-chicken.glb', scene);

  const mesh = result.meshes[0];
  mesh.name = name;
  mesh.position = new Vector3(radius, 0, 0);
  mesh.rotation = new Vector3(0, Tools.ToRadians(90), 0);
  mesh.scaling = new Vector3(scaling, scaling, scaling);
  mesh.setParent(rootNode);

  function initChickenAnimation() {
    const { animation, frameRate } = createAnimation(mesh, 'rotation',
      new Vector3(Tools.ToRadians(-360), Tools.ToRadians(90), 0), {
      // easingFunction: new BezierCurveEase(),
    });
    animation.loopMode = Animation.ANIMATIONLOOPMODE_CYCLE;
    scene.beginDirectAnimation(mesh, [animation], 0, frameRate, true, 0.6);
  }
  setTimeout(initChickenAnimation, delay);

  rootNode.position = position;

  function initRootNodeAnimation() {
    /** 計算起點於終點
     * 
     * 旋轉後的 Y 軸，以原點為中心，繞 Y 軸旋轉
     */
    const fromValue = rotation.toQuaternion();
    const midValue = fromValue.multiply(
      Quaternion.RotationAxis(Axis.Y, Tools.ToRadians(180))
    );
    const toValue = midValue.multiply(
      Quaternion.RotationAxis(Axis.Y, Tools.ToRadians(180))
    );

    const frameRate = 60;
    const animation = new Animation('circular-motion', 'rotationQuaternion', frameRate,
      Animation.ANIMATIONTYPE_QUATERNION,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [
      {
        frame: 0, value: fromValue,
      },
      {
        frame: frameRate / 2, value: midValue,
      },
      {
        frame: frameRate, value: toValue,
      },
    ];
    animation.setKeys(keys);
    rootNode.animations = [animation];

    // 開始動畫
    scene.beginAnimation(rootNode, 0, frameRate, true, 0.4);
  }
  initRootNodeAnimation();

  return {
    rootNode,
    setParent: rootNode.setParent.bind(rootNode),
  }
}

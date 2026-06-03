import {
  Scene, Vector3, SceneLoader,
  StandardMaterial, Color3, TransformNode,
  Animation,
  SineEase,
  EasingFunction,
} from "@babylonjs/core";
import { defaults } from "lodash-es";

interface Option {
  scaling?: number;
  position?: Vector3;
  rotation?: Vector3;
}

const defaultOption: Required<Option> = {
  scaling: 1,
  position: Vector3.Zero(),
  rotation: Vector3.Zero(),
}

export async function createTitle(name: string, scene: Scene, option?: Option) {
  const {
    scaling, position, rotation
  } = defaults(option, defaultOption);

  const rootNode = new TransformNode('chicken-fly-island-title');
  const result = await SceneLoader.ImportMeshAsync('', '/chicken-fly/', 'title.glb', scene);

  /** 這次的模型已經內建材質，所以取 root 就行 */
  const mesh = result.meshes[0];
  mesh.name = name;
  mesh.position = position;
  mesh.rotation = rotation;
  mesh.scaling = new Vector3(scaling, scaling, scaling);
  mesh.parent = rootNode;

  function initMaterial() {
    const material = new StandardMaterial('chicken-fly-title-material', scene);
    material.diffuseColor = Color3.White();
    material.emissiveColor = Color3.FromHexString('#101519');
    material.specularColor = Color3.Black();
    mesh.material = material;
    return material;
  }
  initMaterial();

  // 建立動畫
  function initAnimation() {
    const frameRate = 20;
    const floatAnimation = new Animation(
      'float', 'position', frameRate / 3,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const offset = 0.2;
    floatAnimation.setKeys([
      {
        frame: 0,
        value: position.add(new Vector3(0, -offset, 0)),
      },
      {
        frame: frameRate / 2,
        value: position.add(new Vector3(0, offset, 0)),
      },
      {
        frame: frameRate,
        value: position.add(new Vector3(0, -offset, 0)),
      },
    ]);
    mesh.animations.push(floatAnimation);

    const easingFunction = new SineEase();
    easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    floatAnimation.setEasingFunction(easingFunction);

    scene.beginAnimation(mesh, 0, frameRate, true);
  }
  initAnimation();

  return {
    rootNode,
    setParent: rootNode.setParent.bind(rootNode),
  }
}

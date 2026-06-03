import {
  Scene, Vector3, SceneLoader,
  Animation, BackEase, SineEase,
  StandardMaterial, Color3, TransformNode,
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

  const rootNode = new TransformNode('penguin-island-title');
  const result = await SceneLoader.ImportMeshAsync('', '/the-first-penguin/', 'penguin-title.glb', scene);

  const scalingVector = new Vector3(scaling, scaling, scaling);

  /** 這裡取第二個 mesh 是因為這裡需要加入 material
   * 但是第一個 mesh 是 root，root 無法使用材質，
   * 所以要取第二個 mesh，也就是文字本體。
   */
  const mesh = result.meshes[1];
  mesh.name = name;
  mesh.position = position;
  mesh.rotation = rotation;
  mesh.scaling = scalingVector;
  mesh.parent = rootNode;

  function initMaterial() {
    const material = new StandardMaterial('penguin-title-material', scene);
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

    floatAnimation.setKeys([
      {
        frame: 0,
        value: position.add(new Vector3(0, 0, 0)),
      },
      {
        frame: frameRate / 2,
        value: position.add(new Vector3(0, 0.05, 0)),
      },
      {
        frame: frameRate,
        value: position.add(new Vector3(0, 0, 0)),
      },
    ]);
    mesh.animations.push(floatAnimation);
    floatAnimation.setEasingFunction(new SineEase());

    const scaleAnimation = new Animation(
      'scale', 'scaling', frameRate / 2,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );
    const scaleValue = 0.01;
    scaleAnimation.setKeys([
      {
        frame: 0,
        value: scalingVector.add(new Vector3(-scaleValue, 0, scaleValue)),
      },
      {
        frame: frameRate / 2,
        value: scalingVector.add(new Vector3(scaleValue, 0, -scaleValue)),
      },
      {
        frame: frameRate,
        value: scalingVector.add(new Vector3(-scaleValue, 0, scaleValue)),
      },
    ]);
    mesh.animations.push(scaleAnimation);
    scaleAnimation.setEasingFunction(new BackEase());

    scene.beginAnimation(mesh, 0, frameRate, true);
  }
  initAnimation();

  return { node: rootNode }
}

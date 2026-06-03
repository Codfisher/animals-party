import {
  Scene, TransformNode, MeshBuilder,
  StandardMaterial, Vector3, Angle, PointLight,
  Color3,
} from '@babylonjs/core';
import { ModelIsland } from '../../../types';
import { ref, watch } from 'vue';
import { createIce } from './ice';
import { createPenguin } from './penguin';
import { createTitle } from './title';
import { createAnimation } from '../../../common/utils';

export type PenguinIsland = ModelIsland;

export async function createPenguinIsland(scene: Scene): Promise<PenguinIsland> {
  const rootNode = new TransformNode('penguin-island');


  function createIces() {
    const list = [
      {
        width: 2.5,
        depth: 2.5,
        height: 3,
        position: new Vector3(1, 0, 2),
      },
      {
        width: 4,
        depth: 4,
        height: 2,
        position: Vector3.Zero(),
      },
      {
        width: 2,
        depth: 2,
        height: 1.5,
        position: new Vector3(8, 0, 3.2),
      },
      {
        width: 2.5,
        depth: 2.5,
        height: 1,
        position: new Vector3(-3.5, 0, 1.5),
      },
      {
        width: 1,
        depth: 1,
        height: 1,
        position: new Vector3(3, 0, -2.5),
      },
    ];

    const material = new StandardMaterial('ice-material', scene);
    list.forEach((data, i) => {
      const ice = createIce(`ice-${i}`, scene, {
        ...data, material
      });
      ice.mesh.setParent(rootNode);
    });
  }
  createIces();

  async function createPenguins() {
    /** 
     * 從 createPenguin 函數獲取第三個參數的類型（索引為2，因為索引從 0 開始）
     */
    const list: Parameters<typeof createPenguin>[2][] = [
      {
        scaling: 0.4,
        position: new Vector3(8, 0.8, 3),
        rotation: new Vector3(0, Math.PI, 0),
        playAnimation: 'idle',
      },
      {
        scaling: 0.45,
        position: new Vector3(-0.5, 1, 0),
        rotation: new Vector3(0, Angle.FromDegrees(125).radians(), 0),
        playAnimation: 'walk',
      },
      {
        scaling: 0.45,
        position: new Vector3(0.5, 1, -0.5),
        rotation: new Vector3(0, Angle.FromDegrees(310).radians(), 0),
        playAnimation: 'walk',
      },
      {
        scaling: 0.35,
        position: new Vector3(-4.2, 0.8, 1.7),
        rotation: new Vector3(-Math.PI / 2, -Math.PI / 4, 0),
      },
    ];

    /** 建立 createPenguin 的 Promise 矩陣 */
    const tasks = list.map((option, i) =>
      createPenguin(`penguin-${i}`, scene, option)
    );
    /** 當所有的 Promise 都完成時，回傳所有 Promise 的結果。 */
    const results = await Promise.allSettled(tasks);

    /** 將成功建立的企鵝綁定至 rootNode */
    results.forEach((result) => {
      if (result.status === 'rejected') return;
      result.value.mesh.setParent(rootNode);
    });
  }
  await createPenguins();

  function createLight() {
    const light = new PointLight(
      'penguin-island-light',
      new Vector3(-7.8, 7.1, -3),
      scene,
    );
    light.diffuse = new Color3(186 / 255, 229 / 255, 1);
    light.intensity = 0.6;
    light.parent = rootNode;

    return light;
  }
  createLight();

  async function createText() {
    const title = await createTitle('penguin-title', scene, {
      position: new Vector3(-0.17, -0.08, -2.94),
      rotation: new Vector3(0, Math.PI, Math.PI),
      scaling: 0.9,
    });
    title.node.parent = rootNode;

    return title;
  }
  const titleModel = await createText();

  const active = ref(false);
  function setActive(value: boolean) {
    active.value = value;
  }
  watch(active, (value) => {
    playActiveAnimation(value);
  }, { immediate: true });

  function playActiveAnimation(value: boolean) {
    /** 浮出水面或下降 */
    const offset = value ? 0 : -1;
    const rotation = value ? 0 : Angle.FromDegrees(10).radians();

    const results = [
      createAnimation(titleModel.node, 'position', new Vector3(0, offset, 0)),
      createAnimation(titleModel.node, 'rotation', new Vector3(rotation, 0, rotation)),
    ];
    const animations = results.map(({ animation }) => animation);

    scene.beginDirectAnimation(titleModel.node, animations, 0, results[0].frameRate);
  }

  return {
    name: 'the-first-penguin',
    rootNode,
    setActive,
  }
}

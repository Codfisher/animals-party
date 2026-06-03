import {
  Color3,
  HemisphericLight,
  Scene, SceneLoader, Tools, TransformNode, Vector3
} from '@babylonjs/core';
import { ModelIsland } from '../../../types';
import { defaults } from 'lodash-es';
import { createFox } from './fox';

export type FoxAndMouseIsland = ModelIsland;

interface Param {
  position?: Vector3;
  rotation?: Vector3,
}
const defaultParam: Required<Param> = {
  position: new Vector3(0, 0, 0),
  rotation: new Vector3(0, 0, 0),
}

export async function createFoxAndMouseIsland(scene: Scene, param: Param): Promise<FoxAndMouseIsland> {
  const { position, rotation } = defaults(param, defaultParam);

  const rootNode = new TransformNode('fox-and-mouse-island');

  function createLight() {
    const light = new HemisphericLight(
      'fox-and-mouse-island-light',
      new Vector3(-5, 5, 5),
      scene,
    );
    light.intensity = 0.1;
    light.parent = rootNode;

    return light;
  }
  createLight();

  async function createIsland() {
    const result = await SceneLoader.ImportMeshAsync('', '/fox-and-mouse/', 'fox-island.glb', scene);
    const mesh = result.meshes[0];
    mesh.scaling = new Vector3(0.5, 0.5, 0.5);
    mesh.rotation = new Vector3(0, Tools.ToRadians(-90), 0);
    mesh.parent = rootNode;

    return mesh;
  }
  await createIsland();

  async function createFoxes() {
    /** 
     * 從 createFox 函數獲取第三個參數的類型（索引為2，因為索引從 0 開始）
     */
    const list: Parameters<typeof createFox>[2][] = [
      {
        scaling: 0.3,
        position: new Vector3(1, 1, 0),
        playAnimation: 'dive',
      },
      {
        scaling: 0.3,
        position: new Vector3(2, 1, 2),
        rotation: new Vector3(0, Tools.ToRadians(90), 0),
        playAnimation: 'dive',
      },
      {
        scaling: 0.3,
        position: new Vector3(-2, 1, 0),
        rotation: new Vector3(0, Tools.ToRadians(-90), 0),
        playAnimation: 'dive',
      },
      {
        scaling: 0.25,
        position: new Vector3(3.5, 2, -1.5),
        rotation: new Vector3(0, Tools.ToRadians(180), 0),
        playAnimation: 'dive',
      },
      {
        scaling: 0.3,
        position: new Vector3(-3.5, 2.4, -4),
        rotation: new Vector3(0, Tools.ToRadians(180), 0),
        playAnimation: 'dive',
      },
    ];

    /** 建立 createFox 的 Promise 矩陣 */
    const tasks = list.map((option, i) =>
      createFox(`fox-${i}`, scene, option)
    );
    /** 當所有的 Promise 都完成時，回傳所有 Promise 的結果。 */
    const results = await Promise.allSettled(tasks);

    /** 將成功建立的人物綁定至 rootNode */
    results.forEach((result) => {
      if (result.status === 'rejected') return;
      result.value.mesh.setParent(rootNode);
    });
  }
  await createFoxes();

  async function createTitle() {
    const result = await SceneLoader.ImportMeshAsync('', '/fox-and-mouse/', 'fox-title.glb', scene);
    const mesh = result.meshes[0];
    mesh.name = 'fox-title';
    mesh.scaling = new Vector3(0.8, 0.8, 0.8);
    mesh.position = new Vector3(-1.5, 0.8, 2.7);
    mesh.parent = rootNode;

    return mesh;
  }
  await createTitle();

  rootNode.position = position;
  rootNode.rotation = rotation;

  return {
    name: 'fox-and-mouse',
    rootNode,
    setActive() {
      // 
    },
  }
}

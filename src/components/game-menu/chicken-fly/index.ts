import {
  MeshBuilder,
  Scene, StandardMaterial, Tools, TransformNode, Vector3
} from '@babylonjs/core';
import { ModelIsland } from '../../../types';
import { ref } from 'vue';
import { defaults, range } from 'lodash-es';
import { createChicken } from './chicken';
import { createTitle } from './title';

export type ChickenFlyIsland = ModelIsland;

interface Param {
  position?: Vector3;
}
const defaultParam: Required<Param> = {
  position: new Vector3(0, 0, 0),
}

export async function createChickenFlyIsland(scene: Scene, param: Param): Promise<ChickenFlyIsland> {
  const { position } = defaults(param, defaultParam);

  const rootNode = new TransformNode('chicken-fly-island');

  const active = ref(false);
  function setActive(value: boolean) {
    active.value = value;
  }

  async function createChickens() {
    /** 
     * 從 createChicken 函數獲取第三個參數的類型（索引為2，因為索引從 0 開始）
     * 
     * 從 0 到 360 度取 6 等分，產生 6 隻小雞
     */
    const divisions = 6;
    const list: Parameters<typeof createChicken>[2][] =
      range(0, divisions)
        .map((n) => n * (360 / divisions))
        .map((degree, i) => ({
          rotation: new Vector3(0, Tools.ToRadians(degree), 0),
          delay: i * 600,
        }));

    /** 建立 createChicken 的 Promise 矩陣 */
    const tasks = list.map((option, i) =>
      createChicken(`chicken-${i}`, scene, option)
    );
    /** 當所有的 Promise 都完成時，回傳所有 Promise 的結果。 */
    const results = await Promise.allSettled(tasks);

    /** 將成功建立的物體綁定至 rootNode */
    results.forEach((result) => {
      if (result.status === 'rejected') return;
      result.value.setParent(rootNode);
    });
  }
  await createChickens();

  async function createText() {
    const title = await createTitle('chicken-fly-title', scene, {
      rotation: new Vector3(Tools.ToRadians(118.2), Tools.ToRadians(273.6), 0),
      scaling: 3,
    });
    title.setParent(rootNode);
  }
  await createText();

  rootNode.position = position;

  return {
    name: 'chicken-fly',
    rootNode,
    setActive,
  }
}

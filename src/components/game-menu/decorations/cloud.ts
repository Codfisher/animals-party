import {
  Scene, TransformNode, MeshBuilder, Mesh,
  StandardMaterial, Vector3, Color3,
} from '@babylonjs/core';
import { random, range } from 'lodash-es';
import { playCycleAnimation } from './utils';

interface Param {
  position: Vector3;
  /** 整體縮放
   * @default 1
   */
  scaling?: number;
  /** 共用材質，省去重複建立 */
  material?: StandardMaterial;
}

/** 取得雲朵專用的白色材質。
 *
 * 自發光僅取中等強度，保留方塊各面的受光陰影以呈現立體感。
 */
export function createCloudMaterial(scene: Scene) {
  const material = new StandardMaterial('cloud-material', scene);
  material.diffuseColor = Color3.White();
  material.emissiveColor = Color3.FromHexString('#cfe3f5');
  material.specularColor = Color3.Black();
  return material;
}

/** 單一方塊邊長 */
const CELL_SIZE = 1;

/** 建立 Minecraft 風格的方塊雲：以數個隨機矩形堆疊出不規則體素輪廓，並緩慢上下浮動 */
export function createCloud(name: string, scene: Scene, param: Param) {
  const { position, scaling = 1, material } = param;

  const rootNode = new TransformNode(name);
  const cloudMaterial = material ?? createCloudMaterial(scene);

  /** 以數個隨機矩形聯集，組成不規則的方塊輪廓 */
  const cellSet = new Set<string>();
  range(0, random(3, 5)).forEach(() => {
    const width = random(2, 4);
    const depth = random(1, 3);
    const offsetX = random(-2, 2);
    const offsetZ = random(-2, 2);

    range(0, width).forEach((x) => {
      range(0, depth).forEach((z) => {
        cellSet.add(`${offsetX + x},${offsetZ + z}`);
      });
    });
  });

  const cellList = [...cellSet].map((key) => {
    const [x, z] = key.split(',').map(Number);
    return { x, z };
  });

  /** 取中心偏移，讓雲朵以 rootNode 為中心 */
  const centerX = cellList.reduce((sum, cell) => sum + cell.x, 0) / cellList.length;
  const centerZ = cellList.reduce((sum, cell) => sum + cell.z, 0) / cellList.length;

  const meshList: Mesh[] = [];
  cellList.forEach(({ x, z }, i) => {
    const cube = MeshBuilder.CreateBox(`${name}-cube-${i}`, { size: CELL_SIZE }, scene);
    cube.position = new Vector3((x - centerX) * CELL_SIZE, 0, (z - centerZ) * CELL_SIZE);
    meshList.push(cube);

    /** 隨機在部分方塊上疊第二層，增加蓬鬆與隨機感 */
    if (random(0, 1, true) < 0.3) {
      const top = MeshBuilder.CreateBox(`${name}-cube-top-${i}`, { size: CELL_SIZE }, scene);
      top.position = new Vector3((x - centerX) * CELL_SIZE, CELL_SIZE, (z - centerZ) * CELL_SIZE);
      meshList.push(top);
    }
  });

  /** 合併所有方塊以降低 draw call */
  const cloud = Mesh.MergeMeshes(meshList, true, true, undefined, false, false);
  if (cloud) {
    cloud.name = `${name}-mesh`;
    cloud.material = cloudMaterial;
    cloud.setParent(rootNode);
    cloud.position = Vector3.Zero();
  }

  rootNode.position = position;
  rootNode.scaling = new Vector3(scaling, scaling, scaling);

  /** 緩慢上下浮動，幀率與起始相位隨機，避免整齊劃一 */
  const bobHeight = random(0.4, 0.8, true);
  playCycleAnimation(rootNode, scene, {
    property: 'position.y',
    keyList: [
      { frame: 0, value: position.y },
      { frame: 30, value: position.y + bobHeight },
      { frame: 60, value: position.y },
    ],
    frameRate: 30,
    speedRatio: random(0.4, 0.7, true),
  });

  return rootNode;
}

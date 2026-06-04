import {
  Scene,
  TransformNode,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  Vector3,
  Color3,
} from '@babylonjs/core';
import { random, range } from 'lodash-es';

interface BubbleEmitterParam {
  /** 節點與 mesh 命名前綴，避免多組發射器名稱衝突
   * @default 'bubble'
   */
  name?: string;
  /** 共用材質 */
  material?: StandardMaterial;
  /** 氣泡數量
   * @default 12
   */
  count?: number;
  /** 發射區域中心，y 為海面高度
   * @default Vector3.Zero()
   */
  origin?: Vector3;
  /** 水平散布半徑
   * @default { x: 20, z: 20 }
   */
  spread?: { x: number; z: number };
  /** 上升高度
   * @default 8
   */
  riseHeight?: number;
}

interface BubbleState {
  mesh: Mesh;
  baseX: number;
  baseZ: number;
  /** 每秒上升速度 */
  speed: number;
}

/** 取得氣泡專用的半透明材質 */
export function createBubbleMaterial(scene: Scene) {
  const material = new StandardMaterial('bubble-material', scene);
  material.diffuseColor = Color3.FromHexString('#cdeeff');
  material.emissiveColor = Color3.FromHexString('#aaddff');
  material.specularColor = Color3.White();
  material.alpha = 0.4;
  return material;
}

/** 建立從海面緩緩上升、接近頂端淡出後重生的氣泡群 */
export function createBubbleEmitter(scene: Scene, param: BubbleEmitterParam = {}) {
  const {
    name = 'bubble',
    material = createBubbleMaterial(scene),
    count = 12,
    origin = Vector3.Zero(),
    spread = { x: 20, z: 20 },
    riseHeight = 8,
  } = param;

  const rootNode = new TransformNode(`${name}-emitter`);
  rootNode.position = origin;

  /** 重新擲一顆氣泡的水平位置、速度與大小 */
  function resetBubble(state: BubbleState) {
    state.baseX = random(-spread.x, spread.x, true);
    state.baseZ = random(-spread.z, spread.z, true);
    state.speed = random(0.6, 1.4, true);

    const diameter = random(0.2, 0.6, true);
    state.mesh.scaling = new Vector3(diameter, diameter, diameter);
    state.mesh.position.x = state.baseX;
    state.mesh.position.z = state.baseZ;
  }

  const bubbleList: BubbleState[] = range(0, count).map((i) => {
    const mesh = MeshBuilder.CreateSphere(
      `${name}-${i}`,
      {
        diameter: 1,
        segments: 6,
      },
      scene,
    );
    mesh.material = material;
    mesh.setParent(rootNode);

    const state: BubbleState = { mesh, baseX: 0, baseZ: 0, speed: 1 };
    resetBubble(state);
    /** 起始高度錯開，避免同時上升 */
    mesh.position.y = random(0, riseHeight, true);
    return state;
  });

  scene.onBeforeRenderObservable.add(() => {
    const deltaSecond = scene.getEngine().getDeltaTime() / 1000;

    bubbleList.forEach((state) => {
      state.mesh.position.y += state.speed * deltaSecond;

      const progress = state.mesh.position.y / riseHeight;
      if (progress >= 1) {
        state.mesh.position.y = 0;
        resetBubble(state);
        return;
      }

      /** 起始 15% 淡入、末段 30% 淡出 */
      const fadeIn = Math.min(progress / 0.15, 1);
      const fadeOut = Math.min((1 - progress) / 0.3, 1);
      state.mesh.visibility = Math.min(fadeIn, fadeOut);
    });
  });

  return rootNode;
}

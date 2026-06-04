import { Scene, TransformNode, Vector3, Color3 } from '@babylonjs/core';
import { random } from 'lodash-es';
import { getRandomPositions } from '../../../common/utils';
import { createCloud, createCloudMaterial } from './cloud';
import { createFloatingProp, createFloatingPropMaterial } from './floating-prop';
import { createKite } from './kite';
import { createBoat } from './boat';
import { createBubbleEmitter, createBubbleMaterial } from './bubble';
import { createSparkles } from './sparkles';
import { createConfettiFall } from './confetti-fall';

export interface Decorations {
  /** 所有裝飾的根節點 */
  rootNode: TransformNode;
}

/** 雲朵在 X 軸的漂移範圍（±limit），超出後折返另一側 */
const CLOUD_DRIFT_LIMIT = 68;

/** 在大廳場景中加入雲朵、漂浮物、風箏、小船、氣泡與漂浮光點等氛圍裝飾 */
export function createDecorations(scene: Scene): Decorations {
  const rootNode = new TransformNode('decorations');

  createClouds();
  createFloatingProps();
  createKites();
  createBoats();
  createBubbles();
  createSparkles(scene);
  createConfettiFall(scene);

  /** 高空緩慢漂移的雲朵 */
  function createClouds() {
    /** 以最小間距隨機散布於高空大範圍，避免雲朵過於擁擠 */
    const positionList = getRandomPositions({
      offset: { x: 60, y: 9, z: 55 },
      minDistance: 20,
      length: 16,
      origin: new Vector3(0, 35, 26),
    });

    const material = createCloudMaterial(scene);
    const cloudList = positionList.map((position, i) => {
      const cloud = createCloud(`cloud-${i}`, scene, {
        position,
        scaling: random(1.4, 2.4, true),
        material,
      });
      cloud.setParent(rootNode);
      return { node: cloud, speed: random(0.6, 1.4, true) };
    });

    /** 緩慢橫向漂移，超出邊界後從另一側折返 */
    scene.onBeforeRenderObservable.add(() => {
      const deltaSecond = scene.getEngine().getDeltaTime() / 1000;
      cloudList.forEach(({ node, speed }) => {
        node.position.x += speed * deltaSecond;
        if (node.position.x > CLOUD_DRIFT_LIMIT) {
          node.position.x = -CLOUD_DRIFT_LIMIT;
        }
      });
    });
  }

  /** 散落海面的小浮冰 */
  function createFloatingProps() {
    const list = [
      new Vector3(-14, 0, 6),
      new Vector3(12, 0, -6),
      new Vector3(16, 0, 14),
      new Vector3(-16, 0, 18),
      new Vector3(8, 0, 28),
      new Vector3(-12, 0, 32),
      new Vector3(14, 0, 40),
      new Vector3(-14, 0, 50),
      new Vector3(6, 0, 54),
      new Vector3(-8, 0, -10),
    ];

    const material = createFloatingPropMaterial(scene);
    list.forEach((position, i) => {
      const prop = createFloatingProp(`floating-prop-${i}`, scene, {
        position,
        size: random(1, 2.2, true),
        material,
      });
      prop.setParent(rootNode);
    });
  }

  /** 空中搖曳的風箏 */
  function createKites() {
    const list = [
      { position: new Vector3(-22, 20, 4), color: '#ff6b6b', scaling: 1.4 },
      { position: new Vector3(18, 24, 18), color: '#ffd93d', scaling: 1.2 },
      { position: new Vector3(-16, 22, 38), color: '#6bcbef', scaling: 1.5 },
      { position: new Vector3(24, 19, 46), color: '#a0e57e', scaling: 1.1 },
    ];

    list.forEach((option, i) => {
      const kite = createKite(`kite-${i}`, scene, {
        position: option.position,
        color: Color3.FromHexString(option.color),
        scaling: option.scaling,
      });
      kite.setParent(rootNode);
    });
  }

  /** 海面上隨波搖晃的小帆船 */
  function createBoats() {
    const list = [
      { position: new Vector3(-20, 0, 12), sailColor: '#fff4e0', scaling: 1.2 },
      { position: new Vector3(18, 0, 2), sailColor: '#ffe0e0', scaling: 1 },
      { position: new Vector3(20, 0, 34), sailColor: '#e0f0ff', scaling: 1.1 },
      { position: new Vector3(-18, 0, 40), sailColor: '#fff4e0', scaling: 0.9 },
    ];

    list.forEach((option, i) => {
      const boat = createBoat(`boat-${i}`, scene, {
        position: option.position,
        sailColor: Color3.FromHexString(option.sailColor),
        scaling: option.scaling,
      });
      boat.setParent(rootNode);
    });
  }

  /** 海面冒出的氣泡，於兩座海平面島嶼附近 */
  function createBubbles() {
    const material = createBubbleMaterial(scene);

    const penguinBubble = createBubbleEmitter(scene, {
      name: 'penguin-bubble',
      material,
      count: 10,
      origin: new Vector3(0, 0, 2),
      spread: { x: 12, z: 12 },
      riseHeight: 7,
    });
    penguinBubble.setParent(rootNode);

    const foxBubble = createBubbleEmitter(scene, {
      name: 'fox-bubble',
      material,
      count: 8,
      origin: new Vector3(-1, 0, 44),
      spread: { x: 10, z: 10 },
      riseHeight: 7,
    });
    foxBubble.setParent(rootNode);
  }

  return { rootNode };
}

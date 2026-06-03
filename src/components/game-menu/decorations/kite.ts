import {
  Scene, TransformNode, MeshBuilder, Mesh,
  StandardMaterial, Vector3, Color3, Angle,
} from '@babylonjs/core';
import { random, range } from 'lodash-es';
import { playCycleAnimation } from './utils';

interface Param {
  position: Vector3;
  /** 風箏顏色
   * @default 紅色
   */
  color?: Color3;
  /** 整體縮放
   * @default 1
   */
  scaling?: number;
}

/** 建立鑽石造型風箏，含十字骨架與下垂尾巴，並於空中緩慢搖曳 */
export function createKite(name: string, scene: Scene, param: Param) {
  const { position, color = Color3.FromHexString('#ff6b6b'), scaling = 1 } = param;

  const rootNode = new TransformNode(name);

  /** body 為搖曳樞紐，與 rootNode 分離以便擺動不影響定位 */
  const body = new TransformNode(`${name}-body`);
  body.parent = rootNode;
  /** 後仰，呈現迎風飛揚的姿態 */
  body.rotation.x = Angle.FromDegrees(-25).radians();

  const sailMaterial = new StandardMaterial(`${name}-sail-material`, scene);
  sailMaterial.diffuseColor = color;
  sailMaterial.emissiveColor = color.scale(0.35);
  sailMaterial.specularColor = Color3.Black();
  sailMaterial.backFaceCulling = false;

  /** 菱形風箏面，由方形平面旋轉 45 度而成 */
  const sail = MeshBuilder.CreatePlane(`${name}-sail`, {
    size: 2,
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  sail.material = sailMaterial;
  sail.rotation.z = Angle.FromDegrees(45).radians();
  sail.parent = body;

  /** 十字骨架，沿菱形對角線方向 */
  const sparMaterial = new StandardMaterial(`${name}-spar-material`, scene);
  sparMaterial.diffuseColor = Color3.FromHexString('#6b4a2b');
  sparMaterial.specularColor = Color3.Black();

  const sparLength = 2.7;
  const verticalSpar = MeshBuilder.CreateBox(`${name}-spar-vertical`, {
    width: 0.06, height: sparLength, depth: 0.06,
  }, scene);
  verticalSpar.material = sparMaterial;
  verticalSpar.parent = body;

  const horizontalSpar = MeshBuilder.CreateBox(`${name}-spar-horizontal`, {
    width: sparLength, height: 0.06, depth: 0.06,
  }, scene);
  horizontalSpar.material = sparMaterial;
  horizontalSpar.parent = body;

  /** 下垂尾巴，數個小蝴蝶結沿菱形下尖端排列 */
  const bowColorList = ['#ffd93d', '#6bcbef', '#ff6b6b', '#a0e57e'];
  const bowBaseRotationZ = Angle.FromDegrees(45).radians();
  const bowList = range(0, 5).map((i) => {
    const bow = MeshBuilder.CreateBox(`${name}-bow-${i}`, {
      width: 0.4, height: 0.18, depth: 0.02,
    }, scene);

    const bowMaterial = new StandardMaterial(`${name}-bow-material-${i}`, scene);
    const bowColor = Color3.FromHexString(bowColorList[i % bowColorList.length]);
    bowMaterial.diffuseColor = bowColor;
    bowMaterial.emissiveColor = bowColor.scale(0.35);
    bowMaterial.specularColor = Color3.Black();
    bow.material = bowMaterial;

    const baseX = Math.sin(i * 1.2) * 0.35;
    bow.position = new Vector3(baseX, -1.5 - i * 0.55, 0);
    bow.rotation.z = bowBaseRotationZ;
    bow.parent = body;

    return { mesh: bow, index: i, baseX };
  });

  rootNode.position = position;
  rootNode.scaling = new Vector3(scaling, scaling, scaling);

  /** 以正弦取樣建立可循環的波形關鍵影格，phase 用於錯開相位 */
  function buildWaveKeys(base: number, amplitude: number, phase: number) {
    const sampleCount = 8;
    const period = 80;
    return range(0, sampleCount + 1).map((s) => ({
      frame: (period / sampleCount) * s,
      value: base + amplitude * Math.sin(phase + (s / sampleCount) * Math.PI * 2),
    }));
  }

  /** 尾巴波動：各蝴蝶結相位遞延，形成沿尾端傳遞的波 */
  const tailSpeed = random(0.6, 0.9, true);
  const tailSwayAmplitude = Angle.FromDegrees(22).radians();
  bowList.forEach(({ mesh, index, baseX }) => {
    const phase = index * 0.9;
    playCycleAnimation(mesh, scene, {
      property: 'rotation.z',
      keyList: buildWaveKeys(bowBaseRotationZ, tailSwayAmplitude, phase),
      frameRate: 30,
      speedRatio: tailSpeed,
    });
    playCycleAnimation(mesh, scene, {
      property: 'position.x',
      keyList: buildWaveKeys(baseX, 0.3, phase),
      frameRate: 30,
      speedRatio: tailSpeed,
    });
  });

  /** 左右搖曳 */
  const swing = Angle.FromDegrees(12).radians();
  playCycleAnimation(body, scene, {
    property: 'rotation.z',
    keyList: [
      { frame: 0, value: -swing },
      { frame: 40, value: swing },
      { frame: 80, value: -swing },
    ],
    frameRate: 30,
    speedRatio: random(0.5, 0.8, true),
  });

  /** 前後點頭：在後仰基準角度附近俯仰擺動 */
  const leanBase = body.rotation.x;
  const pitch = Angle.FromDegrees(10).radians();
  playCycleAnimation(body, scene, {
    property: 'rotation.x',
    keyList: [
      { frame: 0, value: leanBase - pitch },
      { frame: 45, value: leanBase + pitch },
      { frame: 90, value: leanBase - pitch },
    ],
    frameRate: 30,
    speedRatio: random(0.4, 0.7, true),
  });

  /** 隨風上下飄動 */
  playCycleAnimation(rootNode, scene, {
    property: 'position.y',
    keyList: [
      { frame: 0, value: position.y },
      { frame: 35, value: position.y + random(0.6, 1.1, true) },
      { frame: 70, value: position.y },
    ],
    frameRate: 30,
    speedRatio: random(0.4, 0.7, true),
  });

  /** 左右橫向飄移 */
  playCycleAnimation(rootNode, scene, {
    property: 'position.x',
    keyList: [
      { frame: 0, value: position.x },
      { frame: 50, value: position.x + random(0.8, 1.4, true) },
      { frame: 100, value: position.x },
    ],
    frameRate: 30,
    speedRatio: random(0.3, 0.5, true),
  });

  /** 緩慢偏擺 */
  const yaw = Angle.FromDegrees(10).radians();
  playCycleAnimation(rootNode, scene, {
    property: 'rotation.y',
    keyList: [
      { frame: 0, value: -yaw },
      { frame: 60, value: yaw },
      { frame: 120, value: -yaw },
    ],
    frameRate: 30,
    speedRatio: random(0.3, 0.5, true),
  });

  return rootNode;
}

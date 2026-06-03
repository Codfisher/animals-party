import {
  Scene, TransformNode, MeshBuilder, Mesh,
  StandardMaterial, Vector3, Color3, Angle,
} from '@babylonjs/core';
import { random } from 'lodash-es';
import { playCycleAnimation } from './utils';

interface Param {
  position: Vector3;
  /** 船帆顏色
   * @default 米白色
   */
  sailColor?: Color3;
  /** 整體縮放
   * @default 1
   */
  scaling?: number;
}

/** 建立小帆船，含船身、桅杆與三角帆，於海面隨波搖晃 */
export function createBoat(name: string, scene: Scene, param: Param) {
  const { position, sailColor = Color3.FromHexString('#fff4e0'), scaling = 1 } = param;

  const rootNode = new TransformNode(name);

  /** 船身 */
  const hullMaterial = new StandardMaterial(`${name}-hull-material`, scene);
  hullMaterial.diffuseColor = Color3.FromHexString('#a86b3c');
  hullMaterial.specularColor = Color3.Black();

  const hull = MeshBuilder.CreateBox(`${name}-hull`, {
    width: 1.2, height: 0.6, depth: 2.4,
  }, scene);
  hull.material = hullMaterial;
  hull.position.y = 0.2;
  hull.setParent(rootNode);

  /** 桅杆 */
  const mastMaterial = new StandardMaterial(`${name}-mast-material`, scene);
  mastMaterial.diffuseColor = Color3.FromHexString('#6b4a2b');
  mastMaterial.specularColor = Color3.Black();

  const mast = MeshBuilder.CreateCylinder(`${name}-mast`, {
    height: 2.2, diameter: 0.1,
  }, scene);
  mast.material = mastMaterial;
  mast.position.y = 1.3;
  mast.setParent(rootNode);

  /** 三角帆，以三邊形圓盤製成 */
  const sailMaterial = new StandardMaterial(`${name}-sail-material`, scene);
  sailMaterial.diffuseColor = sailColor;
  sailMaterial.emissiveColor = sailColor.scale(0.25);
  sailMaterial.specularColor = Color3.Black();
  sailMaterial.backFaceCulling = false;

  const sail = MeshBuilder.CreateDisc(`${name}-sail`, {
    radius: 0.95,
    tessellation: 3,
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  sail.material = sailMaterial;
  /** 立起並轉向側面，貼著桅杆 */
  sail.rotation.y = Angle.FromDegrees(90).radians();
  sail.position = new Vector3(0, 1.35, 0.15);
  sail.setParent(rootNode);

  rootNode.position = position;
  rootNode.rotation = new Vector3(0, random(0, Math.PI * 2, true), 0);
  rootNode.scaling = new Vector3(scaling, scaling, scaling);

  /** 隨波上下起伏 */
  playCycleAnimation(rootNode, scene, {
    property: 'position.y',
    keyList: [
      { frame: 0, value: position.y },
      { frame: 30, value: position.y + random(0.1, 0.2, true) },
      { frame: 60, value: position.y },
    ],
    frameRate: 30,
    speedRatio: random(0.5, 0.8, true),
  });

  /** 左右搖晃 */
  const rock = Angle.FromDegrees(6).radians();
  playCycleAnimation(rootNode, scene, {
    property: 'rotation.z',
    keyList: [
      { frame: 0, value: -rock },
      { frame: 35, value: rock },
      { frame: 70, value: -rock },
    ],
    frameRate: 30,
    speedRatio: random(0.5, 0.8, true),
  });

  return rootNode;
}

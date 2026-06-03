import {
  Scene, Vector3, AbstractMesh,
  MeshBuilder, PhysicsImpostor, StandardMaterial, Color3,
  Animation,
} from '@babylonjs/core';

import { defaultsDeep } from 'lodash-es';
import { createAnimation } from '../../common/utils';

export interface MouseParam {
  position?: Vector3;
  /** 最小值為 1 */
  size?: number;
}

export class Mouse {
  mesh?: AbstractMesh;
  name: string;
  scene: Scene;
  params: Required<MouseParam> = {
    position: new Vector3(0, 0, 0),
    size: 1,
  };

  isCaught = false;

  constructor(name: string, scene: Scene, params?: MouseParam) {
    this.name = name;
    this.scene = scene;
    this.params = defaultsDeep(params, this.params);
  }

  async init() {
    const mesh = MeshBuilder.CreateTorus(`mouse-${this.name}`, {
      diameter: 2,
      tessellation: 4,
      thickness: 0.1,
    }, this.scene);

    const material = new StandardMaterial('mouse-material', this.scene);
    material.diffuseColor = new Color3(0.8, 0.8, 0.5);

    // 建立動畫
    const frameRate = 10;
    const alphaAnimation = new Animation(
      'alphaAnimation',
      'alpha',
      frameRate / 2,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keyFrames = [
      {
        frame: 0,
        value: 0.1
      },
      {
        frame: frameRate / 2,
        value: 0.4
      },
      {
        frame: frameRate,
        value: 0.1
      }
    ];

    alphaAnimation.setKeys(keyFrames);
    material.animations = [alphaAnimation];

    this.scene.beginAnimation(material, 0, frameRate, true);

    mesh.material = material;

    this.mesh = mesh;
    this.mesh.position = this.params.position;

    return this;
  }

  caught() {
    this.isCaught = true;

    /** 隱藏動畫 */
    if (!this.mesh?.material) return;
    const {
      animation, frameRate
    } = createAnimation(this.mesh.material, 'alpha', 0);

    this.mesh.material.animations = [animation];
    this.scene.beginAnimation(this.mesh.material, 0, frameRate);
  }
}
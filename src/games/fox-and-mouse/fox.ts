import {
  Scene, Vector3, AbstractMesh, SceneLoader, AnimationGroup, MeshBuilder, PhysicsImpostor, PBRMaterial, Color3,
} from '@babylonjs/core';

import { defaultsDeep, flow } from 'lodash-es';
import { animationBlending, createAnimation } from '../../common/utils';
import { assign, createMachine, interpret } from 'xstate';
import { promiseTimeout } from '@vueuse/core';

enum State {
  /** 可自由動作 */
  IDLE = 'idle',
  /** 走路中 */
  WALK = 'walk',
  /** 抓老鼠 */
  POUNCE = 'pounce',
  /** 插在地面上 */
  DIVE = 'dive',
}

interface AnimationMap {
  idle?: AnimationGroup,
  walk?: AnimationGroup,
  pounce?: AnimationGroup,
  dive?: AnimationGroup,
}

export interface FoxParam {
  position?: Vector3;
  ownerId: string;
  color?: Color3;
}

export class Fox {
  mesh?: AbstractMesh;
  name: string;
  scene: Scene;
  param: Required<FoxParam> = {
    position: new Vector3(0, 0, 0),
    ownerId: '',
    color: new Color3(1, 0.277, 0),
  };

  private animation: AnimationMap = {
    idle: undefined,
    walk: undefined,
    pounce: undefined,
    dive: undefined,
  };
  /** 儲存被解釋後的狀態機服務 */
  private stateService;
  private oldState: `${State}` | undefined = undefined;

  /** 抓到的老鼠尺寸 */
  mouseSize = 0;

  constructor(name: string, scene: Scene, param?: FoxParam) {
    this.name = name;
    this.scene = scene;
    this.param = defaultsDeep(param, this.param);

    const stateMachine = createMachine(
      {
        id: 'fox',
        initial: State.IDLE,
        states: {
          [State.IDLE]: {
            on: {
              [State.WALK]: State.WALK,
              [State.POUNCE]: State.POUNCE,
            },
          },
          [State.WALK]: {
            after: [
              {
                delay: 500,
                target: State.IDLE,
              },
            ],
            on: {
              [State.IDLE]: State.IDLE,
              [State.WALK]: State.WALK,
              [State.POUNCE]: State.POUNCE,
            },
          },
          [State.POUNCE]: {
            on: {
              [State.DIVE]: [
                {
                  cond: () => this.mouseSize > 0,
                  target: State.DIVE,
                },
                {
                  target: State.IDLE,
                },
              ]
            },
          },
          [State.DIVE]: {}
        },
        predictableActionArguments: true,
      }
    );

    this.stateService = interpret(stateMachine);
    this.stateService.onTransition((state) => {
      const stateValue = state.value as `${State}`;
      /** 沒變化，提早結束 */
      if (this.oldState === stateValue) return;

      const animation = this.processStateAnimation(stateValue);
      if (animation && stateValue === 'pounce') {
        animation.onAnimationEndObservable.addOnce(async () => {
          /** 延遲一下，不要那麼快轉換 */
          await promiseTimeout(500);
          this.stateService.send({ type: State.DIVE });
        });
      }

      this.oldState = stateValue;
    });
    this.stateService.start();
  }
  private initAnimation(animationGroups: AnimationGroup[]) {
    animationGroups.forEach((group) => group.stop());

    const findAnimation = (name: keyof AnimationMap) => animationGroups.find(
      (group) => group.name === name
    );

    this.animation = {
      idle: findAnimation('idle'),
      walk: findAnimation('walk'),
      pounce: findAnimation('pounce'),
      dive: findAnimation('dive'),
    }

    this.animation.idle?.play(true);
  }
  /** 處理狀態動畫
   * 
   * 利用 [runCoroutineAsync API](https://doc.babylonjs.com/features/featuresDeepDive/events/coroutines) 實現
   */
  private processStateAnimation(newState: `${State}`) {
    const targetAnimation = this.animation[newState];

    /** 沒有上一個狀態，直接播放新動畫 */
    if (!this.oldState) {
      targetAnimation?.play();
      return targetAnimation;
    }

    const playingAnimation = this.animation[this.oldState];

    if (!targetAnimation || !playingAnimation) return;

    /** idle、walk 循環播放 */
    const loop = ['idle', 'walk', 'dive'].includes(newState);

    this.scene.onBeforeRenderObservable.runCoroutineAsync(
      animationBlending(playingAnimation, targetAnimation, loop)
    );

    return targetAnimation;
  }
  private createHitBox() {
    const hitBox = MeshBuilder.CreateBox(`${this.name}-hit-box`, {
      width: 3, depth: 1.5, height: 2
    });
    hitBox.position = new Vector3(0, 1, 0);
    // 設為半透明方便觀察
    hitBox.visibility = 0;

    /** 使用物理效果 */
    const hitBoxImpostor = new PhysicsImpostor(
      hitBox,
      PhysicsImpostor.BoxImpostor,
      { mass: 1, friction: 0.7, restitution: 0.7 },
      this.scene
    );

    hitBox.physicsImpostor = hitBoxImpostor;

    return hitBox;
  }
  /** 取得力與人物的夾角 */
  private getDirectionAngle(vector: Vector3) {
    if (!this.mesh) {
      throw new Error('未建立 Mesh');
    }

    const forceVector = vector.normalize();
    /** 人物面相 -X 軸方向 */
    const characterVector = new Vector3(-1, 0, 0);
    const deltaAngle = Math.acos(Vector3.Dot(forceVector, characterVector));

    /** 反餘弦求得角度範圍為 0~180 度，需要自行判斷負角度部分。
     *  向量 Z 軸分量為負時，表示夾角為負。
     */
    if (forceVector.z < 0) {
      return deltaAngle * -1;
    }

    return deltaAngle;
  }
  private rotate(angle: number) {
    if (!this.mesh) return;

    /** 若角度超過 180 度，則先直接切換至兩倍補角處，讓轉向更自然 */
    const currentAngle = this.mesh.rotation.y;
    if (Math.abs(angle - currentAngle) > Math.PI) {
      const supplementaryAngle = Math.PI * 2 - Math.abs(currentAngle);
      if (currentAngle < 0) {
        this.mesh.rotation = new Vector3(0, supplementaryAngle, 0);
      } else {
        this.mesh.rotation = new Vector3(0, -supplementaryAngle, 0);
      }
    }

    const { animation, frameRate } = createAnimation(this.mesh, 'rotation', new Vector3(0, angle, 0), {
      speedRatio: 3,
    });

    this.scene.beginDirectAnimation(this.mesh, [animation], 0, frameRate);
  }

  async init() {
    const result = await SceneLoader.ImportMeshAsync('', '/fox-and-mouse/', 'fox.glb', this.scene);
    this.initAnimation(result.animationGroups);

    // 產生 hitBox
    const hitBox = this.createHitBox();
    this.mesh = hitBox;

    /** 找到 body mesh 將材質改顏色 */
    const bodyMesh = result.meshes.find(
      ({ name }) => name === 'body_primitive2'
    );
    /** 確認模型材質為 PBRMaterial */
    if (bodyMesh?.material instanceof PBRMaterial) {
      bodyMesh.material.albedoColor = this.param.color;
    }

    // 將狐狸綁定至 hitBox
    const fox = result.meshes[0];
    fox.scaling = new Vector3(0.8, 0.8, 0.8);
    fox.setParent(hitBox);

    this.mesh.position = this.param.position;

    // 持續在每個 frame render 之前呼叫
    this.scene.registerBeforeRender(() => {
      hitBox.physicsImpostor?.setAngularVelocity(
        new Vector3(0, 0, 0)
      );

      if (['idle', 'pounce', 'dive'].includes(this.getState())) {
        hitBox.physicsImpostor?.setLinearVelocity(
          new Vector3(0, 0, 0)
        );
      }
    });

    return this;
  }

  /** 指定移動方向與力量 */
  walk(direction: Vector3) {
    if (!this.mesh) {
      throw new Error('未建立 Mesh');
    }

    if (['pounce', 'dive'].includes(this.getState())) return;

    /** 單位向量化，統一速度 */
    const velocity = direction.normalize().scale(3);
    this.mesh.physicsImpostor?.setLinearVelocity(velocity);

    /** 長度為 0 不用旋轉 */
    if (velocity.length() > 0) {
      this.stateService.send({ type: State.WALK });

      const targetAngle = this.getDirectionAngle(velocity);
      this.rotate(targetAngle);
    } else {
      this.stateService.send({ type: State.IDLE });
    }
  }

  setMouseSize(size: number) {
    this.mouseSize = size;
  }
  /** 抓老鼠 */
  pounce() {
    this.stateService.send({ type: State.POUNCE });
  }

  getState() {
    const { value } = this.stateService.getSnapshot();
    return value as `${State}`;
  }
}
import {
  Scene, Color3, Vector3,
  SceneLoader, AbstractMesh, AnimationGroup,
  MeshBuilder, PhysicsImpostor, StandardMaterial,
  Animation,
} from '@babylonjs/core';
/** 引入 loaders，這樣才能載入 glb 檔案*/
import '@babylonjs/loaders';
import { debounce, defaultsDeep, throttle } from 'lodash-es';
import { createAnimation } from '../../common/utils';

interface AnimationMap {
  idle?: AnimationGroup,
  walk?: AnimationGroup,
  attack?: AnimationGroup,
}

export interface PenguinParams {
  /** 起始位置 */
  position?: Vector3;
  ownerId: string;
  /** 玩家顏色 */
  color?: Color3;
}

type State = 'idle' | 'walk' | 'attack';

export class Penguin {
  mesh?: AbstractMesh;
  name: string;
  scene: Scene;
  params: Required<PenguinParams> = {
    position: new Vector3(0, 0, 0),
    ownerId: '',
    color: new Color3(0.9, 0.9, 0.9),
  };

  state: State = 'walk';
  private animation: AnimationMap = {
    idle: undefined,
    walk: undefined,
    attack: undefined,
  };

  private readonly maxSpeed = 15;
  private readonly assaultedForce = 20;

  constructor(name: string, scene: Scene, params?: PenguinParams) {
    this.name = name;
    this.scene = scene;
    this.params = defaultsDeep(params, this.params);
  }

  private initAnimation(animationGroups: AnimationGroup[]) {
    animationGroups.forEach((group) => group.stop());

    const attackAni = animationGroups.find(({ name }) => name === 'attack');
    const walkAni = animationGroups.find(({ name }) => name === 'walk');
    const idleAni = animationGroups.find(({ name }) => name === 'idle');

    this.animation.attack = attackAni;
    this.animation.walk = walkAni;
    this.animation.idle = idleAni;
  }
  private createHitBox() {
    const hitBox = MeshBuilder.CreateBox(`${this.name}-hit-box`, {
      width: 2, depth: 2, height: 4
    });
    hitBox.position = this.params.position;
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
  private createBadge() {
    const badge = MeshBuilder.CreateBox(`${this.name}-badge`, {
      width: 0.5, depth: 0.5, height: 0.5
    });
    const material = new StandardMaterial('badgeMaterial', this.scene);
    material.diffuseColor = this.params.color;
    badge.material = material;

    const deg = Math.PI / 4;
    badge.rotation = new Vector3(deg, 0, deg);
    badge.visibility = 0.9;

    // 建立動畫
    const frameRate = 10;
    const badgeRotate = new Animation(
      'badgeRotate',
      'rotation.y',
      frameRate / 5,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keyFrames = [
      {
        frame: 0,
        value: 0
      },
      {
        frame: frameRate,
        value: 2 * Math.PI
      }
    ];

    badgeRotate.setKeys(keyFrames);
    badge.animations.push(badgeRotate);

    this.scene.beginAnimation(badge, 0, frameRate, true);

    return badge;
  }

  private limitMaxVelocity() {
    if (!this.mesh || !this.mesh.physicsImpostor) return;

    /** 取得目前速度向量 */
    const velocity = this.mesh.physicsImpostor.getLinearVelocity();
    if (!velocity) return;

    /** 若目前速度向量大於最大限制，則調整目前速度 */
    const currentSpeed = velocity.length();
    if (currentSpeed > this.maxSpeed) {
      const newVelocity = velocity.normalize().scaleInPlace(this.maxSpeed);
      this.mesh.physicsImpostor?.setLinearVelocity(newVelocity);
    }
  }
  /** 取得力與人物的夾角 */
  private getForceAngle(force: Vector3) {
    if (!this.mesh) {
      throw new Error('未建立 Mesh');
    }

    const forceVector = force.normalize();
    /** 企鵝面相正 Z 軸方向 */
    const characterVector = new Vector3(0, 0, 1);
    const deltaAngle = Math.acos(Vector3.Dot(forceVector, characterVector));

    /** 反餘弦求得角度範圍為 0~180 度，需要自行判斷負角度部分。
     *  力向量 X 軸分量為負時，表示夾角為負。
     */
    if (forceVector.x < 0) {
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

  /** 設定人物狀態 */
  private setState(value: State) {
    this.processStateAnimation(value);
    this.state = value;
  }
  /** 處理狀態動畫
   * 
   * 利用 [runCoroutineAsync API](https://doc.babylonjs.com/features/featuresDeepDive/events/coroutines) 實現
   */
  private processStateAnimation(newState: State) {
    if (newState === this.state) return;

    const playingAnimation = this.animation[this.state];
    const targetAnimation = this.animation[newState];

    this.state = newState;
    if (!targetAnimation || !playingAnimation) return;

    /** 攻擊動畫不循環播放 */
    const loop = this.state !== 'attack';
    /** 切換至攻擊動畫速度要快一點 */
    const offset = this.state === 'attack' ? 0.3 : undefined;

    this.scene.onBeforeRenderObservable.runCoroutineAsync(this.animationBlending(playingAnimation, targetAnimation, loop, offset));
  }
  /** 動畫混合
   * 讓目前播放動畫的權重從 1 到 0，而目標動畫從 0 到 1。
   * 利用 Generator Function 配合 babylon 的 [runCoroutineAsync API](https://doc.babylonjs.com/features/featuresDeepDive/events/coroutines)
   * 迭代，達成融合效果。
   */
  private * animationBlending(fromAnimation: AnimationGroup, toAnimation: AnimationGroup, loop = true, step = 0.1) {
    let currentWeight = 1;
    let targetWeight = 0;

    toAnimation.play(loop);

    while (targetWeight < 1) {
      targetWeight += step;
      currentWeight -= step;

      toAnimation.setWeightForAllAnimatables(targetWeight);
      fromAnimation.setWeightForAllAnimatables(currentWeight);
      yield;
    }

    toAnimation.play(loop);
    fromAnimation.stop();
  }

  async init() {
    const result = await SceneLoader.ImportMeshAsync('', '/the-first-penguin/', 'penguin.glb', this.scene);
    this.initAnimation(result.animationGroups);

    // 產生 hitBox
    const hitBox = this.createHitBox();
    this.mesh = hitBox;

    // 將企鵝綁定至 hitBox
    const penguin = result.meshes[0];
    penguin.setParent(hitBox);
    penguin.position = new Vector3(0, -2, 0);

    // 建立 badge
    const badge = this.createBadge();
    badge.setParent(hitBox);
    badge.position = new Vector3(0, 3, 0);


    // 持續在每個 frame render 之前呼叫
    this.scene.registerBeforeRender(() => {
      this.limitMaxVelocity();
    });

    this.setState('idle');

    return this;
  }

  /** 指定移動方向與力量 */
  walk(force: Vector3) {
    // 攻擊時舞法移動
    if (this.state === 'attack') return;

    if (!this.mesh) {
      throw new Error('未建立 Mesh');
    }

    /** 施加力量 */
    this.mesh.physicsImpostor?.applyForce(force, Vector3.Zero());

    // 依據力方向轉向
    const targetAngle = this.getForceAngle(force);
    this.rotate(targetAngle);

    this.setState('walk');
    this.walkToIdleDebounce();
  }
  /** 停止呼叫後 500ms 設為 idle 狀態 */
  private walkToIdleDebounce = debounce(async () => {
    this.setState('idle');
  }, 500)

  /** 攻擊，限制攻擊頻率，2 秒一次 */
  attack = throttle(() => {
    this.setState('attack');
    this.attackToIdleDebounce();
    this.walkToIdleDebounce.cancel();
  }, 2000, {
    leading: true,
    trailing: false,
  })
  /** 攻擊結束後 1 秒時，回到 idle 狀態 */
  private attackToIdleDebounce = debounce(() => {
    this.setState('idle');
  }, 1000, {
    leading: false,
    trailing: true,
  })

  /** 被攻擊
   * @param direction 移動方向
   */
  assaulted = throttle((direction: Vector3) => {
    if (!this.mesh) {
      throw new Error('未建立 Mesh');
    }

    // 計算力量
    const force = direction.normalize().scaleInPlace(this.assaultedForce);
    this.mesh.physicsImpostor?.applyImpulse(force, Vector3.Zero());
  }, 500, {
    leading: true,
    trailing: false,
  })
}
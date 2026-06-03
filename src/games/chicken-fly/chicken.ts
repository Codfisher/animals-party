import { Vector3, Color3, AbstractMesh, Scene, SceneLoader, MeshBuilder, PhysicsImpostor, Mesh, Tools, Quaternion, PBRMaterial, Scalar } from '@babylonjs/core';
/** 引入 loaders，這樣才能載入 glb 檔案*/
import '@babylonjs/loaders';
import { clamp, defaultsDeep, throttle } from 'lodash-es';
import { createAnimation } from '../../common/utils';
import { createMachine, interpret } from 'xstate';

enum State {
  /** 可以自由移動 */
  IDLE = 'idle',
  /** 被攻擊後，人物會翻滾，持續硬直 2s */
  ATTACKED = 'attacked',
  /** 人物死亡，無法控制 */
  DEAD = 'dead',
}

export interface Params {
  /** 起始位置 */
  position?: Vector3;
  ownerId: string;
  /** 玩家顏色 */
  color?: Color3;
}

export class Chicken {
  mesh?: AbstractMesh;
  name: string;
  scene: Scene;
  params: Required<Params> = {
    position: new Vector3(0, 0, 0),
    ownerId: '',
    color: new Color3(1, 1, 1),
  };

  diedAt = 0;
  /** 為 true 時，人物血量不會降低 */
  healthLock = false;

  private maxAngle = Tools.ToRadians(45);
  private maxSpeed = 4;
  /** 用來放大升力 */
  private liftCoefficient = 15;

  /** 儲存被解釋後的狀態機服務 */
  private stateService;

  constructor(name: string, scene: Scene, params?: Params) {
    this.name = name;
    this.scene = scene;
    this.params = defaultsDeep(params, this.params);

    const stateMachine = createMachine(
      {
        id: 'chicken',
        initial: State.IDLE,
        /** 儲存狀態機內部變數 */
        context: {
          health: 3,
        },
        states: {
          [State.IDLE]: {
            on: {
              [State.ATTACKED]: [
                {
                  cond: (context) => context.health > 1,
                  target: State.ATTACKED,
                },
                {
                  target: State.DEAD,
                }
              ],
            },
          },
          [State.ATTACKED]: {
            entry: ['minusHealth', 'tumbling'],
            after: [
              {
                delay: 2000,
                target: State.IDLE,
              },
            ],
          },
          [State.DEAD]: {
            entry: ['tumbling', 'dead'],
            type: 'final',
          },
        },
        /** 官方建議啟用
         * https://xstate.js.org/docs/guides/actions.html#actions
         */
        predictableActionArguments: true,
      },
      {
        actions: {
          minusHealth: (context) => {
            if (this.healthLock) return;
            context.health -= 1;
          },
          tumbling: () => {
            this.tumbling();
          },
          dead: () => {
            this.dead();
          },
        },
      }
    );

    this.stateService = interpret(stateMachine);
    /** 啟動狀態機服務 */
    this.stateService.start();
  }

  private createHitBox() {
    const visibility = 0;

    /** 建立 body、wing 的 hit box */
    const body = MeshBuilder.CreateBox(`${this.name}-body-hit-box`, {
      width: 0.3, depth: 0.76, height: 0.48
    });
    body.visibility = visibility;

    const wing = MeshBuilder.CreateBox(`${this.name}-wing-hit-box`, {
      width: 0.8,
      depth: 0.23,
      height: 0.1
    });
    wing.position = new Vector3(0, -0.1, -0.02);
    wing.visibility = visibility;
    wing.setParent(body);

    /** 將 body 移至定位 */
    body.position = this.params.position;

    /** 產生物理效果 */
    wing.physicsImpostor = new PhysicsImpostor(
      wing,
      PhysicsImpostor.BoxImpostor,
      {
        mass: 0.1,
      },
      this.scene
    );
    body.physicsImpostor = new PhysicsImpostor(
      body,
      PhysicsImpostor.BoxImpostor,
      {
        mass: 1,
        restitution: 0.5,
      },
      this.scene
    );

    return body;
  }

  /** 根據目前速度取得升力比率，
   * 方向相向時速度越大，比率越小
   */
  private getLift(speed: number, angle: number) {
    const ratio = (this.maxSpeed - Math.abs(speed)) / this.maxSpeed;

    // 檢查速度和角度是否同向
    const sameDirection = (speed > 0 && angle > 0) || (speed < 0 && angle < 0);

    // 如果同向，為計算出的比率；如果反向，將比率放大，如此便可以快速轉向
    const result = sameDirection ? ratio : 1 / ratio;
    return angle * result * this.liftCoefficient;
  }
  /** 根據目前姿態產生加速度 */
  private processLift = throttle(() => {
    if (!this.mesh?.physicsImpostor || !this.mesh?.rotationQuaternion) return;

    const { rotationQuaternion, physicsImpostor } = this.mesh;

    const { x: pitch, z: roll } = rotationQuaternion.toEulerAngles();

    const velocity = physicsImpostor.getLinearVelocity();
    if (!velocity) return;

    /** X 座標與 roll 旋轉方向剛好相反，所以乘上 -1 */
    const xLift = this.getLift(velocity.x, -roll);
    const yLift = this.getLift(velocity.y, pitch);

    const force = new Vector3(xLift, yLift, 0);
    physicsImpostor.applyForce(force, Vector3.Zero());
  }, 10)
  /** 限制小雞的移動範圍 */
  private limitPosition() {
    if (!this.mesh) return;

    /** 避免小雞前後移動，所以 z 固定為 0 */
    this.mesh.position.z = 0;

    const snapshot = this.stateService.getSnapshot();

    /** 角速度歸零，讓角色停止亂轉 */
    if (snapshot.value === State.IDLE) {
      this.mesh?.physicsImpostor?.setAngularVelocity(new Vector3(0, 0, 0));
    }
  }

  private tumbling() {
    if (!this.mesh?.physicsImpostor) return;

    /** 加入角速度，小雞就會開始旋轉了 */
    this.mesh.physicsImpostor.setAngularVelocity(
      new Vector3(
        Scalar.RandomRange(-10, 10),
        10,
        Scalar.RandomRange(-10, 10),
      ),
    );
  }

  private async dead() {
    if (!this.mesh) return;

    /** 紀錄死亡時間 */
    this.diedAt = new Date().getTime();

    /** 移出畫面 */
    const {
      animation, frameRate
    } = createAnimation(
      this.mesh,
      'position',
      this.mesh.position.add(new Vector3(0, -5, 0))
    )

    const animatable = this.scene.beginDirectAnimation(this.mesh, [animation], 0, frameRate);
    await animatable.waitAsync();

    /** 動畫結束後，停用 mesh */
    this.mesh.dispose();
  }

  async init() {
    const result = await SceneLoader.ImportMeshAsync('', '/chicken-fly/', 'flying-chicken.glb', this.scene);

    const hitBox = this.createHitBox();
    this.mesh = hitBox;

    /** 找到 body mesh 將材質改顏色 */
    const bodyMesh = result.meshes.find(
      ({ name }) => name === 'body'
    );
    /** 確認模型材質為 PBRMaterial */
    if (bodyMesh?.material instanceof PBRMaterial) {
      bodyMesh.material.albedoColor = this.params.color;
    }

    const chicken = result.meshes[0];
    chicken.setParent(hitBox);
    chicken.scaling = new Vector3(0.15, 0.15, 0.15);
    chicken.rotation = new Vector3(0, Math.PI / 2, 0);
    chicken.position = new Vector3(0, -0.1, -0.2);

    // 持續在每個 frame render 之前呼叫
    this.scene.registerBeforeRender(() => {
      this.processLift();
      this.limitPosition();
    });

    return this;
  }

  /** 設定飛行姿態
   * 
   * @param pitch 俯仰角
   * @param roll 翻滾角
   */
  setAttitude(pitch: number, roll: number) {
    const snapshot = this.stateService.getSnapshot();

    /** attacked 狀態或最終狀態，皆無法控制姿態 */
    if (snapshot.value === State.ATTACKED || snapshot.done) return;

    if (!this.mesh?.physicsImpostor) return;

    /** 俯仰角（pitch）對應 -x 軸  */
    const newPitch = clamp(-pitch, -this.maxAngle, this.maxAngle);
    /** 翻滾角（roll）對應 -z 軸  */
    const newRoll = clamp(-roll, -this.maxAngle, this.maxAngle);
    /** 讓偏航角（yaw）跟隨翻滾角（roll）旋轉，讓小雞的姿態看起來豐富一點 */
    const yaw = newRoll / 2;

    const quaternion = Quaternion.RotationYawPitchRoll(yaw, newPitch, newRoll);

    /** 產生動畫 */
    const {
      animation, frameRate
    } = createAnimation(this.mesh, 'rotationQuaternion', quaternion, {
      speedRatio: 3
    });

    this.scene.beginDirectAnimation(this.mesh, [animation], 0, frameRate);
  }

  /** 觸發 attacked 事件 */
  attacked() {
    const snapshot = this.stateService.getSnapshot();
    if (snapshot.done) return;

    this.stateService.send({ type: State.ATTACKED });
  }
}

import {
  Vector3,
  Color3,
  AbstractMesh,
  Scene,
  SceneLoader,
  MeshBuilder,
  PhysicsImpostor,
  Mesh,
  Tools,
  Quaternion,
  PBRMaterial,
  Scalar,
} from '@babylonjs/core';
/** 引入 loaders，這樣才能載入 glb 檔案*/
import '@babylonjs/loaders';
import { clamp, defaultsDeep, throttle } from 'lodash-es';

export interface Params {
  /** 起始位置 */
  position?: Vector3;

  /** 物體 z 軸超過此位子會被回收 */
  recyclePosition?: number;
  /** 被回收後的新起點 */
  recycleStartPosition?: number;

  sceneBoundary?: {
    x: number;
    y: number;
  };

  /** 取得可追蹤的玩家位置，用於鎖定最近玩家 */
  getTargetList?: () => Vector3[];
}

export class BadChicken {
  mesh?: AbstractMesh;
  name: string;
  scene: Scene;
  params: Required<Params> = {
    position: new Vector3(0, 0, 0),
    recyclePosition: 0,
    recycleStartPosition: -100,
    sceneBoundary: {
      x: 5,
      y: 2,
    },
    getTargetList: () => [],
  };

  /** 速度基準值 */
  private speed = 0;
  /** 目前相位 */
  private phase = {
    x: 0,
    y: 0,
  };
  /** 變換頻率 */
  private circularFrequency = {
    x: Scalar.RandomRange(-Math.PI / 100, Math.PI / 100),
    y: Scalar.RandomRange(-Math.PI / 100, Math.PI / 100),
  };

  /** 追蹤中心，每幀平滑朝最近玩家逼近 */
  private aimCenter = { x: 0, y: 0 };
  /** 朝目標逼近的平滑係數，越大追擊越兇；開場給最低值，隨時間提升 */
  private steerFactor = 0.02;
  /** 隨機晃動幅度，讓追蹤帶點隨機、不會百發百中；開場給最大值，隨時間收斂 */
  private wanderAmplitude = { x: 1.5, y: 1 };

  constructor(name: string, scene: Scene, params?: Params) {
    this.name = name;
    this.scene = scene;
    this.params = defaultsDeep(params, this.params);
  }

  private createHitBox() {
    const hitBox = MeshBuilder.CreateBox(`${this.name}-hit-box`, {
      width: 1,
      depth: 1.8,
      height: 1.2,
    });
    hitBox.visibility = 0;
    hitBox.position = this.params.position.clone();

    return hitBox;
  }

  private recycle() {
    if (!this.mesh) return;

    const xMax = Math.PI / 100 + this.speed / 5;
    const yMax = Math.PI / 100 + this.speed / 5;
    this.circularFrequency = {
      x: Scalar.RandomRange(-xMax, xMax),
      y: Scalar.RandomRange(-yMax, yMax),
    };

    this.mesh.position.z = this.params.recycleStartPosition;
  }

  /** 取得 xy 平面上最近的玩家位置，無玩家時回傳 undefined */
  private getNearestTarget(position: Vector3) {
    const targetList = this.params.getTargetList();
    if (targetList.length === 0) return undefined;

    return targetList.reduce((nearest, candidate) => {
      const nearestDistance = Math.hypot(position.x - nearest.x, position.y - nearest.y);
      const candidateDistance = Math.hypot(position.x - candidate.x, position.y - candidate.y);
      return candidateDistance < nearestDistance ? candidate : nearest;
    });
  }

  async init() {
    const result = await SceneLoader.ImportMeshAsync(
      '',
      '/chicken-fly/',
      'flying-chicken.glb',
      this.scene,
    );

    const hitBox = this.createHitBox();
    this.mesh = hitBox;

    /** 追蹤中心以起始位置為準 */
    this.aimCenter = { x: hitBox.position.x, y: hitBox.position.y };

    const bodyMesh = result.meshes.find(({ name }) => name === 'body');
    if (bodyMesh?.material instanceof PBRMaterial) {
      bodyMesh.material.albedoColor = Color3.Black();
    }

    const chicken = result.meshes[0];
    chicken.setParent(hitBox);
    chicken.scaling = new Vector3(0.4, 0.4, 0.4);
    chicken.rotation = new Vector3(0, -Math.PI / 2, 0);
    chicken.position = new Vector3(0, -0.25, 0.5);

    /** 移動人物 */
    this.scene.registerBeforeRender(() => {
      const { x: xMax, y: yMax } = this.params.sceneBoundary;

      const {
        phase: { x: xPhase, y: yPhase },
        circularFrequency: { x: xCircularFrequency, y: yCircularFrequency },
      } = this;

      /** 追蹤中心平滑朝最近玩家逼近，無玩家時回到場景中央 */
      const target = this.getNearestTarget(hitBox.position);
      this.aimCenter = {
        x: Scalar.Lerp(this.aimCenter.x, target?.x ?? 0, this.steerFactor),
        y: Scalar.Lerp(this.aimCenter.y, target?.y ?? 0, this.steerFactor),
      };

      /** 疊加隨機晃動，讓追擊不會完全精準 */
      const wanderX = this.wanderAmplitude.x * Math.cos(xPhase);
      const wanderY = this.wanderAmplitude.y * Math.cos(yPhase);

      /** 計算位移，並限制在場景邊界內 */
      const x = clamp(this.aimCenter.x + wanderX, -xMax, xMax);
      const y = clamp(this.aimCenter.y + wanderY, -yMax, yMax);
      const z = hitBox.position.z + this.speed;

      hitBox.position = new Vector3(x, y, z);

      /** 累加相位 */
      this.phase = {
        x: xPhase + xCircularFrequency,
        y: yPhase + yCircularFrequency,
      };

      /** 檢查是否需要回收 */
      if (hitBox.position.z > this.params.recyclePosition) {
        this.recycle();
      }
    });

    return this;
  }

  /** 設定速度基準值 */
  setSpeed(speed: number) {
    this.speed = speed;
  }

  /** 設定追擊強度，越大追蹤越兇 */
  setSteerFactor(steerFactor: number) {
    this.steerFactor = steerFactor;
  }

  /** 設定隨機晃動幅度，越小追擊越精準 */
  setWanderAmplitude(wanderAmplitude: { x: number; y: number }) {
    this.wanderAmplitude = wanderAmplitude;
  }
}

import { Vector3, Color3, AbstractMesh, Scene, SceneLoader, MeshBuilder, PhysicsImpostor, Mesh, Tools, Quaternion, PBRMaterial, Scalar } from "@babylonjs/core";
/** 引入 loaders，這樣才能載入 glb 檔案*/
import '@babylonjs/loaders';
import { clamp, defaultsDeep, throttle } from "lodash-es";

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
  }
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
      y: 2
    }
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

  constructor(name: string, scene: Scene, params?: Params) {
    this.name = name;
    this.scene = scene;
    this.params = defaultsDeep(params, this.params);
  }

  private createHitBox() {
    const hitBox = MeshBuilder.CreateBox(`${this.name}-hit-box`, {
      width: 1, depth: 1.8, height: 1.2
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

  async init() {
    const result = await SceneLoader.ImportMeshAsync('', '/chicken-fly/', 'flying-chicken.glb', this.scene);

    const hitBox = this.createHitBox();
    this.mesh = hitBox;

    const bodyMesh = result.meshes.find(
      ({ name }) => name === 'body'
    );
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
      const {
        x: xMax, y: yMax
      } = this.params.sceneBoundary;

      const {
        phase: {
          x: xPhase,
          y: yPhase
        },
        circularFrequency: {
          x: xCircularFrequency,
          y: yCircularFrequency
        },
      } = this;

      /** 計算位移 */
      const x = xMax * Math.cos(xPhase);
      const y = yMax * Math.cos(yPhase);
      const z = hitBox.position.z + this.speed;

      hitBox.position = new Vector3(x, y, z);

      /** 累加相位 */
      this.phase = {
        x: xPhase + xCircularFrequency,
        y: yPhase + yCircularFrequency,
      }

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
}

import { defaults } from 'lodash-es';
import {
  ArcRotateCamera,
  Engine, HemisphericLight, Scene, Vector3,
} from '@babylonjs/core';
import { useEventListener } from '@vueuse/core';
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';

interface UseBabylonSceneParams {
  createEngine?: (canvas: HTMLCanvasElement) => Engine;
  createScene?: (engine: Engine) => Scene;
  createCamera?: (scene: Scene) => ArcRotateCamera;
  init?: (params: {
    canvas: HTMLCanvasElement;
    engine: Engine;
    scene: Scene;
    camera: ArcRotateCamera;
  }) => Promise<void>;
}
const defaultParams: Required<UseBabylonSceneParams> = {
  createEngine(canvas) {
    return new Engine(canvas, true);
  },
  createScene(engine) {
    const scene = new Scene(engine);
    /** 使用預設光源 */
    scene.createDefaultLight();
    const defaultLight = scene.lights.at(-1);
    if (defaultLight instanceof HemisphericLight) {
      defaultLight.direction = new Vector3(0.5, 1, 0);
    }

    return scene;
  },
  createCamera(scene: Scene) {
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 4,
      34,
      new Vector3(0, 0, 2),
      scene
    );

    return camera;
  },
  init: () => Promise.resolve(),
}

export function useBabylonScene(params?: UseBabylonSceneParams) {
  const canvas = ref<HTMLCanvasElement>();

  const engine = shallowRef<Engine>();
  const scene = shallowRef<Scene>();
  const camera = shallowRef<ArcRotateCamera>();

  const {
    createEngine, createScene, createCamera, init
  } = defaults(params, defaultParams);

  /** 於 setup 同步階段註冊，useEventListener 才能在元件卸載時自動清除 */
  useEventListener(window, 'resize', handleResize);

  /** 僅開發環境註冊 Inspector 切換，prod build 會整段被 tree-shake */
  if (import.meta.env.DEV) {
    useEventListener(window, 'keydown', handleDebugLayerToggle);
  }

  onMounted(async () => {
    if (!canvas.value) {
      console.error('無法取得 canvas DOM');
      return;
    }
    engine.value = createEngine(canvas.value);
    scene.value = createScene(engine.value);
    camera.value = createCamera(scene.value);

    /** 反覆渲染場景，這樣畫面才會持續變化 */
    engine.value.runRenderLoop(() => {
      scene.value?.render();
    });

    await init({
      canvas: canvas.value,
      engine: engine.value,
      scene: scene.value,
      camera: camera.value,
    });
  });

  onBeforeUnmount(() => {
    engine.value?.dispose();
  });

  function handleResize() {
    engine.value?.resize();
  }

  /** 按下 Shift+I 切換 Babylon Inspector，依賴僅在開發環境動態載入 */
  function handleDebugLayerToggle(ev: KeyboardEvent) {
    if (!ev.shiftKey || ev.code !== 'KeyI') return;

    const currentScene = scene.value;
    if (!currentScene) return;

    void (async () => {
      await import('@babylonjs/core/Debug/debugLayer');
      await import('@babylonjs/inspector');

      if (currentScene.debugLayer.isVisible()) {
        currentScene.debugLayer.hide();
      } else {
        currentScene.debugLayer.show();
      }
    })();
  }

  return {
    canvas,
    engine,
    scene,
    camera,
  }
}
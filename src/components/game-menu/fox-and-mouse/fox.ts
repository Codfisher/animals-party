import { Scene, Vector3, AnimationGroup, SceneLoader } from '@babylonjs/core';
import { defaults } from 'lodash-es';

interface Option {
  scaling?: number;
  position?: Vector3;
  rotation?: Vector3;
  playAnimation?: 'idle' | 'walk' | 'dive' | '';
}

const defaultOption: Required<Option> = {
  scaling: 1,
  position: Vector3.Zero(),
  rotation: Vector3.Zero(),
  playAnimation: '',
};

export async function createFox(name: string, scene: Scene, option?: Option) {
  const { scaling, position, rotation } = defaults(option, defaultOption);

  const result = await SceneLoader.ImportMeshAsync('', '/fox-and-mouse/', 'fox.glb', scene);

  const mesh = result.meshes[0];
  mesh.name = name;
  mesh.position = position;
  mesh.rotation = rotation;
  mesh.scaling = new Vector3(scaling, scaling, scaling);

  function initAnimation(animationGroups: AnimationGroup[]) {
    animationGroups.forEach((animationGroup) => {
      animationGroup.stop();
    });

    /** 播放指定動畫 */
    if (option?.playAnimation) {
      const animation = animationGroups.find(({ name }) => name === option.playAnimation);
      animation?.play(true);
    }
  }
  initAnimation(result.animationGroups);

  return { mesh };
}

<template>
  <div class="frame relative">
    <div
      class="avatar relative rounded-full flex justify-center p-2 overflow-hidden"
      :class="classes"
    >
      {{ props.codeName }}

      <base-polygon
        v-bind="polygonParams"
        class=" absolute -top-4 -left-4"
      />
    </div>

    <div class="balloon-box">
      <transition name="balloon">
        <div
          v-if="messageInfo.text"
          :key="messageInfo.id"
          class="balloon"
        >
          <q-icon
            color="grey-9"
            size="4rem"
            :name="getIconName(messageInfo.text)"
          />
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { KeyName, Player } from '../types';
import { getPlayerColor } from '../common/utils';
import { debounce, random, sample } from 'lodash-es';
import { nanoid } from 'nanoid';

import BasePolygon, { FillType, ShapeType } from './base-polygon.vue';


interface Props {
  player: Player;
  codeName: string;
}
const props = withDefaults(defineProps<Props>(), {});

const classes = computed(() => {
  const colorName = getPlayerColor({ codeName: props.codeName });

  return [`bg-${colorName}`];
});

const polygonParams = computed<InstanceType<typeof BasePolygon>['$props']>(() => {
  const shape = sample(Object.values(ShapeType)) ?? 'round';
  const fill = sample(Object.values(FillType)) ?? 'solid';

  return {
    shape,
    fill,
    size: '4rem',
    opacity: 0.3,
    rotate: `${random(0, 180)}deg`,
  }
});

const messageInfo = reactive({
  id: '',
  text: ``,
});

/** debounce 會在被呼叫後指定時間內觸發，輕鬆達成時間到自動消失效果 */
const hideBalloon = debounce(() => {
  messageInfo.text = '';
}, 2000);

function showBalloon(text: string) {
  const id = nanoid();

  messageInfo.id = id;
  messageInfo.text = text;

  hideBalloon();
}

/** 定義按鈕名稱與 icon */
const keyToIcon = [
  {
    keyName: KeyName.UP,
    icon: 'arrow_drop_up'
  },
  {
    keyName: KeyName.LEFT,
    icon: 'arrow_left'
  },
  {
    keyName: KeyName.RIGHT,
    icon: 'arrow_right'
  },
  {
    keyName: KeyName.DOWN,
    icon: 'arrow_drop_down'
  },
  {
    keyName: KeyName.CONFIRM,
    icon: 'done'
  },
]
function getIconName(name: string) {
  const target = keyToIcon.find(({ keyName }) => keyName === name);
  return target?.icon ?? 'question_mark';
}

defineExpose({
  playerId: props.player.clientId,
  showBalloon
});
</script>

<style scoped lang="sass">
.frame
  display: inline-block
  margin-right: 0.4rem
  height: 14rem
.avatar
  width: 7rem
  height: 7rem
  color: white
  text-shadow: 1px 1px 4px rgba(#000, 0.4)
  transform: translateY(150%)
  font-size: 2rem
  transition-duration: 0.6s
  transition-delay: 0.4s

.balloon-box
  position: absolute
  top: 30%
  left: 0
  width: 100%
  height: 100%
.balloon
  position: absolute
  background: white
  box-shadow: 5px 5px 10px rgba(#000, 0.1)
  border-radius: 9999px
  padding: 0.4rem 1.2rem
  &::before
    content: ''
    width: 2rem
    height: 2rem
    position: absolute
    left: 30%
    bottom: 0
    transform: translateX(-30%) rotate(30deg)
    background: white
    box-shadow: 5px 5px 10px rgba(#000, 0.01)

.balloon-enter-active, .balloon-leave-active
  transition-duration: 0.4s
  transition-timing-function: cubic-bezier(0.150, 1.535, 0.625, 1.015)
.balloon-leave-active
  transition-timing-function: cubic-bezier(1.000, 0.005, 0.150, 1.005)
.balloon-enter-from, .balloon-leave-to
  transform: translateY(100%) rotate(-30deg) !important
  opacity: 0 !important
.balloon-leave-to
  transform: translateY(100%) scale(0.4) !important
</style>

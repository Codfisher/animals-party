<template>
  <q-card class=" !rounded-3xl min-w-[20rem]">
    <slot name="title">
      <q-card-section
        class=" relative overflow-hidden text-4xl bg-orange-400 text-white text-center"
        :class="props.titleClass"
      >
        {{ props.title }}

        <base-polygon
          class=" absolute top-0 left-0 -translate-x-1/3 -translate-y-2/3"
          fill="spot"
          opacity="0.3"
        />

        <base-polygon
          class=" absolute bottom-0 right-0 translate-x-1/3 translate-y-2/3"
          shape="pentagon"
          rotate="10deg"
          opacity="0.3"
        />
      </q-card-section>
    </slot>

    <slot name="board">
      <q-card-section
        class="bg-orange-100 py-8 px-10 flex flex-col gap-6"
        :class="props.boardClass"
      >
        <div
          v-for="item, i in playerList"
          :key="i"
          class="player-item flex gap-6 text-white"
        >
          <div class="ranking flex items-center text-3xl font-black">
            {{ i + 1 }}
          </div>

          <div
            class="code-name relative p-4  text-3xl rounded-full flex-1 text-center overflow-hidden"
            :class="item.class"
          >
            {{ item.codeName }}

            <base-polygon
              class=" absolute top-0 right-0 translate-x-1/4"
              opacity="0.2"
              v-bind="item.polygon"
            />
          </div>
        </div>
      </q-card-section>
    </slot>

    <slot name="default" />
  </q-card>
</template>

<script setup lang="ts">
import { random, range, sample } from 'lodash-es';
import { computed, ref } from 'vue';
import { getPlayerColor } from '../common/utils';
import { useClientGameConsole } from '../composables/use-client-game-console';

import BasePolygon, { ShapeType, FillType } from './base-polygon.vue';

interface Props {
  title?: string;
  titleClass?: string;
  boardClass?: string;
  /** 順序表示排名 */
  idList: string[];
}
const props = withDefaults(defineProps<Props>(), {
  title: '玩家排行榜',
  titleClass: '',
  boardClass: '',
});

const gameConsole = useClientGameConsole();

/** 從 id list 轉換成 player code name */
const playerList = computed(() =>
  props.idList.map((id) => {
    const codeName = gameConsole.getPlayerCodeName(id);
    const color = getPlayerColor({ codeName });

    const polygon = {
      fill: sample(Object.values(FillType)),
      shape: sample(Object.values(ShapeType)),
      rotate: `${random(0, 45)}deg`,
    }

    return {
      codeName,
      class: `bg-${color}`,
      polygon,
    }
  })
);
</script>

<style scoped lang="sass">
.player-item
  .ranking
    padding: 0rem 1.5rem
    background: rgba(#000, 0.1)
    border-radius: 999px
    text-shadow: 0 0 8px rgba(#000, 0.4)
    color: white

  &:nth-child(1)
    .code-name
      animation: jump 2s infinite
      transform-origin: 50% 100%
    .ranking
      color: white
      text-shadow: 0 0 4px rgba(#000, 0.4)
      background: linear-gradient(30deg, #f5b402, #fcfc4c)
      border-radius: 0px
      clip-path: polygon(0% 15%, 15% 15%, 15% 0%, 85% 0%, 85% 15%, 100% 15%, 100% 85%, 85% 85%, 85% 100%, 15% 100%, 15% 85%, 0% 85%)

  &:nth-child(2)
    .code-name
      animation: cheerful 2s infinite
      transform-origin: 50% 100%
    .ranking
      color: white
      text-shadow: 0 0 4px rgba(#000, 0.4)
      background: linear-gradient(30deg, #c7bfb5, #FFF)
      border-radius: 0px
      clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)

  &:nth-child(3)
    .code-name
      animation: joy-bounce 2s infinite
    .ranking
      color: white
      text-shadow: 0 0 4px rgba(#000, 0.4)
      background: linear-gradient(30deg, #b83a00, #ed8d15)

$jump-in: cubic-bezier(0.755, 0.050, 0.855, 0.060)
$jump-out: cubic-bezier(0.230, 1.000, 0.320, 1.000)
@keyframes jump
  0%, 100%
    transform: scale( 1 )
    animation-timing-function: $jump-out
  20%
    transform: scale( 1.05, 0.9 )
    animation-timing-function: $jump-out
  40%
    transform: scale( 0.7, 1.3 ) translateY(-40%)
    animation-timing-function: $jump-in
  60%
    transform: scale( 0.9, 1.1 )
    animation-timing-function: $jump-out
  80%
    transform: scale( 1.1, 0.9 )

$cheerful-timing: cubic-bezier(1.000, 0.000, 0.160, 1.000)
@keyframes cheerful
  0%, 100%
    transform: skew(10deg) scaleY(1.1)
    animation-timing-function: $cheerful-timing
  25%, 75%
    transform: skew(0deg) scaleY(0.8)
    animation-timing-function: $cheerful-timing
  50%
    transform: skew(-10deg) scaleY(1.1)
    animation-timing-function: $cheerful-timing

$joy-bounce-timing: cubic-bezier(0.910, -0.010, 0.285, 1.350)
@keyframes joy-bounce
  0%, 100%
    transform: scale( 1 )
    animation-timing-function: $joy-bounce-timing
  50%
    transform: scale( 1.05, 0.9 )
    animation-timing-function: $joy-bounce-timing

</style>

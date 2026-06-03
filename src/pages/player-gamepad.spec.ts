import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { GameConsoleState } from '../types';
import { useGameConsoleStore } from '../stores/game-console.store';

const pushMock = vi.fn();
// 保留真實 vue-router（router.ts 於模組載入時即呼叫 createRouter），只覆寫 useRouter
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return { ...actual, useRouter: () => ({ push: pushMock }) };
});

/** 攔截元件註冊的 state-update callback，供測試直接驅動 */
let stateUpdateCallback: ((state: Partial<GameConsoleState>) => void) | undefined;
vi.mock('../composables/use-client-player', () => ({
  useClientPlayer: () => ({
    onGameConsoleStateUpdate: (fn: (state: Partial<GameConsoleState>) => void) => {
      stateUpdateCallback = fn;
    },
    onPlayerUpdate: () => undefined,
    requestGameConsoleState: () => undefined,
  }),
}));

// 須在 mock 宣告後再引入受測元件
import ThePlayerGamepad from './player-gamepad.vue';

function mountGamepad() {
  return mount(ThePlayerGamepad, {
    global: { stubs: { RouterView: true } },
  });
}

describe('the-player-gamepad 跳轉', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    pushMock.mockClear();
    stateUpdateCallback = undefined;
    // 設定 roomId，避免 init 直接導回首頁
    useGameConsoleStore().setRoomId('123456');
  });

  it('收到原子 playing 狀態時跳轉到對應遊戲搖桿頁', () => {
    mountGamepad();

    stateUpdateCallback?.({ status: 'playing', gameName: 'chicken-fly' });

    expect(pushMock).toHaveBeenLastCalledWith({
      name: '/player-gamepad/chicken-fly',
    });
  });

  it('在 lobby 先收到 gameName、再收到 playing，最終跳到正確遊戲且過程不拋錯', () => {
    mountGamepad();

    // 模擬拆兩筆 partial 到達：先 gameName 後 status
    expect(() => {
      stateUpdateCallback?.({ status: 'lobby' });
      stateUpdateCallback?.({ gameName: 'fox-and-mouse' });
      stateUpdateCallback?.({ status: 'playing' });
    }).not.toThrow();

    expect(pushMock).toHaveBeenLastCalledWith({
      name: '/player-gamepad/fox-and-mouse',
    });
  });

  it('playing 狀態帶未知 gameName 時不跳轉也不拋錯', () => {
    mountGamepad();

    expect(() => {
      stateUpdateCallback?.({
        status: 'playing',
        gameName: 'unknown-game' as GameConsoleState['gameName'],
      });
    }).not.toThrow();

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('收到 lobby 狀態時跳轉到搖桿大廳', () => {
    mountGamepad();

    stateUpdateCallback?.({ status: 'lobby' });

    expect(pushMock).toHaveBeenLastCalledWith({
      name: '/player-gamepad/lobby',
    });
  });

  it('收到 home 狀態時跳轉到首頁', () => {
    mountGamepad();

    stateUpdateCallback?.({ status: 'home' });

    expect(pushMock).toHaveBeenLastCalledWith({ name: '/home' });
  });
});

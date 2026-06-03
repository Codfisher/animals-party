import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGameConsoleStore } from './game-console.store';

describe('useGameConsoleStore.updateState', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('僅更新 status 時保留既有 gameName', () => {
    const store = useGameConsoleStore();
    store.updateState({ gameName: 'chicken-fly' });

    store.updateState({ status: 'playing' });

    expect(store.status).toBe('playing');
    expect(store.gameName).toBe('chicken-fly');
  });

  it('僅更新 gameName 時保留既有 status', () => {
    const store = useGameConsoleStore();
    store.updateState({ status: 'lobby' });

    store.updateState({ gameName: 'fox-and-mouse' });

    expect(store.status).toBe('lobby');
    expect(store.gameName).toBe('fox-and-mouse');
  });

  it('原子更新可一次寫入 status 與 gameName', () => {
    const store = useGameConsoleStore();

    store.updateState({ status: 'playing', gameName: 'fox-and-mouse' });

    expect(store.status).toBe('playing');
    expect(store.gameName).toBe('fox-and-mouse');
  });

  it('更新 players 清單時保留既有玩家經 updateProfile 設定的資料', () => {
    const store = useGameConsoleStore();
    store.updateState({ players: [{ clientId: 'a' }] });
    store.updateProfile({
      clientId: 'a',
      permission: { gyroscope: 'granted', vibrate: 'granted' },
    });

    store.updateState({ players: [{ clientId: 'a' }, { clientId: 'b' }] });

    const playerA = store.players.find(({ clientId }) => clientId === 'a');
    expect(store.players).toHaveLength(2);
    expect(playerA?.permission?.gyroscope).toBe('granted');
  });
});

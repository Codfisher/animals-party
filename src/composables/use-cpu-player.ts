import type { Player } from '../types';

const CPU_FILL_COUNT = 2;

export function useCpuPlayer() {
  function createCpuPlayerList(realPlayerCount: number, minPlayers: number): Player[] {
    if (realPlayerCount >= minPlayers) return [];
    return Array.from({ length: CPU_FILL_COUNT }, (_, i) => ({
      clientId: `cpu-${Date.now()}-${i}`,
      isCpu: true,
    }));
  }

  function isCpuPlayer(player: Player): boolean {
    return player.isCpu === true;
  }

  return { createCpuPlayerList, isCpuPlayer };
}

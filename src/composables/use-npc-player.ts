import type { Player } from '../types';

const NPC_FILL_COUNT = 2;

export function useNpcPlayer() {
  function createNpcPlayerList(realPlayerCount: number, minPlayers: number): Player[] {
    if (realPlayerCount >= minPlayers) return [];
    return Array.from({ length: NPC_FILL_COUNT }, (_, i) => ({
      clientId: `npc-${Date.now()}-${i}`,
      isNpc: true,
    }));
  }

  function isNpcPlayer(player: Player): boolean {
    return player.isNpc === true;
  }

  return { createNpcPlayerList, isNpcPlayer };
}

export function memberAvatarSeedHash(seed: string): number {
  let hash = 2166136261;
  for (const char of seed.trim().toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Stable 5 × 5 symmetric identicon cells derived from a member email. */
export function memberAvatarPattern(seed: string): boolean[] {
  let state = memberAvatarSeedHash(seed) || 1;
  const nextBit = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % 2 === 1;
  };

  return Array.from({ length: 5 }, () => {
    const half = [nextBit(), nextBit(), nextBit()];
    return [half[0], half[1], half[2], half[1], half[0]];
  }).flat();
}

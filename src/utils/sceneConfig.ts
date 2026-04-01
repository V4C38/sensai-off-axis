export type SplatIndex = 1 | 2 | 3 | 4 | 5;

export const ALL_SPLAT_INDICES: readonly SplatIndex[] = [1, 2, 3, 4, 5];

export function assertValidSplatIndex(index: number): asserts index is SplatIndex {
  if (!Number.isInteger(index) || index < 1 || index > 5) {
    throw new Error(`Invalid splat index: ${index}`);
  }
}

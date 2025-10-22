import { readFileSync, existsSync } from 'node:fs';
import { SchemaSnapshot } from '../model';
import { sha256 } from '../diff/diff-core';

/**
 * Loads the committed snapshot file (schema.graphql by default) if present.
 * Returns its contents and derived minimal SchemaSnapshot metadata.
 */
export function loadBaselineSnapshot(path = 'schema.graphql'): {
  exists: boolean;
  sdl: string | null;
  snapshot?: SchemaSnapshot;
} {
  if (!existsSync(path)) return { exists: false, sdl: null };
  const sdl = readFileSync(path, 'utf-8');
  const snapshot: SchemaSnapshot = {
    id: sha256(sdl),
    createdAt: new Date().toISOString(), // baseline timestamp unknown; present for shape
    sdl,
    version: 0,
    previousSnapshotId: null,
    elementCount: (
      sdl.match(/^type |^enum |^scalar |^interface |^input |^union /gm) || []
    ).length,
  };
  return { exists: true, sdl, snapshot };
}

// T011: SchemaSnapshot interface
import { JsonTypeCategory } from './types';

export interface ScalarJsonMeta {
  name: string;
  jsonTypeCategory: JsonTypeCategory;
  sourceHash?: string;
}

export interface SchemaSnapshot {
  id: string; // hash of normalized SDL
  createdAt: string; // ISO
  sdl: string; // deterministic SDL
  version: number; // incremental
  previousSnapshotId?: string | null;
  elementCount: number;
  jsonScalarMeta?: ScalarJsonMeta[];
}

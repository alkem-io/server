import { DeprecationEntry } from '../model';

export interface DeprecationRegistryArtifact {
  generatedAt: string;
  entries: DeprecationEntry[];
}

export function buildDeprecationRegistry(
  entries: DeprecationEntry[]
): DeprecationRegistryArtifact {
  return { generatedAt: new Date().toISOString(), entries };
}

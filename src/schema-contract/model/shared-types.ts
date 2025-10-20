// T015: Shared classification count interface for schema contract diffing
// Used by both schema-contract and tools/schema modules

export interface ClassificationCount {
  additive: number;
  deprecated: number;
  breaking: number;
  prematureRemoval: number;
  invalidDeprecation: number;
  deprecationGrace?: number; // Optional: count of entries in 24h grace period (FR-014)
  info: number;
  baseline: number;
}

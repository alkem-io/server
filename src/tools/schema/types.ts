// Schema diff tool type definitions (Feature 002)
// NOTE: Scaffolding only; implementations deferred per tasks.md

// Import and re-export shared types from schema-contract model
import type { ClassificationCount } from '../../schema-contract/model/shared-types';
import { ElementType, ChangeType } from '../../schema-contract/model/types';
export type { ClassificationCount };
export { ElementType, ChangeType };

export type ChangeClassification = ChangeType;

export interface ChangeEntry {
  id: string; // UUID placeholder
  element: string; // Fully qualified path
  elementType: ElementType;
  changeType: ChangeType;
  detail: string;
  previous?: unknown;
  current?: unknown;
  deprecationFormatValid?: boolean;
  removeAfter?: string; // YYYY-MM-DD
  sinceDate?: string; // YYYY-MM-DD
  firstCommit?: string; // git commit hash where deprecation first introduced
  override?: boolean;
  // FR-014 grace period support
  grace?: boolean; // true if within 24h grace for missing REMOVE_AFTER
  graceExpiresAt?: string; // ISO timestamp when grace ends
}

export interface EnumLifecycleEvaluation {
  enumValue: string;
  sinceDate: string;
  removeAfter: string;
  daysBetween: number;
  removalAttempted: boolean;
  allowedToRemove: boolean;
  classification: 'BREAKING' | 'PREMATURE_REMOVAL' | 'ALLOWED';
}

export interface ScalarChangeEvaluation {
  scalarName: string;
  jsonTypePrevious?: string;
  jsonTypeCurrent: string;
  behaviorChangeClassification: 'NON_BREAKING' | 'BREAKING';
  reason: string;
}

export interface ChangeReport {
  snapshotId: string;
  baseSnapshotId: string | null;
  generatedAt: string;
  classifications: ClassificationCount;
  entries: ChangeEntry[];
  overrideApplied: boolean;
  overrideReviewer?: string;
  enumLifecycleEvaluations?: EnumLifecycleEvaluation[];
  scalarEvaluations?: ScalarChangeEvaluation[];
  notes?: string[];
}

export interface DeprecationEntry {
  element: string;
  elementType: ElementType.FIELD | ElementType.ENUM_VALUE;
  sinceDate: string;
  removeAfter: string;
  humanReason: string;
  formatValid: boolean;
  retired: boolean;
  retirementDate?: string;
  firstCommit?: string; // commit hash referencing introduction (FR-005)
}

export interface SchemaSnapshotMeta {
  id: string;
  createdAt: string;
  version: number;
  elementCount: number;
}

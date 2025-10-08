// T012: ChangeReport interface
import {
  ChangeEntry,
  EnumLifecycleEvaluation,
  ScalarChangeEvaluation,
} from './change-entry';
import { ClassificationCount } from './types';

export interface ChangeReport {
  snapshotId: string;
  baseSnapshotId: string | null;
  generatedAt: string; // ISO
  classifications: ClassificationCount;
  entries: ChangeEntry[];
  overrideApplied: boolean;
  overrideReviewer?: string;
  enumLifecycleEvaluations?: EnumLifecycleEvaluation[];
  scalarEvaluations?: ScalarChangeEvaluation[];
  notes?: string[];
}

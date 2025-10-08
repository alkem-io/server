// T013: ChangeEntry & related evaluation interfaces
import { ChangeType, ElementType, JsonTypeCategory } from './types';

export interface ChangeEntry {
  id: string;
  element: string; // fully qualified path
  elementType: ElementType;
  changeType: ChangeType;
  detail: string;
  // Using any to permit snapshot AST fragment storage without tight coupling
  previous?: any;
  current?: any;
  deprecationFormatValid?: boolean;
  removeAfter?: string; // YYYY-MM-DD
  sinceDate?: string; // YYYY-MM-DD
  override?: boolean;
}

export interface EnumLifecycleEvaluation {
  enumValue: string; // TypeName.ENUM_VALUE
  sinceDate: string; // YYYY-MM-DD
  removeAfter: string; // YYYY-MM-DD
  daysBetween: number;
  removalAttempted: boolean;
  allowedToRemove: boolean;
  classification: 'BREAKING' | 'PREMATURE_REMOVAL' | 'ALLOWED';
}

export interface ScalarChangeEvaluation {
  scalarName: string;
  jsonTypePrevious?: JsonTypeCategory;
  jsonTypeCurrent: JsonTypeCategory;
  behaviorChangeClassification: 'NON_BREAKING' | 'BREAKING';
  reason: string;
}

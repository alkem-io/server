// T014: DeprecationEntry interface
import { ElementType } from './types';

export interface DeprecationEntry {
  element: string;
  elementType: Extract<ElementType, ElementType.FIELD | ElementType.ENUM_VALUE>;
  sinceDate: string; // YYYY-MM-DD
  removeAfter: string; // YYYY-MM-DD
  humanReason: string;
  formatValid: boolean;
  retired: boolean;
  retirementDate?: string; // YYYY-MM-DD
}

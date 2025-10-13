// T015: Shared enums & utility types for schema contract diffing
export enum ElementType {
  TYPE = 'TYPE',
  FIELD = 'FIELD',
  ENUM_VALUE = 'ENUM_VALUE',
  SCALAR = 'SCALAR',
}

export enum ChangeType {
  ADDITIVE = 'ADDITIVE',
  DEPRECATED = 'DEPRECATED',
  BREAKING = 'BREAKING',
  PREMATURE_REMOVAL = 'PREMATURE_REMOVAL',
  INVALID_DEPRECATION_FORMAT = 'INVALID_DEPRECATION_FORMAT',
  INFO = 'INFO',
  BASELINE = 'BASELINE',
}

export interface ClassificationCount {
  additive: number;
  deprecated: number;
  breaking: number;
  prematureRemoval: number;
  invalidDeprecation: number;
  info: number;
  baseline: number;
}

export type JsonTypeCategory =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'unknown';

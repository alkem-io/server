/**
 * Error categories determined by the first two digits of the numeric error code.
 * Each category has capacity for 1000 codes (000-999).
 */
export enum ErrorCategory {
  NOT_FOUND = 10, // 10xxx - Entity/resource not found
  AUTHORIZATION = 11, // 11xxx - Auth/permission errors
  VALIDATION = 12, // 12xxx - Input/state validation
  OPERATIONS = 13, // 13xxx - Business rule violations
  SYSTEM = 14, // 14xxx - Infrastructure errors
  FALLBACK = 99, // 99xxx - Unmapped errors
}

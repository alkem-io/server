/**
 * Error categories determined by the first two digits of the numeric error code.
 * Each category has capacity for 1000 codes (000-999).
 */
export enum ErrorCategory {
  NOT_FOUND = 10, // 10xxx - Entity/resource not found
  AUTHORIZATION = 20, // 20xxx - Auth/permission errors
  VALIDATION = 30, // 30xxx - Input/state validation
  OPERATIONS = 40, // 40xxx - Business rule violations
  SYSTEM = 50, // 50xxx - Infrastructure errors
  FALLBACK = 99, // 99xxx - Unmapped errors
}

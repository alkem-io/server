// Deprecation reason parser & validator (Feature 002)
// Implements FR-013..FR-016 parsing logic.

export interface ParsedDeprecationReason {
  raw: string;
  removeAfter?: string; // YYYY-MM-DD
  humanReason?: string;
  formatValid: boolean;
  warnings: string[];
  errors: string[];
}

const REMOVE_PREFIX = 'REMOVE_AFTER=';

export function parseDeprecationReason(
  raw?: string,
  introducedAt?: Date,
  now: Date = new Date()
): ParsedDeprecationReason {
  const result: ParsedDeprecationReason = {
    raw: raw ?? '',
    formatValid: false,
    warnings: [],
    errors: [],
  };
  if (!raw) {
    result.errors.push('Missing deprecation reason string');
    return result;
  }
  const parts = raw.split('|').map(p => p.trim());
  if (parts.length < 2) {
    // FR-014 grace: allow 24h window where REMOVE_AFTER may be absent if newly introduced
    // Determine if string contains REMOVE_AFTER prefix at all
    if (!raw.includes(REMOVE_PREFIX)) {
      if (introducedAt) {
        const elapsedMs = now.getTime() - introducedAt.getTime();
        if (elapsedMs < 24 * 3600 * 1000) {
          result.warnings.push(
            'Deprecation reason missing REMOVE_AFTER= (within grace period <24h)'
          );
          return result;
        }
      }
      result.errors.push('Expected format `REMOVE_AFTER=YYYY-MM-DD | reason`');
      return result;
    }
    result.errors.push('Expected format `REMOVE_AFTER=YYYY-MM-DD | reason`');
    return result;
  }
  const first = parts[0];
  if (!first.startsWith(REMOVE_PREFIX)) {
    result.errors.push('Missing REMOVE_AFTER= prefix');
    return result;
  }
  const dateStr = first.substring(REMOVE_PREFIX.length).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    result.errors.push('Invalid date format, expected YYYY-MM-DD');
    return result;
  }
  const date = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(date.getTime())) {
    result.errors.push('Invalid date value');
    return result;
  }
  const humanReason = parts.slice(1).join(' | ').trim();
  if (!humanReason) {
    result.errors.push('Missing human readable reason');
    return result;
  }
  result.removeAfter = dateStr;
  result.humanReason = humanReason;
  result.formatValid = true;
  // Grace period logic (FR-014) – if missing REMOVE_AFTER would warn; already validated presence so no warning here.
  // (Edge-case logic for introduction timing could be applied by caller using introducedAt).
  return result;
}

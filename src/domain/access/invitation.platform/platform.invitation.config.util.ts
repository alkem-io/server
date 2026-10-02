/**
 * Reads a numeric limit that must be a positive whole number. A value that is
 * missing, non-numeric, non-finite, fractional or below 1 is unusable (Redis
 * rejects a zero or fractional expiry, and a zero budget would refuse every
 * send), so the caller gets the default and `valid: false` to log once.
 */
export const positiveIntegerOrDefault = (
  raw: unknown,
  defaultValue: number
): { value: number; valid: boolean } => {
  const parsed = typeof raw === 'string' ? Number(raw) : raw;
  if (
    typeof parsed === 'number' &&
    Number.isFinite(parsed) &&
    Number.isInteger(parsed) &&
    parsed >= 1
  ) {
    return { value: parsed, valid: true };
  }
  return { value: defaultValue, valid: false };
};

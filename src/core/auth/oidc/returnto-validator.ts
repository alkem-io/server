export const DEFAULT_RETURN_TO = '/';
export const MAX_RETURN_TO_LENGTH = 2048;

export type ReturnToValidation = {
  value: string;
  rejected: boolean;
  reason?: ReturnToRejectionReason;
  truncatedInput?: string;
};

export type ReturnToRejectionReason =
  | 'empty'
  | 'too-long'
  | 'control-char'
  | 'not-absolute-path'
  | 'protocol-relative'
  | 'has-scheme';

// FR-017a — `returnTo` must be a same-origin relative path: starts with '/',
// does not start with '//', carries no scheme, no CR/LF/NUL. On any violation
// the value is replaced with '/' and an auth.returnTo.rejected warn-audit is
// expected to be emitted by the caller with `truncatedInput` (≤200 chars).
export function validateReturnTo(raw: unknown): ReturnToValidation {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { value: DEFAULT_RETURN_TO, rejected: true, reason: 'empty' };
  }

  const truncatedInput = raw.slice(0, 200);

  if (raw.length > MAX_RETURN_TO_LENGTH) {
    return {
      value: DEFAULT_RETURN_TO,
      rejected: true,
      reason: 'too-long',
      truncatedInput,
    };
  }

  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting CR/LF/NUL in returnTo is intentional per FR-017a
  if (/[\x00-\x1f\x7f]/.test(raw)) {
    return {
      value: DEFAULT_RETURN_TO,
      rejected: true,
      reason: 'control-char',
      truncatedInput,
    };
  }

  if (!raw.startsWith('/')) {
    return {
      value: DEFAULT_RETURN_TO,
      rejected: true,
      reason: 'not-absolute-path',
      truncatedInput,
    };
  }

  if (raw.startsWith('//') || raw.startsWith('/\\')) {
    return {
      value: DEFAULT_RETURN_TO,
      rejected: true,
      reason: 'protocol-relative',
      truncatedInput,
    };
  }

  // Cheap scheme pre-check — a literal `:` before the first `/` after position 0
  // covers `javascript:`, `data:`, etc. appearing anywhere in the path segment.
  const firstSlashAfterStart = raw.indexOf('/', 1);
  const schemeCandidate =
    firstSlashAfterStart === -1
      ? raw.slice(1)
      : raw.slice(1, firstSlashAfterStart);
  if (schemeCandidate.includes(':')) {
    return {
      value: DEFAULT_RETURN_TO,
      rejected: true,
      reason: 'has-scheme',
      truncatedInput,
    };
  }

  return { value: raw, rejected: false };
}

/**
 * Returns a partially masked rendering of an email address suitable for the
 * security-signal notification sent to the OLD address (FR-016, research.md §R11).
 *
 * - `valentin.yanakiev@gmail.com` → `v***@g***.com`
 * - `j@e.io` → `j***@e***.io`
 * - `a@b` (no TLD) → `a***@b***` (defensive fallback)
 *
 * The caller is responsible for validating input shape; this helper is best-effort
 * for the rare malformed-but-stored edge case.
 */
export function maskEmail(email: string): string {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) {
    return `${email.charAt(0) || ''}***`;
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  const lastDotIndex = domainPart.lastIndexOf('.');
  const domainFirstChar = domainPart.charAt(0) || '';

  if (lastDotIndex <= 0) {
    // No TLD (e.g. `a@b` or `a@`).
    return `${localPart.charAt(0)}***@${domainFirstChar}***`;
  }

  const tld = domainPart.slice(lastDotIndex + 1);
  return `${localPart.charAt(0)}***@${domainFirstChar}***.${tld}`;
}

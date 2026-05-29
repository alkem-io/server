/**
 * Wire payload for the password-change security signal.
 *
 * Sent to the user's current email address whenever a Kratos-side password
 * change is observed. Mirrors the email-change security-signal shape but
 * carries no "new" credential information — passwords are not addresses
 * and there is no analogue to `newEmailMasked`.
 */
export interface UserPasswordChangeSecuritySignalPayload {
  recipientEmail: string;
  /**
   * Wall-clock timestamp the upstream flow reported as the moment the
   * password was changed (not the moment the audit row landed).
   */
  observedAtISO8601: string;
}

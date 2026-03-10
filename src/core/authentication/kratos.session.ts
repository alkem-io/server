/**
 * Kratos session data extracted from Kratos Identity.
 * Used during user creation to populate profile from Kratos traits.
 */
export interface KratosSessionData {
  /** Kratos identity UUID - immutable, stable across email changes */
  authenticationID: string;

  /** Email from Kratos identity traits */
  email: string;

  /** Whether email has been verified in Kratos */
  emailVerified: boolean;

  /** First name from Kratos identity traits */
  firstName: string;

  /** Last name from Kratos identity traits */
  lastName: string;

  /** Avatar URL from Kratos identity traits (picture) */
  avatarURL: string;

  /** Session expiry timestamp (milliseconds since epoch) */
  expiry?: number;
}

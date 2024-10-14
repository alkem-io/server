import { Session } from '@ory/kratos-client';
import { SessionInvalidReason } from '@services/infrastructure/kratos/types/session.invalid.enum';

/***
 Checks if the session is still valid.
 */
export const validateSession = (
  session?: Session
):
  | { valid: true; reason?: undefined }
  | { valid: false; reason: SessionInvalidReason } => {
  if (!session) {
    return {
      valid: false,
      reason: 'Session not defined',
    };
  }

  if (session.expires_at == undefined) {
    return {
      valid: false,
      reason: 'Session expiry not defined',
    };
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    return {
      valid: false,
      reason: 'Session expired',
    };
  }

  return { valid: true };
};

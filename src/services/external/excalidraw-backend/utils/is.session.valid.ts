import { Session } from '@ory/kratos-client';

/***
 Checks if the session is still valid.
 */
export const isSessionValid = (session?: Session) => {
  return Boolean(
    session &&
      session.expires_at &&
      new Date(session.expires_at).getTime() >= Date.now()
  );
};

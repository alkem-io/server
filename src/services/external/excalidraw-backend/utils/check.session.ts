import { Session } from '@ory/kratos-client';
import { validateSession } from './validate.session';

export const checkSession = (session?: Session) => {
  const { valid, reason } = validateSession(session);

  if (!valid && reason === 'Session expired') {
    return reason;
  }
};

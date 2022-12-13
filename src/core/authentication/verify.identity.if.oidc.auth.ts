import { Session } from '@ory/kratos-client';
import { OryDefaultIdentitySchema } from '@core/authentication/ory.default.identity.schema';

/***
 * Sets the *verified* and *verified_at* fields of the FIRST verified address to **true** and **Date.now()**.
 * @param session
 */
export const verifyIdentityIfOidcAuth = (session: Session): Session => {
  const oryIdentity = session.identity as OryDefaultIdentitySchema;
  if (
    session.authentication_methods?.[0].method === 'oidc' &&
    oryIdentity.verifiable_addresses.length > 0
  ) {
    oryIdentity.verifiable_addresses[0].verified = true;
    oryIdentity.verifiable_addresses[0].verified_at = new Date().toISOString();
    session.identity = oryIdentity;
  }

  return session;
};

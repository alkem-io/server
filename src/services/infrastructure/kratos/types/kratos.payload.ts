import { Session } from '@ory/kratos-client';

export interface KratosPayload {
  exp: number;
  iat: number;
  iss: string;
  jti: string;
  nbf: number;
  sub: string;
  session: Session | null;
  /**
   * Alkemio actor ID from Kratos metadata_public.
   * Set by identity resolver webhook on registration/login.
   * Used to skip user lookup - actorId is known directly from token.
   */
  alkemio_actor_id: string;
}

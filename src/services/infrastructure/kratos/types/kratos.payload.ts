import { Session } from '@ory/kratos-client';

export interface KratosPayload {
  exp: number;
  iat: number;
  iss: string;
  jti: string;
  nbf: number;
  sub: string;
  session: Session | null;
}

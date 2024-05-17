import { FrontendApi, Session } from '@ory/kratos-client';
import jwt_decode from 'jwt-decode';
import { KratosPayload } from '@core/authentication/kratos.payload';

export const getSession = async (
  kratosClient: FrontendApi,
  opts: {
    authorization?: string;
    cookie?: string;
    token?: string;
  }
): Promise<Session | never> => {
  const { cookie, authorization, token } = opts;

  if (cookie) {
    return getSessionFromCookie(kratosClient, cookie);
  }

  if (authorization) {
    return getSessionFromAuthorizationHeader(authorization);
  }

  if (token) {
    return getSessionFromToken(token);
  }

  throw new Error('Authorization header or cookie not provided');
};

const getSessionFromCookie = async (
  kratosClient: FrontendApi,
  cookie: string
) => {
  try {
    return (
      await kratosClient.toSession({
        cookie,
      })
    ).data;
  } catch (e: any) {
    throw new Error(e?.message);
  }
};
const getSessionFromAuthorizationHeader = (authorizationHeader: string) => {
  const [, token] = authorizationHeader.split(' ');

  if (!token) {
    throw new Error('Token not provided in Authorization header');
  }

  return getSessionFromToken(token);
};

const getSessionFromToken = (token: string): Session | never => {
  if (!token) {
    throw new Error('Token is not a valid JWT token!');
  }

  let session: Session | null;

  try {
    session = jwt_decode<KratosPayload>(token).session;
  } catch (error: any) {
    throw new Error(error?.message ?? 'Token is not a valid JWT token!');
  }

  if (!session) {
    throw new Error('Kratos session not found in token');
  }

  return session;
};

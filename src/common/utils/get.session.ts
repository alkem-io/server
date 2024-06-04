import { KratosPayload } from '@core/authentication/kratos.payload';
import { FrontendApi, Session } from '@ory/kratos-client';
import jwt_decode from 'jwt-decode';

export const getSession = async (
  kratosClient: FrontendApi,
  opts: {
    authorization?: string;
    cookie?: string;
  }
): Promise<Session | never> => {
  const { cookie, authorization } = opts;

  if (authorization) {
    return getSessionFromAuthorizationHeader(kratosClient, authorization);
  }

  if (cookie) {
    return getSessionFromCookie(kratosClient, cookie);
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
const getSessionFromAuthorizationHeader = (
  kratosClient: FrontendApi,
  authorizationHeader: string
) => {
  const [, token] = authorizationHeader.split(' ');

  if (!token) {
    throw new Error('Token not provided in Authorization header');
  }

  try {
    return getSessionFromJwt(token);
  } catch (e) {
    return getSessionFromApiToken(kratosClient, token);
  }
};

/**
 * @param kratosClient
 * @param apiToken
 * @throws {Error}
 */
const getSessionFromApiToken = async (
  kratosClient: FrontendApi,
  apiToken: string
): Promise<Session | never> => {
  if (!apiToken) {
    throw new Error('Token is an empty string');
  }

  let session: Session | null;

  try {
    session = (
      await kratosClient.toSession({
        xSessionToken: apiToken,
      })
    ).data;
  } catch (error: any) {
    throw new Error(
      error?.message ?? 'Could not extract session from api token'
    );
  }

  if (!session) {
    throw new Error('Kratos session not found for api token');
  }

  return session;
};

const getSessionFromJwt = (token: string): Session | never => {
  if (!token) {
    throw new Error('Token is empty!');
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

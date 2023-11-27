import { FrontendApi, Session } from '@ory/kratos-client';
import jwt_decode from 'jwt-decode';
import { KratosPayload } from '@core/authentication/kratos.payload';

export const getSession = async (
  kratosClient: FrontendApi,
  opts: {
    authorization?: string;
    cookie?: string;
  }
): Promise<Session | never> => {
  const { cookie, authorization } = opts;

  if (cookie) {
    return getFromCookie(kratosClient, cookie);
  }

  if (authorization) {
    return getFromAuthorizationHeader(authorization);
  }

  throw new Error('Authorization header or cookie not provided');
};

const getFromCookie = async (kratosClient: FrontendApi, cookie: string) => {
  try {
    const { data } = await kratosClient.toSession({
      cookie,
    });
    return data;
  } catch (e: any) {
    throw new Error(e?.message);
  }
};
const getFromAuthorizationHeader = (authorizationHeader: string) => {
  const [, token] = authorizationHeader.split(' ');

  if (!token) {
    throw new Error('Token not found');
  }

  let jwt;

  try {
    jwt = jwt_decode<KratosPayload>(token);
  } catch (error) {
    throw new Error('Bearer token is not a valid JWT token!');
  }

  const session = jwt.session;

  if (!session) {
    throw new Error('Kratos session not found in token');
  }

  return session;
};

import { FrontendApi, Session } from '@ory/kratos-client';
import { KratosPayload } from '@services/infrastructure/kratos/types/kratos.payload';
import jwt_decode from 'jwt-decode';

/**
 * Retrieves a session using either an authorization header or a cookie.
 *
 * @param kratosClient - The Kratos frontend API client.
 * @param opts - Options for retrieving the session.
 * @param opts.authorization - The authorization header value (optional).
 * @param opts.cookie - The cookie value (optional).
 * @returns A promise that resolves to a Session object or throws an error if neither authorization nor cookie is provided.
 * @throws Will throw an error if neither authorization nor cookie is provided.
 */
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

/**
 * Retrieves a session from a cookie using the Kratos client.
 *
 * @param kratosClient - The Kratos Frontend API client instance.
 * @param cookie - The session cookie to retrieve the session from.
 * @returns A promise that resolves to the session data.
 * @throws Will throw an error if the session retrieval fails.
 */
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

/**
 * Extracts and validates a session from the provided Authorization header.
 *
 * This function attempts to extract a token from the Authorization header and
 * validate it using two different methods: `getSessionFromJwt` and
 * `getSessionFromApiToken`. If both methods fail, an error is thrown.
 *
 * @param kratosClient - An instance of `FrontendApi` used to validate the token.
 * @param authorizationHeader - The Authorization header containing the token.
 * @returns The session object if the token is valid.
 * @throws Will throw an error if the token is not provided or if it is invalid.
 */
const getSessionFromAuthorizationHeader = (
  kratosClient: FrontendApi,
  authorizationHeader: string
) => {
  const [, token] = authorizationHeader.split(' ');

  if (!token) {
    throw new Error('Token not provided in the Authorization header');
  }

  try {
    return getSessionFromJwt(token);
  } catch {
    // ...
  }

  try {
    return getSessionFromApiToken(kratosClient, token);
  } catch {
    // ...
  }

  throw new Error('Not a valid token provided in the Authorization header');
};

/**
 * Retrieves a session from an API token using the Kratos client.
 *
 * @param kratosClient - The Kratos client instance used to fetch the session.
 * @param apiToken - The API token used to retrieve the session.
 * @returns A promise that resolves to a `Session` object.
 * @throws Will throw an error if the API token is an empty string.
 * @throws Will throw an error if the session could not be extracted from the API token.
 * @throws Will throw an error if the session is not found for the given API token.
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

/**
 * Extracts a session from a JWT token.
 *
 * @param token - The JWT token from which to extract the session.
 * @returns The extracted session.
 * @throws Will throw an error if the token is empty.
 * @throws Will throw an error if the token is a Bearer token.
 * @throws Will throw an error if the token is not a valid JWT token.
 * @throws Will throw an error if the Kratos session is not found in the token.
 */
export const getSessionFromJwt = (token: string): Session | never => {
  if (!token) {
    throw new Error('Token is empty!');
  }

  let session: Session | null;
  const isBearerToken = token.startsWith('Bearer ');
  if (isBearerToken) {
    throw new Error('Bearer token found, not decodable as JWT');
  }

  try {
    const decodedKatosPaylod = jwt_decode<KratosPayload>(token);
    session = decodedKatosPaylod.session;
  } catch (error: any) {
    throw new Error(error?.message ?? 'Token is not a valid JWT token!');
  }

  if (!session) {
    throw new Error('Kratos session not found in token');
  }

  return session;
};

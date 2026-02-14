import { getSession, getSessionFromJwt } from './get.session';
import type { FrontendApi, Session } from '@ory/kratos-client';

// Mock jwt-decode
vi.mock('jwt-decode', () => ({
  default: vi.fn(),
}));

import jwt_decode from 'jwt-decode';

const mockedJwtDecode = vi.mocked(jwt_decode);

const createMockSession = (overrides?: Partial<Session>): Session =>
  ({
    id: 'session-id',
    identity: { id: 'identity-id', traits: {} },
    ...overrides,
  }) as Session;

const createMockKratosClient = (
  overrides?: Partial<FrontendApi>
): FrontendApi =>
  ({
    toSession: vi.fn(),
    ...overrides,
  }) as unknown as FrontendApi;

describe('getSession', () => {
  it('should throw when neither authorization nor cookie is provided', async () => {
    const client = createMockKratosClient();
    await expect(getSession(client, {})).rejects.toThrow(
      'Authorization header or cookie not provided'
    );
  });

  it('should retrieve session from cookie when cookie is provided', async () => {
    const session = createMockSession();
    const client = createMockKratosClient({
      toSession: vi.fn().mockResolvedValue({ data: session }),
    });

    const result = await getSession(client, { cookie: 'session-cookie' });
    expect(result).toEqual(session);
    expect(client.toSession).toHaveBeenCalledWith({
      cookie: 'session-cookie',
    });
  });

  it('should throw when cookie-based session retrieval fails', async () => {
    const client = createMockKratosClient({
      toSession: vi.fn().mockRejectedValue(new Error('invalid cookie')),
    });

    await expect(
      getSession(client, { cookie: 'bad-cookie' })
    ).rejects.toThrow('invalid cookie');
  });

  it('should prefer authorization over cookie when both are provided', async () => {
    const session = createMockSession();
    mockedJwtDecode.mockReturnValue({ session });

    const client = createMockKratosClient();

    const result = await getSession(client, {
      authorization: 'Bearer valid.jwt.token',
      cookie: 'some-cookie',
    });

    expect(result).toEqual(session);
    // toSession should NOT be called with cookie since authorization takes priority
    expect(client.toSession).not.toHaveBeenCalledWith(
      expect.objectContaining({ cookie: 'some-cookie' })
    );
  });

  it('should throw when authorization header has no token', async () => {
    const client = createMockKratosClient();
    await expect(
      getSession(client, { authorization: 'Bearer' })
    ).rejects.toThrow('Token not provided in the Authorization header');
  });

  it('should fall back to API token when JWT decode fails', async () => {
    mockedJwtDecode.mockImplementation(() => {
      throw new Error('invalid jwt');
    });

    const session = createMockSession();
    const client = createMockKratosClient({
      toSession: vi.fn().mockResolvedValue({ data: session }),
    });

    const result = await getSession(client, {
      authorization: 'Bearer api-token-123',
    });
    expect(result).toEqual(session);
    expect(client.toSession).toHaveBeenCalledWith({
      xSessionToken: 'api-token-123',
    });
  });

  it('should reject with the API token error when both JWT and API token methods fail', async () => {
    // getSessionFromAuthorizationHeader is not async, so when getSessionFromApiToken
    // returns a rejected promise, it is returned (not caught synchronously)
    mockedJwtDecode.mockImplementation(() => {
      throw new Error('not a jwt');
    });

    const client = createMockKratosClient({
      toSession: vi.fn().mockRejectedValue(new Error('api token invalid')),
    });

    await expect(
      getSession(client, { authorization: 'Bearer bad-token' })
    ).rejects.toThrow('api token invalid');
  });
});

describe('getSessionFromJwt', () => {
  it('should throw when token is empty', () => {
    expect(() => getSessionFromJwt('')).toThrow('Token is empty!');
  });

  it('should throw when token starts with Bearer', () => {
    expect(() => getSessionFromJwt('Bearer some-token')).toThrow(
      'Bearer token found, not decodable as JWT'
    );
  });

  it('should return session from a valid JWT payload', () => {
    const session = createMockSession();
    mockedJwtDecode.mockReturnValue({ session });

    const result = getSessionFromJwt('valid.jwt.token');
    expect(result).toEqual(session);
  });

  it('should throw when decoded JWT has no session', () => {
    mockedJwtDecode.mockReturnValue({});

    expect(() => getSessionFromJwt('token-without-session')).toThrow(
      'Kratos session not found in token'
    );
  });

  it('should throw when jwt_decode throws', () => {
    mockedJwtDecode.mockImplementation(() => {
      throw new Error('Invalid token specified');
    });

    expect(() => getSessionFromJwt('malformed-token')).toThrow(
      'Invalid token specified'
    );
  });
});

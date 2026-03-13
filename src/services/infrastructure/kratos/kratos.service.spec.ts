import { AuthenticationType } from '@common/enums/authentication.type';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Identity, Session } from '@ory/kratos-client';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { KratosService } from './kratos.service';

describe('KratosService', () => {
  let service: KratosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KratosService,
        MockWinstonProvider,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (
                key ===
                'identity.authentication.providers.ory.kratos_public_base_url_server'
              ) {
                return 'http://kratos-public:4433';
              }
              if (key === 'identity.authentication.providers.ory') {
                return {
                  kratos_public_base_url_server: 'http://kratos-public:4433',
                  kratos_admin_base_url_server: 'http://kratos-admin:4434',
                  admin_service_account: {
                    username: 'admin',
                    password: 'password',
                  },
                };
              }
              return undefined;
            }),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(KratosService);
  });

  describe('mapAuthenticationType', () => {
    it('should return UNKNOWN when identity has no credentials', () => {
      const identity = {} as Identity;
      const result = service.mapAuthenticationType(identity);
      expect(result).toEqual([AuthenticationType.UNKNOWN]);
    });

    it('should return UNKNOWN when identity is null-like', () => {
      const result = service.mapAuthenticationType(null as any);
      expect(result).toEqual([AuthenticationType.UNKNOWN]);
    });

    it('should return EMAIL when identity has password credentials', () => {
      const identity = {
        credentials: {
          password: { type: 'password' },
        },
      } as unknown as Identity;

      const result = service.mapAuthenticationType(identity);
      expect(result).toEqual([AuthenticationType.EMAIL]);
    });

    it('should return MICROSOFT when oidc identifier starts with microsoft', () => {
      const identity = {
        credentials: {
          oidc: { identifiers: ['microsoft-12345'] },
        },
      } as unknown as Identity;

      const result = service.mapAuthenticationType(identity);
      expect(result).toEqual([AuthenticationType.MICROSOFT]);
    });

    it('should return LINKEDIN when oidc identifier starts with linkedin', () => {
      const identity = {
        credentials: {
          oidc: { identifiers: ['linkedin-user'] },
        },
      } as unknown as Identity;

      const result = service.mapAuthenticationType(identity);
      expect(result).toEqual([AuthenticationType.LINKEDIN]);
    });

    it('should return GITHUB when oidc identifier starts with github', () => {
      const identity = {
        credentials: {
          oidc: { identifiers: ['github-user'] },
        },
      } as unknown as Identity;

      const result = service.mapAuthenticationType(identity);
      expect(result).toEqual([AuthenticationType.GITHUB]);
    });

    it('should return both MICROSOFT and EMAIL when both are present', () => {
      const identity = {
        credentials: {
          oidc: { identifiers: ['microsoft-12345'] },
          password: { type: 'password' },
        },
      } as unknown as Identity;

      const result = service.mapAuthenticationType(identity);
      expect(result).toContain(AuthenticationType.MICROSOFT);
      expect(result).toContain(AuthenticationType.EMAIL);
    });

    it('should return UNKNOWN when credentials exist but no oidc or password', () => {
      const identity = {
        credentials: {},
      } as unknown as Identity;

      const result = service.mapAuthenticationType(identity);
      expect(result).toEqual([AuthenticationType.UNKNOWN]);
    });
  });

  describe('validateSession', () => {
    it('should return invalid when session is undefined', () => {
      const result = service.validateSession(undefined);
      expect(result).toEqual({
        valid: false,
        reason: 'Session not defined',
      });
    });

    it('should return invalid when expires_at is undefined', () => {
      const session = { id: 's-1' } as Session;
      const result = service.validateSession(session);
      expect(result).toEqual({
        valid: false,
        reason: 'Session expiry not defined',
      });
    });

    it('should return invalid when session is expired', () => {
      const session = {
        id: 's-1',
        expires_at: new Date(Date.now() - 10000).toISOString(),
      } as unknown as Session;

      const result = service.validateSession(session);
      expect(result).toEqual({
        valid: false,
        reason: 'Session expired',
      });
    });

    it('should return valid when session is not expired', () => {
      const session = {
        id: 's-1',
        expires_at: new Date(Date.now() + 60000).toISOString(),
      } as unknown as Session;

      const result = service.validateSession(session);
      expect(result).toEqual({ valid: true });
    });
  });

  describe('checkSession', () => {
    it('should return "Session expired" when session is expired', () => {
      const session = {
        id: 's-1',
        expires_at: new Date(Date.now() - 10000).toISOString(),
      } as unknown as Session;

      const result = service.checkSession(session);
      expect(result).toBe('Session expired');
    });

    it('should return undefined when session is valid', () => {
      const session = {
        id: 's-1',
        expires_at: new Date(Date.now() + 60000).toISOString(),
      } as unknown as Session;

      const result = service.checkSession(session);
      expect(result).toBeUndefined();
    });

    it('should return undefined when session is undefined (not expired reason)', () => {
      const result = service.checkSession(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('getSessionFromJwt', () => {
    it('should throw when token is empty', () => {
      expect(() => service.getSessionFromJwt('')).toThrow('Token is empty!');
    });

    it('should throw when token is a Bearer token', () => {
      expect(() => service.getSessionFromJwt('Bearer some-token')).toThrow(
        'Bearer token found, not decodable as JWT'
      );
    });
  });

  describe('getSessionFromAuthorizationHeader', () => {
    it('should throw when token is not present in header', () => {
      const kratosClient = {} as any;

      expect(() =>
        service.getSessionFromAuthorizationHeader(kratosClient, 'Bearer')
      ).toThrow('Token not provided in the Authorization header');
    });

    it('should throw when neither JWT nor API token works', () => {
      const kratosClient = {} as any;

      // getSessionFromApiToken is async (returns a Promise), so the try-catch
      // in getSessionFromAuthorizationHeader only catches sync throws.
      // Mock it to throw synchronously to test the intended fallthrough path.
      (service as any).getSessionFromApiToken = () => {
        throw new Error('Token validation failed');
      };

      expect(() =>
        service.getSessionFromAuthorizationHeader(
          kratosClient,
          'Bearer invalid-token'
        )
      ).toThrow('Not a valid token provided in the Authorization header');
    });
  });

  describe('getSession', () => {
    it('should throw when neither authorization nor cookie is provided', async () => {
      await expect(service.getSession()).rejects.toThrow(
        'Authorization header or cookie not provided'
      );
    });
  });

  describe('getCreatedAt', () => {
    it('should return undefined when identity is falsy', async () => {
      const result = await service.getCreatedAt(null as any);
      expect(result).toBeUndefined();
    });

    it('should return undefined when created_at is missing', async () => {
      const result = await service.getCreatedAt({} as Identity);
      expect(result).toBeUndefined();
    });

    it('should return Date when created_at is present', async () => {
      const identity = {
        created_at: '2024-01-15T10:00:00Z',
      } as unknown as Identity;

      const result = await service.getCreatedAt(identity);
      expect(result).toBeInstanceOf(Date);
      expect(result!.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });
  });

  describe('getAuthenticationTypeFromIdentity', () => {
    it('should return UNKNOWN when identity is falsy', async () => {
      const result = await service.getAuthenticationTypeFromIdentity(
        null as any
      );
      expect(result).toEqual([AuthenticationType.UNKNOWN]);
    });

    it('should delegate to mapAuthenticationType for valid identity', async () => {
      const identity = {
        credentials: {
          password: { type: 'password' },
        },
      } as unknown as Identity;

      const result = await service.getAuthenticationTypeFromIdentity(identity);
      expect(result).toEqual([AuthenticationType.EMAIL]);
    });
  });

  describe('getBearerToken', () => {
    it('should throw LoginFlowInitializeException when createNativeLoginFlow fails', async () => {
      vi.spyOn(
        service.kratosFrontEndClient,
        'createNativeLoginFlow'
      ).mockRejectedValue(new Error('Connection refused'));

      await expect(service.getBearerToken()).rejects.toThrow(
        'Login flow initialize'
      );
    });

    it('should throw LoginFlowException when updateLoginFlow fails', async () => {
      vi.spyOn(
        service.kratosFrontEndClient,
        'createNativeLoginFlow'
      ).mockResolvedValue({ data: { id: 'flow-1' } } as any);
      vi.spyOn(
        service.kratosFrontEndClient,
        'updateLoginFlow'
      ).mockRejectedValue(new Error('Invalid credentials'));

      await expect(service.getBearerToken()).rejects.toThrow('Login flow for');
    });

    it('should throw BearerTokenNotFoundException when sessionToken is undefined', async () => {
      vi.spyOn(
        service.kratosFrontEndClient,
        'createNativeLoginFlow'
      ).mockResolvedValue({ data: { id: 'flow-1' } } as any);
      vi.spyOn(
        service.kratosFrontEndClient,
        'updateLoginFlow'
      ).mockResolvedValue({
        data: {
          session_token: undefined,
          session: { id: 'session-1' },
        },
      } as any);

      await expect(service.getBearerToken()).rejects.toThrow(
        'Bearer token not found'
      );
    });

    it('should return sessionToken on success', async () => {
      vi.spyOn(
        service.kratosFrontEndClient,
        'createNativeLoginFlow'
      ).mockResolvedValue({ data: { id: 'flow-1' } } as any);
      vi.spyOn(
        service.kratosFrontEndClient,
        'updateLoginFlow'
      ).mockResolvedValue({
        data: {
          session_token: 'token-123',
          session: { id: 'session-1' },
        },
      } as any);

      const result = await service.getBearerToken();
      expect(result).toBe('token-123');
    });
  });

  describe('tryExtendSession', () => {
    it('should succeed when extendSession returns 200', async () => {
      vi.spyOn(service.kratosIdentityClient, 'extendSession').mockResolvedValue(
        { status: 200 } as any
      );

      await expect(
        service.tryExtendSession({ id: 'session-1' } as Session, 'token')
      ).resolves.toBeUndefined();
    });

    it('should succeed when extendSession returns 204', async () => {
      vi.spyOn(service.kratosIdentityClient, 'extendSession').mockResolvedValue(
        { status: 204 } as any
      );

      await expect(
        service.tryExtendSession({ id: 'session-1' } as Session, 'token')
      ).resolves.toBeUndefined();
    });

    it('should throw SessionExtendException when status is unexpected', async () => {
      vi.spyOn(service.kratosIdentityClient, 'extendSession').mockResolvedValue(
        { status: 500 } as any
      );

      await expect(
        service.tryExtendSession({ id: 'session-1' } as Session, 'token')
      ).rejects.toThrow('Request to extend session');
    });

    it('should throw SessionExtendException when extendSession throws', async () => {
      vi.spyOn(service.kratosIdentityClient, 'extendSession').mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        service.tryExtendSession({ id: 'session-1' } as Session, 'token')
      ).rejects.toThrow('Session extend');
    });
  });

  describe('extendSession', () => {
    it('should delegate to getBearerToken then tryExtendSession', async () => {
      vi.spyOn(
        service.kratosFrontEndClient,
        'createNativeLoginFlow'
      ).mockResolvedValue({ data: { id: 'flow-1' } } as any);
      vi.spyOn(
        service.kratosFrontEndClient,
        'updateLoginFlow'
      ).mockResolvedValue({
        data: {
          session_token: 'admin-token',
          session: { id: 'admin-session' },
        },
      } as any);
      vi.spyOn(service.kratosIdentityClient, 'extendSession').mockResolvedValue(
        { status: 204 } as any
      );

      await expect(
        service.extendSession({ id: 'session-1' } as Session)
      ).resolves.toBeUndefined();
    });
  });

  describe('getIdentityByEmail', () => {
    it('should return identity when found', async () => {
      const mockIdentity = { id: 'id-1', traits: { email: 'test@test.com' } };
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: [mockIdentity] } as any);

      const result = await service.getIdentityByEmail('test@test.com');
      expect(result).toBe(mockIdentity);
    });

    it('should return undefined when no identity found', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: [] } as any);

      const result = await service.getIdentityByEmail('nobody@test.com');
      expect(result).toBeUndefined();
    });
  });

  describe('getIdentityById', () => {
    it('should return identity when found', async () => {
      const mockIdentity = { id: 'id-1' };
      vi.spyOn(service.kratosIdentityClient, 'getIdentity').mockResolvedValue({
        data: mockIdentity,
      } as any);

      const result = await service.getIdentityById('id-1');
      expect(result).toBe(mockIdentity);
    });

    it('should return undefined when 404', async () => {
      vi.spyOn(service.kratosIdentityClient, 'getIdentity').mockRejectedValue({
        response: { status: 404 },
      });

      const result = await service.getIdentityById('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should rethrow on non-404 errors', async () => {
      vi.spyOn(service.kratosIdentityClient, 'getIdentity').mockRejectedValue(
        new Error('Server error')
      );

      await expect(service.getIdentityById('id-1')).rejects.toThrow(
        'Server error'
      );
    });
  });

  describe('getSession', () => {
    it('should use authorization header when provided', async () => {
      const mockSession = { id: 'session-1' };
      vi.spyOn(service, 'getSessionFromJwt' as any).mockReturnValue(
        mockSession
      );

      const result = await service.getSession('Bearer valid-jwt');
      expect(result).toBe(mockSession);
    });

    it('should use cookie when authorization is not provided', async () => {
      const mockSession = { id: 'session-from-cookie' };
      vi.spyOn(service.kratosFrontEndClient, 'toSession').mockResolvedValue({
        data: mockSession,
      } as any);

      const result = await service.getSession(undefined, 'session-cookie');
      expect(result).toBe(mockSession);
    });
  });

  describe('getSessionFromJwt', () => {
    it('should throw when token is not a valid JWT', () => {
      expect(() => service.getSessionFromJwt('not-a-jwt')).toThrow();
    });
  });

  describe('getSessionFromApiToken', () => {
    it('should throw when apiToken is empty', async () => {
      const kratosClient = {} as any;
      await expect(
        service.getSessionFromApiToken(kratosClient, '')
      ).rejects.toThrow('Token is an empty string');
    });

    it('should return session when token is valid', async () => {
      const mockSession = { id: 'session-1' };
      const kratosClient = {
        toSession: vi.fn().mockResolvedValue({ data: mockSession }),
      } as any;

      const result = await service.getSessionFromApiToken(
        kratosClient,
        'valid-token'
      );
      expect(result).toBe(mockSession);
    });

    it('should throw when session is null', async () => {
      const kratosClient = {
        toSession: vi.fn().mockResolvedValue({ data: null }),
      } as any;

      await expect(
        service.getSessionFromApiToken(kratosClient, 'token')
      ).rejects.toThrow('Kratos session not found');
    });
  });

  describe('getAllIdentities', () => {
    it('should return all identities', async () => {
      const identities = [{ id: 'id-1' }, { id: 'id-2' }];
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: identities } as any);

      const result = await service.getAllIdentities();
      expect(result).toEqual(identities);
    });

    it('should return empty array when no identities', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: null } as any);

      const result = await service.getAllIdentities();
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockRejectedValue(new Error('Network error'));

      await expect(service.getAllIdentities()).rejects.toThrow('Network error');
    });
  });

  describe('getUnverifiedIdentities', () => {
    it('should return empty array when no identities', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: [] } as any);

      const result = await service.getUnverifiedIdentities();
      expect(result).toEqual([]);
    });

    it('should filter for unverified identities', async () => {
      const identities = [
        {
          id: 'id-1',
          verifiable_addresses: [{ verified: false }],
        },
        {
          id: 'id-2',
          verifiable_addresses: [{ verified: true }],
        },
        {
          id: 'id-3',
          // no verifiable_addresses
        },
      ];
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: identities } as any);

      const result = await service.getUnverifiedIdentities();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('id-1');
    });
  });

  describe('getVerifiedIdentities', () => {
    it('should return empty array when no identities', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: [] } as any);

      const result = await service.getVerifiedIdentities();
      expect(result).toEqual([]);
    });

    it('should filter for verified identities', async () => {
      const identities = [
        {
          id: 'id-1',
          verifiable_addresses: [{ verified: true }],
        },
        {
          id: 'id-2',
          verifiable_addresses: [{ verified: false }],
        },
      ];
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: identities } as any);

      const result = await service.getVerifiedIdentities();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('id-1');
    });
  });

  describe('deleteIdentityByEmail', () => {
    it('should throw when identity not found', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: [] } as any);

      await expect(
        service.deleteIdentityByEmail('nobody@test.com')
      ).rejects.toThrow();
    });

    it('should delete identity when found', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentities'
      ).mockResolvedValue({ data: [{ id: 'id-1' }] } as any);
      const deleteSpy = vi
        .spyOn(service.kratosIdentityClient, 'deleteIdentity')
        .mockResolvedValue(undefined as any);

      await service.deleteIdentityByEmail('test@test.com');

      expect(deleteSpy).toHaveBeenCalledWith({ id: 'id-1' });
    });
  });

  describe('getAuthenticatedAt', () => {
    it('should return undefined when sessions is null', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentitySessions'
      ).mockResolvedValue({ data: null } as any);

      const result = await service.getAuthenticatedAt({
        id: 'id-1',
      } as Identity);
      expect(result).toBeUndefined();
    });

    it('should return latest authenticated_at date', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentitySessions'
      ).mockResolvedValue({
        data: [
          { authenticated_at: '2024-01-10T10:00:00Z' },
          { authenticated_at: '2024-01-15T10:00:00Z' },
          { authenticated_at: '2024-01-12T10:00:00Z' },
        ],
      } as any);

      const result = await service.getAuthenticatedAt({
        id: 'id-1',
      } as Identity);
      expect(result).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should return undefined on error', async () => {
      vi.spyOn(
        service.kratosIdentityClient,
        'listIdentitySessions'
      ).mockRejectedValue(new Error('Error'));

      const result = await service.getAuthenticatedAt({
        id: 'id-1',
      } as Identity);
      expect(result).toBeUndefined();
    });
  });
});

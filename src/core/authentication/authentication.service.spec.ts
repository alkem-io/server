import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { AuthenticationService } from './authentication.service';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { Session } from '@ory/kratos-client';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { NotSupportedException } from '@common/exceptions';
import ConfigUtils from '@config/config.utils';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let agentInfoCacheService: jest.Mocked<AgentInfoCacheService>;
  let agentInfoService: jest.Mocked<AgentInfoService>;
  let kratosService: jest.Mocked<KratosService>;

  const mockOryIdentity: OryDefaultIdentitySchema = {
    id: 'test-id',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    schema_id: 'default',
    schema_url: 'http://test.com/schema',
    state: 'active',
    state_changed_at: '2023-01-01T00:00:00Z',
    traits: {
      accepted_terms: true,
      email: 'test@example.com',
      name: {
        first: 'John',
        last: 'Doe',
      },
      picture: 'http://example.com/avatar.jpg',
    },
    verifiable_addresses: [
      {
        id: 'addr-id',
        value: 'test@example.com',
        verified: true,
        verified_at: '2023-01-01T00:00:00Z',
        via: 'email',
        status: 'completed',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ],
    recovery_addresses: [
      {
        id: 'recovery-id',
        value: 'test@example.com',
        via: 'email',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ],
  };

  const mockSession: Session = {
    id: 'session-id',
    active: true,
    expires_at: '2023-12-31T23:59:59Z',
    authenticated_at: '2023-01-01T00:00:00Z',
    issued_at: '2023-01-01T00:00:00Z',
    identity: mockOryIdentity,
  };

  const mockAgentInfo: AgentInfo = {
    isAnonymous: false,
    userID: 'user-id',
    email: 'test@example.com',
    emailVerified: true,
    firstName: 'John',
    lastName: 'Doe',
    guestName: '',
    credentials: [],
    agentID: 'agent-id',
    avatarURL: 'http://example.com/avatar.jpg',
    authenticationID: 'auth-id',
    expiry: new Date('2023-12-31T23:59:59Z').getTime(),
  };

  const mockAgentInfoMetadata = {
    userID: 'user-id',
    email: 'test@example.com',
    credentials: [],
    agentID: 'agent-id',
    did: 'did:test:123',
    password: 'test-password',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthenticationService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return ConfigServiceMock;
        }
        if (token === AgentInfoCacheService) {
          return {
            getAgentInfoFromCache: jest.fn(),
            setAgentInfoCache: jest.fn(),
          };
        }
        if (token === AgentInfoService) {
          return {
            createAnonymousAgentInfo: jest.fn(),
            createGuestAgentInfo: jest.fn(),
            getAgentInfoMetadata: jest.fn(),
            populateAgentInfoWithMetadata: jest.fn(),
          };
        }
        if (token === KratosService) {
          return {
            getSession: jest.fn(),
            getBearerToken: jest.fn(),
            tryExtendSession: jest.fn(),
          };
        }
        if (token === AgentService) {
          return {
            getVerifiedCredentials: jest.fn(),
          };
        }

        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(AuthenticationService);
    agentInfoCacheService = module.get(AgentInfoCacheService);
    agentInfoService = module.get(AgentInfoService);
    kratosService = module.get(KratosService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAgentInfo', () => {
    it('should return anonymous agent info when no session is found and no guest name', async () => {
      const anonymousAgentInfo = { ...mockAgentInfo, isAnonymous: true };
      kratosService.getSession.mockRejectedValue(new Error('No session'));
      agentInfoService.createAnonymousAgentInfo.mockReturnValue(
        anonymousAgentInfo
      );

      const result = await service.getAgentInfo({ cookie: 'test-cookie' });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        undefined,
        'test-cookie'
      );
      expect(agentInfoService.createAnonymousAgentInfo).toHaveBeenCalled();
      expect(result).toEqual(anonymousAgentInfo);
    });

    it('should return guest agent info when no session is found but guest name is provided', async () => {
      const guestAgentInfo = { ...mockAgentInfo, guestName: 'Guest User' };
      kratosService.getSession.mockRejectedValue(new Error('No session'));
      agentInfoService.createGuestAgentInfo.mockReturnValue(guestAgentInfo);

      const result = await service.getAgentInfo({
        cookie: 'test-cookie',
        guestName: 'Guest User',
      });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        undefined,
        'test-cookie'
      );
      expect(agentInfoService.createGuestAgentInfo).toHaveBeenCalledWith(
        'Guest User'
      );
      expect(result).toEqual(guestAgentInfo);
    });

    it('should return anonymous agent info when session has no identity and no guest name', async () => {
      const sessionWithoutIdentity = { ...mockSession, identity: undefined };
      const anonymousAgentInfo = { ...mockAgentInfo, isAnonymous: true };

      kratosService.getSession.mockResolvedValue(sessionWithoutIdentity);
      agentInfoService.createAnonymousAgentInfo.mockReturnValue(
        anonymousAgentInfo
      );

      const result = await service.getAgentInfo({
        authorization: 'Bearer token',
      });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        'Bearer token',
        undefined
      );
      expect(agentInfoService.createAnonymousAgentInfo).toHaveBeenCalled();
      expect(result).toEqual(anonymousAgentInfo);
    });

    it('should return guest agent info when session has no identity but guest name is provided', async () => {
      const sessionWithoutIdentity = { ...mockSession, identity: undefined };
      const guestAgentInfo = { ...mockAgentInfo, guestName: 'Guest User' };

      kratosService.getSession.mockResolvedValue(sessionWithoutIdentity);
      agentInfoService.createGuestAgentInfo.mockReturnValue(guestAgentInfo);

      const result = await service.getAgentInfo({
        authorization: 'Bearer token',
        guestName: 'Guest User',
      });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        'Bearer token',
        undefined
      );
      expect(agentInfoService.createGuestAgentInfo).toHaveBeenCalledWith(
        'Guest User'
      );
      expect(result).toEqual(guestAgentInfo);
    });

    it('should create agent info when session has valid identity', async () => {
      kratosService.getSession.mockResolvedValue(mockSession);
      jest.spyOn(service, 'createAgentInfo').mockResolvedValue(mockAgentInfo);

      const result = await service.getAgentInfo({
        authorization: 'Bearer token',
      });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        'Bearer token',
        undefined
      );
      expect(service.createAgentInfo).toHaveBeenCalledWith(mockOryIdentity);
      expect(result).toEqual(mockAgentInfo);
    });
  });

  describe('createAgentInfo', () => {
    it('should return anonymous agent info when no ory identity provided', async () => {
      const anonymousAgentInfo = { ...mockAgentInfo, isAnonymous: true };
      agentInfoService.createAnonymousAgentInfo.mockReturnValue(
        anonymousAgentInfo
      );

      const result = await service.createAgentInfo();

      expect(agentInfoService.createAnonymousAgentInfo).toHaveBeenCalled();
      expect(result).toEqual(anonymousAgentInfo);
    });

    it('should return cached agent info if available', async () => {
      const cachedAgentInfo = { ...mockAgentInfo };
      agentInfoCacheService.getAgentInfoFromCache.mockResolvedValue(
        cachedAgentInfo
      );

      const result = await service.createAgentInfo(mockOryIdentity);

      expect(agentInfoCacheService.getAgentInfoFromCache).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(result).toEqual(cachedAgentInfo);
    });

    it('should create new agent info when not in cache and no metadata found', async () => {
      agentInfoCacheService.getAgentInfoFromCache.mockResolvedValue(undefined);
      agentInfoService.getAgentInfoMetadata.mockResolvedValue(undefined);

      const builtAgentInfo = { ...mockAgentInfo };
      jest
        .spyOn(service as any, 'buildAgentInfoFromOrySession')
        .mockReturnValue(builtAgentInfo);

      const result = await service.createAgentInfo(
        mockOryIdentity,
        mockSession
      );

      expect(agentInfoService.getAgentInfoMetadata).toHaveBeenCalledWith(
        'test@example.com',
        { authenticationId: 'auth-id' }
      );
      expect(result).toEqual(builtAgentInfo);
    });

    it('should create complete agent info with metadata and cache it', async () => {
      agentInfoCacheService.getAgentInfoFromCache.mockResolvedValue(undefined);
      agentInfoService.getAgentInfoMetadata.mockResolvedValue(
        mockAgentInfoMetadata
      );

      const builtAgentInfo = { ...mockAgentInfo };
      jest
        .spyOn(service as any, 'buildAgentInfoFromOrySession')
        .mockReturnValue(builtAgentInfo);

      const result = await service.createAgentInfo(
        mockOryIdentity,
        mockSession
      );

      expect(
        agentInfoService.populateAgentInfoWithMetadata
      ).toHaveBeenCalledWith(builtAgentInfo, mockAgentInfoMetadata);
      expect(agentInfoCacheService.setAgentInfoCache).toHaveBeenCalledWith(
        builtAgentInfo
      );
      expect(result).toEqual(builtAgentInfo);
    });

    it('should throw NotSupportedException when email is missing', async () => {
      const invalidOryIdentity = {
        ...mockOryIdentity,
        traits: { ...mockOryIdentity.traits, email: '' },
      };

      await expect(service.createAgentInfo(invalidOryIdentity)).rejects.toThrow(
        NotSupportedException
      );
    });
  });

  describe('buildAgentInfoFromOrySession', () => {
    it('should build agent info correctly from ory session', () => {
      const result = (service as any).buildAgentInfoFromOrySession(
        mockOryIdentity,
        mockSession
      );

      expect(result).toMatchObject({
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'John',
        lastName: 'Doe',
        avatarURL: 'http://example.com/avatar.jpg',
        expiry: new Date('2023-12-31T23:59:59Z').getTime(),
      });
    });

    it('should handle unverified email', () => {
      const unverifiedOryIdentity = {
        ...mockOryIdentity,
        verifiable_addresses: [
          {
            ...mockOryIdentity.verifiable_addresses[0],
            verified: false,
          },
        ],
      };

      const result = (service as any).buildAgentInfoFromOrySession(
        unverifiedOryIdentity,
        mockSession
      );

      expect(result.emailVerified).toBe(false);
    });

    it('should handle session without expiry', () => {
      const sessionWithoutExpiry = { ...mockSession, expires_at: undefined };

      const result = (service as any).buildAgentInfoFromOrySession(
        mockOryIdentity,
        sessionWithoutExpiry
      );

      expect(result.expiry).toBeUndefined();
    });
  });

  describe('extendSession', () => {
    it('should extend session successfully', async () => {
      const bearerToken = 'admin-bearer-token';
      kratosService.getBearerToken.mockResolvedValue(bearerToken);
      kratosService.tryExtendSession.mockResolvedValue();

      await service.extendSession(mockSession);

      expect(kratosService.getBearerToken).toHaveBeenCalled();
      expect(kratosService.tryExtendSession).toHaveBeenCalledWith(
        mockSession,
        bearerToken
      );
    });
  });

  describe('shouldExtendSession', () => {
    beforeEach(() => {
      // Mock the constructor call that sets extendSessionMinRemainingTTL
      jest
        .spyOn(service as any, 'parseEarliestPossibleExtend')
        .mockReturnValue(300000); // 5 minutes
      (service as any).extendSessionMinRemainingTTL = 300000;
    });

    it('should return false when session has no expires_at', () => {
      const sessionWithoutExpiry = { ...mockSession, expires_at: undefined };

      const result = service.shouldExtendSession(sessionWithoutExpiry);

      expect(result).toBe(false);
    });

    it('should return false when extendSessionMinRemainingTTL is not set', () => {
      (service as any).extendSessionMinRemainingTTL = undefined;

      const result = service.shouldExtendSession(mockSession);

      expect(result).toBe(false);
    });

    it('should return true when extendSessionMinRemainingTTL is -1 (lifespan)', () => {
      (service as any).extendSessionMinRemainingTTL = -1;

      const result = service.shouldExtendSession(mockSession);

      expect(result).toBe(true);
    });

    it('should return true when session should be extended', () => {
      // Create a session that expires soon (less than the minimum remaining TTL)
      const soonExpiringSession = {
        ...mockSession,
        expires_at: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
      };
      (service as any).extendSessionMinRemainingTTL = 300000; // 5 minutes

      const result = service.shouldExtendSession(soonExpiringSession);

      expect(result).toBe(true);
    });

    it('should return false when session should not be extended yet', () => {
      // Create a session that expires far in the future
      const farExpiringSession = {
        ...mockSession,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };
      (service as any).extendSessionMinRemainingTTL = 300000; // 5 minutes

      const result = service.shouldExtendSession(farExpiringSession);

      expect(result).toBe(false);
    });
  });

  describe('parseEarliestPossibleExtend', () => {
    it('should return -1 for "lifespan" value', () => {
      const result = (service as any).parseEarliestPossibleExtend('lifespan');

      expect(result).toBe(-1);
    });
    it('should parse HMS string correctly', () => {
      // Mock ConfigUtils.parseHMSString to return 300 seconds (5 minutes)
      const mockConfigUtils = ConfigUtils as jest.Mocked<typeof ConfigUtils>;
      mockConfigUtils.parseHMSString = jest.fn().mockReturnValue(300);

      const result = (service as any).parseEarliestPossibleExtend('5m');

      expect(result).toBe(300000); // 300 seconds * 1000 = 300,000 milliseconds
    });

    it('should return undefined for invalid HMS string', () => {
      const mockConfigUtils = ConfigUtils as jest.Mocked<typeof ConfigUtils>;
      mockConfigUtils.parseHMSString = jest.fn().mockReturnValue(undefined);

      const result = (service as any).parseEarliestPossibleExtend('invalid');

      expect(result).toBeUndefined();
    });
    it('should return undefined for non-string values', () => {
      const result = (service as any).parseEarliestPossibleExtend(123);

      expect(result).toBeUndefined();
    });
  });

  describe('validateEmail', () => {
    it('should return traits when email is valid', () => {
      const result = (service as any).validateEmail(mockOryIdentity);

      expect(result).toEqual(mockOryIdentity.traits);
    });

    it('should throw NotSupportedException when email is missing', () => {
      const invalidOryIdentity = {
        ...mockOryIdentity,
        traits: { ...mockOryIdentity.traits, email: '' },
      };

      expect(() => (service as any).validateEmail(invalidOryIdentity)).toThrow(
        NotSupportedException
      );
    });

    it('should throw NotSupportedException when email is undefined', () => {
      const invalidOryIdentity = {
        ...mockOryIdentity,
        traits: { ...mockOryIdentity.traits, email: undefined as any },
      };

      expect(() => (service as any).validateEmail(invalidOryIdentity)).toThrow(
        NotSupportedException
      );
    });
  });

  describe('getCachedAgentInfo', () => {
    it('should return cached agent info when available', async () => {
      const cachedAgentInfo = { ...mockAgentInfo };
      agentInfoCacheService.getAgentInfoFromCache.mockResolvedValue(
        cachedAgentInfo
      );

      const result = await (service as any).getCachedAgentInfo(
        'test@example.com'
      );

      expect(agentInfoCacheService.getAgentInfoFromCache).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(result).toEqual(cachedAgentInfo);
    });

    it('should return undefined when not in cache', async () => {
      agentInfoCacheService.getAgentInfoFromCache.mockResolvedValue(undefined);

      const result = await (service as any).getCachedAgentInfo(
        'test@example.com'
      );

      expect(result).toBeUndefined();
    });
  });
});

const ConfigServiceMock = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'identity.authentication.providers.ory') {
      return {
        kratos_public_base_url_server: 'mockUrl',
        kratos_admin_base_url_server: 'mockUrl',
        admin_service_account: {
          username: 'mock',
          password: 'mock',
        },
        earliest_possible_extend: '5m',
      };
    }
    if (key === 'ssi.enabled') {
      return false;
    }
    return {};
  }),
};

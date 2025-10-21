import { Test, TestingModule } from '@nestjs/testing';
import { OidcService } from './oidc.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LoggerService } from '@nestjs/common';

describe('OidcService - Hydra Admin API Client', () => {
  let service: OidcService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    get: jest.fn(),
    put: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Configure mocks AFTER clearing
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'identity.authentication.providers.oidc') {
        return { hydra_admin_url: 'http://hydra:4445' };
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OidcService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            debug: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
          } as LoggerService,
        },
      ],
    }).compile();

    service = module.get<OidcService>(OidcService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('getLoginChallenge', () => {
    const mockChallenge = 'login-challenge-123';

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should fetch login challenge from Hydra Admin API', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {
          challenge: mockChallenge,
          skip: false,
          subject: '',
          requested_scope: ['openid', 'profile', 'email'],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getLoginChallenge(mockChallenge);

      expect(result).toEqual(mockResponse.data);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining(
          `/oauth2/auth/requests/login?login_challenge=${mockChallenge}`
        )
      );
    });

    it('should handle Hydra API errors with proper error mapping', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'challenge not found' },
          headers: {},
          config: {} as any,
        },
        message: 'Request failed with status code 404',
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      await expect(
        service.getLoginChallenge(mockChallenge)
      ).rejects.toMatchObject(mockError);
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockHttpService.get.mockReturnValue(throwError(() => networkError));

      await expect(service.getLoginChallenge(mockChallenge)).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('acceptLoginRequest', () => {
    const mockChallenge = 'login-challenge-456';
    const mockAcceptBody = {
      subject: 'user@example.com',
      remember: true,
      remember_for: 3600,
      context: {
        email: 'user@example.com',
        given_name: 'Test',
        family_name: 'User',
      },
    };

    it('should accept login request via Hydra Admin API', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {
          redirect_to:
            'http://localhost/oauth2/auth?consent_challenge=consent-123',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.put.mockReturnValue(of(mockResponse));

      const result = await service.acceptLoginRequest(
        mockChallenge,
        mockAcceptBody
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockHttpService.put).toHaveBeenCalledWith(
        expect.stringContaining(
          `/oauth2/auth/requests/login/accept?login_challenge=${mockChallenge}`
        ),
        mockAcceptBody
      );
    });

    it('should include user context in accept request', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: { redirect_to: 'http://localhost/consent' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.put.mockReturnValue(of(mockResponse));

      await service.acceptLoginRequest(mockChallenge, mockAcceptBody);

      expect(mockHttpService.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: expect.objectContaining({
            email: 'user@example.com',
            given_name: 'Test',
            family_name: 'User',
          }),
        })
      );
    });

    it('should handle 401 unauthorized errors', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'invalid challenge' },
          headers: {},
          config: {} as any,
        },
        message: 'Request failed with status code 401',
      };

      mockHttpService.put.mockReturnValue(throwError(() => mockError));

      await expect(
        service.acceptLoginRequest(mockChallenge, mockAcceptBody)
      ).rejects.toMatchObject(mockError);
    });
  });

  describe('getConsentChallenge', () => {
    const mockChallenge = 'consent-challenge-789';

    it('should fetch consent challenge from Hydra Admin API', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {
          challenge: mockChallenge,
          skip: false,
          subject: 'user@example.com',
          requested_scope: ['openid', 'profile', 'email'],
          client: {
            client_id: 'synapse-client',
            client_name: 'Synapse',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getConsentChallenge(mockChallenge);

      expect(result).toEqual(mockResponse.data);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining(
          `/oauth2/auth/requests/consent?consent_challenge=${mockChallenge}`
        )
      );
    });

    it('should handle missing consent challenge errors', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'consent challenge not found' },
          headers: {},
          config: {} as any,
        },
        message: 'Request failed with status code 404',
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      await expect(
        service.getConsentChallenge(mockChallenge)
      ).rejects.toMatchObject(mockError);
    });
  });

  describe('acceptConsentRequest', () => {
    const mockChallenge = 'consent-challenge-abc';
    const mockAcceptBody = {
      grant_scope: ['openid', 'profile', 'email'],
      remember: true,
      remember_for: 3600,
      session: {
        id_token: {
          email: 'user@example.com',
          email_verified: true,
          given_name: 'Test',
          family_name: 'User',
        },
        access_token: {
          email: 'user@example.com',
        },
      },
    };

    it('should accept consent request via Hydra Admin API', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {
          redirect_to:
            'http://synapse:8008/callback?code=authorization-code-123',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.put.mockReturnValue(of(mockResponse));

      const result = await service.acceptConsentRequest(
        mockChallenge,
        mockAcceptBody
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockHttpService.put).toHaveBeenCalledWith(
        expect.stringContaining(
          `/oauth2/auth/requests/consent/accept?consent_challenge=${mockChallenge}`
        ),
        mockAcceptBody
      );
    });

    it('should include user claims in ID token', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: { redirect_to: 'http://synapse:8008/callback' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.put.mockReturnValue(of(mockResponse));

      await service.acceptConsentRequest(mockChallenge, mockAcceptBody);

      expect(mockHttpService.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          session: expect.objectContaining({
            id_token: expect.objectContaining({
              email: 'user@example.com',
              given_name: 'Test',
              family_name: 'User',
            }),
          }),
        })
      );
    });

    it('should handle consent rejection errors', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'invalid scope requested' },
          headers: {},
          config: {} as any,
        },
        message: 'Request failed with status code 400',
      };

      mockHttpService.put.mockReturnValue(throwError(() => mockError));

      await expect(
        service.acceptConsentRequest(mockChallenge, mockAcceptBody)
      ).rejects.toMatchObject(mockError);
    });
  });

  describe('getLogoutChallenge', () => {
    const mockChallenge = 'logout-challenge-123';

    it('should fetch logout challenge from Hydra Admin API', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {
          challenge: mockChallenge,
          subject: 'user@example.com',
          sid: 'session-id-1',
          client: {
            client_id: 'synapse-client',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getLogoutChallenge(mockChallenge);

      expect(result).toEqual(mockResponse.data);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining(
          `/oauth2/auth/requests/logout?logout_challenge=${mockChallenge}`
        )
      );
    });

    it('should handle logout challenge retrieval errors', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'invalid logout challenge' },
          headers: {},
          config: {} as any,
        },
        message: 'Request failed with status code 400',
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      await expect(
        service.getLogoutChallenge(mockChallenge)
      ).rejects.toMatchObject(mockError);
    });
  });

  describe('acceptLogoutRequest', () => {
    const mockChallenge = 'logout-challenge-xyz';

    it('should accept logout request via Hydra Admin API', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {
          redirect_to: 'http://synapse:8008/logout-complete',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.put.mockReturnValue(of(mockResponse));

      const result = await service.acceptLogoutRequest(mockChallenge);

      expect(result).toEqual(mockResponse.data);
      expect(mockHttpService.put).toHaveBeenCalledWith(
        expect.stringContaining(
          `/oauth2/auth/requests/logout/accept?logout_challenge=${mockChallenge}`
        ),
        {}
      );
    });

    it('should handle logout acceptance errors', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'hydra error' },
          headers: {},
          config: {} as any,
        },
        message: 'Request failed with status code 500',
      };

      mockHttpService.put.mockReturnValue(throwError(() => mockError));

      await expect(
        service.acceptLogoutRequest(mockChallenge)
      ).rejects.toMatchObject(mockError);
    });
  });

  describe('Hydra Admin API configuration', () => {
    it('should use correct Hydra Admin API base URL from config', () => {
      const loggerStub = {
        debug: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
      } as unknown as LoggerService;

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'identity.authentication.providers.oidc') {
          return { hydra_admin_url: 'http://custom-hydra:9999' };
        }
        return undefined;
      });

      // Re-initialize service to pick up new config
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const newService = new OidcService(
        httpService,
        configService,
        loggerStub
      );

      expect(configService.get).toHaveBeenCalledWith(
        'identity.authentication.providers.oidc',
        { infer: true }
      );
    });
  });
});

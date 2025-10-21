import { Test, TestingModule } from '@nestjs/testing';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  LoginChallengeQueryDto,
  ConsentChallengeQueryDto,
  LogoutChallengeQueryDto,
} from './dto/oidc.dto';
import { ConfigService } from '@nestjs/config';
import { OidcConfig } from './oidc.config';
import { OidcLogoutService } from './oidc-logout.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

describe('OidcController', () => {
  let controller: OidcController;

  const mockOidcService = {
    getLoginChallenge: jest.fn(),
    acceptLoginRequest: jest.fn(),
    getConsentChallenge: jest.fn(),
    acceptConsentRequest: jest.fn(),
    getLogoutChallenge: jest.fn(),
    acceptLogoutRequest: jest.fn(),
  };

  const mockOidcLogoutService = {
    synchronizeMatrixSessions: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        hosting: {
          endpoint_cluster: 'http://localhost:3000',
          path_api_public_rest: '/api/public/rest',
        },
        'identity.authentication.providers.ory': {
          kratos_public_base_url: 'http://localhost:3000/ory/kratos/public',
        },
      };
      return config[key];
    }),
  } as unknown as ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OidcController],
      providers: [
        { provide: OidcService, useValue: mockOidcService },
        { provide: OidcLogoutService, useValue: mockOidcLogoutService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        OidcConfig,
      ],
    }).compile();

    controller = module.get<OidcController>(OidcController);

    // Default fetch mock to avoid real network calls

    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401 });

    jest.clearAllMocks();
  });

  describe('handleLogoutChallenge', () => {
    const mockLogoutChallenge = 'test-logout-challenge-token';
    const mockQuery: LogoutChallengeQueryDto = {
      logout_challenge: mockLogoutChallenge,
    };

    it('should throw BadRequestException when logout_challenge is missing', async () => {
      const invalidQuery = {} as LogoutChallengeQueryDto;
      const mockResponse = { redirect: jest.fn() } as any;

      await expect(
        controller.handleLogoutChallenge(invalidQuery, mockResponse)
      ).rejects.toThrow(BadRequestException);
    });

    it('should synchronize sessions and redirect on success', async () => {
      mockOidcService.getLogoutChallenge.mockResolvedValue({
        subject: 'user@example.com',
      });
      mockOidcService.acceptLogoutRequest.mockResolvedValue({
        redirect_to: 'http://localhost/post-logout',
      });
      mockOidcLogoutService.synchronizeMatrixSessions.mockResolvedValue(1);

      const mockResponse = { redirect: jest.fn() } as any;

      await controller.handleLogoutChallenge(mockQuery, mockResponse);

      expect(
        mockOidcLogoutService.synchronizeMatrixSessions
      ).toHaveBeenCalledWith('user@example.com');
      expect(mockOidcService.acceptLogoutRequest).toHaveBeenCalledWith(
        mockLogoutChallenge
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost/post-logout'
      );
    });

    it('should throw InternalServerErrorException when Hydra call fails', async () => {
      mockOidcService.getLogoutChallenge.mockRejectedValue(
        new Error('hydra offline')
      );

      const mockResponse = { redirect: jest.fn() } as any;

      await expect(
        controller.handleLogoutChallenge(mockQuery, mockResponse)
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('handleLoginChallenge', () => {
    const mockLoginChallenge = 'test-login-challenge-token';
    const mockQuery: LoginChallengeQueryDto = {
      login_challenge: mockLoginChallenge,
    };

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should throw BadRequestException when login_challenge is missing', async () => {
      const invalidQuery = {} as LoginChallengeQueryDto;
      const mockRequest = {} as any;
      const mockResponse = {
        redirect: jest.fn(),
      } as any;

      await expect(
        controller.handleLoginChallenge(invalidQuery, mockRequest, mockResponse)
      ).rejects.toThrow(BadRequestException);
    });

    it('should redirect to Kratos login when user has no session', async () => {
      mockOidcService.getLoginChallenge.mockResolvedValue({
        challenge: mockLoginChallenge,
        skip: false,
        subject: '',
      });

      const mockRequest = {
        cookies: {},
      };

      const mockResponse = {
        redirect: jest.fn(),
      } as any;

      await controller.handleLoginChallenge(
        mockQuery,
        mockRequest as any,
        mockResponse
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      expect(mockResponse.redirect.mock.calls[0][0]).toContain('kratos');
      expect(mockOidcService.getLoginChallenge).toHaveBeenCalledWith(
        mockLoginChallenge
      );
    });

    it('should accept login when skip is true', async () => {
      mockOidcService.getLoginChallenge.mockResolvedValue({
        challenge: mockLoginChallenge,
        skip: true,
        subject: 'user@example.com',
      });

      mockOidcService.acceptLoginRequest.mockResolvedValue({
        redirect_to: 'http://localhost/consent?consent_challenge=abc123',
      });

      const mockRequest = {
        cookies: { ory_kratos_session: 'valid-session-token' },
      };

      const mockResponse = {
        redirect: jest.fn(),
      } as any;

      await controller.handleLoginChallenge(
        mockQuery,
        mockRequest as any,
        mockResponse
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      expect(mockResponse.redirect.mock.calls[0][0]).toContain(
        'consent_challenge'
      );
      expect(mockOidcService.acceptLoginRequest).toHaveBeenCalledWith(
        mockLoginChallenge,
        expect.objectContaining({ subject: 'user@example.com' })
      );
    });

    it('should accept login when user has valid Kratos session', async () => {
      mockOidcService.getLoginChallenge.mockResolvedValue({
        challenge: mockLoginChallenge,
        skip: false,
        subject: '',
      });

      mockOidcService.acceptLoginRequest.mockResolvedValue({
        redirect_to: 'http://localhost/consent?consent_challenge=xyz789',
      });

      const mockRequest = {
        cookies: { ory_kratos_session: 'valid-session-token' },
      };

      const mockResponse = {
        redirect: jest.fn(),
      } as any;

      await controller.handleLoginChallenge(
        mockQuery,
        mockRequest as any,
        mockResponse
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      expect(mockOidcService.acceptLoginRequest).toHaveBeenCalled();
    });

    it('should handle Hydra API errors gracefully', async () => {
      mockOidcService.getLoginChallenge.mockRejectedValue(
        new Error('Hydra service unavailable')
      );

      const mockRequest = {
        cookies: { ory_kratos_session: 'valid-session-token' },
      };

      const mockResponse = {
        redirect: jest.fn(),
      } as any;

      await expect(
        controller.handleLoginChallenge(
          mockQuery,
          mockRequest as any,
          mockResponse
        )
      ).rejects.toThrow();
    });
  });

  describe('handleConsentChallenge', () => {
    const mockConsentChallenge = 'test-consent-challenge-token';
    const mockQuery: ConsentChallengeQueryDto = {
      consent_challenge: mockConsentChallenge,
    };

    it('should throw BadRequestException when consent_challenge is missing', async () => {
      const invalidQuery = {} as ConsentChallengeQueryDto;
      const mockResponse = {
        redirect: jest.fn(),
      } as any;

      await expect(
        controller.handleConsentChallenge(invalidQuery, mockResponse)
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept consent and redirect', async () => {
      mockOidcService.getConsentChallenge.mockResolvedValue({
        challenge: mockConsentChallenge,
        skip: false,
        subject: 'user@example.com',
        requested_scope: ['openid', 'profile', 'email'],
        context: {
          email: 'user@example.com',
          given_name: 'Test',
          family_name: 'User',
        },
      });

      mockOidcService.acceptConsentRequest.mockResolvedValue({
        redirect_to: 'http://localhost/callback',
      });

      const mockResponse = {
        redirect: jest.fn(),
      } as any;

      await controller.handleConsentChallenge(mockQuery, mockResponse);

      expect(mockResponse.redirect).toHaveBeenCalled();
      expect(mockOidcService.acceptConsentRequest).toHaveBeenCalledWith(
        mockConsentChallenge,
        expect.objectContaining({ grant_scope: ['openid', 'profile', 'email'] })
      );
    });
  });

  describe('configuration-driven URLs (T019d)', () => {
    it('should build redirect URLs from ConfigService values (no hardcoded defaults)', async () => {
      const customConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            hosting: {
              endpoint_cluster: 'http://web.example:9999',
              path_api_public_rest: '/custom/api',
            },
            'identity.authentication.providers.ory': {
              kratos_public_base_url: 'http://web.example:9999/custom/kratos',
            },
          };
          return config[key];
        }),
      } as unknown as ConfigService;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [OidcController],
        providers: [
          { provide: OidcService, useValue: mockOidcService },
          { provide: OidcLogoutService, useValue: mockOidcLogoutService },
          { provide: ConfigService, useValue: customConfigService },
          { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
          OidcConfig,
        ],
      }).compile();

      const localController = module.get<OidcController>(OidcController);

      mockOidcService.getLoginChallenge.mockResolvedValue({
        challenge: 'c1',
        skip: false,
        subject: '',
      });

      const mockRequest = { cookies: {} } as any;
      const mockResponse = { redirect: jest.fn() } as any;

      await localController.handleLoginChallenge(
        { login_challenge: 'c1' },
        mockRequest,
        mockResponse
      );

      const redirectUrl: string = mockResponse.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('http://web.example:9999');
      expect(redirectUrl).toContain(
        '/custom/kratos/self-service/login/browser'
      );
      // The return_to parameter contains the OIDC callback URL (URL-encoded)
      const decodedUrl = decodeURIComponent(redirectUrl);
      expect(decodedUrl).toContain('/custom/api/oidc/login');
    });
  });
});

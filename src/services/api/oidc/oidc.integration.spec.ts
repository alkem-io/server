import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as supertest from 'supertest';
const req = ((supertest as any).default ?? (supertest as any)) as (
  app: any
) => any;
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { OidcConfig } from './oidc.config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { OidcLogoutService } from './oidc-logout.service';
import cookieParser from 'cookie-parser';

describe('OIDC Integration Tests', () => {
  let app: INestApplication;

  const mockHttpService = {
    get: jest.fn(),
    put: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockOidcLogoutService = {
    synchronizeMatrixSessions: jest.fn().mockResolvedValue(0),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'hosting') {
        return {
          endpoint_cluster: 'http://localhost:3000',
          path_api_public_rest: '/api/public/rest',
        };
      }
      if (key === 'identity.authentication.providers.ory') {
        return {
          kratos_public_base_url: 'http://localhost:3000/ory/kratos/public',
        };
      }
      if (key === 'identity.authentication.providers.oidc') {
        return {
          hydra_admin_url: 'http://hydra:4445',
        };
      }
      return undefined;
    }),
  } as unknown as ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OidcController],
      providers: [
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: KratosService, useValue: {} },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
        { provide: OidcLogoutService, useValue: mockOidcLogoutService },
        OidcService,
        OidcConfig,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Match production global prefix used by the app
    app.setGlobalPrefix('api/public');
    app.use(cookieParser());

    // Avoid real network calls to Kratos whoami in tests

    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401 });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default fetch mock (returns 401 - no valid session)
    // Individual tests can override this for valid session scenarios
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401 });
  });

  describe('GET /api/public/rest/oidc/login (T019a)', () => {
    const mockLoginChallenge = 'test-login-challenge-token-123';

    it('should return 400 when login_challenge parameter is missing', async () => {
      return req(app.getHttpServer())
        .get('/api/public/rest/oidc/login')
        .expect(400)
        .expect((res: any) => {
          expect(res.body.message).toContain('login_challenge');
        });
    });

    it('should handle valid login_challenge and redirect to Kratos when no session exists', async () => {
      const mockHydraResponse: Partial<AxiosResponse> = {
        data: {
          challenge: mockLoginChallenge,
          skip: false,
          subject: '',
          requested_scope: ['openid', 'profile', 'email'],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockHydraResponse));

      return req(app.getHttpServer())
        .get(
          `/api/public/rest/oidc/login?login_challenge=${mockLoginChallenge}`
        )
        .expect(302)
        .expect((res: any) => {
          expect(res.headers.location).toContain('kratos');
          expect(mockHttpService.get).toHaveBeenCalledWith(
            expect.stringContaining(
              `/oauth2/auth/requests/login?login_challenge=${mockLoginChallenge}`
            )
          );
        });
    });

    it('should accept login when Kratos session cookie is present', async () => {
      // Mock Kratos whoami endpoint to return valid user session
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          identity: {
            traits: {
              email: 'testuser@example.com',
              name: {
                first: 'Test',
                last: 'User',
              },
            },
          },
        }),
      });

      const mockGetLoginResponse: Partial<AxiosResponse> = {
        data: {
          challenge: mockLoginChallenge,
          skip: false,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockAcceptLoginResponse: Partial<AxiosResponse> = {
        data: {
          redirect_to:
            'http://localhost/oauth2/auth?consent_challenge=consent-token-456',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockGetLoginResponse));
      mockHttpService.put.mockReturnValue(of(mockAcceptLoginResponse));

      return req(app.getHttpServer())
        .get(
          `/api/public/rest/oidc/login?login_challenge=${mockLoginChallenge}`
        )
        .set('Cookie', ['ory_kratos_session=valid-session-token'])
        .expect(302)
        .expect((res: any) => {
          expect(res.headers.location).toContain('consent_challenge');
          expect(mockHttpService.put).toHaveBeenCalledWith(
            expect.stringContaining('/oauth2/auth/requests/login/accept'),
            expect.objectContaining({ subject: expect.any(String) })
          );
        });
    });

    it('should skip login when Hydra indicates skip=true', async () => {
      const mockGetLoginResponse: Partial<AxiosResponse> = {
        data: {
          challenge: mockLoginChallenge,
          skip: true,
          subject: 'existing-user@example.com',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockAcceptLoginResponse: Partial<AxiosResponse> = {
        data: {
          redirect_to:
            'http://localhost/oauth2/auth?consent_challenge=consent-token-789',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockGetLoginResponse));
      mockHttpService.put.mockReturnValue(of(mockAcceptLoginResponse));

      return req(app.getHttpServer())
        .get(
          `/api/public/rest/oidc/login?login_challenge=${mockLoginChallenge}`
        )
        .expect(302)
        .expect((res: any) => {
          expect(res.headers.location).toContain('consent_challenge');
          expect(mockHttpService.put).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ subject: 'existing-user@example.com' })
          );
        });
    });

    it('should handle Hydra Admin API errors with proper error response', async () => {
      mockHttpService.get.mockImplementation(() => {
        throw new Error('Hydra service unavailable');
      });

      return req(app.getHttpServer())
        .get(
          `/api/public/rest/oidc/login?login_challenge=${mockLoginChallenge}`
        )
        .expect(500);
    });

    it('should handle invalid challenge token from Hydra', async () => {
      const mockErrorResponse = {
        response: {
          status: 404,
          data: { error: 'challenge not found' },
        },
      };

      mockHttpService.get.mockImplementation(() => {
        throw mockErrorResponse;
      });

      return req(app.getHttpServer())
        .get('/api/public/rest/oidc/login?login_challenge=invalid-challenge')
        .expect(400); // Controller converts 404 from Hydra to 400 BadRequestException
    });

    it('should pass correct subject and claims to Hydra accept API', async () => {
      // Mock Kratos whoami endpoint to return valid user session
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          identity: {
            traits: {
              email: 'testuser@example.com',
              name: {
                first: 'Test',
                last: 'User',
              },
            },
          },
        }),
      });

      const mockGetLoginResponse: Partial<AxiosResponse> = {
        data: {
          challenge: mockLoginChallenge,
          skip: false,
          subject: '',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockAcceptLoginResponse: Partial<AxiosResponse> = {
        data: {
          redirect_to: 'http://localhost/consent',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockGetLoginResponse));
      mockHttpService.put.mockReturnValue(of(mockAcceptLoginResponse));

      await req(app.getHttpServer())
        .get(
          `/api/public/rest/oidc/login?login_challenge=${mockLoginChallenge}`
        )
        .set('Cookie', ['ory_kratos_session=valid-session']);

      expect(mockHttpService.put).toHaveBeenCalledWith(
        expect.stringContaining('/oauth2/auth/requests/login/accept'),
        expect.objectContaining({
          subject: expect.any(String),
          remember: expect.any(Boolean),
        })
      );
    });
  });

  describe('GET /api/public/rest/oidc/consent (T019b)', () => {
    const mockConsentChallenge = 'consent-123';

    it('should return 400 when consent_challenge parameter is missing', async () => {
      return req(app.getHttpServer())
        .get('/api/public/rest/oidc/consent')
        .expect(400)
        .expect((res: any) => {
          expect(res.body.message).toContain('consent_challenge');
        });
    });

    it('should accept consent and redirect', async () => {
      const mockGetConsentResponse: Partial<AxiosResponse> = {
        data: {
          challenge: mockConsentChallenge,
          skip: false,
          subject: 'user@example.com',
          requested_scope: ['openid', 'profile', 'email'],
          context: {
            email: 'user@example.com',
            given_name: 'Test',
            family_name: 'User',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const mockAcceptConsentResponse: Partial<AxiosResponse> = {
        data: {
          redirect_to:
            'http://synapse:8008/callback?code=authorization-code-123',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockGetConsentResponse));
      mockHttpService.put.mockReturnValue(of(mockAcceptConsentResponse));

      return req(app.getHttpServer())
        .get(
          `/api/public/rest/oidc/consent?consent_challenge=${mockConsentChallenge}`
        )
        .expect(302)
        .expect((res: any) => {
          expect(res.headers.location).toContain('callback');
          expect(mockHttpService.put).toHaveBeenCalledWith(
            expect.stringContaining('/oauth2/auth/requests/consent/accept'),
            expect.objectContaining({
              grant_scope: ['openid', 'profile', 'email'],
            })
          );
        });
    });
  });
});

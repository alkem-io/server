import { LogContext } from '@common/enums';
import { HttpExceptionFilter } from '@core/error-handling/http.exception.filter';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import {
  INestApplication,
  LoggerService,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Identity } from '@ory/kratos-client';
import { RegistrationService } from '@services/api/registration/registration.service';
import { IdentityResolveController } from '@services/api-rest/identity-resolve/identity-resolve.controller';
import { IdentityResolveService } from '@services/api-rest/identity-resolve/identity-resolve.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import request from 'supertest';
import { Mock, vi } from 'vitest';

const buildIdentity = (overrides: Partial<Identity> = {}): Identity =>
  ({
    id: 'kratos-identity-1',
    traits: {
      email: 'user@example.com',
      name: { first: 'Test', last: 'User' },
      picture: 'https://example.com/avatar.png',
    },
    verifiable_addresses: [
      {
        via: 'email',
        verified: true,
        value: 'user@example.com',
      },
    ],
    ...overrides,
  }) as Identity;

describe('IdentityResolveController (REST)', () => {
  let app: INestApplication;
  const registrationService = {
    registerNewUser: vi.fn(),
  } as unknown as RegistrationService;
  const kratosService = {
    getIdentityById: vi.fn(),
  } as unknown as KratosService;
  const userLookupService = {
    getUserByAuthenticationID: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserByIdOrFail: vi.fn(),
  } as unknown as UserLookupService;
  const loggerMock: LoggerService & {
    log: Mock;
    warn: Mock;
    error: Mock;
    verbose: Mock;
    debug: Mock;
  } = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  };

  const authenticationId = '09d7f4d8-1c4b-4f05-9d50-3ddf2a120001';

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityResolveController],
      providers: [
        IdentityResolveService,
        { provide: RegistrationService, useValue: registrationService },
        { provide: KratosService, useValue: kratosService },
        { provide: UserLookupService, useValue: userLookupService },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: loggerMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new NestValidationPipe({ whitelist: true, transform: true })
    );
    app.useGlobalFilters(new HttpExceptionFilter(loggerMock));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns existing user when authentication ID already linked', async () => {
    (userLookupService.getUserByAuthenticationID as Mock).mockResolvedValueOnce(
      {
        id: 'user-existing',
        authenticationID: authenticationId,
      }
    );

    await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId })
      .expect(200)
      .expect({ userId: 'user-existing', actorId: 'user-existing' });

    expect(kratosService.getIdentityById).not.toHaveBeenCalled();
    expect(registrationService.registerNewUser).not.toHaveBeenCalled();
  });

  it('returns 404 when Kratos identity cannot be found', async () => {
    (userLookupService.getUserByAuthenticationID as Mock).mockResolvedValueOnce(
      null
    );
    (kratosService.getIdentityById as Mock).mockResolvedValueOnce(undefined);

    await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId })
      .expect(404);

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('no Kratos identity'),
      LogContext.AUTH
    );
  });

  it('creates a new user when identity is unknown', async () => {
    (userLookupService.getUserByAuthenticationID as Mock).mockResolvedValueOnce(
      null
    );
    (userLookupService.getUserByEmail as Mock).mockResolvedValueOnce(null);

    const identity = buildIdentity();
    (kratosService.getIdentityById as Mock).mockResolvedValueOnce(identity);

    (registrationService.registerNewUser as Mock).mockImplementationOnce(
      async kratosData => ({
        id: 'user-new',
        authenticationID: kratosData.authenticationID,
      })
    );

    (userLookupService.getUserByIdOrFail as Mock).mockResolvedValueOnce({
      id: 'user-new',
    });

    await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId })
      .expect(200)
      .expect({ userId: 'user-new', actorId: 'user-new' });

    expect(registrationService.registerNewUser).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticationID: authenticationId,
        email: 'user@example.com',
      })
    );
    expect(loggerMock.log).toHaveBeenCalledWith(
      expect.stringContaining('Identity resolve'),
      LogContext.AUTH
    );
  });

  it('rejects malformed authentication IDs', async () => {
    await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId: 'not-a-uuid' })
      .expect(400);
  });
});

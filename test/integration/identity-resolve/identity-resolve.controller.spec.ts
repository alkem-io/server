import {
  INestApplication,
  LoggerService,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { IdentityResolveController } from '@services/api-rest/identity-resolve/identity-resolve.controller';
import { IdentityResolveService } from '@services/api-rest/identity-resolve/identity-resolve.service';
import { RegistrationService } from '@services/api/registration/registration.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Identity } from '@ory/kratos-client';
import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { HttpExceptionFilter } from '@core/error-handling/http.exception.filter';

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
    registerNewUser: jest.fn(),
  } as unknown as RegistrationService;
  const kratosService = {
    getIdentityById: jest.fn(),
  } as unknown as KratosService;
  const userLookupService = {
    getUserByAuthenticationID: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserOrFail: jest.fn(),
  } as unknown as UserLookupService;
  const loggerMock: LoggerService & {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    verbose: jest.Mock;
    debug: jest.Mock;
  } = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
  };

  const authenticationId = '09d7f4d8-1c4b-4f05-9d50-3ddf2a120001';

  beforeEach(async () => {
    jest.clearAllMocks();

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
    (
      userLookupService.getUserByAuthenticationID as jest.Mock
    ).mockResolvedValueOnce({
      id: 'user-existing',
      authenticationID: authenticationId,
      agent: { id: 'agent-existing' },
    });

    await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId })
      .expect(200)
      .expect({ userId: 'user-existing', agentId: 'agent-existing' });

    expect(kratosService.getIdentityById).not.toHaveBeenCalled();
    expect(registrationService.registerNewUser).not.toHaveBeenCalled();
  });

  it('returns 404 when Kratos identity cannot be found', async () => {
    (
      userLookupService.getUserByAuthenticationID as jest.Mock
    ).mockResolvedValueOnce(null);
    (kratosService.getIdentityById as jest.Mock).mockResolvedValueOnce(
      undefined
    );

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
    (
      userLookupService.getUserByAuthenticationID as jest.Mock
    ).mockResolvedValueOnce(null);
    (userLookupService.getUserByEmail as jest.Mock).mockResolvedValueOnce(null);

    const identity = buildIdentity();
    (kratosService.getIdentityById as jest.Mock).mockResolvedValueOnce(
      identity
    );

    (registrationService.registerNewUser as jest.Mock).mockImplementationOnce(
      async (agentInfo, email, emailVerified) => ({
        id: 'user-new',
        authenticationID: agentInfo.authenticationID,
      })
    );

    (userLookupService.getUserOrFail as jest.Mock).mockResolvedValueOnce({
      id: 'user-new',
      agent: { id: 'agent-new' },
    });

    await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId })
      .expect(200)
      .expect({ userId: 'user-new', agentId: 'agent-new' });

    expect(registrationService.registerNewUser).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticationID: authenticationId,
      }),
      'user@example.com',
      true
    );
    expect(loggerMock.log).toHaveBeenCalledWith(
      expect.stringContaining('Identity resolve'),
      LogContext.AUTH
    );
  });

  it('returns an error when an existing user lacks an agent', async () => {
    (
      userLookupService.getUserByAuthenticationID as jest.Mock
    ).mockResolvedValueOnce({
      id: 'user-existing',
      authenticationID: authenticationId,
      agent: null,
    });

    const response = await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId })
      .expect(404);

    expect(response.body.code).toBe(AlkemioErrorStatus.NO_AGENT_FOR_USER);
    expect(response.body.message).toContain('Agent not found');
    expect(kratosService.getIdentityById).not.toHaveBeenCalled();
  });

  it('returns an error when the newly registered user lacks an agent', async () => {
    (
      userLookupService.getUserByAuthenticationID as jest.Mock
    ).mockResolvedValueOnce(null);
    (userLookupService.getUserByEmail as jest.Mock).mockResolvedValueOnce(null);

    const identity = buildIdentity();
    (kratosService.getIdentityById as jest.Mock).mockResolvedValueOnce(
      identity
    );

    (registrationService.registerNewUser as jest.Mock).mockResolvedValueOnce({
      id: 'user-new',
      authenticationID: authenticationId,
    });

    (userLookupService.getUserOrFail as jest.Mock).mockResolvedValueOnce({
      id: 'user-new',
      agent: undefined,
    });

    const response = await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId })
      .expect(404);

    expect(response.body.code).toBe(AlkemioErrorStatus.NO_AGENT_FOR_USER);
    expect(response.body.message).toContain('Agent not found');
    expect(registrationService.registerNewUser).toHaveBeenCalled();
  });

  it('rejects malformed authentication IDs', async () => {
    await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId: 'not-a-uuid' })
      .expect(400);
  });
});

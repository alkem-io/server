import {
  INestApplication,
  LoggerService,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { IdentityResolveController } from '@services/api-rest/identity-resolve/identity-resolve.controller';
import { IdentityResolveService } from '@services/api-rest/identity-resolve/identity-resolve.service';
import { UserIdentityService } from '@domain/community/user-identity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { HttpExceptionFilter } from '@core/error-handling/http.exception.filter';

describe('IdentityResolveController (REST)', () => {
  let app: INestApplication;
  const userIdentityService = {
    resolveByAuthenticationId: jest.fn(),
  } as unknown as UserIdentityService;
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
        { provide: UserIdentityService, useValue: userIdentityService },
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
      userIdentityService.resolveByAuthenticationId as jest.Mock
    ).mockResolvedValueOnce({
      user: {
        id: 'user-existing',
        authenticationID: authenticationId,
      },
      outcome: 'existing',
    });

    await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId })
      .expect(200)
      .expect({ actorId: 'user-existing' });

    expect(userIdentityService.resolveByAuthenticationId).toHaveBeenCalledWith(
      authenticationId,
      { assignToOrgByDomain: true }
    );
  });

  it('returns 404 when Kratos identity cannot be found', async () => {
    (
      userIdentityService.resolveByAuthenticationId as jest.Mock
    ).mockResolvedValueOnce(null);

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
      userIdentityService.resolveByAuthenticationId as jest.Mock
    ).mockResolvedValueOnce({
      user: {
        id: 'user-new',
        authenticationID: 'kratos-identity-1',
      },
      outcome: 'created',
    });

    await request(app.getHttpServer())
      .post('/rest/internal/identity/resolve')
      .send({ authenticationId })
      .expect(200)
      .expect({ actorId: 'user-new' });

    expect(userIdentityService.resolveByAuthenticationId).toHaveBeenCalledWith(
      authenticationId,
      { assignToOrgByDomain: true }
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

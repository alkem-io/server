import request from 'supertest';
import {
  INestApplication,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createIdentityResolutionTestApp } from '@test/utils';
import { IdentityResolutionController } from '@services/api-rest/identity-resolution/identity-resolution.controller';
import {
  IdentityResolutionContext,
  IdentityResolutionResult,
  IdentityResolutionService,
} from '@services/api-rest/identity-resolution/identity-resolution.service';
import { UserIdentityNotFoundException } from '@common/exceptions/user/user.identity.not.found.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const INTERNAL_IDENTITY_RESOLUTION_PATH = '/rest/internal/identity/resolve';

describe('IdentityResolutionController (e2e)', () => {
  let app: INestApplication;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  const mockResolveIdentity = jest.fn<
    Promise<IdentityResolutionResult>,
    [string, IdentityResolutionContext?]
  >();

  const identityResolutionService = {
    resolveIdentity: mockResolveIdentity,
  };

  beforeAll(async () => {
    app = await createIdentityResolutionTestApp({
      controllers: [IdentityResolutionController],
      providers: [
        {
          provide: IdentityResolutionService,
          useValue: identityResolutionService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns existing user when authId already linked', async () => {
    const userId = randomUUID();
    const correlationId = randomUUID();
    mockResolveIdentity.mockImplementation(
      async (_identity: string, context?: IdentityResolutionContext) => ({
        userId,
        created: false,
        auditId: context?.correlationId ?? randomUUID(),
      })
    );

    const response = await request(app.getHttpServer())
      .post(INTERNAL_IDENTITY_RESOLUTION_PATH)
      .set('x-correlation-id', correlationId)
      .send({ kratosIdentityId: randomUUID() })
      .expect(201);

    expect(response.headers['x-correlation-id']).toBe(correlationId);
    expect(response.body).toMatchObject({
      userId,
      created: false,
      auditId: correlationId,
    });

    expect(mockResolveIdentity).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ correlationId })
    );
  });

  it('provisions a new user when identity is unknown', async () => {
    const userId = randomUUID();
    mockResolveIdentity.mockResolvedValue({
      userId,
      created: true,
      auditId: randomUUID(),
    });

    const response = await request(app.getHttpServer())
      .post(INTERNAL_IDENTITY_RESOLUTION_PATH)
      .send({ kratosIdentityId: randomUUID() })
      .expect(201);

    expect(response.headers['x-correlation-id']).toBeDefined();
    expect(response.body).toMatchObject({
      userId,
      created: true,
    });
    expect(response.body.auditId).toBeDefined();

    expect(mockResolveIdentity).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ correlationId: expect.any(String) })
    );
  });

  it('returns 404 when the Kratos identity is not found', async () => {
    mockResolveIdentity.mockRejectedValue(
      new UserIdentityNotFoundException('identity missing')
    );

    const response = await request(app.getHttpServer())
      .post(INTERNAL_IDENTITY_RESOLUTION_PATH)
      .send({ kratosIdentityId: randomUUID() })
      .expect(404);

    expect(response.headers['x-correlation-id']).toBeDefined();
    expect(response.body.errorId).toBe(response.headers['x-correlation-id']);
    expect(response.body.code).toBe('identity_not_found');
  });

  it('returns 503 when downstream Kratos dependency is unavailable', async () => {
    mockResolveIdentity.mockRejectedValue(
      new ServiceUnavailableException('kratos offline')
    );

    const response = await request(app.getHttpServer())
      .post(INTERNAL_IDENTITY_RESOLUTION_PATH)
      .send({ kratosIdentityId: randomUUID() })
      .expect(503);

    expect(response.headers['x-correlation-id']).toBeDefined();
    expect(response.body.errorId).toBe(response.headers['x-correlation-id']);
    expect(response.body.code).toBe('kratos_unavailable');
  });
});

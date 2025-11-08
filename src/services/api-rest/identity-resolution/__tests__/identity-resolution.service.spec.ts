import { ServiceUnavailableException } from '@nestjs/common';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import {
  IdentityResolutionFailureReason,
  IdentityResolutionMetrics,
  IdentityResolutionResult,
  IdentityResolutionService,
} from '../identity-resolution.service';
import { DuplicateAuthIdException } from '@common/exceptions/user/duplicate.authid.exception';
import { UserIdentityNotFoundException } from '@common/exceptions/user/user.identity.not.found.exception';
import { getKratosIdentityFixture } from '@test/utils';

const createAgentInfo = () => {
  const agentInfo = new AgentInfo();
  agentInfo.email = 'linked.user@example.com';
  agentInfo.emailVerified = true;
  agentInfo.firstName = 'Linked';
  agentInfo.lastName = 'User';
  return agentInfo;
};

describe('IdentityResolutionService', () => {
  let service: IdentityResolutionService;

  const userLookupService = {
    getUserByAuthId: jest.fn(),
  } as any;

  const registrationService = {
    registerNewUser: jest.fn(),
  } as any;

  const userService = {
    assignAuthId: jest.fn(),
  } as any;

  const kratosService = {
    getIdentityById: jest.fn(),
  } as any;

  const authenticationService = {
    createAgentInfo: jest.fn(),
  } as any;

  const metrics: jest.Mocked<IdentityResolutionMetrics> = {
    recordLookupHit: jest.fn(),
    recordProvision: jest.fn(),
    recordFailure: jest.fn(),
  } as unknown as jest.Mocked<IdentityResolutionMetrics>;

  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new IdentityResolutionService(
      userLookupService,
      registrationService,
      userService,
      kratosService,
      authenticationService,
      metrics,
      logger
    );
  });

  it('returns existing user when authId is already linked', async () => {
    const existingUserId = 'user-123';
    userLookupService.getUserByAuthId.mockResolvedValue({ id: existingUserId });

    const result = await service.resolveIdentity('known-auth-id');

    expect(result).toMatchObject<Partial<IdentityResolutionResult>>({
      userId: existingUserId,
      created: false,
    });
    expect(metrics.recordLookupHit).toHaveBeenCalledWith(result);
    expect(kratosService.getIdentityById).not.toHaveBeenCalled();
    expect(registrationService.registerNewUser).not.toHaveBeenCalled();
  });

  it('provisions a user when identity is unknown', async () => {
    const identity = getKratosIdentityFixture('newUser');
    const agentInfo = createAgentInfo();
    const newUserId = 'provisioned-user';

    userLookupService.getUserByAuthId.mockResolvedValue(null);
    kratosService.getIdentityById.mockResolvedValue(identity);
    authenticationService.createAgentInfo.mockResolvedValue(agentInfo);
    registrationService.registerNewUser.mockResolvedValue({ id: newUserId });

    const result = await service.resolveIdentity(identity.id);

    expect(result).toMatchObject<Partial<IdentityResolutionResult>>({
      userId: newUserId,
      created: true,
    });
    expect(metrics.recordProvision).toHaveBeenCalledWith(result);
    expect(registrationService.registerNewUser).toHaveBeenCalledWith(agentInfo);
    // Note: assignAuthId is called internally by registerNewUser -> createUserFromAgentInfo
  });

  it('uses provided correlation identifier as auditId', async () => {
    const identity = getKratosIdentityFixture('newUser');
    const agentInfo = createAgentInfo();
    const correlationId = '95c89d8c-f6c5-4e9f-a4cb-7c08435cbb4e';

    userLookupService.getUserByAuthId.mockResolvedValue(null);
    kratosService.getIdentityById.mockResolvedValue(identity);
    authenticationService.createAgentInfo.mockResolvedValue(agentInfo);
    registrationService.registerNewUser.mockResolvedValue({ id: 'u-2' });

    const result = await service.resolveIdentity(identity.id, {
      correlationId,
    });

    expect(result.auditId).toBe(correlationId);
    expect(metrics.recordProvision).toHaveBeenCalledWith(
      expect.objectContaining({ auditId: correlationId })
    );
  });

  it('throws UserIdentityNotFoundException when Kratos is missing the identity', async () => {
    userLookupService.getUserByAuthId.mockResolvedValue(null);
    kratosService.getIdentityById.mockResolvedValue(undefined);

    await expect(service.resolveIdentity('missing')).rejects.toBeInstanceOf(
      UserIdentityNotFoundException
    );
    expect(metrics.recordFailure).toHaveBeenCalledWith(
      IdentityResolutionFailureReason.IDENTITY_NOT_FOUND
    );
  });

  it('propagates DuplicateAuthIdException when authId already assigned', async () => {
    const identity = getKratosIdentityFixture('existingUser');
    const agentInfo = createAgentInfo();
    const duplicateError = new DuplicateAuthIdException(identity.id);

    userLookupService.getUserByAuthId.mockResolvedValue(null);
    kratosService.getIdentityById.mockResolvedValue(identity);
    authenticationService.createAgentInfo.mockResolvedValue(agentInfo);
    // registerNewUser calls createUserFromAgentInfo which calls assignAuthId internally
    registrationService.registerNewUser.mockRejectedValue(duplicateError);

    await expect(service.resolveIdentity(identity.id)).rejects.toBe(
      duplicateError
    );
    // Note: Since assignAuthId is called within registerNewUser, the error
    // propagates during registration, not from a separate assignment call
    expect(metrics.recordFailure).toHaveBeenCalledWith(
      IdentityResolutionFailureReason.UNEXPECTED
    );
  });

  it('wraps unexpected Kratos errors as ServiceUnavailableException', async () => {
    userLookupService.getUserByAuthId.mockResolvedValue(null);
    kratosService.getIdentityById.mockRejectedValue(new Error('boom'));

    await expect(service.resolveIdentity('erroring')).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
    expect(metrics.recordFailure).toHaveBeenCalledWith(
      IdentityResolutionFailureReason.KRATOS_UNAVAILABLE
    );
  });
});

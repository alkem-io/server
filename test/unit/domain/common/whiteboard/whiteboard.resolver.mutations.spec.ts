import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { WhiteboardGuestAccessService } from '@domain/common/whiteboard/whiteboard.guest-access.service';
import { WhiteboardResolverMutations } from '@domain/common/whiteboard/whiteboard.resolver.mutations';
import { LoggerService } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UpdateWhiteboardGuestAccessInput } from '@domain/common/whiteboard/dto/whiteboard.dto.guest-access.toggle';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

const createResolver = () => {
  const authorizationService = {
    grantAccessOrFail: jest.fn(),
  } as unknown as jest.Mocked<AuthorizationService>;

  const authorizationPolicyService = {
    save: jest.fn(),
  } as unknown as jest.Mocked<AuthorizationPolicyService>;

  const whiteboardService = {
    getWhiteboardOrFail: jest.fn(),
  } as unknown as jest.Mocked<WhiteboardService>;

  const whiteboardAuthorizationService = {
    applyAuthorizationPolicy: jest.fn(),
  } as unknown as jest.Mocked<WhiteboardAuthorizationService>;

  const whiteboardGuestAccessService = {
    updateGuestAccess: jest.fn(),
  } as unknown as jest.Mocked<WhiteboardGuestAccessService>;

  const entityManager = {
    findOne: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<EntityManager>;

  const logger = {
    verbose: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<LoggerService>;

  const resolver = new WhiteboardResolverMutations(
    authorizationService,
    authorizationPolicyService,
    whiteboardService,
    whiteboardAuthorizationService,
    whiteboardGuestAccessService,
    entityManager,
    logger
  );

  return {
    resolver,
    whiteboardGuestAccessService,
  };
};

describe('WhiteboardResolverMutations - updateWhiteboardGuestAccess', () => {
  it('returns success payload when toggle completes', async () => {
    const { resolver, whiteboardGuestAccessService } = createResolver();
    const agentInfo = new AgentInfo();
    agentInfo.userID = 'user-1';
    const whiteboard = { id: 'wb-1' } as IWhiteboard;
    whiteboardGuestAccessService.updateGuestAccess.mockResolvedValueOnce(
      whiteboard
    );

    const input: UpdateWhiteboardGuestAccessInput = {
      whiteboardId: 'wb-1',
      guestAccessEnabled: true,
    };

    const result = await resolver.updateWhiteboardGuestAccess(agentInfo, input);

    expect(whiteboardGuestAccessService.updateGuestAccess).toHaveBeenCalledWith(
      agentInfo,
      'wb-1',
      true
    );
    expect(result.success).toBe(true);
    expect(result.whiteboard).toBe(whiteboard);
    expect(result.errors).toBeUndefined();
  });

  it('returns structured error when authorization fails', async () => {
    const { resolver, whiteboardGuestAccessService } = createResolver();
    const agentInfo = new AgentInfo();
    agentInfo.userID = 'user-2';
    const exception = new ForbiddenAuthorizationPolicyException(
      'missing PUBLIC_SHARE',
      AuthorizationPrivilege.PUBLIC_SHARE,
      'auth-1',
      'user-2'
    );
    whiteboardGuestAccessService.updateGuestAccess.mockRejectedValueOnce(
      exception
    );

    const input: UpdateWhiteboardGuestAccessInput = {
      whiteboardId: 'wb-2',
      guestAccessEnabled: false,
    };

    const result = await resolver.updateWhiteboardGuestAccess(agentInfo, input);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].code).toBe('NOT_AUTHORIZED');
  });

  it('maps ForbiddenException with space message to SPACE_GUEST_DISABLED', async () => {
    const { resolver, whiteboardGuestAccessService } = createResolver();
    const agentInfo = new AgentInfo();
    agentInfo.userID = 'user-3';
    whiteboardGuestAccessService.updateGuestAccess.mockRejectedValueOnce(
      new ForbiddenException(
        'Guest contributions are disabled for the space',
        LogContext.COLLABORATION
      )
    );

    const result = await resolver.updateWhiteboardGuestAccess(agentInfo, {
      whiteboardId: 'wb-3',
      guestAccessEnabled: true,
    });

    expect(result.success).toBe(false);
    expect(result.errors?.[0].code).toBe('SPACE_GUEST_DISABLED');
    expect(result.whiteboard).toBeUndefined();
  });

  it('maps EntityNotFoundException to WHITEBOARD_NOT_FOUND', async () => {
    const { resolver, whiteboardGuestAccessService } = createResolver();
    const agentInfo = new AgentInfo();
    agentInfo.userID = 'user-4';
    whiteboardGuestAccessService.updateGuestAccess.mockRejectedValueOnce(
      new EntityNotFoundException(
        'missing whiteboard',
        LogContext.COLLABORATION
      )
    );

    const result = await resolver.updateWhiteboardGuestAccess(agentInfo, {
      whiteboardId: 'wb-unknown',
      guestAccessEnabled: true,
    });

    expect(result.success).toBe(false);
    expect(result.errors?.[0].code).toBe('WHITEBOARD_NOT_FOUND');
  });
});

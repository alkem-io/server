import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateWhiteboardGuestAccessInput } from '@domain/common/whiteboard/dto/whiteboard.dto.guest-access.toggle';
import { WhiteboardGuestAccessService } from '@domain/common/whiteboard/whiteboard.guest-access.service';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { WhiteboardResolverMutations } from '@domain/common/whiteboard/whiteboard.resolver.mutations';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { LoggerService } from '@nestjs/common';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';

const createResolver = () => {
  const authorizationService = {
    grantAccessOrFail: vi.fn(),
  } as unknown as Mocked<AuthorizationService>;

  const authorizationPolicyService = {
    save: vi.fn(),
  } as unknown as Mocked<AuthorizationPolicyService>;

  const whiteboardService = {
    getWhiteboardOrFail: vi.fn(),
  } as unknown as Mocked<WhiteboardService>;

  const whiteboardAuthorizationService = {
    applyAuthorizationPolicy: vi.fn(),
  } as unknown as Mocked<WhiteboardAuthorizationService>;

  const whiteboardGuestAccessService = {
    updateGuestAccess: vi.fn(),
  } as unknown as Mocked<WhiteboardGuestAccessService>;

  const communityResolverService = {
    getCommunityFromWhiteboardOrFail: vi.fn(),
    getSpaceForCommunityOrFail: vi.fn(),
  } as unknown as Mocked<CommunityResolverService>;

  const entityManager = {
    findOne: vi.fn(),
    save: vi.fn(),
  } as unknown as Mocked<EntityManager>;

  const logger = {
    verbose: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  } as unknown as Mocked<LoggerService>;

  const resolver = new WhiteboardResolverMutations(
    authorizationService,
    authorizationPolicyService,
    whiteboardService,
    whiteboardAuthorizationService,
    whiteboardGuestAccessService,
    communityResolverService,
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
    const actorContext = new ActorContext();
    actorContext.actorID = 'user-1';
    const whiteboard = { id: 'wb-1' } as IWhiteboard;
    whiteboardGuestAccessService.updateGuestAccess.mockResolvedValueOnce(
      whiteboard
    );

    const input: UpdateWhiteboardGuestAccessInput = {
      whiteboardId: 'wb-1',
      guestAccessEnabled: true,
    };

    const result = await resolver.updateWhiteboardGuestAccess(
      actorContext,
      input
    );

    expect(whiteboardGuestAccessService.updateGuestAccess).toHaveBeenCalledWith(
      actorContext,
      'wb-1',
      true
    );
    expect(result.success).toBe(true);
    expect(result.whiteboard).toBe(whiteboard);
  });

  it('returns success payload when disabling guest access', async () => {
    const { resolver, whiteboardGuestAccessService } = createResolver();
    const actorContext = new ActorContext();
    actorContext.actorID = 'user-1';
    const whiteboard = {
      id: 'wb-1',
      guestContributionsAllowed: false,
    } as IWhiteboard;
    whiteboardGuestAccessService.updateGuestAccess.mockResolvedValueOnce(
      whiteboard
    );

    const result = await resolver.updateWhiteboardGuestAccess(actorContext, {
      whiteboardId: 'wb-1',
      guestAccessEnabled: false,
    });

    expect(whiteboardGuestAccessService.updateGuestAccess).toHaveBeenCalledWith(
      actorContext,
      'wb-1',
      false
    );
    expect(result.success).toBe(true);
    expect(result.whiteboard?.guestContributionsAllowed).toBe(false);
  });

  it('rethrows authorization failure so GraphQL surfaces the error', async () => {
    const { resolver, whiteboardGuestAccessService } = createResolver();
    const actorContext = new ActorContext();
    actorContext.actorID = 'user-2';
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

    await expect(
      resolver.updateWhiteboardGuestAccess(actorContext, input)
    ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
  });

  it('rethrows forbidden errors for GraphQL handling', async () => {
    const { resolver, whiteboardGuestAccessService } = createResolver();
    const actorContext = new ActorContext();
    actorContext.actorID = 'user-3';
    const exception = new ForbiddenException(
      'Guest contributions are disabled for the space',
      LogContext.COLLABORATION
    );
    whiteboardGuestAccessService.updateGuestAccess.mockRejectedValueOnce(
      exception
    );

    await expect(
      resolver.updateWhiteboardGuestAccess(actorContext, {
        whiteboardId: 'wb-3',
        guestAccessEnabled: true,
      })
    ).rejects.toBe(exception);
  });

  it('rethrows not found exceptions', async () => {
    const { resolver, whiteboardGuestAccessService } = createResolver();
    const actorContext = new ActorContext();
    actorContext.actorID = 'user-4';
    const exception = new EntityNotFoundException(
      'missing whiteboard',
      LogContext.COLLABORATION
    );
    whiteboardGuestAccessService.updateGuestAccess.mockRejectedValueOnce(
      exception
    );

    await expect(
      resolver.updateWhiteboardGuestAccess(actorContext, {
        whiteboardId: 'wb-unknown',
        guestAccessEnabled: true,
      })
    ).rejects.toBe(exception);
  });

  it('propagates unexpected errors to preserve stack traces', async () => {
    const { resolver, whiteboardGuestAccessService } = createResolver();
    const actorContext = new ActorContext();
    actorContext.actorID = 'user-5';
    const exception = new Error('boom');
    whiteboardGuestAccessService.updateGuestAccess.mockRejectedValueOnce(
      exception
    );

    await expect(
      resolver.updateWhiteboardGuestAccess(actorContext, {
        whiteboardId: 'wb-err',
        guestAccessEnabled: false,
      })
    ).rejects.toBe(exception);
  });
});

import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { WhiteboardGuestAccessService } from '@domain/common/whiteboard/whiteboard.guest-access.service';
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
    saveAll: vi.fn(),
  } as unknown as Mocked<AuthorizationPolicyService>;

  const whiteboardService = {
    getWhiteboardOrFail: vi.fn(),
    updateWhiteboard: vi.fn(),
    deleteWhiteboard: vi.fn(),
  } as unknown as Mocked<WhiteboardService>;

  const whiteboardAuthService = {
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
  } as unknown as Mocked<EntityManager>;

  const logger = {
    verbose: vi.fn(),
    warn: vi.fn(),
  } as unknown as Mocked<LoggerService>;

  const resolver = new WhiteboardResolverMutations(
    authorizationService,
    authorizationPolicyService,
    whiteboardService,
    whiteboardAuthService,
    whiteboardGuestAccessService,
    communityResolverService,
    entityManager,
    logger
  );

  return {
    resolver,
    authorizationService,
    whiteboardService,
    whiteboardAuthService,
    authorizationPolicyService,
    communityResolverService,
    entityManager,
    logger,
  };
};

describe('WhiteboardResolverMutations - updateWhiteboard', () => {
  const actorContext = new ActorContext();
  actorContext.actorID = 'user-1';

  it('updates whiteboard without re-applying auth when contentUpdatePolicy is unchanged', async () => {
    const { resolver, whiteboardService, authorizationService } =
      createResolver();

    const whiteboard = {
      id: 'wb-1',
      contentUpdatePolicy: 'CONTRIBUTORS',
      authorization: { id: 'auth-1' },
    } as any;
    whiteboardService.getWhiteboardOrFail
      .mockResolvedValueOnce(whiteboard)
      .mockResolvedValueOnce(whiteboard);
    whiteboardService.updateWhiteboard.mockResolvedValueOnce(whiteboard);

    const result = await resolver.updateWhiteboard(actorContext, {
      ID: 'wb-1',
    } as any);

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      whiteboard.authorization,
      AuthorizationPrivilege.UPDATE,
      expect.any(String)
    );
    expect(result).toBe(whiteboard);
  });

  it('re-applies auth policy via framing when contentUpdatePolicy changes', async () => {
    const {
      resolver,
      whiteboardService,
      whiteboardAuthService,
      authorizationPolicyService,
      communityResolverService,
      entityManager,
    } = createResolver();

    const whiteboard = {
      id: 'wb-1',
      contentUpdatePolicy: 'CONTRIBUTORS',
      authorization: { id: 'auth-1' },
    } as any;
    const updatedWhiteboard = {
      ...whiteboard,
      contentUpdatePolicy: 'ADMINS',
    };

    whiteboardService.getWhiteboardOrFail
      .mockResolvedValueOnce(whiteboard)
      .mockResolvedValueOnce(updatedWhiteboard);
    whiteboardService.updateWhiteboard.mockResolvedValueOnce(updatedWhiteboard);

    communityResolverService.getCommunityFromWhiteboardOrFail.mockResolvedValueOnce(
      { id: 'comm-1' } as any
    );
    communityResolverService.getSpaceForCommunityOrFail.mockResolvedValueOnce({
      settings: { privacy: {} },
    } as any);

    const framing = { authorization: { id: 'framing-auth-1' } } as any;
    entityManager.findOne.mockResolvedValueOnce(framing);
    whiteboardAuthService.applyAuthorizationPolicy.mockResolvedValueOnce([]);
    authorizationPolicyService.saveAll.mockResolvedValueOnce(undefined as any);

    await resolver.updateWhiteboard(actorContext, { ID: 'wb-1' } as any);

    expect(whiteboardAuthService.applyAuthorizationPolicy).toHaveBeenCalledWith(
      'wb-1',
      framing.authorization,
      expect.anything()
    );
  });

  it('re-applies auth policy via contribution when no framing found', async () => {
    const {
      resolver,
      whiteboardService,
      whiteboardAuthService,
      authorizationPolicyService,
      communityResolverService,
      entityManager,
    } = createResolver();

    const whiteboard = {
      id: 'wb-1',
      contentUpdatePolicy: 'CONTRIBUTORS',
      authorization: { id: 'auth-1' },
    } as any;
    const updatedWhiteboard = {
      ...whiteboard,
      contentUpdatePolicy: 'ADMINS',
    };

    whiteboardService.getWhiteboardOrFail
      .mockResolvedValueOnce(whiteboard)
      .mockResolvedValueOnce(updatedWhiteboard);
    whiteboardService.updateWhiteboard.mockResolvedValueOnce(updatedWhiteboard);

    communityResolverService.getCommunityFromWhiteboardOrFail.mockResolvedValueOnce(
      { id: 'comm-1' } as any
    );
    communityResolverService.getSpaceForCommunityOrFail.mockResolvedValueOnce({
      settings: {},
    } as any);

    // No framing found
    entityManager.findOne.mockResolvedValueOnce(null);
    // Contribution found
    const contribution = {
      authorization: { id: 'contrib-auth-1' },
    } as any;
    entityManager.findOne.mockResolvedValueOnce(contribution);
    whiteboardAuthService.applyAuthorizationPolicy.mockResolvedValueOnce([]);
    authorizationPolicyService.saveAll.mockResolvedValueOnce(undefined as any);

    await resolver.updateWhiteboard(actorContext, { ID: 'wb-1' } as any);

    expect(whiteboardAuthService.applyAuthorizationPolicy).toHaveBeenCalledWith(
      'wb-1',
      contribution.authorization,
      expect.anything()
    );
  });

  it('logs warning and returns undefined settings when space resolution fails', async () => {
    const {
      resolver,
      whiteboardService,
      communityResolverService,
      entityManager,
      logger,
    } = createResolver();

    const whiteboard = {
      id: 'wb-1',
      contentUpdatePolicy: 'CONTRIBUTORS',
      authorization: { id: 'auth-1' },
    } as any;
    const updatedWhiteboard = {
      ...whiteboard,
      contentUpdatePolicy: 'ADMINS',
    };

    whiteboardService.getWhiteboardOrFail
      .mockResolvedValueOnce(whiteboard)
      .mockResolvedValueOnce(updatedWhiteboard);
    whiteboardService.updateWhiteboard.mockResolvedValueOnce(updatedWhiteboard);

    communityResolverService.getCommunityFromWhiteboardOrFail.mockRejectedValueOnce(
      new Error('not found')
    );

    // No framing, no contribution
    entityManager.findOne.mockResolvedValueOnce(null);
    entityManager.findOne.mockResolvedValueOnce(null);

    await resolver.updateWhiteboard(actorContext, { ID: 'wb-1' } as any);

    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('WhiteboardResolverMutations - deleteWhiteboard', () => {
  const actorContext = new ActorContext();
  actorContext.actorID = 'user-1';

  it('authorizes with DELETE and delegates to whiteboardService.deleteWhiteboard', async () => {
    const { resolver, authorizationService, whiteboardService } =
      createResolver();

    const whiteboard = {
      id: 'wb-1',
      authorization: { id: 'auth-1' },
    } as any;
    whiteboardService.getWhiteboardOrFail.mockResolvedValueOnce(whiteboard);
    whiteboardService.deleteWhiteboard.mockResolvedValueOnce(whiteboard);

    const result = await resolver.deleteWhiteboard(actorContext, {
      ID: 'wb-1',
    });

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      whiteboard.authorization,
      AuthorizationPrivilege.DELETE,
      expect.any(String)
    );
    expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith('wb-1');
    expect(result).toBe(whiteboard);
  });
});

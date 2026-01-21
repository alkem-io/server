import { vi } from 'vitest';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { WhiteboardGuestAccessService } from '@domain/common/whiteboard/whiteboard.guest-access.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ISpace } from '@domain/space/space/space.interface';
import { LoggerService } from '@nestjs/common';
import { ForbiddenException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import type { Mocked } from 'vitest';

describe('WhiteboardGuestAccessService', () => {
  const createAuthorization = () => {
    const authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.WHITEBOARD
    );
    authorization.id = 'authorization-1';
    authorization.credentialRules = [];
    authorization.privilegeRules = [];
    return authorization;
  };

  const createWhiteboard = (authorization: AuthorizationPolicy) => {
    return {
      id: 'whiteboard-1',
      authorization,
      profile: {
        id: 'profile-1',
      },
    } as unknown as IWhiteboard;
  };

  const createSpace = (allowGuestContributions: boolean) => {
    return {
      id: 'space-1',
      settings: {
        collaboration: {
          allowGuestContributions,
        },
      },
    } as unknown as ISpace;
  };

  let whiteboardService: Mocked<WhiteboardService>;
  let authorizationService: Mocked<AuthorizationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let communityResolverService: Mocked<CommunityResolverService>;
  let profileAuthService: Mocked<ProfileAuthorizationService>;
  let logger: Mocked<LoggerService>;
  let service: WhiteboardGuestAccessService;

  beforeEach(() => {
    whiteboardService = {
      getWhiteboardOrFail: vi.fn(),
    } as unknown as Mocked<WhiteboardService>;

    authorizationService = {
      grantAccessOrFail: vi.fn().mockReturnValue(true),
    } as unknown as Mocked<AuthorizationService>;

    authorizationPolicyService = {
      save: vi.fn(async auth => auth),
      saveAll: vi.fn(async auths => auths),
      authorizationSelectOptions: {
        id: true,
        credentialRules: true,
        privilegeRules: true,
      } as any,
    } as unknown as Mocked<AuthorizationPolicyService>;

    communityResolverService = {
      getCommunityFromWhiteboardOrFail: vi
        .fn()
        .mockResolvedValue({ id: 'community-1' }),
      getSpaceForCommunityOrFail: vi
        .fn()
        .mockResolvedValue(createSpace(true)),
    } as unknown as Mocked<CommunityResolverService>;

    profileAuthService = {
      applyAuthorizationPolicy: vi.fn(),
    } as unknown as Mocked<ProfileAuthorizationService>;

    logger = {
      verbose: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    } as unknown as Mocked<LoggerService>;

    service = new WhiteboardGuestAccessService(
      whiteboardService,
      authorizationService,
      authorizationPolicyService,
      communityResolverService,
      profileAuthService,
      logger
    );
  });

  describe('updateGuestAccess', () => {
    it('grants combined public access privileges when enabling and remains idempotent', async () => {
      const authorization = createAuthorization();
      const whiteboard = createWhiteboard(authorization);
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(whiteboard);

      const agentInfo = new AgentInfo();
      agentInfo.userID = 'user-1';

      const result = await service.updateGuestAccess(
        agentInfo,
        whiteboard.id,
        true
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        agentInfo,
        authorization,
        AuthorizationPrivilege.PUBLIC_SHARE,
        expect.stringContaining(whiteboard.id)
      );

      expect(authorizationPolicyService.save).toHaveBeenCalledTimes(1);

      const publicAccessRule = authorization.credentialRules.find(
        rule => rule.name === 'public-access'
      );
      expect(publicAccessRule).toBeDefined();
      expect(publicAccessRule?.grantedPrivileges).toEqual(
        expect.arrayContaining([
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE_CONTENT,
          AuthorizationPrivilege.CONTRIBUTE,
        ])
      );
      expect(publicAccessRule?.criterias).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: AuthorizationCredential.GLOBAL_GUEST,
          }),
          expect.objectContaining({
            type: AuthorizationCredential.GLOBAL_REGISTERED,
          }),
        ])
      );
      expect(result.guestContributionsAllowed).toBe(true);

      authorizationPolicyService.save.mockClear();
      const secondResult = await service.updateGuestAccess(
        agentInfo,
        whiteboard.id,
        true
      );

      expect(authorizationPolicyService.save).not.toHaveBeenCalled();
      expect(secondResult.guestContributionsAllowed).toBe(true);
      const publicRules = authorization.credentialRules.filter(
        rule => rule.name === 'public-access'
      );
      expect(publicRules).toHaveLength(1);
    });

    it('removes public access privileges when disabling and remains idempotent', async () => {
      const authorization = createAuthorization();
      authorization.credentialRules.push({
        name: 'public-access',
        cascade: true,
        criterias: [
          {
            type: AuthorizationCredential.GLOBAL_GUEST,
            resourceID: '',
          },
          {
            type: AuthorizationCredential.GLOBAL_REGISTERED,
            resourceID: '',
          },
        ],
        grantedPrivileges: [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.CONTRIBUTE,
        ],
      });
      authorization.credentialRules.push({
        name: 'whiteboard-owner-manage',
        cascade: true,
        criterias: [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: 'owner-1',
          },
        ],
        grantedPrivileges: [
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
      });
      const whiteboard = createWhiteboard(authorization);
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(whiteboard);

      const agentInfo = new AgentInfo();
      agentInfo.userID = 'user-1';

      const result = await service.updateGuestAccess(
        agentInfo,
        whiteboard.id,
        false
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        agentInfo,
        authorization,
        AuthorizationPrivilege.PUBLIC_SHARE,
        expect.stringContaining(whiteboard.id)
      );
      expect(authorizationPolicyService.save).toHaveBeenCalledTimes(1);
      expect(
        authorization.credentialRules.some(rule =>
          rule.criterias.some(
            criteria =>
              criteria.type === AuthorizationCredential.GLOBAL_GUEST ||
              criteria.type === AuthorizationCredential.GLOBAL_REGISTERED
          )
        )
      ).toBe(false);
      expect(
        authorization.credentialRules.some(
          rule => rule.name === 'whiteboard-owner-manage'
        )
      ).toBe(true);
      expect(result.guestContributionsAllowed).toBe(false);

      authorizationPolicyService.save.mockClear();
      const secondResult = await service.updateGuestAccess(
        agentInfo,
        whiteboard.id,
        false
      );

      expect(authorizationPolicyService.save).not.toHaveBeenCalled();
      expect(secondResult.guestContributionsAllowed).toBe(false);
      expect(
        authorization.credentialRules.some(rule =>
          rule.criterias.some(
            criteria =>
              criteria.type === AuthorizationCredential.GLOBAL_GUEST ||
              criteria.type === AuthorizationCredential.GLOBAL_REGISTERED
          )
        )
      ).toBe(false);
      expect(
        authorization.credentialRules.some(
          rule => rule.name === 'whiteboard-owner-manage'
        )
      ).toBe(true);
    });

    it('applies the final requested state when toggles alternate', async () => {
      const authorization = createAuthorization();
      const whiteboard = createWhiteboard(authorization);
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(whiteboard);

      const agentInfo = new AgentInfo();
      agentInfo.userID = 'user-2';

      await service.updateGuestAccess(agentInfo, whiteboard.id, true);

      const disableResult = await service.updateGuestAccess(
        agentInfo,
        whiteboard.id,
        false
      );

      expect(disableResult.guestContributionsAllowed).toBe(false);
      expect(
        authorization.credentialRules.some(rule =>
          rule.criterias.some(
            criteria => criteria.type === AuthorizationCredential.GLOBAL_GUEST
          )
        )
      ).toBe(false);
      expect(
        authorization.credentialRules.some(
          rule => rule.name === 'public-access'
        )
      ).toBe(false);
      expect(authorizationPolicyService.save).toHaveBeenCalledTimes(2);
    });

    it('throws when PUBLIC_SHARE is missing and leaves authorization untouched', async () => {
      const authorization = createAuthorization();
      const whiteboard = createWhiteboard(authorization);
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(whiteboard);

      const agentInfo = new AgentInfo();
      agentInfo.userID = 'user-3';

      authorizationService.grantAccessOrFail.mockImplementationOnce(() => {
        throw new ForbiddenAuthorizationPolicyException(
          'missing PUBLIC_SHARE',
          AuthorizationPrivilege.PUBLIC_SHARE,
          authorization.id,
          agentInfo.userID
        );
      });

      await expect(
        service.updateGuestAccess(agentInfo, whiteboard.id, true)
      ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
      expect(authorizationPolicyService.save).not.toHaveBeenCalled();
      expect(
        authorization.credentialRules.some(rule =>
          rule.criterias.some(
            criteria => criteria.type === AuthorizationCredential.GLOBAL_GUEST
          )
        )
      ).toBe(false);
    });

    it('rehydrates the whiteboard before returning the response', async () => {
      const authorization = createAuthorization();
      const thinWhiteboard = createWhiteboard(authorization);
      const hydratedWhiteboard = {
        ...thinWhiteboard,
        nameID: 'wb-name-id',
        title: 'Whiteboard Name',
      } as IWhiteboard;

      whiteboardService.getWhiteboardOrFail
        .mockResolvedValueOnce(thinWhiteboard)
        .mockResolvedValueOnce(hydratedWhiteboard);

      const agentInfo = new AgentInfo();
      agentInfo.userID = 'user-4';

      const result = await service.updateGuestAccess(
        agentInfo,
        thinWhiteboard.id,
        true
      );

      expect(whiteboardService.getWhiteboardOrFail).toHaveBeenCalledTimes(2);
      expect(whiteboardService.getWhiteboardOrFail).toHaveBeenNthCalledWith(
        2,
        thinWhiteboard.id
      );
      expect(result).toBe(hydratedWhiteboard);
      expect(result.nameID).toBe('wb-name-id');
      expect(result.guestContributionsAllowed).toBe(true);
    });

    it('throws ForbiddenException when space disallows guest contributions', async () => {
      const authorization = createAuthorization();
      const whiteboard = createWhiteboard(authorization);
      whiteboardService.getWhiteboardOrFail.mockResolvedValue(whiteboard);
      communityResolverService.getSpaceForCommunityOrFail.mockResolvedValueOnce(
        createSpace(false)
      );

      const agentInfo = new AgentInfo();
      agentInfo.userID = 'user-1';

      await expect(
        service.updateGuestAccess(agentInfo, whiteboard.id, true)
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(authorizationPolicyService.save).not.toHaveBeenCalled();
    });
  });
});

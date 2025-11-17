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

describe('WhiteboardGuestAccessService', () => {
  const createAuthorization = () => {
    const authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.WHITEBOARD
    );
    authorization.id = 'authorization-1';
    authorization.credentialRules = [];
    authorization.privilegeRules = [];
    authorization.verifiedCredentialRules = [];
    return authorization;
  };

  const createWhiteboard = (authorization: AuthorizationPolicy) => {
    return {
      id: 'whiteboard-1',
      authorization,
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

  let whiteboardService: jest.Mocked<WhiteboardService>;
  let authorizationService: jest.Mocked<AuthorizationService>;
  let authorizationPolicyService: jest.Mocked<AuthorizationPolicyService>;
  let communityResolverService: jest.Mocked<CommunityResolverService>;
  let logger: jest.Mocked<LoggerService>;
  let service: WhiteboardGuestAccessService;

  beforeEach(() => {
    whiteboardService = {
      getWhiteboardOrFail: jest.fn(),
    } as unknown as jest.Mocked<WhiteboardService>;

    authorizationService = {
      grantAccessOrFail: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<AuthorizationService>;

    authorizationPolicyService = {
      save: jest.fn(async auth => auth),
      authorizationSelectOptions: {
        id: true,
        credentialRules: true,
        privilegeRules: true,
        verifiedCredentialRules: true,
      } as any,
    } as unknown as jest.Mocked<AuthorizationPolicyService>;

    communityResolverService = {
      getCommunityFromWhiteboardOrFail: jest
        .fn()
        .mockResolvedValue({ id: 'community-1' }),
      getSpaceForCommunityOrFail: jest
        .fn()
        .mockResolvedValue(createSpace(true)),
    } as unknown as jest.Mocked<CommunityResolverService>;

    logger = {
      verbose: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    service = new WhiteboardGuestAccessService(
      whiteboardService,
      authorizationService,
      authorizationPolicyService,
      communityResolverService,
      logger
    );
  });

  describe('updateGuestAccess', () => {
    it('grants GLOBAL_GUEST privileges when enabling and remains idempotent', async () => {
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

      const guestRule = authorization.credentialRules.find(rule =>
        rule.criterias.some(
          criteria => criteria.type === AuthorizationCredential.GLOBAL_GUEST
        )
      );
      expect(guestRule).toBeDefined();
      expect(guestRule?.grantedPrivileges).toEqual(
        expect.arrayContaining([
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE_CONTENT,
          AuthorizationPrivilege.CONTRIBUTE,
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
      const guestRules = authorization.credentialRules.filter(rule =>
        rule.criterias.some(
          criteria => criteria.type === AuthorizationCredential.GLOBAL_GUEST
        )
      );
      expect(guestRules).toHaveLength(1);
    });
  });
});

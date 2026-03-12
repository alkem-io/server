import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IAuthorizationPolicy } from '../authorization-policy/authorization.policy.interface';
import { WhiteboardGuestAccessService } from './whiteboard.guest-access.service';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardAuthorizationService } from './whiteboard.service.authorization';

describe('WhiteboardAuthorizationService', () => {
  let service: WhiteboardAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let whiteboardService: WhiteboardService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let whiteboardGuestAccessService: WhiteboardGuestAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteboardAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(WhiteboardAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    whiteboardService = module.get(WhiteboardService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    whiteboardGuestAccessService = module.get(WhiteboardGuestAccessService);
  });

  const createWhiteboard = (overrides: any = {}) => ({
    id: 'wb-1',
    createdBy: 'user-1',
    contentUpdatePolicy: ContentUpdatePolicy.OWNER,
    authorization: {
      id: 'auth-1',
      credentialRules: [],
    } as unknown as IAuthorizationPolicy,
    profile: { id: 'profile-1' },
    ...overrides,
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent auth and apply to profile', async () => {
      const whiteboard = createWhiteboard();
      const parentAuth = { id: 'parent' } as unknown as IAuthorizationPolicy;

      (whiteboardService.getWhiteboardOrFail as Mock).mockResolvedValue(
        whiteboard
      );
      (
        whiteboardGuestAccessService.isGuestAccessEnabled as Mock
      ).mockReturnValue(false);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([{ id: 'profile-auth' }]);

      const result = await service.applyAuthorizationPolicy('wb-1', parentAuth);

      expect(whiteboardService.getWhiteboardOrFail).toHaveBeenCalledWith(
        'wb-1',
        expect.any(Object)
      );
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(whiteboard.authorization, parentAuth);
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', whiteboard.authorization);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should throw RelationshipNotFoundException when profile not loaded', async () => {
      const whiteboard = createWhiteboard({ profile: undefined });

      (whiteboardService.getWhiteboardOrFail as Mock).mockResolvedValue(
        whiteboard
      );

      await expect(
        service.applyAuthorizationPolicy('wb-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should create credential rule when createdBy is present', async () => {
      const whiteboard = createWhiteboard({ createdBy: 'user-1' });

      (whiteboardService.getWhiteboardOrFail as Mock).mockResolvedValue(
        whiteboard
      );
      (
        whiteboardGuestAccessService.isGuestAccessEnabled as Mock
      ).mockReturnValue(false);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('wb-1', undefined);

      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should not create credential rule when createdBy is absent', async () => {
      const whiteboard = createWhiteboard({ createdBy: undefined });

      (whiteboardService.getWhiteboardOrFail as Mock).mockResolvedValue(
        whiteboard
      );
      (
        whiteboardGuestAccessService.isGuestAccessEnabled as Mock
      ).mockReturnValue(false);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('wb-1', undefined);

      expect(
        authorizationPolicyService.createCredentialRule
      ).not.toHaveBeenCalled();
    });

    it('should handle ADMINS content update policy with privilege rules', async () => {
      const whiteboard = createWhiteboard({
        contentUpdatePolicy: ContentUpdatePolicy.ADMINS,
      });

      (whiteboardService.getWhiteboardOrFail as Mock).mockResolvedValue(
        whiteboard
      );
      (
        whiteboardGuestAccessService.isGuestAccessEnabled as Mock
      ).mockReturnValue(false);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('wb-1', undefined);

      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalledWith(
        whiteboard.authorization,
        expect.arrayContaining([
          expect.objectContaining({
            grantedPrivileges: expect.any(Array),
          }),
        ])
      );
    });

    it('should handle CONTRIBUTORS content update policy with privilege rules', async () => {
      const whiteboard = createWhiteboard({
        contentUpdatePolicy: ContentUpdatePolicy.CONTRIBUTORS,
      });

      (whiteboardService.getWhiteboardOrFail as Mock).mockResolvedValue(
        whiteboard
      );
      (
        whiteboardGuestAccessService.isGuestAccessEnabled as Mock
      ).mockReturnValue(false);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('wb-1', undefined);

      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalled();
    });

    it('should re-enable guest access when it was enabled before reset and space settings allow it', async () => {
      const whiteboard = createWhiteboard();
      const spaceSettings = {
        collaboration: { allowGuestContributions: true },
      } as any;
      const guestRule = { name: 'guest-rule' } as any;

      (whiteboardService.getWhiteboardOrFail as Mock).mockResolvedValue(
        whiteboard
      );
      (
        whiteboardGuestAccessService.isGuestAccessEnabled as Mock
      ).mockReturnValue(true);
      (
        whiteboardGuestAccessService.getGuestAccessCredentialRule as Mock
      ).mockReturnValue(guestRule);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(whiteboard.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('wb-1', undefined, spaceSettings);

      expect(
        whiteboardGuestAccessService.getGuestAccessCredentialRule
      ).toHaveBeenCalled();
    });
  });
});

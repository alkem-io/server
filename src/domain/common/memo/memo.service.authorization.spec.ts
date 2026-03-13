import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IAuthorizationPolicy } from '../authorization-policy/authorization.policy.interface';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';
import { MemoService } from './memo.service';
import { MemoAuthorizationService } from './memo.service.authorization';

describe('MemoAuthorizationService', () => {
  let service: MemoAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let memoService: MemoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MemoAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    memoService = module.get(MemoService);
  });

  const createMemo = (overrides: any = {}) => ({
    id: 'memo-1',
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
      const memo = createMemo();
      const parentAuth = {
        id: 'parent-auth',
      } as unknown as IAuthorizationPolicy;
      const profileAuths = [
        { id: 'profile-auth' } as unknown as IAuthorizationPolicy,
      ];

      (memoService.getMemoOrFail as Mock).mockResolvedValue(memo);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue(profileAuths);

      const result = await service.applyAuthorizationPolicy(
        'memo-1',
        parentAuth
      );

      expect(memoService.getMemoOrFail).toHaveBeenCalledWith(
        'memo-1',
        expect.any(Object)
      );
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(memo.authorization, parentAuth);
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', memo.authorization);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should create credential rule when memo has createdBy', async () => {
      const memo = createMemo({ createdBy: 'user-1' });

      (memoService.getMemoOrFail as Mock).mockResolvedValue(memo);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('memo-1', undefined);

      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should not create credential rule when memo has no createdBy', async () => {
      const memo = createMemo({ createdBy: undefined });

      (memoService.getMemoOrFail as Mock).mockResolvedValue(memo);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('memo-1', undefined);

      expect(
        authorizationPolicyService.createCredentialRule
      ).not.toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundException when profile not loaded', async () => {
      const memo = createMemo({ profile: undefined });

      (memoService.getMemoOrFail as Mock).mockResolvedValue(memo);

      await expect(
        service.applyAuthorizationPolicy('memo-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should add privilege rules for ADMINS content update policy', async () => {
      const memo = createMemo({
        contentUpdatePolicy: ContentUpdatePolicy.ADMINS,
      });

      (memoService.getMemoOrFail as Mock).mockResolvedValue(memo);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('memo-1', undefined);

      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalledWith(
        memo.authorization,
        expect.arrayContaining([
          expect.objectContaining({
            grantedPrivileges: expect.any(Array),
          }),
        ])
      );
    });

    it('should add privilege rules for CONTRIBUTORS content update policy', async () => {
      const memo = createMemo({
        contentUpdatePolicy: ContentUpdatePolicy.CONTRIBUTORS,
      });

      (memoService.getMemoOrFail as Mock).mockResolvedValue(memo);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(memo.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        profileAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('memo-1', undefined);

      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalled();
    });
  });
});

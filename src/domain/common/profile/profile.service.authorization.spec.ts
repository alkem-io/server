import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IAuthorizationPolicy } from '../authorization-policy/authorization.policy.interface';
import { VisualAuthorizationService } from '../visual/visual.service.authorization';
import { ProfileService } from './profile.service';
import { ProfileAuthorizationService } from './profile.service.authorization';

describe('ProfileAuthorizationService', () => {
  let service: ProfileAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileService: ProfileService;
  let visualAuthorizationService: VisualAuthorizationService;
  let storageBucketAuthorizationService: StorageBucketAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ProfileAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileService = module.get(ProfileService);
    visualAuthorizationService = module.get(VisualAuthorizationService);
    storageBucketAuthorizationService = module.get(
      StorageBucketAuthorizationService
    );
  });

  const createProfile = (overrides: any = {}) => ({
    id: 'profile-1',
    authorization: {
      id: 'auth-1',
      credentialRules: [],
    } as unknown as IAuthorizationPolicy,
    references: [{ id: 'ref-1', authorization: { id: 'ref-auth' } }],
    tagsets: [{ id: 'ts-1', authorization: { id: 'ts-auth' } }],
    visuals: [{ id: 'vis-1', authorization: { id: 'vis-auth' } }],
    storageBucket: { id: 'sb-1', authorization: { id: 'sb-auth' } },
    ...overrides,
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent auth and apply to all child entities', async () => {
      const profile = createProfile();
      const parentAuth = { id: 'parent' } as unknown as IAuthorizationPolicy;
      const visAuth = {
        id: 'vis-auth-updated',
      } as unknown as IAuthorizationPolicy;

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(profile.authorization);
      (
        visualAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockReturnValue(visAuth);
      (
        storageBucketAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([{ id: 'sb-auth-updated' }]);

      const result = await service.applyAuthorizationPolicy(
        'profile-1',
        parentAuth
      );

      expect(profileService.getProfileOrFail).toHaveBeenCalledWith(
        'profile-1',
        expect.any(Object)
      );
      // 1 profile + 1 reference + 1 tagset + 1 visual + 1 storageBucket = 5+
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should push credential rules from parent', async () => {
      const credentialRules: any[] = [];
      const profile = createProfile({
        authorization: { id: 'auth-1', credentialRules },
      });
      const parentRule = { name: 'parent-rule' } as any;

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(profile.authorization);
      (
        visualAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockReturnValue({ id: 'vis-auth' });
      (
        storageBucketAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('profile-1', undefined, [
        parentRule,
      ]);

      expect(credentialRules).toContain(parentRule);
    });

    it('should throw RelationshipNotFoundException when references not loaded', async () => {
      const profile = createProfile({ references: undefined });

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);

      await expect(
        service.applyAuthorizationPolicy('profile-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when tagsets not loaded', async () => {
      const profile = createProfile({ tagsets: undefined });

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);

      await expect(
        service.applyAuthorizationPolicy('profile-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when authorization not loaded', async () => {
      const profile = createProfile({ authorization: undefined });

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);

      await expect(
        service.applyAuthorizationPolicy('profile-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when visuals not loaded', async () => {
      const profile = createProfile({ visuals: undefined });

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);

      await expect(
        service.applyAuthorizationPolicy('profile-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when storageBucket not loaded', async () => {
      const profile = createProfile({ storageBucket: undefined });

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);

      await expect(
        service.applyAuthorizationPolicy('profile-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should iterate over multiple references and tagsets', async () => {
      const profile = createProfile({
        references: [
          { id: 'ref-1', authorization: { id: 'ref-auth-1' } },
          { id: 'ref-2', authorization: { id: 'ref-auth-2' } },
        ],
        tagsets: [
          { id: 'ts-1', authorization: { id: 'ts-auth-1' } },
          { id: 'ts-2', authorization: { id: 'ts-auth-2' } },
        ],
        visuals: [],
      });

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(profile.authorization);
      (
        storageBucketAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('profile-1', undefined);

      // inheritParentAuthorization called for: profile + 2 refs + 2 tagsets = 5
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledTimes(5);
    });
  });
});

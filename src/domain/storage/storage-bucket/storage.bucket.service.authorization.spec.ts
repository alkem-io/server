import {
  POLICY_RULE_PLATFORM_DELETE,
  POLICY_RULE_STORAGE_BUCKET_CONTRIBUTOR_FILE_UPLOAD,
  POLICY_RULE_STORAGE_BUCKET_UPDATER_FILE_UPLOAD,
} from '@common/constants';
import { AuthorizationPrivilege } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { IStorageBucket } from './storage.bucket.interface';
import { StorageBucketAuthorizationService } from './storage.bucket.service.authorization';

describe('StorageBucketAuthorizationService', () => {
  let service: StorageBucketAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let documentAuthorizationService: DocumentAuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageBucketAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<StorageBucketAuthorizationService>(
      StorageBucketAuthorizationService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    documentAuthorizationService = module.get<DocumentAuthorizationService>(
      DocumentAuthorizationService
    );
  });

  describe('applyAuthorizationPolicy', () => {
    it('should reset, inherit, append privilege rules, and cascade to documents when bucket is valid', async () => {
      const parentAuth = { id: 'parent-auth' };
      const bucketAuth = { id: 'bucket-auth' };
      const doc1 = {
        id: 'doc-1',
        authorization: { id: 'doc-auth-1' },
        tagset: { id: 'ts-1', authorization: { id: 'ts-auth-1' } },
      };
      const storageBucket = {
        id: 'bucket-1',
        authorization: bucketAuth,
        documents: [doc1],
      } as unknown as IStorageBucket;

      const resetAuth = { id: 'reset-auth' };
      const inheritedAuth = { id: 'inherited-auth' };
      const privilegeAuth = { id: 'privilege-auth' };

      (authorizationPolicyService.reset as Mock).mockReturnValue(resetAuth);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(inheritedAuth);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(privilegeAuth);
      (
        documentAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([{ id: 'doc-updated-auth' }]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);

      await service.applyAuthorizationPolicy(storageBucket, parentAuth as any);

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(bucketAuth);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, parentAuth);
      expect(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).toHaveBeenCalledWith(
        inheritedAuth,
        expect.arrayContaining([
          expect.objectContaining({
            grantedPrivileges: [AuthorizationPrivilege.FILE_UPLOAD],
            sourcePrivilege: AuthorizationPrivilege.UPDATE,
            name: POLICY_RULE_STORAGE_BUCKET_UPDATER_FILE_UPLOAD,
          }),
          expect.objectContaining({
            grantedPrivileges: [AuthorizationPrivilege.FILE_UPLOAD],
            sourcePrivilege: AuthorizationPrivilege.CONTRIBUTE,
            name: POLICY_RULE_STORAGE_BUCKET_CONTRIBUTOR_FILE_UPLOAD,
          }),
          expect.objectContaining({
            grantedPrivileges: [AuthorizationPrivilege.FILE_DELETE],
            sourcePrivilege: AuthorizationPrivilege.DELETE,
            name: POLICY_RULE_PLATFORM_DELETE,
          }),
        ])
      );
      expect(
        documentAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(doc1, privilegeAuth);
      // saveAll is no longer called internally — policies are returned to caller
    });

    it('should handle empty documents array without cascading', async () => {
      const bucketAuth = { id: 'bucket-auth-2' };
      const storageBucket = {
        id: 'bucket-2',
        authorization: bucketAuth,
        documents: [],
      } as unknown as IStorageBucket;

      (authorizationPolicyService.reset as Mock).mockReturnValue(bucketAuth);
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(bucketAuth);
      (
        authorizationPolicyService.appendPrivilegeAuthorizationRules as Mock
      ).mockReturnValue(bucketAuth);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);

      await service.applyAuthorizationPolicy(storageBucket, undefined);

      expect(
        documentAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundException when documents is undefined', async () => {
      const storageBucket = {
        id: 'bucket-3',
        authorization: { id: 'auth-3' },
        documents: undefined,
      } as unknown as IStorageBucket;

      await expect(
        service.applyAuthorizationPolicy(storageBucket, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});

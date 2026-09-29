import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { DocumentService } from '../document/document.service';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { StorageBucketResolverMutations } from './storage.bucket.resolver.mutations';
import { StorageBucketService } from './storage.bucket.service';

describe('StorageBucketResolverMutations', () => {
  let resolver: StorageBucketResolverMutations;
  let authorizationService: AuthorizationService;
  let storageBucketService: StorageBucketService;
  let documentService: DocumentService;
  let documentAuthorizationService: DocumentAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageBucketResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<StorageBucketResolverMutations>(
      StorageBucketResolverMutations
    );
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    storageBucketService =
      module.get<StorageBucketService>(StorageBucketService);
    documentService = module.get<DocumentService>(DocumentService);
    documentAuthorizationService = module.get<DocumentAuthorizationService>(
      DocumentAuthorizationService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deleteStorageBucket', () => {
    it('should check authorization and delegate deletion to service', async () => {
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';
      const bucketAuth = { id: 'auth-1' };
      const bucket = { id: 'bucket-1', authorization: bucketAuth };
      const deleteData = { ID: 'bucket-1' };
      const deletedBucket = { id: 'bucket-1' };

      (storageBucketService.getStorageBucketOrFail as Mock).mockResolvedValue(
        bucket
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (storageBucketService.deleteStorageBucket as Mock).mockResolvedValue(
        deletedBucket
      );

      const result = await resolver.deleteStorageBucket(
        actorContext,
        deleteData as any
      );

      expect(storageBucketService.getStorageBucketOrFail).toHaveBeenCalledWith(
        'bucket-1'
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        bucketAuth,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(storageBucketService.deleteStorageBucket).toHaveBeenCalledWith(
        'bucket-1'
      );
      expect(result).toBe(deletedBucket);
    });
  });

  describe('uploadFileOnStorageBucket', () => {
    it('should check FILE_UPLOAD authorization, upload file, apply auth policy, and return result', async () => {
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';
      const bucketAuth = { id: 'auth-bucket' };
      const bucket = { id: 'bucket-1', authorization: bucketAuth };
      const uploadData = {
        storageBucketId: 'bucket-1',
        temporaryLocation: false,
      };
      const mockReadStream = vi.fn();
      const fileUpload = {
        createReadStream: () => mockReadStream,
        filename: 'photo.png',
        mimetype: 'image/png',
      };
      const uploadedDoc = {
        id: 'doc-1',
        externalID: 'ext-1',
        authorization: { id: 'doc-auth' },
      };

      (storageBucketService.getStorageBucketOrFail as Mock).mockResolvedValue(
        bucket
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (storageBucketService.uploadFileAsDocument as Mock).mockResolvedValue(
        uploadedDoc
      );
      (
        documentAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (documentService.getPubliclyAccessibleURL as Mock).mockReturnValue(
        'https://alkem.io/api/private/rest/storage/document/doc-1'
      );

      const result = await resolver.uploadFileOnStorageBucket(
        actorContext,
        uploadData as any,
        fileUpload as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        bucketAuth,
        AuthorizationPrivilege.FILE_UPLOAD,
        expect.any(String)
      );
      expect(storageBucketService.uploadFileAsDocument).toHaveBeenCalledWith(
        'bucket-1',
        mockReadStream,
        'photo.png',
        'image/png',
        'user-1',
        false
      );
      expect(
        documentAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(uploadedDoc, bucketAuth);
      expect(result).toEqual({
        id: 'doc-1',
        url: 'https://alkem.io/api/private/rest/storage/document/doc-1',
      });
    });

    it('does NOT recompose the policy for a CONVERSATION bucket', async () => {
      // The service already composed the full policy before the row existed.
      // Recomposing here would rewrite the same rules on the hot path.
      const actorContext = new ActorContext();
      actorContext.actorID = 'bob';
      const bucket = {
        id: 'bucket-conversation',
        authorization: { id: 'auth-bucket' },
        storageAggregator: { type: StorageAggregatorType.CONVERSATION },
      };
      const fileUpload = {
        createReadStream: () => vi.fn(),
        filename: 'holiday.png',
        mimetype: 'image/png',
      };

      (storageBucketService.getStorageBucketOrFail as Mock).mockResolvedValue(
        bucket
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (storageBucketService.uploadFileAsDocument as Mock).mockResolvedValue({
        id: 'doc-conv',
        externalID: 'ext-conv',
        authorization: { id: 'doc-auth' },
      });
      (documentService.getPubliclyAccessibleURL as Mock).mockReturnValue(
        'https://alkem.io/api/private/rest/storage/document/doc-conv'
      );

      const result = await resolver.uploadFileOnStorageBucket(
        actorContext,
        { storageBucketId: 'bucket-conversation' } as any,
        fileUpload as any
      );

      expect(
        documentAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
      expect(authorizationPolicyService.saveAll).not.toHaveBeenCalled();
      expect(result.id).toBe('doc-conv');
    });
  });
});

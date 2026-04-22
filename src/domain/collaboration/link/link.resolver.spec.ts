import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { LinkResolverMutations } from './link.resolver.mutations';
import { LinkService } from './link.service';

describe('LinkResolver', () => {
  let resolver: LinkResolverMutations;
  let linkService: LinkService;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let storageBucketService: StorageBucketService;
  let documentService: DocumentService;
  let documentAuthorizationService: DocumentAuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkResolverMutations, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LinkResolverMutations);
    linkService = module.get(LinkService);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    storageBucketService = module.get(StorageBucketService);
    documentService = module.get(DocumentService);
    documentAuthorizationService = module.get(DocumentAuthorizationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deleteLink', () => {
    it('should check authorization and delete the link', async () => {
      const link = {
        id: 'link-1',
        authorization: { id: 'auth-1' },
        profile: { id: 'p-1' },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;

      vi.mocked(linkService.getLinkOrFail).mockResolvedValue(link);
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(linkService.deleteLink).mockResolvedValue(link);

      const result = await resolver.deleteLink(actorContext, {
        ID: 'link-1',
      });

      expect(linkService.getLinkOrFail).toHaveBeenCalledWith('link-1', {
        relations: { profile: true },
      });
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(linkService.deleteLink).toHaveBeenCalledWith('link-1');
      expect(result).toBe(link);
    });
  });

  describe('updateLink', () => {
    it('should check authorization and update the link', async () => {
      const link = {
        id: 'link-1',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;
      const linkData = { ID: 'link-1', uri: 'https://example.com' } as any;

      vi.mocked(linkService.getLinkOrFail).mockResolvedValue(link);
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(linkService.updateLink).mockResolvedValue({
        ...link,
        uri: 'https://example.com',
      });

      const result = await resolver.updateLink(actorContext, linkData);

      expect(linkService.getLinkOrFail).toHaveBeenCalledWith('link-1');
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(linkService.updateLink).toHaveBeenCalledWith(linkData);
      expect(result.uri).toBe('https://example.com');
    });
  });

  describe('uploadFileOnLink', () => {
    it('should upload file and update link URI', async () => {
      const link = {
        id: 'link-1',
        uri: 'old-uri',
        authorization: { id: 'auth-1' },
        profile: {
          id: 'p-1',
          storageBucket: {
            id: 'sb-1',
            authorization: { id: 'auth-sb' },
          },
        },
      } as any;
      const actorContext = { actorID: 'user-1' } as any;
      const uploadData = { linkID: 'link-1' } as any;
      const readStream = { pipe: vi.fn() };
      const fileUpload = {
        createReadStream: () => readStream,
        filename: 'test.png',
        mimetype: 'image/png',
      } as any;
      const document = { id: 'doc-1' } as any;

      vi.mocked(linkService.getLinkOrFail).mockResolvedValue(link);
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(storageBucketService.uploadFileFromURI).mockResolvedValue(
        document
      );
      vi.mocked(
        documentAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-doc' }] as any);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(documentService.getPubliclyAccessibleURL).mockReturnValue(
        'https://new-url.com/doc'
      );
      vi.mocked(linkService.updateLink).mockResolvedValue({
        ...link,
        uri: 'https://new-url.com/doc',
      });

      const result = await resolver.uploadFileOnLink(
        actorContext,
        uploadData,
        fileUpload
      );

      expect(storageBucketService.uploadFileFromURI).toHaveBeenCalledWith(
        'old-uri',
        'link-1',
        link.profile.storageBucket,
        readStream,
        'test.png',
        'image/png',
        'user-1'
      );
      expect(
        documentAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(linkService.updateLink).toHaveBeenCalledWith({
        ID: 'link-1',
        uri: 'https://new-url.com/doc',
      });
      expect(result.uri).toBe('https://new-url.com/doc');
    });

    it('should throw EntityNotInitializedException when profile or storageBucket is missing', async () => {
      const link = {
        id: 'link-1',
        uri: 'old-uri',
        authorization: { id: 'auth-1' },
        profile: undefined,
      } as any;
      const actorContext = { actorID: 'user-1' } as any;
      const uploadData = { linkID: 'link-1' } as any;
      const fileUpload = {
        createReadStream: () => ({ pipe: vi.fn() }),
        filename: 'test.png',
        mimetype: 'image/png',
      } as any;

      vi.mocked(linkService.getLinkOrFail).mockResolvedValue(link);
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );

      await expect(
        resolver.uploadFileOnLink(actorContext, uploadData, fileUpload)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});

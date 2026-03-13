import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { DocumentResolverMutations } from './document.resolver.mutations';
import { DocumentService } from './document.service';

describe('DocumentResolverMutations', () => {
  let resolver: DocumentResolverMutations;
  let authorizationService: AuthorizationService;
  let documentService: DocumentService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(DocumentResolverMutations);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    documentService = module.get<DocumentService>(DocumentService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deleteDocument', () => {
    it('should check DELETE authorization and delegate to documentService.deleteDocument', async () => {
      const actorContext = new ActorContext();
      const docAuth = { id: 'auth-1' };
      const document = {
        id: 'doc-1',
        displayName: 'file.png',
        authorization: docAuth,
      };
      const deleteData = { ID: 'doc-1' };
      const deletedDoc = { id: 'doc-1' };

      (documentService.getDocumentOrFail as Mock).mockResolvedValue(document);
      (authorizationService.grantAccessOrFail as Mock).mockResolvedValue(
        undefined
      );
      (documentService.deleteDocument as Mock).mockResolvedValue(deletedDoc);

      const result = await resolver.deleteDocument(
        actorContext,
        deleteData as any
      );

      expect(documentService.getDocumentOrFail).toHaveBeenCalledWith('doc-1');
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        docAuth,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(documentService.deleteDocument).toHaveBeenCalledWith(deleteData);
      expect(result).toBe(deletedDoc);
    });
  });

  describe('updateDocument', () => {
    it('should check UPDATE authorization and delegate to documentService.updateDocument', async () => {
      const actorContext = new ActorContext();
      const docAuth = { id: 'auth-2' };
      const document = {
        id: 'doc-2',
        displayName: 'report.pdf',
        authorization: docAuth,
      };
      const documentData = { ID: 'doc-2', displayName: 'updated.pdf' };
      const updatedDoc = { id: 'doc-2', displayName: 'updated.pdf' };

      (documentService.getDocumentOrFail as Mock).mockResolvedValue(document);
      (authorizationService.grantAccessOrFail as Mock).mockResolvedValue(
        undefined
      );
      (documentService.updateDocument as Mock).mockResolvedValue(updatedDoc);

      const result = await resolver.updateDocument(
        actorContext,
        documentData as any
      );

      expect(documentService.getDocumentOrFail).toHaveBeenCalledWith('doc-2');
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        docAuth,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(documentService.updateDocument).toHaveBeenCalledWith(documentData);
      expect(result).toBe(updatedDoc);
    });
  });
});

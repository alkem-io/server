import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { type Mocked, vi } from 'vitest';
import { IVisual } from './visual.interface';
import { VisualResolverMutations } from './visual.resolver.mutations';
import { VisualService } from './visual.service';

const createResolver = () => {
  const authorizationService = {
    grantAccessOrFail: vi.fn(),
  } as unknown as Mocked<AuthorizationService>;

  const visualService = {
    getVisualOrFail: vi.fn(),
    updateVisual: vi.fn(),
    uploadImageOnVisual: vi.fn(),
  } as unknown as Mocked<VisualService>;

  const documentService = {
    saveDocument: vi.fn(),
    getPubliclyAccessibleURL: vi.fn(),
  } as unknown as Mocked<DocumentService>;

  const authorizationPolicyService = {
    saveAll: vi.fn(),
  } as unknown as Mocked<AuthorizationPolicyService>;

  const documentAuthorizationService = {
    applyAuthorizationPolicy: vi.fn(),
  } as unknown as Mocked<DocumentAuthorizationService>;

  const resolver = new VisualResolverMutations(
    authorizationService,
    visualService,
    documentService,
    authorizationPolicyService,
    documentAuthorizationService
  );

  return {
    resolver,
    authorizationService,
    visualService,
    documentService,
    authorizationPolicyService,
    documentAuthorizationService,
  };
};

describe('VisualResolverMutations', () => {
  describe('updateVisual', () => {
    it('authorizes and delegates to visualService.updateVisual', async () => {
      const { resolver, authorizationService, visualService } =
        createResolver();
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';

      const visual = {
        id: 'vis-1',
        authorization: { id: 'auth-1' },
      } as unknown as IVisual;

      visualService.getVisualOrFail.mockResolvedValueOnce(visual);
      const updatedVisual = { ...visual, uri: 'new-uri' } as IVisual;
      visualService.updateVisual.mockResolvedValueOnce(updatedVisual);

      const updateData = { visualID: 'vis-1', uri: 'new-uri' };
      const result = await resolver.updateVisual(actorContext, updateData);

      expect(visualService.getVisualOrFail).toHaveBeenCalledWith('vis-1');
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        visual.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(visualService.updateVisual).toHaveBeenCalledWith(updateData);
      expect(result).toBe(updatedVisual);
    });
  });

  describe('uploadImageOnVisual', () => {
    const actorContext = new ActorContext();
    actorContext.actorID = 'user-1';

    it('throws EntityNotInitializedException when no storageBucket found', async () => {
      const { resolver, visualService } = createResolver();
      const visual = {
        id: 'vis-1',
        authorization: { id: 'auth-1' },
        profile: { storageBucket: undefined },
        mediaGallery: undefined,
      } as any;
      visualService.getVisualOrFail.mockResolvedValueOnce(visual);

      const uploadData = { visualID: 'vis-1' };
      const fileUpload = {
        createReadStream: vi.fn(),
        filename: 'test.png',
        mimetype: 'image/png',
      };

      await expect(
        resolver.uploadImageOnVisual(
          actorContext,
          uploadData,
          fileUpload as any
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('throws EntityNotInitializedException when storageBucket has no authorization', async () => {
      const { resolver, visualService } = createResolver();
      const visual = {
        id: 'vis-1',
        authorization: { id: 'auth-1' },
        profile: {
          storageBucket: { id: 'sb-1', authorization: undefined },
        },
        mediaGallery: undefined,
      } as any;
      visualService.getVisualOrFail.mockResolvedValueOnce(visual);

      const uploadData = { visualID: 'vis-1' };
      const fileUpload = {
        createReadStream: vi.fn(),
        filename: 'test.png',
        mimetype: 'image/png',
      };

      await expect(
        resolver.uploadImageOnVisual(
          actorContext,
          uploadData,
          fileUpload as any
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('uses FILE_UPLOAD privilege when storageBucket has credential rules', async () => {
      const {
        resolver,
        authorizationService,
        visualService,
        documentService,
        documentAuthorizationService,
        authorizationPolicyService,
      } = createResolver();

      const storageBucketAuth = {
        id: 'sb-auth-1',
        credentialRules: ['rule-1'],
      };
      const visual = {
        id: 'vis-1',
        authorization: { id: 'auth-1' },
        profile: {
          storageBucket: { id: 'sb-1', authorization: storageBucketAuth },
        },
        mediaGallery: undefined,
      } as any;
      visualService.getVisualOrFail.mockResolvedValueOnce(visual);

      const readStream = { pipe: vi.fn() };
      const fileUpload = {
        createReadStream: vi.fn().mockReturnValue(readStream),
        filename: 'test.png',
        mimetype: 'image/png',
      };

      const doc = { id: 'doc-1' } as any;
      visualService.uploadImageOnVisual.mockResolvedValueOnce(doc);
      documentService.saveDocument.mockResolvedValueOnce(doc);
      documentAuthorizationService.applyAuthorizationPolicy.mockResolvedValueOnce(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValueOnce(
        undefined as any
      );
      documentService.getPubliclyAccessibleURL.mockReturnValueOnce(
        'https://example.com/test.png'
      );
      const updatedVisual = {
        id: 'vis-1',
        uri: 'https://example.com/test.png',
      } as any;
      visualService.updateVisual.mockResolvedValueOnce(updatedVisual);

      const result = await resolver.uploadImageOnVisual(
        actorContext,
        { visualID: 'vis-1' },
        fileUpload as any
      );

      // Should check FILE_UPLOAD on storage bucket
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        storageBucketAuth,
        AuthorizationPrivilege.FILE_UPLOAD,
        expect.any(String)
      );
      expect(result).toBe(updatedVisual);
    });

    it('uses fallback authorization when storageBucket has no credential rules', async () => {
      const {
        resolver,
        authorizationService,
        visualService,
        documentService,
        documentAuthorizationService,
        authorizationPolicyService,
      } = createResolver();

      const profileAuth = { id: 'profile-auth-1' };
      const storageBucketAuth = {
        id: 'sb-auth-1',
        credentialRules: [],
      };
      const visual = {
        id: 'vis-1',
        authorization: { id: 'auth-1' },
        profile: {
          authorization: profileAuth,
          storageBucket: { id: 'sb-1', authorization: storageBucketAuth },
        },
        mediaGallery: undefined,
      } as any;
      visualService.getVisualOrFail.mockResolvedValueOnce(visual);

      const readStream = { pipe: vi.fn() };
      const fileUpload = {
        createReadStream: vi.fn().mockReturnValue(readStream),
        filename: 'test.png',
        mimetype: 'image/png',
      };

      const doc = { id: 'doc-1' } as any;
      visualService.uploadImageOnVisual.mockResolvedValueOnce(doc);
      documentService.saveDocument.mockResolvedValueOnce(doc);
      documentAuthorizationService.applyAuthorizationPolicy.mockResolvedValueOnce(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValueOnce(
        undefined as any
      );
      documentService.getPubliclyAccessibleURL.mockReturnValueOnce(
        'https://example.com/test.png'
      );
      visualService.updateVisual.mockResolvedValueOnce(visual);

      await resolver.uploadImageOnVisual(
        actorContext,
        { visualID: 'vis-1' },
        fileUpload as any
      );

      // Second call should use UPDATE on fallback (profile) authorization
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        profileAuth,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
    });

    it('throws when fallback authorization is also not available', async () => {
      const { resolver, visualService } = createResolver();

      const storageBucketAuth = {
        id: 'sb-auth-1',
        credentialRules: [],
      };
      const visual = {
        id: 'vis-1',
        authorization: undefined,
        profile: {
          authorization: undefined,
          storageBucket: { id: 'sb-1', authorization: storageBucketAuth },
        },
        mediaGallery: { authorization: undefined },
      } as any;
      visualService.getVisualOrFail.mockResolvedValueOnce(visual);

      const fileUpload = {
        createReadStream: vi.fn(),
        filename: 'test.png',
        mimetype: 'image/png',
      };

      await expect(
        resolver.uploadImageOnVisual(
          actorContext,
          { visualID: 'vis-1' },
          fileUpload as any
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});

import { CREDENTIAL_RULE_DOCUMENT_CREATED_BY } from '@common/constants/authorization/credential.rule.constants';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IDocument } from './document.interface';
import { DocumentAuthorizationService } from './document.service.authorization';

describe('DocumentAuthorizationService', () => {
  let service: DocumentAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<DocumentAuthorizationService>(
      DocumentAuthorizationService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization and cascade to tagset when document is properly initialized', async () => {
      const parentAuth = { id: 'parent-auth' };
      const docAuth = { id: 'doc-auth' };
      const tagsetAuth = { id: 'tagset-auth' };
      const document = {
        id: 'doc-1',
        createdBy: 'user-1',
        authorization: docAuth,
        tagset: {
          id: 'tagset-1',
          authorization: tagsetAuth,
        },
      } as unknown as IDocument;

      const inheritedAuth = { id: 'inherited-auth' };
      const appendedAuth = { id: 'appended-auth' };
      const tagsetInheritedAuth = { id: 'tagset-inherited' };

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockImplementation((_child: any, _parent: any) => {
        if (_child === docAuth) return inheritedAuth;
        return tagsetInheritedAuth;
      });
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: CREDENTIAL_RULE_DOCUMENT_CREATED_BY }
      );
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(appendedAuth);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);

      await service.applyAuthorizationPolicy(document, parentAuth as any);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(docAuth, parentAuth);
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalledWith(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: 'user-1',
          },
        ],
        CREDENTIAL_RULE_DOCUMENT_CREATED_BY
      );
      // saveAll is no longer called internally — policies are returned to caller
    });

    it('should skip credential rule creation when document has no createdBy', async () => {
      const docAuth = { id: 'doc-auth' };
      const tagsetAuth = { id: 'tagset-auth' };
      const document = {
        id: 'doc-2',
        createdBy: undefined,
        authorization: docAuth,
        tagset: {
          id: 'tagset-2',
          authorization: tagsetAuth,
        },
      } as unknown as IDocument;

      const inheritedAuth = { id: 'inherited' };
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(inheritedAuth);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(inheritedAuth);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);

      await service.applyAuthorizationPolicy(document, undefined);

      expect(
        authorizationPolicyService.createCredentialRule
      ).not.toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundException when document tagset is missing', async () => {
      const document = {
        id: 'doc-3',
        authorization: { id: 'auth-3' },
        tagset: undefined,
      } as unknown as IDocument;

      await expect(
        service.applyAuthorizationPolicy(document, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when tagset authorization is missing', async () => {
      const document = {
        id: 'doc-4',
        authorization: { id: 'auth-4' },
        tagset: {
          id: 'tagset-4',
          authorization: undefined,
        },
      } as unknown as IDocument;

      await expect(
        service.applyAuthorizationPolicy(document, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw EntityNotInitializedException when document authorization is missing during appendCredentialRules', async () => {
      const tagsetAuth = { id: 'tagset-auth' };
      const document = {
        id: 'doc-5',
        createdBy: 'user-5',
        authorization: { id: 'auth-5' },
        tagset: {
          id: 'tagset-5',
          authorization: tagsetAuth,
        },
      } as unknown as IDocument;

      // inheritParentAuthorization returns undefined, simulating missing auth
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(undefined);

      await expect(
        service.applyAuthorizationPolicy(document, undefined)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});

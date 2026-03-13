import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IAuthorizationPolicy } from '../authorization-policy/authorization.policy.interface';
import { ClassificationService } from './classification.service';
import { ClassificationAuthorizationService } from './classification.service.authorization';

describe('ClassificationAuthorizationService', () => {
  let service: ClassificationAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let classificationService: ClassificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassificationAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ClassificationAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    classificationService = module.get(ClassificationService);
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent auth and apply auth to tagsets', async () => {
      const tagsetAuth = {
        id: 'tagset-auth',
        credentialRules: [],
      } as unknown as IAuthorizationPolicy;
      const classificationAuth = {
        id: 'cls-auth',
        credentialRules: [],
      } as unknown as IAuthorizationPolicy;
      const parentAuth = {
        id: 'parent-auth',
      } as unknown as IAuthorizationPolicy;

      const classification = {
        id: 'cls-1',
        authorization: classificationAuth,
        tagsets: [{ id: 'ts-1', authorization: tagsetAuth }],
      };

      (classificationService.getClassificationOrFail as Mock).mockResolvedValue(
        classification
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(classificationAuth);

      const result = await service.applyAuthorizationPolicy(
        'cls-1',
        parentAuth
      );

      expect(
        classificationService.getClassificationOrFail
      ).toHaveBeenCalledWith('cls-1', expect.any(Object));
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledTimes(2); // once for classification, once for tagset
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should push credential rules from parent', async () => {
      const credentialRules: any[] = [];
      const classificationAuth = {
        id: 'cls-auth',
        credentialRules,
      } as unknown as IAuthorizationPolicy;
      const parentRule = { name: 'parent-rule' } as any;

      const classification = {
        id: 'cls-1',
        authorization: classificationAuth,
        tagsets: [],
      };

      (classificationService.getClassificationOrFail as Mock).mockResolvedValue(
        classification
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(classificationAuth);

      await service.applyAuthorizationPolicy('cls-1', undefined, [parentRule]);

      expect(credentialRules).toContain(parentRule);
    });

    it('should throw RelationshipNotFoundException when tagsets not loaded', async () => {
      const classification = {
        id: 'cls-1',
        authorization: { id: 'auth-1', credentialRules: [] },
        tagsets: undefined,
      };

      (classificationService.getClassificationOrFail as Mock).mockResolvedValue(
        classification
      );

      await expect(
        service.applyAuthorizationPolicy('cls-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when authorization not loaded', async () => {
      const classification = {
        id: 'cls-1',
        authorization: undefined,
        tagsets: [],
      };

      (classificationService.getClassificationOrFail as Mock).mockResolvedValue(
        classification
      );

      await expect(
        service.applyAuthorizationPolicy('cls-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});

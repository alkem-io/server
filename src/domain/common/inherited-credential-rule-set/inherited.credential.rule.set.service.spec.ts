import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InheritedCredentialRuleSetService } from './inherited.credential.rule.set.service';

describe('InheritedCredentialRuleSetService', () => {
  let service: InheritedCredentialRuleSetService;

  const mockRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockLogger = {
    verbose: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    service = new InheritedCredentialRuleSetService(
      mockRepository as any,
      mockLogger as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveForParent', () => {
    const cascadeRule: IAuthorizationPolicyRuleCredential = {
      grantedPrivileges: ['read' as any],
      criterias: [{ type: 'space-member', resourceID: 'space-1' }],
      cascade: true,
      name: 'space-member-read',
    };

    const nonCascadeRule: IAuthorizationPolicyRuleCredential = {
      grantedPrivileges: ['create' as any],
      criterias: [{ type: 'space-admin', resourceID: 'space-1' }],
      cascade: false,
      name: 'space-admin-create',
    };

    const inheritedRule: IAuthorizationPolicyRuleCredential = {
      grantedPrivileges: ['read' as any, 'update' as any],
      criterias: [{ type: 'global-admin', resourceID: '' }],
      cascade: true,
      name: 'global-admin',
    };

    it('creates new row when none exists for parent', async () => {
      const parentAuth = {
        id: 'parent-policy-id',
        credentialRules: [cascadeRule, nonCascadeRule],
        inheritedCredentialRuleSet: undefined,
        _childInheritedCredentialRuleSet: undefined,
      } as unknown as IAuthorizationPolicy;

      mockRepository.findOne.mockResolvedValue(null);

      const createdRow = {
        id: 'new-row-id',
        parentAuthorizationPolicyId: 'parent-policy-id',
        credentialRules: [cascadeRule],
      };
      mockRepository.create.mockReturnValue(createdRow);
      mockRepository.save.mockResolvedValue(createdRow);

      const result = await service.resolveForParent(parentAuth);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { parentAuthorizationPolicyId: 'parent-policy-id' },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        parentAuthorizationPolicyId: 'parent-policy-id',
        credentialRules: [cascadeRule],
      });
      expect(mockRepository.save).toHaveBeenCalledWith(createdRow);
      expect(result).toBe(createdRow);
    });

    it('updates existing row in place on re-reset', async () => {
      const parentAuth = {
        id: 'parent-policy-id',
        credentialRules: [cascadeRule, nonCascadeRule],
        inheritedCredentialRuleSet: undefined,
        _childInheritedCredentialRuleSet: undefined,
      } as unknown as IAuthorizationPolicy;

      const existingRow = {
        id: 'existing-row-id',
        parentAuthorizationPolicyId: 'parent-policy-id',
        credentialRules: [],
      };
      mockRepository.findOne.mockResolvedValue(existingRow);

      const updatedRow = {
        ...existingRow,
        credentialRules: [cascadeRule],
      };
      mockRepository.save.mockResolvedValue(updatedRow);

      const result = await service.resolveForParent(parentAuth);

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-row-id',
          credentialRules: [cascadeRule],
        })
      );
      expect(result).toBe(updatedRow);
    });

    it('attaches resolved row to _childInheritedCredentialRuleSet transient field', async () => {
      const parentAuth = {
        id: 'parent-policy-id',
        credentialRules: [cascadeRule],
        inheritedCredentialRuleSet: undefined,
        _childInheritedCredentialRuleSet: undefined,
      } as unknown as IAuthorizationPolicy;

      mockRepository.findOne.mockResolvedValue(null);

      const createdRow = {
        id: 'new-row-id',
        parentAuthorizationPolicyId: 'parent-policy-id',
        credentialRules: [cascadeRule],
      };
      mockRepository.create.mockReturnValue(createdRow);
      mockRepository.save.mockResolvedValue(createdRow);

      await service.resolveForParent(parentAuth);

      expect(parentAuth._childInheritedCredentialRuleSet).toBe(createdRow);
    });

    it('produces empty credentialRules when parent has no cascading and no inherited rules', async () => {
      const parentAuth = {
        id: 'parent-policy-id',
        credentialRules: [nonCascadeRule],
        inheritedCredentialRuleSet: undefined,
        _childInheritedCredentialRuleSet: undefined,
      } as unknown as IAuthorizationPolicy;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation(data => ({
        id: 'new-row-id',
        ...data,
      }));
      mockRepository.save.mockImplementation(row => Promise.resolve(row));

      await service.resolveForParent(parentAuth);

      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.credentialRules).toEqual([]);
    });

    it('passes through inherited rules when parent has no local cascading rules', async () => {
      const parentAuth = {
        id: 'parent-policy-id',
        credentialRules: [nonCascadeRule],
        inheritedCredentialRuleSet: {
          credentialRules: [inheritedRule],
        },
        _childInheritedCredentialRuleSet: undefined,
      } as unknown as IAuthorizationPolicy;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation(data => ({
        id: 'new-row-id',
        ...data,
      }));
      mockRepository.save.mockImplementation(row => Promise.resolve(row));

      await service.resolveForParent(parentAuth);

      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.credentialRules).toHaveLength(1);
      expect(createCall.credentialRules[0]).toBe(inheritedRule);
    });

    it('correctly merges parent local cascading rules + parent inherited rules', async () => {
      const parentAuth = {
        id: 'parent-policy-id',
        credentialRules: [cascadeRule, nonCascadeRule],
        inheritedCredentialRuleSet: {
          credentialRules: [inheritedRule],
        },
        _childInheritedCredentialRuleSet: undefined,
      } as unknown as IAuthorizationPolicy;

      mockRepository.findOne.mockResolvedValue(null);

      // Capture what create is called with
      mockRepository.create.mockImplementation(data => ({
        id: 'new-row-id',
        ...data,
      }));
      mockRepository.save.mockImplementation(row => Promise.resolve(row));

      await service.resolveForParent(parentAuth);

      // The merged rules should contain: inherited rules first, then local cascading rules
      // nonCascadeRule (cascade: false) should be excluded
      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.credentialRules).toHaveLength(2);
      // Inherited rules come first
      expect(createCall.credentialRules[0]).toBe(inheritedRule);
      // Local cascading rules come second
      expect(createCall.credentialRules[1]).toBe(cascadeRule);
    });
  });
});

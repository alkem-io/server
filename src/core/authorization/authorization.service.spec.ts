import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenException } from '@common/exceptions';
import { AuthorizationInvalidPolicyException } from '@common/exceptions/authorization.invalid.policy.exception';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  const mockLogger = {
    verbose: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    service = new AuthorizationService(mockLogger as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAccessGrantedForCredentials', () => {
    it('evaluates inherited rules first, then local rules', () => {
      const callOrder: string[] = [];
      const origVerbose = mockLogger.verbose;
      mockLogger.verbose = vi.fn((...args: any[]) => {
        const msg = args[0] as string;
        if (msg.includes('inherited rule')) {
          callOrder.push('inherited');
        } else if (msg.includes('using rule')) {
          callOrder.push('local');
        }
        origVerbose(...args);
      });

      // Inherited rule grants READ
      // Local rule also grants READ
      // If inherited is checked first, it should match and return before local
      const authorization = {
        id: 'auth-1',
        type: 'SPACE',
        credentialRules: [
          {
            grantedPrivileges: [AuthorizationPrivilege.READ],
            criterias: [{ type: 'space-member', resourceID: 'space-1' }],
            cascade: false,
            name: 'local-read',
          },
        ],
        privilegeRules: [],
        inheritedCredentialRuleSet: {
          credentialRules: [
            {
              grantedPrivileges: [AuthorizationPrivilege.READ],
              criterias: [{ type: 'global-admin', resourceID: '' }],
              cascade: true,
              name: 'inherited-global-admin',
            },
          ],
        },
      } as unknown as IAuthorizationPolicy;

      const credentials = [
        { type: 'global-admin', resourceID: '' },
        { type: 'space-member', resourceID: 'space-1' },
      ];

      const result = service.isAccessGrantedForCredentials(
        credentials,
        authorization,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(true);
      // Only inherited should appear because it matched first and returned early
      expect(callOrder).toEqual(['inherited']);
    });

    it('returns on first match (early exit from inherited pool)', () => {
      const authorization = {
        id: 'auth-2',
        type: 'SPACE',
        credentialRules: [
          {
            grantedPrivileges: [AuthorizationPrivilege.READ],
            criterias: [{ type: 'space-member', resourceID: 'space-1' }],
            cascade: false,
            name: 'local-read',
          },
        ],
        privilegeRules: [],
        inheritedCredentialRuleSet: {
          credentialRules: [
            {
              grantedPrivileges: [AuthorizationPrivilege.READ],
              criterias: [{ type: 'global-admin', resourceID: '' }],
              cascade: true,
              name: 'inherited-global-admin',
            },
          ],
        },
      } as unknown as IAuthorizationPolicy;

      const credentials = [{ type: 'global-admin', resourceID: '' }];

      const result = service.isAccessGrantedForCredentials(
        credentials,
        authorization,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(true);
      // The verbose log should mention "inherited rule" — the local rule was never reached
      expect(mockLogger.verbose).toHaveBeenCalledTimes(1);
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('inherited rule'),
        expect.any(String)
      );
    });

    it('backward compat: null inheritedCredentialRuleSet evaluates credentialRules alone', () => {
      const authorization = {
        id: 'auth-3',
        type: 'SPACE',
        credentialRules: [
          {
            grantedPrivileges: [AuthorizationPrivilege.READ],
            criterias: [{ type: 'space-member', resourceID: 'space-1' }],
            cascade: false,
            name: 'local-space-member-read',
          },
        ],
        privilegeRules: [],
        inheritedCredentialRuleSet: undefined,
      } as unknown as IAuthorizationPolicy;

      const credentials = [{ type: 'space-member', resourceID: 'space-1' }];

      const result = service.isAccessGrantedForCredentials(
        credentials,
        authorization,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(true);
      // Should log with "using rule" (local), not "inherited rule"
      expect(mockLogger.verbose).toHaveBeenCalledTimes(1);
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('using rule'),
        expect.any(String)
      );
    });

    it('privilege rules unchanged with two-phase credential evaluation', () => {
      // A credential grants UPDATE via an inherited rule,
      // and a privilege rule maps UPDATE -> DELETE
      // We request DELETE, which should be granted through the privilege chain
      const authorization = {
        id: 'auth-4',
        type: 'SPACE',
        credentialRules: [],
        privilegeRules: [
          {
            sourcePrivilege: AuthorizationPrivilege.UPDATE,
            grantedPrivileges: [AuthorizationPrivilege.DELETE],
            name: 'update-grants-delete',
          },
        ],
        inheritedCredentialRuleSet: {
          credentialRules: [
            {
              grantedPrivileges: [AuthorizationPrivilege.UPDATE],
              criterias: [{ type: 'global-admin', resourceID: '' }],
              cascade: true,
              name: 'inherited-admin-update',
            },
          ],
        },
      } as unknown as IAuthorizationPolicy;

      const credentials = [{ type: 'global-admin', resourceID: '' }];

      const result = service.isAccessGrantedForCredentials(
        credentials,
        authorization,
        AuthorizationPrivilege.DELETE
      );

      expect(result).toBe(true);
      // Should log the privilege rule grant
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('PrivilegeRule'),
        expect.any(String)
      );
    });

    it('returns false when no rules match', () => {
      const authorization = {
        id: 'auth-5',
        type: 'SPACE',
        credentialRules: [
          {
            grantedPrivileges: [AuthorizationPrivilege.READ],
            criterias: [{ type: 'space-member', resourceID: 'space-1' }],
            cascade: false,
            name: 'local-read',
          },
        ],
        privilegeRules: [],
        inheritedCredentialRuleSet: {
          credentialRules: [
            {
              grantedPrivileges: [AuthorizationPrivilege.READ],
              criterias: [{ type: 'global-admin', resourceID: '' }],
              cascade: true,
              name: 'inherited-read',
            },
          ],
        },
      } as unknown as IAuthorizationPolicy;

      // Credential that does not match any rule
      const credentials = [{ type: 'unrelated-type', resourceID: 'other' }];

      const result = service.isAccessGrantedForCredentials(
        credentials,
        authorization,
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(false);
    });
  });

  describe('validateAuthorization', () => {
    it('should not throw when policy has zero local rules but non-empty inherited rules', () => {
      const authorization = {
        id: 'auth-inherited-only',
        type: 'SPACE',
        credentialRules: [],
        privilegeRules: [],
        inheritedCredentialRuleSet: {
          credentialRules: [
            {
              grantedPrivileges: [AuthorizationPrivilege.READ],
              criterias: [{ type: 'global-admin', resourceID: '' }],
              cascade: true,
              name: 'inherited-admin',
            },
          ],
        },
      } as unknown as IAuthorizationPolicy;

      const result = service.validateAuthorization(
        authorization,
        'test',
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(authorization);
    });

    it('should throw AuthorizationInvalidPolicyException when both local and inherited rules are empty', () => {
      const authorization = {
        id: 'auth-empty',
        type: 'SPACE',
        credentialRules: [],
        privilegeRules: [],
        inheritedCredentialRuleSet: { credentialRules: [] },
      } as unknown as IAuthorizationPolicy;

      expect(() =>
        service.validateAuthorization(
          authorization,
          'test',
          AuthorizationPrivilege.READ
        )
      ).toThrow(AuthorizationInvalidPolicyException);

      // Also when inheritedCredentialRuleSet is undefined
      const authNoInherited = {
        id: 'auth-no-inherited',
        type: 'SPACE',
        credentialRules: [],
        privilegeRules: [],
        inheritedCredentialRuleSet: undefined,
      } as unknown as IAuthorizationPolicy;

      expect(() =>
        service.validateAuthorization(
          authNoInherited,
          'test',
          AuthorizationPrivilege.READ
        )
      ).toThrow(AuthorizationInvalidPolicyException);
    });

    it('should throw ForbiddenException when authorization is undefined', () => {
      expect(() =>
        service.validateAuthorization(
          undefined,
          'test',
          AuthorizationPrivilege.READ
        )
      ).toThrow(ForbiddenException);
    });
  });

  describe('getGrantedPrivileges', () => {
    it('should collect privileges from inherited credential rules', () => {
      const authorization = {
        id: 'auth-gp-1',
        type: 'SPACE',
        credentialRules: [],
        privilegeRules: [],
        inheritedCredentialRuleSet: {
          credentialRules: [
            {
              grantedPrivileges: [
                AuthorizationPrivilege.READ,
                AuthorizationPrivilege.UPDATE,
              ],
              criterias: [{ type: 'global-admin', resourceID: '' }],
              cascade: true,
              name: 'inherited-admin',
            },
          ],
        },
      } as unknown as IAuthorizationPolicy;

      const credentials = [{ type: 'global-admin', resourceID: '' }];

      const result = service.getGrantedPrivileges(credentials, authorization);

      expect(result).toContain(AuthorizationPrivilege.READ);
      expect(result).toContain(AuthorizationPrivilege.UPDATE);
    });

    it('should combine privileges from inherited and local rules', () => {
      const authorization = {
        id: 'auth-gp-2',
        type: 'SPACE',
        credentialRules: [
          {
            grantedPrivileges: [AuthorizationPrivilege.DELETE],
            criterias: [{ type: 'space-admin', resourceID: 'space-1' }],
            cascade: false,
            name: 'local-admin-delete',
          },
        ],
        privilegeRules: [],
        inheritedCredentialRuleSet: {
          credentialRules: [
            {
              grantedPrivileges: [AuthorizationPrivilege.READ],
              criterias: [{ type: 'global-admin', resourceID: '' }],
              cascade: true,
              name: 'inherited-admin-read',
            },
          ],
        },
      } as unknown as IAuthorizationPolicy;

      const credentials = [
        { type: 'global-admin', resourceID: '' },
        { type: 'space-admin', resourceID: 'space-1' },
      ];

      const result = service.getGrantedPrivileges(credentials, authorization);

      expect(result).toContain(AuthorizationPrivilege.READ);
      expect(result).toContain(AuthorizationPrivilege.DELETE);
    });

    it('should work when inheritedCredentialRuleSet is undefined', () => {
      const authorization = {
        id: 'auth-gp-3',
        type: 'SPACE',
        credentialRules: [
          {
            grantedPrivileges: [AuthorizationPrivilege.READ],
            criterias: [{ type: 'space-member', resourceID: 'space-1' }],
            cascade: false,
            name: 'local-read',
          },
        ],
        privilegeRules: [],
        inheritedCredentialRuleSet: undefined,
      } as unknown as IAuthorizationPolicy;

      const credentials = [{ type: 'space-member', resourceID: 'space-1' }];

      const result = service.getGrantedPrivileges(credentials, authorization);

      expect(result).toContain(AuthorizationPrivilege.READ);
      expect(result).toHaveLength(1);
    });
  });

  describe('logCredentialCheckFailDetails', () => {
    it('should include inherited rule count in debug log message', () => {
      const agentInfo = {
        email: 'test@example.com',
        credentials: [{ type: 'space-member', resourceID: 'space-1' }],
      } as any;

      const authorization = {
        id: 'auth-log-1',
        type: 'SPACE',
        credentialRules: [{ name: 'rule-1' }, { name: 'rule-2' }],
        privilegeRules: [],
        inheritedCredentialRuleSet: {
          credentialRules: [
            { name: 'inherited-1' },
            { name: 'inherited-2' },
            { name: 'inherited-3' },
          ],
        },
      } as unknown as IAuthorizationPolicy;

      service.logCredentialCheckFailDetails(
        'access denied',
        agentInfo,
        authorization
      );

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('inherited rules: 3'),
        expect.any(String)
      );
    });
  });
});

import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import {
  EntityNotInitializedException,
  ForbiddenException,
} from '@common/exceptions';
import { AuthorizationInvalidPolicyException } from '@common/exceptions/authorization.invalid.policy.exception';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthorizationService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAuthorization', () => {
    it('should throw ForbiddenException when authorization is undefined', () => {
      expect(() =>
        service.validateAuthorization(
          undefined,
          'test',
          AuthorizationPrivilege.READ
        )
      ).toThrow(ForbiddenException);
    });

    it('should throw AuthorizationInvalidPolicyException when no credential rules', () => {
      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [],
        privilegeRules: [],
      } as any;

      expect(() =>
        service.validateAuthorization(auth, 'test', AuthorizationPrivilege.READ)
      ).toThrow(AuthorizationInvalidPolicyException);
    });

    it('should return authorization when valid', () => {
      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'rule-1',
            criterias: [
              {
                type: AuthorizationCredential.GLOBAL_ADMIN,
                resourceID: '',
              },
            ],
            grantedPrivileges: [AuthorizationPrivilege.READ],
          },
        ],
        privilegeRules: [],
      } as any;

      const result = service.validateAuthorization(
        auth,
        'test',
        AuthorizationPrivilege.READ
      );

      expect(result).toBe(auth);
    });
  });

  describe('isAccessGranted', () => {
    it('should throw when authorization is undefined', () => {
      const actorContext = new ActorContext();
      actorContext.credentials = [];

      expect(() =>
        service.isAccessGranted(
          actorContext,
          undefined,
          AuthorizationPrivilege.READ
        )
      ).toThrow(EntityNotInitializedException);
    });

    it('should return true when credential matches privilege', () => {
      const actorContext = new ActorContext();
      actorContext.credentials = [
        {
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        },
      ];

      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'admin-rule',
            criterias: [
              {
                type: AuthorizationCredential.GLOBAL_ADMIN,
                resourceID: '',
              },
            ],
            grantedPrivileges: [AuthorizationPrivilege.READ],
          },
        ],
        privilegeRules: [],
      } as any;

      expect(
        service.isAccessGranted(actorContext, auth, AuthorizationPrivilege.READ)
      ).toBe(true);
    });

    it('should return false when no credential matches', () => {
      const actorContext = new ActorContext();
      actorContext.credentials = [
        {
          type: AuthorizationCredential.GLOBAL_ANONYMOUS,
          resourceID: '',
        },
      ];

      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'admin-rule',
            criterias: [
              {
                type: AuthorizationCredential.GLOBAL_ADMIN,
                resourceID: '',
              },
            ],
            grantedPrivileges: [AuthorizationPrivilege.READ],
          },
        ],
        privilegeRules: [],
      } as any;

      expect(
        service.isAccessGranted(actorContext, auth, AuthorizationPrivilege.READ)
      ).toBe(false);
    });

    it('should match with resourceID when specified', () => {
      const actorContext = new ActorContext();
      actorContext.credentials = [
        {
          type: AuthorizationCredential.SPACE_ADMIN,
          resourceID: 'space-1',
        },
      ];

      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'space-admin-rule',
            criterias: [
              {
                type: AuthorizationCredential.SPACE_ADMIN,
                resourceID: 'space-1',
              },
            ],
            grantedPrivileges: [AuthorizationPrivilege.UPDATE],
          },
        ],
        privilegeRules: [],
      } as any;

      expect(
        service.isAccessGranted(
          actorContext,
          auth,
          AuthorizationPrivilege.UPDATE
        )
      ).toBe(true);
    });

    it('should use privilege rules for escalation', () => {
      const actorContext = new ActorContext();
      actorContext.credentials = [
        {
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        },
      ];

      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'admin-rule',
            criterias: [
              {
                type: AuthorizationCredential.GLOBAL_ADMIN,
                resourceID: '',
              },
            ],
            grantedPrivileges: [AuthorizationPrivilege.READ],
          },
        ],
        privilegeRules: [
          {
            name: 'read-to-update',
            sourcePrivilege: AuthorizationPrivilege.READ,
            grantedPrivileges: [AuthorizationPrivilege.UPDATE],
          },
        ],
      } as any;

      expect(
        service.isAccessGranted(
          actorContext,
          auth,
          AuthorizationPrivilege.UPDATE
        )
      ).toBe(true);
    });
  });

  describe('grantAccessOrFail', () => {
    it('should return true when access is granted', () => {
      const actorContext = new ActorContext();
      actorContext.credentials = [
        {
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        },
      ];

      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'admin-rule',
            criterias: [
              {
                type: AuthorizationCredential.GLOBAL_ADMIN,
                resourceID: '',
              },
            ],
            grantedPrivileges: [AuthorizationPrivilege.READ],
          },
        ],
        privilegeRules: [],
      } as any;

      expect(
        service.grantAccessOrFail(
          actorContext,
          auth,
          AuthorizationPrivilege.READ,
          'test'
        )
      ).toBe(true);
    });

    it('should throw ForbiddenAuthorizationPolicyException when access denied', () => {
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';
      actorContext.credentials = [
        {
          type: AuthorizationCredential.GLOBAL_ANONYMOUS,
          resourceID: '',
        },
      ];

      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'admin-rule',
            criterias: [
              {
                type: AuthorizationCredential.GLOBAL_ADMIN,
                resourceID: '',
              },
            ],
            grantedPrivileges: [AuthorizationPrivilege.READ],
          },
        ],
        privilegeRules: [],
      } as any;

      expect(() =>
        service.grantAccessOrFail(
          actorContext,
          auth,
          AuthorizationPrivilege.READ,
          'test'
        )
      ).toThrow(ForbiddenAuthorizationPolicyException);
    });
  });

  describe('getGrantedPrivileges', () => {
    it('should return all granted privileges from credential rules', () => {
      const credentials = [
        {
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        },
      ];

      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'admin-rule',
            criterias: [
              {
                type: AuthorizationCredential.GLOBAL_ADMIN,
                resourceID: '',
              },
            ],
            grantedPrivileges: [
              AuthorizationPrivilege.READ,
              AuthorizationPrivilege.UPDATE,
            ],
          },
        ],
        privilegeRules: [],
      } as any;

      const result = service.getGrantedPrivileges(credentials, auth);

      expect(result).toContain(AuthorizationPrivilege.READ);
      expect(result).toContain(AuthorizationPrivilege.UPDATE);
    });

    it('should include privileges from privilege rules', () => {
      const credentials = [
        {
          type: AuthorizationCredential.GLOBAL_ADMIN,
          resourceID: '',
        },
      ];

      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'admin-rule',
            criterias: [
              {
                type: AuthorizationCredential.GLOBAL_ADMIN,
                resourceID: '',
              },
            ],
            grantedPrivileges: [AuthorizationPrivilege.READ],
          },
        ],
        privilegeRules: [
          {
            name: 'read-grants-update',
            sourcePrivilege: AuthorizationPrivilege.READ,
            grantedPrivileges: [AuthorizationPrivilege.DELETE],
          },
        ],
      } as any;

      const result = service.getGrantedPrivileges(credentials, auth);

      expect(result).toContain(AuthorizationPrivilege.READ);
      expect(result).toContain(AuthorizationPrivilege.DELETE);
    });

    it('should return empty array when no credentials match', () => {
      const credentials = [
        {
          type: AuthorizationCredential.GLOBAL_ANONYMOUS,
          resourceID: '',
        },
      ];

      const auth: IAuthorizationPolicy = {
        id: 'auth-1',
        type: 'test',
        credentialRules: [
          {
            name: 'admin-rule',
            criterias: [
              {
                type: AuthorizationCredential.GLOBAL_ADMIN,
                resourceID: '',
              },
            ],
            grantedPrivileges: [AuthorizationPrivilege.READ],
          },
        ],
        privilegeRules: [],
      } as any;

      const result = service.getGrantedPrivileges(credentials, auth);

      expect(result).toEqual([]);
    });
  });

  describe('replacer', () => {
    it('should filter out createdDate, updatedDate, version, and id', () => {
      expect(service.replacer('createdDate', 'val')).toBeUndefined();
      expect(service.replacer('updatedDate', 'val')).toBeUndefined();
      expect(service.replacer('version', 'val')).toBeUndefined();
      expect(service.replacer('id', 'val')).toBeUndefined();
    });

    it('should keep other keys', () => {
      expect(service.replacer('type', 'admin')).toBe('admin');
      expect(service.replacer('resourceID', 'res-1')).toBe('res-1');
    });
  });
});

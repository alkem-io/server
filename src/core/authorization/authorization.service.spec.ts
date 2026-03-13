import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IAuthorizationPolicyRuleCredential } from './authorization.policy.rule.credential.interface';
import { IAuthorizationPolicyRulePrivilege } from './authorization.policy.rule.privilege.interface';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

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

  // --- helpers ---
  function makeActorContext(
    credentials: { type: string; resourceID: string }[] = []
  ): ActorContext {
    const ctx = new ActorContext();
    ctx.actorID = 'actor-1';
    ctx.credentials = credentials;
    return ctx;
  }

  function makeCredentialRule(
    overrides: Partial<IAuthorizationPolicyRuleCredential> = {}
  ): IAuthorizationPolicyRuleCredential {
    return {
      criterias: [{ type: 'global-admin', resourceID: '' }],
      grantedPrivileges: [AuthorizationPrivilege.READ],
      cascade: false,
      name: 'test-rule',
      ...overrides,
    } as IAuthorizationPolicyRuleCredential;
  }

  function makeAuthorization(
    overrides: Partial<IAuthorizationPolicy> = {}
  ): IAuthorizationPolicy {
    return {
      id: 'auth-1',
      type: AuthorizationPolicyType.SPACE,
      credentialRules: [makeCredentialRule()],
      privilegeRules: [],
      ...overrides,
    } as IAuthorizationPolicy;
  }

  describe('validateAuthorization', () => {
    it('throws ForbiddenException when authorization is undefined', () => {
      expect(() =>
        service.validateAuthorization(
          undefined,
          'test',
          AuthorizationPrivilege.READ
        )
      ).toThrow('Authorization: no definition provided');
    });

    it('throws AuthorizationInvalidPolicyException when credentialRules is empty', () => {
      const auth = makeAuthorization({ credentialRules: [] });
      expect(() =>
        service.validateAuthorization(
          auth,
          'test msg',
          AuthorizationPrivilege.READ
        )
      ).toThrow('AuthorizationPolicy without credential rules provided');
    });

    it('returns authorization when valid', () => {
      const auth = makeAuthorization();
      const result = service.validateAuthorization(
        auth,
        'test',
        AuthorizationPrivilege.READ
      );
      expect(result).toBe(auth);
    });
  });

  describe('isAccessGranted', () => {
    it('throws when authorization is undefined', () => {
      const ctx = makeActorContext();
      expect(() =>
        service.isAccessGranted(ctx, undefined, AuthorizationPrivilege.READ)
      ).toThrow('Authorization: no definition provided');
    });

    it('returns true when credential matches a rule granting the privilege', () => {
      const ctx = makeActorContext([{ type: 'global-admin', resourceID: '' }]);
      const auth = makeAuthorization();
      expect(
        service.isAccessGranted(ctx, auth, AuthorizationPrivilege.READ)
      ).toBe(true);
    });

    it('returns false when no credential matches', () => {
      const ctx = makeActorContext([
        { type: 'some-other-cred', resourceID: '' },
      ]);
      const auth = makeAuthorization();
      expect(
        service.isAccessGranted(ctx, auth, AuthorizationPrivilege.READ)
      ).toBe(false);
    });

    it('returns false when credential matches but wrong privilege requested', () => {
      const ctx = makeActorContext([{ type: 'global-admin', resourceID: '' }]);
      const auth = makeAuthorization();
      expect(
        service.isAccessGranted(ctx, auth, AuthorizationPrivilege.CREATE)
      ).toBe(false);
    });

    it('returns true via privilege rule when source privilege is granted', () => {
      const ctx = makeActorContext([{ type: 'global-admin', resourceID: '' }]);
      const privRule: IAuthorizationPolicyRulePrivilege = {
        sourcePrivilege: AuthorizationPrivilege.READ,
        grantedPrivileges: [AuthorizationPrivilege.CREATE],
        name: 'privilege-escalation',
      } as IAuthorizationPolicyRulePrivilege;
      const auth = makeAuthorization({ privilegeRules: [privRule] });
      expect(
        service.isAccessGranted(ctx, auth, AuthorizationPrivilege.CREATE)
      ).toBe(true);
    });

    it('returns false via privilege rule when source privilege is NOT granted', () => {
      const ctx = makeActorContext([
        { type: 'some-other-cred', resourceID: '' },
      ]);
      const privRule: IAuthorizationPolicyRulePrivilege = {
        sourcePrivilege: AuthorizationPrivilege.READ,
        grantedPrivileges: [AuthorizationPrivilege.CREATE],
        name: 'privilege-escalation',
      } as IAuthorizationPolicyRulePrivilege;
      const auth = makeAuthorization({ privilegeRules: [privRule] });
      expect(
        service.isAccessGranted(ctx, auth, AuthorizationPrivilege.CREATE)
      ).toBe(false);
    });
  });

  describe('isAccessGrantedForCredentials', () => {
    it('throws when authorization is undefined', () => {
      expect(() =>
        service.isAccessGrantedForCredentials(
          [],
          undefined,
          AuthorizationPrivilege.READ
        )
      ).toThrow('Authorization: no definition provided');
    });

    it('matches credential with specific resourceID', () => {
      const auth = makeAuthorization({
        credentialRules: [
          makeCredentialRule({
            criterias: [
              { type: 'space-member', resourceID: 'space-123' },
            ] as any,
          }),
        ],
      });
      // matching resourceID
      expect(
        service.isAccessGrantedForCredentials(
          [{ type: 'space-member', resourceID: 'space-123' }],
          auth,
          AuthorizationPrivilege.READ
        )
      ).toBe(true);
      // non-matching resourceID
      expect(
        service.isAccessGrantedForCredentials(
          [{ type: 'space-member', resourceID: 'space-999' }],
          auth,
          AuthorizationPrivilege.READ
        )
      ).toBe(false);
    });

    it('matches credential with empty resourceID (wildcard)', () => {
      const auth = makeAuthorization({
        credentialRules: [
          makeCredentialRule({
            criterias: [{ type: 'global-admin', resourceID: '' }] as any,
          }),
        ],
      });
      // any resourceID should match when criteria resourceID is ''
      expect(
        service.isAccessGrantedForCredentials(
          [{ type: 'global-admin', resourceID: 'anything' }],
          auth,
          AuthorizationPrivilege.READ
        )
      ).toBe(true);
    });

    it('throws for credential rule without criterias', () => {
      const auth = makeAuthorization({
        credentialRules: [makeCredentialRule({ criterias: [] as any })],
      });
      expect(() =>
        service.isAccessGrantedForCredentials(
          [{ type: 'global-admin', resourceID: '' }],
          auth,
          AuthorizationPrivilege.READ
        )
      ).toThrow('Credential rule without criteria');
    });
  });

  describe('grantAccessOrFail', () => {
    it('returns true when access is granted', () => {
      const ctx = makeActorContext([{ type: 'global-admin', resourceID: '' }]);
      const auth = makeAuthorization();
      const result = service.grantAccessOrFail(
        ctx,
        auth,
        AuthorizationPrivilege.READ,
        'test'
      );
      expect(result).toBe(true);
    });

    it('throws ForbiddenAuthorizationPolicyException when access is denied', () => {
      const ctx = makeActorContext([{ type: 'other', resourceID: '' }]);
      const auth = makeAuthorization();
      expect(() =>
        service.grantAccessOrFail(
          ctx,
          auth,
          AuthorizationPrivilege.READ,
          'test'
        )
      ).toThrow("unable to grant 'read' privilege");
    });

    it('throws when authorization is undefined', () => {
      const ctx = makeActorContext();
      expect(() =>
        service.grantAccessOrFail(
          ctx,
          undefined,
          AuthorizationPrivilege.READ,
          'test'
        )
      ).toThrow('Authorization: no definition provided');
    });
  });

  describe('getGrantedPrivileges', () => {
    it('returns all privileges from matching credential rules', () => {
      const credentials = [{ type: 'global-admin', resourceID: '' }];
      const auth = makeAuthorization({
        credentialRules: [
          makeCredentialRule({
            grantedPrivileges: [
              AuthorizationPrivilege.READ,
              AuthorizationPrivilege.CREATE,
            ],
          }),
        ],
      });
      const result = service.getGrantedPrivileges(credentials, auth);
      expect(result).toContain(AuthorizationPrivilege.READ);
      expect(result).toContain(AuthorizationPrivilege.CREATE);
    });

    it('returns empty when no credentials match', () => {
      const credentials = [{ type: 'unknown', resourceID: '' }];
      const auth = makeAuthorization();
      const result = service.getGrantedPrivileges(credentials, auth);
      expect(result).toEqual([]);
    });

    it('includes privileges from privilege rules', () => {
      const credentials = [{ type: 'global-admin', resourceID: '' }];
      const privRule: IAuthorizationPolicyRulePrivilege = {
        sourcePrivilege: AuthorizationPrivilege.READ,
        grantedPrivileges: [AuthorizationPrivilege.DELETE],
        name: 'read-grants-delete',
      } as IAuthorizationPolicyRulePrivilege;
      const auth = makeAuthorization({ privilegeRules: [privRule] });
      const result = service.getGrantedPrivileges(credentials, auth);
      expect(result).toContain(AuthorizationPrivilege.READ);
      expect(result).toContain(AuthorizationPrivilege.DELETE);
    });

    it('deduplicates privileges', () => {
      const credentials = [{ type: 'global-admin', resourceID: '' }];
      const auth = makeAuthorization({
        credentialRules: [
          makeCredentialRule({
            grantedPrivileges: [
              AuthorizationPrivilege.READ,
              AuthorizationPrivilege.READ,
            ],
          }),
        ],
      });
      const result = service.getGrantedPrivileges(credentials, auth);
      const readCount = result.filter(
        p => p === AuthorizationPrivilege.READ
      ).length;
      expect(readCount).toBe(1);
    });
  });

  describe('replacer', () => {
    it('removes createdDate, updatedDate, version, id keys', () => {
      const obj = {
        type: 'admin',
        id: '123',
        createdDate: new Date(),
        updatedDate: new Date(),
        version: 1,
        resourceID: 'res-1',
      };
      const result = JSON.parse(JSON.stringify(obj, service.replacer));
      expect(result.type).toBe('admin');
      expect(result.resourceID).toBe('res-1');
      expect(result.id).toBeUndefined();
      expect(result.createdDate).toBeUndefined();
      expect(result.updatedDate).toBeUndefined();
      expect(result.version).toBeUndefined();
    });
  });

  describe('logCredentialCheckFailDetails', () => {
    it('does not throw', () => {
      const ctx = makeActorContext([{ type: 'admin', resourceID: '' }]);
      const auth = makeAuthorization();
      expect(() =>
        service.logCredentialCheckFailDetails('some error', ctx, auth)
      ).not.toThrow();
    });
  });

  describe('logActorContext', () => {
    it('does not throw', () => {
      const ctx = makeActorContext([{ type: 'admin', resourceID: '' }]);
      expect(() => service.logActorContext(ctx)).not.toThrow();
    });
  });
});

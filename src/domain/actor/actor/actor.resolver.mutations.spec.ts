import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CredentialType } from '@common/enums/credential.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoleSetCacheService } from '@domain/access/role-set/role.set.service.cache';
import { Test } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { vi } from 'vitest';
import { ActorResolverMutations } from './actor.resolver.mutations';
import { ActorService } from './actor.service';

describe('ActorResolverMutations', () => {
  let resolver: ActorResolverMutations;
  let actorService: any;
  let authorizationService: any;
  let platformAuthorizationService: any;
  let communityResolverService: any;
  let roleSetCacheService: any;

  const mockActorContext = { actorID: 'caller-1' } as any;
  const mockPlatformAuth = { id: 'platform-auth' };

  beforeEach(async () => {
    actorService = {
      grantCredentialOrFail: vi.fn(),
      revokeCredential: vi.fn(),
      getActorOrFail: vi.fn(),
      updateNameID: vi.fn(),
    };

    authorizationService = {
      grantAccessOrFail: vi.fn(),
    };

    platformAuthorizationService = {
      getPlatformAuthorizationPolicy: vi
        .fn()
        .mockResolvedValue(mockPlatformAuth),
    };

    communityResolverService = {
      getRoleSetIdForSpace: vi.fn().mockResolvedValue(undefined),
    };

    roleSetCacheService = {
      cleanActorMembershipCache: vi.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActorResolverMutations,
        { provide: ActorService, useValue: actorService },
        { provide: AuthorizationService, useValue: authorizationService },
        {
          provide: PlatformAuthorizationPolicyService,
          useValue: platformAuthorizationService,
        },
        {
          provide: CommunityResolverService,
          useValue: communityResolverService,
        },
        { provide: RoleSetCacheService, useValue: roleSetCacheService },
      ],
    }).compile();

    resolver = module.get(ActorResolverMutations);
  });

  describe('grantCredentialToActor', () => {
    it('should check authorization and grant credential', async () => {
      const credential = { id: 'cred-1', type: 'admin' };
      actorService.grantCredentialOrFail.mockResolvedValue(credential);

      const result = await resolver.grantCredentialToActor(
        mockActorContext,
        'actor-1',
        CredentialType.ORGANIZATION_ADMIN,
        'res-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'actor-1',
        { type: CredentialType.ORGANIZATION_ADMIN, resourceID: 'res-1' }
      );
      expect(result).toBe(credential);
    });

    it('should use empty string resourceID when not provided', async () => {
      const credential = { id: 'cred-1' };
      actorService.grantCredentialOrFail.mockResolvedValue(credential);

      await resolver.grantCredentialToActor(
        mockActorContext,
        'actor-1',
        CredentialType.ORGANIZATION_ADMIN
      );

      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'actor-1',
        { type: CredentialType.ORGANIZATION_ADMIN, resourceID: '' }
      );
    });
  });

  describe('revokeCredentialFromActor', () => {
    it('should check authorization and revoke credential', async () => {
      actorService.revokeCredential.mockResolvedValue(true);

      const result = await resolver.revokeCredentialFromActor(
        mockActorContext,
        'actor-1',
        CredentialType.ORGANIZATION_ADMIN,
        'res-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(actorService.revokeCredential).toHaveBeenCalledWith('actor-1', {
        type: CredentialType.ORGANIZATION_ADMIN,
        resourceID: 'res-1',
      });
      expect(result).toBe(true);
    });
  });

  describe('role-set membership cache invalidation (space role credentials)', () => {
    it('cleans the role-set membership cache when a SPACE_MEMBER credential is revoked', async () => {
      actorService.revokeCredential.mockResolvedValue(true);
      communityResolverService.getRoleSetIdForSpace.mockResolvedValue('rs-1');

      await resolver.revokeCredentialFromActor(
        mockActorContext,
        'actor-1',
        CredentialType.SPACE_MEMBER,
        'space-1'
      );

      expect(
        communityResolverService.getRoleSetIdForSpace
      ).toHaveBeenCalledWith('space-1');
      expect(
        roleSetCacheService.cleanActorMembershipCache
      ).toHaveBeenCalledWith('actor-1', 'rs-1');
    });

    it('does not touch the cache for non-space credentials', async () => {
      actorService.revokeCredential.mockResolvedValue(true);

      await resolver.revokeCredentialFromActor(
        mockActorContext,
        'actor-1',
        CredentialType.ORGANIZATION_ADMIN,
        'res-1'
      );

      expect(
        roleSetCacheService.cleanActorMembershipCache
      ).not.toHaveBeenCalled();
    });

    it('never fails the mutation when the cache clean throws (best-effort)', async () => {
      actorService.revokeCredential.mockResolvedValue(true);
      communityResolverService.getRoleSetIdForSpace.mockRejectedValue(
        new Error('lookup down')
      );

      await expect(
        resolver.revokeCredentialFromActor(
          mockActorContext,
          'actor-1',
          CredentialType.SPACE_MEMBER,
          'space-1'
        )
      ).resolves.toBe(true);
    });
  });

  // 027-platform-role-redesign (sec-server-9 fix): the twelve new
  // `platform-*`/`feature-*` role credentials must be rejected outright by
  // this generic, un-censused mutation — before ANY authorization check or
  // data write — so a `global-support`/`global-license-manager` holder
  // (both reach `PLATFORM_ADMIN`) cannot self-grant Platform Roles Admin,
  // combine it with Platform Audit Reader, or grant Platform Spaces Reader
  // to an arbitrary account, all with zero audit trail.
  describe('restricted role-credential rejection (sec-server-9 fix)', () => {
    it('rejects grantCredentialToActor(platform-roles-admin) before any authorization check or data write', async () => {
      await expect(
        resolver.grantCredentialToActor(
          mockActorContext,
          'actor-1',
          CredentialType.PLATFORM_ROLES_ADMIN
        )
      ).rejects.toThrow(/may not be granted or revoked through this mutation/);

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(actorService.grantCredentialOrFail).not.toHaveBeenCalled();
    });

    it('rejects revokeCredentialFromActor(platform-audit-reader) before any authorization check or data write', async () => {
      await expect(
        resolver.revokeCredentialFromActor(
          mockActorContext,
          'actor-1',
          CredentialType.PLATFORM_AUDIT_READER
        )
      ).rejects.toThrow(/may not be granted or revoked through this mutation/);

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(actorService.revokeCredential).not.toHaveBeenCalled();
    });

    it('rejects grantCredentialToActor(platform-spaces-reader) — the service-account-only role', async () => {
      await expect(
        resolver.grantCredentialToActor(
          mockActorContext,
          'actor-1',
          CredentialType.PLATFORM_SPACES_READER
        )
      ).rejects.toThrow(/may not be granted or revoked through this mutation/);
    });

    it('rejects a feature-* role too (feature-beta-tester)', async () => {
      await expect(
        resolver.grantCredentialToActor(
          mockActorContext,
          'actor-1',
          CredentialType.FEATURE_BETA_TESTER
        )
      ).rejects.toThrow(/may not be granted or revoked through this mutation/);
    });

    // T077 (Slice B): the fixture credential was `global-admin`, which the
    // mechanical substitution turned into `platform-content-full-access` — a
    // credential the sec-server-9 guard now REJECTS, inverting the test's own
    // point. Re-aimed at `organization-admin`: a genuine non-role-family
    // credential, which is what "every other credential type" means.
    it('leaves every other (non-role-family) credential type unaffected', async () => {
      const credential = { id: 'cred-1' };
      actorService.grantCredentialOrFail.mockResolvedValue(credential);

      await expect(
        resolver.grantCredentialToActor(
          mockActorContext,
          'actor-1',
          CredentialType.ORGANIZATION_ADMIN
        )
      ).resolves.toBe(credential);
    });
  });
  // 027-platform-role-redesign (T078/T083a, FR-020, A17) — the gate spec for
  // `updateActorNameID`, the first of A17's two surfaces. Its twin (the
  // protected `nameID` section of `updateSpace`) is covered in
  // space.resolver.mutations.spec.ts.
  describe('updateActorNameID (A17, FR-020)', () => {
    const actor = {
      id: 'actor-1',
      authorization: { id: 'actor-auth' },
    } as any;

    it("checks UPDATE_NAMEID against the ACTOR's own policy, never the platform policy", async () => {
      actorService.getActorOrFail.mockResolvedValue(actor);
      actorService.updateNameID.mockResolvedValue(actor);

      await resolver.updateActorNameID(mockActorContext, {
        actorID: 'actor-1',
        nameID: 'new-name',
      });

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        actor.authorization,
        AuthorizationPrivilege.UPDATE_NAMEID,
        expect.any(String)
      );
      // A17 leaves the platform-admin surface entirely: no global role
      // reaches a rename, so the platform policy must not be consulted at all.
      expect(
        platformAuthorizationService.getPlatformAuthorizationPolicy
      ).not.toHaveBeenCalled();
      expect(actorService.updateNameID).toHaveBeenCalledWith(
        'actor-1',
        'new-name'
      );
    });

    it('does not rename when the privilege check throws', async () => {
      actorService.getActorOrFail.mockResolvedValue(actor);
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('denied');
      });

      await expect(
        resolver.updateActorNameID(mockActorContext, {
          actorID: 'actor-1',
          nameID: 'squatted-name',
        })
      ).rejects.toThrow();
      expect(actorService.updateNameID).not.toHaveBeenCalled();
    });
  });
});

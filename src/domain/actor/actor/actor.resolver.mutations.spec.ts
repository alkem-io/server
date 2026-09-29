import { CredentialType } from '@common/enums/credential.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoleSetCacheInvalidationService } from '@domain/access/role-set/role.set.service.cache.invalidation';
import { Test } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { vi } from 'vitest';
import { ActorResolverMutations } from './actor.resolver.mutations';
import { ActorService } from './actor.service';

describe('ActorResolverMutations', () => {
  let resolver: ActorResolverMutations;
  let actorService: any;
  let authorizationService: any;
  let platformAuthorizationService: any;
  let roleSetCacheInvalidationService: any;

  const mockActorContext = { actorID: 'caller-1' } as any;
  const mockPlatformAuth = { id: 'platform-auth' };

  beforeEach(async () => {
    actorService = {
      grantCredentialOrFail: vi.fn(),
      revokeCredential: vi.fn(),
    };

    authorizationService = {
      grantAccessOrFail: vi.fn(),
    };

    platformAuthorizationService = {
      getPlatformAuthorizationPolicy: vi
        .fn()
        .mockResolvedValue(mockPlatformAuth),
    };

    roleSetCacheInvalidationService = {
      invalidateForCredentialChange: vi.fn().mockResolvedValue(undefined),
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
          provide: RoleSetCacheInvalidationService,
          useValue: roleSetCacheInvalidationService,
        },
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
        CredentialType.GLOBAL_ADMIN,
        'res-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'actor-1',
        { type: CredentialType.GLOBAL_ADMIN, resourceID: 'res-1' }
      );
      expect(result).toBe(credential);
    });

    it('should use empty string resourceID when not provided', async () => {
      const credential = { id: 'cred-1' };
      actorService.grantCredentialOrFail.mockResolvedValue(credential);

      await resolver.grantCredentialToActor(
        mockActorContext,
        'actor-1',
        CredentialType.GLOBAL_ADMIN
      );

      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'actor-1',
        { type: CredentialType.GLOBAL_ADMIN, resourceID: '' }
      );
    });
  });

  describe('revokeCredentialFromActor', () => {
    it('should check authorization and revoke credential', async () => {
      actorService.revokeCredential.mockResolvedValue(true);

      const result = await resolver.revokeCredentialFromActor(
        mockActorContext,
        'actor-1',
        CredentialType.GLOBAL_ADMIN,
        'res-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(actorService.revokeCredential).toHaveBeenCalledWith('actor-1', {
        type: CredentialType.GLOBAL_ADMIN,
        resourceID: 'res-1',
      });
      expect(result).toBe(true);
    });
  });

  describe('role-set membership cache invalidation', () => {
    it('hands a granted credential to the invalidation service', async () => {
      actorService.grantCredentialOrFail.mockResolvedValue({ id: 'cred-1' });

      await resolver.grantCredentialToActor(
        mockActorContext,
        'actor-1',
        CredentialType.SPACE_MEMBER,
        'space-1'
      );

      expect(
        roleSetCacheInvalidationService.invalidateForCredentialChange
      ).toHaveBeenCalledWith('actor-1', CredentialType.SPACE_MEMBER, 'space-1');
    });

    it('hands a revoked credential to the invalidation service', async () => {
      actorService.revokeCredential.mockResolvedValue(true);

      await resolver.revokeCredentialFromActor(
        mockActorContext,
        'actor-1',
        CredentialType.ORGANIZATION_ADMIN,
        'org-1'
      );

      expect(
        roleSetCacheInvalidationService.invalidateForCredentialChange
      ).toHaveBeenCalledWith(
        'actor-1',
        CredentialType.ORGANIZATION_ADMIN,
        'org-1'
      );
    });

    it('passes a missing resourceID through unchanged', async () => {
      actorService.revokeCredential.mockResolvedValue(true);

      await resolver.revokeCredentialFromActor(
        mockActorContext,
        'actor-1',
        CredentialType.GLOBAL_ADMIN
      );

      expect(
        roleSetCacheInvalidationService.invalidateForCredentialChange
      ).toHaveBeenCalledWith('actor-1', CredentialType.GLOBAL_ADMIN, undefined);
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

    it('leaves every other (non-role-family) credential type unaffected — the legacy path stays reachable', async () => {
      const credential = { id: 'cred-1' };
      actorService.grantCredentialOrFail.mockResolvedValue(credential);

      await expect(
        resolver.grantCredentialToActor(
          mockActorContext,
          'actor-1',
          CredentialType.GLOBAL_ADMIN
        )
      ).resolves.toBe(credential);
    });
  });
});

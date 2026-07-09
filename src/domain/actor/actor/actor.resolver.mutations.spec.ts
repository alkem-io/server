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
        CredentialType.GLOBAL_ADMIN,
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
});

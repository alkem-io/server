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
});

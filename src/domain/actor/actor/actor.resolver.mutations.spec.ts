import { CredentialType } from '@common/enums/credential.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
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

    const module = await Test.createTestingModule({
      providers: [
        ActorResolverMutations,
        { provide: ActorService, useValue: actorService },
        { provide: AuthorizationService, useValue: authorizationService },
        {
          provide: PlatformAuthorizationPolicyService,
          useValue: platformAuthorizationService,
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
});

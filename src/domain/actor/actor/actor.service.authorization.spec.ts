import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { ActorAuthorizationService } from './actor.service.authorization';

describe('ActorAuthorizationService', () => {
  let service: ActorAuthorizationService;
  let authorizationPolicyService: {
    inheritParentAuthorization: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authorizationPolicyService = {
      inheritParentAuthorization: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActorAuthorizationService,
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
      ],
    }).compile();

    service = module.get(ActorAuthorizationService);
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization and assign to actor', () => {
      const actorAuth = { id: 'auth-1' };
      const parentAuth = { id: 'parent-auth' };
      const inheritedAuth = { id: 'inherited-auth' };
      const actor = { authorization: actorAuth } as any;

      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        inheritedAuth
      );

      const result = service.applyAuthorizationPolicy(actor, parentAuth as any);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(actorAuth, parentAuth);
      expect(result).toBe(inheritedAuth);
      expect(actor.authorization).toBe(inheritedAuth);
    });

    it('should handle undefined parent authorization', () => {
      const actorAuth = { id: 'auth-1' };
      const inheritedAuth = { id: 'inherited-auth' };
      const actor = { authorization: actorAuth } as any;

      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
        inheritedAuth
      );

      const result = service.applyAuthorizationPolicy(actor, undefined);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(actorAuth, undefined);
      expect(result).toBe(inheritedAuth);
    });
  });
});

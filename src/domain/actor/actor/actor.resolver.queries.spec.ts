import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { ActorResolverQueries } from './actor.resolver.queries';

describe('ActorResolverQueries', () => {
  let resolver: ActorResolverQueries;
  let actorLookupService: any;
  let authorizationService: any;

  const mockActorContext = { actorID: 'caller-1' } as any;

  beforeEach(async () => {
    actorLookupService = {
      getFullActorById: vi.fn(),
    };

    authorizationService = {
      grantAccessOrFail: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActorResolverQueries,
        { provide: ActorLookupService, useValue: actorLookupService },
        { provide: AuthorizationService, useValue: authorizationService },
      ],
    }).compile();

    resolver = module.get(ActorResolverQueries);
  });

  describe('actor', () => {
    it('should return null when actor not found', async () => {
      actorLookupService.getFullActorById.mockResolvedValue(null);

      const result = await resolver.actor(mockActorContext, 'actor-1');
      expect(result).toBeNull();
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
    });

    it('should check READ authorization and return actor', async () => {
      const actor = {
        id: 'actor-1',
        authorization: { id: 'auth-1' },
      };
      actorLookupService.getFullActorById.mockResolvedValue(actor);

      const result = await resolver.actor(mockActorContext, 'actor-1');

      expect(result).toBe(actor);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        actor.authorization,
        expect.any(String),
        'actor query'
      );
    });
  });
});

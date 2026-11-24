import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
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
      getFullActorByIdOrFail: vi.fn(),
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
    it('rejects with the not-found of a missing actor', async () => {
      const missing = new EntityNotFoundException(
        'Actor not found',
        LogContext.COMMUNITY,
        { actorID: 'actor-1' }
      );
      actorLookupService.getFullActorByIdOrFail.mockRejectedValue(missing);

      await expect(resolver.actor(mockActorContext, 'actor-1')).rejects.toBe(
        missing
      );
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
    });

    it('should check READ authorization and return actor', async () => {
      const actor = {
        id: 'actor-1',
        authorization: { id: 'auth-1' },
      };
      actorLookupService.getFullActorByIdOrFail.mockResolvedValue(actor);

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

import { ValueProvider } from '@nestjs/common';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { PublicPart } from '@test/utils/public-part';

export const MockActorLookupService: ValueProvider<
  PublicPart<ActorLookupService>
> = {
  provide: ActorLookupService,
  useValue: {
    getActorsManagedByUser: jest.fn(),
    getActorById: jest.fn(),
    getActorByIdOrFail: jest.fn(),
    getActorTypeById: jest.fn(),
    getActorTypeByIdOrFail: jest.fn(),
    getFullActorById: jest.fn(),
    getFullActorByIdOrFail: jest.fn(),
    actorsWithCredentials: jest.fn(),
    countActorsWithCredentials: jest.fn(),
    isType: jest.fn(),
    actorExists: jest.fn(),
  },
};

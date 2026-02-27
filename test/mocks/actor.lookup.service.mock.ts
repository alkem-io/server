import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '@test/utils/public-part';
import { vi } from 'vitest';

export const MockActorLookupService: ValueProvider<
  PublicPart<ActorLookupService>
> = {
  provide: ActorLookupService,
  useValue: {
    getActorsManagedByUser: vi.fn(),
    getActorById: vi.fn(),
    getActorByIdOrFail: vi.fn(),
    getActorTypeById: vi.fn(),
    getActorTypeByIdOrFail: vi.fn(),
    getFullActorById: vi.fn(),
    getFullActorByIdOrFail: vi.fn(),
    actorsWithCredentials: vi.fn(),
    getActorCredentials: vi.fn(),
    getActorCredentialsOrFail: vi.fn(),
    getActorIDsWithCredential: vi.fn(),
    getActorAuthorizationOrFail: vi.fn(),
    countActorsWithCredentials: vi.fn(),
    validateActorsAndGetTypes: vi.fn(),
    isType: vi.fn(),
    actorExists: vi.fn(),
  },
};

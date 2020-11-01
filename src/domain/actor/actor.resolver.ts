import { Resolver } from '@nestjs/graphql';
import { ActorService } from './actor.service';

@Resolver()
export class ActorResolver {
  constructor(private actorService: ActorService) {}
}

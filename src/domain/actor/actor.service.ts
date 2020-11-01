import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Actor } from './actor.entity';
import { IActor } from './actor.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActorInput } from './actor.dto';

@Injectable()
export class ActorService {
  constructor(
    @InjectRepository(Actor)
    private actorRepository: Repository<Actor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async createActor(actorData: ActorInput): Promise<IActor> {
    if (!actorData.name)
      throw new Error('A name is required to create an Actor');

    const actor = new Actor(actorData.name);
    actor.description = actorData.description;
    actor.value = actorData.value;
    actor.impact = actorData.impact;
    await this.actorRepository.save(actor);
    return actor;
  }

  async getActor(actorID: number): Promise<IActor | undefined> {
    return Actor.findOne({ id: actorID });
  }
}

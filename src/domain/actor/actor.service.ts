import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Actor } from './actor.entity';
import { IActor } from './actor.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActorInput } from './actor.dto';
import { ValidationException } from '../../utils/error-handling/validation.exception';
import { LogContexts } from '../../utils/logging/logging.contexts';
import { EntityNotFoundException } from '../../utils/error-handling/entity.not.found.exception';

@Injectable()
export class ActorService {
  constructor(
    @InjectRepository(Actor)
    private actorRepository: Repository<Actor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async createActor(actorData: ActorInput): Promise<IActor> {
    if (!actorData.name)
      throw new ValidationException(
        'A name is required to create an Actor',
        LogContexts.CHALLENGES
      );

    const actor = new Actor(actorData.name);
    if (actorData.description) {
      actor.description = actorData.description;
    }
    actor.value = actorData.value;
    actor.impact = actorData.impact;
    await this.actorRepository.save(actor);
    return actor;
  }

  async getActor(actorID: number): Promise<IActor | undefined> {
    return await this.actorRepository.findOne({ id: actorID });
  }

  async removeActor(actorID: number): Promise<boolean> {
    const actor = await this.getActor(actorID);
    if (!actor)
      throw new EntityNotFoundException(
        `Not able to locate actor with the specified ID: ${actorID}`,
        LogContexts.CHALLENGES
      );
    await this.actorRepository.remove(actor as Actor);
    return true;
  }

  async updateActor(actorID: number, actorData: ActorInput): Promise<IActor> {
    const actor = await this.getActor(actorID);
    if (!actor)
      throw new EntityNotFoundException(
        `Not able to locate actor with the specified ID: ${actorID}`,
        LogContexts.CHALLENGES
      );

    // Copy over the received data
    if (actorData.name) {
      actor.name = actorData.name;
    }

    if (actorData.description) {
      actor.description = actorData.description;
    }

    if (actorData.value) {
      actor.value = actorData.value;
    }

    if (actorData.impact) {
      actor.impact = actorData.impact;
    }

    await this.actorRepository.save(actor);

    return actor;
  }
}

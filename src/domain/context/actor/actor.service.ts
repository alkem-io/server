import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  UpdateActorInput,
  CreateActorInput,
  Actor,
  IActor,
} from '@domain/context/actor';
import {
  ValidationException,
  EntityNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import validator from 'validator';

@Injectable()
export class ActorService {
  constructor(
    @InjectRepository(Actor)
    private actorRepository: Repository<Actor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createActor(actorData: CreateActorInput): Promise<IActor> {
    if (!actorData.name)
      throw new ValidationException(
        'A name is required to create an Actor',
        LogContext.CHALLENGES
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

  async getActorOrFail(actorID: string): Promise<IActor> {
    if (validator.isNumeric(actorID)) {
      const idInt: number = parseInt(actorID);
      return await this.getActorByIdOrFail(idInt);
    }
    throw new EntityNotFoundException(
      `Not able to locate actor with the specified ID: ${actorID}`,
      LogContext.CHALLENGES
    );
  }

  async getActorByIdOrFail(actorID: number): Promise<IActor> {
    const actor = await this.actorRepository.findOne({ id: actorID });
    if (!actor)
      throw new EntityNotFoundException(
        `Not able to locate actor with the specified ID: ${actorID}`,
        LogContext.CHALLENGES
      );
    return actor;
  }

  async removeActor(actorID: number): Promise<boolean> {
    await this.getActorByIdOrFail(actorID);
    await this.actorRepository.delete(actorID);
    return true;
  }

  async updateActor(actorData: UpdateActorInput): Promise<IActor> {
    const actor = await this.getActorOrFail(actorData.ID);

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

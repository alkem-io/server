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
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { DeleteActorInput } from './actor.dto.delete';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';

@Injectable()
export class ActorService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
    @InjectRepository(Actor)
    private actorRepository: Repository<Actor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createActor(actorData: CreateActorInput): Promise<IActor> {
    const actor = Actor.create(actorData);
    actor.authorization = new AuthorizationDefinition();

    await this.actorRepository.save(actor);
    return actor;
  }

  async getActorOrFail(actorID: string): Promise<IActor> {
    const actor = await this.actorRepository.findOne({ id: actorID });
    if (!actor)
      throw new EntityNotFoundException(
        `Not able to locate actor with the specified ID: ${actorID}`,
        LogContext.CHALLENGES
      );
    return actor;
  }

  async deleteActor(deleteData: DeleteActorInput): Promise<IActor> {
    const actorID = deleteData.ID;
    const actor = await this.getActorOrFail(actorID);
    if (actor.authorization)
      await this.authorizationDefinitionService.delete(actor.authorization);
    const result = await this.actorRepository.remove(actor as Actor);
    result.id = deleteData.ID;
    return result;
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

  async saveActor(actor: IActor): Promise<IActor> {
    return await this.actorRepository.save(actor);
  }
}

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActorGroup } from './actor-group.entity';
import { IActorGroup } from './actor-group.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateActorGroupInput } from './actor-group.dto.create';
import { ActorService } from '@domain/context/actor/actor.service';
import { IActor } from '@domain/context/actor/actor.interface';
import {
  EntityNotFoundException,
  GroupNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateActorInput } from '@domain/context/actor';

@Injectable()
export class ActorGroupService {
  constructor(
    private actorService: ActorService,
    @InjectRepository(ActorGroup)
    private actorGroupRepository: Repository<ActorGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(actorGroup: IActorGroup): Promise<IActorGroup> {
    if (!actorGroup.actors) {
      actorGroup.actors = [];
    }

    return actorGroup;
  }

  async createActor(actorData: CreateActorInput): Promise<IActor> {
    const actorGroup = await this.getActorGroupOrFail(actorData.parentID);

    const actor = await this.actorService.createActor(actorData);
    if (!actorGroup.actors)
      throw new GroupNotInitializedException(
        `Non-initialised ActorGroup: ${actorData.parentID}`,
        LogContext.CHALLENGES
      );
    actorGroup.actors.push(actor);

    await this.actorGroupRepository.save(actorGroup);

    return actor;
  }

  async createActorGroup(
    actorGroupData: CreateActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup = new ActorGroup(actorGroupData.name);
    actorGroup.description = actorGroupData.description;
    await this.initialiseMembers(actorGroup);
    await this.actorGroupRepository.save(actorGroup);
    return actorGroup;
  }

  async removeActorGroup(actorGroupID: number): Promise<boolean> {
    const actorGroup = await this.getActorGroupOrFail(actorGroupID);
    if (actorGroup.actors) {
      for (const actor of actorGroup.actors) {
        await this.actorService.removeActor(actor.id);
      }
    }
    await this.actorGroupRepository.remove(actorGroup as ActorGroup);
    return true;
  }

  async getActorGroupOrFail(actorGroupID: number): Promise<IActorGroup> {
    const actorGroup = await this.actorGroupRepository.findOne({
      id: actorGroupID,
    });
    if (!actorGroup)
      throw new EntityNotFoundException(
        `Not able to locate actorGroup with the specified ID: ${actorGroupID}`,
        LogContext.CHALLENGES
      );
    return actorGroup;
  }
}

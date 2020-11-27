import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActorGroup } from './actor-group.entity';
import { IActorGroup } from './actor-group.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActorInput } from '../actor/actor.dto';
import { ActorGroupInput } from './actor-group.dto';
import { ActorService } from '../actor/actor.service';
import { IActor } from '../actor/actor.interface';
import { EntityNotFoundException } from '../../utils/error-handling/entity.not.found.exception';
import { LogContext } from '../../utils/logging/logging.contexts';
import { GroupNotInitializedException } from '../../utils/error-handling/group.not.initialized.exception';

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

  async createActor(
    actorGroupID: number,
    actorData: ActorInput
  ): Promise<IActor> {
    const actorGroup = await this.getActorGroup(actorGroupID);
    if (!actorGroup)
      throw new EntityNotFoundException(
        `Unable to locate actor group with id: ${actorGroupID}`,
        LogContext.CHALLENGES
      );

    const actor = await this.actorService.createActor(actorData);
    if (!actorGroup.actors)
      throw new GroupNotInitializedException(
        `Non-initialised ActorGroup: ${actorGroupID}`,
        LogContext.CHALLENGES
      );
    actorGroup.actors.push(actor);

    await this.actorGroupRepository.save(actorGroup);

    return actor;
  }

  async createActorGroup(
    actorGroupData: ActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup = new ActorGroup(actorGroupData.name);
    actorGroup.description = actorGroupData.description;
    await this.initialiseMembers(actorGroup);
    await this.actorGroupRepository.save(actorGroup);
    return actorGroup;
  }

  async removeActorGroup(actorGroupID: number): Promise<boolean> {
    const actorGroup = await this.getActorGroup(actorGroupID);
    if (!actorGroup)
      throw new EntityNotFoundException(
        `Not able to locate actorGroup with the specified ID: ${actorGroupID}`,
        LogContext.CHALLENGES
      );
    await this.actorGroupRepository.remove(actorGroup as ActorGroup);
    return true;
  }

  async getActorGroup(actorGroupID: number): Promise<IActorGroup | undefined> {
    return await this.actorGroupRepository.findOne({ id: actorGroupID });
  }
}

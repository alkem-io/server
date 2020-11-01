import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActorGroup } from './actor-group.entity';
import { IActorGroup } from './actor-group.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActorInput } from '../actor/actor.dto';
import { ActorGroupInput } from './actor-group.dto';

@Injectable()
export class ActorGroupService {
  constructor(
    @InjectRepository(ActorGroup)
    private actorGroupRepository: Repository<ActorGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  // Helper method to ensure all members are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  async initialiseMembers(actorGroup: IActorGroup): Promise<IActorGroup> {
    if (!actorGroup.actors) {
      actorGroup.actors = [];
    }

    return actorGroup;
  }

  async addActor(
    actorGroupID: number,
    actorData: ActorInput
  ): Promise<boolean> {
    const actorGroup = await this.getActorGroup(actorGroupID);
    if (!actorGroup)
      throw new Error(`Unable to locate actor group with id: ${actorGroupID}`);

    // Todo: fill out the rest of this when implement Actor ad return an Actor instance
    const name = actorData.name;
    if (!name)
      throw new Error(`Required name not specified on ${actorGroupID}`);
    return true;
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

  async getActorGroup(actorGroupID: number): Promise<IActorGroup | undefined> {
    return await this.actorGroupRepository.findOne({ id: actorGroupID });
  }
}

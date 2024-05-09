import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActorGroup,
  IActorGroup,
  CreateActorGroupInput,
  DeleteActorGroupInput,
} from '@domain/context/actor-group';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActorService } from '@domain/context/actor/actor.service';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  GroupNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateActorInput, IActor } from '@domain/context/actor';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Injectable()
export class ActorGroupService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private actorService: ActorService,
    @InjectRepository(ActorGroup)
    private actorGroupRepository: Repository<ActorGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createActorGroup(
    actorGroupData: CreateActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup: IActorGroup = ActorGroup.create({
      ...actorGroupData,
    });
    actorGroup.authorization = new AuthorizationPolicy();
    actorGroup.actors = [];
    return await this.actorGroupRepository.save(actorGroup);
  }

  async deleteActorGroup(
    deleteData: DeleteActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroupID = deleteData.ID;
    const actorGroup = await this.getActorGroupOrFail(actorGroupID);
    if (actorGroup.actors) {
      for (const actor of actorGroup.actors) {
        await this.actorService.deleteActor({ ID: actor.id });
      }
    }
    if (actorGroup.authorization)
      await this.authorizationPolicyService.delete(actorGroup.authorization);

    const result = await this.actorGroupRepository.remove(
      actorGroup as ActorGroup
    );
    result.id = actorGroupID;
    return result;
  }

  async getActorGroupOrFail(actorGroupID: string): Promise<IActorGroup> {
    const actorGroup = await this.actorGroupRepository.findOneBy({
      id: actorGroupID,
    });
    if (!actorGroup)
      throw new EntityNotFoundException(
        `Not able to locate actorGroup with the specified ID: ${actorGroupID}`,
        LogContext.SPACES
      );
    return actorGroup;
  }

  async createActor(actorData: CreateActorInput): Promise<IActor> {
    const actorGroup = await this.getActorGroupOrFail(actorData.actorGroupID);

    const actor = await this.actorService.createActor(actorData);
    if (!actorGroup.actors)
      throw new GroupNotInitializedException(
        `Non-initialised ActorGroup: ${actorData.actorGroupID}`,
        LogContext.SPACES
      );
    actorGroup.actors.push(actor);

    await this.actorGroupRepository.save(actorGroup);

    return actor;
  }

  getActors(actorGroup: IActorGroup): IActor[] {
    const actors = actorGroup.actors;
    if (!actors)
      throw new EntityNotInitializedException(
        `Actor groups not initialized: ${actorGroup.id}`,
        LogContext.CONTEXT
      );
    return actors;
  }
}

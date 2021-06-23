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
import { AuthorizationDefinition } from '@domain/common/authorization-definition';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';

@Injectable()
export class ActorGroupService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
    private actorService: ActorService,
    @InjectRepository(ActorGroup)
    private actorGroupRepository: Repository<ActorGroup>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createActorGroup(
    actorGroupData: CreateActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup = ActorGroup.create(actorGroupData);
    actorGroup.authorization = new AuthorizationDefinition();
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
      await this.authorizationDefinitionService.delete(
        actorGroup.authorization
      );

    const result = await this.actorGroupRepository.remove(
      actorGroup as ActorGroup
    );
    result.id = actorGroupID;
    return result;
  }

  async getActorGroupOrFail(actorGroupID: string): Promise<IActorGroup> {
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

  async createActor(actorData: CreateActorInput): Promise<IActor> {
    const actorGroup = await this.getActorGroupOrFail(actorData.actorGroupID);

    const actor = await this.actorService.createActor(actorData);
    if (!actorGroup.actors)
      throw new GroupNotInitializedException(
        `Non-initialised ActorGroup: ${actorData.actorGroupID}`,
        LogContext.CHALLENGES
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

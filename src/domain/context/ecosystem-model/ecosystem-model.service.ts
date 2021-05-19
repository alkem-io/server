import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import {
  CreateEcosystemModelInput,
  UpdateEcosystemModelInput,
  EcosystemModel,
  IEcosystemModel,
} from '@domain/context/ecosystem-model';
import {
  ActorGroupService,
  CreateActorGroupInput,
  IActorGroup,
} from '@domain/context/actor-group';
import { LogContext } from '@common/enums';

@Injectable()
export class EcosystemModelService {
  constructor(
    private actorGroupService: ActorGroupService,
    @InjectRepository(EcosystemModel)
    private ecosystemModelRepository: Repository<EcosystemModel>
  ) {}

  async createEcosystemModel(
    ecosystemModelData: CreateEcosystemModelInput
  ): Promise<IEcosystemModel> {
    const ecosystemModel: IEcosystemModel = EcosystemModel.create(
      ecosystemModelData
    );
    await this.createRestrictedActorGroups(ecosystemModel);
    ecosystemModel.actorGroups = [];
    return ecosystemModel;
  }

  async getEcosystemModelOrFail(
    ecosystemModelID: number
  ): Promise<IEcosystemModel> {
    const ecosystemModel = await this.ecosystemModelRepository.findOne({
      id: ecosystemModelID,
    });
    if (!ecosystemModel)
      throw new EntityNotFoundException(
        `No EcosystemModel found with the given id: ${ecosystemModelID}`,
        LogContext.CHALLENGES
      );
    return ecosystemModel;
  }

  async updateEcosystemModel(
    ecosystemModel: IEcosystemModel,
    ecosystemModelInput: UpdateEcosystemModelInput
  ): Promise<IEcosystemModel> {
    ecosystemModel.description = ecosystemModelInput.description;
    return await this.ecosystemModelRepository.save(EcosystemModel);
  }

  async deleteEcosystemModel(
    ecosystemModelID: number
  ): Promise<IEcosystemModel> {
    // Note need to load it in with all contained entities so can remove fully
    const ecosystemModel = await this.getEcosystemModelOrFail(ecosystemModelID);

    if (ecosystemModel.actorGroups) {
      for (const actorGroup of ecosystemModel.actorGroups) {
        await this.actorGroupService.deleteActorGroup({
          ID: actorGroup.id.toString(),
        });
      }
    }

    return await this.ecosystemModelRepository.remove(
      ecosystemModel as EcosystemModel
    );
  }

  async createRestrictedActorGroups(
    ecosystem: IEcosystemModel
  ): Promise<boolean> {
    if (!ecosystem.restrictedActorGroupNames) {
      throw new EntityNotInitializedException(
        'Non-initialised EcosystemModel submitted',
        LogContext.CHALLENGES
      );
    }
    for (const name of ecosystem.restrictedActorGroupNames) {
      const actorGroup = await this.actorGroupService.createActorGroup({
        name: name,
        description: 'Default actor group',
      });
      ecosystem.actorGroups?.push(actorGroup);
      await this.ecosystemModelRepository.save(ecosystem);
    }
    return true;
  }

  async createActorGroup(
    actorGroupData: CreateActorGroupInput
  ): Promise<IActorGroup> {
    const ecosystemId = actorGroupData.parentID;
    if (!ecosystemId)
      throw new ValidationException(
        `Actor group input parent not specifiec: ${actorGroupData.name}`,
        LogContext.CONTEXT
      );
    const ecosystemModel = await this.getEcosystemModelOrFail(ecosystemId);

    // Check that do not already have an aspect with the same title
    const name = actorGroupData.name;
    const existingActorGroup = ecosystemModel.actorGroups?.find(
      actorGroup => actorGroup.name === name
    );
    if (existingActorGroup)
      throw new ValidationException(
        `Already have an actor group with the provided name: ${name}`,
        LogContext.CHALLENGES
      );

    const actorGroup = await this.actorGroupService.createActorGroup(
      actorGroupData
    );
    if (!ecosystemModel.actorGroups)
      throw new EntityNotInitializedException(
        `Ecosystem Model (${ecosystemId}) not initialised`,
        LogContext.CHALLENGES
      );
    ecosystemModel.actorGroups.push(actorGroup);
    await this.ecosystemModelRepository.save(ecosystemModel);
    return actorGroup;
  }
}

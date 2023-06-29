import { UUID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelationByString,
  Repository,
} from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InnovationFlow } from './innovation.flow.entity';
import { IInnovationFlow } from './innovation.flow.interface';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { CreateInnovationFlowInput } from './dto/innovation.flow.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ILifecycle } from '@domain/common/lifecycle';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';
import { UpdateInnovationFlowTemplateInput } from './dto/innovation.flow.dto.update.template';

@Injectable()
export class InnovationFlowService {
  constructor(
    private profileService: ProfileService,
    private lifecycleService: LifecycleService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    @InjectRepository(InnovationFlow)
    private innovationFlowRepository: Repository<InnovationFlow>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationFlow(
    innovationFlowData: CreateInnovationFlowInput
  ): Promise<IInnovationFlow> {
    if (innovationFlowData.innovationFlowTemplateID) {
      await this.innovationFlowTemplateService.validateInnovationFlowDefinitionOrFail(
        innovationFlowData.innovationFlowTemplateID,
        innovationFlowData.spaceID,
        innovationFlowData.type
      );
    } else {
      innovationFlowData.innovationFlowTemplateID =
        await this.innovationFlowTemplateService.getDefaultInnovationFlowTemplateId(
          innovationFlowData.spaceID,
          innovationFlowData.type
        );
    }
    const innovationFlow: IInnovationFlow = new InnovationFlow();
    innovationFlow.authorization = new AuthorizationPolicy();
    innovationFlow.spaceID = innovationFlowData.spaceID;
    innovationFlow.type = innovationFlowData.type;

    innovationFlow.profile = await this.profileService.createProfile();
    await this.profileService.addVisualOnProfile(
      innovationFlow.profile,
      VisualType.CARD
    );

    const machineConfig: ILifecycleDefinition =
      await this.innovationFlowTemplateService.getInnovationFlowDefinitionFromTemplate(
        innovationFlowData.innovationFlowTemplateID,
        innovationFlowData.spaceID,
        innovationFlowData.type
      );

    innovationFlow.lifecycle = await this.lifecycleService.createLifecycle(
      innovationFlow.id,
      machineConfig
    );

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async save(innovationFlow: IInnovationFlow): Promise<IInnovationFlow> {
    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async update(
    innovationFlowData: UpdateInnovationFlowInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowData.innovationFlowID,
      {
        relations: ['profile'],
      }
    );

    if (innovationFlowData.profileData) {
      innovationFlow.profile = await this.profileService.updateProfile(
        innovationFlow.profile,
        innovationFlowData.profileData
      );
    }

    // tbd - create the lifecycle

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async deleteInnovationFlow(
    innovationFlowID: string
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: ['lifecycle', 'profile'],
      }
    );

    if (innovationFlow.lifecycle) {
      await this.lifecycleService.deleteLifecycle(innovationFlow.lifecycle.id);
    }

    if (innovationFlow.profile) {
      await this.profileService.deleteProfile(innovationFlow.profile.id);
    }

    const result = await this.innovationFlowRepository.remove(
      innovationFlow as InnovationFlow
    );
    result.id = innovationFlowID;
    return result;
  }

  async getInnovationFlowOrFail(
    innovationFlowID: string,
    options?: FindOneOptions<InnovationFlow>
  ): Promise<IInnovationFlow | never> {
    let innovationFlow: IInnovationFlow | null = null;
    if (innovationFlowID.length === UUID_LENGTH) {
      innovationFlow = await this.innovationFlowRepository.findOne({
        where: { id: innovationFlowID },
        ...options,
      });
    }

    if (!innovationFlow)
      throw new EntityNotFoundException(
        `Unable to find InnovationFlow with ID: ${innovationFlowID}`,
        LogContext.CHALLENGES
      );
    return innovationFlow;
  }

  public async getProfile(
    innovationFlowInput: IInnovationFlow,
    relations: FindOptionsRelationByString = []
  ): Promise<IProfile> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowInput.id,
      {
        relations: ['profile', ...relations],
      }
    );
    if (!innovationFlow.profile)
      throw new EntityNotFoundException(
        `InnovationFlow profile not initialised: ${innovationFlow.id}`,
        LogContext.COLLABORATION
      );

    return innovationFlow.profile;
  }
  async getLifecycle(innovationFlowId: string): Promise<ILifecycle> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowId,
      {
        relations: ['lifecycle'],
      }
    );
    const lifecycle = innovationFlow.lifecycle;

    if (!lifecycle) {
      throw new EntityNotFoundException(
        `Unable to find lifecycle for innovationFlow with ID: ${innovationFlow.id}`,
        LogContext.CHALLENGES
      );
    }

    return lifecycle;
  }

  async updateInnovationFlowTemplate(
    innovationFlowTemplateData: UpdateInnovationFlowTemplateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowTemplateData.innovationFlowID,
      {
        relations: ['lifecycle'],
      }
    );

    if (!innovationFlow.lifecycle) {
      throw new EntityNotInitializedException(
        `Lifecycle of Innovation Flow (${innovationFlow.id}) not initialized`,
        LogContext.CHALLENGES
      );
    }

    const machineConfig: ILifecycleDefinition =
      await this.innovationFlowTemplateService.getInnovationFlowDefinitionFromTemplate(
        innovationFlowTemplateData.innovationFlowTemplateID,
        innovationFlow.spaceID,
        innovationFlow.type
      );

    innovationFlow.lifecycle.machineDef = JSON.stringify(machineConfig);
    innovationFlow.lifecycle.machineState = '';

    return await this.innovationFlowRepository.save(innovationFlow);
  }
}

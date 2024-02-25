import { Injectable } from '@nestjs/common';
import { UpdateSpaceDefaultsInput } from './dto/space.defaults.dto.update';
import { ISpaceDefaults } from './space.defaults.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceDefaults } from './space.defaults.entity';
import { InnovationFlowStatesService } from '../innovation-flow-states/innovaton.flow.state.service';
import { IInnovationFlowState } from '../innovation-flow-states/innovation.flow.state.interface';
import { Space } from '../space/space.entity';
import { challengeFlowStatesDefault } from './definitions/space.defaults.challenge.flow';
import { opportunityFlowStatesDefault } from './definitions/space.defaults.opportunity.flow';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';

import { ITemplatesSet } from '@domain/template/templates-set';
import { templatesSetDefaults } from './definitions/space.defaults.templates';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';

@Injectable()
export class SpaceDefaultsService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private innovationFlowStatesService: InnovationFlowStatesService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private templatesSetService: TemplatesSetService,
    @InjectRepository(SpaceDefaults)
    private spaceDefaultsRepository: Repository<SpaceDefaults>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>
  ) {}

  public async createSpaceDefaults(): Promise<ISpaceDefaults> {
    const spaceDefaults: ISpaceDefaults = new SpaceDefaults();

    // Set the default challenge and opportunity flow states
    spaceDefaults.challengeFlowStates =
      this.innovationFlowStatesService.serializeStates(
        challengeFlowStatesDefault
      );

    spaceDefaults.opportunityFlowStates =
      this.innovationFlowStatesService.serializeStates(
        opportunityFlowStatesDefault
      );

    spaceDefaults.authorization = new AuthorizationPolicy();

    return spaceDefaults;
  }

  public async updateSpaceDefaults(
    spaceDefaultsData: UpdateSpaceDefaultsInput
  ): Promise<ISpaceDefaults> {
    const spaceDefaults = await this.getSpaceDefaultsOrFail(
      spaceDefaultsData.ID
    );

    if (spaceDefaultsData.challengeFlowStates) {
      const states = this.innovationFlowStatesService.getStates(
        spaceDefaultsData.challengeFlowStates
      );
      spaceDefaults.challengeFlowStates =
        this.innovationFlowStatesService.serializeStates(states);
    }

    if (spaceDefaultsData.opportunityFlowStates) {
      const states = this.innovationFlowStatesService.getStates(
        spaceDefaultsData.opportunityFlowStates
      );
      spaceDefaults.opportunityFlowStates =
        this.innovationFlowStatesService.serializeStates(states);
    }

    return await this.save(spaceDefaults);
  }

  async deleteSpaceDefaults(spaceDefaultsId: string): Promise<ISpaceDefaults> {
    const spaceDefaults = await this.getSpaceDefaultsOrFail(spaceDefaultsId, {
      relations: {
        authorization: true,
      },
    });

    if (spaceDefaults.authorization) {
      await this.authorizationPolicyService.delete(spaceDefaults.authorization);
    }

    const result = await this.spaceDefaultsRepository.remove(
      spaceDefaults as SpaceDefaults
    );
    result.id = spaceDefaultsId;
    return result;
  }

  async save(spaceDefaults: ISpaceDefaults): Promise<ISpaceDefaults> {
    return await this.spaceDefaultsRepository.save(spaceDefaults);
  }

  public async getSpaceDefaultsOrFail(
    spaceDefaultsID: string,
    options?: FindOneOptions<SpaceDefaults>
  ): Promise<ISpaceDefaults | never> {
    let spaceDefaults: ISpaceDefaults | null = null;
    if (spaceDefaultsID.length === UUID_LENGTH) {
      spaceDefaults = await this.spaceDefaultsRepository.findOne({
        where: { id: spaceDefaultsID },
        ...options,
      });
    }

    if (!spaceDefaults)
      throw new EntityNotFoundException(
        `No SpaceDefaults found with the given id: ${spaceDefaultsID}`,
        LogContext.COLLABORATION
      );
    return spaceDefaults;
  }

  public async getSpaceDefaultsForSpaceOrFail(
    spaceID: string
  ): Promise<ISpaceDefaults | never> {
    let spaceDefaults: ISpaceDefaults | undefined = undefined;
    if (spaceID.length === UUID_LENGTH) {
      const space = await this.spaceRepository.findOne({
        where: { id: spaceID },
        relations: {
          defaults: true,
        },
      });
      if (space) spaceDefaults = space?.defaults;
    }

    if (!spaceDefaults)
      throw new EntityNotFoundException(
        `No SpaceDefaults found for the given space ID: ${spaceID}`,
        LogContext.COLLABORATION
      );
    return spaceDefaults;
  }

  public getDefaultChallengeFlowStates(
    spaceDefaults: ISpaceDefaults
  ): IInnovationFlowState[] {
    return this.innovationFlowStatesService.getStates(
      spaceDefaults.challengeFlowStates
    );
  }

  public getDefaultOpportunityFlowStates(
    spaceDefaults: ISpaceDefaults
  ): IInnovationFlowState[] {
    return this.innovationFlowStatesService.getStates(
      spaceDefaults.opportunityFlowStates
    );
  }

  public async getChallengeFlowStates(
    spaceID: string,
    innovationFlowTemplateID?: string
  ): Promise<IInnovationFlowState[]> {
    const spaceDefaults = await this.getSpaceDefaultsForSpaceOrFail(spaceID);
    let flowStates = this.innovationFlowStatesService.getStates(
      spaceDefaults.challengeFlowStates
    );
    if (innovationFlowTemplateID) {
      const innovationFlowTemplate =
        await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
          innovationFlowTemplateID
        );
      flowStates = this.innovationFlowStatesService.getStates(
        innovationFlowTemplate.states
      );
    }
    return flowStates;
  }

  public async getOpportunityFlowStates(
    spaceID: string,
    innovationFlowTemplateID?: string
  ): Promise<IInnovationFlowState[]> {
    const spaceDefaults = await this.getSpaceDefaultsForSpaceOrFail(spaceID);
    let flowStates = this.innovationFlowStatesService.getStates(
      spaceDefaults.opportunityFlowStates
    );
    if (innovationFlowTemplateID) {
      const innovationFlowTemplate =
        await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
          innovationFlowTemplateID
        );
      flowStates = this.innovationFlowStatesService.getStates(
        innovationFlowTemplate.states
      );
    }
    return flowStates;
  }

  public async addDefaultTemplatesToSpace(
    templatesSet: ITemplatesSet
  ): Promise<ITemplatesSet> {
    return await this.templatesSetService.addTemplates(
      templatesSet,
      templatesSetDefaults.posts,
      templatesSetDefaults.innovationFlows
    );
  }
}

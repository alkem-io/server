import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import {
  Opportunity,
  IOpportunity,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  opportunityCommunityPolicy,
} from '@domain/collaboration/opportunity';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { IProject, CreateProjectInput } from '@domain/collaboration/project';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { ILifecycle } from '@domain/common/lifecycle';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { NVP } from '@domain/common/nvp';
import { UUID_LENGTH } from '@common/constants';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { AssignOpportunityAdminInput } from './dto/opportunity.dto.assign.admin';
import { RemoveOpportunityAdminInput } from './dto/opportunity.dto.remove.admin';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CommunityType } from '@common/enums/community.type';
import { AgentInfo } from '@src/core';
import { IContext } from '@domain/context/context/context.interface';
import { UpdateOpportunityInnovationFlowInput } from './dto/opportunity.dto.update.innovation.flow';
import { ICollaboration } from '../collaboration/collaboration.interface';
import { LifecycleTemplateService } from '@domain/template/lifecycle-template/lifecycle.template.service';
import { LifecycleType } from '@common/enums/lifecycle.type';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

@Injectable()
export class OpportunityService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private projectService: ProjectService,
    private lifecycleService: LifecycleService,
    private lifecycleTemplateService: LifecycleTemplateService,
    private communityService: CommunityService,
    private userService: UserService,
    private agentService: AgentService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createOpportunity(
    opportunityData: CreateOpportunityInput,
    hubID: string,
    agentInfo?: AgentInfo
  ): Promise<IOpportunity> {
    const opportunity: IOpportunity = Opportunity.create(opportunityData);
    opportunity.hubID = hubID;
    opportunity.projects = [];

    await this.baseChallengeService.initialise(
      opportunity,
      opportunityData,
      hubID,
      CommunityType.OPPORTUNITY,
      opportunityCommunityPolicy
    );

    await this.opportunityRepository.save(opportunity);

    // set immediate community parent
    if (opportunity.community) {
      opportunity.community.parentID = opportunity.id;
      opportunity.community =
        this.communityService.updateCommunityPolicyResourceID(
          opportunity.community,
          opportunity.id
        );
    }

    if (agentInfo) {
      await this.assignMember(agentInfo.userID, opportunity.id);
      await this.assignOpportunityAdmin({
        userID: agentInfo.userID,
        opportunityID: opportunity.id,
      });
    }

    const machineConfig: ILifecycleDefinition =
      await this.lifecycleTemplateService.getLifecycleDefinitionFromTemplate(
        opportunityData.innovationFlowTemplateID,
        hubID,
        LifecycleType.OPPORTUNITY
      );

    opportunity.lifecycle = await this.lifecycleService.createLifecycle(
      opportunity.id,
      machineConfig
    );

    return await this.saveOpportunity(opportunity);
  }

  async updateOpportunityInnovationFlow(
    opportunityData: UpdateOpportunityInnovationFlowInput
  ): Promise<IOpportunity> {
    const opportunity = await this.getOpportunityOrFail(
      opportunityData.opportunityID,
      { relations: ['lifecycle'] }
    );

    if (!opportunity.lifecycle) {
      throw new EntityNotInitializedException(
        `Lifecycle of opportunity (${opportunity.id}) not initialized`,
        LogContext.OPPORTUNITY
      );
    }

    const machineConfig: ILifecycleDefinition =
      await this.lifecycleTemplateService.getLifecycleDefinitionFromTemplate(
        opportunityData.innovationFlowTemplateID,
        opportunity.hubID,
        LifecycleType.OPPORTUNITY
      );

    opportunity.lifecycle.machineDef = JSON.stringify(machineConfig);
    opportunity.lifecycle.machineState = '';

    return await this.save(opportunity);
  }

  async save(opportunity: IOpportunity): Promise<IOpportunity> {
    return await this.opportunityRepository.save(opportunity);
  }

  async getOpportunityInNameableScopeOrFail(
    opportunityID: string,
    nameableScopeID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity> {
    let opportunity: IOpportunity | undefined;
    if (opportunityID.length == UUID_LENGTH) {
      opportunity = await this.opportunityRepository.findOne(
        { id: opportunityID, hubID: nameableScopeID },
        options
      );
    }
    if (!opportunity) {
      // look up based on nameID
      opportunity = await this.opportunityRepository.findOne(
        { nameID: opportunityID, hubID: nameableScopeID },
        options
      );
    }

    if (!opportunity) {
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.OPPORTUNITY
      );
    }

    return opportunity;
  }

  async getOpportunityOrFail(
    opportunityID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity> {
    let opportunity: IOpportunity | undefined;
    if (opportunityID.length == UUID_LENGTH) {
      opportunity = await this.opportunityRepository.findOne(
        { id: opportunityID },
        options
      );
    }

    if (!opportunity) {
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.OPPORTUNITY
      );
    }

    return opportunity;
  }

  async getOpportunitiesInNameableScope(
    nameableScopeID: string
  ): Promise<IOpportunity[]> {
    return await this.opportunityRepository.find({
      hubID: nameableScopeID,
    });
  }

  async deleteOpportunity(opportunityID: string): Promise<IOpportunity> {
    const opportunity = await this.getOpportunityOrFail(opportunityID, {
      relations: ['projects'],
    });
    // disable deletion if projects are present
    const projects = opportunity.projects;
    if (projects && projects.length > 0) {
      throw new ValidationException(
        `Unable to remove Opportunity (${opportunity.nameID}) as it contains ${projects.length} Projects`,
        LogContext.OPPORTUNITY
      );
    }

    // Note need to load it in with all contained entities so can remove fully
    const baseOpportunity = await this.getOpportunityOrFail(opportunityID, {
      relations: ['community', 'context', 'lifecycle', 'agent'],
    });

    await this.baseChallengeService.deleteEntities(baseOpportunity);

    const result = await this.opportunityRepository.remove(
      baseOpportunity as Opportunity
    );
    result.id = opportunityID;
    return result;
  }

  async updateOpportunity(
    opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    const baseOpportunity = await this.baseChallengeService.update(
      opportunityData,
      this.opportunityRepository
    );
    const opportunity = await this.getOpportunityOrFail(baseOpportunity.id);
    if (opportunityData.nameID) {
      if (opportunityData.nameID !== baseOpportunity.nameID) {
        // updating the nameID, check new value is allowed
        await this.baseChallengeService.isNameAvailableOrFail(
          opportunityData.nameID,
          opportunity.hubID
        );
        baseOpportunity.nameID = opportunityData.nameID;
        await this.opportunityRepository.save(baseOpportunity);
      }
    }
    return opportunity;
  }

  async saveOpportunity(opportunity: IOpportunity): Promise<IOpportunity> {
    return await this.opportunityRepository.save(opportunity);
  }

  async getCommunity(opportunityId: string): Promise<ICommunity> {
    return await this.baseChallengeService.getCommunity(
      opportunityId,
      this.opportunityRepository
    );
  }

  async getLifecycle(opportunityId: string): Promise<ILifecycle> {
    return await this.baseChallengeService.getLifecycle(
      opportunityId,
      this.opportunityRepository
    );
  }

  async getContext(opportunityId: string): Promise<IContext> {
    return await this.baseChallengeService.getContext(
      opportunityId,
      this.opportunityRepository
    );
  }

  public async getCollaboration(
    opportunity: IOpportunity
  ): Promise<ICollaboration> {
    return await this.baseChallengeService.getCollaboration(
      opportunity.id,
      this.opportunityRepository
    );
  }

  async createProject(projectData: CreateProjectInput): Promise<IProject> {
    const opportunityId = projectData.opportunityID;

    this.logger.verbose?.(
      `Adding project to opportunity (${opportunityId})`,
      LogContext.OPPORTUNITY
    );

    const opportunity = await this.getOpportunityOrFail(opportunityId);

    const project = await this.projectService.createProject(
      projectData,
      opportunity.hubID
    );
    if (!opportunity.projects)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.OPPORTUNITY
      );
    opportunity.projects.push(project);
    await this.opportunityRepository.save(opportunity);
    return project;
  }

  async getActivity(opportunity: IOpportunity): Promise<INVP[]> {
    const activity: INVP[] = [];
    const community = await this.getCommunity(opportunity.id);

    // Members
    const membersCount = await this.communityService.getMembersCount(community);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${opportunity.id}`;
    activity.push(membersTopic);

    // Projects
    const projectsCount =
      await this.projectService.getProjectsInOpportunityCount(opportunity.id);
    const projectsTopic = new NVP('projects', projectsCount.toString());
    projectsTopic.id = `projects-${opportunity.id}`;
    activity.push(projectsTopic);

    // Relations
    const relationsCount = await this.baseChallengeService.getRelationsCount(
      opportunity,
      this.opportunityRepository
    );

    const relationsTopic = new NVP('relations', relationsCount.toString());
    relationsTopic.id = `relations-${opportunity.id}`;
    activity.push(relationsTopic);

    // Aspects
    const aspectsCount = await this.baseChallengeService.getAspectsCount(
      opportunity,
      this.opportunityRepository
    );
    const aspectsTopic = new NVP('aspects', aspectsCount.toString());
    aspectsTopic.id = `aspects-${opportunity.id}`;
    activity.push(aspectsTopic);

    // Canvases
    const canvasesCount = await this.baseChallengeService.getCanvasesCount(
      opportunity,
      this.opportunityRepository
    );
    const canvasesTopic = new NVP('canvases', canvasesCount.toString());
    canvasesTopic.id = `canvases-${opportunity.id}`;
    activity.push(canvasesTopic);

    return activity;
  }

  async getOpportunitiesInHubCount(hubID: string): Promise<number> {
    return await this.opportunityRepository.count({
      where: { hubID: hubID },
    });
  }

  async getOpportunitiesCount(): Promise<number> {
    return await this.opportunityRepository.count();
  }

  async getOpportunitiesInChallengeCount(challengeID: string): Promise<number> {
    return await this.opportunityRepository.count({
      where: { challenge: challengeID },
    });
  }

  async assignMember(userID: string, opportunityId: string) {
    const agent = await this.userService.getAgent(userID);
    const opportunity = await this.getOpportunityOrFail(opportunityId);

    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.OPPORTUNITY_MEMBER,
      resourceID: opportunity.id,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async assignOpportunityAdmin(
    assignData: AssignOpportunityAdminInput
  ): Promise<IUser> {
    const userID = assignData.userID;
    const agent = await this.userService.getAgent(userID);
    const opportunity = await this.getOpportunityOrFail(
      assignData.opportunityID
    );

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.OPPORTUNITY_ADMIN,
      resourceID: opportunity.id,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async removeOpportunityAdmin(
    removeData: RemoveOpportunityAdminInput
  ): Promise<IUser> {
    const opportunityID = removeData.opportunityID;
    const opportunity = await this.getOpportunityOrFail(opportunityID);
    const agent = await this.userService.getAgent(removeData.userID);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.OPPORTUNITY_ADMIN,
      resourceID: opportunity.id,
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async getOpportunityForCommunity(
    communityID: string
  ): Promise<IOpportunity | undefined> {
    return await this.opportunityRepository.findOne({
      relations: ['community', 'challenge'],
      where: {
        community: { id: communityID },
      },
    });
  }
}

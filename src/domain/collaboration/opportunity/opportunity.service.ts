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
} from '@domain/collaboration/opportunity';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { RelationService } from '@domain/collaboration/relation/relation.service';
import { CreateRelationInput, IRelation } from '@domain/collaboration/relation';
import { IProject, CreateProjectInput } from '@domain/collaboration/project';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { ILifecycle } from '@domain/common/lifecycle';
import { IContext } from '@domain/context/context/context.interface';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { opportunityLifecycleConfigDefault } from './opportunity.lifecycle.config.default';
import { ChallengeLifecycleTemplate } from '@common/enums';
import { opportunityLifecycleConfigExtended } from './opportunity.lifecycle.config.extended';
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

@Injectable()
export class OpportunityService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private projectService: ProjectService,
    private lifecycleService: LifecycleService,
    private communityService: CommunityService,
    private relationService: RelationService,
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
    opportunity.relations = [];

    await this.baseChallengeService.initialise(
      opportunity,
      opportunityData,
      hubID,
      CommunityType.OPPORTUNITY
    );

    // Lifecycle, that has both a default and extended version
    let machineConfig: any = opportunityLifecycleConfigDefault;
    if (
      opportunityData.lifecycleTemplate &&
      opportunityData.lifecycleTemplate === ChallengeLifecycleTemplate.EXTENDED
    ) {
      machineConfig = opportunityLifecycleConfigExtended;
    }

    await this.opportunityRepository.save(opportunity);
    // set immediate community parent
    if (opportunity.community) {
      opportunity.community.parentID = opportunity.id;
    }

    opportunity.lifecycle = await this.lifecycleService.createLifecycle(
      opportunity.id,
      machineConfig
    );

    // set the credential type in use by the community
    await this.baseChallengeService.setMembershipCredential(
      opportunity,
      AuthorizationCredential.OPPORTUNITY_MEMBER
    );

    if (agentInfo) {
      await this.assingMember(agentInfo.userID, opportunity.id);
      await this.assignOpportunityAdmin({
        userID: agentInfo.userID,
        opportunityID: opportunity.id,
      });
    }

    return await this.saveOpportunity(opportunity);
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
        LogContext.CHALLENGES
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
        LogContext.CHALLENGES
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
      relations: ['relations', 'projects'],
    });
    // disable deletion if projects are present
    const projects = opportunity.projects;
    if (projects && projects.length > 0) {
      throw new ValidationException(
        `Unable to remove Opportunity (${opportunity.nameID}) as it contains ${projects.length} Projects`,
        LogContext.CHALLENGES
      );
    }

    if (opportunity.relations) {
      for (const relation of opportunity.relations) {
        await this.relationService.deleteRelation({ ID: relation.id });
      }
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

  // Loads the aspects into the Opportunity entity if not already present
  async getRelations(opportunity: Opportunity): Promise<IRelation[]> {
    if (opportunity.relations && opportunity.relations.length > 0) {
      // opportunity already has relations loaded
      return opportunity.relations;
    }

    const opportunityLoaded = await this.getOpportunityOrFail(opportunity.id, {
      relations: ['relations'],
    });

    if (!opportunityLoaded.relations)
      throw new EntityNotInitializedException(
        `Opportunity not initialised: ${opportunity.id}`,
        LogContext.COLLABORATION
      );

    return opportunityLoaded.relations;
  }

  async createProject(projectData: CreateProjectInput): Promise<IProject> {
    const opportunityId = projectData.opportunityID;

    this.logger.verbose?.(
      `Adding project to opportunity (${opportunityId})`,
      LogContext.COLLABORATION
    );

    const opportunity = await this.getOpportunityOrFail(opportunityId);

    const project = await this.projectService.createProject(
      projectData,
      opportunity.hubID
    );
    if (!opportunity.projects)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.COLLABORATION
      );
    opportunity.projects.push(project);
    await this.opportunityRepository.save(opportunity);
    return project;
  }

  async createRelation(relationData: CreateRelationInput): Promise<IRelation> {
    const opportunityId = relationData.parentID;
    const opportunity = await this.getOpportunityOrFail(opportunityId, {
      relations: ['relations'],
    });

    if (!opportunity.relations)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.COLLABORATION
      );

    const relation = await this.relationService.createRelation(relationData);
    opportunity.relations.push(relation);
    await this.opportunityRepository.save(opportunity);
    return relation;
  }
  async getActivity(opportunity: IOpportunity): Promise<INVP[]> {
    const activity: INVP[] = [];
    const community = await this.getCommunity(opportunity.id);

    const membersCount = await this.communityService.getMembersCount(community);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${opportunity.id}`;
    activity.push(membersTopic);

    const projectsCount =
      await this.projectService.getProjectsInOpportunityCount(opportunity.id);
    const projectsTopic = new NVP('projects', projectsCount.toString());
    projectsTopic.id = `projects-${opportunity.id}`;
    activity.push(projectsTopic);

    const relationsCount =
      await this.relationService.getRelationsInOpportunityCount(opportunity.id);
    const relationsTopic = new NVP('relations', relationsCount.toString());
    relationsTopic.id = `relations-${opportunity.id}`;
    activity.push(relationsTopic);

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

  async assingMember(userID: string, opportunityId: string) {
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
}

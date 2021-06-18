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

@Injectable()
export class OpportunityService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private projectService: ProjectService,
    private lifecycleService: LifecycleService,
    private communityService: CommunityService,
    private relationService: RelationService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createOpportunity(
    opportunityData: CreateOpportunityInput,
    ecoverseID: string
  ): Promise<IOpportunity> {
    const opportunity: IOpportunity = Opportunity.create(opportunityData);
    opportunity.ecoverseID = ecoverseID;
    opportunity.projects = [];
    opportunity.relations = [];

    await this.baseChallengeService.initialise(
      opportunity,
      opportunityData,
      ecoverseID
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

    opportunity.lifecycle = await this.lifecycleService.createLifecycle(
      opportunity.id,
      machineConfig
    );

    // set the credential type in use by the community
    await this.baseChallengeService.setMembershipCredential(
      opportunity,
      AuthorizationCredential.OpportunityMember
    );

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
        { id: opportunityID, ecoverseID: nameableScopeID },
        options
      );
    } else {
      // look up based on nameID
      opportunity = await this.opportunityRepository.findOne(
        { nameID: opportunityID, ecoverseID: nameableScopeID },
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
      ecoverseID: nameableScopeID,
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
          opportunity.ecoverseID
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
      opportunity.ecoverseID
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

  async getProjectsCount(opportunityID: string): Promise<number> {
    return await this.opportunityRepository.count({
      where: { id: opportunityID },
    });
  }

  async getActivity(opportunity: IOpportunity): Promise<INVP[]> {
    const activity: INVP[] = [];
    const community = await this.getCommunity(opportunity.id);

    const membersCount = await this.communityService.getMembersCount(community);
    const membersTopic = new NVP('members', membersCount.toString());
    activity.push(membersTopic);

    const projectsCount = await this.getProjectsCount(opportunity.id);
    const projectsTopic = new NVP('projects', projectsCount.toString());
    activity.push(projectsTopic);

    return activity;
  }
}

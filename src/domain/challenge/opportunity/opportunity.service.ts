import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, In, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import {
  CreateOpportunityInput,
  IOpportunity,
  Opportunity,
  opportunityCommunityApplicationForm,
  opportunityCommunityPolicy,
  UpdateOpportunityInput,
} from '@domain/challenge/opportunity';
import { LogContext, ProfileType } from '@common/enums';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { IProject } from '@domain/collaboration/project';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { NVP } from '@domain/common/nvp';
import { UUID_LENGTH } from '@common/constants';
import { CommunityType } from '@common/enums/community.type';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { IContext } from '@domain/context/context/context.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { CreateProjectInput } from '@domain/collaboration/project/dto/project.dto.create';
import { CommunityRole } from '@common/enums/community.role';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { TagsetType } from '@common/enums/tagset.type';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template/dto/tagset.template.dto.create';
import { opportunityDefaultCallouts } from './opportunity.default.callouts';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { OpportunityDisplayLocation } from '@common/enums/opportunity.display.location';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
@Injectable()
export class OpportunityService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private projectService: ProjectService,
    private communityService: CommunityService,
    private collaborationService: CollaborationService,
    private storageAggregatorService: StorageAggregatorService,
    private spaceDefaultsService: SpaceDefaultsService,
    private namingService: NamingService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createOpportunity(
    opportunityData: CreateOpportunityInput,
    agentInfo?: AgentInfo
  ): Promise<IOpportunity> {
    if (!opportunityData.nameID) {
      opportunityData.nameID = this.namingService.createNameID(
        opportunityData.profileData?.displayName || ''
      );
    }
    await this.baseChallengeService.isNameAvailableOrFail(
      opportunityData.nameID,
      opportunityData.spaceID
    );

    const opportunity: IOpportunity = Opportunity.create(opportunityData);
    opportunity.projects = [];

    opportunity.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        opportunityData.storageAggregatorParent
      );

    await this.baseChallengeService.initialise(
      opportunity,
      opportunityData,
      opportunityData.spaceID,
      CommunityType.OPPORTUNITY,
      opportunityCommunityPolicy,
      opportunityCommunityApplicationForm,
      ProfileType.OPPORTUNITY,
      opportunity.storageAggregator,
      opportunityData.collaborationData
    );

    await this.opportunityRepository.save(opportunity);

    if (opportunity.collaboration) {
      const locations = Object.values(OpportunityDisplayLocation);
      const tagsetTemplateData: CreateTagsetTemplateInput = {
        name: TagsetReservedName.CALLOUT_DISPLAY_LOCATION,
        type: TagsetType.SELECT_ONE,
        allowedValues: locations,
        defaultSelectedValue: OpportunityDisplayLocation.CONTRIBUTE_RIGHT,
      };
      await this.collaborationService.addTagsetTemplate(
        opportunity.collaboration,
        tagsetTemplateData
      );

      // Finally create default callouts, using the defaults service to decide what to add
      const calloutInputsFromCollaborationTemplate =
        await this.collaborationService.createCalloutInputsFromCollaborationTemplate(
          opportunityData.collaborationData?.collaborationTemplateID
        );
      const calloutInputs =
        await this.spaceDefaultsService.getCreateCalloutInputs(
          opportunityDefaultCallouts,
          calloutInputsFromCollaborationTemplate,
          opportunityData.collaborationData
        );

      opportunity.collaboration =
        await this.collaborationService.addDefaultCallouts(
          opportunity.collaboration,
          calloutInputs,
          opportunity.storageAggregator,
          agentInfo?.userID
        );
    }

    // set immediate community parent
    if (opportunity.community) {
      opportunity.community.parentID = opportunity.id;
      opportunity.community.policy =
        await this.communityService.updateCommunityPolicyResourceID(
          opportunity.community,
          opportunity.id
        );
    }

    if (agentInfo && opportunity.community) {
      await this.communityService.assignUserToRole(
        opportunity.community,
        agentInfo.userID,
        CommunityRole.MEMBER
      );

      await this.communityService.assignUserToRole(
        opportunity.community,
        agentInfo.userID,
        CommunityRole.LEAD
      );

      await this.communityService.assignUserToRole(
        opportunity.community,
        agentInfo.userID,
        CommunityRole.ADMIN
      );
    }

    return await this.saveOpportunity(opportunity);
  }

  async save(opportunity: IOpportunity): Promise<IOpportunity> {
    return await this.opportunityRepository.save(opportunity);
  }

  async getOpportunityInNameableScope(
    opportunityID: string,
    nameableScopeID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity | null> {
    let opportunity: IOpportunity | null = null;
    if (opportunityID.length == UUID_LENGTH) {
      opportunity = await this.opportunityRepository.findOne({
        where: { id: opportunityID, spaceID: nameableScopeID },
        ...options,
      });
    }
    if (!opportunity) {
      // look up based on nameID
      opportunity = await this.opportunityRepository.findOne({
        where: { nameID: opportunityID, spaceID: nameableScopeID },
        ...options,
      });
    }

    return opportunity;
  }

  async getOpportunityOrFail(
    opportunityID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity | never> {
    let opportunity: IOpportunity | null = null;
    if (opportunityID.length == UUID_LENGTH) {
      opportunity = await this.opportunityRepository.findOne({
        where: {
          id: opportunityID,
        },
        ...options,
      });
    }

    if (!opportunity) {
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.OPPORTUNITY
      );
    }

    return opportunity;
  }

  public async getOpportunities(
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity[]> {
    return this.opportunityRepository.find(options);
  }

  async getOpportunitiesInNameableScope(
    nameableScopeID: string,
    IDs?: string[]
  ): Promise<IOpportunity[]> {
    if (IDs && IDs.length > 0) {
      return await this.opportunityRepository.find({
        where: { id: In(IDs), spaceID: nameableScopeID },
      });
    }

    return await this.opportunityRepository.findBy({
      spaceID: nameableScopeID,
    });
  }

  async deleteOpportunity(opportunityID: string): Promise<IOpportunity> {
    const opportunity = await this.getOpportunityOrFail(opportunityID, {
      relations: {
        projects: true,
        storageAggregator: true,
      },
    });
    // disable deletion if projects are present
    const projects = opportunity.projects;
    if (projects && projects.length > 0) {
      throw new OperationNotAllowedException(
        `Unable to remove Opportunity (${opportunity.nameID}) as it contains ${projects.length} Projects`,
        LogContext.OPPORTUNITY
      );
    }

    await this.baseChallengeService.deleteEntities(
      opportunity.id,
      this.opportunityRepository
    );

    if (opportunity.storageAggregator) {
      await this.storageAggregatorService.delete(
        opportunity.storageAggregator.id
      );
    }

    const result = await this.opportunityRepository.remove(
      opportunity as Opportunity
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
    const opportunity = await this.getOpportunityOrFail(baseOpportunity.id, {
      relations: { profile: true },
    });
    if (opportunityData.nameID) {
      if (opportunityData.nameID !== baseOpportunity.nameID) {
        // updating the nameID, check new value is allowed
        await this.baseChallengeService.isNameAvailableOrFail(
          opportunityData.nameID,
          this.getSpaceID(opportunity)
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

  async getContext(opportunityId: string): Promise<IContext> {
    return await this.baseChallengeService.getContext(
      opportunityId,
      this.opportunityRepository
    );
  }

  async getProfile(opportunity: IOpportunity): Promise<IProfile> {
    return await this.baseChallengeService.getProfile(
      opportunity.id,
      this.opportunityRepository
    );
  }

  public async getCollaboration(
    opportunity: IOpportunity
  ): Promise<ICollaboration> {
    return await this.baseChallengeService.getCollaborationOrFail(
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
      this.getSpaceID(opportunity)
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

  getSpaceID(opportunity: IOpportunity): string {
    const spaceID = opportunity.spaceID;
    if (!spaceID) {
      throw new RelationshipNotFoundException(
        `Unable to load spaceID for opportunity: ${opportunity.id} `,
        LogContext.CHALLENGES
      );
    }
    return spaceID;
  }

  async getStorageAggregatorOrFail(
    challengeId: string
  ): Promise<IStorageAggregator> {
    const opportunityWithStorageAggregator = await this.getOpportunityOrFail(
      challengeId,
      {
        relations: {
          storageAggregator: true,
        },
      }
    );
    const storageAggregator =
      opportunityWithStorageAggregator.storageAggregator;

    if (!storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to find storage aggregator for Opportunity with nameID: ${opportunityWithStorageAggregator.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return storageAggregator;
  }

  async getMetrics(opportunity: IOpportunity): Promise<INVP[]> {
    const metrics: INVP[] = [];
    const community = await this.getCommunity(opportunity.id);

    // Members
    const membersCount = await this.communityService.getMembersCount(community);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${opportunity.id}`;
    metrics.push(membersTopic);

    // Projects
    const projectsCount =
      await this.projectService.getProjectsInOpportunityCount(opportunity.id);
    const projectsTopic = new NVP('projects', projectsCount.toString());
    projectsTopic.id = `projects-${opportunity.id}`;
    metrics.push(projectsTopic);

    // Relations
    const relationsCount = await this.baseChallengeService.getRelationsCount(
      opportunity,
      this.opportunityRepository
    );

    const relationsTopic = new NVP('relations', relationsCount.toString());
    relationsTopic.id = `relations-${opportunity.id}`;
    metrics.push(relationsTopic);

    // Posts
    const postsCount = await this.baseChallengeService.getPostsCount(
      opportunity,
      this.opportunityRepository
    );
    const postsTopic = new NVP('posts', postsCount.toString());
    postsTopic.id = `posts-${opportunity.id}`;
    metrics.push(postsTopic);

    // Whiteboards
    const whiteboardsCount =
      await this.baseChallengeService.getWhiteboardsCount(
        opportunity,
        this.opportunityRepository
      );
    const whiteboardsTopic = new NVP(
      'whiteboards',
      whiteboardsCount.toString()
    );
    whiteboardsTopic.id = `whiteboards-${opportunity.id}`;
    metrics.push(whiteboardsTopic);

    return metrics;
  }

  async getOpportunitiesInSpaceCount(spaceID: string): Promise<number> {
    return await this.opportunityRepository.countBy({ spaceID: spaceID });
  }

  async getOpportunitiesInChallengeCount(challengeID: string): Promise<number> {
    return await this.opportunityRepository.countBy({
      challenge: { id: challengeID },
    });
  }

  async getOpportunityForCommunity(
    communityID: string
  ): Promise<IOpportunity | null> {
    return await this.opportunityRepository.findOne({
      relations: { community: true, challenge: true },
      where: {
        community: { id: communityID },
      },
    });
  }

  async getCommunityPolicy(opportunityID: string): Promise<ICommunityPolicy> {
    return await this.baseChallengeService.getCommunityPolicy(
      opportunityID,
      this.opportunityRepository
    );
  }
}

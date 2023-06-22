import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, In, Repository } from 'typeorm';
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
} from '@domain/collaboration/opportunity';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { IProject } from '@domain/collaboration/project';
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
import { AgentInfo } from '@src/core/authentication/agent-info';
import { IContext } from '@domain/context/context/context.interface';
import { UpdateOpportunityInnovationFlowInput } from './dto/opportunity.dto.update.innovation.flow';
import { ICollaboration } from '../collaboration/collaboration.interface';
import { InnovationFlowType } from '@common/enums/innovation.flow.type';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { CreateProjectInput } from '../project/dto/project.dto.create';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';
import { CommunityRole } from '@common/enums/community.role';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';

@Injectable()
export class OpportunityService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private projectService: ProjectService,
    private lifecycleService: LifecycleService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private communityService: CommunityService,
    private userService: UserService,
    private agentService: AgentService,
    private namingService: NamingService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  async createOpportunity(
    opportunityData: CreateOpportunityInput,
    spaceID: string,
    storageBucketID: string,
    agentInfo?: AgentInfo
  ): Promise<IOpportunity> {
    // Validate incoming data
    if (opportunityData.innovationFlowTemplateID) {
      await this.innovationFlowTemplateService.validateInnovationFlowDefinitionOrFail(
        opportunityData.innovationFlowTemplateID,
        spaceID,
        InnovationFlowType.OPPORTUNITY
      );
    } else {
      opportunityData.innovationFlowTemplateID =
        await this.innovationFlowTemplateService.getDefaultInnovationFlowTemplateId(
          spaceID,
          InnovationFlowType.OPPORTUNITY
        );
    }

    if (!opportunityData.nameID) {
      opportunityData.nameID = this.namingService.createNameID(
        opportunityData.profileData?.displayName || ''
      );
    }
    await this.baseChallengeService.isNameAvailableOrFail(
      opportunityData.nameID,
      spaceID
    );

    const opportunity: IOpportunity = Opportunity.create(opportunityData);
    opportunity.spaceID = spaceID;
    opportunity.projects = [];

    await this.baseChallengeService.initialise(
      opportunity,
      opportunityData,
      spaceID,
      CommunityType.OPPORTUNITY,
      opportunityCommunityPolicy,
      opportunityCommunityApplicationForm
    );

    await this.opportunityRepository.save(opportunity);

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
      await this.assignOpportunityAdmin({
        userID: agentInfo.userID,
        opportunityID: opportunity.id,
      });
    }

    if (opportunityData.innovationFlowTemplateID) {
      const machineConfig: ILifecycleDefinition =
        await this.innovationFlowTemplateService.getInnovationFlowDefinitionFromTemplate(
          opportunityData.innovationFlowTemplateID,
          spaceID,
          InnovationFlowType.OPPORTUNITY
        );

      opportunity.lifecycle = await this.lifecycleService.createLifecycle(
        opportunity.id,
        machineConfig
      );
    }

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
      await this.innovationFlowTemplateService.getInnovationFlowDefinitionFromTemplate(
        opportunityData.innovationFlowTemplateID,
        this.getSpaceID(opportunity),
        InnovationFlowType.OPPORTUNITY
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
  ): Promise<IOpportunity | never> {
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
      relations: ['projects'],
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
      relations: ['profile'],
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

  async getProfile(opportunity: IOpportunity): Promise<IProfile> {
    return await this.baseChallengeService.getProfile(
      opportunity.id,
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

    // Whiteboardes
    const whiteboardsCount =
      await this.baseChallengeService.getWhiteboardesCount(
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

  async getOpportunitiesCount(
    visibility = SpaceVisibility.ACTIVE
  ): Promise<number> {
    const sqlQuery = `SELECT COUNT(*) as opportunitiesCount FROM opportunity RIGHT JOIN space ON opportunity.spaceID = space.id WHERE space.visibility = '${visibility}'`;
    const [queryResult]: {
      opportunitiesCount: number;
    }[] = await this.entityManager.connection.query(sqlQuery);

    return queryResult.opportunitiesCount;
  }

  async getOpportunitiesInChallengeCount(challengeID: string): Promise<number> {
    return await this.opportunityRepository.countBy({
      challenge: { id: challengeID },
    });
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
  ): Promise<IOpportunity | null> {
    return await this.opportunityRepository.findOne({
      relations: ['community', 'challenge'],
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

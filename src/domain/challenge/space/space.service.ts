import { UUID_LENGTH } from '@common/constants';
import { AuthorizationCredential, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import {
  CreateSpaceInput,
  DeleteSpaceInput,
  spaceCommunityApplicationForm,
  spaceCommunityPolicy,
} from '@domain/challenge/space';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { IProject } from '@domain/collaboration/project/project.interface';
import { ProjectService } from '@domain/collaboration/project/project.service';
import { INVP, NVP } from '@domain/common/nvp';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { ICommunity } from '@domain/community/community';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { IUserGroup } from '@domain/community/user-group';
import { IContext } from '@domain/context/context';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, In, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Space } from './space.entity';
import { ISpace } from './space.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AssignSpaceAdminInput } from './dto/space.dto.assign.admin';
import { IUser } from '@domain/community/user/user.interface';
import { RemoveSpaceAdminInput } from './dto/space.dto.remove.admin';
import { UserService } from '@domain/community/user/user.service';
import { UpdateSpaceInput } from './dto/space.dto.update';
import { CreateChallengeOnSpaceInput } from '../challenge/dto/challenge.dto.create.in.space';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunityType } from '@common/enums/community.type';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { IPreferenceSet } from '@domain/common/preference-set';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { PreferenceType } from '@common/enums/preference.type';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { InnovationFlowType } from '@common/enums/innovation.flow.type';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { SpacesQueryArgs } from './dto/space.args.query.spaces';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { TimelineService } from '@domain/timeline/timeline/timeline.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IInnovationFlowTemplate } from '@domain/template/innovation-flow-template/innovation.flow.template.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { InnovationHub, InnovationHubType } from '@domain/innovation-hub/types';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';

@Injectable()
export class SpaceService {
  constructor(
    private agentService: AgentService,
    private organizationService: OrganizationService,
    private projectService: ProjectService,
    private opportunityService: OpportunityService,
    private baseChallengeService: BaseChallengeService,
    private namingService: NamingService,
    private userService: UserService,
    private communityService: CommunityService,
    private challengeService: ChallengeService,
    private preferenceSetService: PreferenceSetService,
    private spacesFilterService: SpaceFilterService,
    private timelineService: TimelineService,
    private templatesSetService: TemplatesSetService,
    private storageBucketService: StorageBucketService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createSpace(
    spaceData: CreateSpaceInput,
    agentInfo?: AgentInfo
  ): Promise<ISpace> {
    await this.validateSpaceData(spaceData);
    const space: ISpace = Space.create(spaceData);
    // default to active space
    space.visibility = SpaceVisibility.ACTIVE;

    // Set up the storage space as that is needed for Profile
    space.storageBucket = await this.storageBucketService.createStorageBucket();

    // remove context before saving as want to control that creation
    space.context = undefined;
    await this.spaceRepository.save(space);
    await this.baseChallengeService.initialise(
      space,
      spaceData,
      space.id,
      CommunityType.SPACE,
      spaceCommunityPolicy,
      spaceCommunityApplicationForm
    );

    // set immediate community parent and  community policy
    if (space.community) {
      space.community.parentID = space.id;
      space.community.policy =
        await this.communityService.updateCommunityPolicyResourceID(
          space.community,
          space.id
        );
    }
    space.preferenceSet = await this.preferenceSetService.createPreferenceSet(
      PreferenceDefinitionSet.SPACE,
      this.createPreferenceDefaults()
    );

    space.templatesSet = await this.templatesSetService.createTemplatesSet(
      {
        minInnovationFlow: 1,
      },
      true
    );

    space.timeline = await this.timelineService.createTimeline();

    // save before assigning host in case that fails
    const savedSpace = await this.spaceRepository.save(space);

    await this.setSpaceHost(space.id, spaceData.hostID);

    if (agentInfo) {
      await this.assignMember(agentInfo.userID, space.id);

      await this.assignSpaceAdmin({
        spaceID: space.id,
        userID: agentInfo.userID,
      });
    }
    return savedSpace;
  }

  createPreferenceDefaults(): Map<PreferenceType, string> {
    const defaults: Map<PreferenceType, string> = new Map();
    defaults.set(PreferenceType.MEMBERSHIP_APPLICATIONS_FROM_ANYONE, 'true');
    defaults.set(PreferenceType.AUTHORIZATION_ANONYMOUS_READ_ACCESS, 'false');
    defaults.set(PreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES, 'false');

    return defaults;
  }

  async validateSpaceData(spaceData: CreateSpaceInput) {
    if (!(await this.isNameIdAvailable(spaceData.nameID)))
      throw new ValidationException(
        `Unable to create Space: the provided nameID is already taken: ${spaceData.nameID}`,
        LogContext.CHALLENGES
      );
  }

  async save(space: ISpace): Promise<ISpace> {
    return await this.spaceRepository.save(space);
  }

  async update(spaceData: UpdateSpaceInput): Promise<ISpace> {
    const space: ISpace = await this.baseChallengeService.update(
      spaceData,
      this.spaceRepository
    );

    // TODO: remove this once the usage of updateSpacePlatformSettings is finished
    if (spaceData.nameID) {
      if (spaceData.nameID !== space.nameID) {
        // updating the nameID, check new value is allowed
        const updateAllowed = await this.isNameIdAvailable(spaceData.nameID);
        if (!updateAllowed) {
          throw new ValidationException(
            `Unable to update Space nameID: the provided nameID is already taken: ${spaceData.nameID}`,
            LogContext.CHALLENGES
          );
        }
        space.nameID = spaceData.nameID;
      }
    }

    // TODO: remove this once the usage of updateSpacePlatformSettings is finished
    if (spaceData.hostID) {
      await this.setSpaceHost(space.id, spaceData.hostID);
    }

    return await this.spaceRepository.save(space);
  }

  public async updateSpacePlatformSettings(
    updateData: UpdateSpacePlatformSettingsInput
  ): Promise<ISpace> {
    const space = await this.getSpaceOrFail(updateData.spaceID);

    if (updateData.visibility) {
      space.visibility = updateData.visibility;
    }

    if (updateData.nameID) {
      if (updateData.nameID !== space.nameID) {
        // updating the nameID, check new value is allowed
        const updateAllowed = await this.isNameIdAvailable(updateData.nameID);
        if (!updateAllowed) {
          throw new ValidationException(
            `Unable to update Space nameID: the provided nameID is already taken: ${updateData.nameID}`,
            LogContext.CHALLENGES
          );
        }
        space.nameID = updateData.nameID;
      }
    }

    if (updateData.hostID) {
      await this.setSpaceHost(space.id, updateData.hostID);
    }

    return await this.save(space);
  }

  async deleteSpace(deleteData: DeleteSpaceInput): Promise<ISpace> {
    const space = await this.getSpaceOrFail(deleteData.ID, {
      relations: [
        'challenges',
        'preferenceSet',
        'preferenceSet.preferences',
        'templatesSet',
        'timeline',
        'profile',
        'storageBucket',
      ],
    });

    // Do not remove a space that has child challenges, require these to be individually first removed
    if (space.challenges && space.challenges.length > 0)
      throw new OperationNotAllowedException(
        `Unable to remove Space (${space.nameID}) as it contains ${space.challenges.length} challenges`,
        LogContext.CHALLENGES
      );

    await this.baseChallengeService.deleteEntities(
      space.id,
      this.spaceRepository
    );

    // Remove any host credentials
    const hostOrg = await this.getHost(space.id);
    if (hostOrg) {
      const agentHostOrg = await this.organizationService.getAgent(hostOrg);
      hostOrg.agent = await this.agentService.revokeCredential({
        agentID: agentHostOrg.id,
        type: AuthorizationCredential.SPACE_HOST,
        resourceID: space.id,
      });
      await this.organizationService.save(hostOrg);
    }

    if (space.preferenceSet) {
      await this.preferenceSetService.deletePreferenceSet(
        space.preferenceSet.id
      );
    }

    if (space.templatesSet) {
      await this.templatesSetService.deleteTemplatesSet(space.templatesSet.id);
    }

    if (space.timeline) {
      await this.timelineService.deleteTimeline(space.timeline.id);
    }

    if (space.storageBucket) {
      await this.storageBucketService.deleteStorageBucket(
        space.storageBucket.id
      );
    }

    const result = await this.spaceRepository.remove(space as Space);
    result.id = deleteData.ID;
    return result;
  }

  getVisibility(space: ISpace): SpaceVisibility {
    if (!space.visibility) {
      throw new EntityNotInitializedException(
        `SpaceVisibility not found for Space: ${space.id}`,
        LogContext.CHALLENGES
      );
    }
    return space.visibility;
  }

  public getSpacesForInnovationHub({
    type,
    spaceListFilter,
    spaceVisibilityFilter,
  }: InnovationHub): Promise<Space[]> | never {
    if (type === InnovationHubType.VISIBILITY) {
      return this.spaceRepository.findBy({
        visibility: spaceVisibilityFilter as SpaceVisibility,
      });
    }

    if (type === InnovationHubType.LIST) {
      return this.spaceRepository.findBy([
        { id: In(spaceListFilter as Array<string>) },
      ]);
    }

    throw new NotSupportedException(
      `Unsupported Innovation Hub type: '${type}'`,
      LogContext.INNOVATION_HUB
    );
  }

  /***
   * Checks if Spaces exists against a list of IDs
   * @param ids List of Space ids
   * @returns  <i>true</i> if all Spaces exist; list of ids of the Spaces that doesn't, otherwise
   */
  public async spacesExist(ids: string[]): Promise<true | string[]> {
    if (!ids.length) {
      return true;
    }

    const spaces = await this.spaceRepository.find({
      where: { id: In(ids) },
      select: { id: true },
    });

    if (!spaces.length) {
      return ids;
    }

    const notExist = [...ids];

    spaces.forEach(space => {
      const idIndex = notExist.findIndex(x => x === space.id);

      if (idIndex >= -1) {
        notExist.splice(idIndex, 1);
      }
    });

    return notExist.length > 0 ? notExist : true;
  }

  async getSpaces(args: SpacesQueryArgs): Promise<ISpace[]> {
    const visibilities = this.spacesFilterService.getAllowedVisibilities(
      args.filter
    );
    // Load the spaces
    let spaces: ISpace[];
    if (args && args.IDs)
      spaces = await this.spaceRepository.find({
        where: { id: In(args.IDs) },
      });
    else spaces = await this.spaceRepository.find();

    if (spaces.length === 0) return [];

    // Get the order to return the data in
    const sortedIDs = await this.getFilteredSpacesSortOrderDefault(
      visibilities,
      spaces.flatMap(x => x.id)
    );
    const spacesResult: ISpace[] = [];
    for (const spaceID of sortedIDs) {
      const space = spaces.find(space => space.id === spaceID);
      if (space) {
        spacesResult.push(space);
      } else {
        this.logger.error(
          'Invalid state error when sorting Spaces!',
          LogContext.CHALLENGES
        );
      }
    }
    return spacesResult;
  }

  public async getAllSpaces(): Promise<ISpace[]> {
    return this.spaceRepository.find({
      relations: ['preferenceSet', 'preferenceSet.preferences'],
    });
  }

  private async getFilteredSpacesSortOrderDefault(
    allowedVisibilities: SpaceVisibility[],
    IDs?: string[]
  ): Promise<string[]> {
    // Then load data to do the sorting
    const spacesDataForSorting = await this.spaceRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.challenges', 'challenge')
      .leftJoinAndSelect('space.authorization', 'authorization_policy')
      .leftJoinAndSelect('challenge.opportunities', 'opportunities')
      .whereInIds(IDs)
      .getMany();

    return this.filterAndSortSpaces(spacesDataForSorting, allowedVisibilities);
  }

  private filterAndSortSpaces(
    spacesData: Space[],
    allowedVisibilities: SpaceVisibility[]
  ): string[] {
    const visibleSpaces = spacesData.filter(space => {
      return this.spacesFilterService.isVisible(
        space.visibility,
        allowedVisibilities
      );
    });

    const sortedSpaces = visibleSpaces.sort((a, b) => {
      if (
        a.visibility !== b.visibility &&
        (a.visibility === SpaceVisibility.DEMO ||
          b.visibility === SpaceVisibility.DEMO)
      )
        return a.visibility === SpaceVisibility.DEMO ? 1 : -1;

      if (
        a.authorization?.anonymousReadAccess === true &&
        b.authorization?.anonymousReadAccess === false
      )
        return -1;
      if (
        a.authorization?.anonymousReadAccess === false &&
        b.authorization?.anonymousReadAccess === true
      )
        return 1;

      if (!a.challenges && b.challenges) return 1;
      if (a.challenges && !b.challenges) return -1;
      if (!a.challenges && !b.challenges) return 0;

      // Shouldn't get there
      if (!a.challenges || !b.challenges)
        throw new ValidationException(
          `Critical error when comparing Spaces! Critical error when loading Challenges for Space ${a} and Space ${b}`,
          LogContext.CHALLENGES
        );

      const oppChallCountA = this.getChallengeAndOpportunitiesCount(
        a?.challenges
      );
      const oppChallCountB = this.getChallengeAndOpportunitiesCount(
        b?.challenges
      );

      if (oppChallCountA > oppChallCountB) return -1;
      if (oppChallCountA < oppChallCountB) return 1;

      return 0;
    });

    const sortedIDs: string[] = [];
    for (const space of sortedSpaces) {
      sortedIDs.push(space.id);
    }
    return sortedIDs;
  }

  private getChallengeAndOpportunitiesCount(challenges: IChallenge[]): number {
    let challengeAndOpportunitiesCount = 0;
    for (const challenge of challenges) {
      challengeAndOpportunitiesCount++;

      if (challenge.opportunities)
        challengeAndOpportunitiesCount += challenge.opportunities.length;
    }
    return challengeAndOpportunitiesCount;
  }

  async getSpacesById(
    spaceIdsOrNameIds: string[],
    options?: FindManyOptions<Space>
  ) {
    return this.spaceRepository.find({
      ...options,
      where: options?.where
        ? Array.isArray(options.where)
          ? [
              { id: In(spaceIdsOrNameIds) },
              { nameID: In(spaceIdsOrNameIds) },
              ...options.where,
            ]
          : [
              { id: In(spaceIdsOrNameIds) },
              { nameID: In(spaceIdsOrNameIds) },
              options.where,
            ]
        : [{ id: In(spaceIdsOrNameIds) }, { nameID: In(spaceIdsOrNameIds) }],
    });
  }

  async getSpaceOrFail(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | never> {
    let space: ISpace | null = null;
    if (spaceID.length === UUID_LENGTH) {
      space = await this.spaceRepository.findOne({
        where: { id: spaceID },
        ...options,
      });
    }
    if (!space) {
      // look up based on nameID
      space = await this.spaceRepository.findOne({
        where: { nameID: spaceID },
        ...options,
      });
    }
    if (!space)
      throw new EntityNotFoundException(
        `Unable to find Space with ID: ${spaceID}`,
        LogContext.CHALLENGES
      );
    return space;
  }

  async getTemplatesSetOrFail(spaceId: string): Promise<ITemplatesSet> {
    const spaceWithTemplates = await this.getSpaceOrFail(spaceId, {
      relations: ['templatesSet', 'templatesSet.postTemplates'],
    });
    const templatesSet = spaceWithTemplates.templatesSet;

    if (!templatesSet) {
      throw new EntityNotFoundException(
        `Unable to find templatesSet for space with nameID: ${spaceWithTemplates.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return templatesSet;
  }

  async getTimelineOrFail(spaceId: string): Promise<ITimeline> {
    const spaceWithTimeline = await this.getSpaceOrFail(spaceId, {
      relations: ['timeline'],
    });
    const timeline = spaceWithTimeline.timeline;

    if (!timeline) {
      throw new EntityNotFoundException(
        `Unable to find timeline for space with nameID: ${spaceWithTimeline.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return timeline;
  }

  async getStorageBucketOrFail(spaceId: string): Promise<IStorageBucket> {
    const spaceWithStorageBucket = await this.getSpaceOrFail(spaceId, {
      relations: ['storageBucket'],
    });
    const storageBucket = spaceWithStorageBucket.storageBucket;

    if (!storageBucket) {
      throw new EntityNotFoundException(
        `Unable to find storagebucket for space with nameID: ${spaceWithStorageBucket.nameID}`,
        LogContext.STORAGE_BUCKET
      );
    }

    return storageBucket;
  }

  async getPreferenceSetOrFail(spaceId: string): Promise<IPreferenceSet> {
    const spaceWithPreferences = await this.getSpaceOrFail(spaceId, {
      relations: ['preferenceSet', 'preferenceSet.preferences'],
    });
    const preferenceSet = spaceWithPreferences.preferenceSet;

    if (!preferenceSet) {
      throw new EntityNotFoundException(
        `Unable to find preferenceSet for space with nameID: ${spaceWithPreferences.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return preferenceSet;
  }

  async setSpaceHost(spaceID: string, hostOrgID: string): Promise<ISpace> {
    const organization = await this.organizationService.getOrganizationOrFail(
      hostOrgID,
      { relations: ['groups', 'agent'] }
    );

    const existingHost = await this.getHost(spaceID);

    if (existingHost) {
      const agentExisting = await this.organizationService.getAgent(
        existingHost
      );
      organization.agent = await this.agentService.revokeCredential({
        agentID: agentExisting.id,
        type: AuthorizationCredential.SPACE_HOST,
        resourceID: spaceID,
      });
    }

    // assign the credential
    const agent = await this.organizationService.getAgent(organization);
    organization.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.SPACE_HOST,
      resourceID: spaceID,
    });

    await this.organizationService.save(organization);
    return await this.getSpaceOrFail(spaceID);
  }

  async isNameIdAvailable(nameID: string): Promise<boolean> {
    const challengeCount = await this.spaceRepository.countBy({
      nameID: nameID,
    });
    if (challengeCount != 0) return false;

    // check restricted space names
    const restrictedSpaceNames = ['user', 'organization'];
    if (restrictedSpaceNames.includes(nameID.toLowerCase())) return false;

    return true;
  }

  async getChallenges(
    space: ISpace,
    args?: LimitAndShuffleIdsQueryArgs
  ): Promise<IChallenge[]> {
    let spaceWithChallenges;
    if (args && args.IDs) {
      {
        spaceWithChallenges = await this.getSpaceOrFail(space.id, {
          relations: ['challenges'],
        });
        spaceWithChallenges.challenges = spaceWithChallenges.challenges?.filter(
          c => args.IDs?.includes(c.id)
        );
      }
    } else
      spaceWithChallenges = await this.getSpaceOrFail(space.id, {
        relations: ['challenges'],
      });

    const challenges = spaceWithChallenges.challenges;
    if (!challenges) {
      throw new RelationshipNotFoundException(
        `Unable to load challenges for Space ${space.id} `,
        LogContext.CHALLENGES
      );
    }

    const limitAndShuffled = limitAndShuffle(
      challenges,
      args?.limit,
      args?.shuffle
    );

    // Sort the challenges base on their display name
    const sortedChallenges = limitAndShuffled.sort((a, b) =>
      a.nameID > b.nameID ? 1 : -1
    );
    return sortedChallenges;
  }

  async getGroups(space: ISpace): Promise<IUserGroup[]> {
    const community = await this.getCommunity(space);
    return await this.communityService.getUserGroups(community);
  }

  async getOpportunitiesInNameableScope(
    space: ISpace,
    IDs?: string[]
  ): Promise<IOpportunity[]> {
    return await this.opportunityService.getOpportunitiesInNameableScope(
      space.id,
      IDs
    );
  }

  async getOpportunityInNameableScope(
    opportunityID: string,
    space: ISpace
  ): Promise<IOpportunity> {
    return await this.opportunityService.getOpportunityInNameableScopeOrFail(
      opportunityID,
      space.id
    );
  }

  async getChallengeInNameableScope(
    challengeID: string,
    space: ISpace
  ): Promise<IChallenge> {
    return await this.challengeService.getChallengeInNameableScopeOrFail(
      challengeID,
      space.id
    );
  }

  async getProjectInNameableScope(
    projectID: string,
    space: ISpace
  ): Promise<IProject> {
    return await this.projectService.getProjectInNameableScopeOrFail(
      projectID,
      space.id
    );
  }

  async getCommunity(space: ISpace): Promise<ICommunity> {
    return await this.baseChallengeService.getCommunity(
      space.id,
      this.spaceRepository
    );
  }

  async getCommunityPolicy(space: ISpace): Promise<ICommunityPolicy> {
    return await this.baseChallengeService.getCommunityPolicy(
      space.id,
      this.spaceRepository
    );
  }

  async getContext(space: ISpace): Promise<IContext> {
    return await this.baseChallengeService.getContext(
      space.id,
      this.spaceRepository
    );
  }

  async getProfile(space: ISpace): Promise<IProfile> {
    return await this.baseChallengeService.getProfile(
      space.id,
      this.spaceRepository
    );
  }

  public async getCollaboration(space: ISpace): Promise<ICollaboration> {
    return await this.baseChallengeService.getCollaboration(
      space.id,
      this.spaceRepository
    );
  }

  async getDefaultInnovationFlowTemplate(
    spaceId: string,
    lifecycleType: InnovationFlowType
  ): Promise<IInnovationFlowTemplate> {
    const space = await this.getSpaceOrFail(spaceId, {
      relations: ['templateSet'],
    });

    if (!space.templatesSet)
      throw new EntityNotInitializedException(
        `Templates set for space: ${spaceId} not initialized`,
        LogContext.CHALLENGES
      );

    const allInnovationFlowTemplates =
      await this.templatesSetService.getInnovationFlowTemplates(
        space.templatesSet
      );

    const selectableInnovationFlowTemplates = allInnovationFlowTemplates.filter(
      x => x.type === lifecycleType
    );

    if (selectableInnovationFlowTemplates.length === 0)
      throw new ValidationException(
        `Could not find default innovation flow template of type ${lifecycleType} in space ${spaceId}`,
        LogContext.CHALLENGES
      );

    return selectableInnovationFlowTemplates[0];
  }

  async validateChallengeNameIdOrFail(proposedNameID: string, spaceID: string) {
    const nameAvailable = await this.namingService.isNameIdAvailableInSpace(
      proposedNameID,
      spaceID
    );
    if (!nameAvailable)
      throw new ValidationException(
        `Unable to create Challenge: the provided nameID is already taken: ${proposedNameID}`,
        LogContext.CHALLENGES
      );
  }

  async createChallengeInSpace(
    challengeData: CreateChallengeOnSpaceInput,
    agentInfo?: AgentInfo
  ): Promise<IChallenge> {
    const space = await this.getSpaceOrFail(challengeData.spaceID);
    await this.validateChallengeNameIdOrFail(challengeData.nameID, space.id);

    // Update the challenge data being passed in to state set the parent ID to the contained challenge
    const newChallenge = await this.challengeService.createChallenge(
      challengeData,
      space.id,
      agentInfo
    );

    return await this.addChallengeToSpace(space.id, newChallenge);
  }

  async addChallengeToSpace(
    spaceID: string,
    challenge: IChallenge
  ): Promise<IChallenge> {
    const space = await this.getSpaceOrFail(spaceID, {
      relations: ['challenges', 'community'],
    });
    if (!space.challenges)
      throw new ValidationException(
        `Unable to create Challenge: challenges not initialized: ${spaceID}`,
        LogContext.CHALLENGES
      );

    space.challenges.push(challenge);
    // Finally set the community relationship
    challenge.community = await this.communityService.setParentCommunity(
      challenge.community,
      space.community
    );

    await this.spaceRepository.save(space);
    return challenge;
  }

  async getChallenge(challengeID: string, space: ISpace): Promise<IChallenge> {
    return await this.challengeService.getChallengeInNameableScopeOrFail(
      challengeID,
      space.id
    );
  }

  async getCommunityInNameableScope(
    communityID: string,
    space: ISpace
  ): Promise<ICommunity> {
    return await this.communityService.getCommunityInNameableScopeOrFail(
      communityID,
      space.id
    );
  }

  async getProjects(space: ISpace): Promise<IProject[]> {
    return await this.projectService.getProjects(space.id);
  }

  async getMetrics(space: ISpace): Promise<INVP[]> {
    const metrics: INVP[] = [];

    // Challenges
    const challengesCount =
      await this.challengeService.getChallengesInSpaceCount(space.id);
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    challengesTopic.id = `challenges-${space.id}`;
    metrics.push(challengesTopic);

    const opportunitiesCount =
      await this.opportunityService.getOpportunitiesInSpaceCount(space.id);
    const opportunitiesTopic = new NVP(
      'opportunities',
      opportunitiesCount.toString()
    );
    opportunitiesTopic.id = `opportunities-${space.id}`;
    metrics.push(opportunitiesTopic);

    // Projects
    const projectsCount = await this.projectService.getProjectsInSpaceCount(
      space.id
    );
    const projectsTopic = new NVP('projects', projectsCount.toString());
    projectsTopic.id = `projects-${space.id}`;
    metrics.push(projectsTopic);

    // Members
    const membersCount = await this.getMembersCount(space);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${space.id}`;
    metrics.push(membersTopic);

    // Posts
    const postsCount = await this.baseChallengeService.getPostsCount(
      space,
      this.spaceRepository
    );
    const postsTopic = new NVP('posts', postsCount.toString());
    postsTopic.id = `posts-${space.id}`;
    metrics.push(postsTopic);

    // Whiteboardes
    const whiteboardsCount =
      await this.baseChallengeService.getWhiteboardesCount(
        space,
        this.spaceRepository
      );
    const whiteboardsTopic = new NVP(
      'whiteboards',
      whiteboardsCount.toString()
    );
    whiteboardsTopic.id = `whiteboards-${space.id}`;
    metrics.push(whiteboardsTopic);

    return metrics;
  }

  async getChallengesCount(spaceID: string): Promise<number> {
    return await this.challengeService.getChallengesInSpaceCount(spaceID);
  }

  async getAgent(spaceID: string): Promise<IAgent> {
    return await this.baseChallengeService.getAgent(
      spaceID,
      this.spaceRepository
    );
  }

  async getMembersCount(space: ISpace): Promise<number> {
    return await this.baseChallengeService.getMembersCount(
      space,
      this.spaceRepository
    );
  }

  async getSpaceCount(visibility = SpaceVisibility.ACTIVE): Promise<number> {
    return await this.spaceRepository.countBy({ visibility: visibility });
  }

  async getHost(spaceID: string): Promise<IOrganization | undefined> {
    const organizations =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_HOST,
        resourceID: spaceID,
      });
    if (organizations.length == 0) {
      return undefined;
    }
    if (organizations.length > 1) {
      throw new RelationshipNotFoundException(
        `More than one host for Space ${spaceID} `,
        LogContext.CHALLENGES
      );
    }
    return organizations[0];
  }

  async assignMember(userID: string, spaceId: string) {
    const agent = await this.userService.getAgent(userID);
    const space = await this.getSpaceOrFail(spaceId);

    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.SPACE_MEMBER,
      resourceID: space.id,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async assignSpaceAdmin(assignData: AssignSpaceAdminInput): Promise<IUser> {
    const userID = assignData.userID;
    const agent = await this.userService.getAgent(userID);
    const space = await this.getSpaceOrFail(assignData.spaceID);

    // assign the credential
    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.SPACE_ADMIN,
      resourceID: space.id,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async removeSpaceAdmin(removeData: RemoveSpaceAdminInput): Promise<IUser> {
    const spaceID = removeData.spaceID;
    const space = await this.getSpaceOrFail(spaceID);
    const agent = await this.userService.getAgent(removeData.userID);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.SPACE_ADMIN,
      resourceID: space.id,
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async getPreferences(space: ISpace): Promise<IPreference[]> {
    const preferenceSet = await this.getPreferenceSetOrFail(space.id);

    const preferences = preferenceSet.preferences;

    if (!preferences) {
      throw new EntityNotInitializedException(
        `Space preferences not initialized: ${space.id}`,
        LogContext.CHALLENGES
      );
    }

    return preferences;
  }
}

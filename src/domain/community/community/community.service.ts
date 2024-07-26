import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { CreateUserGroupInput } from '@domain/community/user-group/dto';
import { Community, ICommunity } from '@domain/community/community';
import { ApplicationService } from '@domain/community/application/application.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ICommunication } from '@domain/communication/communication';
import { LogContext } from '@common/enums/logging.context';
import { CommunityRole } from '@common/enums/community.role';
import { ICommunityRolePolicy } from '../community-policy/community.policy.role.interface';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
import { CommunityPolicyService } from '../community-policy/community.policy.service';
import { ICommunityPolicyDefinition } from '../community-policy/community.policy.definition';
import { IForm } from '@domain/common/form/form.interface';
import { FormService } from '@domain/common/form/form.service';
import { UpdateFormInput } from '@domain/common/form/dto/form.dto.update';
import { InvitationService } from '../invitation/invitation.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { CommunityGuidelinesService } from '../community-guidelines/community.guidelines.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateCommunityInput } from './dto/community.dto.create';
import { ICommunityGuidelines } from '../community-guidelines/community.guidelines.interface';
import { IContributor } from '../contributor/contributor.interface';
import { PlatformInvitationService } from '@platform/invitation/platform.invitation.service';
import { IUser } from '../user/user.interface';

@Injectable()
export class CommunityService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupService: UserGroupService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private platformInvitationService: PlatformInvitationService,
    private communicationService: CommunicationService,
    private communityResolverService: CommunityResolverService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private formService: FormService,
    private communityPolicyService: CommunityPolicyService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunity(
    communityData: CreateCommunityInput,
    storageAggregator: IStorageAggregator
  ): Promise<ICommunity> {
    const community: ICommunity = new Community();
    community.authorization = new AuthorizationPolicy();
    const policy = communityData.policy as ICommunityPolicyDefinition;
    community.policy = this.communityPolicyService.createCommunityPolicy(
      policy.member,
      policy.lead,
      policy.admin
    );

    community.guidelines =
      await this.communityGuidelinesService.createCommunityGuidelines(
        communityData.guidelines,
        storageAggregator
      );
    community.applicationForm = this.formService.createForm(
      communityData.applicationForm
    );

    community.applications = [];
    community.invitations = [];
    community.platformInvitations = [];

    community.groups = [];
    community.communication =
      await this.communicationService.createCommunication(
        communityData.name,
        ''
      );
    return community;
  }

  async createGroup(groupData: CreateUserGroupInput): Promise<IUserGroup> {
    const communityID = groupData.parentID;
    const groupName = groupData.profile.displayName;

    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to Community (${communityID})`,
      LogContext.COMMUNITY
    );

    // Try to find the Community
    const community = await this.getCommunityOrFail(communityID, {
      relations: { groups: true },
    });

    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCommunity(
        community.id
      );
    const group = await this.userGroupService.addGroupWithName(
      community,
      groupName,
      storageAggregator
    );
    await this.communityRepository.save(community);

    return group;
  }

  // Loads the group into the Community entity if not already present
  async getUserGroups(community: ICommunity): Promise<IUserGroup[]> {
    const communityWithGroups = await this.getCommunityOrFail(community.id, {
      relations: { groups: true },
    });
    if (!communityWithGroups.groups) {
      throw new EntityNotInitializedException(
        `Community not initialized: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communityWithGroups.groups;
  }

  // Loads the group into the Community entity if not already present
  async getUserGroup(
    community: ICommunity,
    groupID: string
  ): Promise<IUserGroup> {
    const communityWithGroups = await this.getCommunityOrFail(community.id, {
      relations: { groups: true },
    });
    if (!communityWithGroups.groups) {
      throw new EntityNotInitializedException(
        `Community not initialized: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    const result = communityWithGroups.groups.find(
      group => group.id === groupID
    );
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find group with ID: '${groupID}'`,
        LogContext.COMMUNITY,
        { communityId: community.id }
      );
    }
    return result;
  }

  async getCommunityOrFail(
    communityID: string,
    options?: FindOneOptions<Community>
  ): Promise<ICommunity | never> {
    const community = await this.communityRepository.findOne({
      where: { id: communityID },
      ...options,
    });
    if (!community)
      throw new EntityNotFoundException(
        `Unable to find Community with ID: ${communityID}`,
        LogContext.COMMUNITY
      );
    return community;
  }

  async removeCommunity(communityID: string): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const community = await this.getCommunityOrFail(communityID, {
      relations: {
        applications: true,
        invitations: true,
        platformInvitations: true,
        groups: true,
        communication: true,
        applicationForm: true,
        guidelines: true,
      },
    });
    if (
      !community.communication ||
      !community.communication.updates ||
      !community.policy ||
      !community.groups ||
      !community.applications ||
      !community.invitations ||
      !community.platformInvitations ||
      !community.guidelines ||
      !community.applicationForm
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for community for deletion: ${community.id} `,
        LogContext.COMMUNITY
      );
    }

    // Remove all groups
    for (const group of community.groups) {
      await this.userGroupService.removeUserGroup({
        ID: group.id,
      });
    }

    if (community.authorization)
      await this.authorizationPolicyService.delete(community.authorization);

    // Remove all applications
    for (const application of community.applications) {
      await this.applicationService.deleteApplication({
        ID: application.id,
      });
    }

    // Remove all invitations
    for (const invitation of community.invitations) {
      await this.invitationService.deleteInvitation({
        ID: invitation.id,
      });
    }

    for (const externalInvitation of community.platformInvitations) {
      await this.platformInvitationService.deletePlatformInvitation({
        ID: externalInvitation.id,
      });
    }

    await this.communicationService.removeCommunication(
      community.communication.id
    );

    await this.formService.removeForm(community.applicationForm);

    await this.communityPolicyService.removeCommunityPolicy(community.policy);

    await this.communityGuidelinesService.deleteCommunityGuidelines(
      community.guidelines.id
    );

    await this.communityRepository.remove(community as Community);
    return true;
  }

  async save(community: ICommunity): Promise<ICommunity> {
    return await this.communityRepository.save(community);
  }

  async getParentCommunity(
    community: ICommunity
  ): Promise<ICommunity | undefined> {
    const communityWithParent = await this.getCommunityOrFail(community.id, {
      relations: { parentCommunity: true },
    });

    const parentCommunity = communityWithParent?.parentCommunity;
    if (parentCommunity) {
      return await this.getCommunityOrFail(parentCommunity.id);
    }
    return undefined;
  }

  async updateApplicationForm(
    community: ICommunity,
    formData: UpdateFormInput
  ): Promise<ICommunity> {
    const applicationForm = await this.getApplicationForm(community);
    community.applicationForm = await this.formService.updateForm(
      applicationForm,
      formData
    );
    return await this.save(community);
  }

  async setParentCommunity(
    community?: ICommunity,
    parentCommunity?: ICommunity
  ): Promise<ICommunity> {
    if (!community || !parentCommunity)
      throw new EntityNotInitializedException(
        'Community not set',
        LogContext.COMMUNITY
      );
    community.parentCommunity = parentCommunity;
    // Also update the communityPolicy
    community.policy =
      await this.communityPolicyService.inheritParentCredentials(
        this.getCommunityPolicy(parentCommunity),
        this.getCommunityPolicy(community)
      );
    return await this.communityRepository.save(community);
  }

  public async getDisplayName(community: ICommunity): Promise<string> {
    return await this.communityResolverService.getDisplayNameForCommunityOrFail(
      community.id
    );
  }

  public async addMemberToCommunication(
    contributor: IContributor,
    community: ICommunity
  ): Promise<void> {
    // register the user for the community rooms
    const communication = await this.getCommunication(community.id);
    this.communicationService
      .addContributorToCommunications(
        communication,
        contributor.communicationID
      )
      .catch(error =>
        this.logger.error(
          `Unable to add user to community messaging (${community.id}): ${error}`,
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }

  public async removeMemberFromCommunication(
    community: ICommunity,
    user: IUser
  ): Promise<void> {
    const communication = await this.getCommunication(community.id);
    this.communicationService
      .removeUserFromCommunications(communication, user)
      .catch(error =>
        this.logger.error(
          `Unable remove user from community messaging (${community.id}): ${error}`,
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }

  public getCommunityPolicy(community: ICommunity): ICommunityPolicy {
    const policy = community.policy;
    if (!policy) {
      throw new EntityNotInitializedException(
        `Unable to locate policy for community: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return policy;
  }

  public async getCommunityGuidelines(
    community: ICommunity
  ): Promise<ICommunityGuidelines> {
    const communityWithGuidelines = await this.getCommunityOrFail(
      community.id,
      {
        relations: { guidelines: true },
      }
    );

    if (!communityWithGuidelines.guidelines) {
      throw new EntityNotInitializedException(
        `Unable to locate guidelines for community: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communityWithGuidelines.guidelines;
  }

  async getCommunication(
    communityID: string,
    relations?: FindOptionsRelations<ICommunity>
  ): Promise<ICommunication> {
    const community = await this.getCommunityOrFail(communityID, {
      relations: { communication: true, ...relations },
    });

    const communication = community.communication;
    if (!communication) {
      throw new EntityNotInitializedException(
        `Unable to locate communication for community: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communication;
  }

  public async getPeerCommunites(
    parentCommunity: ICommunity,
    childCommunity: ICommunity
  ): Promise<ICommunity[]> {
    const peerCommunities = await this.communityRepository.find({
      where: {
        parentCommunity: {
          id: parentCommunity.id,
        },
      },
    });
    return peerCommunities.filter(
      community => community.id !== childCommunity.id
    );
  }

  public async isCommunityAccountMatchingVcAccount(
    communityID: string,
    virtualContributorID: string
  ): Promise<boolean> {
    return await this.communityResolverService.isCommunityAccountMatchingVcAccount(
      communityID,
      virtualContributorID
    );
  }

  public async getRootSpaceID(community: ICommunity): Promise<string> {
    return await this.communityResolverService.getRootSpaceIDFromCommunityOrFail(
      community
    );
  }

  public getCommunityPolicyForRole(
    community: ICommunity,
    role: CommunityRole
  ): ICommunityRolePolicy {
    const policy = this.getCommunityPolicy(community);
    return this.communityPolicyService.getCommunityRolePolicy(policy, role);
  }

  public updateCommunityPolicyResourceID(
    community: ICommunity,
    resourceID: string
  ): Promise<ICommunityPolicy> {
    const policy = this.getCommunityPolicy(community);
    return this.communityPolicyService.updateCommunityPolicyResourceID(
      policy,
      resourceID
    );
  }

  async getApplicationForm(community: ICommunity): Promise<IForm> {
    const communityForm = await this.getCommunityOrFail(community.id, {
      relations: { applicationForm: true },
    });
    const applicationForm = communityForm.applicationForm;
    if (!applicationForm) {
      throw new EntityNotFoundException(
        `Unable to find Application Form for Community with ID: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return applicationForm;
  }

  async isSpaceCommunity(community: ICommunity): Promise<boolean> {
    const parentCommunity = await this.getParentCommunity(community);

    return parentCommunity === undefined;
  }
}

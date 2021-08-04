import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { ProfileService } from '@domain/community/profile/profile.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import {
  IOrganisation,
  Organisation,
  UpdateOrganisationInput,
  DeleteOrganisationInput,
  CreateOrganisationInput,
} from '@domain/community/organisation';
import { IUserGroup, CreateUserGroupInput } from '@domain/community/user-group';
import { IUser } from '@domain/community/user';
import { UserService } from '@domain/community/user/user.service';
import { UUID_LENGTH } from '@common/constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAgent } from '@domain/agent/agent';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CredentialsSearchInput } from '@domain/agent/credential/credentials.dto.search';
import { RemoveOrganisationMemberInput } from './organisation.dto.remove.member';
import { AssignOrganisationMemberInput } from './organisation.dto.assign.member';

@Injectable()
export class OrganisationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private userService: UserService,
    private agentService: AgentService,
    private userGroupService: UserGroupService,
    private profileService: ProfileService,
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createOrganisation(
    organisationData: CreateOrganisationInput
  ): Promise<IOrganisation> {
    await this.checkNameIdOrFail(organisationData.nameID);

    const organisation: IOrganisation = Organisation.create(organisationData);
    organisation.authorization = new AuthorizationPolicy();
    organisation.profile = await this.profileService.createProfile(
      organisationData.profileData
    );

    organisation.groups = [];

    organisation.agent = await this.agentService.createAgent({
      parentDisplayID: `${organisation.nameID}`,
    });

    const savedOrg = await this.organisationRepository.save(organisation);
    this.logger.verbose?.(
      `Created new organisation with id ${organisation.id}`,
      LogContext.COMMUNITY
    );
    return savedOrg;
  }

  async checkNameIdOrFail(nameID: string) {
    const organisationCount = await this.organisationRepository.count({
      nameID: nameID,
    });
    if (organisationCount >= 1)
      throw new ValidationException(
        `Organisation: the provided nameID is already taken: ${nameID}`,
        LogContext.COMMUNITY
      );
  }

  async updateOrganisation(
    organisationData: UpdateOrganisationInput
  ): Promise<IOrganisation> {
    const organisation = await this.getOrganisationOrFail(organisationData.ID);

    // Merge in the data
    if (organisationData.displayName)
      organisation.displayName = organisationData.displayName;

    // Check the tagsets
    if (organisationData.profileData && organisation.profile) {
      organisation.profile = await this.profileService.updateProfile(
        organisationData.profileData
      );
    }

    if (organisationData.nameID) {
      if (organisationData.nameID !== organisation.nameID) {
        // updating the nameID, check new value is allowed
        await this.checkNameIdOrFail(organisationData.nameID);
        organisation.nameID = organisationData.nameID;
      }
    }

    return await this.organisationRepository.save(organisation);
  }

  async deleteOrganisation(
    deleteData: DeleteOrganisationInput
  ): Promise<IOrganisation> {
    const orgID = deleteData.ID;
    const organisation = await this.getOrganisationOrFail(orgID, {
      relations: ['profile', 'groups', 'agent'],
    });
    const isEcoverseHost = await this.isEcoverseHost(organisation);
    if (isEcoverseHost) {
      throw new ForbiddenException(
        'Unable to delete Organisation: host of one or more ecoverses',
        LogContext.CHALLENGES
      );
    }

    if (organisation.profile) {
      await this.profileService.deleteProfile(organisation.profile.id);
    }

    if (organisation.groups) {
      for (const group of organisation.groups) {
        await this.userGroupService.removeUserGroup({
          ID: group.id,
        });
      }
    }

    if (organisation.authorization) {
      await this.authorizationPolicyService.delete(organisation.authorization);
    }

    if (organisation.agent) {
      await this.agentService.deleteAgent(organisation.agent.id);
    }

    const result = await this.organisationRepository.remove(
      organisation as Organisation
    );
    result.id = orgID;
    return result;
  }

  async isEcoverseHost(organisation: IOrganisation): Promise<boolean> {
    if (!organisation.agent)
      throw new RelationshipNotFoundException(
        `Unable to load agent for organisation: ${organisation.id}`,
        LogContext.COMMUNITY
      );

    return await this.agentService.hasValidCredential(organisation.agent.id, {
      type: AuthorizationCredential.EcoverseHost,
    });
  }

  async getOrganisation(
    organisationID: string,
    options?: FindOneOptions<Organisation>
  ): Promise<IOrganisation | undefined> {
    let organisation: IOrganisation | undefined;
    if (organisationID.length === UUID_LENGTH) {
      organisation = await this.organisationRepository.findOne(
        { id: organisationID },
        options
      );
    } else {
      // look up based on nameID
      organisation = await this.organisationRepository.findOne(
        { nameID: organisationID },
        options
      );
    }
    return organisation;
  }

  async getOrganisationOrFail(
    organisationID: string,
    options?: FindOneOptions<Organisation>
  ): Promise<IOrganisation> {
    const organisation = await this.getOrganisation(organisationID, options);
    if (!organisation)
      throw new EntityNotFoundException(
        `Unable to find Organisation with ID: ${organisationID}`,
        LogContext.CHALLENGES
      );
    return organisation;
  }

  async getOrganisations(): Promise<Organisation[]> {
    const organisations = await this.organisationRepository.find();
    return organisations || [];
  }

  async getMembers(organisation: Organisation): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.OrganisationMember,
      resourceID: organisation.id,
    });
  }

  async createGroup(groupData: CreateUserGroupInput): Promise<IUserGroup> {
    const orgID = groupData.parentID;
    const groupName = groupData.name;
    // First find the Challenge
    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to organisation (${orgID})`
    );
    // Try to find the organisation
    const organisation = await this.getOrganisationOrFail(orgID, {
      relations: ['groups'],
    });

    const group = await this.userGroupService.addGroupWithName(
      organisation,
      groupName
    );
    await this.organisationRepository.save(organisation);

    return group;
  }

  async save(organisation: IOrganisation): Promise<IOrganisation> {
    return await this.organisationRepository.save(organisation);
  }

  async getAgent(organisation: IOrganisation): Promise<IAgent> {
    const organisationWithAgent = await this.getOrganisationOrFail(
      organisation.id,
      {
        relations: ['agent'],
      }
    );
    const agent = organisationWithAgent.agent;
    if (!agent)
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${organisation.id}`,
        LogContext.AUTH
      );

    return agent;
  }

  async getUserGroups(organisation: IOrganisation): Promise<IUserGroup[]> {
    const organisationGroups = await this.getOrganisationOrFail(
      organisation.id,
      {
        relations: ['groups'],
      }
    );
    const groups = organisationGroups.groups;
    if (!groups)
      throw new ValidationException(
        `No groups on organisation: ${organisation.displayName}`,
        LogContext.COMMUNITY
      );
    return groups;
  }

  async getOrganisationCount(): Promise<number> {
    return await this.organisationRepository.count();
  }

  async organisationsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<IOrganisation[]> {
    const credResourceID = credentialCriteria.resourceID || '';
    const organisationMatches = await this.organisationRepository
      .createQueryBuilder('organisation')
      .leftJoinAndSelect('organisation.agent', 'agent')
      .leftJoinAndSelect('agent.credentials', 'credential')
      .where('credential.type = :type')
      .andWhere('credential.resourceID = :resourceID')
      .setParameters({
        type: `${credentialCriteria.type}`,
        resourceID: credResourceID,
      })
      .getMany();

    // reload to go through the normal loading path
    const results: IOrganisation[] = [];
    for (const organisation of organisationMatches) {
      const loadedOrganisation = await this.getOrganisationOrFail(
        organisation.id
      );
      results.push(loadedOrganisation);
    }
    return results;
  }

  async assignMember(
    membershipData: AssignOrganisationMemberInput
  ): Promise<IOrganisation> {
    const organisation = await this.getOrganisationOrFail(
      membershipData.organisationID
    );

    // Assign a credential for community membership
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    user.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.OrganisationMember,
      resourceID: organisation.id,
    });
    return organisation;
  }

  async removeMember(
    membershipData: RemoveOrganisationMemberInput
  ): Promise<IOrganisation> {
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    const organisation = await this.getOrganisationOrFail(
      membershipData.organisationID
    );
    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.OrganisationMember,
      resourceID: organisation.id,
    });

    return organisation;
  }
}

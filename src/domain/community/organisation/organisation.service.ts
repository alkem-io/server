import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
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
import { UserService } from '../user/user.service';
import { NamingService } from '@src/services/naming/naming.service';
import { UUID_LENGTH } from '@common/constants';

@Injectable()
export class OrganisationService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private namingService: NamingService,
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
    organisation.profile = await this.profileService.createProfile(
      organisationData.profileData
    );

    // Check that the mandatory groups for a challenge are created
    organisation.groups = [];

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
    const organisation = await this.getOrganisationOrFail(orgID);

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

    const result = await this.organisationRepository.remove(
      organisation as Organisation
    );
    result.id = orgID;
    return result;
  }

  async getOrganisationOrFail(
    organisationID: string,
    options?: FindOneOptions<Organisation>
  ): Promise<IOrganisation> {
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

  async save(organisation: IOrganisation) {
    await this.organisationRepository.save(organisation);
  }
}

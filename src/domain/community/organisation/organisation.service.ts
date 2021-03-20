import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ProfileService } from '@domain/community/profile/profile.service';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { OrganisationInput } from './organisation.dto';
import { Organisation } from './organisation.entity';
import { IOrganisation } from './organisation.interface';
import { AuthorizationRoles } from '@core/authorization';

@Injectable()
export class OrganisationService {
  constructor(
    private userGroupService: UserGroupService,
    private profileService: ProfileService,
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createOrganisation(
    organisationData: OrganisationInput
  ): Promise<IOrganisation> {
    await this.validateOrganisationCreationRequest(organisationData);

    // No existing organisation found, create and initialise a new one!
    const organisation = new Organisation();
    await this.initialiseMembers(organisation);
    await this.organisationRepository.save(organisation);
    this.logger.verbose?.(
      `Created new organisation with id ${organisation.id}`,
      LogContext.COMMUNITY
    );
    return organisation;
  }

  async initialiseMembers(organisation: IOrganisation): Promise<IOrganisation> {
    if (!organisation.restrictedGroupNames) {
      organisation.restrictedGroupNames = [AuthorizationRoles.Members];
    }

    if (!organisation.groups) {
      organisation.groups = [];
      // Check that the mandatory groups for a challenge are created
      await this.userGroupService.addMandatoryGroups(
        organisation,
        organisation.restrictedGroupNames
      );
    }

    // Initialise contained singletons
    if (!organisation.profile) {
      organisation.profile = await this.profileService.createProfile();
    }

    return organisation;
  }

  async validateOrganisationCreationRequest(
    organisationData: OrganisationInput
  ): Promise<boolean> {
    if (!organisationData.name || organisationData.name.length == 0)
      throw new ValidationException(
        'Organisation creation missing required name',
        LogContext.COMMUNITY
      );
    const organisations = await this.getOrganisations();

    const organisation = organisations.find(
      o => o.name === organisationData.name
    );
    // First check if the organisation already exists on not...
    if (organisation)
      throw new ValidationException(
        `Organisation with the provided name already exists: ${organisationData.name}`,
        LogContext.COMMUNITY
      );

    return true;
  }

  async updateOrganisation(
    orgID: number,
    organisationData: OrganisationInput
  ): Promise<IOrganisation> {
    const existingOrganisation = await this.getOrganisationOrFail(orgID);

    // Merge in the data
    if (organisationData.name) {
      existingOrganisation.name = organisationData.name;
      await this.organisationRepository.save(existingOrganisation);
    }

    // Check the tagsets
    if (organisationData.profileData && existingOrganisation.profile) {
      await this.profileService.updateProfile(
        existingOrganisation.profile.id,
        organisationData.profileData
      );
    }

    // Reload the organisation for returning
    return await this.getOrganisationOrFail(orgID);
  }

  async removeOrganisation(orgID: number): Promise<IOrganisation> {
    const organisation = await this.getOrganisationOrFail(orgID);
    const { id } = organisation;

    if (organisation.profile) {
      await this.profileService.removeProfile(organisation.profile.id);
    }

    if (organisation.groups) {
      for (const group of organisation.groups) {
        await this.userGroupService.removeUserGroup(group.id);
      }
    }

    const result = await this.organisationRepository.remove(
      organisation as Organisation
    );
    return {
      ...result,
      id,
    };
  }

  async getOrganisationOrFail(
    organisationID: number,
    options?: FindOneOptions<Organisation>
  ): Promise<IOrganisation> {
    //const t1 = performance.now()
    const organisation = await Organisation.findOne(
      { id: organisationID },
      options
    );
    if (!organisation)
      throw new EntityNotFoundException(
        `Unable to find organisation with ID: ${organisationID}`,
        LogContext.CHALLENGES
      );
    return organisation;
  }

  async getOrganisations(): Promise<Organisation[]> {
    const organisations = await this.organisationRepository.find();
    return organisations || [];
  }

  async createGroup(orgID: number, groupName: string): Promise<IUserGroup> {
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

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagsetService } from '../tagset/tagset.service';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { OrganisationInput } from './organisation.dto';
import { Organisation } from './organisation.entity';
import { IOrganisation } from './organisation.interface';

@Injectable()
export class OrganisationService {
  constructor(
    private userGroupService: UserGroupService,
    private tagsetService: TagsetService,
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>
  ) {}

  async initialiseMembers(organisation: IOrganisation): Promise<IOrganisation> {
    if (!organisation.restrictedGroupNames) {
      organisation.restrictedGroupNames = [RestrictedGroupNames.Members];
    }

    if (!organisation.groups) {
      organisation.groups = [];
    }
    // Check that the mandatory groups for a challenge are created
    await this.userGroupService.addMandatoryGroups(
      organisation,
      organisation.restrictedGroupNames
    );

    return organisation;
  }

  async createGroup(orgID: number, groupName: string): Promise<IUserGroup> {
    // First find the Challenge
    console.log(`Adding userGroup (${groupName}) to organisation (${orgID})`);
    // Try to find the challenge
    const organisation = await Organisation.findOne(orgID);
    if (!organisation) {
      const msg = `Unable to find organisation with ID: ${orgID}`;
      console.log(msg);
      throw new Error(msg);
    }
    const group = await this.userGroupService.addGroupWithName(
      organisation,
      groupName
    );
    await organisation.save();

    return group;
  }

  async createOrganisation(
    organisationData: OrganisationInput
  ): Promise<IOrganisation> {
    // Create and initialise a new organisation using the supplied data
    const organisation = Organisation.create(organisationData);
    this.initialiseMembers(organisation);
    return organisation;
  }

  async updateOrganisation(
    orgID: number,
    organisationData: OrganisationInput
  ): Promise<IOrganisation> {
    const existingOrganisation = await Organisation.findOne(orgID);
    if (!existingOrganisation)
      throw new Error(`Oganisation with given ID (${orgID}) not found!`);

    // Merge in the data
    if (organisationData.name) {
      existingOrganisation.name = organisationData.name;
    }

    if (organisationData.tags && organisationData.tags.tags)
      this.tagsetService.replaceTags(
        existingOrganisation.tagset.id,
        organisationData.tags.tags
      );

    // To do - merge in the rest of the organisation update
    await this.organisationRepository.save(existingOrganisation);

    return existingOrganisation;
  }
}

import { Injectable } from '@nestjs/common';
import {
  RestrictedGroupNames,
  UserGroup,
} from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { Organisation } from './organisation.entity';
import { IOrganisation } from './organisation.interface';

@Injectable()
export class OrganisationService {
  constructor(private userGroupService: UserGroupService) {}

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
}

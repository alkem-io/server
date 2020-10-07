import { Injectable } from '@nestjs/common';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { UserGroupService } from '../user-group/user-group.service';
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
      organisation.restrictedGroupNames,
    );

    return organisation;
  }
}

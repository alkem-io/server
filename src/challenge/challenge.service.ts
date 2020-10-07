import { Injectable } from '@nestjs/common';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { UserGroupService } from '../user-group/user-group.service';
import { IChallenge } from './challenge.interface';

@Injectable()
export class ChallengeService {
  constructor(private userGroupService: UserGroupService) {}

  initialiseMembers(challenge: IChallenge): IChallenge {
    if (!challenge.restrictedGroupNames) {
      challenge.restrictedGroupNames = [RestrictedGroupNames.Members];
    }

    if (!challenge.groups) {
      challenge.groups = [];
    }
    // Check that the mandatory groups for a challenge are created
    this.userGroupService.addMandatoryGroups(
      challenge,
      challenge.restrictedGroupNames,
    );

    if (!challenge.tags) {
      challenge.tags = [];
    }

    if (!challenge.projects) {
      challenge.projects = [];
    }

    return challenge;
  }
}

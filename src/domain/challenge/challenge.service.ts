import { Injectable } from '@nestjs/common';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { Challenge } from './challenge.entity';
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
      challenge.restrictedGroupNames
    );

    if (!challenge.projects) {
      challenge.projects = [];
    }

    return challenge;
  }

  async createGroup(
    challengeID: number,
    groupName: string
  ): Promise<IUserGroup> {
    // First find the Challenge
    console.log(
      `Adding userGroup (${groupName}) to challenge (${challengeID})`
    );
    // Try to find the challenge
    const challenge = await Challenge.findOne(challengeID);
    if (!challenge) {
      const msg = `Unable to find challenge with ID: ${challengeID}`;
      console.log(msg);
      throw new Error(msg);
    }
    const group = await this.userGroupService.addGroupWithName(
      challenge,
      groupName
    );
    await challenge.save();

    return group;
  }
}

import { Injectable } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { TagsetService } from '../tagset/tagset.service';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { ChallengeInput } from './challenge.dto';
import { Challenge } from './challenge.entity';
import { IChallenge } from './challenge.interface';

@Injectable()
export class ChallengeService {
  constructor(
    private userGroupService: UserGroupService,
    private contextService: ContextService,
    private tagsetService: TagsetService
  ) {}

  initialiseMembers(challenge: IChallenge): IChallenge {
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

    // Initialise contained objects
    this.tagsetService.initialiseMembers(challenge.tagset);
    this.contextService.initialiseMembers(challenge.context);

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
    // Check a valid ID was passed
    if (!challengeID)
      throw new Error(`Invalid challenge id passed in: ${challengeID}`);
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

  async getChallengeByID(challengeID: number): Promise<IChallenge> {
    //const t1 = performance.now()
    const challenge = await Challenge.findOne({ where: [{ id: challengeID }] });
    if (!challenge)
      throw new Error(`Unable to find challenge with ID: ${challengeID}`);
    return challenge;
  }

  async createChallenge(challengeData: ChallengeInput): Promise<IChallenge> {
    // reate and initialise a new challenge using the first returned array item
    const challenge = Challenge.create(challengeData);
    this.initialiseMembers(challenge);
    return challenge;
  }
}

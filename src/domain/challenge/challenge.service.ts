import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextService } from '../context/context.service';
import { TagsetService } from '../tagset/tagset.service';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { UserService } from '../user/user.service';
import { ChallengeInput } from './challenge.dto';
import { Challenge } from './challenge.entity';
import { IChallenge } from './challenge.interface';

@Injectable()
export class ChallengeService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private contextService: ContextService,
    private tagsetService: TagsetService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>
  ) {}

  async initialiseMembers(challenge: IChallenge): Promise<IChallenge> {
    if (!challenge.groups) {
      challenge.groups = [];
    }
    // Check that the mandatory groups for a challenge are created
    await this.userGroupService.addMandatoryGroups(
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
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeID },
    });
    if (!challenge)
      throw new Error(`Unable to find challenge with ID: ${challengeID}`);
    return challenge;
  }

  async createChallenge(challengeData: ChallengeInput): Promise<IChallenge> {
    // reate and initialise a new challenge using the first returned array item
    const challenge = Challenge.create(challengeData);
    await this.initialiseMembers(challenge);
    await this.challengeRepository.save(challenge);

    return challenge;
  }

  async updateChallenge(
    challengeID: number,
    challengeData: ChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.getChallengeByID(challengeID);

    // Copy over the received data
    if (challengeData.name) {
      challenge.name = challengeData.name;
    }

    if (challengeData.lifecyclePhase) {
      challenge.lifecyclePhase = challengeData.lifecyclePhase;
    }

    if (challengeData.context)
      this.contextService.update(challenge, challengeData.context);

    if (challengeData.tagset && challengeData.tagset.tags)
      this.tagsetService.replaceTags(
        challenge.tagset.id,
        challengeData.tagset.tags
      );

    await this.challengeRepository.save(challenge);

    return challenge;
  }

  async addMember(userID: number, challengeID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByID(userID);
    if (!user) {
      const msg = `Unable to find exactly one user with ID: ${userID}`;
      console.log(msg);
      throw new Error(msg);
    }

    const challenge = (await this.getChallengeByID(challengeID)) as Challenge;
    if (!challenge) {
      const msg = `Unable to find challenge with ID: ${challengeID}`;
      console.log(msg);
      throw new Error(msg);
    }

    // Get the members group
    const membersGroup = await this.userGroupService.getGroupByName(
      challenge,
      RestrictedGroupNames.Members
    );
    await this.userGroupService.addUserToGroup(user, membersGroup);

    return membersGroup;
  }

  async getChallenges(ecoverseId: number): Promise<Challenge[]> {
    const challenges = await this.challengeRepository.find({
      where: { ecoverse: { id: ecoverseId } },
    });
    return challenges || [];
  }
}

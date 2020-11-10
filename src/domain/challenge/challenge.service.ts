import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { LogContexts } from '../../utils/logging/logging.contexts';
import { Context } from '../context/context.entity';
import { ContextService } from '../context/context.service';
import { OpportunityInput } from '../opportunity/opportunity.dto';
import { Opportunity } from '../opportunity/opportunity.entity';
import { IOpportunity } from '../opportunity/opportunity.interface';
import { OpportunityService } from '../opportunity/opportunity.service';
import { OrganisationService } from '../organisation/organisation.service';
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
    private opportunityService: OpportunityService,
    private organisationService: OrganisationService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
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

    if (!challenge.opportunities) {
      challenge.opportunities = [];
    }
    if (!challenge.tagset) {
      challenge.tagset = this.tagsetService.createTagset({});
    }

    if (!challenge.context) {
      challenge.context = new Context();
    }
    // Initialise contained objects
    this.contextService.initialiseMembers(challenge.context);

    return challenge;
  }

  async createGroup(
    challengeID: number,
    groupName: string
  ): Promise<IUserGroup> {
    // First find the Challenge
    this.logger.verbose(
      `Adding userGroup (${groupName}) to challenge (${challengeID})`,
      LogContexts.CHALLENGES
    );
    // Check a valid ID was passed
    if (!challengeID)
      throw new Error(`Invalid challenge id passed in: ${challengeID}`);
    // Try to find the challenge
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeID },
      relations: ['groups'],
    });
    if (!challenge) {
      throw new Error(
        `Unable to create the group: no challenge with ID: ${challengeID}`
      );
    }
    const group = await this.userGroupService.addGroupWithName(
      challenge,
      groupName
    );
    await this.challengeRepository.save(challenge);

    return group;
  }

  // Loads the group into the challenge entity if not already present
  async loadGroups(challenge: Challenge): Promise<IUserGroup[]> {
    if (challenge.groups && challenge.groups.length > 0) {
      // challenge already has groups loaded
      return challenge.groups;
    }
    // challenge is not populated wih
    const groups = await this.userGroupService.getGroups(challenge);
    if (!groups) throw new Error(`No groups on challenge: ${challenge.name}`);
    return groups;
  }

  // Loads the challenges into the challenge entity if not already present
  async loadOpportunities(challenge: Challenge): Promise<IOpportunity[]> {
    if (challenge.opportunities && challenge.opportunities.length > 0) {
      // challenge already has groups loaded
      return challenge.opportunities;
    }

    const challengeWithOpportunities = await this.challengeRepository.findOne({
      where: { id: challenge.id },
      relations: ['opportunities'],
    });
    if (
      !challengeWithOpportunities ||
      !challengeWithOpportunities.opportunities
    )
      throw new Error(
        `Unable to load opportunities for challenge ${challenge.id} `
      );

    return challengeWithOpportunities.opportunities;
  }

  async createOpportunity(
    challengeID: number,
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    // First find the Challenge
    this.logger.verbose(
      `Adding opportunity to challenge (${challengeID})`,
      LogContexts.CHALLENGES
    );
    // Try to find the challenge
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeID },
      relations: ['opportunities'],
    });
    if (!challenge) {
      const msg = `Unable to find challenge with ID: ${challengeID}`;
      this.logger.verbose(msg, LogContexts.CHALLENGES);
      throw new Error(msg);
    }

    const opportunities = challenge.opportunities;
    if (!opportunities)
      throw new Error(
        `Challenge without initialised Opportunities encountered ${challengeID}`
      );
    const existingOpportunity = opportunities.find(
      opportunity => opportunity.textID === opportunityData.textID
    );
    // check if the opportunity already exists with the textID
    if (existingOpportunity)
      throw new Error(
        `Trying to create an opportunity but one with the given textID already exists: ${opportunityData.textID}`
      );

    const opportunity = await this.opportunityService.createOpportunity(
      opportunityData
    );
    opportunities.push(opportunity as Opportunity);
    await this.challengeRepository.save(challenge);

    return opportunity;
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
    // Verify that required textID field is present and that it has the right format
    const textID = challengeData.textID;
    if (!textID) throw new Error('Required field textID not specified');
    const expression = /^[a-zA-Z0-9.\-_]+$/;
    const textIdCheck = expression.test(String(textID).toLowerCase());
    if (!textIdCheck)
      throw new Error(
        `Required field textID provided not in the correct format: ${textID}`
      );

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
    if (!challenge) {
      throw new Error(`Unable to locate challenge: ${challengeID}`);
    }
    const newName = challengeData.name;
    if (newName) {
      if (!(newName === challenge.name)) {
        // challenge is being renamed...
        const otherChallenge = await this.challengeRepository.findOne({
          where: { name: newName },
        });
        // already have a challenge with the given name, not allowed
        if (otherChallenge)
          throw new Error(
            `Unable to update challenge: already have a challenge with the provided name (${challengeData.name})`
          );
        // Ok to rename
        challenge.name = newName;
      }
    }

    if (challengeData.state) {
      challenge.state = challengeData.state;
    }

    if (challengeData.context)
      await this.contextService.update(challenge, challengeData.context);

    if (challengeData.tags)
      this.tagsetService.replaceTagsOnEntity(
        challenge as Challenge,
        challengeData.tags
      );

    await this.challengeRepository.save(challenge);

    return challenge;
  }

  async addMember(userID: number, challengeID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByID(userID);
    if (!user) {
      const msg = `Unable to find exactly one user with ID: ${userID}`;
      this.logger.warn(msg, LogContexts.CHALLENGES);
      throw new Error(msg);
    }

    const challenge = (await this.getChallengeByID(challengeID)) as Challenge;
    if (!challenge) {
      const msg = `Unable to find challenge with ID: ${challengeID}`;
      this.logger.warn(msg, LogContexts.CHALLENGES);
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

  async addChallengeLead(
    challengeID: number,
    organisationID: number
  ): Promise<boolean> {
    const organisation = await this.organisationService.getOrganisationByID(
      organisationID
    );
    if (!organisation)
      throw new Error(`No organisation with id ${organisationID} was found!`);

    const challenge = await this.getChallengeByID(challengeID);
    if (!challenge)
      throw new Error(`No challenge with id ${challengeID} was found!`);

    // Check the org is not already added
    if (!challenge.leadOrganisations)
      throw new Error(`Challenge not fully initialised: ${challengeID}`);
    const existingOrg = challenge.leadOrganisations.find(
      existingOrg => existingOrg.id === organisationID
    );
    if (existingOrg)
      throw new Error(
        `Challenge ${challengeID} already has an organisation with the provided organisation ID: ${organisationID}`
      );
    // ok to add the org
    challenge.leadOrganisations.push(organisation);
    await this.challengeRepository.save(challenge);
    return true;
  }
}

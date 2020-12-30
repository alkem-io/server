import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  GroupNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '../../utils/error-handling/exceptions';
import { LogContext } from '../../utils/logging/logging.contexts';
import { Context } from '../context/context.entity';
import { ContextService } from '../context/context.service';
import { OpportunityInput } from '../opportunity/opportunity.dto';
import { Opportunity } from '../opportunity/opportunity.entity';
import { IOpportunity } from '../opportunity/opportunity.interface';
import { OpportunityService } from '../opportunity/opportunity.service';
import { IOrganisation } from '../organisation/organisation.interface';
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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
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

    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to challenge (${challengeID})`,
      LogContext.CHALLENGES
    );
    // Check a valid ID was passed
    if (!challengeID)
      throw new ValidationException(
        `Invalid challenge id passed in: ${challengeID}`,
        LogContext.COMMUNITY
      );
    // Try to find the challenge
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeID },
      relations: ['groups'],
    });
    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to create the group: no challenge with ID: ${challengeID}`,
        LogContext.COMMUNITY
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
    if (!groups)
      throw new GroupNotInitializedException(
        `No groups on challenge: ${challenge.name}`,
        LogContext.COMMUNITY
      );
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
      throw new RelationshipNotFoundException(
        `Unable to load opportunities for challenge ${challenge.id} `,
        LogContext.CHALLENGES
      );

    return challengeWithOpportunities.opportunities;
  }

  async createOpportunity(
    challengeID: number,
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    // First find the Challenge

    this.logger.verbose?.(
      `Adding opportunity to challenge (${challengeID})`,
      LogContext.CHALLENGES
    );
    // Try to find the challenge
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeID },
      relations: ['opportunities'],
    });
    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    }

    await this.validateOpportunity(challenge, opportunityData);

    const opportunity = await this.opportunityService.createOpportunity(
      opportunityData
    );

    challenge.opportunities?.push(opportunity as Opportunity);
    await this.challengeRepository.save(challenge);

    return opportunity;
  }

  async validateOpportunity(
    challenge: IChallenge,
    opportunityData: OpportunityInput
  ) {
    const opportunities = challenge.opportunities;
    if (!opportunities)
      throw new EntityNotInitializedException(
        `Challenge without initialised Opportunities encountered ${challenge.id}`,
        LogContext.CHALLENGES
      );

    let opportunity = opportunities.find(
      opportunity => opportunity.name === opportunityData.name
    );

    if (opportunity)
      throw new ValidationException(
        `Opportunity with name: ${opportunityData.name} already exists!`,
        LogContext.OPPORTUNITY
      );

    opportunity = opportunities.find(
      opportunity => opportunity.textID === opportunityData.textID
    );
    // check if the opportunity already exists with the textID
    if (opportunity)
      throw new ValidationException(
        `Trying to create an opportunity but one with the given textID already exists: ${opportunityData.textID}`,
        LogContext.CHALLENGES
      );
  }

  async getChallengeByID(challengeID: number): Promise<IChallenge> {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeID },
    });
    if (!challenge)
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    return challenge;
  }

  async createChallenge(challengeData: ChallengeInput): Promise<IChallenge> {
    await this.validateChallenge(challengeData);

    const textID = challengeData.textID;
    // Ensure lower case
    challengeData.textID = textID?.toLowerCase();
    // reate and initialise a new challenge using the first returned array item
    const challenge = Challenge.create(challengeData);
    await this.initialiseMembers(challenge);
    await this.challengeRepository.save(challenge);

    return challenge;
  }

  async validateChallenge(challengeData: ChallengeInput) {
    const textID = challengeData.textID;
    if (!textID || textID.length < 3)
      throw new ValidationException(
        `Required field textID not specified or long enough: ${textID}`,
        LogContext.CHALLENGES
      );
    const expression = /^[a-zA-Z0-9.\-_]+$/;
    const textIdCheck = expression.test(textID);
    if (!textIdCheck)
      throw new ValidationException(
        `Required field textID provided not in the correct format: ${textID}`,
        LogContext.CHALLENGES
      );

    const challenge = await this.challengeRepository.findOne({
      where: { textID: challengeData.textID },
    });
    if (challenge)
      throw new ValidationException(
        `Challenge with the textID: ${challengeData.textID} already exists!`,
        LogContext.CHALLENGES
      );
  }

  async updateChallenge(
    challengeID: number,
    challengeData: ChallengeInput
  ): Promise<IChallenge> {
    const challenge = await this.getChallengeByID(challengeID);
    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to locate challenge: ${challengeID}`,
        LogContext.CHALLENGES
      );
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
          throw new ValidationException(
            `Unable to update challenge: already have a challenge with the provided name (${challengeData.name})`,
            LogContext.CHALLENGES
          );
        // Ok to rename
        challenge.name = newName;
      }
    }

    if (challengeData.state) {
      challenge.state = challengeData.state;
    }

    if (challengeData.context) {
      if (!challenge.context)
        throw new EntityNotInitializedException(
          `Challenge not initialised: ${challengeID}`,
          LogContext.CHALLENGES
        );
      await this.contextService.update(
        challenge.context,
        challengeData.context
      );
    }
    if (challengeData.tags)
      this.tagsetService.replaceTagsOnEntity(
        challenge as Challenge,
        challengeData.tags
      );

    await this.challengeRepository.save(challenge);

    return challenge;
  }

  async removeChallenge(challengeID: number): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeID },
      relations: ['opportunities', 'groups'],
    });
    if (!challenge)
      throw new EntityNotFoundException(
        `Not able to locate challenge with the specified ID: ${challengeID}`,
        LogContext.CHALLENGES
      );

    // Do not remove a challenge that has opporutnities, require these to be individually first removed
    if (challenge.opportunities && challenge.opportunities.length > 0)
      throw new ValidationException(
        `Unable to remove challenge (${challengeID}) as it contains ${challenge.opportunities.length} opportunities`,
        LogContext.CHALLENGES
      );

    // Remove all groups
    if (challenge.groups) {
      for (const group of challenge.groups) {
        await this.userGroupService.removeUserGroup(group.id);
      }
    }

    await this.challengeRepository.remove(challenge);
    return true;
  }

  async addUserToOpportunity(
    userID: number,
    opportunityID: number
  ): Promise<IUserGroup> {
    // Get the ID of the challenge containing the provided opportunity ID
    const challengeID = await this.opportunityService.getChallengeID(
      opportunityID
    );
    const isMember = await this.isUserMember(userID, challengeID);
    if (!isMember)
      throw new ValidationException(
        `User (${userID}) is not a member of parent challenge: ${challengeID}`,
        LogContext.CHALLENGES
      );

    // Get the members group
    return await this.opportunityService.addMember(userID, opportunityID);
  }

  async isUserMember(userID: number, challengeID: number): Promise<boolean> {
    const challenge = await this.getChallengeByID(challengeID);
    const membersGroup = await this.getMembersGroup(challenge);
    const members = membersGroup.members;
    if (!members)
      throw new GroupNotInitializedException(
        `Members group not initialised in challenge: ${challengeID}`,
        LogContext.CHALLENGES
      );
    const user = members.find(user => user.id == userID);
    if (user) return true;
    return false;
  }

  async addMember(userID: number, challengeID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByID(userID);
    if (!user) {
      throw new ValidationException(
        `Unable to find exactly one user with ID: ${userID}`,
        LogContext.CHALLENGES
      );
    }

    const challenge = (await this.getChallengeByID(challengeID)) as Challenge;
    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    }

    // Get the members group
    const membersGroup = await this.userGroupService.getGroupByName(
      challenge,
      RestrictedGroupNames.Members
    );
    await this.userGroupService.addUserToGroup(user, membersGroup);

    return membersGroup;
  }

  async getMembersGroup(challenge: IChallenge): Promise<IUserGroup> {
    const group = await this.userGroupService.getGroupByName(
      challenge,
      RestrictedGroupNames.Members
    );
    if (!group)
      throw new RelationshipNotFoundException(
        `Unable to locate members group on challenge: ${challenge.name}`,
        LogContext.CHALLENGES
      );
    return group;
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
    let challenge, organisation;
    // eslint-disable-next-line prefer-const
    [challenge, organisation] = await this.getChallengeAndOrganisation(
      challengeID,
      organisationID
    );

    const existingOrg = challenge.leadOrganisations?.find(
      existingOrg => existingOrg.id === organisationID
    );
    if (existingOrg)
      throw new ValidationException(
        `Challenge ${challengeID} already has an organisation with the provided organisation ID: ${organisationID}`,
        LogContext.CHALLENGES
      );
    // ok to add the org
    challenge.leadOrganisations?.push(organisation);
    await this.challengeRepository.save(challenge);
    return true;
  }
  async removeChallengeLead(
    challengeID: number,
    organisationID: number
  ): Promise<boolean> {
    let challenge;
    // eslint-disable-next-line prefer-const
    [challenge, {}] = await this.getChallengeAndOrganisation(
      challengeID,
      organisationID
    );

    const existingOrg = challenge.leadOrganisations?.find(
      existingOrg => existingOrg.id === organisationID
    );
    if (!existingOrg)
      throw new EntityNotInitializedException(
        `Challenge ${challengeID} does not have a lead with the provided organisation ID: ${organisationID}`,
        LogContext.CHALLENGES
      );
    // ok to add the org
    const updatedLeads = [];
    for (const existingOrg of challenge.leadOrganisations as IOrganisation[]) {
      if (existingOrg.id != organisationID) {
        updatedLeads.push(existingOrg);
      }
    }
    challenge.leadOrganisations = updatedLeads;
    await this.challengeRepository.save(challenge);
    return true;
  }

  async getChallengeAndOrganisation(
    challengeID: number,
    organisationID: number
  ): Promise<[IChallenge, IOrganisation]> {
    const organisation = await this.organisationService.getOrganisationByID(
      organisationID
    );
    if (!organisation)
      throw new EntityNotFoundException(
        `No organisation with id ${organisationID} was found!`,
        LogContext.CHALLENGES
      );

    const challenge = await this.getChallengeByID(challengeID);

    if (!challenge)
      throw new EntityNotFoundException(
        `No challenge with id ${challengeID} was found!`,
        LogContext.CHALLENGES
      );

    // Check the org is not already added
    if (!challenge.leadOrganisations)
      throw new EntityNotInitializedException(
        `Challenge not fully initialised: ${challengeID}`,
        LogContext.CHALLENGES
      );

    return [challenge, organisation];
  }
}

import { Arg, Mutation, Resolver } from 'type-graphql';
import { Challenge, Context, Ecoverse, Organisation, Tagset, User, UserGroup } from '../../models';
import { ChallengeInput, ContextInput, OrganisationInput, UserGroupInput, UserInput } from '../inputs';
import { EcoverseService, OrganisationService, ProfileService, UserService } from '../../services';
import Container, { Inject } from 'typedi';
import {  } from '../../services/OrganisationService';
import { ApolloError } from 'apollo-server-express';

@Resolver()
export class CreateMutations {

  private _ecoverse: EcoverseService;
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Inject('EcoverseService') ecoverse: EcoverseService
  ) {
    this._ecoverse = Container.get<EcoverseService>('EcoverseService');
  }


  @Mutation(() => Context)
  async createContext(@Arg('contextData') contextData: ContextInput): Promise<Context> {
    const context = Context.create(contextData);
    await context.save();

    return context;
  }

  @Mutation(() => User)
  async createUser(@Arg('userData') userData: UserInput): Promise<User> {

    // Check if a user with this email already exists
    const newUserEmail = userData.email;
    const userService = Container.get<UserService>('UserService');
    const existingUser = await userService.getUserByEmail(newUserEmail);

    if (existingUser) throw new ApolloError(`Already have a user with the provided email address: ${newUserEmail}`);

    // Ok to create a new user + save
    const user = User.create(userData);
    await user.save();

    return user;
  }

  @Mutation(() => UserGroup)
  async createUserGroup(@Arg('userGroupData') userGroupData: UserGroupInput): Promise<UserGroup> {
    const userGroup = UserGroup.create(userGroupData);
    await userGroup.save();

    return userGroup;
  }

  @Mutation(() => UserGroup, { description: 'Creates a new user group at the ecoverse level' })
  async createGroupOnEcoverse(
    @Arg('groupName') groupName: string): Promise<UserGroup> {

    console.log(`Adding userGroup (${groupName}) to ecoverse`);
    const ecoverse = await this._ecoverse.getEcoverse() as Ecoverse;
    const group = UserGroup.addGroupWithName(ecoverse, groupName);
    await ecoverse.save();

    return group;
  }

  @Mutation(() => Challenge, { description: 'Creates a new user group for the challenge with the given id' })
  async createGroupOnChallenge(
    @Arg('challengeID') challengeID: number,
    @Arg('groupName') groupName: string
  ): Promise<Challenge> {
    // First find the Challenge
    console.log(`Adding userGroup (${groupName}) to challenge (${challengeID})`);
    // Try to find the challenge
    const challenge = await Challenge.findOne(challengeID);
    if (!challenge) {
      const msg = `Unable to find challenge with ID: ${challengeID}`;
      console.log(msg);
      throw new Error(msg);
    }
    UserGroup.addGroupWithName(challenge, groupName);
    await challenge.save();

    return challenge;
  }

  @Mutation(() => Organisation, { description: 'Creates a new user group for the organisation with the given id' })
  async createGroupOnOrganisation(
    @Arg('organisationID') organisationID: number,
    @Arg('groupName') groupName: string
  ): Promise<Organisation> {
    const organisationService = Container.get<OrganisationService>('OrganisationService');
    const organisation = await organisationService.getOrganisation(organisationID);

    if (!organisation) throw new ApolloError(`Organisation with id(${organisationID}) not found!`);

    UserGroup.addGroupWithName(organisation, groupName);
    await organisation.save();

    return organisation;
  }

  @Mutation(() => Tagset, { description: 'Creates a new tagset with the specified name for the profile with given id' })
  async createTagsetOnProfile(
    @Arg('profileID') profileID: number,
    @Arg('tagsetName') tagsetName: string
  ): Promise<Tagset> {
    const profileService = Container.get<ProfileService>('ProfileService');
    const profile = await profileService.getProfile(profileID);

    if (!profile) throw new ApolloError(`Profile with id(${profileID}) not found!`);

    const tagset = Tagset.addTagsetWithName(profile, tagsetName);
    await profile.save();

    return tagset;
  }

  @Mutation(() => Organisation)
  async createOrganisation(@Arg('organisationData') organisationData: OrganisationInput): Promise<Organisation> {
    // Check if an org with the given name already exists
    console.log(`Adding organisation (${organisationData.name}) to ecoverse`);
    const organisations = await Organisation.find();
    for (const organisation of organisations) {
      if (organisation.name === organisationData.name) {
        // Org already exists, just return. Option:merge?
        return organisation;
      }
    }

    // New organisation
    const organisation = Organisation.create(organisationData);
    await organisation.save();

    return organisation;
  }

  @Mutation(() => Challenge)
  async createChallenge(
    @Arg('challengeData') challengeData: ChallengeInput): Promise<Challenge> {

    const ecoverse = await this._ecoverse.getEcoverse() as Ecoverse;
    if (!ecoverse.challenges) {
      throw new Error('Challenges must be defined');
    }
    // First check if the challenge already exists on not...
    for (const challenge of ecoverse.challenges) {
      if (challenge.name === challengeData.name) {
        // Challenge already exists, just return. Option:merge?
        return challenge;
      }
    }

    // No existing challenge found, create and initialise a new one!
    const challenge = Challenge.create(challengeData);
    challenge.initialiseMembers();
    ecoverse.challenges.push(challenge);
    await ecoverse.save();

    return challenge;
  }
}

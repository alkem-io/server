import { Arg, Mutation, Resolver } from 'type-graphql';
import { Challenge, Context, Ecoverse, Organisation, Tag, User, UserGroup } from '../../models';
import { ChallengeInput, ContextInput, OrganisationInput, TagInput, UserGroupInput, UserInput } from '../inputs';
import { EcoverseService } from '../../services/EcoverseService';
import Container, { Inject } from 'typedi';

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

  @Mutation(() => UserGroup)
  async createGroupOnEcoverse(
    @Arg('groupName') groupName: string): Promise<UserGroup> {

    console.log(`Adding userGroup (${groupName}) to ecoverse`);
    const ecoverse = await this._ecoverse.getEcoverse() as Ecoverse;
    const group = UserGroup.addGroupWithName(ecoverse, groupName);
    await ecoverse.save();

    return group;
  }

  @Mutation(() => Challenge)
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

  @Mutation(() => Tag)
  async createTag(@Arg('tagData') tagData: TagInput): Promise<Tag> {
    const tag = Tag.create(tagData);
    await tag.save();

    return tag;
  }
}

import { Arg, Mutation, Resolver } from 'type-graphql';
import { ChallengeInput, ContextInput, OrganisationInput, TagInput, UserGroupInput, UserInput } from '../inputs';
import { Challenge, Context, Ecoverse, Organisation, Tag, User, UserGroup } from '../../models'
import { group } from 'console';

@Resolver()
export class CreateMutations {


  @Mutation(() => Context)
  async createContext(
    @Arg('contextData') contextData: ContextInput): Promise<Context> {
    const context = Context.create(contextData);
    await context.save();

    return context;
  }

  @Mutation(() => User)
  async createUser(
    @Arg('userData') userData: UserInput): Promise<User> {
    const user = User.create(userData);
    await user.save();

    return user;
  }

  @Mutation(() => UserGroup)
  async createUserGroup(
    @Arg('userGroupData') userGroupData: UserGroupInput): Promise<UserGroup> {
    const userGroup = UserGroup.create(userGroupData);
    await userGroup.save();

    return userGroup;
  }

  @Mutation(() => UserGroup)
  async createGroup2(
    @Arg('groupName') groupName: string): Promise<UserGroup> {

    // First get the Ecoverse singleton
    console.log(`Adding userGroup (${groupName}) to ecoverse`);
    const ecoverse = await Ecoverse.getInstance();
    const group = UserGroup.addGroupWithName(ecoverse, groupName);
    await ecoverse.save();

    return group;
  }

  @Mutation(() => Challenge)
  async createGroupOnChallenge(
    @Arg('challengeID') challengeID: number,
    @Arg('groupName') groupName: string): Promise<Challenge> {

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
  async createOrganisation(
    @Arg('organisationData') organisationData: OrganisationInput): Promise<Organisation> {
    const organisation = Organisation.create(organisationData);
    await organisation.save();

    return organisation;
  }

  @Mutation(() => Challenge)
  async createChallenge(
    @Arg('challengeData') challengeData: ChallengeInput): Promise<Challenge> {
    const challenge = Challenge.create(challengeData);
    await challenge.save();

    return challenge;
  }

  @Mutation(() => Tag)
  async createTag(
    @Arg('tagData') tagData: TagInput): Promise<Tag> {
    const tag = Tag.create(tagData);
    await tag.save();

    return tag;
  }

}
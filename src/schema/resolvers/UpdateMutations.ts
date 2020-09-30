import { Arg, Mutation, Resolver } from 'type-graphql';
import { Challenge, Context, Ecoverse, Organisation, User, UserGroup } from '../../models';
import {
  UpdateEcoverseInput,
  UpdateRootChallengeInput,
  UpdateRootContextInput,
  UpdateRootOrganisationInput,
  UpdateRootUserGroupInput,
  UpdateRootUserInput,
} from '../inputs';

@Resolver()
export class UpdateMutations {
  @Mutation(() => UserGroup)
  async addUserToGroup(@Arg('userID') userID: number, @Arg('groupID') groupID: number): Promise<UserGroup> {
    console.log(`Adding user (${userID}) to group (${groupID})`);
    // Try to find the user + groups
    const user = await User.findOne(userID);
    if (!user) {
      const msg = `Unable to find user with ID: ${userID}`;
      console.log(msg);
      throw new Error(msg);
    }

    const group = await UserGroup.findOne(groupID);
    if (!group) {
      const msg = `Unable to find gropu with ID: ${groupID}`;
      console.log(msg);
      throw new Error(msg);
    }

    // Have both user + group so do the add
    group.addUserToGroup(user);
    await group.save();

    return group;
  }

  @Mutation(() => Ecoverse)
  async updateEcoverse(@Arg('ecoverseData') ecoverseData: UpdateEcoverseInput): Promise<Ecoverse> {
    const ctVerse = await Ecoverse.getInstance();

    // Copy over the received data
    if (ecoverseData.name) {
      ctVerse.name = ecoverseData.name;
    }
    ctVerse.context.update(JSON.stringify(ecoverseData.context));

    await ctVerse.save();

    return ctVerse;
  }

  @Mutation(() => User)
  async updateUser(@Arg('userData') userData: UpdateRootUserInput): Promise<User> {
    if (User.findOne({ where: { userData } })) {
      const user = User.create(userData);
      await user.save();
      return user;
    }
    throw new Error('Entitiy not found!');
  }

  @Mutation(() => UserGroup)
  async updateUserGroup(@Arg('userGroupData') userGroupData: UpdateRootUserGroupInput): Promise<UserGroup> {
    if (UserGroup.findOne({ where: { userGroupData } })) {
      const userGroup = UserGroup.create(userGroupData);
      await userGroup.save();

      return userGroup;
    }

    throw new Error('Entitiy not found!');
  }

  @Mutation(() => Organisation)
  async updateOrganisation(
    @Arg('organisationData') organisationData: UpdateRootOrganisationInput
  ): Promise<Organisation> {
    try {
      const existingOrganisation = await Organisation.findOne(organisationData.id);
      if (existingOrganisation) {
        // Merge in the data
        if (organisationData.name) {
          existingOrganisation.name = organisationData.name;
        }

        // To do - merge in the rest of the organisation update
        existingOrganisation.save();

        // To do: ensure all references are updated
        //const ctVerse = await Ecoverse.getInstance();
        return existingOrganisation;
      }
    } catch (e) {
      console.log(e);
    }

    throw new Error('Entitiy not found!');
  }

  @Mutation(() => Challenge)
  async updateChallenge(@Arg('challengeData') challengeData: UpdateRootChallengeInput): Promise<Challenge> {
    try {
      const result = await Challenge.update(challengeData.id, challengeData);
      if (result.affected) {
        const existingChallenge = await Challenge.findOne(challengeData.id);
        if (existingChallenge) {
          return existingChallenge;
        }
        // No existing challenge found, create + initialise a new one
        const newChallenge = new Challenge('');
        newChallenge.initialiseMembers();
        return newChallenge;
      }
    } catch (e) {
      console.log(e);
    }

    throw new Error('Entitiy not found!');
  }

  @Mutation(() => Context)
  async updateContext(@Arg('contextData') contextData: UpdateRootContextInput): Promise<Context> {
    if (User.findOne({ where: { contextData } })) {
      const context = Context.create(contextData);
      await context.save();

      return context;
    }

    throw new Error('Entitiy not found!');
  }
}

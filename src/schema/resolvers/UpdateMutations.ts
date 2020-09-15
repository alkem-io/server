import { Arg, Mutation, Resolver } from 'type-graphql';
import { Challenge, Context, Ecoverse, Organisation, User, UserGroup } from '../../models';
import { UpdateEcoverseInput, UpdateRootChallengeInput, UpdateRootContextInput, UpdateRootOrganisationInput, UpdateRootUserGroupInput, UpdateRootUserInput } from '../inputs';

@Resolver()
export class UpdateMutations {

  @Mutation(() => Ecoverse)
  async updateEcoverse(
    @Arg('ecoverseData') ecoverseData: UpdateEcoverseInput): Promise<Ecoverse> {

    await Ecoverse.getInstance();
    const ecoverse = Ecoverse.create(ecoverseData);
    await ecoverse.save();

    throw new Error('Entitiy not found!');

  }

  @Mutation(() => User)
  async updateUser(
    @Arg('userData') userData: UpdateRootUserInput): Promise<User> {
    if (User.findOne({ where: { userData } })) {
      const user = User.create(userData);
      await user.save();

      return user;

    }

    throw new Error('Entitiy not found!');

  }

  @Mutation(() => UserGroup)
  async updateUserGroup(
    @Arg('userGroupData') userGroupData: UpdateRootUserGroupInput): Promise<UserGroup> {

    if (User.findOne({ where: { userGroupData } })) {
      const userGroup = UserGroup.create(userGroupData);
      await userGroup.save();

      return userGroup;

    }

    throw new Error('Entitiy not found!');

  }

  @Mutation(() => Organisation)
  async updateOrganisation(
    @Arg('organisationData') organisationData: UpdateRootOrganisationInput): Promise<Organisation> {
    if (User.findOne({ where: { organisationData } })) {
      const organisation = Organisation.create(organisationData);
      await organisation.save();

      return organisation;

    }

    throw new Error('Entitiy not found!');
  }

  @Mutation(() => Challenge)
  async updateChallenge(
    @Arg('challengeData') challengeData: UpdateRootChallengeInput): Promise<Challenge> {
    try {
      const result = await Challenge.update(challengeData.id, challengeData);
      // const challenge = await Challenge.findOne({ where: { challenge: challengeData } });
      // if (challenge != undefined) {
      //   challenge = await Challenge.update(challengeData);
      //   await challenge.save();
      if (result.affected) {
        return await Challenge.findOne(challengeData.id) || new Challenge('');
      }
      // }
    }
    catch (e) {
      console.log(e);
    }

    throw new Error('Entitiy not found!');
  }

  @Mutation(() => Context)
  async updateContext(
    @Arg('contextData') contextData: UpdateRootContextInput): Promise<Context> {
    if (User.findOne({ where: { contextData } })) {
      const context = Context.create(contextData);
      await context.save();

      return context;

    }

    throw new Error('Entitiy not found!');
  }

}
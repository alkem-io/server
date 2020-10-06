import { EcoverseService, UserService } from '../../services';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { Challenge, Context, Ecoverse, Organisation, User, UserGroup, Tagset } from '../../models';
import { UpdateEcoverseInput, UpdateRootChallengeInput, UpdateRootContextInput, UpdateRootOrganisationInput, UpdateRootUserGroupInput, UpdateRootUserInput } from '../inputs';
import Container, { Inject } from 'typedi';
import { TagsetService } from 'src/services';
import { ApolloError } from 'apollo-server-express';
import { TagsInput } from '../inputs/TagsInput';
//import { performance } from 'perf_hooks';


@Resolver()
export class UpdateMutations {

  private _ecoverse: EcoverseService;
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Inject('EcoverseService') ecoverse: EcoverseService
  ) {
    this._ecoverse = Container.get<EcoverseService>('EcoverseService');
  }

  @Mutation(() => UserGroup)
  async addUserToGroup(@Arg('userID') userID: number, @Arg('groupID') groupID: number): Promise<UserGroup> {
    const userService = Container.get<UserService>('UserService');

    //const t0 = performance.now()
    // Try to find the user + groups
    const user = await userService.getUser(userID);

    if (!user) {
      const msg = `Unable to find exactly one user with ID: ${userID}`;
      console.log(msg);
      throw new Error(msg);
    }

    //const t1 = performance.now()
    const group = await UserGroup.findOne({ where: [ { id: groupID } ] });

    if (!group) {
      const msg = `Unable to find group with ID: ${groupID}`;
      console.log(msg);
      throw new Error(msg);
    }
    //const t2 = performance.now()

    // Have both user + group so do the add
    group.addUserToGroup(user);
    //const t3 = performance.now()
    await group.save();

    //const delta1 = t0 - t1;
    //const delta2 = t2 - t1;
    //const delta3 = t3 - t2;
    //const msg = `AddUserToGroup deltas: ${delta1}, ${delta2}, ${delta3}`;
    //console.log(`AddUserToGroup deltas: ${delta1}, ${delta2}, ${delta3}`);
    return group;
  }

  @Mutation(() => Ecoverse)
  async updateEcoverse(
    @Arg('ecoverseData') ecoverseData: UpdateEcoverseInput): Promise<Ecoverse> {

    const ctVerse = await this._ecoverse.getEcoverse() as Ecoverse;

    // Copy over the received data
    if (ecoverseData.name) {
      ctVerse.name = ecoverseData.name;
    }
    if (ecoverseData.context)
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

  @Mutation(() => Tagset, { description: 'Replace the set of tags in a tagset with the provided tags' })
  async replaceTagsOnTagset(
    @Arg('tagsetID') tagsetID: number,
    @Arg('tags') newTags: TagsInput
  ): Promise<Tagset> {
    const tagsetService = Container.get<TagsetService>('TagsetService');
    const tagset = await tagsetService.getTagset(tagsetID);

    if (!tagset) throw new ApolloError(`Tagset with id(${tagsetID}) not found!`);

    // Check the incoming tags and replace if not null
    if (newTags) {
      if (!newTags.tags) {
        tagset.tags = [];
      } else {
        tagset.tags = newTags.tags;
      }

      await tagset.save();
    }

    return tagset;
  }
}

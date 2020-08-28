import { Query, Resolver, Arg, Mutation } from 'type-graphql';
import { Tag, User, Challenge, Ecoverse, Agreement, DID, Context, Organisation, Project, UserGroup, EcoverseInput, ChallengeInput, AgreementInput, ContextInput, OrganisationInput, ProjectInput, TagInput, UserInput, UserGroupInput } from '../models';
import { BaseEntity } from 'typeorm';


@Resolver()
export class Resolvers {

  @Query(() => String)
  async name(): Promise<String> {
    // NOTE: need to be able to return THE host organisation
    return "HelloEcoverse";
  }

  @Query(() => Organisation)
  async host(): Promise<Organisation> {
    // NOTE: need to be able to return THE host organisation
    const organisations = await Organisation.find();
    return organisations[0];
  }

  // Context related fields
  @Query(() => Context )
  async context(): Promise<Context> {
    const contexts = await Context.find();
    return contexts[0];
  }

  // Community related fields

  @Query(() => User )
  async user(@Arg('ID') id : string): Promise<User | undefined> {
    return await User.findOne( { where: { id } } );
  }

  @Query(() => [ User ])
  async users(): Promise<User[]> {
    return await User.find();
  }

  @Query(() => UserGroup )
  async userGroup(@Arg('ID') id : string): Promise<UserGroup | undefined> {
    return await UserGroup.findOne( { where: { id } } );
  }

  @Query(() => [ UserGroup ])
  async userGroups(): Promise<UserGroup[]> {
    return await UserGroup.find();
  }

  @Query(() => [ Organisation ])
  async organisations(): Promise<Organisation[]> {
    return await Organisation.find();
  }

  // Challenges related fields

  @Query(() => Challenge )
  async challenge(@Arg('ID') id : string): Promise<Challenge | undefined> {
    return await Challenge.findOne( { where: { id } } );
  }

  @Query(() => [ Challenge ])
  async challenges(): Promise<Challenge[]> {
    const challenges = await Challenge.find();
    return challenges;
  }

  // Misc

  @Query(() => [ Tag ])
  async tags(): Promise<Tag[]> {
    return await Tag.find();
  }





  // The set of mutations to expose

  // TBD - add in Host org mutation

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



  // @Mutation(() => DID)
  // async createDID(
  //   @Arg('didData') didData: DID): Promise<Context> {
  //   const context = Context.create(contextData);
  //   await context.save();

  //   return context;
  // }

  // @Mutation(() => T)
  // async create <T extends BaseEntity, TT>(
  //   @Arg('data') data: TT): Promise<T> {
  //   const entity = T.create(data);
  //   await entity.save();

  //   return entity;
  // }

}
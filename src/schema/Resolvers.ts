import { Query, Resolver, Arg, Mutation } from 'type-graphql';
import { Tag, User, Challenge, Ecoverse, Agreement, DID, Context, Organisation, Project, UserGroup, EcoverseInput, ChallengeInput, AgreementInput, ContextInput, OrganisationInput, ProjectInput, TagInput, UserInput, UserGroupInput } from '../models';
import { BaseEntity } from 'typeorm';


@Resolver()
export class Resolvers {
  @Query(() => [ Tag ])
  async allTags(): Promise<Tag[]> {
    return await Tag.find();
  }

  @Query(() => [ User ])
  async allUsers(): Promise<User[]> {
    return await User.find();
  }

  @Query(() => [ Challenge ])
  async allChallenges(): Promise<Challenge[]> {
    return await Challenge.find();
  }

  @Query(() => [ Ecoverse ])
  async allEcoverse(): Promise<Ecoverse[]> {
    return await Ecoverse.find();
  }

  @Query(() => [ Agreement ])
  async allAgreements(): Promise<Agreement[]> {
    return await Agreement.find();
  }

  @Query(() => [ Context ])
  async allContexts(): Promise<Context[]> {
    return await Context.find();
  }

  @Query(() => [ DID ])
  async allDIDs(): Promise<DID[]> {
    return await DID.find();
  }

  @Query(() => [ Organisation ])
  async allOrganisations(): Promise<Organisation[]> {
    return await Organisation.find();
  }

  @Query(() => [ Project ])
  async allProjects(): Promise<Project[]> {
    return await Project.find();
  }

  @Query(() => [ UserGroup ])
  async allUserGroups(): Promise<UserGroup[]> {
    return await UserGroup.find();
  }

  @Mutation(() => Ecoverse)
  async createEcoverse(
    @Arg('ecoverseData') ecoverseData: EcoverseInput): Promise<Ecoverse> {
    const ecoverse = Ecoverse.create(ecoverseData);
    await ecoverse.save();

    return ecoverse;
  }

  @Mutation(() => Challenge)
  async createChallenge(
    @Arg('challengeData') challengeData: ChallengeInput): Promise<Challenge> {
    const challenge = Challenge.create(challengeData);
    await challenge.save();

    return challenge;
  }

  @Mutation(() => Agreement)
  async createAgreement(
    @Arg('agreementData') agreementData: AgreementInput): Promise<Agreement> {
    const agreement = Agreement.create(agreementData);
    await agreement.save();

    return agreement;
  }

  @Mutation(() => Context)
  async createContext(
    @Arg('contextData') contextData: ContextInput): Promise<Context> {
    const context = Context.create(contextData);
    await context.save();

    return context;
  }

  @Mutation(() => Organisation)
  async createOrganisation(
    @Arg('organisationData') organisationData: OrganisationInput): Promise<Organisation> {
    const organisation = Organisation.create(organisationData);
    await organisation.save();

    return organisation;
  }

  @Mutation(() => Project)
  async createProject(
    @Arg('projectData') projectData: ProjectInput): Promise<Project> {
    const project = Project.create(projectData);
    await project.save();

    return project;
  }

  @Mutation(() => Tag)
  async createTag(
    @Arg('tagData') tagData: TagInput): Promise<Tag> {
    const tag = Tag.create(tagData);
    await tag.save();

    return tag;
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
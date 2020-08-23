import { Query, Resolver, Arg, Mutation, createUnionType } from 'type-graphql';
import { Tag, User, Challenge, Ecoverse, Agreement, DID, Context, Organisation, Project, UserGroup } from '../models';

const EcoverseUnion = createUnionType({
  name: 'EcoverseUnion',
  types: () => [ Ecoverse, Organisation, UserGroup, Challenge ] as const,
});

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

  @Query(() => [ EcoverseUnion ])
  async getEcoverseUnion(@Arg('name') name: string): Promise<Array<typeof EcoverseUnion>> {
    const ecoverse: Ecoverse = <Ecoverse>await Ecoverse.findOne({ where: { name } });
    const ecoverseMembers = await UserGroup.find({ where: { ecoverse } });
    // const ecoverseChallenges = await Challenge.find({ where: { ecoverse } });
    // const ecoversePartners = await Organisation.find({ where: { ecoverse } });
    // , ...ecoverseMembers, ...ecoverseChallenges, ...ecoversePartners
    return [ ecoverse, ...ecoverseMembers ];
  }

  // @Mutation(() => Pokemon)
  // async createPokemon(@Arg('name') name: string): Promise<Pokemon> {
  //   const pokemon = Pokemon.create({ name });
  //   await pokemon.save();

  //   return pokemon;
  // }

}
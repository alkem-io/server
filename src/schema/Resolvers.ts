import { Query, Resolver, Arg, Mutation, createUnionType } from 'type-graphql';
import { Tag, User, Challenge, Ecoverse } from '../models';



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

  /*
  @Query(() => Pokemon)
  async getPokemonPerName(@Arg('name') name: string): Promise<Pokemon | undefined> {
    return await Pokemon.findOne({ where: { name } });
  }

  @Query(() => [ PokemonAbilitiesUnion ])
  async getPokemonAbilities(@Arg('name') name: string): Promise<Array<typeof PokemonAbilitiesUnion>> {
    const pokemon: Pokemon = <Pokemon>await Pokemon.findOne({ where: { name } });
    const pokemonAbilities = await PokemonAbilities.find({ where: { pokemon } });

    return [ pokemon, ...pokemonAbilities ];
  }

  @Mutation(() => Pokemon)
  async createPokemon(@Arg('name') name: string): Promise<Pokemon> {
    const pokemon = Pokemon.create({ name });
    await pokemon.save();

    return pokemon;
  }
  */
}
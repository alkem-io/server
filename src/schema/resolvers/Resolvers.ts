import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import { ChallengeInput, ContextInput, OrganisationInput, TagInput, UserGroupInput, UserInput } from '../inputs';
import { Challenge, Context, Ecoverse, Organisation, Tag, User, UserGroup } from '../../models'
import { Container, Inject } from 'typedi'
import { IEcoverse } from 'src/interfaces/IEcoverse';
import { EcoverseService } from '../../services/EcoverseService';
import { IUser } from 'src/interfaces/IUser';
@Resolver()
export class Resolvers {

    // @Inject('EcoverseService')
    // private ecoverseService : EcoverseService;

    constructor(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @Inject('EcoverseService') ecoverseService : EcoverseService
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    ){}


    async ecoverse(): Promise<IEcoverse> {
        const ecoverserService = Container.get<EcoverseService>('EcoverseService');
        return await ecoverserService.getEcoverse();
    }

    @Query(() => String, { nullable: false, description: 'The name for this ecoverse' })
    async name(): Promise<string> {
        const ecoverserService = Container.get<EcoverseService>('EcoverseService');
        return await ecoverserService.getName();
    }

    @Query(() => String, { nullable: false, description: 'The name for this ecoverse' })
    async members(): Promise<IUser[]> {
        const ecoverserService = Container.get<EcoverseService>('EcoverseService');
        return await ecoverserService.getMembers();
    }

    @Query(() => Organisation, { nullable: false, description: 'The host organisation for the ecoverse' })
    async host(): Promise<Organisation> {
        // NOTE: need to be able to return THE host organisation
        const organisations = await Organisation.find();
        return organisations[0];
    }

    // Context related fields
    @Query(() => Context, { nullable: false, description: 'The shared understanding for this ecoverse' })
    async context(): Promise<Context> {
        const contexts = await Context.find();
        return contexts[0];
    }

    // Community related fields

    @Query(() => User, { nullable: false, description: 'A particular user' })
    async user(@Arg('ID') id: string): Promise<User | undefined> {
        return await User.findOne({ where: { id } });
    }

    @Query(() => [User], { nullable: false, description: 'The set of users associated with this ecoverse' })
    async users(): Promise<User[]> {
        return await User.find();
    }

    @Query(() => UserGroup, { nullable: false, description: 'A particualr user group' })
    async userGroup(@Arg('ID') id: string): Promise<UserGroup | undefined> {
        return await UserGroup.findOne({ where: { id } });
    }

    @Query(() => [UserGroup], { nullable: false, description: 'All groups of users' })
    async userGroups(): Promise<UserGroup[]> {
        return await UserGroup.find();
    }

    @Query(() => [Organisation], { nullable: false, description: 'All organisations' })
    async organisations(): Promise<Organisation[]> {
        return await Organisation.find();
    }

    // Challenges related fields

    @Query(() => Challenge, { nullable: false, description: 'A particular challenge' })
    async challenge(@Arg('ID') id: string): Promise<Challenge | undefined> {
        return await Challenge.findOne({ where: { id } });
    }

    @Query(() => [Challenge], { nullable: false, description: 'All challenges' })
    async challenges(): Promise<Challenge[]> {
        return await Challenge.find();
    }

    // Misc

    @Query(() => [Tag], { nullable: false, description: 'All tags associated with this Ecoverse' })
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
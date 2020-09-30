import { IContext } from 'src/interfaces/IContext';
import { IEcoverse } from 'src/interfaces/IEcoverse';
import { IOrganisation } from 'src/interfaces/IOrganisation';
import { IUserGroup } from 'src/interfaces/IUserGroup';
import { Arg, Authorized, Query, Resolver } from 'type-graphql';
import { Container, Inject } from 'typedi';
import { Challenge, Context, Ecoverse, Organisation, Tag, User, UserGroup } from '../../models';
import { ChallengeService } from '../../services/ChallengeService';
import { EcoverseService } from '../../services/EcoverseService';
import { OrganisationService } from '../../services/OrganisationService';
@Resolver()
export class Resolvers {
  // @Inject('EcoverseService')
  // private ecoverseService : EcoverseService;

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Inject('EcoverseService') ecoverseService: EcoverseService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Inject('ChallengeService') challengeService: ChallengeService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Inject('OrganisationService') organisationService: OrganisationService
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ) {}

  async ecoverse(): Promise<IEcoverse> {
    const ecoverserService = Container.get<EcoverseService>('EcoverseService');
    return await ecoverserService.getEcoverse();
  }

  @Authorized()
  @Query(() => String, { nullable: false, description: 'The name for this ecoverse' })
  async name(): Promise<string> {
    const ecoverserService = Container.get<EcoverseService>('EcoverseService');
    return await ecoverserService.getName();
  }

  @Query(() => [UserGroup], { nullable: false, description: 'The name for this ecoverse' })
  async members(): Promise<IUserGroup> {
    const ecoverserService = Container.get<EcoverseService>('EcoverseService');
    return ecoverserService.getMembers();
  }

  @Query(() => [UserGroup], { nullable: false, description: 'The name for this ecoverse' })
  async challengeMembers(@Arg('ID') id: number): Promise<IUserGroup> {
    const challengeService = Container.get<ChallengeService>('EcoverseService');
    return challengeService.getMembers(id);
  }

  @Query(() => Organisation, { nullable: false, description: 'The host organisation for the ecoverse' })
  async host(): Promise<IOrganisation> {
    // NOTE: need to be able to return THE host organisation
    const ecoverserService = Container.get<EcoverseService>('EcoverseService');
    return ecoverserService.getHost();
  }

  // Context related fields
  @Query(() => Context, { nullable: false, description: 'The shared understanding for this ecoverse' })
  async context(): Promise<IContext> {
    const ecoverserService = Container.get<EcoverseService>('EcoverseService');
    return ecoverserService.getContext();
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
  async group(@Arg('ID') id: string): Promise<UserGroup | undefined> {
    return await UserGroup.findOne({ where: { id } });
  }

  @Query(() => [UserGroup], { nullable: false, description: 'All groups of users at the ecoverse level' })
  async groups(): Promise<UserGroup[]> {
    //const ecoverserService = Container.get<EcoverseService>('EcoverseService');
    // TODO: replace with using service!!!
    const ecoverse = await Ecoverse.getInstance();
    if (!ecoverse.groups) {
      throw new Error('not reachable');
    }
    return ecoverse.groups;
  }

  @Query(() => [Organisation], { nullable: false, description: 'All organisations' })
  async organisations(): Promise<Organisation[]> {
    const organisationService = Container.get<OrganisationService>('OrganisationService');
    return await organisationService.getOrganisations();
  }

  // Challenges related fields

  @Query(() => Challenge, { nullable: false, description: 'A particular challenge' })
  async challenge(@Arg('ID') id: string): Promise<Challenge | undefined> {
    return await Challenge.findOne({ where: { id } });
  }

  @Query(() => [Challenge], { nullable: false, description: 'All challenges' })
  async challenges(): Promise<Challenge[]> {
    const ecoverse = await Ecoverse.getInstance();
    if (!ecoverse.challenges) {
      throw new Error('Challenges not defined');
    }
    return ecoverse.challenges;
  }

  // Misc

  @Query(() => [Tag], { nullable: false, description: 'All tags associated with this Ecoverse' })
  async tags(): Promise<Tag[]> {
    return await Tag.find();
  }
}

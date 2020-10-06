import { IContext } from 'src/interfaces/IContext';
import { IEcoverse } from 'src/interfaces/IEcoverse';
import { IOrganisation } from 'src/interfaces/IOrganisation';
import { IUserGroup } from 'src/interfaces/IUserGroup';
import { Arg, Authorized, Query, Resolver } from 'type-graphql';
import { Container, Inject } from 'typedi';
import { Challenge, Context, Ecoverse, Organisation, Tagset, User, UserGroup } from '../../models';
import { ChallengeService, EcoverseService, OrganisationService } from '../../services';

@Resolver()
export class Resolvers {

  private _ecoverseService: EcoverseService;
  private _organisationService: OrganisationService;
  private _challengeService: ChallengeService;

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Inject('EcoverseService') ecoverseService: EcoverseService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Inject('ChallengeService') challengeService: ChallengeService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Inject('OrganisationService') organisationService: OrganisationService
  ) {
    this._ecoverseService = Container.get<EcoverseService>('EcoverseService');
    this._challengeService = Container.get<ChallengeService>('ChallengeService');
    this._organisationService = Container.get<OrganisationService>('OrganisationService');
  }

  async ecoverse(): Promise<IEcoverse> {
    return await this._ecoverseService.getEcoverse();
  }

  @Authorized()
  @Query(() => String, { nullable: false, description: 'The name for this ecoverse' })
  async name(): Promise<string> {
    return await this._ecoverseService.getName();
  }

  @Query(() => UserGroup, { nullable: false, description: 'The members group for this ecoverse' })
  async members(): Promise<IUserGroup> {

    return await this._ecoverseService.getMembers();
  }

  @Query(() => [UserGroup], { nullable: false, description: 'The name for this ecoverse' })
  async challengeMembers(@Arg('ID') id: number): Promise<IUserGroup> {
    return await this._challengeService.getMembers(id);
  }

  @Query(() => Organisation, { nullable: false, description: 'The host organisation for the ecoverse' })
  async host(): Promise<IOrganisation> {
    return await this._ecoverseService.getHost();
  }

  // Context related fields
  @Query(() => Context, { nullable: false, description: 'The shared understanding for this ecoverse' })
  async context(): Promise<IContext> {
    return await this._ecoverseService.getContext();
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
    const ecoverse = await this._ecoverseService.getEcoverse() as Ecoverse
    if (!ecoverse.groups) {
      throw new Error('not reachable');
    }
    return ecoverse.groups;
  }

  @Query(() => [Organisation], { nullable: false, description: 'All organisations' })
  async organisations(): Promise<Organisation[]> {
    return await this._organisationService.getOrganisations();
  }

  // Challenges related fields

  @Query(() => Challenge, { nullable: false, description: 'A particular challenge' })
  async challenge(@Arg('ID') id: string): Promise<Challenge | undefined> {
    return await Challenge.findOne({ where: { id } });
  }

  @Query(() => [Challenge], { nullable: false, description: 'All challenges' })
  async challenges(): Promise<Challenge[]> {
    const ecoverse = await this._ecoverseService.getEcoverse() as Ecoverse
    if (!ecoverse.challenges) {
      throw new Error('Challenges not defined');
    }
    return ecoverse.challenges;
  }

  @Query(() => [Tagset], { nullable: false, description: 'All tagsets associated in this Ecoverse' })
  async tagsets(): Promise<Tagset[]> {
    return await Tagset.find();
  }
}

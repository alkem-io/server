import { Get, Inject, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import { Challenge } from '../challenge/challenge.entity';
import { IChallenge } from '../challenge/challenge.interface';
import { ChallengeService } from '../challenge/challenge.service';
import { Context } from '../context/context.entity';
import { IContext } from '../context/context.interface';
import { Organisation } from '../organisation/organisation.entity';
import { IOrganisation } from '../organisation/organisation.interface';
import { Tagset } from '../tagset/tagset.entity';
import { ITagset } from '../tagset/tagset.interface';
import { UserGroup } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';
import { EcoverseService } from './ecoverse.service';

@Resolver()
export class EcoverseResolverQueries {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService,
    private groupService: UserGroupService,
    private challengeService: ChallengeService
  ) {}

  @Query(() => String, {
    nullable: false,
    description: 'The name for this ecoverse',
  })
  async name(): Promise<string> {
    return this.ecoverseService.getName();
  }

  @Get()
  @UseGuards(GqlAuthGuard)
  @Query(() => Organisation, {
    nullable: false,
    description: 'The host organisation for the ecoverse',
  })
  async host(): Promise<IOrganisation> {
    return this.ecoverseService.getHost();
  }

  // Context related fields
  @Query(() => Context, {
    nullable: false,
    description: 'The shared understanding for this ecoverse',
  })
  async context(): Promise<IContext> {
    return this.ecoverseService.getContext();
  }

  @Query(() => [User], {
    nullable: false,
    description: 'The users associated with this ecoverse',
  })
  async users(): Promise<IUser[]> {
    return this.ecoverseService.getMembers();
  }

  @Query(() => User, { nullable: false, description: 'A particular user' })
  async user(@Args('ID') id: string): Promise<User | undefined> {
    return await User.findOne({ where: { id } });
  }

  @Query(() => [UserGroup], {
    nullable: false,
    description: 'All groups of users at the ecoverse level',
  })
  async groups(): Promise<IUserGroup[]> {
    const groups = await this.ecoverseService.getGroups();
    return groups;
  }

  @Query(() => UserGroup, {
    nullable: false,
    description: 'A particualr user group',
  })
  async group(@Args('ID') id: number): Promise<IUserGroup | undefined> {
    const group = await this.groupService.getGroupByID(id);
    return group;
  }

  @Query(() => [Challenge], { nullable: false, description: 'All challenges' })
  async challenges(): Promise<IChallenge[]> {
    const challenges = await this.ecoverseService.getChallenges();
    return challenges;
  }

  @Query(() => Challenge, {
    nullable: false,
    description: 'A particular challenge',
  })
  async challenge(@Args('ID') id: number): Promise<IChallenge | undefined> {
    return await this.challengeService.getChallengeByID(id);
  }

  @Query(() => Tagset, {
    nullable: false,
    description: 'The tagset associated with this Ecoverse',
  })
  async tagsets(): Promise<ITagset> {
    return this.ecoverseService.getTagset();
  }
}

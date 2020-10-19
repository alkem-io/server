import { Inject } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Challenge } from '../challenge/challenge.entity';
import { IChallenge } from '../challenge/challenge.interface';
import { ChallengeService } from '../challenge/challenge.service';
import { Context } from '../context/context.entity';
import { IContext } from '../context/context.interface';
import { Organisation } from '../organisation/organisation.entity';
import { IOrganisation } from '../organisation/organisation.interface';
import { OrganisationService } from '../organisation/organisation.service';
import { Tagset } from '../tagset/tagset.entity';
import { ITagset } from '../tagset/tagset.interface';
import { UserGroup } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { UserGroupService } from '../user-group/user-group.service';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';
import { UserService } from '../user/user.service';
import { EcoverseService } from './ecoverse.service';

@Resolver()
export class EcoverseResolverQueries {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService,
    private userService: UserService,
    private groupService: UserGroupService,
    private organisationService: OrganisationService,
    private challengeService: ChallengeService
  ) {}

  @Query(() => String, {
    nullable: false,
    description: 'The name for this ecoverse',
  })
  async name(): Promise<string> {
    return this.ecoverseService.getName();
  }

  @Query(() => [User], {
    nullable: false,
    description: 'The members of this ecoverse',
  })
  async members(): Promise<IUser[]> {
    const members = await this.ecoverseService.getMembers();
    return members;
  }

  //@Get()
  //@UseGuards(GqlAuthGuard)
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

  @Query(() => User, {
    nullable: false,
    description: 'A particular user, identified by the ID or by email',
  })
  async user(@Args('ID') id: string): Promise<IUser> {
    const user = await this.userService.getUser(id);
    if (user) return user;

    throw new Error(`Unable to locate user with given id: ${id}`);
  }

  @Query(() => [UserGroup], {
    nullable: false,
    description: 'All groups at the ecoverse level',
  })
  async groups(): Promise<IUserGroup[]> {
    const groups = await this.ecoverseService.getGroups();
    return groups;
  }

  @Query(() => [UserGroup], {
    nullable: false,
    description: 'All groups that have the provided tag',
  })
  async groupsWithTag(@Args('tag') tag: string): Promise<IUserGroup[]> {
    const groups = await this.ecoverseService.getGroupsWithTag(tag);
    return groups;
  }

  @Query(() => UserGroup, {
    nullable: false,
    description:
      'The user group with the specified id anywhere in the ecoverse',
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

  @Query(() => [Organisation], {
    nullable: false,
    description: 'All organisations',
  })
  async organisations(): Promise<IOrganisation[]> {
    const organisations = await this.ecoverseService.getOrganisations();
    return organisations;
  }

  @Query(() => Organisation, {
    nullable: false,
    description: 'A particular organisation',
  })
  async organisation(
    @Args('ID') id: number
  ): Promise<IOrganisation | undefined> {
    return await this.organisationService.getOrganisationByID(id);
  }

  @Query(() => Tagset, {
    nullable: false,
    description: 'The tagset associated with this Ecoverse',
  })
  async tagset(): Promise<ITagset> {
    return this.ecoverseService.getTagset();
  }
}

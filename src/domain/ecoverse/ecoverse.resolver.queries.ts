import { Inject, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authentication/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { EntityNotFoundException } from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { Challenge } from '@domain/challenge/challenge.entity';
import { IChallenge } from '@domain/challenge/challenge.interface';
import { ChallengeService } from '@domain/challenge/challenge.service';
import { Context } from '@domain/context/context.entity';
import { IContext } from '@domain/context/context.interface';
import { Organisation } from '@domain/organisation/organisation.entity';
import { IOrganisation } from '@domain/organisation/organisation.interface';
import { OrganisationService } from '@domain/organisation/organisation.service';
import { Tagset } from '@domain/tagset/tagset.entity';
import { ITagset } from '@domain/tagset/tagset.interface';
import {
  RestrictedGroupNames,
  UserGroup,
} from '@domain/user-group/user-group.entity';
import { IUserGroup } from '@domain/user-group/user-group.interface';
import { UserGroupService } from '@domain/user-group/user-group.service';
import { User } from '@domain/user/user.entity';
import { IUser } from '@domain/user/user.interface';
import { UserService } from '@domain/user/user.service';
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
  @Profiling.api
  async name(): Promise<string> {
    return this.ecoverseService.getName();
  }

  @Query(() => Organisation, {
    nullable: false,
    description: 'The host organisation for the ecoverse',
  })
  @Profiling.api
  async host(): Promise<IOrganisation> {
    return this.ecoverseService.getHost();
  }

  @Query(() => Context, {
    nullable: false,
    description: 'The shared understanding for this ecoverse',
  })
  @Profiling.api
  async context(): Promise<IContext> {
    return this.ecoverseService.getContext();
  }

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [User], {
    nullable: false,
    description: 'The members of this this ecoverse',
  })
  @Profiling.api
  async users(): Promise<IUser[]> {
    return await this.ecoverseService.getUsers();
  }

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  //should be in user queries
  @Query(() => User, {
    nullable: false,
    description: 'A particular user, identified by the ID or by email',
  })
  @Profiling.api
  async user(@Args('ID') id: string): Promise<IUser> {
    return await this.userService.getUserOrFail(id);
  }

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  //should be in user queries
  @Query(() => [User], {
    nullable: false,
    description: 'The members of this this ecoverse filtered by list of IDs.',
  })
  @Profiling.api
  async usersById(
    @Args({ name: 'IDs', type: () => [String] }) ids: string[]
  ): Promise<IUser[]> {
    const users = await this.ecoverseService.getUsers();
    return users.filter(x => {
      return ids ? ids.indexOf(x.id.toString()) > -1 : false;
    });
  }

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [UserGroup], {
    nullable: false,
    description: 'All groups at the ecoverse level',
  })
  @Profiling.api
  async groups(): Promise<IUserGroup[]> {
    const groups = await this.ecoverseService.getGroups();
    return groups;
  }

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [UserGroup], {
    nullable: false,
    description: 'All groups that have the provided tag',
  })
  @Profiling.api
  async groupsWithTag(@Args('tag') tag: string): Promise<IUserGroup[]> {
    const groups = await this.ecoverseService.getGroupsWithTag(tag);
    return groups;
  }

  @Roles(RestrictedGroupNames.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => UserGroup, {
    nullable: false,
    description:
      'The user group with the specified id anywhere in the ecoverse',
  })
  @Profiling.api
  async group(@Args('ID') id: number): Promise<IUserGroup> {
    const group = await this.groupService.getUserGroupOrFail(id, {
      relations: ['members', 'focalPoint'],
    });
    return group;
  }

  @Query(() => [Challenge], { nullable: false, description: 'All challenges' })
  @Profiling.api
  async challenges(): Promise<IChallenge[]> {
    const challenges = await this.ecoverseService.getChallenges();
    return challenges;
  }

  @Query(() => Challenge, {
    nullable: false,
    description: 'A particular challenge',
  })
  @Profiling.api
  async challenge(@Args('ID') id: number): Promise<IChallenge> {
    return await this.challengeService.getChallengeOrFail(id);
  }

  @Query(() => [Organisation], {
    nullable: false,
    description: 'All organisations',
  })
  @Profiling.api
  async organisations(): Promise<IOrganisation[]> {
    const organisations = await this.ecoverseService.getOrganisations();
    return organisations;
  }

  @Query(() => Organisation, {
    nullable: false,
    description: 'A particular organisation',
  })
  @Profiling.api
  async organisation(
    @Args('ID') id: number
  ): Promise<IOrganisation | undefined> {
    return await this.organisationService.getOrganisationOrFail(id, {
      relations: ['groups'],
    });
  }

  @Query(() => Tagset, {
    nullable: false,
    description: 'The tagset associated with this Ecoverse',
  })
  @Profiling.api
  async tagset(): Promise<ITagset> {
    return await this.ecoverseService.getTagset();
  }
}

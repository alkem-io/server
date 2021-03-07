import { Application } from '@domain/community/application/application.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { Context } from '@domain/context/context/context.entity';
import { IContext } from '@domain/context/context/context.interface';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { User } from '@domain/community/user/user.entity';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { Inject, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@src/core/authorization/roles.decorator';
import { Profiling } from '@src/core/logging/logging.profiling.decorator';
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

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @Query(() => [User], {
    nullable: false,
    description: 'The members of this ecoverse',
  })
  @Profiling.api
  async members(): Promise<IUser[]> {
    return await this.ecoverseService.getMembers();
  }

  @Roles(AuthorizationRoles.Members)
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

  @Roles(AuthorizationRoles.Members)
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

  @Roles(AuthorizationRoles.Members)
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

  @Query(() => [Application], {
    nullable: false,
    description: 'All applications for this ecoverse',
  })
  @Profiling.api
  async applications(): Promise<Application[]> {
    const applications = await this.ecoverseService.getApplications();
    return applications;
  }
}

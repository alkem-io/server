import { Get, Inject, UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import { Context } from '../context/context.entity';
import { IContext } from '../context/context.interface';
import { Organisation } from '../organisation/organisation.entity';
import { IOrganisation } from '../organisation/organisation.interface';
import { UserGroup } from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';
import { EcoverseService } from './ecoverse.service';

@Resolver()
export class EcoverseResolverQueries {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
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
    description: 'The name for this ecoverse',
  })
  async members(): Promise<IUser[]> {
    const membersGroup = await this.ecoverseService.getMembers();
    if (!membersGroup.members) throw new Error('Members group no initialised');
    return membersGroup.members;
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
}

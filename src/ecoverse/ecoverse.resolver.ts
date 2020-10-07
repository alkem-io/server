import { Get, Inject, UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from 'src/authentication/graphql.guard';
import { Context } from 'src/context/context.entity';
import { IContext } from 'src/context/context.interface';
import { Organisation } from 'src/organisation/organisation.entity';
import { IOrganisation } from 'src/organisation/organisation.interface';
import { UserGroup } from 'src/user-group/user-group.entity';
import { IUserGroup } from 'src/user-group/user-group.interface';
import { EcoverseService } from './ecoverse.service';

@Resolver()
export class EcoverseResolver {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService,
  ) {}

  @Query(() => String, {
    nullable: false,
    description: 'The name for this ecoverse',
  })
  async name(): Promise<string> {
    return this.ecoverseService.getName();
  }

  @Query(() => [UserGroup], {
    nullable: false,
    description: 'The name for this ecoverse',
  })
  async members(): Promise<IUserGroup> {
    return this.ecoverseService.getMembers();
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

import { UUID_NAMEID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IOrganization } from './organization.interface';
import { OrganizationService } from './organization.service';
import { GraphqlGuard } from '@src/core/authorization/graphql.guard';
import { PaginationArgs } from '@core/pagination';
import { OrganizationFilterInput } from '@core/filtering';
import { UseGuards } from '@nestjs/common';
import { PaginatedOrganization } from '@core/pagination/paginated.organization';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';

@Resolver()
export class OrganizationResolverQueries {
  constructor(private organizationService: OrganizationService) {}

  @Query(() => [IOrganization], {
    nullable: false,
    description: 'The Organizations on this platform',
  })
  @Profiling.api
  async organizations(
    @Args({ nullable: true }) args: ContributorQueryArgs
  ): Promise<IOrganization[]> {
    return await this.organizationService.getOrganizations(args);
  }

  @Query(() => IOrganization, {
    nullable: false,
    description: 'A particular Organization',
  })
  @Profiling.api
  async organization(
    @Args('ID', { type: () => UUID_NAMEID, nullable: false }) id: string
  ): Promise<IOrganization> {
    return await this.organizationService.getOrganizationOrFail(id);
  }

  @UseGuards(GraphqlGuard)
  @Query(() => PaginatedOrganization, {
    nullable: false,
    description: 'The Organizations on this platform in paginated format',
  })
  @Profiling.api
  async organizationsPaginated(
    @Args() pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: OrganizationFilterInput
  ): Promise<PaginatedOrganization> {
    return this.organizationService.getPaginatedOrganizations(
      pagination,
      filter
    );
  }
}

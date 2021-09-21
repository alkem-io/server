import { UUID_NAMEID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IOrganization } from './organization.interface';
import { OrganizationService } from './organization.service';

@Resolver()
export class OrganizationResolverQueries {
  constructor(private organizationService: OrganizationService) {}

  @Query(() => [IOrganization], {
    nullable: false,
    description: 'The Organizations on this platform',
  })
  @Profiling.api
  async organizations(): Promise<IOrganization[]> {
    return await this.organizationService.getOrganizations();
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
}

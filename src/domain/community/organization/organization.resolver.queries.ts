import { UUID_NAMEID } from '@domain/common/scalars';
import { Args, Float, Query, Resolver } from '@nestjs/graphql';
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
  async organizations(
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Organizations to return; if omitted return all Organizations.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'randomSelection',
      type: () => Boolean,
      description:
        'If more organizations than the limit specified then return a random or fixed selection.',
      nullable: true,
    })
    randomSelection: boolean
  ): Promise<IOrganization[]> {
    return await this.organizationService.getOrganizations(
      limit,
      randomSelection
    );
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

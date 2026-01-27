import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { OrganizationFilterInput } from '@core/filtering';
import { PaginationArgs } from '@core/pagination';
import { PaginatedOrganization } from '@core/pagination/paginated.organization';
import { UUID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';
import { IOrganization } from './organization.interface';
import { OrganizationService } from './organization.service';

@InstrumentResolver()
@Resolver()
export class OrganizationResolverQueries {
  constructor(private organizationService: OrganizationService) {}

  @Query(() => [IOrganization], {
    nullable: false,
    description: 'The Organizations on this platform',
  })
  async organizations(
    @Args({ nullable: true }) args: ContributorQueryArgs
  ): Promise<IOrganization[]> {
    return await this.organizationService.getOrganizations(args);
  }

  @Query(() => IOrganization, {
    nullable: false,
    description: 'A particular Organization',
  })
  async organization(
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IOrganization> {
    return await this.organizationService.getOrganizationOrFail(id);
  }

  @Query(() => PaginatedOrganization, {
    nullable: false,
    description: 'The Organizations on this platform in paginated format',
  })
  async organizationsPaginated(
    @Args() pagination: PaginationArgs,
    @Args('status', {
      nullable: true,
      description: 'Return only Organizations with this verification status',
      type: () => OrganizationVerificationEnum,
    })
    status?: OrganizationVerificationEnum,
    @Args('filter', { nullable: true }) filter?: OrganizationFilterInput
  ): Promise<PaginatedOrganization> {
    return this.organizationService.getPaginatedOrganizations(
      pagination,
      filter,
      status
    );
  }
}

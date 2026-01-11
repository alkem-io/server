import { UUID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { IOrganization } from './organization.interface';
import { OrganizationService } from './organization.service';
import { PaginationArgs } from '@core/pagination';
import { OrganizationFilterInput } from '@core/filtering';
import { PaginatedOrganization } from '@core/pagination/paginated.organization';
import { ActorQueryArgs } from '@domain/actor/actor/dto';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class OrganizationResolverQueries {
  constructor(private organizationService: OrganizationService) {}

  @Query(() => [IOrganization], {
    nullable: false,
    description: 'The Organizations on this platform',
  })
  async organizations(
    @Args({ nullable: true }) args: ActorQueryArgs
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
    return await this.organizationService.getOrganizationByIdOrFail(id);
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

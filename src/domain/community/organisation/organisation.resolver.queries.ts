import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IOrganisation } from './organisation.interface';
import { OrganisationService } from './organisation.service';

@Resolver()
export class OrganisationResolverQueries {
  constructor(private organisationService: OrganisationService) {}

  @Query(() => [IOrganisation], {
    nullable: false,
    description: 'The Organisations on this platform',
  })
  @Profiling.api
  async organisations(): Promise<IOrganisation[]> {
    return await this.organisationService.getOrganisations();
  }

  @Query(() => IOrganisation, {
    nullable: false,
    description: 'A particular Organisation',
  })
  @Profiling.api
  async organisation(@Args('ID') id: string): Promise<IOrganisation> {
    return await this.organisationService.getOrganisationOrFail(id);
  }
}

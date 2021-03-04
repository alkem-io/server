import { Application } from '@domain/application/application.entity';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { Inject, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.roles';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { Roles } from '@utils/authorisation/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { EcoverseService } from './ecoverse.service';

@Resolver()
export class EcoverseResolverFields {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @Roles(
    AuthorisationRoles.GlobalAdmins,
    AuthorisationRoles.EcoverseAdmins,
    AuthorisationRoles.CommunityAdmins
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('applications', () => [Application], {
    nullable: false,
    description: 'Application available for this ecoverese.',
  })
  @Profiling.api
  async applications(@Parent() _ecoverse: Ecoverse) {
    return await this.ecoverseService.getApplications();
  }
}

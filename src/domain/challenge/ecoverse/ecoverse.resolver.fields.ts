import { Application } from '@domain/community/application/application.entity';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Inject, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Profiling } from '@src/common/decorators';
import { EcoverseService } from './ecoverse.service';

@Resolver()
export class EcoverseResolverFields {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @Roles(
    AuthorizationRoles.GlobalAdmins,
    AuthorizationRoles.EcoverseAdmins,
    AuthorizationRoles.CommunityAdmins
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

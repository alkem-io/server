import { Application } from '@domain/application/application.entity';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { Inject, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/auth/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { EcoverseService } from './ecoverse.service';

@Resolver()
export class EcoverseResolverFields {
  constructor(
    @Inject(EcoverseService) private ecoverseService: EcoverseService
  ) {}

  @Roles(
    RestrictedGroupNames.GlobalAdmins,
    RestrictedGroupNames.EcoverseAdmins,
    RestrictedGroupNames.CommunityAdmins
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

import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { Application } from '@domain/community/application/application.entity';
import { ApplicationService } from '@domain/community/application/application.service';
import { Roles } from '@src/core/authorization/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Profiling } from '@src/core/logging/logging.profiling.decorator';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

@Resolver(() => Application)
export class ApplicationResolver {
  constructor(private applicationService: ApplicationService) {}

  @Query(() => [Application], {
    nullable: false,
    description: 'All applications to join',
  })
  async applications(): Promise<Application[]> {
    return await this.applicationService.getApplications();
  }

  @Query(() => Application, {
    nullable: false,
    description: 'All applications to join',
  })
  async application(@Args('ID') id: number): Promise<Application> {
    return await this.applicationService.getApplicationOrFail(id);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Application, {
    description: 'Create application to join this ecoverse',
  })
  @Profiling.api
  async approveApplication(@Args('ID') id: number): Promise<Application> {
    return await this.applicationService.approveApplication(id);
  }
}

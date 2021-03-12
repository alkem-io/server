import { Resolver, Query, Args } from '@nestjs/graphql';
import { Application } from '@domain/community/application/application.entity';
import { ApplicationService } from '@domain/community/application/application.service';
import { AuthorizationRoles, GqlAuthGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Roles } from '@common/decorators';

@Resolver(() => Application)
export class ApplicationResolver {
  constructor(private applicationService: ApplicationService) {}

  @Roles(AuthorizationRoles.Members, AuthorizationRoles.CommunityAdmins)
  @UseGuards(GqlAuthGuard)
  @Query(() => [Application], {
    nullable: false,
    description: 'All applications to join',
  })
  async applications(): Promise<Application[]> {
    return await this.applicationService.getApplications();
  }

  @Roles(AuthorizationRoles.Members, AuthorizationRoles.CommunityAdmins)
  @UseGuards(GqlAuthGuard)
  @Query(() => Application, {
    nullable: false,
    description: 'All applications to join',
  })
  async application(@Args('ID') id: number): Promise<Application> {
    return await this.applicationService.getApplicationOrFail(id);
  }
}

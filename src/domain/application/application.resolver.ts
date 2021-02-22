import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { Application } from '@domain/application/application.entity';
import { ApplicationService } from '@domain/application/application.service';
import { EntityNotFoundException } from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { Roles } from '@utils/decorators/roles.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '@utils/auth/graphql.guard';
import { Profiling } from '@utils/logging/logging.profiling.decorator';

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
    const app = await this.applicationService.getApplication(id);
    if (!app)
      throw new EntityNotFoundException(
        `Application with ID ${id} can not be found!`,
        LogContext.COMMUNITY
      );
    return app;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Application, {
    description: 'Create application to join this ecoverse',
  })
  @Profiling.api
  async approveApplication(@Args('ID') id: number): Promise<Application> {
    return await this.applicationService.approveApplication(id);
  }
}

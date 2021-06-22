import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { ApplicationService } from './application.service';
import { AuthorizationPrivilege } from '@common/enums';
import { Application, IApplication } from '@domain/community/application';
import { GraphqlGuard } from '@core/authorization';
import { IUser } from '@domain/community/user/user.interface';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';

@Resolver(() => IApplication)
export class ApplicationResolverFields {
  constructor(private applicationService: ApplicationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('user', () => IUser, {
    nullable: true,
    description: 'The User for this Application.',
  })
  @Profiling.api
  async user(@Parent() application: Application): Promise<IUser> {
    return await this.applicationService.getUser(application.id);
  }
}

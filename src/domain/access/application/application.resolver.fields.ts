import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Application, IApplication } from '@domain/access/application';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IQuestion } from '@domain/common/question/question.interface';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorPrivilege, Profiling } from '@src/common/decorators';
import { ApplicationService } from './application.service';

@Resolver(() => IApplication)
export class ApplicationResolverFields {
  constructor(private applicationService: ApplicationService) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributor', () => IActor, {
    nullable: false,
    description: 'The User for this Application.',
  })
  @Profiling.api
  async contributor(@Parent() application: Application): Promise<IActor> {
    return await this.applicationService.getContributor(application.id);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('questions', () => [IQuestion], {
    nullable: false,
    description: 'The Questions for this application.',
  })
  @Profiling.api
  async questions(@Parent() application: Application): Promise<IQuestion[]> {
    return await this.applicationService.getQuestionsSorted(application);
  }
}

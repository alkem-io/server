import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { ApplicationService } from './application.service';
import { AuthorizationPrivilege } from '@common/enums';
import { Application, IApplication } from '@domain/access/application';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationActorPrivilege, Profiling } from '@src/common/decorators';
import { IQuestion } from '@domain/common/question/question.interface';
import { IActor } from '@domain/actor/actor/actor.interface';

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

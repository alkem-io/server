import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Application, IApplication } from '@domain/access/application';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IQuestion } from '@domain/common/question/question.interface';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationActorHasPrivilege,
  Profiling,
} from '@src/common/decorators';
import { ApplicationService } from './application.service';

@Resolver(() => IApplication)
export class ApplicationResolverFields {
  constructor(private applicationService: ApplicationService) {}

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('actor', () => IActor, {
    nullable: false,
    description: 'The Actor for this Application.',
  })
  @Profiling.api
  async actor(@Parent() application: Application): Promise<IActor> {
    return await this.applicationService.getActor(application.id);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

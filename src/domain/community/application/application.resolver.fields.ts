import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { ApplicationService } from './application.service';
import { AuthorizationPrivilege } from '@common/enums';
import { Application, IApplication } from '@domain/community/application';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IQuestion } from '@domain/common/question/question.interface';
import { IContributor } from '../contributor/contributor.interface';

@Resolver(() => IApplication)
export class ApplicationResolverFields {
  constructor(private applicationService: ApplicationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('contributor', () => IContributor, {
    nullable: false,
    description: 'The User for this Application.',
  })
  @Profiling.api
  async contributor(@Parent() application: Application): Promise<IContributor> {
    return await this.applicationService.getContributor(application.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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

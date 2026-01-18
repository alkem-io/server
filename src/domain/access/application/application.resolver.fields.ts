import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Application, IApplication } from '@domain/access/application';
import { IQuestion } from '@domain/common/question/question.interface';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IContributor } from '../../community/contributor/contributor.interface';
import { ApplicationService } from './application.service';

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

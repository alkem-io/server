import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IInnovationFlow } from './innovation.flow.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { InnovationFlow } from './innovation.flow.entity';
import { InnovationFlowService } from './innovation.flow.service';
import { ITagsetTemplate } from '@domain/common/tagset-template';

@Resolver(() => IInnovationFlow)
export class InnovationFlowResolverFields {
  constructor(private innovationFlowService: InnovationFlowService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this InnovationFlow.',
  })
  @Profiling.api
  async profile(
    @Parent() innovationFlow: IInnovationFlow,
    @Loader(ProfileLoaderCreator, { parentClassRef: InnovationFlow })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(innovationFlow.id);
  }

  @ResolveField('tagsetTemplate', () => ITagsetTemplate, {
    nullable: false,
    description:
      'The tagsetTemplate used for entities that want to select from the states in this InnovationFlow.',
  })
  async flowTagsetTemplate(
    @Parent() flow: IInnovationFlow
  ): Promise<ITagsetTemplate> {
    return this.innovationFlowService.getFlowTagsetTemplate(flow);
  }
}

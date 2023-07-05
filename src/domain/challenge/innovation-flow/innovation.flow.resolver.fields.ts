import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IInnovationFlow } from './innovation.flow.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import {
  InnovationFlowLifecycleLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { InnovationFlow } from './innovation.flow.entity';
import { ILifecycle } from '@domain/common/lifecycle';

@Resolver(() => IInnovationFlow)
export class InnovationFlowResolverFields {
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('lifecycle', () => ILifecycle, {
    nullable: true,
    description: 'The Lifecycle being used by this InnovationFlow',
  })
  @UseGuards(GraphqlGuard)
  async lifecycle(
    @Parent() innovationFlow: IInnovationFlow,
    @Loader(InnovationFlowLifecycleLoaderCreator, {
      parentClassRef: InnovationFlow,
    })
    loader: ILoader<ILifecycle>
  ): Promise<ILifecycle> {
    return await loader.load(innovationFlow.id);
  }
}

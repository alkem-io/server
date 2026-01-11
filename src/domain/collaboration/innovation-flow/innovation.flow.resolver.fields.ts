import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationFlow } from './innovation.flow.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { InnovationFlow } from './innovation.flow.entity';
import { AuthorizationActorPrivilege } from '@common/decorators/authorization.actor.privilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';
import { InnovationFlowService } from './innovation.flow.service';

@Resolver(() => IInnovationFlow)
export class InnovationFlowResolverFields {
  constructor(private innovationFlowService: InnovationFlowService) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('states', () => [IInnovationFlowState], {
    nullable: false,
    description: 'The States for this InnovationFlow.',
  })
  async states(
    @Parent() innovationFlow: IInnovationFlow
  ): Promise<IInnovationFlowState[]> {
    return await this.innovationFlowService.getStates(innovationFlow.id);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('currentState', () => IInnovationFlowState, {
    nullable: true,
    description: 'The currently selected State in this Flow.',
  })
  async currentState(
    @Parent() innovationFlow: IInnovationFlow
  ): Promise<IInnovationFlowState | null> {
    if (!innovationFlow.currentStateID) {
      return null;
    }
    return await this.innovationFlowService.getCurrentState(
      innovationFlow.currentStateID
    );
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this InnovationFlow.',
  })
  async profile(
    @Parent() innovationFlow: IInnovationFlow,
    @Loader(ProfileLoaderCreator, { parentClassRef: InnovationFlow })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(innovationFlow.id);
  }
}

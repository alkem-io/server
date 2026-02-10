import { AuthorizationAgentPrivilege } from '@common/decorators/authorization.agent.privilege';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';
import { InnovationFlow } from './innovation.flow.entity';
import { IInnovationFlow } from './innovation.flow.interface';
import { InnovationFlowService } from './innovation.flow.service';

@Resolver(() => IInnovationFlow)
export class InnovationFlowResolverFields {
  constructor(private innovationFlowService: InnovationFlowService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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

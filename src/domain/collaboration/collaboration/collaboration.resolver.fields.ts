import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICallout } from '../callout/callout.interface';
import { CollaborationArgsCallouts } from './dto/collaboration.args.callouts';
import { AgentInfo } from '@core/authentication/agent-info';
import { Loader } from '@core/dataloader/decorators';
import {
  CollaborationRelationsLoaderCreator,
  CollaborationTimelineLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';

@Resolver(() => ICollaboration)
export class CollaborationResolverFields {
  constructor(private collaborationService: CollaborationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('relations', () => [IRelation], {
    nullable: true,
    description: 'The list of Relations for this Collaboration object.',
  })
  @Profiling.api
  async relations(
    @Parent() collaboration: Collaboration,
    @Loader(CollaborationRelationsLoaderCreator) loader: ILoader<IRelation[]>
  ) {
    return loader.load(collaboration.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('callouts', () => [ICallout], {
    nullable: true,
    description: 'The list of Callouts for this Collaboration object.',
  })
  @Profiling.api
  async callouts(
    @Parent() collaboration: Collaboration,
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: CollaborationArgsCallouts
  ) {
    return await this.collaborationService.getCalloutsFromCollaboration(
      collaboration,
      args,
      agentInfo
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('timeline', () => ITimeline, {
    nullable: true,
    description: 'The timeline with events in use by this Space',
  })
  @UseGuards(GraphqlGuard)
  async timeline(
    @Parent() collaboration: ICollaboration,
    @Loader(CollaborationTimelineLoaderCreator) loader: ILoader<ITimeline>
  ): Promise<ITimeline> {
    return loader.load(collaboration.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('tagsetTemplates', () => [ITagsetTemplate], {
    nullable: true,
    description: 'The tagset templates on this Collaboration.',
  })
  @Profiling.api
  async tagsetTemplates(
    @Parent() collaboration: Collaboration
  ): Promise<ITagsetTemplate[]> {
    const tagsetTemplateSet =
      await this.collaborationService.getTagsetTemplatesSet(collaboration.id);
    return tagsetTemplateSet.tagsetTemplates;
  }
}

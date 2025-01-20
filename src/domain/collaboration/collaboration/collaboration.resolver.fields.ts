import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { Loader } from '@core/dataloader/decorators';
import {
  CollaborationTimelineLoaderCreator,
  CollaborationCalloutsSetLoaderCreator,
  LicenseLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { ICalloutsSet } from '../callouts-set/callouts.set.interface';

@Resolver(() => ICollaboration)
export class CollaborationResolverFields {
  constructor(private collaborationService: CollaborationService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('innovationFlow', () => IInnovationFlow, {
    nullable: false,
    description: 'The InnovationFlow for the Collaboration.',
  })
  @Profiling.api
  async innovationFlow(@Parent() collabotation: ICollaboration) {
    return await this.collaborationService.getInnovationFlow(collabotation.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('timeline', () => ITimeline, {
    nullable: false,
    description: 'The timeline with events in use by this Space',
  })
  @UseGuards(GraphqlGuard)
  async timeline(
    @Parent() collaboration: ICollaboration,
    @Loader(CollaborationTimelineLoaderCreator) loader: ILoader<ITimeline>
  ): Promise<ITimeline> {
    return loader.load(collaboration.id);
  }

  @ResolveField('calloutsSet', () => ICalloutsSet, {
    nullable: false,
    description: 'The calloutsSet with Callouts in use by this Space',
  })
  async calloutsSet(
    @Parent() collaboration: ICollaboration,
    @Loader(CollaborationCalloutsSetLoaderCreator) loader: ILoader<ICalloutsSet>
  ): Promise<ICalloutsSet> {
    return loader.load(collaboration.id);
  }

  @ResolveField('license', () => ILicense, {
    nullable: false,
    description: 'The License operating on this Collaboration.',
  })
  async license(
    @Parent() collaboration: ICollaboration,
    @Loader(LicenseLoaderCreator, { parentClassRef: Collaboration })
    loader: ILoader<ILicense>
  ): Promise<ILicense> {
    return loader.load(collaboration.id);
  }
}

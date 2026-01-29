import {
  CollaborationCalloutsSetLoaderCreator,
  CollaborationTimelineLoaderCreator,
  LicenseLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ILicense } from '@domain/common/license/license.interface';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { ICalloutsSet } from '../callouts-set/callouts.set.interface';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';

@Resolver(() => ICollaboration)
export class CollaborationResolverFields {
  constructor(private collaborationService: CollaborationService) {}

  @ResolveField('innovationFlow', () => IInnovationFlow, {
    nullable: false,
    description: 'The InnovationFlow for the Collaboration.',
  })
  @Profiling.api
  async innovationFlow(@Parent() collaboration: ICollaboration) {
    return await this.collaborationService.getInnovationFlow(collaboration.id);
  }

  @ResolveField('timeline', () => ITimeline, {
    nullable: false,
    description: 'The timeline with events in use by this Space',
  })
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

import { ActorType } from '@common/enums/actor.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICollaboraDocument } from '@domain/collaboration/collabora-document/collabora.document.interface';
import { ContributorCollectionService } from '@domain/collaboration/contributor-collection/contributor.collection.service';
import { IContributorCollectionCounts } from '@domain/collaboration/contributor-collection/dto/contributor.collection.counts';
import { IContributorCollectionItem } from '@domain/collaboration/contributor-collection/dto/contributor.collection.item';
import { ILink } from '@domain/collaboration/link/link.interface';
import { IPoll } from '@domain/collaboration/poll/poll.interface';
import { SpaceCollectionService } from '@domain/collaboration/space-collection/space.collection.service';
import { IMediaGallery } from '@domain/common/media-gallery/media.gallery.interface';
import { IMemo } from '@domain/common/memo/types';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { ISpace } from '@domain/space/space/space.interface';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { CalloutFraming } from './callout.framing.entity';
import { ICalloutFraming } from './callout.framing.interface';
import { CalloutFramingService } from './callout.framing.service';

@Resolver(() => ICalloutFraming)
export class CalloutFramingResolverFields {
  constructor(
    private calloutFramingService: CalloutFramingService,
    private contributorCollectionService: ContributorCollectionService,
    private spaceCollectionService: SpaceCollectionService
  ) {}

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for framing the associated Callout.',
  })
  async profile(
    @Parent() calloutFraming: ICalloutFraming,
    @Loader(ProfileLoaderCreator, { parentClassRef: CalloutFraming })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(calloutFraming.id);
  }

  @ResolveField('whiteboard', () => IWhiteboard, {
    nullable: true,
    description: 'The Whiteboard for framing the associated Callout.',
  })
  whiteboard(
    @Parent() calloutFraming: ICalloutFraming
  ): Promise<IWhiteboard | null> {
    return this.calloutFramingService.getWhiteboard(calloutFraming);
  }

  @ResolveField('link', () => ILink, {
    nullable: true,
    description: 'The Link for framing the associated Callout.',
  })
  link(@Parent() calloutFraming: ICalloutFraming): Promise<ILink | null> {
    return this.calloutFramingService.getLink(calloutFraming);
  }

  @ResolveField('memo', () => IMemo, {
    nullable: true,
    description: 'The Memo for framing the associated Callout.',
  })
  memo(@Parent() calloutFraming: ICalloutFraming): Promise<IMemo | null> {
    return this.calloutFramingService.getMemo(calloutFraming);
  }

  @ResolveField('mediaGallery', () => IMediaGallery, {
    nullable: true,
    description: 'The media gallery associated with the callout framing',
  })
  async mediaGallery(
    @Parent() calloutFraming: ICalloutFraming
  ): Promise<IMediaGallery | null> {
    return this.calloutFramingService.getMediaGallery(calloutFraming);
  }

  @ResolveField('poll', () => IPoll, {
    nullable: true,
    description:
      'The Poll attached to this Callout Framing, if any. Present when framing.type = POLL.',
  })
  async poll(@Parent() calloutFraming: ICalloutFraming): Promise<IPoll | null> {
    return this.calloutFramingService.getPoll(calloutFraming);
  }

  @ResolveField('collaboraDocument', () => ICollaboraDocument, {
    nullable: true,
    description:
      'The Collabora document attached to this Callout Framing, if any. Present when framing.type = COLLABORA_DOCUMENT.',
  })
  async collaboraDocument(
    @Parent() calloutFraming: ICalloutFraming
  ): Promise<ICollaboraDocument | null> {
    return this.calloutFramingService.getCollaboraDocument(calloutFraming);
  }

  @ResolveField('contributors', () => [IContributorCollectionItem], {
    nullable: false,
    description:
      'The full authorized set of contributors of the given type for a CONTRIBUTORS framing, ordered leads/admins first then alphabetically. No server-side pagination or search: the client paginates (list) and name-searches client-side over this set. Empty for non-CONTRIBUTORS framings or deselected types.',
  })
  async contributors(
    @CurrentActor() actorContext: ActorContext,
    @Parent() calloutFraming: ICalloutFraming,
    @Args('type', { type: () => ActorType }) type: ActorType
  ): Promise<IContributorCollectionItem[]> {
    const callout =
      await this.calloutFramingService.getParentCallout(calloutFraming);
    if (!callout) {
      return [];
    }
    return this.contributorCollectionService.getContributors(
      callout,
      type,
      actorContext
    );
  }

  @ResolveField('contributorCounts', () => IContributorCollectionCounts, {
    nullable: false,
    description:
      'Per-type counts (users, organizations, virtual contributors) of the total eligible set for a CONTRIBUTORS framing, after type-selection and user-information visibility filtering. Zeroed for non-CONTRIBUTORS framings.',
  })
  async contributorCounts(
    @CurrentActor() actorContext: ActorContext,
    @Parent() calloutFraming: ICalloutFraming
  ): Promise<IContributorCollectionCounts> {
    const callout =
      await this.calloutFramingService.getParentCallout(calloutFraming);
    if (!callout) {
      return { users: 0, organizations: 0, virtualContributors: 0 };
    }
    return this.contributorCollectionService.getContributorCounts(
      callout,
      actorContext
    );
  }

  @ResolveField('subspaces', () => [ISpace], {
    nullable: false,
    description:
      "The host space's subspaces for a SPACES framing, ordered pinned-first then the space's sortOrder/displayName. Returns the existing Space type (no new item type). No server-side pagination/search: the client name-searches and paginates client-side over this set. Empty for non-SPACES framings, for a callout not attached to a space, or for a host with no subspaces.",
  })
  async subspaces(
    @Parent() calloutFraming: ICalloutFraming
  ): Promise<ISpace[]> {
    // Config-free + host-space-generic (workspace#013-spaces-collection-callout,
    // US1/US2). Only SPACES framings expose a collection; every other framing
    // resolves to an empty list (mirrors the conditional `contributors` field).
    if (calloutFraming.type !== CalloutFramingType.SPACES) {
      return [];
    }
    const callout =
      await this.calloutFramingService.getParentCallout(calloutFraming);
    if (!callout) {
      return [];
    }
    return this.spaceCollectionService.getSubspaces(callout);
  }
}

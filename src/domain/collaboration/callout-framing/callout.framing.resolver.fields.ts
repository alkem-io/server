import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICollaboraDocument } from '@domain/collaboration/collabora-document/collabora.document.interface';
import { ILink } from '@domain/collaboration/link/link.interface';
import { IPoll } from '@domain/collaboration/poll/poll.interface';
import { IMediaGallery } from '@domain/common/media-gallery/media.gallery.interface';
import { IMemo } from '@domain/common/memo/types';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CalloutFraming } from './callout.framing.entity';
import { ICalloutFraming } from './callout.framing.interface';
import { CalloutFramingService } from './callout.framing.service';

@Resolver(() => ICalloutFraming)
export class CalloutFramingResolverFields {
  constructor(private calloutFramingService: CalloutFramingService) {}

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
}

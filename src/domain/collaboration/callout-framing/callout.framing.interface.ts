import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { ILink } from '@domain/collaboration/link/link.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IMediaGallery } from '@domain/common/media-gallery/media.gallery.interface';
import { IMemo } from '@domain/common/memo/memo.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutFraming')
export abstract class ICalloutFraming extends IAuthorizable {
  profile!: IProfile;

  @Field(() => CalloutFramingType, {
    description:
      'The type of the Callout Framing, the additional content attached to this callout',
  })
  type!: CalloutFramingType;

  whiteboard?: IWhiteboard;

  link?: ILink;

  memo?: IMemo;

  mediaGallery?: IMediaGallery;
}

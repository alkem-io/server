import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ILink } from '@domain/collaboration/link/link.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IMemo } from '@domain/common/memo/memo.interface';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { IMediaGallery } from '@domain/common/media-gallery/media.gallery.interface';

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

  @Field(() => IMediaGallery, {
    description: 'Media gallery attached to this callout framing.',
    nullable: true,
  })
  mediaGallery?: IMediaGallery;
}

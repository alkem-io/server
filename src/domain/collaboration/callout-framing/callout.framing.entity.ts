import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { ICalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.interface';
import { Link } from '@domain/collaboration/link/link.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { MediaGallery } from '@domain/common/media-gallery/media.gallery.entity';
import { Memo } from '@domain/common/memo/memo.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Callout } from '../callout/callout.entity';

export class CalloutFraming
  extends AuthorizableEntity
  implements ICalloutFraming
{
  profile!: Profile;

  type!: CalloutFramingType;

  callout?: Callout;

  whiteboard?: Whiteboard;

  link?: Link;

  memo?: Memo;

  mediaGallery?: MediaGallery;
}

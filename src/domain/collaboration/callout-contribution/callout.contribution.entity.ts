import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Memo } from '@domain/common/memo/memo.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Callout } from '../callout/callout.entity';
import { Link } from '../link/link.entity';
import { Post } from '../post/post.entity';

export class CalloutContribution
  extends AuthorizableEntity
  implements ICalloutContribution
{
  createdBy?: string;

  type!: CalloutContributionType;

  whiteboard?: Whiteboard;

  memo?: Memo;

  post?: Post;

  link?: Link;

  callout?: Callout;

  sortOrder!: number;
}

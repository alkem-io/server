import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { IForum } from './forum.interface';

export class Forum extends AuthorizableEntity implements IForum {
  discussions?: Discussion[];

  discussionCategories: string[];

  constructor() {
    super();
    this.discussionCategories = [];
  }
}

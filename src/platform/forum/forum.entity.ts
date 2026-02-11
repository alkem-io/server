import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { IForum } from './forum.interface';

@Entity()
export class Forum extends AuthorizableEntity implements IForum {
  @OneToMany(
    () => Discussion,
    discussion => discussion.forum,
    {
      eager: false,
      cascade: true,
    }
  )
  discussions?: Discussion[];

  @Column('simple-array')
  discussionCategories: string[];

  constructor() {
    super();
    this.discussionCategories = [];
  }
}

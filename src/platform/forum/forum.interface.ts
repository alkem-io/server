import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IDiscussion } from '../forum-discussion/discussion.interface';

@ObjectType('Forum')
export abstract class IForum extends IAuthorizable {
  discussions?: IDiscussion[];

  @Field(() => [ForumDiscussionCategory])
  discussionCategories!: string[];
}

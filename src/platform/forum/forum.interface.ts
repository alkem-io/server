import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IDiscussion } from '../forum-discussion/discussion.interface';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';

@ObjectType('Forum')
export abstract class IForum extends IAuthorizable {
  discussions?: IDiscussion[];

  @Field(() => [ForumDiscussionCategory])
  discussionCategories!: string[];
}

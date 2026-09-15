import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ForumRemoveDiscussionCategoryInput {
  @Field(() => ForumDiscussionCategory, {
    nullable: false,
    description:
      'The category to remove from the platform Forum active category list.',
  })
  category!: ForumDiscussionCategory;
}

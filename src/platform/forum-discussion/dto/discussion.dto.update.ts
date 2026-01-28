import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateDiscussionInput extends UpdateNameableInput {
  @Field(() => ForumDiscussionCategory, {
    nullable: true,
    description: 'The category for the Discussion',
  })
  category?: string;
}

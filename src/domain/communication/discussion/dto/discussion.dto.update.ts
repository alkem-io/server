import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateDiscussionInput extends UpdateNameableInput {
  @Field(() => DiscussionCategory, {
    nullable: true,
    description: 'The category for the Discussion',
  })
  category?: string;
}

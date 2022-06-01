import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.update';
import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateDiscussionInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  title?: string;

  @Field(() => DiscussionCategory, {
    nullable: true,
    description: 'The category for the Discussion',
  })
  category?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The description for the Discussion',
  })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  description?: string;
}

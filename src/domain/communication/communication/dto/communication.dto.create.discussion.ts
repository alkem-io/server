import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CommunicationCreateDiscussionInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the Communication entity the Discussion is being created on.',
  })
  communicationID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The title for the Discussion',
  })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  title!: string;

  @Field(() => DiscussionCategory, {
    nullable: false,
    description: 'The category for the Discussion',
  })
  category!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The description for the Discussion',
  })
  @MaxLength(MID_TEXT_LENGTH)
  description?: string;
}

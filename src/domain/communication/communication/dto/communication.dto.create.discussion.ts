import { DiscussionCategory } from '@common/enums/communication.discussion.category';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';

import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class CommunicationCreateDiscussionInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the Communication entity the Discussion is being created on.',
  })
  communicationID!: string;

  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => DiscussionCategory, {
    nullable: false,
    description: 'The category for the Discussion',
  })
  category!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}

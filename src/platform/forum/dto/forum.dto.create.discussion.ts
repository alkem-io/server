import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class ForumCreateDiscussionInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier for the Forum entity the Discussion is being created on.',
  })
  forumID!: string;

  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => ForumDiscussionCategory, {
    nullable: false,
    description: 'The category for the Discussion',
  })
  category!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  nameID?: string;
}

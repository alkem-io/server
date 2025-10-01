import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { CreatePostInput } from '@domain/collaboration/post/dto/post.dto.create';
import { CreateMemoInput } from '@domain/common/memo/dto/memo.dto.create';
import { CreateLinkInput } from '@domain/collaboration/link/dto/link.dto.create';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';

@InputType()
@ObjectType('CreateCalloutContributionData')
export class CreateCalloutContributionInput {
  @Field(() => CalloutContributionType, { nullable: false })
  type!: CalloutContributionType;

  @Field(() => CreatePostInput, { nullable: true })
  @ValidateNested({ each: true })
  post?: CreatePostInput;

  @Field(() => CreateWhiteboardInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  whiteboard?: CreateWhiteboardInput;

  @Field(() => CreateLinkInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  link?: CreateLinkInput;

  @Field(() => CreateMemoInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  memo?: CreateLinkInput;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Contribution.',
  })
  sortOrder?: number;
}

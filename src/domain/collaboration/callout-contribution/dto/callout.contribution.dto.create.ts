import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { CreatePostInput } from '@domain/collaboration/post/dto/post.dto.create';
import { CreateLinkInput } from '@domain/collaboration/link/dto/link.dto.create';
@InputType()
export class CreateCalloutContributionInput {
  @Field(() => CreatePostInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => CreatePostInput)
  post?: CreatePostInput;

  @Field(() => CreateWhiteboardInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateWhiteboardInput)
  whiteboard?: CreateWhiteboardInput;

  @Field(() => CreateLinkInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateLinkInput)
  link?: CreateLinkInput;
}

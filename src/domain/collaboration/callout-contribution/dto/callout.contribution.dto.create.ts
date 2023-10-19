import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWhiteboardInput } from '@domain/common/whiteboard';
import { CreatePostInput } from '@domain/collaboration/post/dto/post.dto.create';
import { CreateReferenceInput } from '@domain/common/reference/reference.dto.create';
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

  @Field(() => CreateReferenceInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateReferenceInput)
  link?: CreateReferenceInput;
}

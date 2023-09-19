import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
@InputType()
export class CreateCalloutFramingInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  whiteboardContent?: string;
}

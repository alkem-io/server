import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';

@InputType()
export class UpdateCalloutFramingInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of the Template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile?: UpdateProfileInput;

  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  whiteboardContent?: string;
}

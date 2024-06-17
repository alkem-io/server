import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { UpdateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.update';
import { UpdateWhiteboardContentInput } from '@domain/common/whiteboard/dto/whiteboard.dto.update.content';

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

  @Field(() => UpdateWhiteboardInput, { nullable: true })
  @IsOptional()
  whiteboard?: UpdateWhiteboardInput;

  @Field(() => UpdateWhiteboardContentInput, { nullable: true })
  @IsOptional()
  whiteboardContent?: UpdateWhiteboardContentInput;
}

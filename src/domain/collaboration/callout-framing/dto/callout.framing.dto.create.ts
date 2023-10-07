import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { CreateWhiteboardInput } from '@domain/common/whiteboard';
import { CreateWhiteboardRtInput } from '@domain/common/whiteboard-rt/dto/whiteboard.rt.dto.create';
@InputType()
export class CreateCalloutFramingInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => CreateWhiteboardInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateWhiteboardInput)
  whiteboard?: CreateWhiteboardInput;

  @Field(() => CreateWhiteboardRtInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateWhiteboardRtInput)
  whiteboardRt?: CreateWhiteboardRtInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}

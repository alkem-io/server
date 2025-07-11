import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/common/profile/dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class UpdateInnovationFlowInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}

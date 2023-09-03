import { InputType, Field } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
@InputType()
export class CreateCalloutFramingInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;
}

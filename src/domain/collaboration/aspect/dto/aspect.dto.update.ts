import { UpdateCardProfileInput } from '@domain/collaboration/card-profile/dto';
import { UpdateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update.old';
import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@src/common/constants';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateAspectInput extends UpdateNameableInputOld {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  type?: string;

  @Field(() => UpdateCardProfileInput, {
    nullable: true,
    description: 'Update the Profile of the Card.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCardProfileInput)
  profileData?: UpdateCardProfileInput;
}

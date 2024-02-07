import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { MID_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';

@InputType()
export class UpdateLinkInput extends UpdateBaseAlkemioInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of the Link.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile?: UpdateProfileInput;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  uri?: string;
}

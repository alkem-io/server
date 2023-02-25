import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { CreateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create.old';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateCardProfileInput } from '@domain/collaboration/card-profile/dto';
import { Type } from 'class-transformer';

@InputType()
export class CreateAspectInput extends CreateNameableInputOld {
  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  visualUri?: string;

  // Override
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID!: string;

  @Field(() => CreateCardProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCardProfileInput)
  profileData?: CreateCardProfileInput;
}

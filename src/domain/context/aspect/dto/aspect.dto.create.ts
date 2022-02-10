import { CreateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.create';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateAspectInput extends CreateNameableInput {
  @Field(() => NameID, {
    nullable: true,
    description:
      'A readable identifier, unique within the containing scope. If not provided generate based on the displayName',
  })
  nameID!: string;

  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field({ nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
